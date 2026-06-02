import { beerData } from '../data/beer-data.js';
import { extensionGroups, extensionStyles } from '../data/extension-styles.js';
import { styleLanguageMap } from '../data/style-language-map.js';
import { styleAliases } from '../data/style-aliases.js';
import { SUPER_GROUPS } from './super-groups.js';

const DETAIL_SECTIONS = [
  ['overall_impression', '整体印象'],
  ['aroma', '香气'],
  ['appearance', '外观'],
  ['flavor', '风味'],
  ['mouthfeel', '口感'],
  ['history', '历史'],
  ['ingredients', '特色原料'],
  ['comparison', '风格对比'],
  ['comments', '注释'],
  ['commercial_examples', '商业例子'],
];

const RELATION_LABELS = {
  related: '相关',
  influenced_by: '受影响',
  compared_to: '对比',
};

const TASTE_FILTERS = [
  {
    id: 'sweetness',
    label: '甜度',
    lowLabel: '不甜',
    neutralLabel: '中立',
    highLabel: '甜',
    reasonLabels: { '-1': '不甜', 0: '甜度适中', 1: '有甜感' },
  },
  {
    id: 'sourness',
    label: '酸感',
    lowLabel: '不酸',
    neutralLabel: '中立',
    highLabel: '喝酸',
    reasonLabels: { '-1': '不酸', 0: '酸感适中', 1: '有酸感' },
  },
  {
    id: 'bitterness',
    label: '苦度',
    lowLabel: '低苦',
    neutralLabel: '中立',
    highLabel: '高苦',
    reasonLabels: { '-1': '低苦', 0: '苦度适中', 1: '苦味明显' },
  },
  {
    id: 'body',
    label: '酒体',
    lowLabel: '轻盈',
    neutralLabel: '中立',
    highLabel: '厚重',
    reasonLabels: { '-1': '酒体轻盈', 0: '酒体适中', 1: '酒体饱满' },
  },
  {
    id: 'roast',
    label: '烘烤',
    lowLabel: '清淡',
    neutralLabel: '中立',
    highLabel: '烘烤',
    reasonLabels: { '-1': '少烘烤', 0: '烘烤适中', 1: '烘烤深色' },
  },
  {
    id: 'fruitiness',
    label: '果香',
    lowLabel: '少果香',
    neutralLabel: '中立',
    highLabel: '果香',
    reasonLabels: { '-1': '果香内敛', 0: '果香适中', 1: '果香明显' },
  },
  {
    id: 'hopAroma',
    label: '酒花香',
    lowLabel: '少酒花',
    neutralLabel: '中立',
    highLabel: '酒花香',
    reasonLabels: { '-1': '酒花内敛', 0: '酒花适中', 1: '酒花香明显' },
  },
  {
    id: 'fermentation',
    label: '发酵',
    lowLabel: '干净',
    neutralLabel: '中立',
    highLabel: '个性',
    reasonLabels: { '-1': '发酵干净', 0: '发酵适中', 1: '发酵个性明显' },
  },
  {
    id: 'strength',
    label: '强度',
    lowLabel: '轻盈',
    neutralLabel: '中立',
    highLabel: '强劲',
    reasonLabels: { '-1': '强度轻盈', 0: '强度适中', 1: '酒精强度高' },
  },
];

const categoryById = new Map();
const styleById = new Map();
const stylesByCategory = new Map();
const stylesByGroup = new Map();
const relationsByStyle = new Map();
const groupById = new Map(SUPER_GROUPS.map((group) => [group.id, group]));
const groupByCategory = new Map();
const extensionGroupById = new Map(extensionGroups.map((group) => [group.id, group]));
const extensionStyleById = new Map();
const extensionStylesByGroup = new Map();
const styleLanguageSearchTermsByRef = buildStyleLanguageSearchTerms();

SUPER_GROUPS.forEach((group) => {
  group.categories.forEach((categoryId) => groupByCategory.set(categoryId, group));
});

const categories = beerData.categories.map((category) => {
  const group = groupByCategory.get(category.id) || SUPER_GROUPS[0];
  const enriched = {
    ...category,
    superGenreId: group.id,
    groupId: group.id,
    color: group.color,
  };
  categoryById.set(enriched.id, enriched);
  return enriched;
});

