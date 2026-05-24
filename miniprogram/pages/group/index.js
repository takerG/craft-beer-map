import { getGroupDetail } from '../../utils/beer-model.js';

Page({
  data: {
    loadStatus: 'loading',
    errorMessage: '',
    groupId: '',
    group: null,
    categories: [],
  },

  onLoad(options) {
    const groupId = options.groupId || 'american';
    try {
      const detail = getGroupDetail(groupId);
      wx.setNavigationBarTitle({ title: detail.group.name });
      this.setData({
        loadStatus: 'ready',
        errorMessage: '',
        groupId,
        group: detail.group,
        categories: detail.categories,
      });
    } catch (error) {
      wx.setNavigationBarTitle({ title: '未找到大类' });
      this.setData({
        loadStatus: 'error',
        errorMessage: '没有找到这个风格大类。',
      });
    }
  },

  openStyle(event) {
    const { styleId } = event.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/style/index?styleId=${styleId}` });
  },

  goExplore() {
    wx.switchTab({ url: '/pages/explore/index' });
  },
});
