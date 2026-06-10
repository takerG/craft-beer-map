const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const artifactRoot = path.join(root, 'artifacts', 'ai-mode-project');
const miniProgramRoot = path.join(artifactRoot, 'miniprogram');
const skillRoot = path.join(miniProgramRoot, 'skills', 'craft-beer-guide');
const knowledgeRoot = path.join(root, 'artifacts', 'ai-knowledge-base');
const errors = [];

main();

function main() {
  const buildArgs = ['scripts/build_ai_mode_project.cjs'];
  if (process.argv.includes('--if-current')) {
    buildArgs.push('--if-current');
  }

  execFileSync(process.execPath, buildArgs, {
    cwd: root,
    stdio: 'inherit',
  });

  verifyProductionBoundary();
  verifyGeneratedApp();
  verifySkillProtocol();
  verifyComponents();
  verifyMetadataAndKnowledge();
  verifyFileSizes();

  if (errors.length) {
    console.error('AI mode verification failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log('AI mode project verified');
  console.log(`- ${path.relative(root, artifactRoot)}`);
  console.log(`- ${path.relative(root, knowledgeRoot)}`);
}

function verifyProductionBoundary() {
  const sourceRoot = path.join(root, 'miniprogram');
  const app = readJson(path.join(sourceRoot, 'app.json'));
  check(!Object.hasOwn(app, 'agent'), 'miniprogram/app.json', 'must not declare agent');

  listFiles(sourceRoot)
    .filter((filePath) => /\.(?:js|json|wxml)$/.test(filePath))
    .forEach((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8');
      check(
        !/wx\.(?:openAgent|onAgentOpen|offAgentOpen|navigateBackAgent)|<ai-entry\b|craft-beer-guide/.test(source),
        filePath,
        'contains AI-mode-only source',
      );
    });
}

function verifyGeneratedApp() {
  const appPath = path.join(miniProgramRoot, 'app.json');
  const app = readJson(appPath);
  const skill = app.agent && app.agent.skills && app.agent.skills[0];
  const skillPackage = (app.subpackages || []).find((item) => item.root === 'skills');
  const detailPackage = (app.subpackages || []).find((item) => item.root === 'aiDetail');

  check(skill && skill.path === 'skills/craft-beer-guide', appPath, 'missing craft beer Skill');
  check(app.agent && app.agent.pageMetadata === 'page-meta.json', appPath, 'missing page metadata');
  check(skillPackage && skillPackage.independent === true, appPath, 'Skill package must be independent');
  check(detailPackage && detailPackage.independent === true, appPath, 'detail package must be independent');
  check(
    app.usingComponents && app.usingComponents['ai-entry'] === '/components/ai-entry/index',
    appPath,
    'missing generated AI entry component',
  );
}

function verifySkillProtocol() {
  const mcpPath = path.join(skillRoot, 'mcp.json');
  const indexPath = path.join(skillRoot, 'index.js');
  const mcp = readJson(mcpPath);
  const indexSource = fs.readFileSync(indexPath, 'utf8');
  const registeredNames = [...indexSource.matchAll(/registerAPI\('([^']+)'/g)].map((match) => match[1]);
  const declaredNames = (mcp.apis || []).map((api) => api.name);

  check(
    JSON.stringify(registeredNames) === JSON.stringify(declaredNames),
    indexPath,
    'registered APIs do not match mcp.json order',
  );
  declaredNames.forEach((name) => {
    check(
      fs.existsSync(path.join(skillRoot, 'apis', `${name}.js`)),
      path.join(skillRoot, 'apis', `${name}.js`),
      'declared API implementation is missing',
    );
  });
  (mcp.components || []).forEach((component) => {
    check(!component.permissions, mcpPath, `${component.path} unexpectedly requests dynamic permissions`);
  });
}

function verifyComponents() {
  const mcp = readJson(path.join(skillRoot, 'mcp.json'));
  (mcp.components || []).forEach((component) => {
    ['js', 'json', 'wxml', 'wxss'].forEach((extension) => {
      const filePath = path.join(skillRoot, `${component.path}.${extension}`);
      check(fs.existsSync(filePath), filePath, 'declared component file is missing');
    });
  });
}

function verifyMetadataAndKnowledge() {
  const metadataPath = path.join(miniProgramRoot, 'page-meta.json');
  const metadata = readJson(metadataPath);
  check(Array.isArray(metadata.pages) && metadata.pages.length === 8, metadataPath, 'must declare 8 pages');
  check(fs.statSync(metadataPath).size < 8000, metadataPath, 'exceeds 8000-byte limit');

  const files = fs.readdirSync(knowledgeRoot)
    .filter((fileName) => fileName.endsWith('.md'));
  check(files.length === 3, knowledgeRoot, 'expected exactly 3 Markdown knowledge files');
  files.forEach((fileName) => {
    const filePath = path.join(knowledgeRoot, fileName);
    const source = fs.readFileSync(filePath, 'utf8');
    check(fs.statSync(filePath).size < 10 * 1024 * 1024, filePath, 'exceeds 10 MB limit');
    check(!source.includes('\uFFFD'), filePath, 'contains invalid UTF-8 replacement characters');
  });
}

function verifyFileSizes() {
  listFiles(miniProgramRoot).forEach((filePath) => {
    check(fs.statSync(filePath).size < 2 * 1024 * 1024, filePath, 'exceeds 2 MB single-file limit');
  });
}

function check(condition, filePath, message) {
  if (condition) return;
  errors.push(`${path.relative(root, filePath)}: ${message}`);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${path.relative(root, filePath)}: ${error.message}`);
    return {};
  }
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) {
    errors.push(`${path.relative(root, dir)}: directory is missing`);
    return [];
  }
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(filePath) : [filePath];
  });
}
