const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'data', 'beer-data-source.json');

const DIMENSIONS = ['sweetness', 'sourness', 'bitterness', 'body', 'roast', 'fruitiness'];

const OVERRIDES = {
  '1A': { sweetness: -1, sourness: -1, bitterness: -1, body: -1, roast: -1, fruitiness: -1 },
  '1B': { sweetness: -1, sourness: -1, bitterness: -1, body: -1, roast: -1, fruitiness: -1 },
  '16A': { sweetness: 1, sourness: -1, bitterness: 0, body: 1, roast: 1, fruitiness: -1 },
  '17C': { sweetness: 1, sourness: -1, bitterness: 0, body: 1, roast: 0, fruitiness: -1 },
  '21A': { sweetness: -1, sourness: -1, bitterness: 1, body: 0, roast: -1, fruitiness: 1 },
  '21C': { sweetness: 0, sourness: -1, bitterness: 0, body: 0, roast: -1, fruitiness: 1 },
  '23A': { sweetness: -1, sourness: 1, bitterness: -1, body: -1, roast: -1, fruitiness: 1 },
  '23E': { sweetness: -1, sourness: 1, bitterness: -1, body: -1, roast: -1, fruitiness: 1 },
  '23G': { sweetness: -1, sourness: 1, bitterness: -1, body: -1, roast: -1, fruitiness: 0 },
  '26D': { sweetness: 1, sourness: -1, bitterness: 0, body: 1, roast: 0, fruitiness: 1 },
  '30C': { sweetness: 1, sourness: -1, bitterness: -1, body: 1, roast: 0, fruitiness: 1 },
};

const data = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

data.styles = data.styles.map((style) => {
  const profile = {
    ...inferTasteProfile(style),
    ...(OVERRIDES[style.code || style.id] || {}),
  };

  DIMENSIONS.forEach((dimension) => {
    if (![-1, 0, 1].includes(profile[dimension])) {
      profile[dimension] = 0;
    }
  });

  return {
    ...style,
    taste_profile: profile,
  };
});

fs.writeFileSync(sourcePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`Updated taste profiles for ${data.styles.length} styles`);

function inferTasteProfile(style) {
  const code = style.code || style.id || '';
  const text = [
    code,
    style.name_zh,
    style.name_en,
    style.category,
    style.details && Object.values(style.details).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return {
    sweetness: inferSweetness(code, text),
    sourness: inferSourness(code, text),
    bitterness: inferBitterness(code, text),
    body: inferBody(code, text),
    roast: inferRoast(code, text),
    fruitiness: inferFruitiness(code, text),
  };
}

function inferSweetness(code, text) {
  if (hasAny(text, ['sweet stout', 'tropical stout', 'wee heavy', 'barley wine', 'barleywine', 'old ale', 'doppelbock', 'eisbock', 'weizenbock', 'dark strong', 'winter seasonal', 'caramel', 'toffee', 'molasses', '甜', '焦糖', '太妃糖'])) return 1;
  if (hasAny(text, ['dry', 'pils', 'ipa', 'bitter', 'gose', 'gueuze', 'berliner', 'light lager', 'leichtbier', '干爽', '酸'])) return -1;
  if (['9', '16', '17', '26', '30'].some((category) => code.startsWith(category))) return 1;
  return 0;
}

function inferSourness(code, text) {
  if (hasAny(text, ['sour', 'lambic', 'gueuze', 'gose', 'berliner', 'flanders', 'oud bruin', 'brett', 'mixed-fermentation', 'wild', '酸', '野菌', '酒香酵母'])) return 1;
  if (code.startsWith('23') || code.startsWith('28')) return 1;
  return -1;
}

function inferBitterness(code, text) {
  if (hasAny(text, ['ipa', 'bitter', 'pils', 'pale ale', 'american stout', 'imperial stout', 'black ipa', '苦味', '酒花'])) return 1;
  if (hasAny(text, ['weissbier', 'witbier', 'lambic', 'gose', 'berliner', 'sweet stout', 'bock', 'mild', 'light lager', '低苦'])) return -1;
  return 0;
}

function inferBody(code, text) {
  if (hasAny(text, ['bock', 'stout', 'porter', 'strong', 'barley wine', 'barleywine', 'old ale', 'wheatwine', 'eisbock', 'doppelbock', 'imperial', 'heavy', 'full-bodied', '酒体厚', '饱满'])) return 1;
  if (hasAny(text, ['light lager', 'leichtbier', 'berliner', 'gose', 'lambic', 'gueuze', 'session', '淡爽', '轻盈', '酒体淡'])) return -1;
  return 0;
}

function inferRoast(code, text) {
  if (hasAny(text, ['stout', 'porter', 'dunkel', 'schwarz', 'dark', 'brown', 'roast', 'coffee', 'chocolate', 'black', '烘烤', '咖啡', '巧克力', '深色', '棕色'])) return 1;
  if (hasAny(text, ['pale', 'golden', 'blond', 'wheat', 'pils', 'light lager', '淡色', '金色', '小麦'])) return -1;
  return 0;
}

function inferFruitiness(code, text) {
  if (hasAny(text, ['fruit', 'fruity', 'citrus', 'tropical', 'belgian', 'saison', 'witbier', 'weissbier', 'hazy ipa', 'lambic', 'gueuze', 'esters', '水果', '果香', '柑橘', '热带', '酯香'])) return 1;
  if (hasAny(text, ['lager', 'pils', 'rauchbier', 'smoked', 'clean', '下发酵', '烟熏', '干净'])) return -1;
  return 0;
}

function hasAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}
