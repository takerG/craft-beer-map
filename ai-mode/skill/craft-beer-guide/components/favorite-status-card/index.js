Component({
  data: {
    style: null,
    isFavorite: false,
    expired: false,
    statusText: '',
  },

  lifetimes: {
    created() {
      this._modelCtx = wx.modelContext.getContext(this);
      this._viewCtx = wx.modelContext.getViewContext(this);
      const { NotificationType } = wx.modelContext;

      this._modelCtx.on(NotificationType.Result, (data) => {
        const result = data && data.result ? data.result : {};
        const content = result.structuredContent || {};
        this._viewCtx.expirePreviousCards({
          componentPaths: ['skills/craft-beer-guide/components/favorite-status-card/index'],
          match: 'latest',
        });
        this.setData({
          style: content.style || null,
          isFavorite: Boolean(content.isFavorite),
          expired: false,
          statusText: content.isFavorite ? '已加入收藏' : '已取消收藏',
        });
      });

      this._viewCtx.on(NotificationType.Expire, () => {
        this.setData({ expired: true });
      });
    },
  },

  methods: {
    onTapFavorites() {
      if (this.data.expired) return;
      this._viewCtx.openDetailPage({ url: '/pages/favorites/index' });
    },
  },
});
