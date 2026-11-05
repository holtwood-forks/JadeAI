# JadeAI 个人自用版通宵优化报告

- 分支：`goal/overnight-personal`
- 起点：`main` + 已评审的 `origin/fix/high-severity-and-pr101-port`（fast-forward 至 `c38ea46`）
- 范围：单用户模式、SQLite 备份、PDF 浏览器复用、招聘模块开关、首页直达、模板按需加载、依赖升级
- 边界：未 `git push`、未部署、未改写历史、未修改真实 `data/`、未输出凭据

## 执行摘要

| 项目 | 状态 | 结论 |
| --- | --- | --- |
| 基线合并 | 完成 | 保留上游修复分支 6 个提交；基线全量校验通过 |
| P0-1 `JADE_SINGLE_USER` | 完成 | 单用户身份逻辑可用，`JADE_RUNTIME=desktop` 保留兼容 |
| P0-2 SQLite 备份 | 完成 | `pnpm db:backup` 可生成一致性快照，保留 14 份 |
| P0-3 PDF Chromium 复用 | 完成（Docker 真实渲染通过） | 共享浏览器、空闲回收、退出清理已实现；Docker 内 5 次 A4 + 1 次连续长页导出通过 |
| P1-1 `FEATURE_RECRUIT` | 完成 | 默认开启；关闭后隐藏入口并重定向 `/recruit` |
| P1-2 `JADE_HOME=dashboard` | 完成 | 设置后首页直达工作台，默认 landing 不变 |
| P1-3 模板按需加载 | 完成 | landing 首屏 JS 1371.7 KB → 912.8 KB（-33.5%） |
| P1-4 依赖升级 | 完成 | drizzle-orm 0.45.4、zod 4.6.7、next-intl 4.14.9；全量校验通过 |
| 附加：构建离线化 | 完成 | 移除 `next/font/google`，改用本地 Inter，Docker 构建不再依赖 fonts.gstatic.com |

## 各项详情

### 基线：合并上游修复分支

- 合并 `origin/fix/high-severity-and-pr101-port` 至 `c38ea46`，保留其 6 个提交。
- 合并后基线验证：lint、type-check、546 tests、生产 build 均通过。
- 评审 worktree：`/tmp/jade-review-pr101`（detached `c38ea46`，已安装依赖），不属于仓库改动。

### P0-1 单用户模式别名

状态：完成。

改动文件：

- `src/lib/runtime-mode.ts`、`src/lib/runtime-mode.test.ts`
- `src/lib/config.ts`
- `src/lib/auth/helpers.ts`、`src/lib/auth/helpers.test.ts`
- `src/lib/db/adapters/sqlite.ts`、`src/lib/db/database-kind.ts`、`src/lib/db/database-kind.test.ts`
- `src/app/[locale]/layout.tsx`
- `src/components/providers/runtime-config-provider.tsx`
- `src/hooks/use-auth.ts`、`src/hooks/use-fingerprint.ts`
- `.env.example`、`README.md`

行为：

- `JADE_SINGLE_USER=true` 将所有请求映射到固定 `local` 用户，跳过指纹认证与演示数据播种。
- `JADE_RUNTIME=desktop` 继续作为 deprecated 别名，避免旧配置失效。
- `JADE_SINGLE_USER` 只改变身份模式，不强制 SQLite；`JADE_RUNTIME=desktop` 仍保留“强制 SQLite”的历史语义。

验证：

- `pnpm lint`、`pnpm type-check`、`pnpm test` 通过；本阶段 553 tests 通过。

### P0-2 SQLite 一致性备份

状态：完成。

改动文件：

- `src/lib/db/backup.ts`、`src/lib/db/backup.test.ts`
- `scripts/backup-db.ts`
- `package.json`（`db:backup`）
- `README.md`（备份、恢复、升级前快照章节）

行为：

- 使用 better-sqlite3 `backup()` 生成在线一致性快照，而不是直接复制正在写入的数据库文件。
- 备份完成后执行 `integrity_check`；默认保留 14 份，支持环境变量调整。
- PostgreSQL 仅提示使用 `pg_dump -Fc`，本轮未封装 PG 备份。

验证：

- `pnpm test src/lib/db/backup.test.ts`：5 个测试通过。
- CLI 实测生成备份并打开校验：`integrity ok, rows 1`。
- 未修改真实 `data/`，测试使用 `/tmp` 临时库。

### P0-3 PDF 导出复用 Chromium

状态：完成；Docker 内真实 Chromium 渲染通过。

改动文件：

- `src/lib/pdf/generate-pdf.ts`

行为：

- 进程级共享 Chromium 实例，使用 `globalThis` 状态避免 Next.js 热重载重复泄漏。
- 空闲 10 分钟自动关闭，定时器 `unref()`，不阻止进程退出。
- 浏览器 `disconnected` 时清空共享状态；SIGTERM/SIGINT 时关闭。
- 每次导出仍在 page 级 `try/finally` 中关闭页面；A4、连续长页、并发闸门与超时行为保持。
- 超时或取消时回收共享浏览器，避免坏状态复用。

