const ACTIVE_TASTE_DIMENSIONS = [
  ['sweetness', '甜度'],
  ['sourness', '酸度'],
  ['bitterness', '苦味'],
  ['body', '酒体'],
  ['strength', '强度'],
];

const DETAIL_SECTIONS = [
  ['overall_impression', '总体印象'],
  ['aroma', '香气'],
  ['appearance', '外观'],
  ['flavor', '风味'],
  ['mouthfeel', '口感'],
  ['comments', '备注'],
  ['history', '历史'],
  ['ingredients', '原料'],
  ['comparison', '风格比较'],
  ['commercial_examples', '商业案例'],
];

function searchBeerStyles(catalog, query, limit = 8) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  return allStyles(catalog)
    .map((style) => ({ style, score: scoreSearch(style, normalizedQuery) }))
    .filter((item) => Number.isFinite(item.score))
    .sort((left, right) =>
      left.score - right.score ||
      compareStyleIds(left.style, right.style),
    )
    .slice(0, normalizeLimit(limit, 8))
    .map(({ style }) => styleSummary(style));
}

function recommendBeerStyles(catalog, preferences = {}, limit = 6, options = {}) {
  const normalizedPreferences = Object.fromEntries(
    ACTIVE_TASTE_DIMENSIONS.map(([id]) => [id, normalizeTasteValue(preferences[id])]),
  );
  const requestedActive = Array.isArray(options.activeDimensions)
    ? new Set(options.activeDimensions)
    : null;
  const activeDimensions = ACTIVE_TASTE_DIMENSIONS.filter(([id]) =>
    requestedActive ? requestedActive.has(id) : normalizedPreferences[id] !== 0,
  );

  return allStyles(catalog)
    .map((style) => scoreTaste(style, normalizedPreferences, activeDimensions))
    .sort((left, right) =>
      right.matchScore - left.matchScore ||
      right.exactCount - left.exactCount ||
      compareStyleIds(left.style, right.style),
    )
    .slice(0, normalizeLimit(limit, 6))
    .map(({ style, matchScore, matchReasons }) => ({
      ...styleSummary(style),
      tasteProfile: normalizeTasteProfile(style.tasteProfile),
      matchScore,
      matchReasons,
    }));
}

function getBeerStyleDetail(catalog, styleRef) {
  const style = findStyle(catalog, styleRef);
  if (!style) return null;

  if (style.kind === 'extension') {
    return {
      style: styleSummary(style),
      sourceLabel: style.sourceLabel || '市场扩展风格',
      description: normalizeContent(style.description),
      bjcpNote: normalizeContent(style.bjcpNote),
      bjcpRefs: (style.bjcpRefs || [])
        .map((id) => findStyle(catalog, { kind: 'bjcp', id }))
        .filter(Boolean)
        .map(styleSummary),
    };
  }

  const category = (catalog.categories || []).find((item) => item.id === style.category) || null;
  const details = style.details || {};

  return {
    style: styleSummary(style),
    category,
    stats: normalizeStats(details.stats || details.vital_statistics),
    sections: DETAIL_SECTIONS
      .map(([key, label]) => ({
        key,
        label,
        content: normalizeContent(details[key]),
      }))
      .filter((section) => section.content),
    tags: normalizeTags(details.tags),
  };
}

function findAcademyArticles(catalog, query, limit = 6) {
  const normalizedQuery = normalizeText(query);
  const articles = catalog.academyArticles || [];

  return articles
    .map((article) => ({
      article,
      score: normalizedQuery ? scoreArticle(article, normalizedQuery) : 0,
    }))
    .filter((item) => Number.isFinite(item.score))
    .sort((left, right) =>
      left.score - right.score ||
      String(right.article.publishedAt || '').localeCompare(String(left.article.publishedAt || '')) ||
      left.article.slug.localeCompare(right.article.slug),
    )
    .slice(0, normalizeLimit(limit, 6))
    .map(({ article }) => ({
      slug: article.slug,
      title: article.title,
      description: article.description,
      type: article.type,
      difficulty: article.difficulty,
      readingTime: article.readingTime,
      tags: article.tags || [],
      relatedStyles: article.relatedStyles || [],
      publishedAt: article.publishedAt,
      route: `/subpages/academy-article/index?slug=${encodeURIComponent(article.slug)}`,
    }));
}

function resolveStyleSummary(catalog, styleRef) {
  const style = findStyle(catalog, styleRef);
  return style ? styleSummary(style) : null;
}

function allStyles(catalog) {
  return [
    ...(catalog.bjcpStyles || []),
    ...(catalog.extensionStyles || []),
  ];
}

function findStyle(catalog, styleRef) {
  if (!styleRef || !styleRef.id) return null;
  const kind = styleRef.kind === 'extension' ? 'extension' : 'bjcp';
  const styles = kind === 'extension' ? catalog.extensionStyles : catalog.bjcpStyles;
  const normalizedId = String(styleRef.id).trim().toLowerCase();
  return (styles || []).find((style) =>
    String(style.id).toLowerCase() === normalizedId ||
    String(style.code || '').toLowerCase() === normalizedId,
  ) || null;
}