const styles = beerData.styles.map((style) => {
  const category = categoryById.get(style.category);
  const group = category ? groupById.get(category.groupId) : SUPER_GROUPS[0];
  const aliases = styleAliases[style.code || style.id] || [];
  const languageTerms = styleLanguageSearchTermsByRef.get(`bjcp:${style.code || style.id}`) || [];
  const enriched = {
    ...style,
    id: style.id || style.code,
    code: style.code || style.id,
    aliases,
    displayName: style.name_zh || style.name_en || style.code || style.id,
    details: style.details || {},
    superGenreId: group.id,
    groupId: group.id,
    color: group.color,
    searchText: `${style.id || ''} ${style.code || ''} ${style.name_zh || ''} ${style.name_en || ''} ${aliases.join(' ')} ${languageTerms.join(' ')}`.toLowerCase(),
  };
  styleById.set(enriched.id, enriched);
  styleById.set(enriched.code, enriched);
  if (!stylesByCategory.has(enriched.category)) stylesByCategory.set(enriched.category, []);
  stylesByCategory.get(enriched.category).push(enriched);
  if (!stylesByGroup.has(enriched.groupId)) stylesByGroup.set(enriched.groupId, []);
  stylesByGroup.get(enriched.groupId).push(enriched);
  relationsByStyle.set(enriched.id, []);
  return enriched;
});

const enrichedExtensionStyles = extensionStyles.map((style) => {
  const group = extensionGroupById.get(style.groupId);
  const languageTerms = styleLanguageSearchTermsByRef.get(`extension:${style.id}`) || [];
  const enriched = {
    ...style,
    kind: 'extension',
    aliases: Array.isArray(style.aliases) ? style.aliases : [],
    displayName: style.name_zh || style.name_en || style.id,
    color: group ? group.color : '#f6ad55',
    sourceLabel: style.sourceLabel || 'BA/WBC/GABF 扩展风格',
    searchText: `${style.id || ''} ${style.name_zh || ''} ${style.name_en || ''} ${(style.aliases || []).join(' ')} ${languageTerms.join(' ')}`.toLowerCase(),
  };
  extensionStyleById.set(enriched.id, enriched);
  if (!extensionStylesByGroup.has(enriched.groupId)) extensionStylesByGroup.set(enriched.groupId, []);
  extensionStylesByGroup.get(enriched.groupId).push(enriched);
  return enriched;
});

const relations = (beerData.relations || [])
  .map((relation) => {
    const source = styleById.get(relation.source);
    const target = styleById.get(relation.target);
    if (!source || !target) return null;
    return {
      ...relation,
      source,
      target,
      label: RELATION_LABELS[relation.type] || relation.type,
    };
  })
  .filter(Boolean);

relations.forEach((relation) => {
  const sourceRelations = relationsByStyle.get(relation.source.id);
  const targetRelations = relationsByStyle.get(relation.target.id);
  if (sourceRelations) sourceRelations.push(relation);
  if (targetRelations) targetRelations.push(relation);
});

export function getSuperGroups() {
  return SUPER_GROUPS.map((group) => {
    const groupCategories = categories.filter((category) => category.groupId === group.id);
    const groupStyles = stylesByGroup.get(group.id) || [];
    return {
      ...group,
      categoryCount: groupCategories.length,
      styleCount: groupStyles.length,
      categories: [...group.categories],
    };
  });
}

export function getExtensionGroups() {
  return extensionGroups.map((group) => ({
    ...group,
    styleCount: (extensionStylesByGroup.get(group.id) || []).length,
  }));
}

export function getGuideOverview() {
  const groups = getSuperGroups();
  const marketGroups = getExtensionGroups();
  return {
    groupCount: groups.length,
    standardStyleCount: groups.reduce((sum, group) => sum + group.styleCount, 0),
    extensionGroupCount: marketGroups.length,
    extensionStyleCount: marketGroups.reduce((sum, group) => sum + group.styleCount, 0),
  };
}

export function getExtensionGroupDetail(groupId) {
  const group = extensionGroupById.get(groupId);
  if (!group) throw new Error(`Unknown extension group: ${groupId}`);
  const groupStyles = extensionStylesByGroup.get(group.id) || [];
  return {
    group: {
      ...group,
      styleCount: groupStyles.length,
    },
    styles: groupStyles.map(toExtensionSummary),
  };
}

