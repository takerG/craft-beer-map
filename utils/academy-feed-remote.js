import { getAcademyFeedMock } from './academy-feed-mocks.js';

// Future server switch point for the academy tab feed.
export async function getAcademyFeedFromRemote() {
  return getAcademyFeedMock();
}
