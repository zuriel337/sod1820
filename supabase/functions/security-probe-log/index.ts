// security-probe-log (decision 337, 26.11.2026). Deploy with verify_jwt=false, exactly like sg-rate-limit: the caller authenticates with
// the Vercel OIDC token, not a Supabase JWT. The only thing it does is call public.log_security with the service role, after
// supabase/functions/_shared/securityProbeLogCore.js has authenticated and validated the report. Secret needed: SECURITY_CANARY_KEY
// (optional: without it no row can ever carry the canary marker, and the silence alert in check_security_spike says so).
import { createSecurityProbeLogHandler } from "../_shared/securityProbeLogCore.js";
import { verifyVercelProductionToken } from "../_shared/vercelProductionOidc.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const handler = createSecurityProbeLogHandler({
  verifyOidc: verifyVercelProductionToken,
  canaryKey: Deno.env.get("SECURITY_CANARY_KEY") || "",
  record: async (entry: Record<string, string>) => {
    if (!supabaseUrl || !serviceKey) throw new Error("server_config");
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/log_security`, {
      method: "POST",
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error(`log_security_${res.status}`);
  },
});

Deno.serve(handler);
