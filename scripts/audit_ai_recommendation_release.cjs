const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { scorePair } = require('./score_ai_recommendation_traces.cjs');

const repoRoot = path.resolve(__dirname, '..');

function auditRelease({
  root = repoRoot,
  clean = null,
  now = Date.now(),
} = {}) {
  if (!(clean === null ? isClean(root) : clean)) throw new Error('dirty-worktree');

  const probeRoot = path.join(root, 'artifacts', 'ai-mode-platform-probe');
  const traceRoot = path.join(root, 'artifacts', 'ai-evaluation-traces');
  const experimentRoot = path.join(root, 'artifacts', 'ai-mode-experiment');
  const control = readJson(path.join(traceRoot, 'control.json'));
  const candidate = readJson(path.join(traceRoot, 'candidate.json'));
  const controlManifest = readJson(path.join(experimentRoot, 'control', 'build-manifest.json'));
  const candidateManifest = readJson(path.join(experimentRoot, 'candidate', 'build-manifest.json'));
  const probe = readJson(path.join(probeRoot, 'probe-record.json'));
  const validatorControl = readJson(path.join(probeRoot, 'validator-control.json'));
  const validatorCandidate = readJson(path.join(probeRoot, 'validator-candidate.json'));
  const operations = readJson(path.join(traceRoot, 'operations-audit.json'));

  bindManifest(control, controlManifest, 'control');
  bindManifest(candidate, candidateManifest, 'candidate');
  requirePassedEvidence(probe, 'devtools-probe', controlManifest, probeRoot, now);
  requirePassedEvidence(
    validatorControl, 'validator-control', controlManifest, probeRoot, now, 'control',
  );
  requirePassedEvidence(
    validatorCandidate, 'validator-candidate', candidateManifest, probeRoot, now, 'candidate',
  );
  const score = scorePair(control, candidate, { requirePlatform: true, now });
  const operationsResult = validateOperationsAudit(operations, control, candidate);

  return {
    status: 'passed',
    experimentId: control.experimentId,
    experimentBuildId: control.experimentBuildId,
    contaminationRate: operationsResult.contaminationRate,
    score,
  };
}

function validateOperationsAudit(audit, control, candidate) {
  const required = [
    'experimentId', 'experimentBuildId', 'rosterOwner', 'reviewer', 'auditAt',
    'windowStartedAt', 'windowEndedAt', 'testers',
  ];
  rejectExtraKeys(audit, required);
  required.forEach((key) => {
    if (!Object.hasOwn(audit, key)) throw new Error(`operations-audit-missing:${key}`);
  });
  if (audit.experimentId !== control.experimentId || audit.experimentId !== candidate.experimentId) {
    throw new Error('operations-audit-experiment-mismatch');
  }
  if (
    audit.experimentBuildId !== control.experimentBuildId ||
    audit.experimentBuildId !== candidate.experimentBuildId
  ) {
    throw new Error('operations-audit-build-mismatch');
  }
  if (!Array.isArray(audit.testers) || !audit.testers.length) throw new Error('operations-audit-empty');
  const allowedTesterKeys = [
    'testerCode', 'assignedVariant', 'observedVariants', 'executedCaseIds',
    'countedStartedFlows',
  ];
  for (const tester of audit.testers) {
    rejectExtraKeys(tester, allowedTesterKeys);
    allowedTesterKeys.forEach((key) => {
      if (!Object.hasOwn(tester, key)) throw new Error(`operations-tester-missing:${key}`);
    });
    if (!['control', 'candidate'].includes(tester.assignedVariant)) throw new Error('invalid-assignment');
    if (
      !String(tester.testerCode || '').trim() ||
      !Array.isArray(tester.observedVariants) ||
      !tester.observedVariants.includes(tester.assignedVariant) ||
      tester.observedVariants.some((variant) => !['control', 'candidate'].includes(variant))
    ) {
      throw new Error('invalid-observed-variants');
    }
    if (
      !Array.isArray(tester.executedCaseIds) ||
      !tester.executedCaseIds.length ||
      tester.executedCaseIds.some((caseId) =>
        !control.cases.some((item) => item.caseId === caseId) &&
        !candidate.cases.some((item) => item.caseId === caseId))
    ) {
      throw new Error('invalid-executed-cases');
    }
    if (
      !Number.isInteger(tester.countedStartedFlows) ||
      tester.countedStartedFlows < 0 ||
      tester.countedStartedFlows > 5
    ) {
      throw new Error('invalid-counted-flows');
    }
  }
  const unique = new Map(audit.testers.map((tester) => [tester.testerCode, tester]));
  if (unique.size !== audit.testers.length) throw new Error('duplicate-tester-code');
  const nAll = unique.size;
  if (!nAll) throw new Error('operations-audit-empty');
  const nCross = [...unique.values()].filter((tester) =>
    new Set(tester.observedVariants).has('control') &&
    new Set(tester.observedVariants).has('candidate')).length;
  const contaminationRate = nCross / nAll;
  if (contaminationRate > 0.05) throw new Error('contamination-rate-exceeded');
  for (const variant of ['control', 'candidate']) {
    const assigned = [...unique.values()].filter((tester) => tester.assignedVariant === variant);
    if (assigned.length < 40) throw new Error(`insufficient-testers:${variant}`);
  }
  for (const trace of [control, candidate]) {
    for (const item of trace.cases) {
      const tester = unique.get(item.testerCode);
      if (
        !tester ||
        tester.assignedVariant !== trace.variant ||
        !tester.executedCaseIds.includes(item.caseId)
      ) {
        throw new Error(`trace-roster-mismatch:${trace.variant}:${item.caseId}`);
      }
    }
  }
  const startedAt = Date.parse(audit.windowStartedAt);
  const endedAt = Date.parse(audit.windowEndedAt);
  const auditAt = Date.parse(audit.auditAt);
  if (
    !Number.isFinite(startedAt) ||
    !Number.isFinite(endedAt) ||
    !Number.isFinite(auditAt) ||
    startedAt > endedAt ||
    auditAt < endedAt
  ) {
    throw new Error('invalid-audit-window');
  }
  return { nAll, nCross, contaminationRate };
}

