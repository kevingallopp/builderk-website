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
  contact_role: 'Facility or operations manager', message: 'Two offices and a break room',
  source_page: '/commercial', submission_id: '11111111-2222-4333-8444-555555555555',
};

// The real handler with every upstream call intercepted. No live credentials or leads.
async function webhook(body) {
  const calls = [];
  let stored = {id: 'c1', locationId: 'test-location', email: 'qa@example.test', customFields: []};
  const reply = (json, status = 200) => ({ok: status < 400, status, json: async () => json});
  const sandbox = {process: {env: {GHL_PIT_TOKEN: 'test-only', GHL_LOCATION_ID: 'test-location'}},
    console: {log() {}, error() {}}, AbortSignal,
    fetch: async (url, options = {}) => {
      const method = options.method || 'GET', payload = JSON.parse(options.body || 'null');
      calls.push({url, method, payload});
      if (url.endsWith('/contacts/')) return reply({contact: {id: 'c1'}}, 201);
      if (url.endsWith('/notes')) return reply({note: {id: 'note-1'}}, 201);
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
  for (const tag of ['website-lead', 'commercial-lead', 'commercial-office-build-out', 'commercial-budget-50k-to-150k', 'within-3-months', 'src-commercial'])
    assert.ok(contact.tags.includes(tag), tag);
  assert.ok(!contact.tags.some(t => /^(owns-lot|still-looking-lot|lot-under-contract)$/.test(t)));
  const opp = calls.find(x => x.url.endsWith('/opportunities/')).payload;
  assert.equal(opp.name, 'Example Logistics — Commercial Office build out');
  assert.equal(opp.monetaryValue, 100000);
  const note = calls.find(x => x.url.endsWith('/notes')).payload.body;
  for (const line of ['company: Example Logistics', 'project_type: Office build out', 'space_size: 1,500 to 5,000 sq ft',
    'plans_status: No plans yet', 'contact_role: Facility or operations manager', 'project_location: Orlando, FL', 'budget: $50K to $150K'])
    assert.ok(note.includes(line), line);
});

test('commercial budgets never go into the home budget field', async () => {
  const {res, calls} = await webhook(request);
  assert.equal(res.body.attributionSaved, true);
  const put = calls.find(x => x.method === 'PUT');
  assert.ok(put, 'website fields saved');
  assert.ok(!put.payload.customFields.some(f => f.id === 't12BUfifRAcaCk7Uu3un'), 'budget field untouched');
  assert.ok(put.payload.customFields.some(f => f.field_value === 'Orlando, FL'), 'project location saved');
});

test('"Not sure yet" budget is welcome and starts at zero value', async () => {
  const {calls} = await webhook({...request, budget: 'Not sure yet'});
  assert.equal(calls.find(x => x.url.endsWith('/opportunities/')).payload.monetaryValue, 0);
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
  for (const name of ['space_size', 'plans_status', 'contact_role', 'message', '_gotcha'])
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
  for (const banned of [/Talk to a Builder/i, /architect/i, /\bAI\b/, /per sq(uare)? f(oo)?t/i, /\$\d+\s*\/\s*sq/i, /CSX|TDSI|Inter-?Rail|Paramount/i])
    assert.ok(!banned.test(text), String(banned));
  assert.ok(!/[–—]/.test(text), 'no dashes in visible copy');
  for (const img of new JSDOM(html).window.document.querySelectorAll('img')) assert.ok(img.getAttribute('alt'), img.src);
});
