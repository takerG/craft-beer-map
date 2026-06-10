const { catalog, runtime } = require('../utils/catalog.js');
const { listFavoriteStyleRefs } = require('../utils/favorite-store.js');
const { success } = require('../utils/result.js');

async function listFavoriteBeerStyles() {
  const items = listFavoriteStyleRefs()
    .map((styleRef) => runtime.resolveStyleSummary(catalog, styleRef))
    .filter(Boolean);

  return success(
    items.length ? `已读取 ${items.length} 个收藏风格。请展示收藏列表卡片。` : '当前没有收藏风格。',
    {
      items,
      total: items.length,
    },
    { viewItems: items },
  );
}

module.exports = listFavoriteBeerStyles;
