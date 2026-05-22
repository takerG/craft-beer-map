import test from 'node:test';
import assert from 'node:assert/strict';

import data from '../public/data.json' with { type: 'json' };
import { SUPER_GENRES } from '../src/super-genres.js';

test('large beer groupings cover every BJCP category exactly once', () => {
  const categoryIds = data.categories.map((category) => category.id);
  const groupedCategoryIds = SUPER_GENRES.flatMap((group) => group.categories);

  assert.deepEqual([...new Set(groupedCategoryIds)].sort((a, b) => Number(a) - Number(b)), categoryIds);
  assert.equal(groupedCategoryIds.length, categoryIds.length);
});

test('historical and wild beer are not collapsed into the specialty group', () => {
  const historicalAndWild = SUPER_GENRES.find((group) => group.id === 'historical-wild');
  const specialty = SUPER_GENRES.find((group) => group.id === 'specialty');

  assert.deepEqual(historicalAndWild?.categories, ['27', '28']);
  assert.deepEqual(specialty?.categories, ['29', '30', '31', '32', '33', '34']);
});