function styleSummary(style) {
  return {
    styleRef: {
      kind: style.kind === 'extension' ? 'extension' : 'bjcp',
      id: style.id,
    },
    id: style.id,
    kind: style.kind === 'extension' ? 'extension' : 'bjcp',
    code: style.code || '',
    displayName: style.displayName || style.name_zh || style.name_en || style.id,
    name_zh: style.name_zh || '',
    name_en: style.name_en || '',
    aliases: Array.isArray(style.aliases) ? style.aliases : [],
    sourceLabel: style.sourceLabel || '',
    route: style.kind === 'extension'
      ? `/subpages/extension-style/index?styleId=${encodeURIComponent(style.id)}`
      : `/subpages/style/index?styleId=${encodeURIComponent(style.id)}`,
  };
}

function scoreSearch(style, query) {
  const identityTerms = [
    style.id,
    style.code,
  ].map(normalizeText).filter(Boolean);
  const canonicalTerms = [
    style.name_zh,
    style.name_en,
    style.displayName,
  ].map(normalizeText).filter(Boolean);
  const aliasTerms = (style.aliases || []).map(normalizeText).filter(Boolean);
  const supportingTerms = style.kind === 'extension'
    ? [style.description, style.bjcpNote]
    : Object.values(style.details || {});
  const supportingText = supportingTerms.map(normalizeText).join(' ');

  if (identityTerms.some((term) => term === query)) return 0;
  if (canonicalTerms.some((term) => term === query)) return 1;
  if (aliasTerms.some((term) => term === query)) return style.kind === 'extension' ? 1.5 : 2;
  if ([...identityTerms, ...canonicalTerms].some((term) => term.startsWith(query))) return 3;
  if ([...identityTerms, ...canonicalTerms, ...aliasTerms].some((term) => term.includes(query))) return 4;
  if (supportingText.includes(query)) return 5;
  return Infinity;
}

function scoreTaste(style, preferences, activeDimensions) {
  const profile = normalizeTasteProfile(style.tasteProfile);
  if (!activeDimensions.length) {
    return {
      style,
      matchScore: style.key ? 72 : 64,
      exactCount: 0,
      matchReasons: ['适合作为风格探索入口'],
    };
  }

  let score = 50;
  let exactCount = 0;
  const matchReasons = [];

  activeDimensions.forEach(([id, label]) => {
    const expected = preferences[id];
    const actual = profile[id];
    if (actual === expected) {
      exactCount += 1;
      score += 18;
      matchReasons.push(`${label}${tasteDirectionLabel(expected)}`);
    } else if (actual === 0) {
      score += 7;
    } else {
      score -= 12;
    }
  });

  return {
    style,
    matchScore: Math.max(1, Math.min(99, score)),
    exactCount,
    matchReasons: matchReasons.length ? matchReasons : ['部分接近当前口味偏好'],
  };
}

function scoreArticle(article, query) {
  const primaryTerms = [article.title, article.slug, ...(article.tags || [])]
    .map(normalizeText)
    .filter(Boolean);
  const body = [
    article.description,
    ...(article.sections || []).flatMap((section) => [
      section.title,
      ...(section.paragraphs || []),
    ]),
  ].map(normalizeText).join(' ');

  if (primaryTerms.some((term) => term === query)) return 0;
  if (primaryTerms.some((term) => term.includes(query))) return 1;
  if (body.includes(query)) return 2;
  return Infinity;
}

function normalizeTasteProfile(profile = {}) {
  return Object.fromEntries(
    ACTIVE_TASTE_DIMENSIONS.map(([id]) => [id, normalizeTasteValue(profile[id])]),
  );
}

function normalizeTasteValue(value) {
  const numeric = Number(value);
  return numeric === -1 || numeric === 1 ? numeric : 0;
}

function tasteDirectionLabel(value) {
  return value === 1 ? '偏高' : '偏低';
}

function normalizeStats(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf(':');
      return separatorIndex === -1
        ? { label: '参数', value: part }
        : {
            label: part.slice(0, separatorIndex).trim(),
            value: part.slice(separatorIndex + 1).trim(),
          };
    });
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || '')
    .split(/[，,。]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeContent(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeLimit(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) return fallback;
  return Math.min(Math.floor(numeric), 30);
}

function compareStyleIds(left, right) {
  return String(left.code || left.id).localeCompare(
    String(right.code || right.id),
    'en',
    { numeric: true },
  );
}

module.exports = {
  ACTIVE_TASTE_DIMENSIONS,
  findAcademyArticles,
  getBeerStyleDetail,
  recommendBeerStyles,
  resolveStyleSummary,
  searchBeerStyles,
};
