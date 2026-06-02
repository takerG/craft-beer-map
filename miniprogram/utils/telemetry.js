const EVENT_CACHE_LIMIT = 80;

export function trackEvent(eventName, params = {}) {
  if (!eventName) return;

  const payload = normalizeParams(params);
  const wxApi = typeof wx !== 'undefined' ? wx : null;
  const canReportToWechat = shouldReportToWechat(wxApi);

  try {
    if (canReportToWechat && typeof wxApi.reportEvent === 'function') {
      wxApi.reportEvent(eventName, payload);
    } else if (canReportToWechat && typeof wxApi.reportAnalytics === 'function') {
      wxApi.reportAnalytics(eventName, payload);
    }
  } catch (error) {
    cacheEvent('telemetry_report_failed', { eventName, message: error.message });
  }

  cacheEvent(eventName, payload);
}

function normalizeParams(params) {
  return Object.keys(params).reduce((payload, key) => {
    const value = params[key];
    if (value === undefined || value === null) return payload;
    payload[key] = typeof value === 'object' ? JSON.stringify(value) : value;
    return payload;
  }, {});
}

function shouldReportToWechat(wxApi) {
  if (!wxApi || typeof wxApi.getAccountInfoSync !== 'function') return false;

  try {
    const accountInfo = wxApi.getAccountInfoSync();
    return accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.envVersion === 'release';
  } catch (error) {
    return false;
  }
}

function cacheEvent(eventName, payload) {
  let app = null;
  try {
    app = typeof getApp === 'function' ? getApp({ allowDefault: true }) : null;
  } catch (error) {
    return;
  }
  if (!app) return;

  app.globalData = app.globalData || {};
  app.globalData.analyticsQueue = app.globalData.analyticsQueue || [];
  app.globalData.analyticsQueue.push({
    eventName,
    payload,
    timestamp: Date.now(),
  });

  if (app.globalData.analyticsQueue.length > EVENT_CACHE_LIMIT) {
    app.globalData.analyticsQueue.shift();
  }
}
