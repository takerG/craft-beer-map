import { getExtensionGroupDetail } from '../../utils/beer-model.js';

Page({
  data: {
    loadStatus: 'loading',
    errorMessage: '',
    groupId: '',
    group: null,
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

  openExtensionStyle(event) {
    const { styleId } = event.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/extension-style/index?styleId=${styleId}` });
  },

  goExplore() {
    wx.switchTab({ url: '/pages/explore/index' });
  },
});
