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
      if (NotificationType.Overflow) {
        console.info('[ai-mode] style-detail-card overflow monitor=on');
        modelContext.on(NotificationType.Overflow, () => {
          console.info('[ai-mode] style-detail-card overflow detected');
        });
      }
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

    onTapQuestion() {
      if (!this.data.style) return;
      wx.modelContext.getContext(this).sendFollowUpMessage({
        content: [
          { type: 'text', text: `用更容易理解的方式解释${this.data.style.displayName}，并说明适合什么场景` },
        ],
      });
    },
  },
});
