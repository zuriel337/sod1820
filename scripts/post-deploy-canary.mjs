#!/usr/bin/env node
// G3_RELIABILITY_PRECLOSE — deterministic, zero-AI production canary.
// Evidence authority is the GitHub commit status written by post-deploy-canary.yml on the exact deployed SHA.
// Supabase is read-only here: a narrow public RPC exposes only health-watch heartbeat age/health.
// No service_role credential leaves Supabase and no public write RPC is introduced.
import { pathToFileURL } from "node:url";

export const CANARY_BUDGET_PER_DAY = 4;
const DEFAULT_SUPABASE_URL = "https://linswmnnkjxvweumprav.supabase.co";
const DEFAULT_SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM";
const SHA_RE = /^[0-9a-f]{40}$/;

export async function runCanary(base, { fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  const origin = String(base).replace(/\/+$/, "");
  const checks = [];
  const get = async (path) => {
    const res = await fetchImpl(origin + path, { redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
    return { status: res.status, text: await res.text() };
  };
  const add = (name, ok, detail = "") => checks.push({ name, ok: !!ok, detail: String(detail).slice(0, 200) });

  try {
    // Public / may legitimately project a server document or a browser-policy representation.
    // Availability is the invariant here; deployed client-artifact integrity is checked directly below.
    const home = await get("/");
    add("home_200", home.status === 200, `status=${home.status}`);
    add("home_html", home.status === 200 && /<html\b/i.test(home.text) && home.text.length > 200, `bytes=${home.text.length}`);

    // Direct artifact path bypasses route/middleware representation while proving the deployed SPA bundle exists.
    const artifact = await get("/index.html");
    add("index_200", artifact.status === 200, `status=${artifact.status}`);
    add("index_has_root", /id=["']root["']/.test(artifact.text));
    const entry = artifact.text.match(/\/assets\/[\w./-]+\.js/);
    add("index_has_entry_bundle", !!entry);
    if (entry) {
      const js = await get(entry[0]);
      add("entry_bundle_200", js.status === 200 && js.text.length > 1000, `status=${js.status} bytes=${js.text.length}`);
    }

    const robots = await get("/robots.txt");
    add("robots_200", robots.status === 200, `status=${robots.status}`);

    // api/sitemap-public is the current public sitemap projection owner behind /sitemap.xml.
    // Probe it directly so routing/middleware representation cannot create a false negative.
    const sitemap = await get("/api/sitemap-public");
    add("sitemap_200", sitemap.status === 200 && /<urlset|<sitemapindex/.test(sitemap.text), `status=${sitemap.status}`);
  } catch (e) {
    add("request_error", false, e?.message || e);
  }
  return { ok: checks.length > 0 && checks.every((c) => c.ok), checks };
}

export async function readHeartbeat({ fetchImpl = fetch, env = process.env } = {}) {
  const base = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, "");
  const key = env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON;
  const res = await fetchImpl(`${base}/rest/v1/rpc/fn_reliability_heartbeat_status`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`fn_reliability_heartbeat_status returned non-2xx: ${res.status}`);
  const out = await res.json();
  return out && typeof out === "object" ? out : { healthy: false, age_minutes: null };
}

const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : null; };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = arg("url"), sha = arg("sha"), kind = arg("kind") || "manual";
  if (!url || !SHA_RE.test(sha || "") || !["deploy", "scheduled", "manual"].includes(kind)) {
    console.error("usage: --url <base> --sha <40-hex git sha> --kind deploy|scheduled|manual");
    process.exit(2);
  }
  try {
    const result = await runCanary(url);
    const heartbeat = await readHeartbeat();
    const hbOk = heartbeat?.healthy === true;
    const checks = [...result.checks, {
      name: "health_watch_heartbeat",
      ok: hbOk,
      detail: `age_minutes=${heartbeat?.age_minutes ?? "missing"} max_age_minutes=${heartbeat?.max_age_minutes ?? 45}`,
    }];
    const effective = { ok: checks.every((c) => c.ok), checks, heartbeat };
    console.log(JSON.stringify({ sha, url, kind, ...effective }, null, 2));
    process.exit(effective.ok ? 0 : 1);
  } catch (e) {
    console.error("canary FAILED CLOSED:", e?.message || e);
    process.exit(1);
  }
}
