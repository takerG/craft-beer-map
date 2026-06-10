# 微信小程序 AI 开发模式运行手册

## 定位

这是 AI 开发模式 beta 的独立生成项目。正式 `miniprogram/` 仍是正常发布入口，不包含 `agent`、Skill、AI 入口或半屏页。

本方案不需要自建后端，也不需要自建模型服务。微信负责模型、意图理解和 Skill 编排；当前项目只提供本地原子 API、原子组件、页面元数据与知识文件。

## 构建与检查

```powershell
npm run build:ai-mode
npm run check:ai-mode
```

生成位置：

- 开发者工具项目：`artifacts/ai-mode-project/project.config.json`
- 待上传知识文件：`artifacts/ai-knowledge-base/`

`check:ai-mode` 会重新构建并检查正式目录隔离、Skill 注册、组件声明、文件大小、页面元数据与知识库文件。

## 开发者工具

1. 使用支持小程序 AI 开发模式 beta 的微信开发者工具版本。
2. 导入 `artifacts/ai-mode-project/project.config.json`。
3. 确认使用已开通该能力的 AppID。
4. 编译后验证页面右下角“问 AI”入口与微信胶囊入口。
5. 在公众平台上传 `artifacts/ai-knowledge-base/` 下的三个 Markdown 文件。
6. 知识库召回、审核和发布仍需在微信平台手动完成。

## 验收对话

1. “想喝点清爽不苦的。”
2. “配烧烤喝什么？”
3. “找西海岸 IPA。”
4. “21A 是什么？”
5. “浑浊 IPA 有哪些叫法？”
6. 搜索一个不存在的风格，确认不会编造结果。
7. “收藏这个。”
8. 对已收藏风格再次收藏，确认不会重复写入。
9. “取消收藏。”
10. “看看我的收藏。”
11. “冷 IPA 和西海岸 IPA 有什么区别？”
12. “推荐一篇适合入门的文章。”

还要检查：

- 搜索、推荐、详情、收藏和文章卡片均能渲染。
- 收藏状态更新后，旧状态卡显示“收藏状态已更新”并不可再次操作。
- 风格结果与口味微调半屏页可以回到 Agent 继续完成意图。
- 页面文字链的 `styleId`、`slug` 等 query 正确。
- 不支持 Agent 的设备不会执行 `wx.openAgent`，AI 入口会自动隐藏。
- 正式 `miniprogram/` 仍能通过全部原有测试。

## 发布红线

`artifacts/ai-mode-project/` 仅用于当前 beta 开发和体验验证，不得作为正式版本提交。正式发布仍使用仓库根目录现有 `project.config.json` 指向的 `miniprogram/`。
