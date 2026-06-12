Component({
  data: {
    style: null,
    statusText: '',
  },

  properties: {
    expired: {
      type: Boolean,
      value: false,
    },
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
          statusText: content.isFavorite ? '已加入收藏' : '已取消收藏',
        });
      });
      if (NotificationType.Overflow) {
        console.info('[ai-mode] favorite-status-card overflow monitor=on');
        modelContext.on(NotificationType.Overflow, () => {
          console.info('[ai-mode] favorite-status-card overflow detected');
        });
      }
    },
  },

  methods: {
    onTapFavorites() {
      wx.modelContext.getViewContext(this)
        .openDetailPage({ url: '/pages/favorites/index' });
    },
  },
});
