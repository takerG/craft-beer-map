# 双发布画像与可信状态基线设计

## 背景

仓库根目录当前同时承担普通小程序和微信 AI Mode beta 开发项目。根目录
`app.json`、`project.config.json`、`skills/`、`aiDetail/` 与全局 AI 入口满足
AI validator 的项目根要求，但这与 `AGENTS.md` 中“正式发布版本不得包含本
beta AI 项目生成物”的约束冲突。

同时，普通页面与 AI Skill 的收藏存储层会吞掉写入异常，调用方仍可能展示
或返回成功。这违反“收藏变更必须以原子 API 的成功返回为准”的约束。

产品、设计、测试、研发经理评审后提出三种方向：

1. 仅修复 P0 并增加发布检查。
2. 生成 production 与 ai-beta 两个独立发布画像。
3. 在双画像基础上重构全部数据投影与包体边界。

CEO 终审批准方案 2。方案 1 无法消除误从根目录上传的风险；方案 3 超出本轮
可信基线目标。

## 目标

- 根目录继续作为 AI beta 的 canonical 开发项目，但明确禁止用于正式上传。
- 确定性生成 `artifacts/production` 与 `artifacts/ai-beta`。
- `artifacts/production` 是唯一正式上传物，物理移除所有 AI beta 专用配置、
  页面、组件、元数据、Skill 与生成物。
- 收藏写入、删除和切换使用可验证的原子结果；失败时 UI、Toast、埋点和 AI
  API 都不得声明成功。
- 搜索与收藏文案准确区分 BJCP 官方标准风格和 BA/WBC/GABF 市场扩展风格。
- 择饮结果使用定性匹配等级，不显示未经校准的裸百分比；无结果时只显示中性、
  可操作的恢复提示。
- 构建与校验命令能够检测生成漂移、画像污染、非确定性和 production 包体超限。

## 非目标

- 不调整推荐排序算法或口味参数。
- 不新增风格、文章、外部资料或 AI 实验能力。
- 不拆分 catalog、BJCP 摘要/详情或学院数据投影。
- 不重构现有页面导航、视觉 token 或学院互动架构。

## 发布画像

### Canonical 根项目

仓库根目录保留现有 AI Mode 集成，供开发、validator 和实验使用。README、
runbook 与发布清单必须标注该目录为非生产上传源。

### Production

`npm run build:profiles` 生成 `artifacts/production`。构建器复制微信小程序运行
所需文件，并对结构化配置执行以下变换：

- 删除 `app.json.agent`。
- 从 `subPackages` 删除 `skills` 与 `aiDetail`。
- 删除 `app.json.usingComponents.ai-entry`。
- 删除 `project.config.json.packOptions.include` 中的 `skills`。
- 不复制 `skills/`、`aiDetail/`、`components/ai-entry/`、`page-meta.json`、
  `AGENTS.md` 及 AI 专用生成物。
- 从页面 WXML 中移除 `<ai-entry ... />` 节点。

Production 审计同时检查文件 denylist、配置 denylist 与文本引用 denylist。
任何 Agent API、AI 分包、Skill 路径或 AI 入口引用都会使检查失败。

### AI Beta

`artifacts/ai-beta` 由现有 AI 项目构建能力生成，保留 Agent、Skill、AI 半屏页、
页面 metadata 与知识库引用。该画像只用于 beta 验证，不得用于正式上传。

### 确定性

每个画像包含 manifest，记录画像类型、源文件指纹、输出文件清单、逐文件 hash
和总字节数。连续两次构建必须得到相同的内容指纹。时间戳不得进入内容指纹。

## 收藏原子契约

### 普通小程序

`utils/style-favorites.js` 的变更操作返回：

```js
{
  ok: true,
  favoriteIds,
  isFavorite,
}
```

或：

```js
{
  ok: false,
  favoriteIds,
  isFavorite,
  error: 'storage-failed',
}
```

写入后必须立即回读，并确认目标 ID 的最终状态。写入、回读或确认任一步失败，
操作返回失败。页面只在 `ok === true` 后更新收藏状态、显示成功 Toast 和记录
`favorite_toggle`；失败时保持原 UI，显示克制的失败提示并记录失败事件。

### AI Skill

Skill favorite store 使用同一原则：写入后回读目标状态。添加和删除 API 只有在
确认状态后返回 success envelope，否则返回 `storage-failed` failure envelope。
Control、Candidate 和根目录正式 Skill 保持一致语义。

读取异常不得被解释为成功变更。现有 storage key 和本地数据格式保持兼容。

## 文案与状态

### 搜索

- 初始提示明确支持编号、中英文名和常见叫法。
- 无结果提示说明当前资料覆盖 BJCP 官方标准风格与 BA/WBC/GABF 市场扩展风格，
  不再声称只收录 BJCP，也不再把已收录的冷 IPA、水果酸艾尔列为缺失示例。
- 结果继续使用现有 `kind` 和 `sourceLabel` 区分来源。

### 收藏

- 页头和空状态同时覆盖 BJCP 官方标准风格与市场扩展风格。
- 不增加新的收藏分类或存储结构。

### 择饮

保留内部 `matchScore` 排序值，但 UI 通过纯展示函数转换为：

- 90 及以上：高度匹配
- 75 至 89：较为匹配
- 低于 75：可以尝试

页面不展示 `%`。无结果时隐藏推荐解释与可视化区域，只显示放宽一个口味维度的
恢复提示。

## 构建与校验

新增命令：

```text
npm run build:profiles
npm run check:profiles
```

`build:profiles` 只写入 `artifacts/`，不得修改 canonical 根项目。

`check:profiles`：

1. 构建 production 与 ai-beta。
2. 校验两个 manifest 与文件 hash。
3. 对 production 执行配置、文件和文本 denylist。
4. 对 ai-beta 复用现有 AI 项目校验。
5. 检查 production 包体预算。
6. 在临时目录再次构建并比较内容指纹，验证确定性。

`check:generated` 扩展覆盖学院生成数据、AI catalog/runtime、页面 metadata 和画像
manifest 所引用的源指纹，但不得通过先重写 canonical 生成物来掩盖漂移。

## 测试

- 普通收藏：添加与删除成功、写入异常、回读异常、写后状态不一致。
- 普通详情页：失败时不更新 UI、不显示成功 Toast、不记录成功埋点。
- AI 收藏：添加与删除存储失败都返回 failure envelope，Candidate 失败不消费
  completion request。
- Production：所有 AI 文件、配置和文本引用为零；页面结构仍完整。
- AI beta：现有 validator 结构测试继续通过。
- 画像：连续两次构建指纹一致，canonical `git diff` 不因画像构建发生变化。
- 搜索、收藏和择饮文案/状态结构测试更新为新契约。

## 发布规则

- 正式发布只能导入 `artifacts/production`。
- 根目录与 `artifacts/ai-beta` 均标记为非生产。
- `npm run check:profiles`、`npm test` 与 `npm run check:generated` 全部通过后，
  才能进入微信开发者工具真机 QA。
- AI beta 仍需独立完成平台能力、真实 trace 与发布审计，不因 production 通过而
  获得正式发布资格。
