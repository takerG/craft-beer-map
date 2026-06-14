import { getExtensionStyleDetail, getStyleDetail } from './beer-model.js';

export const FAVORITE_STYLE_STORAGE_KEY = 'craftBeerFavoriteStyleIds.v1';
const MAX_FAVORITE_STYLES = 120;

export function getFavoriteStyleIds(storage = getDefaultStorage()) {
  return readFavoriteIds(storage).favoriteIds;
}

export function addFavoriteStyle(styleId, storage = getDefaultStorage()) {
  const normalizedId = normalizeStyleId(styleId);
  return mutateFavoriteStyle(normalizedId, true, storage);
}

export function removeFavoriteStyle(styleId, storage = getDefaultStorage()) {
  const normalizedId = normalizeStyleId(styleId);
  return mutateFavoriteStyle(normalizedId, false, storage);
}

export function toggleFavoriteStyle(styleId, storage = getDefaultStorage()) {
  const normalizedId = normalizeStyleId(styleId);
  const previous = readFavoriteIds(storage);
  if (!normalizedId || !previous.ok) {
    return buildMutationFailure(previous.favoriteIds, normalizedId);
  }
  const wasFavorite = previous.favoriteIds.includes(normalizedId);
  return commitFavoriteIds({
    targetIds: wasFavorite
      ? previous.favoriteIds.filter((id) => id !== normalizedId)
      : [normalizedId, ...previous.favoriteIds.filter((id) => id !== normalizedId)],
    previousIds: previous.favoriteIds,
    styleId: normalizedId,
    targetFavorite: !wasFavorite,
    storage,
  });
}

export function isStyleFavorite(styleId, storage = getDefaultStorage()) {
  const normalizedId = normalizeStyleId(styleId);
  if (!normalizedId) return false;
  return getFavoriteStyleIds(storage).includes(normalizedId);
}

export function getFavoriteStyleSummariesResult(storage = getDefaultStorage()) {
  const result = readFavoriteIds(storage);
  if (!result.ok) {
    return {
      ok: false,
      favoriteStyles: [],
      error: 'storage-failed',
    };
  }

  return {
    ok: true,
    favoriteStyles: resolveFavoriteStyleSummaries(result.favoriteIds),
  };
}

export function getFavoriteStyleSummaries(storage = getDefaultStorage()) {
  return getFavoriteStyleSummariesResult(storage).favoriteStyles;
}

function resolveFavoriteStyleSummaries(favoriteIds) {
  return favoriteIds
    .map((styleId) => (
      styleId.startsWith('ext-')
        ? getExtensionStyleDetail(styleId)
        : getStyleDetail(styleId)
    ))
    .filter(Boolean)
    .map((detail) => detail.style);
}

function readStoredValue(storage) {
  return storage && typeof storage.getStorageSync === 'function'
    ? storage.getStorageSync(FAVORITE_STYLE_STORAGE_KEY)
    : [];
}

function mutateFavoriteStyle(styleId, targetFavorite, storage) {
  const previous = readFavoriteIds(storage);
  if (!styleId || !previous.ok) {
    return buildMutationFailure(previous.favoriteIds, styleId);
  }
  const targetIds = targetFavorite
    ? [styleId, ...previous.favoriteIds.filter((id) => id !== styleId)]
    : previous.favoriteIds.filter((id) => id !== styleId);

  return commitFavoriteIds({
    targetIds,
    previousIds: previous.favoriteIds,
    styleId,
    targetFavorite,
    storage,
  });
}

function commitFavoriteIds({
  targetIds,
  previousIds,
  styleId,
  targetFavorite,
  storage,
}) {
  const normalizedTarget = normalizeFavoriteIds(targetIds).slice(0, MAX_FAVORITE_STYLES);
  try {
    if (!storage || typeof storage.setStorageSync !== 'function') {
      return buildMutationFailure(previousIds, styleId);
    }
    storage.setStorageSync(FAVORITE_STYLE_STORAGE_KEY, normalizedTarget);
  } catch (error) {
    restoreFavoriteIds(storage, previousIds);
    return buildMutationFailure(previousIds, styleId);
  }

  const confirmed = readFavoriteIds(storage);
  const confirmedFavorite = confirmed.favoriteIds.includes(styleId);
  if (
    !confirmed.ok
    || confirmedFavorite !== targetFavorite
    || !sameFavoriteIds(confirmed.favoriteIds, normalizedTarget)
  ) {
    restoreFavoriteIds(storage, previousIds);
    return buildMutationFailure(previousIds, styleId);
  }

  return {
    ok: true,
    favoriteIds: confirmed.favoriteIds,
    isFavorite: confirmedFavorite,
  };
}

function readFavoriteIds(storage) {
  if (!storage || typeof storage.getStorageSync !== 'function') {
    return {
      ok: false,
      favoriteIds: [],
    };
  }

  try {
    return {
      ok: true,
      favoriteIds: normalizeFavoriteIds(readStoredValue(storage)),
    };
  } catch (error) {
    return {
      ok: false,
      favoriteIds: [],
    };
  }
}

function restoreFavoriteIds(storage, favoriteIds) {
  try {
    if (storage && typeof storage.setStorageSync === 'function') {
      storage.setStorageSync(
        FAVORITE_STYLE_STORAGE_KEY,
        normalizeFavoriteIds(favoriteIds).slice(0, MAX_FAVORITE_STYLES),
      );
    }
  } catch (error) {
    // The caller still receives a failure and never claims the mutation succeeded.
  }
}

function buildMutationFailure(previousIds, styleId) {
  const favoriteIds = normalizeFavoriteIds(previousIds);
  return {
    ok: false,
    favoriteIds,
    isFavorite: favoriteIds.includes(styleId),
    error: 'storage-failed',
  };
}

function sameFavoriteIds(left, right) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function normalizeFavoriteIds(value) {
  const rawIds = Array.isArray(value) ? value : [];
  const seen = new Set();
  return rawIds
    .map(normalizeStyleId)
    .filter((styleId) => {
      if (!styleId || seen.has(styleId)) return false;
      seen.add(styleId);
      return true;
    })
    .slice(0, MAX_FAVORITE_STYLES);
}

function normalizeStyleId(styleId) {
  return typeof styleId === 'string' ? styleId.trim() : '';
}

function getDefaultStorage() {
  if (typeof wx !== 'undefined') return wx;
  return null;
}
