const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const sourceMiniProgramRoot = path.join(root, 'miniprogram');
const outputRoot = path.join(root, 'artifacts', 'ai-mode-project');
const outputMiniProgramRoot = path.join(outputRoot, 'miniprogram');
const knowledgeOutputRoot = path.join(root, 'artifacts', 'ai-knowledge-base');
const buildLockPath = path.join(root, 'artifacts', '.ai-mode-build.lock');

async function main() {
  const lockHandle = acquireBuildLock();
  try {
    const fingerprint = buildFingerprint();
    if (process.argv.includes('--if-current') && isCurrentBuild(fingerprint)) {
      console.log(`Using current ${path.relative(root, outputRoot)}`);
      return;
    }

    resetOutput();
    copyProductionMiniProgram();
    writeAiAppConfig();
    writeProjectConfig();
    writeNodeProjectConfig();
    copyOperatorInstructions();
    writePageMetadata();
    copyAiSkillTemplates();
    copyAiUiTemplates();
    applyPageOverlays();
    await writeCatalog();
    fs.writeFileSync(path.join(outputRoot, '.build-fingerprint'), fingerprint, 'utf8');
  } finally {
    releaseBuildLock(lockHandle);
  }

  console.log(`Built ${path.relative(root, outputRoot)}`);
}

