/**
 * 三页首屏 JS 测量：模板库 / 编辑器 / 分享页。
 *
 * 用法：node --import tsx scripts/measure-first-load-js.ts [baseUrl]
 * 前提：本地服务已启动（pnpm start），.next 为当前构建产物。
 * 原理：抓取页面 HTML 中的 <script src> 列表，直接对 .next/static
 * 里的文件求字节数（避免网络抖动）；动态导入的 chunk 不在 HTML 中，
 * 恰好对应「首屏必须下载的 JS」口径。
 */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv.find((arg) => arg.startsWith('http://') || arg.startsWith('https://')) || 'http://127.0.0.1:3000';
const FINGERPRINT = `first-load-measure-${process.pid}`;

async function api(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-fingerprint': FINGERPRINT, ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

function measurePage(html: string): { scripts: number; bytes: number } {
  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  let bytes = 0;
  for (const src of srcs) {
    const clean = src.split('?')[0].replace('/_next/', '.next/');
    try {
      bytes += statSync(join(process.cwd(), clean)).size;
    } catch {
      // 非 static 资源（如 /api 引用）不计
    }
  }
  return { scripts: srcs.length, bytes };
}

async function main() {
  const check = process.argv.includes('--check');
  const health = await fetch(BASE + '/api/health');
  if (!health.ok) throw new Error('server not running');

  const created = await api('/api/resume', {
    method: 'POST',
    body: JSON.stringify({ title: 'measure', template: 'classic', language: 'zh' }),
  });
  const share = await api(`/api/resume/${created.id}/share`, {
    method: 'POST',
    body: JSON.stringify({}),
  }).catch(() => null);

  const pages: Array<[string, string]> = [
    ['模板库 /zh/templates', '/zh/templates'],
    ['编辑器 /zh/editor/[id]', `/zh/editor/${created.id}`],
  ];
  if (share?.token) pages.push(['分享页 /zh/share/[token]', `/zh/share/${share.token}`]);
  else pages.push(['落地页 /zh', '/zh']);

  console.log(`base: ${BASE}\n`);
  console.log('页面'.padEnd(28), '脚本数', '首屏 JS');
  // --check 模式的首屏 JS 预算（KB）。基线（2026-10-25，模板按需 chunk 后）：
  // 模板库 947 / 编辑器 1870 / 落地页 911 / 分享页 ≈ 编辑器量级。预留 ~15-20% 余量。
  const BUDGETS: Array<[RegExp, number]> = [
    [/模板库/, 1150],
    [/编辑器|分享页/, 2100],
    [/落地页/, 1100],
  ];
  let failed = false;
  for (const [label, path] of pages) {
    const res = await fetch(BASE + path, { headers: { 'x-fingerprint': FINGERPRINT } });
    const html = await res.text();
    const { scripts, bytes } = measurePage(html);
    const kb = Math.round(bytes / 1024);
    const budget = BUDGETS.find(([re]) => re.test(label))?.[1];
    const mark = check && budget ? (kb > budget ? `  ✗ 超预算 ${budget} KB` : `  ✓ ≤${budget}KB`) : '';
    if (check && budget && kb > budget) failed = true;
    console.log(label.padEnd(28), String(scripts).padStart(4), `${kb} KB`.padStart(10), mark);
  }
  if (failed) {
    console.error('\n首屏 JS 超出预算：请检查是否引入了全量模板导入或大型依赖。');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
