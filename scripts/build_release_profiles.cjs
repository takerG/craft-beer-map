const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const options = parseOptions(process.argv.slice(2));
const outputBase = path.resolve(root, options.outputBase || 'artifacts');
const productionRoot = path.join(outputBase, 'production');
const aiBetaRoot = path.join(outputBase, 'ai-beta');
const runtimeDirectories = ['assets', 'components', 'pages', 'subpages', 'utils'];
const runtimeRootFiles = [
  'app.js',
  'app.wxss',
  'project.private.config.json',
  'sitemap.json',
];
const runtimeDataFiles = [
  'academy-sites.js',
  'beer-data.js',
  'extension-styles.js',
  'style-aliases.js',
  'styleLanguageMap.js',
];
const productionExcludedPaths = new Set([
  'components/ai-entry',
]);

main();

function main() {
  resetDirectory(productionRoot);
  resetDirectory(aiBetaRoot);
  buildProduction();
  buildAiBeta();
  writeReleaseManifest(productionRoot, 'production', buildProductionSourceFingerprint());
  writeReleaseManifest(aiBetaRoot, 'ai-beta', readAiSourceFingerprint());
  console.log(`Built ${displayPath(productionRoot)}`);
  console.log(`Built ${displayPath(aiBetaRoot)}`);
}

function buildProduction() {
  runtimeRootFiles.forEach((relativePath) => copyFile(relativePath, productionRoot));
  runtimeDirectories.forEach((relativePath) => {
    copyDirectory(
      path.join(root, relativePath),
      path.join(productionRoot, relativePath),
      relativePath,
    );
  });
  runtimeDataFiles.forEach((fileName) => {
    copyFile(path.join('data', fileName), productionRoot);
  });

  const app = readJson(path.join(root, 'app.json'));
  delete app.agent;
  app.subPackages = (app.subPackages || app.subpackages || [])
    .filter((item) => !['skills', 'aiDetail'].includes(item.root));
  delete app.subpackages;
  if (app.usingComponents) {
    delete app.usingComponents['ai-entry'];
    if (!Object.keys(app.usingComponents).length) delete app.usingComponents;
  }
  writeJson(path.join(productionRoot, 'app.json'), app);

  const project = readJson(path.join(root, 'project.config.json'));
  project.projectname = 'craft-beer-map-production';
  project.packOptions = {
    ...(project.packOptions || {}),
    ignore: [
      { type: 'file', value: 'release-profile-manifest.json' },
    ],
    include: [],
  };
  if (project.watchOptions) project.watchOptions.ignore = [];
  writeJson(path.join(productionRoot, 'project.config.json'), project);

  listFiles(productionRoot)
    .filter((filePath) => filePath.endsWith('.wxml'))
    .forEach((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8');
      const stripped = source.replace(/\s*<ai-entry\b[\s\S]*?\/>\s*/g, '\n');
      fs.writeFileSync(filePath, stripped.trimEnd() + '\n', 'utf8');
    });
}

function buildAiBeta() {
  execFileSync(process.execPath, [
    'scripts/build_ai_mode_project.cjs',
    `--output-root=${aiBetaRoot}`,
  ], {
    cwd: root,
    stdio: 'inherit',
  });
}

function copyDirectory(sourceRoot, targetRoot, relativeRoot) {
  if (!fs.existsSync(sourceRoot)) return;
  fs.readdirSync(sourceRoot, { withFileTypes: true }).forEach((entry) => {
    const relativePath = normalizePath(path.join(relativeRoot, entry.name));
    if (isProductionExcluded(relativePath)) return;
    const sourcePath = path.join(sourceRoot, entry.name);
    const targetPath = path.join(targetRoot, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath, relativePath);
      return;
    }
    if (entry.isFile()) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

function copyFile(relativePath, targetRoot) {
  const sourcePath = path.join(root, relativePath);
  if (!fs.existsSync(sourcePath)) return;
  const targetPath = path.join(targetRoot, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

function isProductionExcluded(relativePath) {
  return [...productionExcludedPaths].some((excludedPath) =>
    relativePath === excludedPath || relativePath.startsWith(`${excludedPath}/`));
}

function writeReleaseManifest(projectRoot, profile, sourceFingerprint) {
  const files = listFiles(projectRoot)
    .filter((filePath) => {
      const relativePath = normalizePath(path.relative(projectRoot, filePath));
      return relativePath !== 'release-profile-manifest.json'
        && relativePath !== '.build-fingerprint';
    })
    .map((filePath) => {
      const content = fs.readFileSync(filePath);
      return {
        path: normalizePath(path.relative(projectRoot, filePath)),
        bytes: content.length,
        sha256: hashBuffer(content),
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
  const contentFingerprint = hashBuffer(Buffer.from(
    files.map((file) => `${file.path}\0${file.sha256}\0${file.bytes}\n`).join(''),
  ));

  writeJson(path.join(projectRoot, 'release-profile-manifest.json'), {
    profile,
    sourceFingerprint,
    contentFingerprint: `sha256:${contentFingerprint}`,
    totalBytes: files.reduce((total, file) => total + file.bytes, 0),
    files,
  });
}

function buildProductionSourceFingerprint() {
  const sourcePaths = [
    'app.json',
    'project.config.json',
    ...runtimeRootFiles,
    ...runtimeDataFiles.map((fileName) => path.join('data', fileName)),
    ...runtimeDirectories.flatMap((relativePath) =>
      listFiles(path.join(root, relativePath))
        .filter((filePath) => !isProductionExcluded(
          normalizePath(path.relative(root, filePath)),
        ))
        .map((filePath) => path.relative(root, filePath))),
  ]
    .map(normalizePath)
    .sort();
  const hash = crypto.createHash('sha256');
  sourcePaths.forEach((relativePath) => {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(root, relativePath)));
    hash.update('\0');
  });
  return `sha256:${hash.digest('hex')}`;
}

function readAiSourceFingerprint() {
  const manifest = readJson(path.join(aiBetaRoot, 'build-manifest.json'));
  return manifest.sourceTreeFingerprint;
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(entryPath);
    return entry.isFile() ? [entryPath] : [];
  });
}

function resetDirectory(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.?\//, '');
}

function displayPath(filePath) {
  return normalizePath(path.relative(root, filePath)) || '.';
}

function parseOptions(args) {
  return args.reduce((result, arg) => {
    if (!arg.startsWith('--') || !arg.includes('=')) return result;
    const [key, ...parts] = arg.slice(2).split('=');
    if (key === 'output-base') result.outputBase = parts.join('=');
    return result;
  }, {});
}
