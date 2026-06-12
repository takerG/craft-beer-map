# 小程序发布检查清单

## 1. 微信开发者工具

- 使用微信开发者工具打开仓库根目录 `D:\work\craft-beer-map` 并完成编译。
- 确认根目录 `project.config.json` 与 `app.json` 同级。
- 检查控制台没有页面脚本错误、资源缺失、setData 过大告警或样式解析异常。
- 走通探寻、搜索、大类详情、标准风格详情、扩展分组、扩展风格详情。

## 2. 真机 QA

- iOS 和 Android 各完成一轮真机 QA。
- 检查首屏进入是否稳定流畅，底部 tab 与安全区不遮挡内容。
- 连续快速点击列表卡片、搜索结果、返回入口，确认没有重复跳转或卡死。

## 3. 页面状态

- loading：大类页、标准风格详情、扩展分组、扩展风格详情需要展示加载态。
- 空状态：搜索首页、搜索无结果需要给出下一步操作。
- 错误状态：非法 groupId/styleId 需要显示错误说明，并提供回到探寻或搜索的入口。

## 4. 样式与交互

- 卡片、标题、间距、圆角、文字截断保持一致。
- 所有主要可点击区域有按压反馈。
- 检查长中文、英文名、别名、统计数字不会溢出或互相遮挡。

## 5. 埋点

- 搜索提交：记录关键词、结果数量和来源。
- 进入风格：记录 styleId、来源和风格类型。
- 切换分类：记录当前 section。
- 分享：记录分享来源和当前页面对象。
- 返回：记录从详情页回到分组、搜索或探寻的路径。

## 6. 成功标准

- 首屏进入稳定流畅，没有明显白屏或布局跳动。
- 新用户 60 秒内能完成一次搜索或打开一个风格详情。
- 没有明显卡顿、跳转重复、布局溢出。
- `npm test` 全部通过。

## 7. AI 推荐质量 V2

- `npm run build:ai-mode` 与 `npm run check:ai-mode` 通过。
- 官方 validator 以仓库根目录为项目根并能发现 `craft-beer-guide`。
- `project.config.json` 的 `packOptions.include` 包含 `skills`。
- `app.json` 声明 `agent.skills`、`agent.instruction` 和 `agent.pageMetadata`。
- 原子组件无根节点固定高度，已启用 Overflow 监测和点击反馈。
- 半屏页使用 `sendFollowUpMessage`，不使用普通页面路由返回 Agent。
- 记录 AppID AI Mode 权限、开发者工具版本和基础库版本。
- `npm run test:ai-recommendation-m1` 通过。
- `npm run build:ai-experiment:dev` 可生成 Control 与 Candidate。
- 两个清单的 source/catalog fingerprint 一致，契约分别为 `legacy-v1` 与 `semantic-v2`。
- Skill 与原子组件不包含微信分析 API。
- Candidate 卡片声明 `expirable`，旧卡片仍由 revision 校验阻止副作用。
- 完整偏好不进入 URL、日志、storage 或线上事件。
- Control/Candidate 各有 60 条 `wechat-platform` trace。
- 官方 validator 与 DevTools 探针证据齐全。
- `operations-audit.json` 污染率不高于 5%。
- 只有 `npm run audit:ai-recommendation-release` 退出 0 才能标记平台验收通过。
