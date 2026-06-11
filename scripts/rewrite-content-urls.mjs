// החלפת כתובות מדיה ישנות של WordPress בכתובות אחסון Supabase, בעמודות טבלת posts.
// ממפה 1:1:  https://sod1820.co.il/wp-content/uploads/<X>
//        →  https://<project>.supabase.co/storage/v1/object/public/media/uploads/<X>
//
// ⚠️ להריץ רק *אחרי* שמיגרציית המדיה (migrate-media.mjs) הושלמה — אחרת הכתובות החדשות יצביעו לקבצים שלא קיימים.
// ברירת מחדל: DRY-RUN (רק סופר). הרצה אמיתית:  APPLY=true node scripts/rewrite-content-urls.mjs
//
// משתני סביבה: SUPABASE_URL, SUPABASE_SERVICE_KEY (חובה), BUCKET (ברירת מחדל "media").

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://linswmnnkjxvweumprav.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET       = process.env.BUCKET || "media";
const APPLY        = process.env.APPLY === "true";

if (!SUPABASE_KEY) { console.error("חסר SUPABASE_SERVICE_KEY"); process.exit(1); }

const NEW_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/uploads/`;
// תופס http/https/פרוטוקול-יחסי, עם או בלי www
const OLD_RE = /(https?:)?\/\/(www\.)?sod1820\.co\.il\/wp-content\/uploads\//gi;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const rewrite = (s) => (typeof s === "string" ? s.replace(OLD_RE, NEW_BASE) : s);

async function main() {
  const PAGE = 500;
  let from = 0, scanned = 0, changed = 0, updated = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("posts")
      .select("id, content, excerpt, image_url")
      .range(from, from + PAGE - 1);
    if (error) { console.error("Supabase error:", error.message); process.exit(1); }
    if (!data?.length) break;

    for (const p of data) {
      scanned++;
      const next = { content: rewrite(p.content), excerpt: rewrite(p.excerpt), image_url: rewrite(p.image_url) };
      if (next.content !== p.content || next.excerpt !== p.excerpt || next.image_url !== p.image_url) {
        changed++;
        if (APPLY) {
          const { error: upErr } = await supabase.from("posts").update(next).eq("id", p.id);
          if (upErr) console.error("update fail id=" + p.id + ":", upErr.message);
          else updated++;
        }
      }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`${APPLY ? "APPLIED" : "DRY-RUN"} — נסרקו ${scanned} פוסטים; ${changed} מכילים כתובות wp-content להחלפה${APPLY ? `; עודכנו ${updated}` : ""}.`);
  if (!APPLY) console.log("להרצה אמיתית:  APPLY=true node scripts/rewrite-content-urls.mjs");
}

main();
