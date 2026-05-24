import { searchStyles } from '../../utils/beer-model.js';
import { navigateOnce } from '../../utils/page-performance.js';

Page({
  data: {
    query: '',
    results: [],
    hasQuery: false,
    hasResults: false,
    suggestions: ['IPA', '拉格', '世涛', '贵兹'],
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

  useSuggestion(event) {
    const query = event.currentTarget.dataset.query || '';
    const results = searchStyles(query);
    this.setData({
      query,
      results,
      hasQuery: Boolean(query.trim()),
      hasResults: results.length > 0,
    });
  },

  openStyle(event) {
    const { styleId, itemKind } = event.currentTarget.dataset;
    if (itemKind === 'extension') {
      navigateOnce(this, `/pages/extension-style/index?styleId=${styleId}`);
      return;
    }
    navigateOnce(this, `/pages/style/index?styleId=${styleId}`);
  },
});
