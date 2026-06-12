const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const options = parseOptions(process.argv.slice(2));
const projectRoot = options.outputRoot
  ? path.resolve(root, options.outputRoot)
  : root;
const knowledgeRoot = options.outputRoot
  ? path.join(projectRoot, 'knowledge')
  : path.join(root, 'artifacts', 'ai-knowledge-base');
const manifestPath = options.outputRoot
  ? path.join(projectRoot, 'build-manifest.json')
  : path.join(root, 'artifacts', 'ai-mode-build-manifest.json');
const skillRoot = path.join(projectRoot, 'skills', 'craft-beer-guide');
const errors = [];

main();

function main() {
  if (!options.noBuild) {
    const args = ['scripts/build_ai_mode_project.cjs'];
    if (options.outputRoot) args.push(`--output-root=${options.outputRoot}`);
    if (options.ifCurrent) args.push('--if-current');
    execFileSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  }

  verifyProjectRoot();
  verifyAgentConfig();
  verifySkillProtocol();
  verifyComponents();
  verifyMetadataAndKnowledge();
  verifyManifest();
  verifyFileSizes();
  verifyLegacyProjectRemoved();

  if (errors.length) {
    console.error('AI mode verification failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log('AI mode project verified');
  console.log(`- ${path.relative(root, projectRoot) || '.'}`);
  console.log(`- ${path.relative(root, knowledgeRoot)}`);
}

function verifyProjectRoot() {
  const appPath = path.join(projectRoot, 'app.json');
  const projectPath = path.join(projectRoot, 'project.config.json');
  check(fs.existsSync(appPath), appPath, 'missing app.json at project root');
  check(fs.existsSync(projectPath), projectPath, 'missing project.config.json at project root');

  const project = readJson(projectPath);
  check(
    !Object.hasOwn(project, 'miniprogramRoot'),
    projectPath,
    'project root must not point at a nested miniprogram directory',
  );
  check(
    (project.packOptions?.include || []).some((item) =>
      item.type === 'folder' && item.value === 'skills'),
    projectPath,
    'packOptions.include must contain the skills folder',
  );
  check(
    options.outputRoot || !fs.existsSync(path.join(root, 'miniprogram', 'app.json')),
    path.join(root, 'miniprogram'),
    'nested miniprogram project must not exist',
  );
}

function verifyAgentConfig() {
  const appPath = path.join(projectRoot, 'app.json');
  const app = readJson(appPath);
  const packages = app.subPackages || app.subpackages || [];
  const skill = app.agent?.skills?.find((item) => item.name === 'craft-beer-guide');

  check(skill?.path === 'skills/craft-beer-guide', appPath, 'missing craft-beer-guide Skill');
  check(app.agent?.instruction === 'AGENTS.md', appPath, 'missing agent.instruction');
  check(app.agent?.pageMetadata === 'page-meta.json', appPath, 'missing agent.pageMetadata');
  check(app.lazyCodeLoading === 'requiredComponents', appPath, 'lazyCodeLoading must be requiredComponents');
  check(
    packages.some((item) => item.root === 'skills' && item.independent === true),
    appPath,
    'Skill package must be independent',
  );
  check(
    packages.some((item) => item.root === 'aiDetail' && item.independent === true),
    appPath,
    'AI detail package must be independent',
  );

  for (const relativePath of [
    skill?.path,
    app.agent?.instruction,
    app.agent?.pageMetadata,
  ]) {
    check(
      typeof relativePath === 'string' && fs.existsSync(path.join(projectRoot, relativePath)),
      appPath,
      `agent path does not resolve: ${relativePath || '<missing>'}`,
    );
  }
}

function verifySkillProtocol() {
  const mcpPath = path.join(skillRoot, 'mcp.json');
  const indexPath = path.join(skillRoot, 'index.js');
  const mcp = readJson(mcpPath);
  const source = readText(indexPath);
  const registered = [...source.matchAll(/registerAPI\('([^']+)'/g)]
    .map((match) => match[1]);
  const declared = (mcp.apis || []).map((api) => api.name);

  check(
    JSON.stringify(registered) === JSON.stringify(declared),
    indexPath,
    'registered APIs differ from mcp.json',
  );
  check(!/reportEvent|reportAnalytics/.test(readTree(skillRoot)), skillRoot, 'Skill must not use analytics APIs');
}

function verifyComponents() {
  const mcp = readJson(path.join(skillRoot, 'mcp.json'));
  for (const component of mcp.components || []) {
    for (const extension of ['js', 'json', 'wxml', 'wxss']) {
      const componentPath = path.join(skillRoot, `${component.path}.${extension}`);
      check(fs.existsSync(componentPath), componentPath, 'component file missing');
    }

    const relatedPage = String(component.relatedPage || '').split('?')[0].replace(/^\/+/, '');
    check(Boolean(relatedPage), component.path, 'component relatedPage is required');
    if (relatedPage) {
      check(
        fs.existsSync(path.join(projectRoot, `${relatedPage}.js`)),
        component.path,
        `relatedPage does not resolve: ${component.relatedPage}`,
      );
    }
  }
}

function verifyMetadataAndKnowledge() {
  const metadataPath = path.join(projectRoot, 'page-meta.json');
  const metadata = readJson(metadataPath);
  check(
    Array.isArray(metadata.pages) && metadata.pages.length === 8,
    metadataPath,
    'must declare 8 AI-visible pages',
  );

  const files = fs.existsSync(knowledgeRoot)
    ? fs.readdirSync(knowledgeRoot).filter((name) => name.endsWith('.md'))
    : [];
  check(files.length === 3, knowledgeRoot, 'expected 3 knowledge files');
}

function verifyManifest() {
  const manifest = readJson(manifestPath);
  check(['control', 'candidate'].includes(manifest.variant), manifestPath, 'invalid variant');
  check(Boolean(manifest.sourceTreeFingerprint), manifestPath, 'missing source fingerprint');
  check(Boolean(manifest.catalogFingerprint), manifestPath, 'missing catalog fingerprint');
}

function verifyFileSizes() {
  listProjectFiles().forEach((file) => {
    check(fs.statSync(file).size < 2 * 1024 * 1024, file, 'exceeds 2 MB');
  });
}

function listProjectFiles() {
  const rootFiles = [
    'AGENTS.md',
    'app.js',
    'app.json',
    'app.wxss',
    'page-meta.json',
    'project.config.json',
    'project.private.config.json',
    'sitemap.json',
  ];
  const directories = [
    'aiDetail',
    'assets',
    'components',
    'pages',
    'skills',
    'subpages',
    'templates',
    'utils',
  ];
  const dataFiles = [
    'academy-sites.js',
    'beer-data.js',
    'extension-styles.js',
    'style-aliases.js',
    'styleLanguageMap.js',
  ];
  return [
    ...rootFiles.map((relativePath) => path.join(projectRoot, relativePath)),
    ...directories.flatMap((relativePath) => listFiles(path.join(projectRoot, relativePath))),
    ...dataFiles.map((fileName) => path.join(projectRoot, 'data', fileName)),
  ].filter((filePath) => fs.existsSync(filePath));
}

function verifyLegacyProjectRemoved() {
  if (options.outputRoot) return;
  const legacyRoot = path.join(root, 'artifacts', 'ai-mode-project');
  check(!fs.existsSync(legacyRoot), legacyRoot, 'legacy generated mini program must not exist');
}

function parseOptions(argv) {
  const outputArg = argv.find((arg) => arg.startsWith('--output-root='));
  return {
    outputRoot: outputArg ? outputArg.slice('--output-root='.length) : '',
    noBuild: argv.includes('--no-build'),
    ifCurrent: argv.includes('--if-current'),
  };
}

function check(condition, filePath, message) {
  if (!condition) errors.push(`${path.relative(root, String(filePath))}: ${message}`);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${path.relative(root, filePath)}: ${error.message}`);
    return {};
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    errors.push(`${path.relative(root, filePath)}: ${error.message}`);
    return '';
  }
}

function readTree(dir) {
  return listFiles(dir)
    .filter((file) => /\.(?:js|json|md)$/.test(file))
    .map(readText)
    .join('\n');
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(filePath) : [filePath];
  });
}
