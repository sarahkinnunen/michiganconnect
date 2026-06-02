/**
 * resource-planner.js
 * Guided "Build Your Resource Plan" tool on the directory page.
 */
(function () {
  'use strict';

  /* ── Needs configuration ─────────────────────────────────── */
  var NEEDS = [
    {
      id: 'housing', label: 'Housing', icon: 'bi-house-door-fill',
      categories: ['housing'],
      subs: [
        { label: 'Emergency Shelter',        tags: ['emergency shelter'] },
        { label: 'Transitional Housing',     tags: ['transitional', 'transitional housing'] },
        { label: 'Rental Assistance',        tags: ['rental assistance', 'rental help'] },
        { label: 'Homelessness Prevention',  tags: ['homelessness prevention', 'homeless prevention'] },
      ]
    },
    {
      id: 'food', label: 'Food', icon: 'bi-basket2-fill',
      categories: ['food'],
      subs: [
        { label: 'Food Pantry',              tags: ['pantry', 'food pantry'] },
        { label: 'Hot Meals',                tags: ['hot meals', 'free meals', 'meal', 'soup kitchen'] },
        { label: 'Baby / WIC',               tags: ['wic', 'baby', 'infant'] },
        { label: 'Nutrition Programs',       tags: ['nutrition'] },
      ]
    },
    {
      id: 'clothing', label: 'Clothing', icon: 'bi-bag-fill',
      categories: ['clothing'],
      subs: [
        { label: 'Free Clothing',            tags: ['free clothing', 'clothing'] },
        { label: 'Professional / Work Wear', tags: ['professional clothing', 'interview attire'] },
        { label: 'Baby & Kids Clothing',     tags: ['baby', 'baby supplies', 'children'] },
      ]
    },
    {
      id: 'dental', label: 'Dental', icon: 'bi-emoji-smile',
      categories: ['health'], filterTag: 'dental',
      subs: [
        { label: 'Dental Emergency',         tags: ['dental', 'urgent care', 'emergency'] },
        { label: 'Low-Cost Dentist',         tags: ['dental', 'low cost', 'free', 'sliding scale', 'medicaid'] },
        { label: 'Orthodontist',             tags: ['orthodontist', 'orthodontics', 'dental'] },
        { label: 'Oral Surgeon',             tags: ['oral surgery', 'oral surgeon', 'dental'] },
        { label: 'Crown / Filling',          tags: ['dental'] },
        { label: 'Extraction',               tags: ['dental'] },
      ]
    },
    {
      id: 'mental-health', label: 'Mental Health', icon: 'bi-heart-pulse-fill',
      categories: ['health', 'rehabilitation'], filterTag: 'mental health',
      subs: [
        { label: 'Therapy / Counseling',     tags: ['mental health', 'counseling', 'therapy'] },
        { label: 'Crisis Support',           tags: ['mental health', 'crisis', 'hotline'] },
        { label: 'Substance Use / Addiction',tags: ['substance use', 'addiction', 'recovery'] },
        { label: 'Spiritual Counseling',     tags: ['spiritual', 'counseling'] },
      ]
    },
    {
      id: 'pregnancy', label: 'Pregnancy / Reproductive', icon: 'bi-person-hearts',
      categories: ['health'], filterTag: 'reproductive',
      subs: [
        { label: 'Prenatal Care',            tags: ['reproductive health', 'pregnancy', 'prenatal'] },
        { label: 'Family Planning',          tags: ['family planning', 'birth control', 'reproductive'] },
        { label: 'WIC (food + nutrition)',   tags: ['wic'] },
        { label: 'STI / STD Testing',        tags: ['sti testing', 'std', 'sti'] },
      ]
    },
    {
      id: 'primary-care', label: 'Primary Care', icon: 'bi-hospital-fill',
      categories: ['health'], filterTag: 'primary care',
      subs: [
        { label: 'Free / Sliding-Scale Clinic', tags: ['free clinic', 'sliding scale', 'free', 'uninsured'] },
        { label: 'Urgent Care / Walk-In',    tags: ['urgent care', 'walk-in', 'same day'] },
        { label: 'Pharmacy / Prescriptions', tags: ['pharmacy', 'medication', 'prescription', 'rx'] },
        { label: 'Chronic Illness Care',     tags: ['chronic illness', 'diabetes', 'hypertension'] },
      ]
    },
    {
      id: 'vision', label: 'Vision / Eye Care', icon: 'bi-eye-fill',
      categories: ['health'], filterTag: 'vision',
      subs: [
        { label: 'Free Eye Exams',           tags: ['vision', 'free', 'eye exam'] },
        { label: 'Low-Cost Glasses',         tags: ['vision', 'low cost', 'glasses', 'eyeglasses'] },
        { label: 'Mobile Vision Clinic',     tags: ['vision', 'mobile clinic'] },
      ]
    },
    {
      id: 'legal', label: 'Legal Help', icon: 'bi-bank2',
      categories: ['legal'],
      subs: [
        { label: 'Free Legal Services',      tags: ['free legal', 'legal aid', 'pro bono'] },
        { label: 'Immigration Legal',        tags: ['immigration', 'asylum', 'citizenship', 'refugee'] },
        { label: 'Tenant / Housing Rights',  tags: ['tenant', 'tenant rights', 'eviction'] },
        { label: 'Family Law / Custody',     tags: ['family law', 'custody', 'family court'] },
        { label: 'Domestic Violence Legal',  tags: ['protection orders', 'legal advocacy', 'domestic violence'] },
        { label: 'Victim Compensation',      tags: ['victim compensation', 'crime victim'] },
      ]
    },
    {
      id: 'employment', label: 'Employment', icon: 'bi-briefcase-fill',
      categories: ['employment'],
      subs: [
        { label: 'Job Training',             tags: ['job training', 'workforce', 'credentials'] },
        { label: 'Job Placement',            tags: ['job placement', 'internship', 'paid work'] },
        { label: 'Resume Help',              tags: ['resume'] },
        { label: 'Trade Skills',             tags: ['trade skills', 'hvac', 'cna', 'certification'] },
        { label: 'Youth Employment (14–24)', tags: ['youth', 'ages 14-24', 'youthbuild', 'summer jobs'] },
      ]
    },
    {
      id: 'education', label: 'Education', icon: 'bi-mortarboard-fill',
      categories: ['education'],
      subs: [
        { label: 'GED / HiSET',             tags: ['ged', 'hiset', 'high school diploma'] },
        { label: 'After-School Programs',    tags: ['after-school'] },
        { label: 'Tutoring',                 tags: ['tutoring'] },
        { label: 'Trade / Vocational',       tags: ['trade skills', 'vocational', 'certification'] },
      ]
    },
    {
      id: 'transportation', label: 'Transportation', icon: 'bi-bus-front-fill',
      categories: ['transportation', 'transportation_assistance'],
      subs: [
        { label: 'Bus / Public Transit',     tags: ['bus', 'transit', 'public transportation'] },
        { label: 'Reduced Fare Programs',    tags: ['reduced fare', 'low-income', 'disabled', 'seniors'] },
        { label: 'Vehicle Assistance',       tags: ['vehicle assistance', 'car', 'gas cards'] },
      ]
    },
    {
      id: 'crisis', label: 'Crisis & Safety', icon: 'bi-shield-fill-exclamation',
      categories: ['crisis', 'domestic-violence', 'human-trafficking'],
      subs: [
        { label: 'Crisis Hotlines',          tags: ['hotline', 'crisis', '24/7'] },
        { label: 'Domestic Violence',        tags: ['domestic violence', 'intimate partner violence', 'shelter'] },
        { label: 'Human Trafficking',        tags: ['human trafficking'] },
        { label: 'Safe Housing / Shelter',   tags: ['shelter', 'emergency'] },
        { label: 'Safety Planning',          tags: ['safety planning', 'advocacy'] },
      ]
    },
    {
      id: 'hygiene', label: 'Hygiene', icon: 'bi-droplet-fill',
      categories: ['hygiene'],
      subs: [
        { label: 'Showers / Laundry',        tags: ['showers', 'laundry'] },
        { label: 'Hygiene Kits',             tags: ['hygiene kits', 'hygiene', 'toiletries'] },
        { label: 'Baby / Diaper Supplies',   tags: ['diapers', 'baby supplies', 'cloth diapers'] },
      ]
    },
    {
      id: 'parenting', label: 'Parenting & Family', icon: 'bi-people-fill',
      categories: ['parenting', 'childcare'],
      subs: [
        { label: 'Childcare',                tags: ['childcare', 'daycare'] },
        { label: 'Baby Supplies / Diapers',  tags: ['diapers', 'baby supplies'] },
        { label: 'Family Support Programs',  tags: ['family support', 'parenting'] },
        { label: 'Mental Health for Families', tags: ['mental health', 'counseling'] },
      ]
    },
    {
      id: 'immigration', label: 'Immigration', icon: 'bi-globe-americas',
      categories: ['immigration'],
      subs: [
        { label: 'Free Legal Help',          tags: ['legal', 'free legal', 'free'] },
        { label: 'Asylum Support',           tags: ['asylum'] },
        { label: 'Citizenship / Naturalization', tags: ['citizenship', 'naturalization'] },
        { label: 'Refugee Services',         tags: ['refugee', 'refugees'] },
        { label: 'Advocacy & Community',     tags: ['advocacy', 'community'] },
      ]
    },
    {
      id: 'rehab', label: 'Rehab & Recovery', icon: 'bi-bandaid-fill',
      categories: ['rehabilitation'],
      subs: [
        { label: 'Detox Programs',           tags: ['detox'] },
        { label: 'Outpatient Treatment',     tags: ['outpatient'] },
        { label: 'Residential Treatment',    tags: ['residential'] },
        { label: 'Mental Health Recovery',   tags: ['recovery', 'mental health'] },
        { label: 'Youth Substance Use',      tags: ['youth', 'substance use', 'addiction'] },
      ]
    },
  ];

  // Safety/crisis need IDs that always sort first in the plan
  var SAFETY_NEEDS = { 'crisis': true, 'domestic-violence': true, 'human-trafficking': true };

  /* ── State ───────────────────────────────────────────────── */
  var allResources  = [];
  var selectedCities = [];
  var allCityOptions = [];

  /* ── Helpers ─────────────────────────────────────────────── */
  function escapeHTML(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str || '')));
    return d.innerHTML;
  }
  function sanitizePhone(p) { return (p || '').replace(/[^\d+]/g, ''); }
  function domainOf(url) {
    if (!url) return '';
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  }

  /* ── Boot ────────────────────────────────────────────────── */
  var plannerEl = document.getElementById('resource-planner');
  if (!plannerEl) return;

  fetch('data/resources.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      allResources = data;
      initCityCombo(data);
      buildNeedsGrid();
      wireForm();
    })
    .catch(function (err) { console.error('Planner: could not load resources', err); });

  /* ── City combobox (multi-select) ────────────────────────── */
  function initCityCombo(data) {
    var cities = [];
    var seen = {};
    data.forEach(function (r) {
      var c = r.city || '';
      if (c && !seen[c] && c !== 'N/A' && c !== 'National' && c !== 'Statewide' &&
          c !== 'Multiple' && c !== 'Multiple locations') {
        seen[c] = true;
        cities.push(c);
      }
    });
    cities.sort();
    allCityOptions = cities;

    var input  = document.getElementById('planner-city-input');
    var list   = document.getElementById('planner-city-list');
    var toggle = document.getElementById('planner-city-toggle');
    var chips  = document.getElementById('planner-city-chips');

    function renderList(filter) {
      if (!list) return;
      var q = (filter || '').toLowerCase().trim();
      var matching = allCityOptions.filter(function (c) {
        return !q || c.toLowerCase().includes(q);
      });
      list.innerHTML = '';
      if (!matching.length) {
        var emp = document.createElement('li');
        emp.className = 'tag-combo-empty';
        emp.textContent = 'No cities match';
        list.appendChild(emp);
        return;
      }
      matching.forEach(function (city) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.setAttribute('tabindex', '0');
        li.setAttribute('aria-selected', selectedCities.indexOf(city) !== -1 ? 'true' : 'false');
        if (selectedCities.indexOf(city) !== -1) li.classList.add('selected');
        if (q) {
          var idx = city.toLowerCase().indexOf(q);
          if (idx >= 0) {
            li.innerHTML = escapeHTML(city.slice(0, idx)) +
              '<mark>' + escapeHTML(city.slice(idx, idx + q.length)) + '</mark>' +
              escapeHTML(city.slice(idx + q.length));
          } else {
            li.textContent = city;
          }
        } else {
          li.textContent = city;
        }
        li.addEventListener('click', function () { toggleCity(city); });
        li.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCity(city); }
          if (e.key === 'ArrowDown') { e.preventDefault(); var n = li.nextElementSibling; if (n) n.focus(); }
          if (e.key === 'ArrowUp')   { e.preventDefault(); var p = li.previousElementSibling; if (p) p.focus(); else if (input) input.focus(); }
          if (e.key === 'Escape')    { closeList(); if (input) input.focus(); }
        });
        list.appendChild(li);
      });
    }

    function toggleCity(city) {
      var idx = selectedCities.indexOf(city);
      if (idx !== -1) selectedCities.splice(idx, 1);
      else selectedCities.push(city);
      renderList(input ? input.value : '');
      renderChips();
      if (input) input.focus();
    }

    function renderChips() {
      if (!chips) return;
      chips.innerHTML = '';
      selectedCities.forEach(function (city) {
        var chip = document.createElement('span');
        chip.className = 'tag-selected-chip';
        var lbl = document.createTextNode(city + ' ');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Remove ' + city);
        btn.textContent = '×';
        btn.addEventListener('click', function (e) { e.stopPropagation(); toggleCity(city); });
        chip.appendChild(lbl);
        chip.appendChild(btn);
        chips.appendChild(chip);
      });
    }

    function openList() {
      if (!list) return;
      list.removeAttribute('hidden');
      if (input) input.setAttribute('aria-expanded', 'true');
      if (toggle) toggle.classList.add('open');
    }

    function closeList() {
      if (!list) return;
      list.setAttribute('hidden', '');
      if (input) input.setAttribute('aria-expanded', 'false');
      if (toggle) toggle.classList.remove('open');
    }

    if (input) {
      input.addEventListener('input', function () { renderList(this.value); openList(); });
      input.addEventListener('focus', openList);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeList();
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          var first = list && list.querySelector('li:not(.tag-combo-empty)');
          if (first) first.focus();
        }
      });
    }
    if (toggle) {
      toggle.addEventListener('click', function () {
        if (list && list.hasAttribute('hidden')) { openList(); if (input) input.focus(); }
        else closeList();
      });
    }
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#planner-city-combo')) closeList();
    });

    renderList('');
  }

  /* ── Needs grid ──────────────────────────────────────────── */
  function buildNeedsGrid() {
    var grid = document.getElementById('planner-needs-grid');
    if (!grid) return;

    NEEDS.forEach(function (need) {
      var item = document.createElement('div');
      item.className = 'planner-need-item';
      item.innerHTML =
        '<label class="planner-need-label">' +
          '<input type="checkbox" class="planner-need-cb" value="' + need.id + '">' +
          '<span class="planner-need-icon"><i class="bi ' + need.icon + '" aria-hidden="true"></i></span>' +
          '<span class="planner-need-name">' + escapeHTML(need.label) + '</span>' +
        '</label>' +
        '<div class="planner-subs" id="subs-' + need.id + '" hidden>' +
          '<p class="planner-subs-hint">Which specifically? <span>(optional — leave blank for all)</span></p>' +
          '<div class="planner-subs-list">' +
            need.subs.map(function (sub) {
              return '<label class="planner-sub-label">' +
                '<input type="checkbox" class="planner-sub-cb" data-need="' + need.id + '" data-tags="' + sub.tags.join('|') + '">' +
                escapeHTML(sub.label) +
                '</label>';
            }).join('') +
          '</div>' +
        '</div>';

      grid.appendChild(item);

      var cb = item.querySelector('.planner-need-cb');
      var subsPanel = item.querySelector('.planner-subs');
      cb.addEventListener('change', function () {
        if (this.checked) {
          subsPanel.removeAttribute('hidden');
        } else {
          subsPanel.setAttribute('hidden', '');
          subsPanel.querySelectorAll('input[type=checkbox]').forEach(function (s) { s.checked = false; });
        }
      });
    });
  }

  /* ── Form wiring ─────────────────────────────────────────── */
  function wireForm() {
    var form = document.getElementById('planner-form');
    var clearBtn = document.getElementById('planner-clear-btn');

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        buildPlan();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (form) form.reset();
        // Clear city combobox
        selectedCities = [];
        var chips = document.getElementById('planner-city-chips');
        if (chips) chips.innerHTML = '';
        var cityInput = document.getElementById('planner-city-input');
        if (cityInput) cityInput.value = '';
        initCityCombo(allResources); // re-render city list
        document.querySelectorAll('.planner-subs').forEach(function (el) {
          el.setAttribute('hidden', '');
        });
        var output = document.getElementById('planner-output');
        if (output) {
          output.setAttribute('hidden', '');
          output.innerHTML = '';
        }
      });
    }
  }

  /* ── Build plan ──────────────────────────────────────────── */
  function buildPlan() {
    if (!allResources.length) return;

    var age   = (document.getElementById('planner-age') || {}).value || '';
    var cities = selectedCities.slice();

    // Collect selected needs
    var selections = [];
    document.querySelectorAll('.planner-need-cb:checked').forEach(function (cb) {
      var needId = cb.value;
      var need = NEEDS.find(function (n) { return n.id === needId; });
      if (!need) return;

      var subTags = [];
      document.querySelectorAll('.planner-sub-cb[data-need="' + needId + '"]:checked').forEach(function (sub) {
        var tags = (sub.getAttribute('data-tags') || '').split('|');
        tags.forEach(function (t) { if (t.trim()) subTags.push(t.trim().toLowerCase()); });
      });

      selections.push({ need: need, subTags: subTags });
    });

    if (!selections.length) {
      showValidationError();
      return;
    }

    var planSections = selections.map(function (sel) {
      return {
        need: sel.need,
        subTags: sel.subTags,
        resources: getResources(sel.need, sel.subTags, age, cities)
      };
    });

    // Safety/crisis needs always appear first
    planSections.sort(function (a, b) {
      var aFirst = SAFETY_NEEDS[a.need.id] ? 0 : 1;
      var bFirst = SAFETY_NEEDS[b.need.id] ? 0 : 1;
      return aFirst - bFirst;
    });

    renderOutput(planSections, age, cities);
  }

  /* ── Resource filtering ──────────────────────────────────── */
  function getResources(need, subTags, age, cities) {
    // Step 1: category match
    var results = allResources.filter(function (r) {
      var cats = r.categories || [r.category || ''];
      return need.categories.some(function (c) { return cats.indexOf(c) !== -1; });
    });

    // Step 2: filterTag (e.g., dental within health)
    if (need.filterTag) {
      var ft = need.filterTag.toLowerCase();
      results = results.filter(function (r) {
        var hay = (r.tags || []).join(' ').toLowerCase() + ' ' + (r.name || '').toLowerCase();
        return hay.indexOf(ft) !== -1;
      });
    }

    // Step 3: sub-tag filter — if specific subs chosen, try to narrow; fall back if 0
    if (subTags.length) {
      var narrowed = results.filter(function (r) {
        var hay = (r.tags || []).join(' ').toLowerCase() + ' ' +
          (r.name || '').toLowerCase() + ' ' +
          (r.description || '').toLowerCase() + ' ' +
          (r.eligibility || '').toLowerCase();
        return subTags.some(function (t) { return hay.indexOf(t) !== -1; });
      });
      if (narrowed.length > 0) results = narrowed;
    }

    // Step 4: location filter (OR across selected cities; always include statewide)
    if (cities.length > 0) {
      var byCity = results.filter(function (r) {
        var rCity = (r.city || '').toLowerCase();
        if (!rCity || rCity === 'statewide' || rCity === 'multiple locations' ||
            rCity === 'multiple' || rCity === 'n/a') return true;
        var tags = (r.tags || []).join(' ').toLowerCase();
        if (tags.indexOf('statewide') !== -1 || tags.indexOf('michigan') !== -1 ||
            tags.indexOf('national') !== -1) return true;
        return cities.some(function (c) { return r.city === c; });
      });
      if (byCity.length > 0) results = byCity;
    }

    // Step 5: age filter
    if (age) results = results.filter(function (r) { return matchesAge(r, age); });

    // Deduplicate by id
    var seen = {};
    results = results.filter(function (r) {
      if (seen[r.id]) return false;
      seen[r.id] = true;
      return true;
    });

    return results;
  }

  function matchesAge(r, age) {
    var tags = (r.tags || []).join(' ').toLowerCase();
    var elig = (r.eligibility || '').toLowerCase();

    var isYouthOnly = (tags.indexOf('youth') !== -1 && (
      elig.indexOf('under 18') !== -1 || elig.indexOf('ages 13') !== -1 ||
      elig.indexOf('ages 14') !== -1 || elig.indexOf('ages 16') !== -1 ||
      elig.indexOf('up to 17') !== -1
    ));
    var isSeniorOnly = tags.indexOf('senior') !== -1 &&
      (elig.indexOf('senior') !== -1 || elig.indexOf('55') !== -1 ||
       elig.indexOf('60') !== -1 || elig.indexOf('elderly') !== -1);
    var isAdultOnly18 = elig.indexOf('18 and older') !== -1 || elig.indexOf('18+') !== -1 ||
      elig.indexOf('must be 18') !== -1;

    if (age === 'teen')        return !isSeniorOnly && !isAdultOnly18;
    if (age === 'young-adult') return !isSeniorOnly;
    if (age === 'adult')       return !isSeniorOnly && !isYouthOnly;
    if (age === 'senior')      return true;
    return true;
  }

  /* ── Render output ───────────────────────────────────────── */
  function renderOutput(planSections, age, cities) {
    var output = document.getElementById('planner-output');
    if (!output) return;

    var AGE_LABELS = {
      teen: 'Teen (13–17)', 'young-adult': 'Young Adult (18–24)',
      adult: 'Adult (25–54)', senior: 'Senior (55+)'
    };
    var totalResources = planSections.reduce(function (s, sec) { return s + sec.resources.length; }, 0);
    var locationText = cities.length > 0 ? cities.join(', ') : 'Southeast Michigan';
    var ageText = age ? AGE_LABELS[age] : '';

    var contextLine = 'Here\'s what we found' +
      (ageText ? ' for ' + ageText : '') +
      ' in <strong>' + escapeHTML(locationText) + '</strong>';

    var html = '<div class="planner-plan">';
    html += '<div class="planner-plan-header">';
    html += '<div>';
    html += '<h3><i class="bi bi-map-fill" aria-hidden="true"></i> Your Resource Plan</h3>';
    html += '<p>' + contextLine + ': <strong>' + totalResources + ' resource' +
      (totalResources !== 1 ? 's' : '') + '</strong> across ' + planSections.length +
      ' need' + (planSections.length !== 1 ? 's' : '') + '</p>';
    html += '</div>';
    html += '<button type="button" class="btn btn-outline btn-sm" id="planner-print-btn">' +
      '<i class="bi bi-printer-fill" aria-hidden="true"></i> Print</button>';
    html += '</div>';

    planSections.forEach(function (sec, idx) {
      var need = sec.need;
      var resources = sec.resources;
      html += '<div class="planner-plan-section">';
      html += '<div class="planner-section-heading">';
      html += '<span class="planner-step-badge">Step ' + (idx + 1) + '</span>';
      html += '<h4><i class="bi ' + need.icon + '" aria-hidden="true"></i> ' + escapeHTML(need.label) + '</h4>';
      if (resources.length) {
        html += '<span class="planner-section-count">' + resources.length +
          ' resource' + (resources.length !== 1 ? 's' : '') + '</span>';
      }
      html += '</div>';

      if (resources.length === 0) {
        html += '<div class="planner-no-results">';
        html += '<i class="bi bi-info-circle" aria-hidden="true"></i>';
        html += '<p>No resources found for <strong>' + escapeHTML(need.label) + '</strong>' +
          (cities.length ? ' in ' + escapeHTML(cities.join(', ')) : '') + '. ';
        html += '<a href="category/' + need.categories[0] + '.html">Browse all ' +
          escapeHTML(need.label) + ' resources</a>.</p>';
        html += '</div>';
      } else {
        html += '<div class="planner-resource-list">';
        var shown = resources.slice(0, 6);
        shown.forEach(function (r) { html += renderCard(r); });
        html += '</div>';
        if (resources.length > 6) {
          html += '<p class="planner-see-more"><a href="category/' + need.categories[0] +
            '.html">See all ' + resources.length + ' ' + escapeHTML(need.label) +
            ' resources →</a></p>';
        }
      }
      html += '</div>';
    });

    html += '</div>';
    output.innerHTML = html;
    output.removeAttribute('hidden');
    output.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Wire print button after DOM insertion
    var printBtn = document.getElementById('planner-print-btn');
    if (printBtn) printBtn.addEventListener('click', printPlan);
  }

  /* ── Card renderer ───────────────────────────────────────── */
  function renderCard(r) {
    var phone   = sanitizePhone(r.phone);
    var domain  = domainOf(r.website);

    var html = '<div class="planner-resource-card">';
    html += '<div class="planner-rc-body">';
    html += '<div class="planner-rc-name">' + escapeHTML(r.name) + '</div>';

    // Location + hours + phone on one meta row
    html += '<div class="planner-rc-meta">';
    if (r.city) {
      html += '<span><i class="bi bi-geo-alt-fill" aria-hidden="true"></i> ' +
        escapeHTML(r.city) + (r.county ? ', ' + escapeHTML(r.county) + ' Co.' : '') + '</span>';
    }
    if (r.hours) {
      html += '<span><i class="bi bi-clock-fill" aria-hidden="true"></i> ' + escapeHTML(r.hours) + '</span>';
    }
    if (r.phone) {
      html += '<span><i class="bi bi-telephone-fill" aria-hidden="true"></i> ' + escapeHTML(r.phone) + '</span>';
    }
    html += '</div>';

    // Address
    if (r.address) {
      html += '<div class="planner-rc-detail">' +
        '<i class="bi bi-map" aria-hidden="true"></i> ' + escapeHTML(r.address) + '</div>';
    }

    // Website (full domain displayed)
    if (r.website && domain) {
      html += '<div class="planner-rc-detail">' +
        '<i class="bi bi-globe-americas" aria-hidden="true"></i> ' +
        '<a href="' + escapeHTML(r.website) + '" target="_blank" rel="noopener noreferrer">' +
        escapeHTML(domain) + '</a></div>';
    }

    // Eligibility
    if (r.eligibility) {
      html += '<div class="planner-rc-detail planner-rc-elig">' +
        '<i class="bi bi-person-check-fill" aria-hidden="true"></i> ' +
        escapeHTML(r.eligibility) + '</div>';
    }

    // Tags
    if (r.tags && r.tags.length) {
      html += '<div class="planner-rc-tags">';
      r.tags.forEach(function (t) {
        html += '<span class="planner-rc-tag">' + escapeHTML(t) + '</span>';
      });
      html += '</div>';
    }

    html += '</div>'; // .planner-rc-body

    // Action buttons (hidden in print)
    html += '<div class="planner-rc-actions">';
    if (r.phone) {
      html += '<a href="tel:' + phone + '" class="btn btn-primary btn-sm">' +
        '<i class="bi bi-telephone-fill" aria-hidden="true"></i> Call</a>';
    }
    if (r.website) {
      html += '<a href="' + escapeHTML(r.website) + '" target="_blank" rel="noopener noreferrer" ' +
        'class="btn btn-outline btn-sm">Website</a>';
    }
    html += '</div>';

    html += '</div>'; // .planner-resource-card
    return html;
  }

  /* ── Print plan (popup window, plan only) ────────────────── */
  function printPlan() {
    var output = document.getElementById('planner-output');
    if (!output || output.hasAttribute('hidden')) return;

    var win = window.open('', '_blank', 'width=820,height=700');
    if (!win) { window.print(); return; }

    var styles = [
      'body{font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#111;padding:24px;margin:0;line-height:1.45}',
      'a{color:#5b2c83}',
      'h3{color:#5b2c83;margin:0 0 3px;font-size:17px}',
      'h4{color:#5b2c83;margin:0;font-size:14px}',
      '.planner-plan-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #5b2c83;padding-bottom:10px;margin-bottom:18px}',
      '.planner-plan-header p{margin:2px 0 0;font-size:12px;color:#555}',
      '.planner-plan-header .btn,.planner-rc-actions{display:none!important}',
      '.planner-plan-section{margin-bottom:18px;page-break-inside:avoid}',
      '.planner-section-heading{display:flex;align-items:center;gap:8px;border-bottom:1px solid #ddd;padding-bottom:5px;margin-bottom:10px}',
      '.planner-step-badge{background:#5b2c83;color:#fff;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:700}',
      '.planner-section-count{margin-left:auto;font-size:11px;color:#888}',
      '.planner-resource-list{display:flex;flex-direction:column;gap:8px}',
      '.planner-resource-card{border:1px solid #ddd;border-radius:6px;padding:9px 13px;page-break-inside:avoid;display:block}',
      '.planner-rc-body{width:100%}',
      '.planner-rc-name{font-weight:700;font-size:13px;margin-bottom:4px}',
      '.planner-rc-meta{display:flex;flex-wrap:wrap;gap:10px;font-size:11px;color:#555;margin-bottom:3px}',
      '.planner-rc-detail{font-size:11px;color:#555;margin:2px 0}',
      '.planner-rc-detail a{color:#5b2c83;word-break:break-all}',
      '.planner-rc-elig{font-style:italic}',
      '.planner-rc-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}',
      '.planner-rc-tag{background:#f0ebf8;color:#5b2c83;border-radius:3px;padding:1px 6px;font-size:10px}',
      '.planner-no-results{font-size:12px;color:#666;font-style:italic;padding:4px 0}',
      '.planner-see-more{font-size:11px;margin-top:4px}',
      'i[class*="bi-"]{display:none}',
      '@media print{body{padding:12px}.planner-plan-section{page-break-inside:avoid}}',
    ].join('\n');

    win.document.open();
    win.document.write('<!DOCTYPE html><html lang="en"><head>');
    win.document.write('<meta charset="UTF-8">');
    win.document.write('<title>My Resource Plan – The Connect</title>');
    win.document.write('<style>' + styles + '</style>');
    win.document.write('</head><body>');
    win.document.write('<p style="font-size:11px;color:#888;border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:0">' +
      'The Connect – theconnect.org &nbsp;|&nbsp; Resource data is verified periodically — always call ahead to confirm.</p>');
    win.document.write(output.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(function () { win.print(); }, 400);
  }

  /* ── Validation nudge ────────────────────────────────────── */
  function showValidationError() {
    var grid = document.getElementById('planner-needs-grid');
    if (!grid) return;
    var existing = document.getElementById('planner-validation-msg');
    if (existing) return;
    var msg = document.createElement('p');
    msg.id = 'planner-validation-msg';
    msg.className = 'planner-validation-msg';
    msg.textContent = 'Please select at least one need above.';
    grid.parentNode.insertBefore(msg, grid.nextSibling);
    setTimeout(function () { if (msg.parentNode) msg.parentNode.removeChild(msg); }, 3500);
  }

})();
