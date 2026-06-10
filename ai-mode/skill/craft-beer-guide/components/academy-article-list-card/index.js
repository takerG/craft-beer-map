Component({
  data: {
    items: [],
    title: '学院文章',
  },

  lifetimes: {
    created() {
      this._modelCtx = wx.modelContext.getContext(this);
      this._viewCtx = wx.modelContext.getViewContext(this);
      const { NotificationType } = wx.modelContext;

      this._modelCtx.on(NotificationType.Result, (data) => {
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
      this._viewCtx.setRelatedPage({ query: `slug=${encodeURIComponent(item.slug)}` });
      this._viewCtx.openDetailPage({ url: item.route });
    },
  },
});
