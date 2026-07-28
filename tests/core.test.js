import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  findDuplicates,
  normalizeUrl,
  pickBest
} from '../src/core/duplicate-detector.js';
import {
  findCategoryByDomain,
  findCategoryByKeywords,
  getAllCategories
} from '../src/core/domain-database.js';
import { categorizeBookmarks } from '../src/core/categorizer.js';
import {
  buildTagIndex,
  filterByTag,
  generateTags
} from '../src/core/tagger.js';
import {
  bulkAddTag,
  bulkRemoveTag,
  mergeTags,
  renameTag
} from '../src/core/tag-manager.js';
import { loadCloudConfig, saveCloudConfig } from '../src/core/cloud-sync.js';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

describe('bookmark categorization', () => {
  it('uses a known domain and preserves classification metadata', () => {
    const result = categorizeBookmarks([
      { id: 'github', title: 'GitHub', url: 'https://github.com/bookmarkiq' }
    ]);

    assert.equal(result.development.length, 1);
    assert.equal(result.development[0].matchReason, 'domain');
    assert.equal(result.development[0].confidence, 1);
  });

  it('gives custom categories precedence over defaults', () => {
    const result = categorizeBookmarks(
      [{ id: 'github', title: 'GitHub', url: 'https://github.com/bookmarkiq' }],
      { customCategories: [{ id: 'team', domains: ['github.com'] }] }
    );

    assert.equal(result.team[0].matchReason, 'custom-domain');
  });

  it('looks up domains, keywords, and appended custom categories', () => {
    assert.equal(findCategoryByDomain('gist.github.com'), 'development');
    assert.equal(findCategoryByKeywords('learn a programming tutorial'), 'education');
    assert.equal(getAllCategories([{ id: 'custom' }]).at(-1).id, 'custom');
  });
});

describe('duplicate detection', () => {
  it('normalizes tracking parameters and groups equivalent URLs', () => {
    assert.equal(
      normalizeUrl('https://www.example.com/page/?utm_source=newsletter&id=7#top'),
      'example.com/page?id=7'
    );

    const groups = findDuplicates([
      { id: 'first', title: 'Example', url: 'https://example.com/page?id=7' },
      { id: 'second', title: 'Example', url: 'http://www.example.com/page?id=7' }
    ]);

    assert.equal(groups.length, 1);
    assert.equal(groups[0].bookmarks.length, 2);
  });

  it('selects the highest-quality duplicate', () => {
    const best = pickBest([
      { id: 'short', title: 'Link', url: 'https://example.com', addDate: 1 },
      { id: 'better', title: 'A descriptive bookmark title', url: 'https://example.com', addDate: 2 }
    ]);

    assert.equal(best.id, 'better');
  });
});

describe('tag operations', () => {
  it('generates, indexes, and filters tags', () => {
    const bookmarks = [{ id: 'repo', title: 'My Project', url: 'https://github.com/team/project' }];
    const tags = generateTags(bookmarks[0]);
    const index = buildTagIndex(bookmarks);

    assert.ok(tags.includes('github'));
    assert.deepEqual(filterByTag(bookmarks, 'github', index), bookmarks);
  });

  it('merges, renames, adds, and removes tags without duplicates', () => {
    const bookmarks = [
      { id: 'one', tags: ['js', 'web'] },
      { id: 'two', tags: ['js', 'javascript'] }
    ];

    assert.equal(mergeTags(bookmarks, 'js', 'javascript'), true);
    assert.deepEqual(bookmarks[1].tags, ['javascript']);
    assert.equal(renameTag(bookmarks, 'web', 'frontend'), true);
    assert.equal(bulkAddTag(bookmarks, new Set(['one', 'two']), 'Code'), 2);
    assert.equal(bulkRemoveTag(bookmarks, ['one'], 'code'), 1);
  });
});

describe('cloud sync configuration', () => {
  it('persists repository metadata without a personal access token', () => {
    storage.clear();
    saveCloudConfig({
      provider: 'github',
      githubToken: 'sensitive-token',
      githubOwner: 'bookmarkiq',
      githubRepo: 'private-backups'
    });

    assert.deepEqual(loadCloudConfig(), {
      provider: 'github',
      githubOwner: 'bookmarkiq',
      githubRepo: 'private-backups',
      autoSync: false
    });
    assert.equal(storage.get('bookmarkOrganizer_cloudConfig').includes('sensitive-token'), false);
  });
});
