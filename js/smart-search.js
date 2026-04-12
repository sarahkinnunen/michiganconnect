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
   * Higher weight = ranked first. Crisis rules carry weight 100 and always
   * add a visible hotline callout.
   *
   * Strategy: Each rule has one broad RegExp covering stems/variations, plus
   * an extensive list of plain strings covering the natural-language phrases
   * people actually type — including shorthand, slang, typos, and emotional
   * framings. The engine lower-cases input before matching, so all string
   * patterns are also effectively case-insensitive.
   */
  const RULES = [

    // ================================================================
    // CRISIS & SELF-HARM
    // ================================================================
    {
      patterns: [
        /\b(suicid(al|e)?|kill\s*(my)?self|end\s+my\s+(own\s+)?life|take\s+my\s+(own\s+)?life|want(ing)?\s+to\s+die|don.?t\s+want\s+to\s+(be\s+)?alive|harm(ing)?\s+my(self)?|hurt(ing)?\s+my(self)?|self[- ]?harm(ing)?|no\s+reason\s+to\s+(keep\s+)?living|not\s+worth\s+(living|it)|ready\s+to\s+give\s+up\s+on\s+life|wish\s+i\s+(was|were)\s+dead|wish\s+i\s+wasn.?t\s+(here|alive|born)|planning\s+to\s+(kill|hurt|harm)\s+my(self)?|can.?t\s+do\s+this\s+anymore|don.?t\s+see\s+(a\s+|the\s+)?point)/i,
        'want to die', 'i want to die', 'i want to kill myself',
        'thinking about suicide', 'thinking about killing myself',
        'thinking about ending my life', 'thinking about harming myself',
        'thinking about hurting myself', 'going to kill myself',
        'going to end my life', 'ending my life', 'no reason to live',
        'no reason to keep living', 'no point in living',
        "i give up", "i can't go on", "i can't do this anymore",
        "i can't take it anymore", "i've had enough",
        "i don't want to be here anymore", "i don't want to be here",
        "i don't want to live", "i don't want to exist",
        'i want to disappear', 'i want to vanish',
        'i wish i was dead', 'i wish i were dead',
        "i wish i wasn't born", "i wish i was never born",
        'feeling suicidal', "i'm suicidal", 'suicidal thoughts',
        'suicidal ideation', 'thinking about overdosing',
        'plan to hurt myself', 'planning to hurt myself',
        'going to hurt myself', 'might hurt myself',
        'self harm', 'self-harm', 'cutting myself', "i've been cutting",
        'i hurt myself on purpose', 'hurting myself',
        'overdose on purpose', 'intentional overdose',
        "it'll be over soon", 'nobody would miss me',
        'everyone would be better without me',
        "i'm a burden", "i'm too much of a burden",
        "there's no way out", "i see no way out",
        "there's no hope", "i have no hope", "i've lost all hope",
        'completely hopeless', "i don't see the point",
        "what's the point of anything", "what's the point",
        'done with life', 'done living', 'tired of living',
        'tired of being alive', "i just can't anymore",
        'nobody cares about me', 'nobody cares', 'i feel worthless',
        'i hate myself', 'i want to hurt myself', 'please help me',
        "i'm in danger",
      ],
      categories: ['crisis'],
      weight: 100,
      hotline: { label: '988 Suicide & Crisis Lifeline', number: '988', href: 'tel:988' },
    },

    // ================================================================
    // SEXUAL ASSAULT
    // ================================================================
    {
      patterns: [
        /\b(sexual(ly)?\s+(assault(ed)?|abus(ed|e)|harass(ed|ment)?)|rape[d]?|raping|molest(ed|ing|ation)?|touched\s+(me\s+)?(inappropriately|without\s+my\s+consent)|forced\s+(me\s+)?(to\s+have\s+sex|into\s+sex)|non[- ]consensual|date\s+rape|coerced\s+(into\s+sex|sexually)|unwanted\s+(sexual|touching|advance))/i,
        'sexually assaulted', 'sexual assault', 'i was sexually assaulted',
        'raped', 'rape', 'i was raped', 'someone raped me',
        'molestation', 'i was molested', 'sexual abuse', 'sexually abused',
        'sexual harassment', 'sexually harassed',
        'someone forced themselves on me', 'i was forced to have sex',
        'i was touched without my consent', 'touched me inappropriately',
        'someone touched me without consent', 'i was assaulted',
        'non-consensual', 'nonconsensual', 'groped', 'i was groped',
        'date rape', 'someone drugged me', 'i was drugged',
        'coerced into sex', 'pressured into sex', 'forced into sex',
        'unwanted touching', 'unwanted sexual contact',
        'someone took advantage of me', 'took advantage of me sexually',
        'violated', 'i feel violated', 'they forced me to',
        'my ex forced me', 'i was violated',
      ],
      categories: ['crisis', 'domestic-violence'],
      weight: 100,
      hotline: { label: 'RAINN Sexual Assault Hotline', number: '1-800-656-4673', href: 'tel:18006564673' },
    },

    // ================================================================
    // DOMESTIC VIOLENCE & INTIMATE PARTNER ABUSE
    // ================================================================
    {
      patterns: [
        /\b(domestic\s+viol(ence)?|intimate\s+partner\s+(viol|abus)|abusive?\s+(partner|relationship|boyfriend|girlfriend|husband|wife|home|household|situation)|partner\s+(is\s+)?(abus|hit|hurt|chok|strangle|threaten|controll|stalk|isolat)|being\s+(abus(ed)?|hit|hurt|beaten?|threaten(ed)?|stalk(ed)?|isolat(ed)?|control(led)?)|he\s+(hit|hurt|beats?|chok|strangle|threaten|abus|scream|yell|controll|stalk)|she\s+(hit|hurt|beats?|chok|strangle|threaten|abus|scream|yell|controll|stalk)|my\s+(partner|boyfriend|girlfriend|husband|wife|ex|baby.?s?\s*dad|baby.?s?\s*mom)\s+(hit|hurt|beats?|threaten|abus|controll|won.?t\s+let|wont\s+let|is\s+hurting)|cycle\s+of\s+abus|toxic\s+relationship)/i,
        'domestic violence', 'domestic abuse', 'i am being abused',
        "i'm being abused", 'being abused', 'he hit me', 'she hit me',
        'my partner hit me', 'my boyfriend hit me', 'my girlfriend hit me',
        'my husband hit me', 'my wife hit me', 'my ex hit me',
        'my baby daddy hit me', 'my baby mama hit me',
        'being hit', 'being beaten', 'getting beaten up',
        'abusive relationship', 'abusive partner', 'abusive boyfriend',
        'abusive girlfriend', 'abusive husband', 'abusive wife',
        'toxic relationship', 'unhealthy relationship',
        'scared of my partner', 'afraid of my partner',
        'scared of my boyfriend', 'scared of my girlfriend',
        'scared of my husband', 'scared of my wife', 'scared of my ex',
        'afraid to go home', 'scared to go home',
        'controlling relationship', 'controlling partner',
        'my partner controls me', 'he controls me', 'she controls me',
        "my partner won't let me leave", "my boyfriend won't let me leave",
        "my husband won't let me leave",
        "i'm in an abusive", 'someone hurts me',
        'someone is hurting me', 'not safe at home', 'unsafe at home',
        'i feel unsafe at home', 'being threatened', 'he threatens me',
        'she threatens me', 'my partner threatens me',
        'he chokes me', 'she chokes me', 'being choked',
        'he stalks me', 'she stalks me', 'being stalked',
        'he isolates me', 'she isolates me', 'being isolated',
        "can't see my friends", "can't see my family",
        'not allowed to see friends', 'not allowed to see family',
        'emotional abuse', 'emotionally abused', 'verbal abuse',
        'verbally abused', 'gaslighting', 'being gaslit',
        'walking on eggshells', 'he has a gun', 'she has a gun',
        'i have bruises', 'they throw things at me',
        'my kids are witnessing abuse',
      ],
      categories: ['crisis', 'domestic-violence'],
      weight: 95,
      hotline: { label: 'National DV Hotline', number: '1-800-799-7233', href: 'tel:18007997233' },
    },

    // ================================================================
    // HUMAN TRAFFICKING
    // ================================================================
    {
      patterns: [
        /\b(human\s+traffic?k(ing|ed)?|sex\s+traffic?k(ing|ed)?|labor\s+traffic?k(ing|ed)?|being\s+traffic?k(ed)?|being\s+exploit(ed)?|being\s+sold|being\s+pimped|someone\s+(is\s+|has\s+)?(sell(ing)?|pimp(ing)?|traffic?k(ing)?)\s+me|being\s+force[d]?\s+to\s+(work|sell|have\s+sex|do\s+things|perform)|someone\s+(is\s+)?(control(ling)?|forcing|hold(ing)?)\s+me|held\s+(against\s+my\s+will|captive|hostage)|can.?t\s+leave\s+(this\s+(place|house|situation)|them?|him|her)|not\s+allowed\s+to\s+leave|my\s+(passport|documents?|id)\s+(was\s+)?(taken|stolen|kept|confiscated)|debt\s+bondage)/i,
        'human trafficking', 'being trafficked', 'i am being trafficked',
        "i'm being trafficked", 'i was trafficked', 'trafficking victim',
        'trafficking survivor', 'sex trafficking', 'labor trafficking',
        'being sold', 'someone is selling me', 'i am being sold',
        'being pimped', 'someone is pimping me', 'being prostituted',
        'forced into prostitution', 'forced to have sex for money',
        'being forced to work', 'forced labor', 'being forced to sell',
        'forced to sell my body', 'sold for sex',
        'someone is controlling me', 'someone is forcing me',
        "i can't leave", "i'm not allowed to leave",
        'held against my will', 'being held captive', 'being held hostage',
        'not allowed to leave', 'working against my will',
        "can't go where i want", "can't talk to anyone",
        'my passport was taken', 'they took my passport',
        'they took my id', 'my documents were taken',
        'my id was confiscated', 'debt bondage',
        'working to pay off debt', 'working to pay back debt',
        'owe money to someone', "i can't leave until i pay",
        'my boyfriend makes me sell', 'i owe a debt',
        'someone took my id', 'they took my phone',
        'locked in a house', 'commercial sex',
      ],
      categories: ['crisis', 'human-trafficking'],
      weight: 98,
      hotline: { label: 'Human Trafficking Hotline', number: '1-888-373-7888', href: 'tel:18883737888' },
    },

    // ================================================================
    // FOOD & NUTRITION
    // ================================================================
    {
      patterns: [
        /\b(no\s+food|out\s+of\s+food|run(ning)?\s+out\s+of\s+food|can.?t\s+(afford|buy|get|access)\s+(food|groceries|meals?|anything\s+to\s+eat)|hungry|hunger|starv(e|ed|ing|ation)|food\s+(stamp|pantry|bank|shelf|insecur|assistance|help|desert|access)|snap\b|ebt\b|wic\b|don.?t\s+have\s+(any|enough)?\s*food|nothing\s+to\s+eat|haven.?t\s+(eaten|had\s+(food|a\s+meal))|skip(ping)?\s+(meals?|breakfast|lunch|dinner)|low\s+on\s+food|going\s+to\s+bed\s+hungry|fridge\s+(is\s+)?(empty|bare)|out\s+of\s+groceries|can.?t\s+feed\s+(my(self)?|my\s+(kids?|children|family|baby))|kids?\s+(are\s+)?(hungry|going\s+to\s+bed\s+hungry|haven.?t\s+eaten)|baby\s+(is\s+)?hungry|formula\s+ran\s+out|ran\s+out\s+of\s+formula|no\s+money\s+for\s+(food|groceries)|free\s+(meals?|lunch|food))/i,
        "don't have any food", "i don't have any food", "don't have food",
        "i don't have food", 'no food', 'out of food', 'we have no food',
        "we don't have food", 'running out of food', 'almost out of food',
        'nothing left to eat', 'nothing in the fridge',
        'fridge is empty', 'my fridge is empty', 'empty fridge',
        'empty pantry', 'bare fridge', 'no groceries',
        "i'm hungry", 'hungry', 'starving', "i'm starving",
        'my kids are hungry', 'my children are hungry',
        'my baby is hungry', 'kids are going to bed hungry',
        'we went to bed hungry', "haven't eaten", "i haven't eaten",
        "i haven't eaten today", "haven't eaten all day",
        "haven't eaten in days", 'skipping meals', 'skipping lunch',
        'going without food', 'going hungry',
        'food stamps', 'need food stamps', 'apply for food stamps',
        'lost my food stamps', 'lost my snap', 'snap benefits',
        'apply for snap', 'snap card', 'ebt card', 'ebt benefits',
        'need ebt', 'food assistance', 'need food assistance',
        'need food help', 'food bank', 'food pantry',
        'need the food bank', 'free food', 'free meals',
        'free lunch', 'soup kitchen', 'meal program',
        'need groceries', "can't afford groceries",
        "can't afford food", "can't buy food",
        "can't feed my kids", "can't feed my children",
        "can't feed my family", "can't feed myself",
        'feeding my family', 'struggle to feed', 'food insecure',
        'food insecurity', 'not enough to eat', 'not enough food',
        'baby formula', 'ran out of formula', 'no formula',
        "can't afford formula", 'wic formula',
        "kids haven't eaten today",
      ],
      categories: ['food'],
      weight: 80,
    },

    // ================================================================
    // HOUSING & SHELTER
    // ================================================================
    {
      patterns: [
        /\b(homeless(ness)?|houseless|unhoused|no\s+(place|where|home|house|roof)\s+to\s+(stay|live|go|sleep|call\s+home)|evict(ed|ion|ment)?|facing\s+eviction|about\s+to\s+be\s+evicted|can.?t\s+(afford|pay|make)\s+(rent|my\s+rent|housing|the\s+rent|mortgage)|behind\s+on\s+rent|past\s+due\s+on\s+rent|lost?\s+(my\s+)?(home|house|apartment|place|housing|condo|unit)|losing\s+(my\s+)?(home|house|apartment|place)|living\s+in\s+(my\s+car|a\s+car|the\s+street|streets|a\s+shelter|a\s+tent|a\s+motel)|sleeping\s+(outside|in\s+my\s+car|on\s+the\s+street|rough|at\s+a\s+shelter)|need\s+(housing|emergency\s+housing|emergency\s+shelter|a\s+shelter|a\s+place\s+to\s+(live|stay|sleep))|got\s+kicked\s+out|thrown\s+out|kicked\s+out|couch\s+surf(ing)?|no\s+stable\s+housing|house\s+(fire|burned\s+down|flooded)|section\s*8|public\s+housing|housing\s+(voucher|subsidy|assistance|authority)|utility\s+(shutoff|disconnect|bill)|lights?\s+(got\s+)?(shut\s+off|turned\s+off|cut\s+off)|gas\s+(got\s+)?(shut\s+off|turned\s+off)|water\s+(shut\s+off|turned\s+off)|no\s+(electricity|power|heat|hot\s+water|running\s+water))/i,
        'homeless', 'homelessness', 'houseless', 'unhoused',
        'i am homeless', "i'm homeless", 'we are homeless', "we're homeless",
        'no place to stay', 'nowhere to stay', 'no place to live',
        'nowhere to live', 'nowhere to go', 'have nowhere to go',
        'no roof over my head', 'no home',
        "don't have a place to live", "don't have anywhere to live",
        "don't have a home", "don't have a house",
        "i don't have a home", "i don't have a place to stay",
        'evicted', 'got evicted', 'being evicted', 'facing eviction',
        'about to be evicted', 'eviction notice',
        'received an eviction notice', 'i got an eviction notice',
        'fighting eviction', 'landlord is evicting me',
        "can't pay rent", "can't make rent", "can't afford rent",
        'behind on rent', 'overdue on rent', 'past due rent',
        'owe back rent', 'owe rent', 'rental assistance',
        'need help with rent', 'help paying rent',
        "can't pay my mortgage", 'behind on mortgage',
        'facing foreclosure', 'foreclosure',
        'losing my home', 'lost my home', 'lost my house',
        'lost my apartment', 'i lost my house', 'i lost my home',
        'i lost my apartment', 'lost my place',
        'house burned down', 'lost my home to fire',
        'living in my car', 'sleeping in my car',
        'sleeping outside', 'sleeping on the street',
        'sleeping at a shelter', 'staying at a shelter',
        'living at a shelter', 'staying in a hotel', 'living in a motel',
        "staying on someone's couch", 'couch surfing', 'couch-surfing',
        'bouncing around', 'staying with friends', 'staying with family',
        'no stable housing', 'unstable housing',
        'kicked out', 'got kicked out', 'thrown out', 'got thrown out',
        'kicked out of my house', 'kicked out of my home',
        'kicked out by parents', 'kicked out by partner',
        'family kicked me out',
        'section 8', 'apply for section 8', 'housing voucher',
        'need a housing voucher', 'public housing', 'low income housing',
        'affordable housing', 'emergency housing', 'transitional housing',
        'need emergency shelter', 'emergency shelter',
        'lights got shut off', 'power got shut off', 'electricity shut off',
        'no heat', 'heat was shut off', 'no hot water', 'water shut off',
        'gas shut off', 'utility disconnection', 'utility shutoff',
        "can't pay utilities", 'utility assistance', 'help with utilities',
        'liheap', 'energy assistance', 'sober living', 'halfway house',
        'rapid rehousing', 'aging out of foster care',
        'just got released', 'just got out of prison',
      ],
      categories: ['housing'],
      weight: 80,
    },

    // ================================================================
    // IMMIGRATION
    // ================================================================
    {
      patterns: [
        /\b(immigra(nt|tion|te(d|s)?)|undocumented|unauthorized\s+immigrant|deport(ed|ation|ment|ing)?|facing\s+deport|asylum\s+(seeker|case|claim|status|application)?|daca\b|dreamer\b|visa\s+(expir(ed|ing)|overstay(ed)?|status|issue)|out\s+of\s+status|no\s+(legal\s+status|papers|documents?)|citizenship\s+(application|test|interview|process)|naturalization|green\s+card|permanent\s+residen(t|ce)|work\s+(permit|authorization|visa)|uscis|ice\s+(raid|arrest|detain(ed)?|come|came)|detained\s+by\s+ice|refugee\s+(status|resettlement|program)|u\s+visa|t\s+visa|vawa\b|tps\b|temporary\s+protected\s+status|migrant\b)/i,
        'immigration', 'immigrant', 'undocumented', 'unauthorized',
        'i am undocumented', "i'm undocumented", 'undocumented immigrant',
        'out of status', 'no legal status', 'no immigration status',
        "i don't have papers", "i don't have documents",
        "i don't have status", 'no papers', 'no documents',
        'being deported', 'deportation', 'facing deportation',
        'i got a deportation order', 'deportation order',
        'removal order', 'order of removal', 'in removal proceedings',
        'immigration court', 'immigration hearing', 'immigration judge',
        'ice detained me', 'ice arrested me', 'ice picked me up',
        'ice raid', 'ice came to my house', 'ice came to my work',
        'afraid of ice', 'scared of ice',
        'asylum', 'asylum seeker', 'seeking asylum',
        'applied for asylum', 'asylum case', 'asylum hearing',
        'asylum denied', 'refugee', 'refugee resettlement',
        'daca', 'daca renewal', 'dreamer', "i'm a dreamer",
        'renew my daca', 'daca expired', 'daca application',
        'green card', 'apply for green card', 'permanent resident',
        'citizenship', 'naturalization', 'citizenship test',
        'citizenship interview', 'n-400',
        'work permit', 'work authorization', 'ead card',
        'visa expired', 'my visa expired', 'overstayed my visa',
        'tps', 'temporary protected status', 'u visa', 't visa',
        'vawa', 'migrant worker', 'migrant farmworker',
        'need immigration help', 'need immigration lawyer',
        'immigration attorney', 'uscis application',
        'mixed status family', 'my parents are undocumented',
        'special immigrant juvenile',
      ],
      categories: ['immigration', 'legal'],
      weight: 75,
    },

    // ================================================================
    // LEGAL AID
    // ================================================================
    {
      patterns: [
        /\b(need\s+a\s+(law?yer|attorney|public\s+defender)|attorney\b|court\s+(date|hearing|order|case|appearance)|arrested\b|got\s+arrested|criminal\s+record|background\s+check\s+(failed|problem)|expunge[d]?\b|seal\s+(my\s+)?record|restraining\s+order|protective\s+order|order\s+of\s+protection|legal\s+(help|aid|advice|issue|problem|trouble|services?|assistance)|sue\b|sued\b|being\s+sued|lawsuit\b|plea\s+(deal|guilty|not\s+guilty)|charge[ds]?\b|felony|misdemeanor|probation\b|parole\b|ticket\s+(for|i\s+got|i\s+received)|warrant\b|bail\b|bond\b|public\s+defender|custody\s+(battle|case|hearing|agreement|order)|guardianship|visitation\s+(rights?|order)|divorce\b|child\s+support\s+(order|payment|case)|small\s+claims|tenant\s+rights?|landlord\s+dispute|eviction\s+defense|discrimination\b|civil\s+rights?|name\s+change|bankruptcy\b)/i,
        'need a lawyer', 'need an attorney', 'looking for a lawyer',
        'looking for an attorney', 'find a lawyer', 'legal help',
        'legal aid', 'legal advice', 'legal services', 'legal assistance',
        'free legal help', 'low cost legal',
        'arrested', 'got arrested', 'i was arrested',
        'being charged', 'facing charges', 'criminal charges',
        'felony charge', 'misdemeanor charge', 'felony',
        'going to court', 'have a court date', 'court date',
        'court hearing', 'criminal record', 'background check failed',
        'expunge my record', 'seal my record', 'clear my record',
        'on probation', 'i am on probation', 'probation violation',
        'on parole', 'i am on parole', 'parole violation',
        "got a ticket", 'have a ticket', 'i received a ticket',
        'traffic ticket', 'have a warrant', 'bench warrant',
        'need bail', 'bail money', 'in jail', 'public defender',
        'custody battle', 'child custody', 'custody hearing',
        'fight for custody', 'visitation rights', 'divorce',
        'filing for divorce', 'child support', 'owe child support',
        'need child support', 'guardianship', 'adopt',
        'restraining order', 'protective order', 'order of protection',
        'getting sued', 'filing a lawsuit', 'small claims court',
        'tenant rights', 'landlord dispute', 'landlord problems',
        'discrimination', 'civil rights violation', 'name change',
        'bankruptcy', 'just got out of jail', 'just released from jail',
        'ban the box', 'housing with a felony',
        "can't get a job because of my record",
      ],
      categories: ['legal'],
      weight: 70,
    },

    // ================================================================
    // EMPLOYMENT & INCOME
    // ================================================================
    {
      patterns: [
        /\b(no\s+job|jobless|out\s+of\s+work|can.?t\s+find\s+(a\s+)?(job|work|employment)|unemployed|unemployment(\s+(benefits?|insurance|check|claim))?|lost?\s+my\s+job|just\s+(lost|got\s+fired\s+from|got\s+laid\s+off)|fired\b|terminated\b|laid\s+off|job\s+loss|looking\s+for\s+(a\s+)?(job|work|employment)|need\s+(a\s+)?(job|work|income|employment)|job\s+train(ing)?|workforce\s+(develop|train|program|ready)|resume\b|career\s+(help|center|coach|services?|fair)|get\s+back\s+to\s+work|re.?enter\s+(the\s+)?workforce|entry[- ]?level|interview\s+(prep|help|skills?|practice)|no\s+income|financially?\s+(struggling|unstable|hardship)|broke\b|can.?t\s+(pay|afford)\s+(my\s+)?bills)/i,
        'no job', "i don't have a job", "i don't have work",
        'jobless', 'out of work', 'out of a job',
        'unemployed', "i'm unemployed", 'currently unemployed',
        'lost my job', 'i lost my job', 'just lost my job',
        'recently lost my job', 'got fired', 'i got fired',
        'i was fired', 'was fired', 'terminated', 'i was terminated',
        'laid off', 'i was laid off', 'i got laid off',
        'company shut down', 'company closed',
        "can't find work", "can't find a job", "can't find employment",
        'looking for a job', 'looking for work', 'job searching',
        'trying to find a job', 'job hunt', 'job hunting',
        'need a job', 'need work', 'need employment',
        'help finding a job', 'help finding work',
        'no income', "i don't have income", 'no money',
        'no money coming in', 'financially struggling',
        'financial hardship', "i'm broke", 'broke',
        "can't pay bills", "can't afford my bills", 'behind on bills',
        'job training', 'workforce training', 'vocational training',
        'trade school', 'apprenticeship', 'skills training',
        'need job training', 'no work experience',
        'entry level jobs', 'first job', 'looking for my first job',
        'help with resume', 'resume help', 'need a resume',
        "don't have a resume", 'cover letter help',
        'interview prep', 'interview help', 'interview practice',
        'unemployment benefits', 'apply for unemployment',
        'unemployment claim', 'unemployment check',
        "workers' comp", 'workers compensation',
        'michigan works', 'workforce development', 'temp agency',
        'gig work', 'never had a job', 'gap in employment',
        "can't afford childcare to work",
      ],
      categories: ['employment'],
      weight: 70,
    },

    // ================================================================
    // EDUCATION & LITERACY
    // ================================================================
    {
      patterns: [
        /\b(ged\b|high\s+school\s+(diploma|equivalen|dropout)|drop(ped)?\s+out\s+of\s+(high\s+school|school|college)|go(ing)?\s+back\s+to\s+school|finish\s+(school|high\s+school|my\s+degree|my\s+diploma)|adult\s+(ed(ucation)?|school|learning|lit(eracy)?)|community\s+college|vocational\s+school|trade\s+school|enroll(ment)?\s+(in\s+school)?|can.?t\s+read\b|learning\s+disabilit|dyslexia|basic\s+(skills?|education|literacy)|english\s+(class(es)?|lesson|course|as\s+a\s+second\s+language)|esl\b|esol\b|english\s+learner|need\s+(to\s+learn\s+english|english\s+help|help\s+reading|help\s+in\s+school|tutoring|academic\s+help)|tutoring\b|after.?school\s+program|scholarship|financial\s+aid\s+for\s+school|student\s+(loan|debt)|college\s+(application|enrollment|help))/i,
        'ged', 'need a ged', 'need my ged', 'get my ged',
        'high school diploma', 'need a high school diploma',
        'high school equivalency', 'hiset', 'tasc',
        "i don't have my diploma", "i don't have a diploma",
        'no diploma', 'no degree',
        'dropped out', 'i dropped out', 'dropped out of high school',
        'dropped out of college', 'dropped out of school',
        'never finished high school', "i didn't finish high school",
        "i didn't graduate", 'did not graduate',
        'go back to school', 'going back to school',
        'want to go back to school', 'want to finish school',
        'finish my degree', 'finish high school',
        'return to school', 'returning to school',
        'adult education', 'adult ed', 'adult school',
        'adult literacy', 'adult learning',
        'community college', 'vocational school', 'trade school',
        'enroll in school', 'enroll in college',
        'how to apply for college', 'college application',
        "can't read", "i can't read", 'low literacy', 'literacy help',
        'reading problems', 'reading difficulty', 'learning disability',
        'dyslexia', 'trouble reading', 'need help reading',
        'english class', 'esl class', 'esol', 'learn english',
        'learning english', "i don't speak english well",
        'english as a second language', 'english learner',
        'need english classes',
        'need tutoring', 'want tutoring', 'need a tutor',
        'need help in school', 'need school help', 'academic help',
        'after school program', 'homework help', 'failing school',
        'failing classes',
        'scholarship', 'grant for school', 'school financial aid',
        'student loans', 'student debt', 'pay for college',
        "can't afford school", "can't afford college",
        'job corps', 'pell grant', 'financial aid',
        'certification program', 'get a certification',
      ],
      categories: ['education'],
      weight: 65,
    },

    // ================================================================
    // SUBSTANCE USE & ADDICTION / REHABILITATION
    // ================================================================
    {
      patterns: [
        /\b(addict(ed|ion|ive)?|drug(s|\s+use|\s+problem|\s+addict|\s+abuse|\s+dependent)?|alcohol(ism|\s+problem|\s+addict|\s+abus|\s+depend)?|substance\s+(use\s+disorder|abus|depend|problem)|sobriet(y|ies)?|(in|entering)\s+recovery|seeking\s+recovery|rehab(ilitation)?\b|residential\s+treatment|in.?patient\s+treatment|outpatient\s+treatment|detox(ification)?\b|withdrawal\b|overdos(e|ed|ing)?|opi(oid|ate)\b|fentanyl\b|meth(amphetamine)?\b|crystal\s+meth|heroin\b|cocaine\b|\bcrack\b|drink(ing)?\s+(too\s+much|problem|every\s+day|daily|heavily)|heavy\s+drink|binge\s+drink|can.?t\s+stop\s+(drinking|using\s+drugs?|using|doing\s+drugs?)|struggling\s+with\s+(drugs?|alcohol|addiction|substance|drinking)|relapse[d]?\b|cravings?\b)/i,
        'addiction', 'drug addiction', 'alcohol addiction',
        'substance abuse', 'substance use disorder',
        'i am addicted', "i'm addicted",
        'addicted to drugs', 'addicted to alcohol',
        'addicted to pills', 'addicted to opioids', 'addicted to heroin',
        'addicted to meth', 'addicted to cocaine', 'addicted to crack',
        'drug problem', 'drug use', 'drug abuse',
        'alcohol problem', 'alcoholism', 'alcohol abuse',
        'opioid addiction', 'opioid', 'heroin addiction',
        'fentanyl', 'fentanyl addiction', 'fentanyl overdose',
        'meth', 'meth addiction', 'crystal meth',
        'cocaine addiction', 'crack addiction',
        'pill addiction', 'prescription pill addiction',
        'painkillers', 'pain pill addiction',
        'drinking too much', "i'm drinking too much",
        'drinking every day', 'heavy drinker', 'binge drinking',
        "can't stop drinking", "i can't stop drinking",
        "can't stop using", "i can't stop using drugs",
        'struggling with drugs', 'struggling with alcohol',
        'struggling with addiction', 'struggling with substance use',
        'overdose', 'i overdosed', 'someone overdosed',
        'near overdose', 'i almost overdosed',
        'naloxone', 'narcan', 'need narcan',
        'want to get sober', 'trying to get sober', 'getting sober',
        'want to stop drinking', 'want to stop using',
        'want to quit drugs', 'want to quit alcohol',
        'in recovery', 'seeking recovery', 'early recovery',
        'relapsed', 'relapse', "i relapsed", 'relapse prevention',
        'cravings', 'having cravings',
        'need rehab', 'going to rehab', 'want to go to rehab',
        "can't afford rehab", 'looking for rehab',
        'detox', 'need detox', 'going through withdrawal',
        'withdrawal symptoms', 'in withdrawal',
        'residential treatment', 'inpatient treatment',
        'outpatient treatment', 'treatment program',
        'sober living', 'halfway house', 'recovery housing',
        'narcotics anonymous', 'alcoholics anonymous', 'aa', 'na',
        '12 step', 'twelve step', 'methadone', 'suboxone',
        'buprenorphine', 'medication assisted treatment',
        'my family member is addicted', 'my child is using drugs',
        'clean time', 'in treatment',
      ],
      categories: ['rehabilitation', 'health'],
      weight: 75,
    },

    // ================================================================
    // MENTAL HEALTH
    // ================================================================
    {
      patterns: [
        /\b(mental\s+(health|illness|disorder|crisis|breakdown)|anxiet(y|ies)?|anxious\b|panic\s+(attack|disorder)|depress(ed|ion|ing|ive)?|bipolar\b|schizophreni(a|c)?|psychosis\b|psychi(atric|atrist|atry)?|therapist\b|therapy\b|counseling\b|counselor\b|ptsd\b|post.?traumatic|trauma(tized)?|grief\b|grieving\b|bereavement|emotional\s+(support|distress|wellbeing)|mood\s+(disorder|swing)|ocd\b|adhd\b|eating\s+disorder|anorexia\b|bulimia\b|binge\s+eating|feeling\s+(really\s+)?(sad|alone|hopeless|lost|overwhelmed|empty|numb|broken|worthless|helpless|anxious|depressed)|can.?t\s+(cope|function|concentrate|focus|get\s+out\s+of\s+bed|stop\s+crying|stop\s+worrying)|emotionally?\s+(struggling|breaking\s+down|exhausted|drained)|not\s+doing\s+(well|okay|good)|burnout\b|nervous\s+breakdown)/i,
        'mental health', 'mental illness', 'mental health problems',
        'mental health issue', 'mental health crisis',
        'i need mental health help', 'need mental health support',
        'anxiety', "i have anxiety", "i'm anxious", 'anxious',
        'panic attack', "i'm having a panic attack",
        "i've been having panic attacks", 'severe anxiety',
        'depression', 'depressed', "i'm depressed",
        "i've been depressed", 'major depression', 'postpartum depression',
        'bipolar', 'bipolar disorder', 'manic', 'mania',
        'schizophrenia', 'psychosis', 'hearing voices',
        'ptsd', 'post traumatic stress', 'trauma',
        'traumatized', 'past trauma', 'childhood trauma',
        'ocd', 'obsessive compulsive', 'adhd', 'attention deficit',
        'eating disorder', 'anorexia', 'bulimia', 'binge eating',
        'need a therapist', 'need therapy', 'need counseling',
        'looking for a therapist', "can't afford therapy",
        'free therapy', 'free counseling', 'sliding scale therapy',
        'feeling hopeless', 'feeling alone', "i feel alone",
        "i feel lonely", "i'm lonely", 'feeling lost', "i feel lost",
        "i'm feeling lost", 'feeling empty', "i feel empty",
        'feeling numb', "i feel numb", "feeling worthless",
        "i feel worthless", "feeling helpless", "i feel helpless",
        'feeling overwhelmed', "i'm overwhelmed",
        'really struggling', "i'm struggling",
        "i'm not okay", "i'm not doing okay", "not doing well",
        "i'm falling apart", "i feel broken",
        "can't cope", "i can't cope", "can't get out of bed",
        "can't stop crying", "can't stop worrying",
        "can't concentrate", "can't focus",
        'grief', 'grieving', 'lost someone', 'someone died',
        'dealing with loss', 'lost a loved one', 'bereavement',
        'emotional support', 'need emotional support',
        'mental breakdown', "i'm having a breakdown",
        'nervous breakdown', 'burnout', 'burned out',
        "i'm burned out", 'nightmares', 'flashbacks',
        'isolating', 'dissociation', 'mood disorder',
        'not sleeping', 'not eating', 'autism', 'autistic',
      ],
      categories: ['health', 'crisis'],
      weight: 72,
    },

    // ================================================================
    // PARENTING & CHILDREN
    // ================================================================
    {
      patterns: [
        /\b(pregnant|pregnancy\b|prenatal|expecting\s+a\s+baby|baby\b|infant\b|newborn\b|toddler\b|childcare\b|child\s+care|daycare\b|parenting\b|parent\s+(support|class|resource|program|help)|single\s+(mom|dad|mother|father|parent)|wic\b|kids?\s+(need|are?\s+(hungry|sick|homeless|without)|don.?t\s+have|require)|children?\s+(need|are?\s+(hungry|sick|without)|don.?t\s+have)|raising\s+(kids?|children|a\s+child|a\s+baby)|teen\s+(parent|mom|dad|pregnancy)|young\s+(parent|mom|dad)|new\s+(parent|mom|dad|mother|father)|foster\s+(care|parent)|kinship\s+care|my\s+child(ren)?\s+(is|are|need|needs?)|my\s+kid(s)?\s+(is|are|need|needs?)|formula\b|diapers?\b|baby\s+(product|supply|formula)|family\s+(planning|support|resource)|birth\s+control|teen\s+pregnancy|cps\b|dcfs\b|child\s+(abus|neglect|protective))/i,
        'pregnant', "i'm pregnant", 'i think i am pregnant',
        'expecting a baby', 'expecting', 'prenatal care',
        'need prenatal care', 'pregnancy test', 'teen pregnancy',
        'having a baby', 'just had a baby', 'new baby',
        'newborn', 'infant', 'baby', 'need help with my baby',
        'baby formula', 'ran out of formula', 'no formula',
        "can't afford formula", 'formula assistance',
        'diapers', 'need diapers', "can't afford diapers",
        'diaper assistance', 'baby supplies',
        'childcare', 'need childcare', 'need daycare',
        "can't afford childcare", "can't afford daycare",
        'childcare assistance', 'childcare voucher',
        'after school care', 'babysitter',
        'single mom', 'single mother', 'single dad', 'single father',
        'single parent', "i'm a single parent", 'parenting alone',
        'raising kids alone', 'raising my kids by myself',
        'wic', 'need wic', 'apply for wic', 'wic benefits',
        'parenting help', 'parenting support', 'parenting class',
        'parenting resources', "i don't know how to parent",
        'help with my kids', 'help with my children',
        'my kids need help', 'my children need help',
        'overwhelmed as a parent', 'struggling as a parent',
        'first time parent', 'teen parent',
        'cps', 'child protective services', 'dcfs',
        'cps is involved', 'cps came to my house',
        'cps is threatening to take my kids',
        'losing custody of my kids', 'afraid of losing my kids',
        'foster care', 'kinship care',
        'birth control', 'need birth control', 'family planning',
        'teen mom', 'head start', 'early childhood',
      ],
      categories: ['parenting', 'health'],
      weight: 65,
    },

    // ================================================================
    // PHYSICAL HEALTH & HEALTHCARE ACCESS
    // ================================================================
    {
      patterns: [
        /\b(no\s+(health\s+)?insurance|uninsured\b|underinsured\b|can.?t\s+(afford|pay\s+for|access)\s+(doct(or|or.?s\s+visit)?|medic(ine|ation|al\s+(care|bill))?|prescri(ption)?|hospital|dent(ist|al\s+care)?|vision|eye\s+care|urgent\s+care)|need\s+(a\s+doctor|medical\s+(care|help|attention)|dental\s+(care|work|help)|vision\s+care|a\s+prescription|medication)|sick\b|ill(ness)?|hospital(ized|ization)?|emergency\s+room|prescription\b|medicaid\b|medicare\b|chip\b|aca\b|obamacare\b|free\s+clinic|community\s+health|dental\s+(care|clinic|pain)|tooth\s+(pain|ache|broken)|vision\s+(care|insurance)|glasses\b|chronic\s+(illness|condition|pain)|diabetes\b|hypertension\b|high\s+blood\s+pressure|asthma\b|cancer\b|hiv\b|std\b|sti\b|sexual\s+health|reproductive\s+health|medical\s+(bill|debt|cost))/i,
        'no insurance', "i don't have insurance",
        "i don't have health insurance", 'no health insurance',
        'uninsured', 'lost my insurance', 'lost health coverage',
        "can't afford insurance",
        'medicaid', 'apply for medicaid', 'need medicaid',
        'medicare', 'chip', 'obamacare', 'aca marketplace',
        'need health insurance',
        'need a doctor', 'need to see a doctor',
        "can't afford the doctor", "can't see a doctor",
        "can't get medical care", 'need medical care',
        'need to see a specialist', 'need urgent care',
        'emergency room', 'need to go to the er',
        'i am sick', "i'm sick", "i've been sick",
        'chronic illness', 'chronic condition', 'chronic pain',
        'diabetes', 'managing diabetes', 'diabetic',
        'high blood pressure', 'hypertension', 'asthma',
        'cancer', 'cancer treatment',
        'need medication', "can't afford medication",
        "can't afford my medication", "can't afford prescriptions",
        'no prescription', 'need a prescription',
        'prescription assistance', 'medication assistance',
        'ran out of medication',
        'need dental', 'dental care', 'dental pain',
        'tooth pain', 'toothache', 'broken tooth',
        'need a dentist', "can't afford a dentist",
        "can't afford dental care", 'free dental',
        'need vision care', 'need an eye exam',
        'need glasses', "can't afford glasses",
        'hiv', 'hiv test', 'hiv treatment', 'prep', 'need prep',
        'std', 'sti', 'need std testing', 'sexual health',
        'reproductive health', 'free clinic',
        'community health center',
        'medical bills', 'medical debt', 'hospital bill',
        "can't pay medical bills",
      ],
      categories: ['health'],
      weight: 65,
    },

    // ================================================================
    // CLOTHING
    // ================================================================
    {
      patterns: [
        /\b(no\s+clothes|don.?t\s+have\s+(any\s+)?(clothes|clothing|shoes?|jacket|coat|socks|pants|shirt|underwear)|need\s+(clothes|clothing|a\s+coat|a\s+jacket|shoes?|boots?|winter\s+gear|warm\s+clothes|socks|underwear|work\s+clothes)|clothes?\s+(for\s+(work|school|interview|kids?|children|winter|cold|job)|bank|closet|drive|donation)|clothing\s+(bank|closet|drive|help|donation|assistance)|can.?t\s+afford\s+(clothes|clothing|shoes?|a\s+coat)|nothing\s+to\s+wear|don.?t\s+have\s+(anything|something)\s+to\s+wear|my\s+clothes\s+(don.?t\s+fit|are\s+(too\s+(small|big|old|worn)|worn\s+out|falling\s+apart))|kids?\s+(don.?t\s+have|need)\s+(clothes|shoes|a\s+coat|winter\s+gear))/i,
        'no clothes', "i don't have clothes", "i don't have any clothes",
        "don't have clothes", "don't have any clothes",
        "don't have anything to wear", "nothing to wear",
        "i have nothing to wear",
        'need clothes', 'need clothing', 'need a coat',
        'need a jacket', 'need shoes', 'need boots',
        'need warm clothes', 'need winter clothes', 'need socks',
        'need underwear', 'need a winter coat', 'need winter gear',
        'clothes for work', 'work clothes',
        'clothes for an interview', 'interview clothes',
        'outfit for a job interview', 'professional clothes',
        "don't have anything professional to wear",
        'clothes for my kids', 'clothes for my children',
        'my kids need clothes', 'my kids need shoes',
        'my children need clothes', 'kids outgrew their clothes',
        'kids clothes too small', 'baby clothes',
        "my kids don't have clothes",
        "can't afford clothes", "can't afford clothing",
        "can't afford shoes", "can't buy clothes",
        'clothing bank', 'clothing closet', 'free clothes',
        'clothing donation', 'clothing drive', 'clothing assistance',
        'back to school clothes', 'school uniforms', 'need uniforms',
        "can't afford school clothes",
      ],
      categories: ['clothing'],
      weight: 55,
    },

    // ================================================================
    // HYGIENE & PERSONAL CARE
    // ================================================================
    {
      patterns: [
        /\b(hygiene\b|no\s+(shower|bath|bathroom\s+access|access\s+to\s+a\s+shower)|can.?t\s+(shower|bathe|wash\s+(up|myself|my\s+(hair|body|clothes)))|laundry\b|free\s+laundry|laundromat\b|washing\s+(my\s+)?clothes|no\s+(soap|shampoo|deodorant|toothbrush|toothpaste|toilet\s+paper)|feminine\s+(hygiene|product)|menstrual\s+(product|pad|tampon|cup)|period\s+(product|pad|tampon|supply|poverty)|personal\s+(care\s+(item|product|supply)|hygiene)|need\s+(soap|shampoo|deodorant|toothbrush|toothpaste|hygiene\s+(products?|items?|kit|supplies?)|toiletries?|personal\s+care)|haven.?t\s+(showered|bathed|washed\s+up)|no\s+running\s+water|no\s+hot\s+water)/i,
        'no shower', "don't have a shower", 'need to shower',
        "can't shower", "i can't shower", 'need a place to shower',
        'nowhere to shower', 'need access to a shower',
        'free showers', "haven't showered",
        "haven't showered in days", "can't bathe",
        "haven't been able to bathe",
        'need to do laundry', "can't do laundry",
        "can't afford laundry", 'laundry', 'free laundry',
        'need to wash my clothes', 'no clean clothes',
        'clothes are dirty', 'laundromat',
        "can't afford the laundromat",
        'hygiene products', 'personal hygiene', 'hygiene items',
        'hygiene supplies', 'hygiene kit', 'need toiletries',
        'no soap', 'no shampoo', 'no deodorant', 'no toothbrush',
        'no toothpaste', 'no toilet paper', 'need soap',
        'need shampoo', 'need deodorant', 'need a toothbrush',
        'need toothpaste', 'need personal care products',
        'feminine products', 'feminine hygiene', 'period products',
        'menstrual products', 'need pads', 'need tampons',
        'no pads', 'no tampons', 'period poverty',
        "can't afford pads", "can't afford tampons",
        "i don't have hygiene products",
        "i don't have personal care products",
        'need hygiene help', 'no running water', 'no hot water',
        'utilities shut off', 'access to bathroom',
      ],
      categories: ['hygiene'],
      weight: 50,
    },

    // ================================================================
    // TRANSPORTATION
    // ================================================================
    {
      patterns: [
        /\b(no\s+(car|vehicle|ride|bus\s+pass|transportation|way\s+to\s+get\s+(around|there))|don.?t\s+have\s+(a\s+)?(car|vehicle|ride|transportation|bus\s+pass)|can.?t\s+(get\s+to\s+)?(work|school|my\s+appointment|hospital|the\s+doctor|an\s+interview|court)|can.?t\s+afford\s+(gas|a\s+ride|bus\s+fare|transportation)|need\s+(a\s+)?(ride|transportation|bus\s+pass|car|vehicle)|ddot\b|smart\s+bus|pace\s+bus|rta\b|bus\s+(fare|route|pass|ticket|schedule)|uber\b|lyft\b|stranded\b|car\s+(broke\s+down|dead|totaled|repossessed)|license\s+(suspended|revoked|expired)|no\s+(valid\s+)?driver.?s?\s+license|medical\s+transport(ation)?)/i,
        'no car', "i don't have a car", "don't have a car",
        "i don't have a vehicle", 'no vehicle', 'no transportation',
        "i don't have transportation", 'no ride', "don't have a ride",
        "i don't have a ride",
        "can't get to work", "can't make it to work",
        "can't get to school", "can't get to my appointment",
        "can't get to the doctor", "can't get to the hospital",
        "can't get to court", "can't get to an interview",
        "can't afford gas", "can't afford the bus",
        "can't afford bus fare",
        'need transportation', 'need a ride', 'need a car',
        "i need a way to get around", 'need help getting around',
        'need bus money', 'need bus fare',
        'bus pass', 'need a bus pass', 'free bus pass',
        'ddot', 'smart bus', 'pace bus', 'public transportation',
        'my car broke down', 'car broke down', 'car is dead',
        'car was totaled', 'car got repossessed',
        'license suspended', 'suspended license', 'license revoked',
        'no license', "i don't have a license", "can't drive",
        'stranded', "i'm stranded", 'stuck with no ride',
        'no way to get around', 'no way to get there',
        "i can't get around",
        'medical transportation', 'medical transport',
        'need medical transportation',
        'wheelchair accessible transport',
        'getting to work', 'need uber money', 'need lyft money',
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

    // Full-text scoring collects all signals across the entire input.
    const { categoryScores, hotline, isCrisis } = runRules(text);
    if (Object.keys(categoryScores).length === 0) return null;

    // Clause-level pass: split multi-sentence input into individual need-clauses
    // to count distinct needs and order the tiles by relevance per-need.
    const clauses = splitIntoClauses(text);
    const needSlugs = [];            // ordered list of per-clause primary slugs
    const seenSlugs = new Set();

    if (clauses.length > 1) {
      for (const clause of clauses) {
        const { categoryScores: cScores } = runRules(clause);
        // Pick the top-scoring category for this clause that hasn't appeared yet.
        const top = Object.entries(cScores)
          .sort((a, b) => b[1] - a[1])
          .map(([s]) => s)
          .find(s => !seenSlugs.has(s));
        if (top) {
          seenSlugs.add(top);
          needSlugs.push(top);
        }
      }
    }

    // Show up to 6 tiles for multi-need inputs, 3 for single-need.
    const isMultiNeed = needSlugs.length > 1;
    const cap = isMultiNeed ? 6 : 3;

    // Sort by full-text score, but surface per-clause primaries first.
    const sortedCats = Object.entries(categoryScores)
      .sort(function (a, b) {
        const aIdx = needSlugs.indexOf(a[0]);
        const bIdx = needSlugs.indexOf(b[0]);
        // Known-need slugs float to front in clause order; then by score.
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return  1;
        return b[1] - a[1];
      })
      .slice(0, cap)
      .map(function ([slug]) { return Object.assign({ slug }, CATEGORY_META[slug]); });

    return { categories: sortedCats, hotline, isCrisis, isMultiNeed, needCount: needSlugs.length || 1 };
  }

  /**
   * Run every rule against a text string and return aggregated scores.
   * Extracted so it can be called on both the full text and individual clauses.
   */
  function runRules(text) {
    const categoryScores = {};
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
    return { categoryScores, hotline, isCrisis };
  }

  /**
   * Split a natural-language input into individual need-clauses.
   *
   * Stage 1 — sentence boundaries: split on  . ! ? ;
   * Stage 2 — conjunctions: further split on "and / but / also / plus / as well as"
   *           when followed by a first-person reference ("i", "my", "we", "our")
   *           so that "food and shelter" stays together but
   *           "I need food and I'm behind on rent" splits into two clauses.
   */
  function splitIntoClauses(text) {
    const byPunct = text.split(/[.!?;]+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 3; });

    const clauses = [];
    for (const segment of byPunct) {
      const parts = segment
        .split(/\s+(?:and|but|also|plus|as well as)\s+(?=i\b|i'm|i've|i need|i am|i don|my\b|we\b|our\b)/i)
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length > 3; });
      clauses.push(...(parts.length ? parts : [segment]));
    }

    return clauses.length > 0 ? clauses : [text];
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

    // Label adapts to single vs. multi-need input
    if (result.isMultiNeed) {
      html += `<p class="smart-results-label">We found help for <strong>${result.needCount} needs</strong> you mentioned:</p>`;
    } else {
      html += '<p class="smart-results-label">Based on what you shared, these resources may help:</p>';
    }

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
