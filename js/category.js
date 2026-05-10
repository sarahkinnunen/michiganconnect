/**
 * category.js – Loads and renders resources for a single category page.
 * The <script> tag that includes this file should set:
 *   window.CONNECT_CATEGORY = 'housing' | 'food' | 'health' | 'legal' | 'crisis'
 */

(function () {
  'use strict';

  const CATEGORY = window.CONNECT_CATEGORY;
  if (!CATEGORY) return;

  const grid = document.getElementById('category-results');
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
    } catch (e) {
      return dateStr;
    }
  }

  function capitalise(str) {
    if (!str) return '';
    return str.replace(/[-_]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function getBasePath() {
    const depth = window.location.pathname.split('/').length - 2;
    if (depth <= 0) return './';
    return '../'.repeat(depth);
  }

  const section = grid ? grid.closest('section') : null;
  const searchHintId = 'category-search-hint';
  const searchPanelId = 'category-search-panel';
  let categoryResources = [];
  let selectedTag = '';
  let searchInput = null;
  let clearBtn = null;
  let tagFilters = null;
  let resetBtn = null;
  let debounceTimer = null;

  function insertCategorySearchUI() {
    if (!section || document.getElementById(searchPanelId)) return;

    const panel = document.createElement('div');
    panel.id = searchPanelId;
    panel.className = 'search-section';
    panel.innerHTML = `
      <div class="container">
        <div class="search-bar">
          <div class="search-input-wrapper">
            <em class="search-icon" aria-hidden="true"><i class="bi bi-search" aria-hidden="true"></i></em>
            <label for="category-search-input" class="sr-only">Search ${capitalise(CATEGORY)} resources</label>
            <input
              type="search"
              id="category-search-input"
              name="q"
              placeholder="Search within ${capitalise(CATEGORY)} resources"
              autocomplete="off"
              aria-label="Search within ${capitalise(CATEGORY)} resources"
              aria-describedby="${searchHintId}"
            >
            <button class="search-clear" id="category-search-clear"
              aria-label="Clear search" title="Clear search"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
          </div>
          <button class="filter-reset" id="category-filter-reset" type="button"
                  aria-label="Reset search and filters">Reset</button>
        </div>
        <p id="${searchHintId}" class="sr-only">Type to search by name, keyword, address, eligibility, or tags.</p>
        <div class="subcategory-pills" id="category-tag-filters" role="group" aria-label="Filter by topic"></div>
      </div>`;

    section.insertBefore(panel, section.firstElementChild);
    searchInput = document.getElementById('category-search-input');
    clearBtn = document.getElementById('category-search-clear');
    tagFilters = document.getElementById('category-tag-filters');
    resetBtn = document.getElementById('category-filter-reset');
  }

  function unique(arr) {
    return Array.from(new Set(arr));
  }

  function normalizeQuery(rawQuery) {
    return String(rawQuery || '').trim().toLowerCase();
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  }

  function levenshtein(a, b) {
    const aLen = a.length;
    const bLen = b.length;
    const dp = Array.from({ length: aLen + 1 }, function () {
      return Array(bLen + 1);
    });

    for (let i = 0; i <= aLen; i++) dp[i][0] = i;
    for (let j = 0; j <= bLen; j++) dp[0][j] = j;

    for (let i = 1; i <= aLen; i++) {
      for (let j = 1; j <= bLen; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }

    return dp[aLen][bLen];
  }

  function fuzzyMatch(text, term) {
    if (!text || !term) return false;
    const termLower = term.toLowerCase();
    const textLower = text.toLowerCase();
    return textLower.includes(termLower) || levenshtein(textLower, termLower) <= 2;
  }

  function highlightMatch(text, query) {
    const safe = escapeHTML(text);
    if (!query) return safe;
    const tokens = query.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return safe;

    const pattern = tokens
      .map(function (t) { return escapeRegExp(escapeHTML(t)); })
      .sort(function (a, b) { return b.length - a.length; })
      .join('|');

    try {
      return safe.replace(new RegExp('(' + pattern + ')', 'gi'), '<mark>$1</mark>');
    } catch (e) {
      return safe;
    }
  }

  function renderTagFilters(resources) {
    if (!tagFilters) return;
    const tags = unique(resources.flatMap(function (r) { return r.tags || []; })).sort();
    if (!tags.length) {
      tagFilters.style.display = 'none';
      return;
    }

    tagFilters.style.display = '';
    tagFilters.innerHTML = tags.map(function (tag) {
      return `<button type="button" class="pill" data-tag="${escapeHTML(tag)}">${escapeHTML(tag)}</button>`;
    }).join('');
    updateTagSelection();
  }

  function updateTagSelection() {
    if (!tagFilters) return;
    Array.from(tagFilters.querySelectorAll('[data-tag]')).forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tag') === selectedTag);
    });
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

      categoryResources = resources;
      insertCategorySearchUI();
      renderTagFilters(resources);
      bindCategoryEvents();
      applyFilters();

      if (resources.length === 0) {
        grid.innerHTML = `<div class="empty-state">
          <div class="empty-icon"><i class="bi bi-inbox-fill" aria-hidden="true"></i></div>
          <h3>No resources listed yet</h3>
          <p>We're still collecting data for this category. Check back soon or
             <a href="${getBasePath()}contact.html">suggest a resource</a>.</p>
        </div>`;
      }
    })
    .catch(function (err) {
      console.error(err);
      grid.innerHTML = `<div class="empty-state alert alert-warning" role="alert">
        <div class="empty-icon"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i></div>
        <h3>Could not load resources</h3>
        <p>Please refresh the page or try again later.</p>
      </div>`;
    });

  function applyFilters() {
    const rawQuery = searchInput ? searchInput.value.trim() : '';
    const query = normalizeQuery(rawQuery);
    let results = categoryResources;

    if (selectedTag) {
      results = results.filter(function (r) {
        return (r.tags || []).includes(selectedTag);
      });
    }

    if (query) {
      const terms = query.split(/\s+/).filter(Boolean);
      results = results.filter(function (r) {
        const haystack = [
          r.name, r.description, r.address, r.city, r.county,
          r.eligibility, r.intake_process, (r.tags || []).join(' '), r.website || ''
        ].join(' ').toLowerCase();

        return terms.every(function (term) {
          return haystack.includes(term) || fuzzyMatch(r.name, term) || fuzzyMatch((r.tags || []).join(' '), term);
        });
      });
    }

    if (count) {
      count.textContent = results.length === categoryResources.length
        ? results.length + ' resource' + (results.length !== 1 ? 's' : '') + ' available'
        : results.length + ' of ' + categoryResources.length + ' resources shown';
    }

    if (!results.length) {
      grid.innerHTML = `<div class="empty-state" role="status" aria-live="polite">
          <div class="empty-icon" aria-hidden="true"><i class="bi bi-search" aria-hidden="true"></i></div>
          <h3>No resources found</h3>
          <p>${query
            ? 'No results for <strong>"' + escapeHTML(query) + '"</strong>. Try a different search, remove the selected tag, or reset the filters.'
            : 'No resources match the selected filters.'}</p>
          <button class="btn btn-outline" style="margin-top:1rem" data-action="reset-filters">Clear search</button>
        </div>`;
      return;
    }

    grid.innerHTML = results.map(function (r) {
      const tagsHTML = (r.tags || []).map(function (t) {
        return `<span class="tag">${escapeHTML(t)}</span>`;
      }).join('');

      return `
        <article class="resource-card" aria-labelledby="cat-card-${r.id}">
          <div class="resource-card-header">
            <h3 id="cat-card-${r.id}">${highlightMatch(r.name, query)}</h3>
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
  }

  function bindCategoryEvents() {
    if (searchInput) {
      searchInput.addEventListener('input', onSearchChange);
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') clearSearch();
      });
    }
    if (clearBtn) clearBtn.addEventListener('click', clearSearch);
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    if (tagFilters) {
      tagFilters.addEventListener('click', function (e) {
        const button = e.target.closest('[data-tag]');
        if (!button) return;
        const tag = button.getAttribute('data-tag');
        selectedTag = (selectedTag === tag ? '' : tag);
        updateTagSelection();
        applyFilters();
      });
    }
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="reset-filters"]')) {
        resetFilters();
      }
    });
    grid.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-toggle-details]');
      if (!btn) return;
      const id = btn.getAttribute('data-toggle-details');
      const details = document.getElementById('cat-details-' + id);
      if (!details) return;
      const isOpen = details.classList.toggle('is-open');
      btn.textContent = isOpen ? 'Show Less' : 'More Info';
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  function onSearchChange() {
    if (clearBtn) {
      clearBtn.classList.toggle('visible', searchInput.value.length > 0);
    }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 200);
  }

  function clearSearch() {
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.classList.remove('visible');
    applyFilters();
    if (searchInput) searchInput.focus();
  }

  function resetFilters() {
    selectedTag = '';
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.classList.remove('visible');
    updateTagSelection();
    applyFilters();
  }
})();
