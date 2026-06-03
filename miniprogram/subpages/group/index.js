import { getGroupDetail } from '../../utils/beer-model.js';
import { deferSetData, navigateOnce, switchTabOnce } from '../../utils/page-performance.js';
import { buildShareMessage, buildTimelineShareMessage, enableShareMenu } from '../../utils/share.js';
import { trackEvent } from '../../utils/telemetry.js';

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
    enableShareMenu();

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
    trackEvent('group_share', { groupId: this.data.groupId });
    return buildShareMessage({
      title: group ? `风格指南：${group.name}` : undefined,
      path: `/subpages/group/index?groupId=${this.data.groupId || 'american'}`,
    });
  },

  onShareTimeline() {
    const group = this.data.group;
    const groupId = this.data.groupId || 'american';
    trackEvent('group_timeline_share', { groupId });
    return buildTimelineShareMessage({
      title: group ? `风格指南：${group.name}` : undefined,
      query: `groupId=${groupId}`,
    });
  },

  openStyle(event) {
    const { styleId } = event.currentTarget.dataset;
    trackEvent('style_open', { styleId, groupId: this.data.groupId, source: 'group' });
    navigateOnce(this, `/subpages/style/index?styleId=${styleId}`);
  },

  goExplore() {
    trackEvent('back_to_explore', { source: 'group_error' });
    switchTabOnce(this, '/pages/explore/index');
  },
});
