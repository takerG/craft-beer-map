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
  const previous = readFavoriteState(storage);
  if (!normalized || !previous.ok) return mutationFailure(previous.refs);

  const refs = uniqueStyleRefs([
    normalized,
    ...previous.refs.filter((item) => styleRefKey(item) !== styleRefKey(normalized)),
  ]).slice(0, MAX_FAVORITES);
  return persistRefs(refs, previous.refs, normalized, true, storage);
}

function removeFavoriteStyleRef(styleRef, storage = defaultStorage()) {
  const normalized = normalizeStyleRef(styleRef);
  const previous = readFavoriteState(storage);
  if (!normalized || !previous.ok) return mutationFailure(previous.refs);

  const refs = previous.refs
    .filter((item) => styleRefKey(item) !== styleRefKey(normalized));
  return persistRefs(refs, previous.refs, normalized, false, storage);
}

function hasFavoriteStyleRef(styleRef, storage = defaultStorage()) {
  const normalized = normalizeStyleRef(styleRef);
  if (!normalized) return false;
  return listFavoriteStyleRefs(storage)
    .some((item) => styleRefKey(item) === styleRefKey(normalized));
}

function persistRefs(refs, previousRefs, targetRef, targetFavorite, storage) {
  const wasFavorite = previousRefs
    .some((item) => styleRefKey(item) === styleRefKey(targetRef));
  try {
    if (!storage || typeof storage.setStorageSync !== 'function') {
      return mutationFailure(previousRefs);
    }
    storage.setStorageSync(LEGACY_BJCP_KEY, refs.map((item) => item.id));
  } catch (error) {
    restoreRefs(previousRefs, storage);
    return mutationFailure(previousRefs);
  }

  const confirmed = readFavoriteState(storage);
  const confirmedFavorite = confirmed.refs
    .some((item) => styleRefKey(item) === styleRefKey(targetRef));
  if (
    !confirmed.ok
    || confirmedFavorite !== targetFavorite
    || !sameStyleRefs(confirmed.refs, refs)
  ) {
    restoreRefs(previousRefs, storage);
    return mutationFailure(previousRefs);
  }
  return { ok: true, refs: confirmed.refs, wasFavorite };
}

function readArray(storage, key) {
  return readArrayState(storage, key).value;
}

function readArrayState(storage, key) {
  try {
    const value = storage && typeof storage.getStorageSync === 'function'
      ? storage.getStorageSync(key)
      : [];
    return {
      ok: true,
      value: Array.isArray(value) ? value : [],
    };
  } catch (error) {
    return {
      ok: false,
      value: [],
    };
  }
}

function readFavoriteState(storage) {
  const stored = readArrayState(storage, LEGACY_BJCP_KEY);
  return {
    ok: stored.ok,
    refs: uniqueStyleRefs(stored.value
      .map((id) => normalizeStyleRef({
        kind: typeof id === 'string' && id.startsWith('ext-') ? 'extension' : 'bjcp',
        id,
      }))
      .filter(Boolean))
      .slice(0, MAX_FAVORITES),
  };
}

function restoreRefs(refs, storage) {
  try {
    if (storage && typeof storage.setStorageSync === 'function') {
      storage.setStorageSync(LEGACY_BJCP_KEY, refs.map((item) => item.id));
    }
  } catch (error) {
    // The API still reports failure and never claims the mutation succeeded.
  }
}

function mutationFailure(refs) {
  return {
    ok: false,
    refs: uniqueStyleRefs(refs || []).slice(0, MAX_FAVORITES),
    error: 'storage-failed',
  };
}

function sameStyleRefs(left, right) {
  return left.length === right.length
    && left.every((item, index) => styleRefKey(item) === styleRefKey(right[index]));
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
