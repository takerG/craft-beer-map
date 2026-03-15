const fs = require('fs');
const path = require('path');

const root = process.cwd();
const parsed = require(path.join(root, 'artifacts', 'bjcp_2015_parsed.json'));
const current = require(path.join(root, 'public', 'data.json'));

const categories = current.categories;
const relations = current.relations;
const currentByCode = new Map(current.styles.map(style => [style.code || style.id, style]));

function normalizeStats(value) {
  if (!value) return '';

  const compact = String(value).replace(/\s+/g, ' ');
  const dash = '[\\-–—−~至]+';
  const patterns = [
    { label: 'OG', regex: new RegExp(`初始比重[^0-9]*([0-9.]+\\s*${dash}\\s*[0-9.]+)`) },
    { label: 'FG', regex: new RegExp(`(?:终止比重|最终比重)[^0-9]*([0-9.]+\\s*${dash}\\s*[0-9.]+)`) },
    { label: 'IBU', regex: new RegExp(`苦度[^0-9]*([0-9.]+\\s*${dash}\\s*[0-9.]+)`) },
    { label: 'SRM', regex: new RegExp(`色度[^0-9]*([0-9.]+\\s*${dash}\\s*[0-9.]+)`) },
    { label: 'ABV', regex: new RegExp(`酒精度[^0-9]*([0-9.]+\\s*${dash}\\s*[0-9.]+%?)`) },
  ];

  const parts = patterns
    .map(({ label, regex }) => {
      const match = compact.match(regex);
      if (!match) return null;
      const cleaned = match[1].replace(/\s+/g, '').replace(/[–—−~至]+/g, '-');
      return `${label}: ${cleaned}`;
    })
    .filter(Boolean);

  return parts.join(' | ');
}

function normalizeDetails(style) {
  const details = { ...(style.details || {}) };
  if (details.stats) {
    const normalized = normalizeStats(details.stats);
    if (normalized) details.stats = normalized;
  }
  return details;
}

const styles = parsed.styles.map(style => {
  const existing = currentByCode.get(style.code) || {};
  const code = style.category === '27' ? null : style.code;

  return {
    id: style.id,
    code,
    name_zh: style.name_zh,
    name_en: style.name_en,
    category: style.category,
    key: Boolean(existing.key),
    details: normalizeDetails(style),
  };
});

const output = { categories, styles, relations };
fs.writeFileSync(path.join(root, 'public', 'data.json'), JSON.stringify(output, null, 2));
console.log(`styles=${styles.length}`);
console.log('output=' + path.join(root, 'public', 'data.json'));
