import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execSync} from 'node:child_process';
import {JSDOM} from 'jsdom';

const root = new URL('../', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');
const script = read('scripts/call-tracking.js');
const pages = execSync('git ls-files "*.html"', {cwd: root}).toString().trim().split(/\r?\n/);
const OFFICE = '(239) 230 4868';

// Load a real page with only the call tracking script running, then hand it a forwarding number the way Google does.
function visit(page) {
  const path = '/' + page.replace(/(index)?\.html$/, '').replace(/\/$/, '');
  const w = new JSDOM(read(page), {url: 'https://www.builderk.com' + path, runScripts: 'outside-only'}).window;
  w.eval(script);
  const config = w.dataLayer.map(a => Array.from(a)).find(a => a[0] === 'config' && /^AW-11388675250\//.test(a[1]));
  return {w, config, receive: config[2].phone_conversion_callback};
}
const ready = async w => { if (w.document.readyState === 'loading') await new Promise(r => w.document.addEventListener('DOMContentLoaded', r)); };
const visibleText = w => {
  const clone = w.document.body.cloneNode(true);
  clone.querySelectorAll('script, style, noscript, template').forEach(el => el.remove());
  return clone.textContent;
};

test('every page with the Google Ads tag loads the call tracking script once, after the tag', () => {
  const tagged = pages.filter(p => /gtag\(\s*'config'\s*,\s*'AW-11388675250'\s*\)/.test(read(p)));
  assert.ok(tagged.length >= 40, 'expected the whole site, found ' + tagged.length);
  for (const page of tagged) {
    const html = read(page);
    assert.equal(html.split('/scripts/call-tracking.js').length - 1, 1, page);
    assert.ok(html.indexOf('/scripts/call-tracking.js') > html.search(/gtag\(\s*'config'\s*,\s*'AW-11388675250'\s*\)/), page);
  }
});

test('the number given to Google is written exactly as the pages show it', () => {
  const {config, w} = visit('index.html');
  assert.equal(config[1], 'AW-11388675250/oOI5CNPz_J0dELLJxbYq');
  assert.equal(config[2].phone_conversion_number, OFFICE);
  assert.ok(visibleText(w).includes(OFFICE));
  w.close();
});

test('a visitor from an ad sees and dials the forwarding number everywhere, in the site format', async () => {
  for (const page of ['index.html', 'contact.html', 'referral-program/index.html', 'commercial.html']) {
    const {w, receive} = visit(page);
    await ready(w);
    const ld = Array.from(w.document.querySelectorAll('script[type="application/ld+json"]')).map(s => s.textContent);
    const before = Array.from(w.document.querySelectorAll('a[href^="tel:"]')).length;
    assert.ok(before > 0, page);
    receive('(239) 555-0142', '+12395550142');
    const text = visibleText(w);
    assert.ok(!text.includes(OFFICE), page + ' still shows the office number');
    assert.ok(text.includes('(239) 555 0142'), page);
    assert.ok(!text.includes('555-0142'), page + ' shows a hyphen');
    const links = Array.from(w.document.querySelectorAll('a[href^="tel:"]')).map(a => a.getAttribute('href'));
    assert.equal(links.length, before);
    assert.deepEqual([...new Set(links)], ['tel:2395550142'], page);
    for (const el of w.document.querySelectorAll('[aria-label]')) assert.ok(!el.getAttribute('aria-label').includes(OFFICE), page);
    // Structured data for search engines keeps the real office line.
    assert.deepEqual(Array.from(w.document.querySelectorAll('script[type="application/ld+json"]')).map(s => s.textContent), ld);
    w.close();
  }
});

test('parts of the page drawn later, like the phone call bar, get the forwarding number too', async () => {
  const {w, receive} = visit('contact.html');
  await ready(w);
  receive('(239) 555-0142', '12395550142');
  w.eval(read('scripts/call-bar.js'));
  await new Promise(r => setTimeout(r, 0));
  const call = w.document.querySelector('.bk-call-bar a.bk-call');
  assert.equal(call.getAttribute('href'), 'tel:2395550142');
  assert.equal(call.textContent, 'Call (239) 555 0142');
  assert.equal(call.getAttribute('aria-label'), 'Call BuilderK at (239) 555 0142');
  w.close();
});

test('a number that arrives while the page is still loading is applied once it is ready', async () => {
  const {w, receive} = visit('index.html');
  receive('(239) 555-0142', '+12395550142');
  await ready(w);
  assert.ok(!visibleText(w).includes(OFFICE));
  w.close();
});

test('visitors without a forwarding number keep the office line', async () => {
  for (const args of [['(239) 230-4868', '2392304868'], ['', ''], ['555', '555'], [undefined, undefined]]) {
    const {w, receive} = visit('index.html');
    await ready(w);
    const html = w.document.body.innerHTML;
    receive(...args);
    assert.equal(w.document.body.innerHTML, html);
    w.close();
  }
});
