import { beerData } from '../data/beer-data.js';
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

const categoryById = new Map();
const styleById = new Map();
const stylesByCategory = new Map();
const stylesByGroup = new Map();
const relationsByStyle = new Map();
const groupById = new Map(SUPER_GROUPS.map((group) => [group.id, group]));
const groupByCategory = new Map();

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
    searchText: `${style.id || ''} ${style.code || ''} ${style.name_zh || ''} ${style.name_en || ''} ${aliases.join(' ')}`.toLowerCase(),
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

  return styles
    .filter((style) => style.searchText.includes(normalized))
    .sort((a, b) => scoreSearchResult(a, normalized) - scoreSearchResult(b, normalized))
    .slice(0, limit)
    .map(toStyleSummary);
}

export function getCategoryStyles(categoryId) {
  return stylesByCategory.get(categoryId) || [];
}

function getGroup(groupId) {
  const group = groupById.get(groupId);
  if (!group) throw new Error(`Unknown beer group: ${groupId}`);
  return group;
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