export function getExtensionStyleDetail(styleId) {
  const style = extensionStyleById.get(styleId);
  if (!style) return null;

  const group = extensionGroupById.get(style.groupId);
  return {
    style: toExtensionSummary(style),
    group: {
      ...group,
      styleCount: (extensionStylesByGroup.get(style.groupId) || []).length,
    },
    sourceLabel: style.sourceLabel,
    description: normalizeContent(style.description),
    bjcp_note: normalizeContent(style.bjcp_note),
    bjcp_refs: (style.bjcp_refs || [])
      .map((id) => styleById.get(id))
      .filter(Boolean)
      .map(toStyleSummary),
  };
}

export function getStyleLanguageGroups() {
  return styleLanguageMap.map(toStyleLanguageGroupSummary);
}

export function getStyleLanguageDetail(languageId) {
  const group = styleLanguageMap.find((item) => item.id === languageId);
  if (!group) return null;

  return {
    group: toStyleLanguageGroupSummary(group),
    styles: group.styles
      .map(resolveStyleLanguageRef)
      .filter(Boolean),
  };
}

export function getGroupDetail(groupId) {
  const group = getGroup(groupId);
  const groupCategories = categories.filter((category) => category.groupId === group.id);
  const groupStyles = stylesByGroup.get(group.id) || [];
  return {
    group: {
      ...group,
      categoryCount: groupCategories.length,
      styleCount: groupStyles.length,
    },
    categories: groupCategories.map((category) => ({
      ...toCategorySummary(category),
      styles: (stylesByCategory.get(category.id) || []).map(toStyleSummary),
      styleCount: (stylesByCategory.get(category.id) || []).length,
    })),
    styles: groupStyles.map(toStyleSummary),
  };
}

export function getStyleDetail(styleId) {
  const style = styleById.get(styleId);
  if (!style) return null;

  const category = categoryById.get(style.category);
  const group = groupById.get(style.groupId);
  const related = (relationsByStyle.get(style.id) || []).map((relation) => {
    const other = relation.source.id === style.id ? relation.target : relation.source;
    return {
      type: relation.type,
      label: relation.label,
      styleId: other.id,
      styleCode: other.code,
      styleName: other.displayName,
      style: toStyleSummary(other),
    };
  });

  return {
    style: toStyleSummary(style),
    category: toCategorySummary(category),
    group,
    stats: normalizeStats(style.details.stats || style.details.vital_statistics),
    sections: DETAIL_SECTIONS.map(([key, label]) => ({
      key,
      label,
      content: normalizeContent(style.details[key]),
    })).filter((section) => section.content),
    tags: Array.isArray(style.details.tags) ? style.details.tags : [],
    related,
  };
}

export function searchStyles(query, limit = 30) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) return [];

  return [
    ...styles.filter((style) => style.searchText.includes(normalized)),
    ...enrichedExtensionStyles.filter((style) => style.searchText.includes(normalized)),
  ]
    .sort((a, b) => scoreSearchResult(a, normalized) - scoreSearchResult(b, normalized))
    .slice(0, limit)
    .map((style) => (style.kind === 'extension' ? toExtensionSummary(style) : toStyleSummary(style)));
}

export function getTasteFilters() {
  return TASTE_FILTERS.map((filter) => ({
    id: filter.id,
    label: filter.label,
    options: [
      { value: -1, label: filter.lowLabel },
      { value: 0, label: filter.neutralLabel },
      { value: 1, label: filter.highLabel },
    ],
  }));
}

export function getTasteMatches(filterState = {}, limit = 18) {
  const normalizedFilters = normalizeTasteFilterState(filterState);
  const activeFilters = Object.entries(normalizedFilters).filter(([, value]) => value !== 0);
  const candidateStyles = [...styles, ...enrichedExtensionStyles];

  return candidateStyles
    .map((style) => scoreTasteMatch(style, normalizedFilters, activeFilters))
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.exactCount - a.exactCount ||
        b.matchScore - a.matchScore ||
        b.partialCount - a.partialCount ||
        compareStyleCode(a.style, b.style),
    )
    .slice(0, limit)
    .map(({ style, matchScore, matchReasons }) => ({
      ...(style.kind === 'extension' ? toExtensionSummary(style) : toStyleSummary(style)),
      taste_profile: normalizeTasteProfile(style.taste_profile),
      matchScore,
      matchReasons,
    }));
}

