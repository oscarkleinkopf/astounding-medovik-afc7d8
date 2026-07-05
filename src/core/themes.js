/**
 * @module themes
 * Premium theme engine with CSS custom property switching.
 * 
 * @description Provides 4 curated themes (Midnight, Aurora, Ocean, Light)
 * that control the entire app appearance via CSS custom properties set on
 * the document root. Themes persist across sessions via localStorage.
 */

// ─── Constants ──────────────────────────────────────────────────────

/** LocalStorage key for persisting the active theme. */
const STORAGE_KEY = 'bookmarkOrganizer_theme';

/** Default theme applied when no saved preference exists. */
const DEFAULT_THEME_ID = 'midnight';

// ─── Theme Definitions ─────────────────────────────────────────────

/**
 * @typedef {Object} ThemePreview
 * @property {string} bg     Background preview color
 * @property {string} accent Accent preview color
 * @property {string} text   Text preview color
 */

/**
 * @typedef {Object} Theme
 * @property {string}                id      Unique identifier
 * @property {string}                name    English display name
 * @property {string}                nameEs  Spanish display name
 * @property {string}                emoji   Representative emoji
 * @property {ThemePreview}          preview Quick-preview colors
 * @property {Object<string,string>} vars    CSS custom properties
 */

/**
 * All available themes.
 * @type {Theme[]}
 */
