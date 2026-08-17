import test from 'node:test';
import assert from 'node:assert/strict';
import { categorizeBookmarks } from '../src/core/categorizer.js';

const noCustom = { customCategories: [] };

test('categorizeBookmarks groups known domains into their default categories', () => {
  const organized = categorizeBookmarks(
    [
      { id: '1', url: 'https://github.com', title: 'GitHub' },
      { id: '2', url: 'https://youtube.com', title: 'YouTube' },
      { id: '3', url: 'https://amazon.com', title: 'Amazon' },
    ],
    noCustom,
  );
  assert.equal(organized.development[0].id, '1');
  assert.equal(organized.entertainment[0].id, '2');
  assert.equal(organized.shopping[0].id, '3');
});

test('categorizeBookmarks falls back to "other" for unknown domains', () => {
  const organized = categorizeBookmarks(
    [{ id: '1', url: 'https://nonexistentdomain12345.test', title: 'Mystery' }],
    noCustom,
  );
  assert.ok(organized.other);
  assert.equal(organized.other[0].id, '1');
});

test('categorizeBookmarks respects a pre-assigned aiCategory', () => {
  const organized = categorizeBookmarks(
    [{ id: '1', url: 'https://github.com', title: 'GitHub', aiCategory: 'research' }],
    noCustom,
  );
  assert.ok(organized.research);
  assert.equal(organized.research[0].matchReason, 'ai');
});

test('custom category domain rules take precedence over defaults', () => {
  const organized = categorizeBookmarks(
    [{ id: '1', url: 'https://github.com/me', title: 'Mine' }],
    { customCategories: [{ id: 'mycat', domains: ['github.com'] }] },
  );
  assert.ok(organized.mycat);
  assert.equal(organized.mycat[0].id, '1');
  assert.equal(organized.mycat[0].matchReason, 'custom-domain');
});

test('categorizeBookmarks enriches each bookmark with category metadata', () => {
  const organized = categorizeBookmarks(
    [{ id: '1', url: 'https://github.com', title: 'GitHub' }],
    noCustom,
  );
  const bm = organized.development[0];
  assert.equal(bm.category, 'development');
  assert.equal(typeof bm.confidence, 'number');
  assert.ok('matchReason' in bm);
});

test('categorizeBookmarks returns {} for invalid input', () => {
  assert.deepEqual(categorizeBookmarks(null), {});
  assert.deepEqual(categorizeBookmarks('nope'), {});
});
