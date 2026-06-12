import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../ai-mode/shared/recommendation-v2.cjs');
const runtime = require('../ai-mode/shared/catalog-runtime.cjs');

const styles = [
  style('light-low', { sweetness: 0, sourness: -1, bitterness: -1, body: -1, strength: 0 }),
  style('bold-high', { sweetness: 1, sourness: 0, bitterness: 1, body: 1, strength: 1 }),
];
const catalog = { bjcpStyles: styles, extensionStyles: [], categories: [] };
const snapshot = {
  scenario: 'easy',
  preferences: {
    sweetness: 'unspecified',
    sourness: 'low',
    bitterness: 'low',
    body: 'low',
    strength: 'neutral',
  },
};

test('CORE-02 neutral is explicit and unspecified is inactive', () => {
  const value = core.normalizeSnapshot(snapshot);
  assert.deepEqual(value.activeDimensions, ['sourness', 'bitterness', 'body', 'strength']);
  assert.equal(value.numericPreferences.strength, 0);
});

test('CORE-01 all unspecified requests clarification as a product state', () => {
  const result = core.recommend({
    scenario: 'unspecified',
    preferences: Object.fromEntries(core.DIMENSIONS.map((id) => [id, 'unspecified'])),
  }, catalog);
  assert.equal(result.ok, true);
  assert.equal(result.state, 'needs-clarification');
});

test('CORE-03 one deterministic relaxation is returned', () => {
  const conflictCatalog = {
    bjcpStyles: [style('only-low', {
      sweetness: -1, sourness: -1, bitterness: -1, body: -1, strength: -1,
    })],
    extensionStyles: [],
  };
  const result = core.recommend({
    scenario: 'unspecified',
    preferences: {
      sweetness: 'high',
      sourness: 'high',
      bitterness: 'high',
      body: 'high',
      strength: 'high',
    },
  }, conflictCatalog);
  assert.equal(result.state, 'conflict');
  assert.equal(result.relaxation.dimensions.length, 1);
});

test('explanations are generated from known catalog templates', () => {
  const result = core.recommend(snapshot, catalog);
  assert.equal(result.state, 'recommended');
  assert.equal(core.verifyExplanations(result, catalog).valid, true);
});

test('CORE-05 empty catalog and input boundaries are explicit', () => {
  assert.deepEqual(core.recommend(snapshot, { bjcpStyles: [], extensionStyles: [] }), {
    ok: false,
    failureCode: 'empty-catalog',
  });
  for (const limit of [0, 13, 1.5]) {
    assert.equal(core.validateInput({ ...snapshot, limit }).valid, false);
  }
  for (const limit of [1, 12]) {
    assert.equal(core.validateInput({ ...snapshot, limit }).valid, true);
  }
});

test('legacy recommendation ranking stays available', () => {
  const result = runtime.recommendBeerStyles(catalog, { bitterness: -1 }, 1);
  assert.equal(result[0].id, 'light-low');
});

function style(id, tasteProfile) {
  return {
    id,
    code: id,
    kind: 'bjcp',
    displayName: id,
    name_zh: id,
    name_en: id,
    aliases: [],
    tasteProfile,
  };
}
