import { createRemoteJWKSet, decodeJwt, jwtVerify } from "npm:jose@6.2.12";

const TEAM_SLUG = "sod1820-s-projects";
const TEAM_ID = "team_vtfWHZfKvdbob8gvynQb5N89";
const PROJECT_ID = "prj_43q7k7QFAcWnin1tcBjce5xOi7Cq";
const PROJECT_NAME = "sod1820";
const AUDIENCE = `https://vercel.com/${TEAM_SLUG}`;
const EXPECTED_SUBJECT = `owner:${TEAM_SLUG}:project:${PROJECT_NAME}:environment:production`;
const TEAM_ISSUER = `https://oidc.vercel.com/${TEAM_SLUG}`;
const GLOBAL_ISSUER = "https://oidc.vercel.com";
const ALLOWED_ISSUERS = new Set([TEAM_ISSUER, GLOBAL_ISSUER]);
const JWKS = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function jwksFor(issuer: string) {
  let set = JWKS.get(issuer);
  if (!set) {
    set = createRemoteJWKSet(new URL("/.well-known/jwks", issuer));
    JWKS.set(issuer, set);
  }
  return set;
}

async function verifyVercelProductionToken(token: string) {
  const decoded = decodeJwt(token);
  const issuer = typeof decoded.iss === "string" ? decoded.iss : "";
  if (!ALLOWED_ISSUERS.has(issuer)) throw new Error("issuer_not_allowed");

  const { payload } = await jwtVerify(token, jwksFor(issuer), {
    issuer,
    audience: AUDIENCE,
  });

  if (payload.owner_id !== TEAM_ID) throw new Error("owner_mismatch");
  if (payload.project_id !== PROJECT_ID) throw new Error("project_mismatch");
  if (payload.project !== PROJECT_NAME) throw new Error("project_name_mismatch");
  if (payload.environment !== "production") throw new Error("environment_mismatch");
  if (payload.sub !== EXPECTED_SUBJECT) throw new Error("subject_mismatch");
  return payload;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const token = authorization.slice(7).trim();
  if (!token) return json({ error: "unauthorized" }, 401);

  try {
    await verifyVercelProductionToken(token);
  } catch {
    return json({ error: "unauthorized" }, 401);
  }

  let body: { key_hash?: unknown; window_seconds?: unknown; limit?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const keyHash = typeof body.key_hash === "string" ? body.key_hash : "";
  const windowSeconds = Number(body.window_seconds);
  const limit = Number(body.limit);
  if (!/^[0-9a-f]{64}$/.test(keyHash)) return json({ error: "invalid_key" }, 400);
  if (!Number.isInteger(windowSeconds) || windowSeconds < 60 || windowSeconds > 3600) return json({ error: "invalid_window" }, 400);
  if (!Number.isInteger(limit) || limit < 1 || limit > 120) return json({ error: "invalid_limit" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) return json({ error: "server_config" }, 500);

  try {
    const upstream = await fetch(`${supabaseUrl}/rest/v1/rpc/edge_rate_limit_check`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_key_hash: keyHash,
        p_window_seconds: windowSeconds,
        p_limit: limit,
      }),
    });

    if (!upstream.ok) return json({ error: "rate_limit_backend" }, 503);
    const result = await upstream.json();
    return json(result, 200);
  } catch {
    return json({ error: "rate_limit_backend" }, 503);
  }
});
