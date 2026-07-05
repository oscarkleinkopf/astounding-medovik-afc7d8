/**
 * @module tagger
 * Smart tagging module — auto-generates tags from bookmark URLs and titles.
 * 
 * @description Extracts meaningful tags from URL paths, title keywords,
 * known domains, and TLDs. Builds inverted indexes for fast tag-based
 * filtering and popularity queries.
 */

// ─── Constants ──────────────────────────────────────────────────────

/** Maximum tags returned per bookmark. */
const MAX_TAGS_PER_BOOKMARK = 8;

/** Minimum character length for a word to be considered a tag. */
const MIN_TAG_LENGTH = 4;

/**
 * English and Spanish stop words to exclude from tag generation.
 * @type {Set<string>}
 */
const STOP_WORDS = new Set([
  // English
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'has', 'his', 'how', 'its', 'may',
  'new', 'now', 'old', 'see', 'way', 'who', 'did', 'get', 'let', 'say',
  'she', 'too', 'use', 'with', 'this', 'that', 'from', 'they', 'been',
  'have', 'many', 'some', 'them', 'than', 'make', 'like', 'will', 'each',
  'when', 'what', 'your', 'more', 'into', 'just', 'also', 'very', 'about',
  'after', 'being', 'could', 'every', 'would', 'should', 'their', 'which',
  'these', 'those', 'other', 'where', 'there', 'while', 'still', 'most',
  'only', 'such', 'much', 'both', 'over', 'back', 'then', 'well', 'made',
  'find', 'here', 'know', 'take', 'want', 'come', 'keep', 'look', 'help',
  'part', 'work', 'best', 'good', 'free', 'full', 'high', 'last', 'long',
  'open', 'real', 'same', 'show', 'does', 'done', 'goes', 'used', 'year',
  // Spanish
  'que', 'los', 'las', 'del', 'por', 'con', 'una', 'para', 'como', 'pero',
  'más', 'este', 'esta', 'estos', 'estas', 'todo', 'toda', 'todos', 'todas',
  'otro', 'otra', 'otros', 'otras', 'cual', 'donde', 'sobre', 'entre',
  'desde', 'hasta', 'cada', 'solo', 'aquí', 'bien', 'gran', 'algo', 'nada',
  'mismo', 'mucho', 'poco', 'según',
]);

/**
 * Maps known domains to their associated tag sets.
 * @type {Object<string, string[]>}
 */
const DOMAIN_TAGS = {
  'github.com': ['github', 'code', 'dev'],
  'gitlab.com': ['gitlab', 'code', 'dev'],
  'stackoverflow.com': ['stackoverflow', 'code', 'qa'],
  'youtube.com': ['youtube', 'video'],
  'vimeo.com': ['vimeo', 'video'],
  'twitter.com': ['twitter', 'social'],
  'x.com': ['twitter', 'social'],
  'facebook.com': ['facebook', 'social'],
  'instagram.com': ['instagram', 'social', 'photos'],
  'linkedin.com': ['linkedin', 'professional'],
  'reddit.com': ['reddit', 'forum'],
  'medium.com': ['medium', 'blog', 'articles'],
  'dev.to': ['devto', 'blog', 'dev'],
  'wikipedia.org': ['wikipedia', 'reference'],
  'amazon.com': ['amazon', 'shopping'],
  'netflix.com': ['netflix', 'streaming'],
  'spotify.com': ['spotify', 'music'],
  'twitch.tv': ['twitch', 'streaming', 'gaming'],
  'google.com': ['google'],
  'docs.google.com': ['google-docs', 'productivity'],
  'drive.google.com': ['google-drive', 'cloud'],
  'notion.so': ['notion', 'productivity'],
  'figma.com': ['figma', 'design'],
  'canva.com': ['canva', 'design'],
  'coursera.org': ['coursera', 'learning'],
  'udemy.com': ['udemy', 'learning'],
};

/**
 * Maps TLDs to semantic tags.
 * @type {Object<string, string[]>}
 */
const TLD_TAGS = {
  '.edu': ['education'],
  '.gov': ['government'],
  '.org': ['nonprofit'],
};

// ─── Internal Helpers ───────────────────────────────────────────────

/**
 * Cleans a raw string into a valid tag.
 * Only alphanumeric characters and hyphens are kept.
 * @param {string} raw
 * @returns {string}
 */
function cleanTag(raw) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')    // strip leading/trailing hyphens
    .replace(/-{2,}/g, '-');    // collapse multiple hyphens
}

/**
 * Checks if a word qualifies as a tag candidate.
 * @param {string} word  Lowercased word
 * @returns {boolean}
 */
function isValidTagWord(word) {
  return word.length >= MIN_TAG_LENGTH && !STOP_WORDS.has(word);
}

/**
 * Extracts the hostname from a URL, stripping the leading "www.".
 * @param {string} url
 * @returns {string}
 */
function extractHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Extracts the pathname from a URL.
 * @param {string} url
 * @returns {string}
 */
