# Dual Release Profiles And Trust Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate audited production and AI beta snapshots while making favorite mutations atomic and aligning user-facing source and recommendation states with repository truth.

**Architecture:** Keep the repository root as the canonical AI beta development project. Add a deterministic profile builder that produces a stripped production snapshot and a validated AI beta snapshot under `artifacts/`; mutation code returns explicit verified results so UI and Skill APIs only claim success after write-back confirmation.

**Tech Stack:** WeChat Mini Program WXML/WXSS/JavaScript, Node.js/CommonJS build scripts, ES modules, `node:test`, JSON manifests, SHA-256.

---

### Task 1: Atomic Ordinary Favorites

**Files:**
- Modify: `utils/style-favorites.js`
- Modify: `subpages/style/index.js`
- Modify: `subpages/extension-style/index.js`
- Test: `tests/style-favorites.test.js`

- [ ] **Step 1: Add failing storage failure tests**

Add storage doubles whose `setStorageSync` or post-write `getStorageSync` fails. Assert:

```js
assert.deepEqual(toggleFavoriteStyle('21A', storage), {
  ok: false,
  favoriteIds: ['1B'],
  isFavorite: false,
  error: 'storage-failed',
});
```

Cover both adding and removing, and assert the observable storage state remains unchanged.

- [ ] **Step 2: Run the focused test**

Run:

```bash
node --test tests/style-favorites.test.js
```

Expected: FAIL because mutation results do not expose `ok` and write failures are swallowed.

- [ ] **Step 3: Implement verified mutation results**

Change mutation functions to write, read back, and confirm the target state. Return:

```js
{
  ok: true,
  favoriteIds: confirmedIds,
  isFavorite: confirmedIds.includes(normalizedId),
}
```

On any write/read/confirmation failure return:

```js
{
  ok: false,
  favoriteIds: previousIds,
  isFavorite: previousIds.includes(normalizedId),
  error: 'storage-failed',
}
```

Keep `FAVORITE_STYLE_STORAGE_KEY` and the stored string array format unchanged.

- [ ] **Step 4: Gate page success feedback**

In both detail pages, only update `isFavorite`, show success Toast, and emit
`favorite_toggle` when `result.ok` is true. On failure keep the existing state, show
`收藏状态未保存，请重试`, and emit:

```js
trackEvent('favorite_toggle_failed', {
  styleId: style.id,
  targetFavorite: !this.data.isFavorite,
  error: result.error,
});
```

- [ ] **Step 5: Verify focused tests**

Run:

```bash
node --test tests/style-favorites.test.js tests/miniprogram-structure.test.js
```

Expected: PASS.

### Task 2: Atomic AI Favorite APIs

**Files:**
- Modify: `ai-mode/skill/craft-beer-guide/utils/favorite-store.js`
- Modify: `ai-mode/skill/craft-beer-guide/apis/addFavoriteBeerStyle.js`
- Modify: `ai-mode/skill/craft-beer-guide/apis/addFavoriteBeerStyleControl.js`
- Modify: `ai-mode/skill/craft-beer-guide/apis/removeFavoriteBeerStyle.js`
- Modify: `skills/craft-beer-guide/utils/favorite-store.js`
- Modify: `skills/craft-beer-guide/apis/addFavoriteBeerStyle.js`
- Modify: `skills/craft-beer-guide/apis/removeFavoriteBeerStyle.js`
- Test: `tests/ai-mode-skill.test.js`
- Test: `tests/ai-recommendation-candidate.test.js`

- [ ] **Step 1: Add failing API failure tests**

Make `wx.setStorageSync` throw for add and remove. Assert both APIs return:

```js
assert.equal(result.isError, true);
assert.equal(result._meta?.code, 'storage-failed');
```

For Candidate add, assert a failed mutation does not consume the completion request and a
retry can succeed.

- [ ] **Step 2: Run the focused tests**

Run:

```bash
node --test tests/ai-mode-skill.test.js tests/ai-recommendation-candidate.test.js
```

Expected: FAIL for the root Skill and remove mutation paths.

- [ ] **Step 3: Return verified store results**

Make `addFavoriteStyleRef` and `removeFavoriteStyleRef` return:

```js
{ ok: true, refs }
```

or:

```js
{ ok: false, refs: previousRefs, error: 'storage-failed' }
```

After writing, read the storage key and confirm the target reference is present for add and
absent for remove.

- [ ] **Step 4: Gate API success envelopes**

Each API checks `mutation.ok`. On failure return:

```js
failure('收藏状态未能写入本机存储，请稍后重试。', 'storage-failed')
```

Candidate flow completion occurs only after a non-error result. Idempotent
`already-favorite` and `not-favorite` remain successful without a write.

- [ ] **Step 5: Verify AI tests**

Run:

```bash
node --test tests/ai-mode-skill.test.js tests/ai-recommendation-candidate.test.js tests/ai-recommendation-control.test.js
```

Expected: PASS.

### Task 3: Deterministic Release Profiles

