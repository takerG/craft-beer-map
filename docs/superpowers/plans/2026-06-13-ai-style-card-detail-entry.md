# AI Style Card Detail Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the WeChat AI style detail card's follow-up button with a button that opens the matching existing mini program style detail page.

**Architecture:** Keep the atomic component's declared `relatedPage` and dynamic query setup. Add a dedicated `onTapDetail` handler that trusts only `style.styleRef`, selects the BJCP or extension route from `styleRef.kind`, URL-encodes the ID, and opens the page with the AI view context's `openDetailPage` API.

**Tech Stack:** WeChat Mini Program atomic components, JavaScript, WXML, Node.js built-in test runner.

---

### Task 1: Add the component contract regression test

**Files:**
- Modify: `tests/ai-mode-components.test.js`

- [x] **Step 1: Write the failing test**

Extend the existing style detail card test to read both component copies and require:

```js
const detailComponentRoots = [
  path.join(root, 'ai-mode', 'skill', 'craft-beer-guide', 'components', 'style-detail-card'),
  path.join(skillRoot, 'components', 'style-detail-card'),
];

detailComponentRoots.forEach((componentRoot) => {
  const componentSource = fs.readFileSync(path.join(componentRoot, 'index.js'), 'utf8');
  const componentTemplate = fs.readFileSync(path.join(componentRoot, 'index.wxml'), 'utf8');

  assert.match(componentSource, /onTapDetail\(\)/);
  assert.match(componentSource, /styleRef\.kind === 'extension'/);
  assert.match(componentSource, /\/subpages\/extension-style\/index/);
  assert.match(componentSource, /\/subpages\/style\/index/);
  assert.match(
    componentSource,
    /openDetailPage\(\{\s*url:\s*`\$\{route\}\?styleId=\$\{encodeURIComponent\(styleRef\.id\)\}`/,
  );
  assert.match(componentTemplate, /bindtap="onTapDetail"/);
  assert.match(componentTemplate, />查看完整详情<\/view>/);
});
```

- [x] **Step 2: Run the test to verify it fails**

Run:

```powershell
node --test tests/ai-mode-components.test.js
```

Expected: FAIL because `onTapDetail`, `openDetailPage`, and the new button text are not present.

### Task 2: Implement the detail-page action

**Files:**
- Modify: `ai-mode/skill/craft-beer-guide/components/style-detail-card/index.js`
- Modify: `ai-mode/skill/craft-beer-guide/components/style-detail-card/index.wxml`
- Modify: `ai-mode/skill/craft-beer-guide/components/style-detail-card/index.wxss`
- Modify: `skills/craft-beer-guide/components/style-detail-card/index.js`
- Modify: `skills/craft-beer-guide/components/style-detail-card/index.wxml`

- [x] **Step 1: Replace the follow-up handler**

In both `index.js` files, replace `onTapQuestion` with:

```js
onTapDetail() {
  const styleRef = this.data.style && this.data.style.styleRef;
  if (!styleRef || !styleRef.id) return;

  const route = styleRef.kind === 'extension'
    ? '/subpages/extension-style/index'
    : '/subpages/style/index';
  wx.modelContext.getViewContext(this).openDetailPage({
    url: `${route}?styleId=${encodeURIComponent(styleRef.id)}`,
  });
},
```

- [x] **Step 2: Replace the button binding and copy**

In both `index.wxml` files, set the secondary action to:

```xml
<view
  class="secondary-action"
  hover-class="tap-hover"
  hover-stay-time="80"
  bindtap="onTapDetail"
>查看完整详情</view>
```

- [x] **Step 3: Keep hover feedback in both component copies**

Require both `index.wxss` files to contain:

```css
.tap-hover {
  opacity: 0.78;
}
```

- [x] **Step 4: Run the focused test to verify it passes**

Run:

```powershell
node --test tests/ai-mode-components.test.js
```

Expected: PASS.

### Task 3: Verify the AI mode project

**Files:**
- Verify: `ai-mode/skill/craft-beer-guide/components/style-detail-card/`
- Verify: `skills/craft-beer-guide/components/style-detail-card/`
- Verify: `tests/ai-mode-components.test.js`

- [x] **Step 1: Run the AI mode project checker**

Run:

```powershell
npm run check:ai-mode
```

Expected: all project checks and `tests/ai-mode-*.test.js` pass.

- [x] **Step 2: Inspect the final diff**

Run:

```powershell
git diff --check
git diff -- tests/ai-mode-components.test.js ai-mode/skill/craft-beer-guide/components/style-detail-card skills/craft-beer-guide/components/style-detail-card
```

Expected: no whitespace errors; only the intended handler, button, and tests changed.
