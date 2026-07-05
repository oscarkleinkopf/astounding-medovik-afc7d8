/**
 * @module backup-manager
 * @description Simple JSON backup/restore system for BookmarkIQ.
 * Exports organized bookmarks as a JSON file and imports them back
 * with schema validation.
 */

/**
 * @typedef {Object} BackupMetadata
 * @property {string} [appVersion] - Application version string
 * @property {string} [language] - Language/locale code
 * @property {string} [timestamp] - ISO 8601 timestamp (auto-generated if omitted)
 * @property {Array<Object>} [customCategories] - User-defined custom categories
 */

/**
 * @typedef {Object} BackupObject
 * @property {string} version - Backup format version
 * @property {string} createdAt - ISO 8601 creation timestamp
 * @property {string} appVersion - Application version
 * @property {string} language - Language/locale code
 * @property {number} totalBookmarks - Total number of bookmarks in the backup
 * @property {Object<string, Array<Object>>} categories - Map of category IDs to bookmark arrays
 * @property {Array<Object>} customCategories - User-defined custom categories
 */

/**
 * @typedef {Object} BackupSummary
 * @property {number} totalBookmarks - Total number of bookmarks
 * @property {number} categoryCount - Number of categories
 * @property {string} createdAt - ISO 8601 creation timestamp
 * @property {string} appVersion - Application version
 */

/**
 * @typedef {Object} RestoredData
 * @property {Object} organizedData - The restored organized bookmark data
 * @property {Array<Object>} customCategories - The restored custom categories
 */

/**
 * Counts the total number of bookmarks across all categories.
 * @param {Object<string, Array>} categories - Category map
 * @returns {number} Total bookmark count
 * @private
 */
function countBookmarks(categories) {
  if (!categories || typeof categories !== 'object') return 0;

  let total = 0;
  for (const key of Object.keys(categories)) {
    if (Array.isArray(categories[key])) {
      total += categories[key].length;
    }
  }
  return total;
}

/**
 * Formats a date as YYYY-MM-DD for use in filenames.
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 * @private
 */
function formatDateForFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Creates a backup object from organized bookmark data.
 *
 * @param {Object<string, Array<Object>>} organizedData - Map of category IDs to bookmark arrays
 * @param {BackupMetadata} [metadata={}] - Optional metadata to include in the backup
 * @returns {BackupObject} The complete backup object ready for export
 * @throws {Error} If organizedData is not a valid object
 *
 * @example
 * const backup = createBackup(
 *   { tech: [{ id: '1', title: 'GitHub', url: 'https://github.com' }] },
 *   { appVersion: '1.0.0', language: 'en' }
 * );
 */
export function createBackup(organizedData, metadata = {}) {
  if (!organizedData || typeof organizedData !== 'object') {
    throw new Error('organizedData must be a non-null object');
  }

  const now = new Date();

  // Build a clean categories object (ensure all values are arrays)
  const categories = {};
  for (const [key, value] of Object.entries(organizedData)) {
    categories[key] = Array.isArray(value) ? [...value] : [];
  }

  return {
    version: '1.0',
    createdAt: metadata.timestamp || now.toISOString(),
    appVersion: metadata.appVersion || 'unknown',
    language: metadata.language || navigator?.language || 'en',
    totalBookmarks: countBookmarks(categories),
    categories,
    customCategories: Array.isArray(metadata.customCategories)
      ? [...metadata.customCategories]
      : [],
  };
}

/**
 * Exports a backup by creating a JSON file and triggering a browser download.
 * Uses the Blob + URL.createObjectURL + click pattern for cross-browser compatibility.
 *
 * @param {Object<string, Array<Object>>} organizedData - Map of category IDs to bookmark arrays
 * @param {BackupMetadata} [metadata={}] - Optional metadata to include in the backup
 * @param {string} [filename] - Custom filename. Defaults to `bookmarkiq_backup_YYYY-MM-DD.json`
 * @throws {Error} If backup creation fails
 *
 * @example
 * exportBackup(organizedData, { appVersion: '1.0.0' });
 * // Downloads: bookmarkiq_backup_2025-01-15.json
 */