验证：

- `pnpm type-check`、`pnpm test`（558 tests）、`DB_TYPE=sqlite SQLITE_PATH=":memory:" pnpm build` 通过。
- 本机没有可用 Chromium，PDF 回归测试中相关用例仍 skip；但 Docker smoke 已执行 5 次 A4 + 1 次 continuous 真实导出并通过。
- Docker smoke 同时验证了 tini 为 PID 1、Chromium 可执行文件存在、容器健康检查与 API 可达。

### P1-1 招聘模块开关

状态：完成。

改动文件：

- `src/lib/features.ts`、`src/lib/features.test.ts`
- `src/lib/config.ts`
- `src/app/[locale]/recruit/layout.tsx`
- `src/components/layout/header.tsx`
- `src/components/landing/landing-header.tsx`
- `src/components/providers/runtime-config-provider.tsx`
- `.env.example`、`README.md`

行为：

- `FEATURE_RECRUIT` 默认 `true`；设为 `false` 时隐藏 Header 与 landing 的招聘入口。
- `/recruit` 服务端重定向到 dashboard。
- 路由、数据库表与 API 代码保留，关闭开关不会删除数据。

验证：

- `pnpm test`（560 tests）、`pnpm type-check`、`pnpm lint`、生产 build 通过。
- 生产服务验证：`FEATURE_RECRUIT=false` 时 `/zh/recruit`、`/en/recruit` 均 307 到对应 dashboard；landing HTML 不再输出 `/recruit` 链接。未做真实浏览器视觉回归。

### P1-2 首页直达工作台

状态：完成。

改动文件：

- `src/lib/home.ts`、`src/lib/home.test.ts`
- `src/app/[locale]/page.tsx`
- `.env.example`、`README.md`

行为：

- `JADE_HOME=dashboard` 时服务端将 `/[locale]` 重定向到 `/[locale]/dashboard`。
- 未设置时保持现有 landing 首页，不改变默认产品行为。

验证：

- `pnpm test`（562 tests）、`pnpm type-check`、生产 build 通过。
- 生产服务验证：`/` → `/zh`、`/zh` → `/zh/dashboard`、`/en` → `/en/dashboard`；`/zh/dashboard` 返回 200。

### P1-3 模板按需加载

状态：完成。

改动文件：

- `src/components/preview/template-registry.tsx`（新增）
- `src/components/preview/resume-preview.tsx`

行为：

- 50 套模板改为 `next/dynamic` 按需加载，`resume-preview` 只渲染当前模板。
- 保留 loading 骨架；未使用 `ssr:false`，分享页/预览仍可服务端渲染。
- PDF 服务端导出走独立 HTML 模板，不受前端模板拆分影响。

验证：

- `pnpm type-check`、`pnpm test`（562 tests）、`pnpm lint`、生产 build 通过。
- landing 首屏 JS：1371.7 KB → 912.8 KB（-33.5%）；脚本数 18 → 16。
- 注意：模板 chunk 拆分后总客户端 JS（未 gzip）约 4.5 MB → 5.6 MB；首屏下降，客户端切换模板时可能短暂显示骨架，服务端首屏仍输出当前模板。
- 未做真实浏览器分享页首屏视觉回归。

### P1-4 依赖安全升级

状态：完成并已本地提交。

改动文件：

- `package.json`、`pnpm-lock.yaml`
- `src/lib/ai/recruit-schema.ts`
- `src/lib/pdf/generate-pdf.ts`（复用 `Page` 类型，清理未使用导入）

升级：

- `drizzle-orm` 0.45.1 → 0.45.4
- `zod` 4.3.6 → 4.6.7
- `next-intl` 4.8.2 → 4.14.9
- `next`、`next-auth` 未强行升级，仅评估。

关键修复：

- zod 4.6.7 将 `.transform()` 输出视为必填，导致招聘 schema 中“union 含 undefined + transform 默认值”的字段在缺失时校验失败。
- 在 `recruit-schema.ts` 相关链上补 `.optional()`，覆盖 `description`、`followUps`、`referencePoints`、`redFlags`、`referenceAnswer`、`estimatedMinutes`、`recommendation` 等字段。
- 已验证缺失字段会正确补默认值。

验证：

- `pnpm lint`：0 errors / 159 warnings。
- `pnpm type-check`：通过。
- `pnpm test`：69 个测试文件，562 passed / 9 skipped。
- `DB_TYPE=sqlite SQLITE_PATH=":memory:" pnpm build`：通过。

### 附加修复：移除构建期 Google Fonts 依赖

状态：完成。