function bindManifest(trace, manifest, variant) {
  if (manifest.dirty) throw new Error(`dirty-manifest:${variant}`);
  const expected = {
    experimentId: manifest.experimentId,
    experimentBuildId: manifest.experimentBuildId,
    sourceTreeFingerprint: manifest.sourceTreeFingerprint,
    catalogFingerprint: manifest.catalogFingerprint,
    variant: manifest.variant,
    recommendationContract: manifest.recommendationContract,
  };
  Object.entries(expected).forEach(([key, value]) => {
    if (trace[key] !== value) throw new Error(`manifest-trace-mismatch:${variant}:${key}`);
  });
}

function requirePassedEvidence(
  value,
  label,
  manifest,
  probeRoot,
  now,
  expectedVariant = null,
) {
  if (!value || value.status !== 'passed' || !value.evidence) throw new Error(`missing-${label}`);
  for (const key of [
    'experimentId', 'experimentBuildId', 'sourceTreeFingerprint',
    'catalogFingerprint', 'capturedAt',
  ]) {
    if (value[key] === undefined) throw new Error(`missing-${label}:${key}`);
  }
  for (const key of [
    'experimentId', 'experimentBuildId', 'sourceTreeFingerprint', 'catalogFingerprint',
  ]) {
    if (value[key] !== manifest[key]) throw new Error(`evidence-build-mismatch:${label}:${key}`);
  }
  if (expectedVariant && value.variant !== expectedVariant) {
    throw new Error(`evidence-variant-mismatch:${label}`);
  }
  const capturedAt = Date.parse(value.capturedAt);
  if (!Number.isFinite(capturedAt) || now - capturedAt > 30 * 24 * 60 * 60 * 1000) {
    throw new Error(`expired-${label}`);
  }
  const evidencePath = path.resolve(probeRoot, value.evidence);
  if (
    !evidencePath.startsWith(`${path.resolve(probeRoot)}${path.sep}`) ||
    !fs.statSync(evidencePath, { throwIfNoEntry: false })?.isFile()
  ) {
    throw new Error(`missing-${label}-file`);
  }
}

function isClean(root) {
  return !execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
}

function rejectExtraKeys(value, allowed) {
  for (const key of Object.keys(value || {})) {
    if (!allowed.includes(key)) throw new Error(`additional-property:${key}`);
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`missing-or-invalid:${path.basename(filePath)}`);
  }
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(auditRelease(), null, 2));
  } catch (error) {
    console.error(JSON.stringify({ status: 'blocked', reason: error.message }));
    process.exitCode = 1;
  }
}

module.exports = { auditRelease, validateOperationsAudit };
