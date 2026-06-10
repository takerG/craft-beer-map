# WeChat AI Mode Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan.

**Goal:** Add a build-time generated WeChat AI Mode project that exposes the current beer guide as one Skill, while keeping the production `miniprogram/` tree free of beta AI APIs.

**Architecture:** Track AI-only templates and runtime code in `ai-mode/`. A deterministic Node build copies the current mini program to `artifacts/ai-mode-project/`, overlays the Skill, AI entry component, half-screen pages, page metadata, and generated catalog data, then writes knowledge-base Markdown files to `artifacts/ai-knowledge-base/`. All Skill APIs execute locally against the generated catalog and `wx` local storage; no backend or developer-owned model service is introduced.

**Tech Stack:** WeChat Mini Program JavaScript/WXML/WXSS, WeChat AI Mode Skill protocol, Node.js ESM/CJS, `node:test`, generated JSON/Markdown artifacts.

---

### Task 1: Lock the release boundary and build contract

**Files:**
- Create: `tests/ai-mode-build.test.js`
- Create: `scripts/build_ai_mode_project.cjs`
- Modify: `package.json`
- Modify: `.gitignore`

- [x] **Step 1: Write the failing build-boundary tests**

Add tests that assert:

```js
test('production mini program contains no AI mode declarations', () => {
  const sourceApp = readJson('miniprogram/app.json');
  assert.equal(Object.hasOwn(sourceApp, 'agent'), false);
  assert.equal(listFiles('miniprogram').some((file) => /skills|ai-entry|ai-detail/.test(file)), false);
});

test('AI mode build emits an isolated developer-tools project', () => {
  runBuild();
  const app = readJson('artifacts/ai-mode-project/miniprogram/app.json');
  assert.equal(app.agent, 'skills/craft-beer-guide');
  assert.ok(app.subpackages.some((item) => item.root === 'skills' && item.independent));
});
```

Also assert that `artifacts/` remains ignored and that the generated project config points to `miniprogram/`.

- [x] **Step 2: Run the new test and confirm RED**

Run: `node --test tests/ai-mode-build.test.js`

Expected: FAIL because the AI build script and artifact do not exist.

- [x] **Step 3: Implement the minimal deterministic build**

Create `scripts/build_ai_mode_project.cjs` with:

```js
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outputRoot = path.join(root, 'artifacts', 'ai-mode-project');

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });
fs.cpSync(path.join(root, 'miniprogram'), path.join(outputRoot, 'miniprogram'), { recursive: true });
```

Then add helpers that copy tracked AI templates, transform only the copied `app.json`, and write an AI-specific `project.config.json`. Add:

```json
"build:ai-mode": "node scripts/build_ai_mode_project.cjs",
"check:ai-mode": "node --test tests/ai-mode-*.test.js"
```

- [x] **Step 4: Run the focused test and confirm GREEN**

Run: `node --test tests/ai-mode-build.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add tests/ai-mode-build.test.js scripts/build_ai_mode_project.cjs package.json .gitignore
git commit -m "Add isolated AI mode build boundary"
```

### Task 2: Generate a compact local AI catalog

**Files:**
- Create: `tests/ai-mode-catalog.test.js`
- Create: `ai-mode/shared/catalog-runtime.cjs`
- Modify: `scripts/build_ai_mode_project.cjs`

- [ ] **Step 1: Write failing catalog parity tests**

Test the runtime with catalog data generated from:

- `miniprogram/data/beer-data.js`
- `miniprogram/data/style-aliases.js`
- `miniprogram/data/extension-styles.js`
- `miniprogram/data/academy-sites.js`

Assert representative parity:

```js
assert.equal(runtime.searchBeerStyles(catalog, '21A')[0].styleRef.id, '21A');
assert.equal(runtime.searchBeerStyles(catalog, 'West Coast IPA')[0].styleRef.kind, 'extension');
assert.equal(runtime.getBeerStyleDetail(catalog, { kind: 'bjcp', id: '1B' }).style.code, '1B');
assert.ok(runtime.findAcademyArticles(catalog, 'IPA').length > 0);
```

