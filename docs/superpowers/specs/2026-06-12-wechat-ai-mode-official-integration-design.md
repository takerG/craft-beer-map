# 微信小程序 AI Mode 官方规范接入设计

## 背景

当前实现把 AI Mode 源码放在仓库顶层 `ai-mode/`，再构建为
`artifacts/ai-mode-project/miniprogram/`。生成物的 `project.config.json`
位于 `artifacts/ai-mode-project/`，而声明 `agent.skills` 的 `app.json`
位于下一层 `miniprogram/`。

这一结构虽然能通过仓库自定义检查，但不满足官方工具对“小程序项目根目录”的定义：
同一目录必须可直接找到 `project.config.json` 和 `app.json`，并从该
`app.json` 的 `agent.skills` 定位 Skill。官方 validator 对当前生成物的两个
可能入口均无法工作：

- 传入 `artifacts/ai-mode-project/` 时找不到根目录 `app.json`。
- 传入 `artifacts/ai-mode-project/miniprogram/` 时找不到
  `project.config.json`。

因此当前问题不是单个字段遗漏，而是项目根目录、Skill 路径和构建边界共同偏离了
官方 demo 与接入文档。

## 目标

把 AI Mode 作为现有小程序能力的扩展直接接入仓库根目录 `craft-beer-map/`，
使仓库根成为唯一、可直接导入和校验的小程序项目根目录。官方文档和示例中的
`miniprogram` 是用户项目目录的代称，不应机械地实现为额外嵌套目录。

完成后必须满足：

1. 仓库根目录同时包含 `project.config.json`、`app.json`、
   `AGENTS.md`、`page-meta.json` 和 `skills/`。
2. 根目录 `app.json` 直接声明 `agent.skills`、`agent.instruction`
   和 `agent.pageMetadata`。
3. `skills/craft-beer-guide` 是 `app.json` 声明的独立分包，路径与磁盘目录完全一致。
4. 原有浏览、择饮、学院、收藏、搜索和详情页继续工作，AI 是这些能力的新增入口，
   不是第二套独立产品。
5. 官方 validator 能以仓库根目录为唯一参数发现并校验 Skill。
6. 仓库测试不再把当前错误的生成物结构当作正确契约。

## 非目标

- 不重写已有啤酒数据、推荐算法、收藏存储或学院内容。
- 不引入自建聊天界面、后端、云函数或外部大模型 API。
- 不在本次迁移中决定 Control/Candidate 推荐实验的产品结论。
- 不删除当前未提交的推荐实验代码；它们要在迁移中保留并重新归位。
- 不把知识库当作 Skill 的替代品。

## 唯一项目根目录

采用以下目录边界：

```text
craft-beer-map/
|-- project.config.json
|-- project.private.config.json
|-- app.json
|-- app.js
|-- app.wxss
|-- AGENTS.md
|-- page-meta.json
|-- pages/
|-- subpages/
|-- components/
|-- aiDetail/
|   `-- pages/
|-- skills/
|   `-- craft-beer-guide/
|       |-- SKILL.md
|       |-- mcp.json
|       |-- index.js
|       |-- apis/
|       |-- components/
|       |-- data/
|       `-- utils/
`-- ...
```

开发者工具、官方 validator、预览和上传都以 `craft-beer-map/` 为项目路径。
不再保留嵌套的 `miniprogram/` 项目目录。

`project.config.json` 不设置 `miniprogramRoot`，因为配置文件所在的仓库根目录
本身就是小程序根目录。

`packOptions.include` 显式包含 `skills`，防止上传或预览打包时忽略 Skill 目录。
`packOptions.ignore` 排除测试、文档、依赖、实验和数据源文件，避免仓库辅助内容
进入小程序代码包。

## App 配置

根目录 `app.json` 在现有页面、Tab 和普通分包声明上原位扩展：

```json
{
  "subPackages": [
    {
      "root": "subpages",
      "pages": []
    },
    {
      "root": "skills",
      "pages": [],
      "independent": true
    },
    {
      "root": "aiDetail",
      "pages": [],
      "independent": true,
      "componentFramework": "glass-easel",
      "renderer": "skyline"
    }
  ],
  "agent": {
    "skills": [
      {
        "name": "craft-beer-guide",
        "description": "精酿啤酒风格搜索、口味推荐、详情、收藏与学院文章",
        "path": "skills/craft-beer-guide"
      }
    ],
    "instruction": "AGENTS.md",
    "pageMetadata": "page-meta.json"
  },
  "lazyCodeLoading": "requiredComponents"
}
```

