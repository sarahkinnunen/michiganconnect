/**
 * main.js – Shared JS loaded on every page
 * Handles: mobile nav toggle, active nav link highlighting
 */

(function () {
  'use strict';

  /* ── Mobile navigation toggle ─────────────────────────── */
  const navToggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', function () {
      const isOpen = mobileMenu.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      navToggle.querySelector('.toggle-label').textContent = isOpen ? 'Close' : 'Menu';
    });

    // Close menu on outside click
    document.addEventListener('click', function (e) {
      if (!navToggle.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.querySelector('.toggle-label').textContent = 'Menu';
      }
    });

    // Close menu on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
        mobileMenu.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.querySelector('.toggle-label').textContent = 'Menu';
        navToggle.focus();
      }
    });
  }

  /* ── Highlight active nav link ─────────────────────────── */
  const currentPath = window.location.pathname;
  const allNavLinks = document.querySelectorAll('.nav-links a, .mobile-menu a');

  allNavLinks.forEach(function (link) {
    const href = link.getAttribute('href');
    if (!href) return;

    // Normalize paths for comparison
    const linkPath = new URL(href, window.location.href).pathname;
    const isHome = (linkPath === '/' || linkPath.endsWith('/index.html')) &&
                   (currentPath === '/' || currentPath.endsWith('/index.html'));
    const isMatch = !isHome && currentPath.endsWith(linkPath.replace(/^\//, ''));

    if (isHome || isMatch) {
      link.setAttribute('aria-current', 'page');
    }
  });

  /* ── Expandable card details ───────────────────────────── */
  // Delegated event for "More Info" / "Less Info" toggle buttons
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-toggle-details]');
    if (!btn) return;

    const cardId = btn.getAttribute('data-toggle-details');
    const details = document.getElementById('details-' + cardId);
    if (!details) return;

    const isOpen = details.classList.toggle('is-open');
    btn.textContent = isOpen ? 'Show Less' : 'More Info';
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  /* ── Quick Exit Button ─────────────────────────────────── */
  const exitBtn = document.createElement('button');
  exitBtn.id = 'quick-exit';
  exitBtn.className = 'quick-exit-btn';
  exitBtn.setAttribute('aria-label', 'Quick exit – click to leave this site immediately');
  exitBtn.textContent = '\u2715 Quick Exit';
  exitBtn.addEventListener('click', function () {
    window.location.replace('https://www.google.com');
  });
  document.body.insertBefore(exitBtn, document.body.firstChild);

})();
