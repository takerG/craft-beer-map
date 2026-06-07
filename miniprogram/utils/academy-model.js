import { academySites } from '../data/academy-sites.js';
import { getExtensionStyleDetail, getStyleDetail } from './beer-model.js';

const siteBySlug = new Map(academySites.map((site) => [site.slug, site]));
const TYPE_LABELS = {
  simulator: '工具',
  tool: '工具',
  map: '地图',
  comparison: '对比',
  'visual-story': '图解',
  quiz: '问答',
};
const TYPE_ORDER = ['map', 'comparison', 'simulator', 'tool', 'visual-story', 'quiz'];
const EXPERIENCE_KEYS = {
  'ipa-family-map': 'ipa-map',
  'ale-vs-lager': 'ale-lager',
  'flavor-radar-basics': 'flavor-radar',
  'cold-ipa': 'cold-ipa',
};

export function getAcademySites() {
  return academySites.map(toSiteSummary);
}

export function getAcademyHome() {
  const feedSites = getAcademySites()
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)) || a.slug.localeCompare(b.slug));

  return {
    title: '学院',
    subtitle: '按发布时间更新的精酿互动文章。',
    feedSites,
    filterOptions: buildFilterOptions(feedSites, 'all'),
    stats: {
      siteCount: academySites.length,
    },
  };
}

export function buildAcademyTypeFilters(feedSites, activeType = 'all') {
  return buildFilterOptions(feedSites, activeType);
}

export function getAcademyArticle(slug) {
  const site = siteBySlug.get(slug);
  if (!site) return null;
  const experienceKey = EXPERIENCE_KEYS[slug] || 'custom';
  const modules = normalizeModules(site.modules);

  return {
    ...site,
    experienceKey,
    isIpaMapExperience: experienceKey === 'ipa-map',
    isAleLagerExperience: experienceKey === 'ale-lager',
    isFlavorRadarExperience: experienceKey === 'flavor-radar',
    isColdIpaExperience: experienceKey === 'cold-ipa',
    showDefaultArticleHero: experienceKey !== 'cold-ipa',
    pageThemeClass: experienceKey === 'cold-ipa' ? 'cold-ipa-page' : '',
    selectedComparisonId: 'cold-ipa',
    sections: normalizeSections(site.sections, site.experienceAfterSectionId, experienceKey),
    modules,
    genericModules: experienceKey === 'custom' ? modules : [],
    hasGenericModules: experienceKey === 'custom' && modules.length > 0,
    relatedStyles: resolveRelatedStyles(site.relatedStyles),
  };
}

function toSiteSummary(site) {
  return {
    slug: site.slug,
    title: site.title,
    description: site.description,
    type: site.type,
    difficulty: site.difficulty,
    readingTime: site.readingTime,
    tags: [...site.tags],
    publishedAt: site.publishedAt || site.date || '',
    updatedAt: site.updatedAt || site.publishedAt || site.date || '',
    coverImage: toMiniProgramRootPath(site.coverImage),
    heroMetric: site.heroMetric || '',
    accent: site.accent || '#f6ad55',
    hero: site.hero ? { ...site.hero } : null,
  };
}

function toMiniProgramRootPath(assetPath = '') {
  if (!assetPath) return '';
  return assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
}

function buildFilterOptions(feedSites, activeType) {
  const counts = new Map();
  feedSites.forEach((site) => {
    counts.set(site.type, (counts.get(site.type) || 0) + 1);
  });

  return [
    {
      type: 'all',
      label: '全部',
      count: feedSites.length,
    },
    ...Array.from(counts.entries())
      .sort(([typeA, countA], [typeB, countB]) => {
        const orderA = TYPE_ORDER.includes(typeA) ? TYPE_ORDER.indexOf(typeA) : TYPE_ORDER.length;
        const orderB = TYPE_ORDER.includes(typeB) ? TYPE_ORDER.indexOf(typeB) : TYPE_ORDER.length;
        return orderA - orderB || countB - countA || typeA.localeCompare(typeB);
      })
      .map(([type, count]) => ({
        type,
        label: TYPE_LABELS[type] || '内容',
        count,
      })),
  ].map((option) => ({
    ...option,
    className: option.type === activeType ? 'filter-chip is-active' : 'filter-chip',
  }));
}

