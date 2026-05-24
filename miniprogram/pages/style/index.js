import { getStyleDetail } from '../../utils/beer-model.js';
import { deferSetData, navigateOnce, redirectOnce, switchTabOnce } from '../../utils/page-performance.js';

Page({
  data: {
    loadStatus: 'loading',
    errorMessage: '',
    contentReady: false,
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
      this.setData({
        loadStatus: 'ready',
        errorMessage: '',
        contentReady: false,
        detail: {
          ...detail,
          stats: [],
          sections: [],
          tags: [],
          related: [],
        },
      });
      deferSetData(this, {
        contentReady: true,
        'detail.stats': detail.stats,
        'detail.sections': detail.sections,
        'detail.tags': detail.tags,
        'detail.related': detail.related,
      });
    } catch (error) {
      wx.setNavigationBarTitle({ title: '加载失败' });
      this.setData({
        loadStatus: 'error',
        errorMessage: '风格详情暂时无法打开。',
      });
    }
  },

  onShareAppMessage() {
    const detail = this.data.detail;
    const style = detail && detail.style;
    return {
      title: style ? `精酿风格名片：${style.code} ${style.displayName}` : '精酿风格指南',
      path: `/pages/style/index?styleId=${style ? style.id : ''}`,
    };
  },

  openRelated(event) {
    const { styleId } = event.currentTarget.dataset;
    redirectOnce(this, `/pages/style/index?styleId=${styleId}`);
  },

  openGroup() {
    const groupId = this.data.detail && this.data.detail.group && this.data.detail.group.id;
    if (!groupId) return;
    navigateOnce(this, `/pages/group/index?groupId=${groupId}`);
  },

  goSearch() {
    switchTabOnce(this, '/pages/search/index');
  },
});
