import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  getGroupDetail,
  getStyleDetail,
  getSuperGroups,
  searchStyles,
} from '../miniprogram/utils/beer-model.js';
import { SUPER_GROUPS } from '../miniprogram/utils/super-groups.js';
import { SUPER_GENRES } from '../src/super-genres.js';

const root = process.cwd();

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

test('getGroupDetail returns categories and styles without local relation map data', () => {
  const detail = getGroupDetail('belgian');

  assert.equal(detail.group.id, 'belgian');
  assert.deepEqual(
    detail.categories.map((category) => category.id),
    ['23', '24', '25', '26'],
  );
  assert.ok(detail.styles.some((style) => style.code === '23E'));
  assert.equal(Object.hasOwn(detail, 'relations'), false);
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

test('searchStyles matches community style aliases', () => {
  const imperialIpa = searchStyles('帝国IPA')[0];

  assert.ok(searchStyles('双倍').some((style) => style.code === '22A'));
  assert.equal(imperialIpa.code, '22A');
  assert.ok(imperialIpa.aliases.includes('双倍IPA'));
  assert.ok(imperialIpa.aliases.includes('帝国IPA'));
});

test('getStyleDetail returns community aliases for display', () => {
  const detail = getStyleDetail('22A');

  assert.ok(detail.style.aliases.includes('双倍IPA'));
  assert.ok(detail.style.aliases.includes('帝国IPA'));
});

test('mini program keeps community aliases outside the generated BJCP payload', () => {
  const beerDataPath = path.join(root, 'miniprogram', 'data', 'beer-data.js');
  const styleAliasesPath = path.join(root, 'miniprogram', 'data', 'style-aliases.js');
  const beerDataSource = fs.readFileSync(beerDataPath, 'utf8');
  const styleAliasesSource = fs.readFileSync(styleAliasesPath, 'utf8');

  assert.equal(beerDataSource.includes('"aliases"'), false);
  assert.ok(Buffer.byteLength(styleAliasesSource) < 20 * 1024);
  assert.match(styleAliasesSource, /22A/);
  assert.match(styleAliasesSource, /双倍IPA/);
});
