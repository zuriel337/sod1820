// Regression guard for TOPIC_CARDS_PUBLIC_READ_MODEL_PRIVACY_FIX_V1 (work_log bf236317 / ACK 6fdb6744).
// Run with: node --test src/lib/topicCardsReadModel.test.js
//
// The public read model is the VIEW public.topic_cards_public (rows: approved & not _do_not_publish;
// findings: internal underscore keys stripped server-side). Admin raw access goes through the
// SECURITY DEFINER RPC admin_topic_cards_full. This static scan makes sure no public code path
// regresses to reading the raw table with select('*') / select('findings') — the exact leak the
// security audit c74d3ccd found. It is deliberately a source scan (no network): the DB-level access
// matrix lives in the work_log AFTER; this guards the client side of the contract.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const SCAN_DIRS = ["src", "api", "scripts"];
const EXT = new Set([".js", ".jsx", ".mjs"]);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) { if (ent.name !== "node_modules") walk(p, out); }
    else if (EXT.has(path.extname(ent.name)) && !ent.name.endsWith(".test.js")) out.push(p);
  }
  return out;
}

const files = SCAN_DIRS.flatMap(d => walk(path.join(ROOT, d)));

// Raw-table reads that would carry findings (select('*') or an explicit findings column) are
// only allowed through the admin RPC; the two admin write helpers return explicit non-findings
// columns. Anything else must go through topic_cards_public.
const RAW_READ_RE = /from\((['"])topic_cards\1\)\s*\.select\((['"])(\*|[^'"]*\bfindings\b[^'"]*)\2/g;
const RAW_REST_RE = /\/rest\/v1\/topic_cards(\?|['"`])/g;

test("no public reader selects '*' or findings from raw topic_cards (must use topic_cards_public / admin_topic_cards_full)", () => {
  const offenders = [];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(RAW_READ_RE)) offenders.push(`${path.relative(ROOT, f)}: ${m[0].slice(0, 80)}`);
    for (const m of src.matchAll(RAW_REST_RE)) offenders.push(`${path.relative(ROOT, f)}: REST ${m[0]}`);
  }
  assert.deepEqual(offenders, [], "raw topic_cards findings/'*' reads found:\n" + offenders.join("\n"));
});

test("canonical public helpers read the view; admin helpers use the explicit privileged RPC", () => {
  const supa = fs.readFileSync(path.join(ROOT, "src/lib/supabase.js"), "utf8");
  assert.match(supa, /export const TOPIC_CARDS_PUBLIC = ['"]topic_cards_public['"]/);
  assert.match(supa, /rpc\(['"]admin_topic_cards_full['"]/, "admin full-row path must be the SECURITY DEFINER RPC");
  const conv = fs.readFileSync(path.join(ROOT, "src/lib/research/topicConvergence.js"), "utf8");
  assert.match(conv, /from\(["']topic_cards_public["']\)/, "canonical Topic/Convergence fetch must read the public read model");
  for (const rel of ["api/og.js", "api/sitemap.js", "scripts/gen-sitemap.mjs"]) {
    const s = fs.readFileSync(path.join(ROOT, rel), "utf8");
    assert.match(s, /topic_cards_public/, `${rel} must read topic_cards_public`);
  }
});

test("migration files exist: Phase A (live-safe) and Phase B (release-gated column revoke)", () => {
  const a = fs.readFileSync(path.join(ROOT, "supabase/migrations/20260905203000_topic_cards_public_read_model_v1.sql"), "utf8");
  const b = fs.readFileSync(path.join(ROOT, "supabase/migrations/20260905203500_topic_cards_public_read_model_v1_phase_b_release_gate.sql"), "utf8");
  assert.match(a, /create or replace view public\.topic_cards_public/);
  assert.match(a, /security_barrier = true/);
  assert.match(a, /admin_topic_cards_full/);
  assert.match(a, /drop policy if exists topic_cards_auth_read_all/);
  assert.match(a, /revoke truncate, trigger, references on public\.topic_cards from anon, authenticated/);
  assert.match(a, /jsonb_each\(f\) as e\(k, v\)/, "strip function must alias jsonb_each columns (live corrective)");
  assert.match(b, /revoke select on public\.topic_cards from anon, authenticated/);
  assert.doesNotMatch(b, /\bfindings\b[^\n]*\)\s*on public\.topic_cards to anon/, "Phase B column grant must exclude findings");
  assert.match(b, /RELEASE-GATED/);
});
