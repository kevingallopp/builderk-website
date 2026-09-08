import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import vm from 'node:vm';
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const key = 'builderk-lead-attribution-v1';
function visit(path, {previous, referrer, blocked = false, saved} = {}) {
  const d = new JSDOM('<form></form>', {url: 'https://www.builderk.com' + path, referrer,
    runScripts: 'outside-only'});
  const w = d.window;
  if (previous) saved = previous.sessionStorage.getItem(key);
  if (saved) w.sessionStorage.setItem(key, saved);
  if (blocked) Object.defineProperty(w, 'sessionStorage', {get() {throw Error('blocked');}});
  w.eval(read('scripts/lead-attribution.js'));
  return w;
}
const data = w => JSON.parse(JSON.stringify(w.BuilderKAttribution.payload()));

test('campaign survives landing to plan to calculator to contact with no decorated links', () => {
  const landing = visit('/orlando?utm_source=google&utm_medium=cpc&utm_campaign=custom_homes&utm_content=ad_a&utm_term=build+on+my+lot', {referrer: 'https://www.google.com/search?q=private-query'});
  const plan = visit('/floor-plan-1977-sq-ft', {previous: landing, referrer: landing.location.href});
  const calc = visit('/calculator?sqft=1977&plan=floor-plan-1977-sq-ft', {previous: plan, referrer: plan.location.href});
  const contact = visit('/contact', {previous: calc, referrer: calc.location.href});
  const result = data(contact);
  assert.equal(result.first_source, 'google');
  assert.equal(result.last_source, 'google');
  assert.equal(result.first_landing_page, '/orlando');
  assert.equal(result.last_landing_page, '/orlando');
  assert.equal(result.utm_campaign, 'custom_homes');
  assert.equal(result.utm_content, 'ad_a');
  assert.equal(result.utm_term, 'build on my lot');
  assert.equal(result.submission_page, '/contact');
  assert.equal(result.first_referrer_host, 'www.google.com');
  assert.equal(result.attribution_scope, 'tab_session');
  assert.ok(!contact.location.search);
  [landing, plan, calc, contact].forEach(w => w.close());
});

test('later campaign replaces the whole last touch without mixing previous campaign values', () => {
  const a = visit('/miami?utm_source=google&utm_medium=cpc&utm_campaign=old&utm_content=old-ad');
  const b = visit('/financing?utm_source=facebook&utm_campaign=new', {previous: a});
  const c = visit('/contact', {previous: b, referrer: b.location.href});
  assert.equal(data(c).first_source, 'google');
  assert.equal(data(c).last_source, 'facebook');
  assert.equal(data(c).last_landing_page, '/financing');
  assert.equal(data(c).utm_medium, '');
  assert.equal(data(c).utm_content, '');
  assert.equal(data(c).utm_campaign, 'new');
  [a, b, c].forEach(w => w.close());
});

test('external referral is recorded as a hostname, without inventing a paid campaign', () => {
  const a = visit('/about', {referrer: 'https://www.facebook.com/path?email=private@example.test#secret'});
  const b = visit('/contact', {previous: a, referrer: a.location.href});
  assert.equal(data(b).first_source, 'www.facebook.com');
  assert.equal(data(b).first_medium, 'referral');
  assert.equal(data(b).utm_campaign, '');
  assert.ok(!JSON.stringify(data(b)).includes('private'));
  [a, b].forEach(w => w.close());
});

test('direct internal navigation and the alternate canonical host do not replace campaign', () => {
  const a = visit('/?utm_source=google&utm_campaign=homes');
  const b = visit('/contact', {previous: a, referrer: 'https://builderk.com/calculator'});
  assert.equal(data(b).last_source, 'google');
  assert.equal(data(b).last_landing_page, '/');
  [a, b].forEach(w => w.close());
});

test('unknown and partial campaign sources remain explicit', () => {
  const direct = visit('/contact');
  const partial = visit('/contact?utm_campaign=homes');
  assert.equal(data(direct).first_source, '(direct or unknown)');
  assert.equal(data(partial).first_source, '(not set)');
  [direct, partial].forEach(w => w.close());
});

test('storage excludes arbitrary query parameters, full URLs and rejected UTM values', () => {
  const w = visit('/contact?utm_source=google&utm_campaign=user%40example.test&email=private@example.test&token=private-token&gclid=private-click#private-fragment');
  const stored = w.sessionStorage.getItem(key);
  assert.ok(!stored.includes('private'));
  assert.ok(!stored.includes('example.test'));
  assert.equal(data(w).utm_source, 'google');
  assert.equal(data(w).utm_campaign, '');
  w.close();
});

