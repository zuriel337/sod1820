// Test-only protected Preview: no site/API/DB deployment and no credential input.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

if (process.env.VERCEL_ENV !== 'preview') throw new Error('SG diagnostic is Preview-only');
const branch = 'gpt/sg-rate-limit-runtime-oidc-fix-20261026';
if (process.env.VERCEL_GIT_COMMIT_REF && process.env.VERCEL_GIT_COMMIT_REF !== branch) throw new Error('SG probe branch mismatch');
const here = dirname(fileURLToPath(import.meta.url));
const root = fileURLToPath(new URL('../../../', import.meta.url));
const source = readFileSync(join(root, 'middleware.js'), 'utf8');
const start = source.indexOf('function vercelOidcToken() {');
const end = source.indexOf('\nasync function sgBrowserRateLimit', start);
if (start < 0 || end < start) throw new Error('Missing canonical accessor');
const accessor = source.slice(start, end).trim();
const sha = process.env.VERCEL_GIT_COMMIT_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
writeFileSync(join(here, 'runtime-reader.mjs'), `export ${accessor}\nexport const sourceSha=${JSON.stringify(sha)};\n`);
mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist/index.html'), '<!doctype html><meta name="robots" content="noindex,nofollow"><title>Isolated SG OIDC diagnostic</title>');
console.log(JSON.stringify({ sha, branch, accessor_sha256: createHash('sha256').update(accessor).digest('hex'), token_output: false, supabase_calls: false }));
