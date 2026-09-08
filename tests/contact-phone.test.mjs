import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../api/webhook.js', import.meta.url), 'utf8');
const request = {name: 'Test Visitor', email: 'qa@example.test', phone: '(202) 555-0123'};

// Exercise the actual handler with all upstream calls intercepted. No live credentials or leads.
async function submit({body = request, duplicate = true, status = 400, current = {}, fail,
  updateBody, noteFails = false} = {}) {
  const calls = [], logs = [];
  const stored = {id: 'contact-1', locationId: 'test-location', email: 'QA@example.test',
    phone: null, firstName: 'qa', tags: ['keep-tag'], assignedTo: 'owner-1', dnd: true, ...current};
  const reply = (body, status = 200) => ({ok: status < 400, status, json: async () => body});
  const sandbox = {
    process: {env: {GHL_PIT_TOKEN: 'test-only', GHL_LOCATION_ID: 'test-location'}},
    AbortSignal, console: {error: (...args) => logs.push(args)},
    fetch: async (url, options) => {
      const method = options.method || 'GET';
      const payload = JSON.parse(options.body || 'null');
      calls.push({url, method, payload});
      if (url.endsWith('/contacts/')) return duplicate
        ? reply({meta: {contactId: 'contact-1'}}, status) : reply({contact: stored}, 201);
      if (url.endsWith('/notes')) return noteFails ? reply({}, 403) : reply({note: {id: 'note-1'}}, 201);
      if (url.includes('/pipelines?')) return reply({pipelines: [
        {id: 'pipeline-1', name: 'Builderk', stages: [{id: 'stage-1', name: 'Lead Generation'}]},
      ]});
      if (url.endsWith('/opportunities/')) return reply({opportunity: {id: 'opportunity-1'}}, 201);
      assert.ok(url.endsWith('/contacts/contact-1'), 'unexpected upstream destination');
      if (fail === method + '-network') throw Error('simulated lost response');
      if (fail === method + '-http') return reply({}, 403);
      if (method === 'GET') return reply({contact: stored});
      assert.equal(method, 'PUT');
      return reply(updateBody ?? {succeeded: true, contact: {...stored, ...payload}});
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(source.replace('export default async function handler', 'async function handler') +
    '\nthis.handler = handler;', sandbox);
  const res = {code: 200, setHeader() {}, status(code) {this.code = code; return this;},
    json(body) {this.body = body; return this;}};
  await sandbox.handler({method: 'POST', body}, res);
  return {calls, logs, res};
}

for (const phone of [null, undefined, '', '  ']) test(`email-only contact receives phone when stored value is ${JSON.stringify(phone)}`, async () => {
  const {res, calls} = await submit({current: {phone}});
  assert.equal(res.body.contactPhone, 'updated');
  assert.equal(res.body.received, true);
  assert.equal(res.body.opportunity, true);
  const updates = calls.filter(x => x.method === 'PUT');
  assert.deepEqual(updates.map(x => x.payload), [{phone: '+12025550123'}]);
  assert.ok(calls.findIndex(x => x.url.endsWith('/notes')) < calls.findIndex(x => x.method === 'PUT'));
  assert.match(calls.find(x => x.url.endsWith('/notes')).payload.body, /phone: \(202\) 555-0123/);
});

test('409 duplicate response also fills the missing phone', async () => {
  const {res} = await submit({status: 409});
  assert.equal(res.body.contactPhone, 'updated');
});

for (const phone of ['+12025550199', 'unknown', 123]) test(`existing phone ${phone} is preserved`, async () => {
  const {res, calls} = await submit({current: {phone}});
  assert.equal(res.body.contactPhone, 'preserved');
  assert.equal(calls.filter(x => x.method === 'PUT').length, 0);
});

for (const current of [{email: 'different@example.test'}, {email: null}, {locationId: 'other-location'},
  {id: 'other-contact'}, {locationId: undefined}]) test(`unconfirmed contact identity prevents update: ${JSON.stringify(current)}`, async () => {
  const {res, calls, logs} = await submit({current});
  assert.equal(res.body.contactPhone, 'pending');
  assert.equal(res.body.received, true);
  assert.equal(calls.filter(x => x.method === 'PUT').length, 0);
  assert.equal(logs[0][1].reason, 'contact_not_confirmed');
});

test('calculator requests without a phone perform no additional contact read or update', async () => {
  const {res, calls} = await submit({body: {email: request.email, form_type: 'calculator-estimate'}});
  assert.equal(res.body.contactPhone, 'not_needed');
  assert.equal(calls.filter(x => x.url.endsWith('/contacts/contact-1')).length, 0);
});

test('new contacts keep the existing creation path', async () => {
  const {res, calls} = await submit({duplicate: false});
  assert.equal(res.body.contactPhone, 'not_needed');
  assert.equal(calls[0].payload.phone, '+12025550123');
  assert.equal(calls.filter(x => x.url.endsWith('/contacts/contact-1')).length, 0);
});

test('referral fills the client phone, never the referrer phone', async () => {
  const {res, calls} = await submit({body: {referrer_name: 'Test Referrer', referrer_phone: '2025550199',
    referrer_email: 'referrer@example.test', client_name: request.name, client_email: request.email,
    client_phone: request.phone}});
  assert.equal(res.body.contactPhone, 'updated');
  assert.deepEqual(calls.find(x => x.method === 'PUT').payload, {phone: '+12025550123'});
});

for (const phone of ['call me', '123', '+00000000000']) test(`invalid submitted phone remains in the note: ${phone}`, async () => {
  const {res, calls} = await submit({body: {...request, phone}});
  assert.equal(res.body.contactPhone, 'pending');
  assert.equal(res.body.received, true);
  assert.equal(calls.filter(x => x.url.endsWith('/contacts/contact-1')).length, 0);
  assert.ok(calls.find(x => x.url.endsWith('/notes')).payload.body.includes('phone: ' + phone));
});

for (const fail of ['GET-http', 'GET-network', 'PUT-http', 'PUT-network']) test(`${fail} preserves receipt and never retries the update`, async () => {
  const {res, calls, logs} = await submit({fail});
  assert.equal(res.body.contactPhone, 'pending');
  assert.equal(res.body.received, true);
  assert.equal(res.body.opportunity, true);
  assert.equal(calls.filter(x => x.method === 'PUT').length, fail.startsWith('PUT') ? 1 : 0);
  assert.equal(logs[0][1].contactId, 'contact-1');
  assert.equal(logs[0][1].noteId, 'note-1');
  assert.ok(!JSON.stringify(logs).includes(request.email));
  assert.ok(!JSON.stringify(logs).includes('2025550123'));
});

for (const updateBody of [{}, {succeeded: false, contact: {id: 'contact-1', phone: '+12025550123'}},
  {contact: {id: 'wrong-contact', phone: '+12025550123'}}, {contact: {id: 'contact-1', phone: null}}])
  test(`unconfirmed update never reports completion: ${JSON.stringify(updateBody)}`, async () => {
    const {res, calls} = await submit({updateBody});
    assert.equal(res.body.contactPhone, 'pending');
    assert.equal(res.body.received, true);
    assert.equal(calls.filter(x => x.method === 'PUT').length, 1);
  });

test('failed note save prevents the phone update and receipt acknowledgement', async () => {
  const {res, calls} = await submit({noteFails: true});
  assert.equal(res.code, 502);
  assert.equal(res.body.received, false);
  assert.equal(calls.filter(x => x.url.endsWith('/contacts/contact-1')).length, 0);
});
