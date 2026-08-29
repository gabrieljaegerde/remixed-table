/* REMIXED TABLE — quiet, intentional interactions */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Mobile full-screen menu ---------------------------------------- */
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.querySelector('.mobile-menu');
  var closeBtn = document.querySelector('.mm-close');

  function setMenu(open) {
    if (!menu) return;
    menu.setAttribute('data-open', open ? 'true' : 'false');
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      var first = menu.querySelector('a, button');
      if (first) first.focus();
    } else if (toggle) {
      toggle.focus();
    }
  }
  if (toggle) toggle.addEventListener('click', function () { setMenu(true); });
  if (closeBtn) closeBtn.addEventListener('click', function () { setMenu(false); });
  if (menu) {
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setMenu(false);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu && menu.getAttribute('data-open') === 'true') setMenu(false);
  });

  /* ---- Scroll reveal --------------------------------------------------- */
  var revealEls = document.querySelectorAll('.reveal-up');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---- The illustrated table drifts very subtly on scroll ------------- */
  var drift = document.querySelector('[data-drift]');
  if (drift && !reduceMotion) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          var y = window.scrollY * 0.04;
          drift.style.transform = 'translateY(' + y.toFixed(2) + 'px)';
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ---- Forms: honest inline confirmation (no backend wired) ----------- */
  document.querySelectorAll('form[data-demo]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.querySelector('.form-status');
      if (!note) {
        note = document.createElement('p');
        note.className = 'form-status form-note';
        note.setAttribute('role', 'status');
        form.appendChild(note);
      }
      note.textContent = form.getAttribute('data-demo');
      note.style.color = 'var(--burgundy)';
      form.reset();
    });
  });
})();
