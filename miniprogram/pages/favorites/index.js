import { navigateOnce, switchTabOnce } from '../../utils/page-performance.js';
import { buildShareMessage, buildTimelineShareMessage, enableShareMenu } from '../../utils/share.js';
import { getFavoriteStyleSummaries } from '../../utils/style-favorites.js';
import { trackEvent } from '../../utils/telemetry.js';

Page({
  data: {
    favoriteStyles: [],
    hasFavoriteStyles: false,
    favoriteCountLabel: '0 个收藏',
  },

  onLoad() {
    enableShareMenu();
  },

  onShow() {
    this.refreshFavoriteStyles();
  },

  onShareAppMessage() {
    trackEvent('favorites_share');
    return buildShareMessage({
      title: '常看的精酿风格随手查',
      path: '/pages/favorites/index',
    });
  },

  onShareTimeline() {
    trackEvent('favorites_timeline_share');
    return buildTimelineShareMessage({
      title: '常看的精酿风格随手查',
    });
  },

  refreshFavoriteStyles() {
    const favoriteStyles = getFavoriteStyleSummaries();
    this.setData({
      favoriteStyles,
      hasFavoriteStyles: favoriteStyles.length > 0,
      favoriteCountLabel: `${favoriteStyles.length} 个收藏`,
    });
  },

  openStyle(event) {
    const { styleId, itemKind } = event.currentTarget.dataset;
    trackEvent('style_open', { styleId, itemKind, source: 'favorites' });
    if (itemKind === 'extension') {
      navigateOnce(this, `/subpages/extension-style/index?styleId=${styleId}`);
      return;
    }
    navigateOnce(this, `/subpages/style/index?styleId=${styleId}`);
  },

  goSearch() {
    trackEvent('favorites_search_open');
    switchTabOnce(this, '/pages/search/index');
  },
});
