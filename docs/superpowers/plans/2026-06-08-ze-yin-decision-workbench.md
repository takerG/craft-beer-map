# Ze Yin Decision Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the choose tab into a faster "tonight decision assistant" with scenario presets, retained taste controls, one primary recommendation, two alternatives, and collapsed professional reasoning.

**Architecture:** `miniprogram/pages/choose/index.js` keeps page-local scene presets and maps them to the existing five taste filters. The existing taste matching model remains the source of truth; the page derives `primaryPick` and `alternativeResults` from the same match list. WXML/WXSS reorganize the current visual explanation into a collapsed section so the first screen focuses on decision-making.

**Tech Stack:** WeChat Mini Program WXML/WXSS/JS, existing `node --test` structure checks.

---

### Task 1: Structure Tests

**Files:**
- Modify: `tests/miniprogram-structure.test.js`

- [ ] Add assertions that the choose page declares scene presets, scene tap telemetry, primary/alternative result fields, and a recommendation explanation toggle.
- [ ] Run `node --test tests/miniprogram-structure.test.js` and confirm the new test fails before implementation.

### Task 2: Decision Workbench State

**Files:**
- Modify: `miniprogram/pages/choose/index.js`

- [ ] Add scene preset constants for `easy`, `meal`, `bold`, and `new`.
- [ ] Add `activeSceneId`, `primaryPick`, `alternativeResults`, `hasAlternatives`, `showExplanation`, and derived explanation copy to page data.
- [ ] Implement `changeScene()` so a scene sets the existing five-filter state and refreshes matches.
- [ ] Implement `toggleExplanation()` to show or hide the existing visual explanations.

### Task 3: Decision Workbench Template

**Files:**
- Modify: `miniprogram/pages/choose/index.wxml`

- [ ] Add the scene grid above taste filters.
- [ ] Keep the existing five filter rows visible.
- [ ] Replace the full result list with a primary recommendation card and two alternative cards.
- [ ] Move the visual tabs/swiper inside a `why-recommendation` section controlled by `showExplanation`.

### Task 4: Professional Styling

**Files:**
- Modify: `miniprogram/pages/choose/index.wxss`

- [ ] Style the scene grid, primary card, alternative cards, and explanation toggle using the existing dark product design language.
- [ ] Reduce the visual explanation's first-screen weight while preserving chart readability when expanded.
- [ ] Ensure buttons and text have stable dimensions and no cramped mobile wrapping.

### Task 5: Verification

**Files:**
- Test: `tests/miniprogram-structure.test.js`
- Test: `tests/miniprogram-model.test.js`
- Test: `tests/taste-visuals.test.js`

- [ ] Run `node --test tests/miniprogram-structure.test.js`.
- [ ] Run `node --test tests/miniprogram-model.test.js tests/taste-visuals.test.js`.
- [ ] Review `git diff -- miniprogram/pages/choose/index.js miniprogram/pages/choose/index.wxml miniprogram/pages/choose/index.wxss tests/miniprogram-structure.test.js`.
