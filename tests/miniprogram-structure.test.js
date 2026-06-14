import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const miniprogramRoot = root;
const miniProgramRuntimeEntries = [
  'AGENTS.md',
  'app.js',
  'app.json',
  'app.wxss',
  'page-meta.json',
  'project.config.json',
  'project.private.config.json',
  'sitemap.json',
  'aiDetail',
  'assets',
  'components',
  'data',
  'pages',
  'skills',
  'subpages',
  'templates',
  'utils',
];
const appJson = JSON.parse(fs.readFileSync(path.join(miniprogramRoot, 'app.json'), 'utf8'));
const tabBarPagePaths = appJson.tabBar.list.map((item) => item.pagePath);
const subpackagePagePaths = (appJson.subPackages || []).flatMap((subpackage) =>
  subpackage.pages.map((pagePath) => `${subpackage.root}/${pagePath}`),
);
const allDeclaredPagePaths = [...appJson.pages, ...subpackagePagePaths];
const shareablePagePaths = [
  'pages/explore/index',
  'pages/search/index',
  'pages/choose/index',
  'pages/academy/index',
  'pages/favorites/index',
  'subpages/academy-article/index',
  'subpages/style-language/index',
  'subpages/group/index',
  'subpages/style/index',
  'subpages/extension-group/index',
  'subpages/extension-style/index',
];
const contextualSharePagePaths = [
  'subpages/academy-article/index',
  'subpages/group/index',
  'subpages/style/index',
  'subpages/extension-group/index',
  'subpages/extension-style/index',
];
const genericSharePagePaths = shareablePagePaths.filter((pagePath) => !contextualSharePagePaths.includes(pagePath));
let choosePageDefinition = null;
let explorePageDefinition = null;
let searchPageDefinition = null;

globalThis.Page = (definition) => {
  choosePageDefinition = definition;
};
await import('../pages/choose/index.js?miniprogram-structure-test');
globalThis.Page = (definition) => {
  explorePageDefinition = definition;
};
await import('../pages/explore/index.js?miniprogram-structure-test');
globalThis.Page = (definition) => {
  searchPageDefinition = definition;
};
await import('../pages/search/index.js?miniprogram-structure-test');
delete globalThis.Page;

