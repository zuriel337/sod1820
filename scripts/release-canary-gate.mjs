#!/usr/bin/env node
// G3_RELIABILITY_PRECLOSE — deploy_on_request preflight as a CI check. Calls the existing owner function
// fn_release_canary_gate(<current production sha>) and exits 1 unless allowed. Missing config / non-2xx = blocked.
// Usage: node scripts/release-canary-gate.mjs --production-sha <sha>
import { pathToFileURL } from "node:url";

export async function checkGate(productionSha, { fetchImpl = fetch, env = process.env, allowBootstrap = false } = {}) {
  if (!/^[0-9a-f]{40}$/.test(String(productionSha || ""))) {
    return { allowed: false, reason: "production_sha_missing_or_invalid" };
  }
  const key = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return { allowed: false, reason: "reporting_authority_missing" };
  const base = String(env.SUPABASE_URL || "https://linswmnnkjxvweumprav.supabase.co").replace(/\/+$/, "");
  const res = await fetchImpl(`${base}/rest/v1/rpc/fn_release_canary_gate`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_production_sha: productionSha || null }),
  });
  if (!res.ok) {
    if (allowBootstrap && res.status === 404) {
      return { allowed: true, reason: "bootstrap_gate_not_live_on_base", bootstrap: true };
    }
    return { allowed: false, reason: `gate_rpc_non_2xx_${res.status}` };
  }
  const out = await res.json();
  if (out?.allowed === true) return { allowed: true, reason: out?.reason ?? "latest_canary_success", detail: out };
  if (allowBootstrap && out?.reason === "no_canary_evidence") {
    return { allowed: true, reason: "bootstrap_no_prior_canary", bootstrap: true, detail: out };
  }
  return { allowed: false, reason: out?.reason ?? "unknown", detail: out };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf("--production-sha");
  const sha = i > 0 ? process.argv[i + 1] : null;
  const allowBootstrap = process.argv.includes("--allow-bootstrap");
  const r = await checkGate(sha, { allowBootstrap });
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.allowed ? 0 : 1);
}
