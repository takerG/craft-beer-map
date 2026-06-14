import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { FAVORITE_STYLE_STORAGE_KEY } from '../utils/style-favorites.js';

const root = process.cwd();
let favoritesPageDefinition = null;

globalThis.Page = (definition) => {
  favoritesPageDefinition = definition;
};
await import('../pages/favorites/index.js?favorites-page-test');
delete globalThis.Page;

test('favorites page exposes trusted loading, error, retry, and atomic remove structure', () => {
  const js = readSource('pages/favorites/index.js');
  const wxml = readSource('pages/favorites/index.wxml');
  const wxss = readSource('pages/favorites/index.wxss');

  assert.match(js, /getFavoriteStyleSummariesResult/);
  assert.match(js, /removeFavoriteStyle/);
  assert.match(js, /loadStatus:\s*'loading'/);
  assert.match(js, /retryFavoriteStyles\(\)/);
  assert.match(js, /removeFavorite\(event\)/);
  assert.match(wxml, /wx:if="{{loadStatus === 'loading'}}"/);
  assert.match(wxml, /wx:elif="{{loadStatus === 'error'}}"/);
  assert.match(wxml, /wx:elif="{{loadStatus === 'ready'}}"/);
  assert.match(wxml, /bindtap="retryFavoriteStyles"/);
  assert.match(wxml, /catchtap="removeFavorite"/);
  assert.match(wxml, /data-style-id="{{item\.id}}"/);
  assert.match(wxml, /data-item-kind="{{item\.kind}}"/);
  assert.match(wxml, /扩展风格/);
  assert.doesNotMatch(wxml, />EX</);
  assert.match(wxss, /\.favorite-remove\s*\{[^}]*min-height:\s*58rpx;/s);
});

test('favorites page reports a read error without claiming zero favorites and retries successfully', () => {
  let shouldFail = true;
  const storage = createWxStorage(['21A']);
  storage.getStorageSync = (key) => {
    if (shouldFail) throw new Error('read failed');
    return storage.store.get(key);
  };
  const restoreGlobals = installGlobals(storage);
  const page = createFavoritesPage();

  try {
    page.refreshFavoriteStyles();

    assert.equal(page.data.loadStatus, 'error');
    assert.notEqual(page.data.errorMessage, '');
    assert.notEqual(page.data.favoriteCountLabel, '0 个收藏');

    shouldFail = false;
    page.retryFavoriteStyles();

    assert.equal(page.data.loadStatus, 'ready');
    assert.equal(page.data.favoriteCountLabel, '1 个收藏');
    assert.deepEqual(page.data.favoriteStyles.map((style) => style.id), ['21A']);
  } finally {
    restoreGlobals();
  }
});

test('favorites page clears trusted list and AI count context before a later read failure', () => {
  let shouldFail = false;
  const storage = createWxStorage(['21A']);
  storage.getStorageSync = (key) => {
    if (shouldFail) throw new Error('read failed');
    return storage.store.get(key);
  };
  const restoreGlobals = installGlobals(storage);
  const page = createFavoritesPage();

  try {
    page.refreshFavoriteStyles();

    assert.equal(page.data.loadStatus, 'ready');
    assert.equal(page.data.hasFavoriteStyles, true);
    assert.equal(page.data.favoriteCountLabel, '1 个收藏');
    assert.deepEqual(page.data.favoriteStyles.map((style) => style.id), ['21A']);

    shouldFail = true;
    const callCountBeforeFailure = page.setDataCalls.length;
    page.refreshFavoriteStyles();

    assert.deepEqual(page.setDataCalls[callCountBeforeFailure], {
      loadStatus: 'loading',
      errorMessage: '',
      favoriteStyles: [],
      hasFavoriteStyles: false,
      favoriteCountLabel: '',
    });
    assert.equal(page.data.loadStatus, 'error');
    assert.notEqual(page.data.errorMessage, '');
    assert.deepEqual(page.data.favoriteStyles, []);
    assert.equal(page.data.hasFavoriteStyles, false);
    assert.equal(page.data.favoriteCountLabel, '');
  } finally {
    restoreGlobals();
  }
});

test('successful favorite removal refreshes from storage and reports success', () => {
  const storage = createWxStorage(['21A', '1B']);
  const restoreGlobals = installGlobals(storage);
  const page = createFavoritesPage();

  try {
    page.refreshFavoriteStyles();
    let refreshCount = 0;
    const refresh = page.refreshFavoriteStyles;
    page.refreshFavoriteStyles = () => {
      refreshCount += 1;
      refresh();
    };

    page.removeFavorite(createRemoveEvent('21A', 'bjcp'));

    assert.equal(refreshCount, 1);
    assert.deepEqual(page.data.favoriteStyles.map((style) => style.id), ['1B']);
    assert.deepEqual(storage.toasts, [
      {
        title: '已取消收藏',
        icon: 'success',
      },
    ]);
    assert.ok(
      storage.analyticsQueue.some((entry) => entry.eventName === 'favorite_remove_success'),
      'successful removal should be reported',
    );
  } finally {
    restoreGlobals();
  }
});

test('failed favorite removal keeps the rendered list and does not refresh or report success', () => {
  const storage = createWxStorage(['21A', '1B']);
  const restoreGlobals = installGlobals(storage);
  const page = createFavoritesPage();

  try {
    page.refreshFavoriteStyles();
    const previousStyles = structuredClone(page.data.favoriteStyles);
    storage.setStorageSync = () => {
      throw new Error('storage full');
    };
    let refreshCount = 0;
    page.refreshFavoriteStyles = () => {
      refreshCount += 1;
    };

    page.removeFavorite(createRemoveEvent('21A', 'bjcp'));

    assert.equal(refreshCount, 0);
    assert.deepEqual(page.data.favoriteStyles, previousStyles);
    assert.deepEqual(storage.toasts, [
      {
        title: '取消失败，请重试',
        icon: 'none',
      },
    ]);
    assert.equal(
      storage.analyticsQueue.some((entry) => entry.eventName === 'favorite_remove_success'),
      false,
    );
  } finally {
    restoreGlobals();
  }
});

function readSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function createFavoritesPage() {
  const page = {
    data: structuredClone(favoritesPageDefinition.data),
    setDataCalls: [],
    setData(patch) {
      this.setDataCalls.push(structuredClone(patch));
      Object.assign(this.data, patch);
    },
  };

  Object.entries(favoritesPageDefinition).forEach(([key, value]) => {
    if (typeof value === 'function') {
      page[key] = value.bind(page);
    }
  });

  return page;
}

function createWxStorage(initialValue) {
  const store = new Map([[FAVORITE_STYLE_STORAGE_KEY, initialValue]]);
  return {
    store,
    toasts: [],
    analyticsQueue: [],
    getStorageSync(key) {
      return store.get(key);
    },
    setStorageSync(key, value) {
      store.set(key, value);
    },
    showToast(options) {
      this.toasts.push(options);
    },
  };
}

function installGlobals(storage) {
  const previousWx = globalThis.wx;
  const previousGetApp = globalThis.getApp;
  globalThis.wx = storage;
  globalThis.getApp = () => ({
    globalData: {
      analyticsQueue: storage.analyticsQueue,
    },
  });

  return () => {
    if (previousWx === undefined) delete globalThis.wx;
    else globalThis.wx = previousWx;
    if (previousGetApp === undefined) delete globalThis.getApp;
    else globalThis.getApp = previousGetApp;
  };
}

function createRemoveEvent(styleId, itemKind) {
  return {
    currentTarget: {
      dataset: {
        styleId,
        itemKind,
      },
    },
  };
}
