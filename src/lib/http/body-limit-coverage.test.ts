import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function collectRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectRouteFiles(full));
    else if (entry === 'route.ts') out.push(full);
  }
  return out;
}

const ROUTES = collectRouteFiles(join(process.cwd(), 'src/app/api'));

describe('API request body limits', () => {
  it('finds the route files', () => {
    expect(ROUTES.length).toBeGreaterThan(20);
  });

  it('never reads an unbounded body via request.json()', () => {
    const offenders = ROUTES.filter((file) =>
      /\b(?:request|req)\.json\(\)/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
