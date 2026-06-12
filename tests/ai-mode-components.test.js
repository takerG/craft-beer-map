import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const skillRoot = path.join(root, 'skills', 'craft-beer-guide');
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
    assert.match(js, /NotificationType\.Overflow/, `${name} overflow notification`);
    assert.match(js, /\[ai-mode\].*overflow monitor=on/, `${name} overflow monitor log`);
    const rootClass = wxml.match(/<view[^>]*class="([^"]+)"/)?.[1].split(/\s+/)[0];
    const rootRule = rootClass
      ? wxss.match(new RegExp(`\\.${rootClass}\\s*\\{([^}]*)\\}`, 's'))?.[1] || ''
      : '';
    assert.ok(rootClass, `${name} root class`);
    assert.doesNotMatch(
      rootRule,
      /(?:^|;)\s*(?:min-|max-)?height\s*:/,
      `${name} root height must be host-controlled`,
    );
    assert.doesNotMatch(wxss, /overflow-y/, `${name} vertical scrolling`);
    assert.doesNotMatch(wxml, /bind(?!tap)[a-z]+=/i, `${name} only tap bindings`);
    assert.doesNotMatch(wxml, /<image\b/i, `${name} no first-phase images`);
    [...wxml.matchAll(/<[^>]+\bbindtap="[^"]+"[^>]*>/g)].forEach((match) => {
      assert.match(match[0], /\bhover-class="[^"]+"/, `${name} tap target hover class`);
    });
    assert.doesNotMatch(
      js,
      /wx\.(?:navigateTo|redirectTo|switchTab|reLaunch|request)|setTimeout|setInterval/,
      `${name} forbidden runtime API`,
    );
  });
});

test('favorite status cards expire earlier cards without an unverified notification', () => {
  const source = fs.readFileSync(
    path.join(skillRoot, 'components', 'favorite-status-card', 'index.js'),
    'utf8',
  );

  assert.match(source, /expirePreviousCards/);
  assert.doesNotMatch(source, /NotificationType\.Expire/);
});

test('style detail card enters the matching style detail page instead of search', () => {
  const mcp = readJson(path.join(skillRoot, 'mcp.json'));
  const detailComponent = mcp.components.find(
    (item) => item.path === 'components/style-detail-card/index',
  );
  const detailComponentRoots = [
    path.join(
      root,
      'ai-mode',
      'skill',
      'craft-beer-guide',
      'components',
      'style-detail-card',
    ),
    path.join(skillRoot, 'components', 'style-detail-card'),
  ];
  const bjcpDetailSource = fs.readFileSync(
    path.join(root, 'subpages', 'style', 'index.js'),
    'utf8',
  );

  assert.equal(detailComponent?.relatedPage, '/subpages/style/index');
  detailComponentRoots.forEach((componentRoot) => {
    const componentSource = fs.readFileSync(path.join(componentRoot, 'index.js'), 'utf8');
    const componentTemplate = fs.readFileSync(path.join(componentRoot, 'index.wxml'), 'utf8');
    const componentStyles = fs.readFileSync(path.join(componentRoot, 'index.wxss'), 'utf8');

    assert.match(
      componentSource,
      /query:\s*`kind=\$\{style\.styleRef\.kind\}&styleId=\$\{encodeURIComponent\(style\.styleRef\.id\)\}`/,
    );
    assert.match(componentSource, /onTapDetail\(\)/);
    assert.match(componentSource, /styleRef\.kind === 'extension'/);
    assert.match(componentSource, /\/subpages\/extension-style\/index/);
    assert.match(componentSource, /\/subpages\/style\/index/);
    assert.match(
      componentSource,
      /openDetailPage\(\{\s*url:\s*`\$\{route\}\?styleId=\$\{encodeURIComponent\(styleRef\.id\)\}`/,
    );
    assert.match(componentTemplate, /bindtap="onTapDetail"/);
    assert.match(componentTemplate, />查看完整详情<\/view>/);
    assert.match(componentStyles, /\.tap-hover\s*\{/);
  });
  assert.match(
    bjcpDetailSource,
    /options\.kind === 'extension'[\s\S]*\/subpages\/extension-style\/index\?styleId=/,
  );
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
