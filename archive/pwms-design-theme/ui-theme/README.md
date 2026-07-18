# UI Theme Spec（深色后台）

从本地参考工程 `reference/vue-element-plus-admin-master` 抽取**布局变量与暗色机制**，落地到本仓库业务前端 `web/`。

## 采用

| 机制 | 参考来源 | 本项目落点 |
|------|----------|------------|
| 布局 CSS 变量（侧栏/顶栏/内容底） | `src/styles/var.css` | [`tokens.css`](./tokens.css) → `web/src/styles/theme/` |
| Element Plus 官方暗色 | `element-plus/theme-chalk/dark/css-vars.css` | `web/src/styles/theme/index.scss` |
| `html.dark` class 驱动 | `store/modules/app.ts` `setIsDark` | `web/src/main.ts` 固定启用 |
| Classic 左菜单壳 | `layout/` classic 组合 | `web/src/layouts/MainLayout.vue` |

## 刻意未引入

- UnoCSS / Less 工具链
- 多布局（topLeft / top / cutMenu）
- TagsView 多标签页
- 全局 Setting 抽屉与主题色运行时改写

## 使用方式

业务侧通过 Vite 别名 `@design` 引入 `tokens.css`，或由 `web/src/styles/theme/index.scss` 统一加载。页面样式优先使用 `--pwms-*` / `--el-*`，避免硬编码浅色。
