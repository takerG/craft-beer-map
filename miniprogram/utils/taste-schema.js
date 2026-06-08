export const TASTE_PROFILE_DIMENSIONS = [
  'sweetness',
  'sourness',
  'bitterness',
  'body',
  'roast',
  'fruitiness',
  'hopAroma',
  'fermentation',
  'strength',
];

export const ACTIVE_TASTE_FILTER_IDS = [
  'sweetness',
  'sourness',
  'bitterness',
  'body',
  'strength',
];

export const TASTE_FILTERS = [
  {
    id: 'sweetness',
    label: '甜度',
    lowLabel: '不甜',
    neutralLabel: '中立',
    highLabel: '甜',
    reasonLabels: { '-1': '不甜', 0: '甜度适中', 1: '有甜感' },
    visual: {
      dimension: '甜度',
      highLabel: '麦芽甜',
      lowLabel: '干爽',
      color: '#ffcf85',
      mutedColor: '#2b3748',
    },
  },
  {
    id: 'sourness',
    label: '酸感',
    lowLabel: '不酸',
    neutralLabel: '中立',
    highLabel: '喝酸',
    reasonLabels: { '-1': '不酸', 0: '酸感适中', 1: '有酸感' },
    visual: {
      dimension: '酸感',
      highLabel: '酸感',
      lowLabel: '不酸',
      color: '#53d4da',
      mutedColor: '#263645',
    },
  },
  {
    id: 'bitterness',
    label: '苦度',
    lowLabel: '低苦',
    neutralLabel: '中立',
    highLabel: '高苦',
    reasonLabels: { '-1': '低苦', 0: '苦度适中', 1: '苦味明显' },
    visual: {
      dimension: '苦度',
      highLabel: '酒花苦',
      lowLabel: '低苦',
      color: '#a86dff',
      mutedColor: '#2e3145',
    },
  },
  {
    id: 'body',
    label: '酒体',
    lowLabel: '轻盈',
    neutralLabel: '中立',
    highLabel: '厚重',
    reasonLabels: { '-1': '酒体轻盈', 0: '酒体适中', 1: '酒体饱满' },
    visual: {
      dimension: '酒体',
      highLabel: '厚重',
      lowLabel: '轻盈',
      color: '#ff7a3d',
      mutedColor: '#332f2d',
    },
  },
  {
    id: 'roast',
    label: '烘烤',
    lowLabel: '清淡',
    neutralLabel: '中立',
    highLabel: '烘烤',
    reasonLabels: { '-1': '少烘烤', 0: '烘烤适中', 1: '烘烤深色' },
    visual: {
      dimension: '烘烤',
      highLabel: '深色烘烤',
      lowLabel: '清淡',
      color: '#ff5a43',
      mutedColor: '#342b2a',
    },
  },
  {
    id: 'fruitiness',
    label: '果香',
    lowLabel: '少果香',
    neutralLabel: '中立',
    highLabel: '果香',
    reasonLabels: { '-1': '果香内敛', 0: '果香适中', 1: '果香明显' },
    visual: {
      dimension: '果香',
      highLabel: '果香',
      lowLabel: '内敛',
      color: '#fb7185',
      mutedColor: '#322f3b',
    },
  },
  {
    id: 'hopAroma',
    label: '酒花香',
    lowLabel: '少酒花',
    neutralLabel: '中立',
    highLabel: '酒花香',
    reasonLabels: { '-1': '酒花内敛', 0: '酒花适中', 1: '酒花香明显' },
    visual: {
      dimension: '酒花香',
      highLabel: '酒花香',
      lowLabel: '内敛',
      color: '#7dd3fc',
      mutedColor: '#233747',
    },
  },
  {
    id: 'fermentation',
    label: '发酵',
    lowLabel: '干净',
    neutralLabel: '中立',
    highLabel: '个性',
    reasonLabels: { '-1': '发酵干净', 0: '发酵适中', 1: '发酵个性明显' },
    visual: {
      dimension: '发酵',
      highLabel: '个性',
      lowLabel: '干净',
      color: '#c084fc',
      mutedColor: '#332d45',
    },
  },
  {
    id: 'strength',
    label: '强度',
    lowLabel: '轻盈',
    neutralLabel: '中立',
    highLabel: '强劲',
    reasonLabels: { '-1': '强度轻盈', 0: '强度适中', 1: '酒精强度高' },
    visual: {
      dimension: '强度',
      highLabel: '强劲',
      lowLabel: '轻盈',
      color: '#f97316',
      mutedColor: '#352f27',
    },
  },
];

export function getActiveTasteFilters() {
  const activeIds = new Set(ACTIVE_TASTE_FILTER_IDS);
  return TASTE_FILTERS.filter((filter) => activeIds.has(filter.id)).map(cloneTasteFilter);
}

export function getTasteVisualSegments() {
  return TASTE_FILTERS.map((filter) => ({
    id: filter.id,
    dimension: filter.visual.dimension,
    highLabel: filter.visual.highLabel,
    lowLabel: filter.visual.lowLabel,
    color: filter.visual.color,
    mutedColor: filter.visual.mutedColor,
  }));
}

function cloneTasteFilter(filter) {
  return {
    ...filter,
    reasonLabels: { ...filter.reasonLabels },
    visual: { ...filter.visual },
  };
}
