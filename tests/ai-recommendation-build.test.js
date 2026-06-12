import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const experimentRoot = path.join(root, 'artifacts', 'ai-mode-experiment');

test.before(() => {
  execFileSync(process.execPath, ['scripts/build_ai_mode_experiment.cjs', '--allow-dirty'], {
    cwd: root,
    stdio: 'pipe',
  });
});

test('dual builds share source and catalog fingerprints but not contracts', () => {
  const control = readJson(path.join(experimentRoot, 'control', 'build-manifest.json'));
  const candidate = readJson(path.join(experimentRoot, 'candidate', 'build-manifest.json'));
  assert.equal(control.sourceTreeFingerprint, candidate.sourceTreeFingerprint);
  assert.equal(control.catalogFingerprint, candidate.catalogFingerprint);
  assert.equal(control.experimentBuildId, candidate.experimentBuildId);
  assert.equal(control.recommendationContract, 'legacy-v1');
  assert.equal(candidate.recommendationContract, 'semantic-v2');
  for (const variant of ['control', 'candidate']) {
    const variantRoot = path.join(experimentRoot, variant);
    assert.equal(fs.existsSync(path.join(variantRoot, 'app.json')), true);
    assert.equal(fs.existsSync(path.join(variantRoot, 'project.config.json')), true);
    assert.equal(fs.existsSync(path.join(variantRoot, 'miniprogram')), false);
  }
});

test('candidate generated manifest keeps expirable recommendation card', () => {
  const mcp = readJson(path.join(
    experimentRoot, 'candidate', 'skills', 'craft-beer-guide', 'mcp.json',
  ));
  const component = mcp.components.find((item) =>
    item.path === 'components/recommendation-v2-card/index');
  assert.equal(component.expirable, true);
  assert.equal(component.expiredText, '推荐条件已更新，请使用最新结果');
});

test('control build excludes candidate-only runtime and card files', () => {
  const skillRoot = path.join(
    experimentRoot, 'control', 'skills', 'craft-beer-guide',
  );
  [
    'apis/recommendBeerStylesCandidate.js',
    'components/recommendation-v2-card',
    'utils/flow-store.js',
    'utils/recommendation-v2.js',
  ].forEach((relativePath) => {
    assert.equal(fs.existsSync(path.join(skillRoot, relativePath)), false, relativePath);
  });
  const detail = fs.readFileSync(
    path.join(skillRoot, 'apis', 'getBeerStyleDetail.js'),
    'utf8',
  );
  assert.match(detail, /请展示详情卡片/);
  assert.doesNotMatch(detail, /recommendationContext|flow-store/);
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