Assert no generated JavaScript data file exceeds the WeChat package single-file limit.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/ai-mode-catalog.test.js`

Expected: FAIL because no runtime or generated catalog exists.

- [ ] **Step 3: Implement pure catalog functions**

Implement in `ai-mode/shared/catalog-runtime.cjs`:

```js
function searchBeerStyles(catalog, query, limit = 8) {}
function recommendBeerStyles(catalog, preferences, limit = 6) {}
function getBeerStyleDetail(catalog, styleRef) {}
function findAcademyArticles(catalog, query, limit = 6) {}
function resolveStyleSummary(catalog, styleRef) {}

module.exports = {
  searchBeerStyles,
  recommendBeerStyles,
  getBeerStyleDetail,
  findAcademyArticles,
  resolveStyleSummary,
};
```

Keep matching deterministic and reuse the existing five visible taste dimensions: `sweetness`, `sourness`, `bitterness`, `body`, and `strength`.

- [ ] **Step 4: Extend the build generator**

Use dynamic imports from the CJS build script:

```js
const { beerData } = await import(pathToFileURL(sourcePath).href);
```

Write a normalized CommonJS catalog module into:

`artifacts/ai-mode-project/miniprogram/skills/craft-beer-guide/data/catalog.js`

Copy the pure runtime beside it.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run:

```bash
npm run build:ai-mode
node --test tests/ai-mode-catalog.test.js
```

- [ ] **Step 6: Commit**

```bash
git add tests/ai-mode-catalog.test.js ai-mode/shared/catalog-runtime.cjs scripts/build_ai_mode_project.cjs
git commit -m "Generate local catalog for AI mode"
```

### Task 3: Implement the Skill manifest and seven atomic APIs

**Files:**
- Create: `tests/ai-mode-skill.test.js`
- Create: `ai-mode/skill/craft-beer-guide/SKILL.md`
- Create: `ai-mode/skill/craft-beer-guide/mcp.json`
- Create: `ai-mode/skill/craft-beer-guide/index.js`
- Create: `ai-mode/skill/craft-beer-guide/apis/search-beer-styles.js`
- Create: `ai-mode/skill/craft-beer-guide/apis/recommend-beer-styles.js`
- Create: `ai-mode/skill/craft-beer-guide/apis/get-beer-style-detail.js`
- Create: `ai-mode/skill/craft-beer-guide/apis/list-favorite-beer-styles.js`
- Create: `ai-mode/skill/craft-beer-guide/apis/add-favorite-beer-style.js`
- Create: `ai-mode/skill/craft-beer-guide/apis/remove-favorite-beer-style.js`
- Create: `ai-mode/skill/craft-beer-guide/apis/find-academy-articles.js`
- Create: `ai-mode/skill/craft-beer-guide/utils/favorite-store.js`
- Modify: `scripts/build_ai_mode_project.cjs`

- [ ] **Step 1: Write failing protocol and behavior tests**

Assert:

- `mcp.json` uses the official demo's top-level API array shape.
- Every declared API has the same-named export in `index.js`.
- Input schemas use `styleRef: { kind, id }`.
- Favorite operations use only `wx.getStorageSync` and `wx.setStorageSync`.
- Search, recommendation, detail, favorites, and academy APIs return component-ready structured results.

Stub `global.wx` in tests to verify add/list/remove behavior without a backend.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/ai-mode-skill.test.js`

- [ ] **Step 3: Write Skill instructions and manifest**

`SKILL.md` must state:

- Use only this Skill's catalog for beer facts.
- Distinguish BJCP styles from market extension styles.
- Ask a concise follow-up when taste intent is underspecified.
- Never claim a favorite mutation succeeded unless the API result confirms it.
- Prefer result cards over long prose for lists and details.

Declare exactly:

1. `searchBeerStyles`
2. `recommendBeerStyles`
3. `getBeerStyleDetail`
4. `listFavoriteBeerStyles`
5. `addFavoriteBeerStyle`
6. `removeFavoriteBeerStyle`
7. `findAcademyArticles`

- [ ] **Step 4: Implement API modules and exports**

Each API module should expose one async handler and return serializable data. Keep `wx` access inside the favorite store adapter so read-only APIs remain pure.

- [ ] **Step 5: Build and run focused tests**

Run:

```bash
npm run build:ai-mode
node --test tests/ai-mode-skill.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/ai-mode-skill.test.js ai-mode/skill scripts/build_ai_mode_project.cjs
git commit -m "Add craft beer guide AI Skill APIs"
```

### Task 4: Add atomic result components

