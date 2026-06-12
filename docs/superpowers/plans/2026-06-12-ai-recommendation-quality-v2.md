# AI Recommendation Quality V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a semantic-v2 Candidate recommendation experience and an unchanged legacy-v1 Control, then compare them through complete WeChat platform traces without claiming unavailable online funnel analytics.

**Architecture:** A pure deterministic recommendation core and a storage-whitelisted flow state machine sit below two versioned contracts. Control keeps its current numeric API and UI; Candidate receives semantic snapshots, revision/request idempotence, deterministic conflicts, and a separate adaptive card. Skill and atomic-component code contain no analytics APIs. Optional page-only analytics is generated only after a manual platform gate and never contributes to the north-star metric.

**Tech Stack:** WeChat Mini Program AI Mode beta, JavaScript/CommonJS/ES modules, WXML/WXSS, `node:test`, JSON Schema, deterministic Node build scripts, official `wxa-skills-validate` workflow, controlled platform trace capture.

---

## Milestones

- **M0 Platform probe:** Task 0. Manual and blocking for platform-dependent features.
- **M1 Candidate quality:** Tasks 1-5. Pure core, safe flow state, Candidate contract/UI, and 20-30 high-risk automated cases.
- **M2 Controlled comparison:** Tasks 6-7. Unchanged Control, dual build, 60 natural-language traces, scorer, and statistical protocol.
- **M3 Page-only analytics:** Task 8. Optional and enabled only after M0 confirms ordinary-page support.
- **Final release audit:** Task 9.

## File Map

### Create

- `ai-mode/experiments/ai-recommendation-quality-v2.json`
- `ai-mode/experiments/platform-capabilities.json`
- `ai-mode/shared/recommendation-v2.cjs`
- `ai-mode/shared/flow-state.cjs`
- `ai-mode/skill/craft-beer-guide/utils/flow-store.js`
- `ai-mode/skill/craft-beer-guide/utils/redacted-logger.js`
- `ai-mode/skill/craft-beer-guide/apis/recommendBeerStylesCandidate.js`
- `ai-mode/skill/craft-beer-guide/SKILL.candidate.md`
- `ai-mode/skill/craft-beer-guide/mcp.candidate.json`
- `ai-mode/skill/craft-beer-guide/SKILL.control.md`
- `ai-mode/skill/craft-beer-guide/mcp.control.json`
- `ai-mode/skill/craft-beer-guide/components/recommendation-v2-card/index.{js,json,wxml,wxss}`
- `ai-mode/page-runtime/ai-recommendation-telemetry.js`
- `scripts/build_ai_mode_experiment.cjs`
- `scripts/score_ai_recommendation_traces.cjs`
- `scripts/audit_ai_recommendation_release.cjs`
- `tests/ai-platform-contract.test.js`
- `tests/ai-recommendation-v2.test.js`
- `tests/ai-flow-state.test.js`
- `tests/ai-recommendation-candidate.test.js`
- `tests/ai-recommendation-control.test.js`
- `tests/ai-recommendation-components.test.js`
- `tests/ai-recommendation-build.test.js`
- `tests/ai-recommendation-trace.test.js`
- `tests/ai-page-only-telemetry.test.js`
- `tests/ai-recommendation-release-audit.test.js`
- `tests/fixtures/ai-recommendation-v2/cases.json`
- `tests/fixtures/ai-recommendation-v2/trace-schema.json`
- `tests/fixtures/ai-recommendation-v2/operations-audit-schema.json`

### Modify

- `ai-mode/shared/catalog-runtime.cjs`
- `ai-mode/skill/craft-beer-guide/index.js`
- `ai-mode/skill/craft-beer-guide/apis/recommendBeerStyles.js`
- `ai-mode/skill/craft-beer-guide/apis/getBeerStyleDetail.js`
- `ai-mode/skill/craft-beer-guide/apis/addFavoriteBeerStyle.js`
- `ai-mode/skill/craft-beer-guide/components/style-list-card/index.js`
- `ai-mode/skill/craft-beer-guide/components/style-list-card/index.wxss`
- `ai-mode/skill/craft-beer-guide/components/style-detail-card/index.js`
- `ai-mode/skill/craft-beer-guide/components/favorite-status-card/index.js`
- `ai-mode/detail-pages/taste-refine/index.{js,wxml,wxss}`
- `ai-mode/detail-pages/style-results/index.js`
- `scripts/build_ai_mode_project.cjs`
- `scripts/check_ai_mode_project.cjs`
- `package.json`
- existing `tests/ai-mode-*.test.js`
- `docs/wechat-ai-mode-runbook.md`
- `docs/release-checklist.md`

### Generated/ignored

- `artifacts/ai-mode-platform-probe/probe-record.json`
- `artifacts/ai-mode-experiment/control/`
- `artifacts/ai-mode-experiment/candidate/`
- `artifacts/ai-evaluation-traces/`

## Task 0: M0 Platform Probe and Manual Gate

**Files:**
- Create: `ai-mode/experiments/platform-capabilities.json`
- Create: `tests/ai-platform-contract.test.js`
- Modify: `docs/wechat-ai-mode-runbook.md`

- [ ] **Step 1: Write the failing blocked-default test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('all platform-dependent capabilities default to blocked', () => {
  const capabilities = JSON.parse(
    fs.readFileSync('ai-mode/experiments/platform-capabilities.json', 'utf8'),
  );
  assert.equal(capabilities.status, 'blocked');
  for (const value of Object.values(capabilities.capabilities)) {
    assert.equal(value.status, 'unverified');
    assert.equal(value.evidence, null);
  }
});
```

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
node --test tests/ai-platform-contract.test.js
```

Expected: FAIL because the capability record does not exist.

- [ ] **Step 3: Add the blocked capability record**

