/**
 * @fileoverview Bookmark exporter — generates Netscape Bookmark File format
 * HTML compatible with Chrome, Firefox, Edge, Safari, and other browsers.
 * @module core/bookmark-exporter
 */

import { getCategoryById } from './domain-database.js';


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns an indentation string (4 spaces per level).
 * @param {number} level
 * @returns {string}
 */
function indent(level) {
  return '    '.repeat(level);
}

/**
 * Escapes special HTML characters in a string to prevent malformed output.
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Returns the current Unix timestamp in seconds.
 * @returns {number}
 */
function nowTimestamp() {
  return Math.floor(Date.now() / 1000);
}

// ---------------------------------------------------------------------------
// Bookmark serialisation
// ---------------------------------------------------------------------------

/**
 * Serialises a single bookmark node as an `<A>` element inside a `<DT>`.
 *
 * @param {import('./bookmark-parser.js').BookmarkNode} bm
 * @param {number} level - Current indentation level.
 * @returns {string}
 */
function serializeBookmark(bm, level) {
  const attrs = [`HREF="${escapeHTML(bm.url || '')}"`];

  if (bm.addDate) {
    attrs.push(`ADD_DATE="${bm.addDate}"`);
  }
  if (bm.icon) {
    attrs.push(`ICON="${escapeHTML(bm.icon)}"`);
  }
  if (bm.iconUri) {
    attrs.push(`ICON_URI="${escapeHTML(bm.iconUri)}"`);
  }
  if (bm.rating) {
    attrs.push(`RATING="${bm.rating}"`);
  }

  let output = `${indent(level)}<DT><A ${attrs.join(' ')}>${escapeHTML(bm.title || '')}</A>`;
  if (bm.description) {
    output += `\n${indent(level)}<DD>${escapeHTML(bm.description)}`;
  }
  return output;
}

/**
 * Serialises a folder (category or sub‑folder) and all its children.
 *
 * @param {string}  folderName    - Display name for the folder.
 * @param {import('./bookmark-parser.js').BookmarkNode[]} bookmarks
 * @param {number}  level         - Current indentation level.
 * @param {object}  [folderAttrs] - Optional attributes for the `<H3>` tag.
 * @returns {string[]} Array of lines.
 */
