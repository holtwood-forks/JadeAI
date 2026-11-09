# 待办问题设计方案（交接文档）

> **状态更新（2026-10-25 当日）**：问题 4（gh 默认仓库）、问题 5（actions 升级）、问题 1（药丸对比度）、问题 6（死分支清理）已完成；问题 3（懒加载）已完成：三页首屏 -19%~34%，模板库可视区懒挂载后最终下载同样低于静态版；小修批次、防回归网、垫片分析与 PDF 冒烟均已完成；编辑器 bundle 剖析完成：AI 悬浮球链（AI SDK+zod+markdown，约 630KB）懒加载后编辑器首屏 -34%（1870→1240KB）；问题 2（mosaic）维持不动。

> 生成于 2026-10-25，背景语境见 `docs/research/theme-color-coverage.md`（主题迁移矩阵与四批迁移记录）与 CHANGELOG [Unreleased]。
> 本文档自包含：每个问题给出证据位置、方案取舍、实施步骤、验证标准。新会话按序处理即可，互相独立，可单独做。

---

## 问题 1：teacher/medical 药丸式标题的主题化与对比度防护

### 现状与证据
- teacher 分节标题是「彩色药丸」：导出端 `export/templates/teacher.ts:114`、预览端 `preview/templates/teacher.tsx:62-65`，形态为 `background-color:${PRIMARY}` + `text-white`。
- medical 同款：`export/templates/medical.ts:111`、`preview/templates/medical.tsx:59-64`，`backgroundColor: TEAL_500`（#0d9488）+ `text-white`。
- 第四批迁移时曾误将背景改成主题变量并回滚：用户若选浅色主色 → 白字浅底不可读。

### 方案（推荐 A）
**A. 注入 `--theme-primary-contrast-text` 变量（服务端算黑/白自动切换）**
- `build-theme-css.ts` 已有 `relativeLuminance()`；新增逻辑：`lum(primary) ≥ 0.5 → 文字 #111827（深），否则 #ffffff`，与 accent 同理注入 `--theme-accent-contrast-text`。
- 模板药丸两侧同步改为：`background: var(--theme-primary-color); color: var(--theme-primary-contrast-text)`（去掉 `text-white` 类）。
- `TEMPLATE_PRIMARY_DEFAULTS` 补 `medical: '#0d9488'`（teacher 已有 `#9a3412`）。默认外观不变（深色底 → 自动白字）。
- 被否选项：CSS `color-mix`/relative color（依赖渲染引擎版本，服务端计算更稳且两侧同源）。

### 实施步骤
1. build-theme-css.ts 注入 contrast-text 两个变量（紧挨 safe-on-dark）。
2. teacher/medical 四个文件的药丸 h2 改造（注意 teacher 药丸外的 `#fed7aa` 徽章等装饰不动）。
3. 测试：`safe-on-dark.test.ts` 旁补 contrast-text 单测（深色→白字、浅色→深字）；`builders.test.ts` 补两模板断言；teacher/medical 不在导出快照集，无快照负担。
4. **审计脚本同步**：`scripts/audit-theme-coverage.ts` 的判定需把 `background-color:var(--theme-primary-color)` 的标题计为「跟随」（当前会被 `STYLE_COLOR_RE` 误计为「固定」）。

### 验证标准
默认导出 HTML 中药丸仍为原色+白字；显式设浅色（如 `#ffff00`）时药丸变浅色且文字变深色；矩阵中两模板移出「不生效」清单。

---

## 问题 2：mosaic 循环色板

### 现状与证据
`preview/templates/mosaic.tsx:81`：h2 `style={{ color }}`，color 来自按分节索引循环的四色数组（#1e293b / #3b82f6 / #10b981 / #f59e0b）。单一 primary 无法表达四色轮换。

### 方案（推荐：维持「设计性不迁」；若产品要求主题化，用 C）
- **A. 维持固定（当前已文档化的决策）**——彩虹即身份，零风险。
- B. 色相旋转派生（primary + hue+90/180/270）：审美不可控，否。
- C. **同色系明度阶梯**：用户显式设 primary 后，服务端 HSL 计算注入 `--theme-palette-1..4`（primary 原色 + 三个明度变体）；默认时 palette 变量回退为模板原四色。
- **难点（如实告知）**：C 需要区分「默认」与「用户显式设置」——`mergeThemeConfig` 无法区分两者（显式值与默认值合并后不可辨）。解法需要 sentinel 或在渲染层比较 `source.primaryColor !== TEMPLATE_PRIMARY_DEFAULTS[template]` 之前的原始值，侵入性不小。
- D. 扩展 accent-2/3 用户插槽：为单一模板扩大用户契约，第四批已论证不值得。

**结论：除非产品明确提出 mosaic 主题化需求，否则保持 A。做 C 之前先确认需求方。**

---

## 问题 3：预览模板懒加载（先度量后决策）

### 现状与证据
- `preview/resume-preview.tsx:8-64`：静态 import 全部 50 个模板组件（约 1.46 万行 TSX），任何使用 ResumePreview 的页面（编辑器/预览/分享/模板库）客户端 bundle 全量携带。
- 曾实施 `next/dynamic` 版本后撤销：干净对照构建显示总静态资产 5.14MB→6.25MB（+1.1MB chunk 碎片化开销），共享大 chunk（499KB×2）消失；但**模板库页一次渲染 50 个预览**，改为 50 个带重复依赖的 chunk 后可能反而变差，收益侧（编辑器页）未做运行时度量。

### 方案：三页实测 → 按矩阵决策
1. **基线测量**（当前静态版，服务跑起来后）：
   - 对 `/zh/templates`、任一 `/zh/editor/[id]`、任一 `/zh/share/[token]` 三页 curl 抓 HTML，解析 `<script src>` 列表，求和 `.next/static` 文件字节数 = 首屏 JS。写成一个可复用脚本（可放 `scripts/`，输出三页数字）。
