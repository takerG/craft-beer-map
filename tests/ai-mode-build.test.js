import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const artifactRoot = path.join(root, 'artifacts', 'ai-mode-project');
const artifactMiniProgramRoot = path.join(artifactRoot, 'miniprogram');

test('production mini program contains no AI mode declarations', () => {
  const sourceApp = readJson(path.join(root, 'miniprogram', 'app.json'));
  const sourceFiles = listFiles(path.join(root, 'miniprogram'))
    .map((filePath) => path.relative(path.join(root, 'miniprogram'), filePath).replaceAll('\\', '/'));

  assert.equal(Object.hasOwn(sourceApp, 'agent'), false);
  assert.equal(sourceApp.subpackages.some((item) => item.root === 'skills'), false);
  assert.deepEqual(
    sourceFiles.filter((filePath) =>
      /(^|\/)(skills|ai-detail|ai-entry)(\/|$)/.test(filePath),
    ),
    [],
  );
});

test('AI mode build emits an isolated developer-tools project', () => {
  runBuild();

  const app = readJson(path.join(artifactMiniProgramRoot, 'app.json'));
  const projectConfig = readJson(path.join(artifactRoot, 'project.config.json'));
  const skillPackage = app.subpackages.find((item) => item.root === 'skills');

  assert.deepEqual(app.agent, {
    skills: [
      {
        name: 'craft-beer-guide',
        description: '精酿啤酒风格搜索、口味推荐、详情、收藏与学院文章',
        path: 'skills/craft-beer-guide',
      },
    ],
    pageMetadata: 'page-meta.json',
  });
  assert.deepEqual(skillPackage, {
    root: 'skills',
    pages: [],
    independent: true,
  });
  assert.equal(projectConfig.miniprogramRoot, 'miniprogram/');
  assert.equal(projectConfig.projectname, 'craft-beer-map-ai-mode');
  assert.equal(projectConfig.libVersion, 'latest');
  assert.equal(fs.existsSync(path.join(artifactMiniProgramRoot, 'pages', 'explore', 'index.js')), true);
});

test('generated AI mode projects stay outside source control', () => {
  const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');

  assert.equal(gitignore.includes('artifacts/'), true);
});

test('strict AI mode verifier validates the current build and reports artifact locations', () => {
  const packageJson = readJson(path.join(root, 'package.json'));
  const output = execFileSync(
    process.execPath,
    ['scripts/check_ai_mode_project.cjs', '--if-current'],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );

  assert.equal(
    packageJson.scripts['check:ai-mode'],
    'node scripts/check_ai_mode_project.cjs && node --test tests/ai-mode-*.test.js',
  );
  assert.match(output, /AI mode project verified/);
  assert.match(output, /artifacts[\\/]ai-mode-project/);
  assert.match(output, /artifacts[\\/]ai-knowledge-base/);
});

test('AI mode runbook documents build, upload, acceptance, and release isolation', () => {
  const runbook = fs.readFileSync(path.join(root, 'docs', 'wechat-ai-mode-runbook.md'), 'utf8');

  [
    'npm run build:ai-mode',
    'npm run check:ai-mode',
    'artifacts/ai-mode-project/project.config.json',
    'artifacts/ai-knowledge-base/',
    '想喝点清爽不苦的',
    '配烧烤喝什么',
    '找西海岸 IPA',
    '21A 是什么',
    '浑浊 IPA 有哪些叫法',
    '不存在的风格',
    '收藏这个',
    '再次收藏',
    '取消收藏',
    '看看我的收藏',
    '冷 IPA 和西海岸 IPA',
    '适合入门的文章',
    '不得作为正式版本提交',
  ].forEach((phrase) => assert.equal(runbook.includes(phrase), true, phrase));
});

function runBuild() {
  execFileSync(process.execPath, ['scripts/build_ai_mode_project.cjs', '--if-current'], {
    cwd: root,
    stdio: 'pipe',
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(filePath) : [filePath];
  });
}
