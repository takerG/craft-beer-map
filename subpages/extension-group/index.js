import { getExtensionGroupDetail } from '../../utils/beer-model.js';
import { deferSetData, navigateOnce, switchTabOnce } from '../../utils/page-performance.js';
import { buildShareMessage, buildTimelineShareMessage, enableShareMenu } from '../../utils/share.js';
import { trackEvent } from '../../utils/telemetry.js';

Page({
  data: {
    loadStatus: 'loading',
    errorMessage: '',
    groupId: '',
    group: null,
    contentReady: false,
    styles: [],
  },

  onLoad(options) {
    enableShareMenu();

    const groupId = options.groupId || 'modern-ipa-hops';
    try {
      const detail = getExtensionGroupDetail(groupId);
      wx.setNavigationBarTitle({ title: detail.group.name });
      this.setData({
        loadStatus: 'ready',
        errorMessage: '',
        groupId,
        group: detail.group,
        contentReady: false,
        styles: [],
      });
      deferSetData(this, {
        contentReady: true,
        styles: detail.styles,
      });
    } catch (error) {
      wx.setNavigationBarTitle({ title: '未找到扩展组' });
      this.setData({
        loadStatus: 'error',
        errorMessage: '没有找到这个扩展风格分组。',
      });
    }
  },

  onShareAppMessage() {
    const group = this.data.group;
    trackEvent('extension_group_share', { groupId: this.data.groupId });
    return buildShareMessage({
      title: group ? `风格指南：${group.name}` : undefined,
      path: `/subpages/extension-group/index?groupId=${this.data.groupId || 'modern-ipa-hops'}`,
    });
  },

  onShareTimeline() {
    const group = this.data.group;
    const groupId = this.data.groupId || 'modern-ipa-hops';
    trackEvent('extension_group_timeline_share', { groupId });
    return buildTimelineShareMessage({
      title: group ? `风格指南：${group.name}` : undefined,
      query: `groupId=${groupId}`,
    });
  },

  openExtensionStyle(event) {
    const { styleId } = event.currentTarget.dataset;
    trackEvent('extension_style_open', { styleId, groupId: this.data.groupId });
    navigateOnce(this, `/subpages/extension-style/index?styleId=${styleId}`);
  },

  goExplore() {
    trackEvent('back_to_explore', { source: 'extension_group_error' });
    switchTabOnce(this, '/pages/explore/index');
  },
});
