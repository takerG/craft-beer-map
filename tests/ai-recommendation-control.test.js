import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();
const controlRoot = path.join(root, 'artifacts', 'ai-mode-experiment', 'control');

test('control build preserves legacy numeric recommendation behavior', async () => {
  const manifest = readJson(path.join(controlRoot, 'build-manifest.json'));
  const mcp = readJson(path.join(
    controlRoot, 'skills', 'craft-beer-guide', 'mcp.json',
  ));
  const recommendation = mcp.apis.find((api) => api.name === 'recommendBeerStyles');
  const handlerPath = path.join(
    controlRoot, 'skills', 'craft-beer-guide',
    'apis', 'recommendBeerStyles.js',
  );
  const memory = new Map();
  global.wx = {
    getStorageSync(key) { return memory.get(key); },
    setStorageSync(key, value) { memory.set(key, value); },
  };
  delete require.cache[require.resolve(handlerPath)];
  const result = await require(handlerPath)({ preferences: { bitterness: 0 }, limit: 3 });
  delete global.wx;

  assert.equal(manifest.recommendationContract, 'legacy-v1');
  assert.deepEqual(recommendation.inputSchema.properties.preferences.properties.bitterness.enum, [-1, 0, 1]);
  assert.equal(result.structuredContent.preferences.bitterness, 0);
  assert.equal(Object.hasOwn(result.structuredContent, 'semanticInterpretation'), false);
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
