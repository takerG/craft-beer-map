import { searchStyles } from '../../utils/beer-model.js';

Page({
  data: {
    query: '',
    results: [],
    hasQuery: false,
    hasResults: false,
  },

  onInput(event) {
    const query = event.detail.value || '';
    const results = searchStyles(query);
    this.setData({
      query,
      results,
      hasQuery: Boolean(query.trim()),
      hasResults: results.length > 0,
    });
  },

  clearSearch() {
    this.setData({
      query: '',
      results: [],
      hasQuery: false,
      hasResults: false,
    });
  },

  openStyle(event) {
    const { styleId } = event.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/style/index?styleId=${styleId}` });
  },
});
