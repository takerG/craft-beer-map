import { getStyleDetail } from './beer-model.js';

export const FAVORITE_STYLE_STORAGE_KEY = 'craftBeerFavoriteStyleIds.v1';
const MAX_FAVORITE_STYLES = 120;

export function getFavoriteStyleIds(storage = getDefaultStorage()) {
  return normalizeFavoriteIds(readStoredValue(storage));
}

export function addFavoriteStyle(styleId, storage = getDefaultStorage()) {
  const normalizedId = normalizeStyleId(styleId);
  if (!normalizedId) return getFavoriteStyleIds(storage);

  const favoriteIds = getFavoriteStyleIds(storage).filter((id) => id !== normalizedId);
  favoriteIds.unshift(normalizedId);
  return persistFavoriteIds(favoriteIds, storage);
}

export function removeFavoriteStyle(styleId, storage = getDefaultStorage()) {
  const normalizedId = normalizeStyleId(styleId);
  const favoriteIds = getFavoriteStyleIds(storage).filter((id) => id !== normalizedId);
  return persistFavoriteIds(favoriteIds, storage);
}

export function toggleFavoriteStyle(styleId, storage = getDefaultStorage()) {
  const normalizedId = normalizeStyleId(styleId);
  const wasFavorite = normalizedId ? isStyleFavorite(normalizedId, storage) : false;
  const favoriteIds = wasFavorite ? removeFavoriteStyle(normalizedId, storage) : addFavoriteStyle(normalizedId, storage);

  return {
    favoriteIds,
    isFavorite: !wasFavorite && Boolean(normalizedId),
  };
}

export function isStyleFavorite(styleId, storage = getDefaultStorage()) {
  const normalizedId = normalizeStyleId(styleId);
  if (!normalizedId) return false;
  return getFavoriteStyleIds(storage).includes(normalizedId);
}

export function getFavoriteStyleSummaries(storage = getDefaultStorage()) {
  return getFavoriteStyleIds(storage)
    .map((styleId) => getStyleDetail(styleId))
    .filter(Boolean)
    .map((detail) => detail.style);
}

function readStoredValue(storage) {
  try {
    return storage && typeof storage.getStorageSync === 'function'
      ? storage.getStorageSync(FAVORITE_STYLE_STORAGE_KEY)
      : [];
  } catch (error) {
    return [];
  }
}

function persistFavoriteIds(favoriteIds, storage) {
  const normalized = normalizeFavoriteIds(favoriteIds).slice(0, MAX_FAVORITE_STYLES);
  try {
    if (storage && typeof storage.setStorageSync === 'function') {
      storage.setStorageSync(FAVORITE_STYLE_STORAGE_KEY, normalized);
    }
  } catch (error) {
    return normalized;
  }
  return normalized;
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
