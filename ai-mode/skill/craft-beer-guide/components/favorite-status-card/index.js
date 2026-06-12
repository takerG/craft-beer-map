Component({
  data: {
    style: null,
    isFavorite: false,
    statusText: '',
  },

  lifetimes: {
    created() {
      const modelContext = wx.modelContext.getContext(this);
      const { NotificationType } = wx.modelContext;

      modelContext.on(NotificationType.Result, (data) => {
        const result = data && data.result ? data.result : {};
        const content = result.structuredContent || {};
        wx.modelContext.getViewContext(this).expirePreviousCards({
          componentPaths: ['skills/craft-beer-guide/components/favorite-status-card/index'],
          match: 'latest',
        });
        this.setData({
          style: content.style || null,
          isFavorite: Boolean(content.isFavorite),
          statusText: content.isFavorite ? '已加入收藏' : '已取消收藏',
        });
      });

    },
  },

  methods: {
    onTapFavorites() {
      wx.modelContext.getViewContext(this)
        .openDetailPage({ url: '/pages/favorites/index' });
    },
  },
});
