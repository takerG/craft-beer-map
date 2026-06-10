const { catalog, runtime } = require('../utils/catalog.js');
const { removeFavoriteStyleRef } = require('../utils/favorite-store.js');
const { failure, success } = require('../utils/result.js');

async function removeFavoriteBeerStyle({ styleRef } = {}) {
  const style = runtime.resolveStyleSummary(catalog, styleRef);
  if (!style) {
    return failure('无法取消收藏：目录中不存在这个 styleRef。请先读取收藏列表。');
  }

  const favoriteRefs = removeFavoriteStyleRef(style.styleRef);
  return success(
    `已取消收藏 ${style.displayName}。`,
    {
      action: 'removed',
      isFavorite: false,
      style,
      total: favoriteRefs.length,
    },
    { style, isFavorite: false },
  );
}

module.exports = removeFavoriteBeerStyle;