```json
{
  "schemaVersion": 1,
  "status": "blocked",
  "checkedAt": null,
  "appIdPermissionConfirmed": false,
  "devToolsVersion": null,
  "baseLibraryVersion": null,
  "capabilities": {
    "officialValidator": { "status": "unverified", "evidence": null },
    "halfScreenSendFollowUp": { "status": "unverified", "evidence": null },
    "halfScreenStructuredInput": { "status": "unverified", "evidence": null },
    "expirePreviousCards": { "status": "unverified", "evidence": null },
    "expireAllCards": { "status": "unverified", "evidence": null },
    "overflowNotification": { "status": "unverified", "evidence": null },
    "ordinaryPageAnalytics": { "status": "unverified", "evidence": null }
  }
}
```

- [ ] **Step 4: Perform the manual probe**

Use the exact generated project under `artifacts/ai-mode-project/` and record results in:

```text
artifacts/ai-mode-platform-probe/probe-record.json
```

The operator must:

1. Record AppID permission status.
2. Record exact DevTools and base-library versions.
3. Run the official `wxa-skills-validate` workflow from the official repository against the generated Skill.
4. Verify half-screen `wx.modelContext.getContext().sendFollowUpMessage()`.
5. Verify any supported half-screen structured input mechanism.
6. Verify `expirePreviousCards` and `expireAllCards`.
7. Force a small component container and verify `NotificationType.Overflow`.
8. Verify ordinary generated-page `wx.reportEvent` or `wx.reportAnalytics`.

Expected: each item contains observed input, observed output, timestamp, and screenshot/log reference. A missing official validator is recorded as `unavailable`, not passed.

- [ ] **Step 5: Update only verified capability fields**

Copy observed results into `platform-capabilities.json`. Keep `status: "blocked"` unless every capability required by the feature being enabled is `verified`. Candidate core development may continue with all capabilities unverified; page-only analytics may not.

- [ ] **Step 6: Run the contract test**

Run:

```powershell
node --test tests/ai-platform-contract.test.js
```

Expected: PASS for either an explicitly blocked record or a fully evidenced record; no empty version/evidence is accepted when status is `verified`.

- [ ] **Step 7: Commit**

```powershell
git add ai-mode/experiments/platform-capabilities.json tests/ai-platform-contract.test.js docs/wechat-ai-mode-runbook.md
git commit -m "Add AI platform capability gate"
```

## Task 1: M1 Deterministic Semantic Recommendation Core

**Files:**
- Create: `ai-mode/shared/recommendation-v2.cjs`
- Create: `tests/ai-recommendation-v2.test.js`
- Modify: `ai-mode/shared/catalog-runtime.cjs`

- [ ] **Step 1: Write failing status, mapping, and explanation tests**

```js
const snapshot = {
  scenario: 'easy',
  preferences: {
    sweetness: 'unspecified',
    sourness: 'low',
    bitterness: 'low',
    body: 'low',
    strength: 'neutral',
  },
};

test('neutral is explicit and unspecified is inactive', () => {
  const value = core.normalizeSnapshot(snapshot);
  assert.deepEqual(value.activeDimensions, [
    'sourness', 'bitterness', 'body', 'strength',
  ]);
  assert.equal(value.numericPreferences.strength, 0);
});

test('product states are not technical failures', () => {
  const result = core.recommend(emptyIntentSnapshot, catalog);
  assert.equal(result.ok, true);
  assert.equal(result.state, 'needs-clarification');
});

test('a single deterministic relaxation is returned', () => {
  const result = core.recommend(conflictSnapshot, conflictCatalog);
  assert.equal(result.state, 'conflict');
  assert.equal(result.relaxation.dimensions.length, 1);
});

test('each explanation entry maps to catalog data and a known template', () => {
  const result = core.recommend(snapshot, catalog);
  assert.equal(core.verifyExplanations(result, catalog).valid, true);
});
```

Add tests for `no-compatible-match`, `empty-catalog`, `internal-error`, invalid enum, missing dimension, and limit values `0, 1, 12, 13, 1.5`.

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
node --test tests/ai-recommendation-v2.test.js
```

Expected: FAIL because the semantic core does not exist.

- [ ] **Step 3: Implement the pure exports**

```js
module.exports = {
  CONTRACT: 'semantic-v2',
  DIMENSIONS,
  PRODUCT_STATES,
  TECHNICAL_FAILURES,
  normalizeSnapshot,
  recommend,
  validateInput,
  verifyExplanations,
};
```

Use:

```js
const DIMENSIONS = ['sweetness', 'sourness', 'bitterness', 'body', 'strength'];
const VALUES = ['low', 'neutral', 'high', 'unspecified'];
const RELAXATION_ORDER = [...DIMENSIONS];
```

`recommend()` returns either:

```js
{ ok: true, state, items, explanation, relaxation }
```

or:

```js
{ ok: false, failureCode }
```

Do not collapse product states into `isError`.

- [ ] **Step 4: Preserve legacy catalog behavior**

Add an optional `activeDimensions` parameter to the catalog runtime without changing the default V1 path. Add candidate-only helpers for compatible candidates and single-dimension relaxation.

- [ ] **Step 5: Run focused parity tests**

Run:

```powershell
node --test tests/ai-recommendation-v2.test.js tests/ai-mode-catalog.test.js
```

Expected: PASS; existing V1 representative ranking remains unchanged.

- [ ] **Step 6: Commit**

```powershell
git add ai-mode/shared/recommendation-v2.cjs ai-mode/shared/catalog-runtime.cjs tests/ai-recommendation-v2.test.js tests/ai-mode-catalog.test.js
git commit -m "Add semantic recommendation core"
```

## Task 2: M1 Safe Flow State, Revision, and Request Idempotence

**Files:**
- Create: `ai-mode/shared/flow-state.cjs`
- Create: `ai-mode/skill/craft-beer-guide/utils/flow-store.js`
- Create: `ai-mode/skill/craft-beer-guide/utils/redacted-logger.js`
- Create: `tests/ai-flow-state.test.js`

- [ ] **Step 1: Write failing safety tests**

Cover:

```js
test('expectedRevision must equal current revision exactly', () => {
  assert.throws(() => flow.assertCurrent(-1), /invalid-revision/);
  assert.throws(() => flow.assertCurrent(0.5), /invalid-revision/);
  assert.throws(() => flow.assertCurrent(1), /future-revision/);
  flow.advance({ expectedRevision: 0, requestId: 'req_1234567890' });
  assert.throws(() => flow.assertCurrent(0), /stale-revision/);
});

