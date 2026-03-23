/**
 * main.js – Shared utilities for The Connect
 * Handles: navigation toggle, active nav link, and shared helpers
 */

// ── Navigation toggle (mobile hamburger) ────────────────────────────────────
(function initNav() {
  const toggle = document.getElementById('nav-toggle');
  const nav    = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('is-open', !expanded);
  });

  // Close nav when a link is clicked (mobile)
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    });
  });

  // Close nav on outside click
  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !nav.contains(e.target)) {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    }
  });
})();

// ── Mark active nav link based on current page ───────────────────────────────
(function markActiveNav() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a').forEach(link => {
    const linkPath = link.getAttribute('href') || '';
    const linkPage = linkPath.split('/').pop() || 'index.html';
    if (linkPage === currentPath) {
      link.setAttribute('aria-current', 'page');
    }
  });
})();

// ── Utility: fetch JSON with error handling ──────────────────────────────────
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

// ── Utility: get query param ─────────────────────────────────────────────────
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

// ── Utility: escape HTML to prevent XSS ──────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Utility: format date for display ─────────────────────────────────────────
function formatDate(isoStr) {
  if (!isoStr) return 'Unknown';
  try {
    return new Date(isoStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch {
    return isoStr;
  }
}

// ── Utility: category metadata ────────────────────────────────────────────────
const CATEGORIES = {
  housing: { label: 'Housing',   icon: '🏠', color: 'housing' },
  food:    { label: 'Food',      icon: '🍎', color: 'food'    },
  health:  { label: 'Health',    icon: '🏥', color: 'health'  },
  legal:   { label: 'Legal Aid', icon: '⚖️', color: 'legal'   },
  crisis:  { label: 'Crisis',    icon: '🆘', color: 'crisis'  },
};

function getCategoryMeta(cat) {
  return CATEGORIES[cat] || { label: cat, icon: '📋', color: '' };
}

// ── Utility: build a resource card HTML string ────────────────────────────────
function buildResourceCard(r) {
  const meta  = getCategoryMeta(r.category);
  const tags  = (r.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('');
  const phone = r.phone
    ? `<a href="tel:${escHtml(r.phone.replace(/\D/g, ''))}" class="card-link card-link--phone" aria-label="Call ${escHtml(r.name)}">📞 ${escHtml(r.phone)}</a>`
    : '';
  const web = (r.website && r.website !== 'N/A')
    ? `<a href="${escHtml(r.website)}" class="card-link card-link--web" target="_blank" rel="noopener noreferrer" aria-label="Visit website for ${escHtml(r.name)}">🌐 Website</a>`
    : '';

  return `
<article class="resource-card" data-category="${escHtml(r.category)}" aria-label="${escHtml(r.name)}">
  <span class="resource-card__category badge--${escHtml(meta.color)}">${meta.icon} ${escHtml(meta.label)}</span>
  <h3 class="resource-card__title">${escHtml(r.name)}</h3>
  <div class="resource-card__meta">
    <div class="resource-card__meta-item">
      <span class="icon" aria-hidden="true">📍</span>
      <span>${escHtml(r.city)}, ${escHtml(r.county)} County</span>
    </div>
    ${r.phone ? `<div class="resource-card__meta-item"><span class="icon" aria-hidden="true">📞</span><span>${escHtml(r.phone)}</span></div>` : ''}
    ${r.hours ? `<div class="resource-card__meta-item"><span class="icon" aria-hidden="true">🕐</span><span>${escHtml(r.hours)}</span></div>` : ''}
  </div>
  ${r.eligibility ? `<p class="resource-card__eligibility"><strong>Who qualifies:</strong> ${escHtml(r.eligibility)}</p>` : ''}
  ${r.intake_process ? `<div class="intake-box"><strong>How to access:</strong>${escHtml(r.intake_process)}</div>` : ''}
  ${tags ? `<div class="resource-card__tags">${tags}</div>` : ''}
  <div class="resource-card__actions">
    ${phone}${web}
  </div>
  <div class="last-verified" aria-label="Last verified ${formatDate(r.last_verified_date)}">
    <span aria-hidden="true">✅</span> Last verified: ${formatDate(r.last_verified_date)}
  </div>
</article>`;
}

// ── Utility: render empty state ───────────────────────────────────────────────
function renderEmptyState(container, message) {
  container.innerHTML = `
<div class="empty-state" role="status" aria-live="polite">
  <div class="empty-state__icon" aria-hidden="true">🔍</div>
  <h3 class="empty-state__title">No results found</h3>
  <p>${escHtml(message || 'Try adjusting your search or filters.')}</p>
</div>`;
}

// ── Simple client-side search (no external dependencies) ─────────────────────
/**
 * Scores a resource against a query string.
 * Returns a relevance number (higher = more relevant). 0 = no match.
 */
function scoreResource(resource, query) {
  if (!query) return 1; // no query – everything matches
  const q = query.toLowerCase().trim();
  if (!q) return 1;

  const fields = [
    resource.name         || '',
    resource.category     || '',
    resource.county       || '',
    resource.city         || '',
    resource.eligibility  || '',
    resource.intake_process || '',
    (resource.tags || []).join(' '),
  ];

  let score = 0;
  fields.forEach((field, idx) => {
    const f = field.toLowerCase();
    if (f.includes(q)) {
      // Weight: name (idx 0) and category (idx 1) get higher weight
      score += idx === 0 ? 10 : idx === 1 ? 6 : 2;
    }
  });
  return score;
}

/**
 * Filter and rank resources by query + optional filters.
 * @param {Array}  resources - full resource array
 * @param {string} query     - free-text search
 * @param {Object} filters   - { category, county, city, tag }
 * @returns {Array} filtered + sorted resources
 */
function filterResources(resources, query, filters = {}) {
  return resources
    .map(r => ({ resource: r, score: scoreResource(r, query) }))
    .filter(({ resource: r, score }) => {
      if (score === 0) return false;
      if (filters.category && r.category !== filters.category) return false;
      if (filters.county && r.county !== filters.county && filters.county !== 'Statewide') {
        // Allow "Statewide" resources to show under any county filter
        if (r.county !== 'Statewide' && r.county !== filters.county) return false;
      }
      if (filters.city && r.city !== filters.city) return false;
      if (filters.tag && !(r.tags || []).includes(filters.tag)) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .map(({ resource }) => resource);
}
