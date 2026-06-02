import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  getExtensionGroupDetail,
  getExtensionGroups,
  getExtensionStyleDetail,
  getGuideOverview,
  getGroupDetail,
  getStyleDetail,
  getStyleLanguageDetail,
  getStyleLanguageGroups,
  getSuperGroups,
  getTasteFilters,
  getTasteMatches,
  searchStyles,
} from '../miniprogram/utils/beer-model.js';
import { beerData } from '../miniprogram/data/beer-data.js';
import { extensionGroups, extensionStyles } from '../miniprogram/data/extension-styles.js';
import { styleLanguageMap } from '../miniprogram/data/style-language-map.js';
import { SUPER_GROUPS } from '../miniprogram/utils/super-groups.js';

const root = process.cwd();

test('guide overview counts are derived from current model data', () => {
  const overview = getGuideOverview();

  assert.equal(overview.groupCount, getSuperGroups().length);
  assert.equal(overview.standardStyleCount, beerData.styles.length);
  assert.equal(overview.extensionGroupCount, extensionGroups.length);
  assert.equal(overview.extensionStyleCount, extensionStyles.length);
});

test('getSuperGroups returns the browse groups with computed counts', () => {
  const groups = getSuperGroups();

  assert.equal(groups.length, SUPER_GROUPS.length);
  assert.deepEqual(
    groups.map((group) => group.id),
    ['american', 'international', 'czech', 'german', 'british', 'belgian', 'historical-wild', 'specialty'],
  );
  assert.equal(
    groups.find((group) => group.id === 'american').categoryCount,
    beerData.categories.filter((category) => SUPER_GROUPS.find((group) => group.id === 'american').categories.includes(category.id)).length,
  );
  assert.equal(groups.reduce((total, group) => total + group.styleCount, 0), beerData.styles.length);
});

test('extension groups expose the full market style learning layer', () => {
  const groups = getExtensionGroups();

  assert.equal(groups.length, extensionGroups.length);
  assert.deepEqual(
    groups.map((group) => group.styleCount),
    extensionGroups.map((group) => extensionStyles.filter((style) => style.groupId === group.id).length),
  );
  assert.equal(groups.reduce((total, group) => total + group.styleCount, 0), extensionStyles.length);
});

test('extension styles assign three-state taste profiles for choose filters', () => {
  const dimensions = ['sweetness', 'sourness', 'bitterness', 'body', 'roast', 'fruitiness', 'hopAroma', 'fermentation', 'strength'];

  extensionStyles.forEach((style) => {
    assert.equal(typeof style.taste_profile, 'object', `${style.id} should define taste_profile`);
    dimensions.forEach((dimension) => {
      assert.ok(Object.hasOwn(style.taste_profile, dimension), `${style.id} should define ${dimension}`);
      assert.ok(
        [-1, 0, 1].includes(style.taste_profile[dimension]),
        `${style.id} ${dimension} should be -1, 0, or 1`,
      );
    });
  });
});

test('extension group detail returns lightweight style summaries', () => {
  const detail = getExtensionGroupDetail('modern-ipa-hops');

  assert.equal(detail.group.id, 'modern-ipa-hops');
  assert.equal(detail.styles.length, extensionStyles.filter((style) => style.groupId === 'modern-ipa-hops').length);
  assert.equal(detail.styles[0].kind, 'extension');
  assert.equal(Object.hasOwn(detail.styles[0], 'description'), false);
  assert.equal(Object.hasOwn(detail.styles[0], 'bjcp_note'), false);
});

test('extension style detail returns source label and BJCP crosswalk', () => {
  const detail = getExtensionStyleDetail('ext-west-coast-ipa');

  assert.equal(detail.style.kind, 'extension');
  assert.equal(detail.style.name_zh, '西海岸 IPA');
  assert.equal(detail.sourceLabel, 'BA/WBC/GABF 扩展风格');
  assert.match(detail.description, /干爽/);
  assert.match(detail.bjcp_note, /American IPA/);
  assert.ok(detail.bjcp_refs.some((style) => style.id === '21A'));
});

