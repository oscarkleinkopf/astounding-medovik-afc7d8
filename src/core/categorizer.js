/**
 * @fileoverview Main categorization engine.
 * Combines heuristic rule‑based matching with optional AI classification.
 * Manages custom categories and standard categorization workflows.
 * @module core/categorizer
 */

import {
  DEFAULT_CATEGORIES,
  findCategoryByDomain,
  findCategoryByURL,
  findCategoryByKeywords,
  getAllCategories
} from './domain-database.js';

// ---------------------------------------------------------------------------
// localStorage key
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'bookmarkOrganizer_customCategories';

// ---------------------------------------------------------------------------
// Custom Categories Persistence (CRUD)
// ---------------------------------------------------------------------------

/**
 * Loads custom categories from localStorage.
 * Handles try/catch in case of non‑browser environment or security restrictions.
 * @returns {Array<object>} List of custom category objects.
 */
export function loadCustomCategories() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('[categorizer] Error loading custom categories:', err);
    return [];
  }
}

/**
 * Saves custom categories to localStorage.
 * @param {Array<object>} categories
 */
export function saveCustomCategories(categories) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch (err) {
    console.error('[categorizer] Error saving custom categories:', err);
  }
}

/**
 * Adds or updates a custom category.
 * @param {object} category - Category object to add.
 */
export function addCustomCategory(category) {
  try {
    const categories = loadCustomCategories();
    const idx = categories.findIndex(c => c.id === category.id);
    if (idx !== -1) {
      categories[idx] = category;
    } else {
      categories.push(category);
    }
    saveCustomCategories(categories);
  } catch (err) {
    console.error('[categorizer] Error adding custom category:', err);
  }
}

/**
 * Removes a custom category by its ID.
 * @param {string} id - ID of category to remove.
 */
export function removeCustomCategory(id) {
  try {
    const categories = loadCustomCategories().filter(c => c.id !== id);
    saveCustomCategories(categories);
  } catch (err) {
    console.error('[categorizer] Error removing custom category:', err);
  }
}

/**
 * Returns all categories (defaults + custom).
 * @param {Array<object>} [customCategories] - Optional custom categories array.
 * @returns {Array<object>}
 */
export function getCategories(customCategories) {
  const customs = customCategories || loadCustomCategories();
  return getAllCategories(customs);
}

// ---------------------------------------------------------------------------
// Classification logic
// ---------------------------------------------------------------------------

/**
 * Classifies a single bookmark node.
 * Uses custom rules first, then falls back to default heuristics.
 *
 * @param {object} bm - The bookmark node to classify.
 * @param {Array<object>} customCategories - Loaded custom categories.
 * @returns {{ categoryId: string, confidence: number, matchReason: 'ai'|'custom-domain'|'custom-url'|'custom-keyword'|'domain'|'url'|'keyword'|'default' }}
 */
function classifyBookmark(bm, customCategories) {
  // ── AI Classification check ────────────────────────────────────────
  // If the bookmark was already pre-classified by the Gemini client, trust it.
  if (bm.aiCategory) {
    return {
      categoryId: bm.aiCategory,
      confidence: 1.0,
      matchReason: 'ai'
    };
  }

  const url = bm.url || '';
  let hostname = '';
  try {
    if (url.includes('://')) {
      hostname = new URL(url).hostname;
    } else {
      hostname = url;
    }
  } catch (_) {}

  const normHostname = hostname.toLowerCase().replace(/^www\./, '');
  const titleAndDesc = ((bm.title || '') + ' ' + (bm.description || '')).toLowerCase();

  // ── 1. Check Custom Categories First ───────────────────────────────
  for (const cat of customCategories) {
    // Custom domain match
    if (cat.domains && cat.domains.length > 0) {
      for (const d of cat.domains) {
        const normD = d.toLowerCase().replace(/^www\./, '');
        if (normD.includes('/')) {
          // If domain specifies a path, check full URL
          if (url.toLowerCase().includes(normD)) {
            return { categoryId: cat.id, confidence: 1.0, matchReason: 'custom-domain' };
          }
        } else {
          // Otherwise do standard domain suffix match
          if (normHostname === normD || normHostname.endsWith('.' + normD)) {
            return { categoryId: cat.id, confidence: 1.0, matchReason: 'custom-domain' };
          }
        }
      }
    }

    // Custom URL pattern match
    if (cat.urlPatterns && cat.urlPatterns.length > 0) {
      for (const p of cat.urlPatterns) {
        if (url.toLowerCase().includes(p.toLowerCase())) {
          return { categoryId: cat.id, confidence: 0.8, matchReason: 'custom-url' };
        }
      }
    }

    // Custom keyword match
    if (cat.keywords && cat.keywords.length > 0) {
      for (const kw of cat.keywords) {
        if (titleAndDesc.includes(kw.toLowerCase())) {
          return { categoryId: cat.id, confidence: 0.6, matchReason: 'custom-keyword' };
        }
      }
    }
  }

  // ── 2. Check Standard Heuristics (Defaults) ───────────────────────
  
  // Exact domain/subdomain/TLD match
  const domainCat = findCategoryByDomain(normHostname);
  if (domainCat) {
    return { categoryId: domainCat, confidence: 1.0, matchReason: 'domain' };
  }

  // URL path pattern match
  const urlCat = findCategoryByURL(url);
  if (urlCat) {
    return { categoryId: urlCat, confidence: 0.8, matchReason: 'url' };
  }

  // Keyword match in title/description
  const kwCat = findCategoryByKeywords(titleAndDesc);
  if (kwCat) {
    return { categoryId: kwCat, confidence: 0.6, matchReason: 'keyword' };
  }

  // ── 3. Fallback ────────────────────────────────────────────────────
  return { categoryId: 'other', confidence: 0.0, matchReason: 'default' };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Organises a flat array of bookmarks into a dictionary grouped by category.
 *
 * @param {Array<object>} bookmarks - Flat array of bookmarks.
 * @param {object} [options] - Optional custom configuration.
 * @returns {object} Dictionary mapping category ID to array of Bookmarks.
 */
export function categorizeBookmarks(bookmarks, options = {}) {
  if (!bookmarks || !Array.isArray(bookmarks)) {
    return {};
  }

  const customCategories = options.customCategories || loadCustomCategories();
  const organized = {};

  for (const bm of bookmarks) {
    const { categoryId, confidence, matchReason } = classifyBookmark(bm, customCategories);

    const enrichedBookmark = {
      ...bm,
      category: categoryId,
      confidence,
      matchReason
    };

    if (!organized[categoryId]) {
      organized[categoryId] = [];
    }
    organized[categoryId].push(enrichedBookmark);
  }

  return organized;
}
