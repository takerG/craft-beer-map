# WeChat AI Mode Official Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repository root (`craft-beer-map/`) the single official WeChat project root and integrate the existing AI Mode Skill, cards, half-screen pages, page metadata, and entry points directly into the existing mini program.

**Architecture:** The mini program becomes directly AI-capable instead of being copied into a second generated project. Build scripts only generate deterministic Skill/detail-page data and knowledge-base files; official validation and DevTools both target the repository root. Existing Control/Candidate experiment sources remain available and are adapted without discarding uncommitted work.

**Tech Stack:** WeChat Mini Program, CommonJS Skill runtime, glass-easel atomic components, Node.js test runner, official `wechat-miniprogram/ai-mode-skills` validator, WeChat DevTools CLI.

> **Path correction:** In official documentation and demos, `miniprogram` commonly names
> the user's project directory; it is not a required nested folder. In every task below,
> references to `miniprogram/` as the deployable project root are superseded by the
> repository root. Runtime folders such as `pages/`, `skills/`, and `aiDetail/`, plus
> `app.json` and `project.config.json`, must live directly under `craft-beer-map/`.

---

### Task 1: Establish the official project-root contract

**Files:**
- Create: `tests/wechat-ai-official-root.test.js`
- Create: `miniprogram/project.config.json`
- Create: `miniprogram/project.private.config.json`
- Modify: `miniprogram/app.json`
- Modify: `tests/miniprogram-structure.test.js`
- Delete after migration verification: `project.config.json`
- Delete after migration verification: `project.private.config.json`

- [ ] **Step 1: Write the failing root-contract test**

```js
test('miniprogram is the discoverable WeChat AI project root', () => {
  const app = readJson('miniprogram/app.json');
  const project = readJson('miniprogram/project.config.json');
  const skill = app.agent.skills.find((item) => item.name === 'craft-beer-guide');
  const skillPackage = app.subPackages.find((item) => item.root === 'skills');

  assert.equal(Object.hasOwn(project, 'miniprogramRoot'), false);
  assert.equal(skill.path, 'skills/craft-beer-guide');
  assert.equal(skillPackage.independent, true);
  assert.equal(app.agent.instruction, 'AGENTS.md');
  assert.equal(app.agent.pageMetadata, 'page-meta.json');
  assert.equal(project.packOptions.include.some((item) =>
    item.type === 'folder' && item.value === 'skills'), true);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/wechat-ai-official-root.test.js`

Expected: FAIL because `miniprogram/project.config.json` and `app.agent` do not exist.

- [ ] **Step 3: Add the in-place project and app declarations**

Move the current project configuration into `miniprogram/`, remove
`miniprogramRoot`, and configure:

```json
"packOptions": {
  "ignore": [],
  "include": [
    { "type": "folder", "value": "skills" }
  ]
}
```

Extend `miniprogram/app.json` with:

```json
"agent": {
  "skills": [
    {
      "name": "craft-beer-guide",
      "description": "精酿啤酒风格搜索、口味推荐、详情、收藏与学院文章",
      "path": "skills/craft-beer-guide"
    }
  ],
  "instruction": "AGENTS.md",
  "pageMetadata": "page-meta.json"
}
```

Use `subPackages` consistently and declare independent `skills` and `aiDetail`
packages while preserving all existing ordinary pages.

- [ ] **Step 4: Update existing structure tests**

Change `tests/miniprogram-structure.test.js` to read `subPackages`, expect the
ordinary `subpages` package plus `skills` and `aiDetail`, and read the private
configuration from `miniprogram/project.private.config.json`.

- [ ] **Step 5: Run root and structure tests and verify GREEN**

Run:

```powershell
node --test tests/wechat-ai-official-root.test.js tests/miniprogram-structure.test.js
```

Expected: PASS.

### Task 2: Move AI source into the real mini program and integrate page entry points

**Files:**
- Create from current working files: `miniprogram/AGENTS.md`
- Create from page metadata fragments: `miniprogram/page-meta.json`
- Create from current working files: `miniprogram/skills/craft-beer-guide/**`
- Create from current working files: `miniprogram/aiDetail/pages/**`
- Create from current working files: `miniprogram/components/ai-entry/**`
- Modify: `miniprogram/app.json`
- Modify: the eight page WXML files listed in `ai-mode/page-overlays.json`
- Modify: `tests/ai-mode-build.test.js`
- Modify: `tests/ai-mode-skill.test.js`
- Modify: `tests/ai-mode-ui.test.js`
- Modify: `tests/ai-mode-catalog.test.js`
- Modify: `tests/ai-mode-knowledge.test.js`

- [ ] **Step 1: Rewrite path assertions to target the real source tree**

Use:

```js
const miniProgramRoot = path.join(root, 'miniprogram');
const skillRoot = path.join(miniProgramRoot, 'skills', 'craft-beer-guide');
```

Replace the generated-overlay assertion with a direct-source assertion:

```js
overlayTargets.forEach((relativePath) => {
  const source = fs.readFileSync(path.join(miniProgramRoot, relativePath), 'utf8');
  assert.match(source, /<ai-entry\b/, relativePath);
});
```

