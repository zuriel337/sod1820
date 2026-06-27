// facebook-admin — שליטה רב-נכסית על Meta דרך Graph API: דפי פייסבוק · אינסטגרם · חשבונות פרסום.
// טוקן-מערכת אחד (System User) שולט בכל הנכסים שמשויכים אליו ב-Business Manager.
//
// סודות (Supabase → Edge Functions → Secrets):
//   META_SYSTEM_TOKEN   = System User Token ארוך-טווח (מומלץ). חלופה לאחור: FACEBOOK_PAGE_TOKEN.
//   FB_ADMIN_KEY        = מפתח-גישה שאתה ממציא; כל קריאה שולחת header  x-fb-admin-key  (מגן, נפרד מהטוקן).
//   FACEBOOK_PAGE_ID    = (אופציונלי) דף ברירת-מחדל כשלא נשלח page_id.
//   META_GRAPH_VERSION  = (אופציונלי) v21.0.
//
// הרשאות הטוקן (scopes): pages_show_list, pages_read_engagement, pages_read_user_content,
//   pages_manage_posts, pages_manage_engagement, pages_manage_metadata, instagram_basic,
//   instagram_content_publish, instagram_manage_comments, ads_read, ads_management,
//   business_management, read_insights.
//
// ── פעולות (POST JSON, כולן עם header x-fb-admin-key) ──
//  אבחון:     { action:"whoami" }                          → מגלה דפים + אינסטגרם + חשבונות פרסום
//  דף:        { action:"list",   page_id?, limit?, after?, since?, until? }
//             { action:"photos", page_id?, limit?, after? }
//             { action:"search", page_id?, query?, since?, until?, max? }
//             { action:"delete", object_id, page_id? }
//             { action:"publish_post",  page_id?, message, link? }
//             { action:"publish_photo", page_id?, image_url, caption? }
//             { action:"set_cover", page_id?, image_url? | image_b64? (+mime?) | photo_id?, offset_y?, no_feed_story? }
//  אינסטגרם:  { action:"ig_media",   page_id?|ig_id?, limit?, after? }
//             { action:"ig_publish", page_id?|ig_id?, image_url, caption? }
//             { action:"ig_delete_comment", comment_id }
//  פרסום:     { action:"ads_accounts" }
//             { action:"ads_campaigns", ad_account_id, limit? }
//             { action:"ads_adsets",    ad_account_id?|campaign_id, limit? }
//             { action:"ads_insights",  ad_account_id?|campaign_id, date_preset? }
//             { action:"ads_set_status", object_id, status:"ACTIVE"|"PAUSED" }
//             { action:"ads_set_budget", adset_id, daily_budget?, lifetime_budget? }  // אגורות
//             { action:"ads_create_campaign", ad_account_id, name, objective, status? }
//
// הערה: Graph API לא תומך במחיקת *פוסט* אינסטגרם (רק תגובות) — מחיקת פוסט IG = ידנית.

const SYS_TOKEN  = Deno.env.get("META_SYSTEM_TOKEN") || Deno.env.get("FACEBOOK_PAGE_TOKEN") || "";
const ADMIN_KEY  = Deno.env.get("FB_ADMIN_KEY")      || "";
const DEF_PAGE   = Deno.env.get("FACEBOOK_PAGE_ID")  || "";
const GRAPH      = Deno.env.get("META_GRAPH_VERSION")|| "v21.0";
const BASE       = `https://graph.facebook.com/${GRAPH}`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-fb-admin-key, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

// קריאה גנרית ל-Graph; token ברירת-מחדל = טוקן המערכת.
async function graph(path, opts = {}) {
  const u = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(opts.params || {})) if (v != null && v !== "") u.searchParams.set(k, v);
  u.searchParams.set("access_token", opts.token || SYS_TOKEN);
  const r = await fetch(u.toString(), { method: opts.method || "GET" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.error?.message || `Graph ${r.status}`);
  return d;
}

