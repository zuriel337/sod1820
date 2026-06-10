#!/usr/bin/env node
/**
 * ייבוא נתוני תנועה היסטוריים מ-Jetpack / WordPress.com Stats אל Supabase.
 *
 * רץ *מקומית* (כמו migrate-media.mjs) — הסביבה הענן חוסמת יציאה ל-WordPress.com.
 * הנתונים של ג'טפק יושבים ב-WordPress.com, לא באתר עצמו, ולכן צריך מפתח API.
 *
 * הרצה:
 *   1) שים בקובץ .env (או בסביבה) את המשתנים:
 *        WPCOM_API_KEY        מפתח ה-API של WordPress.com — מ-https://apikey.wordpress.com/
 *        SUPABASE_URL         (כבר קיים אצלך ל-migrate-media)
 *        SUPABASE_SERVICE_KEY (service role key)
 *      אופציונלי:
 *        BLOG_URI   ברירת מחדל sod1820.co.il
 *        STAT_DAYS  כמה ימים אחורה לסכם (ברירת מחדל 7000 ≈ 19 שנה = כל הזמן)
 *        STAT_LIMIT מקסימום שורות (ברירת מחדל 5000)
 *
 *   2) הרצה:
 *        export $(grep -v '^#' .env | xargs) && node scripts/import-jetpack-stats.mjs
 *      (ב-Windows/Git Bash זהה למה שהרצת ב-migrate-media)
 *
 * אם פורמט ה-JSON שמוחזר שונה ממה שצפינו — הסקריפט מדפיס דגימה גולמית;
 * שלח אותה חזרה ונתאים את המיפוי.
 */
import { createClient } from "@supabase/supabase-js";

const WPCOM_API_KEY = process.env.WPCOM_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BLOG_URI = process.env.BLOG_URI || "sod1820.co.il";
const DAYS = Number(process.env.STAT_DAYS || 7000);
const LIMIT = Number(process.env.STAT_LIMIT || 5000);
const PERIOD_LABEL = "all_time";
const SOURCE = "jetpack";

function requireEnv() {
  const missing = [];
  if (!WPCOM_API_KEY) missing.push("WPCOM_API_KEY");
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_KEY) missing.push("SUPABASE_SERVICE_KEY");
  if (missing.length) {
    console.error("❌ חסרים משתני סביבה:", missing.join(", "));
    process.exit(1);
  }
}

function buildUrl() {
  const today = new Date().toISOString().slice(0, 10);
  const qs = new URLSearchParams({
    api_key: WPCOM_API_KEY,
    blog_uri: BLOG_URI,
    table: "postviews",
    end: today,
    days: String(DAYS),
    summarize: "1",
    limit: String(LIMIT),
    format: "json",
  });
  return `https://stats.wordpress.com/csv.php?${qs.toString()}`;
}

/** מנרמל את התשובה (שצורתה משתנה בין גרסאות) לרשימת {post_id,title,url,views}. */
function normalize(json) {
  // צורות אפשריות:
  //  א) מערך שורות: [{post_id, post_title, post_permalink, views}, ...]
  //  ב) עטוף-סיכום: {"<date>": {postviews: [...]}} או {postviews: [...]}
  let rows = null;
  if (Array.isArray(json)) {
    rows = json;
  } else if (json && Array.isArray(json.postviews)) {
    rows = json.postviews;
  } else if (json && typeof json === "object") {
    const firstKey = Object.keys(json)[0];
    const inner = json[firstKey];
    if (inner && Array.isArray(inner.postviews)) rows = inner.postviews;
    else if (Array.isArray(inner)) rows = inner;
  }
  if (!rows) return null;
  return rows
    .map((r) => ({
      post_id: Number(r.post_id ?? r.postId ?? r.id ?? 0) || null,
      title: r.post_title ?? r.title ?? null,
      url: r.post_permalink ?? r.permalink ?? r.href ?? null,
      views: Number(r.views ?? r.value ?? 0) || 0,
      period: PERIOD_LABEL,
      source: SOURCE,
    }))
    .filter((r) => r.views > 0);
}

async function run() {
  requireEnv();
  const url = buildUrl();
  console.log(`📥 מושך סטטיסטיקות מ-WordPress.com עבור ${BLOG_URI} (כ-${DAYS} ימים)...`);

  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  const text = await res.text();
  if (!res.ok) {
    console.error(`❌ שגיאת HTTP ${res.status}:`, text.slice(0, 500));
    console.error("טיפ: אם זה 403/שגיאת מפתח — ודא ש-WPCOM_API_KEY נכון (https://apikey.wordpress.com/).");
    process.exit(1);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("❌ התשובה אינה JSON תקין. דגימה גולמית:");
    console.error(text.slice(0, 800));
    process.exit(1);
  }

  const rows = normalize(json);
  if (!rows || rows.length === 0) {
    console.error("❌ לא זוהו שורות נתונים. דגימת ה-JSON שהוחזר (שלח לי אותה כדי שנתאים מיפוי):");
    console.error(JSON.stringify(json, null, 2).slice(0, 1200));
    process.exit(1);
  }

  console.log(`  ✓ זוהו ${rows.length} שורות. דוגמה:`, JSON.stringify(rows[0]));

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { error } = await supabase
    .from("legacy_traffic")
    .upsert(rows, { onConflict: "post_id,period,source" });
  if (error) {
    console.error("❌ שגיאת Supabase:", error.message);
    process.exit(1);
  }

  const top = [...rows].sort((a, b) => b.views - a.views).slice(0, 10);
  console.log(`\n✅ יובאו ${rows.length} רשומות ל-legacy_traffic.`);
  console.log("🏆 10 הנצפים ביותר:");
  top.forEach((r, i) =>
    console.log(`  ${i + 1}. ${(r.title || r.url || r.post_id || "?").toString().slice(0, 50)} — ${r.views.toLocaleString()} צפיות`)
  );
}

run().catch((e) => {
  console.error("❌ כשל לא צפוי:", e.message);
  process.exit(1);
});