2. **重放 dynamic 版本**（参考已撤销的实现方式：`templateMap` 每项 `dynamic(() => import(...).then(m => m.XxxTemplate))`，不用 `ssr:false`，保留 `|| templateMap.classic` 回退），重建后再测三页。
3. **决策矩阵**：
   - editor/share 首屏 JS 显著下降 且 templates 不升 → 采纳。
   - templates 上升 → 拆开做：bundle 拆分照旧 + **模板库页可视区懒渲染**（IntersectionObserver，只挂载视口内的 ResumePreview）——这个渲染优化与 bundle 拆分正交，单独值得做。
   - 任一变差即整体回滚。

### 验证标准
三页首屏 JS 字节数对比表 + 构建产物截图记录；决策写入本文档续篇。

---

## 问题 4：gh 双 remote 默认解析到 upstream

### 现状与证据
仓库有 origin（holtwood-projects/JadeAI）与 upstream（LingyiChen-AI/JadeAI）两个 remote。gh CLI 对 fork 仓库**默认解析到 upstream**，导致 `gh run view/watch` 不带 `-R` 时 404（2026-10-25 实际踩坑）。

### 方案（一次性命令 + 文档）
```bash
gh repo set-default holtwood-projects/JadeAI   # 持久化默认仓库
```
验证：`gh run list` 直接可用。另在 `docs/fork-notes.md` 补一行说明（fork 操作时 gh 的此行为）。规模：5 分钟。

---

## 问题 5：CI actions 版本升级

### 现状与证据
CI 日志两条平台警告：
1. `actions/checkout@v4`、`actions/setup-node@v4`、`pnpm/action-setup@v4` 目标 Node 20，被强制跑 Node 24（GitHub 2025-09 弃用 Node 20）。
2. `ubuntu-latest` 将迁移 Ubuntu 26（2026-10-19 起）。

### 方案
- `.github/workflows/ci.yml` 升级：`actions/checkout@v5`、`actions/setup-node@v5`、`pnpm/action-setup@v5`（升级前查各 action 的 breaking changes，重点是 setup-node v5 的缓存参数变化）。
- 其余 workflow（`issue-spam-guard.yml`、`pages.yml`、`upstream-sync.yml`）同步检查。
- runner：保持 `ubuntu-latest` 但升级后在 Ubuntu 26 上验证一次全绿即可；若失败再显式 pin `ubuntu-24.04`。

### 验证标准
push 后 CI 无 Node 20 弃用警告且全绿（quality + docker 冒烟）。规模：低风险例行升级，半小时内。

---

## 问题 6：buildThemeCss 遗留死分支清理

### 现状与证据
`build-theme-css.ts:174-210`（`templateSafeVariables: false` 分支）是遗留路径——两个生产调用方（`resume-preview.tsx`、`export/utils.ts`）都传 `true`。约 40 行与现行分支重复维护的死代码，且它不注入任何 CSS 变量（本次设计时曾因此误判测试失败）。

### 方案
1. grep 确认无其他调用方后删除 false 分支，`templateSafeVariables` 参数直接删掉或改为必传。
2. 若有测试走 false 分支（含将 theme 传 `mergeThemeConfig` 后部分字段断言的），迁移到 true 分支的输出。
3. 顺带评估：`isDark()` 与新增 `relativeLuminance()` 有部分重叠，可合并。

规模：小。验证：全套测试 + 矩阵脚本重跑结果不变。

---

## 依赖关系备忘（非任务）

- `src/lib/constants.ts:55` `TWO_COLUMN_TEMPLATES` 硬编码三套模板的侧栏背景色（#16213e/#1e40af/#0d1117），用于导出 QR bar 连续性。目前与模板固定侧栏色一致；**若未来侧栏背景主题化，此处必须同步**，否则 QR bar 与侧栏断裂。
- mosaic 的四色数组、coder 的 `$` 提示符、neon 的 VIOLET、各模板条目级装饰色均为「固定身份色」，是矩阵文档中记录的设计决策——做任何「全量主题化」清理时不要顺手迁移它们。

## 建议处理顺序

问题 4（5 分钟）→ 问题 5（半小时）→ 问题 1（半天，含审计脚本同步）→ 问题 6（小）→ 问题 3（需度量与决策，半天到一天）。问题 2 除非有产品输入，不动。

### 问题 3 执行结果（2026-10-25）

| 页面 | 静态首屏 | dynamic 首屏 | 变化 |
| --- | --- | --- | --- |
| 模板库 | 1410 KB | 947 KB | -33% |
| 编辑器 | 2310 KB | 1870 KB | -19% |
| 落地页 | 1373 KB | 911 KB | -34% |

模板库最终总下载（首屏 + 全部 50 chunk ≈ 1900+ KB）高于静态版 → 按决策矩阵追加**可视区懒挂载**（LazyPreview，IntersectionObserver rootMargin 400px）：实际下载收敛为「首屏 947 + 用户浏览到的模板 chunk」。仓库总静态资产 5.14→6.24 MB（chunk 碎片化开销，不影响按页加载口径）。测量脚本：`scripts/measure-first-load-js.ts`。

## 新发现（2026-10-25 收尾时）

`POST /api/resume` 不校验 `template` 字段合法性：传入无效模板名（如笔误）会静默创建脏数据简历，导出时按防御逻辑回退 classic 渲染——builder 层的回退是设计行为，但**入口校验缺失会让用户存下错误模板名的简历**。建议：create/update 路由对 `template ∈ TEMPLATES` 校验，非法值 400 或回落 classic 并在响应中标注。规模：小。