- [ ] **Step 2: Run the rewritten AI tests and verify RED**

Run:

```powershell
node --test tests/ai-mode-build.test.js tests/ai-mode-skill.test.js tests/ai-mode-ui.test.js tests/ai-mode-catalog.test.js tests/ai-mode-knowledge.test.js
```

Expected: FAIL because Skill, AI detail pages, metadata, and entry component are
not yet present under `miniprogram/`.

- [ ] **Step 3: Migrate current working sources without reverting them**

Copy the current working-tree contents, including uncommitted V2 files, into:

```text
ai-mode/AGENTS.md                              -> miniprogram/AGENTS.md
ai-mode/skill/craft-beer-guide/**              -> miniprogram/skills/craft-beer-guide/**
ai-mode/detail-pages/**                        -> miniprogram/aiDetail/pages/**
ai-mode/entry-component/**                     -> miniprogram/components/ai-entry/**
```

Generate `miniprogram/page-meta.json` from the existing eight page-meta
fragments. Keep experiment-only templates available for Task 5.

- [ ] **Step 4: Add direct AI entry markup**

Register:

```json
"usingComponents": {
  "ai-entry": "/components/ai-entry/index"
}
```

Append one `<ai-entry>` instance to each page listed in
`ai-mode/page-overlays.json`, preserving the current prompt, context type, and
binding. Do not use build-time string replacement.

- [ ] **Step 5: Verify Skill and UI tests GREEN**

Run the five tests from Step 2.

Expected: PASS after generated catalog data is supplied by Task 3; tests that
only require source layout should already pass here.

### Task 3: Replace the second-project build with deterministic in-place generation

**Files:**
- Modify: `scripts/build_ai_mode_project.cjs`
- Modify: `scripts/check_ai_mode_project.cjs`
- Modify: `package.json`
- Modify: `tests/ai-mode-build.test.js`
- Modify: `tests/ai-mode-catalog.test.js`
- Modify: `tests/ai-mode-knowledge.test.js`
- Create/generated: `miniprogram/skills/craft-beer-guide/data/catalog.js`
- Create/generated: `miniprogram/aiDetail/data/catalog.js`
- Create/generated: `miniprogram/skills/craft-beer-guide/utils/catalog-runtime.js`
- Create/generated: `miniprogram/aiDetail/utils/catalog-runtime.js`

- [ ] **Step 1: Add failing build-contract assertions**

Assert that `npm run build:ai-mode`:

```js
assert.equal(fs.existsSync('miniprogram/skills/craft-beer-guide/data/catalog.js'), true);
assert.equal(fs.existsSync('miniprogram/aiDetail/data/catalog.js'), true);
assert.equal(fs.existsSync('artifacts/ai-knowledge-base/bjcp-style-guide.md'), true);
assert.equal(fs.existsSync('artifacts/ai-mode-project'), false);
```

Also assert that `check:ai-mode` reports `miniprogram` as the project root.

- [ ] **Step 2: Run build tests and verify RED**

Run:

```powershell
node --test tests/ai-mode-build.test.js tests/ai-mode-catalog.test.js tests/ai-mode-knowledge.test.js
```

Expected: FAIL because the current script still builds
`artifacts/ai-mode-project/miniprogram`.

- [ ] **Step 3: Narrow the build script**

Retain the existing catalog and knowledge transformation logic, but set:

```js
const outputMiniProgramRoot = path.join(root, 'miniprogram');
const skillRoot = path.join(outputMiniProgramRoot, 'skills', 'craft-beer-guide');
const detailRoot = path.join(outputMiniProgramRoot, 'aiDetail');
```

Remove full-project copying, app rewriting, project-config generation, WXML
overlay application, and source-template copying. Keep deterministic catalog,
runtime, metadata, knowledge, fingerprint, and manifest generation.

- [ ] **Step 4: Make the verifier inspect the real project**

`scripts/check_ai_mode_project.cjs` must inspect `miniprogram/` directly and
verify:

- project config and app config are same-level files
- all `agent` paths resolve
- Skill and AI detail packages are independent
- Skill manifest and registration agree
- component files and related pages exist
- metadata and generated knowledge exist
- no second complete project is generated

- [ ] **Step 5: Verify build tests GREEN**

Run the three tests from Step 2, then:

```powershell
npm run check:ai-mode
```

Expected: PASS and output naming `miniprogram` plus
`artifacts/ai-knowledge-base`.

### Task 4: Enforce current official atomic-component and half-screen rules

**Files:**
- Modify: `tests/ai-mode-components.test.js`
- Modify: `tests/ai-mode-ui.test.js`
- Modify: `miniprogram/skills/craft-beer-guide/components/*/index.js`
- Modify: `miniprogram/skills/craft-beer-guide/components/*/index.wxml`
- Modify: `miniprogram/skills/craft-beer-guide/components/*/index.wxss`
- Modify: `miniprogram/aiDetail/pages/style-results/index.js`
- Modify: `miniprogram/aiDetail/pages/taste-refine/index.js`

- [ ] **Step 1: Write failing official component assertions**

