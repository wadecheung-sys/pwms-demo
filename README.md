# 智慧化生产专业仓管理系统

前端工程位于 [`web/`](./web/)，基于 [vue-element-plus-admin](https://github.com/kailong321200875/vue-element-plus-admin) 经典布局壳，并接入本仓库业务模块。

历史版本归档：[`archive/`](./archive/)。本地参考工程：`reference/`（已 gitignore）。

## 在线演示

| 平台 | 演示 / 登录 | 代码仓库 |
|------|-------------|----------|
| **Gitee（国内推荐）** | https://zhangfa-wang.gitee.io/pwms-demo/ · [登录页](https://zhangfa-wang.gitee.io/pwms-demo/#/login) | https://gitee.com/zhangfa-wang/pwms-demo |
| GitHub | https://wadecheung-sys.github.io/pwms-demo/ · [登录页](https://wadecheung-sys.github.io/pwms-demo/#/login) | https://github.com/wadecheung-sys/pwms-demo |

管理员账号：`admin`。密码已轮换，不再公开默认密码；本机凭据见 `.secrets/pwms-login.json`（已被 Git 忽略，不上传仓库或服务器）。

> GitHub 推送到 `main` 后会触发现有 Pages 工作流；Gitee 需要另外同步，可能落后于 GitHub。

## 启动

```bash
cd web
npm install
npm run dev
```

访问开发地址：http://localhost:5177/

**当前形态：** 参考项目深色 classic 壳 + 专业仓业务（出入库审批、盘点过账、定额告警、台账报废等）。

## 项目现状

- Vue 3 + TypeScript + Vite 6，使用 Element Plus、Pinia、ECharts；当前有效前端为 `web/`。
- 已有经营分析、生产仓、资产台账、出入库审批、转仓、盘点、定额告警、检定及退役等演示模块。
- 默认使用 Mock 数据，业务数据保存在各浏览器的 `localStorage`；仓库没有可部署的后端或数据库，多人之间不会同步数据。
- 登录也是前端演示逻辑。5 个演示账号（`admin`、`ln_province`、`sy_city`、`hp_county`、`keeper01`）本次统一轮换为同一个随机复杂密码，仓库只保存 PBKDF2 校验值。登录页不预填密码，“记住账号”只保存用户名，旧会话需重新登录。
- 前端密码校验不能保护已下载的代码和演示数据；接入真实业务时需要后端鉴权与服务端权限校验。

## 构建与自行部署

命令是 `npm run build`，请在 `web/` 目录运行：

```bash
cd web
npm ci
npm run build
```

本机已有依赖时可以直接运行构建命令。产物为 `web/dist/`，将其中的 `index.html`、`assets/` 等全部内容上传至服务器网站根目录即可。只需托管静态文件，不需要在服务器运行 Node 开发服务。

部署说明：

- 使用 HTTPS。密码校验调用浏览器 Web Crypto，公网 HTTP 无法使用；本机 `http://localhost` 可预览。参见 [Web Crypto 安全上下文要求](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveBits)。
- 默认部署路径为 `/`。如部署到 `/pwms/` 子目录，执行 `npm run build -- --base=/pwms/`，并将产物上传到对应目录。
- 路由使用 hash 模式，登录地址为 `https://你的域名/#/login`（子目录部署时相应增加前缀）。
- 仅上传 `dist/` 内容，`.secrets/`、源码及 `node_modules/` 无需上传。

本地检查构建产物：

```bash
npm run preview
```

浏览器打开终端打印的 localhost 地址。现有浏览器检查脚本从 `PWMS_DEMO_PASSWORD` 环境变量或本地 `.secrets/pwms-login.json` 读取密码。
