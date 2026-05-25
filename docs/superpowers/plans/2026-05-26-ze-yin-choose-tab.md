# Ze Yin Choose Tab Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a “择饮” bottom tab that filters BJCP beer styles by explicit three-state taste dimensions and presents the same results through a switchable visual explanation area plus fixed result cards.

**Architecture:** Add `taste_profile` to every source style and expose focused model APIs from `beer-model.js`. The new `pages/choose/index` page owns UI state, calls the model for matches, renders a top visual swiper-like region for flavor wheel/radar/star views, and keeps the result list fixed below it.

**Tech Stack:** WeChat Mini Program native WXML/WXSS/JS, existing Node test runner, generated `miniprogram/data/beer-data.js`.

---

## Chunk 1: Data And Model

**Files:**
- Modify: `tests/bjcp-data.test.js`
- Modify: `tests/miniprogram-model.test.js`
- Modify: `data/beer-data-source.json`
- Modify: `miniprogram/utils/beer-model.js`
- Generated: `miniprogram/data/beer-data.js`

- [ ] Write failing tests that every BJCP style has `taste_profile` values for each filter dimension.
- [ ] Write failing tests for `getTasteFilters()` and `getTasteMatches()` returning lightweight, scored summaries.
- [ ] Add `taste_profile` data to all source styles.
- [ ] Add model constants and matching logic.
- [ ] Rebuild mini-program data and verify model/data tests pass.

## Chunk 2: Mini Program Page

**Files:**
- Create: `miniprogram/pages/choose/index.js`
- Create: `miniprogram/pages/choose/index.json`
- Create: `miniprogram/pages/choose/index.wxml`
- Create: `miniprogram/pages/choose/index.wxss`
- Modify: `miniprogram/app.json`
- Add/copy: `miniprogram/assets/tabbar/choose.png`
- Add/copy: `miniprogram/assets/tabbar/choose-active.png`
- Modify: `tests/miniprogram-structure.test.js`

- [ ] Write failing structure tests for the declared page, tab label, share handler, telemetry, guarded navigation, and result/visual regions.
- [ ] Implement the page with three-state filter controls, a top switchable visual region, and fixed result cards.
- [ ] Add the tab bar entry and lightweight local PNG icons.
- [ ] Verify full test suite passes and inspect WXML/WXSS for unstable layout features.
