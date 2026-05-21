const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dataPath = path.join(root, 'public', 'data.json');
const data = require(dataPath);

const officialOrder = [
  '1A', '1B', '1C', '1D',
  '2A', '2B', '2C',
  '3A', '3B', '3C', '3D',
  '4A', '4B', '4C',
  '5A', '5B', '5C', '5D',
  '6A', '6B', '6C',
  '7A', '7B',
  '8A', '8B',
  '9A', '9B', '9C',
  '10A', '10B', '10C',
  '11A', '11B', '11C',
  '12A', '12B', '12C',
  '13A', '13B', '13C',
  '14A', '14B', '14C',
  '15A', '15B', '15C',
  '16A', '16B', '16C', '16D',
  '17A', '17B', '17C', '17D',
  '18A', '18B',
  '19A', '19B', '19C',
  '20A', '20B', '20C',
  '21A', '21B', '21C',
  '22A', '22B', '22C', '22D',
  '23A', '23B', '23C', '23D', '23E', '23F', '23G',
  '24A', '24B', '24C',
  '25A', '25B', '25C',
  '26A', '26B', '26C', '26D',
  '27A', '27B', '27C', '27D', '27E', '27F', '27G', '27H', '27I',
  '28A', '28B', '28C', '28D',
  '29A', '29B', '29C', '29D',
  '30A', '30B', '30C', '30D',
  '31A', '31B',
  '32A', '32B',
  '33A', '33B',
  '34A', '34B', '34C',
];

const stylesByKey = new Map(data.styles.map((style) => [style.code || style.id, style]));
const stylesByEnglishName = new Map(data.styles.map((style) => [style.name_en, style]));

function copyStyle(source, overrides) {
  return {
    ...source,
    details: { ...(source.details || {}) },
    ...overrides,
  };
}

function detail(overall, aroma, appearance, flavor, mouthfeel, comments, stats, tags) {
  return {
    overall_impression: overall,
    aroma,
    appearance,
    flavor,
    mouthfeel,
    comments,
    stats,
    tags,
  };
}

function specialtyStyle(id, name_en, name_zh, category, details) {
  return {
    id,
    code: id,
    name_zh,
    name_en,
    category,
    key: false,
    details,
  };
}

const currentGose = stylesByEnglishName.get('Gose');
const currentKellerbier = stylesByEnglishName.get('Kellerbier');

