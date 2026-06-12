import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildTrace } from './helpers/ai-recommendation-trace-fixture.js';

const require = createRequire(import.meta.url);
const { auditRelease } = require('../scripts/audit_ai_recommendation_release.cjs');
const cases = JSON.parse(
  fs.readFileSync('tests/fixtures/ai-recommendation-v2/cases.json', 'utf8'),
);

test('release audit accepts only complete platform evidence', () => {
  const root = fixtureRoot();
  const result = auditRelease({ root, clean: true });
  assert.equal(result.status, 'passed');
  assert.equal(result.contaminationRate, 0);
});

test('release audit rejects synthetic traces and missing evidence', () => {
  const root = fixtureRoot();
  const controlPath = path.join(root, 'artifacts/ai-evaluation-traces/control.json');
  const control = readJson(controlPath);
  control.traceSource = 'synthetic';
  writeJson(controlPath, control);
  assert.throws(() => auditRelease({ root, clean: true }), /platform-trace-required/);

  const missingRoot = fixtureRoot();
  fs.rmSync(path.join(missingRoot, 'artifacts/ai-mode-platform-probe/validator-control.json'));
  assert.throws(() => auditRelease({ root: missingRoot, clean: true }), /validator-control/);
});

test('release audit rejects contamination above five percent', () => {
  const root = fixtureRoot();
  const auditPath = path.join(root, 'artifacts/ai-evaluation-traces/operations-audit.json');
  const audit = readJson(auditPath);
  audit.testers.slice(0, 5).forEach((tester) => {
    tester.observedVariants = ['control', 'candidate'];
  });
  writeJson(auditPath, audit);
  assert.throws(() => auditRelease({ root, clean: true }), /contamination-rate-exceeded/);
});

test('release audit binds traces and evidence to clean build manifests', () => {
  const root = fixtureRoot();
  const manifestPath = path.join(
    root, 'artifacts/ai-mode-experiment/candidate/build-manifest.json',
  );
  const manifestValue = readJson(manifestPath);
  manifestValue.sourceTreeFingerprint = 'sha256:other-source';
  writeJson(manifestPath, manifestValue);
  assert.throws(() => auditRelease({ root, clean: true }), /manifest-trace-mismatch/);

  const missingEvidenceRoot = fixtureRoot();
  fs.rmSync(path.join(
    missingEvidenceRoot,
    'artifacts/ai-mode-platform-probe/validator-control.json.log',
  ));
  assert.throws(
    () => auditRelease({ root: missingEvidenceRoot, clean: true }),
    /missing-validator-control-file/,
  );
});

test('release audit requires at least forty testers per variant', () => {
  const root = fixtureRoot();
  const auditPath = path.join(root, 'artifacts/ai-evaluation-traces/operations-audit.json');
  const audit = readJson(auditPath);
  audit.testers = audit.testers.filter((tester) =>
    tester.assignedVariant === 'candidate' || Number(tester.testerCode.slice(2)) <= 39);
  writeJson(auditPath, audit);
  assert.throws(() => auditRelease({ root, clean: true }), /insufficient-testers:control/);
});

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-rec-audit-'));
  const probeRoot = path.join(root, 'artifacts/ai-mode-platform-probe');
  const traceRoot = path.join(root, 'artifacts/ai-evaluation-traces');
  const experimentRoot = path.join(root, 'artifacts/ai-mode-experiment');
  fs.mkdirSync(probeRoot, { recursive: true });
  fs.mkdirSync(traceRoot, { recursive: true });
  fs.mkdirSync(path.join(experimentRoot, 'control'), { recursive: true });
  fs.mkdirSync(path.join(experimentRoot, 'candidate'), { recursive: true });
  for (const variant of ['control', 'candidate']) {
    writeJson(
      path.join(experimentRoot, variant, 'build-manifest.json'),
      manifest(variant),
    );
  }
  ['probe-record.json', 'validator-control.json', 'validator-candidate.json'].forEach((name) => {
    const variant = name.includes('control')
      ? 'control'
      : name.includes('candidate')
        ? 'candidate'
        : undefined;
    const evidence = `${name}.log`;
    fs.writeFileSync(path.join(probeRoot, evidence), `${name} passed\n`, 'utf8');
    writeJson(path.join(probeRoot, name), {
      status: 'passed',
      evidence,
      experimentId: 'ai-rec-quality-v2-20260612',
      experimentBuildId: 'build-1',
      sourceTreeFingerprint: 'sha256:source',
      catalogFingerprint: 'sha256:catalog',
      capturedAt: new Date().toISOString(),
      ...(variant ? { variant } : {}),
    });
  });
  writeJson(
    path.join(traceRoot, 'control.json'),
    buildTrace(cases, 'control', 'wechat-platform'),
  );
  writeJson(
    path.join(traceRoot, 'candidate.json'),
    buildTrace(cases, 'candidate', 'wechat-platform'),
  );
  const windowStartedAt = new Date(Date.now() - 60_000).toISOString();
  const windowEndedAt = new Date(Date.now() - 30_000).toISOString();
  writeJson(path.join(traceRoot, 'operations-audit.json'), {
    experimentId: 'ai-rec-quality-v2-20260612',
    experimentBuildId: 'build-1',
    rosterOwner: 'Experiment Operations Owner',
    reviewer: 'Test Manager',
    auditAt: new Date().toISOString(),
    windowStartedAt,
    windowEndedAt,
    testers: Array.from({ length: 80 }, (_, index) => ({
      testerCode: `T-${String(index + 1).padStart(3, '0')}`,
      assignedVariant: index < 40 ? 'control' : 'candidate',
      observedVariants: [index < 40 ? 'control' : 'candidate'],
      executedCaseIds: cases.map((item) => item.id),
      countedStartedFlows: 3,
    })),
  });
  return root;
}

function manifest(variant) {
  return {
    experimentId: 'ai-rec-quality-v2-20260612',
    experimentBuildId: 'build-1',
    variant,
    recommendationContract: variant === 'candidate' ? 'semantic-v2' : 'legacy-v1',
    sourceCommit: 'abc123',
    sourceTreeFingerprint: 'sha256:source',
    catalogFingerprint: 'sha256:catalog',
    telemetryMode: 'off',
    dirty: false,
  };
}

function trace(variant) {
  return {
    traceSource: 'wechat-platform',
    experimentId: 'ai-rec-quality-v2-20260612',
    experimentBuildId: 'build-1',
    sourceTreeFingerprint: 'sha256:source',
    catalogFingerprint: 'sha256:catalog',
    variant,
    recommendationContract: variant === 'candidate' ? 'semantic-v2' : 'legacy-v1',
    capturedAt: new Date().toISOString(),
    cases: cases.map((fixture) => {
      const assistant = { turnId: `${fixture.id}-A1`, role: 'assistant', content: '已处理测试请求。' };
      return {
        caseId: fixture.id,
        testerCode: variant === 'control' ? 'T-001' : 'T-041',
        turns: [
          { turnId: `${fixture.id}-U1`, role: 'user', content: fixture.prompt },
          assistant,
        ],
        assistantOutputs: [{ turnId: assistant.turnId, content: assistant.content }],
        apiCalls: fixture.expectedByVariant[variant].api === 'knowledge'
          ? []
          : [{ name: fixture.expectedByVariant[variant].api }],
        cardActions: [],
        started: true,
        shown: true,
        completed: false,
      };
    }),
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
