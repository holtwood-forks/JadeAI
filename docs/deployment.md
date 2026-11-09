# 部署指南与设计（个人自用）

本文面向“自己部署、自己使用”的场景：一台机器、一个容器、SQLite。目标是**能一次装对、出问题能定位、数据能备份**。

> 其他部署形态（公网多用户、PostgreSQL、多副本）见文末「扩展路径」，当前架构不推荐直接多副本。

---

## 1. 先选形态

| 形态 | 访问方式 | 需要的配置 | 适合 |
|---|---|---|---|
| A. 本机 Docker | `http://localhost:3003` | 2 GB 空闲内存、5 GB 磁盘 | 只在电脑上用 |
| B. 局域网 / 隧道 | Tailscale、Cloudflare Tunnel、NAS | 同上 + 隧道客户端 | 手机、平板也想用 |
| C. 公网域名 | 反向代理 + HTTPS | 2C2G、域名、OAuth | 需要随时访问且能接受登录 |

**个人自用强烈建议 A 或 B。** 原因：`JADE_SINGLE_USER=true` 与默认的指纹模式都没有登录门槛，端口一旦暴露到公网，等于把简历和个人信息交给任何扫端口的人。

---

## 2. 架构设计

```
浏览器 / 手机
     │  HTTPS（仅 C 形态需要）
     ▼
┌─────────────────────────────┐
│ Caddy / Nginx（可选）        │  只监听 443，反代到 127.0.0.1:3003
└──────────────┬──────────────┘
               │ HTTP 127.0.0.1
               ▼
┌───────────────────────────────────────────┐
│ jadeai 容器（node:22-bookworm-slim）       │
│                                            │
│  Next.js standalone  :3000                 │
│    ├─ App Router / API                     │
│    ├─ tini (PID 1，回收 Chromium 子进程)    │
│    ├─ Chromium（仅 PDF 导出时拉起，共享实例）│
│    └─ /app/data/jade.db  ← 绑定挂载到宿主机 │
└───────────────────────────────────────────┘
```

设计取舍：

- **单容器**：应用、Chromium、字体全在一个镜像里，部署面最小；代价是镜像约 1 GB。
- **SQLite**：零配置、单文件、备份简单；代价是不能多副本共享（见「扩展路径」）。
- **只监听回环**：默认安全，公网访问必须显式改绑定或加反代。
- **就绪探针与存活探针分离**：`/api/health` 不查数据库（DB 慢不等于进程死了），`/api/ready` 查 DB 与 `AUTH_SECRET`，Docker HEALTHCHECK 用后者。
- **PDF 并发上限 2**：第 3 个导出直接返回 `429`，避免 Chromium 把内存打满。

---

## 3. 资源需求（实测数据）

| 指标 | 数值 | 来源 |
|---|---|---|
| 服务空载内存 | ~161 MB | 本机 standalone 实测 |
| 单次 PDF 导出峰值 | ~0.5–0.8 GB | 估算（Chromium + Node） |
| 构建峰值内存 | ~2.16 GB | `pnpm build` 实测 |
| 应用层体积 | standalone 199 MB + 字体 70 MB + static 6.4 MB | 实测 |
| 镜像体积 | 约 0.9–1.2 GB | 估算 |
| 空数据库 | 4 KB | 实测 |

结论：

- **运行**：2 vCPU / 2 GB / 20 GB 足够个人自用。
- **构建**：需要 ≥3 GB 可用内存。1C1G 的小机器请在别处构建好镜像再 pull。

### 3.1 内存实测与调优

本机 standalone + SQLite 实测（Node 侧，不含 Chromium）：

| 场景 | RSS |
|---|---|
| 空载（迁移 + seed 完成） | ~120 MB |
| 20 次首页 SSR | ~124 MB |
| 200 次 `/api/resume` | ~167 MB |
| 再 100 次 `/api/health` | ~172 MB |
| 之后空闲 20 秒 | **~116 MB**（回落，无泄漏） |
| 首次调用 PDF 导出路由后（加载 puppeteer-core） | ~167 MB，常驻 |

Chromium 部分（本机未安装，按同类部署估算）：空闲浏览器 ~100–200 MB，每次渲染再叠加 ~200–400 MB。因此：

- **单次导出**总占用约 350–550 MB；
- **两个并发导出**峰值约 0.8–1.2 GB。

按内存选配置：

| 宿主内存 | 建议 |
|---|---|
| 2 GB 及以上 | 默认即可（并发 2、空闲 10 分钟回收） |
| 1 GB | `PDF_MAX_CONCURRENT=1` + `PDF_BROWSER_IDLE_MS=120000`，容器加 `--memory=1g --memory-swap=2g` |
| 512 MB | 不建议跑 PDF 导出；可 `INSTALL_CHROMIUM=false` 只做编辑/预览 |

可选的 Node 堆上限（默认在 2 GB 主机上约为 1.5 GB）：

```bash
NODE_OPTIONS=--max-old-space-size=768
```

