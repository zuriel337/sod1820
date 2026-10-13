// Verify the exact archived proof harness locally. No deployment or native HTTP.
import { mkdtempSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const archive = new URL('../docs/test-evidence/p0-f01-f02-20261013/server-http-proof/', import.meta.url);
const isolated = mkdtempSync(join(tmpdir(), 'sod1820-p0-proof-controls-'));
try {
  for (const name of ['index.ts', 'test-guards.mjs']) copyFileSync(new URL(name, archive), join(isolated, name));
  // Fail-closed placeholder only; tests supply visibly synthetic configuration.
  writeFileSync(join(isolated, 'permit.json'), JSON.stringify({ nonce_sha256: 'NOT_PREPARED', expires_at_ms: 0 }), { mode: 0o600 });
  execFileSync(process.execPath, [join(isolated, 'test-guards.mjs')], { stdio: 'inherit' });
} finally {
  rmSync(isolated, { recursive: true, force: true });
}
