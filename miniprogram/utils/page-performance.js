const NAVIGATION_LOCK_MS = 700;

export function navigateOnce(page, url) {
  callNavigation(page, 'navigateTo', url);
}

export function switchTabOnce(page, url) {
  callNavigation(page, 'switchTab', url);
}

export function redirectOnce(page, url) {
  callNavigation(page, 'redirectTo', url);
}

export function deferSetData(page, payload) {
  const applyPayload = () => page.setData(payload);

  if (typeof wx !== 'undefined' && typeof wx.nextTick === 'function') {
    wx.nextTick(applyPayload);
    return;
  }

  setTimeout(applyPayload, 0);
}

function callNavigation(page, method, url) {
  if (!url || !claimNavigation(page)) return;

  const wxApi = typeof wx !== 'undefined' ? wx : null;
  if (!wxApi || typeof wxApi[method] !== 'function') return;

  const releaseTimer = setTimeout(() => releaseNavigation(page), NAVIGATION_LOCK_MS);

  wxApi[method]({
    url,
    fail() {
      clearTimeout(releaseTimer);
      releaseNavigation(page);
    },
  });
}

function claimNavigation(page) {
  const now = Date.now();
  if (page.__navigationLockedUntil && page.__navigationLockedUntil > now) return false;
  page.__navigationLockedUntil = now + NAVIGATION_LOCK_MS;
  return true;
}

function releaseNavigation(page) {
  page.__navigationLockedUntil = 0;
}
