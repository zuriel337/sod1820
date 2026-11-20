// M0-A contract (12.11.2026): the code-side facts that make the M0-A SQL safe for the 2029 product.
// If one of these fails, a shipped surface started to depend on something M0-A closes - revisit the proposal, do not loosen the test.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const SHIPPED = ["src", "api", "public-reading-deploy", "server", "middleware.js", "middleware-core.js"];
const walk = (p, out = []) => {
  const full = path.join(root, p);
  if (!fs.existsSync(full)) return out;
  if (fs.statSync(full).isFile()) { if (/\.(js|jsx|mjs|ts|tsx|html)$/.test(p) && !/\.(test|spec)\./.test(p)) out.push(p); return out; }
  for (const e of fs.readdirSync(full)) if (!["node_modules", "dist"].includes(e)) walk(path.join(p, e), out);
  return out;
};
const shipped = SHIPPED.flatMap((p) => walk(p)).map((f) => [f, read(f)]);
const grepShipped = (re) => shipped.filter(([, t]) => re.test(t)).map(([f]) => f);
const PROPOSED = "supabase/proposed";
const m0Files = fs.readdirSync(path.join(root, PROPOSED)).filter((f) => /^(?:ROLLBACK_)?(?:20261112130000|20261112130500|20261112131000|20261112131500|20261112132000|20261112133000|20261106131000)_/.test(f) || /^ROLLBACK_(?:20261106131000|20261112132000)_/.test(f));

test("no shipped code writes the seven Legacy tables M0-A closes, and no client reads lab_*", () => {
  for (const t of ["words", "syncs", "chat_messages", "chiddush_submissions", "metatron_beta_feedback", "lab_notes", "lab_messages"]) {
    const writers = shipped.filter(([, s]) => new RegExp(`from\\(\\s*["'\`]${t}["'\`]\\s*\\)\\s*\\.(?:insert|upsert|update|delete)\\b`).test(s)
      || new RegExp(`/rest/v1/${t}\\b[^\\n]*(?:POST|PATCH|DELETE)`).test(s));
    // the only historical writer (sendChatMessage) must stay unimported
    const live = writers.filter(([f, s]) => !(t === "chat_messages" && f === "src/lib/supabaseApi2029.js" && /export async function sendChatMessage/.test(s)));
    assert.deepEqual(live.map(([f]) => f), [], `${t} has a shipped writer`);
  }
  assert.deepEqual(grepShipped(/\bsendChatMessage\s*\(/).filter((f) => f !== "src/lib/supabaseApi2029.js"), [], "sendChatMessage gained an importer");
  assert.deepEqual(grepShipped(/from\(\s*["'`]lab_(?:notes|messages)["'`]\s*\)/), [], "a client reads lab_* (would become admin-only)");
});

test("the public gematria wall uses the privacy-checked TI projection instead of raw legacy rows", () => {
  const readers = shipped.filter(([, s]) => /from\(\s*["'`]gematria_wall["'`]\s*\)/.test(s));
  assert.deepEqual(readers.map(([f])=>f), [], "no shipped direct wall reader can bypass the projection");
  const api = read("src/lib/supabaseApi2029.js");
  const start = api.indexOf("export async function getWallRecent(");
  const wall = api.slice(start, api.indexOf("\nexport ", start + 1));
  assert.match(wall, /rpc\('research_pulse_2029'/, "suggestions use the canonical TI public reader");
  assert.match(wall, /if \(error \|\| data\?\.version !== 1\) return \[\]/, "no unsafe legacy fallback on failure");
  // #1461 retirement: the dead wall/search writers and legacy pulse adapters are gone (zero callers on branch, main and Production bacecaa).
  for (const dead of ["addWallWord", "saveWallWordPrivate", "logSearch", "getRecentSearchCount", "getRecentNumbers", "adminResearchMap", "getJourneyPulse", "getActivityPulse", "getSitePulseToday", "getPulse"])
    assert.doesNotMatch(api, new RegExp(`export (?:async )?function ${dead}\\(`), `${dead} stays retired`);
  assert.deepEqual(grepShipped(/rpc\(\s*["'`](?:add_wall_word|save_wall_word_private|journey_pulse|activity_pulse|site_pulse_today|live_stats|admin_research_map)["'`]/), [], "no shipped caller of a retired legacy RPC");
});

test("admin and account functions guarded by M0-A have no non-admin caller in shipped code", () => {
  for (const name of ["wa_msg_count", "admin_resolve_translit"]) assert.deepEqual(grepShipped(new RegExp(`rpc\\(\\s*["'\`]${name}["'\`]|/rpc/${name}\\b`)), [], name);
  // SHELL_WEIGHT_REDUCTION_20261118: sendChatMessage and getAiCostMetrics moved unchanged from supabase.js to supabaseApi2029.js.
  assert.deepEqual(grepShipped(/rpc\(\s*["'`]admin_ai_cost["'`]/), ["src/lib/supabaseApi2029.js"], "admin_ai_cost only through getAiCostMetrics");
  assert.deepEqual(grepShipped(/rpc\(\s*["'`]link_visitor_identity["'`]/), ["src/lib/AuthContext.jsx"], "link_visitor_identity only from the signed-in session");
});

test("els_records client reads never select visitor_id or * (DEF-001b step 1 replaces the table grant by a column grant)", () => {
  for (const [f, s] of shipped) {
    for (const m of s.matchAll(/(?:from\(\s*["'`]els_records["'`]\s*\)\s*\.select\(\s*([^)]*)\)|els_records\?[^`'"\s]*select=([^&`'"\s]*))/g)) {
      const cols = m[1] ?? m[2] ?? "";
      assert.doesNotMatch(cols, /visitor_id|["'`]\*["'`]|^\*$|,\*/, `${f}: els_records select ${cols}`);
    }
  }
});

test("M0-A proposal files carry no secret and no personal data, and every proposal has a rollback", () => {
  assert.ok(m0Files.length >= 12, `found ${m0Files.length} M0-A files`);
  for (const f of m0Files) {
    const s = read(`${PROPOSED}/${f}`);
    for (const m of s.matchAll(/[?&]s=([^&'"\s)]+)/g)) assert.ok(["__ROTATED__", "..."].includes(m[1]), `${f}: query secret literal`);
    assert.doesNotMatch(s, /[A-Za-z0-9._%+-]+@(?!g\.us|c\.us)[A-Za-z0-9-]+\.[A-Za-z]{2,}/, `${f}: e-mail address`);
    assert.doesNotMatch(s, /\b(?:\+?972|0)5\d[-\s]?\d{7}\b/, `${f}: phone number`);
  }
  for (const f of m0Files.filter((x) => !x.startsWith("ROLLBACK_"))) {
    const stamp = f.slice(0, 14);
    assert.ok(m0Files.some((x) => x.startsWith(`ROLLBACK_${stamp}_`)), `${f} has no ROLLBACK_${stamp}_*.sql`);
  }
});