For every declared component assert:

```js
assert.match(js, /wx\.modelContext\.getContext\(this\)/);
assert.match(js, /wx\.modelContext\.getViewContext\(this\)/);
assert.match(js, /NotificationType\.Overflow/);
assert.match(js, /\[ai-mode\].*overflow monitor=on/);
assert.doesNotMatch(wxss, /(?:^|[;{])\s*(?:min-|max-)?height\s*:/m);
```

For every WXML node with `bindtap`, require a `hover-class` on the same opening
tag. Keep the existing forbidden API checks.

- [ ] **Step 2: Run component/UI tests and verify RED**

Run:

```powershell
node --test tests/ai-mode-components.test.js tests/ai-mode-ui.test.js
```

Expected: FAIL for fixed component heights, missing overflow listeners/logs, or
missing hover classes.

- [ ] **Step 3: Apply the official component contract**

Remove root fixed heights, bind `NotificationType.Overflow`, log the documented
monitor line, reacquire context before active actions, and add `hover-class` to
interactive nodes.

Ensure both half-screen pages call:

```js
const context = wx.modelContext.getContext();
context.sendFollowUpMessage({ content: userFacingMessage });
```

They must not call route APIs or `wx.navigateBackAgent()`.

- [ ] **Step 4: Run component/UI tests and verify GREEN**

Run the tests from Step 2.

Expected: PASS.

### Task 5: Preserve and adapt recommendation experiments

**Files:**
- Modify: `scripts/build_ai_mode_experiment.cjs`
- Modify: `scripts/audit_ai_recommendation_release.cjs`
- Modify: `tests/ai-platform-contract.test.js`
- Modify: `tests/ai-page-only-telemetry.test.js`
- Modify: `tests/ai-recommendation-build.test.js`
- Modify as required: `tests/ai-recommendation-*.test.js`
- Preserve: `ai-mode/experiments/**`
- Preserve or relocate with updated imports: `ai-mode/shared/**`
- Preserve or relocate with updated imports: candidate/control Skill templates

- [ ] **Step 1: Add failing experiment-path assertions**

Assert that experiment builds source their baseline from the official
`miniprogram/` project and that both generated experiment variants contain
same-level `app.json` and `project.config.json` at their chosen validator root.

- [ ] **Step 2: Run experiment tests and verify RED**

Run:

```powershell
node --test tests/ai-platform-contract.test.js tests/ai-page-only-telemetry.test.js tests/ai-recommendation-*.test.js tests/ai-flow-state.test.js
```

Expected: FAIL where scripts still assume `ai-mode/skill` is the deployable
Skill or still emit split-root projects.

- [ ] **Step 3: Adapt experiment scripts without changing experiment semantics**

Use `miniprogram/` as the baseline project, overlay only Control/Candidate
protocol files into experiment outputs, and emit each experiment as one valid
project root. Preserve fingerprints, dirty-tree protection, telemetry gates,
and candidate-only runtime exclusion.

- [ ] **Step 4: Run experiment tests and verify GREEN**

Run the tests from Step 2.

Expected: PASS.

### Task 6: Update operator docs and run official end-to-end verification

**Files:**
- Modify: `docs/wechat-ai-mode-runbook.md`
- Modify: `docs/release-checklist.md`
- Modify: `README.md` if it references the old DevTools root
- Modify: `.gitignore` only if validator/DevTools creates reproducible temporary output

- [ ] **Step 1: Add failing documentation assertions**

Update the runbook test to require:

```text
miniprogram/project.config.json
official validator ... miniprogram
微信开发者工具 ... miniprogram
artifacts/ai-knowledge-base/
```

and reject `artifacts/ai-mode-project/project.config.json`.

- [ ] **Step 2: Run documentation tests and verify RED**

Run: `node --test tests/ai-mode-build.test.js tests/miniprogram-structure.test.js`

Expected: FAIL until the old generated-project instructions are removed.

- [ ] **Step 3: Update documentation**

Document one project root, in-place data generation, official validator usage,
DevTools CLI/import usage, AppID permission caveat, knowledge upload, and the
existing conversational acceptance list.

- [ ] **Step 4: Run the complete local suite**

Run:

```powershell
npm test
npm run check:generated
npm run check:ai-mode
```

Expected: all commands exit 0.

- [ ] **Step 5: Run the official validator**

Run:

```powershell
node tmp/official-ai-mode-skills/wxa-skills-validate/scripts/validate.mjs miniprogram
```

Expected: the validator discovers `agent.skills` from
`miniprogram/app.json`; resolve every source/config finding that is actionable
without an AppID permission.

- [ ] **Step 6: Run the WeChat DevTools CLI probe**

Target:

```text
C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat
```

Run a compile or preview operation against `miniprogram/`, record the exact
tool result, and distinguish source compliance failures from account/AppID AI
Mode permission failures.

- [ ] **Step 7: Review the final diff**

Run CodeRabbit if the CLI is available. Independently inspect the final diff for
unintended deletion of existing uncommitted V2 files, stale references to the
old project root, generated artifacts accidentally staged, and missing official
contract coverage.
