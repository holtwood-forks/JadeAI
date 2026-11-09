# 更新日志

JadeAI 是一个 AI 驱动的简历与求职工作台（Next.js / React / TypeScript），提供拖拽编辑、AI 优化、版本历史、模拟面试与多格式导出。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 修复

- 简历接口：create/update 校验模板名合法性，无效值返回 400，不再静默存库后按 classic 渲染。

### 变更

- 工具链：CI 与 Docker 镜像的 Node 版本对齐至 24（与本地一致，消除「本地过 CI 挂」的版本偏差）。
- 工具链：`next.config` 的 standalone 输出改为仅 Docker 构建启用（`NEXT_OUTPUT=standalone`），本地 `next start` 不再输出不兼容警告。
- 工具链：ESLint 对测试文件降级 `no-explicit-any`（测试 fixture 的 `any` 表达「任意输入」语义），警告数 161→124。

### 新增

- 防回归网：主题覆盖回归测试（字面色标题模板集合不得超出文档化保留清单，有意保留需同步测试与矩阵文档）；首屏 JS 预算断言接入 CI（模板库 ≤1150KB / 编辑器 ≤2100KB / 落地页 ≤1100KB）。
- PDF 冒烟扩面：50 套模板逐套真实渲染 A4 PDF 并断言合法性、页数上限与哨兵文本可提取（此前仅 ~7 套有真实浏览器验证）。
- 性能：AI 悬浮球引入链（AI SDK + zod + react-markdown 栈，约 630KB）改为按需加载，编辑器页首屏 JS 1870→1240 KB（-34%）；点击悬浮球时才拉取对话所需 chunk。

## [v0.8.0] - 2026-10-25

### 新增

- PDF 导出新增「连续长页」排版：按内容实际高度生成单页 PDF（上限 18000px），保留 A4 与智能一页选项；导出对话框、预览页与中英文案同步更新。
- PDF 快照导出：POST 请求携带当前编辑器状态（含未保存的分节顺序），无需先保存即可导出；限制 2 MiB、10s 上传与 35s 渲染超时，并限制并发渲染为 2。
- 导出请求支持取消与整体超时；Chromium 启动、渲染、关闭均有超时与 SIGKILL 兜底，避免挂起进程泄漏。
- 连续长页导出会移除末尾空白页，同时保留纯图片/背景页。
- 单用户模式新增 `JADE_SINGLE_USER=true`，固定映射到本地用户；`JADE_RUNTIME=desktop` 保留为兼容别名。
- 新增 `JADE_HOME=dashboard`：设置后访问首页直接进入工作台，默认仍展示 landing。
- 新增 `FEATURE_RECRUIT=false`：关闭招聘入口并将 `/recruit` 重定向到工作台，路由与数据表保留。
- 新增 `pnpm db:backup`：使用 SQLite 在线备份生成一致性快照，默认保留 14 份。
- PDF 导出复用共享 Chromium 实例，空闲 10 分钟自动回收并在进程退出时清理；A4/连续长页与并发闸门不变。
- 简历预览模板改为按需加载，landing 首屏 JS 从 1371.7 KB 降至 912.8 KB。
- 新增 `/api/ready`：校验数据库连接与 `AUTH_SECRET`，供 Docker HEALTHCHECK 与编排使用；`/api/health` 仍为纯存活探针。
- 新增 `pnpm start:standalone`：直接运行 `node .next/standalone/server.js`，README 补充 standalone 部署说明。
- 新增 `docker-compose.yml` 个人自用模板与 `docs/deployment.md` 部署指南（架构、配置矩阵、备份恢复、升级回滚、排障）。
- PDF 资源占用可配置：`PDF_MAX_CONCURRENT`（默认 2，范围 1–4）与 `PDF_BROWSER_IDLE_MS`（默认 10 分钟），便于 1 GB 主机降低峰值。
- `/fonts/*` 增加一周缓存头（此前每次访问都要重新校验 70 MB 字体）；关闭 `X-Powered-By`；`/api/health` 与 `/api/ready` 返回 `no-store`。
- `docker:run` 增加容器日志轮转（10 MB × 3），避免长期运行写满磁盘。

### 变更

