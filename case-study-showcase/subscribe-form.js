// subscribe-form.js — closed:in newsletter form enhancer
// Intercepts any <form action="...beehiiv.com/subscribe..."> on the page,
// submits to /api/subscribe (Beehiiv proxy), and shows an inline success state
// instead of opening a new tab. If the proxy is unavailable (not configured,
// upstream down, network error) it hands the signup to Beehiiv's hosted page
// in the same tab, so a signup never dead-ends on an error message.

(function () {
  'use strict';

  var ENDPOINT = '/api/subscribe';

  function deriveMagnet() {
    var path = (window.location.pathname || '').toLowerCase();
    var m = path.match(/\/resources\/([a-z0-9-]+)/);
    if (m) return m[1];
    if (path.indexOf('/tools/') === 0) return 'tools-' + path.split('/')[2];
    if (path.indexOf('/playbook') === 0) return 'playbook';
    if (path.indexOf('/case-stud') !== -1) return 'case-study';
    if (path === '/' || path === '/index.html' || path === '') return 'homepage';
    var slug = path.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '').replace(/\//g, '-');
    return slug || 'homepage';
  }

  function getUtmParams() {
    var params = new URLSearchParams(window.location.search || '');
    var out = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
      var v = params.get(k);
      if (v) out[k] = v;
    });
    return out;
  }

  function showSuccess(form, msg) {
    var wrapper = document.createElement('div');
    wrapper.className = 'subscribe-success';
    wrapper.setAttribute('role', 'status');
    var light = document.documentElement.getAttribute('data-theme') === 'light';
    wrapper.style.cssText = [
      'padding: 18px 22px',
      light ? 'background: #f5f5f7' : 'background: rgba(120,119,198,0.08)',
      light ? 'border: 1px solid rgba(0,0,0,0.08)' : 'border: 1px solid rgba(120,119,198,0.35)',
      'border-radius: 14px',
      light ? 'color: #1d1d1f' : 'color: #fff',
      'font-family: inherit',
      'font-size: 14px',
      'line-height: 1.5',
      'text-align: center',
      'max-width: 480px',
      'margin: 0 auto',
    ].join(';');
    wrapper.innerHTML =
      '<strong style="display:block;margin-bottom:6px;">Check your inbox.</strong>' +
      '<span style="color:' + (light ? '#6e6e73' : 'rgba(255,255,255,0.7)') + ';">' +
      (msg || 'Confirmation mail sent. Click the link to get your download.') +
      '</span>';
    form.parentNode.replaceChild(wrapper, form);
  }

  function showError(form, msg) {
    var existing = form.querySelector('.subscribe-error');
    if (existing) existing.remove();
    var note = document.createElement('div');
    note.className = 'subscribe-error';
    var lightErr = document.documentElement.getAttribute('data-theme') === 'light';
    note.style.cssText = 'margin-top:10px;font-size:13px;color:' + (lightErr ? '#c0262d' : '#ff9b9b') + ';text-align:center;';
    note.textContent = msg || 'Something went wrong. Try again or check your email format.';
    form.appendChild(note);
  }

  function fallback(form, email) {
    // The proxy could not take the signup. Navigate the SAME tab to Beehiiv's
    // hosted subscribe page with the email prefilled. Same-tab navigation is
    // never popup-blocked (window.open after an async fetch is, on Safari and
    // most mobile browsers), so the visitor lands on a working form instead of
    // a red error line.
    try {
      var action = form.getAttribute('action') || 'https://closedins-newsletter.beehiiv.com/subscribe';
      var url = action + (action.indexOf('?') === -1 ? '?' : '&') + 'email=' + encodeURIComponent(email);
      window.location.assign(url);
    } catch (e) {
      setButtonState(form, 'reset');
      showError(form, 'Something went wrong. Try again in a moment.');
    }
  }

  function setButtonState(form, state) {
    var btn = form.querySelector('button[type="submit"], button:not([type])');
    if (!btn) return;
    if (state === 'loading') {
      btn.dataset._origText = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;
    } else if (state === 'reset') {
      if (btn.dataset._origText) btn.textContent = btn.dataset._origText;
      btn.disabled = false;
    }
  }

  function handleSubmit(form) {
    return function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"], input[name="email"]');
      if (!input) return;
      var email = (input.value || '').trim();
      if (!email || email.indexOf('@') === -1) {
        showError(form, 'Enter a valid email.');
        return;
      }

      setButtonState(form, 'loading');
      var existingErr = form.querySelector('.subscribe-error');
      if (existingErr) existingErr.remove();

      var magnet = form.getAttribute('data-magnet') || deriveMagnet();
      var source = form.getAttribute('data-source') || (form.className.split(' ')[0] || 'form');

      var payload = {
        email: email,
        magnet: magnet,
        source: source,
        utm: getUtmParams(),
      };

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'omit',
      })
        .then(function (r) {
          return r.json().then(function (data) { return { ok: r.ok, status: r.status, data: data }; });
        })
        .then(function (resp) {
          if (resp.ok) {
            // Track to GA if present
            try {
              if (typeof window.gtag === 'function') {
                window.gtag('event', 'newsletter_signup', { magnet: magnet, source: source });
              }
              if (typeof window.fbq === 'function') {
                window.fbq('track', 'Lead', { content_name: magnet });
              }
              if (typeof window.lintrk === 'function') {
                window.lintrk('track', { conversion_id: 'newsletter' });
              }
            } catch (e) { /* ignore */ }
            showSuccess(form);
          } else if (resp.status === 422 || (resp.data && /already/i.test(resp.data.error || ''))) {
            // 422 from Beehiiv = already subscribed → treat as success
            setButtonState(form, 'reset');
            showSuccess(form, 'Already on the list. Check your inbox for the latest issue.');
          } else if (resp.status === 400) {
            // Our own validation rejected the address: let the visitor fix it.
            setButtonState(form, 'reset');
            showError(form, (resp.data && resp.data.error) || 'Check your email address and try again.');
          } else {
            // 503 (proxy not configured, fallback:true), 5xx, or anything
            // unexpected: hand the signup to Beehiiv so it still completes.
            fallback(form, email);
          }
        })
        .catch(function () {
          // Network error or non-JSON response: same hand-off.
          fallback(form, email);
        });
    };
  }

  function enhance() {
    var forms = document.querySelectorAll('form[action*="beehiiv.com"]');
    Array.prototype.forEach.call(forms, function (form) {
      if (form.dataset._enhanced === '1') return;
      form.dataset._enhanced = '1';
      // Remove target=_blank since we no longer navigate
      form.removeAttribute('target');
      form.addEventListener('submit', handleSubmit(form));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhance);
  } else {
    enhance();
  }
})();
