/**
 * search.js – Client-side search & filter for the Resource Directory
 *
 * Strategy:
 *  1. Fetch resources.json once
 *  2. Build a pre-computed lowercase search index per resource
 *  3. On each keystroke / filter change, run lightweight scoring and re-render
 *     (search input is debounced; filter dropdowns fire immediately)
 *
 * No third-party dependencies – pure vanilla JS.
 */

(function () {
  'use strict';

  /* ── State ──────────────────────────────────────────────── */
  let allResources = [];  // raw data from JSON, augmented with ._idx
  let filteredResources = [];  // current filtered/searched subset
  let debounceTimer = null;

  const QUERY_SYNONYMS = {
    shelter: ['housing', 'emergency shelter', 'sleep', 'sleeping', 'camp'],
    housing: ['shelter', 'emergency shelter', 'housing support'],
    clothes: ['clothing', 'apparel', 'outfit', 'wardrobe', 'shoes'],
    clothing: ['clothes', 'apparel', 'outfit', 'wardrobe', 'shoes'],
    toothpaste: ['hygiene', 'oral', 'dental', 'toothbrush', 'tooth brush'],
    toothbrush: ['toothpaste', 'hygiene', 'oral', 'dental'],
    dentist: ['dental', 'oral health', 'tooth', 'tooth care'],
    dental: ['dentist', 'oral health', 'tooth', 'tooth care'],
    advocate: ['advocacy', 'legal', 'immigration', 'immigrant'],
    advocates: ['advocacy', 'legal', 'immigration', 'immigrant'],
    advocacy: ['advocate', 'legal aid', 'immigration', 'immigrant'],
    baby: ['formula', 'infant', 'feeding', 'parenting'],
    formula: ['baby', 'infant', 'feeding', 'parenting'],
    soap: ['hygiene', 'shower', 'bath'],
    shampoo: ['hygiene', 'hair care'],
    diapers: ['baby', 'parenting', 'infant', 'hygiene', 'formula', 'cloth'],
    wic: ['nutrition', 'baby', 'pregnancy', 'parenting', 'food'],
    pregnancy: ['prenatal', 'baby', 'parenting', 'maternal', 'WIC'],
    maternal: ['pregnancy', 'prenatal', 'baby', 'parenting', 'home visiting'],
    doula: ['birth support', 'labor support', 'postpartum', 'pregnancy', 'parenting'],
    'women': ['health', 'reproductive', 'family planning', 'OB-GYN', 'abortion'],
    'women\'s': ['health', 'reproductive', 'family planning', 'OB-GYN', 'abortion'],
    'ob-gyn': ['women', 'health', 'reproductive', 'pregnancy', 'pap smear'],
    obgyn: ['women', 'health', 'reproductive', 'pregnancy', 'pap smear'],
    family: ['planning', 'support', 'health', 'parenting'],
    'family planning': ['contraception', 'reproductive', 'pregnancy', 'health'],
    abortion: ['reproductive', 'women', 'pregnancy', 'health'],
    hiv: ['aids', 'HIV/AIDS', 'testing', 'prevention', 'sexual health'],
    aids: ['hiv', 'HIV/AIDS', 'testing', 'prevention', 'sexual health'],
    'HIV/AIDS': ['hiv', 'aids', 'testing', 'prevention', 'sexual health'],
    veterans: ['VA', 'women veterans', 'health care', 'military'],
    veteran: ['VA', 'women veterans', 'health care', 'military'],
    telehealth: ['virtual care', 'online care', 'remote care', 'telemedicine'],
    medicaid: ['health insurance', 'WIC', 'sliding scale', 'care'],
    clinic: ['health', 'medical', 'primary care', 'specialty'],
    childcare: ['child care', 'preschool', 'early childhood', 'parenting', 'education'],
    preschool: ['childcare', 'child care', 'early childhood', 'education'],
    'child care': ['childcare', 'preschool', 'early childhood', 'parenting'],
    'home visiting': ['parenting', 'pregnancy', 'maternal', 'health'],
    rent: ['housing', 'eviction', 'shelter'],
    eviction: ['housing', 'rent', 'homelessness'],
    rehab: ['recovery', 'detox', 'treatment', 'substance use', 'addiction'],
    detox: ['withdrawal', 'rehab', 'detoxification', 'recovery', 'treatment'],
    outpatient: ['treatment', 'therapy', 'rehab', 'recovery'],
    inpatient: ['residential', 'rehab', 'treatment', 'detox'],
    mat: ['medication-assisted treatment', 'suboxone', 'methadone', 'buprenorphine', 'opioid treatment'],
    addiction: ['substance use', 'rehab', 'detox', 'recovery', 'treatment'],
    substance: ['addiction', 'rehab', 'detox', 'treatment'],
    directory: ['legal', 'immigration', 'advocacy', 'resources'],
    nonprofit: ['legal', 'immigration', 'advocacy', 'directory', 'resources'],
    financial: ['money', 'cash', 'aid', 'assistance', 'benefits'],
    childcare: ['child care', 'preschool', 'early childhood', 'daycare'],
    parenting: ['family', 'children', 'kids', 'baby'],
    transportation_assistance: ['transportation', 'bus', 'fare', 'rides'],
    disability: ['disabled', 'handicap', 'accessibility'],
    senior_services: ['seniors', 'elderly', 'aging', 'older adults']
  };

  /* ── Intent Detection Rules ─────────────────────────────────────── */
  const INTENT_RULES = [
    {
      patterns: [
        /\b(crisis|emergency|help|urgent|immediately?|now|please|dying|emergency|911)/i,
        /\b(suicid|kill\s+myself|end\s+my\s+life|self\s+harm|overdose|cannot\s+cope|no\s+way\s+out)/i,
        /\b(domestic\s+violence|being\s+abused|being\s+hit|assault|rape|trafficking)/i,
        /\b(homeless|no\s+place|evict|lost\s+my\s+home|on\s+street)/i,
      ],
      categories: ['crisis', 'housing', 'domestic-violence'],
      weight: 100,
    },
    {
      patterns: [
        /\b(hungry|no\s+food|starving|food\s+bank|food\s+stamp|snap|wic)/i,
      ],
      categories: ['food', 'financial'],
      weight: 90,
    },
    {
      patterns: [
        /\b(job|employment|work|laid\s+off|fired|unemploy|income|career)/i,
      ],
      categories: ['employment', 'financial'],
      weight: 80,
    },
    {
      patterns: [
        /\b(health|doctor|hospital|medical|clinic|insurance|medicaid|medication|prescription)/i,
      ],
      categories: ['health'],
      weight: 75,
    },
    {
      patterns: [
        /\b(housing|rent|mortgage|shelter|apartment|house|homeless|eviction)/i,
      ],
      categories: ['housing', 'financial'],
      weight: 75,
    },
  ];

  /* ── Common Misspellings ─────────────────────────────────────────── */
  const COMMON_MISSPELLINGS = [
    { typo: 'denist', correct: 'dentist' },
    { typo: 'houzing', correct: 'housing' },
    { typo: 'emergancy', correct: 'emergency' },
    { typo: 'assitance', correct: 'assistance' },
    { typo: 'familiy', correct: 'family' },
    { typo: 'pregnent', correct: 'pregnant' },
    { typo: 'chlidcare', correct: 'childcare' },
    { typo: 'helth', correct: 'health' },
    { typo: 'medicaid', correct: 'medicaid' },
    { typo: 'transportaion', correct: 'transportation' },
  ];

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
        // Pre-build a lowercase search index on each resource so
        // scoreAndSort never has to re-join the fields on every keystroke.
        allResources = data.map(function (r) {
          r._idx = [
            r.name, r.category, ...(r.categories || []),
            r.county, r.city,
            r.description, r.eligibility, r.intake_process,
            ...(r.tags || []),
            r.website || ''
          ].join(' ').toLowerCase();
          r._nameLower = r.name.toLowerCase();
          return r;
        });
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
    // Debounce: wait 200 ms after the user stops typing before filtering.
    // Filter dropdowns (applyFilters directly) still respond instantly.
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 200);
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
    if (cat)    results = results.filter(r => (r.categories || [r.category]).includes(cat));
    if (county) results = results.filter(r => r.county   === county);
    if (city)   results = results.filter(r => r.city     === city);
    if (tag)    results = results.filter(r => r.tags.includes(tag));

    // Text search (multi-token, scored)
    if (query) {
      const intentScores = detectIntent(query);
      // Crisis override: prioritize crisis resources if crisis intent is detected
      if (intentScores.has('crisis')) {
        const crisisResources = results.filter(r => (r.categories || [r.category]).includes('crisis'));
        if (crisisResources.length > 0) {
          results = crisisResources.slice(0, 5);
          filteredResources = results;
          render(results, query);
          return;
        }
      }
      results = scoreAndSort(results, query, intentScores);
    }

    filteredResources = results;
    render(results, query);
  }

  /**
   * Score and sort resources against a query with field-weighted scoring.
   *
   * Scoring weights:
   *  +20  category matches detected intent
   *  +10  exact phrase in name
   *  + 5  exact phrase anywhere
   *  + 5  token found in tags
   *  + 3  token match in name (per token)
   *  + 2  token found in description
   *  + 1  token match elsewhere (per token)
   *  + 5  bonus when ALL tokens match (promotes full-match results to top)
   *
   * Uses pre-built _idx / _nameLower strings so no per-call field joining.
   */
  function scoreAndSort(resources, query, intentScores) {
    const phrase = query.toLowerCase();
    const tokens = phrase.split(/\s+/).filter(Boolean);
    const expandedTokens = expandQueryTokens(tokens);

    const scored = resources.map(function (r) {
      let score = 0;

      // Intent matching: boost if resource category matches detected intent
      if (intentScores) {
        const resCategory = r.categories ? r.categories[0] : r.category;
        if (intentScores.has(resCategory)) {
          score += 20;
        }
      }

      // Phrase-level bonuses
      if (r._nameLower.includes(phrase)) score += 10;
      else if (r._idx.includes(phrase))  score += 5;

      // Token-level scoring with field weighting
      let allMatch = true;
      expandedTokens.forEach(function (token) {
        const inName = r._nameLower.includes(token);
        const inTags = r.tags && r.tags.some(function (tag) {
          return tag.toLowerCase().includes(token);
        });
        const inDescription = r.description && r.description.toLowerCase().includes(token);
        const inIdx = inName || inTags || inDescription || r._idx.includes(token);

        if (inIdx) {
          if (inName) score += 3;
          else if (inTags) score += 5;
          else if (inDescription) score += 2;
          else score += 1;
        }
      });

      // Check if all original tokens matched (not expanded ones)
      tokens.forEach(function (token) {
        if (!r._idx.includes(token) && !r._nameLower.includes(token)) {
          allMatch = false;
        }
      });

      // Bonus if every original query token matched
      if (allMatch && tokens.length > 1) score += 5;

      return { resource: r, score: score };
    });

    return scored
      .filter(function (s) { return s.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (s) { return s.resource; });
  }

  function expandQueryTokens(tokens) {
    const expanded = [];
    const seen = new Set();

    tokens.forEach(function (token) {
      if (!seen.has(token)) {
        expanded.push(token);
        seen.add(token);
      }
      const aliases = QUERY_SYNONYMS[token];
      if (aliases) {
        aliases.forEach(function (alias) {
          if (!seen.has(alias)) {
            expanded.push(alias);
            seen.add(alias);
          }
        });
      }
    });

    return expanded;
  }

  /* ── Intent Detection & Advanced Scoring ────────────────────────── */
  function detectIntent(query) {
    const lowerQuery = query.toLowerCase();
    let matchedCategories = new Map();

    INTENT_RULES.forEach(function (rule) {
      rule.patterns.forEach(function (pattern) {
        const matches = (pattern instanceof RegExp && pattern.test(lowerQuery)) ||
                        (typeof pattern === 'string' && lowerQuery.includes(pattern));
        if (matches) {
          rule.categories.forEach(function (cat) {
            matchedCategories.set(cat, (matchedCategories.get(cat) || 0) + rule.weight);
          });
        }
      });
    });

    return matchedCategories;
  }

  /**
   * Levenshtein distance (edit distance) for fuzzy matching.
   * Returns the number of single-character edits needed to change a into b.
   */
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
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return dp[aLen][bLen];
  }

  function fuzzyMatch(text, term) {
    const termLower = term.toLowerCase();
    const textLower = text.toLowerCase();
    return textLower.includes(termLower) || levenshtein(textLower, termLower) <= 2;
  }

  function suggestClosestQuery(query) {
    if (!query || query.length < 2) return null;

    // Check common misspellings first
    for (let i = 0; i < COMMON_MISSPELLINGS.length; i++) {
      const entry = COMMON_MISSPELLINGS[i];
      if (levenshtein(query.toLowerCase(), entry.typo) <= 1) {
        return entry.correct;
      }
    }

    // Check all resource names and tags for fuzzy matches
    const lowerQuery = query.toLowerCase();
    let bestMatch = null;
    let bestDistance = 3; // threshold

    allResources.forEach(function (r) {
      // Check name
      const nameDist = levenshtein(lowerQuery, r._nameLower);
      if (nameDist < bestDistance) {
        bestDistance = nameDist;
        bestMatch = r._nameLower;
      }

      // Check tags
      (r.tags || []).forEach(function (tag) {
        const tagDist = levenshtein(lowerQuery, tag.toLowerCase());
        if (tagDist < bestDistance) {
          bestDistance = tagDist;
          bestMatch = tag;
        }
      });
    });

    return bestMatch;
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
    let suggestionHTML = '';
    if (query) {
      const suggestion = suggestClosestQuery(query);
      if (suggestion) {
        suggestionHTML = `
          <p style="margin-top: 0.75rem;">
            <strong>Did you mean:</strong> <button class="btn btn-sm btn-outline" 
              style="padding: 0.25rem 0.75rem; margin-left: 0.5rem;" 
              onclick="document.getElementById('search-input').value = '${escapeHTML(suggestion)}'; 
                       document.getElementById('search-input').dispatchEvent(new Event('input'));">
              ${escapeHTML(suggestion)}
            </button>
          </p>
        `;
      }
    }

    resultsGrid.innerHTML = `
      <div class="empty-state" role="status" aria-live="polite">
        <div class="empty-icon" aria-hidden="true"><i class="bi bi-search" aria-hidden="true"></i></div>
        <h3>No resources found</h3>
        <p>
          ${query
            ? 'No results for <strong>"' + escapeHTML(query) + '"</strong>. Try different keywords or clear the search.'
            : 'No resources match the selected filters.'}
        </p>
        ${suggestionHTML}
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
        <div class="empty-icon" aria-hidden="true"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i></div>
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
      ? `<li><em class="meta-icon" aria-hidden="true"><i class="bi bi-globe-americas" aria-hidden="true"></i></em>
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
        <li><em class="meta-icon" aria-hidden="true"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i></em>
          <span>${escapeHTML(r.city)}, ${escapeHTML(r.county)} County</span></li>
        ${r.phone ? `<li><em class="meta-icon" aria-hidden="true"><i class="bi bi-telephone-fill" aria-hidden="true"></i></em>
          <a href="tel:${sanitizePhone(r.phone)}">${escapeHTML(r.phone)}</a></li>` : ''}
        <li><em class="meta-icon" aria-hidden="true"><i class="bi bi-clock-fill" aria-hidden="true"></i></em>
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
        ${r.phone ? `<a href="tel:${sanitizePhone(r.phone)}" class="btn btn-primary btn-sm">
          <i class="bi bi-telephone-fill" aria-hidden="true"></i> Call
        </a>` : ''}
      </div>

      <p class="card-verified" aria-label="Data last verified">
        <i class="bi bi-check-circle-fill" aria-hidden="true"></i> Verified ${formatDate(r.last_verified_date)}
      </p>
    </article>`;
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function unique(arr) {
    return [...new Set(arr)];
  }

  function capitalise(str) {
    if (!str) return '';
    return str.replace(/[-_]/g, ' ')
              .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  // Faster than the DOM-node approach: no element allocation per call.
  const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escapeHTML(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) { return HTML_ESCAPES[c]; });
  }

  function sanitizePhone(phone) {
    return (phone || '').replace(/[^\d+]/g, '');
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  /**
   * Wrap each query token in <mark> for visual highlighting.
   * Highlights individual tokens so multi-word searches like "food detroit"
   * highlight "food" and "detroit" independently (matches how scoring works).
   */
  function highlightMatch(text, query) {
    const safe = escapeHTML(text);
    if (!query) return safe;
    const tokens = query.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return safe;

    // Build a single regex alternating all tokens, longest first to avoid
    // partial overlaps (e.g. "food" before "ood").
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

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

})();