// מטמון דפים לכל בקשה: id → {name, access_token, instagram_business_account}
let _pages = null;
async function pages() {
  if (_pages) return _pages;
  const d = await graph(`me/accounts`, { params: { fields: "id,name,access_token,instagram_business_account{id,username}", limit: "100" } });
  _pages = d.data || [];
  return _pages;
}
async function pageToken(pageId) {
  const p = (await pages()).find((x) => x.id === pageId);
  if (p?.access_token) return p.access_token;
  const d = await graph(`${pageId}`, { params: { fields: "access_token" } });
  if (!d.access_token) throw new Error(`no page token for ${pageId}`);
  return d.access_token;
}
async function resolvePage(body) {
  const id = body.page_id || DEF_PAGE;
  if (id) return id;
  const ps = await pages();
  if (ps.length === 1) return ps[0].id;
  throw new Error("page_id required (multiple pages — run whoami to list)");
}
async function resolveIg(body) {
  if (body.ig_id) {
    const pid = await resolvePage(body).catch(() => "");
    const token = pid ? await pageToken(pid) : SYS_TOKEN;
    return { igId: body.ig_id, token };
  }
  const pid = await resolvePage(body);
  const p = (await pages()).find((x) => x.id === pid);
  const igId = p?.instagram_business_account?.id;
  if (!igId) throw new Error(`page ${pid} has no linked Instagram professional account`);
  return { igId, token: await pageToken(pid) };
}

// העלאת תמונה כ"לא-מפורסמת" (published=false) והחזרת photo_id.
// תומך גם ב-URL ציבורי (url) וגם בבייטים ישירים (multipart source) — כך אין תלות ב-storage.
async function uploadUnpublishedPhoto(pid, token, body) {
  if (body.image_url) {
    const d = await graph(`${pid}/photos`, { method: "POST", token, params: { url: String(body.image_url), published: "false" } });
    return d.id;
  }
  if (body.image_b64) {
    const b64 = String(body.image_b64).replace(/^data:[^;]+;base64,/, "");
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const fd = new FormData();
    fd.append("published", "false");
    fd.append("access_token", token);
    fd.append("source", new Blob([bin], { type: body.mime || "image/png" }), "cover.png");
    const r = await fetch(`${BASE}/${pid}/photos`, { method: "POST", body: fd });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d?.error?.message || `Graph ${r.status}`);
    return d.id;
  }
  throw new Error("image_url or image_b64 required");
}

