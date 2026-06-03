import { searchStyles } from '../../utils/beer-model.js';
import { navigateOnce } from '../../utils/page-performance.js';
import { trackEvent } from '../../utils/telemetry.js';

Page({
  data: {
    query: '',
    results: [],
    hasQuery: false,
    hasResults: false,
    suggestions: ['IPA', '果汁感', '小甜水', '咖啡世涛', '茶感', '不苦'],
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
    trackEvent('search_clear', { hadQuery: this.data.hasQuery });
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
    trackEvent('search_submit', {
      query,
      resultCount: results.length,
      source: 'suggestion',
    });
    this.setData({
      query,
      results,
      hasQuery: Boolean(query.trim()),
      hasResults: results.length > 0,
    });
  },

  submitSearch() {
    const query = this.data.query || '';
    trackEvent('search_submit', {
      query,
      resultCount: this.data.results.length,
      source: 'keyboard',
    });
  },

  openStyle(event) {
    const { styleId, itemKind } = event.currentTarget.dataset;
    trackEvent('search_result_open', { styleId, itemKind, query: this.data.query });
    if (itemKind === 'extension') {
      navigateOnce(this, `/subpages/extension-style/index?styleId=${styleId}`);
      return;
    }
    navigateOnce(this, `/subpages/style/index?styleId=${styleId}`);
  },
});
