import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FAVORITE_STYLE_STORAGE_KEY,
  addFavoriteStyle,
  getFavoriteStyleIds,
  getFavoriteStyleSummaries,
  isStyleFavorite,
  removeFavoriteStyle,
  toggleFavoriteStyle,
} from '../utils/style-favorites.js';

function createMemoryStorage(initialValue) {
  const store = new Map();
  if (initialValue !== undefined) store.set(FAVORITE_STYLE_STORAGE_KEY, initialValue);
  return {
    getStorageSync(key) {
      return store.get(key);
    },
    setStorageSync(key, value) {
      store.set(key, value);
    },
  };
}

test('favorite style ids are normalized and deduplicated from local storage', () => {
  const storage = createMemoryStorage(['21A', '', '1B', '21A', null, 42, ' 18A ']);

  assert.deepEqual(getFavoriteStyleIds(storage), ['21A', '1B', '18A']);
});

test('adding a favorite keeps the most recent style first', () => {
  const storage = createMemoryStorage(['1B', '21A']);

  assert.deepEqual(addFavoriteStyle('18A', storage), ['18A', '1B', '21A']);
  assert.deepEqual(addFavoriteStyle('1B', storage), ['1B', '18A', '21A']);
});

test('toggleFavoriteStyle returns the next favorite state and persists it', () => {
  const storage = createMemoryStorage(['1B']);

  assert.deepEqual(toggleFavoriteStyle('21A', storage), {
    favoriteIds: ['21A', '1B'],
    isFavorite: true,
  });
  assert.equal(isStyleFavorite('21A', storage), true);

  assert.deepEqual(toggleFavoriteStyle('21A', storage), {
    favoriteIds: ['1B'],
    isFavorite: false,
  });
  assert.equal(isStyleFavorite('21A', storage), false);
});

test('removing a favorite leaves other records intact', () => {
  const storage = createMemoryStorage(['21A', '1B', '18A']);

  assert.deepEqual(removeFavoriteStyle('1B', storage), ['21A', '18A']);
});

test('favorite summaries ignore stale local ids and stay lightweight', () => {
  const storage = createMemoryStorage(['21A', 'missing-style', '1B']);
  const summaries = getFavoriteStyleSummaries(storage);

  assert.deepEqual(
    summaries.map((style) => style.id),
    ['21A', '1B'],
  );
  assert.ok(summaries.every((style) => style.kind === 'bjcp'));
  assert.ok(summaries.every((style) => !Object.hasOwn(style, 'details')));
});

test('favorite summaries resolve extension style ids from the existing storage key', () => {
  const storage = createMemoryStorage(['ext-west-coast-ipa', '21A']);
  const summaries = getFavoriteStyleSummaries(storage);

  assert.deepEqual(
    summaries.map((style) => ({ id: style.id, kind: style.kind })),
    [
      { id: 'ext-west-coast-ipa', kind: 'extension' },
      { id: '21A', kind: 'bjcp' },
    ],
  );
});
