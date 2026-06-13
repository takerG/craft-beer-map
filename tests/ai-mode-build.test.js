import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const miniProgramRoot = root;
const legacyArtifactRoot = path.join(root, 'artifacts', 'ai-mode-project');

test('AI mode is integrated into the real developer-tools project', () => {
  runBuild();

  const app = readJson(path.join(miniProgramRoot, 'app.json'));
  const projectConfig = readJson(path.join(miniProgramRoot, 'project.config.json'));
  const skillPackage = app.subPackages.find((item) => item.root === 'skills');

  assert.deepEqual(app.agent, {
    skills: [
      {
        name: 'craft-beer-guide',
        description: '精酿啤酒风格搜索、口味推荐、详情、收藏与学院文章',
        path: 'skills/craft-beer-guide',
      },
    ],
    instruction: 'AGENTS.md',
    pageMetadata: 'page-meta.json',
  });
  assert.deepEqual(skillPackage, {
    root: 'skills',
    pages: [],
    independent: true,
  });
  assert.equal(Object.hasOwn(projectConfig, 'miniprogramRoot'), false);
  assert.equal(projectConfig.projectname, 'craft-beer-map');
  assert.equal(fs.existsSync(path.join(miniProgramRoot, 'pages', 'explore', 'index.js')), true);
  assert.equal(fs.existsSync(path.join(legacyArtifactRoot, 'miniprogram')), false);
});

test('AI mode build generates only project data and knowledge artifacts', () => {
  runBuild();

  [
    'skills/craft-beer-guide/data/catalog.js',
    'skills/craft-beer-guide/utils/catalog-runtime.js',
    'aiDetail/data/catalog.js',
    'aiDetail/utils/catalog-runtime.js',
    'page-meta.json',
  ].forEach((relativePath) => {
    assert.equal(fs.existsSync(path.join(miniProgramRoot, relativePath)), true, relativePath);
  });
  assert.equal(
    fs.existsSync(path.join(root, 'artifacts', 'ai-knowledge-base', 'bjcp-style-guide.md')),
    true,
  );
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
  assert.match(output, /(?:^|\r?\n)- \.(?:\r?\n|$)/);
  assert.match(output, /artifacts[\\/]ai-knowledge-base/);
});

test('AI mode runbook documents build, upload, acceptance, and release isolation', () => {
  const runbook = fs.readFileSync(path.join(root, 'docs', 'wechat-ai-mode-runbook.md'), 'utf8');

  [
    'npm run build:ai-mode',
    'npm run check:ai-mode',
    'npm run build:profiles',
    'npm run check:profiles',
    '仓库根目录',
    '正式发布只能使用',
    'artifacts/production',
    'artifacts/ai-beta',
    '不得从根目录或 AI beta 画像上传',
    'validate.mjs .',
    'project.config.json',
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
    '官方 validator',
  ].forEach((phrase) => assert.equal(runbook.includes(phrase), true, phrase));
  assert.equal(runbook.includes('artifacts/ai-mode-project/project.config.json'), false);
  assert.equal(runbook.includes('唯一微信项目根目录是 `miniprogram/`'), false);
  assert.equal(runbook.includes('直接导入 `miniprogram/`'), false);
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
