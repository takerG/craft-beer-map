const { catalog } = require('../utils/catalog.js');
const core = require('../utils/recommendation-v2.js');
const { createFlowStore } = require('../utils/flow-store.js');
const { setLatestRecommendation } = require('../utils/recommendation-session.js');
const { failure, success } = require('../utils/result.js');
const experiment = require('../generated/experiment.js');

const flowStore = createFlowStore({ variant: 'candidate' });

async function recommendBeerStylesCandidate(args = {}) {
  const flowInput = args.flow || {};
  if (flowInput.mode === 'start') {
    const result = calculateRecommendation(args);
    if (!result.ok) return failure(flowFailureText(result.failureCode), result.failureCode);
    try {
      const flow = flowStore.begin({ requestId: flowInput.requestId });
      return recommendationSuccess(args, flow, false, result);
    } catch (error) {
      return failure(flowFailureText(error.code), error.code);
    }
  }
  if (flowInput.mode !== 'continue') {
    return failure('缺少有效的推荐流程参数。', 'invalid-flow');
  }

  try {
    return await flowStore.withFlowLock(flowInput.flowId, () => {
      flowStore.assertCurrent({
        flowId: flowInput.flowId,
        expectedRevision: flowInput.expectedRevision,
      });
      if (flowStore.hasProcessedRequest({
        flowId: flowInput.flowId,
        requestId: flowInput.requestId,
      })) {
        return failure('这个调整请求已经处理，请使用最新推荐结果。', 'duplicate-request');
      }
      const result = calculateRecommendation(args);
      if (!result.ok) return failure(flowFailureText(result.failureCode), result.failureCode);
      const current = flowStore.advance({
        flowId: flowInput.flowId,
        expectedRevision: flowInput.expectedRevision,
        requestId: flowInput.requestId,
      });
      return recommendationSuccess(args, current, true, result);
    });
  } catch (error) {
    return failure(flowFailureText(error.code), error.code);
  }
}

function calculateRecommendation(args) {
  return core.recommend({
    scenario: args.scenario,
    preferences: args.preferences,
    limit: args.limit,
  }, catalog);
}

function recommendationSuccess(args, flow, refined, result) {
  setLatestRecommendation(flow.flowId, flow.revision, result.items);
  return success(
    result.state === 'recommended'
      ? `已生成 ${result.items.length} 个可解释的风格候选。`
      : productStateText(result),
    {
      contract: core.CONTRACT,
      status: result.state,
      flow: { flowId: flow.flowId, revision: flow.revision, refined },
      snapshot: { scenario: args.scenario, preferences: args.preferences },
      items: result.items,
      explanation: result.explanation,
      relaxation: result.relaxation,
    },
    {
      viewItems: result.items,
      expirePreviousCards: refined && experiment.enableExpirePreviousCards,
    },
  );
}

function productStateText(result) {
  if (result.state === 'needs-clarification') return '请先补充一个场景或一项口味偏好。';
  if (result.state === 'conflict') return result.explanation.adjustments[0];
  return '当前目录没有兼容候选，请放宽一项条件。';
}

function flowFailureText(code) {
  if (code === 'completed-flow') return '这次推荐已经完成，请重新开始一次推荐。';
  if (code === 'duplicate-request') return '这个推荐请求已经处理，请勿重复提交。';
  return {
    'invalid-input': '推荐参数不完整或不合法，请按当前选项重新提交。',
    'empty-catalog': '当前风格目录不可用，请稍后重试。',
    'stale-revision': '推荐条件已经更新，请使用最新结果。',
    'future-revision': '推荐修订号无效，请重新开始推荐。',
    'invalid-revision': '推荐修订号无效，请重新开始推荐。',
    'expired-flow': '这次推荐已经过期，请重新描述偏好。',
    'unknown-flow': '没有找到这次推荐流程，请重新描述偏好。',
  }[code] || '推荐暂时不可用，请稍后重试。';
}

module.exports = recommendBeerStylesCandidate;
