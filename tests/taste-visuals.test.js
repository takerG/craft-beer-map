import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFlavorWheelVisual } from '../miniprogram/utils/taste-visuals.js';

const filters = [
  { id: 'sweetness', label: '甜度' },
  { id: 'sourness', label: '酸感' },
  { id: 'bitterness', label: '苦度' },
  { id: 'body', label: '酒体' },
  { id: 'roast', label: '烘烤' },
  { id: 'fruitiness', label: '果香' },
];

test('flavor wheel visual style changes when filter state changes', () => {
  const sweetNotSour = buildFlavorWheelVisual(filters, {
    sweetness: 1,
    sourness: -1,
    bitterness: 0,
    body: 0,
    roast: 0,
    fruitiness: 0,
  });
  const bitterSour = buildFlavorWheelVisual(filters, {
    sweetness: -1,
    sourness: 1,
    bitterness: 1,
    body: 0,
    roast: 0,
    fruitiness: 0,
  });

  assert.notEqual(sweetNotSour.chartStyle, bitterSour.chartStyle);
  assert.match(sweetNotSour.chartStyle, /conic-gradient/);
  assert.match(bitterSour.chartStyle, /conic-gradient/);
  assert.ok(sweetNotSour.labels.some((label) => label.label === '麦芽甜'));
  assert.ok(bitterSour.labels.some((label) => label.label === '酸感'));
  assert.ok(bitterSour.labels.some((label) => label.label === '酒花苦'));
});

test('flavor wheel exposes a legend that explains every color segment', () => {
  const visual = buildFlavorWheelVisual(filters, {
    sweetness: 1,
    sourness: -1,
    bitterness: 0,
    body: 1,
    roast: 0,
    fruitiness: 0,
  });

  assert.equal(visual.legend.length, filters.length);
  assert.deepEqual(
    visual.legend.map((item) => item.dimension),
    ['甜度', '酸感', '苦度', '酒体', '烘烤', '果香'],
  );
  assert.ok(visual.legend.every((item) => /^#[0-9a-f]{6}$/i.test(item.color)));
  assert.ok(visual.legend.some((item) => item.dimension === '甜度' && item.valueLabel === '麦芽甜' && item.sourceLabel === '已选择'));
  assert.ok(visual.legend.some((item) => item.dimension === '酸感' && item.valueLabel === '不酸' && item.sourceLabel === '已选择'));
  assert.ok(visual.legend.some((item) => item.dimension === '苦度' && item.sourceLabel === '结果倾向'));
});

test('flavor wheel uses matched results to resolve neutral dimensions', () => {
  const visual = buildFlavorWheelVisual(
    filters,
    { sweetness: 0, sourness: 0, bitterness: 0, body: 0, roast: 0, fruitiness: 0 },
    [
      { taste_profile: { sweetness: 1, sourness: -1, bitterness: -1, body: 1, roast: 1, fruitiness: 0 } },
      { taste_profile: { sweetness: 1, sourness: -1, bitterness: 0, body: 1, roast: 1, fruitiness: 1 } },
    ],
  );

  assert.match(visual.chartStyle, /#ffcf85/);
  assert.ok(visual.labels.some((label) => label.label === '麦芽甜'));
  assert.ok(visual.labels.some((label) => label.label === '深色烘烤'));
});
