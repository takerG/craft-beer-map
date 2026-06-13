import { getExactTasteMatches, getTasteFilters, getTasteMatches } from '../../utils/beer-model.js';
import { navigateOnce } from '../../utils/page-performance.js';
import { buildShareMessage, buildTimelineShareMessage, enableShareMenu } from '../../utils/share.js';
import { buildFlavorWheelVisual } from '../../utils/taste-visuals.js';
import { trackEvent } from '../../utils/telemetry.js';

const SCENE_PRESETS = [
  {
    id: 'easy',
    label: '轻松畅饮',
    summary: '清爽、顺口，不抢注意力',
    intent: '适合边聊边喝，优先清爽和低负担。',
    filterState: {
      sweetness: -1,
      sourness: -1,
      bitterness: 0,
      body: -1,
      strength: 0,
    },
  },
  {
    id: 'meal',
    label: '搭餐',
    summary: '平衡有层次，适合边吃边喝',
    intent: '不极端，保留一点麦芽、苦味和酒体支撑。',
    filterState: {
      sweetness: 0,
      sourness: -1,
      bitterness: 0,
      body: 0,
      strength: 0,
    },
  },
  {
    id: 'bold',
    label: '重口满足',
    summary: '浓郁、厚实，更有存在感',
    intent: '更适合慢饮，允许更高甜感、苦味、酒体和酒精度。',
    filterState: {
      sweetness: 1,
      sourness: -1,
      bitterness: 1,
      body: 1,
      strength: 1,
    },
  },
  {
    id: 'new',
    label: '尝点新的',
    summary: '保留惊喜，但不过度冒险',
    intent: '口味不预设极端方向，让结果保留探索空间。',
    filterState: {
      sweetness: 0,
      sourness: 0,
      bitterness: 0,
      body: 0,
      strength: 0,
    },
  },
];

const DEFAULT_SCENE_ID = 'easy';
const DEFAULT_FILTER_STATE = getScenePreset(DEFAULT_SCENE_ID).filterState;

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
    scenePresets: buildScenePresets(DEFAULT_SCENE_ID),
    activeSceneId: DEFAULT_SCENE_ID,
    activeSceneLabel: getScenePreset(DEFAULT_SCENE_ID).label,
    activeSceneIntent: getScenePreset(DEFAULT_SCENE_ID).intent,
    filterRows: [],
    filterState: DEFAULT_FILTER_STATE,
    filterSummary: '',
    visualTabs: VISUAL_TABS,
    activeVisualIndex: 0,
    results: [],
    hasResults: false,
    primaryPick: null,
    alternativeResults: [],
    hasAlternatives: false,
    exactMatchResults: [],
    hasExactMatches: false,
    showExactMatches: false,
    exactMatchesToggleLabel: '展开全部复合匹配',
    exactMatchesCountLabel: '',
    resultCountLabel: '0 个推荐',
    showExplanation: false,
    explanationToggleLabel: '展开推荐依据',
    explanationSummary: '',
    wheelChartStyle: '',
    wheelLabels: [],
    wheelLegend: [],
    wheelSummary: '',
    radarMetrics: [],
    starNodes: [],
  },

  onLoad() {
    enableShareMenu();
    this.refreshTasteMatches(DEFAULT_FILTER_STATE, DEFAULT_SCENE_ID);
  },

  onShareAppMessage() {
    trackEvent('choose_share');
    return buildShareMessage({
      title: '今晚喝点啥',
      path: '/pages/choose/index',
    });
  },

  onShareTimeline() {
    trackEvent('choose_timeline_share');
    return buildTimelineShareMessage({
      title: '今晚喝点啥',
    });
  },

  changeScene(event) {
    const { sceneId } = event.currentTarget.dataset;
    const scene = getScenePreset(sceneId);
    if (!scene) return;

    trackEvent('choose_scene_select', { sceneId });
    this.refreshTasteMatches({ ...scene.filterState }, scene.id);
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
      sceneId: this.data.activeSceneId,
    });
    this.refreshTasteMatches(nextFilterState, this.data.activeSceneId, {
      isTasteAdjusted: true,
      preserveInteractionState: true,
    });
  },

  toggleExplanation(event) {
    const showExplanation = !this.data.showExplanation;

    trackEvent('choose_explanation_toggle', {
      expanded: showExplanation,
      source: event && event.currentTarget ? 'toggle' : 'unknown',
      sceneId: this.data.activeSceneId,
    });
    this.setData({
      showExplanation,
      explanationToggleLabel: showExplanation ? '收起推荐依据' : '展开推荐依据',
    });
  },

  toggleExactMatches(event) {
    if (!this.data.hasExactMatches) return;

    const showExactMatches = !this.data.showExactMatches;

    trackEvent('choose_exact_matches_toggle', {
      expanded: showExactMatches,
      source: event && event.currentTarget ? 'toggle' : 'unknown',
      sceneId: this.data.activeSceneId,
      matchCount: this.data.exactMatchResults.length,
    });
    this.setData({
      showExactMatches,
      exactMatchesToggleLabel: buildExactMatchesToggleLabel(showExactMatches, this.data.exactMatchResults.length),
    });
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
      navigateOnce(this, `/subpages/extension-style/index?styleId=${styleId}`);
      return;
    }
    navigateOnce(this, `/subpages/style/index?styleId=${styleId}`);
  },

  refreshTasteMatches(filterState, sceneId = DEFAULT_SCENE_ID, options = {}) {
    const scene = getScenePreset(sceneId) || getScenePreset(DEFAULT_SCENE_ID);
    const filters = getTasteFilters();
    const results = getTasteMatches(filterState, 12).map(toChooseResult);
    const visibleResults = results.slice(0, 3);
    const visibleResultKeys = new Set(visibleResults.map(toResultKey));
    const exactMatchResults = getExactTasteMatches(filterState)
      .map(toChooseResult)
      .filter((result) => !visibleResultKeys.has(toResultKey(result)));
    const primaryPick = visibleResults[0] || null;
    const alternativeResults = visibleResults.slice(1);
    const visualData = buildVisualData(filters, filterState, results);
    const showExplanation = options.preserveInteractionState ? this.data.showExplanation : false;
    const activeVisualIndex = options.preserveInteractionState ? this.data.activeVisualIndex : 0;

    this.setData({
      activeSceneId: scene.id,
      activeSceneLabel: options.isTasteAdjusted ? `${scene.label} · 已微调` : scene.label,
      activeSceneIntent: scene.intent,
      scenePresets: buildScenePresets(scene.id),
      filterState,
      filterRows: buildFilterRows(filters, filterState),
      filterSummary: buildFilterSummary(filters, filterState),
      results,
      hasResults: results.length > 0,
      primaryPick,
      alternativeResults,
      hasAlternatives: alternativeResults.length > 0,
      exactMatchResults,
      hasExactMatches: exactMatchResults.length > 0,
      showExactMatches: false,
      exactMatchesToggleLabel: buildExactMatchesToggleLabel(false, exactMatchResults.length),
      exactMatchesCountLabel: buildExactMatchesCountLabel(exactMatchResults, filters, filterState),
      resultCountLabel: `${visibleResults.length} 个推荐`,
      showExplanation,
      explanationToggleLabel: showExplanation ? '收起推荐依据' : '展开推荐依据',
      explanationSummary: buildExplanationSummary(primaryPick, alternativeResults, scene),
      activeVisualIndex,
      ...visualData,
    });
  },
});

