export const DEFAULT_SHARE_TITLE = '你的精酿顾问';
export const SHARE_IMAGE_URL = '/assets/share/craft-beer-handbook.jpg';

export function buildShareMessage({ title, path }) {
  return {
    title: title || DEFAULT_SHARE_TITLE,
    path,
    imageUrl: SHARE_IMAGE_URL,
  };
}
