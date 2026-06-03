# Academy Article Experiences Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic academy article module renderer with distinct front-end experiences for each article.

**Architecture:** `academy-model.js` keeps resolving article metadata and related styles, but also exposes an `experienceKey` and precomputed booleans for WXML routing. `subpages/academy-article` keeps loading, sharing, not-found, hero, and related-style sections as shared chrome; each article body is rendered by a slug-specific WXML branch and interaction handler.

**Tech Stack:** WeChat Mini Program WXML/WXSS/JS, Node.js test runner, existing academy content data.

---

### Task 1: Regression Tests

**Files:**
- Modify: `tests/academy-model.test.js`
- Modify: `tests/miniprogram-structure.test.js`

- [x] Add model assertions for `experienceKey` and slug-specific booleans.
- [x] Add structure assertions that the article page no longer iterates `article.modules`.
- [x] Add structure assertions for three distinct experience containers and handlers.
- [x] Run targeted tests and confirm they fail before implementation.

### Task 2: Model Experience Routing

**Files:**
- Modify: `miniprogram/utils/academy-model.js`

- [x] Add `experienceKey` mapping from article slug.
- [x] Add `isIpaMapExperience`, `isAleLagerExperience`, and `isFlavorRadarExperience`.
- [x] Keep `modules` available as source data but stop depending on generic module flags for article rendering.
- [x] Run `node --test tests/academy-model.test.js`.

### Task 3: Article Page Experiences

**Files:**
- Modify: `miniprogram/subpages/academy-article/index.js`
- Modify: `miniprogram/subpages/academy-article/index.wxml`
- Modify: `miniprogram/subpages/academy-article/index.wxss`

- [x] Remove module tab selection and generic card/scale/comparison/quiz rendering from WXML.
- [x] Build an IPA map experience with selectable branch nodes and axis copy.
- [x] Build an Ale vs Lager dual-path experience with selectable path and process timeline.
- [x] Build a flavor radar experience with selectable source sectors and term examples.
- [x] Track experience interactions with telemetry events.

### Task 4: Verification

**Files:**
- Verify all changed files.

- [x] Run targeted academy tests.
- [x] Run `node --test`.
- [x] Inspect `git diff --stat` and `git status --short`.
