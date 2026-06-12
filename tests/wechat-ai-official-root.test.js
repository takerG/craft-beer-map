import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('the repository root is the discoverable WeChat AI project root', () => {
  const appPath = path.join(root, 'app.json');
  const projectPath = path.join(root, 'project.config.json');

  assert.equal(fs.existsSync(appPath), true, 'app.json should exist at the project root');
  assert.equal(
    fs.existsSync(projectPath),
    true,
    'project.config.json should be next to app.json',
  );

  const app = readJson(appPath);
  const project = readJson(projectPath);
  const skill = app.agent?.skills?.find((item) => item.name === 'craft-beer-guide');
  const packages = app.subPackages || app.subpackages || [];
  const skillPackage = packages.find((item) => item.root === 'skills');

  assert.equal(Object.hasOwn(project, 'miniprogramRoot'), false);
  assert.equal(skill?.path, 'skills/craft-beer-guide');
  assert.equal(skillPackage?.independent, true);
  assert.equal(app.agent?.instruction, 'AGENTS.md');
  assert.equal(app.agent?.pageMetadata, 'page-meta.json');
  assert.equal(
    project.packOptions?.include?.some((item) =>
      item.type === 'folder' && item.value === 'skills'),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(root, 'miniprogram', 'app.json')),
    false,
    'miniprogram is a documentation placeholder, not a nested project directory',
  );
});

test('all declared WeChat AI paths resolve inside the project root', () => {
  const app = readJson(path.join(root, 'app.json'));
  const skillPaths = (app.agent?.skills || []).map((item) => item.path);
  const declaredPaths = [
    ...skillPaths,
    app.agent?.instruction,
    app.agent?.pageMetadata,
  ];

  declaredPaths.forEach((relativePath) => {
    assert.equal(typeof relativePath, 'string');
    assert.equal(
      fs.existsSync(path.join(root, relativePath)),
      true,
      `${relativePath} should resolve from the repository root`,
    );
  });
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
