import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiRecommendationTelemetry, prunePendingQueue } from '../ai-mode/page-runtime/ai-recommendation-telemetry.js';

test('off mode creates no queue and performs no report call', () => {
  let reads = 0;
  let reports = 0;
  const telemetry = createAiRecommendationTelemetry({
    mode: 'off',
    storage: { get() { reads += 1; }, set() {} },
    wxApi: { reportEvent() { reports += 1; } },
  });
  telemetry.track('ai_entry_opened', { pageSource: 'choose' });
  assert.equal(reads, 0);
  assert.equal(reports, 0);
});

test('page-only queue stores only the strict event projection', () => {
  const memory = new Map();
  const reported = [];
  const telemetry = createAiRecommendationTelemetry({
    mode: 'page-only',
    experimentId: 'exp',
    variant: 'candidate',
    environment: 'experience-page',
    buildId: 'build',
    now: () => 1000,
    storage: {
      get(key) { return memory.get(key); },
      set(key, value) { memory.set(key, value); },
    },
    wxApi: {
      reportEvent(name, payload) { reported.push([name, payload]); },
    },
  });
  telemetry.track('ai_entry_opened', {
    pageSource: 'choose',
    flowId: 'arf_private',
    preferences: { bitterness: 'low' },
  });
  assert.deepEqual(reported, [['ai_entry_opened', { pageSource: 'choose', timestamp: 1000 }]]);
  assert.deepEqual(telemetry.inspect().events, []);
});

test('queue pruning enforces TTL, count, and serialized size together', () => {
  const state = {
    experimentId: 'exp',
    variant: 'candidate',
    environment: 'experience-page',
    buildId: 'build',
    events: Array.from({ length: 80 }, (_, index) => ({
      eventName: 'ai_entry_opened',
      pageSource: 'x'.repeat(1000),
      timestamp: index < 10 ? 0 : 1000,
    })),
  };
  const pruned = prunePendingQueue(state, 24 * 60 * 60 * 1000);
  assert.equal(pruned.events.length <= 50, true);
  assert.equal(JSON.stringify(pruned).length <= 32 * 1024, true);
  assert.equal(pruned.events.every((event) => event.timestamp > 0), true);
});
