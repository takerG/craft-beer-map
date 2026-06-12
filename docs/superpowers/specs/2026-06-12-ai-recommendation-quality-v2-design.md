# AI 推荐质量 V2 设计

## 1. 目标与结论

下一版继续聚焦：

- A：推荐准确率与连续对话体验。
- C：离线评测、受控体验对照、构建时变体，以及平台允许范围内的普通页面辅助分析。

北极星指标仍为：

```text
AI 闭环完成率 =
完成查看详情或收藏的推荐流程数
/
进入推荐意图的流程数
```

其中主指标是 `completed / started`。`completed / shown` 只作为卡片展示后的辅助转化指标。

当前微信 AI Skill API 与原子组件的官方 JSAPI 白名单不包含 `wx.reportEvent` 或 `wx.reportAnalytics`。因此当前版本：

- 不在 Skill API 或原子组件中生成、引用、封装或预置微信分析调用。
- 不实现 `full` 遥测模式。
- 不声称可以从线上分析得到完整北极星漏斗。
- 北极星指标只通过 control/candidate 的完整微信平台 trace 与受控体验验收计算。
- 普通生成页面只有在人工验证微信分析可用后，才能启用 `page-only` 辅助事件；这些事件不得作为北极星分子或分母。
- 无论样本多少，当前阶段都不得宣布“线上 A/B 胜负”。

不引入后端、云函数、远程数据库、外部模型 API、账号系统或远程开关。

## 2. 官方平台边界

本设计以 2026 年 6 月 12 日核对的以下官方资料为准：

- `JSAPI_WHITELIST.md`
- `HALF_SCREEN.md`
- `COMPONENT_TEMPLATES.md`

原始地址：

- https://github.com/wechat-miniprogram/ai-mode-skills/blob/master/wxa-skills-generate/references/JSAPI_WHITELIST.md
- https://github.com/wechat-miniprogram/ai-mode-skills/blob/master/wxa-skills-generate/references/HALF_SCREEN.md
- https://github.com/wechat-miniprogram/ai-mode-skills/blob/master/wxa-skills-generate/references/COMPONENT_TEMPLATES.md

### 2.1 Skill 与组件

- Skill 运行在独立分包，不依赖 `getApp`、`globalData`、主包初始化或跨包业务模块。
- Skill API 和原子组件均不得调用未在对应白名单中的 JSAPI。
- 原子组件 tap handler、异步回调和主动操作时，必须当场调用：
  - `wx.modelContext.getContext(this)`
  - `wx.modelContext.getViewContext(this)`
- 禁止通过 `this._modelCtx`、`this._viewCtx` 等缓存引用主动调用 `sendFollowUpMessage`、`openDetailPage`、`expirePreviousCards` 或其他上下文方法。
- `created` 中可以用局部 context 注册 `Result`、`Overflow` 等监听；监听注册后由 SDK 持有。

### 2.2 半屏页面

半屏页面的上行统一使用：

```js
const ctx = wx.modelContext.getContext();
ctx.sendFollowUpMessage({ content });
```

半屏页面不传 `this`。当前代码中的 `wx.navigateBackAgent` 不再作为 V2 方案。

半屏参数必须通过官方支持且已由 Task 0 验证的输入方式传递。完整偏好快照禁止放入 URL query。若平台没有可验证的结构化输入方式：

- 调整页不预填完整快照。
- 不使用 URL、storage 或日志传递快照。
- 多轮局部修正以对话上行为主，模型必须根据最近一次 API 结果重发完整快照。
- 半屏页可以让用户重新明确全部维度，但不能声称保留了未预填的旧值。

### 2.3 卡片过期与溢出

- 只使用官方确认的 `expirePreviousCards` 或 `expireAllCards`。
- 不假设存在 `NotificationType.Expire`。
- 卡片过期是体验保护，`revision` 校验才是防陈旧操作的安全主线。
- 新组件根节点不得设置 `height`、`min-height` 或 `max-height`。
- 组件必须监听 `NotificationType.Overflow`。
- 发生溢出时减少首屏内容或打开半屏详情，不允许依赖纵向滚动。