const additions = new Map([
  ['21B', specialtyStyle('21B', 'Specialty IPA', '特种 IPA', '21', detail(
    '以 IPA 的酒花前倾、明显苦味和偏干平衡为核心，并通过颜色、谷物、酵母或强度等变化形成清晰区别；不是加水果、香料、木材等配料的特种啤酒。',
    '必须有可辨识的酒花香气，强度和特征随具体子类型变化，通常仍是最突出的芳香元素。',
    '颜色和清澈度依具体子类型而定；多数应清亮，轻微浑浊可接受，深色类型可不透明。',
    '中低到高的酒花风味，中高到很高的苦味，低到中等麦芽支撑，常见中干到干的收口；各子类型可呈现额外麦芽或酵母特征。',
    '顺滑，中轻到中等酒体，中等碳酸；高酒精版本可有背景温热感。',
    '参赛者需说明强度和特种 IPA 类型；2021 指南列出的类型包括 Belgian、Black、Brown、Red、Rye、White 与 Brut IPA。',
    '按具体类型变化；Session 3.0-5.0% ABV，Standard 5.0-7.5% ABV，Double 7.5-10.0% ABV',
    'IPA 家族，现代精酿，苦味，酒花，特种风格'
  ))],
  ['21C', specialtyStyle('21C', 'Hazy IPA', '浑浊 IPA', '21', detail(
    '强烈酒花香味、柔和酒体和明显浑浊外观的现代美式 IPA；苦味低于传统美式 IPA，强调多汁、热带水果或柑橘感。',
    '高到很高的现代酒花香气，常见热带水果、核果、柑橘、莓果、瓜类或松脂特征；发酵酯可辅助果香但不应主导。',
    '稻草色到琥珀色，明显浑浊但不应浑浊到泥状；白色到米白色泡沫，持久度中等到良好。',
    '中到很高的酒花风味，偏果汁感；苦味中低到中等偏高，麦芽柔和，收口中干到偏干，不应甜腻或粗糙。',
    '中轻到中等偏满酒体，顺滑，碳酸中等；不应有涩口、灼热或厚重感。',
    '也常被称为 New England IPA 或 Juicy IPA。浑浊应来自工艺和配方平衡，而不是酵母悬浮造成的生青或粗糙感。',
    'OG: 1.060-1.085 | FG: 1.010-1.015 | IBU: 25-60 | SRM: 3-7 | ABV: 6.0-9.0%',
    '高酒精，淡色，上发酵，北美，现代精酿，IPA 家族，酒花，多汁，浑浊'
  ))],
  ['28D', specialtyStyle('28D', 'Straight Sour Beer', '纯酸啤酒', '28', detail(
    '清爽、干净、以乳酸酸度为核心的酸啤酒，不强调 Brett、木桶、果味、香料或其他特种配料。',
    '干净酸香为主，可有低到中等麦芽、谷物或轻微水果酯；不应有明显醋酸、霉味、马厩或溶剂感。',
    '颜色随基础风格变化，通常清亮到轻微浑浊；泡沫表现可因酸度而较弱。',
    '酸度中低到高，干净且平衡；麦芽和发酵特征应支持酸味，不应有明显酒花苦味、醋酸或野菌复杂度。',
    '酒体和碳酸随基础风格变化，通常清爽、偏干；酸度可带来轻微收敛感但不应尖锐刺口。',
    '用于表达没有额外风味物、没有混合发酵复杂度的基础酸啤酒，也可作为特种啤酒的基础风格。',
    '随基础风格变化',
    '酸啤酒，上发酵或下发酵，现代精酿，清爽，乳酸'
  ))],
  ['29D', specialtyStyle('29D', 'Grape Ale', '葡萄艾尔', '29', detail(
    '啤酒与葡萄或葡萄汁特征结合的水果啤酒，葡萄、酒感和基础啤酒应形成协调整体，而不是像啤酒与葡萄酒简单混合。',
    '葡萄品种带来的果香、花香、草本或酒香可明显存在，同时保留基础啤酒的麦芽、酒花或发酵特征。',
    '颜色随基础啤酒和葡萄品种变化，可从淡色到红铜或深色；清澈度和泡沫随配方变化。',
    '葡萄味应可辨识，可带来果味、单宁、轻微酸度或葡萄酒般复杂度；基础啤酒不能被完全压制。',
    '酒体随基础风格变化；葡萄发酵物可能带来更干的收口、轻微单宁和更高感知酒精度。',
    '2021 指南将 Grape Ale 纳入水果啤酒类；意大利葡萄艾尔仍可作为地方风格理解，但此分类不限于意大利版本。',
    '随基础风格和葡萄用量变化',
    '水果啤酒，葡萄，特种风格，现代精酿'
  ))],
  ['30D', specialtyStyle('30D', 'Specialty Spice Beer', '特种香料啤酒', '30', detail(
    '在香料、草本或蔬菜之外，还结合其他特种原料或工艺的啤酒；各元素应协调，仍能识别基础啤酒或总体构想。',
    '香料、草本、蔬菜与其他特种元素可明显存在，但不应刺鼻、药感或互相冲突。',
    '外观随基础啤酒和添加物变化；颜色、泡沫和清澈度应与声明的原料相符。',
    '香料和其他特种元素应与麦芽、酒花、发酵特征平衡；甜味、酸味、酒精或苦味不应失控。',
    '酒体和碳酸随基础风格变化；辛香、甜味或其他添加物可能改变口感，但不应粗糙。',
    '适用于同时包含 SHV 与水果、糖类、木材、烟熏等其他特征的作品；参赛者需说明基础风格与特殊原料。',
    '随基础风格变化',
    '特种风格，香料，草本，蔬菜，现代精酿'
  ))],
]);

if (currentGose) {
  additions.set('23G', copyStyle(currentGose, {
    id: '23G',
    code: '23G',
    category: '23',
    name_zh: '古斯',
    name_en: 'Gose',
    details: detail(
      '带有清爽酸度、轻微苦味、克制盐味与香菜特征的中欧历史小麦啤酒；收口干爽，碳酸高，风味明亮。',
      '轻到中等的梨果类水果香，轻微酸感，香菜可带柠檬般的明亮香气；盐味最多表现为很淡的海风感或清新感。',
      '未过滤，中等到明显浑浊，黄色，白色泡沫中到高且细密，气泡充足。',
      '中低到中高的酸度，适度面包或面团麦芽味，轻到中等水果味；盐味应能察觉但不应明显咸，苦味很低，无酒花风味，干爽收口。',
      '高到很高碳酸，中轻到中等偏满酒体；盐和酸度可带来轻微刺激和生津感，但不应厚重。',
      '2021 指南将 Gose 从历史啤酒移入欧洲酸啤酒。现代版本通常接种乳酸菌，更平衡，常被用作水果酸啤或其他特种啤酒的基础。',
      'OG: 1.036-1.056 | FG: 1.006-1.010 | IBU: 5-12 | SRM: 3-4 | ABV: 4.2-4.8%',
      '普通度数，淡色，上发酵，中欧，历史风格，小麦啤酒家族，酸，香料'
    ),
  }));
}

