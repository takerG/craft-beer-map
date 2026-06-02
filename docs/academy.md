# 学院内容系统

「学院」是精酿科普 tab。它以 feed 流展示精酿互动文章，每篇内容仍按前端模块组织，可以包含对比、刻度、卡片、问答和关联风格跳转。feed 支持按内容类型快速筛选，并展示由构建脚本自动生成的文章封面图。

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

每个内容目录的 `meta.json` 提供 feed 摘要、类型和发现信息，`publish.json` 记录发布时间，`content.json` 提供文章页模块。学院首页按 `publish.json` 的 `publishedAt` 倒序展示，并根据 `meta.json` 的 `type` 生成筛选项。

## 构建

```bash
npm run build:academy
```

构建会生成 `miniprogram/data/academy-sites.js`，并为每篇内容生成 `miniprogram/assets/academy-covers/<slug>.png` feed 封面。常规 `npm run build:mini-data` 也会顺带执行学院内容构建。

## 小程序入口

- `miniprogram/pages/academy/`：学院 tab 首页。
- `miniprogram/pages/academy-article/`：通用互动文章宿主页。
- `miniprogram/utils/academy-model.js`：学院首页和文章详情数据模型。

新增内容时，优先新增 `academy-sites/<slug>/meta.json`、`publish.json` 和 `content.json`，再运行 `npm run build:academy`。