## 3. 交付里程碑

### M0：平台探针与人工门禁

人工核对并记录：

- AppID 是否开通 AI 开发模式。
- 微信开发者工具与基础库的精确版本。
- 官方 `wxa-skills-validate` 是否可运行及结果。
- 半屏 `sendFollowUpMessage` 的实际行为。
- `expirePreviousCards`、`expireAllCards` 的实际行为。
- `NotificationType.Overflow` 与容器尺寸行为。
- 普通生成页面的微信分析能力。
- 是否存在可验证的半屏结构化输入方式。

M0 不阻塞纯函数核心开发，但任何未验证平台能力默认关闭。官方 validator 不可用时，平台发布验收保持阻断状态，不得用本地正则检查冒充官方验证。

### M1：Candidate 推荐质量

- semantic-v2 完整快照。
- 连续对话、严格 revision 与 requestId 幂等。
- 数据驱动冲突检测和结构化解释。
- Candidate 推荐卡片与调整体验。
- 20 至 30 个高风险自动化测试。

M1 不依赖在线完整漏斗。

### M2：Control 对照与完整评测

- legacy-v1 control 与 semantic-v2 candidate 双构建。
- 完整 60 条平台自然语言 trace 集。
- control/candidate 各自的完整 trace。
- 自动评分、构建一致性与发布门禁。

### M3：普通页面辅助分析

仅当 M0 验证通过时启用 `page-only`：

- 统计 AI 入口点击、页面来源等辅助事件。
- 不传 `flowId`、偏好、风格或收藏信息。
- 不计算北极星指标。
- 不影响 M1/M2 推荐质量发布。

## 4. 版本化产品契约

### 4.1 Control：`legacy-v1`

Control 保留当前用户行为：

- `recommendBeerStyles` 使用 `-1|0|1` 数值契约。
- `0` 继续保持当前“中立或未指定”的合并语义，禁止事后猜成 `neutral` 或 `unspecified`。
- 保留当前推荐卡片、半屏调整语义、排序和解释方式。
- 只增加不改变用户行为的端内 flow/trace 测量字段。
- 不复用 Candidate 新卡片或新调整控件。

Control 必须有完整流程测试，确保共享基础设施没有改变基线。

### 4.2 Candidate：`semantic-v2`

Candidate 输入：

```json
{
  "scenario": "easy",
  "preferences": {
    "sweetness": "unspecified",
    "sourness": "low",
    "bitterness": "low",
    "body": "low",
    "strength": "neutral"
  },
  "flow": {
    "mode": "continue",
    "flowId": "arf_7f91c4a18e3b",
    "expectedRevision": 0,
    "requestId": "req_082b51d447"
  },
  "limit": 6
}
```

规则：

- `scenario`: `easy|meal|bold|explore|unspecified`。
- 五维偏好全部必填：`low|neutral|high|unspecified`。
- `neutral` 表示明确要求中间值；`unspecified` 表示用户未表达。
- `flow` 对首次和后续调用都必填。
- 首次调用使用 `{ "mode": "start", "requestId": "..." }`，Skill 创建 `flowId`、`revision=0`。
- 后续调用使用 `{ "mode": "continue", "flowId": "...", "expectedRevision": 0, "requestId": "..." }`。
- 后续调用必须重发完整快照。
- `expectedRevision` 必须是非负整数，且严格等于当前 revision。
- `requestId` 必须符合固定格式，用于同一 Skill 上下文内幂等。
- `limit` 是 1 至 12 的整数。

### 4.3 UI 契约

生成项目写入：

```text
recommendationContract: legacy-v1 | semantic-v2
```

