import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeUrl,
  findDuplicates,
  findSimilarTitles,
  pickBest,
} from '../src/core/duplicate-detector.js';

test('normalizeUrl strips protocol, www, trailing slash and hash', () => {
  assert.equal(
    normalizeUrl('https://www.example.com/page?utm_source=twitter#section'),
    'example.com/page',
  );
  // Root path keeps its single trailing slash (only paths longer than "/" are trimmed).
  assert.equal(normalizeUrl('http://example.com'), 'example.com/');
  assert.equal(normalizeUrl('https://example.com/'), 'example.com/');
});

test('normalizeUrl removes tracking params and sorts remaining ones', () => {
  assert.equal(
    normalizeUrl('https://example.com/a/?b=2&a=1&utm_campaign=x'),
    'example.com/a?a=1&b=2',
  );
});

test('normalizeUrl returns empty string for invalid input', () => {
  assert.equal(normalizeUrl(''), '');
  assert.equal(normalizeUrl(null), '');
  assert.equal(normalizeUrl(42), '');
});

test('findDuplicates groups bookmarks that normalize to the same URL', () => {
  const dupes = findDuplicates([
    { id: '1', url: 'https://www.example.com/' },
    { id: '2', url: 'http://example.com' },
    { id: '3', url: 'https://other.com' },
  ]);
  assert.equal(dupes.length, 1);
  assert.equal(dupes[0].normalizedUrl, 'example.com/');
  assert.equal(dupes[0].bookmarks.length, 2);
});

test('findDuplicates returns empty array when there are no duplicates', () => {
  assert.deepEqual(findDuplicates([{ id: '1', url: 'https://a.com' }]), []);
  assert.deepEqual(findDuplicates([]), []);
});

test('findSimilarTitles matches near-identical titles above threshold', () => {
  const similar = findSimilarTitles(
    [
      { id: '1', title: 'JavaScript Tutorial' },
      { id: '2', title: 'JavaScript Tutorials' },
    ],
    0.8,
  );
  assert.equal(similar.length, 1);
  assert.ok(similar[0].similarity >= 0.8);
});

test('findSimilarTitles ignores exact-duplicate titles (handled elsewhere)', () => {
  const similar = findSimilarTitles(
    [
      { id: '1', title: 'Same Title' },
      { id: '2', title: 'Same Title' },
    ],
    0.5,
  );
  assert.deepEqual(similar, []);
});

test('pickBest prefers the bookmark that has an icon', () => {
  const best = pickBest([
    { id: '1', title: 'Example', url: 'https://example.com' },
    { id: '2', title: 'Example', url: 'https://example.com', icon: 'data:image/png;base64,AAA' },
  ]);
  assert.equal(best.id, '2');
});

test('pickBest returns null for empty groups', () => {
  assert.equal(pickBest([]), null);
  assert.equal(pickBest(null), null);
});
