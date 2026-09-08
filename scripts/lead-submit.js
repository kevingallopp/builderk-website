(function (window) {
  'use strict';
  // A conversion means a destination acknowledged receipt, not a form click.
  var tracked = new Set();
  var crmTracked = new Set();
  var attempts = new Map();
  async function post(url, options, crm) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 30000);
    try {
      var response = await fetch(url, Object.assign({}, options, {signal: controller.signal}));
      if (!response.ok) return {received: false, status: 'rejected'};
      var body = await response.json();
      // Formspree's current client uses {next: string}; older responses use {ok: true}.
      var received = crm ? body.success === true && body.received === true :
        !body.error && !body.errors && body.ok !== false && (body.ok === true || typeof body.next === 'string');
      return {received: received, status: received ? 'received' : 'unconfirmed', opportunity: body.opportunity};
    } catch (error) {
      // A lost response is uncertain. Do not automatically resend the request.
      return {received: false, status: 'unconfirmed'};
    } finally { clearTimeout(timer); }
  }
  function track(id, kind, receipt) {
    var firstReceipt = !tracked.has(id);
    tracked.add(id);
    try {
      if (typeof window.gtag === 'function') {
        if (firstReceipt) {
          window.gtag('event', 'conversion', {send_to: 'AW-11388675250/9Kh3CO3wu_oYELLJxbYq', transaction_id: id});
          window.gtag('event', 'lead_received', {form_type: kind, crm_status: receipt.crm.status,
            formspree_status: receipt.formspree.status, pipeline_created: receipt.crm.opportunity === true});
        }
        if (receipt.crm.received && !crmTracked.has(id)) {
          crmTracked.add(id);
          window.gtag('event', 'crm_lead_received', {form_type: kind,
            transaction_id: id, pipeline_created: receipt.crm.opportunity === true});
        }
      }
    } catch (error) {}
    try {
      if (firstReceipt && window.ttq) window.ttq.track('CompleteRegistration', {
        contents: [{content_id: kind, content_type: 'product', content_name: 'BuilderK Request'}], value: 0, currency: 'USD'
      });
    } catch (error) {}
  }
  async function submit(data, action) {
    // Reuse the same identity for an unchanged request after an uncertain response.
    // Keep the signature in page memory only, never browser storage or analytics.
    var signature = JSON.stringify(Object.keys(data).sort().map(function (key) { return [key, data[key]]; }));
    var previous = attempts.get(signature);
    var id = previous && Date.now() - previous.at < 30 * 60 * 1000 ? previous.id : window.crypto.randomUUID();
    if (attempts.size > 20) attempts.clear();
    attempts.set(signature, {id: id, at: Date.now()});
    // Capture just before sending so estimate restore/removal cannot erase or replace attribution.
    var attribution = window.BuilderKAttribution ? window.BuilderKAttribution.payload() : {};
    data = Object.assign({}, data, attribution, {submission_id: id});
    var crmPromise = post('/api/webhook', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)}, true);
    var formspreePromise = Promise.resolve({received: false, status: 'not_used'});
    if (action) {
      var formData = new FormData();
      Object.keys(data).forEach(function (key) { formData.append(key, data[key]); });
      formspreePromise = post(action, {method: 'POST', body: formData, headers: {Accept: 'application/json'}}, false);
    }
    var outcomes = await Promise.all([crmPromise, formspreePromise]);
    var receipt = {crm: outcomes[0], formspree: outcomes[1]};
    receipt.received = receipt.crm.received || receipt.formspree.received;
    if (receipt.received) track(id, data.form_type || 'website-contact', receipt);
    return receipt;
  }
  function bind(form, kind) {
    if (!form || form.dataset.leadBound) return;
    form.dataset.leadBound = 'true';
    var busy = false;
    var message = document.createElement('p');
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    message.style.cssText = 'margin-top:16px;line-height:1.5';
    form.appendChild(message);
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (busy || !form.reportValidity()) return;
      busy = true;
      var button = form.querySelector('button[type="submit"], .btn-primary');
      button.disabled = true;
      message.textContent = 'Sending your request…';
      var data = Object.fromEntries(new FormData(form));
      data.form_type = kind;
      var receipt;
      try { receipt = await submit(data, form.action); } catch (error) { receipt = {received: false}; }
      if (receipt.received) {
        message.textContent = 'Thank you. Your request has been received by the BuilderK team.';
        button.textContent = 'Request Received';
        if (window.BuilderKLeadContext) window.BuilderKLeadContext.clear();
      } else {
        message.textContent = 'We could not confirm receipt. Your details are still here. Please call (239) 230 4868 to confirm before submitting again.';
        button.disabled = false;
        busy = false;
      }
    });
  }
  window.BuilderKLeadSubmit = {submit: submit, bind: bind};
})(window);
