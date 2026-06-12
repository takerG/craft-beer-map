import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function gitTrackedFiles() {
  return execFileSync('git', ['ls-files'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .map((filePath) => filePath.replace(/\\/g, '/'));
}

test('repository excludes local agent state and generated process artifacts', () => {
  const trackedFiles = gitTrackedFiles();
  const forbiddenPatterns = [
    /^\.claude\/settings\.local\.json$/,
    /^\.superpowers\//,
    /^artifacts\//,
    /^vendor\//,
    /(^|\/)__pycache__\//,
    /\.(?:log|err\.log)$/,
  ];

  const forbiddenFiles = trackedFiles.filter((filePath) =>
    forbiddenPatterns.some((pattern) => pattern.test(filePath)),
  );

  assert.deepEqual(forbiddenFiles, []);
});

test('root ignore rules cover generated and local-only development artifacts', () => {
  const gitignore = readFile('.gitignore');
  [
    'node_modules/',
    'artifacts/',
    'vendor/',
    '.superpowers/',
    '.claude/settings.local.json',
    '__pycache__/',
    '*.log',
  ].forEach((pattern) => {
    assert.equal(gitignore.includes(pattern), true, `.gitignore should include ${pattern}`);
  });
});

test('generated mini program data has an explicit drift check command', () => {
  const packageJson = JSON.parse(readFile('package.json'));

  assert.equal(packageJson.scripts['check:generated'], 'node scripts/check_generated_data.cjs');
  assert.equal(fs.existsSync(path.join(root, 'scripts', 'check_generated_data.cjs')), true);
});

test('generated data drift check is stable across working-tree line endings', () => {
  assert.doesNotThrow(() => {
    execFileSync(process.execPath, ['scripts/check_generated_data.cjs'], {
      cwd: root,
      encoding: 'utf8',
      stdio: 'pipe',
    });
  });
});

test('choose taste dimensions are declared in one shared schema module', async () => {
  const schema = await import('../utils/taste-schema.js');

  assert.deepEqual(schema.TASTE_PROFILE_DIMENSIONS, [
    'sweetness',
    'sourness',
    'bitterness',
    'body',
    'roast',
    'fruitiness',
    'hopAroma',
    'fermentation',
    'strength',
  ]);
  assert.deepEqual(schema.ACTIVE_TASTE_FILTER_IDS, [
    'sweetness',
    'sourness',
    'bitterness',
    'body',
    'strength',
  ]);
  assert.deepEqual(
    schema.getActiveTasteFilters().map((filter) => filter.id),
    schema.ACTIVE_TASTE_FILTER_IDS,
  );
});

test('academy tab model stays independent from article detail style resolution', () => {
  const academyPage = readFile('pages/academy/index.js');
  const feedModel = readFile('utils/academy-feed-model.js');

  assert.match(academyPage, /utils\/academy-feed-model\.js/);
  assert.doesNotMatch(academyPage, /utils\/academy-model\.js/);
  assert.doesNotMatch(feedModel, /beer-model\.js/);
});

test('academy article detail model stays inside the content subpackage', () => {
  const articlePage = readFile('subpages/academy-article/index.js');

  assert.equal(fs.existsSync(path.join(root, 'utils/academy-model.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'subpages/utils/academy-model.js')), true);
  assert.match(articlePage, /from '\.\.\/utils\/academy-model\.js'/);
  assert.doesNotMatch(articlePage, /\.\.\/\.\.\/utils\/academy-model\.js/);
});
