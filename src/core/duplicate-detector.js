/**
 * @module duplicate-detector
 * @description Finds duplicate and near-duplicate bookmarks in BookmarkIQ.
 * Supports exact URL duplicate detection (via normalization) and fuzzy
 * title matching using Levenshtein distance.
 */

/**
 * @typedef {Object} DuplicateGroup
 * @property {string} normalizedUrl - The normalized URL shared by the group
 * @property {Array<Object>} bookmarks - Array of bookmarks sharing this URL
 */

/**
 * @typedef {Object} SimilarTitleGroup
 * @property {Array<Object>} bookmarks - Pair of bookmarks with similar titles
 * @property {number} similarity - Similarity score between 0 and 1
 */

/**
 * Common tracking query parameters to strip during URL normalization.
 * @type {Set<string>}
 * @private
 */
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_source_platform',
  'utm_creative_format',
  'utm_marketing_tactic',
  'fbclid',
  'gclid',
  'ref',
  'source',
]);

/**
 * Normalizes a URL for duplicate comparison by stripping protocol, www prefix,
 * trailing slashes, hash fragments, and common tracking parameters.
 *
 * @param {string} url - The URL to normalize
 * @returns {string} The normalized URL string (hostname + pathname + cleaned search)
 *
 * @example
 * normalizeUrl('https://www.example.com/page?utm_source=twitter#section')
 * // => 'example.com/page'
 */
export function normalizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const parsed = new URL(url);

    // Strip www. prefix from hostname
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }

    // Remove trailing slash from pathname
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    // Strip tracking parameters from search params
    const cleanParams = new URLSearchParams();
    for (const [key, value] of parsed.searchParams) {
      if (!TRACKING_PARAMS.has(key.toLowerCase())) {
        cleanParams.set(key.toLowerCase(), value);
      }
    }

    // Sort remaining params for consistent comparison
    cleanParams.sort();
    const search = cleanParams.toString();

    // Combine: hostname + pathname + cleaned search (no hash)
    let normalized = hostname + pathname.toLowerCase();
    if (search) {
      normalized += '?' + search;
    }

    return normalized;
  } catch {
    // If URL parsing fails, do basic string normalization
    return url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '')
      .replace(/#.*$/, '');
  }
}

/**
 * Computes the Levenshtein edit distance between two strings.
 * Uses an optimized single-row dynamic programming approach.
 *
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} The edit distance between a and b
 * @private
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure a is the shorter string for space optimization
  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  const aLen = a.length;
  const bLen = b.length;

  // Single-row DP (space-optimized)
  const row = new Array(aLen + 1);
  for (let i = 0; i <= aLen; i++) {
    row[i] = i;
  }

  for (let j = 1; j <= bLen; j++) {
    let prev = row[0];
    row[0] = j;

    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const temp = row[i];
      row[i] = Math.min(
        row[i] + 1,       // deletion
        row[i - 1] + 1,   // insertion
        prev + cost        // substitution
      );
      prev = temp;
    }
  }

  return row[aLen];
}

/**
 * Computes similarity between two strings as a value between 0 and 1.
 * Uses normalized Levenshtein distance.
 *
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Similarity score where 1 = identical, 0 = completely different
 * @private
 */
function similarity(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;

  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  const distance = levenshtein(a, b);
  return 1 - distance / maxLen;
}

/**
 * Extracts the domain from a URL for grouping purposes.
 * @param {string} url - The URL to extract domain from
 * @returns {string} The domain or empty string
 * @private
 */
function getDomain(url) {
  try {
    let hostname = new URL(url).hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    return hostname;
  } catch {
    return '';
  }
}

/**
 * Finds exact duplicate bookmarks by grouping them by normalized URL.
 * Only returns groups with more than one bookmark.
 *
 * @param {Array<Object>} bookmarks - Array of bookmark objects (must have `url` property)
 * @returns {Array<DuplicateGroup>} Array of duplicate groups, each containing the
 *   normalized URL and an array of bookmarks sharing that URL
 *
 * @example
 * const dupes = findDuplicates([
 *   { id: '1', url: 'https://www.example.com/' },
 *   { id: '2', url: 'http://example.com' },
 * ]);
 * // => [{ normalizedUrl: 'example.com', bookmarks: [...] }]
 */
