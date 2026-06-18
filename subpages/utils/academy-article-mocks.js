import { academySites } from '../../data/academy-sites.js';

const STRUCTURED_CONTENT_FORMAT = 'structured-v1';

const ARTICLE_MOCK_FACTORIES = [
  getColdIpaArticleMock,
  getFruitPureeArticleMock,
  getBeerFreshDraftRawArticleMock,
  getFlavorRadarBasicsArticleMock,
  getIpaFamilyMapArticleMock,
  getAleVsLagerArticleMock,
];

// Mock server layer: keep academy-sites/generated data as the only local article source.
// Future server payloads should keep schemaVersion/renderMode/contentPayload stable.
export function getAcademyArticlesMock() {
  return ARTICLE_MOCK_FACTORIES
    .map((buildArticleMock) => buildArticleMock())
    .filter(Boolean);
}

export function getAcademyArticleMock(slug) {
  const normalizedSlug = String(slug || '').trim();
  if (!normalizedSlug) return null;
  return getAcademyArticlesMock().find((article) => article.slug === normalizedSlug) || null;
}

export function getColdIpaArticleMock() {
  return buildStructuredArticleMock('cold-ipa');
}

export function getFruitPureeArticleMock() {
  return buildStructuredArticleMock('fruit-puree');
}

export function getBeerFreshDraftRawArticleMock() {
  return buildStructuredArticleMock('beer-fresh-draft-raw');
}

export function getFlavorRadarBasicsArticleMock() {
  return buildStructuredArticleMock('flavor-radar-basics');
}

export function getIpaFamilyMapArticleMock() {
  return buildStructuredArticleMock('ipa-family-map');
}

export function getAleVsLagerArticleMock() {
  return buildStructuredArticleMock('ale-vs-lager');
}

function buildStructuredArticleMock(slug) {
  const sourceArticle = academySites.find((article) => article.slug === slug);
  if (!sourceArticle) return null;

  const article = cloneJson(sourceArticle);
  return {
    ...article,
    schemaVersion: 1,
    renderMode: 'structured',
    contentFormat: STRUCTURED_CONTENT_FORMAT,
    contentPayload: {
      hero: cloneJson(article.hero || null),
      sections: cloneJson(article.sections || []),
      experienceAfterSectionId: article.experienceAfterSectionId || '',
      modules: cloneJson(article.modules || []),
    },
  };
}

function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}
