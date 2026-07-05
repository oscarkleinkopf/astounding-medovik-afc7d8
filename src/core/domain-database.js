/**
 * @fileoverview Massive domain database organized by category.
 * Provides fast O(1) domain lookups, URL‑pattern matching, and keyword
 * analysis for heuristic bookmark categorization.
 * @module core/domain-database
 */

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {object} Category
 * @property {string}   id          - Unique kebab‑case identifier.
 * @property {string}   name        - English display name.
 * @property {string}   nameEs      - Spanish display name.
 * @property {string}   emoji       - Representative emoji.
 * @property {string}   color       - Hex color code.
 * @property {string[]} domains     - Known domains for this category.
 * @property {string[]} urlPatterns - URL path fragments that hint at this category.
 * @property {string[]} keywords    - Words in titles/descriptions that suggest this category.
 * @property {boolean}  [isCustom]  - True for user‑created categories.
 */

/** @type {Category[]} */
export const DEFAULT_CATEGORIES = [
  // 1 ── Social Media ──────────────────────────────────────────────────────
  {
    id: 'social-media',
    name: 'Social Media',
    nameEs: 'Redes Sociales',
    emoji: '🌐',
    color: '#E91E63',
    domains: [
      'facebook.com', 'fb.com', 'fbcdn.net', 'instagram.com',
      'twitter.com', 'x.com', 'linkedin.com', 'reddit.com',
      'old.reddit.com', 'tiktok.com', 'snapchat.com', 'pinterest.com',
      'tumblr.com', 'mastodon.social', 'threads.net', 'discord.com',
      'discord.gg', 'whatsapp.com', 'web.whatsapp.com', 'telegram.org',
      't.me', 'signal.org', 'vk.com', 'weibo.com', 'quora.com',
      'bluesky.social', 'bsky.app', 'nextdoor.com', 'meetup.com',
      'clubhouse.com', 'truth.social', 'gettr.com', 'parler.com',
    ],
    urlPatterns: ['/status/', '/posts/', '/profile/', '/feed/', '/stories/', '/reel/', '/communities/'],
    keywords: [
      'social', 'friend', 'follow', 'post', 'share', 'tweet',
      'community', 'network', 'chat', 'message', 'forum', 'hashtag',
      'influencer', 'followers', 'likes', 'stories', 'reels',
    ],
  },

  // 2 ── Shopping ──────────────────────────────────────────────────────────
  {
    id: 'shopping',
    name: 'Shopping',
    nameEs: 'Compras',
    emoji: '🛒',
    color: '#FF9800',
    domains: [
      'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.es',
      'amazon.com.mx', 'amazon.ca', 'amazon.fr', 'amazon.it',
      'amazon.co.jp', 'amazon.com.br', 'amazon.in', 'amazon.com.au',
      'ebay.com', 'ebay.co.uk', 'ebay.de',
      'aliexpress.com', 'alibaba.com',
      'walmart.com', 'target.com',
      'mercadolibre.com', 'mercadolibre.com.mx', 'mercadolibre.com.ar',
      'mercadolibre.cl', 'mercadolibre.com.co', 'mercadolibre.com.pe',
      'etsy.com', 'shopify.com', 'bestbuy.com', 'newegg.com',
      'costco.com', 'homedepot.com', 'lowes.com', 'ikea.com',
      'wayfair.com', 'wish.com', 'temu.com', 'shein.com',
      'zappos.com', 'asos.com', 'zara.com', 'hm.com',
      'macys.com', 'nordstrom.com', 'overstock.com',
      'falabella.com', 'liverpool.com.mx', 'linio.com', 'dafiti.com',
      'rakuten.com', 'banggood.com', 'gearbest.com', 'dhgate.com',
    ],
    urlPatterns: ['/product', '/cart', '/checkout', '/shop', '/buy', '/item/', '/dp/', '/gp/product', '/listing/', '/offer/'],
    keywords: [
      'shop', 'buy', 'price', 'sale', 'discount', 'cart', 'order',
      'deal', 'offer', 'store', 'purchase', 'coupon', 'shipping',
      'delivery', 'marketplace', 'retail', 'clearance',
    ],
  },

  // 3 ── News ──────────────────────────────────────────────────────────────
  {
    id: 'news',
    name: 'News & Media',
    nameEs: 'Noticias y Medios',
    emoji: '📰',
    color: '#2196F3',
    domains: [
      'cnn.com', 'bbc.com', 'bbc.co.uk', 'nytimes.com',
      'washingtonpost.com', 'reuters.com', 'apnews.com',
      'theguardian.com', 'foxnews.com', 'nbcnews.com',
      'cbsnews.com', 'abcnews.go.com', 'usatoday.com',
      'bloomberg.com', 'huffpost.com', 'politico.com', 'npr.org',
      'aljazeera.com', 'france24.com', 'dw.com',
      'elpais.com', 'elmundo.es', 'infobae.com', 'clarin.com',
      'lanacion.com.ar', 'emol.com', 'latercera.com',
      'excelsior.com.mx', 'eluniversal.com.mx',
      'bild.de', 'lemonde.fr', 'corriere.it',
      'news.yahoo.com', 'news.google.com', 'msn.com',
      'axios.com', 'vox.com', 'theatlantic.com', 'newyorker.com',
      'economist.com', 'ft.com', 'wsj.com',
      'forbes.com', 'businessinsider.com', 'cnbc.com',
      'time.com', 'newsweek.com', 'dailymail.co.uk',
      'independent.co.uk', 'telegraph.co.uk',
    ],
    urlPatterns: ['/news/', '/article/', '/story/', '/breaking/', '/politics/', '/opinion/', '/world/', '/business/'],
    keywords: [
      'news', 'breaking', 'report', 'journalist', 'headline',
      'politics', 'election', 'opinion', 'editorial', 'press',
      'coverage', 'interview', 'scandal', 'crisis', 'update',
    ],
  },

  // 4 ── Development ───────────────────────────────────────────────────────
  {
    id: 'development',
    name: 'Development',
    nameEs: 'Desarrollo',
    emoji: '💻',
    color: '#4CAF50',
    domains: [
      'github.com', 'gist.github.com', 'gitlab.com', 'bitbucket.org',
      'stackoverflow.com', 'stackexchange.com', 'superuser.com',
      'serverfault.com', 'askubuntu.com',
      'dev.to', 'medium.com', 'news.ycombinator.com',
      'codepen.io', 'jsfiddle.net', 'codesandbox.io', 'replit.com',
      'developer.mozilla.org', 'w3schools.com', 'freecodecamp.org',
      'npmjs.com', 'pypi.org', 'crates.io', 'nuget.org', 'rubygems.org',
      'hub.docker.com', 'vercel.com', 'netlify.com', 'heroku.com',
      'digitalocean.com', 'aws.amazon.com', 'cloud.google.com',
      'azure.microsoft.com', 'console.cloud.google.com',
      'hashnode.dev', 'css-tricks.com', 'smashingmagazine.com',
      'jetbrains.com', 'visualstudio.com', 'code.visualstudio.com',
      'kubernetes.io', 'terraform.io', 'postman.com', 'swagger.io',
      'firebase.google.com', 'supabase.com', 'planetscale.com',
      'deno.land', 'bun.sh', 'rust-lang.org', 'go.dev',
      'typescriptlang.org', 'python.org', 'php.net', 'ruby-lang.org',
      'learn.microsoft.com', 'developer.apple.com',
    ],
    urlPatterns: ['/docs/', '/api/', '/reference/', '/tutorial/', '/guide/', '/repository/', '/pull/', '/issues/', '/commit/', '/wiki/'],
    keywords: [
      'code', 'programming', 'developer', 'software', 'api',
      'framework', 'library', 'debug', 'deploy', 'repository',
      'git', 'open source', 'frontend', 'backend', 'database',
      'algorithm', 'compiler', 'runtime', 'devops', 'ci/cd',
      'docker', 'container', 'microservice', 'serverless',
    ],
  },

  // 5 ── Entertainment ─────────────────────────────────────────────────────
  {
    id: 'entertainment',
    name: 'Entertainment',
    nameEs: 'Entretenimiento',
    emoji: '🎬',
    color: '#9C27B0',
    domains: [
      'youtube.com', 'youtu.be', 'netflix.com', 'hulu.com',
      'disneyplus.com', 'primevideo.com', 'hbomax.com', 'max.com',
      'peacocktv.com', 'crunchyroll.com', 'funimation.com',
      'twitch.tv', 'spotify.com', 'open.spotify.com',
      'music.apple.com', 'music.youtube.com',
      'soundcloud.com', 'pandora.com', 'deezer.com', 'tidal.com',
      'imdb.com', 'rottentomatoes.com', 'metacritic.com',
      'letterboxd.com', 'vimeo.com', 'dailymotion.com',
      '9gag.com', 'imgur.com', 'giphy.com',
      'buzzfeed.com', 'boredpanda.com',
      'starplus.com', 'pluto.tv', 'paramountplus.com', 'appletv.apple.com',
    ],
    urlPatterns: ['/watch/', '/video/', '/movie/', '/series/', '/listen/', '/playlist/', '/channel/', '/clip/', '/episode/'],
    keywords: [
      'movie', 'film', 'series', 'music', 'video', 'stream',
      'watch', 'listen', 'entertainment', 'show', 'episode',
      'season', 'anime', 'comedy', 'drama', 'trailer', 'soundtrack',
      'concert', 'podcast', 'meme',
    ],
  },

  // 6 ── Education ─────────────────────────────────────────────────────────
  {
    id: 'education',
    name: 'Education',
    nameEs: 'Educación',
    emoji: '📚',
    color: '#00BCD4',
    domains: [
      'coursera.org', 'udemy.com', 'edx.org', 'khanacademy.org',
      'udacity.com', 'pluralsight.com', 'skillshare.com',
      'codecademy.com', 'brilliant.org',
      'duolingo.com', 'memrise.com', 'busuu.com', 'babbel.com',
      'ted.com', 'ocw.mit.edu',
      'scholar.google.com', 'academia.edu',
      'wikipedia.org', 'en.wikipedia.org', 'es.wikipedia.org',
      'wikimedia.org', 'wiktionary.org', 'wikibooks.org',
      'britannica.com', 'masterclass.com',
      'futurelearn.com', 'open.edu',
      'canvas.instructure.com', 'blackboard.com', 'moodle.org',
      'platzi.com', 'domestika.org', 'crehana.com',
      'lynda.com', 'linkedin.com/learning',
      'class-central.com', 'mit.edu', 'stanford.edu', 'harvard.edu',
    ],
    urlPatterns: ['/course/', '/learn/', '/lesson/', '/lecture/', '/class/', '/curriculum/', '/module/', '/quiz/'],
    keywords: [
      'learn', 'course', 'education', 'tutorial', 'study',
      'university', 'school', 'student', 'teacher', 'lecture',
      'academic', 'training', 'certification', 'degree', 'syllabus',
      'curriculum', 'exam', 'homework', 'classroom',
    ],
  },

  // 7 ── Finance ───────────────────────────────────────────────────────────
  {
    id: 'finance',
    name: 'Finance',
    nameEs: 'Finanzas',
    emoji: '💰',
    color: '#FFC107',
    domains: [
      'paypal.com', 'venmo.com', 'wise.com', 'stripe.com',
      'chase.com', 'bankofamerica.com', 'wellsfargo.com',
      'citibank.com', 'capitalone.com',
      'fidelity.com', 'vanguard.com', 'schwab.com',
      'robinhood.com', 'etrade.com', 'tdameritrade.com',
      'coinbase.com', 'binance.com', 'kraken.com', 'crypto.com',
      'mint.com', 'creditkarma.com',
      'finance.yahoo.com', 'marketwatch.com', 'investopedia.com',
      'nerdwallet.com', 'bankrate.com',
      'hsbc.com', 'bbva.com', 'santander.com',
      'revolut.com', 'n26.com', 'monzo.com',
      'mercadopago.com', 'nubank.com.br',
      'sofi.com', 'wealthfront.com', 'betterment.com',
      'blockchainfo.com', 'etherscan.io',
    ],
    urlPatterns: ['/banking/', '/invest/', '/trade/', '/portfolio/', '/account/', '/transfer/', '/wallet/', '/markets/'],
    keywords: [
      'bank', 'finance', 'money', 'invest', 'stock', 'crypto',
      'payment', 'loan', 'credit', 'budget', 'savings', 'trading',
      'market', 'insurance', 'mortgage', 'dividend', 'portfolio',
      'bitcoin', 'ethereum', 'blockchain', 'fintech',
    ],
  },

  // 8 ── Productivity ──────────────────────────────────────────────────────
  {
    id: 'productivity',
    name: 'Productivity',
    nameEs: 'Productividad',
    emoji: '✉️',
    color: '#607D8B',
    domains: [
      'gmail.com', 'mail.google.com', 'outlook.com', 'outlook.live.com',
      'mail.yahoo.com', 'protonmail.com', 'proton.me',
      'docs.google.com', 'drive.google.com', 'sheets.google.com',
      'slides.google.com', 'calendar.google.com', 'keep.google.com',
      'office.com', 'microsoft365.com', 'onedrive.live.com',
      'notion.so', 'evernote.com', 'todoist.com',
      'trello.com', 'asana.com', 'monday.com', 'clickup.com',
      'basecamp.com', 'slack.com',
      'zoom.us', 'teams.microsoft.com', 'meet.google.com',
      'airtable.com', 'miro.com', 'figma.com', 'canva.com',
      'dropbox.com', 'box.com', 'wetransfer.com',
      'grammarly.com', 'calendly.com', 'loom.com',
      'linear.app', 'jira.atlassian.com', 'confluence.atlassian.com',
    ],
    urlPatterns: ['/inbox/', '/compose/', '/calendar/', '/doc/', '/spreadsheet/', '/presentation/', '/board/', '/workspace/'],
    keywords: [
      'email', 'mail', 'document', 'spreadsheet', 'calendar',
      'meeting', 'task', 'project', 'collaborate', 'workspace',
      'productivity', 'organize', 'schedule', 'notes', 'team',
      'workflow', 'kanban', 'sprint', 'deadline', 'agenda',
    ],
  },

  // 9 ── Research ──────────────────────────────────────────────────────────
  {
    id: 'research',
    name: 'Research',
    nameEs: 'Investigación',
    emoji: '🔬',
    color: '#795548',
    domains: [
      'scholar.google.com', 'pubmed.ncbi.nlm.nih.gov',
      'arxiv.org', 'jstor.org', 'sciencedirect.com',
      'springer.com', 'link.springer.com', 'wiley.com',
      'nature.com', 'science.org', 'cell.com',
      'researchgate.net', 'semanticscholar.org',
      'scopus.com', 'webofscience.com',
      'crossref.org', 'doi.org', 'orcid.org',
      'biorxiv.org', 'medrxiv.org', 'ssrn.com',
      'plos.org', 'journals.plos.org', 'frontiersin.org', 'mdpi.com',
      'ncbi.nlm.nih.gov', 'clinicaltrials.gov',
      'dimensions.ai', 'connectedpapers.com', 'lens.org',
      'ieee.org', 'ieeexplore.ieee.org', 'acm.org', 'dl.acm.org',
    ],
    urlPatterns: ['/paper/', '/abstract/', '/citation/', '/doi/', '/journal/', '/publication/', '/article/10.', '/fulltext/'],
    keywords: [
      'research', 'paper', 'journal', 'study', 'scientific',
      'experiment', 'thesis', 'citation', 'peer-reviewed',
      'publication', 'methodology', 'hypothesis', 'analysis',
      'dissertation', 'preprint', 'abstract', 'conference',
    ],
  },

  // 10 ── Gaming ───────────────────────────────────────────────────────────
  {
    id: 'gaming',
    name: 'Gaming',
    nameEs: 'Videojuegos',
    emoji: '🎮',
    color: '#FF5722',
    domains: [
      'store.steampowered.com', 'steampowered.com', 'steamcommunity.com',
      'epicgames.com', 'playstation.com', 'xbox.com', 'nintendo.com',
      'roblox.com', 'itch.io', 'gog.com', 'humblebundle.com',
      'ea.com', 'ubisoft.com', 'ign.com', 'gamespot.com',
      'kotaku.com', 'polygon.com', 'pcgamer.com',
      'rockstargames.com', 'blizzard.com', 'battle.net',
      'riot.com', 'riotgames.com', 'leagueoflegends.com',
      'minecraft.net', 'curseforge.com', 'nexusmods.com',
      'rawg.io', 'howlongtobeat.com', 'gamebanana.com',
      'gamefaqs.gamespot.com', 'gamesradar.com',
    ],
    urlPatterns: ['/game/', '/games/', '/store/', '/app/', '/review/', '/mod/', '/mods/', '/wiki/', '/walkthrough/'],
    keywords: [
      'game', 'gaming', 'play', 'gamer', 'esports', 'console',
      'pc game', 'multiplayer', 'rpg', 'fps', 'mmorpg',
      'indie game', 'mod', 'walkthrough', 'cheat', 'controller',
      'playthrough', 'speedrun', 'dlc', 'patch', 'update',
    ],
  },

  // 11 ── Government ───────────────────────────────────────────────────────
  {
    id: 'government',
    name: 'Government',
    nameEs: 'Gobierno',
    emoji: '🏛️',
    color: '#3F51B5',
    domains: [
      'whitehouse.gov', 'usa.gov', 'congress.gov', 'irs.gov',
      'ssa.gov', 'cdc.gov', 'nih.gov', 'fda.gov', 'nasa.gov',
      'epa.gov', 'fbi.gov', 'dhs.gov', 'state.gov',
      'europa.eu', 'who.int', 'un.org', 'worldbank.org', 'imf.org',
      'data.gov', 'census.gov', 'bls.gov',
      'gob.mx', 'gob.cl', 'gob.ar', 'gob.pe', 'gob.es',
      'gov.uk', 'gov.au', 'gc.ca', 'india.gov.in',
    ],
    urlPatterns: ['/services/', '/forms/', '/regulations/', '/policy/', '/laws/', '/act/'],
    keywords: [
      'government', 'federal', 'state', 'public', 'regulation',
      'law', 'policy', 'congress', 'senate', 'ministry',
      'official', 'municipal', 'civic', 'legislation', 'statute',
      'executive order', 'public service',
    ],
  },

  // 12 ── Health ───────────────────────────────────────────────────────────
  {
    id: 'health',
    name: 'Health & Wellness',
    nameEs: 'Salud y Bienestar',
    emoji: '🏥',
    color: '#E91E63',
    domains: [
      'webmd.com', 'mayoclinic.org', 'healthline.com',
      'medlineplus.gov', 'clevelandclinic.org',
      'drugs.com', 'rxlist.com', 'goodrx.com',
      'zocdoc.com', 'myfitnesspal.com', 'fitbit.com', 'strava.com',
      'nhs.uk', 'psychologytoday.com',
      'verywellhealth.com', 'verywellmind.com', 'verywellfit.com',
      'everydayhealth.com', 'medicalnewstoday.com',
      'nih.gov', 'who.int',
      'peloton.com', 'nike.com/training', 'headspace.com', 'calm.com',
    ],
    urlPatterns: ['/health/', '/medical/', '/symptoms/', '/treatment/', '/wellness/', '/fitness/', '/condition/', '/drug/'],
    keywords: [
      'health', 'medical', 'doctor', 'symptom', 'treatment',
      'medicine', 'therapy', 'diagnosis', 'wellness', 'fitness',
      'nutrition', 'diet', 'exercise', 'hospital', 'clinic',
      'mental health', 'anxiety', 'depression', 'vaccine',
    ],
  },

  // 13 ── Travel ───────────────────────────────────────────────────────────
  {
    id: 'travel',
    name: 'Travel',
    nameEs: 'Viajes',
    emoji: '✈️',
    color: '#009688',
    domains: [
      'booking.com', 'airbnb.com', 'expedia.com', 'hotels.com',
      'tripadvisor.com', 'kayak.com', 'skyscanner.com',
      'priceline.com', 'vrbo.com', 'agoda.com', 'hostelworld.com',
      'maps.google.com', 'google.com/maps', 'waze.com',
      'uber.com', 'lyft.com',
      'flightradar24.com', 'rome2rio.com', 'lonelyplanet.com',
      'despegar.com', 'decolar.com', 'latam.com',
      'united.com', 'delta.com', 'aa.com', 'southwest.com',
      'ryanair.com', 'easyjet.com', 'britishairways.com',
    ],
    urlPatterns: ['/flights/', '/hotels/', '/booking/', '/destination/', '/travel/', '/trip/', '/itinerary/'],
    keywords: [
      'travel', 'flight', 'hotel', 'booking', 'vacation', 'trip',
      'tourism', 'destination', 'airport', 'airline', 'resort',
      'hostel', 'cruise', 'passport', 'visa', 'backpacking',
      'road trip', 'sightseeing',
    ],
  },

  // 14 ── Recipes ──────────────────────────────────────────────────────────
  {
    id: 'recipes',
    name: 'Recipes & Food',
    nameEs: 'Recetas y Cocina',
    emoji: '🍳',
    color: '#8BC34A',
    domains: [
      'allrecipes.com', 'food.com', 'epicurious.com',
      'simplyrecipes.com', 'tasty.co', 'delish.com',
      'bonappetit.com', 'seriouseats.com', 'foodnetwork.com',
      'cookpad.com', 'yummly.com',
      'minimalistbaker.com', 'skinnytaste.com', 'budgetbytes.com',
      'pinchofyum.com', 'sallysbakingaddiction.com',
      'kingarthurbaking.com', 'food52.com', 'thekitchn.com',
      'myrecipes.com', 'tasteofhome.com', 'eatingwell.com',
    ],
    urlPatterns: ['/recipe/', '/recipes/', '/cooking/', '/baking/', '/meal/', '/ingredient/'],
    keywords: [
      'recipe', 'cook', 'baking', 'food', 'ingredient', 'kitchen',
      'meal', 'dinner', 'breakfast', 'lunch', 'dessert',
      'vegetarian', 'vegan', 'gluten-free', 'appetizer',
      'cuisine', 'chef', 'grill', 'soup', 'salad',
    ],
  },

  // 15 ── Other (fallback) ─────────────────────────────────────────────────
  {
    id: 'other',
    name: 'Other',
    nameEs: 'Otros',
    emoji: '📁',
    color: '#9E9E9E',
    domains: [],
    urlPatterns: [],
    keywords: [],
  },
];

