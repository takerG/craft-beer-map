const LEGACY_BJCP_KEY = 'craftBeerFavoriteStyleIds.v1';
const MAX_FAVORITES = 120;

function listFavoriteStyleRefs(storage = defaultStorage()) {
  const refs = readArray(storage, LEGACY_BJCP_KEY)
    .map((id) => normalizeStyleRef({
      kind: typeof id === 'string' && id.startsWith('ext-') ? 'extension' : 'bjcp',
      id,
    }))
    .filter(Boolean);

  return uniqueStyleRefs(refs).slice(0, MAX_FAVORITES);
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

function hasFavoriteStyleRef(styleRef, storage = defaultStorage()) {
  const normalized = normalizeStyleRef(styleRef);
  if (!normalized) return false;
  return listFavoriteStyleRefs(storage)
    .some((item) => styleRefKey(item) === styleRefKey(normalized));
}

function persistRefs(refs, storage) {
  writeValue(
    storage,
    LEGACY_BJCP_KEY,
    refs.map((item) => item.id),
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
  hasFavoriteStyleRef,
  listFavoriteStyleRefs,
  removeFavoriteStyleRef,
};