export function findDuplicates(bookmarks) {
  if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
    return [];
  }

  /** @type {Map<string, Array<Object>>} */
  const groups = new Map();

  for (const bookmark of bookmarks) {
    if (!bookmark || !bookmark.url) continue;

    const normalized = normalizeUrl(bookmark.url);
    if (!normalized) continue;

    if (!groups.has(normalized)) {
      groups.set(normalized, []);
    }
    groups.get(normalized).push(bookmark);
  }

  // Only return groups with actual duplicates (2+ bookmarks)
  const duplicates = [];
  for (const [normalizedUrl, group] of groups) {
    if (group.length > 1) {
      duplicates.push({ normalizedUrl, bookmarks: group });
    }
  }

  // Sort by group size descending (largest duplicate groups first)
  duplicates.sort((a, b) => b.bookmarks.length - a.bookmarks.length);

  return duplicates;
}

/**
 * Finds bookmarks with similar titles using fuzzy string matching.
 * To avoid O(n²) on all bookmarks, groups by category or domain first.
 * Falls back to comparing all if no category info is available (capped at 500).
 *
 * @param {Array<Object>} bookmarks - Array of bookmark objects (must have `title` property,
 *   optionally `category` and `url`)
 * @param {number} [threshold=0.7] - Minimum similarity score (0-1) to consider titles as similar
 * @returns {Array<SimilarTitleGroup>} Array of similar title groups, sorted by similarity descending
 *
 * @example
 * const similar = findSimilarTitles([
 *   { id: '1', title: 'JavaScript Tutorial' },
 *   { id: '2', title: 'JavaScript Tutorials' },
 * ], 0.8);
 */
export function findSimilarTitles(bookmarks, threshold = 0.7) {
  if (!Array.isArray(bookmarks) || bookmarks.length < 2) {
    return [];
  }

  // Clamp threshold to valid range
  threshold = Math.max(0, Math.min(1, threshold));

  // Filter to bookmarks with meaningful titles
  const withTitles = bookmarks.filter(
    (b) => b && b.title && typeof b.title === 'string' && b.title.trim().length > 0
  );

  if (withTitles.length < 2) {
    return [];
  }

  const results = [];
  const seen = new Set();

  // Try to group by category first for efficient comparison
  const hasCategories = withTitles.some((b) => b.category || b.categoryId);

  if (hasCategories) {
    // Group by category and compare within each group
    /** @type {Map<string, Array<Object>>} */
    const categoryGroups = new Map();

    for (const bookmark of withTitles) {
      const cat = bookmark.category || bookmark.categoryId || '__uncategorized__';
      if (!categoryGroups.has(cat)) {
        categoryGroups.set(cat, []);
      }
      categoryGroups.get(cat).push(bookmark);
    }

    for (const [, group] of categoryGroups) {
      compareWithinGroup(group, threshold, results, seen);
    }
  } else {
    // No categories — try grouping by domain
    const hasDomains = withTitles.some((b) => b.url);

    if (hasDomains && withTitles.length > 500) {
      /** @type {Map<string, Array<Object>>} */
      const domainGroups = new Map();

      for (const bookmark of withTitles) {
        const domain = bookmark.url ? getDomain(bookmark.url) : '__no_domain__';
        if (!domainGroups.has(domain)) {
          domainGroups.set(domain, []);
        }
        domainGroups.get(domain).push(bookmark);
      }

      for (const [, group] of domainGroups) {
        if (group.length >= 2) {
          compareWithinGroup(group, threshold, results, seen);
        }
      }
    } else {
      // Small enough to compare all — cap at 500
      const capped = withTitles.slice(0, 500);
      compareWithinGroup(capped, threshold, results, seen);
    }
  }

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  return results;
}

