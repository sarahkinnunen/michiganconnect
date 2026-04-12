/**
 * smart-search.js
 * Natural-language situation routing for The Connect homepage.
 *
 * Matches a user's typed situation against keyword rules and surfaces
 * the most relevant category pages (and a crisis callout when needed).
 * Runs entirely client-side — no backend, no external API.
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* 1. Keyword → category mapping                                        */
  /* ------------------------------------------------------------------ */

  const CATEGORY_META = {
    crisis:            { label: 'Crisis Support',       icon: 'bi-telephone-fill',        href: 'category/crisis.html' },
    'domestic-violence':{ label: 'Domestic Violence',   icon: 'bi-shield-fill-exclamation',href: 'category/domestic-violence.html' },
    'human-trafficking':{ label: 'Human Trafficking',   icon: 'bi-exclamation-diamond-fill',href: 'category/human-trafficking.html' },
    food:              { label: 'Food',                 icon: 'bi-basket-fill',            href: 'category/food.html' },
    housing:           { label: 'Housing',              icon: 'bi-house-fill',             href: 'category/housing.html' },
    health:            { label: 'Health',               icon: 'bi-heart-pulse-fill',       href: 'category/health.html' },
    legal:             { label: 'Legal',                icon: 'bi-briefcase-fill',         href: 'category/legal.html' },
    employment:        { label: 'Employment',           icon: 'bi-person-workspace',       href: 'category/employment.html' },
    education:         { label: 'Education',            icon: 'bi-book-fill',              href: 'category/education.html' },
    immigration:       { label: 'Immigration',          icon: 'bi-globe-americas',         href: 'category/immigration.html' },
    rehabilitation:    { label: 'Rehab & Recovery',     icon: 'bi-bandaid-fill',           href: 'category/rehabilitation.html' },
    parenting:         { label: 'Parenting',            icon: 'bi-people-fill',            href: 'category/parenting.html' },
    clothing:          { label: 'Clothing',             icon: 'bi-bag-fill',               href: 'category/clothing.html' },
    hygiene:           { label: 'Hygiene',              icon: 'bi-droplet-fill',           href: 'category/hygiene.html' },
    transportation:    { label: 'Transportation',       icon: 'bi-bus-front-fill',         href: 'category/transportation.html' },
  };

  /**
   * Each rule: { patterns: [string|RegExp], categories: [string], weight: number }
   * Higher weight = ranked first. crisis rules carry weight 100 and always
   * add a visible hotline callout.
   *
   * Strategy: RegExp handles word-stem variations; plain strings handle common
   * natural-language phrases that people actually type.
   */
  const RULES = [
    // --- CRISIS / SELF-HARM ---
    {
      patterns: [
        /\b(suicid|kill\s*(my)?self|end\s+my\s+(own\s+)?life|take\s+my\s+(own\s+)?life|want\s+to\s+die|don.?t\s+want\s+to\s+(be\s+)?alive|harm(ing)?\s+my(self)?|hurt(ing)?\s+my(self)?|self[- ]?harm|no\s+reason\s+to\s+(keep\s+)?living|not\s+worth\s+(living|it))/i,
        'thinking about hurting myself', 'thinking about suicide', 'want to die',
        'no reason to live', 'going to kill myself', 'ending my life',
        "don't want to be here anymore", "i can't go on", "i give up",
        'thinking about ending it', 'thinking about harming myself',
        "i don't want to live", 'i want to disappear',
        "i can't take it anymore", 'feeling suicidal', 'overdose on purpose',
      ],
      categories: ['crisis'],
      weight: 100,
      hotline: { label: '988 Suicide & Crisis Lifeline', number: '988', href: 'tel:988' },
    },
    // --- SEXUAL ASSAULT ---
    {
      patterns: [
        /\b(sexual(ly)?\s+(assault|abus|harass)|rape[d]?|molest(ed|ing)?|someone\s+(touched|forced)\s+me\s+(sexually|without))/i,
        'sexually assaulted', 'sexual assault', 'raped', 'rape', 'molestation',
        'someone forced themselves on me', 'i was touched without my consent',
        'someone touched me', 'i was assaulted', 'non-consensual',
        'sexual abuse', 'sexual harassment', 'groped',
      ],
      categories: ['crisis', 'domestic-violence'],
      weight: 100,
      hotline: { label: 'RAINN Sexual Assault Hotline', number: '1-800-656-4673', href: 'tel:18006564673' },
    },
    // --- DOMESTIC VIOLENCE / ABUSE ---
    {
      patterns: [
        /\b(domestic\s+viol|abusive?\s+(partner|relationship|boyfriend|girlfriend|husband|wife|home|situation)|partner\s+(is\s+)?(abus|hit|hurt|chok|strangle|threaten|controll)|being\s+(abus|hit|hurt|beat|threaten)|he\s+(hit|hurt|beat|chok|threaten|abus|scream|yell|controll)|she\s+(hit|hurt|beat|chok|threaten|abus|scream|yell|controll)|my\s+(partner|boyfriend|girlfriend|husband|wife|ex)\s+(hit|hurt|beat|threaten|abus|controll|won.?t\s+let))/i,
        'domestic violence', 'being abused', 'he hit me', 'she hit me',
        'my partner hit me', 'my boyfriend hit me', 'my girlfriend hit me',
        'my husband hit me', 'my wife hit me', 'my ex hit me',
        'being hit', 'being beaten', 'abusive relationship', 'abusive partner',
        'scared of my partner', 'afraid of my partner', 'controlling relationship',
        'my partner controls me', 'he controls me', 'she controls me',
        "i'm being abused", "i'm in an abusive", 'someone hurts me',
        'someone is hurting me', 'not safe at home', 'unsafe at home',
        "my partner won't let me leave", 'being threatened',
        'he threatens me', 'she threatens me', 'i feel unsafe at home',
      ],
      categories: ['crisis', 'domestic-violence'],
      weight: 95,
      hotline: { label: 'National DV Hotline', number: '1-800-799-7233', href: 'tel:18007997233' },
    },
    // --- HUMAN TRAFFICKING ---
    {
      patterns: [
        /\b(traffic?k(ed|ing)?|being\s+exploit(ed)?|being\s+force[d]?\s+to\s+(work|sell|have\s+sex|do\s+things)|someone\s+(is\s+)?(control(ling)?|forcing|pimping|selling)\s+me|held\s+(against|captive)|can.?t\s+leave|not\s+allowed\s+to\s+leave)/i,
        'human trafficking', 'being trafficked', 'being forced to work',
        'being forced to sell', 'being exploited', 'sex trafficking',
        'labor trafficking', 'someone is controlling me', 'someone is forcing me',
        'someone is selling me', 'i am being sold', "i can't leave",
        'held against my will', 'not allowed to leave', 'working against my will',
      ],
      categories: ['crisis', 'human-trafficking'],
      weight: 98,
      hotline: { label: 'Human Trafficking Hotline', number: '1-888-373-7888', href: 'tel:18883737888' },
    },
    // --- FOOD ---
    {
      patterns: [
        /\b(no\s+food|run(ning)?\s+out\s+of\s+food|can.?t\s+(afford|buy|get)\s+food|hungry|hunger|starv(e|ing|ation)|food\s+(stamp|pantry|bank|insecur|assistance|help)|snap\b|don.?t\s+have\s+(any|enough)?\s*food|nothing\s+to\s+eat|haven.?t\s+eaten|can.?t\s+afford\s+groceries|low\s+on\s+food|out\s+of\s+food|skip(ping)?\s+(meals?|breakfast|lunch|dinner)|kids?\s+(are\s+)?hungry|baby\s+(is\s+)?hungry)/i,
        "don't have any food", "don't have food", 'no food', 'out of food',
        'running out of food', 'food stamps', 'need groceries',
        'can\'t afford groceries', 'food bank', 'food pantry', 'hungry',
        'starving', 'nothing to eat', "haven't eaten", "i'm hungry",
        'my kids are hungry', 'my children are hungry', 'we have no food',
        "we don't have food", 'need food assistance', 'need food help',
        'i lost my food stamps', 'snap benefits', 'apply for snap',
        'feeding my family', "can't feed my kids", "can't feed my family",
        'food insecure', 'not enough to eat',
      ],
      categories: ['food'],
      weight: 80,
    },
    // --- HOUSING ---
    {
      patterns: [
        /\b(homeless|homelessness|no\s+(place|where)\s+to\s+(stay|live|go|sleep)|evict(ed|ion)|can.?t\s+(afford|pay)\s+(rent|my\s+rent|housing|mortgage)|behind\s+on\s+rent|lost?\s+(my\s+)?(home|house|apartment|place|housing)|losing\s+(my\s+)?(home|house|apartment|place)|living\s+in\s+(my\s+car|a\s+car|my\s+truck|the\s+street|a\s+shelter|a\s+tent)|sleeping\s+(outside|in\s+my\s+car|on\s+the\s+street|rough)|need\s+(housing|a\s+place\s+to\s+(live|stay|sleep))|got\s+kicked\s+out|thrown\s+out|couch\s+surf|no\s+stable\s+housing|house\s+(fire|burned)|landlord|section\s*8)/i,
        'homeless', 'homelessness', 'no place to stay', 'nowhere to stay',
        'nowhere to go', 'evicted', "can't pay rent", 'behind on rent',
        'losing my home', 'lost my home', 'lost my house', 'lost my apartment',
        'i lost my house', 'i lost my home', 'i lost my apartment',
        'living in my car', 'sleeping in my car', 'sleeping outside',
        'need housing', 'need shelter', 'need a place to stay',
        'need a place to live', 'need a place to sleep',
        'kicked out', 'got kicked out', 'thrown out', 'got thrown out',
        'no stable housing', 'couch surfing', 'staying with friends',
        "can't afford rent", 'about to be evicted', 'facing eviction',
        'house burned down', 'lost my home to fire', 'landlord kicked me out',
        'section 8', 'apply for section 8', 'no roof over my head',
        "don't have a place to live", "don't have anywhere to live",
        "don't have a home", "don't have a house",
      ],
      categories: ['housing'],
      weight: 80,
    },
    // --- IMMIGRATION ---
    {
      patterns: [
        /\b(immigra(nt|tion|te)|undocumented|deport(ed|ation|ment)|asylum|daca|dreamer|visa\s+(expir|overstay|issue)|no\s+(legal\s+status|papers|documents?)|citizenship|naturalization|green\s+card|i-?9|work\s+(permit|authorization)|uscis|ice\s+(raid|arrest|detain)|detained\s+by\s+ice|refugee\s+status)/i,
        'immigration', 'undocumented', 'being deported', 'deportation',
        'facing deportation', 'asylum', 'asylum seeker', 'daca renewal',
        'daca', 'no papers', 'no documents', 'green card', 'citizenship',
        'naturalization', 'work permit', 'visa expired', 'overstayed visa',
        'ice detained', 'ice arrested', 'ice raid', 'refugee', 'dreamer',
        'i am undocumented', "i don't have papers", "i don't have status",
        'immigration court', 'immigration hearing', 'uscis',
      ],
      categories: ['immigration', 'legal'],
      weight: 75,
    },
    // --- LEGAL ---
    {
      patterns: [
        /\b(need\s+a\s+(law?yer|attorney)|attorney|court\s+(date|hearing|order|case)|arrested|criminal\s+record|expunge[d]?|restraining\s+order|protective\s+order|legal\s+(help|aid|advice|issue|problem|trouble)|sue\b|sued\b|lawsuit|plea\s+(deal|guilty|not)|charge[ds]?\b|probation|parole|ticket\s+(for|i\s+got)|fine\s+(for|i\s+got)|warrant|bail\b|public\s+defender|custody\s+(battle|case|hearing)|divorce|child\s+support)/i,
        'need a lawyer', 'need an attorney', 'arrested', 'got arrested',
        'going to court', 'have a court date', 'court hearing', 'criminal record',
        'restraining order', 'protective order', 'legal help', 'legal aid',
        'getting sued', 'filing a lawsuit', 'on probation', 'on parole',
        'got a ticket', 'have a fine', 'have a warrant', 'need bail',
        'public defender', 'custody battle', 'child custody', 'divorce',
        'child support', 'landlord tenant dispute', 'need legal advice',
      ],
      categories: ['legal'],
      weight: 70,
    },
    // --- EMPLOYMENT ---
    {
      patterns: [
        /\b(no\s+job|can.?t\s+find\s+(a\s+)?(job|work)|unemployed|unemployment(\s+benefits?)?|lost?\s+my\s+job|fired\b|laid\s+off|looking\s+for\s+(a\s+)?(job|work)|need\s+(a\s+)?(job|work|income)|job\s+train(ing)?|resume\b|career\s+(help|center|coach)|get\s+(back\s+to\s+work|a\s+job)|workforce|work\s+experience|entry[- ]level|interview\s+help|no\s+income|no\s+money\s+coming\s+in)/i,
        'no job', "can't find work", "can't find a job", 'unemployed',
        'unemployment', 'lost my job', 'i lost my job', 'i got fired',
        'i was fired', 'laid off', 'i was laid off', 'looking for a job',
        'looking for work', 'need a job', 'need work', 'need income',
        'no income', 'no money', 'job training', 'help with resume',
        'resume help', 'job search', 'need employment',
        "i don't have a job", "i don't have income",
      ],
      categories: ['employment'],
      weight: 70,
    },
    // --- EDUCATION ---
    {
      patterns: [
        /\b(ged\b|high\s+school\s+diploma|drop(ped)?\s+out|dropped?\s+out|go(ing)?\s+back\s+to\s+school|adult\s+(ed|education)|community\s+college|enroll(ment)?|tutoring|literacy|can.?t\s+read|learning\s+disabilit|finish\s+(school|my\s+degree|my\s+diploma)|get\s+my\s+(ged|diploma|degree)|basic\s+skills|english\s+(class|lesson|course|as\s+a\s+second)|esl\b)/i,
        'ged', 'high school diploma', 'dropped out', 'i dropped out',
        'go back to school', 'going back to school', 'adult education',
        'adult ed', 'community college', 'need tutoring', "can't read",
        'finish my degree', 'get my diploma', 'get my ged',
        'english class', 'esl class', 'learning to read',
        "i didn't finish high school", "i don't have my diploma",
        'need help with school',
      ],
      categories: ['education'],
      weight: 65,
    },
    // --- SUBSTANCE / ADDICTION ---
    {
      patterns: [
        /\b(addict(ed|ion)?|drug(s|\s+use|\s+problem|\s+addict)?|alcohol(ism|\s+problem|\s+addict)?|substance\s+(use|abuse|disorder|problem)|sobriety|in\s+recovery|rehab(ilitation)?|detox(ification)?|overdos(e|ed|ing)?|narcotics|opi(oid|ate)|fentanyl|meth\b|heroin|cocaine|crack\b|drink(ing)?\s+too\s+much|can.?t\s+stop\s+(drinking|using|doing)|struggling\s+with\s+(drugs?|alcohol|addiction|substance)|relapse[d]?)/i,
        'addiction', 'drug problem', 'alcohol problem', 'substance abuse',
        'want to get sober', 'trying to get sober', 'in recovery',
        'relapsed', 'relapse', 'detox', 'need rehab', 'going to rehab',
        'struggling with drugs', 'struggling with alcohol', 'overdose',
        "i overdosed", 'someone overdosed', 'drinking too much',
        "i can't stop drinking", "i can't stop using",
        'addicted to drugs', 'addicted to alcohol', 'drug addiction',
        'alcohol addiction', 'fentanyl', 'opioid', 'heroin',
      ],
      categories: ['rehabilitation', 'health'],
      weight: 75,
    },
    // --- MENTAL HEALTH ---
    {
      patterns: [
        /\b(mental\s+health|anxiet(y|ies)?|depress(ed|ion|ing)?|panic\s+attack|ptsd|trauma(tized)?|bipolar|schizophren|psychi(atric|atrist|atry)|therapist|counseling|counselor|feeling\s+(really\s+)?(sad|alone|hopeless|lost|overwhelmed|empty|numb|broken)|can.?t\s+(cope|function|get\s+out\s+of\s+bed)|emotionally?\s+(struggling|broken|lost)|mental\s+breakdown|nervous\s+breakdown)/i,
        'mental health', 'anxiety', 'anxious', 'depression', 'depressed',
        'panic attacks', 'need a therapist', 'need counseling', 'need therapy',
        'feeling hopeless', 'feeling alone', 'feeling lost', 'mental illness',
        'really struggling', "i'm struggling", "i'm not okay", "i'm not doing okay",
        "i'm falling apart", 'feeling overwhelmed', "can't cope",
        "can't get out of bed", 'feeling empty', 'feeling numb',
        "i feel broken", "i feel lost", 'emotional support', 'mental breakdown',
        "i don't feel okay", "i'm having a breakdown",
        "i'm really struggling mentally",
      ],
      categories: ['health', 'crisis'],
      weight: 72,
    },
    // --- PARENTING / CHILDREN ---
    {
      patterns: [
        /\b(pregnant|pregnancy|baby|infant|newborn|toddler|childcare|child\s+care|parenting|single\s+(mom|dad|mother|father|parent)|wic\b|kids?\s+(need|are?\s+(hungry|sick|homeless)|don.?t\s+have)|raising\s+(kids?|children|a\s+child)|teen\s+(parent|mom|dad)|young\s+parent|new\s+(parent|mom|dad)|my\s+child(ren)?\s+(need|is|are)|my\s+kid\s+(need|is|are)|formula\b|diapers?\b)/i,
        'pregnant', "i'm pregnant", 'having a baby', 'just had a baby',
        'new baby', 'childcare', 'need childcare', 'single mom', 'single dad',
        'single parent', 'parenting help', 'teen parent', 'wic',
        'need wic', 'apply for wic', 'diapers', 'need diapers', 'baby formula',
        'formula', 'my kids need help', 'my children need help',
        "i don't know how to parent", 'parenting resources',
        'help with my kids', 'help with my children',
      ],
      categories: ['parenting', 'health'],
      weight: 65,
    },
    // --- PHYSICAL HEALTH ---
    {
      patterns: [
        /\b(no\s+(health\s+)?insurance|can.?t\s+(afford\s+)?(doct(or|or.?s)|medic(ine|ation|al)|prescri|hospital|dent(ist|al))|sick\b|ill(ness)?|hospital(ized)?|prescription\b|medicaid|medicare|clinic\b|dental\b|vision\s+(care|insurance)|need\s+(medical|a\s+doctor|dental|vision)\s+(help|care|attention)|medical\s+(bill|debt|cost)|can.?t\s+afford\s+(health|medical|dental))/i,
        'no insurance', "can't afford the doctor", 'no health insurance',
        'need a doctor', 'need medical help', 'i am sick', "i'm sick",
        'need medication', 'can\'t afford medication', 'medicaid', 'medicare',
        'clinic', 'need dental', 'need vision care', 'medical bills',
        "i don't have insurance", "i don't have health insurance",
        'uninsured', 'need a prescription', "can't afford prescriptions",
        'need urgent care', 'need medical care', 'health care',
      ],
      categories: ['health'],
      weight: 65,
    },
    // --- CLOTHING ---
    {
      patterns: [
        /\b(no\s+clothes|don.?t\s+have\s+(any\s+)?(clothes|clothing|shoes?|jacket|coat|socks)|need\s+(clothes|clothing|a\s+coat|a\s+jacket|shoes?|winter\s+gear|warm\s+clothes)|clothes?\s+for\s+(work|school|interview|kids?|children|winter|cold)|winter\s+coat|coat\b|jacket\b|shoes?\b|clothing\s+(bank|closet|drive|donation)|can.?t\s+afford\s+clothes|nothing\s+to\s+wear|don.?t\s+have\s+anything\s+to\s+wear|my\s+clothes\s+(don.?t\s+fit|are\s+(too\s+(small|big|old)|worn\s+out|falling\s+apart))|kids?\s+(don.?t|need)\s+(have\s+)?(clothes|shoes))/i,
        'no clothes', 'need clothes', 'need clothing',
        "don't have any clothes", "i don't have any clothes",
        "don't have clothes", "i don't have clothes",
        "don't have anything to wear", "nothing to wear",
        'need a coat', 'need a jacket', 'need shoes', 'need warm clothes',
        'need winter clothes', 'clothing bank', 'clothing closet',
        'clothes for work', 'clothes for an interview', 'interview clothes',
        'clothes for my kids', 'my kids need clothes', 'my kids need shoes',
        "can't afford clothes", 'clothes donation',
      ],
      categories: ['clothing'],
      weight: 55,
    },
    // --- HYGIENE ---
    {
      patterns: [
        /\b(hygiene|no\s+(shower|bath|bathroom\s+access)|can.?t\s+(shower|bathe|wash)|laundry\b|no\s+(soap|shampoo|deodorant|toothbrush|toothpaste)|feminine\s+hygiene|menstrual\s+(product|pad|tampon)|personal\s+care\s+item|need\s+(soap|shampoo|deodorant|toothbrush|toothpaste|hygiene\s+products|toiletries?)|dirty\s+clothes|no\s+clean\s+clothes|can.?t\s+(do\s+)laundry)/i,
        'no shower', 'need to shower', "can't shower", "don't have a shower",
        'need to do laundry', "can't do laundry", 'laundry',
        'hygiene products', 'personal hygiene', 'feminine products',
        'need toiletries', 'no soap', 'no shampoo', 'no deodorant',
        'no toothbrush', 'need hygiene products', 'hygiene items',
        'menstrual products', 'period products', 'no clean clothes',
        "i can't bathe", "i don't have hygiene products",
      ],
      categories: ['hygiene'],
      weight: 50,
    },
    // --- TRANSPORTATION ---
    {
      patterns: [
        /\b(no\s+(car|vehicle|ride|bus\s+pass|transportation)|don.?t\s+have\s+(a\s+)?(car|vehicle|ride|transportation)|can.?t\s+(get\s+to|afford\s+)?\s*(work|school|appointment|hospital|doctor|interview)|need\s+(a\s+)?(ride|transportation|bus\s+pass|car)|ddot\b|smart\s+bus|bus\s+(fare|route|pass|ticket)|uber\b|lyft\b|no\s+way\s+to\s+get\s+(to|around)|can.?t\s+afford\s+(gas|a\s+ride|bus\s+fare)|stranded\b)/i,
        'no car', "don't have a car", 'no ride', "don't have a ride",
        'need transportation', 'need a ride', 'need a car',
        'bus pass', 'need a bus pass', "can't get to work", "can't get to school",
        "can't get to my appointment", "can't afford gas",
        'no way to get around', 'stranded', 'no transportation',
        "i don't have transportation", "i don't have a car",
        "i can't get around", 'public transportation', 'ddot', 'smart bus',
        'bus fare', 'need bus money', 'getting to work',
      ],
      categories: ['transportation'],
      weight: 50,
    },
  ];

  /* ------------------------------------------------------------------ */
  /* 2. Matching logic                                                    */
  /* ------------------------------------------------------------------ */

  function matchSituation(rawText) {
    const text = rawText.trim().toLowerCase();
    if (!text) return null;

    const categoryScores = {};  // slug → highest weight seen
    let hotline = null;
    let isCrisis = false;

    for (const rule of RULES) {
      let matched = false;

      for (const pat of rule.patterns) {
        if (pat instanceof RegExp) {
          if (pat.test(text)) { matched = true; break; }
        } else {
          if (text.includes(pat.toLowerCase())) { matched = true; break; }
        }
      }

      if (matched) {
        for (const cat of rule.categories) {
          categoryScores[cat] = Math.max(categoryScores[cat] || 0, rule.weight);
        }
        if (rule.hotline && (!hotline || rule.weight > (hotline._weight || 0))) {
          hotline = Object.assign({}, rule.hotline, { _weight: rule.weight });
        }
        if (rule.categories.includes('crisis')) isCrisis = true;
      }
    }

    const sortedCats = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)                          // show at most 3 category tiles
      .map(([slug]) => ({ slug, ...CATEGORY_META[slug] }));

    if (sortedCats.length === 0) return null;

    return { categories: sortedCats, hotline, isCrisis };
  }

  /* ------------------------------------------------------------------ */
  /* 3. Render results                                                    */
  /* ------------------------------------------------------------------ */

  function renderResults(result, container) {
    container.innerHTML = '';

    if (!result) {
      container.innerHTML =
        '<p class="smart-no-match">We couldn\'t identify a specific category from that, please try to rephrase, browse the tiles above, or <a href="find-help.html">search all resources</a>.</p>';
      container.hidden = false;
      return;
    }

    let html = '';

    // Crisis hotline callout (always first when present)
    if (result.hotline) {
      html += `
        <div class="smart-crisis-callout" role="alert">
          <strong><i class="bi bi-telephone-fill" aria-hidden="true"></i> Get help now:</strong>
          <a href="${escAttr(result.hotline.href)}" class="smart-crisis-link">
            ${escHtml(result.hotline.label)}: <strong>${escHtml(result.hotline.number)}</strong>
          </a>
          <span class="smart-crisis-note">Free, confidential, available 24/7</span>
        </div>`;
    }

    // Suggested category tiles
    html += '<p class="smart-results-label">Based on what you shared, these resources may help:</p>';
    html += '<div class="smart-tiles">';
    for (const cat of result.categories) {
      html += `
        <a href="${escAttr(cat.href)}" class="smart-tile">
          <span class="smart-tile-icon" aria-hidden="true"><i class="bi ${escAttr(cat.icon)}"></i></span>
          <span>${escHtml(cat.label)}</span>
        </a>`;
    }
    html += '</div>';
    html += '<p class="smart-browse-more">Not what you need? <a href="find-help.html">Browse all resources</a>.</p>';

    container.innerHTML = html;
    container.hidden = false;
    container.focus();
  }

  /* ------------------------------------------------------------------ */
  /* 4. Sanitization helpers                                              */
  /* ------------------------------------------------------------------ */

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(str) {
    // Only allow safe internal relative href or tel: values; strip anything else.
    const s = String(str).trim();
    if (/^(tel:|category\/|find-help)/.test(s)) return escHtml(s);
    return '#';
  }

  /* ------------------------------------------------------------------ */
  /* 5. Wire up the UI                                                    */
  /* ------------------------------------------------------------------ */

  function init() {
    const form      = document.getElementById('smart-search-form');
    const input     = document.getElementById('smart-search-input');
    const results   = document.getElementById('smart-search-results');
    const clearBtn  = document.getElementById('smart-search-clear');

    if (!form || !input || !results) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const val = input.value;
      if (!val.trim()) return;
      const result = matchSituation(val);
      renderResults(result, results);
      if (clearBtn) clearBtn.hidden = false;
    });

    // Live hint: debounced suggestion after user pauses typing
    let debounceTimer;
    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      const val = input.value;
      if (!val.trim()) {
        results.hidden = true;
        results.innerHTML = '';
        if (clearBtn) clearBtn.hidden = true;
        return;
      }
      debounceTimer = setTimeout(function () {
        const result = matchSituation(val);
        if (result) {
          renderResults(result, results);
          if (clearBtn) clearBtn.hidden = false;
        }
      }, 600);
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        input.value = '';
        results.hidden = true;
        results.innerHTML = '';
        clearBtn.hidden = true;
        input.focus();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
