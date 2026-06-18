import { buildAcademyTypeFilters, getAcademyHome } from '../../utils/academy-feed-model.js';
import { navigateOnce } from '../../utils/page-performance.js';
import { buildShareMessage, buildTimelineShareMessage, enableShareMenu } from '../../utils/share.js';
import { trackEvent } from '../../utils/telemetry.js';

Page({
  data: {
    title: '',
    subtitle: '',
    allFeedSites: [],
    feedSites: [],
    typeFilters: [],
    activeType: 'all',
    loadStatus: 'loading',
    isLoading: true,
    isError: false,
    isReady: false,
  },

  async onLoad() {
    enableShareMenu();
    await this.loadAcademyHome();
  },

  async loadAcademyHome() {
    this.setData({
      loadStatus: 'loading',
      isLoading: true,
      isError: false,
      isReady: false,
    });

    try {
      const home = await getAcademyHome();

      this.setData({
        title: home.title,
        subtitle: home.subtitle,
        allFeedSites: home.feedSites,
        feedSites: home.feedSites,
        typeFilters: home.filterOptions,
        activeType: 'all',
        loadStatus: 'ready',
        isLoading: false,
        isError: false,
        isReady: true,
      });
    } catch (error) {
      trackEvent('academy_load_error', { message: getErrorMessage(error) });
      this.setData({
        loadStatus: 'error',
        isLoading: false,
        isError: true,
        isReady: false,
      });
    }
  },

  retryAcademyHome() {
    this.loadAcademyHome();
  },

  onShareAppMessage() {
    trackEvent('academy_share');
    return buildShareMessage({
      title: '3 分钟看懂一种精酿风格',
      path: '/pages/academy/index',
    });
  },

  onShareTimeline() {
    trackEvent('academy_timeline_share');
    return buildTimelineShareMessage({
      title: '3 分钟看懂一种精酿风格',
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

function getErrorMessage(error) {
  return error && error.message ? String(error.message) : String(error || 'unknown');
}
