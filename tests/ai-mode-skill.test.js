import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();
const skillRoot = path.join(
  root,
  'artifacts',
  'ai-mode-project',
  'miniprogram',
  'skills',
  'craft-beer-guide',
);
const expectedApiNames = [
  'searchBeerStyles',
  'recommendBeerStyles',
  'getBeerStyleDetail',
  'listFavoriteBeerStyles',
  'addFavoriteBeerStyle',
  'removeFavoriteBeerStyle',
  'findAcademyArticles',
];
const memory = new Map();

test.before(() => {
  global.wx = createWxStub();
  buildAiMode();
});

test.after(() => {
  delete global.wx;
});

test('Skill manifest and index register exactly seven declared APIs', () => {
  const mcp = readJson(path.join(skillRoot, 'mcp.json'));
  const registered = [];
  global.wx.modelContext.createSkill = (skillPath) => {
    assert.equal(skillPath, 'skills/craft-beer-guide');
    return {
      registerAPI(name, handler) {
        registered.push({ name, handler });
      },
    };
  };

  clearRequire(path.join(skillRoot, 'index.js'));
  require(path.join(skillRoot, 'index.js'));

  assert.deepEqual(mcp.apis.map((api) => api.name), expectedApiNames);
  assert.deepEqual(registered.map((api) => api.name), expectedApiNames);
  assert.ok(registered.every((api) => typeof api.handler === 'function'));
  assert.equal(Array.isArray(mcp.components), true);
});

test('Skill instructions constrain answers and mutation claims', () => {
  const skillInstructions = fs.readFileSync(path.join(skillRoot, 'SKILL.md'), 'utf8');

  [
    '只使用本 Skill 目录',
    'BJCP',
    '市场扩展风格',
    '信息不足',
    'API 返回成功',
    '禁止编造',
  ].forEach((phrase) => assert.equal(skillInstructions.includes(phrase), true, phrase));
});

test('search, recommendation, detail, and academy APIs return official result envelopes', async () => {
  const search = loadApi('searchBeerStyles');
  const recommend = loadApi('recommendBeerStyles');
  const detail = loadApi('getBeerStyleDetail');
  const academy = loadApi('findAcademyArticles');

  const searchResult = await search({ query: 'West Coast IPA' });
  const recommendationResult = await recommend({
    preferences: { sweetness: -1, sourness: -1, bitterness: 1, body: -1, strength: 0 },
  });
  const detailResult = await detail({ styleRef: { kind: 'bjcp', id: '21A' } });
  const academyResult = await academy({ query: 'IPA' });

  [searchResult, recommendationResult, detailResult, academyResult].forEach(assertSuccessEnvelope);
  assert.equal(searchResult.structuredContent.items[0].styleRef.kind, 'extension');
  assert.ok(recommendationResult.structuredContent.items.length > 0);
  assert.equal(detailResult.structuredContent.style.styleRef.id, '21A');
  assert.ok(academyResult.structuredContent.items.some((item) => item.slug === 'cold-ipa'));
});

test('favorite APIs persist BJCP favorites to the existing storage key', async () => {
  memory.clear();
  const add = loadApi('addFavoriteBeerStyle');
  const list = loadApi('listFavoriteBeerStyles');
  const remove = loadApi('removeFavoriteBeerStyle');
  const styleRef = { kind: 'bjcp', id: '21A' };

  const addResult = await add({ styleRef });
  const listResult = await list();

  assertSuccessEnvelope(addResult);
  assertSuccessEnvelope(listResult);
  assert.equal(addResult.structuredContent.isFavorite, true);
  assert.deepEqual(memory.get('craftBeerFavoriteStyleIds.v1'), ['21A']);
  assert.deepEqual(listResult.structuredContent.items.map((item) => item.styleRef.id), ['21A']);

  const removeResult = await remove({ styleRef });

  assertSuccessEnvelope(removeResult);
  assert.equal(removeResult.structuredContent.isFavorite, false);
  assert.deepEqual(memory.get('craftBeerFavoriteStyleIds.v1'), []);
});

test('favorite store uses local wx storage without network access', () => {
  const source = fs.readFileSync(path.join(skillRoot, 'utils', 'favorite-store.js'), 'utf8');

  assert.match(source, /getStorageSync/);
  assert.match(source, /setStorageSync/);
  assert.doesNotMatch(source, /request|fetch|http/i);
});

function assertSuccessEnvelope(result) {
  assert.equal(result.isError, false);
  assert.ok(Array.isArray(result.content));
  assert.equal(result.content[0].type, 'text');
  assert.equal(typeof result.structuredContent, 'object');
  assert.equal(typeof result._meta, 'object');
}

function loadApi(name) {
  const apiPath = path.join(skillRoot, 'apis', `${name}.js`);
  clearRequire(apiPath);
  return require(apiPath);
}

function clearRequire(filePath) {
  const resolved = require.resolve(filePath);
  delete require.cache[resolved];
}

function createWxStub() {
  return {
    getStorageSync(key) {
      return memory.get(key);
    },
    setStorageSync(key, value) {
      memory.set(key, value);
    },
    modelContext: {
      createSkill() {
        return { registerAPI() {} };
      },
    },
  };
}

function buildAiMode() {
  execFileSync(process.execPath, ['scripts/build_ai_mode_project.cjs', '--if-current'], {
    cwd: root,
    stdio: 'pipe',
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