- `legacy-v1` 绑定现有 API schema、现有卡片和现有调整语义。
- `semantic-v2` 绑定 Candidate API schema、推荐专用卡片和 Candidate 调整语义。
- 两种契约不得共享会改变用户行为的 UI。
- 共享部分只限 catalog、纯搜索/详情/收藏能力、构建框架和 trace 基础格式。
- Candidate 的 `recommendation-v2-card` 在 MCP 中必须声明 `expirable: true`，并使用业务化 `expiredText: "推荐条件已更新，请使用最新结果"`。
- 生成产物测试必须验证上述字段；旧卡片是否允许副作用仍只由 flow revision 判断，卡片过期状态不能替代服务逻辑校验。

## 5. 推荐状态模型

产品状态与技术失败分开：

### 5.1 产品状态

- `recommended`：有兼容候选。
- `needs-clarification`：用户表达不足，需要一个简短追问。
- `conflict`：明确偏好之间没有兼容候选，可建议放宽一项。
- `no-compatible-match`：当前明确条件无兼容候选，但无法形成可靠的单项放宽建议。

### 5.2 技术失败

- `invalid-input`
- `stale-revision`
- `future-revision`
- `invalid-revision`
- `duplicate-request`
- `expired-flow`
- `wrong-variant`
- `empty-catalog`
- `storage-unavailable`
- `internal-error`

产品状态不计入 API 技术错误率。guardrail 分别比较：

- `needs-clarification` 流程率。
- `conflict + no-compatible-match` 流程率。
- 技术失败率。
- empty-catalog/internal-error 率。

## 6. 推荐算法与解释

### 6.1 明确维度

- `unspecified` 不作为约束。
- `low`、`neutral`、`high` 都是明确约束。
- 场景基线只影响排序和解释，不把未表达偏好改写成用户偏好。

### 6.2 冲突检测

冲突只基于当前 catalog：

1. 计算满足所有明确条件且没有反向冲突的候选。
2. 有候选时返回 `recommended`，非精确项写入 tradeoff。
3. 无候选时分别模拟放宽每一个明确维度。
4. 选择恢复候选最多的一项。
5. 并列时按固定顺序：甜度、酸度、苦味、酒体、强度。
6. 只建议放宽一个维度，不自动修改用户快照。
7. 没有任何单项放宽可恢复候选时返回 `no-compatible-match`。

### 6.3 结构化解释

解释由模板和 catalog 字段生成：

- `matched`：候选与明确维度的命中。
- `tradeoffs`：候选与明确维度或场景基线的差异。
- `adjustments`：一个可执行调整方向。

测试必须逐项验证解释能映射回 catalog 值和固定模板。模型不得新增未返回的事实。

## 7. Flow、Revision 与副作用安全

### 7.1 生命周期

- `flowId` 只用于端内短期假名化状态，不上传到普通页面分析。
- flow 在最后活动 30 分钟后过期。
- `expectedRevision === currentRevision` 才能继续。
- 小于当前值是 `stale-revision`。
- 大于当前值是 `future-revision`。
- 非整数或负数是 `invalid-revision`。
- 每次成功修订后 revision 加 1。

### 7.2 收藏副作用

收藏操作必须按顺序执行：

1. 校验 variant。
2. 校验 flow 存在且未过期。
3. `assertCurrent(expectedRevision)`。
4. 只读调用 `hasProcessedRequest(requestId)`；若已处理则返回既有结果或 `duplicate-request`。
5. 校验目标 styleRef 来自该 flow 最近一次推荐结果。
6. 执行收藏写入。
7. 收藏业务成功后调用 `commitRequest(requestId)`。
8. 成功提交 requestId 后调用 `complete`。

任何 stale、expired、future、invalid revision 都必须在 `setStorageSync` 收藏写入之前失败。

收藏写入失败时不得调用 `commitRequest` 或 `complete`，同一 requestId 可以安全重试。不存在会在业务成功前消费 requestId 的 `acceptRequest` API。

