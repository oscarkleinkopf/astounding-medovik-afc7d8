/**
 * @fileoverview Gemini API client for AI‑powered bookmark classification.
 * Uses BYOK (Bring Your Own Key) — the user provides their own Gemini API key.
 * @module core/gemini-client
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** localStorage key where the user's API key is persisted. */
const API_KEY_STORAGE_KEY = 'bookmarkOrganizer_apiKey';

/** Gemini REST API endpoint (v1beta, Gemini 2.0 Flash). */
const API_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/** Maximum bookmarks to send in a single API request. */
const BATCH_SIZE = 30;

/** Maximum number of retry attempts per request. */
const MAX_RETRIES = 3;

/** Base delay in ms for exponential back‑off (1 s → 2 s → 4 s). */
const BASE_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a Promise that resolves after `ms` milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends a single request to the Gemini API with retry logic.
 *
 * @param {string} apiKey   - Gemini API key.
 * @param {object} body     - Request body (contents + generationConfig).
 * @returns {Promise<object>} Parsed JSON response.
 * @throws {Error} On non‑retryable failures (auth errors, exhausted retries).
 */
async function fetchWithRetry(apiKey, body) {
  const url = `${API_BASE_URL}?key=${apiKey}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // ── Auth errors — don't retry ──────────────────────────────────
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Gemini API authentication failed (${response.status}). ` +
            'Please check your API key.',
        );
      }

      // ── Rate‑limit — wait and retry ────────────────────────────────
      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          console.warn(
            `[gemini-client] Rate limited (429). Retrying in ${delay}ms…`,
          );
          await sleep(delay);
          continue;
        }
        throw new Error('Gemini API rate limit exceeded after retries.');
      }

      // ── Other server errors — retry ────────────────────────────────
      if (!response.ok) {
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          console.warn(
            `[gemini-client] Request failed (${response.status}). ` +
              `Retrying in ${delay}ms…`,
          );
          await sleep(delay);
          continue;
        }
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `Gemini API error ${response.status}: ${errorText}`,
        );
      }

      return await response.json();
    } catch (error) {
      // Network errors — retry if possible
      if (
        error.name === 'TypeError' || // fetch network failure
        error.name === 'AbortError'
      ) {
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          console.warn(
            `[gemini-client] Network error. Retrying in ${delay}ms…`,
            error.message,
          );
          await sleep(delay);
          continue;
        }
      }
      throw error;
    }
  }

  throw new Error('Gemini API request failed after all retry attempts.');
}

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

/**
 * Builds the request body for a batch of bookmarks.
 *
 * @param {Array<{id: string, title: string, url: string}>} batch
 * @param {string[]} categoryNames - Available category IDs.
 * @returns {object} Request body for the Gemini API.
 */
function buildRequestBody(batch, categoryNames) {
  const bookmarkLines = batch
    .map(
      (bm, i) =>
        `${i + 1}. Title: "${bm.title || ''}" URL: "${bm.url || ''}"`,
    )
    .join('\n');

  const prompt =
    `Classify each bookmark into exactly one category. ` +
    `Available categories: ${categoryNames.join(', ')}.\n\n` +
    `Bookmarks:\n${bookmarkLines}\n\n` +
    `Respond in JSON format: {"1": "category-id", "2": "category-id", ...}`;

  return {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1000,
      responseMimeType: 'application/json',
    },
  };
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

/**
 * Extracts the JSON object from a Gemini API response.
 *
 * @param {object} apiResponse - Raw parsed JSON response from the API.
 * @returns {object|null} Parsed classification map, or null on failure.
 */
function parseResponse(apiResponse) {
  try {
    const text =
      apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) return null;

    // The response should be a JSON object. Try parsing directly.
    return JSON.parse(text);
  } catch {
    // If JSON.parse fails, try extracting JSON from a code block.
    try {
      const text =
        apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch {
      // Give up.
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classifies an array of bookmarks using the Gemini API.
 *
 * Bookmarks are sent in batches of {@link BATCH_SIZE}. If some batches fail,
 * partial results from successful batches are still returned.
 *
 * @param {Array<{id: string, title: string, url: string}>} bookmarks
 * @param {string}   apiKey        - User's Gemini API key.
 * @param {string[]} categoryNames - Available category IDs (e.g. ['social-media', 'shopping']).
 * @returns {Promise<Map<string, string>>} Map of bookmarkId → categoryId.
 */
export async function classifyWithGemini(bookmarks, apiKey, categoryNames) {
  /** @type {Map<string, string>} */
  const results = new Map();

  if (!bookmarks || bookmarks.length === 0 || !apiKey) {
    return results;
  }

  // ── Split into batches ─────────────────────────────────────────────
  const batches = [];
  for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
    batches.push(bookmarks.slice(i, i + BATCH_SIZE));
  }

  // ── Process each batch ─────────────────────────────────────────────
  const validCategorySet = new Set(categoryNames);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    try {
      const body = buildRequestBody(batch, categoryNames);
      const apiResponse = await fetchWithRetry(apiKey, body);
      const classification = parseResponse(apiResponse);

      if (classification) {
        // Map 1‑indexed keys back to actual bookmark IDs.
        for (let j = 0; j < batch.length; j++) {
          const key = String(j + 1);
          const categoryId = classification[key];

          // Only accept valid category IDs.
          if (categoryId && validCategorySet.has(categoryId)) {
            results.set(batch[j].id, categoryId);
          }
        }
      }

      // Small delay between batches to avoid rate limits.
      if (batchIndex < batches.length - 1) {
        await sleep(500);
      }
    } catch (error) {
      console.error(
        `[gemini-client] Batch ${batchIndex + 1}/${batches.length} failed:`,
        error.message,
      );
      // Continue with remaining batches — partial results are better than none.
    }
  }

  return results;
}

/**
 * Tests whether the provided API key is valid by sending a minimal request.
 *
 * @param {string} apiKey - Gemini API key to test.
 * @returns {Promise<boolean>} `true` if the key is valid, `false` otherwise.
 */
export async function testApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  try {
    const body = {
      contents: [{ parts: [{ text: 'Say hello' }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 50,
      },
    };

    const response = await fetchWithRetry(apiKey, body);
    // If we got here without throwing, the key works.
    return !!(response?.candidates?.length);
  } catch {
    return false;
  }
}

/**
 * Checks whether an API key is stored in localStorage.
 *
 * @returns {boolean} `true` if a non‑empty API key is present.
 */
export function isAvailable() {
  try {
    const key = localStorage.getItem(API_KEY_STORAGE_KEY);
    return typeof key === 'string' && key.trim().length > 0;
  } catch {
    return false;
  }
}
