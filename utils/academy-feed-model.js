import { getAcademyFeedFromRemote } from './academy-feed-remote.js';

const TYPE_LABELS = {
  simulator: '互动',
  tool: '工具',
  map: '地图',
  comparison: '对比',
  'visual-story': '图解',
  quiz: '问答',
};
const TYPE_ORDER = ['map', 'comparison', 'simulator', 'tool', 'visual-story', 'quiz'];

export async function getAcademySites() {
  const feedSites = await getAcademyFeedFromRemote();
  return feedSites.map(toSiteSummary);
}

export async function getAcademyHome() {
  const feedSites = (await getAcademySites())
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)) || a.slug.localeCompare(b.slug));

  return {
    title: '学院',
    subtitle: '按发布时间更新的精酿互动文章。',
    feedSites,
    filterOptions: buildAcademyTypeFilters(feedSites, 'all'),
    stats: {
      siteCount: feedSites.length,
    },
  };
}

export function buildAcademyTypeFilters(feedSites, activeType = 'all') {
  const counts = new Map();
  feedSites.forEach((site) => {
    counts.set(site.type, (counts.get(site.type) || 0) + 1);
  });

  return [
    {
      type: 'all',
      label: '全部',
      count: feedSites.length,
    },
    ...Array.from(counts.entries())
      .sort(([typeA, countA], [typeB, countB]) => {
        const orderA = TYPE_ORDER.includes(typeA) ? TYPE_ORDER.indexOf(typeA) : TYPE_ORDER.length;
        const orderB = TYPE_ORDER.includes(typeB) ? TYPE_ORDER.indexOf(typeB) : TYPE_ORDER.length;
        return orderA - orderB || countB - countA || typeA.localeCompare(typeB);
      })
      .map(([type, count]) => ({
        type,
        label: TYPE_LABELS[type] || '内容',
        count,
      })),
  ].map((option) => ({
    ...option,
    className: option.type === activeType ? 'filter-chip is-active' : 'filter-chip',
  }));
}

function toSiteSummary(site) {
  return {
    slug: site.slug,
    title: site.title,
    description: site.description,
    type: site.type,
    difficulty: site.difficulty,
    readingTime: site.readingTime,
    tags: [...site.tags],
    publishedAt: site.publishedAt || site.date || '',
    updatedAt: site.updatedAt || site.publishedAt || site.date || '',
    heroMetric: site.heroMetric || '',
    accent: site.accent || '#f6ad55',
  };
}