详情是只读操作，可以返回有效风格详情；但旧 flow、错误 revision 或不属于推荐结果的 styleRef 不得错误完成该 flow。

### 7.3 幂等与并发承诺

- Candidate 组件和半屏提交后立即设置 `inFlight=true`，阻止重复点击。
- 每次动作使用 `requestId`。
- 已处理 requestId 返回原结果或 `duplicate-request`，不得重复副作用。
- 每个 flow 使用独立的内存 Promise 队列锁。不同 flow 可以并行，同一 flow 的调整、详情完成和收藏操作串行执行。
- 临界区覆盖：flow/revision 校验、requestId 只读检查、最近推荐结果校验、同步收藏 storage 读写、`commitRequest`、revision/完成状态提交。
- 当前收藏适配器使用同步 `getStorageSync` / `setStorageSync`，临界区回调禁止 `await`，避免持锁期间控制权外泄。若未来收藏 I/O 变为异步，必须重新设计事务边界，本版本不得直接替换。
- 详情读取 catalog 可以在锁外完成；与 flow 完成有关的 revision 校验和 `complete` 必须在锁内重新确认。
- 当前只承诺单 Skill JavaScript 上下文内的一致性。
- 在没有官方 CAS 或跨上下文事务证明前，不承诺跨上下文强一致性。
- 并发验收使用 `Promise.all` 覆盖三类竞争：同一 revision 的两个不同 requestId、详情完成与收藏写入、同一 revision 的两个调整；每类都必须证明只有一个合法状态提交，且收藏最多写入一次。

## 8. Storage 与隐私

### 8.1 Flow storage 白名单

每条 flow 只允许：

```json
{
  "flowId": "arf_7f91c4a18e3b",
  "revision": 1,
  "lastActiveAt": 1781190000000,
  "completed": false,
  "requestIds": ["req_082b51d447"]
}
```

禁止保存：

- source、createdAt、completionType。
- 完整偏好或其可逆编码。
- styleRef、推荐列表或收藏信息。
- 用户原话、模型回复或用户标识。

为验证终点 style 必须来自推荐结果，最近一次推荐 styleRef 只保留在当前 Skill 上下文内存中。上下文丢失时不得执行带 flow 完成语义的收藏；可以要求重新展示推荐。不得为了恢复而把推荐列表写入 storage。

### 8.2 页面分析

页面事件字段只允许：

- `experimentId`
- `variant`
- `environment`
- `buildId`
- `pageSource`
- `eventName`

线上事件禁止 `flowId`。不生成 styleRef subject 哈希。

`off` 模式：

- 不调用微信分析。
- 不创建 pending 队列。

`page-only` 模式：

- 仅生成普通页面适配器 `utils/ai-recommendation-telemetry.js`。
- 不覆盖或修改生成副本中的 `utils/telemetry.js`。
- pending 最多 50 条，总序列化大小不超过 32 KB，TTL 24 小时。
- 上报成功立即删除。
- 按 `experimentId/variant/environment/buildId` 隔离。
- 只能由相同环境重试。
- 记录与当前构建不匹配时直接丢弃。
- 页面事件不能作为北极星分子或分母。
- pending 队列在适配器初始化、storage 读取后、每次写入前和每次 flush 前都执行同一个 `prunePendingQueue`。
- `prunePendingQueue` 同时执行 TTL、最多 50 条和最多 32 KB 三项限制；任何入口都不能绕过清理。

### 8.3 页面 query

- 禁止在 query 中放偏好快照、风格信息或收藏信息。
- 只有平台交互确实需要时，才允许最低必要 flow routing，例如 `flowId` 与整数 revision。
- 如果当前版本不需要普通页面完成在线闭环，则删除 flow routing，不为未来假设预留 query。

## 9. Trace 与评测

### 9.1 完整平台 trace

