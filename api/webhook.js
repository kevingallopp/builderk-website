export default async function handler(req, res) {
  // CORS: lock to the production origin (same-origin form posts are unaffected)
  res.setHeader('Access-Control-Allow-Origin', 'https://www.builderk.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GHL_TOKEN = process.env.GHL_PIT_TOKEN;
  const GHL_LOCATION = process.env.GHL_LOCATION_ID;
  if (!GHL_TOKEN || !GHL_LOCATION) return res.status(503).json({success: false, received: false});
  const GHL_HEADERS = {
    'Authorization': `Bearer ${GHL_TOKEN}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
  };

  let received = false;
  let contactPhone = 'not_needed';
  try {
    const data = req.body;
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        Object.values(data).some(value => !['string', 'number', 'boolean'].includes(typeof value)) ||
        JSON.stringify(data).length > 24000 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.client_email || data.email || '')))
      return res.status(400).json({success: false, received: false, error: 'Valid contact information is required.'});
    const isReferral = !!data.referrer_name;
    const isCalc = data.form_type === 'calculator-estimate';

    // Build contact payload based on form type
    const contact = isReferral
      ? buildReferralContact(data, GHL_LOCATION)
      : buildWebsiteContact(data, GHL_LOCATION);

    // 1. Create the contact, or use GHL's existing contact on a duplicate response.
    const ghlResponse = await ghlFetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: GHL_HEADERS,
      body: JSON.stringify(contact),
    });

    const ghlData = await ghlResponse.json();

    let contactId;
    let existingContact = false;
    if (!ghlResponse.ok) {
      // Handle duplicate contact — GHL returns the existing contactId in meta
      if ((ghlResponse.status === 400 || ghlResponse.status === 409) && ghlData.meta?.contactId) {
        contactId = ghlData.meta.contactId;
        existingContact = true;
      } else {
        console.error('Lead delivery: contact rejected', ghlResponse.status);
        return res.status(500).json({ error: 'Failed to create contact. Please try again.' });
      }
    } else {
      contactId = ghlData.contact?.id;
    }

    if (!contactId) return res.status(502).json({success: false, received: false});
    // Preserve every request, including an existing contact's latest plan and project notes.
    // Contact creation alone is not a receipt for a calculator estimate.
    const noteResponse = await ghlFetch(`https://services.leadconnectorhq.com/contacts/${encodeURIComponent(contactId)}/notes`, {
      method: 'POST', headers: GHL_HEADERS, body: JSON.stringify({body: buildLeadNote(data)})
    });
    const noteData = await noteResponse.json();
    if (!noteResponse.ok || !noteData.note?.id) {
      console.error('Lead delivery: context note not confirmed', noteResponse.status);
      return res.status(502).json({success: false, received: false});
    }
    received = true;

    // 2. Look up the pipeline and "Lead Generation" stage
    // Keep the complete request saved even if updating the primary phone fails.
    // The optional update runs alongside pipeline lookup to bound delivery latency.
    const [pipelineStage, phoneResult] = await Promise.all([
      findLeadGenStage(GHL_LOCATION, GHL_HEADERS),
      existingContact
        ? fillMissingContactPhone(contactId, contact, GHL_HEADERS, noteData.note.id)
        : Promise.resolve('not_needed'),
    ]);
    contactPhone = phoneResult;

    if (!pipelineStage) {
      console.error('Could not find Lead Generation pipeline stage');
      return res.status(200).json({ success: true, received: true, opportunity: false, contactPhone });
    }

    // 3. Create the opportunity
    const oppName = isCalc
      ? `${data.email || 'Unknown'} — Calculator Estimate ${data.estimate_total || ''}`.trim()
      : isReferral
        ? `${data.client_name || 'Unknown'} — Referral from ${data.referrer_name}`
        : `${data.name || 'Unknown'} — Website Lead`;

    const opportunityPayload = {
      pipelineId: pipelineStage.pipelineId,
      pipelineStageId: pipelineStage.stageId,
      locationId: GHL_LOCATION,
      contactId,
      name: oppName,
      status: 'open',
      source: isReferral ? 'Referral Program' : 'Website Form',
      monetaryValue: estimateValue(data),
    };

    const oppResponse = await ghlFetch('https://services.leadconnectorhq.com/opportunities/', {
      method: 'POST',
      headers: GHL_HEADERS,
      body: JSON.stringify(opportunityPayload),
    });

    const oppData = await oppResponse.json();

    if (!oppResponse.ok || !oppData.opportunity?.id) {
      console.error('Lead delivery: opportunity not confirmed', oppResponse.status);
      return res.status(200).json({ success: true, received: true, opportunity: false, contactPhone });
    }

    return res.status(200).json({ success: true, received: true, opportunity: true, contactPhone });

  } catch (error) {
    console.error('Lead delivery: upstream request failed', {received});
    if (received) return res.status(200).json({success: true, received: true, opportunity: false, contactPhone});
    return res.status(502).json({ success: false, received: false, error: 'Receipt could not be confirmed.' });
  }
}

