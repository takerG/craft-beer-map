import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();
const skillRoot = path.join(
  root, 'artifacts', 'ai-mode-experiment', 'candidate',
  'skills', 'craft-beer-guide',
);
const memory = new Map();

test.before(() => {
  execFileSync(process.execPath, ['scripts/build_ai_mode_experiment.cjs', '--allow-dirty'], {
    cwd: root,
    stdio: 'pipe',
  });
  global.wx = {
    getStorageSync(key) {
      return memory.get(key);
    },
    setStorageSync(key, value) {
      memory.set(key, value);
    },
  };
});

test.after(() => {
  delete global.wx;
});

test('candidate schema requires complete semantic preferences and strict flow branches', () => {
  const mcp = readJson(path.join(skillRoot, 'mcp.json'));
  mcp.apis.forEach((api) => {
    assertStrictObjects(api.inputSchema, `${api.name}.inputSchema`);
    assertStrictObjects(api.outputSchema, `${api.name}.outputSchema`);
  });
  const api = mcp.apis.find((item) => item.name === 'recommendBeerStyles');
  const input = api.inputSchema;
  assert.equal(input.additionalProperties, false);
  assert.deepEqual(input.required, ['scenario', 'preferences', 'flow']);
  assert.deepEqual(input.properties.preferences.required, [
    'sweetness', 'sourness', 'bitterness', 'body', 'strength',
  ]);
  assert.equal(input.properties.limit.type, 'integer');
  assert.equal(input.properties.limit.minimum, 1);
  assert.equal(input.properties.limit.maximum, 12);
  assert.equal(input.properties.flow.oneOf.length, 2);
  assert.equal(input.properties.flow.oneOf[1].properties.expectedRevision.minimum, 0);
});

test('candidate creates and refines a semantic flow', async () => {
  memory.clear();
  const recommend = loadApi('recommendBeerStyles');
  const initial = await recommend(candidateArgs({
    mode: 'start',
    requestId: 'req_1111111111',
  }));
  assert.equal(initial.isError, false);
  assert.equal(initial.structuredContent.contract, 'semantic-v2');
  assert.equal(initial.structuredContent.flow.revision, 0);

  const refined = await recommend(candidateArgs({
    mode: 'continue',
    flowId: initial.structuredContent.flow.flowId,
    expectedRevision: 0,
    requestId: 'req_2222222222',
  }));
  assert.equal(refined.isError, false);
  assert.equal(refined.structuredContent.flow.revision, 1);
});

test('SIDE-01 stale favorite performs zero favorite writes', async () => {
  memory.clear();
  const recommend = loadApi('recommendBeerStyles');
  const favorite = loadApi('addFavoriteBeerStyle');
  const initial = await recommend(candidateArgs({
    mode: 'start',
    requestId: 'req_3333333333',
  }));
  const item = initial.structuredContent.items[0];
  await recommend(candidateArgs({
    mode: 'continue',
    flowId: initial.structuredContent.flow.flowId,
    expectedRevision: 0,
    requestId: 'req_4444444444',
  }));

  const result = await favorite({
    styleRef: item.styleRef,
    recommendationContext: {
      flowId: initial.structuredContent.flow.flowId,
      expectedRevision: 0,
      requestId: 'req_5555555555',
    },
  });
  assert.equal(result.isError, true);
  assert.equal(memory.has('craftBeerFavoriteStyleIds.v1'), false);
});

test('successful favorite records a redacted first completion', async () => {
  memory.clear();
  const recommend = loadApi('recommendBeerStyles');
  const favorite = loadApi('addFavoriteBeerStyle');
  const initial = await recommend(candidateArgs({
    mode: 'start',
    requestId: 'req_6666666666',
  }));
  const result = await favorite({
    styleRef: initial.structuredContent.items[0].styleRef,
    recommendationContext: {
      flowId: initial.structuredContent.flow.flowId,
      expectedRevision: 0,
      requestId: 'req_7777777777',
    },
  });

  assert.equal(result.isError, false);
  assert.deepEqual(result._meta.completion, {
    firstCompletion: true,
    revision: 0,
  });
  assert.equal('state' in result._meta.completion, false);
});

