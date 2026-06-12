import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const miniProgramRoot = root;
const knowledgeRoot = path.join(root, 'artifacts', 'ai-knowledge-base');
const expectedPagePaths = [
  'pages/explore/index',
  'pages/choose/index',
  'pages/academy/index',
  'pages/favorites/index',
  'pages/search/index',
  'subpages/style/index',
  'subpages/extension-style/index',
  'subpages/academy-article/index',
];

test.before(() => {
  execFileSync(process.execPath, ['scripts/build_ai_mode_project.cjs', '--if-current'], {
    cwd: root,
    stdio: 'pipe',
  });
});

test('generated page metadata covers the AI-visible mini program pages', () => {
  const metadataPath = path.join(miniProgramRoot, 'page-meta.json');
  const metadata = readJson(metadataPath);

  assert.deepEqual(metadata.pages.map((page) => page.path), expectedPagePaths);
  assert.ok(metadata.pages.every((page) => page.name && page.description));
  assert.ok(metadata.pages.find((page) => page.path === 'subpages/style/index').query.required.includes('styleId'));
  assert.ok(metadata.pages.find((page) => page.path === 'subpages/academy-article/index').query.required.includes('slug'));
  assert.ok(fs.statSync(metadataPath).size < 8000);
});

test('knowledge-base files are generated from current repository content', () => {
  const expectedFiles = [
    'bjcp-style-guide.md',
    'extension-style-guide.md',
    'academy-articles.md',
  ];

  expectedFiles.forEach((fileName) => {
    const filePath = path.join(knowledgeRoot, fileName);
    const source = fs.readFileSync(filePath, 'utf8');
    assert.ok(source.length > 100);
    assert.ok(fs.statSync(filePath).size < 10 * 1024 * 1024);
    assert.equal(source.includes('\uFFFD'), false, `${fileName} should be valid UTF-8`);
  });

  assert.match(fs.readFileSync(path.join(knowledgeRoot, 'bjcp-style-guide.md'), 'utf8'), /21A 美式IPA/);
  assert.match(fs.readFileSync(path.join(knowledgeRoot, 'extension-style-guide.md'), 'utf8'), /西海岸 IPA/);
  assert.match(fs.readFileSync(path.join(knowledgeRoot, 'academy-articles.md'), 'utf8'), /什么是冷 IPA/);
});

test('AI operator instructions prohibit external factual supplementation', () => {
  const instructions = fs.readFileSync(path.join(miniProgramRoot, 'AGENTS.md'), 'utf8');

  [
    '只使用本仓库',
    '禁止外部事实补充',
    '禁止编造',
    '医疗建议',
    '饮酒安全',
  ].forEach((phrase) => assert.equal(instructions.includes(phrase), true, phrase));
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
