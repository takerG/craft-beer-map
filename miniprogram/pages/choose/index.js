import { getTasteFilters, getTasteMatches } from '../../utils/beer-model.js';
import { navigateOnce } from '../../utils/page-performance.js';
import { buildFlavorWheelVisual } from '../../utils/taste-visuals.js';
import { trackEvent } from '../../utils/telemetry.js';

const DEFAULT_FILTER_STATE = {
  sweetness: 1,
  sourness: -1,
  bitterness: 0,
  body: 0,
  roast: 0,
  fruitiness: 0,
  hopAroma: 0,
  fermentation: 0,
  strength: 0,
};

const VISUAL_TABS = [
  { id: 'wheel', label: '风味轮' },
  { id: 'radar', label: '雷达图' },
  { id: 'stars', label: '星图' },
];

const STAR_POSITIONS = [
  { x: 48, y: 44, size: 'large' },
  { x: 23, y: 23, size: 'medium' },
  { x: 72, y: 22, size: 'medium' },
  { x: 25, y: 74, size: 'small' },
  { x: 72, y: 72, size: 'small' },
];

Page({
  data: {
    filterRows: [],
    filterState: DEFAULT_FILTER_STATE,
    visualTabs: VISUAL_TABS,
    activeVisualIndex: 0,
    results: [],
    hasResults: false,
    resultCountLabel: '0 个匹配',
    wheelChartStyle: '',
    wheelLabels: [],
    wheelLegend: [],
    wheelSummary: '',
    radarMetrics: [],
    starNodes: [],
  },

  onLoad() {
    this.refreshTasteMatches(DEFAULT_FILTER_STATE);
  },

  onShareAppMessage() {
    trackEvent('choose_share');
    return {
      title: '择饮：按口味找到适合你的精酿风格',
      path: '/pages/choose/index',
    };
  },

  changeFilter(event) {
    const { filterId, filterValue } = event.currentTarget.dataset;
    if (!filterId) return;

    const nextFilterState = {
      ...this.data.filterState,
      [filterId]: Number(filterValue),
    };

    trackEvent('choose_filter_change', {
      filterId,
      filterValue: Number(filterValue),
    });
    this.refreshTasteMatches(nextFilterState);
  },

  tapVisualTab(event) {
    const visualIndex = Number(event.currentTarget.dataset.visualIndex);
    if (Number.isNaN(visualIndex) || visualIndex === this.data.activeVisualIndex) return;

    trackEvent('choose_view_switch', {
      visualId: VISUAL_TABS[visualIndex] ? VISUAL_TABS[visualIndex].id : '',
      source: 'tab',
    });
    this.setData({ activeVisualIndex: visualIndex });
  },

  switchVisualView(event) {
    const visualIndex = Number(event.detail.current);
    if (Number.isNaN(visualIndex) || visualIndex === this.data.activeVisualIndex) return;

    trackEvent('choose_view_switch', {
      visualId: VISUAL_TABS[visualIndex] ? VISUAL_TABS[visualIndex].id : '',
      source: 'swiper',
    });
    this.setData({ activeVisualIndex: visualIndex });
  },

  openStyle(event) {
    const { styleId, itemKind } = event.currentTarget.dataset;
    if (!styleId) return;

    trackEvent('choose_style_open', { styleId, itemKind });
    if (itemKind === 'extension') {
      navigateOnce(this, `/pages/extension-style/index?styleId=${styleId}`);
      return;
    }
    navigateOnce(this, `/pages/style/index?styleId=${styleId}`);
  },

  refreshTasteMatches(filterState) {
    const filters = getTasteFilters();
    const results = getTasteMatches(filterState, 12).map((result) => ({
      ...result,
      codeLabel: result.kind === 'extension' ? 'EX' : result.code,
      reasonText: result.matchReasons.join('、') || '风味轮廓接近',
    }));
    const visualData = buildVisualData(filters, filterState, results);

    this.setData({
      filterState,
      filterRows: buildFilterRows(filters, filterState),
      results,
      hasResults: results.length > 0,
      resultCountLabel: `${results.length} 个匹配`,
      ...visualData,
    });
  },
});

function buildFilterRows(filters, filterState) {
  return filters.map((filter) => ({
    ...filter,
    options: filter.options.map((option) => ({
      ...option,
      selected: Number(filterState[filter.id]) === option.value,
    })),
  }));
}

function buildVisualData(filters, filterState, results) {
  const flavorWheel = buildFlavorWheelVisual(filters, filterState, results);

  return {
    wheelChartStyle: flavorWheel.chartStyle,
    wheelLabels: flavorWheel.labels,
    wheelLegend: flavorWheel.legend,
    wheelSummary: flavorWheel.summary,
    radarMetrics: buildRadarMetrics(filters, results),
    starNodes: buildStarNodes(results),
  };
}

function buildRadarMetrics(filters, results) {
  const topResults = results.slice(0, 6);
  return filters.slice(0, 5).map((filter, index) => {
    const average = topResults.length
      ? topResults.reduce((sum, result) => sum + Number(result.taste_profile[filter.id] || 0), 0) / topResults.length
      : 0;
    const level = Math.round(58 + average * 34);

    return {
      id: filter.id,
      label: filter.label,
      level: Math.max(28, Math.min(92, level)),
      className: `radar-metric-${index + 1}`,
    };
  });
}

function buildStarNodes(results) {
  return results.slice(0, 5).map((result, index) => {
    const position = STAR_POSITIONS[index] || STAR_POSITIONS[STAR_POSITIONS.length - 1];
    return {
      ...result,
      x: position.x,
      y: position.y,
      nodeClass: `star-node-${position.size}`,
    };
  });
}
