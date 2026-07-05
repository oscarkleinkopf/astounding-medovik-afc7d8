/**
 * @module tag-manager
 * @description Advanced tag management operations for BookmarkIQ.
 * Supports merging tags, renaming tags, and bulk adding/removing tags.
 */

/**
 * Normalizes a tag name to keep it consistent (lowercase, alphanumeric + hyphens).
 * @param {string} tag - The raw tag string
 * @returns {string} Cleaned tag string
 */
function normalizeTag(tag) {
  if (!tag || typeof tag !== 'string') return '';
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/**
 * Merges sourceTag into targetTag globally across all bookmarks.
 * 
 * @param {Array<Object>} bookmarks - Flat list of all bookmarks
 * @param {string} sourceTag - The tag to be merged and removed
 * @param {string} targetTag - The destination tag
 * @returns {boolean} True if any changes were made
 */
export function mergeTags(bookmarks, sourceTag, targetTag) {
  if (!Array.isArray(bookmarks) || !sourceTag || !targetTag) return false;

  const src = normalizeTag(sourceTag);
  const tgt = normalizeTag(targetTag);
  if (!src || !tgt || src === tgt) return false;

  let changed = false;

  for (const bookmark of bookmarks) {
    if (!bookmark) continue;
    
    // Ensure tags array exists
    if (!Array.isArray(bookmark.tags)) {
      bookmark.tags = [];
    }

    const index = bookmark.tags.indexOf(src);
    if (index !== -1) {
      // Remove source tag
      bookmark.tags.splice(index, 1);
      
      // Add target tag if not already present
      if (!bookmark.tags.includes(tgt)) {
        bookmark.tags.push(tgt);
      }
      
      changed = true;
    }
  }

  return changed;
}

/**
 * Renames a tag globally across all bookmarks.
 * 
 * @param {Array<Object>} bookmarks - Flat list of all bookmarks
 * @param {string} oldTag - The tag to be renamed
 * @param {string} newTag - The new tag name
 * @returns {boolean} True if any changes were made
 */
export function renameTag(bookmarks, oldTag, newTag) {
  if (!Array.isArray(bookmarks) || !oldTag || !newTag) return false;

  const oldT = normalizeTag(oldTag);
  const newT = normalizeTag(newTag);
  if (!oldT || !newT || oldT === newT) return false;

  let changed = false;

  for (const bookmark of bookmarks) {
    if (!bookmark || !Array.isArray(bookmark.tags)) continue;

    const index = bookmark.tags.indexOf(oldT);
    if (index !== -1) {
      if (bookmark.tags.includes(newT)) {
        // If target name already exists on this bookmark, just remove the old one
        bookmark.tags.splice(index, 1);
      } else {
        // Rename the old one to the new one
        bookmark.tags[index] = newT;
      }
      changed = true;
    }
  }

  return changed;
}

/**
 * Adds a tag to a list of selected bookmarks by ID.
 * 
 * @param {Array<Object>} bookmarks - Flat list of all bookmarks
 * @param {Array<string>|Set<string>} ids - Collection of bookmark IDs to update
 * @param {string} tag - The tag to add
 * @returns {number} The count of bookmarks updated
 */
export function bulkAddTag(bookmarks, ids, tag) {
  if (!Array.isArray(bookmarks) || !ids || !tag) return 0;

  const t = normalizeTag(tag);
  if (!t) return 0;

  const idSet = ids instanceof Set ? ids : new Set(ids);
  let updatedCount = 0;

  for (const bookmark of bookmarks) {
    if (!bookmark) continue;
    const id = bookmark.id || bookmark.url || '';
    if (!id || !idSet.has(id)) continue;

    if (!Array.isArray(bookmark.tags)) {
      bookmark.tags = [];
    }

    if (!bookmark.tags.includes(t)) {
      bookmark.tags.push(t);
      updatedCount++;
    }
  }

  return updatedCount;
}

/**
 * Removes a tag from a list of selected bookmarks by ID.
 * 
 * @param {Array<Object>} bookmarks - Flat list of all bookmarks
 * @param {Array<string>|Set<string>} ids - Collection of bookmark IDs to update
 * @param {string} tag - The tag to remove
 * @returns {number} The count of bookmarks updated
 */
export function bulkRemoveTag(bookmarks, ids, tag) {
  if (!Array.isArray(bookmarks) || !ids || !tag) return 0;

  const t = normalizeTag(tag);
  if (!t) return 0;

  const idSet = ids instanceof Set ? ids : new Set(ids);
  let updatedCount = 0;

  for (const bookmark of bookmarks) {
    if (!bookmark || !Array.isArray(bookmark.tags)) continue;
    const id = bookmark.id || bookmark.url || '';
    if (!id || !idSet.has(id)) continue;

    const index = bookmark.tags.indexOf(t);
    if (index !== -1) {
      bookmark.tags.splice(index, 1);
      updatedCount++;
    }
  }

  return updatedCount;
}
