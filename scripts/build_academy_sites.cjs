const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'academy-sites');
const outputPath = path.join(root, 'data', 'academy-sites.js');
const feedOutputPath = path.join(root, 'data', 'academy-feed.js');

const REQUIRED_META_FIELDS = ['slug', 'title', 'description', 'type', 'difficulty', 'readingTime', 'tags', 'relatedStyles'];
const REQUIRED_PUBLISH_FIELDS = ['publishedAt'];
const VALID_TYPES = new Set(['visual-story', 'comparison', 'simulator', 'map', 'quiz', 'tool']);

function main() {
  const order = readJson(path.join(sourceRoot, 'order.json'));
  const sites = fs.readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readSite(entry.name))
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)) || a.slug.localeCompare(b.slug));

  validateOrder(order, sites);
  writeData({ order, sites });
}

function readSite(slug) {
  const siteDir = path.join(sourceRoot, slug);
  const meta = readJson(path.join(siteDir, 'meta.json'));
  const publish = readJson(path.join(siteDir, 'publish.json'));
  const content = readJson(path.join(siteDir, 'content.json'));

  REQUIRED_META_FIELDS.forEach((field) => {
    if (!Object.hasOwn(meta, field)) {
      throw new Error(`${slug}/meta.json missing ${field}`);
    }
  });
  REQUIRED_PUBLISH_FIELDS.forEach((field) => {
    if (!Object.hasOwn(publish, field)) {
      throw new Error(`${slug}/publish.json missing ${field}`);
    }
  });
  if (meta.slug !== slug) throw new Error(`${slug}/meta.json slug must match directory name`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publish.publishedAt)) {
    throw new Error(`${slug}/publish.json publishedAt must use YYYY-MM-DD`);
  }
  if (!VALID_TYPES.has(meta.type)) throw new Error(`${slug}/meta.json has unsupported type ${meta.type}`);
  if (!Array.isArray(meta.tags)) throw new Error(`${slug}/meta.json tags must be an array`);
  if (!Array.isArray(meta.relatedStyles)) throw new Error(`${slug}/meta.json relatedStyles must be an array`);
  if (!content.hero || !Array.isArray(content.modules)) {
    throw new Error(`${slug}/content.json must include hero and modules`);
  }
  if (!Array.isArray(content.sections) || content.sections.length < 4) {
    throw new Error(`${slug}/content.json must include at least four article sections`);
  }
  if (!content.experienceAfterSectionId) {
    throw new Error(`${slug}/content.json must include experienceAfterSectionId`);
  }
  const sectionIds = new Set(content.sections.map((section) => section.id));
  if (!sectionIds.has(content.experienceAfterSectionId)) {
    throw new Error(`${slug}/content.json experienceAfterSectionId must match a section id`);
  }
  content.sections.forEach((section, index) => {
    if (!section.id || !section.title || !Array.isArray(section.paragraphs) || section.paragraphs.length < 1) {
      throw new Error(`${slug}/content.json sections[${index}] must include id, title, and paragraphs`);
    }
  });

  return {
    ...meta,
    publishedAt: publish.publishedAt,
    updatedAt: publish.updatedAt || publish.publishedAt,
    hero: content.hero,
    sections: content.sections,
    experienceAfterSectionId: content.experienceAfterSectionId,
    modules: content.modules,
  };
}

function validateOrder(order, sites) {
  const siteSlugs = new Set(sites.map((site) => site.slug));
  const refs = [
    ...(order.featured || []),
    ...(order.tracks || []).flatMap((track) => track.items || []),
  ];

  refs.forEach((slug) => {
    if (!siteSlugs.has(slug)) throw new Error(`academy-sites/order.json references unknown site ${slug}`);
  });
}

function writeData(payload) {
  const source = `// Generated from academy-sites/. Run npm run build:academy after content changes.\nexport const academyOrder = ${JSON.stringify(payload.order, null, 2)};\n\nexport const academySites = ${JSON.stringify(payload.sites, null, 2)};\n`;
  const feedSource = `// Generated from academy-sites/. Run npm run build:academy after content changes.\nexport const academyFeedSites = ${JSON.stringify(payload.sites.map(toFeedSite), null, 2)};\n`;

  fs.writeFileSync(outputPath, source, 'utf8');
  fs.writeFileSync(feedOutputPath, feedSource, 'utf8');
}

function toFeedSite(site) {
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

main();
