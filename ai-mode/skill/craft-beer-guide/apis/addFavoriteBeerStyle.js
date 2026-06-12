const { catalog, runtime } = require('../utils/catalog.js');
const { addFavoriteStyleRef, hasFavoriteStyleRef, listFavoriteStyleRefs } = require('../utils/favorite-store.js');
const { failure, success } = require('../utils/result.js');
const { createFlowStore } = require('../utils/flow-store.js');
const { hasRecommendedStyle } = require('../utils/recommendation-session.js');

const flowStore = createFlowStore({ variant: 'candidate' });

async function addFavoriteBeerStyle({ styleRef, recommendationContext } = {}) {
  const style = runtime.resolveStyleSummary(catalog, styleRef);
  if (!style) return failure('无法收藏：目录中不存在这个 styleRef。');
  if (!recommendationContext) return persistFavorite(style);

  try {
    return await flowStore.withFlowLock(recommendationContext.flowId, () => {
      flowStore.assertCurrent({
        flowId: recommendationContext.flowId,
        expectedRevision: recommendationContext.expectedRevision,
      });
      if (!hasRecommendedStyle(
        recommendationContext.flowId,
        recommendationContext.expectedRevision,
        style.styleRef,
      )) {
        return failure(
          '只能收藏当前推荐结果中的风格，请使用最新推荐卡片。',
          'style-outside-recommendation',
        );
      }
      if (flowStore.hasProcessedRequest({
        flowId: recommendationContext.flowId,
        requestId: recommendationContext.requestId,
      })) {
        return failure('这个收藏请求已经处理，请勿重复操作。', 'duplicate-request');
      }

      const result = persistFavorite(style);
      if (!result.isError) {
        const completion = flowStore.complete({
          flowId: recommendationContext.flowId,
          expectedRevision: recommendationContext.expectedRevision,
          requestId: recommendationContext.requestId,
        });
        result._meta = {
          ...result._meta,
          completion: {
            firstCompletion: completion.firstCompletion,
            revision: completion.state.revision,
          },
        };
      }
      return result;
    });
  } catch (error) {
    return failure(
      error.code === 'stale-revision'
        ? '推荐条件已经更新，请使用最新结果。'
        : '收藏流程已失效，请从最新推荐重新操作。',
      error.code || 'invalid-recommendation-context',
    );
  }
}

function persistFavorite(style) {
  const alreadyFavorite = hasFavoriteStyleRef(style.styleRef);
  const favoriteRefs = alreadyFavorite
    ? listFavoriteStyleRefs()
    : addFavoriteStyleRef(style.styleRef);
  if (!alreadyFavorite && !hasFavoriteStyleRef(style.styleRef)) {
    return failure('收藏未能写入本机存储，请稍后重试。', 'storage-failed');
  }
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
