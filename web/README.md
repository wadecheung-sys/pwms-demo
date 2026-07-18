# 智慧化生产专业仓 — 基于 vue-element-plus-admin

本目录由参考工程 `vue-element-plus-admin` 复制而来，并接入专业仓业务模块。

## 启动

```bash
npm install --legacy-peer-deps
npm run dev
```

账号：`admin` / `123456`

## 目录说明

| 路径 | 说明 |
|------|------|
| `src/views/Pwms/` | 专业仓业务页面 |
| `src/stores/` | 业务 Pinia（data / user） |
| `src/router/pwms.ts` | 业务菜单路由 |
| `src/styles/pwms/` | 业务页面板样式 + tokens |
| `src/components/Pwms/` | 业务共用组件 |
| `src/layout/` | 参考项目布局壳（classic 深色） |

历史业务工程见仓库 `archive/pwms-web-v3/`。
