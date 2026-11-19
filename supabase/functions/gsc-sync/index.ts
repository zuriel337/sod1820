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

// Search type is part of the metric identity (control-plane plan §9, traffic_intelligence_law): values of different search types never
// overwrite one another. Web keeps the historical dimension names (total/query/page/country/device), so every existing row and reader is
// unchanged; any other type is stored under "<type>:<dimension>" in the same gsc_metrics key (site, date, dimension, key) — no schema change.
// Discover and Google News have no query dimension. A type Google does not return (no data, or not available for the property) is reported
// as such in the run report and stores nothing: it is never written as zero traffic.
// Discover is also never grouped by device: Google answers 400 "Requests for Discover cannot be grouped by device" (first scheduled run with
// the full report, 19.11.2026 05:17 UTC, request 47924), so it is not requested (ZURIEL 19.11.2026). Each breakdown is reported on its own
// (searchTypes.<type>.dimensions): a breakdown Google refuses does not hide the totals and breakdowns that did arrive.
const ALL_DIMS = ["total", ...DIMS] as const;
const SEARCH_TYPES = [
  { type: "web",        prefix: "",            dims: ["total", ...DIMS] },
  { type: "discover",   prefix: "discover:",   dims: ["total", "page", "country"] },
  { type: "googleNews", prefix: "googleNews:", dims: ["total", "page", "country", "device"] },
  { type: "news",       prefix: "news:",       dims: ["total", ...DIMS] },
  { type: "image",      prefix: "image:",      dims: ["total", ...DIMS] },
  { type: "video",      prefix: "video:",      dims: ["total", ...DIMS] },
] as const;

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
async function queryAnalytics(token: string, site: string, startDate: string, endDate: string, dim: string, type = "web") {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  const dimensions = dim === "total" ? ["date"] : ["date", dim];
  const rows: any[] = [];
  let startRow = 0;
  const rowLimit = 25000;
  for (let page = 0; page < 20; page++) {
    const r = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ startDate, endDate, dimensions, type, rowLimit, startRow }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`GSC ${type}/${dim} ${r.status}: ${d?.error?.message || JSON.stringify(d)}`);
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

    // 🔎 URL Inspection — מצב-אינדוקס אמיתי למדגם URLים (coverageState + canonical שגוגל בחר).
    // Restored 18.11.2026 exactly as the live version 10 serves it (it was deployed without being committed); no change of contract.
    if (String(body.action || "") === "inspect") {
      const urls: string[] = Array.isArray(body.urls) ? body.urls : [];
      const out: any[] = [];
      for (const u of urls.slice(0, 40)) {
        try {
          const r = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
            method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
            body: JSON.stringify({ inspectionUrl: u, siteUrl: site, languageCode: "he" }),
          });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) { out.push({ url: u, error: d?.error?.message || String(r.status) }); continue; }
          const idx = d?.inspectionResult?.indexStatusResult || {};
          out.push({ url: u, verdict: idx.verdict, coverageState: idx.coverageState, robotsTxtState: idx.robotsTxtState,
            indexingState: idx.indexingState, pageFetchState: idx.pageFetchState,
            googleCanonical: idx.googleCanonical, userCanonical: idx.userCanonical, lastCrawl: idx.lastCrawlTime });
        } catch (e) { out.push({ url: u, error: String(e) }); }
      }
      return json({ ok: true, site, inspected: out });
    }

    // The daily sync. The scheduled caller (cron gsc-daily-sync → net.http_post) stops waiting after its default 5 s, and the live
    // web-only run already takes ~6 s (18.11.2026: 5,967 ms). The run is registered with the Edge runtime so it always completes and
    // writes its rows, whoever stops waiting; a caller that waits still receives the full report.
    const run = (async () => {
    const report: Record<string, number> = {};
    // Per breakdown: measured (rows stored) · no_data (Google answered with no rows; nothing stored, which is not zero) · unavailable (Google
    // refused it) · write_failed (our upsert failed) · not_supported (Google does not offer it for this type, so it is not requested).
    // Per type: measured / no_data when every requested breakdown answered, partial when some answered and some did not, unavailable when none did.
    type DimState = "measured" | "no_data" | "unavailable" | "write_failed" | "not_supported";
    const searchTypes: Record<string, { state: "measured" | "no_data" | "partial" | "unavailable"; rows: number; error?: string;
      dimensions: Record<string, { state: DimState; rows: number; error?: string }> }> = {};
    for (const searchType of SEARCH_TYPES) {
      let typeRows = 0;
      const dimensions: Record<string, { state: DimState; rows: number; error?: string }> = {};
      for (const dim of ALL_DIMS) if (!(searchType.dims as readonly string[]).includes(dim)) dimensions[dim] = { state: "not_supported", rows: 0 };
      for (const dim of searchType.dims) {
        try {
          const rows = await queryAnalytics(token, site, startDate, endDate, dim, searchType.type);
          const dimension = searchType.prefix + dim;
          const upserts = rows.map((row: any) => {
            const date = row.keys[0];                          // 'date' תמיד ראשון
            const key  = dim === "total" ? "" : String(row.keys[1] ?? "");
            return {
              site, date, dimension, key,
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
            if (error) throw new Error(`upsert ${dimension}: ${error.message}`);
          }
          report[dimension] = upserts.length;
          typeRows += upserts.length;
          dimensions[dim] = { state: upserts.length > 0 ? "measured" : "no_data", rows: upserts.length };
        } catch (e) {
          // Web is the historical contract: any failure fails the run. For another type the failed breakdown is recorded and the rest continue.
          if (searchType.type === "web") throw e;
          const message = String(e).slice(0, 300);
          dimensions[dim] = { state: message.startsWith("Error: upsert ") ? "write_failed" : "unavailable", rows: 0, error: message };
        }
      }
      const requested = searchType.dims.map((dim) => dimensions[dim]);
      const failed = requested.filter((d) => d.state === "unavailable" || d.state === "write_failed");
      const state = failed.length === requested.length ? "unavailable" : failed.length > 0 ? "partial" : typeRows > 0 ? "measured" : "no_data";
      searchTypes[searchType.type] = { state, rows: typeRows, ...(failed.length ? { error: failed[0].error } : {}), dimensions };
    }

    return { ok: true, site, range: { startDate, endDate }, upserted: report, searchTypes };
    })();
    // @ts-ignore EdgeRuntime is a global of the Supabase Edge runtime (absent elsewhere).
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(run.catch(() => undefined));
    return json(await run);
  } catch (e) {
    // A failed run answers 502 so the scheduled call's recorded response (net._http_response) shows the failure, not a success.
    return json({ ok: false, error: String(e) }, 502);
  }
});
