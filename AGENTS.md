# AGENTS.md — JadeAI

AI 驱动的简历与求职工作台：Next.js 16 + React 19 全栈应用，提供拖拽简历编辑、AI 优化、模拟面试与多格式导出。本仓库是 [LingyiChen-AI/JadeAI](https://github.com/LingyiChen-AI/JadeAI) 的 fork，由 holtwood-projects 维护，聚焦 Docker Web 部署（已移除桌面客户端）。

## 常用命令

包管理器为 pnpm（`packageManager: pnpm@11.0.9`，CI 使用 Node 22）。

- `pnpm install --frozen-lockfile` — 安装依赖（与 CI 一致）
- `pnpm dev` — 启动开发服务器（Turbopack）
- `pnpm build` — 生产构建（prebuild 先执行 `build:export-css`；CI 构建时设 `DB_TYPE=sqlite SQLITE_PATH=":memory:"`）
- `pnpm lint` — ESLint 检查
- `pnpm type-check` — TypeScript 类型检查（`tsc --noEmit`）
- `pnpm test` / `pnpm test:watch` — 运行 Vitest 测试 / 监听模式
- `pnpm db:generate` / `pnpm db:generate:pg` / `pnpm db:migrate` / `pnpm db:seed` — 生成 SQLite / PostgreSQL 迁移、执行迁移、填充示例数据
- `pnpm docker:build` / `pnpm docker:run` / `pnpm docker:smoke` — 构建镜像 / 本地容器运行（端口 3003）/ 容器冒烟检查
- `pnpm release:check` — 发布前完整检查

CI（`.github/workflows/ci.yml`）依次执行：lint → type-check → test → build。

## 代码结构

- `src/app/` — Next.js App Router；`[locale]/` 为国际化路由（dashboard、editor、preview、templates、interview、recruit、share 等），`api/` 为 ai、resume、interview、recruit、share、user、auth、health 等接口
- `src/components/` — `ui/`（shadcn/ui 基础组件）、`editor/`（编辑画布）、`preview/templates/`（50 套简历模板）、`ai/`、`interview/`、`recruit/`、`dashboard/`、`layout/`、`settings/` 等
- `src/lib/` — 业务核心：`db/`（Drizzle schema、repositories、SQLite/PG 适配器与迁移加载）、`ai/`（提示词、工具、schema 与模型配置）、`auth/`、`pdf/`、`interview/`、`recruit/`、`share/`、`brand-constants.ts`
- `src/stores/` — Zustand 状态仓库（editor、resume、interview、settings、ui、tour）
- `src/hooks/` — 自定义 React Hooks（AI 对话、编辑器、PDF 导出、指纹认证等）
- `src/types/`、`src/i18n/` — TypeScript 类型定义与 next-intl 国际化配置
- `messages/zh.json`、`messages/en.json` — 中英双语界面文案
- `drizzle/` — 生成的数据库迁移文件（`migrations/` 为 SQLite，`pg-migrations/` 为 PostgreSQL）
- `scripts/` — 构建/运维脚本（`build-export-css.ts`、`docker-smoke.sh`、`verify-release.sh`、`benchmark-pdf-layout.ts`）
- `changelog/` — 每个版本与专题的发布记录（`YYYY-MM-DD-*.md`）
- `docs/` — 设计与研究文档（`design/` 模板截图与 mockup、`research/` 调研笔记）；`fork-notes.md` 为 fork 维护手册（与上游的分歧地图、同步流程与冲突处理表）；根目录 `Dockerfile` 与 `docker_run_local.sh` 支撑 Docker 流程

## 关键约束

- 技术栈固定：Next.js 16（App Router）、React 19、TypeScript 5、Tailwind CSS 4、shadcn/ui、Zustand、Vercel AI SDK v6、Drizzle ORM、next-intl；包管理器只用 pnpm
- 数据库双支持：`DB_TYPE=sqlite`（默认，零配置）或 `DB_TYPE=postgresql`；改 schema 后需分别运行 `db:generate` 与 `db:generate:pg` 并提交 `drizzle/` 迁移
- 测试用 Vitest，测试文件与源码同目录（`*.test.ts(x)`），environment 为 node；`pnpm test`、`pnpm lint`、`pnpm type-check` 必须全部通过
- 主题色必须使用语义化 `--brand-*` CSS token（见 `src/lib/brand-constants.ts`），不得硬编码 `pink-*` 等具体色值；导出通道（PDF/HTML/DOCX）统一读取该常量
- 用户可见文案走 next-intl，`messages/zh.json` 与 `messages/en.json` 需同步更新
- AI 密钥不在服务端存储：用户在应用内「设置 > AI」自行配置，密钥只存浏览器 localStorage
- 版本号以 `package.json` 的 `version` 为唯一来源，Git tag / Release / Docker tag 统一用 `v<version>`

## 文档约定

- CHANGELOG.md：面向用户的变更在合入时写入 [Unreleased]（Keep a Changelog zh-CN 格式）
- 文档全中文
