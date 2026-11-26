#!/usr/bin/env node
// G3_RELIABILITY_PRECLOSE — deterministic, zero-AI production canary.
// Evidence authority is the GitHub commit status written by post-deploy-canary.yml on the exact deployed SHA.
// Supabase is read-only here: a narrow public RPC exposes only health-watch heartbeat age/health.
// No service_role credential leaves Supabase and no public write RPC is introduced.
import { pathToFileURL } from "node:url";
import { PROBE_CANARY_PATH, PROBE_CANARY_UA } from "../edge-security-probe.js";
import { canaryProof } from "../supabase/functions/_shared/securityProbeLogCore.js";

export const CANARY_BUDGET_PER_DAY = 4;
const DEFAULT_SUPABASE_URL = "https://linswmnnkjxvweumprav.supabase.co";
const DEFAULT_SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM";
const SHA_RE = /^[0-9a-f]{40}$/;

// Security probe check (decision 337). securityMode "enforce" makes security_probe_denied a release-blocking check; "report" records it as
// advisory evidence only. The mode is NOT a permanent switch: the CLI below derives it from the deployed SHA itself (SECURITY_PROBE_LAYER=present
// when edge-security-probe.js exists at that SHA, set by the workflow), so the check blocks automatically from the first deployment that
// contains the layer and can never be left advisory once it ships. Before the layer ships the check is advisory because it could not pass.
// SECURITY_CANARY_KEY (optional, a GitHub Actions secret) signs the canary so the edge function records the row as a genuine canary.
export async function runCanary(base, { fetchImpl = fetch, timeoutMs = 15000, securityMode = "report", canaryKey = "", now = Date.now } = {}) {
  const origin = String(base).replace(/\/+$/, "");
  const checks = [];
  const get = async (path) => {
    const res = await fetchImpl(origin + path, { redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
    return { status: res.status, text: await res.text() };
  };
  const advisory = [];   // checks recorded for evidence that do not decide ok (SECURITY_CANARY_MODE=report)
  const add = (name, ok, detail = "") => checks.push({ name, ok: !!ok, detail: String(detail).slice(0, 200) });
  const addSecurity = (ok, detail) => (securityMode === "enforce" ? add : (name, o, d) => advisory.push({ name, ok: !!o, detail: String(d).slice(0, 200) }))("security_probe_denied", ok, detail);

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
    if (sitemap.status === 200 && /<sitemapindex\b/.test(sitemap.text)) {
      const parts = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].replace(/&amp;/g, "&"));
      const valid = parts.length > 0 && parts.length <= 50000 && new Set(parts).size === parts.length
        && parts.every(part => { try { return new URL(part).origin === new URL(origin).origin; } catch { return false; } });
      add("sitemap_index_parts", valid, `parts=${parts.length}`);
      if (valid) {
        // Every advertised part keeps the same per-response deadline; no root-
        // only success can hide a failing child. At most three reads at once.
        for (let from = 0; from < parts.length; from += 3) {
          const checksForParts = await Promise.all(parts.slice(from, from + 3).map(async part => {
            const url = new URL(part);
            try { const result = await get(url.pathname + url.search);
              return { ok: result.status === 200 && /<urlset\b/.test(result.text), detail: `${url.pathname}${url.search} status=${result.status}` };
            } catch (error) { return { ok: false, detail: `${url.pathname}${url.search} ${error?.message || error}` }; }
          }));
          checksForParts.forEach((result, index) => add(`sitemap_part_${from + index + 1}`, result.ok, result.detail));
        }
      }
    }
  } catch (e) {
    add("request_error", false, e?.message || e);
  }
  // Security pipeline probe: one synthetic scanner hit with the canary user agent. The edge answers 403 + x-sod-probe and writes one
  // security_log row; check_security_spike (SQL) alerts when no such row has arrived for 13 hours. This check proves the 403 half
  // from the outside; the row half is proven by the SQL watch. Never follows redirects, never sends credentials.
  try {
    const headers = { "user-agent": PROBE_CANARY_UA };
    if (canaryKey) headers["x-sod-canary"] = await canaryProof(canaryKey, Math.floor(now() / 60000));
    const res = await fetchImpl(origin + PROBE_CANARY_PATH, { redirect: "manual", headers, signal: AbortSignal.timeout(timeoutMs) });
    await res.text();
    const denied = res.status === 403 && res.headers.get("x-sod-probe") === "denied";
    addSecurity(denied, `status=${res.status} mode=${securityMode}`);
  } catch (e) {
    addSecurity(false, `${e?.message || e} mode=${securityMode}`);
  }
  return { ok: checks.length > 0 && checks.every((c) => c.ok), checks, advisory };
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
    const securityMode = process.env.SECURITY_PROBE_LAYER === "present" || process.env.SECURITY_CANARY_MODE === "enforce" ? "enforce" : "report";
    const result = await runCanary(url, { securityMode, canaryKey: process.env.SECURITY_CANARY_KEY || "" });
    const heartbeat = await readHeartbeat();
    const hbOk = heartbeat?.healthy === true;
    const checks = [...result.checks, {
      name: "health_watch_heartbeat",
      ok: hbOk,
      detail: `age_minutes=${heartbeat?.age_minutes ?? "missing"} max_age_minutes=${heartbeat?.max_age_minutes ?? 45}`,
    }];
    const effective = { ok: checks.every((c) => c.ok), checks, advisory: result.advisory, heartbeat };
    console.log(JSON.stringify({ sha, url, kind, ...effective }, null, 2));
    process.exit(effective.ok ? 0 : 1);
  } catch (e) {
    console.error("canary FAILED CLOSED:", e?.message || e);
    process.exit(1);
  }
}
