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
  var restricted = window.navigator.globalPrivacyControl === true || window.navigator.doNotTrack === '1';
  var consent = '';
  try { var choice = JSON.parse(window.sessionStorage.getItem(consentKey));
    if (choice && now - choice.at < ttl && choice.at <= now) consent = choice.value;
  } catch (error) {}
  if (restricted) consent = 'denied';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {ad_storage: consent === 'granted' ? 'granted' : 'denied',
    ad_user_data: consent === 'granted' ? 'granted' : 'denied', ad_personalization: 'denied',
    analytics_storage: consent === 'granted' ? 'granted' : 'denied'});
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
    ids.forEach(function (name) { clean[name] = consent === 'granted' ? identifier(touch[name]) : ''; });
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
      ad_measurement_consent: consent === 'granted' ? 'granted' : 'denied'};
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
      ids.forEach(function (name) { data[prefix + name] = consent === 'granted' ? identifier(touch[name]) : ''; });
    });
    utms.forEach(function (name) { data['utm_' + name] = last['utm_' + name]; });
    dimensions.forEach(function (name) { data[name] = text(last[name]); });
    ids.forEach(function (name) { data[name] = consent === 'granted' ? identifier(last[name]) : ''; });
    return data;
  }
  function setConsent(value) {
    consent = value === true && !restricted ? 'granted' : 'denied';
    if (consent !== 'granted') [first, last].forEach(function (touch) { ids.forEach(function (name) { touch[name] = ''; }); });
    try { window.sessionStorage.setItem(consentKey, JSON.stringify({value: consent, at: Date.now()})); } catch (error) {}
    persist();
    window.gtag('consent', 'update', {ad_storage: consent, ad_user_data: consent,
      ad_personalization: 'denied', analytics_storage: consent});
    var panel = document.getElementById('bk-measurement-choice'); if (panel) panel.remove();
  }
  function showChoices() {
    if (document.getElementById('bk-measurement-choice') || restricted) return;
    var panel = document.createElement('aside'); panel.id = 'bk-measurement-choice';
    panel.setAttribute('aria-label', 'Advertising measurement preferences');
    panel.style.cssText = 'position:fixed;bottom:44px;left:16px;right:16px;max-width:430px;padding:16px;background:#161616;color:#fff;border:1px solid #666;border-radius:10px;z-index:9999;font:14px/1.5 sans-serif;box-shadow:0 4px 20px #0005';
    var description = document.createElement('p'); description.style.margin = '0 0 12px';
    description.textContent = 'May we use Google Analytics and Google Ads measurement for this visit? This helps us connect project inquiries with our ads. Your choice does not affect your request.';
    panel.appendChild(description);
    [['Allow measurement', true], ['No thanks', false]].forEach(function (option) {
      var button = document.createElement('button'); button.type = 'button'; button.textContent = option[0];
      button.style.cssText = 'padding:9px 12px;margin:0 8px 6px 0;border:1px solid #aaa;border-radius:5px;background:#fff;color:#111;cursor:pointer;font:inherit';
      button.addEventListener('click', function () { setConsent(option[1]); }); panel.appendChild(button);
    });
    var link = document.createElement('a'); link.href = '/privacy'; link.textContent = 'Privacy policy'; link.style.cssText = 'color:#fff;display:block;margin-top:4px'; panel.appendChild(link);
    document.body.appendChild(panel);
  }
  function preferences() {
    var button = document.createElement('button'); button.type = 'button'; button.textContent = 'Google measurement choices';
    button.style.cssText = 'position:fixed;bottom:8px;left:12px;z-index:9998;background:#161616;color:#fff;border:1px solid #777;border-radius:4px;padding:6px 10px;font:12px sans-serif;cursor:pointer';
    button.addEventListener('click', showChoices); if (!restricted) document.body.appendChild(button);
    if (!consent) showChoices();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preferences); else preferences();
  window.BuilderKAttribution = {payload: payload, setMeasurementConsent: setConsent};
})(window);