> 不建议给 Chromium 加 `--single-process` 或未经验证的裁剪参数：会显著提高渲染崩溃概率，省下的内存远小于一次 502 的代价。

观察方式：

```bash
docker stats --no-stream jadeai
# 或
ps -o rss= -p "$(pgrep -f '.next/standalone/server.js')" | awk '{printf "%.0f MB\n", $1/1024}'
```

---

## 4. 部署前检查

```bash
docker --version          # 建议 24+
docker compose version    # 需要 Compose v2
free -m                   # 空闲内存 ≥ 2 GB（只运行）/ ≥ 3 GB（同时构建）
df -h .                   # 建议 ≥ 20 GB 可用
```

---

## 5. 方案 A：本机 Compose（推荐）

```bash
git clone https://github.com/holtwood-forks/JadeAI.git
cd JadeAI

mkdir -p data                                  # 必须是当前用户可写，容器内 uid 1000
cp .env.example .env.local
# 编辑 .env.local：至少设置 AUTH_SECRET
#   AUTH_SECRET=$(openssl rand -base64 32)

docker compose up -d --build
```

首次启动会：

1. 执行 `drizzle/migrations` 里的 SQLite 迁移；
2. 数据库为空时写入一份演示数据（演示用户与示例简历，单用户模式下看不到）；
3. 通过 `/api/ready` 后 Compose 标记为 healthy。

验证：

```bash
curl -fsS http://127.0.0.1:3003/api/health   # {"ok":true}
curl -fsS http://127.0.0.1:3003/api/ready    # {"ok":true,"checks":{"config":"ok","database":"ok"}}
docker compose ps                            # STATUS 应为 healthy
```

浏览器打开 <http://localhost:3003>。

> 不想用 Compose：`pnpm docker:run` 等价（同样只监听 `127.0.0.1:3003`，并会等待 `/api/ready`）。

---

## 6. 方案 B：手机 / 其他设备访问

推荐用隧道，不要把端口直接开到公网。

- **Tailscale**：宿主机加入 tailnet，手机装客户端，访问 `http://<tailscale-ip>:3003`。
- **Cloudflare Tunnel**：在 Cloudflare 侧加 Access 策略（只允许自己的邮箱），隧道指向 `http://127.0.0.1:3003`。
- **NAS**：在 NAS 的 Docker 里跑同样配置，数据目录放到 NAS 存储卷。

三种方式下都**保持 `BIND_ADDR=127.0.0.1`**，由隧道/网关转发。

---

## 7. 方案 C：公网域名（需要登录）

```bash
# .env.local
AUTH_ENABLED=true
AUTH_SECRET=<随机 32 字节>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
PUBLIC_SITE_URL=https://resume.example.com
TRUST_PROXY=true
# 不要设置 JADE_SINGLE_USER（与 AUTH_ENABLED 同时设置会拒绝启动）
```

Google OAuth 回调地址填：`https://resume.example.com/api/auth/callback/google`。

Caddy 示例：

```
resume.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3003
}
```

Nginx 示例：

```nginx
server {
  listen 443 ssl http2;
  server_name resume.example.com;

  location / {
    proxy_pass http://127.0.0.1:3003;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    client_max_body_size 3m;   # 简历写入上限 2 MiB，留一点余量
  }
}
```

说明：

- `TRUST_PROXY=true` 让限流按真实 IP 分桶，并允许分享链接使用转发头；只有**所有**流量都经过该反代时才开启。
- 即使开了 `TRUST_PROXY`，仍建议设置 `PUBLIC_SITE_URL`，避免代理头异常时生成错误链接。
- `client_max_body_size` 必须 ≥ 2 MiB，否则上传/导入会在网关层被拒（应用返回 413 时同理）。

---

## 8. 配置矩阵

| 变量 | A 本机 | B 隧道 | C 公网 OAuth |
|---|---|---|---|
| `AUTH_SECRET` | 必填 | 必填 | 必填 |
| `AUTH_ENABLED` | `false` | `false` | `true` |
| `JADE_SINGLE_USER` | `true` | `true` | **不设** |
| `PUBLIC_SITE_URL` | 留空 | 留空或隧道域名 | `https://域名` |
| `TRUST_PROXY` | 不设 | 不设 | `true`（有反代） |
| `BIND_ADDR` | `127.0.0.1` | `127.0.0.1` | `127.0.0.1`（Caddy 在本机） |
| `HOST_PORT` | `3003` | `3003` | `3003` |

> `AUTH_ENABLED=true` 与 `JADE_SINGLE_USER=true` **互斥**：同时设置时进程会打印错误并以退出码 1 结束，这是有意设计。

---

## 9. 数据备份与恢复

### 备份

SQLite 使用 WAL 模式，**运行中直接复制 `jade.db` 可能得到不一致快照**。使用内置在线备份：

```bash
SQLITE_PATH="$PWD/data/jade.db" \
BACKUP_DIR="$PWD/data/backups" \
pnpm db:backup
```

默认保留最近 14 份。建议加 cron：

