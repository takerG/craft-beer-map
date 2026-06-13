const { catalog, runtime } = require('../utils/catalog.js');
const {
  addFavoriteStyleRef,
} = require('../utils/favorite-store.js');
const { failure, success } = require('../utils/result.js');

async function addFavoriteBeerStyle({ styleRef } = {}) {
  const style = runtime.resolveStyleSummary(catalog, styleRef);
  if (!style) {
    return failure('无法收藏：目录中不存在这个 styleRef。请先搜索并使用返回的原始值。');
  }
  const mutation = addFavoriteStyleRef(style.styleRef);
  if (!mutation.ok) {
    return failure('收藏未能写入本机存储，请稍后重试。', 'storage-failed');
  }
  const alreadyFavorite = mutation.wasFavorite;
  const favoriteRefs = mutation.refs;
  return success(
    alreadyFavorite ? `${style.displayName} 此前已收藏。` : `已将 ${style.displayName} 加入收藏。`,
    {
      action: alreadyFavorite ? 'already-favorite' : 'added',
      isFavorite: true,
      style,
      total: favoriteRefs.length,
    },
    { style, isFavorite: true },
  );
}

module.exports = addFavoriteBeerStyle;