function extractPathname(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

// ─── Exported Functions ─────────────────────────────────────────────

/**
 * Generates an array of semantic tags for a single bookmark.
 *
 * Tags are derived from four sources:
 * 1. URL path segments (words > 3 chars)
 * 2. Title keywords (excluding stop words)
 * 3. Known domain mappings (e.g. github.com → ['github', 'code', 'dev'])
 * 4. TLD-based tags (e.g. .edu → 'education')
 *
 * @param {Object} bookmark  Bookmark object with `url` and `title` properties
 * @returns {string[]}  Array of deduplicated, cleaned tags (max 8)
 *
 * @example
 * generateTags({ url: 'https://github.com/user/project', title: 'My Project' })
 * // → ['github', 'code', 'dev', 'user', 'project']
 */
export function generateTags(bookmark) {
  if (!bookmark) return [];

  const tags = new Set();
  const url = bookmark.url || '';
  const title = bookmark.title || '';

  // 1. URL path segments
  const pathname = extractPathname(url);
  if (pathname && pathname !== '/') {
    const segments = pathname.split('/').filter(Boolean);
    for (const segment of segments) {
      // Split on common delimiters in URL segments
      const words = segment.split(/[-_+.~]/);
      for (const word of words) {
        const cleaned = cleanTag(word);
        if (isValidTagWord(cleaned)) {
          tags.add(cleaned);
        }
      }
    }
  }

  // 2. Title keywords
  if (title) {
    const words = title.split(/[\s\-|:•·—–,;/\\()[\]{}]+/);
    for (const word of words) {
      const cleaned = cleanTag(word);
      if (isValidTagWord(cleaned)) {
        tags.add(cleaned);
      }
    }
  }

  // 3. Domain-based tags
  const hostname = extractHostname(url);
  if (hostname) {
    // Check for exact hostname match first (e.g. docs.google.com)
    // Then try the base domain (e.g. google.com)
    const domainTags = DOMAIN_TAGS[hostname];
    if (domainTags) {
      for (const t of domainTags) tags.add(t);
    } else {
      // Try base domain: strip subdomains until we find a match
      const parts = hostname.split('.');
      for (let i = 1; i < parts.length - 1; i++) {
        const baseDomain = parts.slice(i).join('.');
        const baseTags = DOMAIN_TAGS[baseDomain];
        if (baseTags) {
          for (const t of baseTags) tags.add(t);
          break;
        }
      }
    }
  }

  // 4. TLD-based tags
  if (hostname) {
    for (const [tld, tldTags] of Object.entries(TLD_TAGS)) {
      if (hostname.endsWith(tld)) {
        for (const t of tldTags) tags.add(t);
        break;
      }
    }
  }

  // Deduplicate and limit
  return [...tags].slice(0, MAX_TAGS_PER_BOOKMARK);
}

/**
 * Builds an inverted index mapping tags to sets of bookmark IDs.
 *
 * Each bookmark should have an `id` property (or `url` is used as fallback).
 * Tags are generated via {@link generateTags}.
 *
 * @param {Array<Object>} bookmarks  Array of bookmark objects
 * @returns {Map<string, Set<string>>}  Map of tag → Set of bookmark IDs
 *
 * @example
 * const index = buildTagIndex(myBookmarks);
 * index.get('github'); // → Set { 'id1', 'id5', 'id12' }
 */
export function buildTagIndex(bookmarks) {
  /** @type {Map<string, Set<string>>} */
  const index = new Map();

  if (!Array.isArray(bookmarks)) return index;

  for (const bookmark of bookmarks) {
    if (!bookmark) continue;
    const id = bookmark.id || bookmark.url || '';
    if (!id) continue;

    const tags = generateTags(bookmark);
    for (const tag of tags) {
      if (!index.has(tag)) {
        index.set(tag, new Set());
      }
      index.get(tag).add(id);
    }
  }

  return index;
}

/**
 * Returns the most popular tags sorted by frequency (descending).
 *
 * @param {Map<string, Set<string>>} tagIndex  Inverted tag index from {@link buildTagIndex}
 * @param {number} [limit=20]  Maximum number of tags to return
 * @returns {Array<{ tag: string, count: number }>}  Sorted array of tag/count pairs
 *
 * @example
 * getPopularTags(tagIndex, 10);
 * // → [{ tag: 'code', count: 42 }, { tag: 'video', count: 31 }, ...]
 */
export function getPopularTags(tagIndex, limit = 20) {
  if (!tagIndex || !(tagIndex instanceof Map)) return [];

  const entries = [];
  for (const [tag, ids] of tagIndex) {
    entries.push({ tag, count: ids.size });
  }

  entries.sort((a, b) => b.count - a.count);
  return entries.slice(0, limit);
}

/**
 * Filters bookmarks to those matching a specific tag.
 *
 * Uses the pre-built tag index for O(1) lookup, then matches
 * bookmark IDs to return full bookmark objects.
 *
 * @param {Array<Object>} bookmarks  All bookmarks
 * @param {string} tag  Tag string to filter by
 * @param {Map<string, Set<string>>} tagIndex  Inverted tag index
 * @returns {Array<Object>}  Bookmarks matching the given tag
 *
 * @example
 * const results = filterByTag(bookmarks, 'github', tagIndex);
 */
export function filterByTag(bookmarks, tag, tagIndex) {
  if (!Array.isArray(bookmarks) || !tag || !tagIndex) return [];

  const cleanedTag = cleanTag(tag);
  const matchingIds = tagIndex.get(cleanedTag);
  if (!matchingIds || matchingIds.size === 0) return [];

  return bookmarks.filter(b => {
    if (!b) return false;
    const id = b.id || b.url || '';
    return matchingIds.has(id);
  });
}
