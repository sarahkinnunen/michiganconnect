/**
 * search.js – Client-side search & filter for the Resource Directory
 *
 * Strategy:
 *  1. Fetch resources.json once
 *  2. Index searchable fields (name, category, city, county, tags, eligibility)
 *  3. On each keystroke / filter change, run lightweight scoring and re-render
 *
 * No third-party dependencies – pure vanilla JS.
 */

(function () {
  'use strict';

  /* ── State ──────────────────────────────────────────────── */
  let allResources = [];  // raw data from JSON
  let filteredResources = [];  // current filtered/searched subset

  /* ── DOM refs ───────────────────────────────────────────── */
  const searchInput   = document.getElementById('search-input');
  const clearBtn      = document.getElementById('search-clear');
  const filterCat     = document.getElementById('filter-category');
  const filterCounty  = document.getElementById('filter-county');
  const filterCity    = document.getElementById('filter-city');
  const filterTag     = document.getElementById('filter-tag');
  const resetBtn      = document.getElementById('filter-reset');
  const resultsGrid   = document.getElementById('results-grid');
  const resultsCount  = document.getElementById('results-count');

  if (!resultsGrid) return;  // not on directory page

  /* ── Bootstrap ──────────────────────────────────────────── */
  fetchResources();

  /* ── Data loading ───────────────────────────────────────── */
  function fetchResources() {
    // Show skeleton placeholders while loading
    renderSkeletons(6);

    // Path works whether served from root or /directory.html
    const jsonPath = getBasePath() + 'data/resources.json';

    fetch(jsonPath)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load resources.json: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        allResources = data;
        populateFilterOptions(data);
        applyFilters();
        bindEvents();
      })
      .catch(function (err) {
        console.error(err);
        renderError();
      });
  }

  /**
   * Determine the base path relative to the current page.
   * Works for both root-level pages and pages in sub-directories.
   */
  function getBasePath() {
    const depth = window.location.pathname.split('/').length - 2;
    if (depth <= 0) return './';
    return '../'.repeat(depth);
  }

  /* ── Populate filter <select> options ───────────────────── */
  function populateFilterOptions(data) {
    const categories = unique(data.map(r => r.category)).sort();
    const counties   = unique(data.map(r => r.county)).sort();
    const cities     = unique(data.map(r => r.city)).sort();
    const tags       = unique(data.flatMap(r => r.tags)).sort();

    appendOptions(filterCat,    categories, capitalise);
    appendOptions(filterCounty, counties);
    appendOptions(filterCity,   cities);
    appendOptions(filterTag,    tags);
  }

  function appendOptions(select, values, labelFn) {
    if (!select) return;
    values.forEach(function (v) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = labelFn ? labelFn(v) : v;
      select.appendChild(opt);
    });
  }

  /* ── Event wiring ───────────────────────────────────────── */
  function bindEvents() {
    if (searchInput) {
      searchInput.addEventListener('input', onSearchChange);
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { clearSearch(); }
      });
    }
    if (clearBtn)    clearBtn.addEventListener('click',  clearSearch);
    if (filterCat)   filterCat.addEventListener('change',   applyFilters);
    if (filterCounty) filterCounty.addEventListener('change', applyFilters);
    if (filterCity)  filterCity.addEventListener('change',  applyFilters);
    if (filterTag)   filterTag.addEventListener('change',   applyFilters);
    if (resetBtn)    resetBtn.addEventListener('click',    resetFilters);

    // Delegate clicks on dynamically rendered action buttons (e.g. "Clear Filters" in empty state)
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="reset-filters"]')) {
        resetFilters();
      }
    });
  }

  function onSearchChange() {
    if (clearBtn) {
      clearBtn.classList.toggle('visible', searchInput.value.length > 0);
    }
    applyFilters();
  }

  function clearSearch() {
    if (searchInput) searchInput.value = '';
    if (clearBtn)    clearBtn.classList.remove('visible');
    applyFilters();
    if (searchInput) searchInput.focus();
  }

  function resetFilters() {
    if (searchInput)  searchInput.value = '';
    if (clearBtn)     clearBtn.classList.remove('visible');
    if (filterCat)    filterCat.value    = '';
    if (filterCounty) filterCounty.value = '';
    if (filterCity)   filterCity.value   = '';
    if (filterTag)    filterTag.value    = '';
    applyFilters();
  }

  /* ── Core filter + search logic ─────────────────────────── */
  function applyFilters() {
    const query  = searchInput  ? searchInput.value.trim().toLowerCase()  : '';
    const cat    = filterCat    ? filterCat.value    : '';
    const county = filterCounty ? filterCounty.value : '';
    const city   = filterCity   ? filterCity.value   : '';
    const tag    = filterTag    ? filterTag.value     : '';

    let results = allResources;

    // Dropdown filters (exact match)
    if (cat)    results = results.filter(r => r.category === cat);
    if (county) results = results.filter(r => r.county   === county);
    if (city)   results = results.filter(r => r.city     === city);
    if (tag)    results = results.filter(r => r.tags.includes(tag));

    // Text search (multi-token, scored)
    if (query) {
      results = scoreAndSort(results, query);
    }

    filteredResources = results;
    render(results, query);
  }

  /**
   * Simple scoring: count how many query tokens appear in searchable text.
   * Returns resources sorted by score descending (zero-score items excluded).
   */
  function scoreAndSort(resources, query) {
    const tokens = query.split(/\s+/).filter(Boolean);

    const scored = resources.map(function (r) {
      const haystack = [
        r.name, r.category, r.county, r.city,
        r.eligibility, r.intake_process,
        ...(r.tags || [])
      ].join(' ').toLowerCase();

      let score = 0;
      tokens.forEach(function (token) {
        if (haystack.includes(token)) {
          // Boost name matches
          score += r.name.toLowerCase().includes(token) ? 3 : 1;
        }
      });
      return { resource: r, score: score };
    });

    return scored
      .filter(function (s) { return s.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (s) { return s.resource; });
  }

  /* ── Rendering ──────────────────────────────────────────── */
  function render(resources, query) {
    if (resultsCount) {
      resultsCount.textContent = resources.length === 1
        ? '1 resource found'
        : resources.length + ' resources found';
    }

    if (resources.length === 0) {
      renderEmpty(query);
      return;
    }

    resultsGrid.innerHTML = resources.map(function (r) {
      return buildCardHTML(r, query);
    }).join('');
  }

  function renderEmpty(query) {
    resultsGrid.innerHTML = `
      <div class="empty-state" role="status" aria-live="polite">
        <div class="empty-icon" aria-hidden="true">🔍</div>
        <h3>No resources found</h3>
        <p>
          ${query
            ? 'No results for <strong>"' + escapeHTML(query) + '"</strong>. Try different keywords or clear the search.'
            : 'No resources match the selected filters.'}
        </p>
        <button class="btn btn-outline" style="margin-top:1rem" data-action="reset-filters">
          Clear Filters
        </button>
      </div>`;
  }

  function renderSkeletons(count) {
    const cards = Array.from({ length: count }, function () {
      return `<div class="resource-card" aria-hidden="true">
        <div class="skeleton" style="height:1.2rem;width:70%;margin-bottom:.75rem"></div>
        <div class="skeleton" style="height:.85rem;width:40%;margin-bottom:.5rem"></div>
        <div class="skeleton" style="height:.85rem;width:55%;margin-bottom:.5rem"></div>
        <div class="skeleton" style="height:.85rem;width:50%"></div>
      </div>`;
    });
    resultsGrid.innerHTML = cards.join('');
  }

  function renderError() {
    resultsGrid.innerHTML = `
      <div class="empty-state alert alert-warning" role="alert">
        <div class="empty-icon" aria-hidden="true">⚠️</div>
        <h3>Could not load resources</h3>
        <p>Please check your connection and try refreshing the page.</p>
      </div>`;
  }

  /* ── Card HTML builder ──────────────────────────────────── */
  function buildCardHTML(r, query) {
    const tagsHTML = (r.tags || []).map(function (t) {
      return `<span class="tag">${escapeHTML(t)}</span>`;
    }).join('');

    const websiteHTML = r.website
      ? `<li><em class="meta-icon" aria-hidden="true">🌐</em>
           <a href="${escapeHTML(r.website)}" target="_blank" rel="noopener noreferrer">
             Visit website
           </a></li>`
      : '';

    return `
    <article class="resource-card" data-id="${r.id}" aria-labelledby="card-name-${r.id}">
      <div class="resource-card-header">
        <h3 id="card-name-${r.id}">${highlightMatch(r.name, query)}</h3>
        <span class="card-category" data-category="${escapeHTML(r.category)}" aria-label="Category: ${capitalise(r.category)}">
          ${capitalise(r.category)}
        </span>
      </div>

      <ul class="card-meta" aria-label="Resource details">
        <li><em class="meta-icon" aria-hidden="true">📍</em>
          <span>${escapeHTML(r.city)}, ${escapeHTML(r.county)} County</span></li>
        <li><em class="meta-icon" aria-hidden="true">📞</em>
          <a href="tel:${sanitizePhone(r.phone)}">${escapeHTML(r.phone)}</a></li>
        <li><em class="meta-icon" aria-hidden="true">🕒</em>
          <span>${escapeHTML(r.hours)}</span></li>
        ${websiteHTML}
      </ul>

      <div class="card-tags" aria-label="Tags">${tagsHTML}</div>

      <div id="details-${r.id}" class="card-details" aria-hidden="true">
        <dl>
          <dt>Address</dt>
          <dd>${escapeHTML(r.address)}</dd>
          <dt>Eligibility</dt>
          <dd>${escapeHTML(r.eligibility)}</dd>
          <dt>How to Access</dt>
          <dd>${escapeHTML(r.intake_process)}</dd>
        </dl>
      </div>

      <div class="card-footer">
        <button class="btn btn-outline btn-sm"
                data-toggle-details="${r.id}"
                aria-expanded="false"
                aria-controls="details-${r.id}">
          More Info
        </button>
        <a href="tel:${sanitizePhone(r.phone)}" class="btn btn-primary btn-sm">
          📞 Call
        </a>
      </div>

      <p class="card-verified" aria-label="Data last verified">
        ✓ Verified ${formatDate(r.last_verified_date)}
      </p>
    </article>`;
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function unique(arr) {
    return [...new Set(arr)];
  }

  function capitalise(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

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
    } catch (e) {
      return dateStr;
    }
  }

  /**
   * Wrap query matches in <mark> for visual highlighting.
   * Only highlights plain text – safe from XSS because we escape first.
   */
  function highlightMatch(text, query) {
    const safe = escapeHTML(text);
    if (!query) return safe;
    const token = escapeHTML(query.trim());
    if (!token) return safe;
    try {
      const re = new RegExp('(' + token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      return safe.replace(re, '<mark>$1</mark>');
    } catch (e) {
      return safe;
    }
  }

})();