function buildScenePresets(activeSceneId) {
  return SCENE_PRESETS.map((scene) => ({
    ...scene,
    selected: scene.id === activeSceneId,
  }));
}

function toChooseResult(result) {
  return {
    ...result,
    codeLabel: result.kind === 'extension' ? '扩展风格' : result.code,
    matchLabel: buildMatchLabel(result.matchScore),
    reasonText: result.matchReasons.join('、') || '风味轮廓接近',
  };
}

function toResultKey(result) {
  return `${result.kind}:${result.id}`;
}

function buildMatchLabel(matchScore) {
  if (matchScore >= 90) return '高度匹配';
  if (matchScore >= 75) return '较为匹配';
  return '可以尝试';
}

function getScenePreset(sceneId) {
  return SCENE_PRESETS.find((scene) => scene.id === sceneId) || null;
}

function buildFilterRows(filters, filterState) {
  return filters.map((filter) => ({
    ...filter,
    options: filter.options.map((option) => ({
      ...option,
      selected: Number(filterState[filter.id]) === option.value,
    })),
  }));
}

function buildFilterSummary(filters, filterState) {
  return filters.map((filter) => {
    const selected = filter.options.find((option) => option.value === Number(filterState[filter.id]));
    return selected ? selected.label : '中立';
  }).join(' · ');
}

function buildExplanationSummary(primaryPick, alternativeResults, scene) {
  if (!primaryPick) return `${scene.label} 暂时没有稳定推荐，可以放宽一个口味维度再试。`;

  const alternativeCount = alternativeResults.length;
  const alternativeLabel = alternativeCount ? `，并保留 ${alternativeCount} 个相关风格` : '';
  return `${primaryPick.displayName} 最贴近「${scene.label}」的当前口味${alternativeLabel}。`;
}

function buildExactMatchesToggleLabel(expanded, matchCount) {
  if (!matchCount) return '暂无完整复合匹配';
  return expanded ? '收起全部复合匹配' : `展开全部 ${matchCount} 个复合匹配`;
}

function buildExactMatchesCountLabel(exactMatchResults, filters, filterState) {
  if (!exactMatchResults.length) return '当前口味没有完整命中的风格';

  const activeLabels = filters
    .map((filter) => {
      const value = Number(filterState[filter.id]);
      if (value === 0) return '';
      const selected = filter.options.find((option) => option.value === value);
      return selected ? `${filter.label}${selected.label}` : '';
    })
    .filter(Boolean)
    .join(' · ');

  return activeLabels ? `完全命中：${activeLabels}` : '先选择至少一个口味维度';
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
      starLabel: buildStarLabel(result),
      nodeClass: `star-node-${position.size}`,
    };
  });
}

function buildStarLabel(result) {
  const displayName = String(result.displayName || '').replace(/\s|\/|·/g, '');
  if (displayName) return displayName.slice(0, 4);

  const reason = Array.isArray(result.matchReasons) ? result.matchReasons[0] : '';
  return String(reason || '风味').slice(0, 4);
}
