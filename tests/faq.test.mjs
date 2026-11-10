import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';

// The FAQ page and the structured data on the plan, process, service area and financing pages
// repeat facts the site already shows. These tests fail when one side changes without the other.
const SITE = 'https://www.builderk.com';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const clean = s => s.replace(/\s+/g, ' ').trim();
// typographic hyphens and dashes (code points 2010 to 2015); the site copy never uses them
const DASHES = new RegExp('[' + String.fromCharCode(0x2010) + '-' + String.fromCharCode(0x2015) + ']');
const docs = new Map();
const doc = page => {
  if (!docs.has(page)) docs.set(page, new JSDOM(read(page)).window.document);
  return docs.get(page);
};
const text = el => clean(el.textContent);
const ld = page => [...doc(page).querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));
const ldOfType = (page, type) => {
  const all = ld(page).flatMap(b => b['@graph'] || [b]).filter(b => b['@type'] === type);
  assert.equal(all.length, 1, `${page} carries exactly one ${type} block`);
  return all[0];
};
const canonical = page => doc(page).querySelector('link[rel="canonical"]').href;
const planPages = [1250, 1700, 1977, 2377, 2385].map(sq => `floor-plan-${sq}-sq-ft.html`);
const dataPages = ['faq.html', 'process.html', 'service-areas.html', 'floor-plans.html', 'financing.html', ...planPages];

test('structured data on the FAQ, process, service area, plan and financing pages parses', () => {
  for (const page of dataPages) {
    const blocks = ld(page);
    assert.ok(blocks.length >= 1, `${page} has structured data`);
    for (const b of blocks) assert.equal(b['@context'], 'https://schema.org', page);
  }
});

test('FAQ page: every question shown is in the structured data, word for word', () => {
  const shown = [...doc('faq.html').querySelectorAll('.faq-cards details')].map(d => [text(d.querySelector('summary')), text(d.querySelector('.faq-answer'))]);
  const data = ldOfType('faq.html', 'FAQPage').mainEntity.map(q => [q.name, q.acceptedAnswer.text]);
  assert.ok(shown.length >= 30, 'the page keeps its questions');
  assert.deepEqual(data, shown);
  assert.equal(new Set(shown.map(([q]) => q)).size, shown.length, 'no question repeats');
  for (const [q, a] of shown) {
    assert.ok(!DASHES.test(q + a), `no dashes: ${q}`);
    assert.ok(!/[A-Za-z]-[A-Za-z]/.test(q + a), `no hyphenated words: ${q}`);
  }
});

test('FAQ page: planning rates and their date match the shared pricing config', () => {
  const w = {};
  vm.runInNewContext(read('scripts/pricing-config.js'), {window: w});
  const pricing = w.BuilderKPricing;
  const answer = ldOfType('faq.html', 'FAQPage').mainEntity.find(q => q.name === 'How much does it cost to build a custom home in Florida?').acceptedAnswer.text;
  for (const tier of Object.values(pricing.tiers)) {
    const expected = `${tier.name} (${tier.label.replace(' / sq ft', '/sqft')})`;
    assert.ok(answer.includes(expected), `FAQ shows ${expected}`);
  }
  assert.ok(answer.includes(`last updated ${pricing.lastUpdated}`), 'FAQ shows the pricing date');
});

test('FAQ page: canonical, sitemap entry and working internal links', () => {
  assert.equal(canonical('faq.html'), SITE + '/faq');
  assert.ok(read('sitemap.xml').includes(`<loc>${SITE}/faq</loc>`), 'sitemap lists /faq');
  const links = [...doc('faq.html').querySelectorAll('a[href^="/"]')].map(a => a.getAttribute('href').split('#')[0]).filter(Boolean);
  assert.ok(links.length > 20);
  for (const href of new Set(links)) {
    const path = href === '/' ? 'index.html' : href.slice(1);
    assert.ok(existsSync(new URL(path + '.html', root)) || existsSync(new URL(path + '/index.html', root)) || existsSync(new URL(path, root)), `link target exists: ${href}`);
  }
});

test('every page with the shared footer links to the FAQ once', () => {
  const pages = [...readdirSync(root).filter(f => f.endsWith('.html')), 'referral-program/index.html'];
  let checked = 0;
  for (const page of pages) {
    const html = read(page);
    const a = html.indexOf('<footer class="a5-footer"');
    if (a < 0) continue;
    const footer = html.slice(a, html.indexOf('</footer>', a));
    assert.equal(footer.split('<a href="/faq">FAQ</a>').length - 1, 1, `${page} footer links to /faq once`);
    checked++;
  }
  assert.ok(checked >= 30, 'the shared footer was found');
});

