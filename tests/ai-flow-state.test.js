import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const { createFlowState } = require('../ai-mode/shared/flow-state.cjs');
const { createFlowStore } = loadCommonJs(
  'ai-mode/skill/craft-beer-guide/utils/flow-store.js',
);
const { createRedactedLogger } = loadCommonJs(
  'ai-mode/skill/craft-beer-guide/utils/redacted-logger.js',
);

test('FLOW-01..04 expectedRevision must equal current revision exactly', () => {
  const flow = createFlowState(record(), { now: () => 1000 });
  assert.throws(() => flow.assertCurrent(-1), /invalid-revision/);
  assert.throws(() => flow.assertCurrent(0.5), /invalid-revision/);
  assert.throws(() => flow.assertCurrent(1), /future-revision/);
  flow.advance({ expectedRevision: 0, requestId: 'req_1234567890' });
  assert.throws(() => flow.assertCurrent(0), /stale-revision/);
});

test('FLOW-09 failed mutation does not consume requestId', () => {
  const flow = createFlowState(record(), { now: () => 1000 });
  assert.equal(flow.hasProcessedRequest('req_1234567890'), false);
  assert.throws(() => flow.runMutation({
    expectedRevision: 0,
    requestId: 'req_1234567890',
    mutate() {
      throw new Error('storage-failed');
    },
  }), /storage-failed/);
  assert.equal(flow.hasProcessedRequest('req_1234567890'), false);
});

test('flow store persists an exact privacy whitelist', () => {
  const memory = new Map();
  const store = createFlowStore({
    storage: storage(memory),
    variant: 'candidate',
    now: () => 1000,
    randomHex: () => '1234567890ab',
  });
  const flow = store.begin();
  store.commitRequest({ flowId: flow.flowId, requestId: 'req_1234567890' });
  const stored = JSON.parse(memory.get('aiRecommendationFlows.v2:candidate'));
  assert.deepEqual(Object.keys(stored[0]).sort(), [
    'completed', 'flowId', 'lastActiveAt', 'requestIds', 'revision',
  ]);
});

test('redacted logger emits only fixed safe fields', () => {
  const entries = [];
  const logger = createRedactedLogger((entry) => entries.push(entry));
  logger.failure('addFavoriteBeerStyle', 'stale-revision', {
    userText: '不要苦',
    preferences: { bitterness: 'low' },
    styleRef: { id: '21A' },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(entries)), [{
    event: 'api-failure',
    apiName: 'addFavoriteBeerStyle',
    failureCode: 'stale-revision',
  }]);
});

test('same revision requests serialize within one store context', async () => {
  const memory = new Map();
  const store = createFlowStore({
    storage: storage(memory),
    variant: 'candidate',
    now: () => 1000,
    randomHex: () => 'abcdefabcdef',
  });
  const flow = store.begin();
  const results = await Promise.allSettled([
    store.withFlowLock(flow.flowId, () =>
      store.advance({ flowId: flow.flowId, expectedRevision: 0, requestId: 'req_aaaaaaaaaa' })),
    store.withFlowLock(flow.flowId, () =>
      store.advance({ flowId: flow.flowId, expectedRevision: 0, requestId: 'req_bbbbbbbbbb' })),
  ]);
  assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1);
  assert.equal(results.filter((item) => item.status === 'rejected').length, 1);
});

test('locks serialize the same flow across independent API store instances', async () => {
  const memory = new Map();
  const options = {
    storage: storage(memory),
    variant: 'candidate',
    now: () => 1000,
    randomHex: () => 'fedcbafedcba',
  };
  const first = createFlowStore(options);
  const second = createFlowStore(options);
  const flow = first.begin({ requestId: 'req_0000000001' });
  const results = await Promise.allSettled([
    first.withFlowLock(flow.flowId, () =>
      first.complete({
        flowId: flow.flowId,
        expectedRevision: 0,
        requestId: 'req_0000000002',
      })),
    second.withFlowLock(flow.flowId, () =>
      second.complete({
        flowId: flow.flowId,
        expectedRevision: 0,
        requestId: 'req_0000000003',
      })),
  ]);
  assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1);
  assert.equal(results.filter((item) => item.status === 'rejected').length, 1);
});

test('completed flow cannot advance and start requestIds are idempotent', () => {
  const memory = new Map();
  const store = createFlowStore({
    storage: storage(memory),
    variant: 'candidate',
    now: () => 1000,
    randomHex: () => '0123456789ab',
  });
  const flow = store.begin({ requestId: 'req_1000000000' });
  store.complete({
    flowId: flow.flowId,
    expectedRevision: 0,
    requestId: 'req_2000000000',
  });
  assert.throws(() => store.advance({
    flowId: flow.flowId,
    expectedRevision: 0,
    requestId: 'req_3000000000',
  }), /completed-flow/);
  assert.throws(
    () => store.begin({ requestId: 'req_1000000000' }),
    /duplicate-request/,
  );
});

test('FLOW-05..06 TTL is valid one millisecond before and expired at boundary', () => {
  let now = 1099;
  const flow = createFlowState(record(), { now: () => now, ttlMs: 100 });
  assert.doesNotThrow(() => flow.assertCurrent(0));
  now = 1100;
  assert.throws(() => flow.assertCurrent(0), /expired-flow/);
});

test('FLOW-10 storage exceptions propagate without a partial flow', () => {
  const store = createFlowStore({
    storage: {
      get() {
        return '[]';
      },
      set() {
        throw new Error('storage-failed');
      },
    },
    variant: 'candidate',
    now: () => 1000,
    randomHex: () => '001122334455',
  });
  assert.throws(
    () => store.begin({ requestId: 'req_4000000000' }),
    /storage-failed/,
  );
});

function record() {
  return {
    flowId: 'arf_1234567890ab',
    revision: 0,
    lastActiveAt: 1000,
    completed: false,
    requestIds: [],
  };
}

function storage(memory) {
  return {
    get(key) {
      return memory.get(key);
    },
    set(key, value) {
      memory.set(key, value);
    },
  };
}

function loadCommonJs(relativePath) {
  const filePath = path.resolve(relativePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const module = { exports: {} };
  const localRequire = (specifier) => require(path.resolve(path.dirname(filePath), specifier));
  vm.runInNewContext(
    `(function(require, module, exports) { ${source}\n})`,
    { console, wx: undefined },
    { filename: filePath },
  )(localRequire, module, module.exports);
  return module.exports;
}
