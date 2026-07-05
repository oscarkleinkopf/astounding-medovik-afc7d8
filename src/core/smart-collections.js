/**
 * @module smart-collections
 * @description Provides rule-based dynamic collections for instant filtering
 * of bookmarks based on ratings, recency, read-later status, notes, and tags.
 */

/**
 * @typedef {Object} SmartCollection
 * @property {string} id - Unique collection identifier
 * @property {string} icon - Emoji icon
 * @property {string} labelEn - English label
 * @property {string} labelEs - Spanish label
 * @property {number} count - Count of matching items
 * @property {Function} filterFn - Predicate function matching bookmarks
 */

/**
 * Computes all available smart collections against current bookmarks.
 * 
 * @param {Array<Object>} bookmarks - Flat array of all bookmarks
 * @param {Array<Object>} [readLaterList=[]] - Read later queue
 * @returns {Array<SmartCollection>} Array of collection descriptors
 */
export function getSmartCollections(bookmarks = [], readLaterList = []) {
  if (!Array.isArray(bookmarks)) bookmarks = [];

  const nowSeconds = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = nowSeconds - 30 * 24 * 60 * 60;

  const collections = [
    {
      id: 'top-rated',
      icon: '⭐',
      labelEn: 'Top Rated (4-5★)',
      labelEs: 'Más Valorados (4-5★)',
      filterFn: (b) => (b.rating || 0) >= 4
    },
    {
      id: 'recently-added',
      icon: '🕒',
      labelEn: 'Added Recently (30d)',
      labelEs: 'Añadidos Recientes (30d)',
      filterFn: (b) => b.addDate && b.addDate >= thirtyDaysAgo
    },
    {
      id: 'with-notes',
      icon: '📝',
      labelEn: 'With Notes & Summaries',
      labelEs: 'Con Notas y Resúmenes',
      filterFn: (b) => b.description && b.description.trim().length > 0
    },
    {
      id: 'rescued-links',
      icon: '🏛️',
      labelEn: 'Wayback Rescued Links',
      labelEs: 'Rescatados en Wayback',
      filterFn: (b) => b.url && b.url.includes('web.archive.org')
    },
    {
      id: 'unread-queue',
      icon: '📖',
      labelEn: 'Unread Queue',
      labelEs: 'Cola Sin Leer',
      filterFn: (b) => {
        const id = b.id || b.url;
        return readLaterList.some(rl => rl.id === id && rl.status === 'unread');
      }
    }
  ];

  return collections.map(col => ({
    ...col,
    count: bookmarks.filter(col.filterFn).length
  }));
}

/**
 * Filters a bookmark list by smart collection ID.
 * 
 * @param {Array<Object>} bookmarks 
 * @param {string} collectionId 
 * @param {Array<Object>} [readLaterList=[]] 
 * @returns {Array<Object>} Filtered bookmarks
 */
export function filterBySmartCollection(bookmarks, collectionId, readLaterList = []) {
  const collections = getSmartCollections(bookmarks, readLaterList);
  const found = collections.find(c => c.id === collectionId);
  if (!found) return bookmarks;
  return bookmarks.filter(found.filterFn);
}
