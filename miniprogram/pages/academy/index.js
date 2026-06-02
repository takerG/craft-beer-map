import { buildAcademyTypeFilters, getAcademyHome } from '../../utils/academy-model.js';
import { navigateOnce } from '../../utils/page-performance.js';
import { trackEvent } from '../../utils/telemetry.js';

Page({
  data: {
    title: '',
    subtitle: '',
    allFeedSites: [],
    feedSites: [],
    typeFilters: [],
    activeType: 'all',
    articleCountLabel: '',
  },

  onLoad() {
    const home = getAcademyHome();

    this.setData({
      title: home.title,
      subtitle: home.subtitle,
      allFeedSites: home.feedSites,
      feedSites: home.feedSites,
      typeFilters: home.filterOptions,
      activeType: 'all',
      articleCountLabel: `${home.stats.siteCount} 篇`,
    });
  },

  onShareAppMessage() {
    trackEvent('academy_share');
    return {
      title: '学院：精酿互动文章',
      path: '/pages/academy/index',
    };
  },

  openArticle(event) {
    const { slug } = event.currentTarget.dataset;
    if (!slug) return;

    trackEvent('academy_article_open', { slug, source: 'feed' });
    navigateOnce(this, `/pages/academy-article/index?slug=${slug}`);
  },

  filterArticles(event) {
    const type = event.currentTarget.dataset.type || 'all';
    const allFeedSites = this.data.allFeedSites || [];
    const feedSites = type === 'all'
      ? allFeedSites
      : allFeedSites.filter((site) => site.type === type);

    this.setData({
      activeType: type,
      feedSites,
      typeFilters: buildAcademyTypeFilters(allFeedSites, type),
      articleCountLabel: `${feedSites.length} 篇`,
    });
    trackEvent('academy_filter_change', { type, count: feedSites.length });
  },
});
