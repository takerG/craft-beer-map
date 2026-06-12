# 微信小程序 AI 开发模式运行手册

## 构建入口

AI Mode 直接扩展现有小程序。唯一微信项目根目录是仓库根目录
`D:\work\craft-beer-map`，其中
`project.config.json`、`app.json`、`AGENTS.md`、`page-meta.json` 和
`skills/` 处于同一层级。

官方文档和示例中的 `miniprogram` 通常是“用户的小程序项目目录”的代称，
不是必须在仓库中新增的固定子目录。

```powershell
npm run build:ai-mode
npm run check:ai-mode
```

- 开发者工具项目：`project.config.json`
- Skill：`skills/craft-beer-guide/`
- 知识库文件：`artifacts/ai-knowledge-base/`

`build:ai-mode` 只生成 Skill/半屏页目录数据和知识库文件，不复制第二套小程序。
微信开发者工具应直接导入仓库根目录 `D:\work\craft-beer-map`。

## 官方 validator

使用微信官方 `wechat-miniprogram/ai-mode-skills` 中的 validator，并把当前
仓库根目录作为唯一参数：

```powershell
node tmp/official-ai-mode-skills/wxa-skills-validate/scripts/validate.mjs .
```

validator 必须能从根目录 `app.json` 的 `agent.skills` 自动发现
`skills/craft-beer-guide`。不得改为传入某个嵌套生成目录。

对照实验开发构建：

```powershell
npm run build:ai-experiment:dev
node scripts/check_ai_mode_project.cjs --output-root=artifacts/ai-mode-experiment/control --no-build
node scripts/check_ai_mode_project.cjs --output-root=artifacts/ai-mode-experiment/candidate --no-build
```

正式实验构建使用 `npm run build:ai-experiment`，要求干净工作树。
实验输出中的 `control/` 和 `candidate/` 各自是独立、扁平的微信项目根目录，
仅用于受控比较，不替代正式仓库根项目。

## 平台能力门禁

`ai-mode/experiments/platform-capabilities.json` 默认保持 `blocked`。人工探针必须记录：

- AppID AI Mode 权限。
- 微信开发者工具与基础库精确版本。
- 官方 validator 结果。
- 半屏页 `sendFollowUpMessage`。
- 卡片过期与 Overflow 行为。
- 普通生成页面分析能力。

证据放在 `artifacts/ai-mode-platform-probe/`。Skill 和原子组件不得调用
`reportEvent` 或 `reportAnalytics`。普通页面 `page-only` 事件不属于北极星指标。

本地 validator 和编译通过只证明代码与项目结构合规。若 AppID 未开通 AI Mode，
微信 AI 仍无法检索或拉起该小程序，验收记录必须明确标注为平台权限阻塞。

## 首版回归话术

1. 想喝点清爽不苦的
2. 配烧烤喝什么
3. 找西海岸 IPA
4. 21A 是什么
5. 浑浊 IPA 有哪些叫法
6. 搜索一个不存在的风格
7. 收藏这个
8. 再次收藏
9. 取消收藏
10. 看看我的收藏
11. 冷 IPA 和西海岸 IPA 有什么区别
12. 推荐一篇适合入门的文章

## V2 评测

仓库包含 60 条合成话术。Control 与 Candidate 必须分别在真实微信平台执行并保存：

```text
artifacts/ai-evaluation-traces/control.json
artifacts/ai-evaluation-traces/candidate.json
```

trace 必须标记 `traceSource: "wechat-platform"`，完整保存每个合成用例的 assistant
turn，不得保存真实用户会话。文件保留不超过 30 天。

```powershell
node scripts/score_ai_recommendation_traces.cjs `
  --control=artifacts/ai-evaluation-traces/control.json `
  --candidate=artifacts/ai-evaluation-traces/candidate.json
```

主指标是 `completed / started`。`completed / shown` 仅为辅助卡片转化率。

## 受控体验

- 方向性试运行每组至少 40 名独立测试者。
- 每名测试者最多计入 5 个 started flow。
- 每组 200 个 flow 只验证方向，不能宣布胜负。
- Experiment Operations Owner 维护
  `artifacts/ai-evaluation-traces/operations-audit.json`，Test Manager 复核。
- `N_all` 是至少执行一个有效平台用例的唯一 testerCode 数。
- `N_cross` 是同时出现在 Control 与 Candidate 的唯一 testerCode 数。
- `contaminationRate = N_cross / N_all`，必须不高于 5%。

正式比较必须先做功效分析，使用测试者聚类或测试者级聚合。只有预先选择的统计检验通过，
或差值置信区间下界大于 0，才能表述 Candidate 在受控体验中更好。

## 唯一发布门禁

```powershell
npm run audit:ai-recommendation-release
```

该命令只有在以下条件全部满足时退出 0：

- 干净工作树。
- Control/Candidate 各 60 条真实平台 trace。
- 完整 assistant turn。
- 一致的 build/source/catalog 指纹。
- 官方 validator 和 DevTools 探针证据。
- 污染率不高于 5%。

缺少真实 trace 或官方证据时，结论只能是：

> 本地实现已验证；微信平台验收待完成。