- 依赖升级：`next` 16.1.6 → 16.4.5、`next-auth` 5.0.0-beta.30 → beta.32、`puppeteer-core` 24 → 25；`pnpm audit --prod` 从 8 critical / 38 high 降为 **0 已知漏洞**（传递依赖通过 `pnpm-workspace.yaml` 的 overrides 收敛）。
- 修复 Turbopack 对 `PATH` 查找 Chromium 的全量追踪告警，standalone 产物从约 199 MB 降到约 76 MB。
- 编辑器页把 AI 聊天面板（zod + AI SDK）与 7 个弹窗改为按需加载：首屏 JS 从约 1721 KB（506 KB gzip）降到约 1177 KB（356 KB gzip），降幅约 30%，弹窗关闭动画与聊天会话状态保持不变。
- 升级 `eslint-config-next` 后新增的 React Compiler 规则（`set-state-in-effect`、`refs`、`immutability`、`preserve-manual-memoization`）暂时显式关闭：现有弹窗/聊天面板依赖 effect 内重置状态，逐个重构属于独立任务，不应混在依赖升级里。

- 匿名模式下 AI 与简历相关接口的限流改为按客户端地址分桶，不再信任可伪造的 `x-fingerprint`；反向代理部署需设置 `TRUST_PROXY=true` 才能按真实 IP 分桶。
- AI 模型切换改为每次发送时读取最新选择，不再受会话 transport 缓存影响。
- 官网落地页导航新增「招聘」入口（桌面端与移动端），同步上游并补齐中英文案。
- 同步上游至 2026-09-03：仅采纳 landing 招聘导航入口，不采纳 LaunchAI 推广徽章与 `.gitignore` 等价改写；新增 fork 维护手册 `docs/fork-notes.md` 与每周上游同步提醒 workflow。
- 升级 drizzle-orm 0.45.4、zod 4.6.7、next-intl 4.14.9，并适配 zod 4 对 transform 输出必填的语义。
- 构建链（tsconfig/eslint）排除 gitignored 的 AI 工具目录（`.agents/`、`agent/`、`data/`），本地全量校验不再被这些目录的脚本打断。
- 同步上游 217 个提交，并入面试官侧招聘模块与 Electron 桌面客户端；随后移除桌面客户端，重新聚焦 Docker Web 部署。
- README 本土化为纯中文，移除英文版与废弃的 zh-CN README，并补充 OrcaRouter 等 AI 提供商配置说明；整理仓库忽略规则，停止追踪 AI 工具产物。
- 文档：补充 WSL 开发说明——`~/.local/bin` 中转发到 Windows `chrome.exe` 的包装脚本经实测可用于 PDF 导出（经 WSL interop 驱动）；若浏览器启动阶段挂起，再设置 `CHROME_PATH` 指向 Linux 原生浏览器。
- 文档：新增主题色覆盖矩阵审计（`scripts/audit-theme-coverage.ts` 可再生成）：当前 40/50 模板存在字面色标题、不跟随用户主题色（首批已迁移 3 套），为主题一致性改造提供量化基线；修正 AGENTS.md 对不存在的 `docs/ARCHITECTURE.md` 的引用。

### 安全

- 修复 `AUTH_ENABLED=true` 与 `JADE_SINGLE_USER=true`（或 `JADE_RUNTIME=desktop`）同时设置时的鉴权绕过：此前单用户分支优先，所有接口在无会话时以 `local` 用户返回 200；现在启动即报错退出，请求路径同样失败关闭。
- 公开分享接口不再下发 `visible: false` 的板块：隐藏内容此前虽不在页面上渲染，但可从 `/api/share/<token>` 的 JSON 直接读取。
- 简历列表与详情接口不再返回 `shareToken` 与 `sharePassword` 哈希；分享路由改用独立的 `findByIdWithShareFields` 读取。
- 简历写入接口限制 JSON 请求体为 2 MiB（超限返回 413），并限制标题长度与板块数量。
- 分享链接只在 `TRUST_PROXY=true` 时信任 `X-Forwarded-Host` / `X-Forwarded-Proto`；否则使用 `PUBLIC_SITE_URL` 或请求自身 origin，避免伪造链接。
- 分享接口的密码不再接受 `GET ?password=`：查询串会进入访问日志与 APM；密码只走 POST。
- 分享创建/修改、用户资料与设置接口统一限制 JSON 请求体大小（8–64 KiB），密码与标签长度设上限。
- `docker:run` 默认只绑定 `127.0.0.1`（可用 `BIND_ADDR=0.0.0.0` 覆盖），避免无登录模式直接暴露到局域网/公网。

### 修复

