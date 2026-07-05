/* ============================================================
   BookmarkIQ — Background Service Worker
   
   Handles auto-categorization of newly created bookmarks.
   Includes the same mini domain database and categorization
   logic as popup.js (self-contained, no module imports).
   ============================================================ */

// =============================================================
// 1. MINI DOMAIN DATABASE (mirrors popup.js)
// =============================================================

const CATEGORIES = [
  { id: 'social-media', name: 'Social Media', nameEs: 'Redes Sociales', emoji: '🌐', color: '#E91E63', domains: ['facebook.com','instagram.com','twitter.com','x.com','linkedin.com','reddit.com','tiktok.com','pinterest.com','discord.com','snapchat.com','whatsapp.com','telegram.org','threads.net','mastodon.social','bluesky.social'], keywords: ['social','feed','profile','friends','followers'] },
  { id: 'video-streaming', name: 'Video & Streaming', nameEs: 'Video y Streaming', emoji: '🎬', color: '#FF5722', domains: ['youtube.com','netflix.com','twitch.tv','vimeo.com','disneyplus.com','hulu.com','hbomax.com','max.com','primevideo.com','crunchyroll.com','peacocktv.com','paramountplus.com','dailymotion.com','rumble.com','pluto.tv'], keywords: ['video','watch','stream','movie','series'] },
  { id: 'news-media', name: 'News & Media', nameEs: 'Noticias y Medios', emoji: '📰', color: '#607D8B', domains: ['cnn.com','bbc.com','bbc.co.uk','nytimes.com','washingtonpost.com','reuters.com','apnews.com','theguardian.com','foxnews.com','nbcnews.com','aljazeera.com','bloomberg.com','cnbc.com','news.google.com','elpais.com'], keywords: ['news','article','headline','breaking'] },
  { id: 'shopping', name: 'Shopping', nameEs: 'Compras', emoji: '🛒', color: '#FF9800', domains: ['amazon.com','amazon.co.uk','ebay.com','walmart.com','target.com','etsy.com','aliexpress.com','bestbuy.com','shopify.com','wish.com','mercadolibre.com','shein.com','costco.com','ikea.com','wayfair.com'], keywords: ['shop','buy','cart','product','price','deal'] },
  { id: 'education', name: 'Education & Learning', nameEs: 'Educación y Aprendizaje', emoji: '📚', color: '#4CAF50', domains: ['coursera.org','udemy.com','edx.org','khanacademy.org','duolingo.com','skillshare.com','codecademy.com','brilliant.org','masterclass.com','pluralsight.com','ted.com','wikipedia.org','scholar.google.com','mit.edu'], keywords: ['learn','course','tutorial','lesson','education'] },
  { id: 'technology', name: 'Technology & Dev', nameEs: 'Tecnología y Desarrollo', emoji: '💻', color: '#2196F3', domains: ['github.com','stackoverflow.com','gitlab.com','dev.to','medium.com','news.ycombinator.com','techcrunch.com','vercel.com','netlify.com','npm.js.com','pypi.org','docker.com','aws.amazon.com','cloud.google.com'], keywords: ['code','developer','programming','software','api'] },
  { id: 'finance', name: 'Finance & Banking', nameEs: 'Finanzas y Banca', emoji: '💰', color: '#4CAF50', domains: ['paypal.com','chase.com','bankofamerica.com','wellsfargo.com','robinhood.com','coinbase.com','binance.com','fidelity.com','schwab.com','mint.com','venmo.com','wise.com','revolut.com','stripe.com'], keywords: ['bank','invest','stock','crypto','trading','finance'] },
  { id: 'music-audio', name: 'Music & Audio', nameEs: 'Música y Audio', emoji: '🎵', color: '#9C27B0', domains: ['spotify.com','music.apple.com','soundcloud.com','pandora.com','deezer.com','music.youtube.com','tidal.com','bandcamp.com','last.fm','audible.com','podcasts.apple.com','genius.com'], keywords: ['music','song','album','playlist','podcast'] },
  { id: 'gaming', name: 'Gaming', nameEs: 'Juegos', emoji: '🎮', color: '#00BCD4', domains: ['store.steampowered.com','steampowered.com','epicgames.com','ign.com','gamespot.com','kotaku.com','polygon.com','roblox.com','ea.com','playstation.com','xbox.com','nintendo.com','gog.com','pcgamer.com'], keywords: ['game','gaming','play','esports'] },
  { id: 'health-fitness', name: 'Health & Fitness', nameEs: 'Salud y Fitness', emoji: '🏃', color: '#E91E63', domains: ['webmd.com','mayoclinic.org','healthline.com','nih.gov','fitbit.com','myfitnesspal.com','strava.com','nhs.uk','medlineplus.gov','drugs.com','peloton.com','who.int','cdc.gov'], keywords: ['health','fitness','workout','exercise','medical'] },
  { id: 'travel', name: 'Travel & Maps', nameEs: 'Viajes y Mapas', emoji: '✈️', color: '#00ACC1', domains: ['booking.com','airbnb.com','expedia.com','tripadvisor.com','maps.google.com','kayak.com','skyscanner.com','hotels.com','vrbo.com','uber.com','lyft.com'], keywords: ['travel','flight','hotel','booking','trip'] },
  { id: 'food-recipes', name: 'Food & Recipes', nameEs: 'Comida y Recetas', emoji: '🍳', color: '#FF7043', domains: ['allrecipes.com','foodnetwork.com','epicurious.com','bonappetit.com','tasty.co','delish.com','simplyrecipes.com','seriouseats.com','doordash.com','ubereats.com','grubhub.com','yelp.com'], keywords: ['recipe','cook','food','restaurant','meal'] },
  { id: 'productivity', name: 'Productivity & Tools', nameEs: 'Productividad y Herramientas', emoji: '⚡', color: '#FFC107', domains: ['notion.so','trello.com','asana.com','slack.com','zoom.us','figma.com','canva.com','docs.google.com','drive.google.com','dropbox.com','airtable.com','miro.com','todoist.com','evernote.com','clickup.com'], keywords: ['tool','productivity','workspace','organize'] },
  { id: 'government', name: 'Government & Legal', nameEs: 'Gobierno y Legal', emoji: '🏛️', color: '#546E7A', domains: ['usa.gov','irs.gov','ssa.gov','whitehouse.gov','congress.gov','gob.mx','gov.uk','europa.eu','uscis.gov','justice.gov','state.gov'], keywords: ['government','legal','law','court','tax'] },
  { id: 'other', name: 'Other', nameEs: 'Otros', emoji: '📁', color: '#78909C', domains: [], keywords: [] }
];