function acquireBuildLock() {
  fs.mkdirSync(path.dirname(buildLockPath), { recursive: true });
  for (let attempt = 0; attempt < 400; attempt += 1) {
    try {
      return fs.openSync(buildLockPath, 'wx');
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      removeStaleBuildLock();
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  throw new Error(`Timed out waiting for AI mode build lock: ${buildLockPath}`);
}

function removeStaleBuildLock() {
  try {
    const ageMs = Date.now() - fs.statSync(buildLockPath).mtimeMs;
    if (ageMs > 60_000) fs.rmSync(buildLockPath, { force: true });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function releaseBuildLock(lockHandle) {
  try {
    fs.closeSync(lockHandle);
  } finally {
    fs.rmSync(buildLockPath, { force: true });
  }
}

function resetOutput() {
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.rmSync(knowledgeOutputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.mkdirSync(knowledgeOutputRoot, { recursive: true });
}

function buildFingerprint() {
  const hash = crypto.createHash('sha256');
  const sourcePaths = [
    ...listFiles(path.join(root, 'miniprogram')),
    ...listFiles(path.join(root, 'ai-mode')),
    path.join(root, 'project.config.json'),
    __filename,
  ].sort();

  sourcePaths.forEach((filePath) => {
    hash.update(path.relative(root, filePath).replaceAll('\\', '/'));
    hash.update('\0');
    hash.update(fs.readFileSync(filePath));
    hash.update('\0');
  });
  return hash.digest('hex');
}

function isCurrentBuild(fingerprint) {
  const markerPath = path.join(outputRoot, '.build-fingerprint');
  const appPath = path.join(outputMiniProgramRoot, 'app.json');
  const knowledgePath = path.join(knowledgeOutputRoot, 'bjcp-style-guide.md');
  try {
    return (
      fs.readFileSync(markerPath, 'utf8') === fingerprint &&
      fs.existsSync(appPath) &&
      fs.existsSync(knowledgePath)
    );
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(filePath) : [filePath];
  });
}

function copyProductionMiniProgram() {
  fs.cpSync(sourceMiniProgramRoot, outputMiniProgramRoot, { recursive: true });
}

function writeAiAppConfig() {
  const appPath = path.join(outputMiniProgramRoot, 'app.json');
  const app = readJson(appPath);
  const subpackages = (app.subpackages || []).filter((item) => item.root !== 'skills');

  app.agent = {
    skills: [
      {
        name: 'craft-beer-guide',
        description: '精酿啤酒风格搜索、口味推荐、详情、收藏与学院文章',
        path: 'skills/craft-beer-guide',
      },
    ],
    pageMetadata: 'page-meta.json',
  };
  app.subpackages = [
    ...subpackages,
    {
      root: 'skills',
      pages: [],
      independent: true,
    },
    {
      root: 'aiDetail',
      name: 'ai-detail',
      pages: [
        'pages/style-results/index',
        'pages/taste-refine/index',
      ],
      independent: true,
      componentFramework: 'glass-easel',
      renderer: 'skyline',
    },
  ];
  app.usingComponents = {
    ...(app.usingComponents || {}),
    'ai-entry': '/components/ai-entry/index',
  };

  writeJson(appPath, app);
}

function writeProjectConfig() {
  const sourceConfig = readJson(path.join(root, 'project.config.json'));
  const projectConfig = {
    ...sourceConfig,
    projectname: 'craft-beer-map-ai-mode',
    miniprogramRoot: 'miniprogram/',
    libVersion: 'latest',
  };

  writeJson(path.join(outputRoot, 'project.config.json'), projectConfig);
}

function writeNodeProjectConfig() {
  writeJson(path.join(outputRoot, 'package.json'), {
    private: true,
    type: 'commonjs',
  });
}

function copyOperatorInstructions() {
  copyFile(
    path.join(root, 'ai-mode', 'AGENTS.md'),
    path.join(outputRoot, 'AGENTS.md'),
  );
}

function writePageMetadata() {
  const pageMetaRoot = path.join(root, 'ai-mode', 'page-meta');
  const order = [
    'explore.json',
    'choose.json',
    'academy.json',
    'favorites.json',
    'search.json',
    'style.json',
    'extension-style.json',
    'academy-article.json',
  ];
  const pages = order.map((fileName) => readJson(path.join(pageMetaRoot, fileName)));
  writeJson(path.join(outputMiniProgramRoot, 'page-meta.json'), { pages });
}

function copyAiSkillTemplates() {
  const sourceSkillRoot = path.join(root, 'ai-mode', 'skill', 'craft-beer-guide');
  const targetSkillRoot = path.join(outputMiniProgramRoot, 'skills', 'craft-beer-guide');
  fs.cpSync(sourceSkillRoot, targetSkillRoot, { recursive: true });
}

function copyAiUiTemplates() {
  fs.cpSync(
    path.join(root, 'ai-mode', 'entry-component'),
    path.join(outputMiniProgramRoot, 'components', 'ai-entry'),
    { recursive: true },
  );
  fs.cpSync(
    path.join(root, 'ai-mode', 'detail-pages'),
    path.join(outputMiniProgramRoot, 'aiDetail', 'pages'),
    { recursive: true },
  );
}

function applyPageOverlays() {
  const overlays = readJson(path.join(root, 'ai-mode', 'page-overlays.json'));
  overlays.forEach((overlay) => {
    const targetPath = path.join(outputMiniProgramRoot, overlay.path);
    const source = fs.readFileSync(targetPath, 'utf8');
    const markup = [
      '',
      '<ai-entry',
      `  prompt="${escapeXmlAttribute(overlay.prompt)}"`,
      `  context-type="${escapeXmlAttribute(overlay.contextType)}"`,
      `  context-data="${overlay.contextBinding}"`,
      '/>',
      '',
    ].join('\n');
    fs.writeFileSync(targetPath, `${source.trimEnd()}\n${markup}`, 'utf8');
  });
}

async function writeCatalog() {
  const [
    { beerData },
    { styleAliases },
    { extensionStyles },
    { academySites },
  ] = await Promise.all([
    importSourceModule('miniprogram/data/beer-data.js'),
    importSourceModule('miniprogram/data/style-aliases.js'),
    importSourceModule('miniprogram/data/extension-styles.js'),
    importSourceModule('miniprogram/data/academy-sites.js'),
  ]);
  const skillRoot = path.join(outputMiniProgramRoot, 'skills', 'craft-beer-guide');
  const detailRoot = path.join(outputMiniProgramRoot, 'aiDetail');
  const catalog = {
    schemaVersion: 1,
    categories: beerData.categories || [],
    bjcpStyles: (beerData.styles || []).map((style) => ({
      id: style.id,
      kind: 'bjcp',
      code: style.code || style.id,
      name_zh: style.name_zh || '',
      name_en: style.name_en || '',
      displayName: style.name_zh || style.name_en || style.id,
      aliases: styleAliases[style.code || style.id] || [],
      category: style.category,
      key: Boolean(style.key),
      tasteProfile: style.taste_profile || {},
      details: style.details || {},
    })),
    extensionStyles: (extensionStyles || []).map((style) => ({
      id: style.id,
      kind: 'extension',
      code: '',
      name_zh: style.name_zh || '',
      name_en: style.name_en || '',
      displayName: style.name_zh || style.name_en || style.id,
      aliases: style.aliases || [],
      groupId: style.groupId,
      sourceLabel: style.sourceLabel || '',
      tasteProfile: style.taste_profile || {},
      description: style.description || '',
      bjcpNote: style.bjcp_note || '',
      bjcpRefs: style.bjcp_refs || [],
    })),
    academyArticles: (academySites || []).map((article) => ({
      slug: article.slug,
      title: article.title,
      description: article.description,
      type: article.type,
      difficulty: article.difficulty,
      readingTime: article.readingTime,
      tags: article.tags || [],
      relatedStyles: article.relatedStyles || [],
      publishedAt: article.publishedAt,
      sections: article.sections || [],
    })),
  };

  writeCommonJsModule(path.join(skillRoot, 'data', 'catalog.js'), catalog);
  writeCommonJsModule(path.join(detailRoot, 'data', 'catalog.js'), catalog);
  copyFile(
    path.join(root, 'ai-mode', 'shared', 'catalog-runtime.cjs'),
    path.join(skillRoot, 'utils', 'catalog-runtime.js'),
  );
  copyFile(
    path.join(root, 'ai-mode', 'shared', 'catalog-runtime.cjs'),
    path.join(detailRoot, 'utils', 'catalog-runtime.js'),
  );
  writeKnowledgeBase(catalog);
}

function writeKnowledgeBase(catalog) {
  const bjcpSections = catalog.bjcpStyles.map((style) => {
    const category = catalog.categories.find((item) => item.id === style.category);
    const details = style.details || {};
    return [
      `## ${style.code} ${style.displayName} / ${style.name_en}`,
      '',
      `- 类型：BJCP 官方标准风格`,
      `- 分类：${category ? `${category.id} ${category.name_zh} / ${category.name_en}` : style.category}`,
      `- 常见叫法：${style.aliases.length ? style.aliases.join('、') : '无'}`,
      `- 口味坐标：${formatTasteProfile(style.tasteProfile)}`,
      '',
      ...knowledgeDetailLines(details),
    ].join('\n');
  });
  const extensionSections = catalog.extensionStyles.map((style) => [
    `## ${style.displayName} / ${style.name_en}`,
    '',
    `- 稳定 ID：${style.id}`,
    `- 类型：市场扩展风格`,
    `- 来源标签：${style.sourceLabel}`,
    `- 常见叫法：${style.aliases.length ? style.aliases.join('、') : '无'}`,
    `- 口味坐标：${formatTasteProfile(style.tasteProfile)}`,
    `- BJCP 对照：${style.bjcpRefs.length ? style.bjcpRefs.join('、') : '无独立对照'}`,
    '',
    `### 描述`,
    '',
    normalizeMarkdownText(style.description),
    '',
    `### BJCP 说明`,
    '',
    normalizeMarkdownText(style.bjcpNote),
  ].join('\n'));
  const academySections = catalog.academyArticles.map((article) => [
    `## ${article.title}`,
    '',
    `- slug：${article.slug}`,
    `- 类型：${article.type}`,
    `- 难度：${article.difficulty}`,
    `- 阅读时间：${article.readingTime} 分钟`,
    `- 标签：${(article.tags || []).join('、')}`,
    `- 相关风格：${(article.relatedStyles || []).join('、')}`,
    `- 发布日期：${article.publishedAt}`,
    '',
    normalizeMarkdownText(article.description),
    '',
    ...(article.sections || []).flatMap((section) => [
      `### ${section.title}`,
      '',
      ...(section.paragraphs || []).flatMap((paragraph) => [
        normalizeMarkdownText(paragraph),
        '',
      ]),
    ]),
  ].join('\n'));

  writeMarkdown(
    path.join(knowledgeOutputRoot, 'bjcp-style-guide.md'),
    '# BJCP 2021 风格指南\n\n> 由当前仓库数据生成，仅包含小程序已收录内容。\n\n' +
      bjcpSections.join('\n\n---\n\n'),
  );
  writeMarkdown(
    path.join(knowledgeOutputRoot, 'extension-style-guide.md'),
    '# 市场扩展风格指南\n\n> 这些是 BA/WBC/GABF 市场高频叫法，不等同于 BJCP 独立编号。\n\n' +
      extensionSections.join('\n\n---\n\n'),
  );
  writeMarkdown(
    path.join(knowledgeOutputRoot, 'academy-articles.md'),
    '# 精酿学院文章\n\n> 由当前仓库 academy-sites 内容生成。\n\n' +
      academySections.join('\n\n---\n\n'),
  );
}

function knowledgeDetailLines(details) {
  const sections = [
    ['overall_impression', '总体印象'],
    ['aroma', '香气'],
    ['appearance', '外观'],
    ['flavor', '风味'],
    ['mouthfeel', '口感'],
    ['comments', '备注'],
    ['history', '历史'],
    ['ingredients', '原料'],
    ['comparison', '风格比较'],
    ['stats', '参数'],
    ['commercial_examples', '商业案例'],
    ['tags', '标签'],
  ];
  return sections.flatMap(([key, label]) => {
    const content = normalizeMarkdownText(details[key]);
    return content ? [`### ${label}`, '', content, ''] : [];
  });
}

function formatTasteProfile(profile = {}) {
  const labels = {
    sweetness: '甜度',
    sourness: '酸度',
    bitterness: '苦味',
    body: '酒体',
    strength: '强度',
  };
  return Object.entries(labels)
    .map(([key, label]) => `${label}${tasteValueLabel(profile[key])}`)
    .join('、');
}

function tasteValueLabel(value) {
  if (Number(value) === 1) return '高';
  if (Number(value) === -1) return '低';
  return '中';
}

function normalizeMarkdownText(value) {
  if (Array.isArray(value)) return value.join('、');
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function writeMarkdown(filePath, source) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${source.trim()}\n`, 'utf8');
}

function importSourceModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function writeCommonJsModule(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `// Generated by scripts/build_ai_mode_project.cjs. Do not edit.\nmodule.exports = ${JSON.stringify(value, null, 2)};\n`,
    'utf8',
  );
}

function copyFile(sourcePath, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

function escapeXmlAttribute(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