- `.env.example` 不再默认把 `PUBLIC_SITE_URL` 指向 GitHub Pages：本地部署生成的分享链接此前会错误地指向线上站点。
- `docker:run` 启动后等待 `/api/ready`，失败时打印容器日志；`docker:publish` 不再默认推送到上游作者的镜像命名空间，必须显式设置 `IMAGE_REPOSITORY`。
- 发布检查脚本的临时目录清理改为不依赖 `rm -rf`，在受限 shell 中也能跑完。
- 分享页请求改为 `cache: 'no-store'`，关闭分享或修改密码后不会继续展示浏览器缓存的旧内容。
- 修复用户设置被写坏：`users.settings` 的默认值此前是字符串 `'{}'`，写入后变成双重编码的 `'"{}"'`，合并设置时把字符串拆成字符下标，产生 `{"0":"{","1":"}"}` 脏数据。默认值改为对象，并对历史数据做兼容解析与清理。
- 启动时若 `AUTH_SECRET` 缺失或仍是示例占位值，会打印明确告警。

- 构建：移除 `next/font/google` 的构建期网络依赖，改用本地 Inter 字体并补齐 sans/mono 回退栈；离线或受限网络下的 Docker 构建不再访问 `fonts.gstatic.com`。
- Docker：`docker:smoke` 支持 `DOCKER_BUILD_NETWORK=host`，便于 WSL/受限网络下构建；默认 bridge 行为不变。
- PDF 智能一页：修正字号缩放与 CSS zoom 叠加导致的过度缩小；失败时恢复原始排版并返回 `X-PDF-Fit-One-Page: failed` 响应头，客户端会提示「已按标准分页导出」，不再静默当作成功。
- PDF 字体：预览端主题字体不再被模板内联 `font-family` 覆盖，选字体在预览与导出中保持一致。
- 数据库迁移：修正 recruit 迁移时间戳倒序导致 drizzle 静默跳过 `recruit_jobs` 表的问题（SQLite 与 PostgreSQL）。
- AI 会话：修复保存失败时同步守卫无限重试、重试已有输出的消息后误报空响应，以及同一会话切换模型不生效。
- AI 上下文：长会话截断后保证首条为 user，避免强制 user-first 的提供商直接返回 400。
- 编辑器：修复工具调用后并发重载时旧响应覆盖新快照，以及版本还原保存失败仍提示成功的问题。
- 数据库：SQLite 迁移遇到 `already exists` 时校验迁移账本是否推进到最新条目，否则拒绝以残缺 schema 启动；示例数据填充失败不再让 `dbReady` 永久 reject。
- 迁移：recruit 迁移改为幂等 DDL，兼容「上游血统」「merge 后已有表」「全新库」三种升级路径；PostgreSQL 外键迁移时间戳与幂等性修正。
- 保存：修复并发保存被 `isSaving` 早退丢弃、`flushSave` 提前放行、卸载时在飞请求失去串行化；AI 对话与重试统一走 `flushSave`。
- 技能板块：自动保存不再清除正在编辑的空白技能行（skills 数组中的空字符串条目），修复新增技能行在保存后消失的问题。
- 模板导出：`TEMPLATE_BUILDERS` 与 `TEMPLATES` 建立编译期一一对应，新增模板漏配导出实现会在类型检查与测试中失败，不再静默回退 classic 样式；新增 50 套模板导出 HTML 全量回归（姓名、summary 末行、二维码分节哨兵断言）。
- 主题色：elegant / modern / professional 的标题改走 `var(--theme-primary-color)`，用户设置的主色首次对这三套模板生效；未设置时通过按模板默认色表 `TEMPLATE_PRIMARY_DEFAULTS` 保持原有外观（金 / 红 / 藏青），主题编辑器的任意改动也不会再把全局默认色误烘焙进这三套模板。
- 主题色（第二批）：creative、designer、startup、formal、euro、clean、material、retro、gradient、watercolor、rose、architect、legal 十三套全量迁移，teacher（仅姓名）、luxe（仅分节标题）部分迁移；未设置主题色时外观不变。药丸式标题（teacher/medical）与深色背景模板（neon 等）因对比度风险暂缓，见 `docs/research/theme-color-coverage.md`。
- 主题色（第三批）：executive、timeline、nordic、corporate、consultant、finance、metro、blocks、magazine、artistic、swiss、berlin、scientist、engineer、card、zigzag 十六套中性深色标题模板全量迁移；至此 50 套中 39 套标题跟随主题色（31 套迁移 + 8 套原生跟随），按模板默认色表收录 34 条。发现 japanese 存在预览与导出的色板漂移（分节标题两侧颜色不同），暂缓迁移待对齐，详见矩阵文档。
- 主题色（第四批·契约扩展收官）：激活 `--theme-accent-color` 按模板默认色（coder/sidebar/developer）；新增深色面 `safe-on-dark` 变体（过暗主色自动提亮至可读）与 `alpha` 透明度变体（辉光/渐变线跟随主色）。迁移 two-column、sidebar、coder、developer、neon（含标题辉光）、japanese（先按导出侧对齐预览的色板与字号漂移——该漂移为上游固有）。mosaic（循环色板）与 teacher/medical（药丸标题）定为设计性不迁。50 套中 43 套标题跟随主题色，其余 7 套均为文档化决策，见 `docs/research/theme-color-coverage.md`。
- 主题色（第五批·药丸标题）：注入 `--theme-contrast-text` 填充面文字色（按亮度自动黑/白），teacher/medical 的药丸式分节标题背景与文字接入主题且默认外观不变，浅色主色下自动切深字。同时清理 buildThemeCss 遗留死分支（约 40 行无调用方的 CSS 生成路径）并合并重复的亮度计算。矩阵收敛至 6 套设计性保留。
- 性能：50 套预览模板改为按需 chunk（`next/dynamic`，SSR 保留），编辑器/分享/落地页首屏 JS 下降 19–34%（编辑器 2310→1870 KB、模板库 1410→947 KB、落地页 1373→911 KB）；模板库页 50 张卡片改可视区懒挂载（提前 400px 预载），不再一次性下载全部模板代码。新增首屏测量脚本 `scripts/measure-first-load-js.ts`。
- CI：升级 Node 20 弃用警告点名的三个 action（checkout v7 / setup-node v7 / pnpm/action-setup v6，后者正式支持仓库在用的 pnpm 11）。
- 数据完整性：板块内容校验失败时只丢弃非法条目并保留其余条目，不再整段清空；匿名会话 cookie 与 `x-fingerprint` 不一致时以签名 cookie 为准，不再永久 401。
- 字体：导出 HTML/PDF 内嵌 Inter 可变字体；DOCX 不再写入终端未安装的内置字体，回退 Microsoft YaHei；衬线/等宽字体栈把通用族放在内置中文字体之前，避免 PDF 中 Georgia/Courier 被替换。
- 主题：读取时解码旧版 JSON 字符串/字符键 themeConfig；颜色输入框支持逐字输入 6 位色值。
- 数据库：仅设置 `DATABASE_URL` 时按文档所述选择 PostgreSQL 并提示，不再静默使用 SQLite；`DB_TYPE` 支持大小写/空格并拒绝无效值；删除未被调用的 `db/config.ts`。
- 安全：AI provider 请求拒绝跨源重定向（SSRF）；分享密码改为 POST body；面试报告生成/导出补限流与 Chromium 并发闸门；限流 key 对超长 token 做定长哈希。
- PDF：分节间距只修改实际生效的 margin/padding 属性；横向压缩下限提升到安全打印边距；swiss 标题横线按可用边距收缩。
- 构建与发布：CI 在 main 上增加 Docker 镜像构建与启动冒烟（PR 可用 `ci:docker` 标签触发、支持手动运行）；冒烟改为真实 A4/continuous PDF 导出并断言 tini 为 PID 1；发布检查补充 lint/test 与脏工作区、非 main 分支保护；Docker 构建上下文与 tsconfig/eslint 补齐 AI 工具目录排除。
- Docker：apt 强制 IPv4，修复部分 WSL/Docker 环境 DNS 只返回 IPv6 导致镜像构建卡在 `apt-get update` 的问题。
- 安全：AI 路由限流不再信任可伪造的指纹；分享密码限流在未配置可信代理时忽略 `X-Forwarded-For`；AI base URL 增加 DNS 解析校验，阻止解析到内网地址的域名（如 `169.254.169.254.nip.io`）。
- Docker：不再无条件设置 `CHROME_PATH`，`INSTALL_CHROMIUM=false` 时下载回退重新可用；修正安全源镜像被主源 sed 提前替换的问题。
- 安全：加固 AI 路由限流、SSRF 防护、分享密码与部署安全，并修复越权、数据丢失与渲染崩溃等缺陷。
- PDF 导出：注入 `keepNames` 的 `__name` 垫片、修正分页上下文返回类型，修复导出页边距过窄与文本块显示。
- AI 会话与前端：修复重试恢复、历史显示时序与工具步骤持久化，以及拖拽取消、会话删除与切换竞态。
- 对抗性验证：修复续面场景跳轮等状态机问题并补回归测试。
- 构建：PDF 回归测试加 60s 超时、忽略 msw 构建脚本、修正 SQLITE_PATH 冒号解析、适配国内网络镜像源。

