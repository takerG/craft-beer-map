import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const productionRoot = path.join(root, 'artifacts', 'production');
const aiBetaRoot = path.join(root, 'artifacts', 'ai-beta');

test.before(() => {
  buildProfiles();
});

test('release profiles create separate production and AI beta projects', () => {
  assert.equal(fs.existsSync(path.join(productionRoot, 'app.json')), true);
  assert.equal(fs.existsSync(path.join(productionRoot, 'project.config.json')), true);
  assert.equal(fs.existsSync(path.join(aiBetaRoot, 'app.json')), true);
  assert.equal(fs.existsSync(path.join(aiBetaRoot, 'build-manifest.json')), true);
});

test('production profile physically excludes every AI beta runtime surface', () => {
  const app = readJson(path.join(productionRoot, 'app.json'));
  const project = readJson(path.join(productionRoot, 'project.config.json'));
  const packages = app.subPackages || app.subpackages || [];

  assert.equal(Object.hasOwn(app, 'agent'), false);
  assert.equal(packages.some(({ root: packageRoot }) =>
    ['skills', 'aiDetail'].includes(packageRoot)), false);
  assert.equal(Object.hasOwn(app.usingComponents || {}, 'ai-entry'), false);
  assert.equal(
    (project.packOptions?.include || []).some(({ value }) => value === 'skills'),
    false,
  );
  [
    'AGENTS.md',
    'page-meta.json',
    'skills',
    'aiDetail',
    'components/ai-entry',
  ].forEach((relativePath) => {
    assert.equal(fs.existsSync(path.join(productionRoot, relativePath)), false, relativePath);
  });
});

test('production text files contain no AI runtime references', () => {
  const forbidden = [
    /<ai-entry\b/,
    /wx\.openAgent/,
    /wx\.onAgentOpen/,
    /craft-beer-guide/,
    /(?:^|["'])\/?aiDetail\//,
  ];

  listFiles(productionRoot)
    .filter((filePath) => /\.(?:js|json|wxml|wxss|md|txt)$/i.test(filePath))
    .forEach((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8');
      forbidden.forEach((pattern) => {
        assert.doesNotMatch(source, pattern, path.relative(productionRoot, filePath));
      });
    });
});

test('release profile manifests are deterministic across consecutive builds', () => {
  const firstProduction = readJson(
    path.join(productionRoot, 'release-profile-manifest.json'),
  ).contentFingerprint;
  const firstAiBeta = readJson(
    path.join(aiBetaRoot, 'release-profile-manifest.json'),
  ).contentFingerprint;

  buildProfiles();

  assert.equal(
    readJson(path.join(productionRoot, 'release-profile-manifest.json')).contentFingerprint,
    firstProduction,
  );
  assert.equal(
    readJson(path.join(aiBetaRoot, 'release-profile-manifest.json')).contentFingerprint,
    firstAiBeta,
  );
});

function buildProfiles() {
  execFileSync(process.execPath, ['scripts/build_release_profiles.cjs'], {
    cwd: root,
    stdio: 'pipe',
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(entryPath);
    return entry.isFile() ? [entryPath] : [];
  });
}
