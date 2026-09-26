(function (window) {
  'use strict';
  // Attribution belongs to this tab's visit, independently of the removable planning estimate.
  var key = 'builderk-lead-attribution-v1';
  var ttl = 2 * 60 * 60 * 1000;
  var utms = ['source', 'medium', 'campaign', 'content', 'term'];
  var ids = ['gclid', 'wbraid', 'gbraid'];
  var dimensions = ['bk_campaign_id', 'bk_adgroup_id', 'bk_ad_id', 'bk_match_type', 'bk_network'];
  var now = Date.now();
  var persisted = false;
  var consentKey = 'builderk-ad-measurement-v1';
  var choiceKey = 'builderk-ad-measurement-v2';
  var choiceTtl = 365 * 24 * 60 * 60 * 1000;
  var restricted = window.navigator.globalPrivacyControl === true || window.navigator.doNotTrack === '1';
  function readChoice(area, name, life) {
    try { var choice = JSON.parse(window[area].getItem(name));
      if (choice && (choice.value === 'granted' || choice.value === 'denied') && choice.at <= now && now - choice.at < life)
        return choice.value;
    } catch (error) {}
    return '';
  }
  // A remembered choice wins; the older tab only choice still counts for its two hours.
  var consent = readChoice('localStorage', choiceKey, choiceTtl) || readChoice('sessionStorage', consentKey, ttl);
  if (restricted) consent = 'denied';
  // Measurement is on unless the visitor turned it off or the browser sends a privacy signal.
  var measured = consent !== 'denied';
  var on = {ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied', analytics_storage: 'granted'};
  var off = {ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied'};
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', consent === 'granted' ? on : off);
  // Without a choice, Google measurement starts on for visitors in the United States and stays off elsewhere.
  if (!consent) window.gtag('consent', 'default', Object.assign({region: ['US']}, on));
  function identifier(value) {
    return typeof value === 'string' && /^[A-Za-z0-9_-]{10,300}$/.test(value) ? value : '';
  }
  function text(value) {
    if (typeof value !== 'string' || /[@:/?&#=%\\\r\n<>]/.test(value)) return '';
    return value.trim().slice(0, 100);
  }
  function page(value) {
    return typeof value === 'string' && /^\/[a-z0-9/_-]*(?:\.html)?$/i.test(value)
      ? value.replace(/\.html$/, '').slice(0, 160) : '';
  }
  function host(value) {
    return typeof value === 'string' && /^[a-z0-9.-]+$/i.test(value) ? value.toLowerCase().slice(0, 160) : '';
  }
  function cleanTouch(touch) {
    if (!touch || !Number.isFinite(touch.at) || touch.at > now || now - touch.at >= ttl) return null;
    var clean = {at: touch.at, landing_page: page(touch.landing_page), referrer_host: host(touch.referrer_host)};
    utms.forEach(function (name) { clean['utm_' + name] = text(touch['utm_' + name]); });
    dimensions.forEach(function (name) { clean[name] = text(touch[name]); });
    ids.forEach(function (name) { clean[name] = measured ? identifier(touch[name]) : ''; });
    return clean;
  }
  var saved;
  try { saved = JSON.parse(window.sessionStorage.getItem(key)); } catch (error) {}
  var first = cleanTouch(saved && saved.first);
  var last = cleanTouch(saved && saved.last);
  if (!first || !last || last.at < first.at) first = last = null;

  var entry = {at: now, landing_page: page(window.location.pathname), referrer_host: ''};
  var params = new URLSearchParams(window.location.search);
  utms.forEach(function (name) { entry['utm_' + name] = text(params.get('utm_' + name)); });
  dimensions.forEach(function (name) { entry[name] = text(params.get(name)); });
  ids.forEach(function (name) { entry[name] = identifier(params.get(name)); });
  if (ids.some(function (name) { return !!entry[name]; }) && !entry.utm_source) {
    entry.utm_source = 'google'; entry.utm_medium = 'cpc';
  }
  try {
    var ref = new URL(document.referrer);
    var ownHost = window.location.hostname.replace(/^www\./, '');
    // Do not treat the other canonical host, an internal page or a non-web scheme as a referral.
    if (/^https?:$/.test(ref.protocol) && ref.hostname.replace(/^www\./, '') !== ownHost)
      entry.referrer_host = host(ref.hostname);
  } catch (error) {}
  var tagged = utms.some(function (name) { return !!entry['utm_' + name]; });
  if (!first) first = last = entry;
  else if (tagged || entry.referrer_host) last = entry;
  function persist() {
    try {
      window.sessionStorage.setItem(key, JSON.stringify({first: cleanTouch(first), last: cleanTouch(last)}));
      persisted = true;
    } catch (error) {}
  }
  persist();

  function payload() {
    var data = {submission_page: page(window.location.pathname), attribution_scope: persisted ? 'tab_session' : 'page_only',
      ad_measurement_consent: measured ? 'granted' : 'denied'};
    // Blank legacy values deliberately replace stale campaign values restored with an estimate.
    utms.forEach(function (name) { data['utm_' + name] = ''; });
    if (Date.now() - first.at >= ttl) { data.attribution_scope = 'expired'; return data; }
    [['first', first], ['last', last]].forEach(function (pair) {
      var prefix = pair[0] + '_', touch = pair[1];
      var hasUtm = utms.some(function (name) { return !!touch['utm_' + name]; });
      data[prefix + 'source'] = touch.utm_source || touch.referrer_host || (hasUtm ? '(not set)' : '(direct or unknown)');
      data[prefix + 'medium'] = touch.utm_medium || (hasUtm ? '(not set)' : touch.referrer_host ? 'referral' : '(none)');
      ['campaign', 'content', 'term'].forEach(function (name) { data[prefix + name] = touch['utm_' + name]; });
      data[prefix + 'landing_page'] = touch.landing_page;
      data[prefix + 'referrer_host'] = touch.referrer_host;
      data[prefix + 'touch_at'] = new Date(touch.at).toISOString();
      dimensions.forEach(function (name) { data[prefix + name] = text(touch[name]); });
      ids.forEach(function (name) { data[prefix + name] = measured ? identifier(touch[name]) : ''; });
    });
    utms.forEach(function (name) { data['utm_' + name] = last['utm_' + name]; });
    dimensions.forEach(function (name) { data[name] = text(last[name]); });
    ids.forEach(function (name) { data[name] = measured ? identifier(last[name]) : ''; });
    return data;
  }
  function setConsent(value) {
    consent = value === true && !restricted ? 'granted' : 'denied';
    measured = consent === 'granted';
    if (!measured) [first, last].forEach(function (touch) { ids.forEach(function (name) { touch[name] = ''; }); });
    try { window.localStorage.setItem(choiceKey, JSON.stringify({value: consent, at: Date.now()})); } catch (error) {}
    try { window.sessionStorage.removeItem(consentKey); } catch (error) {}
    persist();
    window.gtag('consent', 'update', measured ? on : off);
    var panel = document.getElementById('bk-measurement-choice'); if (panel) panel.remove();
  }
  function showChoices() {
    if (document.getElementById('bk-measurement-choice') || restricted) return;
    var panel = document.createElement('aside'); panel.id = 'bk-measurement-choice';
    panel.setAttribute('aria-label', 'Privacy choices');
    panel.style.cssText = 'position:fixed;bottom:44px;left:16px;right:16px;max-width:430px;padding:16px;background:#161616;color:#fff;border:1px solid #666;border-radius:10px;z-index:9999;font:14px/1.5 sans-serif;box-shadow:0 4px 20px #0005';
    var description = document.createElement('p'); description.style.margin = '0 0 12px';
    description.textContent = (measured ? 'Google Analytics and Google Ads measurement is on for your visit.'
      : 'Google Analytics and Google Ads measurement is off for your visit.') +
      ' It helps us connect project inquiries with our ads. Your choice does not affect your request.';
    panel.appendChild(description);
    (measured ? [['Keep measurement on', true], ['Turn off measurement', false]]
      : [['Allow measurement', true], ['Keep measurement off', false]]).forEach(function (option) {
      var button = document.createElement('button'); button.type = 'button'; button.textContent = option[0];
      button.style.cssText = 'padding:9px 12px;margin:0 8px 6px 0;border:1px solid #aaa;border-radius:5px;background:#fff;color:#111;cursor:pointer;font:inherit';
      button.addEventListener('click', function () { setConsent(option[1]); }); panel.appendChild(button);
    });
    var link = document.createElement('a'); link.href = '/privacy'; link.textContent = 'Privacy policy'; link.style.cssText = 'color:#fff;display:block;margin-top:4px'; panel.appendChild(link);
    document.body.appendChild(panel);
    var firstButton = panel.querySelector('button'); if (firstButton) firstButton.focus();
  }
  function preferences() {
    // The choice lives in the footer next to the privacy policy; nothing covers the page on arrival.
    if (restricted || document.getElementById('bk-privacy-choices')) return;
    var footer = document.querySelector('footer');
    if (!footer) return;
    var link = document.createElement('a'); link.href = '/privacy'; link.id = 'bk-privacy-choices';
    link.textContent = 'Privacy choices'; link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', function (event) { event.preventDefault(); showChoices(); });
    var policy = footer.querySelector('a[href="/privacy"], a[href="/privacy.html"]');
    if (policy) {
      policy.parentNode.insertBefore(link, policy.nextSibling);
      policy.parentNode.insertBefore(document.createTextNode(' \u00b7 '), link);
    } else footer.appendChild(link);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preferences); else preferences();
  window.BuilderKAttribution = {payload: payload, setMeasurementConsent: setConsent};
})(window);
