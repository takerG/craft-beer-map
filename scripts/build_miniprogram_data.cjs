const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const inputPath = path.join(root, 'public', 'data.json');
const outputDir = path.join(root, 'miniprogram', 'data');
const outputPath = path.join(outputDir, 'beer-data.js');

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  outputPath,
  `// Generated from public/data.json. Run npm run build:mini-data after BJCP data changes.\nexport const beerData = ${JSON.stringify(data, null, 2)};\n`,
  'utf8',
);

console.log(`Wrote ${path.relative(root, outputPath)}`);
