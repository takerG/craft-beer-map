import { getExtensionGroups, getGuideOverview, getSuperGroups, searchStyles } from '../../utils/beer-model.js';
import { navigateOnce, switchTabOnce } from '../../utils/page-performance.js';
import { buildShareMessage, buildTimelineShareMessage, enableShareMenu } from '../../utils/share.js';
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
    enableShareMenu();

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
    return buildShareMessage({
      title: '酒蒙子的第一课',
      path: '/pages/explore/index',
    });
  },

  onShareTimeline() {
    trackEvent('explore_timeline_share');
    return buildTimelineShareMessage({
      title: '酒蒙子的第一课',
    });
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

  openStyleLanguage() {
    trackEvent('explore_style_language_open');
    navigateOnce(this, '/subpages/style-language/index');
  },

  openGroup(event) {
    const { groupId } = event.currentTarget.dataset;
    trackEvent('group_open', { groupId, source: 'explore' });
    navigateOnce(this, `/subpages/group/index?groupId=${groupId}`);
  },

  openExtensionGroup(event) {
    const { groupId } = event.currentTarget.dataset;
    trackEvent('extension_group_open', { groupId, source: 'explore' });
    navigateOnce(this, `/subpages/extension-group/index?groupId=${groupId}`);
  },

  openStyle(event) {
    const { styleId, itemKind } = event.currentTarget.dataset;
    trackEvent('style_open', { styleId, itemKind, source: 'explore_featured' });
    if (itemKind === 'extension') {
      navigateOnce(this, `/subpages/extension-style/index?styleId=${styleId}`);
      return;
    }
    navigateOnce(this, `/subpages/style/index?styleId=${styleId}`);
  },
});
