import { getAcademyArticle } from '../utils/academy-model.js';
import { navigateOnce, switchTabOnce } from '../../utils/page-performance.js';
import { buildShareMessage, buildTimelineShareMessage, enableShareMenu } from '../../utils/share.js';
import { trackEvent } from '../../utils/telemetry.js';

Page({
  data: {
    slug: '',
    loadStatus: 'loading',
    isLoading: true,
    isNotFound: false,
    isError: false,
    isReady: false,
    article: null,
    articleSections: [],
    selectedIpaBranchId: 'west-coast',
    selectedFermentationPathId: 'ale',
    selectedFlavorSourceId: 'malt',
    selectedColdIpaComparisonId: 'cold-ipa',
  },

  onLoad(options = {}) {
    enableShareMenu();
    this.loadArticle(options.slug || '');
  },

  onShareAppMessage() {
    const article = this.data.article;
    trackEvent('academy_article_share', { slug: article ? article.slug : this.data.slug });
    return buildShareMessage({
      title: article ? `精酿知识：${article.title}` : '精酿知识速查',
      path: `/subpages/academy-article/index?slug=${this.data.slug}`,
    });
  },

  onShareTimeline() {
    const article = this.data.article;
    const slug = article ? article.slug : this.data.slug;
    trackEvent('academy_article_timeline_share', { slug });
    return buildTimelineShareMessage({
      title: article ? `精酿知识：${article.title}` : '精酿知识速查',
      query: `slug=${slug}`,
    });
  },

  async loadArticle(slug) {
    this.setData({
      slug,
      loadStatus: 'loading',
      isLoading: true,
      isNotFound: false,
      isError: false,
      isReady: false,
      article: null,
      articleSections: [],
    });

    let article = null;
    try {
      article = await getAcademyArticle(slug);
    } catch (error) {
      trackEvent('academy_article_load_error', { slug, message: getErrorMessage(error) });
      this.setData({
        slug,
        loadStatus: 'error',
        isLoading: false,
        isNotFound: false,
        isError: true,
        isReady: false,
        article: null,
        articleSections: [],
      });
      return;
    }

    if (!article) {
      this.setData({
        slug,
        loadStatus: 'not-found',
        isLoading: false,
        isNotFound: true,
        isError: false,
        isReady: false,
        article: null,
        articleSections: [],
        selectedIpaBranchId: 'west-coast',
        selectedFermentationPathId: 'ale',
        selectedFlavorSourceId: 'malt',
        selectedColdIpaComparisonId: 'cold-ipa',
      });
      return;
    }

    trackEvent('academy_article_view', { slug });
    const decoratedArticle = decorateArticle(article, {
      selectedIpaBranchId: this.data.selectedIpaBranchId,
      selectedFermentationPathId: this.data.selectedFermentationPathId,
      selectedFlavorSourceId: this.data.selectedFlavorSourceId,
      selectedColdIpaComparisonId: this.data.selectedColdIpaComparisonId,
    });
    this.setData({
      slug,
      loadStatus: 'ready',
      isLoading: false,
      isNotFound: false,
      isError: false,
      isReady: true,
      article: decoratedArticle,
      articleSections: getArticleSections(decoratedArticle),
    });
  },

  selectIpaBranch(event) {
    const { branchId } = event.currentTarget.dataset;
    if (!branchId || branchId === this.data.selectedIpaBranchId) return;

    trackEvent('academy_ipa_branch_select', { slug: this.data.slug, branchId });
    this.setData({
      selectedIpaBranchId: branchId,
      article: decorateArticle(this.data.article, {
        selectedIpaBranchId: branchId,
        selectedFermentationPathId: this.data.selectedFermentationPathId,
        selectedFlavorSourceId: this.data.selectedFlavorSourceId,
        selectedColdIpaComparisonId: this.data.selectedColdIpaComparisonId,
      }),
    });
  },

  selectFermentationPath(event) {
    const { pathId } = event.currentTarget.dataset;
    if (!pathId || pathId === this.data.selectedFermentationPathId) return;

    trackEvent('academy_fermentation_path_select', { slug: this.data.slug, pathId });
    this.setData({
      selectedFermentationPathId: pathId,
      article: decorateArticle(this.data.article, {
        selectedIpaBranchId: this.data.selectedIpaBranchId,
        selectedFermentationPathId: pathId,
        selectedFlavorSourceId: this.data.selectedFlavorSourceId,
        selectedColdIpaComparisonId: this.data.selectedColdIpaComparisonId,
      }),
    });
  },

  selectFlavorSource(event) {
    const { sourceId } = event.currentTarget.dataset;
    if (!sourceId || sourceId === this.data.selectedFlavorSourceId) return;

    trackEvent('academy_flavor_source_select', { slug: this.data.slug, sourceId });
    this.setData({
      selectedFlavorSourceId: sourceId,
      article: decorateArticle(this.data.article, {
        selectedIpaBranchId: this.data.selectedIpaBranchId,
        selectedFermentationPathId: this.data.selectedFermentationPathId,
        selectedFlavorSourceId: sourceId,
        selectedColdIpaComparisonId: this.data.selectedColdIpaComparisonId,
      }),
    });
  },

  selectColdIpaComparison(event) {
    const { comparisonId } = event.currentTarget.dataset;
    if (!comparisonId || comparisonId === this.data.selectedColdIpaComparisonId) return;

    trackEvent('academy_cold_ipa_comparison_select', { slug: this.data.slug, comparisonId });
    this.setData({
      selectedColdIpaComparisonId: comparisonId,
      article: decorateArticle(this.data.article, {
        selectedIpaBranchId: this.data.selectedIpaBranchId,
        selectedFermentationPathId: this.data.selectedFermentationPathId,
        selectedFlavorSourceId: this.data.selectedFlavorSourceId,
        selectedColdIpaComparisonId: comparisonId,
      }),
    });
  },

  openRelatedStyle(event) {
    const { styleId, itemKind } = event.currentTarget.dataset;
    if (!styleId) return;

    trackEvent('academy_related_style_open', {
      slug: this.data.slug,
      styleId,
      itemKind,
    });
    if (itemKind === 'extension') {
      navigateOnce(this, `/subpages/extension-style/index?styleId=${styleId}`);
      return;
    }
    navigateOnce(this, `/subpages/style/index?styleId=${styleId}`);
  },

  backToAcademy() {
    trackEvent('academy_article_back', { slug: this.data.slug });
    switchTabOnce(this, '/pages/academy/index');
  },

  retryArticle() {
    this.loadArticle(this.data.slug);
  },
});

