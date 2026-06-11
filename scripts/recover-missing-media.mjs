// שחזור קבצי מדיה שחסרים ב-Supabase storage: הורדה מהוורדפרס החי (HTTP) והעלאה ל-storage
// תחת אותו נתיב מקורי. לאחר מכן יש להריץ scripts/rewrite-content-urls.mjs כדי למפות את הכתובות.
//
// הרצה:  SUPABASE_SERVICE_KEY=... node scripts/recover-missing-media.mjs        (DRY-RUN — רק סופר)
//        SUPABASE_SERVICE_KEY=... APPLY=true node scripts/recover-missing-media.mjs   (מוריד ומעלה)
// משתני סביבה: SUPABASE_SERVICE_KEY (חובה), SUPABASE_URL, BUCKET, WP_BASE.

import mime from "mime-types";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://linswmnnkjxvweumprav.supabase.co";
const SVC   = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.BUCKET || "media";
const WP_BASE = process.env.WP_BASE || "https://sod1820.co.il/wp-content/uploads/";
const APPLY = process.env.APPLY === "true";
if (!SVC) { console.error("חסר SUPABASE_SERVICE_KEY"); process.exit(1); }

const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM";
const PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/uploads/`;

// Supabase storage דוחה מפתחות עם עברית → מעלים תחת שם מתועתק (כמו שאר ה-storage).
const MAP = {'א':'a','ב':'b','ג':'g','ד':'d','ה':'h','ו':'v','ז':'z','ח':'ch','ט':'t','י':'y','כ':'k','ך':'k','ל':'l','מ':'m','ם':'m','נ':'n','ן':'n','ס':'s','ע':'a','פ':'p','ף':'p','צ':'tz','ץ':'tz','ק':'k','ר':'r','ש':'sh','ת':'t'};
const hasHebrew = (s) => /[֐-׿]/.test(s);
function translitFile(fname) {
  const dot = fname.lastIndexOf("."); const ext = dot >= 0 ? fname.slice(dot).toLowerCase() : "";
  let s = (dot >= 0 ? fname.slice(0, dot) : fname).replace(/[‎‏‪-‮]/g, "").replace(/[֑-ׇ]/g, "");
  let o = ""; for (const ch of s) o += (MAP[ch] !== undefined) ? MAP[ch] : (/[A-Za-z0-9.]/.test(ch) ? ch.toLowerCase() : "-");
  return o.replace(/-+/g, "-").replace(/^-|-$/g, "") + ext;
}
// נתיב-יעד ב-storage (יחסי ל-uploads/) — מתעתק את שם הקובץ אם הוא בעברית
function targetRel(path) {
  const slash = path.lastIndexOf("/"); const dir = slash >= 0 ? path.slice(0, slash + 1) : "";
  const fname = slash >= 0 ? path.slice(slash + 1) : path;
  return dir + (hasHebrew(fname) ? translitFile(fname) : fname);
}

async function allPosts() {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/posts?select=content,excerpt&limit=500&offset=${from}`, { headers: { apikey: ANON } });
    const d = await r.json(); if (!Array.isArray(d) || !d.length) break;
    rows.push(...d); if (d.length < 500) break;
  }
  return rows;
}
async function existsInStorage(path) { try { return (await fetch(PUBLIC_BASE + encodeURI(path), { method: "HEAD" })).status === 200; } catch { return false; } }

async function main() {
  const rows = await allPosts();
  const RE = /wp-content\/uploads\/([^"'<>)\\ ?]+)/g;
  const paths = new Set();
  for (const p of rows) for (const f of [p.content, p.excerpt]) {
    if (typeof f !== "string") continue; let m; RE.lastIndex = 0;
    while ((m = RE.exec(f)) !== null) paths.add(decodeURIComponent(m[1].replace(/[?#].*$/, "")));
  }
  console.log(`כתובות wp-content ייחודיות שנותרו: ${paths.size}`);
  if (!APPLY) { console.log("DRY-RUN — להרצה אמיתית: APPLY=true node scripts/recover-missing-media.mjs"); return; }

  const list = [...paths];
  let recovered = 0, already = 0, gone = 0, failed = 0, i = 0;
  async function worker() {
    while (list.length) {
      const path = list.shift(); i++;
      const rel = targetRel(path);                                    // שם-יעד (מתועתק אם עברית)
      if (await existsInStorage(rel)) { already++; continue; }        // כבר ב-storage
      let buf;
      try {
        const res = await fetch(WP_BASE + encodeURI(path), { signal: AbortSignal.timeout(60000) });
        if (!res.ok) { gone++; continue; }                            // 404 בוורדפרס — באמת אבד
        buf = Buffer.from(await res.arrayBuffer());
      } catch { failed++; continue; }
      const ct = mime.lookup(path) || "application/octet-stream";
      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURI("uploads/" + rel)}`, {
        method: "POST",
        headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": ct, "x-upsert": "true" },
        body: buf,
      });
      if (up.ok) recovered++; else { failed++; if (failed <= 5) console.error("upload fail:", path, up.status, (await up.text()).slice(0, 120)); }
      if (i % 20 === 0) process.stdout.write(`\r  ${i}/${paths.size} (שוחזרו ${recovered})`);
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`\nשוחזרו: ${recovered} | כבר היו ב-storage: ${already} | אבדו (404 ב-WP): ${gone} | כשלו: ${failed}`);
  console.log("כעת הרץ:  APPLY=true node scripts/rewrite-content-urls.mjs   כדי למפות את הכתובות.");
}
main();
