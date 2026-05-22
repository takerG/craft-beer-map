import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMiniMap,
  findMiniMapNodeAt,
  getGroupDetail,
  getStyleDetail,
  getSuperGroups,
  searchStyles,
} from '../miniprogram/utils/beer-model.js';
import { SUPER_GROUPS } from '../miniprogram/utils/super-groups.js';
import { SUPER_GENRES } from '../src/super-genres.js';

test('getSuperGroups returns the eight browse groups with counts', () => {
  const groups = getSuperGroups();

  assert.equal(groups.length, 8);
  assert.deepEqual(
    groups.map((group) => group.id),
    ['american', 'international', 'czech', 'german', 'british', 'belgian', 'historical-wild', 'specialty'],
  );
  assert.equal(groups.find((group) => group.id === 'american').categoryCount, 6);
  assert.equal(groups.reduce((total, group) => total + group.styleCount, 0), 116);
});

test('mini program browse group labels match the PC atlas labels', () => {
  assert.deepEqual(
    SUPER_GROUPS.map((group) => ({ id: group.id, name: group.name, nameEn: group.nameEn })),
    SUPER_GENRES.map((group) => ({ id: group.id, name: group.name, nameEn: group.nameEn })),
  );
});

test('getGroupDetail returns categories, styles, and scoped relations', () => {
  const detail = getGroupDetail('belgian');

  assert.equal(detail.group.id, 'belgian');
  assert.deepEqual(
    detail.categories.map((category) => category.id),
    ['23', '24', '25', '26'],
  );
  assert.ok(detail.styles.some((style) => style.code === '23E'));
  assert.ok(detail.relations.every((relation) => relation.source.superGenreId === 'belgian' || relation.target.superGenreId === 'belgian'));
});

test('group and search list payloads stay lightweight for setData', () => {
  const detail = getGroupDetail('british');
  const searchResults = searchStyles('ipa');

  assert.equal(detail.categories.some((category) => category.styles.some((style) => style.details)), false);
  assert.equal(detail.styles.some((style) => style.details), false);
  assert.equal(searchResults.some((style) => style.details), false);
  assert.ok(Buffer.byteLength(JSON.stringify(detail.categories)) < 18000);
  assert.ok(Buffer.byteLength(JSON.stringify(searchResults)) < 5000);
});

test('getStyleDetail returns formatted stats and related styles', () => {
  const detail = getStyleDetail('1B');

  assert.equal(detail.style.code, '1B');
  assert.equal(Object.hasOwn(detail.style, 'details'), false);
  assert.equal(detail.category.id, '1');
  assert.equal(detail.group.id, 'american');
  assert.ok(detail.sections.some((section) => section.key === 'overall_impression' && section.content.length > 0));
  assert.ok(detail.stats.some((stat) => stat.label === 'ABV'));
  assert.ok(Array.isArray(detail.related));
});

test('searchStyles matches code, Chinese name, and English name', () => {
  assert.equal(searchStyles('').length, 0);
  assert.equal(searchStyles('1a')[0].code, '1A');
  assert.ok(searchStyles('淡爽').some((style) => style.code === '1A'));
  assert.ok(searchStyles('gueuze').some((style) => style.code === '23E'));
});

test('buildMiniMap creates tappable canvas nodes for one group', () => {
  const map = buildMiniMap('american', { width: 375, height: 420 });

  assert.equal(map.group.id, 'american');
  assert.ok(map.nodes.length > 0);
  assert.ok(map.nodes.every((node) => node.x >= 0 && node.x <= 375));
  assert.ok(map.nodes.every((node) => node.y >= 0 && node.y <= 420));
  assert.ok(map.links.every((link) => link.source && link.target));

  const first = map.nodes[0];
  assert.equal(first.label, first.name);
  assert.notEqual(first.label, first.code);
  assert.equal(findMiniMapNodeAt(map, first.x, first.y).id, first.id);
  assert.equal(findMiniMapNodeAt(map, -20, -20), null);
});