export function exportBackup(organizedData, metadata = {}, filename) {
  const backup = createBackup(organizedData, metadata);

  // Generate default filename if not provided
  const defaultFilename = `bookmarkiq_backup_${formatDateForFilename(new Date())}.json`;
  const targetFilename = filename || defaultFilename;

  // Serialize to formatted JSON for human readability
  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Create a temporary link and trigger the download
  const link = document.createElement('a');
  link.href = url;
  link.download = targetFilename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Clean up: remove link and revoke object URL
  // Use setTimeout to ensure the download starts before cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Validates the structure of a backup object.
 * @param {Object} data - The parsed backup data to validate
 * @throws {Error} If validation fails with a descriptive error message
 * @private
 */
function validateBackupSchema(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Backup file is not a valid JSON object');
  }

  if (!data.version) {
    throw new Error('Backup file is missing required "version" field');
  }

  if (!data.categories || typeof data.categories !== 'object') {
    throw new Error('Backup file is missing required "categories" field or it is not an object');
  }

  if (Array.isArray(data.categories)) {
    throw new Error('"categories" must be an object (key-value map), not an array');
  }

  // Validate that each category value is an array
  for (const [key, value] of Object.entries(data.categories)) {
    if (!Array.isArray(value)) {
      throw new Error(
        `Category "${key}" must contain an array of bookmarks, got ${typeof value}`
      );
    }
  }
}

/**
 * Imports a backup from a JSON file, validates its schema, and returns the parsed data.
 *
 * @param {File} file - A File object (from file input or drag-and-drop) containing JSON backup data
 * @returns {Promise<BackupObject>} Promise resolving with the validated backup object
 * @throws {Error} If the file cannot be read, parsed, or fails schema validation
 *
 * @example
 * const fileInput = document.getElementById('import-input');
 * fileInput.addEventListener('change', async (e) => {
 *   try {
 *     const backup = await importBackup(e.target.files[0]);
 *     console.log(`Imported ${backup.totalBookmarks} bookmarks`);
 *   } catch (err) {
 *     console.error('Import failed:', err.message);
 *   }
 * });
 */
export function importBackup(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    // Validate file type (loose check — allow .json and application/json)
    if (file.type && !file.type.includes('json') && !file.name?.endsWith('.json')) {
      reject(new Error('File does not appear to be a JSON file'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (typeof content !== 'string') {
          reject(new Error('Failed to read file contents'));
          return;
        }

        const data = JSON.parse(content);
        validateBackupSchema(data);
        resolve(data);
      } catch (error) {
        if (error instanceof SyntaxError) {
          reject(new Error('File contains invalid JSON: ' + error.message));
        } else {
          reject(error);
        }
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file: ' + (reader.error?.message || 'Unknown error')));
    };

    reader.readAsText(file);
  });
}

/**
 * Converts backup data back into the organizedData format used by the application.
 *
 * @param {BackupObject} backup - A validated backup object (from importBackup)
 * @returns {RestoredData} Object containing the restored organizedData and customCategories
 * @throws {Error} If backup is invalid or missing required fields
 *
 * @example
 * const backup = await importBackup(file);
 * const { organizedData, customCategories } = restoreBackup(backup);
 */
export function restoreBackup(backup) {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Invalid backup object');
  }

  if (!backup.categories || typeof backup.categories !== 'object') {
    throw new Error('Backup is missing categories data');
  }

  // Deep-copy the categories to avoid reference issues
  const organizedData = {};
  for (const [key, value] of Object.entries(backup.categories)) {
    organizedData[key] = Array.isArray(value)
      ? value.map((bookmark) => ({ ...bookmark }))
      : [];
  }

  // Deep-copy custom categories if present
  const customCategories = Array.isArray(backup.customCategories)
    ? backup.customCategories.map((cat) => ({ ...cat }))
    : [];

  return { organizedData, customCategories };
}

/**
 * Returns a concise summary of a backup's contents.
 *
 * @param {BackupObject} backup - A backup object to summarize
 * @returns {BackupSummary} Summary with total bookmarks, category count, creation date, and version
 * @throws {Error} If backup is invalid
 *
 * @example
 * const summary = getBackupSummary(backup);
 * console.log(`${summary.totalBookmarks} bookmarks in ${summary.categoryCount} categories`);
 */
export function getBackupSummary(backup) {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Invalid backup object');
  }

  const categories = backup.categories || {};
  const categoryCount = Object.keys(categories).length;
  const totalBookmarks = backup.totalBookmarks || countBookmarks(categories);

  return {
    totalBookmarks,
    categoryCount,
    createdAt: backup.createdAt || 'unknown',
    appVersion: backup.appVersion || 'unknown',
  };
}
