/**
 * search.js – Client-side search & filter for the Resource Directory
 *
 * Strategy:
 *  1. Fetch resources.json once
 *  2. Build a pre-computed lowercase search index per resource
 *  3. On each keystroke / filter change, run lightweight scoring and re-render
 *     (search input debounced 200 ms; combo selects respond immediately)
 *  4. Multi-select filters: OR within a group, AND across groups
 *
 * No third-party dependencies – pure vanilla JS.
 */

(function () {
  'use strict';

  /* ── State ──────────────────────────────────────────────── */
  let allResources      = [];
  let filteredResources = [];
  let debounceTimer     = null;

  // Active filter sets – OR within group, AND across groups
  const activeCats     = new Set();
  const activeCounties = new Set();
  const activeCities   = new Set();
  const activeTags     = new Set();

  // Combo instances (set in populateFilterOptions)
  var catCombo = null, countyCombo = null, cityCombo = null, tagCombo = null;

  /* ── Synonym map ─────────────────────────────────────────── */
  const QUERY_SYNONYMS = {
    shelter:       ['housing', 'emergency shelter', 'sleep', 'sleeping', 'camp'],
    housing:       ['shelter', 'emergency shelter', 'housing support'],
    clothes:       ['clothing', 'apparel', 'outfit', 'wardrobe', 'shoes'],
    clothing:      ['clothes', 'apparel', 'outfit', 'wardrobe', 'shoes'],
    toothpaste:    ['hygiene', 'oral', 'dental', 'toothbrush'],
    toothbrush:    ['toothpaste', 'hygiene', 'oral', 'dental'],
    teeth:         ['dental', 'tooth', 'oral health', 'dentist', 'toothache'],
    tooth:         ['dental', 'teeth', 'oral health', 'dentist'],
    gum:           ['dental', 'teeth', 'oral health'],
    dentist:       ['dental', 'oral health', 'tooth', 'teeth'],
    dental:        ['dentist', 'oral health', 'tooth', 'teeth'],
    advocate:      ['advocacy', 'legal', 'immigration', 'immigrant'],
    advocates:     ['advocacy', 'legal', 'immigration', 'immigrant'],
    advocacy:      ['advocate', 'legal aid', 'immigration', 'immigrant'],
    baby:          ['formula', 'infant', 'feeding', 'parenting'],
    formula:       ['baby', 'infant', 'feeding', 'parenting'],
    soap:          ['hygiene', 'shower', 'bath'],
    shampoo:       ['hygiene', 'hair care'],
    diapers:       ['baby', 'parenting', 'infant', 'hygiene', 'formula'],
    wic:           ['nutrition', 'baby', 'pregnancy', 'parenting', 'food'],
    pregnancy:     ['prenatal', 'baby', 'parenting', 'maternal', 'wic'],
    pregnant:      ['pregnancy', 'prenatal', 'parenting', 'maternal', 'wic'],
    prenatal:      ['pregnancy', 'maternal', 'baby', 'parenting', 'health'],
    maternal:      ['pregnancy', 'prenatal', 'baby', 'parenting'],
    doula:         ['birth support', 'postpartum', 'pregnancy', 'parenting'],
    women:         ['health', 'reproductive', 'family planning'],
    'ob-gyn':      ['women', 'health', 'reproductive', 'pregnancy'],
    obgyn:         ['women', 'health', 'reproductive', 'pregnancy'],
    family:        ['planning', 'support', 'health', 'parenting'],
    'family planning': ['contraception', 'reproductive', 'pregnancy', 'health'],
    abortion:      ['reproductive', 'women', 'pregnancy', 'health'],
    hiv:           ['aids', 'testing', 'prevention', 'sexual health'],
    aids:          ['hiv', 'testing', 'prevention', 'sexual health'],
    veterans:      ['va', 'health care', 'military'],
    veteran:       ['va', 'health care', 'military'],
    telehealth:    ['virtual care', 'online care', 'telemedicine'],
    medicaid:      ['health insurance', 'wic', 'sliding scale'],
    clinic:        ['health', 'medical', 'primary care'],
    childcare:     ['child care', 'preschool', 'early childhood', 'parenting', 'education', 'daycare'],
    preschool:     ['childcare', 'child care', 'early childhood', 'education'],
    'child care':  ['childcare', 'preschool', 'early childhood', 'parenting'],
    'home visiting': ['parenting', 'pregnancy', 'maternal', 'health'],
    rent:          ['housing', 'eviction', 'shelter'],
    eviction:      ['housing', 'rent', 'homelessness'],
    rehab:         ['recovery', 'detox', 'treatment', 'substance use', 'addiction'],
    detox:         ['withdrawal', 'rehab', 'recovery', 'treatment'],
    outpatient:    ['treatment', 'therapy', 'rehab', 'recovery'],
    inpatient:     ['residential', 'rehab', 'treatment', 'detox'],
    mat:           ['suboxone', 'methadone', 'buprenorphine', 'opioid treatment'],
    addiction:     ['substance use', 'rehab', 'detox', 'recovery', 'treatment'],
    substance:     ['addiction', 'rehab', 'detox', 'treatment'],
    alcohol:       ['substance use', 'addiction', 'rehab', 'recovery', 'sobriety', 'aa'],
    heroin:        ['opioid', 'substance use', 'addiction', 'rehab', 'recovery', 'mat'],
    heroine:       ['heroin', 'opioid', 'substance use', 'addiction', 'rehab'],
    meth:          ['methamphetamine', 'substance use', 'addiction', 'rehab'],
    opioid:        ['heroin', 'fentanyl', 'mat', 'suboxone', 'addiction', 'recovery'],
    fentanyl:      ['opioid', 'substance use', 'addiction', 'narcan', 'overdose'],
    narcan:        ['naloxone', 'overdose', 'opioid', 'harm reduction'],
    naloxone:      ['narcan', 'overdose', 'opioid', 'harm reduction'],
    mental:        ['mental health', 'therapy', 'counseling', 'health'],
    therapy:       ['counseling', 'mental health', 'behavioral health', 'therapist'],
    counseling:    ['therapy', 'mental health', 'behavioral health'],
    depression:    ['mental health', 'therapy', 'counseling', 'crisis'],
    anxiety:       ['mental health', 'therapy', 'counseling'],
    ptsd:          ['trauma', 'mental health', 'therapy'],
    directory:     ['legal', 'immigration', 'advocacy', 'resources'],
    financial:     ['money', 'cash', 'aid', 'assistance', 'benefits'],
    parenting:     ['family', 'children', 'kids', 'baby'],
    car:           ['transportation', 'bus', 'rides', 'vehicle'],
    bus:           ['transportation', 'transit', 'ddot', 'smart bus'],
    transportation: ['bus', 'rides', 'car', 'transit'],
    disability:    ['disabled', 'handicap', 'accessibility'],
    senior_services: ['seniors', 'elderly', 'aging', 'older adults'],
    documents:     ['immigration', 'legal', 'identification', 'undocumented'],
    document:      ['immigration', 'legal', 'identification'],
    'birth certificate': ['legal', 'vital records', 'identification', 'immigration'],
    'social security': ['legal', 'identification', 'benefits'],
    id:            ['identification', 'legal', 'immigration'],
    ice:           ['immigration', 'deportation', 'undocumented', 'removal'],
    deportation:   ['immigration', 'undocumented', 'ice', 'removal', 'asylum'],
    immigration:   ['immigrant', 'undocumented', 'legal', 'asylum', 'daca'],
    immigrant:     ['immigration', 'undocumented', 'legal', 'asylum'],
    undocumented:  ['immigration', 'legal', 'asylum', 'daca', 'documents'],
    asylum:        ['immigration', 'refugee', 'legal', 'undocumented'],
    daca:          ['immigration', 'dreamer', 'undocumented', 'legal'],
    refugee:       ['immigration', 'asylum', 'legal'],
    waitlist:      ['housing', 'shelter', 'section 8', 'rapid rehousing'],
    homeless:      ['housing', 'shelter', 'emergency housing'],
    abuse:         ['domestic violence', 'crisis', 'shelter', 'safety'],
    violence:      ['domestic violence', 'crisis', 'shelter', 'safety'],
    trafficking:   ['human trafficking', 'crisis', 'exploitation'],
  };

  /* ── Translated query normalization ─────────────────────── */
  const TRANSLATED_QUERY_PATTERNS = [
    { pattern: /\b(no\s+tengo\s+comida|sin\s+comida|sin\s+alimentos)\b/g, replacement: 'no food' },
    { pattern: /\b(comida|alimentos|hambre|hambriento|hambrienta)\b/g,    replacement: 'food' },
    { pattern: /\b(vivienda|sin\s+hogar|sin\s+casa|alquiler|alojamiento)\b/g, replacement: 'housing' },
    { pattern: /\b(transporte|autob[uú]s|taxi|veh[ií]culo)\b/g,          replacement: 'transportation' },
    { pattern: /\b(discapacidad|discapacitad[oa]|accesibilidad)\b/g,      replacement: 'disability' },
    { pattern: /\b(ancian[oa]|adultos\s+mayores|jubilad[oa])\b/g,         replacement: 'senior_services' },
    { pattern: /\b(sin\s+trabajo|busco\s+trabajo|desempleo|desemplead[oa])\b/g, replacement: 'unemployed' },
    { pattern: /\b(no\s+tengo\s+papeles|soy\s+indocumentad[oa]|deportaci[oó]n)\b/g, replacement: 'undocumented deportation' },
    { pattern: /\b(dinero|efectivo|ayuda\s+financiera|beneficios)\b/g,    replacement: 'financial' },
    { pattern: /(食物|食品|饥饿|饿|没有食物|没吃)/g,                      replacement: 'food' },
    { pattern: /(住房|房子|无家可归|没有家|没地方住)/g,                    replacement: 'housing' },
    { pattern: /(没有工作|找工作|失业)/g,                                  replacement: 'unemployed' },
    { pattern: /(交通|公交|出租车|火车|地铁|巴士)/g,                       replacement: 'transportation' },
    { pattern: /(健康|医生|医院|诊所|医疗)/g,                              replacement: 'health' },
    { pattern: /(孩子|儿童|父母|养育|家庭)/g,                              replacement: 'parenting' },
    { pattern: /(家暴|暴力|虐待)/g,                                        replacement: 'domestic-violence' },
    { pattern: /(没有钱|没钱)/g,                                           replacement: 'no money' },
    { pattern: /(طعام|جوع|جائع)/g,                                        replacement: 'food' },
    { pattern: /(سكن|منزل|بيت|مأوى|بلا\s+مأوى)/g,                       replacement: 'housing' },
    { pattern: /(مواصلات|تاكسي|حافلة|قطار|مترو)/g,                       replacement: 'transportation' },
    { pattern: /(صحة|طبيب|مستشفى|عيادة)/g,                               replacement: 'health' },
    { pattern: /(أسرة|أطفال|طفل|أم|أب)/g,                                replacement: 'parenting' },
    { pattern: /(عنف\s+منزلي|عنف\s+أسري)/g,                              replacement: 'domestic-violence' },
    { pattern: /(ليس\s+لدي\s+نقود|لا\s+يوجد\s+مال)/g,                   replacement: 'no money' },
  ];

  const NL_PREFIX_RE = /^(i('m| am)?\s+)?(looking for|need help (with|for|finding|getting)|need|want(ing)?|trying to (find|get)|where (can i (find|get)|do i (find|get))|how (do i|can i) (get|find)|help (with|for|me find|me get))\s+/i;

  function normalizeQuery(rawQuery) {
    let q = String(rawQuery || '').toLowerCase().trim();
    q = q.replace(NL_PREFIX_RE, '');
    COMMON_MISSPELLINGS.forEach(function (e) {
      q = q.replace(new RegExp('\\b' + e.typo + '\\b', 'gi'), e.correct);
    });
    TRANSLATED_QUERY_PATTERNS.forEach(function (e) {
      q = q.replace(e.pattern, e.replacement);
    });
    return q;
  }

  /* ── Intent detection rules ─────────────────────────────── */
  const INTENT_RULES = [
    {
      patterns: [
        /\b(crisis|emergency|urgent|immediately?|dying|911)/i,
        /\b(suicid|kill\s+myself|end\s+my\s+life|self\s+harm|overdose)/i,
        /\b(domestic\s+viol|being\s+abused|assault|rape|trafficking)/i,
        /\b(homeless|no\s+place\s+to\s+stay|evict|on\s+the\s+street)/i,
      ],
      categories: ['crisis', 'housing', 'domestic-violence'],
      weight: 100,
    },
    {
      patterns: [/\b(hungry|no\s+food|starving|food\s+bank|snap|wic|haven.?t\s+eaten|out\s+of\s+food)\b/i],
      categories: ['food', 'financial'],
      weight: 90,
    },
    {
      patterns: [/\b(job|employment|work|laid\s+off|fired|unemploy|income|career)\b/i],
      categories: ['employment', 'financial'],
      weight: 80,
    },
    {
      patterns: [/\b(health|doctor|hospital|medical|clinic|insurance|medicaid|medication|prescription|teeth|dental|tooth)\b/i],
      categories: ['health'],
      weight: 75,
    },
    {
      patterns: [/\b(housing|rent|mortgage|shelter|apartment|homeless|eviction|waitlist|no\s+place\s+to\s+stay)\b/i],
      categories: ['housing'],
      weight: 75,
    },
    {
      patterns: [/\b(immigra|undocumented|ice\b|deport|asylum|daca|dreamer|visa|document|birth\s+cert|papers)\b/i],
      categories: ['immigration', 'legal'],
      weight: 75,
    },
    {
      patterns: [/\b(addict|alcohol|heroin[e]?|meth|fentanyl|opioid|drug|rehab|recovery|detox|quit\s+(drinking|using))\b/i],
      categories: ['rehabilitation'],
      weight: 75,
    },
    {
      patterns: [/\b(pregnant|pregnancy|baby|infant|prenatal|postpartum|wic|childcare|first\s+time\s+mom|new\s+mom)\b/i],
      categories: ['parenting', 'health'],
      weight: 70,
    },
    {
      patterns: [/\b(no\s+car|no\s+transportation|bus\s+(pass|fare)|can.?t\s+drive|no\s+ride|stranded|no\s+vehicle)\b/i],
      categories: ['transportation'],
      weight: 65,
    },
    {
      patterns: [/\b(clothes|clothing|shoes|coat|jacket|nothing\s+to\s+wear|no\s+clothes)\b/i],
      categories: ['clothing'],
      weight: 60,
    },
    {
      patterns: [/\b(shower|laundry|hygiene|soap|shampoo|period\s+products|feminine\s+(hygiene|products))\b/i],
      categories: ['hygiene'],
      weight: 60,
    },
  ];

  /* ── Common misspellings ─────────────────────────────────── */
  const COMMON_MISSPELLINGS = [
    { typo: 'denist',        correct: 'dentist' },
    { typo: 'dentel',        correct: 'dental' },
    { typo: 'dential',       correct: 'dental' },
    { typo: 'houzing',       correct: 'housing' },
    { typo: 'homless',       correct: 'homeless' },
    { typo: 'homeles',       correct: 'homeless' },
    { typo: 'emergancy',     correct: 'emergency' },
    { typo: 'emerjency',     correct: 'emergency' },
    { typo: 'assitance',     correct: 'assistance' },
    { typo: 'asistance',     correct: 'assistance' },
    { typo: 'familiy',       correct: 'family' },
    { typo: 'pregnent',      correct: 'pregnant' },
    { typo: 'pregant',       correct: 'pregnant' },
    { typo: 'prgenant',      correct: 'pregnant' },
    { typo: 'chlidcare',     correct: 'childcare' },
    { typo: 'cildcare',      correct: 'childcare' },
    { typo: 'helth',         correct: 'health' },
    { typo: 'heatlh',        correct: 'health' },
    { typo: 'transportaion', correct: 'transportation' },
    { typo: 'trasportation', correct: 'transportation' },
    { typo: 'alchohol',      correct: 'alcohol' },
    { typo: 'alcahol',       correct: 'alcohol' },
    { typo: 'alcohal',       correct: 'alcohol' },
    { typo: 'heroine',       correct: 'heroin' },
    { typo: 'immigrasion',   correct: 'immigration' },
    { typo: 'imigration',    correct: 'immigration' },
    { typo: 'deportasion',   correct: 'deportation' },
    { typo: 'sheltar',       correct: 'shelter' },
    { typo: 'shleter',       correct: 'shelter' },
    { typo: 'recoverey',     correct: 'recovery' },
    { typo: 'recovory',      correct: 'recovery' },
    { typo: 'emploiment',    correct: 'employment' },
    { typo: 'emploment',     correct: 'employment' },
    { typo: 'medicin',       correct: 'medicine' },
    { typo: 'medecine',      correct: 'medicine' },
    { typo: 'perscription',  correct: 'prescription' },
    { typo: 'prescrition',   correct: 'prescription' },
    { typo: 'counceling',    correct: 'counseling' },
    { typo: 'counselling',   correct: 'counseling' },
    { typo: 'terapy',        correct: 'therapy' },
    { typo: 'therepy',       correct: 'therapy' },
    { typo: 'voilence',      correct: 'violence' },
    { typo: 'violense',      correct: 'violence' },
    { typo: 'trafiking',     correct: 'trafficking' },
    { typo: 'traffiking',    correct: 'trafficking' },
    { typo: 'addiciton',     correct: 'addiction' },
    { typo: 'adiction',      correct: 'addiction' },
    { typo: 'anxeity',       correct: 'anxiety' },
    { typo: 'anxity',        correct: 'anxiety' },
  ];

  /* ── DOM refs ───────────────────────────────────────────── */
  const searchInput    = document.getElementById('search-input');
  const clearBtn       = document.getElementById('search-clear');
  const resetBtn       = document.getElementById('filter-reset');
  const filterBadge    = document.getElementById('filter-badge');
  const fltCatCount    = document.getElementById('flt-cat-count');
  const fltCountyCount = document.getElementById('flt-county-count');
  const fltCityCount   = document.getElementById('flt-city-count');
  const fltTagCount    = document.getElementById('flt-tag-count');
  const resultsGrid    = document.getElementById('results-grid');
  const resultsCount   = document.getElementById('results-count');

  if (!resultsGrid) return;

  /* ── Bootstrap ──────────────────────────────────────────── */
  fetchResources();

  /* ── Data loading ───────────────────────────────────────── */
  function fetchResources() {
    renderSkeletons(6);
    fetch(getBasePath() + 'data/resources.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
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

  function getBasePath() {
    const depth = window.location.pathname.split('/').length - 2;
    return depth <= 0 ? './' : '../'.repeat(depth);
  }

  /* ── Build combobox filters ─────────────────────────────── */
  function populateFilterOptions(data) {
    const categories = unique(data.map(function (r) { return r.category; })).sort();
    const counties   = unique(data.map(function (r) { return r.county; })).sort();
    const cities     = unique(data.map(function (r) { return r.city; })).sort();
    const tags       = unique(data.flatMap(function (r) { return r.tags || []; })).sort();

    catCombo    = makeCombo('cat-combo',    activeCats,     fltCatCount,    capitalise, categories);
    countyCombo = makeCombo('county-combo', activeCounties, fltCountyCount, null,       counties);
    cityCombo   = makeCombo('city-combo',   activeCities,   fltCityCount,   null,       cities);
    tagCombo    = makeCombo('tag-combo',    activeTags,     fltTagCount,    null,       tags);
  }

  /* ── Generic filter combobox factory ───────────────────── */
  function makeCombo(wrapId, activeSet, countEl, labelFn, allValues) {
    var prefix = wrapId.replace('-combo', '');
    var input  = document.getElementById(wrapId + '-input');
    var list   = document.getElementById(wrapId + '-list');
    var toggle = document.getElementById(wrapId + '-toggle');
    var chips  = document.getElementById(prefix + '-selected-chips');

    function render(filter) {
      if (!list) return;
      var q = (filter || '').toLowerCase().trim();
      var matching = allValues.filter(function (v) {
        return !q || v.toLowerCase().includes(q);
      });
      list.innerHTML = '';
      if (!matching.length) {
        var emp = document.createElement('li');
        emp.className = 'tag-combo-empty';
        emp.textContent = 'No matches';
        list.appendChild(emp);
        return;
      }
      matching.forEach(function (val) {
        var display = labelFn ? labelFn(val) : val;
        var li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.setAttribute('tabindex', '0');
        li.dataset.value = val;
        li.setAttribute('aria-selected', activeSet.has(val) ? 'true' : 'false');
        if (activeSet.has(val)) li.classList.add('selected');
        if (q) {
          var lc = display.toLowerCase();
          var idx = lc.indexOf(q);
          if (idx >= 0) {
            li.innerHTML = escapeHTML(display.slice(0, idx)) +
              '<mark>' + escapeHTML(display.slice(idx, idx + q.length)) + '</mark>' +
              escapeHTML(display.slice(idx + q.length));
          } else {
            li.textContent = display;
          }
        } else {
          li.textContent = display;
        }
        li.addEventListener('click', function () { select(val); });
        li.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(val); }
          if (e.key === 'ArrowDown') { e.preventDefault(); var n = li.nextElementSibling; if (n) n.focus(); }
          if (e.key === 'ArrowUp')   { e.preventDefault(); var p = li.previousElementSibling; if (p) p.focus(); else if (input) input.focus(); }
          if (e.key === 'Escape')    { close(); if (input) input.focus(); }
        });
        list.appendChild(li);
      });
    }

    function select(val) {
      if (activeSet.has(val)) activeSet.delete(val);
      else activeSet.add(val);
      updateGroupCount(countEl, activeSet.size);
      updateBadge();
      render(input ? input.value : '');
      renderSelected();
      applyFilters();
      if (input) input.focus();
    }

    function renderSelected() {
      if (!chips) return;
      chips.innerHTML = '';
      activeSet.forEach(function (val) {
        var display = labelFn ? labelFn(val) : val;
        var chip = document.createElement('span');
        chip.className = 'tag-selected-chip';
        var lbl = document.createTextNode(display + ' ');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Remove ' + display);
        btn.textContent = '×';
        btn.addEventListener('click', function (e) { e.stopPropagation(); select(val); });
        chip.appendChild(lbl);
        chip.appendChild(btn);
        chips.appendChild(chip);
      });
    }

    function open() {
      if (!list) return;
      list.removeAttribute('hidden');
      if (input) input.setAttribute('aria-expanded', 'true');
      if (toggle) toggle.classList.add('open');
    }

    function close() {
      if (!list) return;
      list.setAttribute('hidden', '');
      if (input) input.setAttribute('aria-expanded', 'false');
      if (toggle) toggle.classList.remove('open');
    }

    function reset() {
      activeSet.clear();
      if (input) input.value = '';
      render('');
      close();
      renderSelected();
      updateGroupCount(countEl, 0);
    }

    // Event bindings
    if (input) {
      input.addEventListener('input', function () { render(this.value); open(); });
      input.addEventListener('focus', open);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          var first = list && list.querySelector('li:not(.tag-combo-empty)');
          if (first) first.focus();
        }
      });
    }
    if (toggle) {
      toggle.addEventListener('click', function () {
        if (list && list.hasAttribute('hidden')) { open(); if (input) input.focus(); }
        else close();
      });
    }
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#' + wrapId)) close();
    });

    render('');
    return { reset: reset };
  }

  function updateGroupCount(countEl, count) {
    if (!countEl) return;
    countEl.textContent = count;
    if (count > 0) countEl.removeAttribute('hidden');
    else           countEl.setAttribute('hidden', '');
  }

  function updateBadge() {
    if (!filterBadge) return;
    const total = activeCats.size + activeCounties.size + activeCities.size + activeTags.size;
    filterBadge.textContent = total;
    if (total > 0) filterBadge.removeAttribute('hidden');
    else           filterBadge.setAttribute('hidden', '');
  }

  /* ── Event wiring ───────────────────────────────────────── */
  function bindEvents() {
    if (searchInput) {
      searchInput.addEventListener('input', onSearchChange);
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') clearSearch();
      });
    }
    if (clearBtn) clearBtn.addEventListener('click', clearSearch);
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="reset-filters"]')) resetFilters();
    });
  }

  function onSearchChange() {
    if (clearBtn) clearBtn.classList.toggle('visible', searchInput.value.length > 0);
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
    if (searchInput) searchInput.value = '';
    if (clearBtn)    clearBtn.classList.remove('visible');

    if (catCombo)    catCombo.reset();
    if (countyCombo) countyCombo.reset();
    if (cityCombo)   cityCombo.reset();
    if (tagCombo)    tagCombo.reset();

    updateBadge();
    applyFilters();
  }

  /* ── Core filter + search logic ─────────────────────────── */
  function applyFilters() {
    const rawQuery = searchInput ? searchInput.value.trim() : '';
    const query    = normalizeQuery(rawQuery);

    let results = allResources;

    // Multi-select: OR within each group, AND across groups
    if (activeCats.size > 0) {
      results = results.filter(function (r) {
        return (r.categories || [r.category]).some(function (c) { return activeCats.has(c); });
      });
    }
    if (activeCounties.size > 0) {
      results = results.filter(function (r) { return activeCounties.has(r.county); });
    }
    if (activeCities.size > 0) {
      results = results.filter(function (r) { return activeCities.has(r.city); });
    }
    if (activeTags.size > 0) {
      results = results.filter(function (r) {
        return (r.tags || []).some(function (t) { return activeTags.has(t); });
      });
    }

    if (query) {
      const intentScores = detectIntent(query);
      if (intentScores.has('crisis')) {
        const crisisResources = results.filter(function (r) {
          return (r.categories || [r.category]).includes('crisis');
        });
        if (crisisResources.length > 0) {
          filteredResources = crisisResources.slice(0, 5);
          render(crisisResources.slice(0, 5), rawQuery, query);
          return;
        }
      }
      results = scoreAndSort(results, query, intentScores);
    }

    filteredResources = results;
    render(results, rawQuery, query);
  }

  /* ── Scoring ────────────────────────────────────────────── */
  function scoreAndSort(resources, query, intentScores) {
    const phrase         = query.toLowerCase();
    const tokens         = phrase.split(/\s+/).filter(Boolean);
    const expandedTokens = expandQueryTokens(tokens);

    const scored = resources.map(function (r) {
      let score = 0;

      if (intentScores) {
        const cat = r.categories ? r.categories[0] : r.category;
        if (intentScores.has(cat)) score += 20;
      }

      if (r._nameLower.includes(phrase)) score += 10;
      else if (r._idx.includes(phrase))  score += 5;

      let allMatch = true;
      expandedTokens.forEach(function (token) {
        const inName  = r._nameLower.includes(token);
        const inTags  = (r.tags || []).some(function (t) { return t.toLowerCase().includes(token); });
        const inDesc  = r.description && r.description.toLowerCase().includes(token);
        const inIdx   = inName || inTags || inDesc || r._idx.includes(token);

        if (inIdx) {
          if      (inName) score += 3;
          else if (inTags) score += 5;
          else if (inDesc) score += 2;
          else             score += 1;
        }
      });

      tokens.forEach(function (token) {
        if (!r._idx.includes(token) && !r._nameLower.includes(token)) allMatch = false;
      });

      if (allMatch && tokens.length > 1) score += 5;

      return { resource: r, score: score };
    });

    return scored
      .filter(function (s) { return s.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (s) { return s.resource; });
  }

  function expandQueryTokens(tokens) {
    const expanded = [], seen = new Set();
    tokens.forEach(function (token) {
      if (!seen.has(token)) { expanded.push(token); seen.add(token); }
      (QUERY_SYNONYMS[token] || []).forEach(function (alias) {
        if (!seen.has(alias)) { expanded.push(alias); seen.add(alias); }
      });
    });
    return expanded;
  }

  /* ── Intent detection ───────────────────────────────────── */
  function detectIntent(query) {
    const lq = query.toLowerCase();
    const matched = new Map();
    INTENT_RULES.forEach(function (rule) {
      rule.patterns.forEach(function (pattern) {
        const hit = (pattern instanceof RegExp) ? pattern.test(lq) : lq.includes(pattern);
        if (hit) {
          rule.categories.forEach(function (cat) {
            matched.set(cat, (matched.get(cat) || 0) + rule.weight);
          });
        }
      });
    });
    return matched;
  }

  /* ── Fuzzy matching / suggestions ───────────────────────── */
  function levenshtein(a, b) {
    const aLen = a.length, bLen = b.length;
    const dp = Array.from({ length: aLen + 1 }, function () { return Array(bLen + 1).fill(0); });
    for (let i = 0; i <= aLen; i++) dp[i][0] = i;
    for (let j = 0; j <= bLen; j++) dp[0][j] = j;
    for (let i = 1; i <= aLen; i++) {
      for (let j = 1; j <= bLen; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[aLen][bLen];
  }

  function suggestClosestQuery(query) {
    if (!query || query.length < 2) return null;
    const lq = query.toLowerCase();
    for (const e of COMMON_MISSPELLINGS) {
      if (levenshtein(lq, e.typo) <= 1) return e.correct;
    }
    let bestMatch = null, bestDist = 3;
    allResources.forEach(function (r) {
      const d = levenshtein(lq, r._nameLower);
      if (d < bestDist) { bestDist = d; bestMatch = r._nameLower; }
      (r.tags || []).forEach(function (tag) {
        const td = levenshtein(lq, tag.toLowerCase());
        if (td < bestDist) { bestDist = td; bestMatch = tag; }
      });
    });
    return bestMatch;
  }

  /* ── Rendering ──────────────────────────────────────────── */
  function render(resources, displayQuery, query) {
    if (resultsCount) {
      resultsCount.textContent = resources.length === 1
        ? '1 resource found'
        : resources.length + ' resources found';
    }
    if (resources.length === 0) { renderEmpty(displayQuery, query || displayQuery); return; }
    resultsGrid.innerHTML = resources.map(function (r) { return buildCardHTML(r, displayQuery); }).join('');
  }

  function renderEmpty(displayQuery, query) {
    let suggestionHTML = '';
    if (query) {
      const suggestion = suggestClosestQuery(query);
      if (suggestion) {
        suggestionHTML = `
          <p style="margin-top:.75rem">
            <strong>Did you mean:</strong>
            <button class="btn btn-sm btn-outline" style="padding:.25rem .75rem;margin-left:.5rem"
              onclick="document.getElementById('search-input').value='${escapeHTML(suggestion)}';
                       document.getElementById('search-input').dispatchEvent(new Event('input'));">
              ${escapeHTML(suggestion)}
            </button>
          </p>`;
      }
    }
    resultsGrid.innerHTML = `
      <div class="empty-state" role="status" aria-live="polite">
        <div class="empty-icon" aria-hidden="true"><i class="bi bi-search" aria-hidden="true"></i></div>
        <h3>No resources found</h3>
        <p>${query
          ? 'No results for <strong>"' + escapeHTML(query) + '"</strong>. Try different keywords or clear filters.'
          : 'No resources match the selected filters.'}</p>
        ${suggestionHTML}
        <button class="btn btn-outline" style="margin-top:1rem" data-action="reset-filters">Clear All Filters</button>
      </div>`;
  }

  function renderSkeletons(count) {
    resultsGrid.innerHTML = Array.from({ length: count }, function () {
      return `<div class="resource-card" aria-hidden="true">
        <div class="skeleton" style="height:1.2rem;width:70%;margin-bottom:.75rem"></div>
        <div class="skeleton" style="height:.85rem;width:40%;margin-bottom:.5rem"></div>
        <div class="skeleton" style="height:.85rem;width:55%;margin-bottom:.5rem"></div>
        <div class="skeleton" style="height:.85rem;width:50%"></div>
      </div>`;
    }).join('');
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
           <a href="${escapeHTML(r.website)}" target="_blank" rel="noopener noreferrer">Visit website</a></li>`
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
        ${r.phone
          ? `<li><em class="meta-icon" aria-hidden="true"><i class="bi bi-telephone-fill" aria-hidden="true"></i></em>
               <a href="tel:${sanitizePhone(r.phone)}">${escapeHTML(r.phone)}</a></li>`
          : ''}
        <li><em class="meta-icon" aria-hidden="true"><i class="bi bi-clock-fill" aria-hidden="true"></i></em>
          <span>${escapeHTML(r.hours)}</span></li>
        ${websiteHTML}
      </ul>

      <div class="card-tags" aria-label="Tags">${tagsHTML}</div>

      <div id="details-${r.id}" class="card-details" aria-hidden="true">
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
                aria-controls="details-${r.id}">
          More Info
        </button>
        ${r.phone
          ? `<a href="tel:${sanitizePhone(r.phone)}" class="btn btn-primary btn-sm">
               <i class="bi bi-telephone-fill" aria-hidden="true"></i> Call
             </a>`
          : ''}
      </div>

      <p class="card-verified" aria-label="Data last verified">
        <i class="bi bi-check-circle-fill" aria-hidden="true"></i> Verified ${formatDate(r.last_verified_date)}
      </p>
    </article>`;
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function unique(arr) { return [...new Set(arr)]; }

  function capitalise(str) {
    if (!str) return '';
    return str.replace(/[-_]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escapeHTML(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) { return HTML_ESCAPES[c]; });
  }

  function sanitizePhone(p) { return (p || '').replace(/[^\d+]/g, ''); }

  function formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr + 'T00:00:00');
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
    } catch (e) { return safe; }
  }

  function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

})();
