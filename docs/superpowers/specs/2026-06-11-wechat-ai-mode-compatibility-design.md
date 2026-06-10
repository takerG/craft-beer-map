# 微信小程序 AI 开发模式兼容设计

## 目标

让现有「精酿风格指南」兼容微信小程序 AI 开发模式 beta，同时保持当前小程序五个 Tab、页面结构和本地规则推荐不变。

AI 在首期是增强入口，不替代原有浏览体验。用户可以在微信提供的小程序 AI 对话界面中：

1. 用自然语言搜索啤酒风格。
2. 根据场景和口味获得确定性择饮推荐。
3. 查看风格摘要并进入现有详情页。
4. 查看、添加和移除本地收藏。
5. 发现学院文章。
6. 基于项目现有 BJCP、扩展风格和学院内容进行知识问答。
7. 从现有小程序页面携带上下文进入 AI，并在必要时返回原页面继续浏览。

首期不处理酒标或酒单图片，不引入自建后端，不让模型根据外部常识补充项目知识库中不存在的事实。

## 已确认的产品原则

- AI 是增强入口。现有探索、择饮、学院、收藏和搜索 Tab 保持主导航地位。
- 知识回答仅基于项目已有内容。没有依据时明确说明，不让模型自由补全。
- 收藏支持查询、添加和移除，并继续使用本地存储。
- 首期不做图片识别。
- 核心任务优先在 AI 对话和原子卡片中闭环，文字链仅作兜底。
- 正式提审项目不得包含当前内测阶段的 AI 模式代码。

## 平台能力边界

依据 2026 年 6 月 9 日版本的 beta 接入材料和官方 `wechat-miniprogram/ai-mode-demo`：

- 微信小程序 AI 后台负责理解用户意图、选择 Skill 和编排原子接口。
- 原子接口运行在微信客户端提供的独立 JavaScript 环境中。
- 原子组件运行在另一个独立上下文中，使用受限的 glass-easel 卡片渲染环境。
- 小程序普通页面、半屏页面、原子接口和原子组件之间不共享全局变量。
- 原子接口可以使用本地数据和 storage，因此本项目首期不需要后端。
- 知识库是 Skill 未命中后的知识查询兜底，不是 Skill 的替代品。
- 页面元数据允许模型生成小程序文字链，但平台明确要求核心能力尽量不要依赖文字链。
- 当前内测阶段暂不开放相关代码提审，因此 AI 版本必须和正式项目隔离。

## 总体架构

```text
用户
  |
  v
微信小程序 AI
  |-- 执行意图 ------------------------> craft-beer-guide Skill
  |                                      |-- 搜索
  |                                      |-- 择饮推荐
  |                                      |-- 风格详情
  |                                      |-- 收藏读写
  |                                      `-- 学院文章发现
  |
  |-- 知识问题且无 Skill 匹配 ----------> 微信知识库
  |                                      |-- BJCP 风格资料
  |                                      |-- 扩展风格资料
  |                                      `-- 学院文章
  |
  `-- 深度浏览或兜底 -------------------> 现有小程序页面
                                         |-- 卡片关联页面
                                         |-- 半屏页面
                                         `-- 页面文字链
```

AI 不负责计算风格匹配。它只把自然语言转换成受约束的枚举参数，实际结果继续由当前数据和规则产生。

## 双构建目标

### 正式项目

仓库中的 `miniprogram/` 继续作为可直接提审的正式项目：

- `miniprogram/app.json` 不包含 `agent`。
- 不包含 Skill 独立分包。
- 不包含 `wx.openAgent`、`wx.navigateBackAgent` 或 AI 专用原子组件。
- 当前测试和发布流程保持可用。

### AI 内测项目

新增受版本控制的 `ai-mode/` 源码目录，构建到已被 `.gitignore` 排除的：

```text
artifacts/ai-mode-project/
```

建议结构：

```text
ai-mode/
|-- AGENTS.md
|-- page-meta.json
|-- skill/
|   `-- craft-beer-guide/
|       |-- SKILL.md
|       |-- mcp.json
|       |-- index.js
|       |-- apis/
|       |-- components/
|       `-- runtime/
|-- detail-pages/
|-- overlays/
|   `-- manifest.json
`-- knowledge/
    `-- build-config.json

