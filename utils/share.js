export const DEFAULT_SHARE_TITLE = '酒蒙子的第一课';
export const SHARE_IMAGE_URL = '/assets/share/craft-beer-handbook.jpg';

export function enableShareMenu() {
  if (typeof wx === 'undefined' || typeof wx.showShareMenu !== 'function') return;

  wx.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
  });
}

export function buildShareMessage({ title, path }) {
  return {
    title: title || DEFAULT_SHARE_TITLE,
    path,
    imageUrl: SHARE_IMAGE_URL,
  };
}

export function buildTimelineShareMessage({ title, query = '' }) {
  return {
    title: title || DEFAULT_SHARE_TITLE,
    query,
    imageUrl: SHARE_IMAGE_URL,
  };
}
