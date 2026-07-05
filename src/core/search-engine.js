/**
 * @module search-engine
 * @description Local fuzzy text search and Gemini AI semantic search for BookmarkIQ.
 */

/**
 * Calculates a search relevance score for a bookmark against query terms.
 * 
 * Weights:
 * - Title match: 10 points per term found (20 if starts with term)
 * - Tags match: 8 points per term found
 * - URL match: 3 points per term found
 * 
 * @param {Object} bookmark - Bookmark object
 * @param {string[]} queryTerms - Array of lowercased search terms
 * @returns {number} The match score (0 if no matches)
 */
function getMatchScore(bookmark, queryTerms) {
  if (!bookmark || !queryTerms.length) return 0;

  const title = (bookmark.title || '').toLowerCase();
  const url = (bookmark.url || '').toLowerCase();
  const tags = Array.isArray(bookmark.tags) ? bookmark.tags.map(t => t.toLowerCase()) : [];

  let score = 0;
  let matchesAll = true;

  for (const term of queryTerms) {
    let termMatch = false;

    // 1. Title matching (higher weight)
    if (title.includes(term)) {
      termMatch = true;
      score += 10;
      if (title.startsWith(term)) {
        score += 10; // Bonus for starting with term
      }
    }

    // 2. Tags matching
    for (const tag of tags) {
      if (tag === term) {
        termMatch = true;
        score += 8;
      } else if (tag.includes(term)) {
        termMatch = true;
        score += 4;
      }
    }

    // 3. URL matching
    if (url.includes(term)) {
      termMatch = true;
      score += 3;
    }

    if (!termMatch) {
      matchesAll = false;
    }
  }

  // If matches all terms, give a huge boost
  if (matchesAll) {
    score += 50;
  }

  return score;
}

/**
 * Perform a local text search across bookmarks.
 * 
 * @param {Array<Object>} bookmarks - List of bookmarks
 * @param {string} query - The search query
 * @returns {Array<Object>} Sorted list of matching bookmarks
 */
export function fuzzySearch(bookmarks, query) {
  if (!Array.isArray(bookmarks)) return [];
  const cleanQuery = (query || '').toLowerCase().trim();
  if (!cleanQuery) return bookmarks;

  const queryTerms = cleanQuery.split(/\s+/).filter(Boolean);
  if (!queryTerms.length) return bookmarks;

  const scored = bookmarks
    .map(bookmark => {
      const score = getMatchScore(bookmark, queryTerms);
      return { bookmark, score };
    })
    .filter(item => item.score > 0);

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.map(item => item.bookmark);
}

/**
 * Perform an AI-assisted semantic search using Gemini.
 * Sends a pre-filtered list of up to 100 bookmarks to the Gemini API
 * to rank them by semantic relevance.
 * 
 * @param {Array<Object>} bookmarks - List of bookmarks
 * @param {string} query - The search query
 * @param {string} apiKey - Gemini API Key
 * @returns {Promise<Array<Object>>} Top 10 semantically relevant bookmarks
 */
export async function aiSemanticSearch(bookmarks, query, apiKey) {
  if (!Array.isArray(bookmarks) || !bookmarks.length) return [];
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return bookmarks;
  if (!apiKey) throw new Error('API key is required for semantic search');

  // Pre-filter: get up to 100 local matches or simply take a relevant sample
  // to avoid hitting prompt size limits while preserving semantic recall.
  // We include:
  // 1. All bookmarks that have any simple keyword overlap (scored by fuzzySearch)
  // 2. If fewer than 100, pad with remaining bookmarks so Gemini gets a broad view.
  const keywordMatches = fuzzySearch(bookmarks, cleanQuery);
  const selected = [...keywordMatches];
  
  const selectedIds = new Set(selected.map(b => b.id || b.url));
  for (const b of bookmarks) {
    if (selected.length >= 80) break;
    const id = b.id || b.url;
    if (!selectedIds.has(id)) {
      selected.push(b);
      selectedIds.add(id);
    }
  }

  // Build the compact bookmark representation for the prompt
  const compactList = selected.map((b, idx) => {
    return `${idx + 1}. ID: "${b.id || b.url}" | Title: "${b.title || ''}" | Tags: "${(b.tags || []).join(', ')}"`;
  }).join('\n');

  const prompt = `You are a semantic search engine. Given the user's search query, rank the provided bookmarks by semantic relevance.
Return ONLY a JSON array containing the top 10 most relevant bookmark IDs in order of relevance. If fewer than 10 are relevant, return only the relevant ones.
Do not explain, do not add markdown format (except the raw JSON array of strings).

Search Query: "${cleanQuery}"

Bookmarks:
${compactList}

Response Example:
["id1", "id2", "id3"]`;

  const model = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON array from text response
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      console.warn('[search-engine] Could not parse JSON array from Gemini response:', text);
      return keywordMatches.slice(0, 10);
    }

    /** @type {string[]} */
    const matchedIds = JSON.parse(jsonMatch[0]);

    // Map IDs back to full bookmark objects
    const results = [];
    const bookmarkMap = new Map(bookmarks.map(b => [b.id || b.url, b]));

    for (const id of matchedIds) {
      const b = bookmarkMap.get(id);
      if (b) {
        results.push(b);
      }
    }

    return results;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[search-engine] Semantic search failed, falling back to fuzzy search:', error);
    // Fallback to local fuzzy search top results
    return keywordMatches.slice(0, 10);
  }
}