test('expired, corrupt and future storage cannot restore a stale campaign', () => {
  for (const saved of ['bad json', JSON.stringify({first: {at: 1}, last: {at: 1}}),
    JSON.stringify({first: {at: Date.now() + 60000}, last: {at: Date.now() + 60000}})]) {
    const w = visit('/contact', {saved});
    assert.equal(data(w).first_source, '(direct or unknown)');
    assert.equal(data(w).utm_campaign, '');
    w.close();
  }
  const w = visit('/?utm_source=google');
  w.Date.now = () => Date.now() + 3 * 60 * 60 * 1000;
  assert.equal(data(w).attribution_scope, 'expired');
  assert.equal(data(w).utm_source, '');
  assert.equal(data(w).first_source, undefined);
  w.close();
});

test('blocked storage still captures the current page and does not break submission', () => {
  const w = visit('/contact?utm_source=google', {blocked: true});
  assert.equal(data(w).attribution_scope, 'page_only');
  assert.equal(data(w).utm_source, 'google');
  w.close();
});

for (const kind of ['website-contact', 'calculator-estimate', 'referral']) test(`${kind} sends identical attribution to CRM and Formspree`, async () => {
  const landing = visit('/orlando?utm_source=google&utm_medium=cpc&utm_campaign=homes');
  const w = visit('/contact', {previous: landing, referrer: landing.location.href});
  const calls = [], events = [];
  w.AbortController = AbortController;
  w.gtag = (...args) => events.push(args);
  w.fetch = async (url, options) => {
    calls.push({url, body: url === '/api/webhook' ? JSON.parse(options.body) : Object.fromEntries(options.body)});
    return {ok: true, json: async () => ({success: true, received: true, next: '/thanks'})};
  };
  w.eval(read('scripts/lead-context.js'));
  w.BuilderKLeadContext.save({calc_sqft: 1977, utm_source: 'stale', utm_campaign: 'old'});
  const form = w.document.querySelector('form');
  w.BuilderKLeadContext.attach(form);
  form.querySelector('button').click();
  w.eval(read('scripts/lead-submit.js'));
  const result = await w.BuilderKLeadSubmit.submit({email: 'qa@example.test', form_type: kind, utm_source: 'stale'}, 'https://formspree.io/f/test');
  assert.equal(result.received, true);
  assert.deepEqual(calls[0].body, calls[1].body);
  assert.equal(calls[0].body.utm_source, 'google');
  assert.equal(calls[0].body.first_landing_page, '/orlando');
  assert.equal(events.filter(x => x[1] === 'conversion').length, 1);
  assert.ok(!JSON.stringify(events).includes('homes'));
  [landing, w].forEach(x => x.close());
});

test('GHL saves first and last attribution in the request note for an existing contact', async () => {
  const calls = [];
  const sandbox = {process: {env: {GHL_PIT_TOKEN: 'test-only', GHL_LOCATION_ID: 'test-location'}}, AbortSignal,
    console: {error() {}}, fetch: async (url, options) => {
      const body = JSON.parse(options.body || 'null'); calls.push({url, body});
      if (url.endsWith('/contacts/')) return {ok: false, status: 400, json: async () => ({meta: {contactId: 'c1'}})};
      return {ok: true, status: 200, json: async () => url.endsWith('/notes') ? {note: {id: 'n1'}} : {pipelines: []}};
    }};
  vm.createContext(sandbox);
  vm.runInContext(read('api/webhook.js').replace('export default async function handler', 'async function handler') + '\nthis.handler=handler;', sandbox);
  const res = {setHeader() {}, status() {return this;}, json(body) {this.body = body;}};
  await sandbox.handler({method: 'POST', body: {email: 'qa@example.test', first_source: 'google', first_campaign: 'initial',
    last_source: 'facebook', last_campaign: 'latest', first_landing_page: '/orlando', last_landing_page: '/financing',
    utm_content: 'ad-b', submission_page: '/contact', attribution_scope: 'tab_session'}}, res);
  assert.equal(res.body.received, true);
  const note = calls.find(x => x.url.endsWith('/notes')).body.body;
  for (const field of ['first_source: google', 'last_source: facebook', 'first_campaign: initial',
    'last_campaign: latest', 'first_landing_page: /orlando', 'last_landing_page: /financing', 'utm_content: ad-b', 'submission_page: /contact'])
    assert.ok(note.includes(field), field);
});

test('every public marketing page and the floor-plan generator include attribution once before form scripts', () => {
  const publicFiles = readdirSync(new URL('..', import.meta.url)).filter(x => x.endsWith('.html') && !['intranet.html', 'selections-image-options.html'].includes(x));
  publicFiles.push('referral-program/index.html', 'scripts/generate-floor-plan-pages.mjs');
  for (const name of publicFiles) {
    const html = read(name);
    assert.equal((html.match(/src="\/scripts\/lead-attribution.js"/g) || []).length, 1, name);
    if (html.includes('src="/scripts/lead-submit.js"')) assert.ok(html.indexOf('lead-attribution.js') < html.indexOf('lead-submit.js'), name);
  }
  for (const name of ['intranet.html', 'selections-image-options.html', 'intranet/calendar.html'])
    assert.ok(!read(name).includes('lead-attribution.js'), name);
});
