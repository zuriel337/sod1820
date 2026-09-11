// post-to-storyboard v1 — "המוח" של מנוע הסרטונים.
// קורא פוסט (מה-DB לפי id/slug, או content גולמי), מפצל אותו ל-6-8 סצנות עם
// קריינות + טקסט-על-מסך + מספר דומיננטי לכל סצנה, ומתאים לכל סצנה תמונה אמיתית
// מ-gallery_images לפי אותו מספר (העץ האחד — number ↔ image). מחזיר JSON גולמי בלבד.
// אין כאן שום רינדור/וידאו — את מנוע ה-render בוחרים בשלב הבא.
//
// קלט (POST JSON):
//   { post_id?: number, slug?: string, content?: string, title?: string,
//     scenes?: number (ברירת מחדל 7, טווח 4-8) }
// פלט: storyboard מלא + סצנות מועשרות בתמונות.
//
// סודות (כבר קיימים בפרויקט — אין צורך בחדשים):
//   ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// אופציונלי: STORYBOARD_MODEL (ברירת מחדל claude-sonnet-4-6), STORYBOARD_RUN_KEY (שמירה על הקריאה)

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("STORYBOARD_MODEL") || "claude-sonnet-4-6";
const RUN_KEY = Deno.env.get("STORYBOARD_RUN_KEY") || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-run-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// HTML → טקסט נקי לקריאת ה-AI (מסיר תגיות, scripts, רווחים כפולים).
function htmlToText(html: string): string {
  return (html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>(?=)/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseJsonLoose(raw: string): any {
  const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(clean); } catch { /* salvage */ }
  const a = clean.indexOf("{"); const b = clean.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(clean.slice(a, b + 1)); } catch { /* ignore */ } }
  return null;
}

