import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

import { getStyleDetail, searchStyles } from '../miniprogram/utils/beer-model.js';

const require = createRequire(import.meta.url);
const root = process.cwd();
const artifactSkillRoot = path.join(
  root,
  'artifacts',
  'ai-mode-project',
  'miniprogram',
  'skills',
  'craft-beer-guide',
);

test('AI catalog search preserves representative source-model results', () => {
  const { runtime, catalog } = buildAndLoadCatalog();

  const bjcpResult = runtime.searchBeerStyles(catalog, '21A')[0];
  const extensionResult = runtime.searchBeerStyles(catalog, 'West Coast IPA')[0];
  const sourceBjcpResult = searchStyles('21A')[0];

  assert.equal(bjcpResult.styleRef.kind, 'bjcp');
  assert.equal(bjcpResult.styleRef.id, sourceBjcpResult.id);
  assert.equal(extensionResult.styleRef.kind, 'extension');
  assert.equal(extensionResult.styleRef.id, 'ext-west-coast-ipa');
  assert.ok(runtime.searchBeerStyles(catalog, '西海岸 IPA').some((item) =>
    item.styleRef.id === 'ext-west-coast-ipa',
  ));
});

test('AI catalog returns details and deterministic taste recommendations', () => {
  const { runtime, catalog } = buildAndLoadCatalog();
  const detail = runtime.getBeerStyleDetail(catalog, { kind: 'bjcp', id: '1B' });
  const sourceDetail = getStyleDetail('1B');
  const recommendations = runtime.recommendBeerStyles(catalog, {
    sweetness: -1,
    sourness: -1,
    bitterness: 1,
    body: -1,
    strength: 0,
  }, 6);

  assert.equal(detail.style.code, sourceDetail.style.code);
  assert.equal(detail.style.displayName, sourceDetail.style.displayName);
  assert.ok(detail.sections.some((section) => section.key === 'overall_impression'));
  assert.equal(recommendations.length, 6);
  assert.ok(recommendations.every((item) => item.styleRef && item.matchScore));
  assert.ok(recommendations[0].matchScore >= recommendations.at(-1).matchScore);
});

test('AI catalog resolves extension details and academy articles', () => {
  const { runtime, catalog } = buildAndLoadCatalog();
  const extensionDetail = runtime.getBeerStyleDetail(catalog, {
    kind: 'extension',
    id: 'ext-west-coast-ipa',
  });
  const articles = runtime.findAcademyArticles(catalog, 'IPA', 10);

  assert.equal(extensionDetail.style.kind, 'extension');
  assert.match(extensionDetail.sourceLabel, /BA|WBC|GABF/);
  assert.ok(extensionDetail.bjcpRefs.some((item) => item.styleRef.id === '21A'));
  assert.ok(articles.some((article) => article.slug === 'cold-ipa'));
  assert.ok(articles.every((article) => article.route.startsWith('/subpages/academy-article/index?slug=')));
});

test('generated AI catalog stays within a single-file package limit', () => {
  buildAiMode();

  const catalogPath = path.join(artifactSkillRoot, 'data', 'catalog.js');
  const runtimePath = path.join(artifactSkillRoot, 'utils', 'catalog-runtime.js');

  assert.equal(fs.existsSync(catalogPath), true);
  assert.equal(fs.existsSync(runtimePath), true);
  assert.ok(fs.statSync(catalogPath).size < 2 * 1024 * 1024);
  assert.ok(fs.statSync(runtimePath).size < 100 * 1024);
});

function buildAndLoadCatalog() {
  buildAiMode();
  delete require.cache[require.resolve(path.join(artifactSkillRoot, 'data', 'catalog.js'))];
  delete require.cache[require.resolve(path.join(artifactSkillRoot, 'utils', 'catalog-runtime.js'))];

  return {
    catalog: require(path.join(artifactSkillRoot, 'data', 'catalog.js')),
    runtime: require(path.join(artifactSkillRoot, 'utils', 'catalog-runtime.js')),
  };
}

function buildAiMode() {
  execFileSync(process.execPath, ['scripts/build_ai_mode_project.cjs'], {
    cwd: root,
    stdio: 'pipe',
  });
}