test('stale favorite fails before favorite storage write', () => {
  const favoriteStorage = createCountingStorage();
  assert.throws(
    () => mutateFavorite({ expectedRevision: 0, currentRevision: 1, favoriteStorage }),
    /stale-revision/,
  );
  assert.equal(favoriteStorage.writeCount, 0);
});

test('requestId prevents duplicate mutation', () => {
  assert.equal(flow.hasProcessedRequest('req_1234567890'), false);
  flow.commitRequest('req_1234567890');
  assert.equal(flow.hasProcessedRequest('req_1234567890'), true);
});

test('failed favorite does not consume requestId', () => {
  assert.throws(
    () => flow.runFavoriteMutation({
      requestId: 'req_1234567890',
      writeFavorite() {
        throw new Error('storage-failed');
      },
    }),
    /storage-failed/,
  );
  assert.equal(flow.hasProcessedRequest('req_1234567890'), false);
});
```

Also test expired flow, exactly-at-TTL boundary, completed flow, wrong variant, future revision, style not in latest in-memory recommendation, storage throw, and maximum requestIds.

Add concurrency tests:

```js
test('same revision concurrent requests serialize per flow', async () => {
  const results = await Promise.all([
    service.refine({ flowId, expectedRevision: 0, requestId: 'req_aaaaaaaaaa' }),
    service.refine({ flowId, expectedRevision: 0, requestId: 'req_bbbbbbbbbb' }),
  ]);
  assert.equal(results.filter((item) => item.ok).length, 1);
  assert.equal(results.filter((item) => item.failureCode === 'stale-revision').length, 1);
});

test('detail completion and favorite mutation serialize per flow', async () => {
  const results = await Promise.all([
    service.openDetail(detailArgs),
    service.addFavorite(favoriteArgs),
  ]);
  assert.equal(results.filter((item) => item.firstCompletion).length, 1);
  assert.equal(favoriteStorage.writeCount <= 1, true);
});

test('two adjustments cannot both advance the same revision', async () => {
  const results = await Promise.all([
    service.refine(firstAdjustment),
    service.refine(secondAdjustment),
  ]);
  assert.deepEqual(results.map((item) => item.nextRevision).filter(Number.isInteger), [1]);
});
```

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
node --test tests/ai-flow-state.test.js
```

Expected: FAIL because the flow modules do not exist.

- [ ] **Step 3: Implement the storage whitelist**

Persist only:

```js
{
  flowId,
  revision,
  lastActiveAt,
  completed,
  requestIds,
}
```

Reject any serialized record whose keys differ from:

```js
new Set(['flowId', 'revision', 'lastActiveAt', 'completed', 'requestIds'])
```

Do not persist source, createdAt, completionType, snapshot, styleRef, recommendation items, or variant. Variant belongs to the storage namespace.

- [ ] **Step 4: Implement mutation ordering**

Expose:

```js
assertCurrent({ flowId, expectedRevision, variant, now });
hasProcessedRequest({ flowId, requestId });
commitRequest({ flowId, requestId });
advance({ flowId, expectedRevision, requestId });
complete({ flowId, expectedRevision, requestId });
withFlowLock(flowId, synchronousCriticalSection);
```

`hasProcessedRequest` is read-only. The favorite API must call `assertCurrent`, `hasProcessedRequest`, and latest-recommendation validation before favorite storage, then call `commitRequest` and `complete` only after favorite storage succeeds. A failed write leaves the request retryable.

Implement `withFlowLock` as a per-flow Promise queue. The callback must be synchronous: it covers revision/request checks, synchronous `getStorageSync`/`setStorageSync`, request commit, revision update, and completion commit without `await`. Catalog detail lookup may run before lock acquisition, but completion eligibility must be rechecked inside the lock. Document that this gives consistency only inside one Skill JavaScript context and is not cross-context CAS.

- [ ] **Step 5: Add dynamic redacted logger tests**

Invoke the logger with nested snapshots, style refs, user text, and an Error. Assert the captured log object is exactly:

```js
{
  event: 'api-failure',
  apiName: 'addFavoriteBeerStyle',
  failureCode: 'stale-revision',
}
```

Do not rely on source regex alone.

- [ ] **Step 6: Run tests**

Run:

```powershell
node --test tests/ai-flow-state.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add ai-mode/shared/flow-state.cjs ai-mode/skill/craft-beer-guide/utils/flow-store.js ai-mode/skill/craft-beer-guide/utils/redacted-logger.js tests/ai-flow-state.test.js
git commit -m "Add safe AI recommendation flow state"
```

## Task 3: M1 Strict Candidate Skill Contract

**Files:**
- Create: `ai-mode/skill/craft-beer-guide/apis/recommendBeerStylesCandidate.js`
- Create: `ai-mode/skill/craft-beer-guide/SKILL.candidate.md`
- Create: `ai-mode/skill/craft-beer-guide/mcp.candidate.json`
- Create: `tests/ai-recommendation-candidate.test.js`
- Modify: `ai-mode/skill/craft-beer-guide/apis/recommendBeerStyles.js`
- Modify: `ai-mode/skill/craft-beer-guide/apis/getBeerStyleDetail.js`
- Modify: `ai-mode/skill/craft-beer-guide/apis/addFavoriteBeerStyle.js`
- Modify: `ai-mode/skill/craft-beer-guide/index.js`

- [ ] **Step 1: Write failing schema and behavior tests**

Parse `mcp.candidate.json` and assert:

