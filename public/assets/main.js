// PromptMaxxers landing — minimal JS.
// Wires Stripe Payment Link CTAs after the founder pastes the live URLs.
// Also: smooth in-page scroll + analytics-light click logging.

(function () {
  'use strict';

  // ---- Stripe Payment Link URLs ----
  // Founder pastes the live URLs from Stripe Dashboard after `stripe products create`
  // (see ENGINEERING-BUILD-PLAN.md §3.3). Leave as `#` until ready.
  const STRIPE_LINKS = {
    'claude-cohort': '',   // $497 — Claude Certified Architect Prep Cohort
    'github-cohort': '',   // $297 — GitHub Copilot GH-300 Prep Cohort
    'pack-5hr':      '',   // $550 — 5-Hour Coaching Pack
    'pack-10hr':     ''    // $1,000 — 10-Hour Exam-Cram Pack
  };

  function wireStripeCtas() {
    document.querySelectorAll('[data-stripe]').forEach(function (el) {
      const key = el.getAttribute('data-stripe');
      const url = STRIPE_LINKS[key];
      if (url && url.length > 0) {
        el.setAttribute('href', url);
        el.setAttribute('rel', 'noopener');
        el.setAttribute('target', '_blank');
      } else {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          alert('This payment link is being set up. Email hello@promptmaxxers.com to reserve manually.');
        });
      }
    });
  }

  // ---- Smooth in-page scrolling for anchor links ----
  function wireSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        const href = a.getAttribute('href');
        if (!href || href === '#' || href.length < 2) return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', href);
      });
    });
  }

  // ---- Click telemetry (lightweight, no third-party) ----
  // Pings /api/click on the webhook Worker if available; silently fails otherwise.
  function wireClickPing() {
    const interesting = ['data-stripe', 'data-cal'];
    document.querySelectorAll('a, button').forEach(function (el) {
      const tag = interesting.find(function (k) { return el.hasAttribute(k); });
      if (!tag) return;
      el.addEventListener('click', function () {
        try {
          const beacon = {
            kind: tag,
            id: el.getAttribute(tag),
            href: el.getAttribute('href') || '',
            path: location.pathname,
            ts: Date.now()
          };
          if (navigator.sendBeacon) {
            navigator.sendBeacon(
              'https://webhook.promptmaxxers.com/click',
              new Blob([JSON.stringify(beacon)], { type: 'application/json' })
            );
          }
        } catch (_) { /* no-op */ }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    wireStripeCtas();
    wireSmoothScroll();
    wireClickPing();
  });
})();