function serializeFolder(folderName, bookmarks, level, folderAttrs = {}) {
  const lines = [];
  const ts = nowTimestamp();

  // Build H3 attributes
  const h3Attrs = [`ADD_DATE="${folderAttrs.addDate || ts}"`];
  if (folderAttrs.lastModified !== undefined) {
    h3Attrs.push(`LAST_MODIFIED="${folderAttrs.lastModified}"`);
  } else {
    h3Attrs.push(`LAST_MODIFIED="${ts}"`);
  }
  if (folderAttrs.personalToolbarFolder) {
    h3Attrs.push('PERSONAL_TOOLBAR_FOLDER="true"');
  }

  lines.push(`${indent(level)}<DT><H3 ${h3Attrs.join(' ')}>${escapeHTML(folderName)}</H3>`);
  lines.push(`${indent(level)}<DL><p>`);

  for (const bm of bookmarks) {
    lines.push(serializeBookmark(bm, level + 1));
  }

  lines.push(`${indent(level)}</DL><p>`);
  return lines;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @typedef {object} OrganizedCategory
 * @property {{ id: string, name: string, nameEs: string, emoji: string, color: string }} category
 * @property {import('./bookmark-parser.js').BookmarkNode[]} bookmarks
 */

/**
 * @typedef {object} ExportOptions
 * @property {boolean} [includeEmptyCategories=false] - Include categories with no bookmarks.
 * @property {boolean} [preserveOriginalFolders=false] - Nest bookmarks in sub‑folders matching their original folder path.
 */

/**
 * Generates a Netscape Bookmark File format HTML string from organized data.
 *
 * @param {OrganizedCategory[]} organizedData - Array of category + bookmarks groups.
 * @param {ExportOptions}       [options={}]
 * @returns {string} Complete HTML string ready for download.
 */
export function exportToHTML(organizedData, options = {}) {
  const {
    includeEmptyCategories = false,
    preserveOriginalFolders = false,
  } = options;

  const ts = nowTimestamp();
  const lines = [];

  // Convert organizedData from dictionary to array if necessary
  let dataArray = organizedData;
  if (organizedData && !Array.isArray(organizedData)) {
    let customCats = [];
    try {
      const stored = localStorage.getItem('bookmarkOrganizer_customCategories');
      if (stored) customCats = JSON.parse(stored);
    } catch (_) {}

    dataArray = Object.entries(organizedData).map(([catId, bookmarks]) => {
      const category = getCategoryById(catId, customCats) || {
        id: catId,
        name: catId,
        nameEs: catId,
        emoji: '📁',
        color: '#9E9E9E'
      };
      
      // If category name is an object (i18n), normalise to string
      let normalizedCategory = { ...category };
      if (category.name && typeof category.name === 'object') {
        normalizedCategory.name = category.name.en || catId;
        normalizedCategory.nameEs = category.name.es || catId;
      }
      return { category: normalizedCategory, bookmarks };
    });
  }

  // ── File header ──────────────────────────────────────────────────────
  lines.push('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
  lines.push('<!-- This is an automatically generated file.');
  lines.push('     It will be read and overwritten.');
  lines.push('     DO NOT EDIT! -->');
  lines.push('<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">');
  lines.push('<TITLE>Bookmarks</TITLE>');
  lines.push('<H1>Bookmarks</H1>');
  lines.push('<DL><p>');

  // ── Bookmarks Bar wrapper ────────────────────────────────────────────
  lines.push(`${indent(1)}<DT><H3 ADD_DATE="${ts}" LAST_MODIFIED="${ts}" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks Bar</H3>`);
  lines.push(`${indent(1)}<DL><p>`);

  if (dataArray) {
    for (const group of dataArray) {
      const { category, bookmarks } = group;

      // Skip empty categories unless explicitly requested.
      if (!includeEmptyCategories && (!bookmarks || bookmarks.length === 0)) {
        continue;
      }

      // Safe check for category properties
      const emoji = category?.emoji || '📁';
      const name = (typeof category?.name === 'object' ? category.name.en : category?.name) || category?.id || 'Other';
      const folderName = `${emoji} ${name}`;

      if (preserveOriginalFolders && bookmarks && bookmarks.length > 0) {
        // ── Group bookmarks by their original folder path ──────────────
        /** @type {Map<string, import('./bookmark-parser.js').BookmarkNode[]>} */
        const folderGroups = new Map();

        for (const bm of bookmarks) {
          const key = bm.folder || '';
          if (!folderGroups.has(key)) {
            folderGroups.set(key, []);
          }
          folderGroups.get(key).push(bm);
        }

        // Category folder header
        lines.push(`${indent(2)}<DT><H3 ADD_DATE="${ts}" LAST_MODIFIED="${ts}">${escapeHTML(folderName)}</H3>`);
        lines.push(`${indent(2)}<DL><p>`);

        for (const [folderPath, folderBookmarks] of folderGroups) {
          if (folderPath) {
            // Create a sub‑folder for this original folder path
            const subLines = serializeFolder(folderPath, folderBookmarks, 3);
            lines.push(...subLines);
          } else {
            // Bookmarks without a folder go directly under the category
            for (const bm of folderBookmarks) {
              lines.push(serializeBookmark(bm, 3));
            }
          }
        }

        lines.push(`${indent(2)}</DL><p>`);
      } else {
        // ── Flat structure: all bookmarks directly under the category ──
        lines.push(`${indent(2)}<DT><H3 ADD_DATE="${ts}" LAST_MODIFIED="${ts}">${escapeHTML(folderName)}</H3>`);
        lines.push(`${indent(2)}<DL><p>`);

        if (bookmarks) {
          for (const bm of bookmarks) {
            lines.push(serializeBookmark(bm, 3));
          }
        }

        lines.push(`${indent(2)}</DL><p>`);
      }
    }
  }

  // ── Close Bookmarks Bar and root ─────────────────────────────────────
  lines.push(`${indent(1)}</DL><p>`);
  lines.push('</DL><p>');

  return lines.join('\n');
}

/**
 * Triggers a browser download of the given HTML string as a file.
 *
 * @param {string} htmlString        - The HTML content to download.
 * @param {string} [filename]        - Desired filename. Defaults to
 *                                     `bookmarks_organized_YYYY-MM-DD.html`.
 */
export function downloadFile(htmlString, filename) {
  // Guard: `document` may not exist in non‑browser environments.
  if (typeof document === 'undefined') {
    return;
  }

  if (!filename) {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    filename = `bookmarks_organized_${yyyy}-${mm}-${dd}.html`;
  }

  const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}
