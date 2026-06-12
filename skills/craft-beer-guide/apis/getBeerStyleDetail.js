const { catalog, runtime } = require('../utils/catalog.js');
const { failure, success } = require('../utils/result.js');

async function getBeerStyleDetail({ styleRef } = {}) {
  if (!styleRef || !styleRef.id) {
    return failure('缺少有效 styleRef。必须先从搜索、推荐或收藏结果中取得原始 styleRef。');
  }
  const detail = runtime.getBeerStyleDetail(catalog, styleRef);
  if (!detail) {
    return failure('目录中不存在这个 styleRef。禁止猜测编号，请重新搜索。');
  }
  return success(
    `已加载 ${detail.style.displayName} 的风格详情。请展示详情卡片。`,
    detail,
    { detail },
  );
}

module.exports = getBeerStyleDetail;
