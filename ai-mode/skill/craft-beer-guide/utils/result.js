function success(text, structuredContent, meta = {}) {
  return {
    isError: false,
    content: [{ type: 'text', text }],
    structuredContent,
    _meta: meta,
  };
}

function failure(text) {
  return {
    isError: true,
    content: [{ type: 'text', text }],
  };
}

module.exports = { failure, success };
