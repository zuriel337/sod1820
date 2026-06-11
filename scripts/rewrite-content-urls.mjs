// החלפת כתובות מדיה ישנות של WordPress בכתובות אחסון Supabase, בעמודות טבלת posts.
// ממפה 1:1:  https://sod1820.co.il/wp-content/uploads/<X>
//        →  https://<project>.supabase.co/storage/v1/object/public/media/uploads/<X>
//
// 🛡️ בטוח: מחליף *רק* כתובות שהקובץ שלהן אכן קיים ב-storage (בדיקת HEAD).
//    כתובות שהקובץ חסר (למשל מדיה עם שם בעברית שתועתק) — נשארות ללא שינוי, בלי נסיגה.
//
// ברירת מחדל: DRY-RUN. הרצה אמיתית:  APPLY=true node scripts/rewrite-content-urls.mjs
// משתני סביבה: SUPABASE_URL, SUPABASE_SERVICE_KEY (חובה), BUCKET (ברירת מחדל "media").

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://linswmnnkjxvweumprav.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET       = process.env.BUCKET || "media";
const APPLY        = process.env.APPLY === "true";

if (!SUPABASE_KEY) { console.error("חסר SUPABASE_SERVICE_KEY"); process.exit(1); }

const PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/uploads/`;
// תופס גם כתובות ישירות (sod1820.co.il) וגם דרך Jetpack CDN (iN.wp.com/sod1820.co.il)
const URL_RE = /(?:https?:)?\/\/(?:i\d\.wp\.com\/)?(?:www\.)?sod1820\.co\.il\/wp-content\/uploads\/([^\s"'<>)\\]+)/gi;
const pathOf = (cap) => cap.replace(/[?#].*$/, "");           // ללא query/fragment
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function fetchAllPosts() {
  const PAGE = 500; let from = 0; const rows = [];
  for (;;) {
    const { data, error } = await supabase
      .from("posts").select("id, content, excerpt, image_url").range(from, from + PAGE - 1);
    if (error) { console.error("Supabase error:", error.message); process.exit(1); }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function existsInStorage(path) {
  const url = PUBLIC_BASE + encodeURI(path);
  try { return (await fetch(url, { method: "HEAD" })).status === 200; }
  catch { return false; }
}

// בדיקת קיום מקבילה עם מגבלת מקביליות
async function checkAll(paths, concurrency = 12) {
  const result = new Map(); const queue = [...paths]; let i = 0;
  async function worker() { while (queue.length) { const p = queue.shift(); result.set(p, await existsInStorage(p)); if (++i % 50 === 0) process.stdout.write(`\r  נבדקו ${i}/${paths.length}`); } }
  await Promise.all(Array.from({ length: concurrency }, worker));
  if (paths.length) process.stdout.write(`\r  נבדקו ${paths.length}/${paths.length}\n`);
  return result;
}

async function main() {
  const rows = await fetchAllPosts();
  // איסוף כל הנתיבים הייחודיים
  const paths = new Set();
  for (const r of rows) for (const f of ["content", "excerpt", "image_url"]) {
    const s = r[f]; if (typeof s !== "string") continue;
    let m; URL_RE.lastIndex = 0; while ((m = URL_RE.exec(s)) !== null) paths.add(pathOf(m[1]));
  }
  console.log(`נסרקו ${rows.length} פוסטים; ${paths.size} נתיבי wp-content ייחודיים.`);
  console.log("בודק קיום ב-storage...");
  const exists = await checkAll([...paths]);
  const okCount = [...exists.values()].filter(Boolean).length;
  console.log(`קיימים ב-storage: ${okCount}; חסרים (יישארו ללא שינוי): ${paths.size - okCount}`);

  const rewrite = (s) => (typeof s !== "string" ? s : s.replace(URL_RE, (m, cap) =>
    exists.get(pathOf(cap)) ? PUBLIC_BASE + pathOf(cap) : m));

  let changed = 0, updated = 0;
  for (const r of rows) {
    const next = { content: rewrite(r.content), excerpt: rewrite(r.excerpt), image_url: rewrite(r.image_url) };
    if (next.content !== r.content || next.excerpt !== r.excerpt || next.image_url !== r.image_url) {
      changed++;
      if (APPLY) {
        const { error } = await supabase.from("posts").update(next).eq("id", r.id);
        if (error) console.error("update fail id=" + r.id + ":", error.message); else updated++;
      }
    }
  }
  console.log(`${APPLY ? "APPLIED" : "DRY-RUN"} — ${changed} פוסטים עם החלפות בטוחות${APPLY ? `; עודכנו ${updated}` : ""}.`);
  if (!APPLY) console.log("להרצה אמיתית:  APPLY=true node scripts/rewrite-content-urls.mjs");
}

main();