实际迁移时保留现有完整页面清单。配置字段统一使用官方 demo 的
`subPackages` 拼写；测试同时验证 Skill 分包为 `independent: true`。

## Skill 与现有业务的关系

`craft-beer-guide` 继续是唯一 Skill，承接：

- 风格搜索
- 口味与场景推荐
- 风格详情摘要
- 本地收藏查询、添加和移除
- 学院文章发现

Skill 不复制第二套业务规则。小程序普通页面、Skill API、AI 半屏页和知识库继续从
同一组仓库源数据生成或读取。独立分包不能依赖主包运行时模块，因此
`skills/craft-beer-guide/data/` 中保留确定性生成的数据副本，但它必须由构建脚本
从现有数据源生成，并由一致性测试防止漂移。

现有 `ai-mode/skill/craft-beer-guide/` 的正式实现迁移到
`skills/craft-beer-guide/`。现有 Control/Candidate 实验文件保留，
但只有被选中的正式 `SKILL.md`、`mcp.json` 和 API 注册表进入可上传项目的有效协议。

## 普通页面与 AI 入口

AI 是现有小程序的增强入口：

- 普通页面在平台支持时通过 `wx.openAgent()` 打开微信 AI。
- `wx.checkIsSupportAgent()` 失败或不支持时隐藏入口，原页面功能不受影响。
- 页面上下文只传递当前业务 ID、用户可见摘要和必要筛选条件。
- 从原子卡片或文本链进入的普通页面可使用 `wx.navigateBackAgent()` 返回对话。
- AI 专用半屏页不使用普通页面路由返回 Agent。

原有覆盖构建逻辑改为普通源码中的共享 `ai-entry` 组件接入。这样页面本身就是最终
可运行代码，不再靠构建时字符串拼接 WXML。

## 半屏页

`aiDetail` 保持独立分包并只用于 AI 对话中的补充选择：

- `style-results` 展示更多风格结果。
- `taste-refine` 补充场景和口味偏好。

半屏页使用 `wx.modelContext.getContext()` 获取上下文，并通过
`sendFollowUpMessage()` 上行用户选择。它们不得调用 `wx.navigateBackAgent()`，
也不得把完整普通页面搬进半屏容器。

## 原子组件规范

所有 `mcp.json` 声明的组件必须：

1. 提供 `.js`、`.json`、`.wxml` 和 `.wxss` 四个文件。
2. 声明有效 `relatedPage`。
3. 在组件实例中使用 `wx.modelContext.getContext(this)` 和
   `wx.modelContext.getViewContext(this)`。
4. 主动操作前重新获取 context，避免缓存失效上下文。
5. 不给组件根节点设置固定 `height`、`min-height` 或 `max-height`。
6. 监听 `NotificationType.Overflow`，并保留官方要求的 overflow 监测日志。
7. 可点击元素同时提供 `bindtap` 和 `hover-class`。
8. 不使用网络请求、定时器、动画、纵向滚动或平台禁止的能力。

现有固定高度测试属于错误契约，必须替换为“根节点无固定高度”的测试。

## 构建职责

废弃“复制完整小程序到 `artifacts/ai-mode-project/`”的构建职责。

`scripts/build_ai_mode_project.cjs` 改为只生成不可手写的数据产物：

- `skills/craft-beer-guide/data/catalog.js`
- `aiDetail/data/catalog.js`
- Skill 和半屏页需要的共享运行时副本
- `artifacts/ai-knowledge-base/*.md`
- 可选的生成清单与数据指纹

脚本不得再：

- 复制整个正式项目到第二个发布目录
- 在生成副本中改写 `app.json`
- 生成第二份 `project.config.json`
- 通过字符串追加修改页面 WXML
- 把 `AGENTS.md` 或 Skill 复制到另一个项目层级

