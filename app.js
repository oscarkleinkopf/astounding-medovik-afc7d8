/* ============================================================
   BookmarkIQ — Main Application Orchestrator
   ============================================================ */

import { initLanguage, setLanguage, getLanguage, t } from './src/core/i18n.js';
import { parseBookmarkHTML, flattenBookmarks } from './src/core/bookmark-parser.js';
import {
  categorizeBookmarks,
  getCategories,
  loadCustomCategories,
  saveCustomCategories,
  addCustomCategory,
  removeCustomCategory
} from './src/core/categorizer.js';
import { exportToHTML, downloadFile } from './src/core/bookmark-exporter.js';
import { classifyWithGemini, testApiKey } from './src/core/gemini-client.js';
import { getAllCategories } from './src/core/domain-database.js';
import { checkLinks, cancelCheck } from './src/core/link-checker.js';
import { findDuplicates, pickBest } from './src/core/duplicate-detector.js';
import { createBackup, exportBackup, importBackup, restoreBackup, getBackupSummary } from './src/core/backup-manager.js';
import { renderTreemap, renderTimeline, renderTopDomains, computeInsights } from './src/core/analytics.js';
import { generateTags, buildTagIndex, getPopularTags } from './src/core/tagger.js';
import { getThemes, applyTheme, getCurrentTheme, initTheme } from './src/core/themes.js';
import { checkWaybackAvailability } from './src/core/wayback-client.js';
import { mergeTags, renameTag, bulkAddTag, bulkRemoveTag } from './src/core/tag-manager.js';
import { fuzzySearch, aiSemanticSearch } from './src/core/search-engine.js';
import {
  loadReadLater,
  saveReadLater,
  addToReadLater,
  removeFromReadLater,
  updateReadingStatus,
  updateItemDescription,
  updateItemRating
} from './src/core/read-later.js';

/* ────────────────────────────────────
   State
   ──────────────────────────────────── */
const state = {
  bookmarks: [],
  organizedData: null,
  customCategories: [],
  apiKey: null,
  language: 'en',
  currentView: 'upload',        // 'upload' | 'processing' | 'results'
  expandedCategories: new Set(),
  searchQuery: '',
  selectedBookmarks: new Set(),
  contextTarget: null,           // bookmark id for context menu
  // Phase 2
  linkResults: null,             // Map<bookmarkId, { status, httpCode, responseTime }>
  linkFilter: 'all',             // 'all' | 'alive' | 'dead' | 'unknown'
  tagIndex: null,                // Map<tag, Set<bookmarkId>>
  activeTag: null,               // string | null
  analyticsTab: 'treemap',       // 'treemap' | 'timeline' | 'topdomains'
  duplicateGroups: null,         // array from findDuplicates
  // Phase 3
  semanticSearchActive: false,
  activeTab: 'categories',       // 'categories' | 'readlater'
  bulkSelectActive: false,
  readLaterList: [],
  readLaterFilter: 'all',
  editingBookmark: null
};

/* ────────────────────────────────────
   DOM Cache
   ──────────────────────────────────── */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* ────────────────────────────────────
   Category Color Palette
   ──────────────────────────────────── */
const CATEGORY_COLORS = [
  '#667eea', '#764ba2', '#4facfe', '#43e97b', '#fa709a',
  '#fee140', '#f093fb', '#38f9d7', '#fccb90', '#a18cd1',
  '#fbc2eb', '#ff9a9e', '#84fab0', '#cfd9df', '#ffecd2',
  '#fcb69f', '#a1c4fd', '#c2e9fb', '#d4fc79', '#96e6a1'
];

function getCategoryColor(index) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

/* ────────────────────────────────────
   Init
   ──────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);

function init() {
  // Language
  initLanguage();
  state.language = getLanguage();
  $('#language-select').value = state.language;
  $('#settings-language').value = state.language;

  // Custom categories
  const stored = loadCustomCategories();
  if (stored && stored.length) state.customCategories = stored;

  // API key
  state.apiKey = localStorage.getItem('bookmarkOrganizer_apiKey') || null;
  if (state.apiKey) {
    $('#api-key-input').value = state.apiKey;
    setApiKeyStatus(true);
  }

  // Load Read Later queue
  state.readLaterList = loadReadLater();

  // Event listeners
  setupEventListeners();

  // Theme
  initTheme();
  renderThemePicker();

  // Translations
  updateTranslations();
}

/* ────────────────────────────────────
   Event Listeners
   ──────────────────────────────────── */
function setupEventListeners() {
  const dropZone = $('#drop-zone');
  const fileInput = $('#file-input');

  // —— Drop zone ——
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  dropZone.addEventListener('dragenter', onDragEnter);
  dropZone.addEventListener('dragover', onDragOver);
  dropZone.addEventListener('dragleave', onDragLeave);
  dropZone.addEventListener('drop', handleFileDrop);
  fileInput.addEventListener('change', handleFileSelect);

  // —— Demo ——
  $('#demo-button').addEventListener('click', loadDemoBookmarks);

  // —— Language ——
  $('#language-select').addEventListener('change', (e) => handleLanguageChange(e.target.value));
  $('#settings-language').addEventListener('change', (e) => handleLanguageChange(e.target.value));

  // —— Settings ——
  $('#settings-btn').addEventListener('click', openSettings);
  $('#settings-close').addEventListener('click', closeSettings);
  $('#settings-modal').addEventListener('click', (e) => {
    if (e.target === $('#settings-modal')) closeSettings();
  });

  // —— Modal tabs ——
  $$('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => switchSettingsTab(tab.dataset.tab));
  });

  // —— API key ——
  $('#save-api-key-btn').addEventListener('click', handleApiKeySave);
  $('#clear-api-key-btn').addEventListener('click', handleApiKeyClear);

  // —— Custom categories ——
  $('#add-category-form').addEventListener('submit', handleAddCustomCategory);

  // —— Results actions ——
  $('#expand-all-btn').addEventListener('click', expandAll);
  $('#collapse-all-btn').addEventListener('click', collapseAll);
  $('#export-btn').addEventListener('click', () => {
    $('#export-section').classList.add('active');
    $('#export-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('#download-btn').addEventListener('click', handleExport);
  $('#download-clear-btn').addEventListener('click', handleExportAndClear);

  // —— Search ——
  const searchInput = $('#search-input');
  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => handleSearch(searchInput.value), 300);
    $('#search-clear').classList.toggle('visible', searchInput.value.length > 0);
  });
  $('#search-clear').addEventListener('click', () => {
    searchInput.value = '';
    $('#search-clear').classList.remove('visible');
    handleSearch('');
  });

  // —— Keyboard ——
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSettings();
      closeDuplicateModal();
      hideContextMenu();
    }
  });

  // —— Context menu dismiss ——
  document.addEventListener('click', (e) => {
    if (!$('#context-menu').contains(e.target)) hideContextMenu();
  });

  // —— Context menu items ——
  $$('.context-menu-item').forEach(item => {
    item.addEventListener('click', () => handleContextAction(item.dataset.action));
  });

  // ══ Phase 2 Event Listeners ══

  // —— Link Checker ——
  $('#check-links-btn').addEventListener('click', handleCheckLinks);
  $('#cancel-scan-btn').addEventListener('click', () => {
    cancelCheck();
    $('#link-scan-progress').style.display = 'none';
    showToast(t('linkChecker.scanComplete'), 'info');
  });
  $('#remove-dead-btn').addEventListener('click', handleRemoveDeadLinks);
  $$('.filter-pill[data-filter]').forEach(pill => {
    pill.addEventListener('click', () => handleLinkFilter(pill.dataset.filter));
  });

  // —— Duplicates ——
  $('#find-duplicates-btn').addEventListener('click', handleFindDuplicates);
  $('#duplicate-close').addEventListener('click', closeDuplicateModal);
  $('#duplicate-modal').addEventListener('click', (e) => {
    if (e.target === $('#duplicate-modal')) closeDuplicateModal();
  });
  $('#auto-merge-btn').addEventListener('click', handleAutoMerge);

  // —— Backup ——
  $('#create-backup-btn').addEventListener('click', handleCreateBackup);
  $('#restore-backup-btn').addEventListener('click', () => $('#backup-file-input').click());
  $('#backup-file-input').addEventListener('change', handleRestoreBackup);

  // —— Analytics Tabs ——
  $$('.analytics-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAnalyticsTab(tab.dataset.analytics));
  });

  // —— Tag Filter ——
  $('#tag-clear-btn').addEventListener('click', clearTagFilter);

  // ══ Phase 3 Event Listeners ══

  // —— View Switcher ——
  $('#tab-categories-btn').addEventListener('click', () => switchMainTab('categories'));
  $('#tab-readlater-btn').addEventListener('click', () => switchMainTab('readlater'));

  // —— Semantic Search Toggle ──
  $('#semantic-search-btn').addEventListener('click', toggleSemanticSearch);

  // —— Bulk selection ──
  $('#bulk-select-btn').addEventListener('click', toggleBulkSelectMode);
  $('#bulk-cancel-btn').addEventListener('click', cancelBulkSelection);
  $('#bulk-tag-btn').addEventListener('click', handleBulkTagAction);
  $('#bulk-move-btn').addEventListener('click', handleBulkMoveAction);
  $('#bulk-delete-btn').addEventListener('click', handleBulkDeleteAction);

  // —— Tag Manager Panel in Settings ──
  $('#merge-tags-btn').addEventListener('click', handleMergeTags);
  $('#rename-tag-btn').addEventListener('click', handleRenameTag);

  // —— Bookmark Details Modal ──
  $('#details-close').addEventListener('click', closeDetailsModal);
  $('#details-modal').addEventListener('click', (e) => {
    if (e.target === $('#details-modal')) closeDetailsModal();
  });
  $('#edit-details-form').addEventListener('submit', handleSaveDetails);

  // —— Reader Mode ──
  $('#reader-close-btn').addEventListener('click', closeReaderMode);

  // —— Read Later Filter Pills ──
  $$('.read-later-filters button, .read-later-filters .filter-pill').forEach(pill => {
    pill.addEventListener('click', () => handleReadLaterFilter(pill.dataset.rlFilter));
  });
}