export function getCategoryStyles(categoryId) {
  return stylesByCategory.get(categoryId) || [];
}

function getGroup(groupId) {
  const group = groupById.get(groupId);
  if (!group) throw new Error(`Unknown beer group: ${groupId}`);
  return group;
}

function compareStyleCode(a, b) {
  return String(a.code || a.id || '').localeCompare(String(b.code || b.id || ''), 'en', { numeric: true });
}

function toCategorySummary(category) {
  return {
    id: category.id,
    name_zh: category.name_zh,
    name_en: category.name_en,
    superGenreId: category.superGenreId,
    groupId: category.groupId,
    color: category.color,
  };
}

function toStyleSummary(style) {
  return {
    id: style.id,
    kind: 'bjcp',
    code: style.code,
    aliases: style.aliases || [],
    displayName: style.displayName,
    name_zh: style.name_zh,
    name_en: style.name_en,
    category: style.category,
    superGenreId: style.superGenreId,
    groupId: style.groupId,
    color: style.color,
  };
}

function toExtensionSummary(style) {
  return {
    id: style.id,
    kind: 'extension',
    code: '',
    aliases: style.aliases || [],
    displayName: style.displayName,
    name_zh: style.name_zh,
    name_en: style.name_en,
    groupId: style.groupId,
    color: style.color,
    sourceLabel: style.sourceLabel,
  };
}

function toStyleLanguageGroupSummary(group) {
  return {
    id: group.id,
    title: group.title,
    subtitle: group.subtitle,
    keywords: Array.isArray(group.keywords) ? [...group.keywords] : [],
    explanation: group.explanation || '',
    keywordCount: Array.isArray(group.keywords) ? group.keywords.length : 0,
    styleCount: Array.isArray(group.styles) ? group.styles.length : 0,
  };
}

function resolveStyleLanguageRef(styleRef) {
  if (!styleRef || !styleRef.id) return null;
  const style = styleRef.kind === 'extension' ? extensionStyleById.get(styleRef.id) : styleById.get(styleRef.id);
  if (!style) return null;

  return {
    ...(style.kind === 'extension' ? toExtensionSummary(style) : toStyleSummary(style)),
    socialAlias: styleRef.alias || '',
    reason: styleRef.reason || '',
    caution: styleRef.caution || '',
  };
}

function buildStyleLanguageSearchTerms() {
  const termsByRef = new Map();

  styleLanguageMap.forEach((group) => {
    const groupTerms = [
      group.title,
      group.subtitle,
      group.explanation,
      ...(Array.isArray(group.keywords) ? group.keywords : []),
    ].filter(Boolean);

    (group.styles || []).forEach((styleRef) => {
      const key = `${styleRef.kind}:${styleRef.id}`;
      const terms = termsByRef.get(key) || [];
      terms.push(...groupTerms, styleRef.alias, styleRef.reason, styleRef.caution);
      termsByRef.set(key, terms.filter(Boolean));
    });
  });

  return termsByRef;
}

function normalizeTasteFilterState(filterState) {
  return Object.fromEntries(
    TASTE_FILTERS.map((filter) => [filter.id, normalizeTasteValue(filterState[filter.id])]),
  );
}

function normalizeTasteProfile(profile = {}) {
  return Object.fromEntries(
    TASTE_FILTERS.map((filter) => [filter.id, normalizeTasteValue(profile[filter.id])]),
  );
}

function normalizeTasteValue(value) {
  const numeric = Number(value);
  if (numeric === -1 || numeric === 1) return numeric;
  return 0;
}

