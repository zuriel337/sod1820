#!/usr/bin/env node
// G3_RELIABILITY_RUNTIME_CORE_V1 — deterministic, zero-AI production canary.
// Usage: node scripts/post-deploy-canary.mjs --url <base> --sha <git sha>
// Checks (no writes to the site): "/" is 200 HTML with the app root and an entry bundle; the entry bundle
// is reachable; /robots.txt is 200. Reports pass/fail as an event (surface=canary) through the existing
// public.ingest_event RPC when SUPABASE_URL + SUPABASE_ANON_KEY are set. Exit 1 on failure — that only
// fails this workflow run (blocks the NEXT release via the gate); it never rolls anything back.
import { pathToFileURL } from "node:url";

export async function runCanary(base, { fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  const origin = String(base).replace(/\/+$/, "");
  const checks = [];
  const get = async (path) => {
    const res = await fetchImpl(origin + path, { redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
    return { status: res.status, text: await res.text() };
  };
  const add = (name, ok, detail = "") => checks.push({ name, ok: !!ok, detail: String(detail).slice(0, 200) });

  try {
    const home = await get("/");
    add("home_200", home.status === 200, `status=${home.status}`);
    add("home_has_root", /id=["']root["']/.test(home.text));
    const entry = home.text.match(/\/assets\/[\w./-]+\.js/);
    add("home_has_entry_bundle", !!entry);
    if (entry) {
      const js = await get(entry[0]);
      add("entry_bundle_200", js.status === 200 && js.text.length > 1000, `status=${js.status} bytes=${js.text.length}`);
    }
    const robots = await get("/robots.txt");
    add("robots_200", robots.status === 200, `status=${robots.status}`);
  } catch (e) {
    add("request_error", false, e?.message || e);
  }
  return { ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

async function report({ ok, sha, url, checks }, { fetchImpl = fetch, env = process.env } = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return "skipped (no SUPABASE_URL/SUPABASE_ANON_KEY)";
  const res = await fetchImpl(`${env.SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/rpc/ingest_event`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_sod_id: "canary-github-actions", p_surface: "canary", p_event_type: ok ? "pass" : "fail",
      p_path: "/", p_props: { sha, url, failed: checks.filter(c => !c.ok).map(c => c.name) }, p_is_bot: false,
    }),
  });
  return `reported status=${res.status}`;
}

const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : null; };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = arg("url"), sha = arg("sha");
  if (!url || !sha) { console.error("usage: --url <base> --sha <git sha>"); process.exit(2); }
  const result = await runCanary(url);
  console.log(JSON.stringify({ sha, url, ...result }, null, 2));
  try { console.log(await report({ ...result, sha, url })); } catch (e) { console.log("report failed:", e?.message); }
  process.exit(result.ok ? 0 : 1);
}