const POST_FIELDS = "id,message,story,created_time,permalink_url,full_picture,attachments{media_type,type,title,url,media,subattachments}";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")   return json({ error: "POST only" }, 405);
  if (!ADMIN_KEY) return json({ ok: false, error: "FB_ADMIN_KEY not configured" }, 403);
  if (req.headers.get("x-fb-admin-key") !== ADMIN_KEY) return json({ ok: false, error: "unauthorized" }, 401);
  if (!SYS_TOKEN) return json({ ok: false, error: "missing META_SYSTEM_TOKEN" }, 400);

  _pages = null;
  let body = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const action = String(body.action || "");

  try {
    switch (action) {
      case "whoami": {
        const me = await graph(`me`, { params: { fields: "id,name" } }).catch((e) => ({ error: String(e) }));
        const ps = await pages();
        let ads = []; let adsErr = "";
        try {
          const a = await graph(`me/adaccounts`, { params: { fields: "id,account_id,name,account_status,currency,amount_spent", limit: "100" } });
          ads = a.data || [];
        } catch (e) { adsErr = String(e); }
        return json({
          ok: true,
          token_identity: me,
          pages: ps.map((p) => ({ id: p.id, name: p.name, instagram: p.instagram_business_account || null })),
          ad_accounts: ads,
          ads_error: adsErr || undefined,
        });
      }

      case "list": {
        const pid = await resolvePage(body);
        const d = await graph(`${pid}/published_posts`, {
          token: await pageToken(pid),
          params: { fields: POST_FIELDS, limit: String(body.limit || 25), after: body.after || "", since: body.since || "", until: body.until || "" },
        });
        return json({ ok: true, page_id: pid, count: (d.data || []).length, posts: d.data || [], paging: d.paging || null });
      }

      case "photos": {
        const pid = await resolvePage(body);
        const d = await graph(`${pid}/photos`, {
          token: await pageToken(pid),
          params: { type: "uploaded", fields: "id,name,created_time,link,images,album{name}", limit: String(body.limit || 25), after: body.after || "" },
        });
        return json({ ok: true, page_id: pid, count: (d.data || []).length, photos: d.data || [], paging: d.paging || null });
      }

      case "search": {
        const pid = await resolvePage(body);
        const tok = await pageToken(pid);
        const q = String(body.query || "").toLowerCase().trim();
        const max = Math.min(Number(body.max) || 300, 1000);
        const matches = []; let after = ""; let scanned = 0; let p = 0;
        while (scanned < max && p < 40) {
          const d = await graph(`${pid}/published_posts`, { token: tok, params: { fields: POST_FIELDS, limit: "50", after, since: body.since || "", until: body.until || "" } });
          const arr = d.data || [];
          for (const post of arr) { scanned++; const t = `${post.message || ""} ${post.story || ""}`.toLowerCase(); if (!q || t.includes(q)) matches.push(post); }
          after = d.paging?.cursors?.after || ""; if (!after || !arr.length) break; p++;
        }
        return json({ ok: true, page_id: pid, scanned, matched: matches.length, posts: matches });
      }

      case "delete": {
        const id = String(body.object_id || "").trim();
        if (!id) return json({ ok: false, error: "object_id required" }, 400);
        const pid = await resolvePage(body).catch(() => "");
        const tok = pid ? await pageToken(pid) : SYS_TOKEN;
        const d = await graph(`${id}`, { method: "DELETE", token: tok });
        return json({ ok: true, deleted: id, result: d });
      }

      case "publish_post": {
        const pid = await resolvePage(body);
        const message = String(body.message || "").trim();
        if (!message) return json({ ok: false, error: "message required" }, 400);
        const params = { message }; if (body.link) params.link = String(body.link);
        const d = await graph(`${pid}/feed`, { method: "POST", token: await pageToken(pid), params });
        return json({ ok: true, page_id: pid, fb_post_id: d.id });
      }
      case "publish_photo": {
        const pid = await resolvePage(body);
        const url = String(body.image_url || "").trim();
        if (!url) return json({ ok: false, error: "image_url required" }, 400);
        const d = await graph(`${pid}/photos`, { method: "POST", token: await pageToken(pid), params: { url, caption: String(body.caption || "") } });
        return json({ ok: true, page_id: pid, fb_post_id: d.id || d.post_id });
      }
      case "set_cover": {
        // החלפת תמונת הכריכה של דף פייסבוק.
        // שלב 1: העלאת התמונה כ-unpublished → photo_id. שלב 2: POST /{page} עם cover=photo_id.
        // הערה: מטא מגבילה לעיתים עריכת כריכה דרך API — אם נכשל, השגיאה המלאה מוחזרת.
        const pid = await resolvePage(body);
        const tok = await pageToken(pid);
        let photoId = String(body.photo_id || "").trim();
        if (!photoId) photoId = await uploadUnpublishedPhoto(pid, tok, body);
        if (!photoId) return json({ ok: false, error: "could not obtain photo_id" }, 400);
        const params = { cover: photoId, no_feed_story: body.no_feed_story === false ? "false" : "true" };
        if (body.offset_y != null) params.offset_y = String(body.offset_y);
        if (body.offset_x != null) params.offset_x = String(body.offset_x);
        const d = await graph(`${pid}`, { method: "POST", token: tok, params });
        return json({ ok: true, page_id: pid, photo_id: photoId, result: d });
      }

      case "ig_media": {
        const { igId, token } = await resolveIg(body);
        const d = await graph(`${igId}/media`, { token, params: { fields: "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count", limit: String(body.limit || 25), after: body.after || "" } });
        return json({ ok: true, ig_id: igId, count: (d.data || []).length, media: d.data || [], paging: d.paging || null });
      }
      case "ig_publish": {
        const { igId, token } = await resolveIg(body);
        const url = String(body.image_url || "").trim();
        if (!url) return json({ ok: false, error: "image_url required" }, 400);
        const c = await graph(`${igId}/media`, { method: "POST", token, params: { image_url: url, caption: String(body.caption || "") } });
        if (!c.id) throw new Error("container creation failed");
        const pub = await graph(`${igId}/media_publish`, { method: "POST", token, params: { creation_id: c.id } });
        return json({ ok: true, ig_id: igId, ig_post_id: pub.id });
      }
      case "ig_delete_comment": {
        const id = String(body.comment_id || "").trim();
        if (!id) return json({ ok: false, error: "comment_id required" }, 400);
        const pid = await resolvePage(body).catch(() => "");
        const tok = pid ? await pageToken(pid) : SYS_TOKEN;
        const d = await graph(`${id}`, { method: "DELETE", token: tok });
        return json({ ok: true, deleted: id, result: d });
      }

      case "ads_accounts": {
        const a = await graph(`me/adaccounts`, { params: { fields: "id,account_id,name,account_status,currency,amount_spent,balance", limit: "100" } });
        return json({ ok: true, count: (a.data || []).length, ad_accounts: a.data || [] });
      }
      case "ads_campaigns": {
        const acc = String(body.ad_account_id || "").trim();
        if (!acc) return json({ ok: false, error: "ad_account_id required (act_XXX)" }, 400);
        const d = await graph(`${acc}/campaigns`, { params: { fields: "id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time", limit: String(body.limit || 50) } });
        return json({ ok: true, count: (d.data || []).length, campaigns: d.data || [], paging: d.paging || null });
      }
      case "ads_adsets": {
        const parent = String(body.campaign_id || body.ad_account_id || "").trim();
        if (!parent) return json({ ok: false, error: "campaign_id or ad_account_id required" }, 400);
        const d = await graph(`${parent}/adsets`, { params: { fields: "id,name,status,effective_status,daily_budget,lifetime_budget,optimization_goal,billing_event,targeting", limit: String(body.limit || 50) } });
        return json({ ok: true, count: (d.data || []).length, adsets: d.data || [], paging: d.paging || null });
      }
      case "ads_insights": {
        const obj = String(body.campaign_id || body.ad_account_id || "").trim();
        if (!obj) return json({ ok: false, error: "campaign_id or ad_account_id required" }, 400);
        const d = await graph(`${obj}/insights`, { params: { fields: "impressions,reach,clicks,spend,cpc,cpm,ctr,actions,date_start,date_stop", date_preset: String(body.date_preset || "last_30d") } });
        return json({ ok: true, insights: d.data || [] });
      }
      case "ads_set_status": {
        const id = String(body.object_id || "").trim();
        const status = String(body.status || "").toUpperCase();
        if (!id || !["ACTIVE", "PAUSED", "ARCHIVED", "DELETED"].includes(status)) return json({ ok: false, error: "object_id + valid status required" }, 400);
        const d = await graph(`${id}`, { method: "POST", params: { status } });
        return json({ ok: true, object_id: id, status, result: d });
      }
      case "ads_set_budget": {
        const id = String(body.adset_id || "").trim();
        if (!id) return json({ ok: false, error: "adset_id required" }, 400);
        const params = {};
        if (body.daily_budget)    params.daily_budget = String(body.daily_budget);
        if (body.lifetime_budget) params.lifetime_budget = String(body.lifetime_budget);
        if (!params.daily_budget && !params.lifetime_budget) return json({ ok: false, error: "daily_budget or lifetime_budget required" }, 400);
        const d = await graph(`${id}`, { method: "POST", params });
        return json({ ok: true, adset_id: id, result: d });
      }
      case "ads_create_campaign": {
        const acc = String(body.ad_account_id || "").trim();
        const name = String(body.name || "").trim();
        const objective = String(body.objective || "").trim();
        if (!acc || !name || !objective) return json({ ok: false, error: "ad_account_id + name + objective required" }, 400);
        const d = await graph(`${acc}/campaigns`, { method: "POST", params: {
          name, objective, status: String(body.status || "PAUSED"),
          special_ad_categories: JSON.stringify([]),
        } });
        return json({ ok: true, ad_account_id: acc, campaign_id: d.id, note: "נוצר מושהה (PAUSED). הוסף adset+ad לפני הפעלה." });
      }

      default:
        return json({ ok: false, error: `unknown action '${action}'` }, 400);
    }
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200);
  }
});
