/**
 * category.js – Category page logic
 * Reads ?cat=housing|food|health|legal|crisis from URL,
 * then loads and renders filtered resources for that category.
 */

(async function initCategoryPage() {
  const cat = getParam('cat') || 'housing';
  const meta = getCategoryMeta(cat);

  // ── Update page headings and colour accent ───────────────────────────────────
  const titleEl    = document.getElementById('cat-title');
  const descEl     = document.getElementById('cat-desc');
  const heroEl     = document.getElementById('page-hero');
  const breadcrumb = document.getElementById('breadcrumb-cat');
  const howToEl    = document.getElementById('how-to-access');

  if (titleEl) titleEl.textContent = `${meta.icon} ${meta.label} Resources`;
  if (heroEl)  heroEl.classList.add(`page-hero--${cat}`);
  if (breadcrumb) breadcrumb.textContent = meta.label;

  // Set page <title>
  document.title = `${meta.label} Resources – The Connect`;

  // Short page descriptions (hero subtitle)
  const descText = {
    housing: "Emergency shelter, transitional housing, and housing assistance programs in Wayne and Monroe counties.",
    food:    "Food pantries, distributions, and meal programs — most with no registration required.",
    health:  "Physical and mental health services, including crisis counseling and Medicaid-enrolled providers.",
    legal:   "Free and low-cost legal help for housing, benefits, immigration, and more.",
    crisis:  "Immediate crisis support — hotlines, emergency shelter, and same-day services.",
  };

  // Actionable "how to access" instructions (info box)
  const howToText = {
    housing: "Call ahead when possible. If you're in immediate need of shelter, walk-ins are accepted at most emergency shelters listed below. Bring ID if you have it, but lack of ID will not prevent emergency placement.",
    food:    "Food distributions often require no registration. Visit during listed hours and a staff member will assist you. Many locations accept all residents regardless of documentation.",
    health:  "Call to schedule an intake appointment. For mental health crises, walk-ins are accepted. Most providers accept Medicaid; sliding-scale fees are available if you are uninsured.",
    legal:   "Legal aid services are free for income-eligible individuals. Call or apply online. Bring documentation of your situation (lease, court notices, income proof) to your first appointment.",
    crisis:  "If you are in immediate danger, call 911. For emotional crisis or suicide risk, call or text 988. All services below are free and confidential.",
  };

  if (descEl) descEl.textContent = descText[cat] || `Browse ${meta.label} resources available in Wayne and Monroe counties.`;
  if (howToEl) howToEl.textContent = howToText[cat] || '';

  // ── Load and render ──────────────────────────────────────────────────────────
  const grid         = document.getElementById('resource-grid');
  const resultsCount = document.getElementById('results-count');
  const searchInput  = document.getElementById('search-input');

  if (!grid) return;

  grid.innerHTML = '<div class="loading"><div class="spinner" aria-label="Loading resources…"></div></div>';

  let allResources = [];
  try {
    allResources = await fetchJSON('data/resources.json');
  } catch (err) {
    grid.innerHTML = `<div class="alert alert--danger" role="alert">
      <span>⚠️</span>
      <div><strong>Could not load resources.</strong> Please refresh or try again later.</div>
    </div>`;
    return;
  }

  // Debounce helper
  function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  }

  function render() {
    const query = searchInput ? searchInput.value : '';
    const results = filterResources(allResources, query, { category: cat });

    if (resultsCount) {
      resultsCount.textContent = results.length === 1
        ? '1 resource found'
        : `${results.length} resources found`;
    }

    if (results.length === 0) {
      renderEmptyState(grid, `No ${meta.label} resources match your search.`);
      return;
    }

    grid.innerHTML = results.map(buildResourceCard).join('');
  }

  if (searchInput) searchInput.addEventListener('input', debounce(render, 200));

  render();
})();