scripts/
`-- build_ai_mode_project.cjs
```

构建脚本执行以下步骤：

1. 清理并重新创建 `artifacts/ai-mode-project/`。
2. 复制正式 `miniprogram/` 到 AI 项目的 `miniprogram/`。
3. 从现有源数据生成适合独立 Skill 环境使用的 CommonJS 数据模块。
4. 复制 `ai-mode/skill/` 和 AI 专用半屏页面。
5. 以结构化方式修改生成副本的 `app.json`，加入独立分包、`agent.skills`、`instruction` 和 `pageMetadata`。
6. 对生成副本应用 AI 页面入口覆盖层。
7. 写入单独的 AI 项目配置。
8. 运行生成物结构、大小和数据一致性检查。

覆盖层采用明确的文件、锚点和期望替换次数。任一锚点缺失、重复或上下文漂移时，构建必须失败，禁止静默生成残缺项目。

正式源码是唯一页面基线，AI 覆盖层只描述增量，避免维护两套完整页面。

## 数据与模块复用

### 唯一事实来源

继续使用现有源数据：

- `data/beer-data-source.json`
- `data/style-language-map.json`
- `academy-sites/*`
- `scripts/style_aliases.cjs`
- 现有扩展风格和口味画像构建输入

普通小程序数据、AI Skill 数据和知识库文档必须由同一事实来源生成。

### Skill 数据产物

独立 Skill 不能假设可以直接导入普通小程序主包中的 ES Module。构建脚本应生成 Skill 私有 CommonJS 数据：

