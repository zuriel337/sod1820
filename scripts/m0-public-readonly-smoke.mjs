#!/usr/bin/env node
// M0 public read / public compute smoke (success criteria 1 and 2). READ-ONLY by construction: only GET reads of public tables
// and calls of IMMUTABLE/STABLE public engines (no volatile function, no write, no paid AI, no admin path).
// Run before and after the M0 apply window and compare: every check must stay "ok".
//   node scripts/m0-public-readonly-smoke.mjs            (key read from the live public worker, where it is published by design)
//   SUPABASE_ANON_KEY=... SUPABASE_URL=... node scripts/m0-public-readonly-smoke.mjs
const SITE = process.env.SOD_SITE || "https://sod1820.co.il";
const API = process.env.SUPABASE_URL || "https://linswmnnkjxvweumprav.supabase.co";

async function anonKey() {
  if (process.env.SUPABASE_ANON_KEY) return process.env.SUPABASE_ANON_KEY;
  const text = await (await fetch(`${SITE}/sw.js`, { cache: "no-store" })).text();
  const key = /"anonKey":"([^"]+)"/.exec(text)?.[1];
  if (!key) throw new Error("public anon key not found in the live worker; pass SUPABASE_ANON_KEY");
  return key;
}

const key = await anonKey();
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const get = async (path, extra = {}) => fetch(`${API}/rest/v1/${path}`, { headers: { ...headers, ...extra } });
const rpc = async (name, body) => fetch(`${API}/rest/v1/rpc/${name}`, { method: "POST", headers, body: JSON.stringify(body) });
const total = (res) => Number(/\/(\d+)$/.exec(res.headers.get("content-range") || "")?.[1] ?? NaN);

const checks = [
  ["public posts readable", async () => { const r = await get("posts?select=id&limit=1"); return r.ok && (await r.json()).length === 1; }],
  ["public research findings readable (all statuses)", async () => {
    const r = await get("research_objects?select=id&privacy_scope=eq.public&limit=1", { Prefer: "count=exact" }); return r.ok && total(r) > 0; }],
  ["public research CANDIDATES readable by anon (item 9 relies on it)", async () => {
    const r = await get("research_objects?select=id,status&privacy_scope=eq.public&status=eq.candidate&limit=1", { Prefer: "count=exact" });
    return r.ok && total(r) > 0; }],
  ["private research findings NOT readable by anon", async () => {
    const r = await get("research_objects?select=id&privacy_scope=eq.private&limit=1"); return r.ok && (await r.json()).length === 0; }],
  ["public gematria wall readable", async () => { const r = await get("gematria_wall?select=phrase,ragil&private=eq.false&limit=1"); return r.ok && (await r.json()).length === 1; }],
  ["gematria engine (gem_calc, all methods) computes", async () => { const r = await rpc("gem_calc", { p: "שלום" }); const row = r.ok ? (await r.json())?.[0] : null;
    return Boolean(row) && row.siduri === 52 && row.atbash === 112 && row.miluy === 536; }],
  ["ragil_calc computes", async () => { const r = await rpc("ragil_calc", { t: "אמת" }); return r.ok && Number(await r.json()) === 441; }],
  ["atbash_calc computes", async () => { const r = await rpc("atbash_calc", { t: "אב" }); return r.ok && Number.isFinite(Number(await r.json())); }],
  ["verses by gematria (stable) answers", async () => { const r = await rpc("fn_verses_by_gematria", { p_value: 26, p_limit: 1 }); return r.ok; }],
  ["ELS public engine (els_search_page_v1, one small page) answers", async () => {
    const r = await rpc("els_search_page_v1", { p_term: "משה", p_scope: "torah", p_skip_min: 2, p_skip_max: 6, p_page_size: 3 }); return r.ok; }],
  ["public site home answers", async () => (await fetch(`${SITE}/`, { redirect: "follow" })).ok],
];

let failed = 0;
for (const [name, fn] of checks) {
  let ok = false, note = "";
  try { ok = await fn(); } catch (error) { note = String(error?.message || error).slice(0, 120); }
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${note ? `  (${note})` : ""}`);
}
console.log(failed ? `\nM0 public smoke: ${failed} FAILED` : "\nM0 public smoke: ALL OK");
process.exit(failed ? 1 : 0);
