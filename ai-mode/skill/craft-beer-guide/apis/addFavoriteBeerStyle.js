const { catalog, runtime } = require('../utils/catalog.js');
const { addFavoriteStyleRef } = require('../utils/favorite-store.js');
const { failure, success } = require('../utils/result.js');

async function addFavoriteBeerStyle({ styleRef } = {}) {
  const style = runtime.resolveStyleSummary(catalog, styleRef);
  if (!style) {
    return failure('无法收藏：目录中不存在这个 styleRef。请先搜索并使用返回的原始值。');
  }

  const favoriteRefs = addFavoriteStyleRef(style.styleRef);
  return success(
    `已将 ${style.displayName} 加入收藏。`,
    {
      action: 'added',
      isFavorite: true,
      style,
      total: favoriteRefs.length,
    },
    { style, isFavorite: true },
  );
}

module.exports = addFavoriteBeerStyle;
