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

  // ---- Teacher roster (rendered from /teachers.json) ----
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function teacherCardHtml(t) {
    var subjects = (t.subjects || []).map(function (s) {
      return '<li>' + esc(s) + '</li>';
    }).join('');
    var avatar = t.avatar
      ? '<img class="teacher-avatar" src="' + esc(t.avatar) + '" alt="' + esc(t.name) + '" width="72" height="72" loading="lazy" />'
      : '';
    var book = t.bookUrl
      ? '<a class="btn btn-track" href="' + esc(t.bookUrl) + '" target="_blank" rel="noopener">Book a session</a>'
      : '';
    var rate = t.rate ? '<p class="teacher-rate">' + esc(t.rate) + '</p>' : '';
    return '' +
      '<article class="teacher-card' + (t.featured ? ' teacher-featured' : '') + '">' +
        '<div class="teacher-head">' + avatar +
          '<div><h3>' + esc(t.name) + '</h3>' +
          '<p class="teacher-title">' + esc(t.title || '') + '</p></div>' +
        '</div>' +
        '<p class="teacher-bio">' + esc(t.bio || '') + '</p>' +
        (subjects ? '<ul class="teacher-subjects">' + subjects + '</ul>' : '') +
        rate + book +
      '</article>';
  }

  function renderTeachers() {
    var grid = document.getElementById('teachers-grid');
    if (!grid) return;
    fetch('/teachers.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.teachers)) return;
        var active = data.teachers.filter(function (t) {
          return (t.status || 'active') === 'active';
        });
        // featured first, then as-listed
        active.sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });
        if (active.length === 0) return;
        grid.innerHTML = active.map(teacherCardHtml).join('');
      })
      .catch(function () { /* keep noscript fallback */ });
  }

  document.addEventListener('DOMContentLoaded', function () {
    wireStripeCtas();
    wireSmoothScroll();
    wireClickPing();
    renderTeachers();
  });
})();