/**
 * Compares all pairs within a group and adds similar pairs to results.
 * @param {Array<Object>} group - Group of bookmarks to compare
 * @param {number} threshold - Minimum similarity threshold
 * @param {Array<SimilarTitleGroup>} results - Results accumulator
 * @param {Set<string>} seen - Set of already-seen pair keys to avoid duplicates
 * @private
 */
function compareWithinGroup(group, threshold, results, seen) {
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const a = group[i];
      const b = group[j];

      // Create a unique key for this pair to avoid duplicate entries
      const pairKey = [a.id, b.id].sort().join('|');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const titleA = a.title.trim().toLowerCase();
      const titleB = b.title.trim().toLowerCase();

      // Skip identical titles (these are exact duplicates, handled by findDuplicates)
      if (titleA === titleB) continue;

      const score = similarity(titleA, titleB);
      if (score >= threshold) {
        results.push({
          bookmarks: [a, b],
          similarity: Math.round(score * 1000) / 1000,
        });
      }
    }
  }
}

/**
 * Picks the "best" bookmark from a group of duplicates to keep.
 *
 * Selection priority:
 * 1. Has an icon (favicon) — better visual representation
 * 2. Has a meaningful title (not just the domain name)
 * 3. Longer title — usually more descriptive
 * 4. More recent addDate — likely the most current version
 *
 * @param {Array<Object>} duplicateGroup - Array of duplicate bookmarks to choose from.
 *   Each bookmark can have: `icon`, `title`, `url`, `addDate` properties.
 * @returns {Object|null} The best bookmark from the group, or null if group is empty
 *
 * @example
 * const best = pickBest([
 *   { id: '1', title: 'Example', url: 'https://example.com' },
 *   { id: '2', title: 'Example - Full Site', url: 'https://example.com', icon: 'data:...' },
 * ]);
 * // => { id: '2', ... } (has icon and longer title)
 */
export function pickBest(duplicateGroup) {
  if (!Array.isArray(duplicateGroup) || duplicateGroup.length === 0) {
    return null;
  }

  if (duplicateGroup.length === 1) {
    return duplicateGroup[0];
  }

  /**
   * Checks if a title is meaningful (not just the domain name).
   * @param {Object} bookmark - The bookmark to check
   * @returns {boolean} True if the title is more than just the domain
   * @private
   */
  function hasMeaningfulTitle(bookmark) {
    if (!bookmark.title || !bookmark.url) return false;

    const title = bookmark.title.trim().toLowerCase();
    if (title.length === 0) return false;

    try {
      const domain = new URL(bookmark.url).hostname.toLowerCase().replace(/^www\./, '');
      // Title is meaningful if it's not just the domain or a slight variation
      return title !== domain && !title.startsWith(domain);
    } catch {
      return title.length > 0;
    }
  }

  return duplicateGroup.reduce((best, current) => {
    const bestHasIcon = !!(best.icon && best.icon.trim());
    const currentHasIcon = !!(current.icon && current.icon.trim());

    // Prefer: has icon
    if (currentHasIcon && !bestHasIcon) return current;
    if (bestHasIcon && !currentHasIcon) return best;

    // Prefer: meaningful title (not just domain)
    const bestMeaningful = hasMeaningfulTitle(best);
    const currentMeaningful = hasMeaningfulTitle(current);
    if (currentMeaningful && !bestMeaningful) return current;
    if (bestMeaningful && !currentMeaningful) return best;

    // Prefer: longer title
    const bestTitleLen = (best.title || '').trim().length;
    const currentTitleLen = (current.title || '').trim().length;
    if (currentTitleLen > bestTitleLen) return current;
    if (bestTitleLen > currentTitleLen) return best;

    // Prefer: more recent addDate
    const bestDate = Number(best.addDate) || 0;
    const currentDate = Number(current.addDate) || 0;
    if (currentDate > bestDate) return current;

    return best;
  });
}
