import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import handler from "../api/og.js";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const app2029 = read("src/App2029.jsx");
const vercel = JSON.parse(read("vercel.json"));
const migration = read("supabase/migrations/20260922211700_g3_journey_saves_least_privilege_v1.sql");

function routePattern(route) {
  return String(route).replace(/\/:[^/]+/g, "/(.*)");
}

const appRoutes = [...app2029.matchAll(/<Route\s+path="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((route) => route !== "*")
  .map(routePattern)
  .sort();

const documentRoutes = (vercel.rewrites || [])
  .filter((row) => row.destination === "/2029.html")
  .map((row) => row.source)
  .sort();

assert.deepEqual(
  documentRoutes,
  appRoutes,
  "every explicit App2029 route must have exactly one isolated /2029.html document rewrite and vice versa",
);
assert.ok(appRoutes.includes("/topic/(.*)"), "Topic deep links must be protected by the route/document parity gate");

// Legacy Journey telemetry: direct table reads are not a browser capability.
assert.match(migration, /drop policy if exists journey_saves_public_read on public\.journey_saves/i);
assert.match(migration, /revoke select on table public\.journey_saves from anon, authenticated/i);
assert.match(migration, /create or replace function public\.log_journey_save/i);
assert.match(migration, /security definer/i);
assert.match(migration, /set search_path to 'pg_catalog','public'/i);
assert.match(migration, /length\(v_visitor\) > 128/i);
assert.match(migration, /jsonb_array_length\(v_path\) > 50/i);
assert.match(migration, /octet_length\(v_path::text\) > 8192/i);
assert.match(migration, /length\(v_world\) > 160/i);
assert.match(migration, /revoke execute[\s\S]+from public/i);
assert.match(migration, /grant execute[\s\S]+to anon, authenticated, service_role/i);
assert.equal(/delete\s+from\s+public\.journey_saves/i.test(migration), false, "cleanup must preserve existing Journey history");
assert.equal(/update\s+public\.journey_saves/i.test(migration), false, "cleanup must not rewrite existing Journey history");

function allFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...allFiles(full));
    else if (/\.(?:js|jsx|ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}
for (const file of allFiles(path.join(root, "src"))) {
  const source = fs.readFileSync(file, "utf8");
  assert.equal(
    /\.from\(\s*["']journey_saves["']\s*\)/.test(source),
    false,
    `client direct journey_saves read/write is forbidden: ${path.relative(root, file)}`,
  );
}

function makeRes() {
  return {
    headers: new Map(),
    statusCode: null,
    body: null,
    setHeader(key, value) { this.headers.set(String(key).toLowerCase(), value); },
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = String(body); return this; },
  };
}

const previousFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error("unexpected fetch for Heichal static alias"); };
try {
  const res = makeRes();
  await handler({ query: { path: "/היכל" } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /<link rel="canonical" href="https:\/\/sod1820\.co\.il\/heichal"\/>/);
  assert.match(res.body, /<meta property="og:url" content="https:\/\/sod1820\.co\.il\/heichal"\/>/);
  assert.match(res.body, /http-equiv="refresh" content="0; url=https:\/\/sod1820\.co\.il\/heichal"/);
} finally {
  globalThis.fetch = previousFetch;
}

console.log("2029 cheap route/test/least-privilege hardening: PASS");
