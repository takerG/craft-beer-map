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
    activeModuleId: '',
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
        activeModuleId: '',
      });
      return;
    }

    trackEvent('academy_article_view', { slug });
    this.setData({
      slug,
      loadStatus: 'ready',
      isLoading: false,
      isNotFound: false,
      isReady: true,
      article: decorateArticle(article, article.modules[0] ? article.modules[0].id : ''),
      activeModuleId: article.modules[0] ? article.modules[0].id : '',
    });
  },

  selectModule(event) {
    const { moduleId } = event.currentTarget.dataset;
    if (!moduleId || moduleId === this.data.activeModuleId) return;

    trackEvent('academy_module_select', { slug: this.data.slug, moduleId });
    this.setData({
      activeModuleId: moduleId,
      article: decorateArticle(this.data.article, moduleId),
    });
  },

  selectQuizOption(event) {
    const { moduleId, optionIndex } = event.currentTarget.dataset;
    if (!moduleId) return;

    const article = {
      ...this.data.article,
      modules: this.data.article.modules.map((module) => {
        if (module.id !== moduleId) return module;
        return {
          ...module,
          options: module.options.map((option) => decorateQuizOption(option, option.optionIndex === Number(optionIndex), true)),
        };
      }),
    };

    trackEvent('academy_quiz_select', {
      slug: this.data.slug,
      moduleId,
      optionIndex: Number(optionIndex),
    });
    this.setData({ article });
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

function decorateArticle(article, activeModuleId) {
  return {
    ...article,
    modules: article.modules.map((module) => ({
      ...module,
      tabClassName: activeModuleId === module.id ? 'module-tab module-tab-active' : 'module-tab',
      cardClassName: activeModuleId === module.id ? 'module-card module-card-active' : 'module-card',
      options: (module.options || []).map((option) => decorateQuizOption(option, Boolean(option.selected), Boolean(option.revealed))),
    })),
  };
}

function decorateQuizOption(option, selected, revealed) {
  const isCorrect = Boolean(revealed && option.correct);
  return {
    ...option,
    selected,
    revealed,
    className: [
      'quiz-option',
      selected ? 'quiz-option-selected' : '',
      isCorrect ? 'quiz-option-correct' : '',
    ].filter(Boolean).join(' '),
  };
}
