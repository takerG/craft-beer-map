# Craft Beer Map 小程序

这是一个面向微信小程序的 BJCP 啤酒风格学习工具。项目后续只维护小程序内容，不再保留网页站、Vite 构建或 GitHub Pages 发布产物。

## 主要内容

- BJCP 2021 官方风格浏览
- 按大类进入风格组和风格详情
- 风格搜索、别名匹配和详情阅读
- 市场扩展风格学习页
- 微信 AI Mode 风格搜索、推荐、收藏与学院文章能力
- 小程序端轻量数据模型和结构测试

## 目录

```text
craft-beer-map/
├─ project.config.json        # 微信开发者工具项目配置
├─ project.private.config.json
├─ app.js
├─ app.json
├─ app.wxss
├─ AGENTS.md                  # 微信 AI 全局指令
├─ page-meta.json             # AI 页面元数据
├─ assets/
├─ data/                      # 数据源与小程序运行数据
├─ pages/
├─ subpages/
├─ components/
├─ skills/                    # AI Mode 独立 Skill 分包
├─ aiDetail/                  # AI 半屏页独立分包
├─ utils/
├─ scripts/                   # 数据整理和小程序数据生成脚本
├─ tests/                     # 小程序结构、数据和模型测试
└─ package.json
```

## 常用命令

```bash
npm test
npm run check:generated
npm run build:mini-data
npm run build:ai-mode
npm run check:ai-mode
npm run build:profiles
npm run check:profiles
npm run apply:aliases
```

`build:mini-data` 会从 `data/beer-data-source.json` 生成 `data/beer-data.js` 和 `data/style-aliases.js`。
`check:generated` 用来在提交前检查这些生成数据是否和源数据同步。
`build:profiles` 会生成 `artifacts/production` 与 `artifacts/ai-beta`；
`check:profiles` 会检查正式包 AI 隔离、文件哈希、确定性与包体预算。

## 开发方式

用微信开发者工具直接打开仓库根目录 `craft-beer-map/`。该目录同时包含
`project.config.json`、`app.json` 和 `skills/`，也是官方 AI Mode
validator 可识别的 beta 开发项目根目录。仓库根目录和 `artifacts/ai-beta`
仅用于 AI beta 开发与验证，不得作为正式发布上传源。官方文档或示例中名为 `miniprogram` 的目录通常只是
“用户的小程序项目目录”的代称，本仓库不再额外创建同名子目录。

正式发布前必须运行 `npm run build:profiles` 和 `npm run check:profiles`，
微信开发者工具只能导入 `artifacts/production` 进行正式版编译、预览与上传。

如果更新 BJCP 源数据或别名，先更新 `data/beer-data-source.json` 或 `scripts/style_aliases.cjs`，再运行对应脚本并执行测试。
如果更新 AI Skill、页面元数据或知识库来源，运行 `npm run build:ai-mode` 和
`npm run check:ai-mode`。详细步骤见 `docs/wechat-ai-mode-runbook.md`。
如果需要从 PDF 重新提取 BJCP 源数据，先运行 `python -m pip install -r requirements.txt` 安装 Python 依赖。