if (currentKellerbier) {
  additions.set('27A', copyStyle(currentKellerbier, {
    id: '27A',
    code: '27A',
    category: '27',
    name_zh: '地窖啤酒',
    name_en: 'Kellerbier',
    details: detail(
      '未过滤、未巴氏杀菌、充分发酵的德国拉格，传统上从贮酒容器中供应；比基础风格更鲜活、略粗犷，但不应有未成熟啤酒的发酵缺陷。',
      '反映基础风格，可有面包状酵母感；淡色版本酒花可更明显，深色版本麦芽更丰富，整体应干净。',
      '反映基础风格，可轻微浑浊但不应浑浊如泥，通常比基础风格略深。',
      '反映基础风格，可有面包状酵母感；淡色版本酒花更强，深色版本麦芽更丰富但不应焦烤；可略更苦、收口略重，发酵应干净。',
      '反映基础风格，可能比基础风格稍有酒体和更柔滑口感；碳酸可略低。',
      '2021 指南将 Kellerbier 移入历史啤酒，覆盖 German Pils、Munich Helles、Maerzen 或 Munich Dunkel 等基础风格；参赛者需声明基础风格。',
      '同声明的基础风格',
      '普通度数，下发酵，中欧，传统风格，平衡，历史风格'
    ),
  }));
}

const historicalRenames = new Map([
  ['Kentucky Common', ['27B', '肯塔基普通啤酒']],
  ['Lichtenhainer', ['27C', '利希滕海纳']],
  ['London Brown Ale', ['27D', '伦敦棕色艾尔']],
  ['Piwo Grodziskie', ['27E', '波兰烟熏啤酒']],
  ['Pre-Prohibition Lager', ['27F', '禁酒令前拉格']],
  ['Pre-Prohibition Porter', ['27G', '禁酒令前波特']],
  ['Roggenbier', ['27H', '黑麦啤酒']],
  ['Sahti', ['27I', '芬兰萨赫蒂啤酒']],
]);

for (const [name, [id, name_zh]] of historicalRenames) {
  const source = stylesByEnglishName.get(name);
  if (source) {
    additions.set(id, copyStyle(source, {
      id,
      code: id,
      category: '27',
      name_zh,
      name_en: name,
    }));
  }
}

const migrated = new Map();
for (const style of data.styles) {
  const key = style.code || style.id;
  if (key === '7C' || key.startsWith('27-')) continue;
  migrated.set(key, style);
}

for (const [key, style] of additions) {
  migrated.set(key, style);
}

const titleUpdates = new Map([
  ['7B', { name_en: 'Altbier' }],
  ['17D', { name_en: 'English Barley Wine' }],
  ['23A', { name_en: 'Berliner Weisse', name_zh: '柏林白啤' }],
  ['26A', { name_en: 'Belgian Single', name_zh: '比利时单料' }],
  ['30A', { name_en: 'Spice, Herb, or Vegetable Beer', name_zh: '香料、草本或蔬菜啤酒' }],
  ['34A', { name_en: 'Commercial Specialty Beer', name_zh: '商业特种啤酒' }],
]);

for (const [key, updates] of titleUpdates) {
  const style = migrated.get(key);
  if (style) {
    migrated.set(key, {
      ...style,
      ...updates,
      details: key === '34A'
        ? detail(
          '对某个已知商业啤酒的致敬、复刻或特征化表达；重点是让评审理解目标酒款与参赛作品之间的对应关系。',
          '应反映声明商业酒款或目标风格的主要芳香，可能包含基础风格之外的特色原料或工艺特征。',
          '外观应与声明商业酒款或目标描述一致。',
          '风味应围绕声明目标展开，基础啤酒、特殊原料和工艺特征需要协调；不要求落入单一经典风格。',
          '口感随目标酒款变化，但应与声明描述一致且无明显技术缺陷。',
          '2021 指南将 2015 的 Clone Beer 改名为 Commercial Specialty Beer，并重写为更宽的商业特种啤酒入口；参赛者需说明目标商业酒款或足够清晰的描述。',
          '随声明目标变化',
          '特种啤酒，商业酒款，复刻，混合风格'
        )
        : { ...(style.details || {}) },
    });
  }
}

const categoryUpdates = new Map([
  ['26', { name_en: 'Monastic Ale', name_zh: '修道院爱尔' }],
  ['33', { name_en: 'Wood Beer', name_zh: '木材啤酒' }],
]);

const categories = data.categories.map((category) => ({
  ...category,
  ...(categoryUpdates.get(category.id) || {}),
}));

const relations = data.relations
  .map((relation) => ({
    ...relation,
    source: relation.source === '27A' ? '23G' : relation.source,
    target: relation.target === '27A' ? '23G' : relation.target,
  }))
  .filter((relation) => migrated.has(relation.source) && migrated.has(relation.target));

const styles = officialOrder.map((key) => {
  const style = migrated.get(key);
  if (!style) throw new Error(`Missing style ${key}`);
  return style;
});

const output = { categories, styles, relations };
fs.writeFileSync(dataPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(root, 'docs', 'data.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');

console.log(`styles=${styles.length}`);
console.log(`output=${dataPath}`);
