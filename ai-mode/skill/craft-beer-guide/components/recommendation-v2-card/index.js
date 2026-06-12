Component({
  data: {
    items: [],
    flow: null,
    snapshot: null,
    explanation: { matched: [], tradeoffs: [], adjustments: [] },
    inFlight: false,
    visibleLimit: 3,
  },

  lifetimes: {
    created() {
      const context = wx.modelContext.getContext(this);
      const { NotificationType } = wx.modelContext;
      context.on(NotificationType.Result, (data) => {
        const result = data && data.result ? data.result : {};
        const content = result.structuredContent || {};
        if (content.contract !== 'semantic-v2') return;
        this.setData({
          items: (content.items || []).slice(0, this.data.visibleLimit),
          flow: content.flow || null,
          snapshot: content.snapshot || null,
          explanation: content.explanation || null,
          inFlight: false,
        });
        if (result._meta && result._meta.expirePreviousCards) {
          const viewContext = wx.modelContext.getViewContext(this);
          if (viewContext && typeof viewContext.expirePreviousCards === 'function') {
            viewContext.expirePreviousCards({
              componentPaths: [
                'skills/craft-beer-guide/components/recommendation-v2-card/index',
              ],
            });
          }
        }
      });
      if (NotificationType.Overflow) {
        console.info('[ai-mode] recommendation-v2-card overflow monitor=on');
        context.on(NotificationType.Overflow, () => {
          this.setData({ visibleLimit: 2, items: this.data.items.slice(0, 2) });
        });
      }
    },
  },

  methods: {
    onTapDetail(event) {
      this.sendTerminalAction('getBeerStyleDetail', event.currentTarget.dataset.item);
    },

    onTapFavorite(event) {
      this.sendTerminalAction('addFavoriteBeerStyle', event.currentTarget.dataset.item);
    },

    onTapAdjust() {
      if (this.data.inFlight) return;
      this.setData({ inFlight: true });
      wx.modelContext.getContext(this).sendFollowUpMessage({
        content: [{
          type: 'text',
          text: '我想调整上一轮推荐。请先问我只想改哪一项，再基于上一轮完整快照调用 recommendBeerStyles；未提到的维度保持不变。',
        }],
      });
    },

    sendTerminalAction(name, item) {
      if (this.data.inFlight || !item || !item.styleRef || !this.data.flow) return;
      this.setData({ inFlight: true });
      const context = wx.modelContext.getContext(this);
      const argumentsValue = {
        styleRef: item.styleRef,
        recommendationContext: {
          flowId: this.data.flow.flowId,
          expectedRevision: this.data.flow.revision,
          requestId: createRequestId(),
        },
      };
      context.sendFollowUpMessage({
        content: [
          {
            type: 'text',
            text: name === 'addFavoriteBeerStyle'
              ? `收藏${item.displayName}`
              : `查看${item.displayName}的风格详情`,
          },
          { type: 'api/call', data: { name, arguments: argumentsValue } },
        ],
      });
    },
  },
});

function createRequestId() {
  let value = '';
  while (value.length < 12) value += Math.floor(Math.random() * 16).toString(16);
  return `req_${value}`;
}
