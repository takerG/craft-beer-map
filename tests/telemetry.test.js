import test from 'node:test';
import assert from 'node:assert/strict';

import { trackEvent } from '../utils/telemetry.js';

test.afterEach(() => {
  delete globalThis.wx;
  delete globalThis.getApp;
});

test('trackEvent caches events without reporting to WeChat in develop env', () => {
  const app = { globalData: {} };
  let reportCallCount = 0;

  globalThis.wx = {
    getAccountInfoSync() {
      return {
        miniProgram: {
          envVersion: 'develop',
        },
      };
    },
    reportEvent() {
      reportCallCount += 1;
    },
  };
  globalThis.getApp = () => app;

  trackEvent('academy_article_view', { slug: 'ipa-family-map' });

  assert.equal(reportCallCount, 0);
  assert.deepEqual(app.globalData.analyticsQueue, [
    {
      eventName: 'academy_article_view',
      payload: { slug: 'ipa-family-map' },
      timestamp: app.globalData.analyticsQueue[0].timestamp,
    },
  ]);
});

test('trackEvent reports to WeChat analytics in release env', () => {
  const app = { globalData: {} };
  const reportedEvents = [];

  globalThis.wx = {
    getAccountInfoSync() {
      return {
        miniProgram: {
          envVersion: 'release',
        },
      };
    },
    reportEvent(eventName, payload) {
      reportedEvents.push([eventName, payload]);
    },
  };
  globalThis.getApp = () => app;

  trackEvent('academy_article_view', { slug: 'ipa-family-map' });

  assert.deepEqual(reportedEvents, [['academy_article_view', { slug: 'ipa-family-map' }]]);
  assert.equal(app.globalData.analyticsQueue.length, 1);
});