function decorateArticle(article, selections) {
  const experience = buildExperience(article.experienceKey, selections, article);
  return {
    ...article,
    sections: getArticleSections(article),
    experience,
    selectedComparisonId: experience.activeItem ? experience.activeItem.id : article.selectedComparisonId,
  };
}

function getArticleSections(article) {
  if (Array.isArray(article.sections) && article.sections.length > 0) return article.sections;
  return [];
}

function getErrorMessage(error) {
  return error && error.message ? String(error.message) : String(error || 'unknown');
}

function buildExperience(experienceKey, selections, article = null) {
  if (experienceKey === 'ale-lager') return buildAleLagerExperience(selections.selectedFermentationPathId);
  if (experienceKey === 'flavor-radar') return buildFlavorRadarExperience(selections.selectedFlavorSourceId);
  if (experienceKey === 'ipa-map') return buildIpaMapExperience(selections.selectedIpaBranchId);
  if (experienceKey === 'cold-ipa') return buildColdIpaExperience(article, selections.selectedColdIpaComparisonId);
  return { items: [], activeItem: null };
}

function buildColdIpaExperience(article, selectedComparisonId) {
  const comparisonSection = getArticleSections(article || {}).find((section) => section.showColdIpaComparison);
  const items = comparisonSection && comparisonSection.companion
    ? comparisonSection.companion.comparisonItems
    : [];
  return decorateSelectable(items, selectedComparisonId || 'cold-ipa', 'comparison');
}

