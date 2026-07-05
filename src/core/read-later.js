/**
 * @module read-later
 * @description Manages the "Read Later" queue and reading progress in BookmarkIQ.
 * Persists read-later items in localStorage.
 */

const STORAGE_KEY = 'bookmarkOrganizer_readLater';

/**
 * @typedef {Object} ReadLaterItem
 * @property {string} id - Bookmark ID
 * @property {string} title - Bookmark title
 * @property {string} url - Bookmark URL
 * @property {string|null} icon - Stored base64 favicon or URL
 * @property {string[]} tags - Bookmark tags
 * @property {'unread'|'reading'|'completed'} status - Reading progress status
 * @property {number} addedAt - Unix timestamp when added to queue
 * @property {number} estReadingTime - Estimated reading time in minutes
 * @property {string} [description] - Optional note/annotation
 * @property {number|null} [rating] - Star rating (1-5) if completed
 */

/**
 * Loads all items from the Read Later queue.
 * @returns {ReadLaterItem[]} Array of read later items
 */
export function loadReadLater() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('[read-later] Failed to load read-later list:', error);
    return [];
  }
}

/**
 * Saves the Read Later queue to localStorage.
 * @param {ReadLaterItem[]} list - The list to save
 */
export function saveReadLater(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.error('[read-later] Failed to save read-later list:', error);
  }
}

/**
 * Estimates reading time in minutes based on title and tags.
 * @param {Object} bookmark 
 * @returns {number} Estimated minutes
 */
function estimateReadingTime(bookmark) {
  const titleWords = (bookmark.title || '').split(/\s+/).length;
  const tagWords = Array.isArray(bookmark.tags) ? bookmark.tags.length : 0;
  
  // Base reading time is 3 minutes.
  // Add some weights for title length or tags as a rough heuristic.
  const totalWeight = titleWords + tagWords * 2;
  if (totalWeight > 15) return 5;
  if (totalWeight > 8) return 3;
  return 2;
}

/**
 * Adds a bookmark to the Read Later queue.
 * 
 * @param {Object} bookmark - The bookmark to add
 * @returns {ReadLaterItem|null} The created read later item, or null if already exists
 */
export function addToReadLater(bookmark) {
  if (!bookmark) return null;
  const id = bookmark.id || bookmark.url;
  if (!id) return null;

  const list = loadReadLater();
  
  // Check if already in queue
  const exists = list.find(item => item.id === id);
  if (exists) return null;

  const item = {
    id,
    title: bookmark.title || 'Untitled',
    url: bookmark.url || '',
    icon: bookmark.icon || null,
    tags: Array.isArray(bookmark.tags) ? [...bookmark.tags] : [],
    status: 'unread',
    addedAt: Math.round(Date.now() / 1000),
    estReadingTime: estimateReadingTime(bookmark),
    description: bookmark.description || '',
    rating: bookmark.rating || null,
  };

  list.push(item);
  saveReadLater(list);
  return item;
}

/**
 * Removes an item from the Read Later queue.
 * @param {string} id - The ID of the item to remove
 * @returns {boolean} True if removed
 */
export function removeFromReadLater(id) {
  if (!id) return false;

  const list = loadReadLater();
  const index = list.findIndex(item => item.id === id);
  if (index === -1) return false;

  list.splice(index, 1);
  saveReadLater(list);
  return true;
}

/**
 * Updates the reading status of a Read Later item.
 * @param {string} id - The ID of the item
 * @param {'unread'|'reading'|'completed'} status - The new status
 * @returns {boolean} True if updated
 */
export function updateReadingStatus(id, status) {
  if (!id || !['unread', 'reading', 'completed'].includes(status)) return false;

  const list = loadReadLater();
  const item = list.find(item => item.id === id);
  if (!item) return false;

  item.status = status;
  
  // Clear rating if reset from completed
  if (status !== 'completed') {
    item.rating = null;
  }

  saveReadLater(list);
  return true;
}

/**
 * Updates the annotation note / description for a Read Later item.
 * @param {string} id - The ID of the item
 * @param {string} description - The description/note content
 * @returns {boolean} True if updated
 */
export function updateItemDescription(id, description) {
  if (!id) return false;

  const list = loadReadLater();
  const item = list.find(item => item.id === id);
  if (!item) return false;

  item.description = description || '';
  saveReadLater(list);
  return true;
}

/**
 * Updates the star rating for a completed Read Later item.
 * @param {string} id - The ID of the item
 * @param {number|null} rating - The rating value (1-5) or null
 * @returns {boolean} True if updated
 */
export function updateItemRating(id, rating) {
  if (!id) return false;

  const list = loadReadLater();
  const item = list.find(item => item.id === id);
  if (!item) return false;

  if (rating === null) {
    item.rating = null;
  } else {
    item.rating = Math.max(1, Math.min(5, parseInt(rating, 10)));
  }

  saveReadLater(list);
  return true;
}
