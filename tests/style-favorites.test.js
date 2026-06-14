import test from 'node:test';
import assert from 'node:assert/strict';

import * as favoriteUtils from '../utils/style-favorites.js';
import {
  FAVORITE_STYLE_STORAGE_KEY,
  addFavoriteStyle,
  getFavoriteStyleIds,
  getFavoriteStyleSummaries,
  getFavoriteStyleSummariesResult,
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

test('trusted favorite state reads distinguish favorite and non-favorite styles', () => {
  assert.equal(typeof favoriteUtils.getFavoriteStyleStateResult, 'function');
  const storage = createMemoryStorage(['21A']);

  assert.deepEqual(favoriteUtils.getFavoriteStyleStateResult('21A', storage), {
    ok: true,
    isFavorite: true,
  });
  assert.deepEqual(favoriteUtils.getFavoriteStyleStateResult('1B', storage), {
    ok: true,
    isFavorite: false,
  });
});

test('trusted favorite state reads report storage failures without claiming false', () => {
  assert.equal(typeof favoriteUtils.getFavoriteStyleStateResult, 'function');
  const unavailableStorages = [
    ['null storage', null],
    ['missing reader', {}],
    ['throwing reader', {
      getStorageSync() {
        throw new Error('storage unavailable');
      },
    }],
  ];

  unavailableStorages.forEach(([label, storage]) => {
    assert.deepEqual(
      favoriteUtils.getFavoriteStyleStateResult('21A', storage),
      {
        ok: false,
        isFavorite: null,
        error: 'storage-failed',
      },
      label,
    );
  });
});

test('trusted favorite state reads reject invalid style ids explicitly', () => {
  assert.equal(typeof favoriteUtils.getFavoriteStyleStateResult, 'function');

  ['', '   ', null, 21].forEach((styleId) => {
    assert.deepEqual(
      favoriteUtils.getFavoriteStyleStateResult(styleId, createMemoryStorage([])),
      {
        ok: false,
        isFavorite: null,
        error: 'invalid-style-id',
      },
    );
  });
});

test('adding a favorite keeps the most recent style first', () => {
  const storage = createMemoryStorage(['1B', '21A']);

  assert.deepEqual(addFavoriteStyle('18A', storage), {
    ok: true,
    favoriteIds: ['18A', '1B', '21A'],
    isFavorite: true,
  });
  assert.deepEqual(addFavoriteStyle('1B', storage), {
    ok: true,
    favoriteIds: ['1B', '18A', '21A'],
    isFavorite: true,
  });
});

test('toggleFavoriteStyle returns the next favorite state and persists it', () => {
  const storage = createMemoryStorage(['1B']);

  assert.deepEqual(toggleFavoriteStyle('21A', storage), {
    ok: true,
    favoriteIds: ['21A', '1B'],
    isFavorite: true,
  });
  assert.equal(isStyleFavorite('21A', storage), true);

  assert.deepEqual(toggleFavoriteStyle('21A', storage), {
    ok: true,
    favoriteIds: ['1B'],
    isFavorite: false,
  });
  assert.equal(isStyleFavorite('21A', storage), false);
});

test('removing a favorite leaves other records intact', () => {
  const storage = createMemoryStorage(['21A', '1B', '18A']);

  assert.deepEqual(removeFavoriteStyle('1B', storage), {
    ok: true,
    favoriteIds: ['21A', '18A'],
    isFavorite: false,
  });
});

test('failed favorite writes keep the previous state and return an explicit failure', () => {
  const storage = createMemoryStorage(['1B']);
  storage.setStorageSync = () => {
    throw new Error('storage full');
  };

  assert.deepEqual(toggleFavoriteStyle('21A', storage), {
    ok: false,
    favoriteIds: ['1B'],
    isFavorite: false,
    error: 'storage-failed',
  });
  assert.deepEqual(getFavoriteStyleIds(storage), ['1B']);
});

test('failed favorite removals keep the previous state and return an explicit failure', () => {
  const storage = createMemoryStorage(['21A', '1B']);
  storage.setStorageSync = () => {
    throw new Error('storage full');
  };

  assert.deepEqual(removeFavoriteStyle('21A', storage), {
    ok: false,
    favoriteIds: ['21A', '1B'],
    isFavorite: true,
    error: 'storage-failed',
  });
  assert.deepEqual(getFavoriteStyleIds(storage), ['21A', '1B']);
});

test('read-back failures roll back the attempted favorite change', () => {
  const store = new Map([[FAVORITE_STYLE_STORAGE_KEY, ['1B']]]);
  let reads = 0;
  const storage = {
    getStorageSync(key) {
      reads += 1;
      if (reads === 2) throw new Error('read failed');
      return store.get(key);
    },
    setStorageSync(key, value) {
      store.set(key, value);
    },
  };

  assert.deepEqual(addFavoriteStyle('21A', storage), {
    ok: false,
    favoriteIds: ['1B'],
    isFavorite: false,
    error: 'storage-failed',
  });
  assert.deepEqual(store.get(FAVORITE_STYLE_STORAGE_KEY), ['1B']);
});

test('failed rollback reports an uncertain storage state without claiming favorites', () => {
  const store = new Map([[FAVORITE_STYLE_STORAGE_KEY, ['1B']]]);
  let reads = 0;
  let writes = 0;
  const storage = {
    getStorageSync(key) {
      reads += 1;
      if (reads === 2) throw new Error('confirmation read failed');
      return store.get(key);
    },
    setStorageSync(key, value) {
      writes += 1;
      if (writes === 2) throw new Error('rollback write failed');
      store.set(key, value);
    },
  };

  assert.deepEqual(addFavoriteStyle('21A', storage), {
    ok: false,
    favoriteIds: [],
    isFavorite: null,
    error: 'storage-uncertain',
  });
  assert.deepEqual(store.get(FAVORITE_STYLE_STORAGE_KEY), ['21A', '1B']);
});

test('uncertain favorite additions can retry the same target without reversing it', () => {
  const store = new Map([[FAVORITE_STYLE_STORAGE_KEY, ['1B']]]);
  let unstable = true;
  let reads = 0;
  let writes = 0;
  const storage = {
    getStorageSync(key) {
      reads += 1;
      if (unstable && reads === 2) throw new Error('confirmation read failed');
      return store.get(key);
    },
    setStorageSync(key, value) {
      writes += 1;
      if (unstable && writes === 2) throw new Error('rollback write failed');
      store.set(key, value);
    },
  };

  assert.deepEqual(addFavoriteStyle('21A', storage), {
    ok: false,
    favoriteIds: [],
    isFavorite: null,
    error: 'storage-uncertain',
  });
  assert.deepEqual(store.get(FAVORITE_STYLE_STORAGE_KEY), ['21A', '1B']);

  unstable = false;
  assert.deepEqual(addFavoriteStyle('21A', storage), {
    ok: true,
    favoriteIds: ['21A', '1B'],
    isFavorite: true,
  });
  assert.deepEqual(store.get(FAVORITE_STYLE_STORAGE_KEY), ['21A', '1B']);
});

test('uncertain favorite removals can retry the same target without reversing it', () => {
  const store = new Map([[FAVORITE_STYLE_STORAGE_KEY, ['21A', '1B']]]);
  let unstable = true;
  let reads = 0;
  let writes = 0;
  const storage = {
    getStorageSync(key) {
      reads += 1;
      if (unstable && reads === 2) throw new Error('confirmation read failed');
      return store.get(key);
    },
    setStorageSync(key, value) {
      writes += 1;
      if (unstable && writes === 2) throw new Error('rollback write failed');
      store.set(key, value);
    },
  };

  assert.deepEqual(removeFavoriteStyle('21A', storage), {
    ok: false,
    favoriteIds: [],
    isFavorite: null,
    error: 'storage-uncertain',
  });
  assert.deepEqual(store.get(FAVORITE_STYLE_STORAGE_KEY), ['1B']);

  unstable = false;
  assert.deepEqual(removeFavoriteStyle('21A', storage), {
    ok: true,
    favoriteIds: ['1B'],
    isFavorite: false,
  });
  assert.deepEqual(store.get(FAVORITE_STYLE_STORAGE_KEY), ['1B']);
});

test('rollback read failures stay uncertain even when a later read sees the previous state', () => {
  const store = new Map([[FAVORITE_STYLE_STORAGE_KEY, ['1B']]]);
  let reads = 0;
  let writes = 0;
  const storage = {
    getStorageSync(key) {
      reads += 1;
      if (reads === 2) throw new Error('rollback read failed');
      return store.get(key);
    },
    setStorageSync(key, value) {
      writes += 1;
      store.set(key, value);
      if (writes === 1) throw new Error('target write result unavailable');
    },
  };

  assert.deepEqual(addFavoriteStyle('21A', storage), {
    ok: false,
    favoriteIds: [],
    isFavorite: null,
    error: 'storage-uncertain',
  });
  assert.deepEqual(store.get(FAVORITE_STYLE_STORAGE_KEY), ['1B']);
});

test('rollback read mismatches stay uncertain even when a later read sees the previous state', () => {
  const store = new Map([[FAVORITE_STYLE_STORAGE_KEY, ['1B']]]);
  let reads = 0;
  let writes = 0;
  const storage = {
    getStorageSync(key) {
      reads += 1;
      if (reads === 2) return ['unexpected-style'];
      return store.get(key);
    },
    setStorageSync(key, value) {
      writes += 1;
      store.set(key, value);
      if (writes === 1) throw new Error('target write result unavailable');
    },
  };

  assert.deepEqual(addFavoriteStyle('21A', storage), {
    ok: false,
    favoriteIds: [],
    isFavorite: null,
    error: 'storage-uncertain',
  });
  assert.deepEqual(store.get(FAVORITE_STYLE_STORAGE_KEY), ['1B']);
});

test('read-back mismatches roll back the attempted favorite change', () => {
  const store = new Map([[FAVORITE_STYLE_STORAGE_KEY, ['1B']]]);
  let writes = 0;
  const storage = {
    getStorageSync(key) {
      return store.get(key);
    },
    setStorageSync(key, value) {
      writes += 1;
      store.set(key, writes === 1 ? ['1B'] : value);
    },
  };

  assert.deepEqual(addFavoriteStyle('21A', storage), {
    ok: false,
    favoriteIds: ['1B'],
    isFavorite: false,
    error: 'storage-failed',
  });
  assert.deepEqual(store.get(FAVORITE_STYLE_STORAGE_KEY), ['1B']);
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

test('favorite summary result reports a successful trusted read', () => {
  const storage = createMemoryStorage(['ext-west-coast-ipa', 'missing-style', '21A']);

  assert.deepEqual(
    getFavoriteStyleSummariesResult(storage),
    {
      ok: true,
      favoriteStyles: getFavoriteStyleSummaries(storage),
    },
  );
});

test('favorite summary result reports storage read failures without claiming an empty collection', () => {
  const storage = {
    getStorageSync() {
      throw new Error('storage unavailable');
    },
  };

  assert.deepEqual(getFavoriteStyleSummariesResult(storage), {
    ok: false,
    favoriteStyles: [],
    error: 'storage-failed',
  });
});

test('favorite summary result rejects unavailable storage readers while legacy summaries stay empty', () => {
  const unavailableStorages = [
    ['null storage', null],
    ['undefined storage', undefined],
    ['missing getStorageSync', {}],
  ];

  unavailableStorages.forEach(([label, storage]) => {
    assert.deepEqual(
      getFavoriteStyleSummariesResult(storage),
      {
        ok: false,
        favoriteStyles: [],
        error: 'storage-failed',
      },
      label,
    );
    assert.deepEqual(getFavoriteStyleSummaries(storage), [], label);
  });
});

test('favorite mutations fail without writing when storage cannot be read', () => {
  let writes = 0;
  const storage = {
    setStorageSync() {
      writes += 1;
    },
  };

  assert.deepEqual(addFavoriteStyle('21A', storage), {
    ok: false,
    favoriteIds: [],
    isFavorite: false,
    error: 'storage-failed',
  });
  assert.equal(writes, 0);
});

test('legacy favorite summaries stay compatible with the trusted result API', () => {
  const storage = createMemoryStorage(['21A', 'ext-west-coast-ipa']);

  assert.deepEqual(
    getFavoriteStyleSummaries(storage),
    getFavoriteStyleSummariesResult(storage).favoriteStyles,
  );
});
