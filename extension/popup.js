/* ============================================================
   BookmarkIQ — Chrome Extension Popup Logic (Self-Contained)
   
   This file is fully standalone: it includes the domain database,
   categorization engine, Gemini API client, and all UI logic.
   No ES module imports — compatible with Chrome MV3 popup context.
   ============================================================ */

// =============================================================
// 1. BUILT-IN CATEGORY DATABASE
// =============================================================

const CATEGORIES = [
  {
    id: 'social-media',
    name: 'Social Media',
    nameEs: 'Redes Sociales',
    emoji: '🌐',
    color: '#E91E63',
    domains: [
      'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com',
      'reddit.com', 'tiktok.com', 'pinterest.com', 'discord.com', 'snapchat.com',
      'whatsapp.com', 'telegram.org', 'threads.net', 'mastodon.social', 'bluesky.social'
    ],
    keywords: ['social', 'feed', 'profile', 'friends', 'followers', 'posts']
  },
  {
    id: 'video-streaming',
    name: 'Video & Streaming',
    nameEs: 'Video y Streaming',
    emoji: '🎬',
    color: '#FF5722',
    domains: [
      'youtube.com', 'netflix.com', 'twitch.tv', 'vimeo.com', 'disneyplus.com',
      'hulu.com', 'hbomax.com', 'max.com', 'primevideo.com', 'crunchyroll.com',
      'peacocktv.com', 'paramountplus.com', 'dailymotion.com', 'rumble.com', 'pluto.tv'
    ],
    keywords: ['video', 'watch', 'stream', 'movie', 'series', 'episode', 'anime']
  },
  {
    id: 'news-media',
    name: 'News & Media',
    nameEs: 'Noticias y Medios',
    emoji: '📰',
    color: '#607D8B',
    domains: [
      'cnn.com', 'bbc.com', 'bbc.co.uk', 'nytimes.com', 'washingtonpost.com',
      'reuters.com', 'apnews.com', 'theguardian.com', 'foxnews.com', 'nbcnews.com',
      'aljazeera.com', 'bloomberg.com', 'cnbc.com', 'news.google.com', 'elpais.com'
    ],
    keywords: ['news', 'article', 'headline', 'breaking', 'report', 'journalist']
  },
  {
    id: 'shopping',
    name: 'Shopping',
    nameEs: 'Compras',
    emoji: '🛒',
    color: '#FF9800',
    domains: [
      'amazon.com', 'amazon.co.uk', 'ebay.com', 'walmart.com', 'target.com',
      'etsy.com', 'aliexpress.com', 'bestbuy.com', 'shopify.com', 'wish.com',
      'mercadolibre.com', 'shein.com', 'costco.com', 'ikea.com', 'wayfair.com'
    ],
    keywords: ['shop', 'buy', 'cart', 'product', 'price', 'deal', 'order', 'store']
  },
  {
    id: 'education',
    name: 'Education & Learning',
    nameEs: 'Educación y Aprendizaje',
    emoji: '📚',
    color: '#4CAF50',
    domains: [
      'coursera.org', 'udemy.com', 'edx.org', 'khanacademy.org', 'duolingo.com',
      'skillshare.com', 'codecademy.com', 'brilliant.org', 'masterclass.com',
      'pluralsight.com', 'linkedin.com/learning', 'ted.com', 'wikipedia.org',
      'scholar.google.com', 'mit.edu'
    ],
    keywords: ['learn', 'course', 'tutorial', 'lesson', 'training', 'education', 'study', 'class']
  },
  {
    id: 'technology',
    name: 'Technology & Dev',
    nameEs: 'Tecnología y Desarrollo',
    emoji: '💻',
    color: '#2196F3',
    domains: [
      'github.com', 'stackoverflow.com', 'gitlab.com', 'dev.to', 'medium.com',
      'hackernews.com', 'news.ycombinator.com', 'techcrunch.com', 'vercel.com',
      'netlify.com', 'npm.js.com', 'pypi.org', 'docker.com', 'aws.amazon.com',
      'cloud.google.com'
    ],
    keywords: ['code', 'developer', 'programming', 'software', 'api', 'framework', 'debug', 'deploy']
  },
  {
    id: 'finance',
    name: 'Finance & Banking',
    nameEs: 'Finanzas y Banca',
    emoji: '💰',
    color: '#4CAF50',
    domains: [
      'paypal.com', 'chase.com', 'bankofamerica.com', 'wellsfargo.com', 'robinhood.com',
      'coinbase.com', 'binance.com', 'fidelity.com', 'schwab.com', 'mint.com',
      'venmo.com', 'wise.com', 'revolut.com', 'stripe.com', 'yahoo.com/finance'
    ],
    keywords: ['bank', 'invest', 'stock', 'crypto', 'trading', 'finance', 'money', 'budget', 'loan']
  },
  {
    id: 'music-audio',
    name: 'Music & Audio',
    nameEs: 'Música y Audio',
    emoji: '🎵',
    color: '#9C27B0',
    domains: [
      'spotify.com', 'music.apple.com', 'soundcloud.com', 'pandora.com', 'deezer.com',
      'music.youtube.com', 'tidal.com', 'bandcamp.com', 'last.fm', 'audible.com',
      'podcasts.apple.com', 'iheart.com', 'genius.com', 'shazam.com'
    ],
    keywords: ['music', 'song', 'album', 'playlist', 'podcast', 'audio', 'listen', 'artist']
  },
  {
    id: 'gaming',
    name: 'Gaming',
    nameEs: 'Juegos',
    emoji: '🎮',
    color: '#00BCD4',
    domains: [
      'store.steampowered.com', 'steampowered.com', 'epicgames.com', 'ign.com',
      'gamespot.com', 'kotaku.com', 'polygon.com', 'roblox.com', 'ea.com',
      'playstation.com', 'xbox.com', 'nintendo.com', 'gog.com', 'twitch.tv', 'pcgamer.com'
    ],
    keywords: ['game', 'gaming', 'play', 'esports', 'gamer', 'console', 'rpg', 'mmorpg']
  },
  {
    id: 'health-fitness',
    name: 'Health & Fitness',
    nameEs: 'Salud y Fitness',
    emoji: '🏃',
    color: '#E91E63',
    domains: [
      'webmd.com', 'mayoclinic.org', 'healthline.com', 'nih.gov', 'fitbit.com',
      'myfitnesspal.com', 'strava.com', 'nhs.uk', 'medlineplus.gov', 'drugs.com',
      'peloton.com', 'nike.com/run', 'who.int', 'cdc.gov'
    ],
    keywords: ['health', 'fitness', 'workout', 'exercise', 'medical', 'diet', 'nutrition', 'wellness']
  },
  {
    id: 'travel',
    name: 'Travel & Maps',
    nameEs: 'Viajes y Mapas',
    emoji: '✈️',
    color: '#00ACC1',
    domains: [
      'booking.com', 'airbnb.com', 'expedia.com', 'tripadvisor.com', 'google.com/maps',
      'maps.google.com', 'kayak.com', 'skyscanner.com', 'hotels.com', 'vrbo.com',
      'rome2rio.com', 'lonelyplanet.com', 'flightradar24.com', 'uber.com', 'lyft.com'
    ],
    keywords: ['travel', 'flight', 'hotel', 'booking', 'trip', 'destination', 'vacation', 'map']
  },
  {
    id: 'food-recipes',
    name: 'Food & Recipes',
    nameEs: 'Comida y Recetas',
    emoji: '🍳',
    color: '#FF7043',
    domains: [
      'allrecipes.com', 'foodnetwork.com', 'epicurious.com', 'bonappetit.com',
      'tasty.co', 'delish.com', 'simplyrecipes.com', 'seriouseats.com',
      'doordash.com', 'ubereats.com', 'grubhub.com', 'yelp.com',
      'cookinglight.com', 'food.com'
    ],
    keywords: ['recipe', 'cook', 'food', 'restaurant', 'meal', 'ingredient', 'kitchen', 'bake']
  },
  {
    id: 'productivity',
    name: 'Productivity & Tools',
    nameEs: 'Productividad y Herramientas',
    emoji: '⚡',
    color: '#FFC107',
    domains: [
      'notion.so', 'trello.com', 'asana.com', 'slack.com', 'zoom.us',
      'figma.com', 'canva.com', 'docs.google.com', 'drive.google.com', 'dropbox.com',
      'airtable.com', 'miro.com', 'todoist.com', 'evernote.com', 'clickup.com'
    ],
    keywords: ['tool', 'productivity', 'workspace', 'organize', 'planner', 'task', 'project', 'collaborate']
  },
  {
    id: 'government',
    name: 'Government & Legal',
    nameEs: 'Gobierno y Legal',
    emoji: '🏛️',
    color: '#546E7A',
    domains: [
      'usa.gov', 'irs.gov', 'ssa.gov', 'whitehouse.gov', 'congress.gov',
      'gob.mx', 'gov.uk', 'europa.eu', 'usps.com', 'uscis.gov',
      'courts.gov', 'justice.gov', 'state.gov', 'fbi.gov'
    ],
    keywords: ['government', 'legal', 'law', 'court', 'tax', 'immigration', 'regulation', 'policy']
  },
  {
    id: 'other',
    name: 'Other',
    nameEs: 'Otros',
    emoji: '📁',
    color: '#78909C',
    domains: [],
    keywords: []
  }
];

