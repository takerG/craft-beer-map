const SAFE_FIELDS = ['event', 'apiName', 'failureCode'];

function createRedactedLogger(write = (entry) => console.error('[ai-mode]', entry)) {
  return {
    failure(apiName, failureCode) {
      write(project({
        event: 'api-failure',
        apiName,
        failureCode,
      }));
    },
  };
}

function project(entry) {
  return Object.fromEntries(
    SAFE_FIELDS.filter((key) => Object.hasOwn(entry, key)).map((key) => [key, entry[key]]),
  );
}

module.exports = { createRedactedLogger };