function normalizeModules(modules = []) {
  return modules.map((module, moduleIndex) => ({
    ...module,
    navLabel: module.title || `第 ${moduleIndex + 1} 节`,
    isTermGrid: module.type === 'term-grid',
    isScale: module.type === 'scale',
    isCards: module.type === 'cards',
    isChecklist: module.type === 'checklist',
    isComparison: module.type === 'comparison',
    isQuiz: module.type === 'quiz',
    points: (module.points || []).map((point) => ({
      ...point,
      level: Math.max(0, Math.min(100, Number(point.level) || 0)),
      levelStyle: `width: ${Math.max(0, Math.min(100, Number(point.level) || 0))}%`,
    })),
    items: (module.items || []).map((item, index) => ({
      ...item,
      itemIndex: index + 1,
      marker: String(index + 1).padStart(2, '0'),
    })),
    columns: (module.columns || []).map((column) => ({
      ...column,
      items: [...(column.items || [])],
    })),
    options: (module.options || []).map((option, index) => ({
      ...option,
      optionIndex: index,
      isIncorrect: !option.correct,
    })),
  }));
}

function normalizeSections(sections = [], experienceAfterSectionId = '', experienceKey = '') {
  return sections.map((section) => {
    const showExperience = section.id === experienceAfterSectionId;
    const companion = normalizeCompanion(section.companion);
    return {
      ...section,
      paragraphs: [...(section.paragraphs || [])],
      callout: section.callout || '',
      hasCallout: Boolean(section.callout),
      companion,
      hasCompanion: Boolean(companion),
      showIpaMapExperience: showExperience && experienceKey === 'ipa-map',
      showAleLagerExperience: showExperience && experienceKey === 'ale-lager',
      showFlavorRadarExperience: showExperience && experienceKey === 'flavor-radar',
      showColdIpaComparison: experienceKey === 'cold-ipa' && Boolean(companion && companion.isColdIpaComparison),
      showColdIpaProcess: experienceKey === 'cold-ipa' && Boolean(companion && companion.isColdIpaProcess),
      showColdIpaChecklist: experienceKey === 'cold-ipa' && Boolean(companion && companion.isColdIpaChecklist),
    };
  });
}

function normalizeCompanion(companion = null) {
  if (!companion || typeof companion !== 'object') return null;
  const type = companion.type || '';
  const isColdIpaComparison = type === 'cold-ipa-comparison';
  const isColdIpaProcess = type === 'cold-ipa-process';
  const isColdIpaChecklist = type === 'cold-ipa-checklist';

  return {
    ...companion,
    isColdIpaComparison,
    isColdIpaProcess,
    isColdIpaChecklist,
    comparisonItems: isColdIpaComparison
      ? (companion.items || []).map((item) => ({
        ...item,
        rows: (item.rows || []).map((row) => ({ ...row })),
      }))
      : [],
    processSteps: isColdIpaProcess
      ? (companion.steps || []).map((step, index) => ({
        ...step,
        marker: String(index + 1),
      }))
      : [],
    checkItems: isColdIpaChecklist
      ? (companion.items || []).map((item, index) => ({
        marker: String(index + 1).padStart(2, '0'),
        label: item,
      }))
      : [],
  };
}

function resolveRelatedStyles(styleRefs = []) {
  return styleRefs
    .map((styleRef) => {
      if (String(styleRef).startsWith('ext-')) {
        const detail = getExtensionStyleDetail(styleRef);
        return detail ? detail.style : null;
      }

      const detail = getStyleDetail(styleRef);
      return detail ? detail.style : null;
    })
    .filter(Boolean)
    .map((style) => ({
      ...style,
      codeLabel: style.kind === 'extension' ? '扩展' : style.code,
    }));
}
