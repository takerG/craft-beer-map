Component({
  data: {
    title: '风格推荐',
    items: [],
    total: 0,
    hasMore: false,
    keyword: '',
  },

  lifetimes: {
    created() {
      const modelContext = wx.modelContext.getContext(this);
      const { NotificationType } = wx.modelContext;

      modelContext.on(NotificationType.Result, (data) => {
        const result = data && data.result ? data.result : {};
        const content = result.structuredContent || {};
        const meta = result._meta || {};
        const items = meta.viewItems || content.items || [];
        const keyword = content.keyword || '';

        this.setData({
          items: items.slice(0, 3),
          total: Number(content.total || items.length),
          hasMore: Number(content.total || items.length) > 3,
          keyword,
          title: keyword ? `“${keyword}”搜索结果` : '风格推荐',
        });
        if (keyword) {
          wx.modelContext.getViewContext(this)
            .setRelatedPage({ query: `keyword=${encodeURIComponent(keyword)}` });
        }
      });
    },
  },

  methods: {
    onTapStyle(event) {
      const item = event.currentTarget.dataset.item;
      if (!item || !item.styleRef) return;

      wx.modelContext.getContext(this).sendFollowUpMessage({
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

    onTapMore() {
      wx.modelContext.getViewContext(this).openDetailPage({
        url: this.data.keyword
          ? `/aiDetail/pages/style-results/index?keyword=${encodeURIComponent(this.data.keyword)}`
          : '/aiDetail/pages/style-results/index',
      });
    },
  },
});
