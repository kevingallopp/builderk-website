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
  document.querySelectorAll('a[href="/calculator"]').forEach(function (link) {
    link.href = '/calculator?sqft=' + sqft;
  });
});