北极星指标来自微信平台实际运行 trace，不来自页面分析。

每个 trace 至少记录：

- case ID。
- experiment/build/catalog/variant 指纹。
- fixture 定义的完整 turn 列表，每个 turn 包含稳定 `turnId`、角色和合成内容。
- 每个预期 assistant turn 对应一个且仅一个 `assistantOutputs` 项，使用相同 `turnId`。
- API 调用名称、参数和结构化结果。
- 卡片/半屏动作。
- `started`、`shown`、`completed` 的 trace 判定。

trace schema 必须 `additionalProperties: false`。运行 trace 写入忽略目录 `artifacts/ai-evaluation-traces/`，保留不超过 30 天。

只允许保存仓库中定义的合成话术。禁止把真实用户会话写入 trace。

完整 assistant 输出用于零编造检查。评分器从 fixture 的总 turn 列表推导预期 assistant turn，并按 `turnId` 验证一一对应。遗漏、重复、顺序错误、未知 turnId 或空输出都使 case 失败。评分器不得依赖人工填写空的 `assistantClaims`。

### 9.2 60 条自然语言用例

60 条全部是可在微信平台执行的自然语言场景。storage 抛错、catalog 空、TTL 边界等不属于自然语言平台用例，移入独立故障注入单元测试。

fixture 使用：

```json
{
  "expectedByVariant": {
    "control": {},
    "candidate": {}
  }
}
```

共同评分：

- API 选择。
- 终点动作。
- 数据外事实为 0。
- trace 完整性。

Candidate 专属评分：

- semantic-v2 完整快照。
- `neutral` / `unspecified` 区分。
- 未修改维度保留。
- revision、requestId 和冲突建议。

Control 专属评分：

- legacy-v1 数值参数。
- 当前卡片与调整语义不变。
- 不把 `0` 解释为单一语义。

### 9.3 高风险自动化

M1 先落地 20 至 30 个高风险测试：

- limit 边界。
- stale/future/non-integer revision。
- 已完成 flow。
- 错误 variant。
- requestId 重复。
- TTL 前后边界。
- stale 收藏不写 storage。
- 终点 style 不在最近推荐结果。
- storage 异常。
- empty catalog/internal error。
- 动态 redacted logger。
- 组件 handler、modelContext stub、`setData`、Overflow 和 inFlight。

隐私测试反序列化 storage、pending 与事件后按字段白名单断言，不使用关键词黑名单代替结构校验。

## 10. 指标与受控体验对照

### 10.1 指标

主指标：

```text
completed / started
```

- `started`：推荐意图被平台接受并进入推荐流程。
- `completed`：同一 trace 中成功查看推荐结果详情或成功收藏推荐结果。

辅助指标：

- `completed / shown`
- 首次推荐完成率
- 调整后完成率
- needs-clarification 率
- conflict/no-compatible-match 率
- 技术失败率

若 `started` 无法从线上观测，只能从完整平台 trace 计算。页面入口事件不得替代 `started`。

### 10.2 方向性试运行

`200` 个流程/组只用于：

- 检查流程、trace、case 覆盖和事件质量。
- 发现明显回归。
- 估计基线完成率与方差。

试运行运营规则：

- control 与 candidate 各至少 40 名独立测试者。
- 每名测试者最多计入 5 个 started 流程。
- 使用固定运营名单和匿名 tester code。
- 名单维护责任人为实验运营负责人（Experiment Operations Owner），测试经理负责复核，研发不得自行修改分组结果。
- 审计文件固定为 `artifacts/ai-evaluation-traces/operations-audit.json`。
- 审计文件顶层严格记录 `experimentId`、`experimentBuildId`、`rosterOwner`、`reviewer`、`auditAt`、`windowStartedAt`、`windowEndedAt`、`testers`；`testers[]` 每项严格记录 `testerCode`、`assignedVariant`、`observedVariants`、`executedCaseIds`、`countedStartedFlows`。
- 全部参与测试者数 `N_all` 是审计文件中至少执行一个有效平台 case 的唯一 testerCode 数。
- 污染测试者数 `N_cross` 是 `observedVariants` 同时包含 `control` 和 `candidate` 的唯一 testerCode 数，不论其原始分组。
- 运营污染率公式：`contaminationRate = N_cross / N_all`；`N_all = 0` 时审计无效。
- 允许阈值为 `contaminationRate <= 0.05`。
- 交叉污染率由运营名单人工审计，不从遥测推断。
- 审计文件缺失、字段不完整、`N_all = 0`、名单无法复核或污染率超过 5% 时，只能输出方向性报告。
- 试运行不允许判胜。