export const THEMES = [
  // ── 1. Midnight (default) ──
  {
    id: 'midnight',
    name: 'Midnight',
    nameEs: 'Medianoche',
    emoji: '🌙',
    preview: { bg: '#06060f', accent: '#667eea', text: '#f0f0f5' },
    vars: {
      '--bg-primary': '#06060f',
      '--bg-secondary': '#0d0d1f',
      '--bg-tertiary': '#14142b',
      '--bg-card': 'rgba(255, 255, 255, 0.04)',
      '--bg-card-hover': 'rgba(255, 255, 255, 0.08)',
      '--bg-glass': 'rgba(255, 255, 255, 0.06)',
      '--text-primary': '#f0f0f5',
      '--text-secondary': 'rgba(240, 240, 245, 0.6)',
      '--text-muted': 'rgba(240, 240, 245, 0.35)',
      '--gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      '--gradient-accent': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      '--gradient-success': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      '--gradient-warning': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      '--gradient-bg': 'linear-gradient(160deg, #06060f 0%, #0d0d2b 50%, #120d25 100%)',
      '--accent-purple': '#764ba2',
      '--accent-blue': '#667eea',
      '--accent-cyan': '#4facfe',
      '--border-subtle': 'rgba(255, 255, 255, 0.06)',
      '--border-medium': 'rgba(255, 255, 255, 0.1)',
      '--shadow-sm': '0 2px 8px rgba(0, 0, 0, 0.3)',
      '--shadow-md': '0 8px 32px rgba(0, 0, 0, 0.4)',
      '--shadow-lg': '0 16px 64px rgba(0, 0, 0, 0.5)',
      '--shadow-glow': '0 0 30px rgba(102, 126, 234, 0.15)',
      '--header-bg': 'rgba(6, 6, 15, 0.72)',
      '--donut-bg': '#06060f',
      '--toast-bg': '#0d0d1f',
    },
  },

  // ── 2. Aurora ──
  {
    id: 'aurora',
    name: 'Aurora',
    nameEs: 'Aurora',
    emoji: '🌌',
    preview: { bg: '#0f0a1e', accent: '#a855f7', text: '#f0eeff' },
    vars: {
      '--bg-primary': '#0f0a1e',
      '--bg-secondary': '#170f2e',
      '--bg-tertiary': '#1e1440',
      '--bg-card': 'rgba(255, 255, 255, 0.05)',
      '--bg-card-hover': 'rgba(255, 255, 255, 0.09)',
      '--bg-glass': 'rgba(255, 255, 255, 0.07)',
      '--text-primary': '#f0eeff',
      '--text-secondary': 'rgba(240, 238, 255, 0.6)',
      '--text-muted': 'rgba(240, 238, 255, 0.35)',
      '--gradient-primary': 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
      '--gradient-accent': 'linear-gradient(135deg, #c084fc 0%, #f472b6 100%)',
      '--gradient-success': 'linear-gradient(135deg, #34d399 0%, #2dd4bf 100%)',
      '--gradient-warning': 'linear-gradient(135deg, #f97316 0%, #eab308 100%)',
      '--gradient-bg': 'linear-gradient(160deg, #0f0a1e 0%, #1a0f36 40%, #0f1e2d 70%, #0a1e1a 100%)',
      '--accent-purple': '#a855f7',
      '--accent-blue': '#818cf8',
      '--accent-cyan': '#c084fc',
      '--border-subtle': 'rgba(168, 85, 247, 0.1)',
      '--border-medium': 'rgba(168, 85, 247, 0.18)',
      '--shadow-sm': '0 2px 8px rgba(0, 0, 0, 0.4)',
      '--shadow-md': '0 8px 32px rgba(0, 0, 0, 0.5)',
      '--shadow-lg': '0 16px 64px rgba(0, 0, 0, 0.6)',
      '--shadow-glow': '0 0 30px rgba(168, 85, 247, 0.2)',
      '--header-bg': 'rgba(15, 10, 30, 0.75)',
      '--donut-bg': '#0f0a1e',
      '--toast-bg': '#170f2e',
    },
  },

  // ── 3. Ocean ──
  {
    id: 'ocean',
    name: 'Ocean',
    nameEs: 'Océano',
    emoji: '🌊',
    preview: { bg: '#0a1628', accent: '#06b6d4', text: '#e8f4f8' },
    vars: {
      '--bg-primary': '#0a1628',
      '--bg-secondary': '#0e1f38',
      '--bg-tertiary': '#132848',
      '--bg-card': 'rgba(255, 255, 255, 0.04)',
      '--bg-card-hover': 'rgba(255, 255, 255, 0.08)',
      '--bg-glass': 'rgba(255, 255, 255, 0.06)',
      '--text-primary': '#e8f4f8',
      '--text-secondary': 'rgba(232, 244, 248, 0.6)',
      '--text-muted': 'rgba(232, 244, 248, 0.35)',
      '--gradient-primary': 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
      '--gradient-accent': 'linear-gradient(135deg, #22d3ee 0%, #60a5fa 100%)',
      '--gradient-success': 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
      '--gradient-warning': 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
      '--gradient-bg': 'linear-gradient(160deg, #0a1628 0%, #0c2340 50%, #0a2030 100%)',
      '--accent-purple': '#3b82f6',
      '--accent-blue': '#06b6d4',
      '--accent-cyan': '#22d3ee',
      '--border-subtle': 'rgba(6, 182, 212, 0.1)',
      '--border-medium': 'rgba(6, 182, 212, 0.18)',
      '--shadow-sm': '0 2px 8px rgba(0, 0, 0, 0.3)',
      '--shadow-md': '0 8px 32px rgba(0, 0, 0, 0.45)',
      '--shadow-lg': '0 16px 64px rgba(0, 0, 0, 0.55)',
      '--shadow-glow': '0 0 30px rgba(6, 182, 212, 0.2)',
      '--header-bg': 'rgba(10, 22, 40, 0.75)',
      '--donut-bg': '#0a1628',
      '--toast-bg': '#0e1f38',
    },
  },

  // ── 4. Light ──
  {
    id: 'light',
    name: 'Light',
    nameEs: 'Claro',
    emoji: '☀️',
    preview: { bg: '#f8f9fc', accent: '#667eea', text: '#1a1a2e' },
    vars: {
      '--bg-primary': '#f8f9fc',
      '--bg-secondary': '#ffffff',
      '--bg-tertiary': '#eef1f6',
      '--bg-card': 'rgba(0, 0, 0, 0.02)',
      '--bg-card-hover': 'rgba(0, 0, 0, 0.05)',
      '--bg-glass': 'rgba(0, 0, 0, 0.03)',
      '--text-primary': '#1a1a2e',
      '--text-secondary': 'rgba(26, 26, 46, 0.6)',
      '--text-muted': 'rgba(26, 26, 46, 0.4)',
      '--gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      '--gradient-accent': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      '--gradient-success': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      '--gradient-warning': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      '--gradient-bg': 'linear-gradient(160deg, #f8f9fc 0%, #eef1fa 50%, #f0f0f8 100%)',
      '--accent-purple': '#764ba2',
      '--accent-blue': '#667eea',
      '--accent-cyan': '#4facfe',
      '--border-subtle': 'rgba(0, 0, 0, 0.06)',
      '--border-medium': 'rgba(0, 0, 0, 0.12)',
      '--shadow-sm': '0 2px 8px rgba(0, 0, 0, 0.06)',
      '--shadow-md': '0 8px 32px rgba(0, 0, 0, 0.08)',
      '--shadow-lg': '0 16px 64px rgba(0, 0, 0, 0.1)',
      '--shadow-glow': '0 0 30px rgba(102, 126, 234, 0.1)',
      '--header-bg': 'rgba(248, 249, 252, 0.85)',
      '--donut-bg': '#f8f9fc',
      '--toast-bg': '#ffffff',
    },
  },
];

// ─── Exported Functions ─────────────────────────────────────────────

/**
 * Returns the full array of available themes.
 * @returns {Theme[]}
 */
export function getThemes() {
  return THEMES;
}

/**
 * Reads the currently saved theme ID from localStorage.
 *
 * @returns {string|null}  The saved theme ID, or null if none is stored
 */
export function getCurrentTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage may be unavailable (e.g. in incognito or sandboxed contexts)
    return null;
  }
}

