# 学院内容系统

「学院」是精酿科普 tab。它以 feed 流展示精酿互动文章，但每篇内容首先必须是一篇可独立阅读的文章。前端互动能力用于辅助解释关键段落，而不是取代正文。feed 支持按内容类型快速筛选，并保持无本地封面图的轻量列表。

## 目录结构

```text
academy-sites/
├── order.json
├── ipa-family-map/
│   ├── meta.json
│   ├── publish.json
│   └── content.json
└── ale-vs-lager/
    ├── meta.json
    ├── publish.json
    └── content.json
```

每个内容目录的 `meta.json` 提供 feed 摘要、类型和发现信息，`publish.json` 记录发布时间，`content.json` 提供文章正文、互动插入点和兼容模块数据。学院首页按 `publish.json` 的 `publishedAt` 倒序展示，并根据 `meta.json` 的 `type` 生成筛选项。

`content.json` 必须包含：

- `sections`：文章正文段落。每个 section 至少包含 `id`、`title` 和 `paragraphs`。
- `experienceAfterSectionId`：互动体验插入到哪一个 section 后面。
- `modules`：历史兼容数据，不作为学院文章正文的主要渲染结构。

写新内容时，先补齐文章的概念、背景、形成原因和读者可带走的判断方法，再决定是否需要地图、路径、雷达等前端互动来辅助讲解。

## 构建

```bash
npm run build:academy
```

构建会生成 `miniprogram/data/academy-sites.js`。为控制小程序代码包大小，feed 不再生成本地封面图。常规 `npm run build:mini-data` 也会顺带执行学院内容构建。

## 小程序入口

- `miniprogram/pages/academy/`：学院 tab 首页。
- `miniprogram/pages/academy-article/`：通用互动文章宿主页。
- `miniprogram/utils/academy-feed-model.js`：学院首页 feed 数据模型。
- `miniprogram/subpages/utils/academy-model.js`：学院文章详情数据模型，随内容分包加载。

新增内容时，优先新增 `academy-sites/<slug>/meta.json`、`publish.json` 和 `content.json`，再运行 `npm run build:academy`。
