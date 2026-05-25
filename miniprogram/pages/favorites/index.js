import { navigateOnce, switchTabOnce } from '../../utils/page-performance.js';
import { getFavoriteStyleSummaries } from '../../utils/style-favorites.js';
import { trackEvent } from '../../utils/telemetry.js';

Page({
  data: {
    favoriteStyles: [],
    hasFavoriteStyles: false,
    favoriteCountLabel: '0 个收藏',
  },

  onShow() {
    this.refreshFavoriteStyles();
  },

  onShareAppMessage() {
    trackEvent('favorites_share');
    return {
      title: '精酿风格收藏夹',
      path: '/pages/favorites/index',
    };
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
    const { styleId } = event.currentTarget.dataset;
    trackEvent('style_open', { styleId, source: 'favorites' });
    navigateOnce(this, `/pages/style/index?styleId=${styleId}`);
  },

  goSearch() {
    trackEvent('favorites_search_open');
    switchTabOnce(this, '/pages/search/index');
  },
});
