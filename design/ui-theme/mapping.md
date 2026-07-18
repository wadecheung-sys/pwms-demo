# 参考工程 → 本项目映射

| 参考路径 | 本项目落点 | 说明 |
|----------|------------|------|
| `src/styles/var.css` | `design/ui-theme/tokens.css` | 侧栏/顶栏/内容变量，命名改为 `--pwms-*` |
| `src/styles/index.less`（EP dark 引入） | `web/src/styles/theme/index.scss` | 引入 dark css-vars + 业务覆盖 |
| `src/layout/Layout.vue` classic | `web/src/layouts/MainLayout.vue` | 侧栏 + 顶栏 + 主区 + 页脚 |
| `src/store/modules/app.ts` `setIsDark` | `web/src/main.ts` | 首期固定 `html.dark`，无开关 |
| Login 深色背景 `--login-bg-color` | `web/src/views/login/LoginView.vue` | 深色正式入口 |
| `.dark { --app-content-bg-color }` | `--pwms-page-bg` / `--pwms-content-bg` | 内容区底色 |

`reference/` 目录仅本地对照，已在根 `.gitignore` 中忽略。
