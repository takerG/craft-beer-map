const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const cases = readJson(path.join(root, 'tests/fixtures/ai-recommendation-v2/cases.json'));

function scorePair(control, candidate, options = {}) {
  validateTrace(control, 'control', options);
  validateTrace(candidate, 'candidate', options);
  for (const key of ['experimentId', 'experimentBuildId', 'sourceTreeFingerprint', 'catalogFingerprint']) {
    if (control[key] !== candidate[key]) throw new Error(`trace-mismatch:${key}`);
  }
  return {
    common: {
      controlCases: control.cases.length,
      candidateCases: candidate.cases.length,
    },
    control: scoreVariant(control),
    candidate: scoreVariant(candidate),
    northStar: {
      control: rates(control),
      candidate: rates(candidate),
    },
  };
}

function validateTrace(trace, variant, { requirePlatform = false, now = Date.now() } = {}) {
  if (!trace || typeof trace !== 'object' || Array.isArray(trace)) throw new Error('invalid-trace');
  const allowed = [
    'traceSource', 'experimentId', 'experimentBuildId', 'sourceTreeFingerprint',
    'catalogFingerprint', 'variant', 'recommendationContract', 'capturedAt', 'cases',
  ];
  rejectExtraKeys(trace, allowed);
  if (requirePlatform && trace.traceSource !== 'wechat-platform') throw new Error('platform-trace-required');
  if (trace.variant !== variant) throw new Error('wrong-variant');
  const expectedContract = variant === 'candidate' ? 'semantic-v2' : 'legacy-v1';
  if (trace.recommendationContract !== expectedContract) throw new Error('wrong-contract');
  if (now - Date.parse(trace.capturedAt) > 30 * 24 * 60 * 60 * 1000) throw new Error('trace-expired');
  if (!Array.isArray(trace.cases) || trace.cases.length !== cases.length) throw new Error('case-count');
  const ids = trace.cases.map((item) => item.caseId);
  if (new Set(ids).size !== cases.length) throw new Error('duplicate-case-id');
  for (const fixture of cases) {
    const item = trace.cases.find((entry) => entry.caseId === fixture.id);
    if (!item) throw new Error(`missing-case:${fixture.id}`);
    validateCase(item, fixture, variant);
  }
}

function validateCase(item, fixture, variant) {
  rejectExtraKeys(item, [
    'caseId', 'testerCode', 'turns', 'assistantOutputs', 'apiCalls',
    'cardActions', 'started', 'shown', 'completed',
  ]);
  const assistantTurns = (item.turns || []).filter((turn) => turn.role === 'assistant');
  const userTurns = (item.turns || []).filter((turn) => turn.role === 'user');
  const outputs = item.assistantOutputs || [];
  if (!String(item.testerCode || '').trim()) throw new Error('missing-tester-code');
  if (!userTurns.length || userTurns[0].content !== fixture.prompt) {
    throw new Error(`prompt-mismatch:${fixture.id}`);
  }
  if (assistantTurns.length !== outputs.length) throw new Error('missing-assistant-turn');
  assistantTurns.forEach((turn, index) => {
    if (outputs[index]?.turnId !== turn.turnId) throw new Error('assistant-turn-order');
    if (!String(outputs[index]?.content || '').trim()) throw new Error('empty-assistant-turn');
    if (outputs[index].content !== turn.content) throw new Error('assistant-output-mismatch');
  });
  const expected = fixture.expectedByVariant[variant];
  const apiCalls = item.apiCalls || [];
  if (expected.api !== 'knowledge') {
    const names = apiCalls.map((call) => call.name);
    if (!names.includes(expected.api)) throw new Error(`wrong-api:${fixture.id}`);
  }
  apiCalls.forEach((call) => {
    if (!call.result || typeof call.result !== 'object') {
      throw new Error(`missing-api-result:${fixture.id}`);
    }
  });
  if (variant === 'candidate') validateCandidateExpectation(item, fixture, expected);
  validateDerivedFunnel(item, fixture);
  for (const forbidden of fixture.forbiddenClaims || []) {
    if (outputs.some((output) => output.content.includes(forbidden))) {
      throw new Error(`unsupported-fact:${fixture.id}`);
    }
  }
}

