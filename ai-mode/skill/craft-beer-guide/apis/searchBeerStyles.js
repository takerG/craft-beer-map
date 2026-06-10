const { catalog, runtime } = require('../utils/catalog.js');
const { failure, success } = require('../utils/result.js');

async function searchBeerStyles({ query, limit = 8 } = {}) {
  if (!query || typeof query !== 'string') {
    return failure('缺少风格关键词。请询问用户想查的编号、中文名、英文名或常见叫法。');
  }

  const items = runtime.searchBeerStyles(catalog, query, limit);
  if (!items.length) {
    return failure(`目录中没有匹配“${query}”的风格。请引导用户换一个编号、名称或常见叫法。`);
  }

  return success(
    `已找到 ${items.length} 个匹配风格。请展示风格列表卡片，并引导用户选择。`,
    {
      items,
      total: items.length,
      keyword: query,
    },
    { viewItems: items },
  );
}

module.exports = searchBeerStyles;
