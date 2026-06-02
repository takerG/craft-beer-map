import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const miniprogramRoot = path.join(root, 'miniprogram');
const appJson = JSON.parse(fs.readFileSync(path.join(miniprogramRoot, 'app.json'), 'utf8'));

test('every app.json page has the required mini program files', () => {
  appJson.pages.forEach((pagePath) => {
    ['js', 'json', 'wxml', 'wxss'].forEach((extension) => {
      const filePath = path.join(miniprogramRoot, `${pagePath}.${extension}`);
      assert.equal(fs.existsSync(filePath), true, `${pagePath}.${extension} should exist`);
    });
  });
});

test('tab bar entries point to declared pages', () => {
  const pageSet = new Set(appJson.pages);

  appJson.tabBar.list.forEach((item) => {
    assert.equal(pageSet.has(item.pagePath), true, `${item.pagePath} should be declared in pages`);
  });
});

test('academy is exposed as a primary bottom tab', () => {
  assert.ok(appJson.pages.includes('pages/academy/index'));
  assert.ok(appJson.pages.includes('pages/academy-article/index'));
  assert.ok(
    appJson.tabBar.list.some((item) => item.pagePath === 'pages/academy/index' && item.text === '学院'),
    'academy tab should be visible as 学院',
  );
});

test('tab bar entries use local lightweight png icons for default and selected states', () => {
  appJson.tabBar.list.forEach((item) => {
    ['iconPath', 'selectedIconPath'].forEach((property) => {
      assert.equal(typeof item[property], 'string', `${item.pagePath} should define ${property}`);
      assert.match(item[property], /^assets\/tabbar\/.+\.png$/, `${property} should use a tabbar png asset`);

      const filePath = path.join(miniprogramRoot, item[property]);
      const source = fs.readFileSync(filePath);
      assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${item[property]} should be a png`);
      assert.ok(source.length < 40 * 1024, `${item[property]} should stay below 40KB`);
    });
  });
});

test('secondary and tertiary pages do not render a custom bottom tabbar', () => {
  [
    'pages/group/index.wxml',
    'pages/style/index.wxml',
    'pages/extension-group/index.wxml',
    'pages/extension-style/index.wxml',
  ].forEach((relativePath) => {
    const source = readMiniPage(relativePath);
    assert.doesNotMatch(source, /bottom-tabbar/, `${relativePath} should not import or render a custom bottom tabbar`);
    assert.doesNotMatch(source, /page-with-bottom-tab/, `${relativePath} should use its normal page padding`);
  });

  const appWxss = readMiniPage('app.wxss');
  assert.doesNotMatch(appWxss, /\.bottom-tabbar/, 'global styles should not include custom tabbar chrome');
});

test('explore copy uses the renamed find label', () => {
  const groupWxml = readMiniPage('pages/group/index.wxml');

  assert.equal(appJson.tabBar.list[0].text, '探寻');
  assert.doesNotMatch(groupWxml, /回到探索/);
  assert.match(groupWxml, /回到探寻/);
});

test('mini program navigation title stays fixed to the app name', () => {
  const expectedTitle = '精酿风格指南';

  assert.equal(appJson.window.navigationBarTitleText, expectedTitle);
  appJson.pages.forEach((pagePath) => {
    const pageJson = JSON.parse(readMiniPage(`${pagePath}.json`));
    assert.equal(pageJson.navigationBarTitleText, expectedTitle, `${pagePath} should use the app name`);
  });
});

test('explore hero title matches the app name', () => {
  const exploreWxml = readMiniPage('pages/explore/index.wxml');

  assert.match(exploreWxml, /<text class="page-title">精酿风格指南<\/text>/);
  assert.doesNotMatch(exploreWxml, /精酿啤酒风格指南/);
});

test('explore search entry does not render escaped entity text', () => {
  const exploreWxml = readMiniPage('pages/explore/index.wxml');

  assert.doesNotMatch(exploreWxml, /&gt;/);
});

test('mini program copy avoids removed local map messaging', () => {
  const visibleCopy = [
    readMiniPage('pages/explore/index.wxml'),
    readMiniPage('pages/group/index.wxml'),
    readMiniPage('pages/style/index.wxml'),
  ].join('\n');

  assert.doesNotMatch(visibleCopy, /局部地图/);
  assert.doesNotMatch(visibleCopy, /风格地图/);
});

test('mini program styles avoid known unstable layout features', () => {
  const wxssFiles = listFiles(miniprogramRoot, '.wxss');

  wxssFiles.forEach((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    assert.equal(source.includes('calc('), false, `${filePath} should avoid calc() in wxss`);
    assert.equal(source.includes('display: grid'), false, `${filePath} should avoid grid layout in wxss`);
  });
});

test('mini program pages avoid canvas node bridge APIs that timed out in devtools', () => {
  const jsFiles = listFiles(miniprogramRoot, '.js');

  jsFiles.forEach((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    assert.equal(source.includes('fields({ node: true'), false, `${filePath} should not query canvas nodes`);
    assert.equal(source.includes('.ellipse('), false, `${filePath} should avoid Canvas ellipse API`);
  });
});

test('mini program pages expose clear exploration and fallback states', () => {
  const exploreWxml = readMiniPage('pages/explore/index.wxml');
  const searchWxml = readMiniPage('pages/search/index.wxml');
  const groupWxml = readMiniPage('pages/group/index.wxml');
  const groupJs = readMiniPage('pages/group/index.js');
  const styleWxml = readMiniPage('pages/style/index.wxml');

  assert.match(exploreWxml, /class="group-card-meta"/);
  assert.match(searchWxml, /class="empty-state"/);
  assert.match(searchWxml, /class="suggestion-list"/);
  assert.doesNotMatch(groupWxml, /class="map-panel"/);
  assert.doesNotMatch(groupJs, /buildMiniMap|createCanvasContext|miniMap/);
  assert.match(groupWxml, /wx:if="{{loadStatus === 'loading'}}"/);
  assert.match(groupWxml, /wx:elif="{{loadStatus === 'error'}}"/);
  assert.match(styleWxml, /wx:if="{{loadStatus === 'loading'}}"/);
  assert.match(styleWxml, /wx:elif="{{loadStatus === 'not-found'}}"/);
  assert.match(styleWxml, /class="reading-section"/);
});

test('navigation handlers use shared guarded navigation helpers', () => {
  [
    'pages/explore/index.js',
    'pages/choose/index.js',
    'pages/academy/index.js',
    'pages/academy-article/index.js',
    'pages/search/index.js',
    'pages/group/index.js',
    'pages/style/index.js',
    'pages/extension-group/index.js',
    'pages/extension-style/index.js',
  ].forEach((relativePath) => {
    const source = readMiniPage(relativePath);
    assert.match(source, /navigateOnce|switchTabOnce|redirectOnce/, `${relativePath} should guard duplicate taps`);
  });
});

test('heavy destination pages defer below-the-fold hydration', () => {
  [
    'pages/group/index.js',
    'pages/style/index.js',
    'pages/extension-group/index.js',
    'pages/extension-style/index.js',
  ].forEach((relativePath) => {
    const source = readMiniPage(relativePath);
    assert.match(source, /deferSetData/, `${relativePath} should defer large setData payloads`);
    assert.match(source, /contentReady/, `${relativePath} should expose a staged content state`);
  });
});

test('primary pages provide share message handlers', () => {
  [
    'pages/explore/index.js',
    'pages/choose/index.js',
    'pages/academy/index.js',
    'pages/academy-article/index.js',
    'pages/group/index.js',
    'pages/style/index.js',
    'pages/extension-group/index.js',
    'pages/extension-style/index.js',
  ].forEach((relativePath) => {
    const source = readMiniPage(relativePath);
    assert.match(source, /onShareAppMessage\(\)/, `${relativePath} should define onShareAppMessage`);
  });
});

test('core user behaviors are instrumented for release analytics', () => {
  const telemetryPath = path.join(miniprogramRoot, 'utils', 'telemetry.js');
  assert.equal(fs.existsSync(telemetryPath), true, 'utils/telemetry.js should exist');

  const telemetrySource = fs.readFileSync(telemetryPath, 'utf8');
  assert.match(telemetrySource, /export function trackEvent/);
  assert.match(telemetrySource, /reportEvent|reportAnalytics/);

  const expectedEvents = [
    ['pages/explore/index.js', 'explore_search_open'],
    ['pages/explore/index.js', 'explore_section_switch'],
    ['pages/explore/index.js', 'style_open'],
    ['pages/choose/index.js', 'choose_filter_change'],
    ['pages/choose/index.js', 'choose_view_switch'],
    ['pages/choose/index.js', 'choose_style_open'],
    ['pages/academy/index.js', 'academy_article_open'],
    ['pages/academy-article/index.js', 'academy_article_share'],
    ['pages/academy-article/index.js', 'academy_related_style_open'],
    ['pages/search/index.js', 'search_submit'],
    ['pages/search/index.js', 'search_result_open'],
    ['pages/group/index.js', 'style_open'],
    ['pages/style/index.js', 'style_share'],
    ['pages/style/index.js', 'back_to_group'],
    ['pages/extension-group/index.js', 'extension_style_open'],
    ['pages/extension-style/index.js', 'extension_style_share'],
  ];

  expectedEvents.forEach(([relativePath, eventName]) => {
    const source = readMiniPage(relativePath);
    assert.match(source, /trackEvent/, `${relativePath} should import and call trackEvent`);
    assert.match(source, new RegExp(eventName), `${relativePath} should track ${eventName}`);
  });
});

test('tap targets expose consistent pressed feedback before release', () => {
  [
    'pages/choose/index.wxml',
    'pages/academy/index.wxml',
    'pages/academy-article/index.wxml',
    'pages/search/index.wxml',
    'pages/group/index.wxml',
    'pages/style/index.wxml',
    'pages/extension-group/index.wxml',
    'pages/extension-style/index.wxml',
  ].forEach((relativePath) => {
    const source = readMiniPage(relativePath);
    assert.match(source, /hover-class="tap-hover"/, `${relativePath} should use shared tap hover feedback`);
    assert.match(source, /hover-stay-time="80"/, `${relativePath} should keep tap feedback snappy`);
  });
});

test('academy templates avoid complex expressions that can blank mini program compilation', () => {
  [
    'pages/academy/index.wxml',
    'pages/academy-article/index.wxml',
  ].forEach((relativePath) => {
    const source = readMiniPage(relativePath);
    assert.doesNotMatch(source, /&&/, `${relativePath} should precompute compound booleans in JS`);
    assert.doesNotMatch(source, /\?\s*'[^']*'\s*:/, `${relativePath} should precompute class names in JS`);
    assert.doesNotMatch(source, /class="{{/, `${relativePath} should avoid dynamic class bindings`);
    assert.doesNotMatch(source, /wx:elif/, `${relativePath} should avoid wx:elif chains`);
    assert.doesNotMatch(source, /wx:elif="{{item\.type ===/, `${relativePath} should use precomputed module booleans`);
  });
});

test('core beer model avoids the stale style-language-map runtime module id', () => {
  const beerModelSource = readMiniPage('utils/beer-model.js');

  assert.match(beerModelSource, /data\/styleLanguageMap\.js/);
  assert.doesNotMatch(beerModelSource, /data\/style-language-map\.js/);
});

test('academy page renders a simple publish-sorted feed', () => {
  const academyWxml = readMiniPage('pages/academy/index.wxml');
  const academyWxss = readMiniPage('pages/academy/index.wxss');
  const academyJs = readMiniPage('pages/academy/index.js');

  assert.match(academyWxml, /class="filter-strip"/);
  assert.match(academyWxml, /wx:for="{{typeFilters}}"/);
  assert.match(academyWxml, /bindtap="filterArticles"/);
  assert.match(academyWxml, /data-type="{{item\.type}}"/);
  assert.match(academyWxml, /class="feed-list"/);
  assert.match(academyWxml, /wx:for="{{feedSites}}"/);
  assert.match(academyWxml, /class="feed-cover"/);
  assert.match(academyWxml, /src="{{item\.coverImage}}"/);
  assert.match(academyWxml, /{{item\.publishedAt}}/);
  assert.match(academyJs, /allFeedSites/);
  assert.match(academyJs, /filterArticles\(event\)/);
  assert.match(academyJs, /academy_filter_change/);
  assert.match(academyWxss, /\.filter-strip\s*\{[^}]*display:\s*flex;[^}]*overflow-x:\s*auto;/s);
  assert.match(academyWxss, /\.feed-cover\s*\{[^}]*width:\s*100%;[^}]*height:\s*252rpx;[^}]*border-radius:\s*14rpx;/s);
  assert.match(academyWxss, /\.feed-card\s*\{[^}]*width:\s*100%;[^}]*min-height:\s*484rpx;/s);
  assert.doesNotMatch(academyWxml, /featured-strip|track-tabs|track-panel|tool-list/);
});

test('release checklist covers the first shipping gate', () => {
  const checklistPath = path.join(root, 'docs', 'release-checklist.md');
  assert.equal(fs.existsSync(checklistPath), true, 'docs/release-checklist.md should exist');

  const checklist = fs.readFileSync(checklistPath, 'utf8');
  [
    '微信开发者工具',
    '真机 QA',
    'loading',
    '空状态',
    '错误状态',
    '埋点',
    '首屏',
    '60 秒',
  ].forEach((keyword) => {
    assert.match(checklist, new RegExp(keyword), `release checklist should cover ${keyword}`);
  });
});

test('private devtools config keeps API hook disabled to avoid service timeout noise', () => {
  const privateConfigPath = path.join(root, 'project.private.config.json');
  const privateConfig = JSON.parse(fs.readFileSync(privateConfigPath, 'utf8'));

  assert.equal(privateConfig.setting.useApiHook, false);
});

test('extension learning pages are declared and linked from explore and search', () => {
  const exploreWxml = readMiniPage('pages/explore/index.wxml');
  const searchJs = readMiniPage('pages/search/index.js');
  const searchWxml = readMiniPage('pages/search/index.wxml');

  assert.ok(appJson.pages.includes('pages/extension-group/index'));
  assert.ok(appJson.pages.includes('pages/extension-style/index'));
  assert.match(exploreWxml, /市场扩展风格/);
  assert.match(exploreWxml, /openExtensionGroup/);
  assert.match(searchJs, /itemKind/);
  assert.match(searchJs, /extension-style/);
  assert.match(searchWxml, /result-kind/);
  assert.match(searchWxml, /扩展风格/);
});

test('style language page is declared and linked from explore and search', () => {
  const exploreJs = readMiniPage('pages/explore/index.js');
  const exploreWxml = readMiniPage('pages/explore/index.wxml');
  const searchJs = readMiniPage('pages/search/index.js');
  const styleLanguageJs = readMiniPage('pages/style-language/index.js');
  const styleLanguageWxml = readMiniPage('pages/style-language/index.wxml');
  const styleLanguageWxss = readMiniPage('pages/style-language/index.wxss');

  assert.ok(appJson.pages.includes('pages/style-language/index'));
  assert.match(exploreJs, /openStyleLanguage/);
  assert.match(exploreWxml, /按常见叫法找风格/);
  assert.match(searchJs, /果汁感/);
  assert.match(searchJs, /小甜水/);
  assert.match(styleLanguageJs, /getStyleLanguageGroups/);
  assert.match(styleLanguageJs, /getStyleLanguageDetail/);
  assert.match(styleLanguageJs, /style_language_group_select/);
  assert.match(styleLanguageJs, /style_language_style_open/);
  assert.match(styleLanguageWxml, /不知道 IPA、古斯、世涛是什么意思/);
  assert.match(styleLanguageWxml, /class="language-card/);
  assert.match(styleLanguageWxml, /class="language-style-row"/);
  assert.match(styleLanguageWxss, /\.language-card/);
});

test('choose taste matches route extension styles to extension details', () => {
  const chooseJs = readMiniPage('pages/choose/index.js');
  const chooseWxml = readMiniPage('pages/choose/index.wxml');

  assert.match(chooseJs, /itemKind/);
  assert.match(chooseJs, /extension-style/);
  assert.match(chooseWxml, /data-item-kind="{{item.kind}}"/);
});

test('choose taste matches reserve a code label for extension styles', () => {
  const chooseJs = readMiniPage('pages/choose/index.js');
  const chooseWxml = readMiniPage('pages/choose/index.wxml');

  assert.match(chooseJs, /codeLabel/);
  assert.match(chooseJs, /EX/);
  assert.match(chooseWxml, /{{item\.codeLabel}}/);
});

test('search clear button keeps its label centered', () => {
  const searchWxss = readMiniPage('pages/search/index.wxss');

  assert.match(searchWxss, /\.clear-btn\s*\{[^}]*display:\s*flex;/s);
  assert.match(searchWxss, /\.clear-btn\s*\{[^}]*align-items:\s*center;/s);
  assert.match(searchWxss, /\.clear-btn\s*\{[^}]*justify-content:\s*center;/s);
  assert.match(searchWxss, /\.clear-btn\s*\{[^}]*line-height:\s*56rpx;/s);
});

test('featured style card text truncates overflowing copy', () => {
  const exploreWxss = readMiniPage('pages/explore/index.wxss');

  ['style-name', 'style-en'].forEach((className) => {
    const rulePattern = new RegExp(`\\.${className}\\s*\\{[^}]*overflow:\\s*hidden;[^}]*text-overflow:\\s*ellipsis;[^}]*white-space:\\s*nowrap;`, 's');
    assert.match(exploreWxss, rulePattern, `${className} should truncate overflow text`);
  });
});

test('search empty result explains BJCP official coverage', () => {
  const searchWxml = readMiniPage('pages/search/index.wxml');

  assert.match(searchWxml, /BJCP 官方标准风格/);
  assert.match(searchWxml, /水果酸艾尔/);
  assert.match(searchWxml, /冷 IPA/);
});

test('search results and style details expose community aliases', () => {
  const searchWxml = readMiniPage('pages/search/index.wxml');
  const searchWxss = readMiniPage('pages/search/index.wxss');
  const styleWxml = readMiniPage('pages/style/index.wxml');
  const styleWxss = readMiniPage('pages/style/index.wxss');

  assert.match(searchWxml, /class="result-alias-list"/);
  assert.match(searchWxml, /wx:for="{{item.aliases}}"/);
  assert.match(searchWxss, /\.result-alias-list/);
  assert.match(styleWxml, /class="alias-list"/);
  assert.match(styleWxml, /wx:for="{{detail.style.aliases}}"/);
  assert.match(styleWxss, /\.alias-list/);
});

test('style favorites are stored locally and surfaced from detail and bottom tab pages', () => {
  const favoriteUtil = readMiniPage('utils/style-favorites.js');
  const styleJs = readMiniPage('pages/style/index.js');
  const styleWxml = readMiniPage('pages/style/index.wxml');
  const styleWxss = readMiniPage('pages/style/index.wxss');
  const favoritesJs = readMiniPage('pages/favorites/index.js');
  const favoritesWxml = readMiniPage('pages/favorites/index.wxml');
  const favoritesWxss = readMiniPage('pages/favorites/index.wxss');
  const exploreJs = readMiniPage('pages/explore/index.js');
  const exploreWxml = readMiniPage('pages/explore/index.wxml');

  assert.match(favoriteUtil, /FAVORITE_STYLE_STORAGE_KEY/);
  assert.match(favoriteUtil, /getStorageSync/);
  assert.match(favoriteUtil, /setStorageSync/);
  assert.match(styleJs, /toggleFavoriteStyle/);
  assert.match(styleJs, /isStyleFavorite/);
  assert.match(styleJs, /favorite_toggle/);
  assert.match(styleWxml, /class="favorite-action/);
  assert.match(styleWxml, /bindtap="toggleFavorite"/);
  assert.match(styleWxss, /\.favorite-action/);

  assert.ok(appJson.pages.includes('pages/favorites/index'));
  assert.ok(appJson.tabBar.list.some((item) => item.pagePath === 'pages/favorites/index' && item.text === '收藏'));
  assert.match(favoritesJs, /getFavoriteStyleSummaries/);
  assert.match(favoritesJs, /onShow\(\)/);
  assert.match(favoritesJs, /switchTabOnce/);
  assert.match(favoritesWxml, /class="favorite-list"/);
  assert.match(favoritesWxml, /class="empty-state"/);
  assert.match(favoritesWxss, /\.favorite-list/);

  assert.doesNotMatch(exploreJs, /getFavoriteStyleSummaries/);
  assert.doesNotMatch(exploreWxml, /favorite-panel|favorite-strip|favorite-empty|我的收藏/);
});

test('choose tab provides taste filters, switchable visuals, and fixed results', () => {
  const chooseJs = readMiniPage('pages/choose/index.js');
  const chooseWxml = readMiniPage('pages/choose/index.wxml');
  const chooseWxss = readMiniPage('pages/choose/index.wxss');

  assert.ok(appJson.pages.includes('pages/choose/index'));
  assert.ok(appJson.tabBar.list.some((item) => item.pagePath === 'pages/choose/index' && item.text === '择饮'));
  assert.match(chooseJs, /getTasteFilters/);
  assert.match(chooseJs, /getTasteMatches/);
  assert.match(chooseWxml, /class="visual-region"/);
  assert.match(chooseWxml, /class="visual-swiper"/);
  assert.match(chooseWxml, /style="{{wheelChartStyle}}"/);
  assert.match(chooseWxml, /class="wheel-legend"/);
  assert.match(chooseWxml, /颜色=筛选维度/);
  assert.match(chooseWxml, /class="result-region"/);
  assert.match(chooseWxml, /bindchange="switchVisualView"/);
  assert.match(chooseWxml, /bindtap="openStyle"/);
  assert.doesNotMatch(chooseWxss, /\.wheel-chart\s*\{[^}]*conic-gradient/s);
  assert.match(chooseWxss, /\.visual-region/);
  assert.match(chooseWxss, /\.result-region/);
});

test('choose tab default state knows the expanded taste dimensions', () => {
  const chooseJs = readMiniPage('pages/choose/index.js');

  ['hopAroma', 'fermentation', 'strength'].forEach((dimension) => {
    assert.match(chooseJs, new RegExp(`${dimension}:\\s*0`));
  });
});

function listFiles(dir, extension) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(filePath, extension);
    return entry.isFile() && filePath.endsWith(extension) ? [filePath] : [];
  });
}

function readMiniPage(relativePath) {
  return fs.readFileSync(path.join(miniprogramRoot, relativePath), 'utf8');
}
