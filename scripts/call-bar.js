(function () {
  'use strict';
  // One call path on every page: on phones a bottom bar with Call and Free consultation.
  // The home page has its own bar; the calculator keeps its own sticky range bar.
  var PHONE = '2392304868', LABEL = '(239) 230 4868';
  function track() {
    try { if (typeof window.gtag === 'function') window.gtag('event', 'phone_click', {page_path: window.location.pathname}); } catch (error) {}
  }
  function init() {
    if (document.querySelector('.mobile-cta-bar, .bk-call-bar')) return;
    var style = document.createElement('style');
    style.textContent = '.bk-call-bar{display:none}' +
      '@media (max-width:768px){' +
      // iPhones zoom in on form fields under 16px.
      'input,select,textarea{font-size:16px!important}' +
      'body{padding-bottom:78px}' +
      '.bk-call-bar{display:flex;gap:10px;position:fixed;left:0;right:0;bottom:0;z-index:99;' +
      'padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));background:rgba(10,10,10,.95);' +
      '-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}' +
      '.bk-call-bar a{flex:1;display:flex;align-items:center;justify-content:center;min-height:48px;border-radius:10px;' +
      'font:700 .95rem/1.2 Outfit,system-ui,sans-serif;text-decoration:none}' +
      '.bk-call-bar .bk-call{flex:0 0 auto;padding:0 22px;color:#fff;border:1.5px solid rgba(255,255,255,.45)}' +
      '.bk-call-bar .bk-call.bk-wide{flex:1}' +
      '.bk-call-bar .bk-talk{background:#F77F00;color:#0A0A0A}' +
      '}';
    document.head.appendChild(style);
    var path = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
    var onContact = path === '/contact';
    var bar = document.createElement('div');
    bar.className = 'bk-call-bar';
    var call = document.createElement('a');
    call.href = 'tel:' + PHONE;
    call.className = onContact ? 'bk-call bk-wide' : 'bk-call';
    call.textContent = onContact ? 'Call ' + LABEL : 'Call';
    call.setAttribute('aria-label', 'Call BuilderK at ' + LABEL);
    call.addEventListener('click', track);
    bar.appendChild(call);
    if (!onContact) {
      // A page with its own form names it (form[data-call-bar-label]); agents on the referral page
      // go to the referral form; everyone else goes to the contact page.
      var own = document.querySelector('form[id][data-call-bar-label]');
      var referral = document.getElementById('referral-form');
      var talk = document.createElement('a');
      talk.href = own ? '#' + own.id : referral ? '#referral-form' : '/contact';
      talk.className = 'bk-talk';
      talk.textContent = own ? own.getAttribute('data-call-bar-label') : referral ? 'Submit a Referral' : 'Free consultation';
      bar.appendChild(talk);
    }
    document.body.appendChild(bar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
