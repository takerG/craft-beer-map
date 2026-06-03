import { getStyleLanguageDetail, getStyleLanguageGroups } from '../../utils/beer-model.js';
import { navigateOnce } from '../../utils/page-performance.js';
import { buildShareMessage } from '../../utils/share.js';
import { trackEvent } from '../../utils/telemetry.js';

const GROUP_ACCENTS = ['#60a5fa', '#f6ad55', '#fb7185', '#f472b6', '#a78bfa', '#34d399', '#f97316', '#53d4da'];

Page({
  data: {
    groups: [],
    activeLanguageId: '',
    activeDetail: null,
  },

  onLoad() {
    const groups = getStyleLanguageGroups().map((group, index) => ({
      ...group,
      color: GROUP_ACCENTS[index % GROUP_ACCENTS.length],
    }));
    const activeLanguageId = groups[0] ? groups[0].id : '';

    this.setData({
      groups,
      activeLanguageId,
      activeDetail: this.buildDetail(activeLanguageId),
    });
  },

  onShareAppMessage() {
    const detail = this.data.activeDetail;
    trackEvent('style_language_share', { languageId: detail && detail.group ? detail.group.id : '' });
    return buildShareMessage({
      title: '听过叫法不懂风格？这里能对上',
      path: '/pages/style-language/index',
    });
  },

  selectLanguage(event) {
    const { languageId } = event.currentTarget.dataset;
    if (!languageId || languageId === this.data.activeLanguageId) return;

    trackEvent('style_language_group_select', { languageId });
    this.setData({
      activeLanguageId: languageId,
      activeDetail: this.buildDetail(languageId),
    });
  },

  openStyle(event) {
    const { styleId, itemKind } = event.currentTarget.dataset;
    if (!styleId) return;

    trackEvent('style_language_style_open', {
      styleId,
      itemKind,
      languageId: this.data.activeLanguageId,
    });
    if (itemKind === 'extension') {
      navigateOnce(this, `/pages/extension-style/index?styleId=${styleId}`);
      return;
    }
    navigateOnce(this, `/pages/style/index?styleId=${styleId}`);
  },

  buildDetail(languageId) {
    const detail = getStyleLanguageDetail(languageId);
    if (!detail) return null;

    return {
      ...detail,
      styles: detail.styles.map((style) => ({
        ...style,
        codeLabel: style.kind === 'extension' ? '扩展' : style.code,
      })),
    };
  },
});
