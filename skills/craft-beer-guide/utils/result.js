function success(text, structuredContent, meta = {}) {
  return {
    isError: false,
    content: [{ type: 'text', text }],
    structuredContent,
    _meta: meta,
  };
}

function failure(text, failureCode) {
  const result = {
    isError: true,
    content: [{ type: 'text', text }],
  };
  if (failureCode) result._meta = { failureCode };
  return result;
}

module.exports = { failure, success };
