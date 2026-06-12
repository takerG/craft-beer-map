const { createFlowState, validateFlowRecord } = require('../../../shared/flow-state.cjs');

const FLOW_TTL_MS = 30 * 60 * 1000;
const RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_FLOWS = 20;
const locks = new Map();

function createFlowStore({
  storage = wxStorage(),
  variant = 'candidate',
  now = () => Date.now(),
  randomHex = defaultRandomHex,
} = {}) {
  const key = `aiRecommendationFlows.v2:${variant}`;
  function read() {
    try {
      const parsed = JSON.parse(storage.get(key) || '[]');
      return parsed
        .filter(validateFlowRecord)
        .filter((record) => now() - record.lastActiveAt < RETENTION_MS)
        .slice(-MAX_FLOWS);
    } catch (error) {
      return [];
    }
  }

  function write(records) {
    storage.set(key, JSON.stringify(records.slice(-MAX_FLOWS)));
  }

  function begin({ requestId } = {}) {
    const records = read();
    if (requestId && records.some((record) => record.requestIds.includes(requestId))) {
      throw flowError('duplicate-request');
    }
    const record = {
      flowId: `arf_${randomHex(12)}`,
      revision: 0,
      lastActiveAt: now(),
      completed: false,
      requestIds: [],
    };
    if (requestId) {
      createFlowState(record, { now, ttlMs: FLOW_TTL_MS }).commitRequest(requestId);
    }
    records.push(record);
    write(records);
    return { ...record };
  }

  function mutate(flowId, callback) {
    const records = read();
    const record = records.find((item) => item.flowId === flowId);
    if (!record) throw flowError('unknown-flow');
    const flow = createFlowState(record, { now, ttlMs: FLOW_TTL_MS });
    const result = callback(flow);
    write(records);
    return result;
  }

  function assertCurrent({ flowId, expectedRevision }) {
    return mutate(flowId, (flow) => ({ ...flow.assertCurrent(expectedRevision) }));
  }

  function hasProcessedRequest({ flowId, requestId }) {
    return mutate(flowId, (flow) => flow.hasProcessedRequest(requestId));
  }

  function commitRequest({ flowId, requestId }) {
    return mutate(flowId, (flow) => ({ ...flow.commitRequest(requestId) }));
  }

  function advance({ flowId, expectedRevision, requestId }) {
    return mutate(flowId, (flow) => ({ ...flow.advance({ expectedRevision, requestId }) }));
  }

  function complete({ flowId, expectedRevision, requestId }) {
    return mutate(flowId, (flow) => flow.complete({ expectedRevision, requestId }));
  }

  function withFlowLock(flowId, callback) {
    const lockKey = `${variant}:${flowId}`;
    const previous = locks.get(lockKey) || Promise.resolve();
    const current = previous.then(() => callback());
    const tail = current.catch(() => undefined);
    locks.set(lockKey, tail);
    return current.finally(() => {
      if (locks.get(lockKey) === tail) locks.delete(lockKey);
    });
  }

  return {
    begin,
    assertCurrent,
    hasProcessedRequest,
    commitRequest,
    advance,
    complete,
    withFlowLock,
  };
}

function wxStorage() {
  return {
    get(key) {
      return typeof wx !== 'undefined' && typeof wx.getStorageSync === 'function'
        ? wx.getStorageSync(key)
        : '';
    },
    set(key, value) {
      if (typeof wx !== 'undefined' && typeof wx.setStorageSync === 'function') {
        wx.setStorageSync(key, value);
      }
    },
  };
}

function defaultRandomHex(length) {
  let value = '';
  while (value.length < length) value += Math.floor(Math.random() * 16).toString(16);
  return value.slice(0, length);
}

function flowError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

module.exports = { createFlowStore };
