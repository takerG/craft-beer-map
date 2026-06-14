import { navigateOnce, switchTabOnce } from '../../utils/page-performance.js';
import { buildShareMessage, buildTimelineShareMessage, enableShareMenu } from '../../utils/share.js';
import {
  getFavoriteStyleSummariesResult,
  removeFavoriteStyle,
} from '../../utils/style-favorites.js';
import { trackEvent } from '../../utils/telemetry.js';

Page({
  data: {
    loadStatus: 'loading',
    errorMessage: '',
    favoriteStyles: [],
    hasFavoriteStyles: false,
    favoriteCountLabel: '',
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
    this.setData({
      loadStatus: 'loading',
      errorMessage: '',
      favoriteStyles: [],
      hasFavoriteStyles: false,
      favoriteCountLabel: '',
    });
    const result = getFavoriteStyleSummariesResult();
    if (!result.ok) {
      this.setData({
        loadStatus: 'error',
        errorMessage: '收藏读取失败，请重试',
      });
      return;
    }

    const { favoriteStyles } = result;
    this.setData({
      loadStatus: 'ready',
      favoriteStyles,
      hasFavoriteStyles: favoriteStyles.length > 0,
      favoriteCountLabel: `${favoriteStyles.length} 个收藏`,
    });
  },

  retryFavoriteStyles() {
    this.refreshFavoriteStyles();
  },

  removeFavorite(event) {
    const { styleId, itemKind } = event.currentTarget.dataset;
    if (!this.data.favoriteStyles.some((style) => style.id === styleId)) return;

    const result = removeFavoriteStyle(styleId);
    if (!result.ok) {
      wx.showToast({
        title: '取消失败，请重试',
        icon: 'none',
      });
      return;
    }

    trackEvent('favorite_remove_success', {
      styleId,
      itemKind,
      source: 'favorites',
    });
    wx.showToast({
      title: '已取消收藏',
      icon: 'success',
    });
    this.refreshFavoriteStyles();
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
