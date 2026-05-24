const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const inputPath = path.join(root, 'data', 'beer-data-source.json');
const outputDir = path.join(root, 'miniprogram', 'data');
const outputPath = path.join(outputDir, 'beer-data.js');
const aliasesOutputPath = path.join(outputDir, 'style-aliases.js');

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const miniProgramData = {
  ...data,
  styles: (data.styles || []).map(({ aliases, ...style }) => style),
};
const styleAliases = Object.fromEntries(
  (data.styles || [])
    .map((style) => [style.code || style.id, Array.isArray(style.aliases) ? style.aliases : []])
    .filter(([, aliases]) => aliases.length > 0),
);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  outputPath,
  `// Generated from data/beer-data-source.json. Run npm run build:mini-data after BJCP data changes.\nexport const beerData = ${JSON.stringify(miniProgramData, null, 2)};\n`,
  'utf8',
);
fs.writeFileSync(
  aliasesOutputPath,
  `// Generated from data/beer-data-source.json. Run npm run build:mini-data after alias changes.\nexport const styleAliases = ${JSON.stringify(styleAliases, null, 2)};\n`,
  'utf8',
);

console.log(`Wrote ${path.relative(root, outputPath)}`);
console.log(`Wrote ${path.relative(root, aliasesOutputPath)}`);
