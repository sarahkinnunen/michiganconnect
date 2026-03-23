/**
 * main.js — Shared site-wide functionality for The Connect
 *
 * Responsibilities:
 *  - Mobile navigation toggle
 *  - Active nav link highlighting
 *  - Accordion widget
 *  - Utility functions used across pages
 */

(function () {
  'use strict';

  /* --------------------------------------------------------
     Mobile Navigation Toggle
  -------------------------------------------------------- */
  function initMobileNav() {
    var toggle = document.getElementById('menu-toggle');
    var mobileNav = document.getElementById('mobile-nav');
    if (!toggle || !mobileNav) return;

    toggle.addEventListener('click', function () {
      var isOpen = mobileNav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      // Update icon
      toggle.querySelector('.toggle-icon').textContent = isOpen ? '✕' : '☰';
    });

    // Close mobile nav on link click
    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileNav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.querySelector('.toggle-icon').textContent = '☰';
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) {
        mobileNav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.querySelector('.toggle-icon').textContent = '☰';
        toggle.focus();
      }
    });
  }

  /* --------------------------------------------------------
     Active Nav Link
     Marks the link matching the current page as aria-current
  -------------------------------------------------------- */
  function initActiveNav() {
    var path = window.location.pathname;
    // Normalize: strip trailing slash, get last segment
    var page = path.split('/').filter(Boolean).pop() || 'index.html';

    document.querySelectorAll('.site-nav a, .mobile-nav a').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;
      var linkPage = href.split('/').filter(Boolean).pop() || 'index.html';
      if (linkPage === page) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  /* --------------------------------------------------------
     Accordion Widget
     Expects: .accordion-header[aria-expanded][aria-controls]
             #accordion-body-id[hidden]
  -------------------------------------------------------- */
  function initAccordions() {
    document.querySelectorAll('.accordion-header').forEach(function (header) {
      header.addEventListener('click', function () {
        var bodyId = header.getAttribute('aria-controls');
        var body = document.getElementById(bodyId);
        if (!body) return;

        var isOpen = header.getAttribute('aria-expanded') === 'true';

        // Close all in same group
        var group = header.closest('.accordion-group');
        if (group) {
          group.querySelectorAll('.accordion-header').forEach(function (h) {
            h.setAttribute('aria-expanded', 'false');
            var bid = h.getAttribute('aria-controls');
            var b = document.getElementById(bid);
            if (b) b.hidden = true;
          });
        }

        // Toggle this one
        if (!isOpen) {
          header.setAttribute('aria-expanded', 'true');
          body.hidden = false;
        }
      });

      // Keyboard: Space / Enter already handled by button default
    });
  }

  /* --------------------------------------------------------
     Format date for "Last Verified" display
     Input:  "2025-11-01"
     Output: "Nov 1, 2025"
  -------------------------------------------------------- */
  function formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    var parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  /* --------------------------------------------------------
     Category metadata lookup
  -------------------------------------------------------- */
  var CATEGORIES = {
    housing: {
      label: 'Housing',
      icon: '🏠',
      color: 'housing',
      description: 'Emergency shelter, transitional housing, and permanent housing support.',
      howTo: 'Contact the organization directly by phone or walk in. Many require basic ID but some serve those without documentation.'
    },
    food: {
      label: 'Food',
      icon: '🍎',
      color: 'food',
      description: 'Food pantries, meal programs, SNAP assistance, and community kitchens.',
      howTo: 'Most food pantries are walk-in. Bring proof of address if you have it, but many serve without documentation. Check hours before visiting.'
    },
    healthcare: {
      label: 'Healthcare',
      icon: '🏥',
      color: 'healthcare',
      description: 'Medical care, mental health services, dental, and health navigation.',
      howTo: 'Call ahead or walk in. Ask about sliding-scale fees or Medicaid enrollment support. You do not need insurance to get help.'
    },
    legal: {
      label: 'Legal Aid',
      icon: '⚖️',
      color: 'legal',
      description: 'Free legal help with housing, family law, ID, and youth rights.',
      howTo: 'Call or visit the legal aid office. Bring any documents related to your issue. Services are confidential and typically free.'
    },
    crisis: {
      label: 'Crisis Services',
      icon: '🆘',
      color: 'crisis',
      description: '24/7 crisis lines, emergency services, and immediate intervention.',
      howTo: 'Call or text the crisis line. You do not need to give your name. Describe your situation and a counselor will help immediately.'
    }
  };

  /* --------------------------------------------------------
     Expose globals for other scripts
  -------------------------------------------------------- */
  window.TheConnect = window.TheConnect || {};
  window.TheConnect.formatDate = formatDate;
  window.TheConnect.CATEGORIES = CATEGORIES;

  /* --------------------------------------------------------
     Init on DOM ready
  -------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initActiveNav();
    initAccordions();
  });

}());
