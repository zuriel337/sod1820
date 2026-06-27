// facebook-admin — ניהול מלא של דף הפייסבוק דרך Graph API (קריאה · חיפוש · מחיקה · פרסום).
// נבנה כדי לתת שליטה תכנותית על הדף facebook.com/sod1820 — בעיקר איתור והסרה של תוכן
// (למשל צילומים בזכויות יוצרים), וגם פרסום יזום.
//
// סודות נדרשים (Supabase → Edge Functions → Secrets):
//   FACEBOOK_PAGE_ID    = מזהה דף הפייסבוק (numeric)
//   FACEBOOK_PAGE_TOKEN = Page Access Token (System User, ארוך-טווח) עם ההרשאות:
//                         pages_show_list, pages_read_engagement, pages_read_user_content,
//                         pages_manage_posts, pages_manage_engagement
//   FB_ADMIN_KEY        = מפתח-גישה שרירותי שאתה ממציא (מגן על הפונקציה; נפרד מטוקן ה-FB
//                         וניתן לסיבוב בכל רגע). כל קריאה חייבת לשלוח header  x-fb-admin-key
//   META_GRAPH_VERSION  = (אופציונלי) ברירת מחדל v21.0
//
// אבטחה: הטוקן של פייסבוק לעולם לא יוצא מהשרת. הקורא מאמת רק עם FB_ADMIN_KEY.
//
// פעולות (POST JSON):
//   { action: "whoami" }                                  → אימות טוקן + הרשאות (להפעלה ראשונית)
//   { action: "list",   limit?, after?, since?, until? }  → פוסטים שהדף פרסם (עם תמונה/קישור)
//   { action: "photos", limit?, after? }                  → תמונות שהדף העלה (אלבומים)
//   { action: "search", query?, since?, until?, max? }    → סינון פוסטים לפי טקסט/טווח-תאריכים
//   { action: "delete", object_id }                       → מחיקת פוסט/תמונה לפי מזהה
//   { action: "publish_post",  message, link? }           → פרסום פוסט טקסט/קישור
//   { action: "publish_photo", image_url, caption? }      → פרסום תמונה עם כיתוב
//
// since/until: "YYYY-MM-DD" או unix-seconds (טווח לפי created_time).

const PAGE_ID    = Deno.env.get("FACEBOOK_PAGE_ID")    || "";
const PAGE_TOKEN = Deno.env.get("FACEBOOK_PAGE_TOKEN") || "";
const ADMIN_KEY  = Deno.env.get("FB_ADMIN_KEY")        || "";
const GRAPH      = Deno.env.get("META_GRAPH_VERSION")  || "v21.0";
const BASE       = `https://graph.facebook.com/${GRAPH}`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-fb-admin-key, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
}

// קריאה ל-Graph API עם הטוקן של הדף; זורק שגיאה ידידותית.
async function graph(path: string, init?: RequestInit, params: Record<string, string> = {}) {
  const u = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) if (v != null && v !== "") u.searchParams.set(k, v);
  u.searchParams.set("access_token", PAGE_TOKEN);
  const r = await fetch(u.toString(), init);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.error?.message || `Graph ${r.status}`);
  return d;
}