test('start requestId is idempotent and failed refinement does not advance', async () => {
  memory.clear();
  const recommend = loadApi('recommendBeerStyles');
  const initial = await recommend(candidateArgs({
    mode: 'start',
    requestId: 'req_8888888888',
  }));
  const duplicate = await recommend(candidateArgs({
    mode: 'start',
    requestId: 'req_8888888888',
  }));
  assert.equal(duplicate.isError, true);

  const invalid = await recommend({
    ...candidateArgs({
      mode: 'continue',
      flowId: initial.structuredContent.flow.flowId,
      expectedRevision: 0,
      requestId: 'req_9999999999',
    }),
    preferences: { bitterness: 'low' },
  });
  assert.equal(invalid.isError, true);

  const retry = await recommend(candidateArgs({
    mode: 'continue',
    flowId: initial.structuredContent.flow.flowId,
    expectedRevision: 0,
    requestId: 'req_9999999999',
  }));
  assert.equal(retry.isError, false);
  assert.equal(retry.structuredContent.flow.revision, 1);
});

test('favorite storage failure neither reports success nor consumes completion request', async () => {
  memory.clear();
  const recommend = loadApi('recommendBeerStyles');
  const favorite = loadApi('addFavoriteBeerStyle');
  const initial = await recommend(candidateArgs({
    mode: 'start',
    requestId: 'req_aaaaaaaa01',
  }));
  const item = initial.structuredContent.items[0];
  const originalSet = global.wx.setStorageSync;
  global.wx.setStorageSync = (key, value) => {
    if (key === 'craftBeerFavoriteStyleIds.v1') throw new Error('storage-failed');
    memory.set(key, value);
  };
  const context = {
    flowId: initial.structuredContent.flow.flowId,
    expectedRevision: 0,
    requestId: 'req_aaaaaaaa02',
  };
  const failed = await favorite({ styleRef: item.styleRef, recommendationContext: context });
  assert.equal(failed.isError, true);
  assert.equal(failed._meta?.failureCode, 'storage-failed');

  global.wx.setStorageSync = originalSet;
  const retry = await favorite({ styleRef: item.styleRef, recommendationContext: context });
  assert.equal(retry.isError, false);
  assert.equal(retry._meta.completion.firstCompletion, true);
});

test('favorite removal storage failure keeps the favorite and returns failure', async () => {
  memory.clear();
  const remove = loadApi('removeFavoriteBeerStyle');
  const styleRef = { kind: 'bjcp', id: '21A' };
  memory.set('craftBeerFavoriteStyleIds.v1', ['21A']);
  const originalSet = global.wx.setStorageSync;
  global.wx.setStorageSync = () => {
    throw new Error('storage-failed');
  };

  try {
    const result = await remove({ styleRef });

    assert.equal(result.isError, true);
    assert.equal(result._meta?.failureCode, 'storage-failed');
    assert.deepEqual(memory.get('craftBeerFavoriteStyleIds.v1'), ['21A']);
  } finally {
    global.wx.setStorageSync = originalSet;
  }
});

test('candidate favorite APIs fail when favorite storage cannot be read', async () => {
  memory.clear();
  const add = loadApi('addFavoriteBeerStyle');
  const remove = loadApi('removeFavoriteBeerStyle');
  const styleRef = { kind: 'bjcp', id: '21A' };
  const originalGet = global.wx.getStorageSync;
  global.wx.getStorageSync = () => {
    throw new Error('storage-failed');
  };

  try {
    const addResult = await add({ styleRef });
    const removeResult = await remove({ styleRef });

    assert.equal(addResult.isError, true);
    assert.equal(addResult._meta?.failureCode, 'storage-failed');
    assert.equal(removeResult.isError, true);
    assert.equal(removeResult._meta?.failureCode, 'storage-failed');
  } finally {
    global.wx.getStorageSync = originalGet;
  }
});

function candidateArgs(flow) {
  return {
    scenario: 'easy',
    preferences: {
      sweetness: 'unspecified',
      sourness: 'unspecified',
      bitterness: 'low',
      body: 'unspecified',
      strength: 'neutral',
    },
    flow,
    limit: 3,
  };
}

function loadApi(name) {
  const filePath = path.join(skillRoot, 'apis', `${name}.js`);
  delete require.cache[require.resolve(filePath)];
  return require(filePath);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertStrictObjects(value, location) {
  if (!value || typeof value !== 'object') return;
  if (value.type === 'object') {
    assert.equal(
      value.additionalProperties,
      false,
      `${location} must reject undeclared properties`,
    );
  }
  Object.entries(value).forEach(([key, child]) => {
    if (Array.isArray(child)) {
      child.forEach((item, index) => assertStrictObjects(item, `${location}.${key}[${index}]`));
    } else {
      assertStrictObjects(child, `${location}.${key}`);
    }
  });
}