test('searchStyles returns BJCP and extension style results with routing kind', () => {
  const westCoast = searchStyles('西海岸 IPA')[0];
  const riceLager = searchStyles('Rice Lager')[0];
  const pastry = searchStyles('Pastry')[0];
  const bjcpIpa = searchStyles('21A')[0];

  assert.equal(westCoast.kind, 'extension');
  assert.equal(westCoast.id, 'ext-west-coast-ipa');
  assert.equal(riceLager.kind, 'extension');
  assert.equal(riceLager.id, 'ext-rice-lager');
  assert.equal(pastry.kind, 'extension');
  assert.equal(pastry.id, 'ext-dessert-pastry-beer');
  assert.equal(bjcpIpa.kind, 'bjcp');
  assert.equal(bjcpIpa.code, '21A');
});

test('style language groups expose stable community wording entries', () => {
  const groups = getStyleLanguageGroups();

  assert.deepEqual(
    groups.map((group) => group.id),
    [
      'crisp-daily',
      'juicy-ipa',
      'sweet-sour-fruit',
      'sweet-entry',
      'coffee-chocolate',
      'tea-new-chinese',
      'heavy-geek',
      'low-abv-tipsy',
    ],
  );
  assert.equal(groups[0].title, '清爽口粮');
  assert.equal(groups[1].title, '果汁感 IPA');
  assert.ok(groups.every((group) => group.keywordCount >= 3));
  assert.ok(groups.every((group) => group.styleCount >= 4));
  assert.equal(groups.some((group) => Object.hasOwn(group, 'styles')), false);
});

test('style language details resolve BJCP and extension styles for routing', () => {
  const detail = getStyleLanguageDetail('coffee-chocolate');

  assert.equal(detail.group.id, 'coffee-chocolate');
  assert.match(detail.group.explanation, /咖啡/);
  assert.ok(detail.styles.some((style) => style.kind === 'bjcp' && style.code === '16A'));
  assert.ok(detail.styles.some((style) => style.kind === 'extension' && style.id === 'ext-coffee-beer'));
  detail.styles.forEach((style) => {
    assert.equal(typeof style.reason, 'string');
    assert.ok(style.reason.length > 0);
    assert.equal(typeof style.caution, 'string');
    assert.ok(['bjcp', 'extension'].includes(style.kind));
  });
});

test('style language map references existing BJCP and extension styles', () => {
  const bjcpCodes = new Set(beerData.styles.map((style) => style.code || style.id));
  const extensionIds = new Set(extensionStyles.map((style) => style.id));

  styleLanguageMap.forEach((group) => {
    assert.equal(typeof group.id, 'string');
    assert.ok(group.title);
    assert.ok(group.explanation);
    assert.ok(Array.isArray(group.keywords) && group.keywords.length >= 3);
    assert.ok(Array.isArray(group.styles) && group.styles.length >= 4);
    group.styles.forEach((styleRef) => {
      if (styleRef.kind === 'bjcp') {
        assert.ok(bjcpCodes.has(styleRef.id), `${group.id} references missing BJCP style ${styleRef.id}`);
      } else {
        assert.equal(styleRef.kind, 'extension');
        assert.ok(extensionIds.has(styleRef.id), `${group.id} references missing extension style ${styleRef.id}`);
      }
    });
  });
});

test('searchStyles matches social wording from the style language map', () => {
  assert.ok(searchStyles('果汁感').some((style) => style.id === '21C' || style.id === 'ext-hazy-pale-ale'));
  assert.ok(searchStyles('小甜水').some((style) => style.id === '29A' || style.id === 'ext-dessert-pastry-beer'));
  assert.ok(searchStyles('咖啡世涛').some((style) => style.id === 'ext-coffee-beer' || style.code === '16A'));
  assert.ok(searchStyles('茶感').some((style) => style.id === '30A' || style.id === 'ext-field-beer'));
  assert.ok(searchStyles('不苦').some((style) => style.code === '5B' || style.id === 'ext-rice-lager'));
});

