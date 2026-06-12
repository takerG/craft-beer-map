const FILTERS = [
  { id: 'sweetness', label: '甜度' },
  { id: 'sourness', label: '酸度' },
  { id: 'bitterness', label: '苦味' },
  { id: 'body', label: '酒体' },
  { id: 'strength', label: '强度' },
];
const OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'neutral', label: '中立' },
  { value: 'high', label: '高' },
  { value: 'unspecified', label: '未指定' },
];

Page({
  data: {
    filters: buildFilters({}),
    preferences: {},
    headerPaddingTop: 32,
  },

  onLoad() {
    this.setHeaderPadding();
  },

  onTapOption(event) {
    const { filterId, value } = event.currentTarget.dataset;
    const preferences = { ...this.data.preferences, [filterId]: value };
    this.setData({ preferences, filters: buildFilters(preferences) });
  },

  onTapConfirm() {
    const summary = Object.entries(this.data.preferences)
      .map(([key, value]) => `${key}=${value}`)
      .join('，');
    const ctx = wx.modelContext.getContext();
    ctx.sendFollowUpMessage({
      content: [
        {
          type: 'text',
          text: `请把上一轮完整偏好快照中的这些维度改为：${summary || '暂未选择'}；其余维度和场景保持不变，然后用最新 flow 调用 recommendBeerStyles。`,
        },
      ],
    });
  },

  setHeaderPadding() {
    if (typeof wx.getDetailPageCloseButtonBoundingClientRect !== 'function') return;
    wx.getDetailPageCloseButtonBoundingClientRect({
      success: (rect) => {
        if (!rect) return;
        this.setData({
          headerPaddingTop: Math.max((rect.top || 0) + (rect.height || 0) + 8, 32),
        });
      },
    });
  },
});

function buildFilters(preferences) {
  return FILTERS.map((filter) => ({
    ...filter,
    options: OPTIONS.map((option) => ({
      ...option,
      selected: preferences[filter.id] === option.value,
    })),
  }));
}