### 移除

- 移除桌面客户端（Electron）及其残留资源，聚焦 Docker Web 部署。
- 移除英文 README 与废弃的 zh-CN README。

## [v0.7.0] - 2026-08-26

### 新增

- 招聘模块「面试蓝图」：元数据定义与校验、按蓝图生成题目、两阶段出题编排、按维度值决定题量。
- 基于 JD 自动建议考察维度；面试台展示题目分类；新增只读的面试记录视图与评价重新生成；候选人对比报告补充链接。

### 变更

- 收紧出题契约：强制 JD 覆盖与蓝图组合约束，证据绑定来源事实并规范标点；评分维度与题型对齐，收紧 Go 岗位识别。
- 强化面试反馈与 AI 维度范围要求；候选人设置可从失败的步骤恢复。

## [v0.6.0] - 2026-08-22

### 新增

- 面试官侧招聘模块首版：岗位/候选人 CRUD 与归属校验、简历上传解析、生成面试题与面试评价接口，含数据表、SQLite/PG 迁移与 repository 层。
- 招聘前端：岗位列表/详情、候选人工作台与简历 Tab、考察维度权重编辑器、题目与评价报告展示。
- 面试台模式：候选人拆分为准备/面试台/复盘三页；逐题记录答案并优先用于评价；追问附带参考答案。
- 候选人合并、重命名与删除；列表改为档案卡 + 阶段色带进度；岗位概览与候选人横向对比表。

