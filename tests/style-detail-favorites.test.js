import test from 'node:test';
import assert from 'node:assert/strict';

import { FAVORITE_STYLE_STORAGE_KEY } from '../utils/style-favorites.js';

let stylePageDefinition = null;
let extensionStylePageDefinition = null;

globalThis.Page = (definition) => {
  stylePageDefinition = definition;
};
await import('../subpages/style/index.js?style-detail-favorites-test');
globalThis.Page = (definition) => {
  extensionStylePageDefinition = definition;
};
await import('../subpages/extension-style/index.js?style-detail-favorites-test');
delete globalThis.Page;

const detailPages = [
  ['BJCP style detail', stylePageDefinition, '21A'],
  ['extension style detail', extensionStylePageDefinition, 'ext-west-coast-ipa'],
];

for (const [label, definition, styleId] of detailPages) {
  test(`${label} keeps detail ready when favorite reads fail and retries without writing`, () => {
    const storage = createControlledStorage([]);
    storage.failReads = true;
    const runtime = installMiniProgramRuntime(storage);
    const page = createPage(definition);

    try {
      page.onLoad({ styleId });

      assert.equal(page.data.loadStatus, 'ready');
      assert.equal(page.data.detail.style.id, styleId);
      assert.equal(page.data.favoriteStatus, 'error');
      assert.equal(page.data.favoriteActionLabel, '重试收藏状态');
      assert.notEqual(page.data.favoriteActionLabel, '收藏');
      assert.equal(storage.writes, 0);

      const readsAfterLoad = storage.reads;
      page.toggleFavorite();

      assert.ok(storage.reads > readsAfterLoad);
      assert.equal(storage.writes, 0);
      assert.equal(page.data.favoriteStatus, 'error');
      assert.equal(
        runtime.analyticsQueue.some((event) => event.eventName === 'favorite_toggle'),
        false,
      );

      storage.failReads = false;
      storage.value = [styleId];
      page.toggleFavorite();

      assert.equal(storage.writes, 0);
      assert.equal(page.data.favoriteStatus, 'ready');
      assert.equal(page.data.isFavorite, true);
      assert.equal(page.data.favoriteActionLabel, '已收藏');
      assert.equal(
        runtime.analyticsQueue.some((event) => event.eventName === 'favorite_toggle'),
        false,
      );

      storage.failReads = true;
      page.refreshFavoriteState();

      assert.equal(page.data.loadStatus, 'ready');
      assert.equal(page.data.favoriteStatus, 'error');
      assert.equal(page.data.favoriteActionLabel, '重试收藏状态');
    } finally {
      runtime.restore();
    }
  });

  test(`${label} enters unknown state after an uncertain mutation`, () => {
    const storage = createControlledStorage([]);
    const runtime = installMiniProgramRuntime(storage);
    const page = createPage(definition);

    try {
      page.onLoad({ styleId });
      assert.equal(page.data.favoriteStatus, 'ready');
      assert.equal(page.data.isFavorite, false);

      storage.failConfirmationAndRollback = true;
      page.toggleFavorite();

      assert.equal(storage.writes, 2);
      assert.equal(page.data.loadStatus, 'ready');
      assert.equal(page.data.favoriteStatus, 'error');
      assert.equal(page.data.favoriteActionLabel, '重试收藏状态');
      assert.equal(
        runtime.analyticsQueue.some((event) => event.eventName === 'favorite_toggle'),
        false,
      );
    } finally {
      runtime.restore();
    }
  });

  test(`${label} refreshes trusted state before retrying an unreadable mutation`, () => {
    const storage = createControlledStorage([]);
    const runtime = installMiniProgramRuntime(storage);
    const page = createPage(definition);

    try {
      page.onLoad({ styleId });

      assert.equal(page.data.favoriteStatus, 'ready');
      assert.equal(page.data.isFavorite, false);
      assert.equal(storage.writes, 0);

      storage.failReads = true;
      page.toggleFavorite();

      assert.equal(storage.writes, 0);
      assert.equal(page.data.favoriteStatus, 'error');
      assert.equal(
        runtime.analyticsQueue.some((event) => event.eventName === 'favorite_toggle'),
        false,
      );

      storage.failReads = false;
      storage.value = [styleId];
      page.toggleFavorite();

      assert.equal(storage.writes, 0);
      assert.equal(page.data.favoriteStatus, 'ready');
      assert.equal(page.data.isFavorite, true);
      assert.equal(
        runtime.analyticsQueue.some((event) => event.eventName === 'favorite_toggle'),
        false,
      );

      page.toggleFavorite();

      assert.equal(storage.writes, 1);
      assert.deepEqual(storage.value, []);
      assert.equal(page.data.favoriteStatus, 'ready');
      assert.equal(page.data.isFavorite, false);
      assert.equal(
        runtime.analyticsQueue.filter((event) => event.eventName === 'favorite_toggle').length,
        1,
      );
    } finally {
      runtime.restore();
    }
  });
}

function createPage(definition) {
  const page = {
    data: structuredClone(definition.data),
    setData(patch, callback) {
      Object.entries(patch).forEach(([key, value]) => {
        setDataValue(this.data, key, value);
      });
      if (typeof callback === 'function') callback();
    },
  };

  Object.entries(definition).forEach(([key, value]) => {
    if (typeof value === 'function') {
      page[key] = value.bind(page);
    }
  });

  return page;
}

function setDataValue(data, key, value) {
  const path = key.split('.');
  const finalKey = path.pop();
  const target = path.reduce((current, segment) => current[segment], data);
  target[finalKey] = value;
}

function createControlledStorage(initialValue) {
  return {
    value: [...initialValue],
    reads: 0,
    writes: 0,
    failReads: false,
    failConfirmationAndRollback: false,
    getStorageSync(key) {
      assert.equal(key, FAVORITE_STYLE_STORAGE_KEY);
      this.reads += 1;
      if (this.failReads) {
        throw new Error('storage unavailable');
      }
      if (this.failConfirmationAndRollback && this.reads === 3) {
        throw new Error('confirmation read failed');
      }
      return [...this.value];
    },
    setStorageSync(key, value) {
      assert.equal(key, FAVORITE_STYLE_STORAGE_KEY);
      this.writes += 1;
      if (this.failConfirmationAndRollback && this.writes === 2) {
        throw new Error('rollback write failed');
      }
      this.value = [...value];
    },
  };
}

function installMiniProgramRuntime(storage) {
  const previousWx = globalThis.wx;
  const previousGetApp = globalThis.getApp;
  const analyticsQueue = [];

  globalThis.wx = {
    getStorageSync: storage.getStorageSync.bind(storage),
    setStorageSync: storage.setStorageSync.bind(storage),
    nextTick(callback) {
      callback();
    },
    setNavigationBarTitle() {},
    showShareMenu() {},
    showToast() {},
  };
  globalThis.getApp = () => ({
    globalData: {
      analyticsQueue,
    },
  });

  return {
    analyticsQueue,
    restore() {
      if (previousWx === undefined) {
        delete globalThis.wx;
      } else {
        globalThis.wx = previousWx;
      }
      if (previousGetApp === undefined) {
        delete globalThis.getApp;
      } else {
        globalThis.getApp = previousGetApp;
      }
    },
  };
}
