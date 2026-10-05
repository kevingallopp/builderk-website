import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

const request = {
  form_type: 'website-commercial', name: 'Test Manager', company: 'Example Logistics', email: 'qa@example.test',
  phone: '(407) 555 0123', project_type: 'Office build out', project_location: 'Orlando, FL', budget: '$50K to $150K',
  timeline: '1-3 months', space_size: '1,500 to 5,000 sq ft', plans_status: 'No plans yet',
  space_open: 'Yes, it stays open', bid_due: '2026-11-02', files_link: 'https://drive.example.test/plans',
  contact_role: 'Facility or operations manager', message: 'Two offices and a break room',
  source_page: '/commercial', submission_id: '11111111-2222-4333-8444-555555555555',
};

// The real handler with every upstream call intercepted. No live credentials or leads.
async function webhook(body, {existing = false} = {}) {
  const calls = [];
  let stored = {id: 'c1', locationId: 'test-location', email: 'qa@example.test', phone: '+14075550123', customFields: []};
  const reply = (json, status = 200) => ({ok: status < 400, status, json: async () => json});
  const sandbox = {process: {env: {GHL_PIT_TOKEN: 'test-only', GHL_LOCATION_ID: 'test-location'}},
    console: {log() {}, error() {}}, AbortSignal,
    fetch: async (url, options = {}) => {
      const method = options.method || 'GET', payload = JSON.parse(options.body || 'null');
      calls.push({url, method, payload});
      if (url.endsWith('/contacts/')) return existing ? reply({meta: {contactId: 'c1'}}, 400) : reply({contact: {id: 'c1'}}, 201);
      if (url.endsWith('/notes') && method === 'GET') return reply({notes: []});
      if (url.endsWith('/notes')) return reply({note: {id: 'note-1'}}, 201);
      if (url.endsWith('/tags')) return reply({tags: payload.tags}, 201);
      if (url.includes('/pipelines?')) return reply({pipelines: [{id: 'p1', name: 'Builderk', stages: [{id: 's1', name: 'Lead Generation'}]}]});
      if (url.endsWith('/opportunities/')) return reply({opportunity: {id: 'o1'}}, 201);
      if (method === 'PUT') {
        stored = {...stored, customFields: payload.customFields.map(f => ({id: f.id, value: f.field_value}))};
        return reply({succeeded: true, contact: stored});
      }
      return reply({contact: stored});
    }};
  vm.createContext(sandbox);
  vm.runInContext(read('api/webhook.js').replace('export default async function handler', 'async function handler') + '\nthis.handler=handler;', sandbox);
  const res = {code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(b) { this.body = b; return this; }};
  await sandbox.handler({method: 'POST', body}, res);
  return {res, calls};
}

test('commercial request is tagged, named and valued as commercial, with every detail in the note', async () => {
  const {res, calls} = await webhook(request);
  assert.equal(res.code, 200); assert.equal(res.body.received, true); assert.equal(res.body.opportunity, true);
  const contact = calls.find(x => x.url.endsWith('/contacts/')).payload;
  for (const tag of ['commercial-lead', 'commercial-office-build-out', 'commercial-budget-50k-to-150k', 'commercial-start-1-3-months', 'src-commercial'])
    assert.ok(contact.tags.includes(tag), tag);
  assert.equal(contact.source, 'Commercial Website Form');
  assert.equal(contact.companyName, 'Example Logistics');
  const opp = calls.find(x => x.url.endsWith('/opportunities/')).payload;
  assert.equal(opp.name, 'Example Logistics — Commercial Office build out');
  assert.equal(opp.source, 'Commercial Website Form');
  assert.equal(opp.monetaryValue, 100000);
  const note = calls.find(x => x.url.endsWith('/notes')).payload.body;
  for (const line of ['company: Example Logistics', 'project_type: Office build out', 'space_size: 1,500 to 5,000 sq ft',
    'plans_status: No plans yet', 'space_open: Yes, it stays open', 'bid_due: 2026-11-02', 'files_link: https://drive.example.test/plans', 'contact_role: Facility or operations manager', 'project_location: Orlando, FL', 'budget: $50K to $150K'])
    assert.ok(note.includes(line), line);
});

