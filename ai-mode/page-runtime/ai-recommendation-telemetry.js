const MAX_EVENTS = 50;
const MAX_BYTES = 32 * 1024;
const TTL_MS = 24 * 60 * 60 * 1000;
const ALLOWED_EVENTS = new Set(['ai_entry_opened', 'ai_related_page_opened']);

export function createAiRecommendationTelemetry({
  mode = 'off',
  wxApi = typeof wx === 'undefined' ? null : wx,
  storage = createWxStorage(wxApi),
  experimentId,
  variant,
  environment = 'experience-page',
  buildId,
  now = () => Date.now(),
} = {}) {
  const key = `aiRecommendationTelemetry.v2:${experimentId}:${variant}:${environment}:${buildId}`;
  if (mode === 'off') {
    return { track() {}, flush() {}, inspect() { return null; } };
  }

  let state = prunePendingQueue(readState(), now());
  persist();

  function readState() {
    let parsed = null;
    try {
      parsed = JSON.parse(storage.get(key) || 'null');
    } catch (error) {
      parsed = null;
    }
    if (
      !parsed ||
      parsed.experimentId !== experimentId ||
      parsed.variant !== variant ||
      parsed.environment !== environment ||
      parsed.buildId !== buildId
    ) {
      return { experimentId, variant, environment, buildId, events: [] };
    }
    return prunePendingQueue(parsed, now());
  }

  function persist() {
    state = prunePendingQueue(state, now());
    storage.set(key, JSON.stringify(state));
  }

  function track(eventName, { pageSource = 'unknown' } = {}) {
    if (!ALLOWED_EVENTS.has(eventName)) return;
    state.events.push({ eventName, pageSource, timestamp: now() });
    persist();
    flush();
  }

  function flush() {
    state = prunePendingQueue(state, now());
    while (state.events.length) {
      const event = state.events[0];
      try {
        report(wxApi, event);
        state.events.shift();
        persist();
      } catch (error) {
        persist();
        return;
      }
    }
  }

  return {
    track,
    flush,
    inspect() {
      return JSON.parse(JSON.stringify(state));
    },
  };
}

export function prunePendingQueue(state, now = Date.now()) {
  const next = {
    experimentId: state.experimentId,
    variant: state.variant,
    environment: state.environment,
    buildId: state.buildId,
    events: (state.events || [])
      .filter((event) => now - event.timestamp < TTL_MS)
      .slice(-MAX_EVENTS),
  };
  while (next.events.length && JSON.stringify(next).length > MAX_BYTES) next.events.shift();
  return next;
}

function report(wxApi, event) {
  const payload = { pageSource: event.pageSource, timestamp: event.timestamp };
  if (wxApi && typeof wxApi.reportEvent === 'function') {
    wxApi.reportEvent(event.eventName, payload);
    return;
  }
  if (wxApi && typeof wxApi.reportAnalytics === 'function') {
    wxApi.reportAnalytics(event.eventName, payload);
    return;
  }
  throw new Error('wechat-analytics-unavailable');
}

function createWxStorage(wxApi) {
  return {
    get(key) {
      return wxApi && typeof wxApi.getStorageSync === 'function' ? wxApi.getStorageSync(key) : '';
    },
    set(key, value) {
      if (wxApi && typeof wxApi.setStorageSync === 'function') wxApi.setStorageSync(key, value);
    },
  };
}