Control/Candidate 实验构建可以继续生成独立、扁平的测试项目根，但这些快照
不能取代正式仓库根目录的官方校验。

## 页面元数据与全局指令

根目录 `AGENTS.md` 是 `agent.instruction` 指向的全局行为边界，负责区分：

- 执行搜索、推荐、详情、收藏和文章发现时调用 Skill。
- 开放式知识问答优先使用已上传知识库。
- 不编造风格 ID、文章 slug、收藏状态或项目中不存在的事实。
- 卡片返回后等待用户选择，不擅自越过确认步骤。

根目录 `page-meta.json` 描述现有普通页面及其 query 约束，用于文本链和页面理解。
文件内容继续由当前分片元数据生成，但最终文件必须直接存在于真实项目根目录。

## 校验策略

### 仓库契约测试

新增或改写测试，直接断言：

- 根目录 `project.config.json` 与 `app.json` 同级。
- 根目录 `app.json` 存在正确的 `agent` 声明。
- `agent.skills[*].path` 指向真实目录。
- Skill 分包独立，且 `lazyCodeLoading` 正确。
- `agent.instruction` 和 `agent.pageMetadata` 指向真实文件。
- `packOptions.include` 包含 `skills`。
- `mcp.json` 与 `index.js` 的 API/组件注册一致。
- 原子组件符合 context、Overflow、高度和交互规范。
- 半屏页使用 `sendFollowUpMessage()`，不使用普通页面返回 API。
- 生成数据与现有业务源数据一致。

先写失败测试证明旧结构不可接受，再进行目录和构建迁移。

### 官方静态校验

官方 validator 的唯一调用方式为：

```powershell
node <official-validator>/scripts/validate.mjs .
```

通过标准不是“仓库自定义检查返回 0”，而是官方 validator 能从
根目录 `app.json` 自动发现 `skills/craft-beer-guide` 并完成检查。

### 开发者工具验证

使用已安装的微信开发者工具 CLI 对仓库根目录执行编译或预览探测，并记录：

- 开发者工具版本
- 基础库版本
- 使用的 AppID
- 编译/预览结果
- AI Mode 权限是否已开通

本地静态校验通过不等于微信后台已经为 AppID 开通 AI Mode。若权限未开通，验收结果
必须明确区分“项目结构合规”和“平台账号权限阻塞”，不能把权限问题伪装成代码通过。

## 文档与发布流程

运行手册和发布清单统一改为：

1. 生成 AI 数据和知识库。
2. 运行全部仓库测试。
3. 以仓库根目录运行官方 validator。
4. 以仓库根目录导入或调用微信开发者工具。
5. 在具备 AI Mode 权限的开发版/体验版执行对话回归。
6. 上传知识库文件并验证兜底问答。

文档不再指导开发者打开 `artifacts/ai-mode-project/`。

## 迁移兼容性

迁移必须保留当前工作区中尚未提交的推荐质量 V2、flow state、实验构建和测试工作。
目录移动时按文件内容迁移，不能用旧提交覆盖当前工作区。

现有实验脚本中对 `ai-mode/` 的路径依赖需要更新到新位置，或明确保留为仓库外层实验
工具目录。无论选择哪种方式，正式微信项目的 Skill 只能从
`skills/craft-beer-guide` 被发现和上传。

## 验收标准

实现完成必须同时满足：

1. 官方 validator 以仓库根目录运行，不再出现缺少 `app.json`、
   `project.config.json` 或 Skill 目录的错误。
2. 微信开发者工具可直接导入 `D:\work\craft-beer-map` 并完成项目编译；若受 AppID 权限阻塞，
   有明确的工具输出和版本记录。
3. `app.json`、Skill、半屏页、原子组件和打包配置符合官方接入文档与 demo。
4. 原有小程序页面和数据测试全部通过。
5. AI Mode API、组件、生成数据和推荐实验测试全部通过。
6. 仓库中不再存在需要上传的第二套完整小程序生成物。
7. 运行手册只指向唯一真实项目根目录。

## 依据

- 用户提供的《接入方式》PDF。
- 微信官方 `wechat-miniprogram/ai-mode-demo`。
- 微信官方 `wechat-miniprogram/ai-mode-skills` validator 与模板规则。
