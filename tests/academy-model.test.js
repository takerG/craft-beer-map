import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { buildAcademyTypeFilters, getAcademyHome, getAcademySites } from '../utils/academy-feed-model.js';
import {
  getAcademyArticlesMock,
  getAleVsLagerArticleMock,
  getBeerFreshDraftRawArticleMock,
  getColdIpaArticleMock,
  getFlavorRadarBasicsArticleMock,
  getFruitPureeArticleMock,
  getIpaFamilyMapArticleMock,
} from '../subpages/utils/academy-article-mocks.js';
import { getAcademyArticleFromRemote, getAcademyArticlesFromRemote } from '../subpages/utils/academy-article-remote.js';
import { getAcademyArticle, normalizeAcademyArticlePayload } from '../subpages/utils/academy-model.js';

const root = process.cwd();
const academyRoot = path.join(root, 'academy-sites');

test('academy content folders use followAI-style metadata and publish files', () => {
  const orderPath = path.join(academyRoot, 'order.json');
  assert.equal(fs.existsSync(orderPath), true, 'academy-sites/order.json should exist');

  ['ipa-family-map', 'ale-vs-lager', 'flavor-radar-basics', 'beer-fresh-draft-raw', 'cold-ipa', 'fruit-puree'].forEach((slug) => {
    const siteDir = path.join(academyRoot, slug);
    const metaPath = path.join(siteDir, 'meta.json');
    const contentPath = path.join(siteDir, 'content.json');
    const publishPath = path.join(siteDir, 'publish.json');

    assert.equal(fs.existsSync(metaPath), true, `${slug}/meta.json should exist`);
    assert.equal(fs.existsSync(contentPath), true, `${slug}/content.json should exist`);
    assert.equal(fs.existsSync(publishPath), true, `${slug}/publish.json should exist`);

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
    const publish = JSON.parse(fs.readFileSync(publishPath, 'utf8'));
    assert.equal(meta.slug, slug);
    assert.equal(typeof meta.title, 'string');
    assert.equal(typeof meta.description, 'string');
    assert.ok(['visual-story', 'comparison', 'simulator', 'map', 'quiz', 'tool'].includes(meta.type));
    assert.ok(Array.isArray(meta.tags));
    assert.ok(Array.isArray(meta.relatedStyles));
    assert.ok(Array.isArray(content.sections), `${slug}/content.json should include article sections`);
    assert.ok(content.sections.length >= 4, `${slug} should read like an article before its interaction`);
    assert.equal(typeof content.experienceAfterSectionId, 'string');
    content.sections.forEach((section) => {
      assert.equal(typeof section.id, 'string');
      assert.equal(typeof section.title, 'string');
      assert.ok(Array.isArray(section.paragraphs));
      assert.ok(section.paragraphs.length >= 1);
    });
    assert.match(publish.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
  });
});

test('academy article sections are substantial enough to read as articles', () => {
  const minimumArticleLengths = {
    'ipa-family-map': 2400,
    'ale-vs-lager': 1200,
    'flavor-radar-basics': 1200,
    'beer-fresh-draft-raw': 1800,
    'cold-ipa': 2200,
    'fruit-puree': 1800,
  };

  Object.entries(minimumArticleLengths).forEach(([slug, minimumLength]) => {
    const contentPath = path.join(academyRoot, slug, 'content.json');
    const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
    const body = content.sections
      .flatMap((section) => [section.title, ...section.paragraphs, section.callout || ''])
      .join('');

    assert.ok(body.length >= minimumLength, `${slug} article body should be at least ${minimumLength} Chinese chars`);
    assert.ok(content.sections.every((section) => section.paragraphs.join('').length >= 150));
  });
});

test('academy remote facade exposes mock server articles with a direct-render content payload', async () => {
  const articles = await getAcademyArticlesFromRemote();
  const mockArticleSlugs = getAcademyArticlesMock().map((article) => article.slug);

  assert.deepEqual(articles.map((article) => article.slug), mockArticleSlugs);
  articles.forEach((article) => {
    assert.equal(article.contentFormat, 'structured-v1');
    assert.equal(typeof article.contentPayload, 'object');
    assert.ok(Array.isArray(article.contentPayload.sections), `${article.slug} should expose mock server sections`);
    assert.ok(Array.isArray(article.contentPayload.modules), `${article.slug} should expose mock server modules`);
  });
});

test('academy mock server composes the article list from per-article mock functions', () => {
  const articleMocks = [
    getColdIpaArticleMock(),
    getFruitPureeArticleMock(),
    getBeerFreshDraftRawArticleMock(),
    getFlavorRadarBasicsArticleMock(),
    getIpaFamilyMapArticleMock(),
    getAleVsLagerArticleMock(),
  ];

  assert.deepEqual(
    getAcademyArticlesMock().map((article) => article.slug),
    articleMocks.map((article) => article.slug),
  );
});

test('academy remote article lookup returns isolated payload copies', async () => {
  const firstArticle = await getAcademyArticleFromRemote('cold-ipa');
  firstArticle.title = 'mutated title';

  const secondArticle = await getAcademyArticleFromRemote('cold-ipa');

  assert.equal(secondArticle.slug, 'cold-ipa');
  assert.notEqual(secondArticle.title, 'mutated title');
  assert.equal(await getAcademyArticleFromRemote('missing-site'), null);
});

test('academy home exposes a lightweight publish-time sorted feed', async () => {
  const home = await getAcademyHome();
  const sites = await getAcademySites();

  assert.equal(home.title, '学院');
  assert.equal(home.feedSites.length, sites.length);
  assert.deepEqual(
    home.feedSites.map((site) => site.slug),
    ['cold-ipa', 'fruit-puree', 'beer-fresh-draft-raw', 'flavor-radar-basics', 'ipa-family-map', 'ale-vs-lager'],
  );
  assert.deepEqual(
    home.feedSites.map((site) => site.publishedAt),
    ['2026-06-08', '2026-06-08', '2026-06-05', '2026-06-04', '2026-06-03', '2026-06-02'],
  );
  assert.equal(home.stats.siteCount, sites.length);
  assert.equal(home.feedSites.some((site) => Object.hasOwn(site, 'modules')), false);
  assert.equal(home.feedSites.some((site) => Object.hasOwn(site, 'coverImage')), false);
  assert.ok(Buffer.byteLength(JSON.stringify(home.feedSites)) < 13000);
});

test('academy feed sites omit thumbnail image payload', async () => {
  const home = await getAcademyHome();

  home.feedSites.forEach((site) => {
    assert.equal(Object.hasOwn(site, 'coverImage'), false, `${site.slug} feed summary should not include coverImage`);
  });
});

test('generated academy data omits local cover image payload', async () => {
  const { academySites } = await import('../data/academy-sites.js');
  const { academyFeedSites } = await import('../data/academy-feed.js');

  academySites.forEach((site) => {
    assert.equal(Object.hasOwn(site, 'coverImage'), false, `${site.slug} generated data should not reference local covers`);
  });
  academyFeedSites.forEach((site) => {
    assert.equal(Object.hasOwn(site, 'hero'), false, `${site.slug} feed data should not include hero`);
    assert.equal(Object.hasOwn(site, 'sections'), false, `${site.slug} feed data should not include sections`);
    assert.equal(Object.hasOwn(site, 'modules'), false, `${site.slug} feed data should not include modules`);
    assert.equal(Object.hasOwn(site, 'contentPayload'), false, `${site.slug} feed data should not include full content`);
  });
});

test('academy home exposes feed type filters with counts', async () => {
  const home = await getAcademyHome();

  assert.equal(home.subtitle, '喝个明白，吹个痛快');
  assert.deepEqual(
    home.filterOptions.map((option) => [option.type, option.label, option.count]),
    [
      ['all', '全部', 6],
      ['map', '地图', 1],
      ['comparison', '对比', 2],
      ['simulator', '互动', 1],
      ['tool', '工具', 2],
    ],
  );
  assert.equal(home.filterOptions[0].className, 'filter-chip is-active');
  assert.equal(home.filterOptions.slice(1).every((option) => option.className === 'filter-chip'), true);
});

test('academy feed type labels uniquely distinguish simulator from tool', () => {
  const filters = buildAcademyTypeFilters([
    { type: 'simulator' },
    { type: 'tool' },
    { type: 'map' },
  ]);
  const contentFilters = filters.filter((option) => option.type !== 'all');
  const labels = contentFilters.map((option) => option.label);

  assert.equal(contentFilters.find((option) => option.type === 'simulator').label, '互动');
  assert.equal(contentFilters.find((option) => option.type === 'tool').label, '工具');
  assert.equal(new Set(labels).size, labels.length);
});

test('academy feed filter strip keeps a fixed horizontal scroll height', () => {
  const wxss = fs.readFileSync(path.join(root, 'pages/academy/index.wxss'), 'utf8');
  const filterStripRule = wxss.match(/\.filter-strip\s*\{(?<body>[\s\S]*?)\}/);

  assert.ok(filterStripRule, 'academy filter strip styles should exist');
  assert.match(filterStripRule.groups.body, /height:\s*58rpx;/);
  assert.match(filterStripRule.groups.body, /white-space:\s*nowrap;/);
  assert.doesNotMatch(filterStripRule.groups.body, /display:\s*flex;/);
});

test('academy article resolves interactive modules and BJCP related styles', async () => {
  const article = await getAcademyArticle('ipa-family-map');

  assert.equal(article.slug, 'ipa-family-map');
  assert.equal(article.title, 'IPA 家族地图');
  assert.equal(article.type, 'map');
  assert.equal(article.experienceKey, 'ipa-map');
  assert.equal(article.isIpaMapExperience, true);
  assert.equal(article.isAleLagerExperience, false);
  assert.equal(article.isFlavorRadarExperience, false);
  assert.ok(article.sections.length >= 5);
  assert.ok(article.sections.some((section) => section.title.includes('什么是 IPA')));
  assert.ok(article.sections.some((section) => section.title.includes('为什么叫 India Pale Ale')));
  assert.ok(article.sections.some((section) => section.title.includes('衍生风格')));
  assert.equal(article.sections.filter((section) => section.showIpaMapExperience).length, 1);
  assert.ok(article.modules.some((module) => module.type === 'scale'));
  assert.ok(article.modules.some((module) => module.type === 'cards'));
  assert.ok(article.relatedStyles.some((style) => style.kind === 'bjcp' && style.code === '21A'));
  assert.ok(article.relatedStyles.some((style) => style.kind === 'extension' && style.id === 'ext-west-coast-ipa'));
});

test('academy article model routes each article to a distinct experience', async () => {
  const aleLager = await getAcademyArticle('ale-vs-lager');
  const flavorRadar = await getAcademyArticle('flavor-radar-basics');
  const beerTerms = await getAcademyArticle('beer-fresh-draft-raw');
  const coldIpa = await getAcademyArticle('cold-ipa');
  const fruitPuree = await getAcademyArticle('fruit-puree');

  assert.equal(aleLager.experienceKey, 'ale-lager');
  assert.equal(aleLager.isAleLagerExperience, true);
  assert.equal(aleLager.isIpaMapExperience, false);
  assert.equal(aleLager.isFlavorRadarExperience, false);

  assert.equal(flavorRadar.experienceKey, 'flavor-radar');
  assert.equal(flavorRadar.isFlavorRadarExperience, true);
  assert.equal(flavorRadar.isIpaMapExperience, false);
  assert.equal(flavorRadar.isAleLagerExperience, false);

  assert.equal(beerTerms.experienceKey, 'custom');
  assert.equal(beerTerms.hasGenericModules, true);
  assert.ok(beerTerms.genericModules.some((module) => module.isTermGrid));
  assert.ok(beerTerms.genericModules.some((module) => module.isChecklist));

  assert.equal(coldIpa.experienceKey, 'cold-ipa');
  assert.equal(coldIpa.isColdIpaExperience, true);
  assert.equal(coldIpa.pageThemeClass, 'cold-ipa-page');
  assert.equal(coldIpa.selectedComparisonId, 'cold-ipa');
  assert.ok(coldIpa.sections.some((section) => section.showColdIpaComparison));
  assert.ok(coldIpa.sections.some((section) => section.showColdIpaProcess));
  assert.ok(coldIpa.sections.some((section) => section.showColdIpaChecklist));
  assert.ok(coldIpa.relatedStyles.some((style) => style.kind === 'extension' && style.id === 'ext-india-pale-lager'));

  assert.equal(fruitPuree.experienceKey, 'custom');
  assert.equal(fruitPuree.hasGenericModules, true);
  assert.ok(fruitPuree.genericModules.some((module) => module.isTermGrid));
  assert.ok(fruitPuree.genericModules.some((module) => module.isScale));
  assert.ok(fruitPuree.genericModules.some((module) => module.isQuiz));
  assert.ok(fruitPuree.relatedStyles.some((style) => style.kind === 'bjcp' && style.code === '29A'));
  assert.ok(fruitPuree.relatedStyles.some((style) => style.kind === 'extension' && style.id === 'ext-fruited-sour-ale'));
});

test('academy article returns null for unknown slugs', async () => {
  assert.equal(await getAcademyArticle('missing-site'), null);
});

test('academy article model rejects unsupported remote content contracts', () => {
  const articleMock = getColdIpaArticleMock();

  assert.equal(normalizeAcademyArticlePayload({ ...articleMock, schemaVersion: 2 }), null);
  assert.equal(normalizeAcademyArticlePayload({ ...articleMock, renderMode: 'rich-html' }), null);
  assert.equal(normalizeAcademyArticlePayload({ ...articleMock, contentFormat: 'rich-html-v1' }), null);
  assert.equal(
    normalizeAcademyArticlePayload({
      ...articleMock,
      contentPayload: { ...articleMock.contentPayload, sections: null },
    }),
    null,
  );
});
