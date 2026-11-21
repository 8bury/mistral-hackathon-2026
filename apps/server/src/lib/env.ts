import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Locate the monorepo root (the folder containing prompts/ and data/).
 * Works whether cwd is the repo root or apps/server, and whether we run
 * via tsx (src/) or compiled (dist/).
 */
export function repoRoot(): string {
  const here = __dirname; // apps/server/src/lib (tsx) or apps/server/dist/lib (build)
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), 'apps/server'),
    path.resolve(here, '../../..'), // apps/server/src/lib -> apps … no: -> repo root when dist? checked below
    path.resolve(here, '../../../..'),
    path.resolve(here, '../../../../..'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'prompts', 'guide.md')) && fs.existsSync(path.join(c, 'data', 'landmarks.json'))) {
      return c;
    }
  }
  return process.cwd();
}

/** Load .env from cwd and from the repo root (workspace scripts run with cwd=apps/server). */
export function loadEnv(): void {
  dotenv.config();
  dotenv.config({ path: path.join(repoRoot(), '.env') });
}
