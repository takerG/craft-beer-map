const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const allowDirty = process.argv.includes('--allow-dirty');
const dirty = execFileSync('git', ['status', '--porcelain'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
if (dirty && !allowDirty) {
  throw new Error('Formal AI experiment build requires a clean worktree');
}

const experimentBuildId = new Date().toISOString().replace(/[:.]/g, '');
for (const variant of ['control', 'candidate']) {
  execFileSync(process.execPath, [
    'scripts/build_ai_mode_project.cjs',
    `--variant=${variant}`,
    '--telemetry-mode=off',
    `--experiment-build-id=${experimentBuildId}`,
    `--output-root=artifacts/ai-mode-experiment/${variant}`,
  ], { cwd: root, stdio: 'inherit' });
}

const control = readJson('artifacts/ai-mode-experiment/control/build-manifest.json');
const candidate = readJson('artifacts/ai-mode-experiment/candidate/build-manifest.json');
for (const key of ['experimentId', 'experimentBuildId', 'sourceCommit', 'sourceTreeFingerprint', 'catalogFingerprint']) {
  if (control[key] !== candidate[key]) throw new Error(`Experiment mismatch: ${key}`);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}
