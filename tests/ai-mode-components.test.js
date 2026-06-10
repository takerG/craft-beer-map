import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const skillRoot = path.join(
  root,
  'artifacts',
  'ai-mode-project',
  'miniprogram',
  'skills',
  'craft-beer-guide',
);
const componentNames = [
  'style-list-card',
  'style-detail-card',
  'favorite-status-card',
  'academy-article-list-card',
];

test.before(() => {
  execFileSync(process.execPath, ['scripts/build_ai_mode_project.cjs', '--if-current'], {
    cwd: root,
    stdio: 'pipe',
  });
});

test('manifest declares four components and an expirable favorite status card', () => {
  const mcp = readJson(path.join(skillRoot, 'mcp.json'));
  const componentByPath = new Map(mcp.components.map((item) => [item.path, item]));

  assert.deepEqual(
    mcp.components.map((item) => item.path),
    componentNames.map((name) => `components/${name}/index`),
  );
  assert.equal(
    componentByPath.get('components/favorite-status-card/index').expirable,
    true,
  );
  assert.equal(
    componentByPath.get('components/favorite-status-card/index').expiredText,
    '收藏状态已更新',
  );
});

test('atomic components consume modelContext results and keep interactions constrained', () => {
  componentNames.forEach((name) => {
    const componentRoot = path.join(skillRoot, 'components', name);
    const js = fs.readFileSync(path.join(componentRoot, 'index.js'), 'utf8');
    const json = readJson(path.join(componentRoot, 'index.json'));
    const wxml = fs.readFileSync(path.join(componentRoot, 'index.wxml'), 'utf8');
    const wxss = fs.readFileSync(path.join(componentRoot, 'index.wxss'), 'utf8');

    assert.equal(json.component, true, `${name} should be a component`);
    assert.match(js, /wx\.modelContext\.getContext\(this\)/, `${name} model context`);
    assert.match(js, /wx\.modelContext\.getViewContext\(this\)/, `${name} view context`);
    assert.match(js, /NotificationType\.Result/, `${name} result notification`);
    assert.match(wxss, /\bheight:\s*\d+rpx;/, `${name} fixed height`);
    assert.doesNotMatch(wxss, /overflow-y/, `${name} vertical scrolling`);
    assert.doesNotMatch(wxml, /bind(?!tap)[a-z]+=/i, `${name} only tap bindings`);
    assert.doesNotMatch(wxml, /<image\b/i, `${name} no first-phase images`);
    assert.doesNotMatch(
      js,
      /wx\.(?:navigateTo|redirectTo|switchTab|reLaunch|request)|setTimeout|setInterval/,
      `${name} forbidden runtime API`,
    );
  });
});

test('favorite status cards expire earlier mutation cards', () => {
  const source = fs.readFileSync(
    path.join(skillRoot, 'components', 'favorite-status-card', 'index.js'),
    'utf8',
  );

  assert.match(source, /expirePreviousCards/);
  assert.match(source, /NotificationType\.Expire/);
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
