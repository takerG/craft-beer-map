# Craft Beer Map - 项目指南

## 项目简介

这是一个将 BJCP（啤酒评审认证项目）啤酒风格指南转换为可交互"风格地图"的前端可视化项目。

项目灵感来自 [Music-Map](https://musicmap.info/)，将传统的文档式啤酒风格指南重组为地图式探索体验，帮助用户从分类、风味与演化关系三个角度理解精酿啤酒风格体系。

## 技术栈

- **前端框架**: D3.js（力导向图可视化）
- **构建工具**: Vite
- **样式**: 自定义 CSS（使用 CSS 变量）
- **部署**: GitHub Pages（构建输出到 `docs/` 目录）

## 项目结构

```
craft-beer-map/
├─ src/
│  ├─ main.js          # 主可视化逻辑（约 1000 行）
│  └─ style.css        # 页面样式
├─ public/
│  └─ data.json        # 运行时数据文件
├─ docs/               # 构建输出目录（GitHub Pages）
├─ generate_part*.cjs  # 数据分片生成脚本
├─ merge_bjcp.cjs      # 合并生成最终 data.json
├─ index.html
├─ package.json
└─ vite.config.js
```

## 关键代码位置

### main.js 核心代码段

| 行号范围 | 功能说明 |
|---------|---------|
| 4-13 | 超级风格定义（8 个主要分组） |
| 27-36 | 焦点位置配置（用于布局定位） |
| 350-415 | 数据设置与节点/连线创建 |
| 448-486 | D3 力模拟配置 |
| 558-588 | 凸包渲染（有机背景形状） |

### 超级风格分组（8 大类）

| 分组 | 颜色代码 |
|-----|---------|
| 美式啤酒 | 金色 #D4A24A |
| 国际拉格 | 青色 #8AAFC8 |
| 捷克拉格 | 绿色 #5EAD5E |
| 德式啤酒 | 橙色 #C87533 |
| 小麦啤酒 | 黄色 #D8B840 |
| 英爱啤酒 | 红色 #C44A2A |
| 比利时与酸啤 | 紫色 #9B4EC8 |
| 特殊啤酒 | 蓝色 #3A8FB7 |

## 数据结构

```json
{
  "categories": [
    { "id": "1", "name_zh": "...", "name_en": "..." }
  ],
  "styles": [
    {
      "id": "1A",
      "code": "1A",
      "name_zh": "美式淡色拉格",
      "name_en": "American Light Lager",
      "category": "1",
      "details": {
        "overall_impression": "...",
        "aroma": "...",
        "appearance": "...",
        "flavor": "...",
        "mouthfeel": "...",
        "comments": "...",
        "history": "...",
        "ingredients": "...",
        "stats": {
          "OG": "...",
          "FG": "...",
          "ABV": "...",
          "IBU": "...",
          "SRM": "..."
        },
        "tags": [...]
      }
    }
  ],
  "relations": [
    { "source": "1A", "target": "1B", "type": "related" }
  ]
}
```

### 关系类型

- `related`: 相似风格
- `influenced_by`: 风格影响关系
- `compared_to`: 对比参照

## 数据处理流程

1. 从 BJCP PDF 提取文本内容
2. 解析并构建结构化数据
3. 使用 `merge_bjcp.cjs` 合并生成 `public/data.json`
4. 前端运行时直接读取 `data.json`

## 主要功能

- D3 力导向布局与自定义定位
- 超级风格分组的凸包背景
- 基于排版的节点设计（中英文双语）
- 缩放、平移、搜索、悬停高亮
- 风格详情面板展示完整信息
- 节点间的三种关系连线

## 常用命令

```bash
# 安装依赖
npm install

# 启动本地开发环境
npm run dev

# 构建生产版本
npm run build
```

## 部署说明

- `base` 配置为 `/craft-beer-map/`
- 构建输出到 `docs/` 目录
- 仓库可直接通过 `docs/` 目录发布静态页面

## 数据来源

- [2015 BJCP Beer Style Guidelines 中文版 PDF](https://www.bjcp.org/wp-content/uploads/2017/12/2015_Guidelines_CN.pdf)

## 设计理念

这个项目强调的是探索体验、风格之间的相对位置和关系感，而不是逐页复刻指南文档。整体视觉与交互方式参考了 Music-Map，但内容主题转为 BJCP 啤酒风格体系。