import { getExtensionGroupDetail } from '../../utils/beer-model.js';
import { deferSetData, navigateOnce, switchTabOnce } from '../../utils/page-performance.js';
import { buildShareMessage } from '../../utils/share.js';
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
      title: group ? `${group.name}：市场叫法速查` : undefined,
      path: `/pages/extension-group/index?groupId=${this.data.groupId || 'modern-ipa-hops'}`,
    });
  },

  openExtensionStyle(event) {
    const { styleId } = event.currentTarget.dataset;
    trackEvent('extension_style_open', { styleId, groupId: this.data.groupId });
    navigateOnce(this, `/pages/extension-style/index?styleId=${styleId}`);
  },

  goExplore() {
    trackEvent('back_to_explore', { source: 'extension_group_error' });
    switchTabOnce(this, '/pages/explore/index');
  },
});
