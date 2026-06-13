# Design Interaction Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the CEO-approved interaction correctness and visual clarity improvements across choose, explore, academy, search, and favorites.

**Architecture:** Keep the existing WeChat Mini Program page structure and data models. Add small pure helpers for state derivation where behavior needs direct tests, preserve the atomic favorite mutation contract, and limit template/style changes to the approved surfaces.

**Tech Stack:** WeChat Mini Program WXML/WXSS/JavaScript, Node.js test runner, existing repository model and storage helpers.

---

### Task 1: Choose Result Accuracy And State Continuity

**Files:**
- Modify: `pages/choose/index.js`
- Modify: `pages/choose/index.wxml`
- Modify: `pages/choose/index.wxss`
- Modify: `tests/miniprogram-structure.test.js`
- Modify: `tests/miniprogram-model.test.js`

- [ ] **Step 1: Write failing tests**

Add tests that require:

```js
assert.equal(buildVisibleRecommendationCount(results), Math.min(results.length, 3));
assert.deepEqual(
  excludeVisibleRecommendations(exactMatches, visibleResults).map((item) => item.id),
  expectedUniqueIds,
);
assert.equal(isSceneAdjusted(scene.filterState, scene.filterState), false);
assert.equal(isSceneAdjusted(changedFilters, scene.filterState), true);
```

Also assert the template uses “扩展风格”, reasons support two lines, and fixed radar/star
decorations are absent.

- [ ] **Step 2: Verify the tests fail**

Run:

```powershell
node --test tests/miniprogram-model.test.js tests/miniprogram-structure.test.js
```

Expected: FAIL because the helpers, adjusted state, unique exact matches, and visual
constraints do not exist.

- [ ] **Step 3: Implement the minimal behavior**

Add pure exported helpers to `pages/choose/index.js` or a focused existing utility:

```js
export function excludeVisibleRecommendations(exactMatches, visibleResults) {
  const visibleIds = new Set(visibleResults.map((item) => item.id));
  return exactMatches.filter((item) => !visibleIds.has(item.id));
}

export function isSceneAdjusted(filterState, presetState) {
  return Object.keys(presetState).some(
    (key) => Number(filterState[key]) !== Number(presetState[key]),
  );
}
```

Update refresh behavior so filter changes preserve `showExplanation` and
`activeVisualIndex`, while scene changes reset them. Remove `.radar-fill` and
`.star-line` markup/styles, change the visible extension label to “扩展风格”, and use
two-line clamping for recommendation reasons.

- [ ] **Step 4: Verify focused tests pass**

Run the focused test command from Step 2.

Expected: PASS.

### Task 2: Explore And Academy Clarity

**Files:**
- Modify: `pages/explore/index.js`
- Modify: `pages/explore/index.wxml`
- Modify: `pages/academy/index.js`
- Modify: `pages/academy/index.wxml`
- Modify: `pages/academy/index.wxss`
- Modify: `utils/academy-feed-model.js`
- Modify: `tests/academy-model.test.js`
- Modify: `tests/miniprogram-structure.test.js`

- [ ] **Step 1: Write failing tests**

Require distinct academy filter labels, existing model title/subtitle on the academy page,
two-line article titles, and section-specific featured entries:

```js
assert.equal(new Set(filters.map((item) => item.label)).size, filters.length);
assert.equal(filters.find((item) => item.type === 'simulator').label, '互动');
assert.ok(bjcpFeatured.every((item) => item.kind === 'bjcp'));
assert.ok(extensionFeatured.every((item) => item.kind === 'extension'));
```

- [ ] **Step 2: Verify the tests fail**

Run:

```powershell
node --test tests/academy-model.test.js tests/miniprogram-structure.test.js
```

Expected: FAIL for duplicate “工具” labels and missing section-specific UI.

- [ ] **Step 3: Implement the minimal behavior**

Keep the source result list in page state and derive the visible list:

```js
function filterFeaturedBySection(featured, sectionId) {
  const targetKind = sectionId === 'extension' ? 'extension' : 'bjcp';
  return featured.filter((item) => item.kind === targetKind);
}
```

Set the academy page title/subtitle from `getAcademyHome()`, rename only the
`simulator` label to “互动”, and clamp `.feed-title` to two lines.

- [ ] **Step 4: Verify focused tests pass**

Run the command from Step 2.

Expected: PASS.

### Task 3: Search Feedback

**Files:**
- Modify: `pages/search/index.js`
- Modify: `pages/search/index.wxml`
- Modify: `pages/search/index.wxss`
- Modify: `tests/miniprogram-structure.test.js`

- [ ] **Step 1: Write a failing structure test**

Assert search page state includes `inputFocused` and `resultCountLabel`, the input binds
`focus`, and the result list renders the count label.

- [ ] **Step 2: Verify the test fails**

Run:

```powershell
node --test tests/miniprogram-structure.test.js
```

Expected: FAIL because search focus and result count are absent.

- [ ] **Step 3: Implement the minimal behavior**

Add:

```js
inputFocused: false,
resultCountLabel: '',
```

Update them for input, suggestions, clear, and empty-state retry. Use a dedicated
`restartSearch()` handler to clear results and set `inputFocused: true`; reset focus after
the focus event if required by Mini Program binding behavior.

- [ ] **Step 4: Verify the focused test passes**

Run the command from Step 2.

Expected: PASS.

### Task 4: Trusted Favorites Read And Remove

**Files:**
- Modify: `utils/style-favorites.js`
- Modify: `pages/favorites/index.js`
- Modify: `pages/favorites/index.wxml`
- Modify: `pages/favorites/index.wxss`
- Modify: `tests/style-favorites.test.js`
- Modify: `tests/miniprogram-structure.test.js`

- [ ] **Step 1: Write failing tests**

Add a result API test:

```js
assert.deepEqual(getFavoriteStyleSummariesResult(failingStorage), {
  ok: false,
  favoriteStyles: [],
  error: 'storage-failed',
});
```

Add structure assertions for `loadStatus`, retry, `catchtap="removeFavorite"`, and failure
feedback.

- [ ] **Step 2: Verify the tests fail**

Run:

```powershell
node --test tests/style-favorites.test.js tests/miniprogram-structure.test.js
```

Expected: FAIL because trusted read results and list removal controls do not exist.

- [ ] **Step 3: Implement the minimal behavior**

Expose a read result without breaking existing callers:

```js
export function getFavoriteStyleSummariesResult(storage = getDefaultStorage()) {
  const state = readFavoriteIds(storage);
  if (!state.ok) {
    return { ok: false, favoriteStyles: [], error: 'storage-failed' };
  }
  return {
    ok: true,
    favoriteStyles: resolveFavoriteStyleSummaries(state.favoriteIds),
  };
}
```

Use this API in the favorites page. On `removeFavorite`, call the existing atomic
`removeFavoriteStyle`; refresh only when `result.ok` is true. On failure, retain the row
and show a non-success toast.

- [ ] **Step 4: Verify focused tests pass**

Run the command from Step 2.

Expected: PASS.

### Task 5: Integrated Verification

**Files:**
- Modify only if verification reveals an approved-scope defect.

- [ ] **Step 1: Run the full suite**

```powershell
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Check generated data**

```powershell
npm run check:generated
```

Expected: generated data is in sync.

- [ ] **Step 3: Check release profiles**

```powershell
npm run check:profiles
```

Expected: production and ai-beta profiles verify; production remains free of beta AI
runtime files and references.

- [ ] **Step 4: Review scope**

Confirm no BJCP or market extension source data changed, no user-facing `EX` labels remain,
and no generated screenshots or temporary QA files are committed.

