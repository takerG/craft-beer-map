# 微信 AI 风格卡片详情入口设计

## 目标

将微信 AI 模式 `style-detail-card` 左侧的“继续问这个风格”按钮改为
“查看完整详情”。用户点击后离开 AI 原子卡片，进入该风格在现有小程序中的
完整详情页。

## 交互

- 保留卡片当前布局和右侧“加入收藏”按钮。
- 左侧按钮文案改为“查看完整详情”。
- 点击左侧按钮时显示现有 `tap-hover` 反馈。
- 不将整张卡片设为可点击区域，避免与收藏按钮产生误触或冒泡冲突。
- 不增加第三个按钮，避免原子卡片横向拥挤和溢出。

## 页面分流

点击详情按钮时仅使用 API 结果中的真实 `style.styleRef`：

- `styleRef.kind === "bjcp"`：
  `/subpages/style/index?styleId=<encoded id>`
- `styleRef.kind === "extension"`：
  `/subpages/extension-style/index?styleId=<encoded id>`

原子组件继续通过 `setRelatedPage` 设置关联页 query。具体点击操作通过
`wx.modelContext.getViewContext(this).openDetailPage({ url })` 完成，不调用
原子组件中禁止使用的 `wx.navigateTo`、`wx.redirectTo` 等普通路由 API。

## 数据与边界

- 不从展示名称或自然语言猜测风格 ID。
- 缺少 `styleRef` 时不执行跳转。
- BJCP 官方标准风格与 BA/WBC/GABF 市场扩展风格保持明确分流。
- 不改变收藏逻辑；收藏结果仍以原子 API 成功返回为准。
- 不引入仓库外的风格、参数、来源或事实。

## 代码范围

- 修改 AI 实验源组件：
  `ai-mode/skill/craft-beer-guide/components/style-detail-card/index.js`
- 修改其按钮模板：
  `ai-mode/skill/craft-beer-guide/components/style-detail-card/index.wxml`
- 同步正式集成目录中的对应组件：
  `skills/craft-beer-guide/components/style-detail-card/`
- 更新组件契约测试，验证两类风格 URL、`openDetailPage` 调用和新按钮文案。

## 验证

- 先添加失败测试，证明当前组件尚未调用 `openDetailPage`。
- 验证 BJCP URL 使用 `/subpages/style/index`。
- 验证扩展风格 URL 使用 `/subpages/extension-style/index`。
- 验证 `styleId` 经 `encodeURIComponent` 编码。
- 验证按钮文案为“查看完整详情”且保留 `hover-class`。
- 运行 AI 模式组件测试和 AI 模式项目检查。