**Files:**
- Create: `tests/ai-mode-components.test.js`
- Create: `ai-mode/skill/craft-beer-guide/components/style-list-card/index.{js,json,wxml,wxss}`
- Create: `ai-mode/skill/craft-beer-guide/components/style-detail-card/index.{js,json,wxml,wxss}`
- Create: `ai-mode/skill/craft-beer-guide/components/favorite-status-card/index.{js,json,wxml,wxss}`
- Create: `ai-mode/skill/craft-beer-guide/components/academy-article-list-card/index.{js,json,wxml,wxss}`
- Modify: `ai-mode/skill/craft-beer-guide/mcp.json`

- [ ] **Step 1: Write failing component constraints**

Assert every component:

- Declares `"component": true`.
- Uses `modelContext` in its JS.
- Has a fixed-height root style.
- Uses only `bindtap` interactions.
- Contains no `wx.navigateTo`, network APIs, timers, or dynamic component declarations.

Assert `favorite-status-card` is marked expirable in the manifest.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/ai-mode-components.test.js`

- [ ] **Step 3: Implement components**

Use the official demo pattern:

```js
Component({
  properties: {
    modelContext: { type: Object, value: null },
  },
  methods: {
    handleTap(event) {
      this.triggerEvent('action', event.currentTarget.dataset);
    },
  },
});
```

Keep cards compact and expose existing mini-program routes via manifest metadata rather than direct navigation from component code.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/ai-mode-components.test.js`

- [ ] **Step 5: Commit**

```bash
git add tests/ai-mode-components.test.js ai-mode/skill/craft-beer-guide/components ai-mode/skill/craft-beer-guide/mcp.json
git commit -m "Add AI mode atomic result cards"
```

### Task 5: Add the AI entry overlay and half-screen pages

**Files:**
- Create: `tests/ai-mode-ui.test.js`
- Create: `ai-mode/entry-component/index.{js,json,wxml,wxss}`
- Create: `ai-mode/detail-pages/style-results/index.{js,json,wxml,wxss}`
- Create: `ai-mode/detail-pages/taste-refine/index.{js,json,wxml,wxss}`
- Create: `ai-mode/page-overlays.json`
- Modify: `scripts/build_ai_mode_project.cjs`

- [ ] **Step 1: Write failing generated-UI tests**

After a build, assert:

- The copied app registers `/components/ai-entry/index`.
- Entry component uses `wx.openAgent` and handles `wx.onAgentOpen`.
- Entry markup is injected only into the generated copies of explore, choose, academy, favorites, search, BJCP detail, extension detail, and academy article pages.
- Half-screen pages use `wx.navigateBackAgent` for follow-up messages.
- Half-screen pages contain no normal mini-program route API.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/ai-mode-ui.test.js`

- [ ] **Step 3: Implement a generated-only global entry component**

The entry component accepts:

```js
properties: {
  prompt: String,
  contextType: String,
  contextData: Object,
}
```

On tap, call `wx.openAgent` with the page-specific prompt and a small serializable context payload. Register it globally only in the copied AI project's `app.json`.

- [ ] **Step 4: Implement deterministic page overlays**

Store overlay definitions in `ai-mode/page-overlays.json` and append one `<ai-entry>` tag to each target WXML during build. Do not edit any source WXML in `miniprogram/`.

- [ ] **Step 5: Implement the two half-screen pages**

`style-results` renders ranked style cards. `taste-refine` renders the five taste dimensions and returns a concise follow-up instruction through `wx.navigateBackAgent`.

- [ ] **Step 6: Build and run focused tests**

Run:

```bash
npm run build:ai-mode
node --test tests/ai-mode-ui.test.js
```

- [ ] **Step 7: Commit**

```bash
git add tests/ai-mode-ui.test.js ai-mode/entry-component ai-mode/detail-pages ai-mode/page-overlays.json scripts/build_ai_mode_project.cjs
git commit -m "Add generated AI entry and detail pages"
```

### Task 6: Add page metadata and strict knowledge-base generation

**Files:**
- Create: `tests/ai-mode-knowledge.test.js`
- Create: `ai-mode/AGENTS.md`
- Create: `ai-mode/page-meta/explore.json`
- Create: `ai-mode/page-meta/choose.json`
- Create: `ai-mode/page-meta/academy.json`
- Create: `ai-mode/page-meta/favorites.json`
- Create: `ai-mode/page-meta/search.json`
- Create: `ai-mode/page-meta/style.json`
- Create: `ai-mode/page-meta/extension-style.json`
- Create: `ai-mode/page-meta/academy-article.json`
- Modify: `scripts/build_ai_mode_project.cjs`

- [ ] **Step 1: Write failing metadata and knowledge tests**

Assert:

- Each target generated page contains `<page-meta>` with a meaningful `page-style` or text description binding.
- Generated knowledge files exist:
  - `bjcp-style-guide.md`
  - `extension-style-guide.md`
  - `academy-articles.md`
- Files are UTF-8, under 10 MB, and contain only current repository data.
- `AGENTS.md` forbids external factual supplementation and unsupported medical or drinking-safety claims.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/ai-mode-knowledge.test.js`

