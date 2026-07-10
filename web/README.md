# 生产仓管理系统（Web 前端演示）

基于需求文档与参考项目（智能资产管理系统）搭建的 **生产仓管理系统** 前端演示项目。

## 需求覆盖

| 一级菜单 | 二级菜单 / 功能 |
|---------|----------------|
| 工作台 | 数据概览、待办盘点、故障与维修动态 |
| 生产仓管理 | 台账录入、出入库记录、故障记录、维修记录、盘点记录 |
| 备品备件管理 | 同上五类子模块 |
| 仪器仪表管理 | 同上五类子模块 |
| 工器具管理 | 同上五类子模块 |
| 人员管理 | 人员信息与角色分配 |
| 生产厂家管理 | 备品备件 / 仪器仪表 / 工器具 分类厂家库 |
| 设备类型管理 | 生产仓 / 备品备件 / 仪器仪表 / 工器具 分类类型库 |
| 系统功能设置 | 组织机构、角色权限 |

**已按修改意见排除：** 故障应急抢修模块

**生产仓设备类型（示例）：** 输送带、仓储货架、叉车、包装机、温控系统、安全监控

## 技术栈

- Vue 3 + TypeScript + Vite
- Element Plus（UI 组件库，风格对齐参考项目）
- Vue Router + Pinia
- Mock 数据（演示用，无后端依赖）

## 快速启动

```bash
cd web
npm install
npm run dev
```

浏览器访问 http://localhost:5173

**公网演示：** https://wadecheung-sys.github.io/production-warehouse-management/  
（推送 `main` 后自动部署到 `gh-pages` 分支；首次请在仓库 **Settings → Pages** 中设置 Source 为 **Deploy from a branch**，Branch 选 **gh-pages**，Folder 选 **/ (root)**）

**演示账号：** `admin` / `123456`（演示阶段管理员看全量数据）

## 版本说明

### v1.0（当前）
- HTTP API 抽象层（`api/http.ts` + `endpoints.ts` + `httpProvider.ts`）
- Mock / HTTP 双模式切换（`.env` 中 `VITE_USE_MOCK`）
- 列表 **导出 CSV** + **打印**（PageToolbar 组件）
- 全局 Loading 状态
- 顶栏显示当前运行模式（Mock v1.0 / API 地址）

对接后端：复制 `.env.production.example` 为 `.env.production`，设置 `VITE_USE_MOCK=false`，后端 API 路径参照 `src/api/endpoints.ts`。

### v0.4
- 故障 → 维修一键联动（转维修 / 维修完成自动关闭故障）
- 设备详情抽屉 + 全生命周期时间线（台账/出入库/故障/维修/盘点）
- 列表分页 + 空状态提示
- API 层抽象入口（`api/index.ts`，便于后续对接后端）

### v0.3
- 统一 Pinia Store + localStorage 持久化（刷新不丢数据）
- 全模块 CRUD：新增 / 编辑 / 删除（含表单校验、二次确认）
- 台账 ↔ 出入库联动（出库校验库存、删除记录回滚数量）
- 盘点任务真实下发（按组织树拆分 + 资产生成明细）
- 盘点下钻支持录入实盘数量，自动更新完成率
- 工作台「重置演示数据」按钮

### v0.2
- 全模块筛选/query 真实化：查询/重置按钮已接线，支持组合条件过滤
- 筛选结果计数展示
- 盘点任务组织树层级（中心汇总 → 生产仓执行 → 资产明细下钻）
- Mock 数据扩充，便于筛选演示

### v0.1
- 菜单结构与页面骨架

## 项目结构

```
web/src/
├── layouts/          # 主布局、嵌套路由容器
├── views/            # 页面视图
│   ├── asset/        # 四大资产模块共用页面
│   ├── dashboard/    # 工作台
│   ├── login/        # 登录
│   ├── personnel/    # 人员管理
│   ├── manufacturer/ # 生产厂家
│   ├── device-type/  # 设备类型
│   └── system/       # 系统设置
├── router/           # 路由与菜单配置
├── stores/           # 状态管理
├── mock/             # 演示数据
└── types/            # TypeScript 类型
```

## 后续可扩展

- 对接真实后端 API
- 完善表单校验与 CRUD 持久化
- 盘点任务逐级下发的工作流引擎
- 权限按钮级控制
- 报表导出与打印

## 参考

- 参考项目：http://1.14.184.44/（智能资产管理系统，Vue3 + Element Plus）
- 需求来源：`reference/修改意见.txt`
