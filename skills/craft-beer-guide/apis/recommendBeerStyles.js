const { catalog, runtime } = require('../utils/catalog.js');
const { success } = require('../utils/result.js');

async function recommendBeerStyles({ preferences = {}, limit = 6 } = {}) {
  const items = runtime.recommendBeerStyles(catalog, preferences, limit);
  return success(
    `已按当前口味偏好生成 ${items.length} 个候选。请展示推荐卡片，不要重复列表。`,
    { items, total: items.length, preferences },
    { viewItems: items },
  );
}

module.exports = recommendBeerStyles;
