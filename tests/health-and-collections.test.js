import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateHealthReport, runAutoClean } from '../src/core/health-report.js';
import {
  filterBySmartCollection,
  getSmartCollections
} from '../src/core/smart-collections.js';

describe('health reports', () => {
  it('reports a perfect empty collection', () => {
    const report = generateHealthReport();

    assert.equal(report.healthScore, 100);
    assert.equal(report.statusLabelEn, 'Empty Collection');
  });

  it('accounts for dead links, duplicates, and uncategorized bookmarks', () => {
    const bookmarks = [
      { id: 'one', title: 'Example', url: 'https://example.com', tags: [] },
      { id: 'two', title: 'Example duplicate', url: 'http://www.example.com', tags: ['web'] },
      { id: 'three', title: 'Other', url: 'https://other.example', tags: [] }
    ];
    const report = generateHealthReport(
      bookmarks,
      { other: [bookmarks[2]] },
      new Map([['three', { status: 'dead' }]])
    );

    assert.equal(report.deadCount, 1);
    assert.equal(report.duplicateCount, 1);
    assert.equal(report.uncategorizedCount, 1);
    assert.equal(report.withoutTagsCount, 2);
    assert.ok(report.healthScore < 100);
  });

  it('removes dead bookmarks and duplicate entries', () => {
    const bookmarks = [
      { id: 'keep', title: 'Longer title', url: 'https://example.com', tags: ['web'] },
      { id: 'duplicate', title: 'Link', url: 'http://www.example.com', tags: [] },
      { id: 'dead', title: 'Dead', url: 'https://dead.example', tags: [] }
    ];
    const result = runAutoClean(
      bookmarks,
      { web: [...bookmarks] },
      new Map([['dead', { status: 'dead' }]])
    );

    assert.equal(result.totalCleaned, 2);
    assert.deepEqual(result.cleanedBookmarks.map((bookmark) => bookmark.id), ['keep']);
  });
});

describe('smart collections', () => {
  const bookmarks = [
    { id: 'rated', url: 'https://rated.example', rating: 5 },
    { id: 'noted', url: 'https://noted.example', description: 'Read this later' },
    { id: 'queued', url: 'https://queued.example' }
  ];
  const queue = [{ id: 'queued', status: 'unread' }];

  it('counts and filters rated, noted, and unread bookmarks', () => {
    const collections = getSmartCollections(bookmarks, queue);

    assert.equal(collections.find((collection) => collection.id === 'top-rated').count, 1);
    assert.equal(collections.find((collection) => collection.id === 'with-notes').count, 1);
    assert.equal(
      filterBySmartCollection(bookmarks, 'unread-queue', queue)[0].id,
      'queued'
    );
  });

  it('returns the original list for an unknown collection', () => {
    assert.equal(filterBySmartCollection(bookmarks, 'unknown', queue), bookmarks);
  });
});
