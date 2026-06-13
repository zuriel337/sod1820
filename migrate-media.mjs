#!/usr/bin/env node
/**
 * מיגרציית מדיה מהירה — WordPress → Supabase Storage (גרסה 2, מבוססת HTTPS).
 *
 * רעיון: במקום לסרוק את כל עץ ה-FTP (איטי, כולל אלפי thumbnails מיותרים),
 * הסקריפט קורא מהמסד בדיוק אילו קבצי מדיה עדיין מוזכרים עם כתובת wp-content
 * (גם image_url וגם בתוך גוף ה-content), מושך כל אחד ישירות מהפרוקסי
 * https://wp.sod1820.co.il (שמגיש שמות עבריים ב-200), ומעלה לבאקט media
 * *באותו נתיב עברי בדיוק* (uploads/<year>/<month>/<file>).
 *
 * למה 1:1 עברי ולא תעתיק לטיני: השמות בבאקט הקיים הם תעתיק (mbtza-alvt-hshchr),
 * אבל פונקציית התעתיק לא בידינו וקשה לשחזרה במדויק. שמירה בשם העברי המקורי
 * הופכת את שכתוב המסד (שלב 2) למיפוי ודאי 1:1 — בלי ניחושים, בלי תמונות שבורות.
 *
 * בטוח: idempotent (מדלג על קבצים שכבר בבאקט), שומר migration-log.json,
 * ואינו נוגע במסד כלל. שכתוב הכתובות הוא שלב נפרד שמריצים רק אחרי אימות.
 *
 * ENV נדרש:
 *   SUPABASE_SERVICE_KEY=<service_role key>   ← חובה! (anon לא יכול לכתוב לאחסון)
 * ENV אופציונלי:
 *   SUPABASE_URL=https://linswmnnkjxvweumprav.supabase.co
 *   BUCKET=media   WP_ORIGIN=https://wp.sod1820.co.il   CONCURRENCY=8
 *
 * הרצה:
 *   node migrate-media.mjs --dry     # רק לספור מה חסר, בלי להעלות
 *   node migrate-media.mjs           # להעלות בפועל את החסרים
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://linswmnnkjxvweumprav.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.BUCKET || "media";
const WP_ORIGIN = (process.env.WP_ORIGIN || "https://wp.sod1820.co.il").replace(/\/$/, "");
const CONCURRENCY = Number(process.env.CONCURRENCY || 8);
const LOG_FILE = "migration-log.json";
const DRY = process.argv.includes("--dry");

if (!SERVICE_KEY && !DRY) {
  console.error("חסר SUPABASE_SERVICE_KEY (service_role — לא anon!). אפשר להריץ --dry בלי מפתח.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY || "anon-placeholder", { auth: { persistSession: false } });

const loadLog = () => { try { return JSON.parse(fs.readFileSync(LOG_FILE, "utf8")); } catch { return { done: {}, failed: {}, missing: {} }; } };
const saveLog = (l) => fs.writeFileSync(LOG_FILE, JSON.stringify(l, null, 2));

// קידוד נתיב לכתובת: שומר על "/" ומקודד עברית/רווחים
const enc = (p) => p.split("/").map(encodeURIComponent).join("/");

// חילוץ כל נתיבי uploads/<...>.<ext> מטקסט (image_url בודד או content מלא)
function extractPaths(text, set) {
  if (!text) return;
  const re = /wp-content\/(uploads\/[^\s"'<>)\\]+?\.[A-Za-z0-9]{2,5})(?=[\s"'<>)\\?#&]|$)/g;
  let m;
  while ((m = re.exec(text))) {
    let p = m[1];
    try { p = decodeURIComponent(p); } catch { /* keep raw */ }
    set.add(p);
  }
}

async function collectNeededPaths() {
  const set = new Set();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from("posts")
      .select("image_url,content")
      .or("image_url.ilike.%wp-content/uploads%,content.ilike.%wp-content/uploads%")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) { extractPaths(row.image_url, set); extractPaths(row.content, set); }
    if (data.length < PAGE) break;
  }
  return [...set];
}

async function existsInBucket(path) {
  // HEAD מהיר על הכתובת הציבורית: 200 = קיים
  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${enc(path)}`;
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch { return false; }
}

async function migrateOne(path, log, stats) {
  if (log.done[path]) { stats.skipped++; return; }
  if (await existsInBucket(path)) { log.done[path] = { skippedExisting: true }; stats.skipped++; return; }
  if (DRY) { stats.toUpload++; console.log("MISSING " + path); return; }

  const src = `${WP_ORIGIN}/wp-content/${enc(path)}`;
  try {
    const res = await fetch(src, { redirect: "follow" });
    if (!res.ok) {
      if (res.status === 404) { log.missing[path] = { status: 404 }; stats.missing++; console.warn("404 (תקוע) " + path); }
      else { log.failed[path] = { status: res.status }; stats.errors++; console.error("HTTP " + res.status + " " + path); }
      return;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const { error } = await sb.storage.from(BUCKET).upload(path, buf, { contentType, upsert: false });
    if (error && !/already exists/i.test(error.message || "")) throw error;
    log.done[path] = { size: buf.length, at: new Date().toISOString() };
    stats.uploaded++; stats.bytes += buf.length;
    console.log("OK " + path + " (" + (buf.length / 1024).toFixed(0) + " KB)");
  } catch (e) {
    log.failed[path] = { error: e.message }; stats.errors++; console.error("ERR " + path + " — " + e.message);
  }
}

async function runPool(paths, log, stats) {
  let i = 0, processed = 0;
  async function worker() {
    while (i < paths.length) {
      const idx = i++;
      await migrateOne(paths[idx], log, stats);
      if (!DRY && ++processed % 25 === 0) saveLog(log);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker));
}

async function main() {
  console.log(`איסוף נתיבים נחוצים מהמסד (${SUPABASE_URL})...`);
  const paths = await collectNeededPaths();
  console.log(`נמצאו ${paths.length} קבצים ייחודיים שעדיין מוזכרים עם wp-content.`);
  const log = loadLog();
  const stats = { uploaded: 0, skipped: 0, errors: 0, missing: 0, toUpload: 0, bytes: 0 };
  await runPool(paths, log, stats);
  if (!DRY) saveLog(log);
  if (DRY) {
    console.log(`\n[DRY] חסרים בבאקט: ${stats.toUpload} | כבר קיימים: ${stats.skipped} מתוך ${paths.length}.`);
  } else {
    console.log(`\nסיום. הועלו:${stats.uploaded} דולגו:${stats.skipped} 404(תקועים):${stats.missing} שגיאות:${stats.errors} | MB:${(stats.bytes / 1024 / 1024).toFixed(1)}`);
    console.log(`פירוט מלא ב-${LOG_FILE} (כולל רשימת ה-404 שבאמת חסרים בשרת הישן).`);
  }
}

main().catch((e) => { console.error("נכשל:", e.message); process.exit(1); });
