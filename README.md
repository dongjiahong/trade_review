# SMC Journal

SMC Journal 是一个本地优先的交易日志与复盘工具，用于记录订单、维护交易模型、保存截图凭证，并生成结构化交易计划。

## 技术栈

- Vite
- React 19
- Tailwind CSS
- lucide-react
- IndexedDB 本地存储

## 本地运行

```bash
npm install
npm run dev
```

开发服务固定运行在 `http://localhost:5173`。IndexedDB 按浏览器 origin 隔离，建议始终使用同一个地址访问，避免看起来像数据丢失。

## 构建

```bash
npm run build
```

构建产物输出到 `dist/`。

## 主要功能

- 订单记录：记录品种、周期、方向、模型、入场、止损、止盈、仓位、杠杆、风险金额、结果和利润。
- 结构化交易计划：根据表单内容和模型库规则自动生成交易计划，只需要补充市场环境、入场条件和出场规则。
- 截图管理：支持下单和平仓截图，截图资源以 Blob 存入 IndexedDB。
- 模型库：维护 SMC 交易模型，可编辑自定义模型，内置模型保留为基础模板。
- 复盘面板：查看单笔订单详情、计划、备注、截图和统计分布。
- 导入导出：支持 `.smcj.zip` 备份与恢复，导出时不会包含 API Key。

## 数据存储

数据保存在浏览器 IndexedDB：

- 数据库名：`smc-journal-db`
- 当前版本：`4`
- Stores：`trades`、`assets`、`models`、`settings`

订单 JSON 不长期保存截图 base64 或对象 URL；截图二进制资源由 `assets` store 管理。

## 注意事项

- 不要手工编辑 `dist/` 或 `node_modules/`。
- 清理浏览器站点数据会删除 IndexedDB 中的交易记录和截图。
- 切换访问地址或端口会使用不同的 IndexedDB 数据库。
- 提交前至少运行一次 `npm run build`。
