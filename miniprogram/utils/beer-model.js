import { beerData } from '../data/beer-data.js';
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
  const enriched = {
    ...style,
    id: style.id || style.code,
    code: style.code || style.id,
    displayName: style.name_zh || style.name_en || style.code || style.id,
    details: style.details || {},
    superGenreId: group.id,
    groupId: group.id,
    color: group.color,
    searchText: `${style.id || ''} ${style.code || ''} ${style.name_zh || ''} ${style.name_en || ''}`.toLowerCase(),
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
    relations: relations
      .filter((relation) => relation.source.groupId === group.id || relation.target.groupId === group.id)
      .map(toRelationSummary),
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

export function buildMiniMap(groupId, size = {}) {
  const width = Number(size.width) || 375;
  const height = Number(size.height) || 420;
  const detail = getGroupDetail(groupId);
  const nodeById = new Map();
  const nodes = [];
  const marginX = 34;
  const marginY = 52;
  const usableWidth = Math.max(1, width - marginX * 2);
  const usableHeight = Math.max(1, height - marginY * 2);

  const columnCount = width >= 330 ? 3 : 2;
  const rowCount = Math.ceil(detail.styles.length / columnCount);
  const columnGap = usableWidth / Math.max(columnCount - 1, 1);
  const rowGap = usableHeight / Math.max(rowCount - 1, 1);

  detail.styles.forEach((style, index) => {
    const row = Math.floor(index / columnCount);
    const col = index % columnCount;
    const label = style.displayName;
    const labelWidth = clamp(label.length * 12 + 26, 82, columnCount === 2 ? 138 : 112);
    const labelHeight = label.length > 6 ? 42 : 34;
    const x = columnCount === 1 ? width / 2 : marginX + col * columnGap;
    const y = rowCount === 1 ? height / 2 : marginY + row * rowGap;
    const node = {
      id: style.id,
      code: style.code,
      name: style.displayName,
      nameEn: style.name_en || '',
      label,
      categoryId: style.category,
      groupId: style.groupId,
      color: style.color,
      x: clamp(x, labelWidth / 2 + 8, width - labelWidth / 2 - 8),
      y: clamp(y, labelHeight / 2 + 8, height - labelHeight / 2 - 8),
      width: labelWidth,
      height: labelHeight,
      radius: 8,
      hitRadius: Math.max(labelWidth, labelHeight) / 2,
    };
    nodes.push(node);
    nodeById.set(node.id, node);
  });

  const links = detail.relations
    .map((relation) => ({
      type: relation.type,
      label: relation.label,
      source: nodeById.get(relation.source.id),
      target: nodeById.get(relation.target.id),
    }))
    .filter((link) => link.source && link.target);

  return {
    group: detail.group,
    width,
    height,
    nodes,
    links,
  };
}

export function findMiniMapNodeAt(miniMap, x, y) {
  if (!miniMap) return null;
  for (let index = miniMap.nodes.length - 1; index >= 0; index -= 1) {
    const node = miniMap.nodes[index];
    if (node.width && node.height) {
      const withinX = x >= node.x - node.width / 2 && x <= node.x + node.width / 2;
      const withinY = y >= node.y - node.height / 2 && y <= node.y + node.height / 2;
      if (withinX && withinY) return node;
    }
    const distance = Math.hypot(node.x - x, node.y - y);
    if (distance <= node.hitRadius) return node;
  }
  return null;
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
    displayName: style.displayName,
    name_zh: style.name_zh,
    name_en: style.name_en,
    category: style.category,
    superGenreId: style.superGenreId,
    groupId: style.groupId,
    color: style.color,
  };
}

function toRelationSummary(relation) {
  return {
    type: relation.type,
    label: relation.label,
    source: toStyleSummary(relation.source),
    target: toStyleSummary(relation.target),
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
  if (code === query) return 0;
  if (code.startsWith(query)) return 1;
  if (nameZh.includes(query)) return 2;
  if (nameEn.includes(query)) return 3;
  return 4;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
