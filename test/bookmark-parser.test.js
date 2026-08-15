import test from 'node:test';
import assert from 'node:assert/strict';
import { flattenBookmarks } from '../src/core/bookmark-parser.js';

// Note: parseBookmarkHTML depends on the browser DOMParser and is exercised in
// the browser, not here. flattenBookmarks is pure and covered below.

test('flattenBookmarks returns only bookmark nodes from a nested tree', () => {
  const tree = [
    { type: 'bookmark', title: 'Root BM', url: 'https://a.com', children: [] },
    {
      type: 'folder',
      title: 'Folder',
      children: [
        { type: 'bookmark', title: 'Nested BM', url: 'https://b.com', children: [] },
        {
          type: 'folder',
          title: 'Sub',
          children: [
            { type: 'bookmark', title: 'Deep BM', url: 'https://c.com', children: [] },
          ],
        },
      ],
    },
  ];

  const flat = flattenBookmarks(tree);
  assert.equal(flat.length, 3);
  assert.ok(flat.every((n) => n.type === 'bookmark'));
  assert.deepEqual(
    flat.map((n) => n.url).sort(),
    ['https://a.com', 'https://b.com', 'https://c.com'],
  );
});

test('flattenBookmarks handles an empty tree', () => {
  assert.deepEqual(flattenBookmarks([]), []);
});
