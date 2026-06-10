const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const sourceMiniProgramRoot = path.join(root, 'miniprogram');
const outputRoot = path.join(root, 'artifacts', 'ai-mode-project');
const outputMiniProgramRoot = path.join(outputRoot, 'miniprogram');
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
  fs.mkdirSync(outputRoot, { recursive: true });
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
  try {
    return fs.readFileSync(markerPath, 'utf8') === fingerprint && fs.existsSync(appPath);
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
