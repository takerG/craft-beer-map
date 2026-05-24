import { getStyleDetail } from '../../utils/beer-model.js';

Page({
  data: {
    loadStatus: 'loading',
    errorMessage: '',
    detail: null,
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
        });
        return;
      }
      wx.setNavigationBarTitle({ title: `${detail.style.code} ${detail.style.displayName}` });
      this.setData({ loadStatus: 'ready', errorMessage: '', detail });
    } catch (error) {
      wx.setNavigationBarTitle({ title: '加载失败' });
      this.setData({
        loadStatus: 'error',
        errorMessage: '风格详情暂时无法打开。',
      });
    }
  },

  openRelated(event) {
    const { styleId } = event.currentTarget.dataset;
    wx.redirectTo({ url: `/pages/style/index?styleId=${styleId}` });
  },

  openGroup() {
    const groupId = this.data.detail && this.data.detail.group && this.data.detail.group.id;
    if (!groupId) return;
    wx.navigateTo({ url: `/pages/group/index?groupId=${groupId}` });
  },

  goSearch() {
    wx.switchTab({ url: '/pages/search/index' });
  },
});
