const FILTERS = [
  { id: 'sweetness', label: '甜度' },
  { id: 'sourness', label: '酸度' },
  { id: 'bitterness', label: '苦味' },
  { id: 'body', label: '酒体' },
  { id: 'strength', label: '强度' },
];
const OPTIONS = [
  { value: -1, label: '低' },
  { value: 0, label: '中立' },
  { value: 1, label: '高' },
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
    const preferences = {
      ...this.data.preferences,
      [filterId]: Number(value),
    };
    this.setData({
      preferences,
      filters: buildFilters(preferences),
    });
  },

  onTapConfirm() {
    const preferences = this.data.preferences;
    wx.navigateBackAgent({
      followUpMessage: {
        content: [
          { type: 'text', text: '按我刚刚微调的口味重新推荐啤酒风格' },
          {
            type: 'api/call',
            data: {
              name: 'recommendBeerStyles',
              arguments: { preferences },
            },
          },
        ],
      },
      context: JSON.stringify({ tastePreferences: preferences }),
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
      selected: Number(preferences[filter.id] || 0) === option.value,
    })),
  }));
}