### 10.3 正式对比

正式受控体验对照必须先：

1. 用试运行基线完成率做功效分析。
2. 明确最小可检测提升、显著性水平、检验功效和所需独立测试人数。
3. 预注册统计方法：
   - 两比例检验，或
   - control/candidate 完成率差值置信区间。
4. 每名测试者最多计入 3 个 started 流程。
5. 对重复流程采用 tester 聚类方法或先聚合到 tester 层级。

只有预设检验通过，或差值置信区间下界大于 0，才可以说“受控体验中 Candidate 更优”。

如果无法同期随机分配、独立测试人数不足、trace 不完整或运营交叉污染超标，只能称“受控体验对照”，禁止使用 A/B 胜负措辞。

## 11. 构建与可比性

### 11.1 buildContext

所有构建参数统一进入不可变 `buildContext`：

```json
{
  "experimentId": "ai-rec-quality-v2-20260612",
  "experimentBuildId": "ai-rec-quality-v2-20260612T090000Z",
  "variant": "control",
  "recommendationContract": "legacy-v1",
  "telemetryMode": "off",
  "sourceCommit": "ccc089f6c7d5d9f9a0b28765b67d6bb134c9481e",
  "sourceTreeFingerprint": "sha256:75c58392adce00f10f88f88f0f76125bf3f7da74fd13d3559f57f9eb6f4f11e9",
  "catalogFingerprint": "sha256:2cb25b14d801d7f4d8f733f4caecb3a780efddcdbccb8e0778b43a7f5487c2a6",
  "outputRoot": "D:/work/craft-beer-map/artifacts/ai-mode-experiment/control",
  "miniprogramRoot": "D:/work/craft-beer-map/artifacts/ai-mode-experiment/control/miniprogram",
  "knowledgeOutputRoot": "D:/work/craft-beer-map/artifacts/ai-mode-experiment/control/knowledge",
  "manifestPath": "D:/work/craft-beer-map/artifacts/ai-mode-experiment/control/build-manifest.json",
  "lockPath": "D:/work/craft-beer-map/artifacts/ai-mode-experiment/control/.build.lock",
  "fingerprintPath": "D:/work/craft-beer-map/artifacts/ai-mode-experiment/control/.build-fingerprint"
}
```

variant、telemetry mode、实验配置、契约模板、平台能力配置、构建脚本和源数据都进入 fingerprint。

`buildContext` 是所有输出路径的唯一来源。构建 helper 只接收 context 或由 context 派生的显式参数，不得读取模块级 `outputRoot`、`outputMiniProgramRoot`、`knowledgeOutputRoot`、manifest、lock 或 fingerprint 常量。

正式实验构建要求干净工作树。日常开发构建可以允许 dirty，但 manifest 必须标记 `dirty: true`，且不得用于正式平台 trace。

### 11.2 双构建

- control 与 candidate 同一次命令生成。
- 共享 experimentBuildId、sourceCommit、sourceTreeFingerprint 和 catalogFingerprint。
- 各自写入正确 contract。
- 测试缓存 key 包含完整 buildContext，禁止跨变体复用。
- 同一 outputRoot 从 control 切换为 candidate 时必须因 variant/contract/fingerprint 变化而重建，不能命中 control 缓存。
- 构建或检查一个变体不得创建、删除或修改另一个变体目录。
- `check_ai_mode_project.cjs` 必须真正解析 `--output-root` 与 `--no-build`。
- `--no-build` 只检查指定产物，不触发默认项目重建。

