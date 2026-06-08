import { academySites } from '../../data/academy-sites.js';
import { getExtensionStyleDetail, getStyleDetail } from '../../utils/beer-model.js';

const siteBySlug = new Map(academySites.map((site) => [site.slug, site]));
const EXPERIENCE_KEYS = {
  'ipa-family-map': 'ipa-map',
  'ale-vs-lager': 'ale-lager',
  'flavor-radar-basics': 'flavor-radar',
  'cold-ipa': 'cold-ipa',
};

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
