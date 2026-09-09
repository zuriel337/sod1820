// ga-sync-server — canonical Traffic Intelligence GA4 server-side sync.
// Reuses the existing secure Google service-account + sync-key pattern already used by gsc-sync.
// Writes only into existing traffic_history; no parallel analytics store.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

function b64url(data: Uint8Array): string {
  let s = btoa(String.fromCharCode(...data));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlStr(s: string): string {
  return b64url(new TextEncoder().encode(s));
}
function pemToPkcs8(pem: string): Uint8Array {
  const body = pem.replace(/-----BEGIN [^-]+-----/, "").replace(/-----END [^-]+-----/, "").replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getAccessToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64urlStr(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64urlStr(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${b64url(new Uint8Array(sig))}`;
  const r = await fetch(claim.aud, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error(`token exchange failed: ${d.error_description || d.error || r.status}`);
  return d.access_token;
}

async function runDaily(token: string, propertyId: string, startDate: string, countryId?: string) {
  const body: Record<string, unknown> = {
    dateRanges: [{ startDate, endDate: "today" }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }, { name: "sessions" }],
    limit: 100000,
  };
  if (countryId) {
    body.dimensionFilter = { filter: { fieldName: "countryId", stringFilter: { matchType: "EXACT", value: countryId } } };
  }
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`GA4 ${countryId || "total"} ${r.status}: ${d?.error?.message || JSON.stringify(d)}`);
  return d.rows || [];
}

function normalizeRows(rows: any[], source: string) {
  return rows.map((r: any) => {
    const raw = String(r.dimensionValues?.[0]?.value || "");
    return {
      period: raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : null,
      granularity: "day",
      views: Number(r.metricValues?.[0]?.value || 0),
      visitors: Number(r.metricValues?.[1]?.value || 0),
      sessions: Number(r.metricValues?.[2]?.value || 0),
      source,
    };
  }).filter((r: any) => r.period && r.views > 0);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  if (!SB_URL || !SB_KEY) return json({ ok: false, error: "server config missing" }, 500);

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data: secretRows, error: secretError } = await sb.rpc("gsc_secrets");
  if (secretError) return json({ ok: false, error: `credential lookup failed: ${secretError.message}` }, 500);
  const secret = Array.isArray(secretRows) ? secretRows[0] : secretRows;
  const syncKey = String(secret?.sync_key || "");
  const saRaw = String(secret?.sa || "");
  if (!syncKey || req.headers.get("x-gsc-key") !== syncKey) return json({ ok: false, error: "unauthorized" }, 401);
  if (!saRaw) return json({ ok: false, error: "google service account missing" }, 500);

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* empty body allowed */ }
  const days = Math.min(Math.max(Number(body.days) || 7, 1), 1200);
  const propertyId = String(body.property_id || Deno.env.get("GA_PROPERTY_ID") || "");
  if (!propertyId) return json({ ok: false, error: "GA_PROPERTY_ID missing" }, 500);

  let sa: any;
  try { sa = JSON.parse(saRaw); } catch { return json({ ok: false, error: "service account JSON invalid" }, 500); }
  if (!sa.client_email || !sa.private_key) return json({ ok: false, error: "service account fields missing" }, 500);

  const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  try {
    const token = await getAccessToken(sa);
    const [totalRaw, ilRaw] = await Promise.all([
      runDaily(token, propertyId, startDate),
      runDaily(token, propertyId, startDate, "IL"),
    ]);
    const totalRows = normalizeRows(totalRaw, "ga");
    const ilRows = normalizeRows(ilRaw, "ga:country:IL");
    for (const rows of [totalRows, ilRows]) {
      if (!rows.length) continue;
      const { error } = await sb.from("traffic_history").upsert(rows, { onConflict: "period,granularity,source" });
      if (error) throw new Error(`traffic_history upsert: ${error.message}`);
    }
    return json({ ok: true, from: startDate, total_rows: totalRows.length, il_rows: ilRows.length });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200);
  }
});
