# Cold IPA Academy Article Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new Cold IPA academy article with a dedicated light editorial reading experience, one interactive four-style comparison, and data-driven process/checklist companions.

**Architecture:** The article content lives in `academy-sites/cold-ipa/` and is built into `miniprogram/data/academy-sites.js` by the existing academy build script. `miniprogram/utils/academy-model.js` normalizes section companions and exposes a `cold-ipa` experience key. `miniprogram/subpages/academy-article/` keeps shared loading/share/related-style behavior while rendering a Cold IPA theme branch and a single tabbed comparison interaction.

**Tech Stack:** WeChat Mini Program WXML/WXSS/JS, Node.js build scripts, Node.js test runner.

---

### Task 1: Cold IPA Data And Model Tests

**Files:**
- Modify: `tests/academy-model.test.js`

- [ ] **Step 1: Add failing content folder assertions**

Add `cold-ipa` to the existing content-folder list:

```js
['ipa-family-map', 'ale-vs-lager', 'flavor-radar-basics', 'beer-fresh-draft-raw', 'cold-ipa'].forEach((slug) => {
  // existing assertions stay unchanged
});
```

- [ ] **Step 2: Add failing article length assertion**

Add the new minimum to `minimumArticleLengths`:

```js
const minimumArticleLengths = {
  'ipa-family-map': 2400,
  'ale-vs-lager': 1200,
  'flavor-radar-basics': 1200,
  'beer-fresh-draft-raw': 1800,
  'cold-ipa': 2200,
};
```

- [ ] **Step 3: Add failing feed assertions**

Update feed order, dates, count, and payload budget:

```js
assert.deepEqual(
  home.feedSites.map((site) => site.slug),
  ['cold-ipa', 'beer-fresh-draft-raw', 'flavor-radar-basics', 'ipa-family-map', 'ale-vs-lager'],
);
assert.deepEqual(
  home.feedSites.map((site) => site.publishedAt),
  ['2026-06-08', '2026-06-05', '2026-06-04', '2026-06-03', '2026-06-02'],
);
assert.ok(Buffer.byteLength(JSON.stringify(home.feedSites)) < 11000);
```

- [ ] **Step 4: Add failing type-filter assertion**

Update the `all` and `comparison` counts:

```js
[
  ['all', '全部', 5],
  ['map', '地图', 1],
  ['comparison', '对比', 2],
  ['simulator', '工具', 1],
  ['tool', '工具', 1],
]
```

- [ ] **Step 5: Add failing Cold IPA article model assertions**

Extend the routing test:

```js
const coldIpa = getAcademyArticle('cold-ipa');

assert.equal(coldIpa.experienceKey, 'cold-ipa');
assert.equal(coldIpa.isColdIpaExperience, true);
assert.equal(coldIpa.pageThemeClass, 'academy-article-page cold-ipa-page');
assert.equal(coldIpa.selectedComparisonId, 'cold-ipa');
assert.ok(coldIpa.sections.some((section) => section.showColdIpaComparison));
assert.ok(coldIpa.sections.some((section) => section.showColdIpaProcess));
assert.ok(coldIpa.sections.some((section) => section.showColdIpaChecklist));
assert.ok(coldIpa.relatedStyles.some((style) => style.id === 'ext-india-pale-lager'));
```

- [ ] **Step 6: Run red test**

Run: `node --test tests/academy-model.test.js`

Expected: FAIL because `academy-sites/cold-ipa` and the new model fields do not exist.

### Task 2: Cold IPA Content Files

**Files:**
- Create: `academy-sites/cold-ipa/meta.json`
- Create: `academy-sites/cold-ipa/publish.json`
- Create: `academy-sites/cold-ipa/content.json`
- Modify: `academy-sites/order.json`

- [ ] **Step 1: Create metadata**

Use:

```json
{
  "slug": "cold-ipa",
  "title": "什么是冷 IPA？",
  "description": "把冷 IPA 从低温饮用、IPL、西海岸 IPA 和浑浊 IPA 的混淆里拆出来，理解它为何干爽、清澈、酒花鲜明。",
  "type": "comparison",
  "difficulty": "进阶入门",
  "readingTime": 9,
  "tags": ["冷 IPA", "IPA", "酒花", "风格识别"],
  "date": "2026-06-08",
  "featured": true,
  "heroMetric": "4 杯对照",
  "accent": "#f4bd38",
  "layoutVariant": "cold-editorial",
  "relatedStyles": ["21A", "21C", "ext-west-coast-ipa", "ext-india-pale-lager"]
}
```

- [ ] **Step 2: Create publish file**

Use:

```json
{
  "publishedAt": "2026-06-08",
  "updatedAt": "2026-06-08"
}
```

- [ ] **Step 3: Create content file**

Write at least seven article sections matching the design spec. Attach companion objects to the sections:

```json
{
  "type": "cold-ipa-comparison",
  "items": [
    { "id": "cold-ipa", "title": "冷 IPA", "rows": [...] },
    { "id": "ipl", "title": "IPL", "rows": [...] },
    { "id": "west-coast", "title": "西海岸 IPA", "rows": [...] },
    { "id": "hazy", "title": "浑浊 IPA", "rows": [...] }
  ]
}
```

Also attach `cold-ipa-process` and `cold-ipa-checklist` companions. Keep all component copy in JSON, not in page JS.

- [ ] **Step 4: Update academy order**

Add `cold-ipa` to the front of `featured` and to the `style-sense` track without removing existing entries:

```json
"featured": ["cold-ipa", "beer-fresh-draft-raw", "ipa-family-map", "ale-vs-lager"]
```

- [ ] **Step 5: Run academy build**

Run: `npm run build:academy`

Expected: generated `miniprogram/data/academy-sites.js` and `miniprogram/assets/academy-covers/cold-ipa.png`.

### Task 3: Academy Model Support

**Files:**
- Modify: `miniprogram/utils/academy-model.js`

- [ ] **Step 1: Add experience mapping**

Add:

```js
const EXPERIENCE_KEYS = {
  'ipa-family-map': 'ipa-map',
  'ale-vs-lager': 'ale-lager',
  'flavor-radar-basics': 'flavor-radar',
  'cold-ipa': 'cold-ipa',
};
```

- [ ] **Step 2: Expose theme and Cold IPA booleans**

Return:

```js
isColdIpaExperience: experienceKey === 'cold-ipa',
pageThemeClass: experienceKey === 'cold-ipa'
  ? 'academy-article-page cold-ipa-page'
  : 'academy-article-page',
selectedComparisonId: 'cold-ipa',
```

- [ ] **Step 3: Normalize companion data**

Extend section normalization with:

```js
const companion = normalizeCompanion(section.companion || null);
return {
  ...section,
  companion,
  hasCompanion: Boolean(companion),
  showColdIpaComparison: experienceKey === 'cold-ipa' && companion && companion.isColdIpaComparison,
  showColdIpaProcess: experienceKey === 'cold-ipa' && companion && companion.isColdIpaProcess,
  showColdIpaChecklist: experienceKey === 'cold-ipa' && companion && companion.isColdIpaChecklist,
};
```

- [ ] **Step 4: Run green model test**

Run: `node --test tests/academy-model.test.js`

Expected: PASS.

### Task 4: Cold IPA Page Structure Tests

**Files:**
- Modify: `tests/miniprogram-structure.test.js`

- [ ] **Step 1: Add failing structure assertions**

Extend the academy article structure test:

```js
assert.match(articleWxml, /class="cold-ipa-hero"/);
assert.match(articleWxml, /class="cold-ipa-comparison"/);
assert.match(articleWxml, /bindtap="selectColdIpaComparison"/);
assert.match(articleWxml, /class="cold-ipa-process"/);
assert.match(articleWxml, /class="cold-ipa-checklist"/);
assert.match(articleJs, /selectColdIpaComparison\(event\)/);
assert.match(articleJs, /academy_cold_ipa_comparison_select/);
assert.match(articleWxss, /\.cold-ipa-page/);
```

- [ ] **Step 2: Run red structure test**

Run: `node --test tests/miniprogram-structure.test.js`

Expected: FAIL because the WXML/JS/WXSS branches do not exist.

### Task 5: Page JS Interaction

**Files:**
- Modify: `miniprogram/subpages/academy-article/index.js`

- [ ] **Step 1: Add selected state**

Add to `data` and not-found reset:

```js
selectedColdIpaComparisonId: 'cold-ipa',
```

- [ ] **Step 2: Pass selection into decoration**

Add to `decorateArticle` calls:

```js
selectedColdIpaComparisonId: this.data.selectedColdIpaComparisonId,
```

- [ ] **Step 3: Add handler**

Add:

```js
selectColdIpaComparison(event) {
  const { comparisonId } = event.currentTarget.dataset;
  if (!comparisonId || comparisonId === this.data.selectedColdIpaComparisonId) return;

  trackEvent('academy_cold_ipa_comparison_select', { slug: this.data.slug, comparisonId });
  this.setData({
    selectedColdIpaComparisonId: comparisonId,
    article: decorateArticle(this.data.article, {
      selectedIpaBranchId: this.data.selectedIpaBranchId,
      selectedFermentationPathId: this.data.selectedFermentationPathId,
      selectedFlavorSourceId: this.data.selectedFlavorSourceId,
      selectedColdIpaComparisonId: comparisonId,
    }),
  });
}
```

- [ ] **Step 4: Build Cold IPA experience**

Add a helper that reads the comparison companion from the article and decorates tabs/active rows. It must return an empty object when the article lacks the companion.

### Task 6: WXML And WXSS

**Files:**
- Modify: `miniprogram/subpages/academy-article/index.wxml`
- Modify: `miniprogram/subpages/academy-article/index.wxss`

- [ ] **Step 1: Use page theme class**

Change the root class binding to use `{{pageClassName}}` from page data, avoiding `class="{{...}}"`.

- [ ] **Step 2: Add Cold IPA branch**

Render Cold IPA hero and companions only when `article.isColdIpaExperience` is true. Keep the existing article hero and experience sections for other articles.

- [ ] **Step 3: Add styles**

Add a light theme scoped under `.cold-ipa-page`, with no `display: grid`, no `calc()`, no nested cards, and no dynamic class expressions.

- [ ] **Step 4: Run green structure test**

Run: `node --test tests/miniprogram-structure.test.js`

Expected: PASS.

### Task 7: Build And Full Verification

**Files:**
- Verify generated files and changed source files.

- [ ] **Step 1: Run academy build**

Run: `npm run build:academy`

Expected: exit 0.

- [ ] **Step 2: Run targeted tests**

Run: `node --test tests/academy-model.test.js tests/miniprogram-structure.test.js`

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 4: Inspect diff**

Run: `git diff --stat` and `git status --short`

Expected: Cold IPA content, model/page updates, generated academy data/cover, tests, and the implementation plan are present. Pre-existing unrelated dirty files remain untouched except where required by the feature.
