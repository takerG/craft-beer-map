# Craft Beer Map 小程序

这是一个面向微信小程序的 BJCP 啤酒风格学习工具。项目后续只维护小程序内容，不再保留网页站、Vite 构建或 GitHub Pages 发布产物。

## 主要内容

- BJCP 2021 官方风格浏览
- 按大类进入风格组和风格详情
- 风格搜索、别名匹配和详情阅读
- 市场扩展风格学习页
- 小程序端轻量数据模型和结构测试

## 目录

```text
craft-beer-map/
├─ miniprogram/               # 微信小程序源码
│  ├─ app.js
│  ├─ app.json
│  ├─ app.wxss
│  ├─ assets/
│  ├─ data/                   # 小程序运行数据
│  ├─ pages/
│  └─ utils/
├─ data/
│  └─ beer-data-source.json   # 小程序数据生成源
├─ scripts/                   # 数据整理和小程序数据生成脚本
├─ tests/                     # 小程序结构、数据和模型测试
├─ project.config.json        # 微信开发者工具项目配置
├─ project.private.config.json
└─ package.json
```

## 常用命令

```bash
npm test
npm run check:generated
npm run build:mini-data
npm run apply:aliases
```

`build:mini-data` 会从 `data/beer-data-source.json` 生成 `miniprogram/data/beer-data.js` 和 `miniprogram/data/style-aliases.js`。
`check:generated` 用来在提交前检查这些生成数据是否和源数据同步。

## 开发方式

用微信开发者工具打开仓库根目录即可，`project.config.json` 已配置 `miniprogramRoot` 为 `miniprogram/`。

如果更新 BJCP 源数据或别名，先更新 `data/beer-data-source.json` 或 `scripts/style_aliases.cjs`，再运行对应脚本并执行测试。
如果需要从 PDF 重新提取 BJCP 源数据，先运行 `python -m pip install -r requirements.txt` 安装 Python 依赖。
