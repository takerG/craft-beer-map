import test from 'node:test';
import assert from 'node:assert/strict';

import data from '../data/beer-data-source.json' with { type: 'json' };

const expected2021Styles = [
  ['1A', 'American Light Lager'],
  ['1B', 'American Lager'],
  ['1C', 'Cream Ale'],
  ['1D', 'American Wheat Beer'],
  ['2A', 'International Pale Lager'],
  ['2B', 'International Amber Lager'],
  ['2C', 'International Dark Lager'],
  ['3A', 'Czech Pale Lager'],
  ['3B', 'Czech Premium Pale Lager'],
  ['3C', 'Czech Amber Lager'],
  ['3D', 'Czech Dark Lager'],
  ['4A', 'Munich Helles'],
  ['4B', 'Festbier'],
  ['4C', 'Helles Bock'],
  ['5A', 'German Leichtbier'],
  ['5B', 'Kolsch'],
  ['5C', 'German Helles Exportbier'],
  ['5D', 'German Pils'],
  ['6A', 'Marzen'],
  ['6B', 'Rauchbier'],
  ['6C', 'Dunkles Bock'],
  ['7A', 'Vienna Lager'],
  ['7B', 'Altbier'],
  ['8A', 'Munich Dunkel'],
  ['8B', 'Schwarzbier'],
  ['9A', 'Doppelbock'],
  ['9B', 'Eisbock'],
  ['9C', 'Baltic Porter'],
  ['10A', 'Weissbier'],
  ['10B', 'Dunkles Weissbier'],
  ['10C', 'Weizenbock'],
  ['11A', 'Ordinary Bitter'],
  ['11B', 'Best Bitter'],
  ['11C', 'Strong Bitter'],
  ['12A', 'British Golden Ale'],
  ['12B', 'Australian Sparkling Ale'],
  ['12C', 'English IPA'],
  ['13A', 'Dark Mild'],
  ['13B', 'British Brown Ale'],
  ['13C', 'English Porter'],
  ['14A', 'Scottish Light'],
  ['14B', 'Scottish Heavy'],
  ['14C', 'Scottish Export'],
  ['15A', 'Irish Red Ale'],
  ['15B', 'Irish Stout'],
  ['15C', 'Irish Extra Stout'],
  ['16A', 'Sweet Stout'],
  ['16B', 'Oatmeal Stout'],
  ['16C', 'Tropical Stout'],
  ['16D', 'Foreign Extra Stout'],
  ['17A', 'British Strong Ale'],
  ['17B', 'Old Ale'],
  ['17C', 'Wee Heavy'],
  ['17D', 'English Barley Wine'],
  ['18A', 'Blonde Ale'],
  ['18B', 'American Pale Ale'],
  ['19A', 'American Amber Ale'],
  ['19B', 'California Common'],
  ['19C', 'American Brown Ale'],
  ['20A', 'American Porter'],
  ['20B', 'American Stout'],
  ['20C', 'Imperial Stout'],
  ['21A', 'American IPA'],
  ['21B', 'Specialty IPA'],
  ['21C', 'Hazy IPA'],
  ['22A', 'Double IPA'],
  ['22B', 'American Strong Ale'],
  ['22C', 'American Barleywine'],
  ['22D', 'Wheatwine'],
  ['23A', 'Berliner Weisse'],
  ['23B', 'Flanders Red Ale'],
  ['23C', 'Oud Bruin'],
  ['23D', 'Lambic'],
  ['23E', 'Gueuze'],
  ['23F', 'Fruit Lambic'],
  ['23G', 'Gose'],
  ['24A', 'Witbier'],
  ['24B', 'Belgian Pale Ale'],
  ['24C', 'Biere de Garde'],
  ['25A', 'Belgian Blond Ale'],
  ['25B', 'Saison'],
  ['25C', 'Belgian Golden Strong Ale'],
  ['26A', 'Belgian Single'],
  ['26B', 'Belgian Dubbel'],
  ['26C', 'Belgian Tripel'],
  ['26D', 'Belgian Dark Strong Ale'],
  ['27A', 'Kellerbier'],
  ['27B', 'Kentucky Common'],
  ['27C', 'Lichtenhainer'],
  ['27D', 'London Brown Ale'],
  ['27E', 'Piwo Grodziskie'],
  ['27F', 'Pre-Prohibition Lager'],
  ['27G', 'Pre-Prohibition Porter'],
  ['27H', 'Roggenbier'],
  ['27I', 'Sahti'],
  ['28A', 'Brett Beer'],
  ['28B', 'Mixed-Fermentation Sour Beer'],
  ['28C', 'Wild Specialty Beer'],
  ['28D', 'Straight Sour Beer'],
  ['29A', 'Fruit Beer'],
  ['29B', 'Fruit and Spice Beer'],
  ['29C', 'Specialty Fruit Beer'],
  ['29D', 'Grape Ale'],
  ['30A', 'Spice, Herb, or Vegetable Beer'],
  ['30B', 'Autumn Seasonal Beer'],
  ['30C', 'Winter Seasonal Beer'],
  ['30D', 'Specialty Spice Beer'],
  ['31A', 'Alternative Grain Beer'],
  ['31B', 'Alternative Sugar Beer'],
  ['32A', 'Classic Style Smoked Beer'],
  ['32B', 'Specialty Smoked Beer'],
  ['33A', 'Wood-Aged Beer'],
  ['33B', 'Specialty Wood-Aged Beer'],
  ['34A', 'Commercial Specialty Beer'],
  ['34B', 'Mixed-Style Beer'],
  ['34C', 'Experimental Beer'],
];

