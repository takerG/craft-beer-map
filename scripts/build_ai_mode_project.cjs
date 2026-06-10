const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourceMiniProgramRoot = path.join(root, 'miniprogram');
const outputRoot = path.join(root, 'artifacts', 'ai-mode-project');
const outputMiniProgramRoot = path.join(outputRoot, 'miniprogram');

function main() {
  resetOutput();
  copyProductionMiniProgram();
  writeAiAppConfig();
  writeProjectConfig();

  console.log(`Built ${path.relative(root, outputRoot)}`);
}

function resetOutput() {
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });
}

function copyProductionMiniProgram() {
  fs.cpSync(sourceMiniProgramRoot, outputMiniProgramRoot, { recursive: true });
}

function writeAiAppConfig() {
  const appPath = path.join(outputMiniProgramRoot, 'app.json');
  const app = readJson(appPath);
  const subpackages = (app.subpackages || []).filter((item) => item.root !== 'skills');

  app.agent = 'skills/craft-beer-guide';
  app.subpackages = [
    ...subpackages,
    {
      root: 'skills',
      pages: [],
      independent: true,
    },
  ];

  writeJson(appPath, app);
}

function writeProjectConfig() {
  const sourceConfig = readJson(path.join(root, 'project.config.json'));
  const projectConfig = {
    ...sourceConfig,
    projectname: 'craft-beer-map-ai-mode',
    miniprogramRoot: 'miniprogram/',
    libVersion: 'latest',
  };

  writeJson(path.join(outputRoot, 'project.config.json'), projectConfig);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

main();