```cron
17 3 * * * cd /path/to/JadeAI && SQLITE_PATH="$PWD/data/jade.db" BACKUP_DIR="$PWD/data/backups" /usr/bin/env pnpm db:backup >> data/backup.log 2>&1
```

### 恢复

```bash
docker compose stop
cp data/jade.db data/jade.db.broken        # 保留现场
cp data/backups/jade-YYYYMMDD-HHMMSS.db data/jade.db
rm -f data/jade.db-wal data/jade.db-shm    # 旧 WAL 必须删除
docker compose up -d
curl -fsS http://127.0.0.1:3003/api/ready
```

恢复后打开工作台确认简历数量；必要时 `PRAGMA integrity_check`。

---

## 10. 升级与回滚

```bash
# 升级前
docker tag jadeai-local:latest jadeai-local:previous
SQLITE_PATH="$PWD/data/jade.db" BACKUP_DIR="$PWD/data/backups" pnpm db:backup

git pull
docker compose build --pull
docker compose up -d
curl -fsS http://127.0.0.1:3003/api/ready
```

- 迁移在启动时自动执行；**迁移是单向的**，回滚旧镜像前如需降级 schema，请恢复备份。
- 回滚应用：

```bash
docker compose down
docker tag jadeai-local:previous jadeai-local:latest
docker compose up -d
```

---

## 11. 排障

| 现象 | 原因 | 处理 |
|---|---|---|
| 容器反复重启，日志有 `cannot be combined with JADE_SINGLE_USER` | 两个身份开关同时开启 | 去掉 `JADE_SINGLE_USER` 或 `AUTH_ENABLED` |
| `/api/ready` 返回 503，`checks.config=missing` | 没设 `AUTH_SECRET` | 生成并写入 `.env.local` |
| 日志 `AUTH_SECRET looks like a placeholder` | 仍用示例值 | `openssl rand -base64 32` 替换 |
| `Container did not become ready.` | 启动失败 | 看脚本打印的 `docker logs`；常见是端口占用、DB 权限 |
| `unable to open database file` | `./data` 不可写 | `chown -R 1000:1000 data` 或改用命名卷 |
| 浏览器 502 / 空响应 | 反代指向错误端口 | 确认反代目标是 `127.0.0.1:3003` |
| 导出 PDF 返回 429 | 并发超过 2 | 等 2 秒重试；个人使用正常不会触发 |
| 上传/保存返回 413 | 请求体超过 2 MiB | 精简内容；反代 `client_max_body_size` 也要够大 |
| `docker build` 退出码 137 | 构建内存不足 | 换机器/CI 构建，或加 swap |
| `port is already allocated` | 3003 被占用 | `HOST_PORT=3004 docker compose up -d` |
| 登录后仍 401 | 反代没传 `X-Forwarded-*` 或 `AUTH_SECRET` 变更 | 检查反代头；换 secret 会使旧会话失效 |

---

## 12. 安全核对表

- [ ] `AUTH_SECRET` 是随机值，不是 `.env.example` 里的占位符
- [ ] `3003` 没有直接暴露到公网（`ss -lntp | grep 3003` 应只见 `127.0.0.1`）
- [ ] 单用户模式只在本机/隧道后使用
- [ ] 公网部署使用 OAuth，且未同时开启单用户模式
- [ ] 备份目录权限为 `700`，备份文件不含明文 API Key（Key 只存在浏览器）
- [ ] 反代启用 HTTPS，并设置 `client_max_body_size ≥ 3m`
- [ ] 容器以非 root 运行（镜像默认 `node` 用户），不要加 `--privileged`

---

## 13. 监控与容量

```bash
docker stats --no-stream jadeai
docker logs --tail 100 jadeai
curl -fsS http://127.0.0.1:3003/api/ready
```

关注三件事：

1. 内存长期 > 70%：说明导出并发叠加，考虑 4 GB 或减少并发。
2. `429` 增多：导出排队，个人使用可忽略。
3. `data/` 体积：SQLite 增长很慢（每份简历几 KB），主要占用是 `backups/` 与 Docker 镜像/构建缓存；定期 `docker image prune`。

---

## 14. 已知限制

- **单副本**：SQLite 不能多副本共享，横向扩容必须切 PostgreSQL。
- **无内置多用户管理**：OAuth 登录即可用，没有角色/配额。
- **PDF 并发 2**：超出返回 429，不做队列。
- **请求体上限**：简历写入 2 MiB、分享 8 KiB、设置 64 KiB。
- **AI Key 在浏览器**：服务端不保存，换浏览器需重新配置；服务端 AI 变量仅作为“统一提供给所有人”的可选方案。

---

## 15. 扩展路径（超出个人自用）

1. 切 PostgreSQL：`DB_TYPE=postgresql` + `DATABASE_URL`，启动时自动跑 `drizzle/pg-migrations`。
2. 多副本：必须 PG + 共享会话/限流存储（当前限流是进程内内存），并在前面加负载均衡。
3. 对象存储/CDN：`public/fonts` 70 MB 可外置，减少镜像与首包。
4. 监控：把 `/api/ready` 接入 uptime 监控，把 5xx 与 429 计入日志告警。
