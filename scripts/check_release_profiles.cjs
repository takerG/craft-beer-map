const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const productionRoot = path.join(root, 'artifacts', 'production');
const aiBetaRoot = path.join(root, 'artifacts', 'ai-beta');
const productionBudget = 1950 * 1024;
const errors = [];

main();

function main() {
  runNode(['scripts/build_release_profiles.cjs']);
  verifyManifest(productionRoot, 'production');
  verifyManifest(aiBetaRoot, 'ai-beta');
  verifyProduction();
  verifyAiBeta();
  verifyDeterminism();

  if (errors.length) {
    console.error('Release profile verification failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log('Release profiles verified');
  console.log(`- production: ${normalizePath(path.relative(root, productionRoot))}`);
  console.log(`- ai-beta: ${normalizePath(path.relative(root, aiBetaRoot))}`);
}

function verifyManifest(projectRoot, expectedProfile) {
  const manifestPath = path.join(projectRoot, 'release-profile-manifest.json');
  const manifest = readJson(manifestPath);
  check(manifest.profile === expectedProfile, `${expectedProfile} manifest profile mismatch`);
  check(/^sha256:[a-f0-9]{64}$/.test(manifest.sourceFingerprint || ''),
    `${expectedProfile} source fingerprint is invalid`);
  check(/^sha256:[a-f0-9]{64}$/.test(manifest.contentFingerprint || ''),
    `${expectedProfile} content fingerprint is invalid`);

  const actualFiles = (manifest.files || []).map((file) => {
    const filePath = path.join(projectRoot, file.path);
    check(fs.existsSync(filePath), `${expectedProfile} missing ${file.path}`);
    if (!fs.existsSync(filePath)) return file;
    const content = fs.readFileSync(filePath);
    check(content.length === file.bytes, `${expectedProfile} byte mismatch: ${file.path}`);
    check(hashBuffer(content) === file.sha256, `${expectedProfile} hash mismatch: ${file.path}`);
    return file;
  });
  const fingerprint = hashBuffer(Buffer.from(
    actualFiles.map((file) => `${file.path}\0${file.sha256}\0${file.bytes}\n`).join(''),
  ));
  check(
    manifest.contentFingerprint === `sha256:${fingerprint}`,
    `${expectedProfile} content fingerprint mismatch`,
  );
  check(
    manifest.totalBytes === actualFiles.reduce((total, file) => total + file.bytes, 0),
    `${expectedProfile} total byte count mismatch`,
  );
}

function verifyProduction() {
  const app = readJson(path.join(productionRoot, 'app.json'));
  const project = readJson(path.join(productionRoot, 'project.config.json'));
  const packages = app.subPackages || app.subpackages || [];
  check(!Object.hasOwn(app, 'agent'), 'production app.json contains agent');
  check(
    !packages.some((item) => ['skills', 'aiDetail'].includes(item.root)),
    'production app.json contains AI subpackages',
  );
  check(
    !Object.hasOwn(app.usingComponents || {}, 'ai-entry'),
    'production app.json contains ai-entry',
  );
  check(
    !(project.packOptions?.include || []).some((item) => item.value === 'skills'),
    'production project config includes skills',
  );

  [
    'AGENTS.md',
    'page-meta.json',
    'skills',
    'aiDetail',
    'components/ai-entry',
  ].forEach((relativePath) => {
    check(!fs.existsSync(path.join(productionRoot, relativePath)),
      `production contains ${relativePath}`);
  });

  const forbidden = [
    /<ai-entry\b/,
    /wx\.openAgent/,
    /wx\.onAgentOpen/,
    /craft-beer-guide/,
    /(?:^|["'])\/?aiDetail\//,
  ];
  listFiles(productionRoot)
    .filter((filePath) => /\.(?:js|json|wxml|wxss|md|txt)$/i.test(filePath))
    .forEach((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8');
      forbidden.forEach((pattern) => {
        check(!pattern.test(source),
          `production reference ${pattern} in ${normalizePath(path.relative(productionRoot, filePath))}`);
      });
    });

  const manifest = readJson(path.join(productionRoot, 'release-profile-manifest.json'));
  check(manifest.totalBytes < productionBudget,
    `production exceeds ${productionBudget} bytes`);
}

function verifyAiBeta() {
  runNode([
    'scripts/check_ai_mode_project.cjs',
    '--output-root=artifacts/ai-beta',
    '--no-build',
  ]);
}

function verifyDeterminism() {
  const temporaryBase = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-beer-profiles-'));
  try {
    runNode([
      'scripts/build_release_profiles.cjs',
      `--output-base=${temporaryBase}`,
    ]);
    ['production', 'ai-beta'].forEach((profile) => {
      const current = readJson(path.join(
        root, 'artifacts', profile, 'release-profile-manifest.json',
      ));
      const rebuilt = readJson(path.join(
        temporaryBase, profile, 'release-profile-manifest.json',
      ));
      check(
        current.contentFingerprint === rebuilt.contentFingerprint,
        `${profile} build is not deterministic`,
      );
    });
  } finally {
    fs.rmSync(temporaryBase, { recursive: true, force: true });
  }
}

function runNode(args) {
  try {
    execFileSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  } catch (error) {
    errors.push(`command failed: node ${args.join(' ')}`);
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`cannot read ${normalizePath(path.relative(root, filePath))}`);
    return {};
  }
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(entryPath);
    return entry.isFile() ? [entryPath] : [];
  });
}

function check(condition, message) {
  if (!condition) errors.push(message);
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.?\//, '');
}
