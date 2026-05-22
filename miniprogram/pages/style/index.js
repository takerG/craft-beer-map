import { getStyleDetail } from '../../utils/beer-model.js';

Page({
  data: {
    detail: null,
  },

  onLoad(options) {
    const styleId = options.styleId || '';
    const detail = getStyleDetail(styleId);
    if (!detail) {
      wx.setNavigationBarTitle({ title: '未找到风格' });
      return;
    }
    wx.setNavigationBarTitle({ title: `${detail.style.code} ${detail.style.displayName}` });
    this.setData({ detail });
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
});
