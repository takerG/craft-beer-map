const sessions = new Map();

function setLatestRecommendation(flowId, revision, items) {
  sessions.set(flowId, {
    revision,
    styleKeys: new Set((items || []).map((item) => styleKey(item.styleRef))),
  });
}

function hasRecommendedStyle(flowId, revision, styleRef) {
  const session = sessions.get(flowId);
  return Boolean(
    session &&
    session.revision === revision &&
    session.styleKeys.has(styleKey(styleRef)),
  );
}

function styleKey(styleRef) {
  return `${styleRef && styleRef.kind === 'extension' ? 'extension' : 'bjcp'}:${styleRef && styleRef.id}`;
}

module.exports = { hasRecommendedStyle, setLatestRecommendation };
