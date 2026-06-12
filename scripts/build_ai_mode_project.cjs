const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const sourceProjectRoot = root;
const PROJECT_ROOT_FILES = [
  'AGENTS.md',
  'app.js',
  'app.json',
  'app.wxss',
  'page-meta.json',
  'project.config.json',
  'project.private.config.json',
  'sitemap.json',
];
const PROJECT_DIRECTORIES = [
  'aiDetail',
  'assets',
  'components',
  'pages',
  'skills',
  'subpages',
  'templates',
  'utils',
];
const PROJECT_DATA_FILES = [
  'academy-sites.js',
  'beer-data.js',
  'extension-styles.js',
  'style-aliases.js',
  'styleLanguageMap.js',
];
const buildContext = createBuildContext(process.argv.slice(2));
const outputRoot = buildContext.outputRoot;
const outputProjectRoot = buildContext.projectRoot;
const knowledgeOutputRoot = buildContext.knowledgeOutputRoot;
const buildLockPath = buildContext.lockPath;

async function main() {
  const lockHandle = acquireBuildLock();
  try {
    const fingerprint = buildFingerprint();
    if (process.argv.includes('--if-current') && isCurrentBuild(fingerprint)) {
      console.log(`Using current ${displayPath(outputProjectRoot)}`);
      return;
    }

    resetOutput();
    if (buildContext.isSnapshot) copyProductionMiniProgram();
    writePageMetadata();
    prepareSkillRuntime();
    copyPageTelemetry();
    const catalogFingerprint = await writeCatalog();
    writeBuildManifest(fingerprint, catalogFingerprint);
    fs.writeFileSync(buildContext.fingerprintPath, fingerprint, 'utf8');
  } finally {
    releaseBuildLock(lockHandle);
  }

  console.log(`Built ${displayPath(outputProjectRoot)}`);
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
  if (buildContext.isSnapshot) {
    fs.rmSync(outputRoot, { recursive: true, force: true });
    fs.mkdirSync(outputRoot, { recursive: true });
  } else {
    fs.rmSync(path.join(root, 'artifacts', 'ai-mode-project'), {
      recursive: true,
      force: true,
    });
  }
  fs.rmSync(knowledgeOutputRoot, { recursive: true, force: true });
  fs.mkdirSync(knowledgeOutputRoot, { recursive: true });
}

function buildFingerprint() {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify({
    experimentId: buildContext.experimentId,
    experimentBuildId: buildContext.experimentBuildId,
    variant: buildContext.variant,
    recommendationContract: buildContext.recommendationContract,
    telemetryMode: buildContext.telemetryMode,
    outputRoot: buildContext.outputRoot,
    knowledgeOutputRoot: buildContext.knowledgeOutputRoot,
  }));
  const sourcePaths = sourceFingerprintPaths();
  sourcePaths.forEach((filePath) => {
    hash.update(path.relative(root, filePath).replaceAll('\\', '/'));
    hash.update('\0');
    hash.update(fs.readFileSync(filePath));
    hash.update('\0');
  });
  return hash.digest('hex');
}

function sourceTreeFingerprint() {
  const hash = crypto.createHash('sha256');
  const sourcePaths = sourceFingerprintPaths();
  sourcePaths.forEach((filePath) => {
    hash.update(path.relative(root, filePath).replaceAll('\\', '/'));
    hash.update('\0');
    hash.update(fs.readFileSync(filePath));
    hash.update('\0');
  });
  return hash.digest('hex');
}

function sourceFingerprintPaths() {
  return [
    ...listProductionProjectFiles().filter((filePath) =>
      !isGeneratedProjectFile(filePath)),
    ...listFiles(path.join(root, 'ai-mode')),
    path.join(root, 'package.json'),
    path.join(root, 'scripts', 'build_ai_mode_experiment.cjs'),
    path.join(root, 'scripts', 'check_ai_mode_project.cjs'),
    __filename,
  ].sort();
}

