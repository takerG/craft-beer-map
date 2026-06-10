import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const artifactMiniProgramRoot = path.join(root, 'artifacts', 'ai-mode-project', 'miniprogram');
const overlayTargets = [
  'pages/explore/index.wxml',
  'pages/choose/index.wxml',
  'pages/academy/index.wxml',
  'pages/favorites/index.wxml',
  'pages/search/index.wxml',
  'subpages/style/index.wxml',
  'subpages/extension-style/index.wxml',
  'subpages/academy-article/index.wxml',
];

test.before(() => {
  execFileSync(process.execPath, ['scripts/build_ai_mode_project.cjs', '--if-current'], {
    cwd: root,
    stdio: 'pipe',
  });
});

test('generated app registers the AI entry and independent detail package', () => {
  const app = readJson(path.join(artifactMiniProgramRoot, 'app.json'));
  const detailPackage = app.subpackages.find((item) => item.root === 'aiDetail');

  assert.equal(app.usingComponents['ai-entry'], '/components/ai-entry/index');
  assert.deepEqual(detailPackage, {
    root: 'aiDetail',
    name: 'ai-detail',
    pages: [
      'pages/style-results/index',
      'pages/taste-refine/index',
    ],
    independent: true,
    componentFramework: 'glass-easel',
    renderer: 'skyline',
  });
});

test('AI entry checks support, opens Agent, and supplies capsule-open context', () => {
  const source = fs.readFileSync(
    path.join(artifactMiniProgramRoot, 'components', 'ai-entry', 'index.js'),
    'utf8',
  );

  assert.match(source, /wx\.checkIsSupportAgent/);
  assert.match(source, /wx\.openAgent/);
  assert.match(source, /wx\.onAgentOpen/);
  assert.match(source, /wx\.offAgentOpen/);
  assert.match(source, /followUpMessage/);
  assert.match(source, /context/);
});

test('entry overlays exist only in generated target pages', () => {
  overlayTargets.forEach((relativePath) => {
    const generated = fs.readFileSync(path.join(artifactMiniProgramRoot, relativePath), 'utf8');
    const production = fs.readFileSync(path.join(root, 'miniprogram', relativePath), 'utf8');

    assert.match(generated, /<ai-entry\b/, `${relativePath} generated entry`);
    assert.doesNotMatch(production, /<ai-entry\b/, `${relativePath} production boundary`);
  });
});

test('half-screen pages return follow-up messages without normal route APIs', () => {
  [
    'aiDetail/pages/style-results/index.js',
    'aiDetail/pages/taste-refine/index.js',
  ].forEach((relativePath) => {
    const source = fs.readFileSync(path.join(artifactMiniProgramRoot, relativePath), 'utf8');

    assert.match(source, /wx\.navigateBackAgent/);
    assert.doesNotMatch(
      source,
      /wx\.(?:navigateTo|redirectTo|switchTab|reLaunch|navigateBack)\b/,
      relativePath,
    );
  });
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