// ---------------------------------------------------------------------------
// Internal lookup structures (built once at module load time)
// ---------------------------------------------------------------------------

/**
 * Map of exact domain → category id for O(1) lookups.
 * Entries include both original domains and their `www.`‑stripped forms.
 * Subdomain‑specific domains (e.g. `scholar.google.com`) are stored as‑is.
 * @type {Map<string, string>}
 */
const domainMap = new Map();

/**
 * Ordered list of [domain, categoryId] pairs for subdomain matching.
 * Longer (more‑specific) domains are sorted first so that
 * `scholar.google.com` is checked before `google.com`.
 * @type {Array<[string, string]>}
 */
const subdomainEntries = [];

for (const cat of DEFAULT_CATEGORIES) {
  for (const domain of cat.domains) {
    const stripped = domain.startsWith('www.')
      ? domain.slice(4)
      : domain;

    // Store both the raw domain and the www‑stripped version.
    domainMap.set(stripped, cat.id);
    domainMap.set(domain, cat.id);
  }
}

// Build subdomain entries — used when exact lookup misses.
// We only need entries that could match as a suffix.
for (const [domain, catId] of domainMap) {
  subdomainEntries.push([domain, catId]);
}
// Sort longest first so specific subdomains win.
subdomainEntries.sort((a, b) => b[0].length - a[0].length);

