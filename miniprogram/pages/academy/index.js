import { buildAcademyTypeFilters, getAcademyHome } from '../../utils/academy-model.js';
import { navigateOnce } from '../../utils/page-performance.js';
import { buildShareMessage } from '../../utils/share.js';
import { trackEvent } from '../../utils/telemetry.js';

Page({
  data: {
    allFeedSites: [],
    feedSites: [],
    typeFilters: [],
    activeType: 'all',
  },

  onLoad() {
    const home = getAcademyHome();

    this.setData({
      allFeedSites: home.feedSites,
      feedSites: home.feedSites,
      typeFilters: home.filterOptions,
      activeType: 'all',
    });
  },

  onShareAppMessage() {
    trackEvent('academy_share');
    return buildShareMessage({
      title: '精酿知识库：3 分钟看懂一类风格',
      path: '/pages/academy/index',
    });
  },

  openArticle(event) {
    const { slug } = event.currentTarget.dataset;
    if (!slug) return;

    trackEvent('academy_article_open', { slug, source: 'feed' });
    navigateOnce(this, `/subpages/academy-article/index?slug=${slug}`);
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
    });
    trackEvent('academy_filter_change', { type, count: feedSites.length });
  },
});
