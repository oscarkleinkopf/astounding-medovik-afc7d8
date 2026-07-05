/**
 * @module link-checker
 * @description Broken link detection module for BookmarkIQ.
 * Checks bookmark URLs for reachability using a HEAD-first strategy
 * with favicon fallback. Supports batch processing and cancellation.
 */

/** @type {boolean} Module-level abort flag for cancelling ongoing scans */
let aborted = false;

/** @type {AbortController|null} Current abort controller for active requests */
let currentController = null;

/**
 * @typedef {Object} LinkCheckResult
 * @property {'alive'|'dead'|'unknown'} status - Reachability status of the URL
 * @property {number|null} httpCode - HTTP status code if available, null otherwise
 * @property {number} responseTime - Time taken for the check in milliseconds
 */

/**
 * @typedef {Object} ProgressInfo
 * @property {number} checked - Number of URLs checked so far
 * @property {number} total - Total number of URLs to check
 * @property {string} current - The URL currently being checked
 */

/**
 * Extracts the domain from a URL string.
 * @param {string} url - The URL to extract the domain from
 * @returns {string} The hostname/domain portion of the URL
 * @private
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Checks a single URL for reachability.
 *
 * Strategy:
 * 1. Try HEAD request (mode: 'no-cors') with 5s timeout
 * 2. If opaque response (status 0) → mark 'alive' (server responded)
 * 3. If network error → try Google favicon API as fallback
 * 4. If favicon succeeds → 'unknown' (domain exists but CORS blocked)
 * 5. If favicon fails → 'dead'
 *
 * @param {string} url - The URL to check
 * @returns {Promise<LinkCheckResult>} The result of the link check
 */
export async function checkSingleLink(url) {
  if (!url || typeof url !== 'string') {
    return { status: 'dead', httpCode: null, responseTime: 0 };
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return { status: 'dead', httpCode: null, responseTime: 0 };
  }

  // Skip non-HTTP(S) protocols
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { status: 'unknown', httpCode: null, responseTime: 0 };
  }

  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);
    const responseTime = Math.round(performance.now() - startTime);

    // Opaque response (status 0) means the server responded but CORS blocked details
    if (response.status === 0 || response.type === 'opaque') {
      return { status: 'alive', httpCode: null, responseTime };
    }

    // Explicit HTTP status codes
    if (response.ok) {
      return { status: 'alive', httpCode: response.status, responseTime };
    }

    // Client/server errors
    if (response.status >= 400) {
      return { status: 'dead', httpCode: response.status, responseTime };
    }

    return { status: 'alive', httpCode: response.status, responseTime };
  } catch (error) {
    clearTimeout(timeoutId);
    const responseTime = Math.round(performance.now() - startTime);

    // Timeout → unknown (server might be slow but not necessarily dead)
    if (error.name === 'AbortError') {
      return { status: 'unknown', httpCode: null, responseTime };
    }

    // Network error → try favicon fallback
    if (error instanceof TypeError) {
      return await checkViaFavicon(url, responseTime);
    }

    return { status: 'dead', httpCode: null, responseTime };
  }
}

/**
 * Fallback check using Google's favicon service to determine if a domain exists.
 * @param {string} url - The original URL that failed the direct check
 * @param {number} initialResponseTime - Time already elapsed from the initial check
 * @returns {Promise<LinkCheckResult>} The result of the favicon check
 * @private
 */
async function checkViaFavicon(url, initialResponseTime) {
  const domain = extractDomain(url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=16`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(faviconUrl, {
      method: 'GET',
      mode: 'no-cors',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Math.round(performance.now() - (performance.now() - initialResponseTime));

    // If we got any response (even opaque), the domain likely exists
    if (response.status === 0 || response.type === 'opaque' || response.ok) {
      return { status: 'unknown', httpCode: null, responseTime: initialResponseTime };
    }

    return { status: 'dead', httpCode: null, responseTime: initialResponseTime };
  } catch {
    clearTimeout(timeoutId);
    return { status: 'dead', httpCode: null, responseTime: initialResponseTime };
  }
}

/**
 * Checks multiple bookmark URLs in batches of 5 concurrent requests.
 * Uses a Promise pool pattern for controlled concurrency.
 *
 * @param {Array<{id: string, url: string}>} bookmarks - Array of bookmark objects with id and url
 * @param {function(ProgressInfo): void} [onProgress] - Optional callback for progress updates
 * @returns {Promise<Map<string, LinkCheckResult>>} Map of bookmark IDs to their check results
 */
export async function checkLinks(bookmarks, onProgress) {
  if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
    return new Map();
  }

  aborted = false;
  const results = new Map();
  const BATCH_SIZE = 5;
  let checked = 0;
  const total = bookmarks.length;

  // Filter to only bookmarks with valid URLs
  const validBookmarks = bookmarks.filter(
    (b) => b && b.id && b.url && typeof b.url === 'string'
  );

  // Process in batches of BATCH_SIZE
  for (let i = 0; i < validBookmarks.length; i += BATCH_SIZE) {
    if (aborted) {
      // Mark remaining as unknown due to cancellation
      for (let j = i; j < validBookmarks.length; j++) {
        results.set(validBookmarks[j].id, {
          status: 'unknown',
          httpCode: null,
          responseTime: 0,
        });
      }
      break;
    }

    const batch = validBookmarks.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (bookmark) => {
      if (aborted) {
        return {
          id: bookmark.id,
          result: { status: 'unknown', httpCode: null, responseTime: 0 },
        };
      }

      // Report progress for the current URL being checked
      if (typeof onProgress === 'function') {
        onProgress({ checked, total, current: bookmark.url });
      }

      const result = await checkSingleLink(bookmark.url);
      return { id: bookmark.id, result };
    });

    const batchResults = await Promise.all(batchPromises);

    for (const { id, result } of batchResults) {
      results.set(id, result);
      checked++;
    }

    // Report batch completion progress
    if (typeof onProgress === 'function' && !aborted) {
      onProgress({
        checked,
        total,
        current: batch[batch.length - 1]?.url || '',
      });
    }
  }

  return results;
}

/**
 * Cancels any ongoing link check scan.
 * Sets the module-level abort flag to stop processing further batches.
 */
export function cancelCheck() {
  aborted = true;
  if (currentController) {
    try {
      currentController.abort();
    } catch {
      // Controller may already be aborted
    }
  }
}