- [ ] **Step 3: Implement metadata overlays**

Prepend page metadata to generated page WXML using tracked templates and page-specific descriptions.

- [ ] **Step 4: Generate the three knowledge documents**

Generate concise Markdown from the same normalized catalog used by APIs. Include stable IDs and source labels so answers can distinguish BJCP from extensions.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm run build:ai-mode
node --test tests/ai-mode-knowledge.test.js
```

- [ ] **Step 6: Commit**

```bash
git add tests/ai-mode-knowledge.test.js ai-mode/AGENTS.md ai-mode/page-meta scripts/build_ai_mode_project.cjs
git commit -m "Generate AI metadata and knowledge base"
```

### Task 7: Add a single strict verifier and operator documentation

**Files:**
- Create: `scripts/check_ai_mode_project.cjs`
- Create: `docs/wechat-ai-mode-runbook.md`
- Modify: `package.json`
- Modify: `tests/ai-mode-build.test.js`

- [ ] **Step 1: Write failing verifier tests**

Assert `check:ai-mode`:

- Rebuilds from a clean artifact directory.
- Validates manifest/export/component consistency.
- Rejects AI declarations in `miniprogram/`.
- Rejects generated files above configured size limits.
- Reports actionable file paths on failure.

- [ ] **Step 2: Run and confirm RED**

Run: `npm run check:ai-mode`

- [ ] **Step 3: Implement the verifier**

The verifier should call the build script, run structural checks, and exit non-zero on violations. Keep it dependency-free.

- [ ] **Step 4: Write the runbook**

Document:

1. `npm run build:ai-mode`
2. Open `artifacts/ai-mode-project/project.config.json` in WeChat DevTools.
3. Enable the beta AI development mode for testing.
4. Upload the three files in `artifacts/ai-knowledge-base/`.
5. Execute the 12 acceptance dialogs from the design specification.
6. Never submit the generated beta project as the formal mini-program release.

- [ ] **Step 5: Run focused verification**

Run:

```bash
npm run check:ai-mode
node --test tests/ai-mode-*.test.js
```

- [ ] **Step 6: Commit**

```bash
git add scripts/check_ai_mode_project.cjs docs/wechat-ai-mode-runbook.md package.json tests/ai-mode-build.test.js
git commit -m "Add AI mode verification runbook"
```

### Task 8: Full regression and final audit

**Files:**
- Modify only files required by failures found during verification.

- [ ] **Step 1: Run generated-data drift checks**

Run: `npm run check:generated`

Expected: PASS.

- [ ] **Step 2: Run the complete test suite**

Run: `npm test`

Expected: PASS with no skipped AI-mode structural tests.

- [ ] **Step 3: Rebuild and run strict AI verification**

Run:

```bash
npm run build:ai-mode
npm run check:ai-mode
```

Expected: PASS and artifact paths printed.

- [ ] **Step 4: Audit the production boundary**

Run:

```bash
rg -n "openAgent|onAgentOpen|navigateBackAgent|\"agent\"|craft-beer-guide" miniprogram project.config.json
```

Expected: no matches.

- [ ] **Step 5: Review repository changes**

Run:

```bash
git status --short
git diff --check
git diff --stat
```

Confirm generated `artifacts/` are not tracked and all tracked AI source lives under `ai-mode/`, `scripts/`, `tests/`, and `docs/`.

- [ ] **Step 6: Commit final fixes, if any**

```bash
git add <only-files-changed-for-final-fixes>
git commit -m "Verify WeChat AI mode integration"
```
