document.addEventListener('DOMContentLoaded', function () {
  if (!window.BuilderKPricing) return;
  var box = document.querySelector('[data-plan-sqft]');
  if (!box) return;

  var sqft = parseInt(box.getAttribute('data-plan-sqft'), 10);
  var range = window.BuilderKPricing.calculate({
    sqft: sqft,
    tier: 'standard',
    complexity: 'typical',
    garage: 2,
    extras: {}
  });
  var fmt = function (value) { return '$' + Math.round(value).toLocaleString('en-US'); };
  var output = box.querySelector('[data-plan-price]');
  if (output) output.textContent = fmt(range.totalLow) + ' to ' + fmt(range.totalHigh);

  document.querySelectorAll('[data-pricing-updated]').forEach(function (el) {
    el.textContent = window.BuilderKPricing.lastUpdated;
  });
  var params = new URLSearchParams({sqft: sqft, plan: window.location.pathname.replace(/^\//, '').replace(/\.html$/, '')});
  document.querySelectorAll('.spec').forEach(function (spec) {
    var label = spec.querySelector('.spec-label'); var value = spec.querySelector('.spec-value');
    if (!label || !value) return;
    if (label.textContent === 'Bedrooms') params.set('beds', value.textContent);
    if (label.textContent === 'Bathrooms') params.set('baths', value.textContent);
  });
  document.querySelectorAll('a[href="/calculator"]').forEach(function (link) {
    link.href = '/calculator?' + params.toString();
  });
});
