import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { buildTrace } from './helpers/ai-recommendation-trace-fixture.js';

const require = createRequire(import.meta.url);
const { scorePair } = require('../scripts/score_ai_recommendation_traces.cjs');
const cases = JSON.parse(
  fs.readFileSync('tests/fixtures/ai-recommendation-v2/cases.json', 'utf8'),
);

test('fixture contains exactly 60 variant-specific platform cases', () => {
  assert.equal(cases.length, 60);
  assert.equal(new Set(cases.map((item) => item.id)).size, 60);
  assert.ok(cases.every((item) => item.expectedByVariant.control));
  assert.ok(cases.every((item) => item.expectedByVariant.candidate));
});

test('complete synthetic traces score for both contracts', () => {
  const result = scorePair(buildTrace(cases, 'control'), buildTrace(cases, 'candidate'));
  assert.equal(result.common.controlCases, 60);
  assert.equal(result.common.candidateCases, 60);
});

test('omitting any assistant turn fails trace scoring', () => {
  const control = buildTrace(cases, 'control');
  control.cases[0].assistantOutputs = [];
  assert.throws(
    () => scorePair(control, buildTrace(cases, 'candidate')),
    /missing-assistant-turn/,
  );
});

test('candidate semantic expectations reject shallow placeholder traces', () => {
  const candidate = buildTrace(cases, 'candidate');
  const refinement = candidate.cases.find((item) => item.caseId === 'REF-01');
  refinement.apiCalls = refinement.apiCalls.slice(0, 1);
  assert.throws(
    () => scorePair(buildTrace(cases, 'control'), candidate),
    /multi-turn-required/,
  );
});

function trace(variant) {
  return {
    traceSource: 'synthetic',
    experimentId: 'ai-rec-quality-v2-20260612',
    experimentBuildId: 'build-1',
    sourceTreeFingerprint: 'sha256:source',
    catalogFingerprint: 'sha256:catalog',
    variant,
    recommendationContract: variant === 'candidate' ? 'semantic-v2' : 'legacy-v1',
    capturedAt: new Date().toISOString(),
    cases: cases.map((fixture) => {
      const assistantTurn = { turnId: `${fixture.id}-A1`, role: 'assistant', content: '已处理测试请求。' };
      return {
        caseId: fixture.id,
        testerCode: variant === 'candidate' ? 'T-N-001' : 'T-C-001',
        turns: [
          { turnId: `${fixture.id}-U1`, role: 'user', content: fixture.prompt },
          assistantTurn,
        ],
        assistantOutputs: [{ turnId: assistantTurn.turnId, content: assistantTurn.content }],
        apiCalls: fixture.expectedByVariant[variant].api === 'knowledge'
          ? []
          : [{ name: fixture.expectedByVariant[variant].api }],
        cardActions: [],
        started: true,
        shown: true,
        completed: fixture.category === 'routing',
      };
    }),
  };
}
