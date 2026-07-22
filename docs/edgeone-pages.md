# EdgeOne Pages 国内演示站（操作备忘）

选用腾讯云 EdgeOne Pages 作为国内静态托管，与 GitHub Pages / Gitee 代码仓平行。

## 推荐创建方式（二选一）

### A. 连接 GitHub 自动部署（长期推荐）

1. 打开 https://console.cloud.tencent.com/edgeone/pages
2. 创建项目 → 导入 Git 仓库 → 授权并选择 `wadecheung-sys/pwms-demo`
3. 构建配置建议：
   - 根目录：`web`
   - 安装命令：`npm install`
   - 构建命令：`npm run build:pro`
   - 输出目录：`dist`
   - 环境变量：`VITE_BASE_PATH=/` 、`VITE_USE_ALL_ELEMENT_PLUS_STYLE=true`
4. 部署完成后得到类似 `https://xxxx.edgeone.app` 的地址

### B. 直接上传 dist（最快出链接）

1. 打开 https://pages.edgeone.ai/zh （Pages Drop）
2. 登录腾讯云账号
3. 上传本地目录：`web/dist`（由 `scripts/build-edgeone.ps1` 生成）
4. 自定义子域名（可选），完成部署

## 本地重新打包

```powershell
powershell -File scripts/build-edgeone.ps1
```
