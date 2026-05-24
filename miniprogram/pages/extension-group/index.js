import { getExtensionGroupDetail } from '../../utils/beer-model.js';
import { deferSetData, navigateOnce, switchTabOnce } from '../../utils/page-performance.js';

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
    return {
      title: group ? `市场扩展风格：${group.name}` : '精酿风格指南',
      path: `/pages/extension-group/index?groupId=${this.data.groupId || 'modern-ipa-hops'}`,
    };
  },

  openExtensionStyle(event) {
    const { styleId } = event.currentTarget.dataset;
    navigateOnce(this, `/pages/extension-style/index?styleId=${styleId}`);
  },

  goExplore() {
    switchTabOnce(this, '/pages/explore/index');
  },
});
