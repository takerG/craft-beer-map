import { getGroupDetail } from '../../utils/beer-model.js';
import { deferSetData, navigateOnce, switchTabOnce } from '../../utils/page-performance.js';

Page({
  data: {
    loadStatus: 'loading',
    errorMessage: '',
    groupId: '',
    group: null,
    contentReady: false,
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
        contentReady: false,
        categories: [],
      });
      deferSetData(this, {
        contentReady: true,
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

  onShareAppMessage() {
    const group = this.data.group;
    return {
      title: group ? `精酿风格指南：${group.name}的 ${group.styleCount} 个风格入口` : '精酿风格指南',
      path: `/pages/group/index?groupId=${this.data.groupId || 'american'}`,
    };
  },

  openStyle(event) {
    const { styleId } = event.currentTarget.dataset;
    navigateOnce(this, `/pages/style/index?styleId=${styleId}`);
  },

  goExplore() {
    switchTabOnce(this, '/pages/explore/index');
  },
});