```text
skills/craft-beer-guide/generated/
|-- styles.js
|-- extension-styles.js
|-- taste-schema.js
|-- academy-sites.js
`-- manifest.json
```

`manifest.json` 记录源数据摘要、风格数量、文章数量和生成时间，供漂移测试使用。

Skill 内部实现保持无网络依赖，不声明实时动态组件权限，不使用定时器。

## Skill 划分

首期只声明一个 Skill：

```json
{
  "name": "craft-beer-guide",
  "description": "精酿啤酒风格搜索、择饮推荐、风格详情、学院文章发现与本地收藏管理",
  "path": "skills/craft-beer-guide"
}
```

单 Skill 可以减少模型在相近的“搜索”“推荐”“详情”Skill 之间误判。知识问答不写入 Skill 描述，由知识库承接。

## 全局提示词

`AGENTS.md` 负责跨能力边界：

- 用户要求执行搜索、推荐、查看特定风格、管理收藏或寻找文章时使用 Skill。
- 用户询问概念、历史、风格比较、品鉴知识或学院正文内容时优先使用知识库。
- 不使用模型自身知识补充知识库中没有的项目事实。
- 不编造 `styleRef`、文章 slug 或收藏状态。
- Skill 返回卡片后，先等待用户选择，不自动越过确认步骤。
- 文字链仅用于完整阅读和深度浏览，不作为搜索、推荐或收藏的主要执行方式。
- 对酒精饮品保持中性教育语气，不鼓励过量饮酒。

文件控制在平台 10000 字节限制内。

## 原子接口

### 1. `searchBeerStyles`

用途：用户明确说出风格名、编号、英文名、社区别名或风味关键词时搜索风格。

输入：

```json
{
  "query": "西海岸 IPA",
  "limit": 3
}
```

约束：

- `query` 必须来自用户原话或当前页面上下文。
- 用户只表达模糊饮用需求时不得调用，应改用 `recommendBeerStyles`。
- `limit` 首期固定为 1 至 3，默认 3。

输出的每项包含：

- `styleRef`: `{ "kind": "bjcp|extension", "id": "..." }`
- `code`
- `displayName`
- `nameEn`
- `aliases`
- `matchReason`
- `color`

无结果时返回 `isError: true`，说明未匹配事实，引导用户换关键词或改走推荐，并禁止用相同关键词重复调用。

### 2. `recommendBeerStyles`

用途：用户描述场景或模糊口味时调用现有择饮规则。

输入使用语义枚举，不让模型直接生成内部 `-1/0/1`：

```json
{
  "scenario": "easy|meal|bold|explore",
  "preferences": {
    "sweetness": "low|neutral|high|unspecified",
    "sourness": "low|neutral|high|unspecified",
    "bitterness": "low|neutral|high|unspecified",
    "body": "low|neutral|high|unspecified",
    "strength": "low|neutral|high|unspecified"
  }
}
```

处理流程：

1. 校验枚举。
2. 映射到现有五维口味模型。
3. 使用与 `getTasteMatches` 相同的确定性评分规则。
4. 返回最多 3 个主要结果。
5. 将更多结果和筛选状态放入卡片所需数据，供半屏页面继续选择。

返回结果包含 `styleRef`、匹配分数和最多 3 条项目数据产生的推荐理由。模型不得自行撰写新的匹配理由。

条件冲突导致无结果时，明确建议放宽一个具体维度，不自动篡改用户偏好。

### 3. `getBeerStyleDetail`

用途：展示一项已找到风格的摘要详情。

输入：

```json
{
  "styleRef": {
    "kind": "bjcp",
    "id": "18B"
  }
}
```

`styleRef` 必须来自 `searchBeerStyles`、`recommendBeerStyles`、`listFavoriteBeerStyles` 或卡片上行消息的原值。

输出只包含适合卡片和模型理解的摘要：

- 名称、编号和类型
- 常用别名
- 整体印象摘要
- 关键参数
- 口味标签
- 关联页面信息

完整 BJCP 正文仍由现有详情页和知识库承接。

### 4. `listFavoriteBeerStyles`

用途：读取本地收藏并显示轻量列表。

继续使用：

```text
craftBeerFavoriteStyleIds.v1
```

返回顺序与现有收藏页一致。失效 ID 被忽略，但应在本地调试日志中记录。

### 5. `addFavoriteBeerStyle`

用途：将上游返回的 `styleRef` 幂等加入收藏。

- 已收藏时不重复写入，返回“此前已收藏”的事实。
- 写入成功后返回收藏状态卡。
- 不在接口成功前声称已收藏。

### 6. `removeFavoriteBeerStyle`

用途：将上游返回的 `styleRef` 幂等移出收藏。

- 未收藏时返回“当前不在收藏中”的事实。
- 移除成功后返回收藏状态卡。
- 不在接口成功前声称已移除。

### 7. `findAcademyArticles`

用途：用户要求寻找、推荐或打开学习材料时搜索现有学院文章。

输入：

```json
{
  "query": "IPA 入门",
  "limit": 3
}
```

返回文章 slug、标题、摘要、类型、难度、阅读时间和相关风格。接口只负责文章发现，不承担开放式知识问答。

## 收藏兼容

当前收藏模型只解析 BJCP 详情。为保证 AI 搜索和推荐返回的扩展风格也能收藏，首期将收藏引用统一为 `styleRef`：

- 现有字符串 ID 数据继续有效。
- BJCP ID 和 `ext-` 前缀的扩展风格 ID 不冲突。
- 收藏摘要解析器同时支持 BJCP 和扩展风格。
- 收藏页根据 `kind` 跳转至对应详情页。
- 存储 key 不升级，避免丢失用户现有收藏。

## 原子组件

### `style-list-card`

供搜索、推荐和收藏列表复用：

- 最多展示 3 项。
- 显示名称、编号或 `EX`、简短原因和可选匹配分数。
- 点击某项以上行消息调用 `getBeerStyleDetail`。
- 推荐结果可打开半屏页面查看更多匹配。
- 卡片关联页根据来源设置为搜索、择饮或收藏页。

### `style-detail-card`

- 展示风格摘要，不复制完整详情页。
- 提供“收藏/取消收藏”的对话动作。
- 通过卡片标题栏关联到 BJCP 或扩展风格详情页。
- 关联页 query 使用真实 `styleRef.id`。

### `favorite-status-card`

- 展示收藏操作结果和当前状态。
- 声明 `expirable: true`。
- 新状态卡出现时让旧收藏状态卡过期，避免用户操作陈旧状态。

### `academy-article-list-card`

- 最多展示 3 篇文章。
- 点击文章打开现有学院文章关联页。
- 不在卡片中塞入完整文章正文。

所有组件：

- 使用类选择器和平台支持的 WXSS 子集。
- 高度在初始化时确定。
- 只依赖 tap 交互。
- 不使用动画、纵向滚动、网络请求或定时器。
- 渲染所需但模型无须理解的数据放入 `_meta`。

## 半屏页面

首期提供两个 AI 专用半屏页面：

### `style-results`

- 展示搜索、推荐或收藏的更多风格。
- 点击风格后以用户口吻上行消息，并定向调用 `getBeerStyleDetail`。
- 不进行任何页面路由。

### `taste-refine`

- 允许用户调整五个口味枚举和场景。
- 提交时关闭半屏，以上行消息定向调用 `recommendBeerStyles`。
- 上行文案使用自然语言，例如“按低苦、轻酒体和中等强度重新推荐”。
- 不上行内部字段名、数值编码或系统错误。

半屏页面仅用于选择和补充信息，不复制完整搜索页、择饮页或详情页。

## 页面元数据

生成版 `page-meta.json` 描述：

- `pages/explore/index`
- `pages/choose/index`
- `pages/academy/index`
- `pages/favorites/index`
- `pages/search/index`
- `subpages/style/index`
- `subpages/extension-style/index`
- `subpages/academy-article/index`

详情页 query 明确声明 `styleId` 或 `slug` 的来源和必填约束。

元数据控制在 8000 字节内。核心操作不依赖文字链；文字链用于完整阅读、继续浏览和异常兜底。

## 现有页面中的 AI 入口

AI 入口只应用于生成的 AI 内测项目，不写入正式 `miniprogram/`。

覆盖层在以下位置加入轻量入口：

- 择饮页：用一句话描述今晚想喝什么。
- 搜索页：让 AI 帮我找风格。
- BJCP 与扩展风格详情页：问 AI 这个风格。
- 学院文章页：继续问 AI 本文内容。
- 收藏页：根据我的收藏继续推荐。

调用流程：

1. 使用 `wx.checkIsSupportAgent()` 检查能力。
2. 不支持时隐藏入口，不显示无效按钮。
3. 支持时调用 `wx.openAgent()`。
4. `context` 只携带当前页面类型、真实业务 ID、用户可见摘要和当前筛选，不携带完整数据集。
5. `followUpMessage` 使用自然用户口吻，不暴露内部接口名称。

从卡片关联页或文字链进入小程序后，生成版页面可使用 `wx.navigateBackAgent()` 返回对话，并携带必要上下文。

## 知识库

构建脚本从同一源数据生成不超过 10 个文件，首期使用 3 个 Markdown 文件：

```text
artifacts/ai-knowledge-base/
|-- bjcp-style-guide.md
|-- extension-style-guide.md
`-- academy-articles.md
```