```js
assert.equal(input.additionalProperties, false);
assert.deepEqual(input.required, ['scenario', 'preferences', 'flow']);
assert.deepEqual(
  input.properties.preferences.required,
  ['sweetness', 'sourness', 'bitterness', 'body', 'strength'],
);
assert.equal(input.properties.limit.type, 'integer');
assert.equal(input.properties.limit.minimum, 1);
assert.equal(input.properties.limit.maximum, 12);
assert.equal(continueFlow.properties.expectedRevision.type, 'integer');
assert.equal(continueFlow.properties.expectedRevision.minimum, 0);
assert.match('arf_7f91c4a18e3b', new RegExp(continueFlow.properties.flowId.pattern));
assert.match('req_082b51d447', new RegExp(startFlow.properties.requestId.pattern));
```

Recursively walk every input/output schema node and assert every `type: "object"` has `additionalProperties: false`.

Assert `flow.oneOf` contains exactly two strict branches. The start branch requires `mode` and `requestId` and rejects `flowId`/`expectedRevision`; the continue branch requires `mode`, `flowId`, `expectedRevision`, and `requestId`. Both branches set `additionalProperties: false`.

Add negative schema-validator cases:

- Missing one of the five preference keys.
- Missing top-level flow.
- Continue flow without expectedRevision.
- Negative or fractional expectedRevision.
- limit 0, 13, or fractional.
- Unknown nested preference/flow/output property.
- Start flow containing flowId or expectedRevision.

Execute handlers with stubs and verify:

- First request creates revision 0.
- Refinement requires exact current revision.
- Product states remain successful structured results.
- Empty catalog returns `empty-catalog`.
- stale favorite performs zero favorite writes.
- Detail may return data for stale context but does not call `complete`.
- Completion target must be in the current in-memory recommendation set.
- outputSchema validates every returned shape.

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
node --test tests/ai-recommendation-candidate.test.js
```

Expected: FAIL because Candidate contract and handler do not exist.

- [ ] **Step 3: Implement strict Candidate schemas**

Every object schema must include `additionalProperties: false`. Every returned product state and failure shape must be represented in outputSchema.

Use:

```json
{
  "type": "string",
  "pattern": "^arf_[0-9a-f]{12,32}$"
}
```

and:

```json
{
  "type": "string",
  "pattern": "^req_[0-9a-f]{10,32}$"
}
```

- [ ] **Step 4: Implement the Candidate handler**

The handler order is:

1. Validate input.
2. Resolve/create flow.
3. Enter the per-flow lock for refinements.
4. `assertCurrent` and read-only `hasProcessedRequest`.
5. Run pure recommendation.
6. Store latest recommendation style refs only in module memory for the active Skill context.
7. After successful refinement, `commitRequest` and advance revision within the same lock.
8. Return semantic-v2 structured output.

No analytics call is allowed in Skill code.

- [ ] **Step 5: Implement safe terminal APIs**

`addFavoriteBeerStyle` must call flow assertions before favorite storage. `getBeerStyleDetail` stays read-only and calls completion only when context is current and the style came from the flow's latest recommendation.

- [ ] **Step 6: Run tests**

Run:

```powershell
node --test tests/ai-recommendation-candidate.test.js tests/ai-flow-state.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add ai-mode/skill/craft-beer-guide/apis ai-mode/skill/craft-beer-guide/SKILL.candidate.md ai-mode/skill/craft-beer-guide/mcp.candidate.json ai-mode/skill/craft-beer-guide/index.js tests/ai-recommendation-candidate.test.js
git commit -m "Add semantic candidate Skill contract"
```

## Task 4: M1 Candidate Card and Half-Screen Interaction

**Files:**
- Create: `ai-mode/skill/craft-beer-guide/components/recommendation-v2-card/index.js`
- Create: `ai-mode/skill/craft-beer-guide/components/recommendation-v2-card/index.json`
- Create: `ai-mode/skill/craft-beer-guide/components/recommendation-v2-card/index.wxml`
- Create: `ai-mode/skill/craft-beer-guide/components/recommendation-v2-card/index.wxss`
- Create: `tests/ai-recommendation-components.test.js`
- Modify: `ai-mode/skill/craft-beer-guide/mcp.candidate.json`
- Modify: `ai-mode/detail-pages/taste-refine/index.{js,wxml,wxss}`
- Modify: `ai-mode/detail-pages/style-results/index.js`

- [ ] **Step 1: Write executable component tests**

Instantiate the component definition with stubbed:

- `wx.modelContext.getContext`
- `wx.modelContext.getViewContext`
- `sendFollowUpMessage`
- `expirePreviousCards`
- `openDetailPage`
- `setData`

Verify:

- Each tap reacquires context/viewContext.
- Detail/favorite send the latest revision and fresh requestId.
- `inFlight` blocks a second tap.
- A new result calls `expirePreviousCards`.
- Overflow reduces visible items or opens the half-screen fallback.
- No handler uses cached context.
- Root WXSS has no `height`, `min-height`, or `max-height`.
- No `NotificationType.Expire` assumption exists.
- Candidate MCP component entry contains:

```json
{
  "path": "components/recommendation-v2-card/index",
  "expirable": true,
  "expiredText": "推荐条件已更新，请使用最新结果"
}
```

- The generated Candidate `mcp.json` preserves those exact fields.
- An expired visual card still cannot bypass revision checks; invoking its old handler reaches `stale-revision` and performs no favorite write.

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
node --test tests/ai-recommendation-components.test.js
```

Expected: FAIL because the Candidate component does not exist.

- [ ] **Step 3: Implement adaptive component behavior**

Register result and overflow listeners with local variables during `created`. In methods use:

```js
wx.modelContext.getContext(this).sendFollowUpMessage({ content });
wx.modelContext.getViewContext(this).openDetailPage({ url });
wx.modelContext.getViewContext(this).expirePreviousCards({
  componentPaths: [
    'skills/craft-beer-guide/components/recommendation-v2-card/index',
  ],
});
```

Do not cache active contexts for later calls.

- [ ] **Step 4: Remove snapshot URL transport**

The detail-page URL must not contain a preference snapshot or style data.

If `platform-capabilities.json` verifies a supported half-screen input method, use only that method. Otherwise:

- Open an unprefilled adjustment page.
- Mark the page as `prefillAvailable: false`.
- Keep conversational refinement as the primary multi-turn path.

- [ ] **Step 5: Replace half-screen return API**

Use:

```js
const ctx = wx.modelContext.getContext();
ctx.sendFollowUpMessage({
  content: [
    { type: 'text', text: followUpText },
    {
      type: 'api/call',
      data: {
        name: 'recommendBeerStyles',
        arguments: candidateArguments,
      },
    },
  ],
});
```

Do not use `wx.navigateBackAgent`.

- [ ] **Step 6: Run focused tests**

Run:

```powershell
node --test tests/ai-recommendation-components.test.js tests/ai-recommendation-candidate.test.js tests/ai-mode-ui.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add ai-mode/skill/craft-beer-guide/components/recommendation-v2-card ai-mode/skill/craft-beer-guide/mcp.candidate.json ai-mode/detail-pages tests/ai-recommendation-components.test.js tests/ai-mode-ui.test.js
git commit -m "Add adaptive candidate recommendation UI"
```

## Task 5: M1 High-Risk Automated Gate

**Files:**
- Modify: `tests/ai-recommendation-v2.test.js`
- Modify: `tests/ai-flow-state.test.js`
- Modify: `tests/ai-recommendation-candidate.test.js`
- Modify: `tests/ai-recommendation-components.test.js`
- Modify: `package.json`

- [ ] **Step 1: Add the 24-case high-risk matrix**

The exact automated cases are:

```text
CORE-01 all unspecified
CORE-02 explicit neutral
CORE-03 single relaxation
CORE-04 no compatible match
CORE-05 empty catalog
CORE-06 internal error
CORE-07 limit 1
CORE-08 limit 12
CORE-09 limit 0
CORE-10 limit 13
FLOW-01 stale revision
FLOW-02 future revision
FLOW-03 non-integer revision
FLOW-04 negative revision
FLOW-05 TTL minus 1 ms
FLOW-06 TTL exact boundary
FLOW-07 completed flow
FLOW-08 wrong variant
FLOW-09 duplicate requestId
FLOW-10 storage throw
SIDE-01 stale favorite zero writes
SIDE-02 style outside recommendation
UI-01 double tap inFlight
UI-02 Overflow fallback
```

- [ ] **Step 2: Add the focused command**

```json
"test:ai-recommendation-m1": "node --test tests/ai-recommendation-v2.test.js tests/ai-flow-state.test.js tests/ai-recommendation-candidate.test.js tests/ai-recommendation-components.test.js"
```

- [ ] **Step 3: Run the M1 gate**

Run:

```powershell
npm run test:ai-recommendation-m1
```

Expected: PASS with all 24 named cases and no skipped tests.

- [ ] **Step 4: Run regression**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add tests/ai-recommendation-v2.test.js tests/ai-flow-state.test.js tests/ai-recommendation-candidate.test.js tests/ai-recommendation-components.test.js package.json
git commit -m "Add candidate high-risk verification"
```

## Task 6: M2 Legacy Control and Comparable Dual Build

**Files:**
- Create: `ai-mode/experiments/ai-recommendation-quality-v2.json`
- Create: `ai-mode/skill/craft-beer-guide/SKILL.control.md`
- Create: `ai-mode/skill/craft-beer-guide/mcp.control.json`
- Create: `scripts/build_ai_mode_experiment.cjs`
- Create: `tests/ai-recommendation-control.test.js`
- Create: `tests/ai-recommendation-build.test.js`
- Modify: `scripts/build_ai_mode_project.cjs`
- Modify: `scripts/check_ai_mode_project.cjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing Control full-flow tests**

Test the current numeric request, existing style-list card, existing adjustment page semantics, detail, and favorite path. Assert:

```js
assert.equal(controlManifest.recommendationContract, 'legacy-v1');
assert.deepEqual(bitternessEnum, [-1, 0, 1]);
assert.equal(controlResult.structuredContent.preferences.bitterness, 0);
assert.equal(
  Object.hasOwn(controlResult.structuredContent, 'semanticInterpretation'),
  false,
);
```

Execute current component handlers with stubs so Control is not validated by regex only.

- [ ] **Step 2: Write failing buildContext tests**

Require:

```js
{
  experimentId,
  experimentBuildId,
  variant,
  recommendationContract,
  telemetryMode,
  sourceCommit,
  sourceTreeFingerprint,
  catalogFingerprint,
  dirty,
  outputRoot,
  miniprogramRoot,
  knowledgeOutputRoot,
  manifestPath,
  lockPath,
  fingerprintPath,
}
```

Assert:

- All build inputs participate in the fingerprint.
- Changing variant, contract, telemetry mode, experiment config, platform capability config, or template changes the fingerprint.
- Formal experiment build fails on a dirty worktree.
- Development build records `dirty: true`.
- cache keys differ between variants.
- `check_ai_mode_project.cjs --output-root=... --no-build` checks exactly that directory.
- Every build helper receives buildContext and source inputs explicitly; no helper reads module-level output path constants.
- Building Candidate does not change file lists, mtimes, or hashes under the Control output directory.
- Reusing one output directory with a different variant invalidates the previous fingerprint and rebuilds instead of returning a cache hit.

- [ ] **Step 3: Run and verify RED**

Run:

```powershell
node --test tests/ai-recommendation-control.test.js tests/ai-recommendation-build.test.js
```

Expected: FAIL because versioned Control and buildContext do not exist.

- [ ] **Step 4: Implement versioned buildContext**

Parse all CLI flags once:

```js
const buildContext = {
  experimentId,
  experimentBuildId,
  variant,
  recommendationContract,
  telemetryMode,
  sourceCommit,
  sourceTreeFingerprint,
  catalogFingerprint,
  dirty,
  outputRoot,
  miniprogramRoot: path.join(outputRoot, 'miniprogram'),
  knowledgeOutputRoot: path.join(outputRoot, 'knowledge'),
  manifestPath: path.join(outputRoot, 'build-manifest.json'),
  lockPath: path.join(outputRoot, '.build.lock'),
  fingerprintPath: path.join(outputRoot, '.build-fingerprint'),
};
```