function isGeneratedProjectFile(filePath) {
  const relativePath = path.relative(sourceProjectRoot, filePath).replaceAll('\\', '/');
  return [
    'page-meta.json',
    'skills/craft-beer-guide/data/catalog.js',
    'skills/craft-beer-guide/generated/experiment.js',
    'skills/craft-beer-guide/utils/catalog-runtime.cjs',
    'skills/craft-beer-guide/utils/catalog-runtime.js',
    'skills/craft-beer-guide/utils/flow-state.js',
    'skills/craft-beer-guide/utils/recommendation-v2.js',
    'aiDetail/data/catalog.js',
    'aiDetail/utils/catalog-runtime.js',
  ].includes(relativePath);
}

function isCurrentBuild(fingerprint) {
  const markerPath = buildContext.fingerprintPath;
  const requiredPaths = [
    path.join(outputProjectRoot, 'project.config.json'),
    path.join(outputProjectRoot, 'AGENTS.md'),
    path.join(outputProjectRoot, 'app.json'),
    path.join(outputProjectRoot, 'aiDetail', 'pages', 'style-results', 'index.js'),
    path.join(outputProjectRoot, 'aiDetail', 'pages', 'taste-refine', 'index.js'),
    path.join(outputProjectRoot, 'skills', 'craft-beer-guide', 'mcp.json'),
    path.join(outputProjectRoot, 'skills', 'craft-beer-guide', 'data', 'catalog.js'),
    path.join(outputProjectRoot, 'aiDetail', 'data', 'catalog.js'),
    path.join(knowledgeOutputRoot, 'bjcp-style-guide.md'),
  ];
  try {
    return (
      fs.readFileSync(markerPath, 'utf8') === fingerprint &&
      requiredPaths.every((filePath) => fs.existsSync(filePath))
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

function displayPath(filePath) {
  return path.relative(root, filePath) || '.';
}

function listProductionProjectFiles() {
  return [
    ...PROJECT_ROOT_FILES.map((relativePath) => path.join(sourceProjectRoot, relativePath)),
    ...PROJECT_DIRECTORIES.flatMap((relativePath) =>
      listFiles(path.join(sourceProjectRoot, relativePath))),
    ...PROJECT_DATA_FILES.map((fileName) =>
      path.join(sourceProjectRoot, 'data', fileName)),
  ].filter((filePath) => fs.existsSync(filePath));
}

function copyProductionMiniProgram() {
  fs.mkdirSync(outputProjectRoot, { recursive: true });
  PROJECT_ROOT_FILES.forEach((relativePath) => {
    copyFile(
      path.join(sourceProjectRoot, relativePath),
      path.join(outputProjectRoot, relativePath),
    );
  });
  PROJECT_DIRECTORIES.forEach((relativePath) => {
    fs.cpSync(
      path.join(sourceProjectRoot, relativePath),
      path.join(outputProjectRoot, relativePath),
      { recursive: true },
    );
  });
  PROJECT_DATA_FILES.forEach((fileName) => {
    copyFile(
      path.join(sourceProjectRoot, 'data', fileName),
      path.join(outputProjectRoot, 'data', fileName),
    );
  });
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
  writeJson(path.join(outputProjectRoot, 'page-meta.json'), { pages });
}

function prepareSkillRuntime() {
  const sourceSkillRoot = path.join(root, 'ai-mode', 'skill', 'craft-beer-guide');
  const targetSkillRoot = path.join(outputProjectRoot, 'skills', 'craft-beer-guide');
  if (!buildContext.isSnapshot) {
    [
      'generated/experiment.js',
      'utils/catalog-runtime.cjs',
      'utils/flow-state.js',
      'utils/recommendation-v2.js',
    ].forEach((relativePath) => {
      fs.rmSync(path.join(targetSkillRoot, relativePath), { force: true });
    });
    return;
  }
  fs.cpSync(sourceSkillRoot, targetSkillRoot, { recursive: true });
  const skillTemplate = buildContext.variant === 'candidate'
    ? 'SKILL.candidate.md'
    : 'SKILL.md';
  const mcpTemplate = buildContext.variant === 'candidate'
    ? 'mcp.candidate.json'
    : 'mcp.json';
  copyFile(path.join(sourceSkillRoot, skillTemplate), path.join(targetSkillRoot, 'SKILL.md'));
  copyFile(path.join(sourceSkillRoot, mcpTemplate), path.join(targetSkillRoot, 'mcp.json'));
  fs.mkdirSync(path.join(targetSkillRoot, 'generated'), { recursive: true });
  writeCommonJsModule(path.join(targetSkillRoot, 'generated', 'experiment.js'), {
    experimentId: buildContext.experimentId,
    variant: buildContext.variant,
    recommendationContract: buildContext.recommendationContract,
    telemetryMode: buildContext.telemetryMode,
    enableExpirePreviousCards: buildContext.enableExpirePreviousCards,
  });
  copyFile(
    path.join(root, 'ai-mode', 'shared', 'recommendation-v2.cjs'),
    path.join(targetSkillRoot, 'utils', 'recommendation-v2.js'),
  );
  copyFile(
    path.join(root, 'ai-mode', 'shared', 'catalog-runtime.cjs'),
    path.join(targetSkillRoot, 'utils', 'catalog-runtime.cjs'),
  );
  copyFile(
    path.join(root, 'ai-mode', 'shared', 'flow-state.cjs'),
    path.join(targetSkillRoot, 'utils', 'flow-state.js'),
  );
  const flowStorePath = path.join(targetSkillRoot, 'utils', 'flow-store.js');
  const flowStoreSource = fs.readFileSync(flowStorePath, 'utf8')
    .replace("require('../../../shared/flow-state.cjs')", "require('./flow-state.js')");
  fs.writeFileSync(flowStorePath, flowStoreSource, 'utf8');
  if (buildContext.variant === 'control') {
    copyFile(
      path.join(sourceSkillRoot, 'apis', 'getBeerStyleDetailControl.js'),
      path.join(targetSkillRoot, 'apis', 'getBeerStyleDetail.js'),
    );
    copyFile(
      path.join(sourceSkillRoot, 'apis', 'addFavoriteBeerStyleControl.js'),
      path.join(targetSkillRoot, 'apis', 'addFavoriteBeerStyle.js'),
    );
    [
      'apis/getBeerStyleDetailControl.js',
      'apis/addFavoriteBeerStyleControl.js',
      'apis/recommendBeerStylesCandidate.js',
      'components/recommendation-v2-card',
      'utils/flow-state.js',
      'utils/flow-store.js',
      'utils/recommendation-session.js',
      'utils/recommendation-v2.js',
      'utils/redacted-logger.js',
    ].forEach((relativePath) => {
      fs.rmSync(path.join(targetSkillRoot, relativePath), { recursive: true, force: true });
    });
  } else {
    [
      'apis/getBeerStyleDetailControl.js',
      'apis/addFavoriteBeerStyleControl.js',
      'apis/recommendBeerStylesControl.js',
    ].forEach((relativePath) => {
      fs.rmSync(path.join(targetSkillRoot, relativePath), { force: true });
    });
  }
  ['SKILL.control.md', 'SKILL.candidate.md', 'mcp.candidate.json'].forEach((fileName) => {
    fs.rmSync(path.join(targetSkillRoot, fileName), { force: true });
  });
}

function copyPageTelemetry() {
  if (buildContext.telemetryMode === 'page-only') {
    copyFile(
      path.join(root, 'ai-mode', 'page-runtime', 'ai-recommendation-telemetry.js'),
      path.join(outputProjectRoot, 'utils', 'ai-recommendation-telemetry.js'),
    );
  }
}

async function writeCatalog() {
  const [
    { beerData },
    { styleAliases },
    { extensionStyles },
    { academySites },
  ] = await Promise.all([
    importSourceModule('data/beer-data.js'),
    importSourceModule('data/style-aliases.js'),
    importSourceModule('data/extension-styles.js'),
    importSourceModule('data/academy-sites.js'),
  ]);
  const skillRoot = path.join(outputProjectRoot, 'skills', 'craft-beer-guide');
  const detailRoot = path.join(outputProjectRoot, 'aiDetail');
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
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(catalog)).digest('hex')}`;
}

function writeBuildManifest(fingerprint, catalogFingerprint) {
  writeJson(buildContext.manifestPath, {
    experimentId: buildContext.experimentId,
    experimentBuildId: buildContext.experimentBuildId,
    variant: buildContext.variant,
    recommendationContract: buildContext.recommendationContract,
    telemetryMode: buildContext.telemetryMode,
    sourceCommit: buildContext.sourceCommit,
    sourceTreeFingerprint: `sha256:${sourceTreeFingerprint()}`,
    catalogFingerprint,
    dirty: buildContext.dirty,
  });
}

function createBuildContext(argv) {
  const values = new Map(
    argv
      .filter((arg) => arg.startsWith('--') && arg.includes('='))
      .map((arg) => {
        const [key, ...rest] = arg.slice(2).split('=');
        return [key, rest.join('=')];
      }),
  );
  const variant = values.get('variant') || 'control';
  if (!['control', 'candidate'].includes(variant)) {
    throw new Error(`Unknown AI recommendation variant: ${variant}`);
  }
  const recommendationContract = variant === 'candidate' ? 'semantic-v2' : 'legacy-v1';
  const platformCapabilities = JSON.parse(fs.readFileSync(
    path.join(root, 'ai-mode', 'experiments', 'platform-capabilities.json'),
    'utf8',
  ));
  const telemetryMode = values.get('telemetry-mode') || 'off';
  if (!['off', 'page-only'].includes(telemetryMode)) {
    throw new Error(`Unknown telemetry mode: ${telemetryMode}`);
  }
  if (telemetryMode === 'page-only') {
    const capabilities = JSON.parse(fs.readFileSync(
      path.join(root, 'ai-mode', 'experiments', 'platform-capabilities.json'),
      'utf8',
    ));
    const analytics = capabilities.capabilities?.ordinaryPageAnalytics;
    const evidencePath = analytics?.evidence
      ? path.resolve(root, analytics.evidence)
      : null;
    if (
      capabilities.status !== 'verified' ||
      capabilities.appIdPermissionConfirmed !== true ||
      !capabilities.devToolsVersion ||
      !capabilities.baseLibraryVersion ||
      analytics?.status !== 'verified' ||
      !evidencePath ||
      !fs.statSync(evidencePath, { throwIfNoEntry: false })?.isFile()
    ) {
      throw new Error('page-only analytics is blocked until ordinary-page capability is verified');
    }
  }
  const isSnapshot = values.has('output-root');
  const outputRelative = values.get('output-root') || '.';
  const outputRootValue = path.resolve(root, outputRelative);
  const defaultKnowledgeRoot = isSnapshot
    ? path.join(outputRootValue, 'knowledge')
    : path.join(root, 'artifacts', 'ai-knowledge-base');
  return {
    experimentId: values.get('experiment-id') || 'ai-rec-quality-v2-20260612',
    experimentBuildId: values.get('experiment-build-id') || 'development',
    variant,
    recommendationContract,
    telemetryMode,
    enableExpirePreviousCards:
      platformCapabilities.status === 'verified' &&
      platformCapabilities.capabilities?.expirePreviousCards?.status === 'verified',
    sourceCommit: readGit(['rev-parse', 'HEAD']).trim(),
    dirty: Boolean(readGit(['status', '--porcelain']).trim()),
    isSnapshot,
    outputRoot: outputRootValue,
    projectRoot: outputRootValue,
    knowledgeOutputRoot: defaultKnowledgeRoot,
    manifestPath: isSnapshot
      ? path.join(outputRootValue, 'build-manifest.json')
      : path.join(root, 'artifacts', 'ai-mode-build-manifest.json'),
    lockPath: path.join(
      root,
      'artifacts',
      isSnapshot
        ? `.${path.basename(outputRootValue)}.build.lock`
        : '.ai-mode-build.lock',
    ),
    fingerprintPath: isSnapshot
      ? path.join(outputRootValue, '.build-fingerprint')
      : path.join(root, 'artifacts', '.ai-mode-build-fingerprint'),
  };
}

function readGit(args) {
  const { execFileSync } = require('node:child_process');
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
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
    `// Generated by scripts/build_ai_mode_project.cjs. Do not edit.\nmodule.exports = ${JSON.stringify(value)};\n`,
    'utf8',
  );
}

function copyFile(sourcePath, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
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
