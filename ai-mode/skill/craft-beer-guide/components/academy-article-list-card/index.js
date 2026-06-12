Component({
  data: {
    items: [],
    title: '学院文章',
  },

  lifetimes: {
    created() {
      const modelContext = wx.modelContext.getContext(this);
      const { NotificationType } = wx.modelContext;

      modelContext.on(NotificationType.Result, (data) => {
        const result = data && data.result ? data.result : {};
        const content = result.structuredContent || {};
        const meta = result._meta || {};
        this.setData({
          items: (meta.viewItems || content.items || []).slice(0, 3),
          title: content.keyword ? `“${content.keyword}”相关文章` : '学院文章',
        });
      });
    },
  },

  methods: {
    onTapArticle(event) {
      const item = event.currentTarget.dataset.item;
      if (!item || !item.route) return;
      const viewContext = wx.modelContext.getViewContext(this);
      viewContext.setRelatedPage({ query: `slug=${encodeURIComponent(item.slug)}` });
      viewContext.openDetailPage({ url: item.route });
    },
  },
});