**Files:**
- Create: `scripts/build_release_profiles.cjs`
- Create: `scripts/check_release_profiles.cjs`
- Create: `tests/release-profiles.test.js`
- Modify: `package.json`
- Modify: `scripts/check_generated_data.cjs`

- [ ] **Step 1: Add failing profile tests**

Test that `build:profiles` creates `artifacts/production` and `artifacts/ai-beta`, then assert
the production snapshot:

```js
assert.equal(Object.hasOwn(app, 'agent'), false);
assert.equal(app.subPackages.some(({ root }) => ['skills', 'aiDetail'].includes(root)), false);
assert.equal(Object.hasOwn(app.usingComponents || {}, 'ai-entry'), false);
assert.equal(fs.existsSync(path.join(productionRoot, 'skills')), false);
assert.equal(fs.existsSync(path.join(productionRoot, 'aiDetail')), false);
assert.equal(fs.existsSync(path.join(productionRoot, 'components', 'ai-entry')), false);
```

Also scan text files and assert no `<ai-entry`, `wx.openAgent`, `wx.onAgentOpen`,
`craft-beer-guide`, or `/aiDetail/` references exist.

- [ ] **Step 2: Run the focused test**

Run:

```bash
node --test tests/release-profiles.test.js
```

Expected: FAIL because profile scripts do not exist.

- [ ] **Step 3: Implement the profile builder**

`build_release_profiles.cjs` must:

1. Reset only `artifacts/production` and `artifacts/ai-beta`.
2. Copy canonical runtime files into production using explicit top-level allowlists.
3. Parse and transform `app.json` and `project.config.json`.
4. Remove `<ai-entry ... />` blocks from copied WXML files.
5. Build AI beta by invoking:

```js
execFileSync(process.execPath, [
  'scripts/build_ai_mode_project.cjs',
  '--output-root=artifacts/ai-beta',
], { cwd: root, stdio: 'inherit' });
```

6. Write deterministic manifests with sorted relative file paths, SHA-256 hashes, byte sizes,
   source fingerprint and content fingerprint.

- [ ] **Step 4: Implement profile checks**

`check_release_profiles.cjs` must build profiles, validate manifest hashes, enforce the
production denylist, enforce the 1950 KiB budget, run the existing AI verifier with
`--output-root=artifacts/ai-beta --no-build`, rebuild into a temporary directory, and compare
content fingerprints.

- [ ] **Step 5: Register commands and drift inputs**

Add:

```json
"build:profiles": "node scripts/build_release_profiles.cjs",
"check:profiles": "node scripts/check_release_profiles.cjs"
```

Extend generated-data checking to include academy output, page metadata, AI catalog/runtime
files and the source fingerprints used by release profile manifests without rewriting the
canonical root.

- [ ] **Step 6: Verify profile tests**

Run:

```bash
npm run build:profiles
npm run check:profiles
node --test tests/release-profiles.test.js
```

Expected: PASS and production total bytes below the repository budget.

### Task 4: Source Copy And Recommendation States

**Files:**
- Modify: `pages/search/index.wxml`
- Modify: `pages/favorites/index.wxml`
- Modify: `pages/choose/index.js`
- Modify: `pages/choose/index.wxml`
- Test: `tests/miniprogram-structure.test.js`

- [ ] **Step 1: Replace obsolete structure assertions**

Assert the search and favorites pages mention both:

```text
BJCP 官方标准风格
BA/WBC/GABF 市场扩展风格
```

Assert choose templates contain no `{{...matchScore}}%`, include qualitative labels, and keep
the explanation region inside the results branch.

- [ ] **Step 2: Run the focused test**

Run:

```bash
node --test tests/miniprogram-structure.test.js
```

Expected: FAIL against the old copy and percentage UI.

- [ ] **Step 3: Implement truthful copy**

Search initial and empty states must describe repository coverage without claiming missing
styles that are present. Favorites hero and empty state must cover both official and market
extension styles.

- [ ] **Step 4: Add qualitative match labels**

Add:

```js
function buildMatchLabel(matchScore) {
  if (matchScore >= 90) return '高度匹配';
  if (matchScore >= 75) return '较为匹配';
  return '可以尝试';
}
```

Attach `matchLabel` in `toChooseResult`, render it instead of `%`, and move the explanation
region inside `wx:if="{{hasResults}}"`.

- [ ] **Step 5: Verify focused tests**

Run:

```bash
node --test tests/miniprogram-structure.test.js tests/miniprogram-model.test.js
```

Expected: PASS.

### Task 5: Release Documentation And Full Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/wechat-ai-mode-runbook.md`
- Modify: `docs/release-checklist.md`

- [ ] **Step 1: Document the only production source**

State plainly:

```text
仓库根目录和 artifacts/ai-beta 仅用于 AI beta 开发与验证。
正式发布只能导入 artifacts/production。
```

Document `npm run build:profiles` and `npm run check:profiles` before DevTools QA.

- [ ] **Step 2: Run all automated checks**

Run:

```bash
npm test
npm run check:generated
npm run check:profiles
```

Expected: all tests and checks pass.

- [ ] **Step 3: Inspect the final diff**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intended source, tests and documentation files changed.
