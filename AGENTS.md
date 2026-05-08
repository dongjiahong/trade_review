# Agents Guide

本文件给后续 AI agent 或协作者使用。目标是在不破坏现有交易复盘数据、交互体验和构建流程的前提下，高效修改这个项目。

## 项目概览

- 项目类型：Vite + React 19 单页应用。
- 主要用途：SMC 交易日志与复盘，包含订单记录、交易模型、截图资产、统计复盘和本地 AI 配置。
- 数据位置：浏览器 IndexedDB，不依赖后端服务。
- 样式体系：Tailwind CSS，暗色工作台 UI，圆角以 `rounded-md` 为主，图标使用 `lucide-react`。
- 构建产物：`dist/`，通常不要手工编辑。

## 常用命令

```bash
npm run dev
npm run build
npm run preview
```

- 开发服务使用 `vite --host 0.0.0.0`。
- 提交前至少运行 `npm run build`，确认 Vite 编译通过。
- 当前项目没有单元测试脚本；如果新增复杂计算、导入导出或数据迁移逻辑，应同步补测试脚本或给出可复现的手工验证步骤。


## IndexedDB 与导入导出

- 数据库常量在 `src/data.js`：`dbName = 'smc-journal-db'`，`dbVersion = 3`。
- Object stores 包括 `trades`、`assets`、`models`、`settings`。
- 截图不要以 base64 长字符串长期保存在订单记录里；运行时图片 URL 和 Blob 字段由 `tradeAssets.js` 管理。
- 写入数据库前使用 `stripRuntimeTradeFields` 去掉 `entryImageBlob`、`closeImageBlob`、对象 URL 等运行时字段。
- `.smcj.zip` 导出格式包含：
  - `manifest.json`
  - `trades.json`
  - `models.json`
  - `ai-config.json`
  - `assets/*`
- 导出时必须继续清空 `apiKey`，避免把密钥写入备份文件。
- 修改导入导出格式时要保持旧 JSON 包和 `.smcj.zip` 的向后兼容；确需破坏兼容时必须提升格式版本并写迁移逻辑。
- `storage.js` 当前实现的是未压缩 ZIP 读写；不要引入压缩格式，除非同时更新解析逻辑和验证步骤。

## React 编码约定

- 使用函数组件和 Hooks，保持组件为受控输入。
- 顶层业务状态优先集中在 `App.jsx`，组件通过 props 接收数据和回调。
- 派生数据使用 `useMemo`，例如筛选订单、统计指标。
- 异步 IndexedDB 加载要保留取消标记或等价保护，避免组件卸载后继续 setState。
- 修改订单时使用不可变更新：`setTrades((current) => current.map(...))`。
- 新增或导入外部数据后，尽快设置 `selectedTradeId`，避免详情视图空选中。
- 避免在渲染期间创建对象 URL；图片对象 URL 应通过资产水合流程生成。

## UI 与样式约定

- 复用 `src/components/ui.jsx` 中的 `Input`、`Textarea`、`SelectField`、`Segmented`、`Metric`、`ResultBadge` 等基础组件。
- 图标按钮优先使用 `lucide-react`，不要手写 SVG 图标，除非没有合适图标。
- 保持专业交易工作台风格：信息密度适中、暗色背景、边框层级清晰，不做营销页式 hero。
- 主要容器使用 `rounded-md`、`border-slate-700/70`、`bg-ink-*` 等现有视觉语言。
- 桌面布局要尊重现有 `lg:h-screen`、`lg:overflow-hidden`、局部滚动面板模式。
- 移动端要避免文字溢出和横向滚动；新增网格时至少检查窄屏断点。
- 不要把卡片嵌套进卡片作为默认布局。重复项目、弹窗和工具面板可以用卡片。

## 交易领域边界

- 应用可以做交易复盘、记录和统计，但 UI 文案和 AI 提示不应给出直接投资建议。
- AI 配置默认系统提示词强调“只基于用户提供的订单、截图和规则进行总结，不给投资建议”，修改时保留这个边界。
- 统计结果样本量可能很小，洞察文案应避免过度确定性。

## 修改检查清单

改动前：

- 先查看 `git status --short`，识别用户已有改动，避免覆盖。
- 读相关模块再动手，尤其是 `storage.js`、`tradeAssets.js`、`App.jsx` 的联动。
- 如果要改数据格式，先确认导入、导出、IndexedDB 保存、旧数据加载四条路径。

改动后：

- 运行 `npm run build`。
- 手工检查新增/修改的关键流程：
  - 新增交易和保存草稿。
  - 修改订单、平仓订单、筛选订单。
  - 上传或粘贴下单/平仓截图。
  - 导出 `.smcj.zip`，再导入确认订单、模型、截图和 AI 配置恢复。
  - 清除数据后默认模型恢复。
- 如果涉及 UI，检查桌面和移动宽度下是否有文本重叠、按钮挤压或横向滚动。

## 不要做

- 不要手工编辑 `dist/` 或 `node_modules/`。
- 不要把 API Key 写进导出文件、示例数据、日志或文档。
- 不要绕过 `normalizeTrade` / `normalizeModel` 直接信任导入数据。
- 不要把截图 Blob、对象 URL、base64 大字段混进长期订单 JSON。
- 不要在没有迁移逻辑的情况下修改 IndexedDB store 名称、关键字段名或导出文件路径。
- 不要引入大型状态管理、路由或 UI 框架，除非需求已经超过当前简单架构。
- 不要直接把需求加到现有的代码文件中，应该充分的评估是否需要拆分文件了。