function validateCandidateExpectation(item, fixture, expected) {
  const calls = item.apiCalls || [];
  const successful = calls.filter((call) => !call.result.isError);
  const failed = calls.filter((call) => call.result.isError);
  const recommendationCalls = calls.filter((call) => call.name === 'recommendBeerStyles');
  recommendationCalls.filter((call) => !call.result.isError).forEach((call) => {
    const args = call.arguments || {};
    const preferences = args.preferences || {};
    const dimensions = ['sweetness', 'sourness', 'bitterness', 'body', 'strength'];
    if (!args.scenario || !args.flow || !dimensions.every((key) => Object.hasOwn(preferences, key))) {
      throw new Error(`incomplete-semantic-call:${fixture.id}`);
    }
  });
  if (expected.multiTurn) {
    const userTurns = (item.turns || []).filter((turn) => turn.role === 'user');
    if (userTurns.length < 2 || recommendationCalls.filter((call) => !call.result.isError).length < 2) {
      throw new Error(`multi-turn-required:${fixture.id}`);
    }
  }
  if (expected.state) {
    const last = [...successful].reverse().find((call) => call.name === expected.api);
    if (last?.result?.structuredContent?.status !== expected.state) {
      throw new Error(`wrong-state:${fixture.id}`);
    }
  }
  if (expected.relaxationCount !== undefined) {
    const last = [...successful].reverse().find((call) => call.name === expected.api);
    const count = last?.result?.structuredContent?.relaxation?.dimensions?.length || 0;
    if (count !== expected.relaxationCount) throw new Error(`wrong-relaxation:${fixture.id}`);
  }
  const requiredFailure = expected.staleRejected
    ? 'stale-revision'
    : expected.expired
      ? 'expired-flow'
      : expected.duplicate
        ? 'duplicate-request'
        : null;
  if (requiredFailure && !failed.some((call) => failureCode(call.result) === requiredFailure)) {
    throw new Error(`missing-failure:${fixture.id}:${requiredFailure}`);
  }
  if (expected.recover && !(failed.length && successful.length)) {
    throw new Error(`recovery-not-proven:${fixture.id}`);
  }
  if (expected.restarted && !(
    failed.length &&
    recommendationCalls.some((call) => !call.result.isError && call.arguments?.flow?.mode === 'start')
  )) {
    throw new Error(`restart-not-proven:${fixture.id}`);
  }
}

function failureCode(result) {
  return result.failureCode || result._meta?.failureCode || null;
}

function validateDerivedFunnel(item, fixture) {
  const successfulRecommendations = (item.apiCalls || []).filter((call) =>
    call.name === 'recommendBeerStyles' && !call.result.isError);
  const actions = item.cardActions || [];
  const started = successfulRecommendations.length > 0;
  const shown = actions.some((action) =>
    action.type === 'recommendation-shown' && action.status === 'success');
  const completed = actions.some((action) =>
    ['detail-opened', 'favorite-added'].includes(action.type) &&
    action.status === 'success');
  if (item.started !== started) throw new Error(`started-evidence-mismatch:${fixture.id}`);
  if (item.shown !== shown) throw new Error(`shown-evidence-mismatch:${fixture.id}`);
  if (item.completed !== completed) throw new Error(`completed-evidence-mismatch:${fixture.id}`);
  if (shown && !started) throw new Error(`shown-without-start:${fixture.id}`);
  if (completed && !shown) throw new Error(`completed-without-shown:${fixture.id}`);
}

function scoreVariant(trace) {
  return {
    passedCases: trace.cases.length,
    completionCount: trace.cases.filter((item) => item.completed).length,
  };
}

function rates(trace) {
  const started = trace.cases.filter((item) => item.started).length;
  const shown = trace.cases.filter((item) => item.shown).length;
  const completed = trace.cases.filter((item) => item.completed).length;
  return {
    completedOverStarted: started ? completed / started : 0,
    completedOverShown: shown ? completed / shown : 0,
  };
}

function rejectExtraKeys(value, allowed) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`additional-property:${key}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseArg(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

if (require.main === module) {
  try {
    const controlPath = parseArg('control');
    const candidatePath = parseArg('candidate');
    if (!controlPath || !candidatePath) throw new Error('control and candidate trace paths are required');
    const result = scorePair(readJson(path.resolve(root, controlPath)), readJson(path.resolve(root, candidatePath)));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { scorePair, validateTrace };
