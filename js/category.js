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
  const container = section ? section.querySelector('.container') : null;
  const searchHintId = 'category-search-hint';
  const searchPanelId = 'category-search-panel';
  let categoryResources = [];
  let selectedTag = '';
  let selectedExpandedId = null;
  let searchInput = null;
  let clearBtn = null;
  let tagFilters = null;
  let resetBtn = null;
  let pagination = null;
  let mapWrapper = null;
  let sortSelect = null;
  let viewButtons = [];
  let viewMode = 'list';
  let currentPage = 1;
  const pageSize = 8;
  let sortOption = 'relevance';
  let debounceTimer = null;
  let mapInstance = null;
  let mapMarkers = [];

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

    // Prefer inserting into an explicit search anchor if present (places search under title)
    const anchor = section.querySelector('#search-anchor');
    if (anchor) {
      anchor.appendChild(panel);
    } else {
      // otherwise insert after the results-meta block when possible
      const meta = section.querySelector('.results-meta');
      if (meta && meta.nextSibling) {
        section.insertBefore(panel, meta.nextSibling);
      } else {
        section.insertBefore(panel, section.firstElementChild);
      }
    }
    searchInput = document.getElementById('category-search-input');
    clearBtn = document.getElementById('category-search-clear');
    tagFilters = document.getElementById('category-tag-filters');
    resetBtn = document.getElementById('category-filter-reset');
    pagination = document.getElementById('category-pagination');
    mapWrapper = document.getElementById('category-map');
    sortSelect = document.getElementById('sort-select');
    viewButtons = Array.from(document.querySelectorAll('.view-btn'));
    // No right-hand detail pane on this page; expansions happen inline.
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
    // If there's a sidebar filter list present, render counts into that instead
    const sidebar = document.getElementById('sidebar-filters');
    if (sidebar) {
      const items = Array.from(sidebar.querySelectorAll('[data-match]'));
      items.forEach(function (li) {
        const match = li.getAttribute('data-match') || '';
        const count = resources.filter(function (r) {
          if (!match) return true;
          const hay = ((r.tags || []).join(' ') + ' ' + (r.categories || r.category || '') + ' ' + (r.name || '') + ' ' + (r.description || '')).toLowerCase();
          const tags = (r.tags || []).map(function (t) { return String(t || '').toLowerCase(); });
          const m = match.toLowerCase().trim();
          // If the exact phrase exists in the combined haystack, count it
          if (hay.indexOf(m) !== -1) return true;
          // Otherwise, split the match into tokens and ensure all tokens appear somewhere (handles 'emergency shelter')
          const tokens = m.split(/\s+/).filter(Boolean);
          if (tokens.length && tokens.every(function (tok) { return hay.indexOf(tok) !== -1; })) return true;
          // Finally, check if any individual tag includes the match or vice-versa
          for (var ti = 0; ti < tags.length; ti++) {
            var tag = tags[ti] || '';
            if (!tag) continue;
            if (tag.indexOf(m) !== -1) return true;
            if (m.indexOf(tag) !== -1) return true;
          }
          return false;
        }).length;
        const countEl = li.querySelector('.filter-count');
        if (countEl) countEl.textContent = count;
        li.classList.toggle('has-items', count > 0);
      });
      if (tagFilters) { tagFilters.style.display = 'none'; tagFilters.innerHTML = ''; }
      return;
    }

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

  function sortResources(list, option) {
    if (option === 'verified') {
      return list.slice().sort(function (a, b) {
        return new Date(b.last_verified_date || 0) - new Date(a.last_verified_date || 0);
      });
    }
    if (option === 'nearest') {
      return list.slice().sort(function (a, b) {
        return String(a.city || '').localeCompare(String(b.city || '')) || String(a.name || '').localeCompare(String(b.name || ''));
      });
    }
    return list;
  }

  function renderPagination(pageCount) {
    if (!pagination) return;
    if (pageCount <= 1 || viewMode === 'map') {
      pagination.innerHTML = '';
      return;
    }

    const pages = Array.from({ length: pageCount }, function (_, index) {
      const page = index + 1;
      return `<button type="button" class="pagination-btn" data-page="${page}"${page === currentPage ? ' disabled' : ''}>${page}</button>`;
    }).join('');

    pagination.innerHTML = pages;
  }

  function geocodeResource(resource) {
    if (resource.latitude && resource.longitude) {
      return [Number(resource.latitude), Number(resource.longitude)];
    }
    if (resource.lat && resource.lng) {
      return [Number(resource.lat), Number(resource.lng)];
    }
    const cityMap = {
      'Detroit': [42.3314, -83.0458],
      'Ann Arbor': [42.2808, -83.7430],
      'Ypsilanti': [42.2411, -83.6127],
      'Taylor': [42.2406, -83.2697],
      'Dearborn': [42.3223, -83.1763],
      'Royal Oak': [42.4895, -83.1446],
      'Pontiac': [42.6389, -83.2910],
      'Clinton Township': [42.5867, -82.9087],
      'Westland': [42.3247, -83.3930],
      'Monroe': [41.9250, -83.3814],
      'Mount Clemens': [42.6072, -82.8805],
      'Grand Rapids': [42.9634, -85.6681],
      'Novi': [42.4806, -83.4755],
      'Dearborn Heights': [42.3369, -83.2804],
      'Holland': [42.7874, -86.1080],
      'Port Huron': [42.9708, -82.4245]
    };
    if (resource.city && cityMap[resource.city]) {
      return cityMap[resource.city];
    }
    return null;
  }

  function initMap() {
    if (!mapWrapper || typeof L === 'undefined') return;
    if (mapInstance) return;

    mapInstance = L.map(mapWrapper, {
      center: [42.3314, -83.0458],
      zoom: 9,
      scrollWheelZoom: false,
      tap: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(mapInstance);
  }

  function renderMapMarkers(resources) {
    if (!mapWrapper) return;
    if (typeof L === 'undefined') {
      mapWrapper.innerHTML = '<div class="map-placeholder" role="status">Map view could not load. The list view still includes all resources.</div>';
      return;
    }
    if (!mapInstance) initMap();
    if (!mapInstance) return;

    mapMarkers.forEach(function (marker) { mapInstance.removeLayer(marker); });
    mapMarkers = [];

    const points = resources.map(function (r) {
      const coords = geocodeResource(r);
      return coords ? { coords: coords, resource: r } : null;
    }).filter(Boolean);

    if (!points.length) {
      mapInstance.setView([42.3314, -83.0458], 8);
      return;
    }

    points.forEach(function (item) {
      const marker = L.marker(item.coords).addTo(mapInstance);
      marker.bindPopup(`<strong>${escapeHTML(item.resource.name)}</strong><br>${escapeHTML(item.resource.address || item.resource.city || '')}`);
      mapMarkers.push(marker);
    });

    const bounds = L.featureGroup(mapMarkers).getBounds();
    if (bounds.isValid()) {
      mapInstance.fitBounds(bounds.pad(0.2));
    }
  }

  function updateView() {
    if (grid) grid.hidden = viewMode === 'map';
    if (pagination) pagination.hidden = viewMode === 'map';
    if (mapWrapper) {
      mapWrapper.hidden = viewMode !== 'map';
      if (viewMode === 'map') {
        requestAnimationFrame(function () {
          if (mapInstance) {
            mapInstance.invalidateSize();
          }
        });
      }
    }
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
      // Ensure page loads at top after any rendering (prevent downstream focus-induced jumps)
      try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch (e) {}

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
      const sel = String(selectedTag || '').trim().toLowerCase();
      if (sel) {
        results = results.filter(function (r) {
          const tags = (r.tags || []).join(' ').toLowerCase();
          const hay = [tags, r.category || '', r.name || '', r.description || '', r.address || '', r.city || '', r.county || '', r.eligibility || ''].join(' ').toLowerCase();
          return hay.indexOf(sel) !== -1;
        });
      }
    }

    if (query) {
      const terms = query.split(/\s+/).filter(Boolean);
      results = results.filter(function (r) {
        const haystack = [
          r.name, r.description, r.address, r.city, r.county,
          r.eligibility, r.intake_process, (r.tags || []).join(' '), r.website || ''
        ].join(' ').toLowerCase();

        return terms.every(function (term) {
          var t = String(term || '').toLowerCase();
          if (!t) return true;

          // quick full-field substring
          if (haystack.includes(t)) return true;

          // check tags individually (allows short tokens like "std")
          var tags = (r.tags || []).map(function (x) { return String(x || '').toLowerCase(); });
          for (var ti = 0; ti < tags.length; ti++) {
            var tag = tags[ti];
            if (!tag) continue;
            if (tag.indexOf(t) !== -1) return true; // substring
            if (fuzzyMatch(tag, t)) return true;
          }

          // fuzzy match against key short fields
          if (fuzzyMatch(r.name || '', t)) return true;
          if (fuzzyMatch(r.city || '', t)) return true;
          if (fuzzyMatch(r.county || '', t)) return true;
          if (fuzzyMatch(r.address || '', t)) return true;

          // synonyms/aliases for common short queries
          var syn = {
            'std': ['std', 'stds', 'sti', 'stis', 'sexually transmitted', 'std testing', 'sti testing'],
            'glasses': ['glasses', 'eyeglass', 'eyeglasses', 'vision', 'vision screening', 'optometry'],
            'medication': ['medication', 'medications', 'pharmacy', 'rx', 'prescription']
          };
          if (syn[t]) {
            for (var si = 0; si < syn[t].length; si++) {
              var s = syn[t][si];
              if (haystack.indexOf(s) !== -1) return true;
              for (var ti2 = 0; ti2 < tags.length; ti2++) {
                if ((tags[ti2] || '').indexOf(s) !== -1) return true;
              }
            }
          }

          return false;
        });
      });
    }

    results = sortResources(results, sortOption);

    if (count) {
      const isStatNumber = (count.classList && count.classList.contains('stat-number')) || (count.closest && count.closest('.stat-card'));
      if (isStatNumber) {
        count.textContent = String(results.length);
      } else {
        count.textContent = results.length === categoryResources.length
          ? results.length + ' resource' + (results.length !== 1 ? 's' : '') + ' available'
          : results.length + ' of ' + categoryResources.length + ' resources shown';
      }
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
      if (viewMode === 'map') {
        renderMapMarkers([]);
      }
      renderPagination(0);
      updateView();
      return;
    }

    const expandedId = selectedExpandedId === null ? (results.length ? String(results[0].id) : '') : String(selectedExpandedId);

    if (viewMode === 'map') {
      grid.innerHTML = '';
      renderMapMarkers(results);
      renderPagination(0);
      updateView();
      return;
    }

    const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
    if (currentPage > pageCount) currentPage = pageCount;
    const pageItems = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    grid.innerHTML = pageItems.map(function (r) {
      const tagsHTML = (r.tags || []).map(function (t) {
        return `<span class="tag">${escapeHTML(t)}</span>`;
      }).join('');

      const isExpanded = String(r.id) === String(expandedId);

      if (isExpanded) {
        return `
        <article class="resource-card" aria-labelledby="cat-card-${r.id}">
          <div class="resource-card-header">
            <div>
              <h3 id="cat-card-${r.id}">${highlightMatch(r.name, query)}</h3>
              <div class="card-category" data-category="${escapeHTML(r.category || '')}">${escapeHTML((r.categories||r.category||'').toString())}</div>
            </div>
            <div class="card-actions">
              ${r.phone ? `<a href="tel:${sanitizePhone(r.phone)}" class="btn btn-primary">Call</a>` : ''}
            </div>
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
          <div class="card-details is-open">
            <dl>
              <dt>Address</dt><dd>${escapeHTML(r.address)}</dd>
              <dt>Eligibility</dt><dd>${escapeHTML(r.eligibility)}</dd>
              <dt>How to Access</dt><dd>${escapeHTML(r.intake_process)}</dd>
            </dl>
          </div>
          <div class="card-footer">
            <button class="btn btn-outline" data-toggle-details="${r.id}" aria-expanded="true">Show Less</button>
            ${r.phone ? `<a href="tel:${sanitizePhone(r.phone)}" class="btn btn-primary"><i class="bi bi-telephone-fill" aria-hidden="true"></i> Call</a>` : ''}
          </div>
          <p class="card-verified"><i class="bi bi-check-circle-fill" aria-hidden="true"></i> Verified ${formatDate(r.last_verified_date)}</p>
        </article>`;
      }

      return `
          <article class="resource-card compact" aria-labelledby="cat-card-${r.id}">
            <div class="compact-left">
              <h3 id="cat-card-${r.id}">${highlightMatch(r.name, query)}</h3>
              <div class="card-meta">${escapeHTML(r.city)}, ${escapeHTML(r.county)} County</div>
            </div>
            <div class="compact-right">
              ${r.phone ? `<a href="tel:${sanitizePhone(r.phone)}" class="btn btn-icon" aria-label="Call ${escapeHTML(r.name)}"><i class="bi bi-telephone-fill"></i></a>` : ''}
              <button class="btn btn-outline" data-toggle-details="${r.id}" aria-expanded="false">View Details</button>
            </div>
          </article>`;
    }).join('');

    renderPagination(pageCount);
    updateView();
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
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        sortOption = sortSelect.value;
        currentPage = 1;
        applyFilters();
      });
    }
    if (viewButtons.length) {
      viewButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var view = btn.getAttribute('data-view');
          if (!view || viewMode === view) return;
          viewMode = view;
          currentPage = 1;
          viewButtons.forEach(function (item) {
            var active = item.getAttribute('data-view') === view;
            item.classList.toggle('active', active);
            item.setAttribute('aria-pressed', active ? 'true' : 'false');
          });
          applyFilters();
        });
      });
    }
    if (tagFilters) {
      tagFilters.addEventListener('click', function (e) {
        const button = e.target.closest('[data-tag]');
        if (!button) return;
        const tag = button.getAttribute('data-tag');
        selectedTag = (selectedTag === tag ? '' : tag);
        selectedExpandedId = null;
        updateTagSelection();
        currentPage = 1;
        applyFilters();
      });
    }

    // Sidebar filters (page-specific): click to set selectedTag and update list
    const sidebar = document.getElementById('sidebar-filters');
    if (sidebar) {
      sidebar.addEventListener('click', function (e) {
        const item = e.target.closest('[data-match]');
        if (!item) return;
        const match = item.getAttribute('data-match') || '';
        selectedTag = match || '';
        selectedExpandedId = null;
        currentPage = 1;
        // toggle active class
        Array.from(sidebar.querySelectorAll('[data-match]')).forEach(function (it) { it.classList.remove('active'); });
        item.classList.add('active');
        applyFilters();
      });
    }
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="reset-filters"]')) {
        resetFilters();
      }
      var pageButton = e.target.closest('[data-page]');
      if (pageButton && pagination && pagination.contains(pageButton)) {
        currentPage = Number(pageButton.getAttribute('data-page')) || 1;
        applyFilters();
      }
    });
    grid.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-toggle-details]');
      if (!btn) return;
      const id = btn.getAttribute('data-toggle-details');
      // toggle inline expansion for the selected resource
      selectedExpandedId = (String(selectedExpandedId) === String(id)) ? '' : String(id);
      applyFilters();
    });

    // clicking a card (not on internal links/buttons) toggles inline expansion
    grid.addEventListener('click', function (e) {
      const card = e.target.closest('.resource-card');
      if (!card) return;
      // ignore clicks on links or buttons inside the card
      if (e.target.closest('a') || e.target.closest('button')) return;
      const heading = card.querySelector('[id^="cat-card-"]');
      if (!heading) return;
      const id = heading.id.replace('cat-card-', '');
      selectedExpandedId = (String(selectedExpandedId) === String(id)) ? '' : String(id);
      applyFilters();
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
  }

  function resetFilters() {
    selectedTag = '';
    selectedExpandedId = null;
    currentPage = 1;
    const sidebar = document.getElementById('sidebar-filters');
    if (sidebar) {
      Array.from(sidebar.querySelectorAll('[data-match]')).forEach(function (it) { it.classList.remove('active'); });
      const all = sidebar.querySelector('[data-match=""]');
      if (all) all.classList.add('active');
    }
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.classList.remove('visible');
    updateTagSelection();
    applyFilters();
  }
})();