每份文档包含稳定标题层级、业务 ID、别名、来源说明和可独立理解的段落，避免巨大 JSON 直接上传。

内容边界：

- `bjcp-style-guide.md`: 项目现有 BJCP 风格、参数、感官描述和关系。
- `extension-style-guide.md`: 市场扩展风格及其来源标签和 BJCP 关联。
- `academy-articles.md`: 现有学院文章正文和文章元数据。

文档不加入未经项目数据确认的外部知识。上传、召回测试、审核和发布仍需在微信公众平台手动完成，构建脚本只负责生成可上传文件。

## 返回数据分层

每个成功接口遵循：

- `content`: 本次事实和下一步动作，不重复卡片全部字段。
- `structuredContent`: 模型需要理解的卡片内容。
- `_meta`: 图片、完整列表、视图状态等模型无须理解的渲染数据。

错误接口遵循：

1. 陈述具体失败事实。
2. 给出一个可执行出口。
3. 明确禁止的重复或编造动作。
4. 返回 `isError: true`，不渲染卡片。

## 中间件与观测

Skill 使用中间件统一处理：

- 参数和运行环境基础校验。
- 调用耗时。
- 成功、失败和错误类型记录。
- 开发环境日志。

首期不建设服务端日志。可用时调用微信分析能力，不可用时只写入有上限的本地调试队列。不得记录用户完整自然语言、收藏清单或其他不必要的隐私内容。

建议事件：

