#!/usr/bin/env node
// G3_RELIABILITY_PRECLOSE — deploy_on_request preflight.
// Exact-SHA canary truth is the latest GitHub commit status with context sod1820/post-deploy-canary.
// Supabase is read-only here and is consulted only for a bounded Human-Gate override status.
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

export const CANARY_STATUS_CONTEXT = "sod1820/post-deploy-canary";
const DEFAULT_REPO = "zuriel337/sod1820";
const DEFAULT_SUPABASE_URL = "https://linswmnnkjxvweumprav.supabase.co";
const SHA_RE = /^[0-9a-f]{40}$/;

function publicAnon(env) {
  if (env.SUPABASE_ANON_KEY) return env.SUPABASE_ANON_KEY;
  try {
    const src = readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8");
    return (src.match(/export const SUPABASE_ANON = '([^']+)'/) || [])[1] || "";
  } catch { return ""; }
}

async function readOverride({ fetchImpl, env }) {
  const base = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, "");
  const key = publicAnon(env);
  if (!key) return { transport_ok: false, status: 0, allowed: false };
  const res = await fetchImpl(`${base}/rest/v1/rpc/fn_release_canary_override_status`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) return { transport_ok: false, status: res.status, allowed: false };
  const out = await res.json();
  return { transport_ok: true, status: res.status, allowed: out?.allowed === true, detail: out };
}

export async function checkGate(productionSha, { fetchImpl = fetch, env = process.env, allowBootstrap = false } = {}) {
  if (!SHA_RE.test(String(productionSha || ""))) return { allowed: false, reason: "production_sha_missing_or_invalid" };
  const token = env.GH_TOKEN || env.GITHUB_TOKEN;
  if (!token) return { allowed: false, reason: "github_token_missing" };

  const override = await readOverride({ fetchImpl, env });
  if (!override.transport_ok) {
    if (!(allowBootstrap && override.status === 404)) {
      return { allowed: false, reason: `override_rpc_non_2xx_${override.status}` };
    }
  } else if (override.allowed) {
    return { allowed: true, reason: "human_gate_override", override: override.detail };
  }

  const repoName = env.GITHUB_REPOSITORY || DEFAULT_REPO;
  const res = await fetchImpl(`https://api.github.com/repos/${repoName}/commits/${productionSha}/statuses?per_page=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "sod1820-release-gate",
    },
  });
  if (!res.ok) return { allowed: false, reason: `github_status_non_2xx_${res.status}` };
  const statuses = await res.json();
  const latest = Array.isArray(statuses) ? statuses.find((s) => s?.context === CANARY_STATUS_CONTEXT) : null;
  if (!latest) {
    if (allowBootstrap) return { allowed: true, reason: "bootstrap_no_prior_canary", bootstrap: true };
    return { allowed: false, reason: "no_canary_evidence" };
  }
  if (latest.state !== "success") return { allowed: false, reason: `latest_canary_${latest.state || "unknown"}`, latest };
  return { allowed: true, reason: "latest_canary_success", latest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf("--production-sha");
  const sha = i > 0 ? process.argv[i + 1] : null;
  const allowBootstrap = process.argv.includes("--allow-bootstrap");
  const r = await checkGate(sha, { allowBootstrap });
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.allowed ? 0 : 1);
}
