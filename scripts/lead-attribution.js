(function (window) {
  'use strict';
  // Attribution belongs to this tab's visit, independently of the removable planning estimate.
  var key = 'builderk-lead-attribution-v1';
  var ttl = 2 * 60 * 60 * 1000;
  var utms = ['source', 'medium', 'campaign', 'content', 'term'];
  var now = Date.now();
  var persisted = false;
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
  try {
    window.sessionStorage.setItem(key, JSON.stringify({first: first, last: last}));
    persisted = true;
  } catch (error) {}

  function payload() {
    var data = {submission_page: page(window.location.pathname), attribution_scope: persisted ? 'tab_session' : 'page_only'};
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
    });
    utms.forEach(function (name) { data['utm_' + name] = last['utm_' + name]; });
    return data;
  }
  window.BuilderKAttribution = {payload: payload};
})(window);
