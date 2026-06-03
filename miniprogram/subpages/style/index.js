import { getStyleDetail } from '../../utils/beer-model.js';
import { deferSetData, navigateOnce, redirectOnce, switchTabOnce } from '../../utils/page-performance.js';
import { buildShareMessage } from '../../utils/share.js';
import { isStyleFavorite, toggleFavoriteStyle } from '../../utils/style-favorites.js';
import { trackEvent } from '../../utils/telemetry.js';

Page({
  data: {
    loadStatus: 'loading',
    errorMessage: '',
    contentReady: false,
    detail: null,
    isFavorite: false,
    favoriteActionLabel: '收藏',
  },

  onLoad(options) {
    const styleId = options.styleId || '';
    try {
      const detail = getStyleDetail(styleId);
      if (!detail) {
        wx.setNavigationBarTitle({ title: '未找到风格' });
        this.setData({
          loadStatus: 'not-found',
          errorMessage: '没有找到这个啤酒风格。',
          isFavorite: false,
          favoriteActionLabel: '收藏',
        });
        return;
      }
      const isFavorite = isStyleFavorite(detail.style.id);
      wx.setNavigationBarTitle({ title: `${detail.style.code} ${detail.style.displayName}` });
      this.setData({
        loadStatus: 'ready',
        errorMessage: '',
        contentReady: false,
        isFavorite,
        favoriteActionLabel: isFavorite ? '已收藏' : '收藏',
        detail: {
          ...detail,
          stats: [],
          sections: [],
          tags: [],
          related: [],
        },
      });
      deferSetData(this, {
        contentReady: true,
        'detail.stats': detail.stats,
        'detail.sections': detail.sections,
        'detail.tags': detail.tags,
        'detail.related': detail.related,
      });
    } catch (error) {
      wx.setNavigationBarTitle({ title: '加载失败' });
      this.setData({
        loadStatus: 'error',
        errorMessage: '风格详情暂时无法打开。',
        isFavorite: false,
        favoriteActionLabel: '收藏',
      });
    }
  },

  onShareAppMessage() {
    const detail = this.data.detail;
    const style = detail && detail.style;
    trackEvent('style_share', { styleId: style ? style.id : '' });
    return buildShareMessage({
      title: style ? `${style.code} ${style.displayName}：风味参数速查` : undefined,
      path: `/subpages/style/index?styleId=${style ? style.id : ''}`,
    });
  },

  openRelated(event) {
    const { styleId } = event.currentTarget.dataset;
    trackEvent('style_open', { styleId, source: 'related_style' });
    redirectOnce(this, `/subpages/style/index?styleId=${styleId}`);
  },

  toggleFavorite() {
    const style = this.data.detail && this.data.detail.style;
    if (!style) return;

    const result = toggleFavoriteStyle(style.id);
    this.setData({
      isFavorite: result.isFavorite,
      favoriteActionLabel: result.isFavorite ? '已收藏' : '收藏',
    });
    trackEvent('favorite_toggle', { styleId: style.id, isFavorite: result.isFavorite });
    wx.showToast({
      title: result.isFavorite ? '已加入收藏' : '已取消收藏',
      icon: 'none',
      duration: 1100,
    });
  },

  openGroup() {
    const groupId = this.data.detail && this.data.detail.group && this.data.detail.group.id;
    if (!groupId) return;
    trackEvent('back_to_group', { groupId, source: 'style_detail' });
    navigateOnce(this, `/subpages/group/index?groupId=${groupId}`);
  },

  goSearch() {
    trackEvent('back_to_search', { source: 'style_fallback' });
    switchTabOnce(this, '/pages/search/index');
  },
});
