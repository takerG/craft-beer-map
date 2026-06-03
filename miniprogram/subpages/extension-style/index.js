import { getExtensionStyleDetail } from '../../utils/beer-model.js';
import { deferSetData, navigateOnce, redirectOnce, switchTabOnce } from '../../utils/page-performance.js';
import { buildShareMessage, buildTimelineShareMessage, enableShareMenu } from '../../utils/share.js';
import { trackEvent } from '../../utils/telemetry.js';

Page({
  data: {
    loadStatus: 'loading',
    errorMessage: '',
    contentReady: false,
    detail: null,
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