function scoreTasteMatch(style, normalizedFilters, activeFilters) {
  const profile = normalizeTasteProfile(style.taste_profile);
  const exactReasons = [];
  const partialReasons = [];
  let exactCount = 0;
  let partialCount = 0;
  let score = 54;

  if (!activeFilters.length) {
    return {
      style,
      matchScore: style.key ? 72 : 64,
      matchReasons: ['可作为入门探索'],
    };
  }

  for (const [dimension, requestedValue] of activeFilters) {
    const profileValue = profile[dimension];
    const filter = TASTE_FILTERS.find((item) => item.id === dimension);
    if (profileValue === -requestedValue) return null;

    if (profileValue === requestedValue) {
      score += 16;
      exactCount += 1;
      exactReasons.push(filter.reasonLabels[requestedValue]);
    } else {
      score += 7;
      partialCount += 1;
      partialReasons.push(filter.reasonLabels[0]);
    }
  }

  if (style.key) score += 3;
  score += getTasteNameBoost(style, normalizedFilters);

  const scoreCap = partialCount > 0 ? 88 : 99;

  return {
    style,
    exactCount,
    partialCount,
    matchScore: Math.min(scoreCap, score),
    matchReasons: [...exactReasons, ...partialReasons].slice(0, 3),
  };
}

function getTasteNameBoost(style, normalizedFilters) {
  const text = `${style.name_zh || ''} ${style.name_en || ''}`.toLowerCase();
  let boost = 0;

  if (normalizedFilters.sweetness === 1 && /甜|sweet|dessert|pastry/.test(text)) boost += 8;
  if (normalizedFilters.sourness === 1 && /酸|sour|gose|lambic|gueuze|berliner|flanders/.test(text)) boost += 8;
  if (normalizedFilters.bitterness === 1 && /苦|bitter|ipa|pils/.test(text)) boost += 6;
  if (normalizedFilters.roast === 1 && /世涛|波特|stout|porter|dark|black/.test(text)) boost += 5;
  if (normalizedFilters.fruitiness === 1 && /水果|fruit|hazy|lambic|saison/.test(text)) boost += 5;
  if (normalizedFilters.hopAroma === 1 && /hop|hoppy|ipa|pils|pale ale/.test(text)) boost += 6;
  if (normalizedFilters.fermentation === 1 && /belgian|saison|lambic|gueuze|brett|wild|weiss|weizen/.test(text)) boost += 6;
  if (normalizedFilters.strength === 1 && /strong|double|imperial|barley|bock|wine|quadrupel/.test(text)) boost += 5;

  return boost;
}

function normalizeStats(stats) {
  if (!stats) return [];
  if (typeof stats === 'object' && !Array.isArray(stats)) {
    return Object.entries(stats)
      .filter(([, value]) => value)
      .map(([label, value]) => ({ label, value: String(value) }));
  }
  return String(stats)
    .split(/\n|;|,|\|/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [label, ...rest] = item.split(':');
      return rest.length ? { label: label.trim(), value: rest.join(':').trim() } : { label: '参数', value: item };
    });
}

function normalizeContent(content) {
  if (!content) return '';
  if (Array.isArray(content)) return content.filter(Boolean).join('\n');
  return String(content).trim();
}

function scoreSearchResult(style, query) {
  if (style.kind === 'extension') {
    const nameZh = (style.name_zh || '').toLowerCase();
    const nameEn = (style.name_en || '').toLowerCase();
    const aliases = (style.aliases || []).map((alias) => alias.toLowerCase());
    if (nameZh === query || nameEn === query) return 2.5;
    if (aliases.some((alias) => alias === query)) return 3.5;
    if (nameZh.includes(query)) return 4.5;
    if (aliases.some((alias) => alias.startsWith(query))) return 5.5;
    if (aliases.some((alias) => alias.includes(query))) return 6.5;
    if (nameEn.includes(query)) return 7.5;
    return 8;
  }
  const code = (style.code || '').toLowerCase();
  const nameZh = (style.name_zh || '').toLowerCase();
  const nameEn = (style.name_en || '').toLowerCase();
  const aliases = (style.aliases || []).map((alias) => alias.toLowerCase());
  if (code === query) return 0;
  if (code.startsWith(query)) return 1;
  if (nameZh.includes(query)) return 2;
  if (aliases.some((alias) => alias === query)) return 3;
  if (aliases.some((alias) => alias.startsWith(query))) return 4;
  if (aliases.some((alias) => alias.includes(query))) return 5;
  if (nameEn.includes(query)) return 6;
  return 7;
}
