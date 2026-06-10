const { catalog, runtime } = require('../utils/catalog.js');
const { failure, success } = require('../utils/result.js');

async function findAcademyArticles({ query = '', limit = 6 } = {}) {
  const items = runtime.findAcademyArticles(catalog, query, limit);
  if (!items.length) {
    return failure(`学院中没有匹配“${query}”的文章。请引导用户换一个概念或风格关键词。`);
  }

  return success(
    `已找到 ${items.length} 篇相关文章。请展示学院文章卡片。`,
    {
      items,
      total: items.length,
      keyword: query,
    },
    { viewItems: items },
  );
}

module.exports = findAcademyArticles;
