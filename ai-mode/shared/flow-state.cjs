const FLOW_ID_PATTERN = /^arf_[0-9a-f]{12,32}$/;
const REQUEST_ID_PATTERN = /^req_[0-9a-f]{10,32}$/;
const MAX_REQUEST_IDS = 32;

function createFlowState(record, options = {}) {
  const state = record;
  const now = options.now || (() => Date.now());
  const ttlMs = options.ttlMs || 30 * 60 * 1000;

  function assertRevision(expectedRevision) {
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      throw codeError('invalid-revision');
    }
    if (now() - state.lastActiveAt >= ttlMs) throw codeError('expired-flow');
    if (expectedRevision < state.revision) throw codeError('stale-revision');
    if (expectedRevision > state.revision) throw codeError('future-revision');
  }

  function assertCurrent(expectedRevision) {
    assertRevision(expectedRevision);
    if (state.completed) throw codeError('completed-flow');
    return state;
  }

  function hasProcessedRequest(requestId) {
    validateRequestId(requestId);
    return state.requestIds.includes(requestId);
  }

  function commitRequest(requestId) {
    validateRequestId(requestId);
    if (!state.requestIds.includes(requestId)) {
      state.requestIds.push(requestId);
      state.requestIds = state.requestIds.slice(-MAX_REQUEST_IDS);
    }
    state.lastActiveAt = now();
    return state;
  }

  function advance({ expectedRevision, requestId }) {
    assertCurrent(expectedRevision);
    if (hasProcessedRequest(requestId)) throw codeError('duplicate-request');
    commitRequest(requestId);
    state.revision += 1;
    return state;
  }

  function complete({ expectedRevision, requestId }) {
    assertRevision(expectedRevision);
    if (hasProcessedRequest(requestId)) {
      return { state, firstCompletion: false };
    }
    if (state.completed) throw codeError('completed-flow');
    commitRequest(requestId);
    const firstCompletion = !state.completed;
    state.completed = true;
    return { state, firstCompletion };
  }

  function runMutation({ expectedRevision, requestId, mutate }) {
    assertCurrent(expectedRevision);
    if (hasProcessedRequest(requestId)) throw codeError('duplicate-request');
    const value = mutate();
    commitRequest(requestId);
    return value;
  }

  return {
    record: state,
    assertCurrent,
    hasProcessedRequest,
    commitRequest,
    advance,
    complete,
    runMutation,
  };
}

function validateFlowRecord(record) {
  const keys = Object.keys(record).sort();
  const allowed = ['completed', 'flowId', 'lastActiveAt', 'requestIds', 'revision'];
  return (
    JSON.stringify(keys) === JSON.stringify(allowed) &&
    FLOW_ID_PATTERN.test(record.flowId) &&
    Number.isInteger(record.revision) &&
    record.revision >= 0 &&
    Number.isFinite(record.lastActiveAt) &&
    typeof record.completed === 'boolean' &&
    Array.isArray(record.requestIds) &&
    record.requestIds.every((id) => REQUEST_ID_PATTERN.test(id))
  );
}

function codeError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function validateRequestId(requestId) {
  if (!REQUEST_ID_PATTERN.test(String(requestId || ''))) throw codeError('invalid-request-id');
}

module.exports = {
  FLOW_ID_PATTERN,
  REQUEST_ID_PATTERN,
  createFlowState,
  validateFlowRecord,
};