const POST_FIELDS = "id,message,story,created_time,permalink_url,full_picture,attachments{media_type,type,title,url,media,subattachments}";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")   return json({ error: "POST only" }, 405);

  // הגנה: חובה מפתח-גישה. בלי FB_ADMIN_KEY מוגדר — הפונקציה סגורה לחלוטין.
  if (!ADMIN_KEY) return json({ ok: false, error: "FB_ADMIN_KEY not configured" }, 403);
  if (req.headers.get("x-fb-admin-key") !== ADMIN_KEY) return json({ ok: false, error: "unauthorized" }, 401);
  if (!PAGE_ID || !PAGE_TOKEN) return json({ ok: false, error: "missing FACEBOOK_PAGE_ID / FACEBOOK_PAGE_TOKEN" }, 400);

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const action = String(body.action || "");

  try {
    switch (action) {
      // ── אימות ראשוני: מאשר שהטוקן תקף, מזהה את הדף, ובודק קריאת פיד ── //
      case "whoami": {
        const me   = await graph(`me`, undefined, { fields: "id,name" }).catch((e) => ({ error: String(e) }));
        const page = await graph(`${PAGE_ID}`, undefined, { fields: "id,name,fan_count,link" }).catch((e) => ({ error: String(e) }));
        let canRead = false, readErr = "";
        try { await graph(`${PAGE_ID}/published_posts`, undefined, { limit: "1" }); canRead = true; }
        catch (e) { readErr = String(e); }
        return json({ ok: true, token_identity: me, page, can_read_posts: canRead, read_error: readErr || undefined });
      }

      // ── רשימת פוסטים שהדף פרסם ── //
      case "list": {
        const d = await graph(`${PAGE_ID}/published_posts`, undefined, {
          fields: POST_FIELDS,
          limit: String(body.limit || 25),
          after: body.after || "",
          since: body.since || "",
          until: body.until || "",
        });
        return json({ ok: true, count: (d.data || []).length, posts: d.data || [], paging: d.paging || null });
      }

      // ── תמונות שהדף העלה (כולל כאלה שנשארות באלבום אחרי מחיקת הפוסט) ── //
      case "photos": {
        const d = await graph(`${PAGE_ID}/photos`, undefined, {
          type: "uploaded",
          fields: "id,name,created_time,link,images,album{name}",
          limit: String(body.limit || 25),
          after: body.after || "",
        });
        return json({ ok: true, count: (d.data || []).length, photos: d.data || [], paging: d.paging || null });
      }

      // ── חיפוש: עובר על עמודי הפיד (עד max) ומסנן לפי טקסט/טווח-תאריכים ── //
      case "search": {
        const q = String(body.query || "").toLowerCase().trim();
        const max = Math.min(Number(body.max) || 300, 1000);
        const matches: any[] = [];
        let after = ""; let scanned = 0; let pages = 0;
        while (scanned < max && pages < 40) {
          const d = await graph(`${PAGE_ID}/published_posts`, undefined, {
            fields: POST_FIELDS, limit: "50", after,
            since: body.since || "", until: body.until || "",
          });
          const arr = d.data || [];
          for (const p of arr) {
            scanned++;
            const text = `${p.message || ""} ${p.story || ""}`.toLowerCase();
            if (!q || text.includes(q)) matches.push(p);
          }
          after = d.paging?.cursors?.after || "";
          if (!after || !arr.length) break;
          pages++;
        }
        return json({ ok: true, scanned, matched: matches.length, posts: matches });
      }

      // ── מחיקה: פוסט או תמונה לפי מזהה ── //
      case "delete": {
        const id = String(body.object_id || "").trim();
        if (!id) return json({ ok: false, error: "object_id required" }, 400);
        const d = await graph(`${id}`, { method: "DELETE" });
        return json({ ok: true, deleted: id, result: d });
      }

      // ── פרסום פוסט טקסט/קישור ── //
      case "publish_post": {
        const message = String(body.message || "").trim();
        if (!message) return json({ ok: false, error: "message required" }, 400);
        const params: Record<string, string> = { message };
        if (body.link) params.link = String(body.link);
        const d = await graph(`${PAGE_ID}/feed`, { method: "POST" }, params);
        return json({ ok: true, fb_post_id: d.id });
      }

      // ── פרסום תמונה עם כיתוב ── //
      case "publish_photo": {
        const url = String(body.image_url || "").trim();
        if (!url) return json({ ok: false, error: "image_url required" }, 400);
        const d = await graph(`${PAGE_ID}/photos`, { method: "POST" }, {
          url, caption: String(body.caption || ""),
        });
        return json({ ok: true, fb_post_id: d.id || d.post_id });
      }

      default:
        return json({ ok: false, error: `unknown action '${action}'` }, 400);
    }
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200);
  }
});
