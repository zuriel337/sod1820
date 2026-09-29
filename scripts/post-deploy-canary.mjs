#!/usr/bin/env node
// G3_RELIABILITY_PRECLOSE — deterministic, zero-AI production canary + small synthetic critical journeys.
// Usage: node scripts/post-deploy-canary.mjs --url <base> --sha <40-hex git sha> --kind deploy|scheduled|manual
// Env (report authority): SUPABASE_SERVICE_KEY (+ optional SUPABASE_URL), GITHUB_RUN_ID, GITHUB_SERVER_URL, GITHUB_REPOSITORY.
// FAIL-CLOSED: missing reporting authority/config, a non-2xx from the report RPC, or a missing/invalid SHA or run
// identity is a canary FAILURE (exit 1) — never a silent skip. Evidence is written only through the owner-native
// service_role RPCs fn_release_canary_slot / fn_release_canary_report (analytics_cache) — not through anon event rows.
// Failure only blocks the NEXT release via fn_release_canary_gate; nothing is ever rolled back.
// Synthetic PASS is a smoke signal and never substitutes Golden/CI/security gates.
import { pathToFileURL } from "node:url";

export const CANARY_BUDGET_PER_DAY = 4; // enforced server-side in fn_release_canary_slot
const DEFAULT_SUPABASE_URL = "https://linswmnnkjxvweumprav.supabase.co";
const SHA_RE = /^[0-9a-f]{40}$/;

// The critical set is deliberately tiny: shell HTML + entry bundle + robots + sitemap. No writes, no AI, no auth.
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
    const sitemap = await get("/sitemap.xml");
    add("sitemap_200", sitemap.status === 200 && /<urlset|<sitemapindex/.test(sitemap.text), `status=${sitemap.status}`);
  } catch (e) {
    add("request_error", false, e?.message || e);
  }
  return { ok: checks.length > 0 && checks.every((c) => c.ok), checks };
}

function rpcConfig(env) {
  const key = env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error("reporting authority missing: SUPABASE_SERVICE_KEY is not set");
  const base = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, "");
  if (!env.GITHUB_RUN_ID || !env.GITHUB_REPOSITORY) throw new Error("GitHub run identity missing (GITHUB_RUN_ID/GITHUB_REPOSITORY)");
  return { key, base };
}

async function rpc(name, body, { fetchImpl, env }) {
  const { key, base } = rpcConfig(env);
  const res = await fetchImpl(`${base}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${name} returned non-2xx: ${res.status}`);
  return res.json();
}

// Returns {ok, reason}. ok=false means the canary as a whole must fail (exit 1).
export async function reportCanary({ ok, sha, kind, checks }, { fetchImpl = fetch, env = process.env } = {}) {
  if (!SHA_RE.test(sha || "")) throw new Error("exact git SHA (40 hex) required");
  const server = env.GITHUB_SERVER_URL || "https://github.com";
  const runUrl = `${server}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;
  const out = await rpc("fn_release_canary_report", {
    p_sha: sha, p_run_id: String(env.GITHUB_RUN_ID), p_run_url: runUrl, p_ok: !!ok,
    p_failed: checks.filter((c) => !c.ok).map((c) => c.name), p_kind: kind,
  }, { fetchImpl, env });
  return out;
}

export async function takeSlot(kind, { fetchImpl = fetch, env = process.env } = {}) {
  return rpc("fn_release_canary_slot", { p_kind: kind }, { fetchImpl, env });
}

const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : null; };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = arg("url"), sha = arg("sha"), kind = arg("kind") || "manual";
  if (!url || !SHA_RE.test(sha || "") || !["deploy", "scheduled", "manual"].includes(kind)) {
    console.error("usage: --url <base> --sha <40-hex git sha> --kind deploy|scheduled|manual");
    process.exit(2);
  }
  try {
    const slot = await takeSlot(kind);
    if (!slot.allowed) { console.log(JSON.stringify({ skipped: "daily synthetic budget exhausted", ...slot })); process.exit(0); }
    const result = await runCanary(url);
    console.log(JSON.stringify({ sha, url, kind, ...result }, null, 2));
    const rep = await reportCanary({ ...result, sha, kind });
    console.log(JSON.stringify(rep));
    // health-watch heartbeat is written every 15 minutes; a stale/missing heartbeat means the watcher itself is down.
    const age = rep.health_watch_heartbeat_age_minutes;
    if (age === null || age === undefined || age > 45) {
      console.error(`health-watch heartbeat stale/missing (age=${age}); monitoring is not proven alive`);
      process.exit(1);
    }
    process.exit(result.ok ? 0 : 1);
  } catch (e) {
    console.error("canary FAILED CLOSED:", e?.message || e);
    process.exit(1);
  }
}
