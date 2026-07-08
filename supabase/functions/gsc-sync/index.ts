// gsc-sync — Google Search Console → public.gsc_metrics
// Service Account (webmasters.readonly) → OAuth JWT → searchAnalytics/query → upsert.
//
// סודות: נשמרים ב-Supabase Vault (GSC_SA_KEY, GSC_SYNC_KEY) ונקראים דרך RPC public.gsc_secrets()
// (SECURITY DEFINER, service_role בלבד). env נתמך כ-fallback לגיבוי.
//   GSC_SA_KEY   — תוכן קובץ ה-JSON של ה-Service Account (מחרוזת JSON מלאה)
//   GSC_SYNC_KEY — מפתח-אדמין שמגן על הפונקציה (header x-gsc-key)
//   GSC_SITE     — (אופציונלי env) ברירת-מחדל 'sc-domain:sod1820.co.il'
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — מוזרקים אוטומטית
//
// קריאה (POST):
//   { "days": 30, "site": "sc-domain:sod1820.co.il" }   // days = כמה ימים אחורה (ברירת-מחדל 30)
// header: x-gsc-key: <GSC_SYNC_KEY>

import { createClient } from "jsr:@supabase/supabase-js@2";

const SA_RAW    = Deno.env.get("GSC_SA_KEY")   || "";
const SYNC_KEY  = Deno.env.get("GSC_SYNC_KEY")  || "";
const DEF_SITE  = Deno.env.get("GSC_SITE")      || "sc-domain:sod1820.co.il";
const SB_URL    = Deno.env.get("SUPABASE_URL")  || "";
const SB_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const DIMS  = ["query", "page", "country", "device"] as const;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-gsc-key, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

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
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

// Service Account JWT → OAuth2 access token
async function getAccessToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64urlStr(JSON.stringify(header))}.${b64urlStr(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64url(new Uint8Array(sig))}`;

  const r = await fetch(claim.aud, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error(`token exchange failed: ${d.error_description || d.error || r.status}`);
  return d.access_token;
}

// searchAnalytics/query עם pagination — dimensions כוללים תמיד 'date' כדי לקבל פירוק יומי
async function queryAnalytics(token: string, site: string, startDate: string, endDate: string, dim: string) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  const dimensions = dim === "total" ? ["date"] : ["date", dim];
  const rows: any[] = [];
  let startRow = 0;
  const rowLimit = 25000;
  for (let page = 0; page < 20; page++) {
    const r = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ startDate, endDate, dimensions, rowLimit, startRow }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`GSC ${dim} ${r.status}: ${d?.error?.message || JSON.stringify(d)}`);
    const batch = d.rows || [];
    rows.push(...batch);
    if (batch.length < rowLimit) break;
    startRow += rowLimit;
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")   return json({ ok: false, error: "POST only" }, 405);

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  // סודות: Vault (RPC) עם fallback ל-env
  let saRaw = SA_RAW, syncKey = SYNC_KEY;
  if (!saRaw || !syncKey) {
    const { data, error } = await sb.rpc("gsc_secrets");
    if (error) return json({ ok: false, error: `gsc_secrets rpc: ${error.message}` }, 500);
    const row = Array.isArray(data) ? data[0] : data;
    saRaw   = saRaw   || row?.sa || "";
    syncKey = syncKey || row?.sync_key || "";
  }

  if (!syncKey)               return json({ ok: false, error: "GSC_SYNC_KEY not configured" }, 403);
  if (req.headers.get("x-gsc-key") !== syncKey) return json({ ok: false, error: "unauthorized" }, 401);
  if (!saRaw)                 return json({ ok: false, error: "GSC_SA_KEY not configured" }, 400);

  let sa: any;
  try { sa = JSON.parse(saRaw); } catch { return json({ ok: false, error: "GSC_SA_KEY is not valid JSON" }, 400); }
  if (!sa.client_email || !sa.private_key) return json({ ok: false, error: "SA JSON missing client_email/private_key" }, 400);

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const site = String(body.site || DEF_SITE);
  const days = Math.min(Math.max(Number(body.days) || 30, 1), 480);

  // GSC מאחר ב-2-3 ימים; חלון: [today-2-days .. today-2]
  const end = new Date(Date.now() - 2 * 86400000);
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const startDate = iso(start), endDate = iso(end);

  try {
    const token = await getAccessToken(sa);

    // אבחון: לאילו נכסים ל-Service Account יש גישה בפועל
    if (String(body.action || "") === "sites") {
      const r = await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites", {
        headers: { authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`sites ${r.status}: ${d?.error?.message || JSON.stringify(d)}`);
      return json({ ok: true, service_account: sa.client_email, sites: d.siteEntry || [] });
    }

    const report: Record<string, number> = {};
    for (const dim of ["total", ...DIMS]) {
      const rows = await queryAnalytics(token, site, startDate, endDate, dim);
      const upserts = rows.map((row: any) => {
        const date = row.keys[0];                          // 'date' תמיד ראשון
        const key  = dim === "total" ? "" : String(row.keys[1] ?? "");
        return {
          site, date, dimension: dim, key,
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
          fetched_at: new Date().toISOString(),
        };
      });
      // upsert בבאצ'ים כדי לא לחרוג ממגבלות
      for (let i = 0; i < upserts.length; i += 1000) {
        const chunk = upserts.slice(i, i + 1000);
        const { error } = await sb.from("gsc_metrics").upsert(chunk, { onConflict: "site,date,dimension,key" });
        if (error) throw new Error(`upsert ${dim}: ${error.message}`);
      }
      report[dim] = upserts.length;
    }

    return json({ ok: true, site, range: { startDate, endDate }, upserted: report });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200);
  }
});
