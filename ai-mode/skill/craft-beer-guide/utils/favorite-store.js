const LEGACY_BJCP_KEY = 'craftBeerFavoriteStyleIds.v1';
const AI_STYLE_REFS_KEY = 'craftBeerAiFavoriteStyleRefs.v1';
const MAX_FAVORITES = 120;

function listFavoriteStyleRefs(storage = defaultStorage()) {
  const legacyRefs = readArray(storage, LEGACY_BJCP_KEY)
    .map((id) => normalizeStyleRef({ kind: 'bjcp', id }))
    .filter(Boolean);
  const aiRefs = readArray(storage, AI_STYLE_REFS_KEY)
    .map(normalizeStyleRef)
    .filter(Boolean);

  return uniqueStyleRefs([...aiRefs, ...legacyRefs]).slice(0, MAX_FAVORITES);
}

function addFavoriteStyleRef(styleRef, storage = defaultStorage()) {
  const normalized = normalizeStyleRef(styleRef);
  if (!normalized) return listFavoriteStyleRefs(storage);

  const refs = uniqueStyleRefs([
    normalized,
    ...listFavoriteStyleRefs(storage).filter((item) => styleRefKey(item) !== styleRefKey(normalized)),
  ]).slice(0, MAX_FAVORITES);
  persistRefs(refs, storage);
  return refs;
}

function removeFavoriteStyleRef(styleRef, storage = defaultStorage()) {
  const normalized = normalizeStyleRef(styleRef);
  if (!normalized) return listFavoriteStyleRefs(storage);

  const refs = listFavoriteStyleRefs(storage)
    .filter((item) => styleRefKey(item) !== styleRefKey(normalized));
  persistRefs(refs, storage);
  return refs;
}

function persistRefs(refs, storage) {
  writeValue(storage, AI_STYLE_REFS_KEY, refs);
  writeValue(
    storage,
    LEGACY_BJCP_KEY,
    refs.filter((item) => item.kind === 'bjcp').map((item) => item.id),
  );
}

function readArray(storage, key) {
  try {
    const value = storage && typeof storage.getStorageSync === 'function'
      ? storage.getStorageSync(key)
      : [];
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}

function writeValue(storage, key, value) {
  try {
    if (storage && typeof storage.setStorageSync === 'function') {
      storage.setStorageSync(key, value);
    }
  } catch (error) {
    return value;
  }
  return value;
}

function uniqueStyleRefs(refs) {
  const seen = new Set();
  return refs.filter((styleRef) => {
    const key = styleRefKey(styleRef);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeStyleRef(styleRef) {
  if (!styleRef || typeof styleRef.id !== 'string') return null;
  const id = styleRef.id.trim();
  if (!id) return null;
  return {
    kind: styleRef.kind === 'extension' ? 'extension' : 'bjcp',
    id,
  };
}

function styleRefKey(styleRef) {
  return `${styleRef.kind}:${styleRef.id}`;
}

function defaultStorage() {
  return typeof wx === 'undefined' ? null : wx;
}

module.exports = {
  addFavoriteStyleRef,
  listFavoriteStyleRefs,
  removeFavoriteStyleRef,
};