function buildIpaMapExperience(selectedBranchId) {
  const branches = [
    {
      id: 'west-coast',
      title: 'West Coast IPA',
      positionStyle: 'left: 8%; top: 48%;',
      axis: '高苦度 / 高香气 / 清爽酒体',
      body: '苦度线条更清楚，收口更干，葡萄柚、松针、树脂和草本感常站到前面。它像一条清晰的线。',
    },
    {
      id: 'hazy',
      title: 'Hazy / NEIPA',
      positionStyle: 'left: 54%; top: 24%;',
      axis: '柔和苦度 / 果汁香气 / 饱满酒体',
      body: '它不是简单的“甜 IPA”，而是把苦味磨圆，让芒果、菠萝、柑橘和柔软口感更早被感受到。',
    },
    {
      id: 'session',
      title: 'Session IPA',
      positionStyle: 'left: 23%; top: 72%;',
      axis: '低强度 / 有酒花存在 / 轻盈酒体',
      body: '适合用来理解“风味强”和“酒精强”不是一件事：酒花还在，酒精和身体重量更轻。',
    },
    {
      id: 'double',
      title: 'Double IPA',
      positionStyle: 'left: 72%; top: 66%;',
      axis: '高强度 / 高酒花 / 更厚支撑',
      body: '酒花、酒精和麦芽支撑同时放大，压迫感更强，也更考验整体平衡。',
    },
  ];
  return decorateSelectable(branches, selectedBranchId, 'branch');
}

function buildAleLagerExperience(selectedPathId) {
  const paths = [
    {
      id: 'ale',
      title: 'Ale 路线',
      lead: '温度更高，表达更快，酵母和风格个性更容易被看见。',
      steps: ['较高发酵温度', '较短成熟周期', '酯香、酚香和酵母表达更明显', '风格跨度从德式小麦到世涛'],
    },
    {
      id: 'lager',
      title: 'Lager 路线',
      lead: '温度更低，管理更慢，干净度、稳定性和细节会被放大。',
      steps: ['较低发酵温度', '更长冷储和成熟', '干净、清爽、麦芽轮廓清楚', '皮尔森、博克、黑拉格常见'],
    },
  ];
  return decorateSelectable(paths, selectedPathId, 'path');
}

function buildFlavorRadarExperience(selectedSourceId) {
  const sources = [
    {
      id: 'malt',
      title: '麦芽',
      angleStyle: 'left: 48%; top: 4%;',
      terms: ['谷物', '面包', '焦糖', '咖啡', '巧克力'],
      clue: '先看甜感、颜色和酒体支撑，深色或高强度风格里尤其明显。',
    },
    {
      id: 'hop',
      title: '酒花',
      angleStyle: 'left: 78%; top: 43%;',
      terms: ['花香', '柑橘', '松针', '热带水果'],
      clue: '常和香气、苦度、收口清爽度一起出现。',
    },
    {
      id: 'yeast',
      title: '酵母',
      angleStyle: 'left: 48%; top: 78%;',
      terms: ['香蕉', '丁香', '胡椒', '果酯', '蜂蜜感'],
      clue: '小麦、比利时和部分英式风格里，酵母会直接塑造风格性格。',
    },
    {
      id: 'process',
      title: '发酵管理',
      angleStyle: 'left: 14%; top: 43%;',
      terms: ['酸感', '酒精热感', '黄油', '干净度'],
      clue: '它更像后台控制台，温度、时间、卫生和储存状态都会留下痕迹。',
    },
  ];
  return decorateSelectable(sources, selectedSourceId, 'source');
}

function decorateSelectable(items, selectedId, kind) {
  const activeId = items.some((item) => item.id === selectedId) ? selectedId : items[0].id;
  const decoratedItems = items.map((item) => ({
    ...item,
    className: `${kind}-item${item.id === activeId ? ` ${kind}-item-active` : ''}`,
  }));
  return {
    items: decoratedItems,
    activeItem: decoratedItems.find((item) => item.id === activeId),
  };
}
