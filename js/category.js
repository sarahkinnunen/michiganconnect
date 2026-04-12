/**
 * category.js – Loads and renders resources for a single category page.
 * The <script> tag that includes this file should set:
 *   window.CONNECT_CATEGORY = 'housing' | 'food' | 'health' | 'legal' | 'crisis'
 */

(function () {
  'use strict';

  const CATEGORY = window.CONNECT_CATEGORY;
  if (!CATEGORY) return;

  const grid  = document.getElementById('category-results');
  const count = document.getElementById('category-count');

  if (!grid) return;

  /* ── Helpers (duplicated from search.js to keep files independent) ── */
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str || '')));
    return div.innerHTML;
  }
  function sanitizePhone(phone) {
    return (phone || '').replace(/[^\d+]/g, '');
  }
  function formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return dateStr; }
  }
  function capitalise(str) {
    if (!str) return '';
    return str.replace(/[-_]/g, ' ')
              .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function getBasePath() {
    const depth = window.location.pathname.split('/').length - 2;
    if (depth <= 0) return './';
    return '../'.repeat(depth);
  }

  /* ── Fetch & render ──────────────────────────────────────── */
  fetch(getBasePath() + 'data/resources.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      const resources = data.filter(function (r) {
        return (r.categories || [r.category]).includes(CATEGORY);
      });

      if (count) {
        count.textContent = resources.length + ' resource' + (resources.length !== 1 ? 's' : '') + ' available';
      }

      if (resources.length === 0) {
        grid.innerHTML = `<div class="empty-state">
          <div class="empty-icon"><i class="bi bi-inbox-fill" aria-hidden="true"></i></div>
          <h3>No resources listed yet</h3>
          <p>We're still collecting data for this category. Check back soon or
             <a href="${getBasePath()}contact.html">suggest a resource</a>.</p>
        </div>`;
        return;
      }

      grid.innerHTML = resources.map(function (r) {
        const tagsHTML = (r.tags || []).map(function (t) {
          return `<span class="tag">${escapeHTML(t)}</span>`;
        }).join('');

        return `
        <article class="resource-card" aria-labelledby="cat-card-${r.id}">
          <div class="resource-card-header">
            <h3 id="cat-card-${r.id}">${escapeHTML(r.name)}</h3>
          </div>
          <ul class="card-meta">
            <li><em class="meta-icon" aria-hidden="true"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i></em>
              <span>${escapeHTML(r.city)}, ${escapeHTML(r.county)} County</span></li>
            ${r.phone ? `<li><em class="meta-icon" aria-hidden="true"><i class="bi bi-telephone-fill" aria-hidden="true"></i></em>
              <a href="tel:${sanitizePhone(r.phone)}">${escapeHTML(r.phone)}</a></li>` : ''}
            <li><em class="meta-icon" aria-hidden="true"><i class="bi bi-clock-fill" aria-hidden="true"></i></em>
              <span>${escapeHTML(r.hours)}</span></li>
            ${r.website ? `<li><em class="meta-icon" aria-hidden="true"><i class="bi bi-globe-americas" aria-hidden="true"></i></em>
              <a href="${escapeHTML(r.website)}" target="_blank" rel="noopener noreferrer">Visit website</a></li>` : ''}
          </ul>
          <div class="card-tags">${tagsHTML}</div>

          <div id="cat-details-${r.id}" class="card-details">
            <dl>
              <dt>Address</dt><dd>${escapeHTML(r.address)}</dd>
              <dt>Eligibility</dt><dd>${escapeHTML(r.eligibility)}</dd>
              <dt>How to Access</dt><dd>${escapeHTML(r.intake_process)}</dd>
            </dl>
          </div>

          <div class="card-footer">
            <button class="btn btn-outline btn-sm"
                    data-toggle-details="${r.id}"
                    aria-expanded="false"
                    aria-controls="cat-details-${r.id}">
              More Info
            </button>
            ${r.phone ? `<a href="tel:${sanitizePhone(r.phone)}" class="btn btn-primary btn-sm">
              <i class="bi bi-telephone-fill" aria-hidden="true"></i> Call
            </a>` : ''}
          </div>
          <p class="card-verified"><i class="bi bi-check-circle-fill" aria-hidden="true"></i> Verified ${formatDate(r.last_verified_date)}</p>
        </article>`;
      }).join('');

      // Wire expandable details for dynamically rendered cards
      grid.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-toggle-details]');
        if (!btn) return;
        const id      = btn.getAttribute('data-toggle-details');
        const details = document.getElementById('cat-details-' + id);
        if (!details) return;
        const isOpen = details.classList.toggle('is-open');
        btn.textContent = isOpen ? 'Show Less' : 'More Info';
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    })
    .catch(function (err) {
      console.error(err);
      grid.innerHTML = `<div class="empty-state alert alert-warning" role="alert">
        <div class="empty-icon"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i></div>
        <h3>Could not load resources</h3>
        <p>Please refresh the page or try again later.</p>
      </div>`;
    });
})();