const tasteProfileDimensions = [
  'sweetness',
  'sourness',
  'bitterness',
  'body',
  'roast',
  'fruitiness',
];

function normalizeName(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

test('beer data matches the BJCP 2021 main guideline style set', () => {
  const byCode = new Map(data.styles.map((style) => [style.code || style.id, style]));

  assert.equal(data.styles.length, expected2021Styles.length);
  assert.equal(byCode.has('7C'), false);

  expected2021Styles.forEach(([code, name]) => {
    assert.equal(byCode.has(code), true, `${code} should exist`);
    assert.equal(normalizeName(byCode.get(code).name_en), name);
  });
});

test('beer data includes searchable community aliases for official Chinese style names', () => {
  const byCode = new Map(data.styles.map((style) => [style.code || style.id, style]));
  const doubleIpa = byCode.get('22A');

  assert.equal(data.styles.every((style) => Array.isArray(style.aliases)), true);
  assert.equal(doubleIpa.name_zh, '双料');
  assert.ok(Array.isArray(doubleIpa.aliases));
  assert.ok(doubleIpa.aliases.includes('双倍IPA'));
  assert.ok(doubleIpa.aliases.includes('帝国IPA'));
});

test('beer data assigns three-state taste profiles for choose filters', () => {
  data.styles.forEach((style) => {
    assert.equal(typeof style.taste_profile, 'object', `${style.code} should define taste_profile`);

    tasteProfileDimensions.forEach((dimension) => {
      assert.ok(Object.hasOwn(style.taste_profile, dimension), `${style.code} should define ${dimension}`);
      assert.ok(
        [-1, 0, 1].includes(style.taste_profile[dimension]),
        `${style.code} ${dimension} should be -1, 0, or 1`,
      );
    });
  });
});

test('choose taste profiles keep representative styles in expected taste lanes', () => {
  const byCode = new Map(data.styles.map((style) => [style.code || style.id, style]));

  assert.deepEqual(byCode.get('1C').taste_profile, {
    sweetness: 0,
    sourness: -1,
    bitterness: -1,
    body: -1,
    roast: -1,
    fruitiness: 0,
  });
  assert.deepEqual(byCode.get('5D').taste_profile, {
    sweetness: -1,
    sourness: -1,
    bitterness: 1,
    body: -1,
    roast: -1,
    fruitiness: -1,
  });
  assert.deepEqual(byCode.get('21C').taste_profile, {
    sweetness: 0,
    sourness: -1,
    bitterness: 0,
    body: 0,
    roast: -1,
    fruitiness: 1,
  });
  assert.deepEqual(byCode.get('23A').taste_profile, {
    sweetness: -1,
    sourness: 1,
    bitterness: -1,
    body: -1,
    roast: -1,
    fruitiness: 1,
  });
  assert.deepEqual(byCode.get('16A').taste_profile, {
    sweetness: 1,
    sourness: -1,
    bitterness: -1,
    body: 1,
    roast: 1,
    fruitiness: -1,
  });
});