test('process page: the HowTo data mirrors the 8 steps shown', () => {
  const shown = [...doc('process.html').querySelectorAll('.proc-step')].map(s => ({
    name: text(s.querySelector('.proc-title')),
    text: `${text(s.querySelector('.proc-when'))}. ${text(s.querySelector('.proc-text'))} ${text(s.querySelector('.proc-receive p'))}`,
  }));
  const howTo = ldOfType('process.html', 'HowTo');
  assert.equal(shown.length, 8);
  assert.equal(howTo.url, canonical('process.html'));
  assert.deepEqual(howTo.step.map(s => s.position), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(howTo.step.map(s => ({name: s.name, text: s.text})), shown);
});

test('service areas page: the cities in the data are the cities on the cards', () => {
  const shown = [...doc('service-areas.html').querySelectorAll('.area-card .card-title')].map(text);
  const builder = ldOfType('service-areas.html', 'HomeBuilder');
  const home = ldOfType('index.html', 'HomeBuilder');
  assert.equal(shown.length, 8);
  assert.deepEqual(builder.areaServed.filter(a => a['@type'] === 'City').map(a => a.name), shown);
  assert.equal(builder.url, canonical('service-areas.html'));
  for (const key of ['name', 'legalName', 'telephone', 'email', 'address']) assert.deepEqual(builder[key], home[key], `${key} matches the home page`);
});

test('plan pages: the FloorPlan data mirrors the specifications shown', () => {
  for (const page of planPages) {
    const d = doc(page);
    const spec = Object.fromEntries([...d.querySelectorAll('.specs-grid .spec')].map(s => [text(s.querySelector('.spec-label')), text(s.querySelector('.spec-value'))]));
    const plan = ldOfType(page, 'FloorPlan');
    const feature = name => plan.amenityFeature.find(f => f.name === name).value;
    assert.equal(plan.url, canonical(page), page);
    assert.equal(plan.floorSize.value, Number(spec['Square Feet'].replace(/,/g, '')), page);
    assert.equal(plan.floorSize.unitCode, 'FTK', page);
    assert.equal(plan.numberOfBedrooms, Number(spec.Bedrooms), page);
    assert.equal(plan.numberOfFullBathrooms + (plan.numberOfPartialBathrooms || 0) / 2, Number(spec.Bathrooms), page);
    assert.equal(plan.numberOfBathroomsTotal, plan.numberOfFullBathrooms + (plan.numberOfPartialBathrooms || 0), page);
    assert.equal(feature('Stories'), Number(spec.Stories), page);
    assert.equal(feature('Garage'), spec.Garage, page);
    assert.equal(plan.description, d.querySelector('meta[name="description"]').content, page);
    assert.ok(existsSync(new URL(new URL(plan.image).pathname.slice(1), root)), `${page} image exists`);
    assert.ok(!('offers' in plan) && !JSON.stringify(plan).includes('$'), `${page} data carries no price`);
    const crumbs = [...d.querySelectorAll('.crumbs a, .crumbs [aria-current]')].map(text);
    const list = ldOfType(page, 'BreadcrumbList').itemListElement;
    assert.deepEqual(list.map(i => i.name), crumbs, page);
    assert.deepEqual(list.map(i => i.item), [SITE + '/', SITE + '/floor-plans', canonical(page)], page);
  }
});

test('floor plans page: the ItemList follows the plan cards in order', () => {
  // the grid also holds cards that lead to contact and the calculator; only the plan cards count
  const cards = [...doc('floor-plans.html').querySelectorAll('a.plan-card[href^="/floor-plan-"]')].map(a => SITE + a.getAttribute('href'));
  const list = ldOfType('floor-plans.html', 'ItemList');
  assert.equal(cards.length, 5);
  assert.equal(list.numberOfItems, 5);
  assert.deepEqual(list.itemListElement.map(i => i.url), cards);
  assert.deepEqual(list.itemListElement.map(i => i.position), [1, 2, 3, 4, 5]);
  for (const item of list.itemListElement) {
    const page = new URL(item.url).pathname.slice(1) + '.html';
    assert.equal(item.name, ldOfType(page, 'FloorPlan').name, page);
  }
});

test('financing page: the FAQ data mirrors the questions shown', () => {
  const shown = [...doc('financing.html').querySelectorAll('.fin-faq details')].map(d => [text(d.querySelector('summary')), text(d.querySelector('.a5-faq-a'))]);
  const data = ldOfType('financing.html', 'FAQPage').mainEntity.map(q => [q.name, q.acceptedAnswer.text]);
  assert.equal(shown.length, 7);
  assert.deepEqual(data, shown);
});