// GHL texts every contact tagged website-lead about building a custom home (N1 Speed to Lead) and starts
// the home buyer follow up; timeline and lot tags belong to the home flows too.
const HOME_TAGS = /^(website-lead|new-lead|homepage-lead|ready-to-start|within-3-months|within-6-months|within-1-year|just-exploring|owns-lot|still-looking-lot|lot-under-contract)$/;

test('commercial leads never get the home buyer tags, new or existing contact', async () => {
  for (const timeline of ['ASAP', '1-3 months', '3-6 months', '6-12 months', 'Just exploring']) {
    const {calls} = await webhook({...request, timeline, utm_source: 'google', utm_campaign: '24328051357'});
    const tags = calls.find(x => x.url.endsWith('/contacts/')).payload.tags;
    assert.ok(!tags.some(t => HOME_TAGS.test(t)), `${timeline}: ${tags}`);
    assert.ok(tags.includes('utm-google') && tags.includes('camp-24328051357'), 'ad attribution kept');
  }
  // An existing contact keeps its record; the request still adds the commercial tags, never website-lead
  const {res, calls} = await webhook(request, {existing: true});
  assert.equal(res.body.received, true); assert.equal(res.body.opportunity, true);
  const added = calls.find(x => x.url.endsWith('/contacts/c1/tags'));
  assert.ok(added && added.method === 'POST', 'commercial tags added to the existing contact');
  assert.ok(added.payload.tags.includes('commercial-lead') && !added.payload.tags.some(t => HOME_TAGS.test(t)));
});

test('home leads keep website-lead, so the home follow up is unchanged', async () => {
  const home = {form_type: 'website-contact', name: 'Home Buyer', email: 'home@example.test', phone: '(407) 555 0100',
    budget: '$400K - $700K', timeline: '1-3 months', lot_ownership: 'Yes', zip_code: '32839', source_page: '/'};
  const {res, calls} = await webhook(home);
  assert.equal(res.body.received, true);
  const contact = calls.find(x => x.url.endsWith('/contacts/')).payload;
  for (const tag of ['website-lead', '400k-700k', 'within-3-months', 'owns-lot']) assert.ok(contact.tags.includes(tag), tag);
  assert.ok(!contact.tags.includes('commercial-lead'));
  assert.equal(contact.source, 'Website Form');
  assert.equal(contact.companyName, undefined);
  assert.equal(calls.find(x => x.url.endsWith('/opportunities/')).payload.source, 'Website Form');
});

test('commercial budgets never go into the home budget field', async () => {
  const {res, calls} = await webhook(request);
  assert.equal(res.body.attributionSaved, true);
  const put = calls.find(x => x.method === 'PUT');
  assert.ok(put, 'website fields saved');
  assert.ok(!put.payload.customFields.some(f => f.id === 't12BUfifRAcaCk7Uu3un'), 'budget field untouched');
  assert.ok(put.payload.customFields.some(f => f.field_value === 'Orlando, FL'), 'project location saved');
});

test('"Not sure yet" budget is welcome and starts at zero value; large ranges carry their value', async () => {
  const {calls} = await webhook({...request, budget: 'Not sure yet'});
  assert.equal(calls.find(x => x.url.endsWith('/opportunities/')).payload.monetaryValue, 0);
  for (const [budget, value, tag] of [['$500K to $1M', 750000, 'commercial-budget-500k-to-1m'], ['Over $1M', 1250000, 'commercial-budget-over-1m']]) {
    const big = await webhook({...request, budget});
    assert.equal(big.calls.find(x => x.url.endsWith('/opportunities/')).payload.monetaryValue, value);
    assert.ok(big.calls.find(x => x.url.endsWith('/contacts/')).payload.tags.includes(tag), tag);
  }
});

