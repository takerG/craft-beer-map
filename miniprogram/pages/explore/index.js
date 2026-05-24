import { getExtensionGroups, getGuideOverview, getSuperGroups, searchStyles } from '../../utils/beer-model.js';
import { navigateOnce, switchTabOnce } from '../../utils/page-performance.js';
import { trackEvent } from '../../utils/telemetry.js';

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
    const overview = getGuideOverview();
    const featured = searchStyles('ipa', 6);

    this.setData({
      groups,
      extensionGroups,
      featured,
      overviewStats: [
        { label: '风格大类', value: overview.groupCount },
        { label: '标准风格', value: overview.standardStyleCount },
        { label: '市场扩展', value: overview.extensionStyleCount },
      ],
      sectionTabs: [
        { id: 'bjcp', label: 'BJCP 大类', countLabel: `${overview.groupCount} 入口` },
        { id: 'extension', label: '市场扩展', countLabel: `${overview.extensionGroupCount} 组` },
      ],
    });
  },

  onShareAppMessage() {
    trackEvent('explore_share');
    return {
      title: '精酿风格指南：把 BJCP 和市场叫法放进一套风味坐标',
      path: '/pages/explore/index',
    };
  },

  switchSection(event) {
    const { sectionId } = event.currentTarget.dataset;
    if (!sectionId || sectionId === this.data.activeSection) return;
    trackEvent('explore_section_switch', { sectionId });
    this.setData({ activeSection: sectionId });
  },

  openSearch() {
    trackEvent('explore_search_open');
    switchTabOnce(this, '/pages/search/index');
  },

  openGroup(event) {
    const { groupId } = event.currentTarget.dataset;
    trackEvent('group_open', { groupId, source: 'explore' });
    navigateOnce(this, `/pages/group/index?groupId=${groupId}`);
  },

  openExtensionGroup(event) {
    const { groupId } = event.currentTarget.dataset;
    trackEvent('extension_group_open', { groupId, source: 'explore' });
    navigateOnce(this, `/pages/extension-group/index?groupId=${groupId}`);
  },

  openStyle(event) {
    const { styleId, itemKind } = event.currentTarget.dataset;
    trackEvent('style_open', { styleId, itemKind, source: 'explore_featured' });
    if (itemKind === 'extension') {
      navigateOnce(this, `/pages/extension-style/index?styleId=${styleId}`);
      return;
    }
    navigateOnce(this, `/pages/style/index?styleId=${styleId}`);
  },
});