const TLD_CATEGORIES = {
  '.gov': 'government',
  '.mil': 'government',
  '.edu': 'education',
  '.ac.uk': 'education',
  '.edu.mx': 'education'
};

// =============================================================
// 2. CATEGORIZATION FUNCTION
// =============================================================

/**
 * Categorize a bookmark by domain, TLD, path, and keyword matching.
 * @param {string} url   - Bookmark URL
 * @param {string} title - Bookmark title
 * @returns {string} Category id
 */
function categorizeByDomain(url, title) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const fullPath = (urlObj.pathname + urlObj.search).toLowerCase();
    const titleLower = (title || '').toLowerCase();

    // 1) Direct domain match
    for (const cat of CATEGORIES) {
      if (cat.id === 'other') continue;
      for (const domain of cat.domains) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          return cat.id;
        }
      }
    }

    // 2) TLD match
    for (const [tld, catId] of Object.entries(TLD_CATEGORIES)) {
      if (hostname.endsWith(tld)) return catId;
    }

    // 3) Path-based heuristics
    if (fullPath.includes('/shop') || fullPath.includes('/product') || fullPath.includes('/cart')) return 'shopping';
    if (fullPath.includes('/recipe') || fullPath.includes('/cook')) return 'food-recipes';
    if (fullPath.includes('/video') || fullPath.includes('/watch')) return 'video-streaming';
    if (fullPath.includes('/learn') || fullPath.includes('/course') || fullPath.includes('/tutorial')) return 'education';
    if (fullPath.includes('/news') || fullPath.includes('/article')) return 'news-media';

    // 4) Title keyword match
    let bestMatch = null;
    let bestScore = 0;
    for (const cat of CATEGORIES) {
      if (cat.id === 'other' || !cat.keywords.length) continue;
      let score = 0;
      for (const kw of cat.keywords) {
        if (titleLower.includes(kw)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = cat.id;
      }
    }
    if (bestScore >= 1) return bestMatch;

    return 'other';
  } catch {
    return 'other';
  }
}

