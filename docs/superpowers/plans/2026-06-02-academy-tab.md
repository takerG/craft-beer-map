# Academy Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the new 「学院」 mini program tab with interactive craft beer education content managed through followAI-style content folders.

**Architecture:** `academy-sites/` stores source content as `meta.json` plus `content.json`. `scripts/build_academy_sites.cjs` generates `miniprogram/data/academy-sites.js`, while `miniprogram/utils/academy-model.js` exposes lightweight home data and full article data. Mini program pages render a tab home and a generic interactive article host.

**Tech Stack:** WeChat Mini Program WXML/WXSS/JS, Node.js test runner, Node.js content build script.

---

### Task 1: Catalog Tests

**Files:**
- Create: `tests/academy-model.test.js`
- Modify: `tests/miniprogram-structure.test.js`

- [x] Write tests for academy content folders, generated catalog behavior, tab registration, navigation helpers, share handlers, telemetry, and tap feedback.
- [x] Run `npm test` and verify the new tests fail because academy files do not exist.

### Task 2: Content Source And Model

**Files:**
- Create: `academy-sites/order.json`
- Create: `academy-sites/*/meta.json`
- Create: `academy-sites/*/content.json`
- Create: `scripts/build_academy_sites.cjs`
- Create: `miniprogram/data/academy-sites.js`
- Create: `miniprogram/utils/academy-model.js`

- [x] Add three initial academy contents: IPA family map, Ale vs Lager, and flavor radar basics.
- [x] Add a build script that validates source metadata and writes the mini program data module.
- [x] Add model functions for home summaries and article details with related BJCP or extension style resolution.
- [x] Run `node --test tests/academy-model.test.js`.

### Task 3: Mini Program Pages

**Files:**
- Create: `miniprogram/pages/academy/index.*`
- Create: `miniprogram/pages/academy-article/index.*`

- [x] Build the academy tab home with hero, featured content, learning tracks, and tool entry.
- [x] Build the article host page with scale, card, comparison, quiz, and related style sections.
- [x] Use guarded navigation helpers and telemetry events.

### Task 4: App Wiring

**Files:**
- Modify: `miniprogram/app.json`
- Create: `miniprogram/assets/tabbar/academy.png`
- Create: `miniprogram/assets/tabbar/academy-active.png`
- Modify: `package.json`
- Create: `docs/academy.md`

- [x] Add academy pages to `app.json`.
- [x] Add the academy tab as a bottom tab named 「学院」.
- [x] Generate lightweight PNG tab icons.
- [x] Add `build:academy` and chain it from `build:mini-data`.
- [x] Document how to add future academy content.

### Task 5: Verification

**Files:**
- Verify all changed files.

- [x] Run `node --test`.
- [x] Run `node scripts/build_academy_sites.cjs`.
- [x] Inspect `git diff --stat` and `git status --short`.
