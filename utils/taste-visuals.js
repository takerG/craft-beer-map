import { getTasteVisualSegments } from './taste-schema.js';

const WHEEL_SEGMENTS = getTasteVisualSegments();

export function buildFlavorWheelVisual(filters, filterState = {}, results = []) {
  const dimensions = new Set(filters.map((filter) => filter.id));
  const segments = WHEEL_SEGMENTS.filter((segment) => dimensions.has(segment.id)).map((segment) => {
    const requestedValue = normalizeTasteValue(filterState[segment.id]);
    const resultValue = requestedValue || getAverageResultValue(results, segment.id);
    const direction = resultValue > 0 ? 1 : resultValue < 0 ? -1 : 0;
    const intensity = Math.min(1, Math.abs(resultValue));
    const active = requestedValue !== 0;
    const valueLabel = direction > 0 ? segment.highLabel : direction < 0 ? segment.lowLabel : '中立';

    return {
      ...segment,
      direction,
      active,
      valueLabel,
      sourceLabel: active ? '已选择' : '结果倾向',
      label: valueLabel === '中立' ? getFilterLabel(filters, segment.id) : valueLabel,
      color: getSegmentColor(segment, direction, active, intensity),
      weight: active ? 1.42 : 0.82 + intensity * 0.38,
    };
  });

  return {
    chartStyle: `background: ${buildConicGradient(segments)};`,
    labels: buildWheelLabels(segments),
    legend: buildWheelLegend(segments),
    summary: buildWheelSummary(segments),
  };
}

function normalizeTasteValue(value) {
  const numeric = Number(value);
  if (numeric === -1 || numeric === 1) return numeric;
  return 0;
}

function getAverageResultValue(results, dimension) {
  const values = results
    .map((result) => result.taste_profile && Number(result.taste_profile[dimension]))
    .filter((value) => value === -1 || value === 0 || value === 1);

  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getFilterLabel(filters, dimension) {
  const filter = filters.find((item) => item.id === dimension);
  return filter ? filter.label : dimension;
}

function getSegmentColor(segment, direction, active, intensity) {
  if (active || intensity > 0) return segment.color;
  return segment.mutedColor;
}

function buildConicGradient(segments) {
  const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0);
  let cursor = 0;
  const stops = segments.flatMap((segment) => {
    const start = cursor;
    const end = cursor + (segment.weight / totalWeight) * 360;
    cursor = end;
    return [`${segment.color} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`];
  });

  return `conic-gradient(${stops.join(', ')})`;
}

function buildWheelLabels(segments) {
  return segments
    .filter((segment) => segment.direction !== 0 || segment.active)
    .sort((a, b) => Number(b.active) - Number(a.active) || b.weight - a.weight)
    .slice(0, 4)
    .map((segment, index) => ({
      id: `${segment.id}-${segment.direction}-${index}`,
      dimension: segment.dimension,
      label: segment.label,
      color: segment.color,
      className: `wheel-label-${index + 1}`,
    }));
}

function buildWheelLegend(segments) {
  return segments.map((segment) => ({
    id: segment.id,
    dimension: segment.dimension,
    valueLabel: segment.valueLabel,
    sourceLabel: segment.sourceLabel,
    active: segment.active,
    color: segment.color,
    swatchStyle: `background: ${segment.color};`,
    muted: segment.direction === 0 && !segment.active,
  }));
}

function buildWheelSummary(segments) {
  const activeSegments = segments.filter((segment) => segment.active);
  if (activeSegments.length) {
    return activeSegments.map((segment) => `${segment.dimension}:${segment.valueLabel}`).join(' / ');
  }

  return '未选择的维度由当前匹配结果倾向补全';
}
