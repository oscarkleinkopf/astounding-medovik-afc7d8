/**
 * @module health-report
 * @description Generates an Executive Health Report for the bookmark collection
 * and provides a 1-Click Auto-Clean function to resolve dead links and duplicates.
 */

import { findDuplicates, pickBest } from './duplicate-detector.js';

/**
 * @typedef {Object} HealthReport
 * @property {number} totalBookmarks - Total bookmark count
 * @property {number} healthScore - Health rating score (0 - 100)
 * @property {string} statusLabelEn - Status description in English
 * @property {string} statusLabelEs - Status description in Spanish
 * @property {number} deadCount - Number of dead links
 * @property {number} duplicateCount - Number of removable duplicate bookmarks
 * @property {number} uncategorizedCount - Number of uncategorized bookmarks
 * @property {number} withoutTagsCount - Number of bookmarks without any tags
 */

/**
 * Generates an executive health report for the current collection.
 * 
 * @param {Array<Object>} bookmarks - Flat list of all bookmarks
 * @param {Object} organizedData - Categorized bookmark dictionary
 * @param {Map} [linkResults=null] - Link checker results Map
 * @returns {HealthReport} Health report object
 */
export function generateHealthReport(bookmarks = [], organizedData = {}, linkResults = null) {
  const totalBookmarks = bookmarks.length;
  if (!totalBookmarks) {
    return {
      totalBookmarks: 0,
      healthScore: 100,
      statusLabelEn: 'Empty Collection',
      statusLabelEs: 'Colección Vacía',
      deadCount: 0,
      duplicateCount: 0,
      uncategorizedCount: 0,
      withoutTagsCount: 0
    };
  }

  // 1. Dead links count
  let deadCount = 0;
  if (linkResults) {
    for (const [, res] of linkResults) {
      if (res.status === 'dead') deadCount++;
    }
  }

  // 2. Duplicates count
  const duplicateGroups = findDuplicates(bookmarks);
  let duplicateCount = 0;
  duplicateGroups.forEach(group => {
    duplicateCount += group.bookmarks.length - 1; // All except the single kept original
  });

  // 3. Uncategorized count
  const uncategorizedCount = (organizedData['other'] || []).length;

  // 4. Without tags count
  const withoutTagsCount = bookmarks.filter(b => !Array.isArray(b.tags) || b.tags.length === 0).length;

  // 5. Calculate weighted score (100 max)
  let penalty = 0;
  if (linkResults) {
    penalty += (deadCount / totalBookmarks) * 45; // up to 45% penalty for dead links
  }
  penalty += (duplicateCount / totalBookmarks) * 35; // up to 35% penalty for duplicates
  penalty += (uncategorizedCount / totalBookmarks) * 20; // up to 20% penalty for unorganized items

  const healthScore = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  let statusLabelEn = 'Optimal';
  let statusLabelEs = 'Óptimo';

  if (healthScore < 50) {
    statusLabelEn = 'Requires Attention';
    statusLabelEs = 'Requiere Atención';
  } else if (healthScore < 75) {
    statusLabelEn = 'Fair';
    statusLabelEs = 'Regular';
  } else if (healthScore < 90) {
    statusLabelEn = 'Good';
    statusLabelEs = 'Bueno';
  }

  return {
    totalBookmarks,
    healthScore,
    statusLabelEn,
    statusLabelEs,
    deadCount,
    duplicateCount,
    uncategorizedCount,
    withoutTagsCount
  };
}

/**
 * Executes a 1-Click Auto-Clean operation across all bookmarks.
 * Removes dead links and auto-resolves duplicate groups.
 * 
 * @param {Array<Object>} bookmarks 
 * @param {Object} organizedData 
 * @param {Map} [linkResults=null] 
 * @returns {Object} Cleanup summary stats
 */
export function runAutoClean(bookmarks, organizedData, linkResults = null) {
  if (!bookmarks || !organizedData) {
    return { deadRemoved: 0, duplicatesRemoved: 0, totalCleaned: 0 };
  }

  const idsToRemove = new Set();

  // 1. Identify dead links
  let deadRemoved = 0;
  if (linkResults) {
    for (const [id, res] of linkResults) {
      if (res.status === 'dead') {
        idsToRemove.add(id);
        deadRemoved++;
      }
    }
  }

  // 2. Identify duplicate links
  let duplicatesRemoved = 0;
  const duplicateGroups = findDuplicates(bookmarks);
  duplicateGroups.forEach(group => {
    const best = pickBest(group.bookmarks);
    const bestId = best.id || best.url;
    group.bookmarks.forEach(bk => {
      const id = bk.id || bk.url;
      if (id !== bestId && !idsToRemove.has(id)) {
        idsToRemove.add(id);
        duplicatesRemoved++;
      }
    });
  });

  // 3. Remove identified IDs from organized data
  for (const [cat, bks] of Object.entries(organizedData)) {
    organizedData[cat] = bks.filter(b => !idsToRemove.has(b.id || b.url));
    if (organizedData[cat].length === 0) {
      delete organizedData[cat];
    }
  }

  // 4. Remove identified IDs from flat list
  const cleanedBookmarks = bookmarks.filter(b => !idsToRemove.has(b.id || b.url));

  return {
    deadRemoved,
    duplicatesRemoved,
    totalCleaned: idsToRemove.size,
    cleanedBookmarks,
    cleanedOrganizedData: organizedData
  };
}
