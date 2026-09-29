#!/usr/bin/env node
// G3_RELIABILITY_PRECLOSE — deploy_on_request preflight as a CI check. Calls the existing owner function
// fn_release_canary_gate(<current production sha>) and exits 1 unless allowed. Missing config / non-2xx = blocked.
// Usage: node scripts/release-canary-gate.mjs --production-sha <sha>
import { pathToFileURL } from "node:url";

export async function checkGate(productionSha, { fetchImpl = fetch, env = process.env } = {}) {
  const key = env.SUPABASE_SERVICE_KEY;
  if (!key) return { allowed: false, reason: "reporting_authority_missing" };
  const base = String(env.SUPABASE_URL || "https://linswmnnkjxvweumprav.supabase.co").replace(/\/+$/, "");
  const res = await fetchImpl(`${base}/rest/v1/rpc/fn_release_canary_gate`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_production_sha: productionSha || null }),
  });
  if (!res.ok) return { allowed: false, reason: `gate_rpc_non_2xx_${res.status}` };
  const out = await res.json();
  return { allowed: out?.allowed === true, reason: out?.reason ?? "unknown", detail: out };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf("--production-sha");
  const sha = i > 0 ? process.argv[i + 1] : null;
  const r = await checkGate(sha);
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.allowed ? 0 : 1);
}
