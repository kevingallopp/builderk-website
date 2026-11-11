(function (window, document) {
  'use strict';
  // Google Ads "Calls from website": a visitor who arrived from a Google ad sees a Google forwarding number that
  // rings the office line, so a call made from the site counts for the ad. Everyone else keeps the office number.
  var SEND_TO = 'AW-11388675250/oOI5CNPz_J0dELLJxbYq';
  var OFFICE = '2392304868', SHOWN = '(239) 230 4868';
  var NUMBER = /(?:\+?1[\s.]?)?\(?239\)?[\s.]?230[\s.]?4868/g;
  var SKIP = {SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, TEMPLATE: 1};
  var digits = '', watching = false;

  function shown() { return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + ' ' + digits.slice(6); }
  function swapText(node) {
    if (!node.parentNode || SKIP[node.parentNode.nodeName]) return;
    var next = node.nodeValue.replace(NUMBER, shown());
    if (next !== node.nodeValue) node.nodeValue = next;
  }
  function swapIn(root) {
    if (!digits || !root) return;
    if (root.nodeType === 3) return swapText(root);
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    var nodes = [root].concat(Array.prototype.slice.call(root.querySelectorAll('a[href^="tel:"], [aria-label]')));
    nodes.forEach(function (el) {
      var href = el.getAttribute('href');
      if (href && /^tel:/i.test(href) && href.replace(/\D/g, '').slice(-10) === OFFICE) el.setAttribute('href', 'tel:' + digits);
      var label = el.getAttribute('aria-label');
      if (label && label.replace(NUMBER, shown()) !== label) el.setAttribute('aria-label', label.replace(NUMBER, shown()));
    });
    var walker = document.createTreeWalker(root, 4, null);
    for (var node = walker.nextNode(); node; node = walker.nextNode()) swapText(node);
  }
  // Google calls this once it has a forwarding number for this visit; the phone call bar and the form error
  // message are drawn later, so new parts of the page get the same number.
  function receive(formatted, mobile) {
    var found = String(mobile || formatted || '').replace(/\D/g, '');
    if (found.length === 11 && found.charAt(0) === '1') found = found.slice(1);
    if (found.length !== 10 || found === OFFICE) return;
    digits = found;
    function start() {
      swapIn(document.body);
      if (watching || !window.MutationObserver) return;
      watching = true;
      new window.MutationObserver(function (records) {
        records.forEach(function (record) { Array.prototype.forEach.call(record.addedNodes, swapIn); });
      }).observe(document.body, {childList: true, subtree: true});
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('config', SEND_TO, {phone_conversion_number: SHOWN, phone_conversion_callback: receive});
})(window, document);