- `ai_skill_call`
- `ai_skill_success`
- `ai_skill_error`
- `ai_card_follow_up`
- `ai_open_from_page`
- `ai_return_to_page`

## 降级与错误处理

- 设备不支持 Agent：隐藏 AI 页面入口，原小程序完全正常。
- Skill 数据未生成：AI 构建直接失败。
- 搜索无结果：建议换别名、编号或改用推荐。
- 推荐无结果：建议放宽一个明确口味维度。
- 非法 `styleRef`：要求先搜索、推荐或查看收藏，不猜测 ID。
- 收藏存储异常：不声称操作成功，保留原状态。
- 知识库未召回：明确当前资料中没有足够依据。
- 卡片渲染失败：允许模型用一句简短文本说明，并提供关联页兜底。

## 测试策略

### 单元测试

- 7 个原子接口的成功、无结果、非法参数和异常分支。
- 推荐参数枚举到现有五维模型的映射。
- AI 推荐结果与现有 `getTasteMatches` 对代表性样本保持一致。
- 搜索结果与现有 `searchStyles` 对代表性关键词保持一致。
- BJCP 和扩展风格收藏的幂等读写。
- `content`、`structuredContent` 和 `_meta` 的字段分层。

### 构建与结构测试

- 正式 `miniprogram/app.json` 不包含 `agent`。
- AI 生成版包含独立 Skill 分包、`lazyCodeLoading`、全局提示词和页面元数据。
- `SKILL.md`、`mcp.json` 和 `AGENTS.md` 不超过平台限制。
- 所有 API 名称在 `mcp.json` 和 `index.js` 中一致。
- 所有原子组件都配置关联页面。
- AI 覆盖层每个锚点只匹配一次。
- Skill 数据数量和正式小程序数据一致。
- 生成项目不超过微信代码包限制。
- 知识库文件不超过 10 个，单文件不超过 10 MB。

### 开发者工具验收对话

至少验证以下场景：

1. “想喝点清爽不苦的。”
2. “配烧烤喝什么？”
3. “找西海岸 IPA。”
4. “21A 是什么？”
5. “浑浊 IPA 有哪些叫法？”
6. 搜索一个不存在的风格。
7. “收藏这个。”
8. 对已收藏风格再次收藏。
9. “取消收藏。”
10. “看看我的收藏。”
11. “冷 IPA 和西海岸 IPA 有什么区别？”
12. “推荐一篇适合入门的文章。”

还需验证：

- 从择饮、搜索、详情、学院和收藏页面打开 AI 时上下文正确。
- 半屏页面不能跳转，提交后能回到 AI 并调用正确接口。
- 卡片关联页和文字链 query 正确。
- 不支持 Agent 的设备不出现入口。
- 标准正式项目仍可编译和运行全部现有测试。

## 发布流程

### 日常正式发布

继续使用仓库根目录项目，不运行 AI 项目上传。发布检查必须断言正式包无 `agent` 字段和 Skill 分包。

### AI 内测

1. 运行 AI 构建命令。
2. 运行生成物测试。
3. 使用 Nightly Electron Build 开发者工具导入 `artifacts/ai-mode-project/`。
4. 使用已获开发模式权限的 AppID 编译和调试。
5. 上传 `artifacts/ai-knowledge-base/` 中的知识库文件。
6. 在开发版和体验版执行核心对话清单。

在微信正式开放提审前，不把生成的 AI 项目作为正式版本上传。

## 非目标

- 不自建聊天 UI。
- 不调用外部大模型 API。
- 不建设云函数、账号后端或远程数据库。
- 不做酒标、酒单或图片识别。
- 不让 Agent 修改 BJCP 数据或学院内容。
- 不支持订单、支付、库存或门店服务。
- 不将完整小程序页面塞入原子卡片。
- 不维护第二套手工复制的业务数据。

## 成功标准

- 用户能通过自然语言完成搜索、推荐、详情和收藏闭环。
- 知识问答只使用可追溯的项目内容。
- AI 结果与现有确定性模型保持一致。
- 不支持 AI 的设备和正式发布版本不受影响。
- AI 内测项目可以通过一条构建命令稳定再现。
- 源数据变更后，普通小程序、Skill 和知识库不会静默漂移。
