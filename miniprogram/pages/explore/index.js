import { getExtensionGroups, getSuperGroups, searchStyles } from '../../utils/beer-model.js';

Page({
  data: {
    groups: [],
    extensionGroups: [],
    featured: [],
  },

  onLoad() {
    this.setData({
      groups: getSuperGroups(),
      extensionGroups: getExtensionGroups(),
      featured: searchStyles('ipa', 6),
    });
  },

  openSearch() {
    wx.switchTab({ url: '/pages/search/index' });
  },

  openGroup(event) {
    const { groupId } = event.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/group/index?groupId=${groupId}` });
  },

  openExtensionGroup(event) {
    const { groupId } = event.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/extension-group/index?groupId=${groupId}` });
  },

  openStyle(event) {
    const { styleId, itemKind } = event.currentTarget.dataset;
    if (itemKind === 'extension') {
      wx.navigateTo({ url: `/pages/extension-style/index?styleId=${styleId}` });
      return;
    }
    wx.navigateTo({ url: `/pages/style/index?styleId=${styleId}` });
  },
});