test('mini program browse group labels stay stable', () => {
  assert.deepEqual(
    SUPER_GROUPS.map((group) => ({ id: group.id, nameEn: group.nameEn })),
    [
      { id: 'american', nameEn: 'American' },
      { id: 'international', nameEn: 'International' },
      { id: 'czech', nameEn: 'Czech' },
      { id: 'german', nameEn: 'Germanic' },
      { id: 'british', nameEn: 'British, Irish & Commonwealth' },
      { id: 'belgian', nameEn: 'Belgian, French & European Sour' },
      { id: 'historical-wild', nameEn: 'Historical & Wild' },
      { id: 'specialty', nameEn: 'Specialty & Flavor Beer' },
    ],
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

test('taste filters expose three-state dimensions for the choose tab', () => {
  const filters = getTasteFilters();

  assert.deepEqual(
    filters.map((filter) => filter.id),
    ['sweetness', 'sourness', 'bitterness', 'body', 'roast', 'fruitiness', 'hopAroma', 'fermentation', 'strength'],
  );
  filters.forEach((filter) => {
    assert.equal(filter.options.length, 3);
    assert.deepEqual(
      filter.options.map((option) => option.value),
      [-1, 0, 1],
    );
  });
});

test('taste matching returns lightweight scored style summaries', () => {
  const matches = getTasteMatches({ sweetness: 1, sourness: -1, bitterness: 0, body: 0, roast: 0, fruitiness: 0 }, 12);

  assert.ok(matches.length > 0);
  assert.ok(matches.some((match) => match.code === '16A'));
  assert.equal(matches.some((match) => match.details), false);
  matches.forEach((match) => {
    assert.ok(['bjcp', 'extension'].includes(match.kind));
    assert.equal(typeof match.matchScore, 'number');
    assert.ok(match.matchScore >= 0 && match.matchScore <= 100);
    assert.ok(Array.isArray(match.matchReasons));
    assert.equal(typeof match.taste_profile, 'object');
  });
});

test('taste matching includes calibrated extension styles', () => {
  const matches = getTasteMatches(
    { sweetness: -1, sourness: -1, bitterness: 1, body: 0, roast: -1, fruitiness: 1, hopAroma: 1 },
    20,
  );

  const westCoastIpa = matches.find((match) => match.id === 'ext-west-coast-ipa');

  assert.ok(westCoastIpa);
  assert.equal(westCoastIpa.kind, 'extension');
  assert.deepEqual(westCoastIpa.taste_profile, {
    sweetness: -1,
    sourness: -1,
    bitterness: 1,
    body: 0,
    roast: -1,
    fruitiness: 1,
    hopAroma: 1,
    fermentation: 0,
    strength: 0,
  });
});

test('taste matching ranks exact taste-profile matches before partial matches', () => {
  const matches = getTasteMatches(
    { sweetness: 1, sourness: -1, bitterness: -1, body: 1, roast: 1, fruitiness: -1 },
    5,
  );

  assert.equal(matches[0].code, '16A');
  assert.deepEqual(matches[0].taste_profile, {
    sweetness: 1,
    sourness: -1,
    bitterness: -1,
    body: 1,
    roast: 1,
    fruitiness: -1,
    hopAroma: -1,
    fermentation: -1,
    strength: 0,
  });
});

test('taste matching can distinguish hoppy aroma from bitterness', () => {
  const matches = getTasteMatches(
    { sweetness: 0, sourness: -1, bitterness: 0, body: 0, roast: -1, fruitiness: 1, hopAroma: 1 },
    12,
  );

  const hazyIpa = matches.find((match) => match.code === '21C');

  assert.ok(hazyIpa);
  assert.equal(hazyIpa.taste_profile.hopAroma, 1);
  assert.equal(hazyIpa.taste_profile.bitterness, 0);
});

test('taste matching does not score neutral sweetness as a near-perfect sweet match', () => {
  const matches = getTasteMatches(
    { sweetness: 1, sourness: 1, bitterness: -1, body: 0, roast: 0, fruitiness: 0 },
    12,
  );
  const neutralSweetSours = matches.filter((match) => match.taste_profile.sweetness === 0);

  assert.ok(neutralSweetSours.some((match) => ['23B', '23F'].includes(match.code)));
  neutralSweetSours.forEach((match) => {
    assert.ok(match.matchScore < 90, `${match.code || match.id} should be a partial match, not ${match.matchScore}%`);
  });
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
