import { getAcademyArticleMock, getAcademyArticlesMock } from './academy-article-mocks.js';

// Future server switch point: replace the mock provider here only.
// Unknown render modes must fail closed until a sanitized renderer is added.
export async function getAcademyArticlesFromRemote() {
  return getAcademyArticlesMock();
}

export async function getAcademyArticleFromRemote(slug) {
  return getAcademyArticleMock(slug);
}
