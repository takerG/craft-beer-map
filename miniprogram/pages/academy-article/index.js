import { getAcademyArticle } from '../../utils/academy-model.js';
import { navigateOnce, switchTabOnce } from '../../utils/page-performance.js';
import { trackEvent } from '../../utils/telemetry.js';

Page({
  data: {
    slug: '',
    loadStatus: 'loading',
    isLoading: true,
    isNotFound: false,
    isReady: false,
    article: null,
    articleSections: [],
    selectedIpaBranchId: 'west-coast',
    selectedFermentationPathId: 'ale',
    selectedFlavorSourceId: 'malt',
  },

  onLoad(options = {}) {
    this.loadArticle(options.slug || '');
  },

  onShareAppMessage() {
    const article = this.data.article;
    trackEvent('academy_article_share', { slug: article ? article.slug : this.data.slug });
    return {
      title: article ? article.title : '学院',
      path: `/pages/academy-article/index?slug=${this.data.slug}`,
    };
  },

  loadArticle(slug) {
    const article = getAcademyArticle(slug);
    if (!article) {
      this.setData({
        slug,
        loadStatus: 'not-found',
        isLoading: false,
        isNotFound: true,
        isReady: false,
        article: null,
        articleSections: [],
        selectedIpaBranchId: 'west-coast',
        selectedFermentationPathId: 'ale',
        selectedFlavorSourceId: 'malt',
      });
      return;
    }

    trackEvent('academy_article_view', { slug });
    const decoratedArticle = decorateArticle(article, {
      selectedIpaBranchId: this.data.selectedIpaBranchId,
      selectedFermentationPathId: this.data.selectedFermentationPathId,
      selectedFlavorSourceId: this.data.selectedFlavorSourceId,
    });
    this.setData({
      slug,
      loadStatus: 'ready',
      isLoading: false,
      isNotFound: false,
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
      navigateOnce(this, `/pages/extension-style/index?styleId=${styleId}`);
      return;
    }
    navigateOnce(this, `/pages/style/index?styleId=${styleId}`);
  },

  backToAcademy() {
    trackEvent('academy_article_back', { slug: this.data.slug });
    switchTabOnce(this, '/pages/academy/index');
  },
});

function decorateArticle(article, selections) {
  return {
    ...article,
    sections: getArticleSections(article),
    experience: buildExperience(article.experienceKey, selections),
  };
}

function getArticleSections(article) {
  if (Array.isArray(article.sections) && article.sections.length > 0) return article.sections;
  return getFallbackSections(article.slug, article.experienceKey);
}

function getFallbackSections(slug, experienceKey) {
  const fallbacks = {
    'ipa-family-map': [
      {
        id: 'what-is-ipa',
        title: '什么是 IPA',
        paragraphs: ['IPA 是 India Pale Ale 的缩写。现代精酿语境里的 IPA，重点是一类以酒花表达为核心的啤酒，而不是单一配方。'],
        hasCallout: false,
      },
      {
        id: 'why-name',
        title: '为什么叫 IPA',
        paragraphs: ['这个名字来自历史上的 India Pale Ale。今天的 IPA 已经被现代精酿重新发展，成为展示酒花香气、苦度和酒体平衡的风格家族。'],
        hasCallout: false,
      },
      {
        id: 'branches',
        title: '衍生风格是怎么分化出来的',
        paragraphs: ['West Coast、Hazy、Session、Double 等分支，本质上是在苦度、香气、酒体和强度之间选择不同平衡点。'],
        callout: '下面的互动地图用来辅助理解这些分支的距离。',
        hasCallout: true,
        showIpaMapExperience: experienceKey === 'ipa-map',
      },
    ],
    'ale-vs-lager': [
      {
        id: 'what-is-ale-lager',
        title: '艾尔和拉格是什么',
        paragraphs: ['艾尔和拉格不是高低贵贱，而是两条发酵管理路线。它们的差异主要来自温度、时间和酵母表达。'],
        hasCallout: false,
      },
      {
        id: 'process-paths',
        title: '真正的差异在酿造路径',
        paragraphs: ['Ale 通常更快、更外放；Lager 通常更慢、更克制。把路径看清楚，比死记上发酵和下发酵更有用。'],
        callout: '下面的双路径对照用来辅助理解温度、时间和表达的差异。',
        hasCallout: true,
        showAleLagerExperience: experienceKey === 'ale-lager',
      },
    ],
    'flavor-radar-basics': [
      {
        id: 'why-source',
        title: '风味词要先看来源',
        paragraphs: ['风味词不是背诵表。先判断它来自麦芽、酒花、酵母还是发酵管理，再去细分具体描述。'],
        hasCallout: false,
      },
      {
        id: 'sources',
        title: '四个最常见的风味来源',
        paragraphs: ['麦芽、酒花、酵母和发酵管理，是入门时最有用的四个风味来源坐标。'],
        callout: '下面的雷达用来把词汇放回来源。',
        hasCallout: true,
        showFlavorRadarExperience: experienceKey === 'flavor-radar',
      },
    ],
  };
  return fallbacks[slug] || [];
}

function buildExperience(experienceKey, selections) {
  if (experienceKey === 'ale-lager') return buildAleLagerExperience(selections.selectedFermentationPathId);
  if (experienceKey === 'flavor-radar') return buildFlavorRadarExperience(selections.selectedFlavorSourceId);
  return buildIpaMapExperience(selections.selectedIpaBranchId);
}

function buildIpaMapExperience(selectedBranchId) {
  const branches = [
    {
      id: 'west-coast',
      title: 'West Coast IPA',
      positionStyle: 'left: 8%; top: 48%;',
      axis: '高苦度 / 高香气 / 清爽酒体',
      body: '把啤酒想象成一条清晰的海岸线：收口干，苦味边缘利落，柑橘、松针和树脂感会更突出。',
    },
    {
      id: 'hazy',
      title: 'Hazy / NEIPA',
      positionStyle: 'left: 54%; top: 24%;',
      axis: '柔和苦度 / 果汁香气 / 饱满酒体',
      body: '它不是“更甜的 IPA”，而是把苦味磨圆，让芒果、菠萝、柑橘和柔软口感站到前面。',
    },
    {
      id: 'session',
      title: 'Session IPA',
      positionStyle: 'left: 23%; top: 72%;',
      axis: '低强度 / 有酒花存在 / 轻盈酒体',
      body: '适合用来理解“风味强”和“酒精强”不是一件事：酒花还在，但身体更轻。',
    },
    {
      id: 'double',
      title: 'Double IPA',
      positionStyle: 'left: 72%; top: 66%;',
      axis: '高强度 / 高酒花 / 更厚支撑',
      body: '酒花、酒精和麦芽支撑同时放大，喝起来更有压迫感，也更需要平衡。',
    },
  ];
  return decorateSelectable(branches, selectedBranchId, 'branch');
}

function buildAleLagerExperience(selectedPathId) {
  const paths = [
    {
      id: 'ale',
      title: 'Ale 路线',
      lead: '温度更高，表达更快，酵母个性更容易被看见。',
      steps: ['较高发酵温度', '较短成熟周期', '酯香与酵母表达更明显', '风格跨度从小麦到世涛'],
    },
    {
      id: 'lager',
      title: 'Lager 路线',
      lead: '温度更低，管理更慢，干净度和细节会被放大。',
      steps: ['较低发酵温度', '更长冷储和成熟', '干净、清爽、麦芽轮廓清楚', '皮尔森、博克、淡色拉格常见'],
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
      terms: ['面包', '焦糖', '坚果', '咖啡', '巧克力'],
      clue: '先看甜感、颜色和酒体支撑，深色风格里尤其明显。',
    },
    {
      id: 'hop',
      title: '酒花',
      angleStyle: 'left: 78%; top: 43%;',
      terms: ['柑橘', '松针', '草本', '热带水果'],
      clue: '常和香气、苦度、收口清爽度一起出现。',
    },
    {
      id: 'yeast',
      title: '酵母',
      angleStyle: 'left: 48%; top: 78%;',
      terms: ['香蕉', '丁香', '胡椒', '蜂蜜', '泥土'],
      clue: '小麦、比利时和部分英式风格里，酵母会直接塑造性格。',
    },
    {
      id: 'process',
      title: '发酵管理',
      angleStyle: 'left: 14%; top: 43%;',
      terms: ['酸感', '酒精热感', '干净度', '复杂度'],
      clue: '它更像幕后导演，温度、时间和微生物控制都会留下痕迹。',
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
