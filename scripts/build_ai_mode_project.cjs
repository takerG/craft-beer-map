const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const sourceMiniProgramRoot = path.join(root, 'miniprogram');
const outputRoot = path.join(root, 'artifacts', 'ai-mode-project');
const outputMiniProgramRoot = path.join(outputRoot, 'miniprogram');
const buildLockPath = path.join(root, 'artifacts', '.ai-mode-build.lock');

async function main() {
  const lockHandle = acquireBuildLock();
  try {
    resetOutput();
    copyProductionMiniProgram();
    writeAiAppConfig();
    writeProjectConfig();
    writeNodeProjectConfig();
    await writeCatalog();
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

function copyProductionMiniProgram() {
  fs.cpSync(sourceMiniProgramRoot, outputMiniProgramRoot, { recursive: true });
}

function writeAiAppConfig() {
  const appPath = path.join(outputMiniProgramRoot, 'app.json');
  const app = readJson(appPath);
  const subpackages = (app.subpackages || []).filter((item) => item.root !== 'skills');

  app.agent = 'skills/craft-beer-guide';
  app.subpackages = [
    ...subpackages,
    {
      root: 'skills',
      pages: [],
      independent: true,
    },
  ];

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
  copyFile(
    path.join(root, 'ai-mode', 'shared', 'catalog-runtime.cjs'),
    path.join(skillRoot, 'utils', 'catalog-runtime.js'),
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