test('incomplete commercial requests are rejected before anything is written', async () => {
  for (const missing of ['company', 'project_type', 'project_location', 'budget', 'timeline', 'name']) {
    const {res, calls} = await webhook({...request, [missing]: ''});
    assert.equal(res.code, 400, missing); assert.equal(calls.length, 0, missing);
  }
  const {res} = await webhook({...request, phone: 'call me'});
  assert.equal(res.code, 400);
});

test('commercial page form matches what the CRM requires and the call bar points to it', async () => {
  const w = new JSDOM(read('commercial.html'), {url: 'https://www.builderk.com/commercial', runScripts: 'outside-only'}).window;
  if (w.document.readyState === 'loading') await new Promise(r => w.document.addEventListener('DOMContentLoaded', r));
  const form = w.document.getElementById('commercial-form');
  for (const name of ['name', 'company', 'phone', 'email', 'project_type', 'project_location', 'budget', 'timeline'])
    assert.equal(form.elements[name].required, true, name);
  for (const name of ['space_size', 'plans_status', 'space_open', 'bid_due', 'files_link', 'contact_role', 'message', '_gotcha'])
    assert.ok(form.elements[name], name);
  assert.deepEqual([...form.elements.timeline.options].slice(1).map(o => o.value), ['ASAP', '1-3 months', '3-6 months', '6-12 months', 'Just exploring']);
  assert.equal(form.elements.source_page.value, '/commercial');
  assert.ok(read('commercial.html').includes("BuilderKLeadSubmit.bind(form,'website-commercial')"));
  w.eval(read('scripts/call-bar.js'));
  const talk = w.document.querySelector('.bk-call-bar .bk-talk');
  assert.equal(talk.getAttribute('href'), '#commercial-form'); assert.equal(talk.textContent, 'Request a bid');
  w.close();
});

test('commercial page copy keeps the site rules', () => {
  const html = read('commercial.html');
  const text = new JSDOM(html).window.document.body.textContent;
  for (const banned of [/Talk to a Builder/i, /architect/i, /\bAI\b/, /per sq(uare)? f(oo)?t/i, /\$\d+\s*\/\s*sq/i, /CSX|TDSI|Inter-?Rail|Paramount|Smoothie King|\bM(U|\u00dc)V\b|Cathcart|T\.?Land|Pinsa/i])
    assert.ok(!banned.test(text), String(banned));
  assert.ok(!/[–—]/.test(text), 'no dashes in visible copy');
  for (const img of new JSDOM(html).window.document.querySelectorAll('img')) assert.ok(img.getAttribute('alt'), img.src);
  for (const v of new JSDOM(html).window.document.querySelectorAll('video')) {
    assert.ok(v.hasAttribute('muted') && v.hasAttribute('playsinline') && v.getAttribute('preload') === 'none', 'quiet lazy video');
    assert.ok(v.getAttribute('aria-label') && v.getAttribute('poster'), 'video label and poster');
  }
});

test('commercial page leads with the client and keeps past work in one section', () => {
  const html = read('commercial.html');
  const doc = new JSDOM(html).window.document;
  // Kevin, 5 Oct 2026: no "storefront", no door photo with the paper sign
  assert.ok(!/storefront/i.test(html), 'no storefront wording');
  assert.ok(!html.includes('clermont-sign'), 'no paper sign photo');
  // the client's needs come right after the hero, past jobs live only in Recent commercial jobs
  const sections = [...doc.querySelectorAll('main > section')].map(s => s.id || s.className);
  assert.equal(sections[1], 'needs');
  assert.equal(doc.querySelectorAll('#needs .need').length, 6);
  const jobs = doc.getElementById('projects');
  assert.equal(jobs.querySelectorAll('.job').length, 4);
  assert.equal(doc.querySelectorAll('video').length, jobs.querySelectorAll('video').length, 'videos only in the jobs section');
  jobs.remove();
  assert.ok(!/Apopka|Clermont|Altamonte|Miami/.test(doc.body.textContent), 'job cities only in the jobs section');
});
