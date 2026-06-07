import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFlavorWheelVisual } from '../miniprogram/utils/taste-visuals.js';

const filters = [
  { id: 'sweetness', label: 'sweetness' },
  { id: 'sourness', label: 'sourness' },
  { id: 'bitterness', label: 'bitterness' },
  { id: 'body', label: 'body' },
  { id: 'strength', label: 'strength' },
];

test('flavor wheel visual style changes when filter state changes', () => {
  const sweetNotSour = buildFlavorWheelVisual(filters, {
    sweetness: 1,
    sourness: -1,
    bitterness: 0,
    body: 0,
    strength: 0,
  });
  const bitterStrong = buildFlavorWheelVisual(filters, {
    sweetness: -1,
    sourness: -1,
    bitterness: 1,
    body: 0,
    strength: 1,
  });

  assert.notEqual(sweetNotSour.chartStyle, bitterStrong.chartStyle);
  assert.match(sweetNotSour.chartStyle, /conic-gradient/);
  assert.match(bitterStrong.chartStyle, /conic-gradient/);
  assert.ok(sweetNotSour.labels.some((label) => label.id.startsWith('sweetness-')));
  assert.ok(bitterStrong.legend.some((item) => item.id === 'bitterness' && item.active));
  assert.ok(bitterStrong.labels.some((label) => label.id.startsWith('strength-')));
});

test('flavor wheel exposes a legend that explains every color segment', () => {
  const visual = buildFlavorWheelVisual(filters, {
    sweetness: 1,
    sourness: -1,
    bitterness: 0,
    body: 1,
    strength: 0,
  });

  assert.equal(visual.legend.length, filters.length);
  assert.deepEqual(
    visual.legend.map((item) => item.id),
    ['sweetness', 'sourness', 'bitterness', 'body', 'strength'],
  );
  assert.ok(visual.legend.every((item) => /^#[0-9a-f]{6}$/i.test(item.color)));
  assert.ok(visual.legend.some((item) => item.id === 'sweetness' && item.active));
  assert.ok(visual.legend.some((item) => item.id === 'sourness' && item.active));
  assert.ok(visual.legend.some((item) => item.id === 'bitterness' && !item.active));
});

test('flavor wheel uses matched results to resolve neutral dimensions', () => {
  const visual = buildFlavorWheelVisual(
    filters,
    {
      sweetness: 0,
      sourness: 0,
      bitterness: 0,
      body: 0,
      strength: 0,
    },
    [
      {
        taste_profile: {
          sweetness: 1,
          sourness: -1,
          bitterness: -1,
          body: 1,
          strength: 0,
        },
      },
      {
        taste_profile: {
          sweetness: 1,
          sourness: -1,
          bitterness: 0,
          body: 1,
          strength: 1,
        },
      },
    ],
  );

  assert.match(visual.chartStyle, /#ffcf85/);
  assert.ok(visual.labels.some((label) => label.id.startsWith('sweetness-')));
  assert.ok(visual.labels.some((label) => label.id.startsWith('body-')));
});
