/**
 * search.js — Client-side search and filtering for The Connect
 *
 * Strategy:
 *  - Fetches resources.json once and caches it
 *  - Implements lightweight fuzzy-ish text search across key fields
 *  - Supports filtering by category, county, and city
 *  - Renders resource cards into the DOM
 *  - Handles empty/loading/error states gracefully
 *
 * No external dependencies – pure vanilla JS.
 */

(function () {
  'use strict';

  /* --------------------------------------------------------
     Configuration
  -------------------------------------------------------- */
  var DATA_URL = 'data/resources.json';
  // Fields searched when user types in the search box
  var SEARCHABLE_FIELDS = ['name', 'category', 'county', 'city', 'address', 'eligibility', 'intake_process'];
  // Tags are searched separately (array)
  var TAG_FIELDS = ['tags'];

  /* --------------------------------------------------------
     State
  -------------------------------------------------------- */
  var allResources = [];
  var currentFilters = {
    query: '',
    category: '',
    county: '',
    city: ''
  };

  /* --------------------------------------------------------
     Fetch & Cache Resources
  -------------------------------------------------------- */
  function loadResources(callback) {
    // Use session storage for caching across navigations
    var cached = sessionStorage.getItem('tc_resources');
    if (cached) {
      try {
        allResources = JSON.parse(cached);
        callback(null, allResources);
        return;
      } catch (e) {
        sessionStorage.removeItem('tc_resources');
      }
    }

    fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        allResources = data;
        try {
          sessionStorage.setItem('tc_resources', JSON.stringify(data));
        } catch (e) { /* storage quota exceeded – fine to skip */ }
        callback(null, allResources);
      })
      .catch(function (err) {
        callback(err, null);
      });
  }

  /* --------------------------------------------------------
     Search Logic
     Simple token-based search: splits query into tokens,
     checks if ALL tokens appear in at least one searchable field.
     Case-insensitive.
  -------------------------------------------------------- */
  function matchesQuery(resource, query) {
    if (!query) return true;
    var tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;

    // Build a single searchable string from the resource
    var haystack = SEARCHABLE_FIELDS.map(function (field) {
      return String(resource[field] || '');
    }).join(' ').toLowerCase();

    // Also include tags
    var tagStr = (resource.tags || []).join(' ').toLowerCase();
    var fullText = haystack + ' ' + tagStr;

    // All tokens must match somewhere in the full text
    return tokens.every(function (token) {
      return fullText.indexOf(token) !== -1;
    });
  }

  /* --------------------------------------------------------
     Filter Logic
  -------------------------------------------------------- */
  function applyFilters(resources, filters) {
    return resources.filter(function (r) {
      if (filters.category && r.category !== filters.category) return false;
      if (filters.county && r.county !== filters.county) return false;
      if (filters.city && r.city !== filters.city) return false;
      if (!matchesQuery(r, filters.query)) return false;
      return true;
    });
  }

  /* --------------------------------------------------------
     Render a single resource card (returns DOM element)
  -------------------------------------------------------- */
  function renderCard(resource) {
    var cats = window.TheConnect && window.TheConnect.CATEGORIES;
    var catMeta = (cats && cats[resource.category]) || { label: resource.category, icon: '' };
    var formatDate = (window.TheConnect && window.TheConnect.formatDate) || function (d) { return d; };

    var card = document.createElement('article');
    card.className = 'resource-card fade-in';
    card.setAttribute('aria-label', resource.name);

    var phoneHtml = resource.phone
      ? '<a href="tel:' + resource.phone.replace(/[^+\d]/g, '') + '" class="resource-card__phone" aria-label="Call ' + escapeHtml(resource.name) + '">' +
        '<span aria-hidden="true">📞</span> ' + escapeHtml(resource.phone) + '</a>'
      : '';

    var websiteHtml = resource.website
      ? '<a href="' + escapeHtml(resource.website) + '" class="resource-card__link" target="_blank" rel="noopener noreferrer">Visit website ↗</a>'
      : '';

    var tagsHtml = (resource.tags || []).map(function (tag) {
      return '<span class="tag">' + escapeHtml(tag) + '</span>';
    }).join('');

    card.innerHTML =
      '<span class="resource-card__category-badge badge--' + escapeHtml(resource.category) + '" aria-label="Category: ' + escapeHtml(catMeta.label) + '">' +
        catMeta.icon + ' ' + escapeHtml(catMeta.label) +
      '</span>' +
      '<h3 class="resource-card__title">' + escapeHtml(resource.name) + '</h3>' +
      '<div class="resource-card__location">' +
        '<span aria-hidden="true">📍</span>' +
        '<span>' + escapeHtml(resource.city) + ', ' + escapeHtml(resource.county) + ' County</span>' +
      '</div>' +
      (resource.address ? '<div class="resource-card__detail"><span aria-hidden="true">🗺️</span><span>' + escapeHtml(resource.address) + '</span></div>' : '') +
      (phoneHtml ? '<div>' + phoneHtml + '</div>' : '') +
      '<div class="resource-card__detail"><strong>Hours:</strong><span>' + escapeHtml(resource.hours) + '</span></div>' +
      '<div class="resource-card__detail"><strong>Eligibility:</strong><span>' + escapeHtml(resource.eligibility) + '</span></div>' +
      '<div class="resource-card__detail"><strong>How to access:</strong><span>' + escapeHtml(resource.intake_process) + '</span></div>' +
      (tagsHtml ? '<div class="resource-card__tags" aria-label="Tags">' + tagsHtml + '</div>' : '') +
      '<div class="resource-card__footer">' +
        '<span class="resource-card__verified">✓ Verified ' + escapeHtml(formatDate(resource.last_verified_date)) + '</span>' +
        websiteHtml +
      '</div>';

    return card;
  }

  /* --------------------------------------------------------
     Render results into a container
  -------------------------------------------------------- */
  function renderResults(resources, container, summaryEl) {
    // Clear previous results
    container.innerHTML = '';

    if (summaryEl) {
      summaryEl.innerHTML = 'Showing <strong>' + resources.length + '</strong> ' +
        (resources.length === 1 ? 'resource' : 'resources');
    }

    if (resources.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML =
        '<div class="empty-icon" aria-hidden="true">🔍</div>' +
        '<h3>No resources found</h3>' +
        '<p>Try adjusting your search or filters. You can also <a href="contact.html">suggest a resource</a> you know about.</p>' +
        '<button class="btn btn-outline" id="clear-search-btn">Clear all filters</button>';
      container.appendChild(empty);

      // Wire up the clear button
      var clearBtn = empty.querySelector('#clear-search-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', function () {
          resetFilters();
        });
      }
      return;
    }

    var fragment = document.createDocumentFragment();
    resources.forEach(function (r) {
      fragment.appendChild(renderCard(r));
    });
    container.appendChild(fragment);
  }

  /* --------------------------------------------------------
     Populate filter dropdowns dynamically from data
  -------------------------------------------------------- */
  function populateFilterOptions(resources, categorySelect, countySelect, citySelect) {
    var categories = Array.from(new Set(resources.map(function (r) { return r.category; }))).sort();
    var counties = Array.from(new Set(resources.map(function (r) { return r.county; }))).sort();
    var cities = Array.from(new Set(resources.map(function (r) { return r.city; }))).sort();

    function addOptions(select, values) {
      values.forEach(function (val) {
        var opt = document.createElement('option');
        opt.value = val;
        // Capitalize first letter
        opt.textContent = val.charAt(0).toUpperCase() + val.slice(1);
        select.appendChild(opt);
      });
    }

    if (categorySelect) addOptions(categorySelect, categories);
    if (countySelect) addOptions(countySelect, counties);
    if (citySelect) addOptions(citySelect, cities);
  }

  /* --------------------------------------------------------
     Debounce helper – avoids excessive filtering on keypress
  -------------------------------------------------------- */
  function debounce(fn, delay) {
    var timer;
    return function () {
      clearTimeout(timer);
      var args = arguments;
      var ctx = this;
      timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
  }

  /* --------------------------------------------------------
     Reset all filters
  -------------------------------------------------------- */
  function resetFilters() {
    currentFilters = { query: '', category: '', county: '', city: '' };
    var searchInput = document.getElementById('search-input');
    var categoryFilter = document.getElementById('filter-category');
    var countyFilter = document.getElementById('filter-county');
    var cityFilter = document.getElementById('filter-city');
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (countyFilter) countyFilter.value = '';
    if (cityFilter) cityFilter.value = '';
    runSearch();
  }

  /* --------------------------------------------------------
     Run search with current filters
  -------------------------------------------------------- */
  function runSearch() {
    var resultsContainer = document.getElementById('results-container');
    var summaryEl = document.getElementById('results-summary');
    if (!resultsContainer) return;
    var filtered = applyFilters(allResources, currentFilters);
    renderResults(filtered, resultsContainer, summaryEl);
  }

  /* --------------------------------------------------------
     Initialize the Directory Page
     Called when #search-input exists on the page
  -------------------------------------------------------- */
  function initDirectory() {
    var searchInput = document.getElementById('search-input');
    var resultsContainer = document.getElementById('results-container');
    if (!searchInput || !resultsContainer) return;

    var categoryFilter = document.getElementById('filter-category');
    var countyFilter = document.getElementById('filter-county');
    var cityFilter = document.getElementById('filter-city');
    var clearBtn = document.getElementById('filter-clear');

    // Show loading state
    resultsContainer.innerHTML = '<div class="loading-spinner" role="status" aria-live="polite">Loading resources…</div>';

    loadResources(function (err, resources) {
      if (err) {
        resultsContainer.innerHTML =
          '<div class="empty-state">' +
            '<div class="empty-icon" aria-hidden="true">⚠️</div>' +
            '<h3>Could not load resources</h3>' +
            '<p>Please try refreshing the page. If the problem persists, <a href="contact.html">contact us</a>.</p>' +
          '</div>';
        return;
      }

      // Populate dynamic filter dropdowns
      populateFilterOptions(resources, categoryFilter, countyFilter, cityFilter);

      // Check for URL params (e.g. ?category=housing from category tiles)
      var params = new URLSearchParams(window.location.search);
      if (params.get('category')) {
        currentFilters.category = params.get('category');
        if (categoryFilter) categoryFilter.value = params.get('category');
      }
      if (params.get('county')) {
        currentFilters.county = params.get('county');
        if (countyFilter) countyFilter.value = params.get('county');
      }
      if (params.get('q')) {
        currentFilters.query = params.get('q');
        if (searchInput) searchInput.value = params.get('q');
      }

      // Initial render
      runSearch();

      // Wire up search input
      searchInput.addEventListener('input', debounce(function () {
        currentFilters.query = searchInput.value;
        runSearch();
      }, 200));

      // Wire up filters
      if (categoryFilter) {
        categoryFilter.addEventListener('change', function () {
          currentFilters.category = categoryFilter.value;
          runSearch();
        });
      }
      if (countyFilter) {
        countyFilter.addEventListener('change', function () {
          currentFilters.county = countyFilter.value;
          runSearch();
        });
      }
      if (cityFilter) {
        cityFilter.addEventListener('change', function () {
          currentFilters.city = cityFilter.value;
          runSearch();
        });
      }

      // Clear all filters button
      if (clearBtn) {
        clearBtn.addEventListener('click', function () {
          resetFilters();
        });
      }
    });
  }

  /* --------------------------------------------------------
     Initialize the Category Page
     Called when data-category attribute exists on body
  -------------------------------------------------------- */
  function initCategoryPage() {
    var body = document.body;
    var cat = body.getAttribute('data-category');
    var resultsContainer = document.getElementById('results-container');
    if (!cat || !resultsContainer) return;

    resultsContainer.innerHTML = '<div class="loading-spinner" role="status" aria-live="polite">Loading resources…</div>';

    loadResources(function (err, resources) {
      if (err) {
        resultsContainer.innerHTML = '<div class="empty-state"><p>Could not load resources. Please refresh.</p></div>';
        return;
      }
      var filtered = resources.filter(function (r) { return r.category === cat; });
      renderResults(filtered, resultsContainer, document.getElementById('results-summary'));
    });
  }

  /* --------------------------------------------------------
     Initialize the Home Page featured resources
     Shows a small set of resources (mixed categories)
  -------------------------------------------------------- */
  function initHomeFeatured() {
    var container = document.getElementById('featured-resources');
    if (!container) return;

    loadResources(function (err, resources) {
      if (err || !resources.length) return;
      // Pick one from each category for variety (up to 3)
      var seen = {};
      var featured = [];
      resources.forEach(function (r) {
        if (!seen[r.category] && featured.length < 3) {
          seen[r.category] = true;
          featured.push(r);
        }
      });
      featured.forEach(function (r) {
        container.appendChild(renderCard(r));
      });
    });
  }

  /* --------------------------------------------------------
     Escape HTML to prevent XSS when inserting user-facing strings
  -------------------------------------------------------- */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* --------------------------------------------------------
     Expose public API
  -------------------------------------------------------- */
  window.TheConnect = window.TheConnect || {};
  window.TheConnect.loadResources = loadResources;
  window.TheConnect.renderCard = renderCard;
  window.TheConnect.escapeHtml = escapeHtml;

  /* --------------------------------------------------------
     Auto-init on DOM ready
  -------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initDirectory();
    initCategoryPage();
    initHomeFeatured();
  });

}());