Pass this object to every build phase. It is the only source of output paths. Do not read process arguments again in child helpers and remove module-level output-root constants.

- [ ] **Step 5: Implement exact checker flags**

Supported commands:

```powershell
node scripts/check_ai_mode_project.cjs --output-root=artifacts/ai-mode-experiment/control --no-build
node scripts/check_ai_mode_project.cjs --output-root=artifacts/ai-mode-experiment/candidate --no-build
```

`--no-build` must not run `build_ai_mode_project.cjs`.

- [ ] **Step 6: Implement the dual builder**

Formal command:

```powershell
npm run build:ai-experiment
```

It must fail unless `git status --porcelain` is empty. It generates both variants with a shared experimentBuildId and matching source/catalog fingerprints.

Development command:

```powershell
npm run build:ai-experiment:dev
```

It may use a dirty tree but writes `dirty: true`; its artifacts cannot satisfy release checks.

- [ ] **Step 7: Run tests**

Run:

```powershell
node --test tests/ai-recommendation-control.test.js tests/ai-recommendation-build.test.js
npm run build:ai-experiment:dev
```

Expected: PASS; both development variants are generated with separate cache keys.

- [ ] **Step 8: Commit**

```powershell
git add ai-mode/experiments/ai-recommendation-quality-v2.json ai-mode/skill/craft-beer-guide/SKILL.control.md ai-mode/skill/craft-beer-guide/mcp.control.json scripts/build_ai_mode_project.cjs scripts/build_ai_mode_experiment.cjs scripts/check_ai_mode_project.cjs tests/ai-recommendation-control.test.js tests/ai-recommendation-build.test.js package.json
git commit -m "Add comparable control and candidate builds"
```

## Task 7: M2 Sixty Platform Cases, Strict Traces, and Scoring

**Files:**
- Create: `tests/fixtures/ai-recommendation-v2/cases.json`
- Create: `tests/fixtures/ai-recommendation-v2/trace-schema.json`
- Create: `scripts/score_ai_recommendation_traces.cjs`
- Create: `tests/ai-recommendation-trace.test.js`
- Modify: `package.json`
- Modify: `docs/wechat-ai-mode-runbook.md`

- [ ] **Step 1: Write failing fixture tests**

Assert:

```js
assert.equal(cases.length, 60);
assert.equal(new Set(cases.map((item) => item.id)).size, 60);
assert.ok(cases.every((item) => item.expectedByVariant.control));
assert.ok(cases.every((item) => item.expectedByVariant.candidate));
```

The 60 cases are natural-language platform scenarios only:

- 12 explicit preference/scenario.
- 10 ambiguous/clarification.
- 14 multi-turn refinement.
- 8 conflict/no-compatible/stale user journeys.
- 8 routing and terminal actions.
- 8 duplicate, invalid, or recovery journeys expressible through platform interaction.

Storage throws, empty catalog, and exact TTL boundaries remain unit tests, not platform cases.

- [ ] **Step 2: Define strict trace schema**

Top-level and every nested object use:

```json
"additionalProperties": false
```

Required trace fields:

```json
{
  "caseId": "REF-01",
  "experimentId": "ai-rec-quality-v2-20260612",
  "experimentBuildId": "ai-rec-quality-v2-20260612T090000Z",
  "sourceTreeFingerprint": "sha256:75c58392adce00f10f88f88f0f76125bf3f7da74fd13d3559f57f9eb6f4f11e9",
  "catalogFingerprint": "sha256:2cb25b14d801d7f4d8f733f4caecb3a780efddcdbccb8e0778b43a7f5487c2a6",
  "variant": "control",
  "recommendationContract": "legacy-v1",
  "testerCode": "T-C-001",
  "turns": [
    {
      "turnId": "REF-01-U1",
      "role": "user",
      "content": "想要清爽、低苦度的啤酒"
    },
    {
      "turnId": "REF-01-A1",
      "role": "assistant",
      "content": "根据你的偏好，我会优先推荐清爽、低苦度的风格。"
    }
  ],
  "assistantOutputs": [
    {
      "turnId": "REF-01-A1",
      "content": "根据你的偏好，我会优先推荐清爽、低苦度的风格。"
    }
  ],
  "apiCalls": [],
  "cardActions": [],
  "started": true,
  "shown": true,
  "completed": false
}
```

Every fixture turn has a stable `turnId`, a `role`, and content. The schema includes the complete ordered `turns` list. `assistantOutputs` contains objects:

```json
{
  "turnId": "REF-01-A2",
  "content": "完整 assistant 输出"
}
```

The expected assistant turn IDs are every `turns[].turnId` whose role is `assistant`. `assistantOutputs` must match that list one-for-one and in the same order. It is required and non-empty. Do not use an optional manually curated `assistantClaims` field.

- [ ] **Step 3: Write failing scorer tests**

The scorer must reject:

- Missing or duplicate case IDs.
- A case not appearing exactly once per variant.
- Empty assistant output.
- Any omitted expected assistant turn.
- Duplicate assistant turnId.
- Assistant outputs in a different order from the fixture turn list.
- Unknown assistant turnId.
- Wrong build/catalog/variant/contract fingerprint.
- `additionalProperties`.
- A Candidate trace scored with Control expectations.
- Unsupported factual text.

Add this explicit regression test:

```js
test('omitting any assistant turn fails trace scoring', () => {
  const trace = perfectTrace();
  trace.assistantOutputs.splice(1, 1);
  assert.throws(() => scoreTrace(trace), /missing-assistant-turn/);
});
```

It separately reports:

```json
{
  "common": {},
  "control": {},
  "candidate": {},
  "northStar": {
    "completedOverStarted": 0,
    "completedOverShown": 0
  }
}
```

- [ ] **Step 4: Run and verify RED**

Run:

```powershell
node --test tests/ai-recommendation-trace.test.js
```

Expected: FAIL because fixtures, schema, and scorer do not exist.

- [ ] **Step 5: Implement the scorer**

CLI:

```powershell
node scripts/score_ai_recommendation_traces.cjs --control=artifacts/ai-evaluation-traces/control.json --candidate=artifacts/ai-evaluation-traces/candidate.json
```

It must:

1. Validate both files against the strict schema.
2. Require all 60 case IDs exactly once per variant.
3. Require matching build/source/catalog fingerprints.
4. Score `expectedByVariant`.
5. Derive expected assistant turns from the ordered turn list and require exact turnId correspondence.
6. Scan complete assistant outputs against catalog-backed facts and fixture assertions.
7. Calculate `completed/started` and `completed/shown`.
8. Exit non-zero on any trace completeness or quality gate failure.

- [ ] **Step 6: Add trace retention checks**

Run traces only under:

```text
artifacts/ai-evaluation-traces/
```

The scorer rejects files older than 30 days. The runbook requires deletion after 30 days and forbids real-user conversations.

Synthetic test traces must set `traceSource: "synthetic"`. Real DevTools/platform captures must set `traceSource: "wechat-platform"`. The scorer may score either; the release audit accepts only `wechat-platform`.

- [ ] **Step 7: Add the platform execution gate**

For each variant:

1. Import its exact generated project.
2. Execute all 60 repository-defined synthetic-utterance cases on the real platform.
3. Save one trace per case.
4. Merge traces without changing assistant output.
5. Run the scorer command.

Expected: the utterances remain synthetic test data, but the captured traces are real platform traces marked `traceSource: "wechat-platform"`. No platform acceptance claim is allowed until both real trace files exist and the scorer exits 0.

- [ ] **Step 8: Run tests**

Run:

```powershell
node --test tests/ai-recommendation-trace.test.js
```

Expected: PASS using synthetic test traces. This does not substitute for the platform gate.

- [ ] **Step 9: Commit**

```powershell
git add tests/fixtures/ai-recommendation-v2 scripts/score_ai_recommendation_traces.cjs tests/ai-recommendation-trace.test.js package.json docs/wechat-ai-mode-runbook.md
git commit -m "Add strict AI recommendation trace evaluation"
```

## Task 8: M3 Optional Ordinary-Page Analytics

**Files:**
- Create: `ai-mode/page-runtime/ai-recommendation-telemetry.js`
- Create: `tests/ai-page-only-telemetry.test.js`
- Modify: `scripts/build_ai_mode_project.cjs`
- Modify: `scripts/check_ai_mode_project.cjs`

- [ ] **Step 1: Write failing blocked-mode tests**

Assert:

- `off` creates no pending queue and performs no report call.
- `page-only` build fails unless `ordinaryPageAnalytics.status === "verified"`.
- Generated Skill and atomic components contain no `reportEvent` or `reportAnalytics`.
- Production `miniprogram/utils/telemetry.js` hash is unchanged before/after build.
- Generated `miniprogram/utils/telemetry.js` equals production source.
- The new adapter path is exactly `miniprogram/utils/ai-recommendation-telemetry.js`.

- [ ] **Step 2: Write strict queue tests**

Deserialize queue state and assert exact fields:

```js
{
  experimentId,
  variant,
  environment,
  buildId,
  events,
}
```

Each event allows only:

```js
{
  eventName,
  pageSource,
  timestamp,
}
```

Test:

- Maximum 50 events.
- Maximum serialized size 32 KB.
- TTL 24 hours.
- Success deletes the event immediately.
- Build/environment mismatch drops the record.
- Only the same environment retries.
- No `flowId`, preferences, style, query, user text, or nested extra fields.
- `prunePendingQueue` is invoked at adapter initialization.
- It is invoked immediately after reading persisted state.
- It is invoked before every storage write.
- It is invoked before every flush.
- Each invocation enforces TTL, 50-event count, and 32 KB serialized size together.

- [ ] **Step 3: Run and verify RED**

Run:

```powershell
node --test tests/ai-page-only-telemetry.test.js
```

Expected: FAIL because the adapter does not exist.

- [ ] **Step 4: Implement ordinary-page-only adapter**

The module may call `wx.reportEvent` or `wx.reportAnalytics` only in generated ordinary pages and only when capability config is verified. It must never be copied into Skill or component directories.

Supported auxiliary events are:

```text
ai_entry_opened
ai_related_page_opened
```

These are not `started`, `shown`, or `completed`.

- [ ] **Step 5: Remove unnecessary flow query routing**

If no ordinary page requires online completion linkage, do not add flow query parameters. Page metadata and overlays may pass only page source.

- [ ] **Step 6: Run tests**

Run:

```powershell
node --test tests/ai-page-only-telemetry.test.js tests/ai-recommendation-build.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add ai-mode/page-runtime/ai-recommendation-telemetry.js scripts/build_ai_mode_project.cjs scripts/check_ai_mode_project.cjs tests/ai-page-only-telemetry.test.js
git commit -m "Add optional page-only AI analytics"
```

## Task 9: Final Validation, Controlled-Comparison Protocol, and Release Audit

**Files:**
- Create: `scripts/audit_ai_recommendation_release.cjs`
- Create: `tests/fixtures/ai-recommendation-v2/operations-audit-schema.json`
- Create: `tests/ai-recommendation-release-audit.test.js`
- Modify: `docs/wechat-ai-mode-runbook.md`
- Modify: `docs/release-checklist.md`
- Modify: `tests/ai-recommendation-build.test.js`
- Modify: `package.json`
- Modify only other files required by a newly added regression test.

- [ ] **Step 1: Document the directional pilot**

The runbook must require:

- At least 40 independent testers per variant.
- At most 5 counted started flows per tester.
- Fixed anonymous tester codes and assignment roster.
- Manual audit of cross-variant contamination.
- 200 flows/variant is directional only and cannot decide a winner.

Define the operations audit:

```text
N_all   = unique testerCode count with at least one valid executed platform case
N_cross = unique testerCode count whose observedVariants contains both control and candidate
contaminationRate = N_cross / N_all
```

The threshold is `contaminationRate <= 0.05`; `N_all = 0` is invalid.

The Experiment Operations Owner maintains `artifacts/ai-evaluation-traces/operations-audit.json`; the Test Manager reviews it. The strict schema requires:

```text
top level:
experimentId, experimentBuildId, rosterOwner, reviewer, auditAt,
windowStartedAt, windowEndedAt, testers

each testers[] item:
testerCode, assignedVariant, observedVariants, executedCaseIds,
countedStartedFlows
```

Missing/invalid audit data or contamination above 5% permits only a directional report.

- [ ] **Step 2: Document formal power analysis**

Before formal comparison, record:

- Pilot baseline completion rate.
- Minimum detectable improvement.
- Alpha and power.
- Required independent testers.
- At most 3 counted started flows per tester.
- Tester-clustered analysis or tester-level aggregation.
- Preselected two-proportion test or difference confidence interval.

Only a passing preselected test or confidence-interval lower bound greater than zero permits the statement “Candidate was better in the controlled experience.”

- [ ] **Step 3: Add final static and dynamic release assertions**

Tests must verify:

- No analytics identifiers in Skill/component source.
- No `navigateBackAgent`.
- No cached context used for active calls.
- No root fixed height/min/max height in new component.
- No `NotificationType.Expire` assumption.
- No snapshot in URL query.
- MCP strict schemas and output alignment.
- Production telemetry file unchanged.
- Both variants have complete platform traces before release status can be `platform-accepted`.
- Candidate generated MCP declares exact `expirable` and `expiredText`.

- [ ] **Step 4: Write the single release-audit command and failing tests**

Add:

```json
"audit:ai-recommendation-release": "node scripts/audit_ai_recommendation_release.cjs"
```

The evidence paths are fixed:

- `artifacts/ai-mode-platform-probe/probe-record.json`
- `artifacts/ai-mode-platform-probe/validator-control.json`
- `artifacts/ai-mode-platform-probe/validator-candidate.json`

`tests/ai-recommendation-release-audit.test.js` must prove the command exits non-zero for each independent defect:

- Missing either platform trace.
- A trace with 59 or 61 cases.
- Duplicate/missing case ID.
- Missing, duplicate, reordered, unknown, or empty assistant turn.
- `traceSource: "synthetic"`.
- Variant/build/catalog/source/contract fingerprint mismatch.
- Missing official validator evidence.
- Missing DevTools capability evidence.
- Dirty worktree.
- Missing or invalid operations audit.
- `contaminationRate > 0.05`.

The passing fixture uses temporary test directories and an injected clean-worktree result; it must not accept repository synthetic traces as platform evidence.

- [ ] **Step 5: Implement the release auditor**

`scripts/audit_ai_recommendation_release.cjs` performs, in order:

1. Require a clean `git status --porcelain`.
2. Load platform capability/DevTools and official validator evidence.
3. Load Control and Candidate traces and require `traceSource: "wechat-platform"`.
4. Run the strict trace scorer.
5. Require 60 case IDs exactly once per variant and complete ordered assistant turns.
6. Compare variant/build/catalog/source/contract fingerprints.
7. Validate `operations-audit.json`, calculate `N_all`, `N_cross`, and contamination rate.
8. Exit non-zero on any failure; print one machine-readable JSON result on success.

No alternate script may write a release-passed marker.

- [ ] **Step 6: Run the M1 gate**

Run:

```powershell
npm run test:ai-recommendation-m1
```

Expected: PASS.

- [ ] **Step 7: Run all local tests**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 8: Build both development variants**

Run:

```powershell
npm run build:ai-experiment:dev
node scripts/check_ai_mode_project.cjs --output-root=artifacts/ai-mode-experiment/control --no-build
node scripts/check_ai_mode_project.cjs --output-root=artifacts/ai-mode-experiment/candidate --no-build
```

Expected: both pass local checks; manifests are marked dirty if the worktree is dirty and therefore are not release artifacts.

- [ ] **Step 9: Run official validator**

Run the official `wxa-skills-validate` workflow against both generated Skills in the supported official environment.

Expected: both pass. If the validator is unavailable, release remains blocked; do not substitute local checks.

- [ ] **Step 10: Run real platform trace scoring**

Run:

```powershell
node scripts/score_ai_recommendation_traces.cjs --control=artifacts/ai-evaluation-traces/control.json --candidate=artifacts/ai-evaluation-traces/candidate.json
```

Expected:

- 60 case IDs exactly once per variant.
- matching experiment/build/source/catalog fingerprints.
- correct variant and contract.
- non-empty complete assistant output.
- all common and variant-specific gates pass.

Without these real traces, report “local implementation verified; platform acceptance pending.”

- [ ] **Step 11: Run the single release audit**

Run:

```powershell
npm run audit:ai-recommendation-release
```

Expected: exit 0 only with clean source, both complete real platform traces, official evidence, matching fingerprints, and a passing operations pollution audit. This command is the only release-acceptance signal.

- [ ] **Step 12: Verify source isolation and privacy**

Run:

```powershell
rg -n "reportEvent|reportAnalytics" ai-mode/skill ai-mode/shared
rg -n "navigateBackAgent|NotificationType\\.Expire|this\\._modelCtx|this\\._viewCtx" ai-mode
rg -n "snapshot=.*|preferences=.*" ai-mode
rg -n "openAgent|craft-beer-guide|ai-recommendation-telemetry" miniprogram
git diff --check
git status --short
```

Expected:

- No report API in Skill/shared modules.
- No forbidden half-screen or cached active-context pattern.
- No snapshot/preference URL transport.
- No AI beta source in production `miniprogram/`.
- `git diff --check` exits 0.

- [ ] **Step 13: Route failures to their owning task**

For any failure, add a focused regression test in the owning task, implement the smallest fix, rerun that task and the final audit. Do not create a broad catch-all commit.
