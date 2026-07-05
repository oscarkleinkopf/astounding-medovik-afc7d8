/**
 * @fileoverview Netscape Bookmark File (HTML) parser.
 * Handles the bookmark export format used by Chrome, Firefox, Edge, Safari, etc.
 * @module core/bookmark-parser
 */

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------
let idCounter = 0;

/**
 * Generates a unique ID for a bookmark or folder node.
 * Prefers `crypto.randomUUID()` when available, falls back to a counter.
 * @returns {string}
 */
function generateId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `bk_${++idCounter}`;
  }
}

// ---------------------------------------------------------------------------
// Attribute helpers
// ---------------------------------------------------------------------------

/**
 * Safely reads a numeric attribute from an element, returning `null` when
 * the attribute is missing or not a valid number.
 * @param {Element} el
 * @param {string}  name - Attribute name (case‑insensitive in HTML).
 * @returns {number|null}
 */
function numericAttr(el, name) {
  const raw = el.getAttribute(name);
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Safely reads a string attribute, returning `null` for missing attributes.
 * @param {Element} el
 * @param {string}  name
 * @returns {string|null}
 */
function stringAttr(el, name) {
  const raw = el.getAttribute(name);
  return raw !== null && raw !== '' ? raw : null;
}

// ---------------------------------------------------------------------------
// Core recursive parser
// ---------------------------------------------------------------------------

/**
 * Recursively processes the children of a `<DL>` element and returns an
 * array of {@link BookmarkNode} objects.
 *
 * @param {Element}  dlElement   - A `<DL>` DOM element.
 * @param {string}   folderPath  - Accumulated folder path (e.g. "Bar > Tech").
 * @returns {BookmarkNode[]}
 */
function processDL(dlElement, folderPath) {
  /** @type {BookmarkNode[]} */
  const nodes = [];

  if (!dlElement) return nodes;

  // Iterate over direct children — we care about <DT> elements.
  const children = dlElement.children;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (child.tagName !== 'DT') continue;

    // ── Folder ──────────────────────────────────────────────────────────
    const h3 = child.querySelector(':scope > H3');
    if (h3) {
      const folderName = h3.textContent.trim();
      const newPath = folderPath ? `${folderPath} > ${folderName}` : folderName;

      /** @type {BookmarkNode} */
      const folderNode = {
        id: generateId(),
        type: 'folder',
        title: folderName,
        addDate: numericAttr(h3, 'ADD_DATE'),
        lastModified: numericAttr(h3, 'LAST_MODIFIED'),
        personalToolbarFolder:
          h3.getAttribute('PERSONAL_TOOLBAR_FOLDER') === 'true',
        folder: folderPath || null,
        children: [],
      };

      // The corresponding <DL> is typically the next element sibling of
      // this <DT>, or it may be a child of the <DT> in some browsers.
      let nestedDL = null;

      // First, look for a <DL> as a direct child of this <DT>
      nestedDL = child.querySelector(':scope > DL');

      // If not found, look at the next sibling
      if (!nestedDL) {
        let sibling = child.nextElementSibling;
        // Skip over <DD> description elements
        while (sibling && sibling.tagName === 'DD') {
          sibling = sibling.nextElementSibling;
        }
        if (sibling && sibling.tagName === 'DL') {
          nestedDL = sibling;
        }
      }

      if (nestedDL) {
        folderNode.children = processDL(nestedDL, newPath);
      }

      nodes.push(folderNode);
      continue;
    }

    // ── Bookmark ────────────────────────────────────────────────────────
    const anchor = child.querySelector(':scope > A');
    if (anchor) {
      /** @type {BookmarkNode} */
      const bookmarkNode = {
        id: generateId(),
        type: 'bookmark',
        title: anchor.textContent.trim(),
        url: anchor.getAttribute('HREF') || anchor.getAttribute('href') || '',
        addDate: numericAttr(anchor, 'ADD_DATE'),
        icon: stringAttr(anchor, 'ICON'),
        iconUri: stringAttr(anchor, 'ICON_URI'),
        folder: folderPath || null,
        rating: numericAttr(anchor, 'RATING') || numericAttr(anchor, 'rating') || null,
        children: [],
      };

      // Check for an optional <DD> description immediately following this <DT>.
      const nextSibling = child.nextElementSibling;
      if (nextSibling && nextSibling.tagName === 'DD') {
        bookmarkNode.description = nextSibling.textContent.trim();
      }

      nodes.push(bookmarkNode);
    }
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @typedef {object} BookmarkNode
 * @property {string}         id                      - Unique identifier.
 * @property {'bookmark'|'folder'} type               - Node type.
 * @property {string}         title                   - Display name.
 * @property {string}         [url]                   - URL (bookmarks only).
 * @property {number|null}    [addDate]               - Unix timestamp.
 * @property {number|null}    [lastModified]          - Unix timestamp (folders).
 * @property {string|null}    [icon]                  - Base‑64 favicon data URI.
 * @property {string|null}    [iconUri]               - Favicon URL.
 * @property {string|null}    folder                  - Original folder path.
 * @property {string}         [description]           - Optional description.
 * @property {boolean}        [personalToolbarFolder] - True for bookmarks bar.
 * @property {BookmarkNode[]} children                - Child nodes.
 */

/**
 * Parses a Netscape Bookmark File HTML string and returns a tree of
 * {@link BookmarkNode} objects.
 *
 * @param {string} htmlString - Raw HTML content of a bookmarks export file.
 * @returns {BookmarkNode[]} Root‑level nodes (folders and bookmarks).
 */
export function parseBookmarkHTML(htmlString) {
  if (!htmlString || typeof htmlString !== 'string') {
    return [];
  }

  // Reset the counter for deterministic fallback IDs.
  idCounter = 0;

  // Use DOMParser for robust, standards‑compliant HTML parsing.
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // The root content lives inside the first top‑level <DL> element.
  const rootDL = doc.querySelector('DL');
  if (!rootDL) {
    console.warn('[bookmark-parser] No <DL> element found in input.');
    return [];
  }

  return processDL(rootDL, '');
}

/**
 * Flattens a tree of bookmark nodes into a single array containing **only**
 * bookmark entries (folders are excluded but their children are included).
 *
 * @param {BookmarkNode[]} nodes - Tree of bookmark nodes.
 * @returns {BookmarkNode[]} Flat array of bookmark‑type nodes.
 */
export function flattenBookmarks(nodes) {
  /** @type {BookmarkNode[]} */
  const result = [];

  /**
   * @param {BookmarkNode[]} list
   */
  function walk(list) {
    for (const node of list) {
      if (node.type === 'bookmark') {
        result.push(node);
      }
      if (node.children && node.children.length > 0) {
        walk(node.children);
      }
    }
  }

  walk(nodes);
  return result;
}
