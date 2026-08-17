import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateTags,
  buildTagIndex,
  getPopularTags,
  filterByTag,
} from '../src/core/tagger.js';

test('generateTags derives tags from known domain and URL path', () => {
  const tags = generateTags({
    url: 'https://github.com/user/project',
    title: 'My Project',
  });
  for (const expected of ['github', 'code', 'dev', 'user', 'project']) {
    assert.ok(tags.includes(expected), `expected tag "${expected}" in ${JSON.stringify(tags)}`);
  }
});

test('generateTags applies TLD-based tags', () => {
  const tags = generateTags({ url: 'https://mit.edu/courses', title: '' });
  assert.ok(tags.includes('education'));
});

test('generateTags caps output at 8 tags and returns [] for empty input', () => {
  assert.deepEqual(generateTags(null), []);
  const many = generateTags({
    url: 'https://example.com/alpha/bravo/charlie/delta/echo/foxtrot/golf/hotel/india',
    title: 'javascript typescript python golang rustlang kotlin swiftui',
  });
  assert.ok(many.length <= 8);
});

test('buildTagIndex maps tags to bookmark ids', () => {
  const index = buildTagIndex([
    { id: 'a', url: 'https://github.com/x', title: 'X' },
    { id: 'b', url: 'https://github.com/y', title: 'Y' },
  ]);
  assert.ok(index instanceof Map);
  assert.equal(index.get('github').size, 2);
  assert.ok(index.get('github').has('a'));
});

test('getPopularTags returns tags sorted by frequency, respecting the limit', () => {
  const index = buildTagIndex([
    { id: 'a', url: 'https://github.com/x', title: 'X' },
    { id: 'b', url: 'https://github.com/y', title: 'Y' },
    { id: 'c', url: 'https://youtube.com/z', title: 'Z' },
  ]);
  const popular = getPopularTags(index, 2);
  assert.equal(popular.length, 2);
  assert.equal(popular[0].tag, 'github');
  assert.equal(popular[0].count, 2);
  assert.ok(popular[0].count >= popular[1].count);
});

test('filterByTag returns only bookmarks carrying the tag', () => {
  const bookmarks = [
    { id: 'a', url: 'https://github.com/x', title: 'X' },
    { id: 'c', url: 'https://youtube.com/z', title: 'Z' },
  ];
  const index = buildTagIndex(bookmarks);
  const result = filterByTag(bookmarks, 'github', index);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'a');
});
