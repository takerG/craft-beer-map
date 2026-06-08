const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function formatExport(comment, exportName, value) {
  return `${comment}\nexport const ${exportName} = ${JSON.stringify(value, null, 2)};\n`;
}

function buildExpectedOutputs() {
  const data = readJson('data/beer-data-source.json');
  const styleLanguageMap = readJson('data/style-language-map.json');
  const miniProgramData = {
    ...data,
    styles: (data.styles || []).map(({ aliases, ...style }) => style),
  };
  const styleAliases = Object.fromEntries(
    (data.styles || [])
      .map((style) => [style.code || style.id, Array.isArray(style.aliases) ? style.aliases : []])
      .filter(([, aliases]) => aliases.length > 0),
  );

  return [
    {
      path: 'miniprogram/data/beer-data.js',
      expected: formatExport(
        '// Generated from data/beer-data-source.json. Run npm run build:mini-data after BJCP data changes.',
        'beerData',
        miniProgramData,
      ),
    },
    {
      path: 'miniprogram/data/style-aliases.js',
      expected: formatExport(
        '// Generated from data/beer-data-source.json. Run npm run build:mini-data after alias changes.',
        'styleAliases',
        styleAliases,
      ),
    },
    {
      path: 'miniprogram/data/styleLanguageMap.js',
      expected: formatExport(
        '// Generated from data/style-language-map.json. Run npm run build:mini-data after style language changes.',
        'styleLanguageMap',
        styleLanguageMap,
      ),
    },
  ];
}

const drifted = buildExpectedOutputs()
  .map(({ path: outputPath, expected }) => ({
    path: outputPath,
    synced: readText(outputPath) === expected,
  }))
  .filter((result) => !result.synced);

if (drifted.length) {
  console.error('Generated mini program data is out of date:');
  drifted.forEach((result) => console.error(`- ${result.path}`));
  console.error('Run npm run build:mini-data and commit the generated outputs.');
  process.exitCode = 1;
} else {
  console.log('Generated mini program data is in sync.');
}
