const fs = require('fs');
const path = require('path');
const styleAliases = require('./style_aliases.cjs');

const root = path.resolve(__dirname, '..');
const dataPaths = [
  path.join(root, 'public', 'data.json'),
  path.join(root, 'docs', 'data.json'),
];

function uniqueAliases(aliases) {
  return [...new Set((aliases || []).map((alias) => String(alias).trim()).filter(Boolean))];
}

function applyAliases(data) {
  return {
    ...data,
    styles: (data.styles || []).map((style) => {
      const code = style.code || style.id;
      return {
        ...style,
        aliases: uniqueAliases(styleAliases[code]),
      };
    }),
  };
}

dataPaths.forEach((dataPath) => {
  if (!fs.existsSync(dataPath)) return;
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  fs.writeFileSync(dataPath, `${JSON.stringify(applyAliases(data), null, 2)}\n`, 'utf8');
  console.log(`Updated ${path.relative(root, dataPath)}`);
});
