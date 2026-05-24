import { getExtensionGroups, getSuperGroups, searchStyles } from '../../utils/beer-model.js';
import { navigateOnce, switchTabOnce } from '../../utils/page-performance.js';

Page({
  data: {
    activeSection: 'bjcp',
    groups: [],
    extensionGroups: [],
    featured: [],
    overviewStats: [],
    sectionTabs: [],
  },

  onLoad() {
    const groups = getSuperGroups();
    const extensionGroups = getExtensionGroups();
    const featured = searchStyles('ipa', 6);
    const standardStyleCount = groups.reduce((sum, group) => sum + group.styleCount, 0);
    const extensionStyleCount = extensionGroups.reduce((sum, group) => sum + group.styleCount, 0);

    this.setData({
      groups,
      extensionGroups,
      featured,
      overviewStats: [
        { label: '风格大类', value: groups.length },
        { label: '标准风格', value: standardStyleCount },
        { label: '市场扩展', value: extensionStyleCount },
      ],
      sectionTabs: [
        { id: 'bjcp', label: 'BJCP 大类', countLabel: `${groups.length} 入口` },
        { id: 'extension', label: '市场扩展', countLabel: `${extensionGroups.length} 组` },
      ],
    });
  },

  onShareAppMessage() {
    return {
      title: '精酿风格指南：把 BJCP 和市场叫法放进一套风味坐标',
      path: '/pages/explore/index',
    };
  },

  switchSection(event) {
    const { sectionId } = event.currentTarget.dataset;
    if (!sectionId || sectionId === this.data.activeSection) return;
    this.setData({ activeSection: sectionId });
  },

  openSearch() {
    switchTabOnce(this, '/pages/search/index');
  },

  openGroup(event) {
    const { groupId } = event.currentTarget.dataset;
    navigateOnce(this, `/pages/group/index?groupId=${groupId}`);
  },

  openExtensionGroup(event) {
    const { groupId } = event.currentTarget.dataset;
    navigateOnce(this, `/pages/extension-group/index?groupId=${groupId}`);
  },

  openStyle(event) {
    const { styleId, itemKind } = event.currentTarget.dataset;
    if (itemKind === 'extension') {
      navigateOnce(this, `/pages/extension-style/index?styleId=${styleId}`);
      return;
    }
    navigateOnce(this, `/pages/style/index?styleId=${styleId}`);
  },
});