// ---------------------------------------------------------------------------
// TLD patterns for government & education
// ---------------------------------------------------------------------------

/** @type {Array<{ pattern: RegExp, categoryId: string }>} */
const tldRules = [
  { pattern: /\.gov$/i, categoryId: 'government' },
  { pattern: /\.gov\.[a-z]{2}$/i, categoryId: 'government' },
  { pattern: /\.gob\.[a-z]{2}$/i, categoryId: 'government' },
  { pattern: /\.mil$/i, categoryId: 'government' },
  { pattern: /\.go\.jp$/i, categoryId: 'government' },
  { pattern: /\.gouv\.fr$/i, categoryId: 'government' },
  { pattern: /\.gc\.ca$/i, categoryId: 'government' },
  { pattern: /\.edu$/i, categoryId: 'education' },
  { pattern: /\.edu\.[a-z]{2}$/i, categoryId: 'education' },
  { pattern: /\.ac\.[a-z]{2}$/i, categoryId: 'education' },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Finds a category by exact domain or subdomain match.
 *
 * Accepts either a bare hostname (`docs.google.com`) or a full URL
 * (`https://docs.google.com/document/d/…`).
 *
 * Matching order:
 * 1. Exact match (after stripping `www.`)
 * 2. Subdomain suffix match (longest match wins)
 * 3. TLD pattern fallback (`.gov`, `.edu`, etc.)
 *
 * @param {string} hostnameOrUrl - Hostname or full URL.
 * @returns {string|null} Category id, or `null` if no match.
 */
export function findCategoryByDomain(hostnameOrUrl) {
  if (!hostnameOrUrl) return null;

  // Extract hostname if a full URL was provided.
  let hostname = hostnameOrUrl;
  if (hostname.includes('://')) {
    try {
      hostname = new URL(hostname).hostname;
    } catch {
      return null;
    }
  }

  // Normalise: lowercase and strip `www.`.
  hostname = hostname.toLowerCase().replace(/^www\./, '');

  // 1. Exact match
  const exact = domainMap.get(hostname);
  if (exact) return exact;

  // 2. Subdomain suffix match (e.g., "foo.scholar.google.com" matches "scholar.google.com")
  for (const [domain, catId] of subdomainEntries) {
    if (hostname === domain || hostname.endsWith('.' + domain)) {
      return catId;
    }
  }

  // 3. TLD pattern fallback
  for (const rule of tldRules) {
    if (rule.pattern.test(hostname)) {
      return rule.categoryId;
    }
  }

  return null;
}

/**
 * Checks URL path patterns against known category patterns.
 *
 * @param {string} url - Full URL string.
 * @returns {string|null} Category id, or `null` if no path pattern matches.
 */
export function findCategoryByURL(url) {
  if (!url) return null;

  let path;
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    // If URL parsing fails, try using the raw string.
    path = url.toLowerCase();
  }

  for (const cat of DEFAULT_CATEGORIES) {
    if (!cat.urlPatterns || cat.urlPatterns.length === 0) continue;

    for (const pattern of cat.urlPatterns) {
      if (path.includes(pattern.toLowerCase())) {
        return cat.id;
      }
    }
  }

  return null;
}

