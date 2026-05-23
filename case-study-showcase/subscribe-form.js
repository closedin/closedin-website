// subscribe-form.js — closed:in newsletter form enhancer
// Intercepts any <form action="...beehiiv.com/subscribe..."> on the page,
// submits to /api/subscribe (Beehiiv proxy), and shows an inline success state
// instead of opening a new tab. Falls back gracefully to the original Beehiiv
// URL if the API call fails (so signups never get fully lost).

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
    wrapper.style.cssText = [
      'padding: 18px 22px',
      'background: rgba(120,119,198,0.08)',
      'border: 1px solid rgba(120,119,198,0.35)',
      'border-radius: 14px',
      'color: #fff',
      'font-family: inherit',
      'font-size: 14px',
      'line-height: 1.5',
      'text-align: center',
      'max-width: 480px',
      'margin: 0 auto',
    ].join(';');
    wrapper.innerHTML =
      '<strong style="display:block;margin-bottom:6px;">Check your inbox.</strong>' +
      '<span style="color:rgba(255,255,255,0.7);">' +
      (msg || 'Confirmation mail sent. Click the link to get your download.') +
      '</span>';
    form.parentNode.replaceChild(wrapper, form);
  }

  function showError(form, msg) {
    var existing = form.querySelector('.subscribe-error');
    if (existing) existing.remove();
    var note = document.createElement('div');
    note.className = 'subscribe-error';
    note.style.cssText = 'margin-top:10px;font-size:13px;color:#ff9b9b;text-align:center;';
    note.textContent = msg || 'Something went wrong. Try again or check your email format.';
    form.appendChild(note);
  }

  function fallback(form, email) {
    // Last-resort: open Beehiiv subscribe URL in new tab with email pre-filled.
    try {
      var action = form.getAttribute('action') || 'https://closedins-newsletter.beehiiv.com/subscribe';
      var url = action + (action.indexOf('?') === -1 ? '?' : '&') + 'email=' + encodeURIComponent(email);
      window.open(url, '_blank', 'noopener');
    } catch (e) { /* swallow */ }
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
          } else {
            setButtonState(form, 'reset');
            // 422 from Beehiiv = already subscribed → treat as success
            if (resp.status === 422 || (resp.data && /already/i.test(resp.data.error || ''))) {
              showSuccess(form, 'Already on the list. Check your inbox for the latest issue.');
            } else {
              showError(form, 'Could not subscribe. Trying backup...');
              fallback(form, email);
            }
          }
        })
        .catch(function () {
          setButtonState(form, 'reset');
          showError(form, 'Network hiccup. Trying backup...');
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
