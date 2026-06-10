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
