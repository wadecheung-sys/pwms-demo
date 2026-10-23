# 智慧化生产专业仓 — 基于 vue-element-plus-admin

本目录由参考工程 `vue-element-plus-admin` 复制而来，并接入专业仓业务模块。

## 启动

```bash
npm ci
npm run dev
```

管理员账号：`admin`。本机密码见仓库根目录 `.secrets/pwms-login.json`，该文件不提交到 Git。登录页不再预填密码。

## 构建

```bash
npm run build
npm run preview
```

构建输出为本目录下的 `dist/`，上传其中全部内容至 HTTPS 静态网站根目录。部署到子目录时使用 `npm run build -- --base=/pwms/`。完整项目现状及部署说明见[根目录 README](../README.md)。

当前业务和登录均为前端演示，业务数据存储于浏览器，不包含生产后端。

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