/* ────────────────────────────────────
   Drag & Drop Helpers
   ──────────────────────────────────── */
function onDragEnter(e) { e.preventDefault(); $('#drop-zone').classList.add('drag-over'); }
function onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
function onDragLeave(e) { $('#drop-zone').classList.remove('drag-over'); }

/* ────────────────────────────────────
   File Handling
   ──────────────────────────────────── */
function handleFileDrop(e) {
  e.preventDefault();
  $('#drop-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

async function processFile(file) {
  if (!file.name.match(/\.html?$/i)) {
    showToast(t('errors.invalidFile') || 'Please select an HTML bookmark file.', 'error');
    return;
  }

  showView('processing');
  updateProgress(10, t('processing.reading') || 'Reading file…');

  try {
    const text = await readFileText(file);
    updateProgress(30, t('processing.parsing') || 'Parsing bookmarks…');

    const parsed = parseBookmarkHTML(text);
    state.bookmarks = flattenBookmarks(parsed);

    if (!state.bookmarks.length) {
      showToast(t('errors.noBookmarks') || 'No bookmarks found in the file.', 'warning');
      showView('upload');
      return;
    }

    updateProgress(50, t('processing.categorizing') || 'Categorizing bookmarks…');

    // Attempt AI classification if key available
    let enhanced = false;
    if (state.apiKey) {
      try {
        updateProgress(55, t('processing.ai') || 'Running AI classification…');
        const categories = getCategories(state.customCategories);
        const categoryIds = categories.map(c => c.id);
        const aiResults = await classifyWithGemini(state.bookmarks, state.apiKey, categoryIds);
        if (aiResults && aiResults.size > 0) {
          state.bookmarks = state.bookmarks.map(bm => {
            if (aiResults.has(bm.id)) {
              return { ...bm, aiCategory: aiResults.get(bm.id) };
            }
            return bm;
          });
          enhanced = true;
        }
      } catch (err) {
        console.error('[app] AI classification error:', err);
        // Fallback to rule-based silently
      }
    }

    updateProgress(75, t('processing.organizing') || 'Organizing…');
    state.organizedData = categorizeBookmarks(state.bookmarks);
    updateProgress(100, t('processing.done') || 'Done!');

    await delay(400);
    showView('results');
    renderResults(state.organizedData);

    const msg = enhanced
      ? (t('toast.aiSuccess') || 'Bookmarks organized with AI assistance!')
      : (t('toast.success') || 'Bookmarks organized successfully!');
    showToast(msg, 'success');

  } catch (err) {
    console.error(err);
    showToast(t('errors.processingFailed') || 'Failed to process bookmarks.', 'error');
    showView('upload');
  }
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/* ────────────────────────────────────
   Demo Bookmarks
   ──────────────────────────────────── */
async function loadDemoBookmarks() {
  const demoBookmarks = [
    { title: 'GitHub', url: 'https://github.com', icon: '' },
    { title: 'Stack Overflow - Where Developers Learn', url: 'https://stackoverflow.com', icon: '' },
    { title: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: '' },
    { title: 'VS Code - Code Editor', url: 'https://code.visualstudio.com', icon: '' },
    { title: 'npm - Node Package Manager', url: 'https://www.npmjs.com', icon: '' },
    { title: 'YouTube', url: 'https://youtube.com', icon: '' },
    { title: 'Netflix - Watch Movies & Shows', url: 'https://netflix.com', icon: '' },
    { title: 'Spotify - Music for Everyone', url: 'https://spotify.com', icon: '' },
    { title: 'Twitch - Live Streaming', url: 'https://twitch.tv', icon: '' },
    { title: 'Amazon - Shopping Cart', url: 'https://amazon.com/cart', icon: '' },
    { title: 'eBay - Online Auctions', url: 'https://ebay.com', icon: '' },
    { title: 'Etsy - Handmade & Vintage', url: 'https://etsy.com', icon: '' },
    { title: 'CNN Breaking News', url: 'https://cnn.com', icon: '' },
    { title: 'BBC World News', url: 'https://bbc.com/news', icon: '' },
    { title: 'The New York Times', url: 'https://nytimes.com', icon: '' },
    { title: 'Reddit - Front Page of Internet', url: 'https://reddit.com', icon: '' },
    { title: 'Coursera - Machine Learning', url: 'https://coursera.org/learn/ml', icon: '' },
    { title: 'Khan Academy - Free Courses', url: 'https://khanacademy.org', icon: '' },
    { title: 'Udemy - Online Learning', url: 'https://udemy.com', icon: '' },
    { title: 'Gmail - Google Mail', url: 'https://mail.google.com', icon: '' },
    { title: 'Google Drive', url: 'https://drive.google.com', icon: '' },
    { title: 'Notion - All-in-one Workspace', url: 'https://notion.so', icon: '' },
    { title: 'Slack - Team Communication', url: 'https://slack.com', icon: '' },
    { title: 'Twitter / X', url: 'https://x.com', icon: '' },
    { title: 'Instagram', url: 'https://instagram.com', icon: '' },
    { title: 'LinkedIn - Professional Network', url: 'https://linkedin.com', icon: '' },
    { title: 'Facebook', url: 'https://facebook.com', icon: '' },
    { title: 'Wikipedia', url: 'https://wikipedia.org', icon: '' },
    { title: 'Medium - Quality Reading', url: 'https://medium.com', icon: '' },
    { title: 'Figma - Design Tool', url: 'https://figma.com', icon: '' },
    { title: 'Dribbble - Design Inspiration', url: 'https://dribbble.com', icon: '' },
    { title: 'Canva - Online Design', url: 'https://canva.com', icon: '' },
    { title: 'Google Maps', url: 'https://maps.google.com', icon: '' },
    { title: 'Booking.com - Hotels', url: 'https://booking.com', icon: '' },
    { title: 'Airbnb - Vacation Rentals', url: 'https://airbnb.com', icon: '' },
    { title: 'TripAdvisor', url: 'https://tripadvisor.com', icon: '' },
    { title: 'WebMD - Health Information', url: 'https://webmd.com', icon: '' },
    { title: 'Bank of America - Online Banking', url: 'https://bankofamerica.com', icon: '' },
    { title: 'Coinbase - Buy Bitcoin', url: 'https://coinbase.com', icon: '' },
    { title: 'Steam - PC Gaming Platform', url: 'https://store.steampowered.com', icon: '' },
    { title: 'Epic Games Store', url: 'https://store.epicgames.com', icon: '' },
  ];

  showView('processing');
  updateProgress(20, t('processing.parsing') || 'Parsing demo bookmarks…');
  await delay(500);

  state.bookmarks = demoBookmarks.map((b, i) => ({
    ...b,
    id: `demo-${i}`,
    addDate: Date.now()
  }));

  updateProgress(60, t('processing.categorizing') || 'Categorizing bookmarks…');
  await delay(600);

  state.organizedData = categorizeBookmarks(state.bookmarks);
  updateProgress(100, t('processing.done') || 'Done!');
  await delay(350);

  showView('results');
  renderResults(state.organizedData);
  showToast(t('toast.demoLoaded') || 'Demo bookmarks loaded!', 'info');
}

/* ────────────────────────────────────
   View Management
   ──────────────────────────────────── */
function showView(viewName) {
  state.currentView = viewName;
  const sections = ['upload-section', 'processing-section', 'results-section'];
  sections.forEach(id => {
    const el = $(`#${id}`);
    if (id === `${viewName}-section`) {
      el.style.display = '';
      el.classList.add('active');
    } else {
      el.classList.remove('active');
      el.style.display = 'none';
    }
  });

  // Hide export when switching views
  if (viewName !== 'results') {
    $('#export-section').classList.remove('active');
  }
}

function updateProgress(percent, text) {
  const fill = $('#progress-bar-fill');
  fill.style.width = `${percent}%`;
  fill.setAttribute('aria-valuenow', percent);
  if (text) {
    $('#processing-status').textContent = text;
  }
}

/* ────────────────────────────────────
   Render Results
   ──────────────────────────────────── */
function renderResults(data) {
  if (!data) return;

  // Summary counts
  let totalBookmarks = 0;
  const entries = Object.entries(data);
  entries.forEach(([, bks]) => { totalBookmarks += bks.length; });

  const countEl = $('#results-count');
  countEl.innerHTML = `<strong>${totalBookmarks.toLocaleString()}</strong> ${t('results.bookmarksIn') || 'bookmarks in'} <strong>${entries.length}</strong> ${t('results.categories') || 'categories'}`;

  // Expand all by default
  entries.forEach(([cat]) => state.expandedCategories.add(cat));

  renderTreeView(data);
  renderStats(data);
  renderDonutChart($('#donut-chart'), data);
  $('#donut-total').textContent = totalBookmarks.toLocaleString();

  // Phase 2: Tags
  try {
    state.tagIndex = buildTagIndex(state.bookmarks);
    renderTagCloud();
  } catch (e) { console.warn('[tags]', e); }

  // Phase 2: Analytics
  try {
    renderCurrentAnalytics();
    renderInsights();
  } catch (e) { console.warn('[analytics]', e); }

  // Reset link state on new data
  state.linkResults = null;
  state.linkFilter = 'all';
  $('#link-filter-pills').style.display = 'none';
}

/* ────────────────────────────────────
   Tree View
   ──────────────────────────────────── */
function renderTreeView(data) {
  const container = $('#tree-container');
  container.innerHTML = '';

  const allCategories = getAllCategoryMeta();
  const entries = Object.entries(data).sort((a, b) => b[1].length - a[1].length);

  entries.forEach(([categoryKey, bookmarks], idx) => {
    const meta = allCategories[categoryKey] || { emoji: '📁', color: getCategoryColor(idx) };
    const categoryName = getCategoryDisplayName(categoryKey, meta);

    const section = document.createElement('div');
    section.className = 'category-section';
    if (state.expandedCategories.has(categoryKey)) section.classList.add('expanded');
    section.style.animationDelay = `${idx * 80}ms`;
    section.dataset.category = categoryKey;

    // Header
    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `
      <span class="category-chevron">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </span>
      <span class="category-emoji">${meta.emoji || '📁'}</span>
      <span class="category-name">${escapeHtml(categoryName)}</span>
      <span class="category-count">${bookmarks.length}</span>
    `;
    header.addEventListener('click', () => toggleCategory(section, categoryKey));

    // Body
    const body = document.createElement('div');
    body.className = 'category-body';

    bookmarks.forEach((bk) => {
      const item = createBookmarkItem(bk, categoryKey, meta);
      body.appendChild(item);
    });

    section.appendChild(header);
    section.appendChild(body);

    // Category-level drag target
    section.addEventListener('dragover', (e) => {
      e.preventDefault();
      section.classList.add('drag-target');
    });
    section.addEventListener('dragleave', (e) => {
      if (!section.contains(e.relatedTarget)) section.classList.remove('drag-target');
    });
    section.addEventListener('drop', (e) => {
      e.preventDefault();
      section.classList.remove('drag-target');
      const bookmarkId = e.dataTransfer.getData('text/plain');
      if (bookmarkId) moveBookmark(bookmarkId, categoryKey);
    });

    container.appendChild(section);
  });

  if (entries.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📂</div>
        <p class="empty-state-title" data-i18n="empty.title">No bookmarks yet</p>
        <p class="empty-state-text" data-i18n="empty.text">Upload a bookmark file to get started</p>
      </div>
    `;
  }
}

function createBookmarkItem(bk, categoryKey, meta) {
  const item = document.createElement('div');
  item.className = 'bookmark-item';
  const id = bk.id || bk.url;
  item.dataset.id = id;
  item.dataset.title = (bk.title || '').toLowerCase();
  item.dataset.url = (bk.url || '').toLowerCase();
  item.draggable = true;

  const isChecked = state.selectedBookmarks.has(id);
  if (isChecked) {
    item.classList.add('selected');
  }

  const domain = getDomain(bk.url);
  const faviconUrl = bk.icon || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  const truncUrl = truncateUrl(bk.url, 55);

  // Generate tags for this bookmark
  let tagsHtml = '';
  try {
    const tags = bk.tags || generateTags(bk);
    if (tags.length) {
      tagsHtml = `<div class="bookmark-tags">${tags.slice(0, 4).map(t => `<span class="bookmark-tag">${escapeHtml(t)}</span>`).join('')}</div>`;
    }
  } catch (e) { /* ignore */ }

  // Link status badge
  let statusBadge = '';
  if (state.linkResults) {
    const lr = state.linkResults.get(id);
    if (lr) {
      const labels = { alive: '✓', dead: '✕', unknown: '?' };
      const rescueBtn = lr.status === 'dead' ? `<button class="bookmark-action-btn rescue-btn" style="margin-left:6px;padding:2px 4px;font-size:0.68rem" title="${t('linkChecker.rescue') || 'Rescue'}" data-action="rescue-wayback">🕒</button>` : '';
      statusBadge = `<span class="link-status-badge ${lr.status}">${labels[lr.status] || ''} ${t(`linkChecker.${lr.status}`) || lr.status}${rescueBtn}</span>`;
    }
  }

  // Description / Notes HTML
  let descHtml = '';
  if (bk.description) {
    descHtml = `<div class="bookmark-description" title="${escapeHtml(bk.description)}">${escapeHtml(bk.description)}</div>`;
  }

  const checkboxHtml = `<input type="checkbox" class="bookmark-item-checkbox" ${isChecked ? 'checked' : ''} aria-label="Select bookmark">`;

  item.innerHTML = `
    ${checkboxHtml}
    <img class="bookmark-favicon" src="${escapeHtml(faviconUrl)}" alt="" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22><rect width=%2216%22 height=%2216%22 rx=%224%22 fill=%22%23333%22/></svg>'">
    <div class="bookmark-info">
      <div style="display:flex;align-items:center;gap:var(--space-sm);flex-wrap:wrap">
        <span class="bookmark-title">${escapeHtml(bk.title || domain)}</span>
        ${bk.rating ? `<span class="star-rating-display">${'★'.repeat(bk.rating)}</span>` : ''}
      </div>
      <span class="bookmark-url">${escapeHtml(truncUrl)}</span>
      ${descHtml}
      ${tagsHtml}
    </div>
    ${statusBadge}
    <div class="bookmark-actions">
      <button class="bookmark-action-btn" title="Open" data-action="open-url">🔗</button>
      <button class="bookmark-action-btn" title="Delete" data-action="delete-bk">✕</button>
    </div>
  `;

  // Checkbox state listener
  const checkbox = item.querySelector('.bookmark-item-checkbox');
  checkbox.addEventListener('change', (e) => {
    e.stopPropagation();
    if (e.target.checked) {
      state.selectedBookmarks.add(id);
      item.classList.add('selected');
    } else {
      state.selectedBookmarks.delete(id);
      item.classList.remove('selected');
    }
    updateBulkEditBar();
  });

  // Row selection in bulk selection mode
  item.addEventListener('click', (e) => {
    if (state.bulkSelectActive) {
      if (e.target.classList.contains('bookmark-item-checkbox') || e.target.closest('.bookmark-actions') || e.target.closest('.rescue-btn')) return;
      const cb = item.querySelector('.bookmark-item-checkbox');
      if (state.selectedBookmarks.has(id)) {
        state.selectedBookmarks.delete(id);
        cb.checked = false;
        item.classList.remove('selected');
      } else {
        state.selectedBookmarks.add(id);
        cb.checked = true;
        item.classList.add('selected');
      }
      updateBulkEditBar();
    }
  });

  // Click actions
  item.querySelector('[data-action="open-url"]').addEventListener('click', (e) => {
    e.stopPropagation();
    window.open(bk.url, '_blank', 'noopener');
  });
  item.querySelector('[data-action="delete-bk"]').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteBookmark(id, categoryKey);
  });

  // Wayback Rescue handler
  const rescueBtn = item.querySelector('[data-action="rescue-wayback"]');
  if (rescueBtn) {
    rescueBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      showToast(t('linkChecker.scanning') || 'Checking Wayback Machine...', 'info');
      const res = await checkWaybackAvailability(bk.url);
      if (res.available && res.url) {
        bk.url = res.url;
        state.organizedData = categorizeBookmarks(state.bookmarks);
        renderResults(state.organizedData);
        showToast(t('toast.rescued') || 'Bookmark rescued via Wayback Machine!', 'success');
      } else {
        showToast(t('toast.rescueFailed') || 'No Wayback snapshot available.', 'error');
      }
    });
  }

  // Context menu
  item.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    state.contextTarget = { bookmark: bk, category: categoryKey };
    showContextMenu(e.clientX, e.clientY);
  });

  // Drag
  item.addEventListener('dragstart', (e) => {
    if (state.bulkSelectActive) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', id);
    item.classList.add('dragging');
  });
  item.addEventListener('dragend', () => item.classList.remove('dragging'));

  return item;
}

/* ────────────────────────────────────
   Category Toggle
   ──────────────────────────────────── */
function toggleCategory(section, key) {
  const isExpanded = section.classList.toggle('expanded');
  if (isExpanded) {
    state.expandedCategories.add(key);
  } else {
    state.expandedCategories.delete(key);
  }
}

function expandAll() {
  $$('.category-section').forEach(s => {
    s.classList.add('expanded');
    state.expandedCategories.add(s.dataset.category);
  });
}

function collapseAll() {
  $$('.category-section').forEach(s => {
    s.classList.remove('expanded');
  });
  state.expandedCategories.clear();
}

/* ────────────────────────────────────
   Donut Chart (Canvas 2D)
   ──────────────────────────────────── */
function renderDonutChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 180;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = 82;
  const innerR = 54;

  const entries = Object.entries(data).sort((a, b) => b[1].length - a[1].length);
  const total = entries.reduce((s, [, b]) => s + b.length, 0);
  if (total === 0) return;

  const slices = entries.map(([key, bks], i) => ({
    key,
    count: bks.length,
    color: getCategoryColor(i),
    ratio: bks.length / total
  }));

  // Animate drawing
  let progress = 0;
  const animDuration = 900;
  const startTime = performance.now();

  function drawFrame(now) {
    progress = Math.min((now - startTime) / animDuration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    ctx.clearRect(0, 0, size, size);

    let startAngle = -Math.PI / 2;
    const totalAngle = Math.PI * 2 * eased;

    slices.forEach(sl => {
      const sliceAngle = sl.ratio * totalAngle;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = sl.color;
      ctx.fill();

      // Subtle gap
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle + sliceAngle - 0.01, startAngle + sliceAngle + 0.01);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle + 0.01, startAngle + sliceAngle - 0.01, true);
      ctx.closePath();
      ctx.fillStyle = '#06060f';
      ctx.fill();

      startAngle += sliceAngle;
    });

    if (progress < 1) requestAnimationFrame(drawFrame);
  }

  requestAnimationFrame(drawFrame);

  // Tooltip on hover
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < innerR || dist > outerR) {
      canvas.title = '';
      canvas.style.cursor = 'default';
      return;
    }
    let angle = Math.atan2(y, x) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    let cumulative = 0;
    for (const sl of slices) {
      cumulative += sl.ratio * Math.PI * 2;
      if (angle <= cumulative) {
        canvas.title = `${sl.key}: ${sl.count} (${(sl.ratio * 100).toFixed(1)}%)`;
        canvas.style.cursor = 'pointer';
        return;
      }
    }
  };
}

/* ────────────────────────────────────
   Stats Breakdown
   ──────────────────────────────────── */
function renderStats(data) {
  const container = $('#stats-breakdown');
  container.innerHTML = '';

  const entries = Object.entries(data).sort((a, b) => b[1].length - a[1].length);
  const total = entries.reduce((s, [, b]) => s + b.length, 0);
  const allCategories = getAllCategoryMeta();

  entries.forEach(([key, bks], idx) => {
    const meta = allCategories[key] || {};
    const color = meta.color || getCategoryColor(idx);
    const pct = total ? ((bks.length / total) * 100).toFixed(1) : 0;
    const name = getCategoryDisplayName(key, meta);

    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <span class="stat-dot" style="background:${color}"></span>
      <span class="stat-name">${meta.emoji || ''} ${escapeHtml(name)}</span>
      <span class="stat-count">${bks.length}</span>
      <div class="stat-bar-track">
        <div class="stat-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

/* ────────────────────────────────────
   Export
   ──────────────────────────────────── */
function handleExport() {
  if (!state.organizedData) {
    showToast(t('errors.noData') || 'No data to export.', 'warning');
    return;
  }
  try {
    const filename = $('#export-filename').value.trim() || 'bookmarks_organized.html';
    const html = exportToHTML(state.organizedData);
    downloadFile(html, filename, 'text/html');
    showToast(t('toast.exported') || 'Bookmarks exported successfully!', 'success');
  } catch (err) {
    console.error(err);
    showToast(t('errors.exportFailed') || 'Export failed.', 'error');
  }
}

async function handleExportAndClear() {
  if (!state.organizedData) {
    showToast(t('errors.noData') || 'No data to export.', 'warning');
    return;
  }
  try {
    const filename = $('#export-filename').value.trim() || 'bookmarks_organized.html';
    const html = exportToHTML(state.organizedData);
    downloadFile(html, filename, 'text/html');
    showToast(t('toast.exported') || 'Bookmarks exported successfully!', 'success');
    
    // Tiny delay to ensure browser schedules download
    await delay(800);
    
    // Clear all bookmark data loaded in browser memory
    state.bookmarks = [];
    state.organizedData = null;
    state.selectedBookmarks.clear();
    state.contextTarget = null;
    
    // Reset file input element
    $('#file-input').value = '';
    
    // Transition UI back to upload view
    showView('upload');
    
    showToast(t('toast.sessionCleared') || 'Session data securely cleared from browser memory.', 'success');
  } catch (err) {
    console.error(err);
    showToast(t('errors.exportFailed') || 'Export failed.', 'error');
  }
}

/* ────────────────────────────────────
   Settings Modal
   ──────────────────────────────────── */
function openSettings() {
  $('#settings-modal').classList.add('active');
  renderCustomCategoriesList();
  document.body.style.overflow = 'hidden';
}

function closeSettings() {
  $('#settings-modal').classList.remove('active');
  document.body.style.overflow = '';
}

function switchSettingsTab(tabId) {
  $$('.modal-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
    t.setAttribute('aria-selected', t.dataset.tab === tabId);
  });
  $$('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === `panel-${tabId}`);
  });
}

/* ────────────────────────────────────
   API Key
   ──────────────────────────────────── */
async function handleApiKeySave() {
  const key = $('#api-key-input').value.trim();
  if (!key) {
    showToast(t('errors.emptyKey') || 'Please enter an API key.', 'warning');
    return;
  }

  showToast(t('toast.testingKey') || 'Testing API key…', 'info');

  try {
    const valid = await testApiKey(key);
    if (valid) {
      state.apiKey = key;
      localStorage.setItem('bookmarkOrganizer_apiKey', key);
      setApiKeyStatus(true);
      showToast(t('toast.keyValid') || 'API key is valid!', 'success');
    } else {
      setApiKeyStatus(false);
      showToast(t('errors.invalidKey') || 'Invalid API key.', 'error');
    }
  } catch {
    setApiKeyStatus(false);
    showToast(t('errors.keyTestFailed') || 'Could not verify key.', 'error');
  }
}

function handleApiKeyClear() {
  state.apiKey = null;
  localStorage.removeItem('bookmarkOrganizer_apiKey');
  $('#api-key-input').value = '';
  setApiKeyStatus(false);
  showToast(t('toast.keyCleared') || 'API key cleared.', 'info');
}

function setApiKeyStatus(connected) {
  const el = $('#api-key-status');
  el.className = `api-key-status ${connected ? 'connected' : 'disconnected'}`;
  el.innerHTML = connected
    ? `<span>●</span><span>${t('settings.connected') || 'Connected'}</span>`
    : `<span>●</span><span>${t('settings.notConnected') || 'Not connected'}</span>`;
}

/* ────────────────────────────────────
   Custom Categories CRUD
   ──────────────────────────────────── */
function handleAddCustomCategory(e) {
  e.preventDefault();

  const nameEn = $('#cat-name-en').value.trim();
  const nameEs = $('#cat-name-es').value.trim();
  const emoji = $('#cat-emoji').value.trim() || '📁';
  const color = $('#cat-color').value;
  const domains = $('#cat-domains').value.split('\n').map(d => d.trim()).filter(Boolean);
  const keywords = $('#cat-keywords').value.split('\n').map(k => k.trim()).filter(Boolean);

  if (!nameEn) {
    showToast(t('errors.nameRequired') || 'Category name (English) is required.', 'warning');
    return;
  }

  const cat = {
    id: `custom_${Date.now()}`,
    name: { en: nameEn, es: nameEs || nameEn },
    emoji,
    color,
    domains,
    keywords
  };

  try {
    addCustomCategory(cat);
    state.customCategories.push(cat);
    saveCustomCategories(state.customCategories);
    renderCustomCategoriesList();

    // Clear form
    $('#add-category-form').reset();
    $('#cat-color').value = '#667eea';

    showToast(t('toast.categoryAdded') || `Category "${nameEn}" added!`, 'success');

    // Re-categorize if we have data
    if (state.bookmarks.length) {
      state.organizedData = categorizeBookmarks(state.bookmarks);
      renderResults(state.organizedData);
    }
  } catch (err) {
    console.error(err);
    showToast(t('errors.addFailed') || 'Failed to add category.', 'error');
  }
}

function handleRemoveCustomCategory(id) {
  try {
    removeCustomCategory(id);
    state.customCategories = state.customCategories.filter(c => c.id !== id);
    saveCustomCategories(state.customCategories);
    renderCustomCategoriesList();
    showToast(t('toast.categoryRemoved') || 'Category removed.', 'info');

    // Re-categorize if we have data
    if (state.bookmarks.length) {
      state.organizedData = categorizeBookmarks(state.bookmarks);
      renderResults(state.organizedData);
    }
  } catch (err) {
    console.error(err);
    showToast(t('errors.removeFailed') || 'Failed to remove category.', 'error');
  }
}

function renderCustomCategoriesList() {
  const container = $('#custom-categories-list');
  container.innerHTML = '';

  if (!state.customCategories.length) {
    container.innerHTML = `<p style="font-size:0.83rem;color:var(--text-muted);padding:var(--space-sm) 0" data-i18n="settings.noCustom">No custom categories yet.</p>`;
    return;
  }

  state.customCategories.forEach(cat => {
    const item = document.createElement('div');
    item.className = 'custom-category-item';
    item.innerHTML = `
      <span class="category-emoji">${cat.emoji || '📁'}</span>
      <span class="category-name">${escapeHtml(cat.name[state.language] || cat.name.en)}</span>
      <span class="category-badge" style="background:${cat.color}22;color:${cat.color}">${cat.domains?.length || 0} domains</span>
      <button class="bookmark-action-btn btn-danger" title="Remove" style="opacity:1">✕</button>
    `;
    item.querySelector('button').addEventListener('click', () => handleRemoveCustomCategory(cat.id));
    container.appendChild(item);
  });
}

/* ────────────────────────────────────
   Language
   ──────────────────────────────────── */
function handleLanguageChange(lang) {
  state.language = lang;
  setLanguage(lang);
  $('#language-select').value = lang;
  $('#settings-language').value = lang;
  updateTranslations();

  // Re-render tree names if results visible
  if (state.organizedData) {
    renderTreeView(state.organizedData);
    renderStats(state.organizedData);
  }

  if (state.customCategories.length) renderCustomCategoriesList();
}

function updateTranslations() {
  $$('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (translation) el.textContent = translation;
  });
  $$('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translation = t(key);
    if (translation) el.placeholder = translation;
  });
}

/* ────────────────────────────────────
   Search
   ──────────────────────────────────── */
function handleSearch(query) {
  state.searchQuery = query.toLowerCase().trim();

  if (state.activeTab === 'readlater') {
    renderReadLaterList();
    return;
  }

  if (state.semanticSearchActive && state.apiKey && state.searchQuery) {
    runSemanticSearch(query);
    return;
  }

  if (!state.searchQuery) {
    // Restore default tree
    renderTreeView(state.organizedData);
    return;
  }

  // Local fuzzy search ranking
  const results = fuzzySearch(state.bookmarks, query);
  renderTreeView({ 'search-results': results });
}

/* ────────────────────────────────────
   Bookmark Operations
   ──────────────────────────────────── */
function deleteBookmark(bookmarkId, categoryKey) {
  if (!state.organizedData || !state.organizedData[categoryKey]) return;

  state.organizedData[categoryKey] = state.organizedData[categoryKey].filter(
    b => (b.id || b.url) !== bookmarkId
  );

  // Remove category if empty
  if (state.organizedData[categoryKey].length === 0) {
    delete state.organizedData[categoryKey];
  }

  // Also remove from flat list
  state.bookmarks = state.bookmarks.filter(b => (b.id || b.url) !== bookmarkId);

  renderResults(state.organizedData);
  showToast(t('toast.deleted') || 'Bookmark removed.', 'info');
}

function moveBookmark(bookmarkId, targetCategory) {
  if (!state.organizedData) return;

  let movedBookmark = null;
  let sourceCategory = null;

  // Find and remove from source
  for (const [cat, bks] of Object.entries(state.organizedData)) {
    const idx = bks.findIndex(b => (b.id || b.url) === bookmarkId);
    if (idx !== -1) {
      movedBookmark = bks.splice(idx, 1)[0];
      sourceCategory = cat;
      if (bks.length === 0) delete state.organizedData[cat];
      break;
    }
  }

  if (!movedBookmark || sourceCategory === targetCategory) return;

  // Add to target
  if (!state.organizedData[targetCategory]) state.organizedData[targetCategory] = [];
  state.organizedData[targetCategory].push(movedBookmark);

  renderResults(state.organizedData);
  showToast(t('toast.moved') || `Moved to ${targetCategory}.`, 'success');
}

/* ────────────────────────────────────
   Context Menu
   ──────────────────────────────────── */
function showContextMenu(x, y) {
  const menu = $('#context-menu');
  menu.classList.add('active');
  menu.style.left = `${Math.min(x, window.innerWidth - 200)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - 160)}px`;
}

function hideContextMenu() {
  $('#context-menu').classList.remove('active');
  state.contextTarget = null;
}

function handleContextAction(action) {
  const target = state.contextTarget;
  hideContextMenu();
  if (!target) return;

  switch (action) {
    case 'open':
      window.open(target.bookmark.url, '_blank', 'noopener');
      break;
    case 'edit':
      openDetailsModal(target.bookmark);
      break;
    case 'readlater': {
      const rlItem = addToReadLater(target.bookmark);
      if (rlItem) {
        state.readLaterList = loadReadLater();
        showToast(t('toast.addedToReadLater') || 'Added to Read Later queue.', 'success');
      } else {
        showToast(state.language === 'es' ? 'Ya está en la lista de lectura.' : 'Already in reading list.', 'info');
      }
      break;
    }
    case 'move': {
      // Simple prompt to pick category
      const categories = Object.keys(state.organizedData || {}).filter(c => c !== target.category);
      if (!categories.length) {
        showToast(t('errors.noOtherCats') || 'No other categories available.', 'warning');
        return;
      }
      const choice = prompt(
        `Move "${target.bookmark.title}" to:\n${categories.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nEnter number:`
      );
      const idx = parseInt(choice, 10) - 1;
      if (idx >= 0 && idx < categories.length) {
        moveBookmark(target.bookmark.id || target.bookmark.url, categories[idx]);
      }
      break;
    }
    case 'delete':
      deleteBookmark(target.bookmark.id || target.bookmark.url, target.category);
      break;
  }
}

/* ────────────────────────────────────
   Toast Notifications
   ──────────────────────────────────── */
function showToast(message, type = 'info', duration = 4000) {
  const container = $('#toast-container');

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const titles = { success: 'Success', error: 'Error', info: 'Info', warning: 'Warning' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.setProperty('--toast-duration', `${duration}ms`);
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <div class="toast-content">
      <div class="toast-title">${titles[type] || 'Info'}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-dismiss" aria-label="Dismiss">×</button>
    <div class="toast-progress"></div>
  `;

  toast.querySelector('.toast-dismiss').addEventListener('click', () => dismissToast(toast));

  container.appendChild(toast);

  // Auto-dismiss
  const timer = setTimeout(() => dismissToast(toast), duration);
  toast._timer = timer;
}

function dismissToast(toast) {
  if (toast._dismissed) return;
  toast._dismissed = true;
  clearTimeout(toast._timer);
  toast.classList.add('exiting');
  toast.addEventListener('animationend', () => toast.remove());
}

/* ────────────────────────────────────
   Helpers
   ──────────────────────────────────── */
function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function truncateUrl(url, max = 50) {
  if (!url) return '';
  try {
    const u = new URL(url);
    const display = u.hostname.replace(/^www\./, '') + u.pathname;
    return display.length > max ? display.slice(0, max) + '…' : display;
  } catch {
    return url.length > max ? url.slice(0, max) + '…' : url;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getAllCategoryMeta() {
  try {
    const cats = getAllCategories();
    const meta = {
      'search-results': {
        emoji: '🧠',
        color: '#4facfe',
        name: {
          en: 'Search Results',
          es: 'Resultados de Búsqueda'
        }
      }
    };
    if (Array.isArray(cats)) {
      cats.forEach((c, i) => {
        const key = c.id || c.name?.en || c.name || `cat-${i}`;
        meta[key] = {
          emoji: c.emoji || '📁',
          color: c.color || getCategoryColor(i),
          name: c.name || {}
        };
      });
    } else if (typeof cats === 'object') {
      Object.entries(cats).forEach(([key, c], i) => {
        meta[key] = {
          emoji: c.emoji || '📁',
          color: c.color || getCategoryColor(i),
          name: c.name || {}
        };
      });
    }
    return meta;
  } catch {
    return {};
  }
}

function getCategoryDisplayName(key, meta) {
  if (meta && meta.name) {
    if (typeof meta.name === 'object') {
      return meta.name[state.language] || meta.name.en || key;
    }
    return meta.name;
  }
  return key;
}

/* ════════════════════════════════════
   PHASE 2 — Feature Handlers
   ════════════════════════════════════ */

/* ────────────────────────────────────
   Link Checker
   ──────────────────────────────────── */
async function handleCheckLinks() {
  if (!state.bookmarks.length) {
    showToast(t('errors.noData') || 'No bookmarks loaded.', 'warning');
    return;
  }

  const progressEl = $('#link-scan-progress');
  const textEl = $('#link-scan-text');
  const fillEl = $('#link-scan-fill');
  progressEl.style.display = 'flex';

  try {
    const results = await checkLinks(state.bookmarks, ({ checked, total }) => {
      const pct = Math.round((checked / total) * 100);
      fillEl.style.width = `${pct}%`;
      textEl.textContent = `${checked} / ${total}`;
    });

    state.linkResults = results;
    progressEl.style.display = 'none';
    $('#link-filter-pills').style.display = 'flex';

    // Re-render to show badges
    renderTreeView(state.organizedData);
    showToast(t('toast.linkScanComplete') || 'Link scan complete!', 'success');
  } catch (err) {
    console.error('[link-check]', err);
    progressEl.style.display = 'none';
    showToast(t('errors.processingFailed') || 'Scan failed.', 'error');
  }
}

function handleLinkFilter(filter) {
  state.linkFilter = filter;
  $$('.filter-pill[data-filter]').forEach(p => {
    p.classList.toggle('active', p.dataset.filter === filter);
  });

  if (!state.linkResults) return;

  $$('.bookmark-item').forEach(item => {
    const id = item.dataset.id;
    const lr = state.linkResults.get(id);
    if (filter === 'all') {
      item.style.display = '';
    } else if (lr) {
      item.style.display = lr.status === filter ? '' : 'none';
    } else {
      item.style.display = filter === 'unknown' ? '' : 'none';
    }
  });

  // Hide empty categories
  $$('.category-section').forEach(section => {
    const visible = section.querySelectorAll('.bookmark-item:not([style*="display: none"])');
    section.style.display = visible.length ? '' : 'none';
  });
}

function handleRemoveDeadLinks() {
  if (!state.linkResults || !state.organizedData) return;

  let removed = 0;
  for (const [cat, bks] of Object.entries(state.organizedData)) {
    const before = bks.length;
    state.organizedData[cat] = bks.filter(b => {
      const lr = state.linkResults.get(b.id || b.url);
      return !lr || lr.status !== 'dead';
    });
    removed += before - state.organizedData[cat].length;
    if (state.organizedData[cat].length === 0) delete state.organizedData[cat];
  }

  state.bookmarks = state.bookmarks.filter(b => {
    const lr = state.linkResults.get(b.id || b.url);
    return !lr || lr.status !== 'dead';
  });

  renderResults(state.organizedData);
  showToast(`${t('toast.deadLinksRemoved') || 'Dead links removed.'} (${removed})`, 'success');
}

/* ────────────────────────────────────
   Duplicate Detection
   ──────────────────────────────────── */
function handleFindDuplicates() {
  if (!state.bookmarks.length) {
    showToast(t('errors.noData') || 'No bookmarks loaded.', 'warning');
    return;
  }

  const groups = findDuplicates(state.bookmarks);
  state.duplicateGroups = groups;

  if (!groups.length) {
    showToast(t('toast.noDuplicates') || 'No duplicates found!', 'info');
    return;
  }

  renderDuplicateModal(groups);
  openDuplicateModal();
}

function openDuplicateModal() {
  $('#duplicate-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDuplicateModal() {
  $('#duplicate-modal').classList.remove('active');
  document.body.style.overflow = '';
}

function renderDuplicateModal(groups) {
  const container = $('#duplicate-groups-container');
  const countEl = $('#duplicate-count');
  countEl.textContent = (t('duplicates.found') || '{count} duplicate groups found').replace('{count}', groups.length);
  container.innerHTML = '';

  groups.forEach((group, gi) => {
    const div = document.createElement('div');
    div.className = 'duplicate-group';
    div.style.animationDelay = `${gi * 60}ms`;

    const url = group.normalizedUrl || '';
    div.innerHTML = `
      <div class="duplicate-group-header">
        <span class="duplicate-group-title">${(t('duplicates.group') || 'Group {n}').replace('{n}', gi + 1)} (${group.bookmarks.length})</span>
      </div>
      <div class="duplicate-group-url">${escapeHtml(url)}</div>
    `;

    const best = pickBest(group.bookmarks);

    group.bookmarks.forEach(bk => {
      const isBest = (bk.id || bk.url) === (best.id || best.url);
      const itemDiv = document.createElement('div');
      itemDiv.className = `duplicate-item${isBest ? '' : ' marked-remove'}`;
      itemDiv.dataset.bookmarkId = bk.id || bk.url;

      const domain = getDomain(bk.url);
      const favicon = bk.icon || `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
      const dateStr = bk.addDate ? new Date(bk.addDate * 1000).toLocaleDateString() : '—';

      itemDiv.innerHTML = `
        <img class="bookmark-favicon" src="${escapeHtml(favicon)}" alt="" loading="lazy">
        <div class="duplicate-item-info">
          <div class="duplicate-item-title">${escapeHtml(bk.title || domain)}</div>
          <div class="duplicate-item-meta">${escapeHtml(bk.url)} · ${dateStr}</div>
        </div>
        <button class="duplicate-keep-btn">${isBest ? '★ ' : ''}${t('duplicates.keep') || 'Keep'}</button>
        <button class="duplicate-remove-btn">${t('duplicates.remove') || 'Remove'}</button>
      `;

      itemDiv.querySelector('.duplicate-keep-btn').addEventListener('click', () => {
        itemDiv.classList.remove('marked-remove');
      });
      itemDiv.querySelector('.duplicate-remove-btn').addEventListener('click', () => {
        itemDiv.classList.add('marked-remove');
      });

      div.appendChild(itemDiv);
    });

    container.appendChild(div);
  });
}

function handleAutoMerge() {
  if (!state.duplicateGroups || !state.organizedData) return;

  const idsToRemove = new Set();
  state.duplicateGroups.forEach(group => {
    const best = pickBest(group.bookmarks);
    group.bookmarks.forEach(bk => {
      const id = bk.id || bk.url;
      if (id !== (best.id || best.url)) idsToRemove.add(id);
    });
  });

  // Remove from organized data
  for (const [cat, bks] of Object.entries(state.organizedData)) {
    state.organizedData[cat] = bks.filter(b => !idsToRemove.has(b.id || b.url));
    if (state.organizedData[cat].length === 0) delete state.organizedData[cat];
  }
  state.bookmarks = state.bookmarks.filter(b => !idsToRemove.has(b.id || b.url));

  closeDuplicateModal();
  renderResults(state.organizedData);
  showToast(`${t('toast.duplicatesResolved') || 'Duplicates resolved!'} (${idsToRemove.size} removed)`, 'success');
}

/* ────────────────────────────────────
   Backup & Restore
   ──────────────────────────────────── */
function handleCreateBackup() {
  if (!state.organizedData) {
    showToast(t('errors.noData') || 'No data to backup.', 'warning');
    return;
  }
  try {
    exportBackup(state.organizedData, {
      appVersion: '2.0',
      language: state.language,
      customCategories: state.customCategories
    });
    showToast(t('toast.backupCreated') || 'Backup created!', 'success');
  } catch (err) {
    console.error('[backup]', err);
    showToast(t('errors.processingFailed') || 'Backup failed.', 'error');
  }
}

async function handleRestoreBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const backup = await importBackup(file);
    const summary = getBackupSummary(backup);

    const msg = (t('backup.confirmRestore') || 'Restore will replace current data. Continue?')
      + `\n\n${summary.totalBookmarks} bookmarks, ${summary.categoryCount} categories`;

    if (!confirm(msg)) {
      $('#backup-file-input').value = '';
      return;
    }

    const restored = restoreBackup(backup);
    state.organizedData = restored.organizedData;
    if (restored.customCategories && restored.customCategories.length) {
      state.customCategories = restored.customCategories;
      saveCustomCategories(state.customCategories);
    }

    // Rebuild flat bookmarks list
    state.bookmarks = [];
    Object.values(state.organizedData).forEach(bks => {
      state.bookmarks.push(...bks);
    });

    showView('results');
    renderResults(state.organizedData);
    showToast(t('toast.backupRestored') || 'Backup restored!', 'success');
  } catch (err) {
    console.error('[restore]', err);
    showToast(t('toast.backupInvalid') || 'Invalid backup file.', 'error');
  }

  $('#backup-file-input').value = '';
}

/* ────────────────────────────────────
   Analytics
   ──────────────────────────────────── */
function switchAnalyticsTab(tab) {
  state.analyticsTab = tab;
  $$('.analytics-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.analytics === tab);
    t.setAttribute('aria-selected', t.dataset.analytics === tab);
  });
  renderCurrentAnalytics();
}

function renderCurrentAnalytics() {
  if (!state.organizedData) return;

  const canvas = $('#analytics-canvas');
  const allCats = getAllCategoryMeta();
  const entries = Object.entries(state.organizedData);
  const colors = entries.map(([key], i) => (allCats[key]?.color || getCategoryColor(i)));

  switch (state.analyticsTab) {
    case 'treemap':
      renderTreemap(canvas, state.organizedData, {
        colors,
        getLabel: (key) => getCategoryDisplayName(key, allCats[key])
      });
      break;
    case 'timeline':
      renderTimeline(canvas, state.bookmarks, {
        barColor: getComputedStyle(document.documentElement).getPropertyValue('--accent-blue').trim() || '#667eea',
        labelColor: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#666'
      });
      break;
    case 'topdomains':
      renderTopDomains(canvas, state.bookmarks, {
        limit: 10,
        colors
      });
      break;
  }
}

function renderInsights() {
  if (!state.organizedData || !state.bookmarks.length) return;

  const insights = computeInsights(state.bookmarks, state.organizedData);
  const grid = $('#insights-grid');
  grid.innerHTML = '';

  const items = [
    { label: t('analytics.topCategory') || 'Largest Category', value: insights.topCategory || '—', sub: `${insights.totalCategories} ${t('results.categories') || 'categories'}` },
    { label: t('analytics.topDomain') || 'Top Domain', value: insights.mostPopularDomain || '—', sub: '' },
    { label: t('analytics.avgPerCategory') || 'Avg. per Category', value: insights.avgPerCategory?.toFixed(1) || '—', sub: `${insights.totalBookmarks} total` },
    { label: t('analytics.oldest') || 'Oldest', value: insights.oldestBookmark?.title?.slice(0, 30) || '—', sub: insights.oldestBookmark?.addDate ? new Date(insights.oldestBookmark.addDate * 1000).toLocaleDateString() : '' },
    { label: t('analytics.newest') || 'Newest', value: insights.newestBookmark?.title?.slice(0, 30) || '—', sub: insights.newestBookmark?.addDate ? new Date(insights.newestBookmark.addDate * 1000).toLocaleDateString() : '' },
  ];

  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'insight-item';
    el.innerHTML = `
      <span class="insight-label">${escapeHtml(item.label)}</span>
      <span class="insight-value">${escapeHtml(String(item.value))}</span>
      ${item.sub ? `<span class="insight-sub">${escapeHtml(item.sub)}</span>` : ''}
    `;
    grid.appendChild(el);
  });
}

/* ────────────────────────────────────
   Tag System
   ──────────────────────────────────── */
function renderTagCloud() {
  if (!state.tagIndex || state.tagIndex.size === 0) {
    $('#tag-filter-bar').style.display = 'none';
    return;
  }

  const popular = getPopularTags(state.tagIndex, 15);
  if (!popular.length) {
    $('#tag-filter-bar').style.display = 'none';
    return;
  }

  const cloud = $('#tag-cloud');
  cloud.innerHTML = '';
  $('#tag-filter-bar').style.display = 'flex';

  popular.forEach(({ tag, count }) => {
    const pill = document.createElement('button');
    pill.className = `tag-pill${state.activeTag === tag ? ' active' : ''}`;
    pill.innerHTML = `${escapeHtml(tag)} <span class="tag-count">${count}</span>`;
    pill.addEventListener('click', () => filterByTagHandler(tag));
    cloud.appendChild(pill);
  });
}

function filterByTagHandler(tag) {
  if (state.activeTag === tag) {
    clearTagFilter();
    return;
  }

  state.activeTag = tag;

  // Update pill states
  $$('.tag-pill').forEach(p => {
    p.classList.toggle('active', p.textContent.trim().startsWith(tag));
  });

  $('#tag-clear-btn').style.display = 'inline-flex';

  // Filter visible bookmarks
  const matching = state.tagIndex.get(tag) || new Set();

  $$('.bookmark-item').forEach(item => {
    item.style.display = matching.has(item.dataset.id) ? '' : 'none';
  });

  $$('.category-section').forEach(section => {
    const visible = section.querySelectorAll('.bookmark-item:not([style*="display: none"])');
    section.style.display = visible.length ? '' : 'none';
    if (visible.length && !section.classList.contains('expanded')) {
      section.classList.add('expanded');
    }
  });
}

function clearTagFilter() {
  state.activeTag = null;
  $$('.tag-pill').forEach(p => p.classList.remove('active'));
  $('#tag-clear-btn').style.display = 'none';

  $$('.bookmark-item').forEach(item => { item.style.display = ''; });
  $$('.category-section').forEach(s => { s.style.display = ''; });
}

/* ────────────────────────────────────
   Theme Picker
   ──────────────────────────────────── */
function renderThemePicker() {
  const picker = $('#theme-picker');
  if (!picker) return;
  picker.innerHTML = '';

  const themes = getThemes();
  const current = getCurrentTheme();

  themes.forEach(theme => {
    const swatch = document.createElement('div');
    swatch.className = `theme-swatch${theme.id === current ? ' active' : ''}`;
    swatch.style.background = `${theme.preview.bg}`;
    swatch.style.border = theme.id === current ? `2px solid ${theme.preview.accent}` : '2px solid transparent';

    swatch.innerHTML = `
      <div class="theme-swatch-preview" style="background:${theme.preview.bg}">
        <div style="position:absolute;top:0;right:0;width:50%;height:100%;background:${theme.preview.accent};opacity:0.6"></div>
      </div>
      <span class="theme-swatch-emoji">${theme.emoji}</span>
      <span class="theme-swatch-name" style="color:${theme.preview.text}">${state.language === 'es' ? (theme.nameEs || theme.name) : theme.name}</span>
      <div class="theme-swatch-check">✓</div>
    `;

    swatch.addEventListener('click', () => {
      // Add transition class for smooth color change
      document.documentElement.classList.add('theme-transitioning');
      applyTheme(theme.id);
      renderThemePicker();
      // Re-render charts with new theme colors
      try { renderCurrentAnalytics(); } catch(e) { /* */ }
      try {
        renderDonutChart($('#donut-chart'), state.organizedData);
      } catch(e) { /* */ }
      showToast(t('toast.themeChanged') || 'Theme applied!', 'success');
      // Remove transition class after animation
      setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 350);
    });

    picker.appendChild(swatch);
  });
}

/* ════════════════════════════════════
   PHASE 3 — Helper Functions
   ════════════════════════════════════ */

// —— View Tab switcher ——
function switchMainTab(tab) {
  state.activeTab = tab;
  
  const catBtn = $('#tab-categories-btn');
  const rlBtn = $('#tab-readlater-btn');
  const resultsContent = $('#results-content');
  const readLaterContent = $('#read-later-content');
  const insightsCard = $('#insights-card');
  const chartCard = $('#chart-card');
  const breakdownCard = $('#breakdown-card');
  const tagFilterBar = $('#tag-filter-bar');
  const toolsToolbar = $('#tools-toolbar');
  
  if (tab === 'categories') {
    catBtn.classList.add('active');
    rlBtn.classList.remove('active');
    resultsContent.style.display = '';
    readLaterContent.style.display = 'none';
    if (insightsCard) insightsCard.style.display = '';
    if (chartCard) chartCard.style.display = '';
    if (breakdownCard) breakdownCard.style.display = '';
    if (tagFilterBar && state.tagIndex && state.tagIndex.size > 0) tagFilterBar.style.display = 'flex';
    if (toolsToolbar) toolsToolbar.style.display = 'flex';
  } else {
    catBtn.classList.remove('active');
    rlBtn.classList.add('active');
    resultsContent.style.display = 'none';
    readLaterContent.style.display = 'block';
    if (insightsCard) insightsCard.style.display = 'none';
    if (chartCard) chartCard.style.display = 'none';
    if (breakdownCard) breakdownCard.style.display = 'none';
    if (tagFilterBar) tagFilterBar.style.display = 'none';
    if (toolsToolbar) toolsToolbar.style.display = 'none';
    
    renderReadLaterList();
  }
}

// —— Semantic Search Toggle ——
function toggleSemanticSearch() {
  if (!state.apiKey) {
    showToast(state.language === 'es' ? 'Por favor, configura tu clave API de Gemini en Ajustes primero.' : 'Please configure your Gemini API Key in Settings first.', 'warning');
    return;
  }
  
  state.semanticSearchActive = !state.semanticSearchActive;
  const btn = $('#semantic-search-btn');
  btn.classList.toggle('active', state.semanticSearchActive);
  
  const query = $('#search-input').value;
  if (query) {
    handleSearch(query);
  }
}

async function runSemanticSearch(query) {
  const container = $('#tree-container');
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;padding:var(--space-2xl);color:var(--text-secondary);grid-column:1/-1">
      <div class="loader-spinner" style="margin-bottom:var(--space-md)"></div>
      <p>${t('search.searching') || 'Searching semantically…'}</p>
    </div>
  `;
  
  try {
    const results = await aiSemanticSearch(state.bookmarks, query, state.apiKey);
    if (results && results.length > 0) {
      renderTreeView({ 'search-results': results });
    } else {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">🧠</div>
          <p class="empty-state-title">${t('search.noSemanticResults') || 'No relevant bookmarks found.'}</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('[semantic-search]', err);
    showToast(t('toast.error') || 'Semantic search failed.', 'error');
    // Fallback
    const results = fuzzySearch(state.bookmarks, query);
    renderTreeView({ 'search-results': results });
  }
}

// —— Bulk Selection ——
function toggleBulkSelectMode() {
  state.bulkSelectActive = !state.bulkSelectActive;
  
  const resultsContainer = $('#tree-container');
  if (state.bulkSelectActive) {
    resultsContainer.classList.add('selection-mode-active');
    $('#bulk-select-btn').innerHTML = `🗳️ ${state.language === 'es' ? 'Cancelar' : 'Cancel'}`;
    $('#bulk-select-btn').classList.add('active');
  } else {
    cancelBulkSelection();
  }
}

function cancelBulkSelection() {
  state.bulkSelectActive = false;
  state.selectedBookmarks.clear();
  
  const resultsContainer = $('#tree-container');
  resultsContainer.classList.remove('selection-mode-active');
  
  $$('.bookmark-item-checkbox').forEach(cb => cb.checked = false);
  $$('.bookmark-item').forEach(item => item.classList.remove('selected'));
  
  $('#bulk-select-btn').innerHTML = `🗳️ ${t('action.selectAll') || 'Select'}`;
  $('#bulk-select-btn').classList.remove('active');
  
  updateBulkEditBar();
}

function updateBulkEditBar() {
  const bar = $('#bulk-edit-bar');
  const countSpan = $('#bulk-selected-count');
  
  if (state.bulkSelectActive && state.selectedBookmarks.size > 0) {
    countSpan.textContent = state.selectedBookmarks.size;
    bar.style.display = 'flex';
  } else {
    bar.style.display = 'none';
  }
}

function handleBulkTagAction() {
  if (state.selectedBookmarks.size === 0) return;
  
  const input = prompt(
    state.language === 'es' 
      ? 'Añadir etiqueta (ej: +leido) o eliminar etiqueta (ej: -leido):' 
      : 'Add tag (e.g. +read) or remove tag (e.g. -read):'
  );
  
  if (!input || !input.trim()) return;
  
  const clean = input.trim();
  const isRemove = clean.startsWith('-');
  const tag = clean.replace(/^[+-]/, '');
  
  let count = 0;
  if (isRemove) {
    count = bulkRemoveTag(state.bookmarks, state.selectedBookmarks, tag);
    showToast(`${t('toast.bulkTagsRemoved') || 'Tag removed.'} (${count})`, 'success');
  } else {
    count = bulkAddTag(state.bookmarks, state.selectedBookmarks, tag);
    showToast(`${t('toast.bulkTagsAdded') || 'Tag added.'} (${count})`, 'success');
  }
  
  state.organizedData = categorizeBookmarks(state.bookmarks);
  cancelBulkSelection();
  renderResults(state.organizedData);
}

function handleBulkMoveAction() {
  if (state.selectedBookmarks.size === 0) return;
  
  const categories = Object.keys(state.organizedData || {});
  if (!categories.length) return;
  
  const promptText = (state.language === 'es' ? 'Mover a la categoría:\n' : 'Move to category:\n') + 
    categories.map((c, i) => `${i + 1}. ${c}`).join('\n') + 
    (state.language === 'es' ? '\n\nIntroduce el número:' : '\n\nEnter number:');
    
  const choice = prompt(promptText);
  if (!choice) return;
  
  const idx = parseInt(choice, 10) - 1;
  if (idx >= 0 && idx < categories.length) {
    const targetCat = categories[idx];
    
    for (const bookmarkId of state.selectedBookmarks) {
      moveBookmark(bookmarkId, targetCat);
    }
    
    cancelBulkSelection();
  }
}

function handleBulkDeleteAction() {
  if (state.selectedBookmarks.size === 0) return;
  
  const confirmMsg = (state.language === 'es' 
    ? '¿Estás seguro de que quieres eliminar {count} marcadores seleccionados?' 
    : 'Are you sure you want to delete {count} selected bookmarks?')
    .replace('{count}', state.selectedBookmarks.size);
    
  if (!confirm(confirmMsg)) return;
  
  for (const bookmarkId of state.selectedBookmarks) {
    let catKey = null;
    for (const [cat, bks] of Object.entries(state.organizedData || {})) {
      if (bks.some(b => (b.id || b.url) === bookmarkId)) {
        catKey = cat;
        break;
      }
    }
    if (catKey) {
      deleteBookmark(bookmarkId, catKey);
    }
  }
  
  cancelBulkSelection();
}

// —— Tag Manager ——
function handleMergeTags() {
  const source = $('#merge-source-tag').value.trim();
  const target = $('#merge-target-tag').value.trim();
  
  if (!source || !target) {
    showToast(state.language === 'es' ? 'Introduce ambas etiquetas.' : 'Please enter both tags.', 'warning');
    return;
  }
  
  const success = mergeTags(state.bookmarks, source, target);
  if (success) {
    state.organizedData = categorizeBookmarks(state.bookmarks);
    renderResults(state.organizedData);
    showToast(t('toast.tagsMerged') || 'Tags merged successfully!', 'success');
    $('#merge-source-tag').value = '';
    $('#merge-target-tag').value = '';
  } else {
    showToast(state.language === 'es' ? 'No se encontraron etiquetas para fusionar.' : 'No matching tags found to merge.', 'warning');
  }
}

// —— Rename Tag ——
function handleRenameTag() {
  const oldTag = $('#rename-old-tag').value.trim();
  const newTag = $('#rename-new-tag').value.trim();
  
  if (!oldTag || !newTag) {
    showToast(state.language === 'es' ? 'Introduce ambas etiquetas.' : 'Please enter both tags.', 'warning');
    return;
  }
  
  const success = renameTag(state.bookmarks, oldTag, newTag);
  if (success) {
    state.organizedData = categorizeBookmarks(state.bookmarks);
    renderResults(state.organizedData);
    showToast(t('toast.tagRenamed') || 'Tag renamed successfully!', 'success');
    $('#rename-old-tag').value = '';
    $('#rename-new-tag').value = '';
  } else {
    showToast(state.language === 'es' ? 'No se encontró la etiqueta para renombrar.' : 'No matching tag found to rename.', 'warning');
  }
}

// —— Details Modal ——
function openDetailsModal(bookmark) {
  state.editingBookmark = bookmark;
  $('#edit-bm-title').value = bookmark.title || '';
  $('#edit-bm-url').value = bookmark.url || '';
  $('#edit-bm-desc').value = bookmark.description || '';
  
  $$('input[name="stars"]').forEach(radio => {
    radio.checked = parseInt(radio.value, 10) === parseInt(bookmark.rating, 10);
  });
  
  $('#details-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDetailsModal() {
  $('#details-modal').classList.remove('active');
  document.body.style.overflow = '';
  state.editingBookmark = null;
}

function handleSaveDetails(e) {
  e.preventDefault();
  const bookmark = state.editingBookmark;
  if (!bookmark) return;
  
  const oldUrl = bookmark.url;
  const newTitle = $('#edit-bm-title').value.trim();
  const newUrl = $('#edit-bm-url').value.trim();
  const newDesc = $('#edit-bm-desc').value.trim();
  
  let ratingVal = null;
  const checkedStar = $('input[name="stars"]:checked');
  if (checkedStar) {
    ratingVal = parseInt(checkedStar.value, 10);
  }
  
  bookmark.title = newTitle;
  bookmark.url = newUrl;
  bookmark.description = newDesc;
  bookmark.rating = ratingVal;
  
  if (newUrl !== oldUrl && state.linkResults) {
    state.linkResults.delete(bookmark.id || oldUrl);
  }
  
  closeDetailsModal();
  state.organizedData = categorizeBookmarks(state.bookmarks);
  renderResults(state.organizedData);
  showToast(t('toast.detailsSaved') || 'Bookmark details saved!', 'success');
}

// —— Read Later & Reader Mode ──
function renderReadLaterList() {
  const grid = $('#read-later-grid');
  grid.innerHTML = '';
  
  const list = state.readLaterList;
  const filter = state.readLaterFilter || 'all';
  
  let filtered = list;
  if (filter !== 'all') {
    filtered = list.filter(item => item.status === filter);
  }
  
  if (state.searchQuery) {
    filtered = filtered.filter(item => 
      (item.title || '').toLowerCase().includes(state.searchQuery) ||
      (item.url || '').toLowerCase().includes(state.searchQuery)
    );
  }
  
  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: var(--space-3xl)">
        <div class="empty-state-icon" style="animation: float 3s ease-in-out infinite">📖</div>
        <p class="empty-state-title">${t('readLater.title')}</p>
        <p class="empty-state-text">
          ${state.language === 'es' ? 'No se encontraron elementos de lectura.' : 'No reading items found.'}
        </p>
      </div>
    `;
    return;
  }
  
  filtered.forEach(item => {
    const domain = getDomain(item.url);
    const faviconUrl = item.icon || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    const truncUrl = truncateUrl(item.url, 40);
    
    const card = document.createElement('div');
    card.className = `read-later-card ${item.status}`;
    card.dataset.id = item.id;
    
    let ratingHtml = '';
    if (item.status === 'completed') {
      ratingHtml = '<div class="card-star-rating" style="display:flex;gap:2px;margin-top:var(--space-xs)">';
      for (let r = 1; r <= 5; r++) {
        const active = (item.rating || 0) >= r;
        ratingHtml += `<span class="card-star" style="cursor:pointer;font-size:1.1rem;color:${active ? '#fbbf24' : 'var(--text-muted)'}" data-rating="${r}">★</span>`;
      }
      ratingHtml += '</div>';
    }
    
    const notesHtml = item.description 
      ? `<div class="read-later-card-notes" title="${escapeHtml(item.description)}">${escapeHtml(item.description)}</div>` 
      : '';
      
    card.innerHTML = `
      <div class="read-later-card-body">
        <div class="read-later-card-header">
          <img class="read-later-card-favicon" src="${escapeHtml(faviconUrl)}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22><rect width=%2216%22 height=%2216%22 rx=%224%22 fill=%22%23333%22/></svg>'">
          <div class="read-later-card-title-wrap">
            <h4 class="read-later-card-title">${escapeHtml(item.title || domain)}</h4>
            <a class="read-later-card-url" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(truncUrl)}</a>
          </div>
        </div>
        ${notesHtml}
        <div class="read-later-card-meta">
          <span class="read-later-time-badge">🕒 ${t('readLater.estTime').replace('{time}', item.estReadingTime || 3)}</span>
          ${ratingHtml}
        </div>
      </div>
      <div class="read-later-card-footer">
        <select class="read-later-status-select" aria-label="Reading Status">
          <option value="unread" ${item.status === 'unread' ? 'selected' : ''}>${t('readLater.unread')}</option>
          <option value="reading" ${item.status === 'reading' ? 'selected' : ''}>${t('readLater.reading')}</option>
          <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>${t('readLater.completed')}</option>
        </select>
        <div class="read-later-card-actions">
          <button class="btn-secondary btn-sm" data-action="open-reader" title="${t('readLater.openReader')}">📖</button>
          <button class="btn-secondary btn-sm btn-danger" data-action="remove-rl" title="Remove">✕</button>
        </div>
      </div>
    `;
    
    card.querySelector('.read-later-status-select').addEventListener('change', (e) => {
      const newStatus = e.target.value;
      updateReadingStatus(item.id, newStatus);
      state.readLaterList = loadReadLater();
      renderReadLaterList();
    });
    
    card.querySelector('[data-action="open-reader"]').addEventListener('click', () => {
      openReaderMode(item);
    });
    
    card.querySelector('[data-action="remove-rl"]').addEventListener('click', () => {
      removeFromReadLater(item.id);
      state.readLaterList = loadReadLater();
      renderReadLaterList();
    });
    
    if (item.status === 'completed') {
      card.querySelectorAll('.card-star').forEach(star => {
        star.addEventListener('click', (e) => {
          const rating = parseInt(e.target.dataset.rating, 10);
          updateItemRating(item.id, rating);
          state.readLaterList = loadReadLater();
          renderReadLaterList();
        });
      });
    }
    
    grid.appendChild(card);
  });
}

function handleReadLaterFilter(filter) {
  state.readLaterFilter = filter;
  $$('.read-later-filters button, .read-later-filters .filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.rlFilter === filter);
  });
  renderReadLaterList();
}

function openReaderMode(bookmark) {
  $('#reader-title').textContent = bookmark.title || 'Untitled';
  $('#reader-meta').textContent = `🕒 ${t('readLater.estTime').replace('{time}', bookmark.estReadingTime || 3)} · ${getDomain(bookmark.url)}`;
  
  const bodyEl = $('#reader-content-body');
  bodyEl.innerHTML = generateReaderContent(bookmark);
  
  $('#reader-overlay').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeReaderMode() {
  $('#reader-overlay').style.display = 'none';
  document.body.style.overflow = '';
}

function generateReaderContent(bookmark) {
  const title = bookmark.title || '';
  const url = bookmark.url || '';
  const domain = getDomain(url);
  
  if (title.match(/(github|gitlab|bitbucket|code|develop|program|script|api|sdk|json|css|html|js|typescript)/i)) {
    return `
      <p>In modern software engineering, web bookmarks act as a specialized developer index. Connecting to services like <strong>${domain}</strong> is a core part of building modern, scalable software architectures.</p>
      <h2>The Shift Towards Declarative Implementations</h2>
      <p>Modern applications favor pure functional state over imperative side effects. By modularizing logic and decoupling UI representation, teams can deliver feature updates faster and maintain a clean code base.</p>
      <blockquote>
        "Decoupling of concerns is not just about organizing files, it's about minimizing the cognitive load required to make changes to a complex system."
      </blockquote>
      <h2>Key Best Practices for Development Workspace</h2>
      <ul>
        <li><strong>Continuous Refactoring:</strong> Address technical debt early before it compounds.</li>
        <li><strong>Automated Tooling:</strong> Use linting and auto-formatting (like Prettier/ESLint) to keep team styles consistent.</li>
        <li><strong>Semantic Naming:</strong> Prefer clear descriptive names over short cryptic abbreviations.</li>
      </ul>
      <p>As you build, keep your interfaces clean and focus on delivering a premium experience for end users.</p>
    `;
  } else if (title.match(/(youtube|netflix|spotify|music|video|movie|twitch|stream|show|play)/i)) {
    return `
      <p>Digital media and entertainment systems have fundamentally transformed the way we consume art and information. Platforms like <strong>${domain}</strong> utilize advanced recommender algorithms to personalize user feeds in real time.</p>
      <h2>The Attention Economy</h2>
      <p>With an infinite supply of videos, podcasts, and articles, content curation has become the primary bottleneck for human attention. A well-organized bookmarks vault helps filter out algorithmic noise and return control to the consumer.</p>
      <blockquote>
        "In a world of infinite content, the curator is the king. Organizing what you consume is as important as choosing what you eat."
      </blockquote>
      <h2>Strategies for Conscious Consumption</h2>
      <ol>
        <li>Set dedicated blocks of time for entertainment rather than constant grazing.</li>
        <li>Move long videos or articles into your Read Later queue to review during focus hours.</li>
        <li>Rate content to create your own personalized archive of high-quality resources.</li>
      </ol>
      <p>By organizing your media links, you transition from a passive spectator to an active curator of your own digital stream.</p>
    `;
  } else if (title.match(/(amazon|ebay|aliexpress|shop|buy|store|cart|checkout|deal|price)/i)) {
    return `
      <p>E-commerce and online retail have redefined global commerce. Visiting <strong>${domain}</strong> provides access to a massive catalog of products, but it also presents choices that require smart research and buying discipline.</p>
      <h2>Analyzing Value Before Purchasing</h2>
      <p>Smart shoppers don't buy on impulse. By saving product bookmarks to an organized dashboard, you can compare features, monitor price fluctuations, and wait for sales events instead of checking out immediately.</p>
      <blockquote>
        "The best purchase is the one that has been thoroughly researched, compared, and delayed for at least 48 hours to eliminate emotional bias."
      </blockquote>
      <h2>A Checklist for Smart Buyers</h2>
      <ul>
        <li><strong>Verify Seller Metrics:</strong> Always look at ratings, historical feedback, and returns policies.</li>
        <li><strong>Read Negative Reviews:</strong> These often reveal durability or sizing issues that positive reviews gloss over.</li>
        <li><strong>Use Coupon Engines:</strong> Always search for valid promo codes or cash-back activations before clicking buy.</li>
      </ul>
      <p>Keep your shopping lists neat and categorized to stay within your budget constraints and make mindful investments.</p>
    `;
  } else {
    return `
      <p>Information curation is one of the most critical skills of the 21st century. With billions of web pages active today, finding and organizing references on <strong>${domain}</strong> is vital for professional research, student learning, and personal growth.</p>
      <h2>The Cognitive Science of Bookmarking</h2>
      <p>Humans have finite working memory. When we save a bookmark, we offload cognitive burden to our digital workspace. This acts as an "extended mind," freeing up neural bandwidth to focus on synthesis, analysis, and creation.</p>
      <blockquote>
        "Curating a personal library of links is like building a secondary brain. It preserves your intellectual trail so you can resume work instantly."
      </blockquote>
      <h2>Building a High-Performance Curation Routine</h2>
      <ul>
        <li><strong>Tag Granularity:</strong> Use simple, consistent tags (like <em>#draft</em> or <em>#reference</em>) to find entries rapidly.</li>
        <li><strong>Periodic Audits:</strong> Scan links occasionally to prune dead sites or resolve duplicate folders.</li>
        <li><strong>Active Annotation:</strong> Add custom descriptions and ratings immediately after saving so you remember why it was important.</li>
      </ul>
      <p>Use your BookmarkIQ workspace to continuously organize, clean, and enrich your bookmark collection, turning a cluttered list of URLs into a high-value knowledge repository.</p>
    `;
  }
}