test('every app.json page has the required mini program files', () => {
  allDeclaredPagePaths.forEach((pagePath) => {
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

test('main package keeps only first-run tab pages and search entrypoints', () => {
  assert.deepEqual(appJson.pages, tabBarPagePaths);
});

test('secondary content pages are isolated in a subpackage', () => {
  assert.deepEqual(appJson.subPackages, [
    {
      root: 'subpages',
      pages: [
        'academy-article/index',
        'style-language/index',
        'group/index',
        'style/index',
        'extension-group/index',
        'extension-style/index',
      ],
    },
    {
      root: 'skills',
      pages: [],
      independent: true,
    },
    {
      root: 'aiDetail',
      name: 'ai-detail',
      pages: [
        'pages/style-results/index',
        'pages/taste-refine/index',
      ],
      independent: true,
      componentFramework: 'glass-easel',
      renderer: 'skyline',
    },
  ]);
});

test('runtime config follows mini program package loading recommendations', () => {
  assert.equal(appJson.lazyCodeLoading, 'requiredComponents');
  assert.deepEqual(appJson.preloadRule, {
    'pages/academy/index': {
      network: 'all',
      packages: ['subpages'],
    },
    'pages/search/index': {
      network: 'wifi',
      packages: ['subpages'],
    },
  });
  assert.equal(
    Object.hasOwn(appJson.preloadRule, 'pages/explore/index'),
    false,
    'launch page should not eagerly preload subpages during startup',
  );
});

test('academy is exposed as a primary bottom tab', () => {
  assert.ok(appJson.pages.includes('pages/academy/index'));
  assert.ok(allDeclaredPagePaths.includes('subpages/academy-article/index'));
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
    'subpages/group/index.wxml',
    'subpages/style/index.wxml',
    'subpages/extension-group/index.wxml',
    'subpages/extension-style/index.wxml',
  ].forEach((relativePath) => {
    const source = readMiniPage(relativePath);
    assert.doesNotMatch(source, /bottom-tabbar/, `${relativePath} should not import or render a custom bottom tabbar`);
    assert.doesNotMatch(source, /page-with-bottom-tab/, `${relativePath} should use its normal page padding`);
  });

  const appWxss = readMiniPage('app.wxss');
  assert.doesNotMatch(appWxss, /\.bottom-tabbar/, 'global styles should not include custom tabbar chrome');
});

test('explore copy uses the renamed find label', () => {
  const groupWxml = readMiniPage('subpages/group/index.wxml');

  assert.equal(appJson.tabBar.list[0].text, '探寻');
  assert.equal(groupWxml.includes('回到探索'), false);
  assert.equal(groupWxml.includes('回到探寻'), true);
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
  assert.equal(exploreWxml.includes('精酿啤酒风格指南'), false);
});

test('explore search entry does not render escaped entity text', () => {
  const exploreWxml = readMiniPage('pages/explore/index.wxml');

  assert.doesNotMatch(exploreWxml, /&gt;/);
});

test('mini program copy avoids removed local map messaging', () => {
  const visibleCopy = [
    readMiniPage('pages/explore/index.wxml'),
    readMiniPage('subpages/group/index.wxml'),
    readMiniPage('subpages/style/index.wxml'),
  ].join('\n');

  assert.equal(visibleCopy.includes('灞€閮ㄥ湴鍥?'), false);
  assert.equal(visibleCopy.includes('椋庢牸鍦板浘'), false);
});

test('mini program styles avoid known unstable layout features', () => {
  const wxssFiles = listMiniProgramFiles('.wxss');

  wxssFiles.forEach((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    assert.equal(source.includes('calc('), false, `${filePath} should avoid calc() in wxss`);
    assert.equal(source.includes('display: grid'), false, `${filePath} should avoid grid layout in wxss`);
  });
});

test('mini program pages avoid canvas node bridge APIs that timed out in devtools', () => {
  const jsFiles = listMiniProgramFiles('.js');

  jsFiles.forEach((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    assert.equal(source.includes('fields({ node: true'), false, `${filePath} should not query canvas nodes`);
    assert.equal(source.includes('.ellipse('), false, `${filePath} should avoid Canvas ellipse API`);
  });
});

test('mini program pages expose clear exploration and fallback states', () => {
  const exploreWxml = readMiniPage('pages/explore/index.wxml');
  const searchWxml = readMiniPage('pages/search/index.wxml');
  const groupWxml = readMiniPage('subpages/group/index.wxml');
  const groupJs = readMiniPage('subpages/group/index.js');
  const styleWxml = readMiniPage('subpages/style/index.wxml');

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
    'subpages/academy-article/index.js',
    'pages/search/index.js',
    'subpages/group/index.js',
    'subpages/style/index.js',
    'subpages/extension-group/index.js',
    'subpages/extension-style/index.js',
  ].forEach((relativePath) => {
    const source = readMiniPage(relativePath);
    assert.match(source, /navigateOnce|switchTabOnce|redirectOnce/, `${relativePath} should guard duplicate taps`);
  });
});

test('heavy destination pages defer below-the-fold hydration', () => {
  [
    'subpages/group/index.js',
    'subpages/style/index.js',
    'subpages/extension-group/index.js',
    'subpages/extension-style/index.js',
  ].forEach((relativePath) => {
    const source = readMiniPage(relativePath);
    assert.match(source, /deferSetData/, `${relativePath} should defer large setData payloads`);
    assert.match(source, /contentReady/, `${relativePath} should expose a staged content state`);
  });
});

test('primary pages provide share message handlers', () => {
  shareablePagePaths.forEach((pagePath) => {
    const relativePath = `${pagePath}.js`;
    const source = readMiniPage(relativePath);
    assert.match(source, /onShareAppMessage\(\)/, `${relativePath} should define onShareAppMessage`);
  });
});

test('shareable pages enable and customize timeline sharing', () => {
  const shareUtil = readMiniPage('utils/share.js');
  assert.match(shareUtil, /export function enableShareMenu/);
  assert.match(shareUtil, /shareAppMessage/);
  assert.match(shareUtil, /shareTimeline/);
  assert.match(shareUtil, /export function buildTimelineShareMessage/);
  assert.match(shareUtil, /query/);

  shareablePagePaths.forEach((pagePath) => {
    const relativePath = `${pagePath}.js`;
    const source = readMiniPage(relativePath);
    assert.match(source, /enableShareMenu/, `${relativePath} should enable the timeline share menu`);
    assert.match(source, /onShareTimeline\(\)/, `${relativePath} should define onShareTimeline`);
    assert.match(source, /buildTimelineShareMessage/, `${relativePath} should use the shared timeline helper`);
  });
});

test('share messages use the generated handbook card and concise copy', () => {
  const shareImagePath = path.join(miniprogramRoot, 'assets', 'share', 'craft-beer-handbook.jpg');
  const shareImage = fs.readFileSync(shareImagePath);
  assert.equal(shareImage.subarray(0, 3).toString('hex'), 'ffd8ff', 'share card should be a jpg');
  assert.ok(shareImage.length < 240 * 1024, 'share card should stay lightweight for mini program sharing');

  const shareUtil = readMiniPage('utils/share.js');
  assert.match(shareUtil, /DEFAULT_SHARE_TITLE\s*=\s*'酒蒙子的第一课'/);
  assert.match(shareUtil, /SHARE_IMAGE_URL\s*=\s*'\/assets\/share\/craft-beer-handbook\.jpg'/);

  genericSharePagePaths.forEach((pagePath) => {
    const relativePath = `${pagePath}.js`;
    const source = readMiniPage(relativePath);
    assert.match(source, /buildShareMessage/, `${relativePath} should use shared share message helper`);
    assert.doesNotMatch(source, /title:\s*[^\n]*：/, `${relativePath} share titles should not use prefix-colon copy`);
    assert.doesNotMatch(source, /鍚繃|绮鹃吙|椋庢牸|鎵嬪唽/, `${relativePath} should not contain mojibake in share copy`);
    assert.equal(source.includes('把 BJCP 和市场叫法放进一套风味坐标'), false);
  });

  const exploreJs = readMiniPage('pages/explore/index.js');
  assert.equal(exploreJs.includes('酒蒙子的第一课'), true);
  assert.equal(exploreJs.includes('点酒前查一下：'), false);

  const chooseJs = readMiniPage('pages/choose/index.js');
  assert.equal(chooseJs.includes('今晚喝点啥'), true);

  const styleLanguageJs = readMiniPage('subpages/style-language/index.js');
  assert.equal(styleLanguageJs.includes('听过叫法不懂风格？这里能对上'), true);
});

test('detail share messages name the current content directly', () => {
  const groupJs = readMiniPage('subpages/group/index.js');
  assert.match(groupJs, /title:\s*group \? `风格指南：\$\{group\.name\}` : undefined/);
  assert.match(groupJs, /query:\s*`groupId=\$\{groupId\}`/);

  const styleJs = readMiniPage('subpages/style/index.js');
  assert.match(styleJs, /title:\s*style \? `风格指南：\$\{style\.displayName\}` : undefined/);
  assert.match(styleJs, /query:\s*`styleId=\$\{style \? style\.id : ''\}`/);

  const extensionGroupJs = readMiniPage('subpages/extension-group/index.js');
  assert.match(extensionGroupJs, /title:\s*group \? `风格指南：\$\{group\.name\}` : undefined/);
  assert.match(extensionGroupJs, /query:\s*`groupId=\$\{groupId\}`/);

  const extensionStyleJs = readMiniPage('subpages/extension-style/index.js');
  assert.match(extensionStyleJs, /title:\s*style \? `风格指南：\$\{style\.displayName\}` : undefined/);
  assert.match(extensionStyleJs, /query:\s*`styleId=\$\{style \? style\.id : ''\}`/);

  const academyArticleJs = readMiniPage('subpages/academy-article/index.js');
  assert.match(academyArticleJs, /title:\s*article \? `精酿知识：\$\{article\.title\}` : '精酿知识速查'/);
  assert.match(academyArticleJs, /query:\s*`slug=\$\{slug\}`/);
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
    ['subpages/academy-article/index.js', 'academy_article_share'],
    ['subpages/academy-article/index.js', 'academy_related_style_open'],
    ['pages/search/index.js', 'search_submit'],
    ['pages/search/index.js', 'search_result_open'],
    ['subpages/group/index.js', 'style_open'],
    ['subpages/style/index.js', 'style_share'],
    ['subpages/style/index.js', 'back_to_group'],
    ['subpages/extension-group/index.js', 'extension_style_open'],
    ['subpages/extension-style/index.js', 'extension_style_share'],
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
    'subpages/academy-article/index.wxml',
    'pages/search/index.wxml',
    'subpages/group/index.wxml',
    'subpages/style/index.wxml',
    'subpages/extension-group/index.wxml',
    'subpages/extension-style/index.wxml',
  ].forEach((relativePath) => {
    const source = readMiniPage(relativePath);
    assert.match(source, /hover-class="tap-hover"/, `${relativePath} should use shared tap hover feedback`);
    assert.match(source, /hover-stay-time="80"/, `${relativePath} should keep tap feedback snappy`);
  });
});

test('academy templates avoid complex expressions that can blank mini program compilation', () => {
  [
    'pages/academy/index.wxml',
    'subpages/academy-article/index.wxml',
  ].forEach((relativePath) => {
    const source = readMiniPage(relativePath);
    assert.doesNotMatch(source, /&&/, `${relativePath} should precompute compound booleans in JS`);
    assert.doesNotMatch(source, /\?\s*'[^']*'\s*:/, `${relativePath} should precompute class names in JS`);
    assert.doesNotMatch(source, /class="{{/, `${relativePath} should avoid dynamic class bindings`);
    assert.doesNotMatch(source, /wx:elif/, `${relativePath} should avoid wx:elif chains`);
    assert.doesNotMatch(source, /wx:elif="{{item\.type ===/, `${relativePath} should use precomputed module booleans`);
  });
});

test('academy articles render slug-specific experiences instead of generic modules', () => {
  const articleWxml = readMiniPage('subpages/academy-article/index.wxml');
  const articleJs = readMiniPage('subpages/academy-article/index.js');
  const articleWxss = readMiniPage('subpages/academy-article/index.wxss');

  assert.match(articleWxml, /class="article-body"/);
  assert.match(articleWxml, /wx:for="{{articleSections}}"/);
  assert.match(articleWxml, /wx:for-item="section"/);
  assert.match(articleWxml, /class="article-section"/);
  assert.match(articleWxml, /wx:for="{{section\.paragraphs}}"/);
  assert.match(articleWxml, /class="article-paragraph"/);
  assert.match(articleWxml, /class="article-callout"/);
  assert.match(articleWxml, /class="ipa-map-experience experience-section"/);
  assert.match(articleWxml, /class="ale-lager-experience experience-section"/);
  assert.match(articleWxml, /class="flavor-radar-experience experience-section"/);
  assert.match(articleWxml, /class="cold-ipa-hero"/);
  assert.match(articleWxml, /class="cold-ipa-comparison"/);
  assert.match(articleWxml, /bindtap="selectColdIpaComparison"/);
  assert.match(articleWxml, /class="cold-ipa-process"/);
  assert.match(articleWxml, /class="cold-ipa-checklist"/);
  assert.match(articleWxml, /wx:if="{{section\.showIpaMapExperience}}"/);
  assert.match(articleWxml, /wx:if="{{section\.showAleLagerExperience}}"/);
  assert.match(articleWxml, /wx:if="{{section\.showFlavorRadarExperience}}"/);
  assert.match(articleWxml, /wx:if="{{section\.showColdIpaComparison}}"/);
  assert.match(articleWxml, /wx:if="{{section\.showColdIpaProcess}}"/);
  assert.match(articleWxml, /wx:if="{{section\.showColdIpaChecklist}}"/);

  assert.doesNotMatch(articleWxml, /wx:for="{{article\.modules}}"/);
  assert.doesNotMatch(articleWxml, /module-tabs|module-list|module-card|scale-list|quiz-panel/);
  assert.doesNotMatch(articleWxml, /item\.isScale|item\.isCards|item\.isComparison|item\.isQuiz/);

  assert.match(articleJs, /selectIpaBranch\(event\)/);
  assert.match(articleJs, /selectFermentationPath\(event\)/);
  assert.match(articleJs, /selectFlavorSource\(event\)/);
  assert.match(articleJs, /selectColdIpaComparison\(event\)/);
  assert.match(articleJs, /articleSections/);
  assert.match(articleJs, /getFallbackSections/);
  assert.match(articleJs, /academy_ipa_branch_select/);
  assert.match(articleJs, /academy_fermentation_path_select/);
  assert.match(articleJs, /academy_flavor_source_select/);
  assert.match(articleJs, /academy_cold_ipa_comparison_select/);

  assert.match(articleWxss, /\.ipa-map-experience/);
  assert.match(articleWxss, /\.ale-lager-experience/);
  assert.match(articleWxss, /\.flavor-radar-experience/);
  assert.match(articleWxss, /\.cold-ipa-page/);
});

test('cold IPA article styling stays within the dark academy theme', () => {
  const articleWxss = readMiniPage('subpages/academy-article/index.wxss');

  assert.doesNotMatch(articleWxss, /background:\s*#f9fbfa/);
  assert.doesNotMatch(articleWxss, /background:\s*#eaf5f6/);
  assert.doesNotMatch(articleWxss, /font-family:\s*Georgia/);
  assert.match(articleWxss, /\.cold-ipa-hero[\s\S]*?#172231/);
  assert.match(articleWxss, /\.cold-ipa-page \.article-section[\s\S]*?rgba\(255,\s*255,\s*255,\s*0\.0/);
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

  assert.doesNotMatch(academyWxml, /class="feed-head"/);
  assert.match(academyWxml, /class="page-title">\{\{title\}\}/);
  assert.match(academyWxml, /class="page-subtitle">\{\{subtitle\}\}/);
  assert.doesNotMatch(academyWxml, /class="feed-count"/);
  assert.doesNotMatch(academyJs, /articleCountLabel/);
  assert.match(academyWxml, /<scroll-view[^>]*class="filter-strip"[^>]*scroll-x="true"/s);
  assert.doesNotMatch(academyWxml, /<scroll-view[^>]*class="filter-strip"[^>]*enable-flex/s);
  assert.match(academyWxml, /wx:for="{{typeFilters}}"/);
  assert.match(academyWxml, /bindtap="filterArticles"/);
  assert.match(academyWxml, /data-type="{{item\.type}}"/);
  assert.match(academyWxml, /class="feed-list"/);
  assert.match(academyWxml, /wx:for="{{feedSites}}"/);
  assert.doesNotMatch(academyWxml, /class="feed-cover"/);
  assert.doesNotMatch(academyWxml, /src="{{item\.coverImage}}"/);
  assert.doesNotMatch(academyWxml, /<image\b/);
  assert.match(academyWxml, /{{item\.publishedAt}}/);
  assert.match(academyJs, /allFeedSites/);
  assert.match(academyJs, /filterArticles\(event\)/);
  assert.match(academyJs, /academy_filter_change/);
  assert.match(academyWxss, /\.filter-strip\s*\{[^}]*height:\s*58rpx;[^}]*overflow:\s*hidden;[^}]*white-space:\s*nowrap;/s);
  assert.doesNotMatch(academyWxss, /\.filter-strip\s*\{[^}]*display:\s*flex;/s);
  assert.doesNotMatch(academyWxss, /\.feed-cover\s*\{/);
  assert.match(academyWxss, /\.feed-card\s*\{[^}]*width:\s*100%;/s);
  assert.doesNotMatch(academyWxss, /\.feed-card\s*\{[^}]*min-height:\s*\d+rpx;/s);
  assert.doesNotMatch(academyWxml, /featured-strip|track-tabs|track-panel|tool-list/);
});

test('academy feed titles clamp at two lines', () => {
  const academyWxss = readMiniPage('pages/academy/index.wxss');
  const feedTitleRule = academyWxss.match(/\.feed-title\s*\{(?<body>[\s\S]*?)\}/);

  assert.ok(feedTitleRule, 'academy feed title styles should exist');
  assert.match(feedTitleRule.groups.body, /display:\s*-webkit-box;/);
  assert.match(feedTitleRule.groups.body, /-webkit-box-orient:\s*vertical;/);
  assert.match(feedTitleRule.groups.body, /-webkit-line-clamp:\s*2;/);
  assert.doesNotMatch(feedTitleRule.groups.body, /white-space:\s*nowrap;/);
});

test('explore IPA featured entries follow the active style system', () => {
  const page = createExplorePage();

  page.onLoad();
  assert.ok(page.data.featured.length > 0);
  assert.equal(page.data.featured.every((style) => style.kind === 'bjcp'), true);
  page.data.featured.forEach(assertDirectIpaIdentity);
  assert.equal(page.data.featuredSystemLabel, 'BJCP 官方标准风格 · IPA');

  page.switchSection({
    currentTarget: {
      dataset: {
        sectionId: 'extension',
      },
    },
  });
  assert.ok(page.data.featured.length > 0);
  assert.equal(page.data.featured.every((style) => style.kind === 'extension'), true);
  page.data.featured.forEach(assertDirectIpaIdentity);
  assert.equal(page.data.featuredSystemLabel, 'BA/WBC/GABF 市场扩展风格 · IPA');
});

test('explore IPA featured search requests complete repository results before filtering', () => {
  const exploreJs = readMiniPage('pages/explore/index.js');

  assert.match(exploreJs, /searchStyles\('ipa',\s*Number\.MAX_SAFE_INTEGER\)/);
  assert.doesNotMatch(exploreJs, /FEATURED_SEARCH_LIMIT\s*=\s*100/);
});

test('explore quick entry renders its dynamic style system label', () => {
  const exploreWxml = readMiniPage('pages/explore/index.wxml');

  assert.match(exploreWxml, /\{\{featuredSystemLabel\}\}/);
  assert.doesNotMatch(exploreWxml, /<text>IPA<\/text>/);
});

test('academy article long-form text is selectable in devtools and devices', () => {
  const articleWxml = readMiniPage('subpages/academy-article/index.wxml');

  [
    'empty-copy',
    'page-subtitle',
    'article-paragraph',
    'focus-copy',
    'related-en',
  ].forEach((className) => {
    assert.match(
      articleWxml,
      new RegExp(`<text[^>]*class="${className}"[^>]*user-select="true"`),
      `${className} should allow copying long article text`,
    );
  });
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
    assert.equal(checklist.includes(keyword), true, `release checklist should cover ${keyword}`);
  });
});

test('private devtools config keeps API hook disabled to avoid service timeout noise', () => {
  const privateConfigPath = path.join(miniprogramRoot, 'project.private.config.json');
  const privateConfig = JSON.parse(fs.readFileSync(privateConfigPath, 'utf8'));

  assert.equal(privateConfig.setting.useApiHook, false);
});

test('extension learning pages are declared and linked from explore and search', () => {
  const exploreWxml = readMiniPage('pages/explore/index.wxml');
  const searchJs = readMiniPage('pages/search/index.js');
  const searchWxml = readMiniPage('pages/search/index.wxml');

  assert.ok(allDeclaredPagePaths.includes('subpages/extension-group/index'));
  assert.ok(allDeclaredPagePaths.includes('subpages/extension-style/index'));
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
  const styleLanguageJs = readMiniPage('subpages/style-language/index.js');
  const styleLanguageWxml = readMiniPage('subpages/style-language/index.wxml');
  const styleLanguageWxss = readMiniPage('subpages/style-language/index.wxss');

  assert.ok(allDeclaredPagePaths.includes('subpages/style-language/index'));
  assert.match(exploreJs, /openStyleLanguage/);
  assert.match(exploreWxml, /按常见叫法找风格/);
  assert.equal(searchJs.includes('果汁感'), true);
  assert.equal(searchJs.includes('小甜水'), true);
  assert.match(styleLanguageJs, /getStyleLanguageGroups/);
  assert.match(styleLanguageJs, /getStyleLanguageDetail/);
  assert.match(styleLanguageJs, /style_language_group_select/);
  assert.match(styleLanguageJs, /style_language_style_open/);
  assert.equal(styleLanguageWxml.includes('不知道 IPA、古斯、世涛是什么意思'), true);
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

test('choose taste matches label extension styles for users without EX shorthand', () => {
  const chooseJs = readMiniPage('pages/choose/index.js');
  const chooseWxml = readMiniPage('pages/choose/index.wxml');

  assert.match(chooseJs, /codeLabel/);
  assert.match(chooseJs, /扩展风格/);
  assert.doesNotMatch(chooseJs, /codeLabel:\s*result\.kind === 'extension' \? 'EX'/);
  assert.match(chooseWxml, /{{item\.codeLabel}}/);
});

test('choose star map uses Chinese flavor labels instead of style codes', () => {
  const chooseJs = readMiniPage('pages/choose/index.js');
  const chooseWxml = readMiniPage('pages/choose/index.wxml');
  const starMapTemplate = chooseWxml.match(/<view class="star-map">[\s\S]*?<\/view>\s*<\/view>\s*<\/swiper-item>/);

  assert.ok(starMapTemplate, 'star map template should exist');
  assert.match(chooseJs, /starLabel:\s*buildStarLabel\(result\)/);
  assert.match(starMapTemplate[0], /{{item\.starLabel}}/);
  assert.doesNotMatch(starMapTemplate[0], /{{item\.codeLabel}}/);
});

test('search clear button keeps its label centered', () => {
  const searchWxss = readMiniPage('pages/search/index.wxss');

  assert.match(searchWxss, /\.clear-btn\s*\{[^}]*display:\s*flex;/s);
  assert.match(searchWxss, /\.clear-btn\s*\{[^}]*align-items:\s*center;/s);
  assert.match(searchWxss, /\.clear-btn\s*\{[^}]*justify-content:\s*center;/s);
  assert.match(searchWxss, /\.clear-btn\s*\{[^}]*line-height:\s*56rpx;/s);
});

test('search feedback reports result count and clears it with the query', () => {
  const page = createSearchPage();

  page.onInput({ detail: { value: 'IPA' } });

  assert.equal(page.data.hasQuery, true);
  assert.equal(page.data.hasResults, true);
  assert.ok(page.data.results.length > 0);
  assert.equal(page.data.resultCountLabel, `${page.data.results.length} 个结果`);

  page.clearSearch();

  assert.equal(page.data.query, '');
  assert.deepEqual(page.data.results, []);
  assert.equal(page.data.hasQuery, false);
  assert.equal(page.data.hasResults, false);
  assert.equal(page.data.resultCountLabel, '');
});

test('search restart creates a false-to-true focus edge after the next render', () => {
  const nextTick = createNextTickController();
  const page = createSearchPage();

  try {
    page.data.inputFocused = true;
    page.onInput({ detail: { value: 'no-style-matches-this-query' } });
    page.restartSearch();

    assert.equal(page.data.query, '');
    assert.deepEqual(page.data.results, []);
    assert.equal(page.data.hasQuery, false);
    assert.equal(page.data.hasResults, false);
    assert.equal(page.data.resultCountLabel, '');
    assert.equal(page.data.inputFocused, false);
    assert.equal(nextTick.pendingCount(), 1);

    nextTick.flushNext();

    assert.equal(page.data.inputFocused, true);
    assert.deepEqual(
      page.setDataCalls.slice(-2).map((patch) => patch.inputFocused),
      [false, true],
    );
  } finally {
    nextTick.restore();
  }
});

test('search restart ignores blur while the focus request is pending', () => {
  const nextTick = createNextTickController();
  const page = createSearchPage();

  try {
    page.restartSearch();
    page.onInputBlur();

    assert.equal(page.data.inputFocused, false);
    nextTick.flushNext();
    assert.equal(page.data.inputFocused, true);
  } finally {
    nextTick.restore();
  }
});

test('search focus confirmation clears pending state before normal blur', () => {
  const nextTick = createNextTickController();
  const page = createSearchPage();

  try {
    page.restartSearch();
    nextTick.flushNext();

    page.onInputBlur();
    assert.equal(page.data.inputFocused, true);

    page.onInputFocus();
    page.onInputBlur();
    assert.equal(page.data.inputFocused, false);
  } finally {
    nextTick.restore();
  }
});

test('consecutive search restarts each create a new focus edge', () => {
  const nextTick = createNextTickController();
  const page = createSearchPage();

  try {
    page.restartSearch();
    assert.equal(page.data.inputFocused, false);
    nextTick.flushNext();
    assert.equal(page.data.inputFocused, true);

    page.restartSearch();
    assert.equal(page.data.inputFocused, false);
    nextTick.flushNext();
    assert.equal(page.data.inputFocused, true);

    assert.deepEqual(
      page.setDataCalls
        .filter((patch) => Object.hasOwn(patch, 'inputFocused'))
        .map((patch) => patch.inputFocused),
      [false, true, false, true],
    );
  } finally {
    nextTick.restore();
  }
});

test('search suggestions update the query, results, and result count together', () => {
  const page = createSearchPage();

  page.useSuggestion({
    currentTarget: {
      dataset: {
        query: 'IPA',
      },
    },
  });

  assert.equal(page.data.query, 'IPA');
  assert.equal(page.data.hasQuery, true);
  assert.equal(page.data.hasResults, true);
  assert.ok(page.data.results.length > 0);
  assert.equal(page.data.resultCountLabel, `${page.data.results.length} 个结果`);
});

test('search input focus handlers keep page focus state synchronized', () => {
  const page = createSearchPage();

  assert.equal(page.data.inputFocused, false);
  page.onInputFocus();
  assert.equal(page.data.inputFocused, true);
  page.onInputBlur();
  assert.equal(page.data.inputFocused, false);
});

test('search template binds focus, restart action, and result count feedback', () => {
  const searchWxml = readMiniPage('pages/search/index.wxml');
  const searchWxss = readMiniPage('pages/search/index.wxss');

  assert.match(searchWxml, /focus="{{inputFocused}}"/);
  assert.match(searchWxml, /bindfocus="onInputFocus"/);
  assert.match(searchWxml, /bindblur="onInputBlur"/);
  assert.match(searchWxml, /bindtap="restartSearch"/);
  assert.match(searchWxml, /wx:if="{{resultCountLabel}}" class="result-count"/);
  assert.match(searchWxml, /{{resultCountLabel}}/);
  assert.match(searchWxss, /\.result-count\s*\{/);
});

test('featured style card text truncates overflowing copy', () => {
  const exploreWxss = readMiniPage('pages/explore/index.wxss');

  ['style-name', 'style-en'].forEach((className) => {
    const rulePattern = new RegExp(`\\.${className}\\s*\\{[^}]*overflow:\\s*hidden;[^}]*text-overflow:\\s*ellipsis;[^}]*white-space:\\s*nowrap;`, 's');
    assert.match(exploreWxss, rulePattern, `${className} should truncate overflow text`);
  });
});

test('search and favorites copy explain both official and market extension coverage', () => {
  const searchWxml = readMiniPage('pages/search/index.wxml');
  const favoritesWxml = readMiniPage('pages/favorites/index.wxml');

  assert.match(searchWxml, /BJCP 官方标准风格/);
  assert.match(searchWxml, /BA\/WBC\/GABF 市场扩展风格/);
  assert.doesNotMatch(searchWxml, /当前只收录 BJCP/);
  assert.doesNotMatch(searchWxml, /暂时搜不到/);
  assert.match(favoritesWxml, /BJCP 官方标准风格/);
  assert.match(favoritesWxml, /BA\/WBC\/GABF 市场扩展风格/);
});

test('search results and style details expose community aliases', () => {
  const searchWxml = readMiniPage('pages/search/index.wxml');
  const searchWxss = readMiniPage('pages/search/index.wxss');
  const styleWxml = readMiniPage('subpages/style/index.wxml');
  const styleWxss = readMiniPage('subpages/style/index.wxss');

  assert.match(searchWxml, /class="result-alias-list"/);
  assert.match(searchWxml, /wx:for="{{item.aliases}}"/);
  assert.match(searchWxss, /\.result-alias-list/);
  assert.match(styleWxml, /class="alias-list"/);
  assert.match(styleWxml, /wx:for="{{detail.style.aliases}}"/);
  assert.match(styleWxss, /\.alias-list/);
});

test('style favorites are stored locally and surfaced from detail and bottom tab pages', () => {
  const favoriteUtil = readMiniPage('utils/style-favorites.js');
  const styleJs = readMiniPage('subpages/style/index.js');
  const styleWxml = readMiniPage('subpages/style/index.wxml');
  const styleWxss = readMiniPage('subpages/style/index.wxss');
  const favoritesJs = readMiniPage('pages/favorites/index.js');
  const favoritesWxml = readMiniPage('pages/favorites/index.wxml');
  const favoritesWxss = readMiniPage('pages/favorites/index.wxss');
  const exploreJs = readMiniPage('pages/explore/index.js');
  const exploreWxml = readMiniPage('pages/explore/index.wxml');

  assert.match(favoriteUtil, /FAVORITE_STYLE_STORAGE_KEY/);
  assert.match(favoriteUtil, /getStorageSync/);
  assert.match(favoriteUtil, /setStorageSync/);
  assert.match(favoriteUtil, /getFavoriteStyleStateResult/);
  assert.match(styleJs, /addFavoriteStyle/);
  assert.match(styleJs, /removeFavoriteStyle/);
  assert.doesNotMatch(styleJs, /toggleFavoriteStyle/);
  assert.match(styleJs, /getFavoriteStyleStateResult/);
  assert.doesNotMatch(styleJs, /isStyleFavorite/);
  assert.match(styleJs, /favoriteStatus/);
  assert.match(styleJs, /refreshFavoriteState/);
  assert.match(styleJs, /favorite_toggle/);
  assert.match(styleWxml, /class="favorite-action/);
  assert.match(styleWxml, /bindtap="toggleFavorite"/);
  assert.match(styleWxml, /wx:if="{{favoriteStatus === 'ready'}}"/);
  assert.match(styleWxml, /favorite-action-error/);
  assert.match(styleWxss, /\.favorite-action/);
  assert.match(styleWxss, /\.favorite-action-error/);

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

test('extension styles share the existing favorite storage and route by item kind', () => {
  const favoriteUtil = readMiniPage('utils/style-favorites.js');
  const favoritesJs = readMiniPage('pages/favorites/index.js');
  const favoritesWxml = readMiniPage('pages/favorites/index.wxml');
  const extensionJs = readMiniPage('subpages/extension-style/index.js');
  const extensionWxml = readMiniPage('subpages/extension-style/index.wxml');

  assert.match(favoriteUtil, /getExtensionStyleDetail/);
  assert.match(favoritesJs, /itemKind/);
  assert.match(favoritesJs, /extension-style/);
  assert.match(favoritesWxml, /data-item-kind="{{item\.kind}}"/);
  assert.match(extensionJs, /addFavoriteStyle/);
  assert.match(extensionJs, /removeFavoriteStyle/);
  assert.doesNotMatch(extensionJs, /toggleFavoriteStyle/);
  assert.match(extensionJs, /getFavoriteStyleStateResult/);
  assert.doesNotMatch(extensionJs, /isStyleFavorite/);
  assert.match(extensionJs, /favoriteStatus/);
  assert.match(extensionJs, /refreshFavoriteState/);
  assert.match(extensionWxml, /bindtap="toggleFavorite"/);
  assert.match(extensionWxml, /wx:if="{{favoriteStatus === 'ready'}}"/);
  assert.match(extensionWxml, /favorite-action-error/);
});

test('style detail favorite actions retry an explicit target state safely', () => {
  [
    'subpages/style/index.js',
    'subpages/extension-style/index.js',
  ].forEach((relativePath) => {
    const source = readMiniPage(relativePath);

    assert.match(source, /if \(this\.data\.favoriteStatus !== 'ready'\) \{\s*this\.refreshFavoriteState\(\);\s*return;/s);
    assert.match(source, /const targetFavorite = !this\.data\.isFavorite;/);
    assert.match(
      source,
      /targetFavorite\s*\?\s*addFavoriteStyle\(style\.id\)\s*:\s*removeFavoriteStyle\(style\.id\)/s,
    );
    assert.match(source, /targetFavorite,\s*\n\s*error: result\.error/);
    assert.match(source, /result\.error === 'storage-uncertain'/);
    assert.match(source, /favoriteStatus: 'error'/);
    assert.match(source, /favoriteActionLabel: '重试收藏状态'/);
    assert.match(source, /isFavorite: result\.isFavorite/);
    assert.doesNotMatch(source, /toggleFavoriteStyle/);
  });
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
  assert.equal(chooseWxml.includes('颜色=筛选维度'), true);
  assert.match(chooseWxml, /class="result-region"/);
  assert.match(chooseWxml, /bindchange="switchVisualView"/);
  assert.match(chooseWxml, /bindtap="openStyle"/);
  assert.doesNotMatch(chooseWxss, /\.wheel-chart\s*\{[^}]*conic-gradient/s);
  assert.match(chooseWxss, /\.visual-region/);
  assert.match(chooseWxss, /\.result-region/);
});

test('choose tab frames matches as a tonight decision workbench', () => {
  const chooseJs = readMiniPage('pages/choose/index.js');
  const chooseWxml = readMiniPage('pages/choose/index.wxml');
  const chooseWxss = readMiniPage('pages/choose/index.wxss');

  assert.match(chooseJs, /SCENE_PRESETS/);
  ['easy', 'meal', 'bold', 'new'].forEach((sceneId) => {
    assert.match(chooseJs, new RegExp(`id:\\s*'${sceneId}'`));
  });
  assert.match(chooseJs, /changeScene\(event\)/);
  assert.match(chooseJs, /choose_scene_select/);
  assert.match(chooseJs, /primaryPick/);
  assert.match(chooseJs, /alternativeResults/);
  assert.match(chooseJs, /toggleExplanation\(event\)/);
  assert.match(chooseJs, /choose_explanation_toggle/);

  assert.match(chooseWxml, /class="scene-grid"/);
  assert.match(chooseWxml, /bindtap="changeScene"/);
  assert.match(chooseWxml, /class="primary-pick-card"/);
  assert.match(chooseWxml, /{{primaryPick\.displayName}}/);
  assert.match(chooseWxml, /class="alternative-grid"/);
  assert.match(chooseWxml, /wx:for="{{alternativeResults}}"/);
  assert.match(chooseWxml, /class="why-recommendation"/);
  assert.match(chooseWxml, /bindtap="toggleExplanation"/);
  assert.match(chooseWxml, /wx:if="{{showExplanation}}"/);

  assert.match(chooseWxss, /\.scene-grid/);
  assert.match(chooseWxss, /\.primary-pick-card/);
  assert.match(chooseWxss, /\.alternative-grid/);
  assert.match(chooseWxss, /\.why-recommendation/);
});

test('choose tab uses qualitative match labels and hides explanations without results', () => {
  const chooseJs = readMiniPage('pages/choose/index.js');
  const chooseWxml = readMiniPage('pages/choose/index.wxml');

  assert.match(chooseJs, /function buildMatchLabel\(matchScore\)/);
  ['高度匹配', '较为匹配', '可以尝试'].forEach((label) => {
    assert.equal(chooseJs.includes(label), true, label);
  });
  assert.doesNotMatch(chooseWxml, /matchScore}}%/);
  assert.match(chooseWxml, /{{primaryPick\.matchLabel}}/);
  assert.match(chooseWxml, /{{item\.matchLabel}}/);
  assert.match(
    chooseWxml,
    /wx:if="{{hasResults}}" class="result-region"[\s\S]*class="why-recommendation"[\s\S]*wx:else class="choose-empty"/,
  );
});

test('choose tab expands all exact compound taste matches below related styles', () => {
  const chooseJs = readMiniPage('pages/choose/index.js');
  const chooseWxml = readMiniPage('pages/choose/index.wxml');
  const chooseWxss = readMiniPage('pages/choose/index.wxss');

  assert.match(chooseJs, /getExactTasteMatches/);
  assert.match(chooseJs, /exactMatchResults/);
  assert.match(chooseJs, /showExactMatches/);
  assert.match(chooseJs, /toggleExactMatches\(event\)/);
  assert.match(chooseJs, /choose_exact_matches_toggle/);

  assert.equal(chooseWxml.includes('其他相关风格'), true);
  assert.equal(chooseWxml.includes('换一种侧重点'), false);
  assert.match(chooseWxml, /bindtap="toggleExactMatches"/);
  assert.match(chooseWxml, /wx:if="{{showExactMatches}}"/);
  assert.match(chooseWxml, /wx:for="{{exactMatchResults}}"/);
  assert.match(chooseWxml, /data-style-id="{{item\.id}}"/);
  assert.match(chooseWxml, /data-item-kind="{{item\.kind}}"/);

  assert.match(chooseWxss, /\.exact-match-toggle/);
  assert.match(chooseWxss, /\.exact-match-list/);
  assert.match(chooseWxss, /\.exact-match-card/);
});

test('choose count reflects only the visible recommendations', () => {
  const page = createChoosePage();

  page.refreshTasteMatches(page.data.filterState, page.data.activeSceneId);

  const visibleResults = [page.data.primaryPick, ...page.data.alternativeResults].filter(Boolean);
  assert.equal(visibleResults.length, 3);
  assert.equal(page.data.alternativeResults.length, 2);
  assert.equal(page.data.resultCountLabel, `${visibleResults.length} 个推荐`);
});

test('choose exact compound matches exclude the visible recommendations', () => {
  const page = createChoosePage();

  page.refreshTasteMatches(page.data.filterState, page.data.activeSceneId);

  const visibleKeys = new Set(
    [page.data.primaryPick, ...page.data.alternativeResults]
      .filter(Boolean)
      .map(toChooseResultKey),
  );
  page.data.exactMatchResults.forEach((result) => {
    assert.equal(visibleKeys.has(toChooseResultKey(result)), false, `${toChooseResultKey(result)} should not repeat`);
  });
});

test('choose taste refinement marks the scene and preserves explanation and visual state', () => {
  const page = createChoosePage();
  page.refreshTasteMatches(page.data.filterState, page.data.activeSceneId);
  page.data.showExplanation = true;
  page.data.activeVisualIndex = 2;

  page.changeFilter({
    currentTarget: {
      dataset: {
        filterId: 'sweetness',
        filterValue: 1,
      },
    },
  });

  assert.equal(page.data.activeSceneLabel, '轻松畅饮 · 已微调');
  assert.equal(page.data.showExplanation, true);
  assert.equal(page.data.explanationToggleLabel, '收起推荐依据');
  assert.equal(page.data.activeVisualIndex, 2);
});

test('choose taste refinement clears the adjusted label after returning to the scene preset', () => {
  const page = createChoosePage();
  page.refreshTasteMatches(page.data.filterState, page.data.activeSceneId);

  page.changeFilter({
    currentTarget: {
      dataset: {
        filterId: 'sweetness',
        filterValue: 1,
      },
    },
  });
  page.changeFilter({
    currentTarget: {
      dataset: {
        filterId: 'sweetness',
        filterValue: -1,
      },
    },
  });

  assert.equal(page.data.activeSceneLabel, '轻松畅饮');
});

test('choose scene changes restore the preset and reset explanation and visual state', () => {
  const page = createChoosePage();
  page.refreshTasteMatches(page.data.filterState, page.data.activeSceneId);
  page.data.showExplanation = true;
  page.data.activeVisualIndex = 2;
  page.data.filterState = {
    ...page.data.filterState,
    sweetness: 1,
  };

  page.changeScene({
    currentTarget: {
      dataset: {
        sceneId: 'meal',
      },
    },
  });

  assert.equal(page.data.activeSceneLabel, '搭餐');
  assert.deepEqual(page.data.filterState, {
    sweetness: 0,
    sourness: -1,
    bitterness: 0,
    body: 0,
    strength: 0,
  });
  assert.equal(page.data.showExplanation, false);
  assert.equal(page.data.explanationToggleLabel, '展开推荐依据');
  assert.equal(page.data.activeVisualIndex, 0);
});

test('choose visuals omit fixed radar fill and star connector decorations', () => {
  const chooseWxml = readMiniPage('pages/choose/index.wxml');
  const chooseWxss = readMiniPage('pages/choose/index.wxss');

  assert.doesNotMatch(chooseWxml, /class="radar-fill"/);
  assert.doesNotMatch(chooseWxml, /class="star-line/);
  assert.doesNotMatch(chooseWxss, /\.radar-fill\s*\{/);
  assert.doesNotMatch(chooseWxss, /\.star-line(?:-[a-z]+)?\s*\{/);
  assert.match(chooseWxml, /wx:for="{{radarMetrics}}"/);
  assert.match(chooseWxml, /wx:for="{{starNodes}}"/);
});

test('choose primary, related, and exact match reasons allow at most two lines', () => {
  const chooseWxss = readMiniPage('pages/choose/index.wxss');

  ['primary-pick-reason', 'alternative-reason', 'exact-match-reason'].forEach((className) => {
    const rulePattern = new RegExp(
      `\\.${className}\\s*\\{[^}]*display:\\s*-webkit-box;[^}]*-webkit-box-orient:\\s*vertical;[^}]*-webkit-line-clamp:\\s*2;`,
      's',
    );
    assert.match(chooseWxss, rulePattern, `${className} should clamp at two lines`);
  });
});

test('choose exact match labels leave enough width for the extension identity', () => {
  const chooseWxss = readMiniPage('pages/choose/index.wxss');
  const codeRule = chooseWxss.match(/\.exact-match-code\s*\{([^}]*)\}/s);

  assert.ok(codeRule, 'exact match code styles should exist');
  assert.match(codeRule[1], /flex:\s*0 0 auto;/);
  assert.match(codeRule[1], /min-width:\s*68rpx;/);
  assert.doesNotMatch(codeRule[1], /text-overflow:\s*ellipsis;/);
});

test('choose tab default state knows the expanded taste dimensions', () => {
  const chooseJs = readMiniPage('pages/choose/index.js');

  ['roast', 'fruitiness', 'hopAroma', 'fermentation'].forEach((dimension) => {
    assert.doesNotMatch(chooseJs, new RegExp(`${dimension}:\\s*0`));
  });
});

test('local image and audio resources stay below the devtools package warning threshold', () => {
  const mediaExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp3', '.wav', '.aac', '.m4a']);
  const mediaFiles = listMiniProgramFiles().filter((filePath) =>
    mediaExtensions.has(path.extname(filePath).toLowerCase()),
  );

  assert.ok(mediaFiles.length > 0, 'mini program should have local media assets to audit');
  mediaFiles.forEach((filePath) => {
    const source = fs.readFileSync(filePath);
    assert.ok(source.length < 180 * 1024, `${filePath} should stay below 180KB with headroom under 200KB`);
  });
});

test('local image and audio resources stay below the devtools code package total threshold', () => {
  const mediaExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp3', '.wav', '.aac', '.m4a']);
  const mediaFiles = listMiniProgramFiles().filter((filePath) =>
    mediaExtensions.has(path.extname(filePath).toLowerCase()),
  );
  const totalBytes = mediaFiles.reduce((sum, filePath) => sum + fs.statSync(filePath).size, 0);

  assert.ok(mediaFiles.length > 0, 'mini program should have local media assets to audit');
  assert.ok(totalBytes < 180 * 1024, `local media should total below 180KB; got ${totalBytes} bytes`);
});

function listFiles(dir, extension = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(filePath, extension);
    return entry.isFile() && (!extension || filePath.endsWith(extension)) ? [filePath] : [];
  });
}

function listMiniProgramFiles(extension = '') {
  return miniProgramRuntimeEntries.flatMap((entry) => {
    const filePath = path.join(miniprogramRoot, entry);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) return listFiles(filePath, extension);
    return !extension || filePath.endsWith(extension) ? [filePath] : [];
  });
}

function readMiniPage(relativePath) {
  return fs.readFileSync(path.join(miniprogramRoot, relativePath), 'utf8');
}

function createChoosePage() {
  const page = {
    data: structuredClone(choosePageDefinition.data),
    setData(patch) {
      Object.assign(this.data, patch);
    },
  };

  Object.entries(choosePageDefinition).forEach(([key, value]) => {
    if (typeof value === 'function') {
      page[key] = value.bind(page);
    }
  });

  return page;
}

function createExplorePage() {
  const page = {
    data: structuredClone(explorePageDefinition.data),
    setData(patch) {
      Object.assign(this.data, patch);
    },
  };

  Object.entries(explorePageDefinition).forEach(([key, value]) => {
    if (typeof value === 'function') {
      page[key] = value.bind(page);
    }
  });

  return page;
}

function createSearchPage() {
  const page = {
    data: structuredClone(searchPageDefinition.data),
    setDataCalls: [],
    setData(patch, callback) {
      this.setDataCalls.push(structuredClone(patch));
      Object.assign(this.data, patch);
      if (typeof callback === 'function') {
        callback();
      }
    },
  };

  Object.entries(searchPageDefinition).forEach(([key, value]) => {
    if (typeof value === 'function') {
      page[key] = value.bind(page);
    }
  });

  return page;
}

function createNextTickController() {
  const callbacks = [];
  const previousWx = globalThis.wx;
  globalThis.wx = {
    ...(previousWx || {}),
    nextTick(callback) {
      callbacks.push(callback);
    },
  };

  return {
    pendingCount() {
      return callbacks.length;
    },
    flushNext() {
      assert.ok(callbacks.length > 0, 'a next render callback should be pending');
      callbacks.shift()();
    },
    restore() {
      if (previousWx === undefined) {
        delete globalThis.wx;
        return;
      }
      globalThis.wx = previousWx;
    },
  };
}

function assertDirectIpaIdentity(style) {
  const directIdentity = [
    style.displayName,
    style.name_en,
    ...(Array.isArray(style.aliases) ? style.aliases : []),
    style.code,
  ]
    .filter(Boolean)
    .join(' ');

  assert.match(directIdentity, /ipa/i, `${style.kind}:${style.id} should identify directly as IPA`);
}

function toChooseResultKey(result) {
  return `${result.kind}:${result.id}`;
}
