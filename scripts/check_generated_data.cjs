const fs = require('fs');
const os = require('node:os');
const path = require('path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, '\n');
}

function formatExport(comment, exportName, value) {
  return `${comment}\nexport const ${exportName} = ${JSON.stringify(value)};\n`;
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
      path: 'data/beer-data.js',
      expected: formatExport(
        '// Generated from data/beer-data-source.json. Run npm run build:mini-data after BJCP data changes.',
        'beerData',
        miniProgramData,
      ),
    },
    {
      path: 'data/style-aliases.js',
      expected: formatExport(
        '// Generated from data/beer-data-source.json. Run npm run build:mini-data after alias changes.',
        'styleAliases',
        styleAliases,
      ),
    },
    {
      path: 'data/styleLanguageMap.js',
      expected: formatExport(
        '// Generated from data/style-language-map.json. Run npm run build:mini-data after style language changes.',
        'styleLanguageMap',
        styleLanguageMap,
      ),
    },
    {
      path: 'data/academy-sites.js',
      expected: buildExpectedAcademyData(),
    },
    ...buildExpectedAiOutputs(),
  ];
}

function buildExpectedAcademyData() {
  const sourceRoot = path.join(root, 'academy-sites');
  const order = readJson('academy-sites/order.json');
  const sites = fs.readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const siteRoot = path.join(sourceRoot, entry.name);
      const meta = JSON.parse(fs.readFileSync(path.join(siteRoot, 'meta.json'), 'utf8'));
      const publish = JSON.parse(fs.readFileSync(path.join(siteRoot, 'publish.json'), 'utf8'));
      const content = JSON.parse(fs.readFileSync(path.join(siteRoot, 'content.json'), 'utf8'));
      return {
        ...meta,
        publishedAt: publish.publishedAt,
        updatedAt: publish.updatedAt || publish.publishedAt,
        hero: content.hero,
        sections: content.sections,
        experienceAfterSectionId: content.experienceAfterSectionId,
        modules: content.modules,
      };
    })
    .sort((a, b) =>
      String(b.publishedAt).localeCompare(String(a.publishedAt))
      || a.slug.localeCompare(b.slug));

  return `// Generated from academy-sites/. Run npm run build:academy after content changes.\nexport const academyOrder = ${JSON.stringify(order, null, 2)};\n\nexport const academySites = ${JSON.stringify(sites, null, 2)};\n`;
}

function buildExpectedAiOutputs() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-beer-ai-generated-'));
  const outputRoot = path.join(temporaryRoot, 'ai-beta');
  const generatedPaths = [
    'page-meta.json',
    'skills/craft-beer-guide/data/catalog.js',
    'skills/craft-beer-guide/utils/catalog-runtime.js',
    'aiDetail/data/catalog.js',
    'aiDetail/utils/catalog-runtime.js',
  ];

  try {
    execFileSync(process.execPath, [
      'scripts/build_ai_mode_project.cjs',
      `--output-root=${outputRoot}`,
    ], {
      cwd: root,
      stdio: 'pipe',
    });
    return generatedPaths
      .map((relativePath) => ({
        path: relativePath,
        expected: fs.readFileSync(path.join(outputRoot, relativePath), 'utf8'),
      }));
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

const drifted = buildExpectedOutputs()
  .map(({ path: outputPath, expected }) => {
    const actualPath = path.join(root, outputPath);
    return {
      path: outputPath,
      synced: fs.existsSync(actualPath)
        && normalizeLineEndings(readText(outputPath)) === normalizeLineEndings(expected),
    };
  })
  .filter((result) => !result.synced);

if (drifted.length) {
  console.error('Generated mini program data is out of date:');
  drifted.forEach((result) => console.error(`- ${result.path}`));
  console.error('Run npm run build:mini-data and commit the generated outputs.');
  process.exitCode = 1;
} else {
  console.log('Generated mini program data is in sync.');
}
