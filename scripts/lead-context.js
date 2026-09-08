(function (window) {
  'use strict';
  var key = 'builderk-planning-context-v1';
  var fields = ['plan_interest','calc_sqft','calc_tier','calc_beds','calc_baths','calc_garage',
    'calc_garage_sqft','calc_covered_exterior_sqft','calc_complexity','calc_extras',
    'estimate_total','estimate_range','pricing_market','pricing_updated','monthly_payment',
    'example_interest_rate','lot_ownership','lot_value','lot_balance','cash_down','down_mode','down_percent',
    'source_page','city_interest','utm_source','utm_medium','utm_campaign'];
  function clean(data) {
    var output = {};
    fields.forEach(function (name) {
      if (data[name] != null && ['string','number','boolean'].indexOf(typeof data[name]) !== -1)
        output[name] = String(data[name]).slice(0,300);
    });
    return output;
  }
  function read() {
    try {
      var saved = JSON.parse(window.sessionStorage.getItem(key));
      if (saved && saved.savedAt <= Date.now() && Date.now() - saved.savedAt < 2 * 60 * 60 * 1000) return clean(saved.data || {});
    } catch (error) {}
    return {};
  }
  function save(data) {
    try { window.sessionStorage.setItem(key, JSON.stringify({savedAt: Date.now(), data: clean(data)})); } catch (error) {}
  }
  function clear() { try { window.sessionStorage.removeItem(key); } catch (error) {} }
  function attach(form) {
    var data = read();
    if (!data.calc_sqft) return;
    // These fields describe the reviewed estimate, independently of editable contact preferences.
    Object.keys(data).forEach(function (name) {
      var input = form.elements.namedItem(name);
      if (input && input.type !== 'hidden') return;
      if (!input) { input = document.createElement('input'); input.type = 'hidden'; input.name = name; form.appendChild(input); }
      input.value = data[name];
    });
    var panel = document.createElement('section');
    panel.style.cssText = 'padding:20px;margin:0 0 24px;border:1px solid #F77F00;border-radius:12px;line-height:1.6';
    var heading = document.createElement('h3'); heading.textContent = 'Your planning estimate'; panel.appendChild(heading);
    var summary = document.createElement('p');
    var planName = data.plan_interest ? data.plan_interest.replace(/^floor-plan-/, '').replace(/-sq-ft$/, ' sq ft plan') : '';
    summary.textContent = data.calc_sqft + ' sq ft · ' + data.calc_beds + ' beds · ' + data.calc_baths + ' baths · ' + data.calc_tier;
    panel.appendChild(summary);
    var range = document.createElement('p'); range.textContent = data.estimate_range + ' · Central Florida reference'; panel.appendChild(range);
    var details = document.createElement('details');
    var caption = document.createElement('summary'); caption.textContent = 'Estimate details'; details.appendChild(caption);
    var description = document.createElement('p');
    description.textContent = (planName ? 'Starting plan: ' + planName + '. ' : '') + data.calc_garage + ' garage; ' + data.calc_covered_exterior_sqft + ' sq ft covered outdoor space. ' +
      'Complexity: ' + data.calc_complexity + '. Extras: ' + data.calc_extras + '. Planning range: ' + data.estimate_range +
      '. Reference market: ' + data.pricing_market + '. This estimate will accompany your request.';
    details.appendChild(description); panel.appendChild(details);
    var edit = document.createElement('a'); edit.href = '/calculator?resume=1'; edit.textContent = 'Edit estimate'; edit.style.cssText = 'color:#F77F00;display:inline-block;margin-top:12px'; panel.appendChild(edit);
    var remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove estimate';
    remove.style.cssText = 'margin-left:20px;background:transparent;color:inherit;border:0;text-decoration:underline;cursor:pointer';
    remove.addEventListener('click', function () {
      clear(); Object.keys(data).forEach(function (name) { var el = form.elements.namedItem(name); if (el && el.type === 'hidden') el.value = ''; }); panel.remove();
    });
    panel.appendChild(remove); form.prepend(panel);
  }
  window.BuilderKLeadContext = {read: read, save: save, clear: clear, attach: attach};
})(window);
