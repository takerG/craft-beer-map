const DIMENSIONS = ['sweetness', 'sourness', 'bitterness', 'body', 'strength'];
const VALUES = ['low', 'neutral', 'high', 'unspecified'];
const SCENARIOS = ['easy', 'meal', 'bold', 'explore', 'unspecified'];
const VALUE_TO_NUMBER = { low: -1, neutral: 0, high: 1, unspecified: 0 };
const PRODUCT_STATES = ['recommended', 'needs-clarification', 'conflict', 'no-compatible-match'];
const TECHNICAL_FAILURES = ['empty-catalog', 'invalid-input', 'internal-error'];
const LABELS = {
  sweetness: '甜度',
  sourness: '酸度',
  bitterness: '苦味',
  body: '酒体',
  strength: '强度',
};

function validateInput(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['input must be an object'] };
  }
  if (!SCENARIOS.includes(input.scenario)) errors.push('invalid scenario');
  if (!input.preferences || typeof input.preferences !== 'object') {
    errors.push('preferences are required');
  } else {
    DIMENSIONS.forEach((id) => {
      if (!Object.hasOwn(input.preferences, id)) errors.push(`missing ${id}`);
      else if (!VALUES.includes(input.preferences[id])) errors.push(`invalid ${id}`);
    });
  }
  if (Object.hasOwn(input, 'limit')) {
    if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 12) {
      errors.push('limit must be an integer between 1 and 12');
    }
  }
  return { valid: errors.length === 0, errors };
}

function normalizeSnapshot(input) {
  const validation = validateInput(input);
  if (!validation.valid) {
    const error = new Error(validation.errors.join(', '));
    error.code = 'invalid-input';
    throw error;
  }
  const activeDimensions = DIMENSIONS.filter((id) => input.preferences[id] !== 'unspecified');
  return {
    scenario: input.scenario,
    preferences: { ...input.preferences },
    numericPreferences: Object.fromEntries(
      DIMENSIONS.map((id) => [id, VALUE_TO_NUMBER[input.preferences[id]]]),
    ),
    activeDimensions,
  };
}

function recommend(input, catalog, runtimeOverride) {
  try {
    const validation = validateInput(input);
    if (!validation.valid) return { ok: false, failureCode: 'invalid-input' };
    const styles = allStyles(catalog);
    if (!styles.length) return { ok: false, failureCode: 'empty-catalog' };

    const normalized = normalizeSnapshot(input);
    if (input.scenario === 'unspecified' && !normalized.activeDimensions.length) {
      return {
        ok: true,
        state: 'needs-clarification',
        items: [],
        explanation: {
          matched: [],
          tradeoffs: [],
          adjustments: ['请先告诉我一个场景，或至少一项口味偏好。'],
        },
        relaxation: null,
      };
    }

    const compatible = styles.filter((style) =>
      isCompatible(style, normalized.numericPreferences, normalized.activeDimensions));
    if (!compatible.length) {
      const relaxation = selectRelaxation(styles, normalized);
      return {
        ok: true,
        state: relaxation ? 'conflict' : 'no-compatible-match',
        items: [],
        explanation: {
          matched: [],
          tradeoffs: [],
          adjustments: relaxation
            ? [`可以先把${LABELS[relaxation.dimensions[0]]}改为未指定。`]
            : ['当前目录没有兼容候选。'],
        },
        relaxation,
      };
    }

    const runtime = runtimeOverride || require('./catalog-runtime.cjs');
    const compatibleCatalog = {
      ...(catalog || {}),
      bjcpStyles: compatible.filter((style) => style.kind !== 'extension'),
      extensionStyles: compatible.filter((style) => style.kind === 'extension'),
    };
    const ranked = runtime.recommendBeerStyles(
      compatibleCatalog,
      normalized.numericPreferences,
      input.limit || 6,
      { activeDimensions: normalized.activeDimensions },
    );
    const items = ranked.map((item) => ({
      ...item,
      explanation: buildItemExplanation(item, normalized),
    }));
    return {
      ok: true,
      state: 'recommended',
      items,
      explanation: aggregateExplanation(items, normalized),
      relaxation: null,
    };
  } catch (error) {
    return { ok: false, failureCode: error.code || 'internal-error' };
  }
}

function isCompatible(style, preferences, activeDimensions) {
  const profile = style.tasteProfile || {};
  return activeDimensions.every((id) => {
    const expected = preferences[id];
    const actual = normalizeTaste(profile[id]);
    return actual === expected || actual === 0 || expected === 0;
  });
}

function selectRelaxation(styles, normalized) {
  if (!normalized.activeDimensions.length) return null;
  let best = null;
  normalized.activeDimensions.forEach((relaxed) => {
    const remaining = normalized.activeDimensions.filter((id) => id !== relaxed);
    const count = styles.filter((style) =>
      isCompatible(style, normalized.numericPreferences, remaining)).length;
    if (!best || count > best.count) best = { dimensions: [relaxed], count };
  });
  return best;
}

function buildItemExplanation(item, normalized) {
  const profile = item.tasteProfile || {};
  const matched = [];
  const tradeoffs = [];
  normalized.activeDimensions.forEach((id) => {
    const expected = normalized.numericPreferences[id];
    const actual = normalizeTaste(profile[id]);
    if (actual === expected) matched.push(`${LABELS[id]}符合`);
    else tradeoffs.push(`${LABELS[id]}接近当前要求`);
  });
  return {
    matched: matched.slice(0, 3),
    tradeoffs: tradeoffs.slice(0, 2),
  };
}

function aggregateExplanation(items, normalized) {
  const matched = [...new Set(items.flatMap((item) => item.explanation.matched))].slice(0, 3);
  const tradeoffs = [...new Set(items.flatMap((item) => item.explanation.tradeoffs))].slice(0, 3);
  const adjustments = DIMENSIONS
    .filter((id) => !normalized.activeDimensions.includes(id))
    .slice(0, 1)
    .map((id) => `还可以补充${LABELS[id]}偏好。`);
  return { matched, tradeoffs, adjustments };
}

function verifyExplanations(result) {
  const allowed = /^(甜度|酸度|苦味|酒体|强度)(符合|接近当前要求)$/;
  const values = (result.items || []).flatMap((item) => [
    ...(item.explanation?.matched || []),
    ...(item.explanation?.tradeoffs || []),
  ]);
  return { valid: values.every((value) => allowed.test(value)) };
}

function allStyles(catalog = {}) {
  return [...(catalog.bjcpStyles || []), ...(catalog.extensionStyles || [])];
}

function normalizeTaste(value) {
  return Number(value) === -1 || Number(value) === 1 ? Number(value) : 0;
}

module.exports = {
  CONTRACT: 'semantic-v2',
  DIMENSIONS,
  PRODUCT_STATES,
  TECHNICAL_FAILURES,
  normalizeSnapshot,
  recommend,
  validateInput,
  verifyExplanations,
};
