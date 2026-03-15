# Craft Beer Map

一个把 BJCP 啤酒风格指南转成可交互“风格地图”的前端可视化项目。  
项目使用 `D3.js` + `Vite` 构建，将不同啤酒风格组织成一张可探索的关系地图，帮助从分类、风味与演化关系三个角度理解精酿风格体系。

## Overview

传统 BJCP 指南更适合查阅，但不太适合“横向比较”和“整体理解”。这个项目尝试把文档式知识重组为地图式体验：

- 每个节点代表一种啤酒风格
- 不同颜色区域代表更高层级的风格分组
- 节点之间的连线表示相似、对比或影响关系
- 侧边详情面板展示风格描述、统计信息与标签

整体视觉与探索方式参考了 [Music-Map](https://musicmap.info/)，但内容主题转为 BJCP 啤酒风格。

## Highlights

- D3 force layout 风格地图
- 大类风格分区聚合
- 节点搜索与快速定位
- 悬停高亮与关系联动
- 风格详情面板
- 关系线开关、缩放和平移
- 静态部署友好，适合 GitHub Pages

## Data & Inspiration

### 数据来源

- [2015 BJCP Beer Style Guidelines 中文版 PDF](https://www.bjcp.org/wp-content/uploads/2017/12/2015_Guidelines_CN.pdf)

### 风格创意来源

- [Music-Map](https://musicmap.info/)

### 说明

本项目中的分类、风格名称、风格描述和部分统计信息整理自 BJCP 中文指南。  
地图布局、节点关系、视觉组织和交互方式属于本项目的二次设计与可视化表达，并非 BJCP 官方原始展示形式。

## Tech Stack

- [Vite](https://vitejs.dev/)
- [D3.js](https://d3js.org/)
- HTML / CSS / JavaScript

## Project Structure

```text
craft-beer-map/
├─ src/
│  ├─ main.js                 # 地图渲染与交互逻辑
│  └─ style.css               # 页面样式
├─ public/
│  └─ data.json               # 运行时读取的数据文件
├─ docs/                      # 构建输出目录（GitHub Pages）
├─ generate_part1.cjs         # 数据分片生成脚本 1
├─ generate_part2.cjs         # 数据分片生成脚本 2
├─ generate_part3.cjs         # 数据分片生成脚本 3
├─ generate_bjcp_part1.json   # 中间数据分片 1
├─ generate_bjcp_part2.json   # 中间数据分片 2
├─ generate_bjcp_part3.json   # 中间数据分片 3
├─ merge_bjcp.cjs             # 合并生成最终 public/data.json
├─ index.html
├─ package.json
└─ vite.config.js
```

## Getting Started

安装依赖：

```bash
npm install
```

启动本地开发环境：

```bash
npm run dev
```

构建生产版本：

```bash
npm run build
```

构建结果会输出到 `docs/` 目录，可直接用于 GitHub Pages。

## Data Workflow

当前数据生成流程分为两步：

1. 运行分片脚本，生成 `generate_bjcp_part*.json`
2. 运行 `merge_bjcp.cjs`，合并为 `public/data.json`

前端运行时直接读取：

```text
public/data.json
```

如果重新生成了数据，通常也应该重新构建一次站点，使 `docs/` 中的发布文件与源码保持同步。

## Deployment

项目已配置 GitHub Pages 友好的构建输出：

- `base`: `/craft-beer-map/`
- build output: `docs/`

这意味着仓库可以直接通过 `docs/` 目录发布静态页面。

## Notes

这个项目更像一个“啤酒风格知识可视化实验”，而不是 BJCP 官方资料镜像。  
它强调的是探索体验、风格之间的相对位置和关系感，而不是逐页复刻指南文档。