### 11.3 MCP 严格 schema

- 递归遍历 inputSchema/outputSchema，所有嵌套 object 都设置 `additionalProperties: false`。
- 必填字段列入 `required`。
- Candidate 的 `preferences.required` 必须恰好包含 `sweetness`、`sourness`、`bitterness`、`body`、`strength`。
- Candidate 顶层 `required` 必须包含 `scenario`、`preferences`、`flow`。
- `flow` 使用严格 start/continue 分支；continue 分支要求 `flowId`、`expectedRevision`、`requestId`，start 分支要求 `requestId`。
- `expectedRevision` 使用 `type: "integer"`、`minimum: 0`；`limit` 使用 `type: "integer"`、`minimum: 1`、`maximum: 12`。
- flowId/requestId 使用固定 pattern。
- outputSchema 与真实返回完全对齐。
- 发布前必须通过官方 validator。
- 官方 validator 不可用或未执行时，发布阻断，不能用本地测试标记为“官方验证通过”。

## 12. 发布门禁

唯一不可绕过的发布审计入口是：

```powershell
npm run audit:ai-recommendation-release
```

该命令必须在任一条件不满足时非零退出：

- control/candidate 各缺少 60 条标记为真实平台来源的 trace。
- case ID 未在每个变体中恰好出现一次。
- 任一预期 assistant turn 缺失、重复、顺序错误或输出为空。
- variant/build/catalog/source/contract 指纹不匹配。
- 官方 validator 或 DevTools 探针证据缺失；证据路径固定为 `artifacts/ai-mode-platform-probe/probe-record.json`、`artifacts/ai-mode-platform-probe/validator-control.json`、`artifacts/ai-mode-platform-probe/validator-candidate.json`。
- 工作树不干净。
- `operations-audit.json` 缺失、字段不完整、污染率大于 5% 或无法复核。

合成 trace 只能测试 schema 与 scorer，必须标记 `traceSource: "synthetic"`，且永远不能通过 release audit。真实平台 trace 必须标记 `traceSource: "wechat-platform"`。

M1 Candidate 内部体验门禁：

- 纯推荐、flow、安全和高风险自动化全部通过。
- 不依赖未经 M0 验证的平台能力。

M2 受控体验门禁：

- control/candidate 各自有完整平台 trace。
- 60 个 case ID 在每个变体中恰好出现一次。
- build/catalog/variant/contract 指纹一致且正确。
- scorer 实际运行并通过。
- assistant 输出完整，零编造检查可执行。
- 官方 validator 已运行通过。
- 运营污染审计产物通过 5% 阈值。
- `npm run audit:ai-recommendation-release` 退出 0。

没有真实平台 trace，不得声称完成平台验收。

M3 页面分析门禁：

- 普通生成页面分析能力由 M0 手工验证。
- 适配器路径为 `utils/ai-recommendation-telemetry.js`。
- 正式 `miniprogram/utils/telemetry.js` 和生成副本原文件保持不变。
- page-only 事件只用于辅助指标。

## 13. 成功标准

- Candidate 支持完整语义快照和可靠的局部修正。
- Control 保持 legacy-v1 行为，基线不被新 UI 污染。
- 陈旧、过期、未来或非法 revision 不能产生收藏副作用。
- flow 仅保存必要端内状态，不进入线上事件。
- 半屏、卡片过期、Overflow 和 validator 均以官方能力与人工探针为准。
- 60 条平台 trace 可自动评分，真实 trace 缺失时明确阻断。
- 推荐质量交付不被当前不可实现的在线完整漏斗阻塞。