### 变更

- 全站主题色统一：主按钮、徽章、开关、滑块、标签下划线、焦点环与输入框选中色全部跟随主题色。
- 面试台由居中限宽改为满铺，左栏铺开全部题目、评分标准与追问。
- 主键由存量 UUID 迁移为 10 位短 id；桌面端固定使用 30567 端口，不再向系统申请临时端口。

### 修复

- AI 处理前先把未保存的简历落库（#96）。
- 编辑老岗位时为缺失考察重点的预置维度补默认文案，去掉与参考答案重复的要点；修复已评价卡片配色、对比表重复拉取与竞态等 UI 问题。

## [v0.5.0] – [v0.5.1] - 2026-08-15

### 新增

- 桌面客户端（Electron）：esbuild 工具链、Next 服务子进程托管、preload IPC 契约、启动/闪屏/错误页与退出清理。
- 本地单用户模式：`authType: 'local'` 与 `ensureLocalUser()`，桌面模式下跳过指纹识别与演示数据播种。
- 桌面更新提示（应用内通知 + 下载安装包）；Docker/CI 从统一 `v*` tag 构建 Web 镜像与桌面安装包。

### 变更

- Web 构建恢复 PostgreSQL，桌面端使用 SQLite；去掉 `DB_TYPE` 开关与 PG 适配器的历史包袱。
- 桌面端隔离开发环境（JadeAI-dev）、跨打包/开发布局解析资源路径、限制单实例占用数据目录。
- 文档：新增桌面客户端发布博客，并在中英文 README 中介绍桌面客户端。

### 修复

- 修复设置写入与退出竞态、临时文件清理及重试路径的孤儿进程泄漏。
- 修复 macOS 首次启动被报「已损坏」（ad-hoc 签名）、Next 子进程抢占 Dock 图标、循环端口不稳定。
- 修复 next build 多 worker 迁移竞争；better-sqlite3 升级到 13 以兼容 Electron ABI。

## [v0.4.0] – [v0.4.1] - 2026-06-12 ~ 2026-07-02

### 新增

- JD 分析新增「复制并优化」，与就地优化并存（#88）；改进浏览器 PDF 回退生成（#86）。
- 面试支持查看已完成会话的历史轮次并标记只读（#71）；新增基于 LLM 的 issue/评论垃圾内容防护与端到端测试入口。

### 修复

- 修复 AI/PDF 中畸形章节内容并为 PDF 导出增加回退；拒绝 updateSection 中的非数组列表字段（#69）；修复 arm64 Docker 镜像构建（#66）。

## [v0.3.5] – [v0.3.11] - 2026-05-11 ~ 2026-05-30

- v0.3.11：打磨 PDF 分页（swiss 版式）输出；v0.3.10：抽出分页策略接缝、加固布局导出流水线。
- v0.3.9：修复现代版式换行；v0.3.8：改进简历预览/导出，稳定 Docker 打包与 lint。
- v0.3.7：支持服务端配置 AI 默认值；v0.3.6：新增简历版本历史。
- v0.3.5：修复 Docker 构建与 PDF 字体导出，内置自定义字体栈，修复导入简历持久化，配置 fork 发布与公开分享链接。
- v0.3.5 及更早：品牌主题色系统（含配色切换）、移动端适配、模拟面试间与运行时环境变量改造。
