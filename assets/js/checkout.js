/* REMIXED TABLE — Stripe Checkout wiring (client side)
 *
 * No secret key and no price lives here. The browser sends only an item key
 * (plus optional booking details / a chosen gift amount) to our serverless
 * function, receives a Stripe-hosted Checkout URL, and redirects to it.
 *
 * Markup:
 *   <button data-checkout-item="guide-salient-at-home">Buy · NT$180</button>
 *   <button data-checkout-item="gift-card" data-amount-input="#gift-amt">Gift</button>
 *   <form   data-checkout-item="ticket-inner-landscapes" data-checkout-form> … </form>
 */
(function () {
  'use strict';

  var ENDPOINT = '/api/create-checkout-session';

  function setBusy(el, busy) {
    if (!el) return;
    if (busy) {
      el.dataset.label = el.textContent;
      el.disabled = true;
      el.textContent = 'Redirecting to secure checkout…';
    } else {
      el.disabled = false;
      if (el.dataset.label) el.textContent = el.dataset.label;
    }
  }

  function showError(anchor, message) {
    var note = anchor.parentNode.querySelector('.checkout-error');
    if (!note) {
      note = document.createElement('p');
      note.className = 'checkout-error form-note';
      note.setAttribute('role', 'alert');
      note.style.color = 'var(--tomato)';
      note.style.marginTop = '.6rem';
      anchor.parentNode.appendChild(note);
    }
    note.textContent = message;
  }

  async function startCheckout(payload, triggerEl) {
    setBusy(triggerEl, true);
    try {
      var res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Checkout is unavailable right now.');
      }
      window.location.assign(data.url); // hand off to Stripe
    } catch (err) {
      setBusy(triggerEl, false);
      showError(triggerEl, err.message + ' If this keeps happening, email us and we’ll help you book.');
    }
  }

  // ---- Simple buy buttons ------------------------------------------------
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-checkout-item]');
    if (!btn || btn.hasAttribute('data-checkout-form') || btn.closest('[data-checkout-form]')) return;
    e.preventDefault();

    var payload = { item: btn.getAttribute('data-checkout-item'), quantity: 1 };

    // Optional customer-chosen amount (gift cards / donations)
    var amtSel = btn.getAttribute('data-amount-input');
    if (amtSel) {
      var amtEl = document.querySelector(amtSel);
      payload.amount = amtEl ? Number(amtEl.value) : undefined;
      if (!payload.amount) { showError(btn, 'Please enter an amount first.'); return; }
    }
    startCheckout(payload, btn);
  });

  // ---- Booking / product forms ------------------------------------------
  document.querySelectorAll('form[data-checkout-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.checkValidity && !form.checkValidity()) { form.reportValidity(); return; }

      var submitBtn = form.querySelector('[type="submit"]') || form;
      var get = function (name) {
        var el = form.querySelector('[name="' + name + '"]');
        return el ? el.value : undefined;
      };

      var payload = {
        item: form.getAttribute('data-checkout-item'),
        quantity: Number(get('quantity')) || 1,
        customer: { email: get('email') },
        metadata: {
          name: get('name'),
          phone: get('phone'),
          participantAge: get('participantAge'),
          notes: get('notes'),
          emergencyContact: get('emergency'),
          eventDate: form.getAttribute('data-event-date') || undefined,
        },
      };
      startCheckout(payload, submitBtn);
    });
  });
})();
