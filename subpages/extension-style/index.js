import { getExtensionStyleDetail } from '../../utils/beer-model.js';
import { deferSetData, navigateOnce, redirectOnce, switchTabOnce } from '../../utils/page-performance.js';
import { buildShareMessage, buildTimelineShareMessage, enableShareMenu } from '../../utils/share.js';
import {
  addFavoriteStyle,
  getFavoriteStyleStateResult,
  removeFavoriteStyle,
} from '../../utils/style-favorites.js';
import { trackEvent } from '../../utils/telemetry.js';

Page({
  data: {
    loadStatus: 'loading',
    errorMessage: '',
    contentReady: false,
    detail: null,
    isFavorite: false,
    favoriteStatus: 'loading',
    favoriteActionLabel: '读取收藏状态',
  },

  onLoad(options) {
    enableShareMenu();

    const styleId = options.styleId || '';
    try {
      const detail = getExtensionStyleDetail(styleId);
      if (!detail) {
        wx.setNavigationBarTitle({ title: '未找到扩展风格' });
        this.setData({
          loadStatus: 'not-found',
          errorMessage: '没有找到这个扩展风格。',
        });
        return;
      }
      wx.setNavigationBarTitle({ title: detail.style.displayName });
      this.setData({
        loadStatus: 'ready',
        errorMessage: '',
        contentReady: false,
        favoriteStatus: 'loading',
        favoriteActionLabel: '读取收藏状态',
        detail: {
          ...detail,
          description: '',
          bjcp_note: '',
          bjcp_refs: [],
          style: {
            ...detail.style,
            aliases: [],
          },
        },
      });
      this.refreshFavoriteState();
      deferSetData(this, {
        contentReady: true,
        'detail.description': detail.description,
        'detail.bjcp_note': detail.bjcp_note,
        'detail.bjcp_refs': detail.bjcp_refs,
        'detail.style.aliases': detail.style.aliases,
      });
    } catch (error) {
      wx.setNavigationBarTitle({ title: '加载失败' });
      this.setData({
        loadStatus: 'error',
        errorMessage: '扩展风格详情暂时无法打开。',
      });
    }
  },

  onShareAppMessage() {
    const detail = this.data.detail;
    const style = detail && detail.style;
    trackEvent('extension_style_share', { styleId: style ? style.id : '' });
    return buildShareMessage({
      title: style ? `风格指南：${style.displayName}` : undefined,
      path: `/subpages/extension-style/index?styleId=${style ? style.id : ''}`,
    });
  },

  onShareTimeline() {
    const detail = this.data.detail;
    const style = detail && detail.style;
    trackEvent('extension_style_timeline_share', { styleId: style ? style.id : '' });
    return buildTimelineShareMessage({
      title: style ? `风格指南：${style.displayName}` : undefined,
      query: `styleId=${style ? style.id : ''}`,
    });
  },

  openBjcpStyle(event) {
    const { styleId } = event.currentTarget.dataset;
    trackEvent('style_open', { styleId, source: 'extension_crosswalk' });
    navigateOnce(this, `/subpages/style/index?styleId=${styleId}`);
  },

  refreshFavoriteState() {
    const style = this.data.detail && this.data.detail.style;
    if (!style) return null;

    const result = getFavoriteStyleStateResult(style.id);
    if (!result.ok) {
      this.setData({
        favoriteStatus: 'error',
        favoriteActionLabel: '重试收藏状态',
      });
      return result;
    }

    this.setData({
      favoriteStatus: 'ready',
      isFavorite: result.isFavorite,
      favoriteActionLabel: result.isFavorite ? '已收藏' : '收藏',
    });
    return result;
  },

  toggleFavorite() {
    const style = this.data.detail && this.data.detail.style;
    if (!style) return;
    if (this.data.favoriteStatus !== 'ready') {
      this.refreshFavoriteState();
      return;
    }

    const targetFavorite = !this.data.isFavorite;
    const result = targetFavorite
      ? addFavoriteStyle(style.id)
      : removeFavoriteStyle(style.id);
    if (!result.ok) {
      trackEvent('favorite_toggle_failed', {
        styleId: style.id,
        targetFavorite,
        error: result.error,
      });
      const favoriteStateUnknown = result.isFavorite === null;
      if (favoriteStateUnknown) {
        this.setData({
          favoriteStatus: 'error',
          favoriteActionLabel: '重试收藏状态',
        });
      }
      wx.showToast({
        title: result.error === 'storage-uncertain'
          ? '收藏状态不可用，请点击重试'
          : '收藏状态未保存，请重试',
        icon: 'none',
        duration: 1500,
      });
      return;
    }
    this.setData({
      favoriteStatus: 'ready',
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
    trackEvent('back_to_extension_group', { groupId, source: 'extension_style_detail' });
    redirectOnce(this, `/subpages/extension-group/index?groupId=${groupId}`);
  },

  goSearch() {
    trackEvent('back_to_search', { source: 'extension_style_fallback' });
    switchTabOnce(this, '/pages/search/index');
  },
});
