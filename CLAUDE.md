# Craft Beer Map - 项目指南

## 项目定位

这是一个微信小程序项目，用于学习和检索 BJCP 啤酒风格。仓库后续只维护小程序，不再维护网页站、Vite 前端或 GitHub Pages 构建产物。

## 技术栈

- 微信小程序原生页面：WXML / WXSS / JS
- Node.js 脚本：数据整理、别名应用、小程序数据生成
- Node.js test runner：结构、数据和模型测试

## 关键目录

```text
miniprogram/                 # 小程序源码
miniprogram/data/            # 小程序运行数据
miniprogram/pages/           # 探索、搜索、分组、详情、扩展风格页面
miniprogram/utils/           # 小程序数据模型与风格分组
data/beer-data-source.json   # 小程序数据生成源
scripts/                     # 数据处理脚本
tests/                       # 自动化测试
```

## 数据流程

1. 维护 `data/beer-data-source.json` 作为 BJCP 风格数据源。
2. 维护 `scripts/style_aliases.cjs` 作为别名来源。
3. 运行 `npm run build:mini-data` 生成小程序运行数据。
4. 运行 `npm test` 验证数据、页面结构和模型行为。

## 常用命令

```bash
npm test
npm run build:mini-data
npm run apply:aliases
```

## 约定

- 不再新增网页站入口、`src/`、`public/`、`docs/`、Vite 配置或网页构建依赖。
- 小程序页面避免使用在微信开发者工具中不稳定的布局和 Canvas 桥接能力。
- 更新数据后同步生成 `miniprogram/data/beer-data.js` 和 `miniprogram/data/style-aliases.js`。