/**
 * Analyses a text string (title, description, etc.) for keyword matches
 * against all category keyword lists.  Returns the category with the most
 * matching keywords.
 *
 * @param {string} text - Text to analyse.
 * @returns {string|null} Category id, or `null` if no keywords match.
 */
export function findCategoryByKeywords(text) {
  if (!text) return null;

  const lower = text.toLowerCase();

  let bestCatId = null;
  let bestCount = 0;

  for (const cat of DEFAULT_CATEGORIES) {
    if (!cat.keywords || cat.keywords.length === 0) continue;

    let count = 0;
    for (const kw of cat.keywords) {
      if (lower.includes(kw)) {
        count++;
      }
    }

    if (count > bestCount) {
      bestCount = count;
      bestCatId = cat.id;
    }
  }

  return bestCount > 0 ? bestCatId : null;
}

/**
 * Looks up a category by its id, searching default categories first and
 * then the optional `customCategories` array.
 *
 * @param {string}     id
 * @param {Category[]} [customCategories=[]]
 * @returns {Category|undefined}
 */
export function getCategoryById(id, customCategories = []) {
  const found = DEFAULT_CATEGORIES.find((c) => c.id === id);
  if (found) return found;

  return customCategories.find((c) => c.id === id);
}

/**
 * Returns the full list of categories: defaults + any custom categories.
 *
 * @param {Category[]} [customCategories=[]]
 * @returns {Category[]}
 */
export function getAllCategories(customCategories = []) {
  return [...DEFAULT_CATEGORIES, ...customCategories];
}