// --- Contact builders ---

async function fillMissingContactPhone(contactId, submitted, headers, noteId) {
  if (!submitted.phone) return 'not_needed';
  const pending = reason => {
    // IDs allow Operations to find the saved request without logging its personal data.
    console.error('Lead delivery: contact phone needs review', {reason, contactId, noteId});
    return 'pending';
  };
  if (!/^\+[1-9]\d{7,14}$/.test(submitted.phone)) return pending('invalid_phone');

  try {
    const url = `https://services.leadconnectorhq.com/contacts/${encodeURIComponent(contactId)}`;
    const response = await ghlFetch(url, {headers}, 2000);
    const current = (await response.json()).contact;
    const sameContact = current?.id === contactId && current.locationId === submitted.locationId &&
      typeof current.email === 'string' &&
      current.email.trim().toLowerCase() === String(submitted.email).trim().toLowerCase();
    if (!response.ok || !sameContact) return pending('contact_not_confirmed');
    // Treat unexpected field types as populated rather than overwriting them.
    if (current.phone != null && (typeof current.phone !== 'string' || current.phone.trim() !== ''))
      return 'preserved';

    // Send only the missing field. Never replace names, tags, owners or consent settings.
    const update = await ghlFetch(url, {
      method: 'PUT', headers, body: JSON.stringify({phone: submitted.phone}),
    }, 2000);
    const updated = await update.json();
    if (!update.ok || updated.succeeded === false || updated.succeded === false ||
        updated.contact?.id !== contactId || formatPhone(updated.contact.phone || '') !== submitted.phone)
      return pending('update_not_confirmed');
    return 'updated';
  } catch (error) {
    // A lost response is uncertain; do not retry or ask the visitor to resubmit a saved request.
    return pending('upstream_unavailable');
  }
}

function buildWebsiteContact(data, locationId) {
  // Calculator estimates arrive with email only; use the email handle as a stand-in name
  const fallbackName = data.email ? data.email.split('@')[0] : '';
  return {
    firstName: extractFirstName(data.name || fallbackName),
    lastName: extractLastName(data.name || ''),
    email: data.email || '',
    phone: formatPhone(data.phone || ''),
    locationId,
    state: 'Florida',
    postalCode: data.zip_code || '',
    source: data.form_type === 'calculator-estimate' ? 'Cost Calculator' : 'Website Form',
    tags: buildTags(data),
  };
}

function buildReferralContact(data, locationId) {
  return {
    firstName: extractFirstName(data.client_name || ''),
    lastName: extractLastName(data.client_name || ''),
    email: data.client_email || '',
    phone: formatPhone(data.client_phone || ''),
    locationId,
    source: 'Referral Program',
    tags: [
      'referral-lead',
      `referrer-${(data.referrer_name || '').toLowerCase().replace(/\s+/g, '-')}`,
      data.referrer_company ? `brokerage-${data.referrer_company.toLowerCase().replace(/\s+/g, '-')}` : null,
    ].filter(Boolean),
    customFields: [
      { key: 'referrer_name', value: data.referrer_name || '' },
      { key: 'referrer_email', value: data.referrer_email || '' },
      { key: 'referrer_phone', value: data.referrer_phone || '' },
      { key: 'referrer_company', value: data.referrer_company || '' },
      { key: 'project_notes', value: data.project_notes || '' },
    ],
  };
}

// --- Pipeline lookup ---

async function findLeadGenStage(locationId, headers) {
  try {
    const resp = await ghlFetch(
      `https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${locationId}`,
      { headers }
    );
    const data = await resp.json();

    if (!resp.ok || !data.pipelines) {
      console.error('Lead delivery: pipeline lookup failed', resp.status);
      return null;
    }

    // Look for the main pipeline (first one or one containing "Main" or "Builderk")
    const pipeline = data.pipelines.find(p =>
      /main|builderk/i.test(p.name)
    ) || data.pipelines[0];

    if (!pipeline) return null;

    // Find the "Lead Generation" stage
    const stage = pipeline.stages.find(s =>
      /lead\s*gen/i.test(s.name)
    );
    if (!stage) return null;

    return {
      pipelineId: pipeline.id,
      stageId: stage.id,
    };
  } catch (err) {
    console.error('Lead delivery: pipeline lookup failed');
    return null;
  }
}

