const catalog = require('../../data/catalog.js');
const runtime = require('../../utils/catalog-runtime.js');

Page({
  data: {
    title: '风格结果',
    items: [],
    headerPaddingTop: 32,
  },

  onLoad(query) {
    this.setHeaderPadding();
    const keyword = query && query.keyword ? decodeURIComponent(query.keyword) : '';
    const items = keyword
      ? runtime.searchBeerStyles(catalog, keyword, 20)
      : runtime.recommendBeerStyles(catalog, {}, 20);
    this.setData({
      title: keyword ? `“${keyword}”的匹配风格` : '推荐风格',
      items,
    });
  },

  onTapStyle(event) {
    const item = event.currentTarget.dataset.item;
    if (!item || !item.styleRef) return;

    const modelContext = wx.modelContext.getContext();
    modelContext.sendFollowUpMessage({
      content: [
        { type: 'text', text: `查看${item.displayName}的风格详情` },
        {
          type: 'api/call',
          data: {
            name: 'getBeerStyleDetail',
            arguments: { styleRef: item.styleRef },
          },
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