/**
 * Persists a theme ID to localStorage.
 *
 * @param {string} themeId  Theme identifier to save
 */
export function saveTheme(themeId) {
  try {
    localStorage.setItem(STORAGE_KEY, themeId);
  } catch {
    // Silently ignore storage errors
  }
}

/**
 * Applies a theme by setting all its CSS custom properties on `document.documentElement`.
 *
 * This function:
 * 1. Finds the theme by ID from the {@link THEMES} array
 * 2. Sets every CSS custom property from `theme.vars` on the root element
 * 3. Sets `data-theme` attribute on the root for CSS selector targeting
 * 4. Persists the selection via {@link saveTheme}
 *
 * @param {string} themeId  ID of the theme to apply (e.g. 'midnight', 'aurora')
 * @returns {boolean}  `true` if the theme was found and applied, `false` otherwise
 *
 * @example
 * applyTheme('aurora'); // switches to the Aurora theme
 */
export function applyTheme(themeId) {
  const theme = THEMES.find(t => t.id === themeId);
  if (!theme) {
    console.warn(`[themes] Unknown theme id: "${themeId}". Available: ${THEMES.map(t => t.id).join(', ')}`);
    return false;
  }

  const root = document.documentElement;

  // Apply every CSS custom property
  for (const [property, value] of Object.entries(theme.vars)) {
    root.style.setProperty(property, value);
  }

  // Set data attribute for conditional CSS selectors
  root.dataset.theme = themeId;

  // Persist choice
  saveTheme(themeId);

  return true;
}

/**
 * Initializes the theme system on application startup.
 *
 * Reads the saved theme preference from localStorage.
 * If a valid saved theme is found, it is applied.
 * Otherwise the default theme ('midnight') is applied.
 *
 * This function should be called once during app initialization,
 * ideally before the first render to prevent a flash of unstyled content.
 *
 * @returns {string}  The ID of the theme that was applied
 *
 * @example
 * // In your app entry point:
 * import { initTheme } from './core/themes.js';
 * const activeTheme = initTheme();
 */
export function initTheme() {
  const savedId = getCurrentTheme();

  // Validate that the saved ID corresponds to a real theme
  if (savedId && THEMES.some(t => t.id === savedId)) {
    applyTheme(savedId);
    return savedId;
  }

  // Fall back to default
  applyTheme(DEFAULT_THEME_ID);
  return DEFAULT_THEME_ID;
}