// --- Helpers ---

function estimateValue(data) {
  // Calculator estimates carry an exact figure like "$379,800"
  if (data.estimate_total) {
    const n = parseInt(String(data.estimate_total).replace(/[^0-9]/g, ''), 10);
    if (n) return n;
  }
  if (!data.budget) return 0;
  const map = {
    '$200K - $400K': 300000,
    '$400K - $700K': 550000,
    '$700K - $1M': 850000,
    '$1M+': 1250000,
  };
  return map[String(data.budget).replace(/ to /g, ' - ')] || 0;
}

function extractFirstName(name) {
  return name.trim().split(' ')[0] || 'Unknown';
}

function extractLastName(name) {
  const parts = name.trim().split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}

function formatPhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone;
}

function buildTags(data) {
  const tags = ['website-lead'];

  // Budget tag
  if (data.budget) {
    const budgetMap = {
      '$200K - $400K': '200k-400k',
      '$400K - $700K': '400k-700k',
      '$700K - $1M': '700k-1m',
      '$1M+': '1m-plus',
    };
    tags.push(budgetMap[String(data.budget).replace(/ to /g, ' - ')] || String(data.budget).toLowerCase().replace(/[^a-z0-9]/g, '-'));
  }

  // Home size tag
  if (data.home_size) {
    const sizeMap = {
      'Under 1,500 sq ft': 'under-1500sqft',
      '1,500 - 2,000 sq ft': '1500-2000sqft',
      '2,000 - 3,000 sq ft': '2000-3000sqft',
      '3,000+ sq ft': '3000-plus-sqft',
    };
    tags.push(sizeMap[String(data.home_size).replace(/ to /g, ' - ')] || 'custom-size');
  }

  // Lot ownership tag
  if (data.lot_ownership) {
    if (String(data.lot_ownership).includes('Yes')) tags.push('owns-lot');
    else if (String(data.lot_ownership).includes('Under contract')) tags.push('lot-under-contract');
    else tags.push('still-looking-lot');
  }

  // Timeline tag (keys match the live form's option values; legacy values kept)
  if (data.timeline) {
    const timelineMap = {
      'ASAP': 'ready-to-start',
      '1-3 months': 'within-3-months',
      '3-6 months': 'within-6-months',
      '6-12 months': 'within-1-year',
      'Just exploring': 'just-exploring',
      'Ready to start': 'ready-to-start',
      'Within 6 months': 'within-6-months',
      'Within 1 year': 'within-1-year',
    };
    tags.push(timelineMap[data.timeline] || data.timeline.toLowerCase().replace(/[^a-z0-9]/g, '-'));
  }

  // Calculator estimate tags
  if (data.form_type === 'calculator-estimate') {
    tags.push('calculator-estimate');
    if (data.calc_tier) tags.push('tier-' + String(data.calc_tier).toLowerCase());
    if (data.calc_sqft) tags.push('sqft-' + data.calc_sqft);
  }

  // Origin context tags (hidden fields populated by the website form)
  const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  if (data.source_page) tags.push('src-' + slugify(data.source_page));
  if (data.city_interest) tags.push('city-' + slugify(data.city_interest));
  if (data.plan_interest) tags.push('plan-' + slugify(data.plan_interest));
  if (data.utm_source) tags.push('utm-' + slugify(data.utm_source));
  if (data.utm_campaign) tags.push('camp-' + slugify(data.utm_campaign));

  return tags;
}

async function ghlFetch(url, options, timeoutMs = 4000) {
  return fetch(url, {...options, signal: AbortSignal.timeout(timeoutMs)});
}

function buildLeadNote(data) {
  const fields = ['submission_id','form_type','name','email','phone','message','project_notes',
    'budget','home_size','timeline','zip_code','lot_ownership','source_page','city_interest','plan_interest',
    'calc_sqft','calc_beds','calc_baths','calc_tier','calc_garage','calc_garage_sqft','calc_covered_exterior_sqft',
    'calc_complexity','calc_extras','estimate_total','estimate_range','pricing_market','pricing_updated',
    'monthly_payment','example_interest_rate','lot_value','lot_balance','cash_down','down_mode','down_percent',
    'utm_source','utm_medium','utm_campaign','referrer_name','referrer_email','referrer_phone','referrer_company',
    'client_name','client_email','client_phone'];
  return ['BuilderK website request', 'Planning estimates are not quotes.', ...fields
    .filter(key => data[key] !== undefined && data[key] !== '')
    .map(key => `${key}: ${String(data[key]).slice(0, 4000)}`)].join('\n');
}