// =============================================================
// 3. FOLDER MANAGEMENT
// =============================================================

/**
 * Find an existing category folder in the Bookmarks Bar, or create one.
 * Matches by emoji + name pattern (e.g., "📚 Education & Learning").
 * @param {string} categoryId
 * @returns {Promise<chrome.bookmarks.BookmarkTreeNode>}
 */
async function findOrCreateCategoryFolder(categoryId) {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return null;

  // Get user language preference
  const { lang } = await chrome.storage.local.get('lang');
  const catName = lang === 'es' ? cat.nameEs : cat.name;
  const folderTitle = `${cat.emoji} ${catName}`;

  // Search in Bookmarks Bar (id: '1')
  const barChildren = await chrome.bookmarks.getChildren('1');

  // Look for a matching folder (by emoji prefix or exact title)
  const existing = barChildren.find(child => {
    if (child.url) return false; // Not a folder
    return child.title === folderTitle || child.title.startsWith(cat.emoji);
  });

  if (existing) return existing;

  // Create new folder
  return await chrome.bookmarks.create({
    parentId: '1',
    title: folderTitle
  });
}

/**
 * Check if a bookmark is already inside a recognized category folder.
 * @param {chrome.bookmarks.BookmarkTreeNode} bookmark
 * @returns {boolean}
 */
async function isAlreadyCategorized(bookmark) {
  if (!bookmark.parentId) return false;

  try {
    const [parent] = await chrome.bookmarks.get(bookmark.parentId);
    if (!parent || parent.parentId !== '1') return false;

    // Check if parent folder title starts with any category emoji
    for (const cat of CATEGORIES) {
      if (cat.id === 'other') continue;
      if (parent.title.startsWith(cat.emoji)) return true;
    }
  } catch {
    // Bookmark or parent may have been deleted
  }

  return false;
}

// =============================================================
// 4. AUTO-ORGANIZE LISTENER
// =============================================================

chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  try {
    // Check if auto-organize is enabled
    const { autoOrganize } = await chrome.storage.local.get('autoOrganize');
    if (!autoOrganize) return;

    // Only process bookmarks with URLs (not folders)
    if (!bookmark.url) return;

    // Don't re-categorize if already in a category folder
    if (await isAlreadyCategorized(bookmark)) return;

    // Categorize
    const categoryId = categorizeByDomain(bookmark.url, bookmark.title);

    // Only move if we found a real category (not 'other')
    if (categoryId && categoryId !== 'other') {
      const folder = await findOrCreateCategoryFolder(categoryId);
      if (folder) {
        await chrome.bookmarks.move(id, { parentId: folder.id });
        console.log(`[BookmarkIQ] Auto-categorized "${bookmark.title}" → ${categoryId}`);
      }
    }
  } catch (err) {
    console.error('[BookmarkIQ] Auto-organize error:', err);
  }
});

// =============================================================
// 5. INSTALLATION HANDLER
// =============================================================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[BookmarkIQ] Extension installed. Welcome!');
    // Set default settings
    chrome.storage.local.set({
      autoOrganize: false,
      lang: 'en'
    });
  }
});