背景：Docker smoke 在 `next build` 阶段访问 `fonts.gstatic.com` 超时，导致 `next/font/google` 无法解析 Inter，镜像构建失败。仓库已有 `public/fonts/InterVariable.woff2` 与 `getEmbeddedFontFacesCss()`，但 `src/app/layout.tsx` 仍保留 `next/font/google` 的 `Inter`，且其 `--font-inter` 变量并未被使用。

改动：

- `src/app/layout.tsx`：移除 `next/font/google` 与 `inter.variable`，保留本地字体注入。
- `src/app/globals.css`：`--font-sans` 改为本地 `'Inter'` + 系统回退栈；`--font-mono` 补系统等宽回退栈。

验证：

- `pnpm lint`、`pnpm type-check`、`pnpm test`（562 passed / 9 skipped）、生产 build 通过。
- Docker 构建不再需要访问 Google Fonts；真实镜像构建结果见 Docker smoke 记录。
- 视觉影响：此前 `--font-sans` 指向未定义的 `--font-geist-sans`，现在会实际使用本地 Inter；未做浏览器截图对比。

## 验证汇总

最终命令与结果：

```bash
export PATH=/tmp/pnpm-bin:$PATH
pnpm lint
pnpm type-check
pnpm test
DB_TYPE=sqlite SQLITE_PATH=":memory:" pnpm build
```

- lint：通过，0 errors，159 warnings（仓库既有告警，未在本轮扩大范围清理）。
- type-check：通过。
- test：69 files / 562 passed / 9 skipped。
- build：通过；Next.js 16.1.6 生产构建完成。
- 备份 CLI：通过；`integrity ok`。
- 运行时重定向：通过；`JADE_HOME=dashboard` 的 `/`、`/zh`、`/en` 跳转均符合预期。
- `FEATURE_RECRUIT=false`：通过；`/zh/recruit`、`/en/recruit` 均跳转 dashboard，landing 不再输出招聘链接。
- `pnpm audit --prod`：8 critical / 38 high / 28 moderate / 6 low；主要剩余项来自 `next`、`next-auth`、`puppeteer` 传递依赖与 dev 工具链。
- Docker smoke：通过。`DOCKER_BUILD_NETWORK=host pnpm docker:smoke` 完整构建镜像并启动容器；5 次 A4 + 1 次 continuous PDF 均返回 `%PDF`，tini/Chromium/API 检查通过。
- 默认 bridge 构建在当前 WSL 环境访问 `registry.npmmirror.com` 会失败，因此 smoke 脚本新增 `DOCKER_BUILD_NETWORK` 选项；默认行为不变。
- 未执行 `git push`、部署或真实 `data/` 操作。

## 未完全覆盖 / 边界

1. **本机 PDF 回归**：本机无 Chromium，8 个 PDF 回归测试仍 skip；Docker 内真实导出已通过，但本机开发环境的渲染回归仍未覆盖。
2. **Docker 默认网络**：当前 WSL 环境需要 `DOCKER_BUILD_NETWORK=host` 才能让容器访问 npm 镜像；脚本已支持该选项，默认 bridge 行为未改。其他 CI/主机应优先使用默认值。
3. **next-intl 4.14.9 运行时 UI 回归**：测试与 build 通过，但未做路由、locale 切换、消息加载的浏览器回归。
4. **模板 dynamic 化的分享页首屏**：可能出现骨架先渲染；未做真实浏览器视觉/性能回归。
5. **`FEATURE_RECRUIT=false` 浏览器点击回归**：已用生产服务验证 `/zh/recruit`、`/en/recruit` 均 307 到对应 dashboard，landing HTML 不再输出 `/recruit` 链接；未做真实浏览器视觉回归。
6. **`JADE_HOME=dashboard` 实际请求验证**：已用生产服务验证 `/` → `/zh`、`/zh` → `/zh/dashboard`、`/en` → `/en/dashboard`，`/zh/dashboard` 返回 200。
7. **PostgreSQL 迁移与备份**：本轮只验证 SQLite；PG 迁移未跑，PG 备份仅文档提示。
8. **依赖审计剩余项**：`pnpm audit --prod` 为 8 critical / 38 high / 28 moderate / 6 low；高危项主要来自 `next`、`next-auth`、`puppeteer` 传递依赖与 dev 工具链；本轮按要求未强行升级。

## 风险与建议下一步

- Docker 真实导出已通过；若要覆盖超时、取消和并发场景，建议在容器内补一组故障注入回归。
- 对分享页做一次真实浏览器检查，确认模板 dynamic loading 骨架不会造成明显闪烁或布局跳动。
- 若长期自用，建议把 `JADE_SINGLE_USER=true`、`JADE_HOME=dashboard`、`FEATURE_RECRUIT=false` 写入实际部署环境文件，并配置每日 `pnpm db:backup`。
- PostgreSQL 用户需补充 `pg_dump -Fc` 定时备份与恢复演练。
- 依赖审计建议单独排期评估 `next` / `next-auth` 升级，不与本轮修复混在一起。
