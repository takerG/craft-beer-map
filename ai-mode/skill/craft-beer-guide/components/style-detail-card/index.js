Component({
  data: {
    detail: null,
    style: null,
    summary: '',
  },

  lifetimes: {
    created() {
      const modelContext = wx.modelContext.getContext(this);
      const { NotificationType } = wx.modelContext;

      modelContext.on(NotificationType.Result, (data) => {
        const result = data && data.result ? data.result : {};
        const detail = result._meta && result._meta.detail
          ? result._meta.detail
          : result.structuredContent;
        const style = detail && detail.style ? detail.style : null;
        const firstSection = detail && Array.isArray(detail.sections) ? detail.sections[0] : null;

        this.setData({
          detail,
          style,
          summary: detail
            ? detail.description || (firstSection && firstSection.content) || detail.bjcpNote || ''
            : '',
        });
        if (style && style.styleRef) {
          wx.modelContext.getViewContext(this).setRelatedPage({
            query: `kind=${style.styleRef.kind}&styleId=${encodeURIComponent(style.styleRef.id)}`,
          });
        }
      });
    },
  },

  methods: {
    onTapFavorite() {
      if (!this.data.style || !this.data.style.styleRef) return;
      wx.modelContext.getContext(this).sendFollowUpMessage({
        content: [
          { type: 'text', text: `收藏${this.data.style.displayName}` },
          {
            type: 'api/call',
            data: {
              name: 'addFavoriteBeerStyle',
              arguments: { styleRef: this.data.style.styleRef },
            },
          },
        ],
      });
    },

    onTapDetail() {
      const styleRef = this.data.style && this.data.style.styleRef;
      if (!styleRef || !styleRef.id) return;

      const route = styleRef.kind === 'extension'
        ? '/subpages/extension-style/index'
        : '/subpages/style/index';
      wx.modelContext.getViewContext(this).openDetailPage({
        url: `${route}?styleId=${encodeURIComponent(styleRef.id)}`,
      });
    },
  },
});
