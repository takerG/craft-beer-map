const { catalog, runtime } = require('../utils/catalog.js');
const { failure, success } = require('../utils/result.js');
const { createFlowStore } = require('../utils/flow-store.js');
const { hasRecommendedStyle } = require('../utils/recommendation-session.js');

const flowStore = createFlowStore({ variant: 'candidate' });

async function getBeerStyleDetail({ styleRef, recommendationContext } = {}) {
  if (!styleRef || !styleRef.id) {
    return failure('缺少有效 styleRef。请先从搜索、推荐或收藏结果取得原始值。');
  }
  const detail = runtime.getBeerStyleDetail(catalog, styleRef);
  if (!detail) return failure('目录中不存在这个 styleRef，请重新搜索。');

  if (recommendationContext) {
    try {
      const completion = await flowStore.withFlowLock(recommendationContext.flowId, () => {
        flowStore.assertCurrent({
          flowId: recommendationContext.flowId,
          expectedRevision: recommendationContext.expectedRevision,
        });
        if (!hasRecommendedStyle(
          recommendationContext.flowId,
          recommendationContext.expectedRevision,
          styleRef,
        )) {
          const error = new Error('style-outside-recommendation');
          error.code = 'style-outside-recommendation';
          throw error;
        }
        const result = flowStore.complete({
          flowId: recommendationContext.flowId,
          expectedRevision: recommendationContext.expectedRevision,
          requestId: recommendationContext.requestId,
        });
        return {
          firstCompletion: result.firstCompletion,
          revision: result.state.revision,
        };
      });
      return success(
        `已加载 ${detail.style.displayName} 的风格详情。`,
        detail,
        { detail, completion },
      );
    } catch (error) {
      return failure(
        error.code === 'stale-revision'
          ? '推荐条件已经更新，请使用最新结果。'
          : '这个推荐详情操作已失效，请从最新推荐重新选择。',
        error.code || 'invalid-recommendation-context',
      );
    }
  }

  return success(
    `已加载 ${detail.style.displayName} 的风格详情。`,
    detail,
    { detail },
  );
}

module.exports = getBeerStyleDetail;
