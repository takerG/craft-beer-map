Component({
  properties: {
    prompt: {
      type: String,
      value: '帮我认识精酿啤酒风格',
    },
    contextType: {
      type: String,
      value: 'page',
    },
    contextData: {
      type: null,
      value: null,
    },
  },

  lifetimes: {
    attached() {
      this._agentOpenCallback = () => ({
        followUpMessage: this.data.prompt,
        context: this.buildContext(),
      });
      if (typeof wx.onAgentOpen === 'function') {
        wx.onAgentOpen(this._agentOpenCallback);
      }
    },

    detached() {
      if (this._agentOpenCallback && typeof wx.offAgentOpen === 'function') {
        wx.offAgentOpen(this._agentOpenCallback);
      }
    },
  },

  methods: {
    openAgent() {
      if (typeof wx.checkIsSupportAgent !== 'function') {
        this.showUnsupported();
        return;
      }

      wx.checkIsSupportAgent({
        success: (result) => {
          if (!result || !result.isSupport || typeof wx.openAgent !== 'function') {
            this.showUnsupported();
            return;
          }
          wx.openAgent({
            followUpMessage: this.data.prompt,
            context: this.buildContext(),
          });
        },
        fail: () => this.showUnsupported(),
      });
    },

    buildContext() {
      try {
        return JSON.stringify({
          pageType: this.data.contextType,
          pageData: this.data.contextData,
        });
      } catch (error) {
        return JSON.stringify({ pageType: this.data.contextType });
      }
    },

    showUnsupported() {
      wx.showToast({
        title: '当前微信版本暂不支持 AI 助手',
        icon: 'none',
      });
    },
  },
});
