import { academyFeedSites } from '../data/academy-feed.js';

// Mock server response for the academy tab. Keep this payload summary-only.
export function getAcademyFeedMock() {
  return academyFeedSites.map((site) => cloneJson(site));
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}
