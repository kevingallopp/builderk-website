// BuilderK A5 look: phone menu, effects that play once when they scroll into view, and lazy videos.
// Everything degrades to the finished, static page when JavaScript or motion is off.
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) root.classList.add('a5-motion');

  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  ready(function () {
    // ---- phone menu ----
    var btn = document.querySelector('.a5-menu-btn');
    var menu = document.getElementById('a5-menu');
    if (btn && menu) {
      var close = menu.querySelector('.a5-menu-close');
      var setOpen = function (open) {
        menu.hidden = !open;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.classList.toggle('a5-menu-open', open);
        if (open) { (close || menu).focus(); } else { btn.focus(); }
      };
      btn.addEventListener('click', function () { setOpen(menu.hidden); });
      if (close) close.addEventListener('click', function () { setOpen(false); });
      menu.addEventListener('click', function (e) { if (e.target.closest('a')) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.body.classList.remove('a5-menu-open'); } });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) setOpen(false); });
    }

    // ---- click to call tracking (same event the rest of the site sends) ----
    document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
      if (a.dataset.a5Tracked) return;
      a.dataset.a5Tracked = '1';
      a.addEventListener('click', function () {
        try { if (typeof window.gtag === 'function') window.gtag('event', 'phone_click', { page_path: window.location.pathname }); } catch (err) {}
      });
    });

    // ---- effects: highlighter, tape measure, steps; each plays once ----
    if (root.classList.contains('a5-motion')) {
      var targets = document.querySelectorAll('.a5-hl, .a5-tape-x, .a5-tape-y, [data-a5-reveal]');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      }, { threshold: 0.35, rootMargin: '0px 0px -8% 0px' });
      targets.forEach(function (el) { io.observe(el); });
      // Safety net: never leave anything hidden if the observer does not fire.
      window.setTimeout(function () { targets.forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in'); }); }, 2500);
    }

    // ---- videos that start only when they are on screen (muted, inline) ----
    var lazyVideos = document.querySelectorAll('video[data-a5-lazy]');
    if (lazyVideos.length && 'IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var v = entry.target;
          if (entry.isIntersecting) {
            if (!v.dataset.loaded) {
              v.querySelectorAll('source[data-src]').forEach(function (s) { s.src = s.dataset.src; });
              v.load(); v.dataset.loaded = '1';
            }
            if (!reduce) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
          } else if (!v.paused) { v.pause(); }
        });
      }, { threshold: 0.25 });
      lazyVideos.forEach(function (v) { v.muted = true; vio.observe(v); });
    }
  });

  // ---- home hero video: loads after the page has painted, phones get the vertical cut ----
  window.addEventListener('load', function () {
    var v = document.querySelector('video[data-a5-hero]');
    if (!v || reduce) return;
    var phone = window.matchMedia('(max-width: 899px)').matches;
    var src = phone ? v.dataset.srcPhone : v.dataset.srcDesktop;
    if (!src) return;
    var conn = navigator.connection;
    if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return;
    window.setTimeout(function () {
      v.muted = true;
      v.src = src;
      v.addEventListener('ended', function () { v.pause(); }, { once: true });
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    }, 250);
  });
})();