async function fetchPost(post_id?: number, slug?: string): Promise<any | null> {
  let filter = "";
  if (post_id != null) filter = `id=eq.${post_id}`;
  else if (slug) filter = `slug=eq.${encodeURIComponent(slug)}`;
  else return null;
  const url = `${SUPABASE_URL}/rest/v1/posts?${filter}&select=id,slug,title,excerpt,content,image_url,categories,tags&limit=1`;
  const r = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
  if (!r.ok) throw new Error(`fetch post ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const rows = await r.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

// מתאים תמונה אמיתית מהגלריה לפי מספר דומיננטי (קודם primary_value, נפילה ל-all_values).
// סדר: importance↓ — בדיוק כמו ברירת המחדל של הגלריה.
async function matchImage(value: number): Promise<any | null> {
  const sel = "select=id,image_url,name,importance,image_type,occurred_at&order=importance.desc.nullslast&limit=1";
  const tries = [
    `${SUPABASE_URL}/rest/v1/gallery_images?primary_value=eq.${value}&image_url=not.is.null&${sel}`,
    `${SUPABASE_URL}/rest/v1/gallery_images?all_values=cs.{${value}}&image_url=not.is.null&${sel}`,
  ];
  for (const url of tries) {
    const r = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
    if (!r.ok) continue;
    const rows = await r.json();
    if (Array.isArray(rows) && rows.length) {
      const g = rows[0];
      return { image_id: g.id, image_url: g.image_url, image_name: g.name || null, image_type: g.image_type || null };
    }
  }
  return null;
}

function buildPrompt(title: string, text: string, scenes: number): string {
  return [
    "אתה עורך תוכן וידאו לאתר SOD1820 — אתר רמזי גאולה, גימטריה ומספרים (עברית, RTL).",
    "המשימה: להפוך את הפוסט הבא לתסריט (storyboard) לסרטון קצר אנכי (9:16) ל-TikTok/Reels/Shorts.",
    "",
    `הפוסט (כותרת: ${title || "ללא"}):`,
    "<<<", text.slice(0, 8000), ">>>",
    "",
    `פצל ל-${scenes} סצנות בדיוק, לפי הסגנון הקבוע של SOD1820:`,
    "• סצנה 1 = וו פתיחה (hook): מסך שחור, משפט מסקרן קצר שעוצר את הגלילה (למשל \"אף אחד לא שם לב לקוד הזה...\").",
    "• סצנות אמצע = חשיפת מספרים: כל סצנה מתמקדת במספר דומיננטי אחד מהפוסט וברמז שלו (מספר → מילה/ביטוי → משמעות).",
    "• סצנה אחרונה = סגירה (cta): שאלה מהדהדת (\"צירוף מקרים... או קוד?\") + הזמנה ללוגו/אתר.",
    "",
    "חוקי ברזל:",
    "1. אל תמציא גימטריה ואל תחשב ערכים. השתמש אך ורק במספרים, מילים וביטויים שמופיעים בפוסט עצמו. אם אין מספר ברור לסצנה — primary_value=null.",
    "2. קריינות בעברית טבעית ומדוברת, משפט אחד קצר לסצנה (עד ~18 מילים), מתאים להקראה קולית.",
    "3. on_screen = טקסט קצר מאוד למסך (2-6 מילים), חד ומתומצת — לא משפט שלם.",
    "4. שמור על מתח עולה: מסקרן → חושף → שיא → שאלה.",
    "",
    "החזר אך ורק JSON תקין (ללא Markdown) במבנה הבא:",
    '{',
    '  "title": string,                // כותרת קצרה לסרטון',
    '  "hook": string,                 // משפט הפתיחה',
    '  "cta": string,                  // משפט הסגירה/הזמנה',
    '  "hashtags": string[],           // 3-6 האשטגים בעברית רלוונטיים',
    '  "music_mood": string,           // מילה-שתיים על אופי המוזיקה (למשל "מסתורי", "מתח")',
    '  "scenes": [',
    '    {',
    '      "idx": number,              // 1-based',
    '      "role": "hook"|"reveal"|"cta",',
    '      "on_screen": string,        // טקסט קצר למסך',
    '      "narration": string,        // משפט קריינות',
    '      "primary_value": number|null,// המספר הדומיננטי של הסצנה (אם יש)',
    '      "entities": string[],       // מילות-מפתח לחיפוש תמונה (נושאים/חפצים/מקומות)',
    '      "duration_sec": number      // משך מומלץ בשניות (2-6)',
    '    }',
    '  ]',
    '}',
  ].join("\n");
}

async function generateStoryboard(title: string, text: string, scenes: number): Promise<any> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: [{ type: "text", text: buildPrompt(title, text, scenes) }] }],
    }),
  });
  if (!resp.ok) throw new Error(`anthropic ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const raw = (data.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
  const sb = parseJsonLoose(raw);
  if (!sb || !Array.isArray(sb.scenes)) throw new Error("bad storyboard json: " + raw.slice(0, 200));
  return sb;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (RUN_KEY && req.headers.get("x-run-key") !== RUN_KEY) return json({ error: "unauthorized" }, 401);
    if (!ANTHROPIC_KEY) return json({ error: "missing ANTHROPIC_API_KEY secret" }, 500);

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }

    const scenes = Math.min(Math.max(parseInt(body?.scenes, 10) || 7, 4), 8);

    // מקור התוכן: content גולמי, אחרת שליפה מ-DB לפי post_id/slug.
    let title = typeof body?.title === "string" ? body.title : "";
    let text = "";
    let postRef: any = null;
    if (typeof body?.content === "string" && body.content.trim()) {
      text = htmlToText(body.content);
    } else if (body?.post_id != null || body?.slug) {
      const post = await fetchPost(body.post_id != null ? +body.post_id : undefined, body.slug);
      if (!post) return json({ error: "post_not_found" }, 404);
      postRef = { id: post.id, slug: post.slug };
      title = title || post.title || "";
      text = htmlToText([post.title, post.excerpt, post.content].filter(Boolean).join("\n\n"));
    } else {
      return json({ error: "missing input: provide post_id, slug, or content" }, 400);
    }

    if (text.length < 40) return json({ error: "content_too_short", chars: text.length }, 400);

    const sb = await generateStoryboard(title, text, scenes);

    // העשרה: לכל סצנה עם מספר דומיננטי — תמונה אמיתית מהגלריה + קישור לדף המספר (העץ האחד).
    const enriched = [];
    for (const s of sb.scenes) {
      const pv = Number.isInteger(s?.primary_value) ? s.primary_value : null;
      const img = pv != null ? await matchImage(pv) : null;
      enriched.push({
        idx: s.idx ?? enriched.length + 1,
        role: s.role || (enriched.length === 0 ? "hook" : "reveal"),
        on_screen: String(s.on_screen || "").trim(),
        narration: String(s.narration || "").trim(),
        primary_value: pv,
        number_href: pv != null ? `/number/${pv}` : null, // מפנה לעץ — לא משכפל
        entities: Array.isArray(s.entities) ? s.entities.map((x: any) => String(x).trim()).filter(Boolean) : [],
        duration_sec: Number(s.duration_sec) > 0 ? Number(s.duration_sec) : 4,
        image: img, // {image_id,image_url,image_name,image_type} או null
      });
    }

    const totalDuration = enriched.reduce((a, s) => a + (s.duration_sec || 0), 0);

    return json({
      ok: true,
      post: postRef,
      title: sb.title || title,
      hook: sb.hook || "",
      cta: sb.cta || "",
      hashtags: Array.isArray(sb.hashtags) ? sb.hashtags : [],
      music_mood: sb.music_mood || "",
      aspect: "9:16",
      scene_count: enriched.length,
      total_duration_sec: totalDuration,
      images_matched: enriched.filter((s) => s.image).length,
      scenes: enriched,
      model: MODEL,
    });
  } catch (e) {
    return json({ error: String(e), stack: (e as any)?.stack?.slice(0, 400) }, 500);
  }
});
