/**
 * resources.js – Resource Directory page logic
 * Handles: data loading, real-time search, multi-filter, result rendering
 */

(async function initResourceDirectory() {
  const searchInput   = document.getElementById('search-input');
  const catFilter     = document.getElementById('filter-category');
  const countyFilter  = document.getElementById('filter-county');
  const cityFilter    = document.getElementById('filter-city');
  const tagFilter     = document.getElementById('filter-tag');
  const resultsCount  = document.getElementById('results-count');
  const grid          = document.getElementById('resource-grid');
  const clearBtn      = document.getElementById('clear-filters');

  if (!grid) return;

  // Show loading state
  grid.innerHTML = '<div class="loading"><div class="spinner" aria-label="Loading resources…"></div></div>';

  let allResources = [];

  // ── Load resources ──────────────────────────────────────────────────────────
  try {
    allResources = await fetchJSON('data/resources.json');
  } catch (err) {
    grid.innerHTML = `<div class="alert alert--danger" role="alert">
      <span>⚠️</span>
      <div><strong>Could not load resources.</strong> Please refresh the page or try again later.</div>
    </div>`;
    console.error('Failed to load resources.json:', err);
    return;
  }

  // ── Populate filter dropdowns dynamically ───────────────────────────────────
  function populateSelect(selectEl, values, placeholder) {
    if (!selectEl) return;
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    [...new Set(values.filter(Boolean))].sort().forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      selectEl.appendChild(opt);
    });
  }

  populateSelect(countyFilter, allResources.map(r => r.county), 'All Counties');
  populateSelect(cityFilter,   allResources.map(r => r.city),   'All Cities');

  // Flatten and deduplicate all tags
  const allTags = allResources.flatMap(r => r.tags || []);
  populateSelect(tagFilter, allTags, 'All Tags');

  // ── Pre-fill filters from URL params (e.g., from category tiles) ────────────
  const preCategory = getParam('category');
  const preCounty   = getParam('county');
  const preQuery    = getParam('q');

  if (preCategory && catFilter) catFilter.value = preCategory;
  if (preCounty   && countyFilter) countyFilter.value = preCounty;
  if (preQuery    && searchInput) searchInput.value = preQuery;

  // ── Debounce helper ──────────────────────────────────────────────────────────
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // ── Render resources ─────────────────────────────────────────────────────────
  function render() {
    const query   = searchInput ? searchInput.value : '';
    const filters = {
      category: catFilter     ? catFilter.value    : '',
      county:   countyFilter  ? countyFilter.value : '',
      city:     cityFilter    ? cityFilter.value   : '',
      tag:      tagFilter     ? tagFilter.value    : '',
    };

    const results = filterResources(allResources, query, filters);

    // Update results count
    if (resultsCount) {
      resultsCount.textContent = results.length === 1
        ? '1 resource found'
        : `${results.length} resources found`;
    }

    // Render grid
    if (results.length === 0) {
      renderEmptyState(grid, 'Try a different keyword, or clear your filters.');
      return;
    }

    grid.innerHTML = results.map(buildResourceCard).join('');
  }

  // ── Event listeners ──────────────────────────────────────────────────────────
  const debouncedRender = debounce(render, 200);

  if (searchInput) searchInput.addEventListener('input', debouncedRender);
  if (catFilter)   catFilter.addEventListener('change', render);
  if (countyFilter) countyFilter.addEventListener('change', render);
  if (cityFilter)  cityFilter.addEventListener('change', render);
  if (tagFilter)   tagFilter.addEventListener('change', render);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput)  searchInput.value  = '';
      if (catFilter)    catFilter.value    = '';
      if (countyFilter) countyFilter.value = '';
      if (cityFilter)   cityFilter.value   = '';
      if (tagFilter)    tagFilter.value    = '';
      render();
      if (searchInput) searchInput.focus();
    });
  }

  // Initial render
  render();
})();
