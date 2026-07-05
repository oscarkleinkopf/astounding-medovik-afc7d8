/**
 * @module wayback-client
 * @description Interfaces with the Internet Archive (Wayback Machine) public API
 * to search for archived snapshots of dead links.
 */

/**
 * @typedef {Object} WaybackSnapshot
 * @property {boolean} available - Whether a snapshot is available
 * @property {string|null} url - The URL of the archived snapshot
 * @property {string|null} timestamp - The timestamp of the snapshot (YYYYMMDDhhmmss)
 */

/**
 * Checks the Wayback Machine API to find if an archived snapshot is available for a URL.
 * 
 * API Endpoint: https://archive.org/wayback/available?url={URL}
 * 
 * @param {string} url - The URL to check
 * @returns {Promise<WaybackSnapshot>} The availability status and archive URL
 */
export async function checkWaybackAvailability(url) {
  if (!url || typeof url !== 'string') {
    return { available: false, url: null, timestamp: null };
  }

  // Skip non-HTTP(S) protocols
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { available: false, url: null, timestamp: null };
  }

  const endpoint = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { available: false, url: null, timestamp: null };
    }

    const data = await response.json();
    const closest = data?.archived_snapshots?.closest;

    if (closest && closest.available === true && closest.url) {
      // Secure the archive URL by forcing https
      const secureUrl = closest.url.replace(/^http:\/\//i, 'https://');
      return {
        available: true,
        url: secureUrl,
        timestamp: closest.timestamp || null,
      };
    }

    return { available: false, url: null, timestamp: null };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('[wayback-client] Failed to check Wayback Machine availability:', error);
    return { available: false, url: null, timestamp: null };
  }
}
