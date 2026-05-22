import { getSuperGroups, searchStyles } from '../../utils/beer-model.js';

Page({
  data: {
    groups: [],
    featured: [],
  },

  onLoad() {
    this.setData({
      groups: getSuperGroups(),
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

  openStyle(event) {
    const { styleId } = event.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/style/index?styleId=${styleId}` });
  },
});
