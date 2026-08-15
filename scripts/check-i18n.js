#!/usr/bin/env node
/**
 * i18n coverage guard (zero-dependency).
 *
 * Scans the app source for every i18n key that is actually referenced
 * (`data-i18n` / `data-i18n-placeholder` attributes in HTML and dynamic JS,
 * plus `t('key')` calls) and verifies each one is defined in BOTH the `en`
 * and `es` dictionaries of `src/core/i18n.js`.
 *
 * Exits with code 1 if any referenced key is missing, so it can be wired
 * into CI or a pre-commit hook. Run with: `node scripts/check-i18n.js`
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { translations } from '../src/core/i18n.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Files that reference i18n keys.
const SOURCE_FILES = ['index.html', 'app.js'];

/** Resolve a dot-separated key against a nested object. */
function resolve(obj, path) {
  return path
    .split('.')
    .reduce((acc, seg) => (acc && typeof acc === 'object' ? acc[seg] : undefined), obj);
}

/** True for real i18n keys: dotted paths that start with a letter. */
function isI18nKey(k) {
  return /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/.test(k);
}

function collectKeys() {
  const keys = new Set();
  for (const rel of SOURCE_FILES) {
    let text;
    try {
      text = readFileSync(join(ROOT, rel), 'utf8');
    } catch {
      continue;
    }

    // data-i18n="..." and data-i18n-placeholder="..."
    for (const m of text.matchAll(/data-i18n(?:-placeholder)?="([^"]+)"/g)) {
      if (isI18nKey(m[1])) keys.add(m[1]);
    }

    // t('key') / t("key") — require a dotted key to avoid matching functions
    // whose name merely ends in "t" (e.g. getContext('2d')).
    for (const m of text.matchAll(/(?<![A-Za-z0-9_$])t\((['"])([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)\1\)/g)) {
      keys.add(m[2]);
    }
  }
  return [...keys].sort();
}

function main() {
  const referenced = collectKeys();
  const missing = [];
  for (const key of referenced) {
    const inEn = typeof resolve(translations.en, key) === 'string';
    const inEs = typeof resolve(translations.es, key) === 'string';
    if (!inEn || !inEs) {
      missing.push({ key, en: inEn, es: inEs });
    }
  }

  if (missing.length === 0) {
    console.log(`✓ i18n OK — ${referenced.length} referenced keys defined in both en and es.`);
    process.exit(0);
  }

  console.error(`✗ i18n check failed — ${missing.length} referenced key(s) missing:\n`);
  for (const { key, en, es } of missing) {
    const where = !en && !es ? 'en + es' : !en ? 'en' : 'es';
    console.error(`  - ${key}  (missing in: ${where})`);
  }
  console.error('\nAdd the missing key(s) to the dictionaries in src/core/i18n.js.');
  process.exit(1);
}

main();