// TLD-based category hints
const TLD_CATEGORIES = {
  '.gov': 'government',
  '.mil': 'government',
  '.edu': 'education',
  '.ac.uk': 'education',
  '.edu.mx': 'education'
};

// =============================================================
// 2. CATEGORIZATION ENGINE
// =============================================================

/**
 * Categorize a single bookmark by domain matching, TLD, path, and keyword heuristics.
 * @param {string} title - Bookmark title
 * @param {string} url   - Bookmark URL
 * @returns {string} Category id
 */
function categorizeBookmark(title, url) {
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

    // 4) Title keyword match (weighted: first category with 2+ keyword hits wins)
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
// 3. GEMINI API CLIENT (simplified)
// =============================================================

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const BATCH_SIZE = 30;

/**
 * Sends a batch of uncategorized bookmarks to the Gemini API for classification.
 * @param {Array<{title:string, url:string, index:number}>} bookmarks
 * @param {string} apiKey
 * @returns {Object} Map of bookmark index → category id
 */
async function callGeminiAPI(bookmarks, apiKey) {
  const results = {};
  const categoryList = CATEGORIES.filter(c => c.id !== 'other').map(c => c.id).join(', ');

  // Process in batches
  for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
    const batch = bookmarks.slice(i, i + BATCH_SIZE);
    const bookmarkList = batch.map((b, idx) => `${idx + 1}. "${b.title}" — ${b.url}`).join('\n');

    const prompt = `You are a bookmark classifier. Classify each bookmark into exactly one category.

Available categories: ${categoryList}

Bookmarks:
${bookmarkList}

Respond ONLY with a JSON array of objects, each with "index" (1-based) and "category" (category id from the list). Example:
[{"index":1,"category":"technology"},{"index":2,"category":"shopping"}]`;

    try {
      const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024
          }
        })
      });

      if (!response.ok) {
        console.warn(`Gemini API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON from response (handle markdown code fences)
      const jsonMatch = text.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        for (const item of parsed) {
          const batchIdx = item.index - 1;
          if (batchIdx >= 0 && batchIdx < batch.length) {
            const validCategory = CATEGORIES.find(c => c.id === item.category);
            if (validCategory) {
              results[batch[batchIdx].index] = item.category;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Gemini batch error:', err);
    }
  }

  return results;
}

// =============================================================
// 4. BOOKMARK TREE UTILITIES
// =============================================================

/**
 * Flatten the Chrome bookmark tree into a flat array of bookmark nodes (those with url).
 */
function flattenTree(nodes) {
  const bookmarks = [];
  for (const node of nodes) {
    if (node.url) bookmarks.push(node);
    if (node.children) bookmarks.push(...flattenTree(node.children));
  }
  return bookmarks;
}

// =============================================================
// 5. STATE & DOM REFERENCES
// =============================================================

let currentLang = 'en';
let organizedData = null;   // Holds the result for preview / apply
let backupFolderId = null;  // ID of the backup folder for undo

const $ = (sel) => document.querySelector(sel);

// =============================================================
// 6. VIEW MANAGEMENT
// =============================================================

function showView(viewId) {
  ['home-view', 'processing-view', 'preview-view', 'done-view', 'settings-view'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', id !== viewId);
  });
}

function setProgress(pct, statusText) {
  const fill = $('#progress-fill');
  const status = $('#processing-status');
  if (fill) fill.style.width = `${pct}%`;
  if (status && statusText) status.textContent = statusText;
}

// =============================================================
// 7. INIT
// =============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const stored = await chrome.storage.local.get(['apiKey', 'autoOrganize', 'lang']);
  currentLang = stored.lang || 'en';

  if (stored.apiKey) {
    $('#api-key-input').value = '••••••••••••';
    showKeyStatus('API key saved', 'success');
  }
  if (stored.autoOrganize) {
    $('#auto-organize').checked = true;
  }
  if (stored.lang) {
    $('#lang-select').value = stored.lang;
  }

  // Count bookmarks
  try {
    const tree = await chrome.bookmarks.getTree();
    const allBookmarks = flattenTree(tree);
    $('#total-count').textContent = allBookmarks.length.toLocaleString();
  } catch (err) {
    $('#total-count').textContent = '?';
    console.error('Failed to read bookmarks:', err);
  }

  // --- Event Listeners ---
  $('#organize-btn').addEventListener('click', organizeBookmarks);
  $('#apply-btn').addEventListener('click', () => applyChanges(organizedData));
  $('#cancel-btn').addEventListener('click', () => showView('home-view'));
  $('#export-btn').addEventListener('click', () => exportAsFile(organizedData));
  $('#undo-btn').addEventListener('click', undoChanges);
  $('#settings-btn').addEventListener('click', () => showView('settings-view'));
  $('#back-btn').addEventListener('click', () => showView('home-view'));

  $('#save-key-btn').addEventListener('click', async () => {
    const key = $('#api-key-input').value.trim();
    if (!key || key === '••••••••••••') {
      showKeyStatus('Enter a valid key', 'error');
      return;
    }
    await chrome.storage.local.set({ apiKey: key });
    $('#api-key-input').value = '••••••••••••';
    showKeyStatus('Key saved ✓', 'success');
  });

  $('#auto-organize').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ autoOrganize: e.target.checked });
  });

  $('#lang-select').addEventListener('change', async (e) => {
    currentLang = e.target.value;
    await chrome.storage.local.set({ lang: currentLang });
  });
});

function showKeyStatus(msg, type) {
  const el = $('#key-status');
  el.textContent = msg;
  el.className = type || '';
}

// =============================================================
// 8. ORGANIZE BOOKMARKS (main flow)
// =============================================================

async function organizeBookmarks() {
  showView('processing-view');
  setProgress(5, 'Reading bookmarks...');

  try {
    // 1) Get all bookmarks
    const tree = await chrome.bookmarks.getTree();
    const allBookmarks = flattenTree(tree);

    if (allBookmarks.length === 0) {
      setProgress(100, 'No bookmarks found!');
      setTimeout(() => showView('home-view'), 1500);
      return;
    }

    setProgress(15, `Analyzing ${allBookmarks.length} bookmarks...`);

    // 2) Categorize with heuristics
    const organized = {};
    const uncategorized = []; // bookmarks that ended up as 'other'

    for (const cat of CATEGORIES) {
      organized[cat.id] = { category: cat, bookmarks: [] };
    }

    for (let i = 0; i < allBookmarks.length; i++) {
      const bm = allBookmarks[i];
      const catId = categorizeBookmark(bm.title, bm.url);
      organized[catId].bookmarks.push(bm);

      if (catId === 'other') {
        uncategorized.push({ title: bm.title, url: bm.url, index: i });
      }

      // Update progress (15% → 60%)
      const pct = 15 + Math.round((i / allBookmarks.length) * 45);
      if (i % 20 === 0) setProgress(pct, `Categorized ${i + 1} / ${allBookmarks.length}...`);
    }

    setProgress(60, 'Heuristic pass complete...');

    // 3) AI enhancement for uncategorized (if API key exists)
    const { apiKey } = await chrome.storage.local.get('apiKey');
    if (apiKey && apiKey !== '••••••••••••' && uncategorized.length > 0) {
      setProgress(65, `Enhancing ${uncategorized.length} bookmarks with AI...`);

      try {
        const aiResults = await callGeminiAPI(uncategorized, apiKey);

        // Re-assign bookmarks based on AI results
        for (const [idxStr, catId] of Object.entries(aiResults)) {
          const idx = parseInt(idxStr, 10);
          const bm = allBookmarks[idx];
          if (bm && catId !== 'other') {
            // Remove from 'other'
            const otherList = organized['other'].bookmarks;
            const otherIdx = otherList.findIndex(b => b.id === bm.id);
            if (otherIdx !== -1) otherList.splice(otherIdx, 1);

            // Add to correct category
            organized[catId].bookmarks.push(bm);
          }
        }
      } catch (err) {
        console.warn('AI enhancement failed, using heuristic results:', err);
      }
    }

    setProgress(90, 'Preparing preview...');

    // 4) Filter out empty categories (except 'other')
    organizedData = organized;
    renderPreview(organized);

    setProgress(100, 'Done!');
    setTimeout(() => showView('preview-view'), 300);

  } catch (err) {
    console.error('Organize failed:', err);
    setProgress(100, `Error: ${err.message}`);
    setTimeout(() => showView('home-view'), 2000);
  }
}

// =============================================================
// 9. RENDER PREVIEW
// =============================================================

function renderPreview(organized) {
  const container = $('#preview-tree');
  container.innerHTML = '';

  // Sort categories: most bookmarks first, 'other' last
  const sortedCats = Object.values(organized)
    .filter(g => g.bookmarks.length > 0)
    .sort((a, b) => {
      if (a.category.id === 'other') return 1;
      if (b.category.id === 'other') return -1;
      return b.bookmarks.length - a.bookmarks.length;
    });

  if (sortedCats.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted);">No bookmarks to organize.</p>';
    return;
  }

  for (const group of sortedCats) {
    const cat = group.category;
    const bms = group.bookmarks;
    const catName = currentLang === 'es' ? cat.nameEs : cat.name;

    const groupEl = document.createElement('div');
    groupEl.className = 'category-group';

    // Header
    const headerEl = document.createElement('div');
    headerEl.className = 'category-header';
    headerEl.innerHTML = `
      <span class="category-dot" style="background:${cat.color}"></span>
      <span class="category-name">${cat.emoji} ${catName}</span>
      <span class="category-count">${bms.length}</span>
    `;

    // Items container
    const itemsEl = document.createElement('div');
    itemsEl.className = 'category-items';

    // Show first 3 bookmarks
    const preview = bms.slice(0, 3);
    for (const bm of preview) {
      const itemEl = document.createElement('div');
      itemEl.className = 'bookmark-item';
      itemEl.textContent = bm.title || new URL(bm.url).hostname;
      itemsEl.appendChild(itemEl);
    }

    // Show '+ N more' if needed
    if (bms.length > 3) {
      const moreEl = document.createElement('div');
      moreEl.className = 'more-items';
      moreEl.textContent = `+ ${bms.length - 3} more`;
      itemsEl.appendChild(moreEl);
    }

    // Toggle collapse on header click
    headerEl.addEventListener('click', () => {
      itemsEl.classList.toggle('collapsed');
    });

    groupEl.appendChild(headerEl);
    groupEl.appendChild(itemsEl);
    container.appendChild(groupEl);
  }
}

// =============================================================
// 10. APPLY CHANGES
// =============================================================

async function applyChanges(organized) {
  if (!organized) return;

  showView('processing-view');
  setProgress(5, 'Creating backup...');

  try {
    // 1) Create backup folder in "Other Bookmarks" (id: '2')
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    const backupFolder = await chrome.bookmarks.create({
      parentId: '2',
      title: `📋 Backup (${dateStr} ${timeStr})`
    });
    backupFolderId = backupFolder.id;

    // 2) Get all current top-level items in Bookmarks Bar (id: '1')
    const barChildren = await chrome.bookmarks.getChildren('1');

    setProgress(15, 'Backing up existing bookmarks...');

    // Move each top-level item into the backup folder (preserving structure)
    for (let i = 0; i < barChildren.length; i++) {
      await chrome.bookmarks.move(barChildren[i].id, { parentId: backupFolder.id });
      const pct = 15 + Math.round((i / barChildren.length) * 30);
      setProgress(pct, `Backing up ${i + 1} / ${barChildren.length}...`);
    }

    setProgress(50, 'Creating category folders...');

    // 3) Create category folders and move bookmarks
    const sortedCats = Object.values(organized)
      .filter(g => g.bookmarks.length > 0 && g.category.id !== 'other')
      .sort((a, b) => b.bookmarks.length - a.bookmarks.length);

    let totalMoved = 0;
    const totalToMove = sortedCats.reduce((sum, g) => sum + g.bookmarks.length, 0);

    for (const group of sortedCats) {
      const cat = group.category;
      const catName = currentLang === 'es' ? cat.nameEs : cat.name;
      const folderTitle = `${cat.emoji} ${catName}`;

      const folder = await chrome.bookmarks.create({
        parentId: '1',
        title: folderTitle
      });

      for (const bm of group.bookmarks) {
        try {
          await chrome.bookmarks.move(bm.id, { parentId: folder.id });
          totalMoved++;
          const pct = 50 + Math.round((totalMoved / totalToMove) * 45);
          if (totalMoved % 10 === 0) setProgress(pct, `Moving bookmarks... ${totalMoved}/${totalToMove}`);
        } catch (moveErr) {
          console.warn(`Failed to move bookmark ${bm.id}:`, moveErr);
        }
      }
    }

    // 4) Handle 'other' — create folder only if there are uncategorized bookmarks
    const otherGroup = organized['other'];
    if (otherGroup && otherGroup.bookmarks.length > 0) {
      const otherName = currentLang === 'es' ? 'Otros' : 'Other';
      const otherFolder = await chrome.bookmarks.create({
        parentId: '1',
        title: `📁 ${otherName}`
      });
      for (const bm of otherGroup.bookmarks) {
        try {
          await chrome.bookmarks.move(bm.id, { parentId: otherFolder.id });
        } catch { /* already moved or deleted */ }
      }
    }

    // Save state for undo
    await chrome.storage.local.set({ lastBackupFolderId: backupFolderId });

    setProgress(100, 'Done!');

    // Show done view
    const catCount = sortedCats.length + (otherGroup?.bookmarks.length > 0 ? 1 : 0);
    const totalBm = Object.values(organized).reduce((s, g) => s + g.bookmarks.length, 0);
    $('#done-summary').textContent = `${totalBm} bookmarks organized into ${catCount} categories.`;

    setTimeout(() => showView('done-view'), 400);

  } catch (err) {
    console.error('Apply failed:', err);
    setProgress(100, `Error: ${err.message}`);
    setTimeout(() => showView('home-view'), 2000);
  }
}

// =============================================================
// 11. UNDO CHANGES
// =============================================================

async function undoChanges() {
  showView('processing-view');
  setProgress(10, 'Restoring from backup...');

  try {
    const { lastBackupFolderId } = await chrome.storage.local.get('lastBackupFolderId');
    const folderId = lastBackupFolderId || backupFolderId;

    if (!folderId) {
      setProgress(100, 'No backup found to restore.');
      setTimeout(() => showView('home-view'), 1500);
      return;
    }

    // 1) Remove all current items in Bookmarks Bar
    const barChildren = await chrome.bookmarks.getChildren('1');
    for (const child of barChildren) {
      if (child.id === folderId) continue; // Don't delete the backup itself if it's here
      try {
        await chrome.bookmarks.removeTree(child.id);
      } catch { /* ignore */ }
    }

    setProgress(40, 'Moving bookmarks back...');

    // 2) Move backup contents back to Bookmarks Bar
    const backupChildren = await chrome.bookmarks.getChildren(folderId);
    for (let i = 0; i < backupChildren.length; i++) {
      await chrome.bookmarks.move(backupChildren[i].id, { parentId: '1' });
      const pct = 40 + Math.round((i / backupChildren.length) * 50);
      setProgress(pct, `Restoring ${i + 1} / ${backupChildren.length}...`);
    }

    // 3) Remove empty backup folder
    try {
      await chrome.bookmarks.removeTree(folderId);
    } catch { /* ignore */ }

    await chrome.storage.local.remove('lastBackupFolderId');
    backupFolderId = null;

    setProgress(100, 'Restored!');
    $('#done-summary').textContent = 'Bookmarks restored to their original state.';
    setTimeout(() => showView('home-view'), 1000);

  } catch (err) {
    console.error('Undo failed:', err);
    setProgress(100, `Error: ${err.message}`);
    setTimeout(() => showView('home-view'), 2000);
  }
}

// =============================================================
// 12. EXPORT AS HTML FILE
// =============================================================

function exportAsFile(organized) {
  if (!organized) return;

  // Build Netscape Bookmark File format
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>BookmarkIQ Export</TITLE>
<H1>BookmarkIQ Export</H1>
<DL><p>\n`;

  const sortedCats = Object.values(organized)
    .filter(g => g.bookmarks.length > 0)
    .sort((a, b) => {
      if (a.category.id === 'other') return 1;
      if (b.category.id === 'other') return -1;
      return b.bookmarks.length - a.bookmarks.length;
    });

  for (const group of sortedCats) {
    const cat = group.category;
    const catName = currentLang === 'es' ? cat.nameEs : cat.name;
    html += `    <DT><H3>${cat.emoji} ${catName}</H3>\n`;
    html += `    <DL><p>\n`;
    for (const bm of group.bookmarks) {
      const safeTitle = escapeHtml(bm.title || bm.url);
      const safeUrl = escapeHtml(bm.url);
      html += `        <DT><A HREF="${safeUrl}">${safeTitle}</A>\n`;
    }
    html += `    </DL><p>\n`;
  }

  html += `</DL><p>\n`;

  // Trigger download
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bookmarkiq-export-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
