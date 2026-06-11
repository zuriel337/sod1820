// מיפוי כתובות מדיה עם שם עברי (wp-content) → שם המתועתק שלהן ב-Supabase storage.
// כלי המיגרציה תיעתק שמות עבריים לאנגלית (עיצורי, ללא ניקוד): המספר→hmspr, חללית→chllyt וכו'.
// כאן משחזרים את התעתוק, מאמתים מול הקובץ האמיתי ב-storage, ומחליפים *רק* התאמות מאומתות.
//
// 🛡️ בטוח: כתובת שלא נמצא לה קובץ קיים ב-storage — נשארת ללא שינוי (בלי נסיגה).
// ברירת מחדל: DRY-RUN. הרצה אמיתית:  APPLY=true node scripts/rewrite-hebrew-media.mjs
// משתני סביבה: SUPABASE_URL, SUPABASE_SERVICE_KEY (חובה), BUCKET (ברירת מחדל "media").

const SUPABASE_URL = process.env.SUPABASE_URL || "https://linswmnnkjxvweumprav.supabase.co";
const SVC          = process.env.SUPABASE_SERVICE_KEY;
const BUCKET       = process.env.BUCKET || "media";
const APPLY        = process.env.APPLY === "true";
if (!SVC) { console.error("חסר SUPABASE_SERVICE_KEY"); process.exit(1); }

const PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const REST = (path, opts = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json", ...(opts.headers || {}) } });

const MAP = {'א':'a','ב':'b','ג':'g','ד':'d','ה':'h','ו':'v','ז':'z','ח':'ch','ט':'t','י':'y','כ':'k','ך':'k','ל':'l','מ':'m','ם':'m','נ':'n','ן':'n','ס':'s','ע':'a','פ':'p','ף':'p','צ':'tz','ץ':'tz','ק':'k','ר':'r','ש':'sh','ת':'t'};
const hasHebrew = (s) => /[֐-׿]/.test(s);
function translitBase(name) {
  let s = name.replace(/[‎‏‪-‮]/g, "").replace(/[֑-ׇ]/g, "");
  let o = ""; for (const ch of s) o += (MAP[ch] !== undefined) ? MAP[ch] : (/[A-Za-z0-9.]/.test(ch) ? ch.toLowerCase() : "-");
  return o.replace(/-+/g, "-").replace(/^-|-$/g, "");
}

// — storage helpers —
const headCache = new Map();
async function exists(path) {
  if (headCache.has(path)) return headCache.get(path);
  let ok = false;
  try { ok = (await fetch(PUBLIC_BASE + encodeURI(path), { method: "HEAD" })).status === 200; } catch {}
  headCache.set(path, ok); return ok;
}
const listCache = new Map();
async function listFolder(folder) {
  if (listCache.has(folder)) return listCache.get(folder);
  let all = [], offset = 0;
  for (;;) {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, { method: "POST", headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" }, body: JSON.stringify({ prefix: `${folder}/`, limit: 100, offset, sortBy: { column: "name", order: "asc" } }) });
    const d = await r.json(); if (!Array.isArray(d) || !d.length) break;
    all.push(...d.map(f => f.name)); if (d.length < 100) break; offset += 100;
  }
  listCache.set(folder, all); return all;
}

// מחזיר את שם הקובץ ב-storage עבור קובץ עברי, או null אם לא נמצא
async function resolveStorageName(folder, file) {
  const dot = file.lastIndexOf("."); const ext = dot >= 0 ? file.slice(dot).toLowerCase() : "";
  const base = translitBase(dot >= 0 ? file.slice(0, dot) : file);
  if (await exists(`${folder}/${base}${ext}`)) return `${base}${ext}`;          // התאמה מדויקת
  const files = await listFolder(folder);                                        // התאמה גמישה (סיומת/גודל)
  const cand = files.find(n => n.replace(/\.[^.]+$/, "").replace(/-\d+x\d+$/, "").replace(/-scaled$/, "") === base);
  return cand || null;
}

const URL_RE = /(?:https?:)?\/\/(?:www\.)?sod1820\.co\.il\/wp-content\/uploads\/(\d{4}\/\d{2})\/([^\s"'<>)\\]+)/g;

async function main() {
  // שלב 1: איסוף כל הפוסטים
  const rows = [];
  for (let from = 0; ; from += 500) {
    const r = await REST(`posts?select=id,content,excerpt&limit=500&offset=${from}`);
    const d = await r.json(); if (!Array.isArray(d) || !d.length) break;
    rows.push(...d); if (d.length < 500) break;
  }
  // שלב 2: איסוף כל כתובות-המקור הייחודיות (raw) עם שם עברי
  const rawUrls = new Set();
  for (const p of rows) for (const f of [p.content, p.excerpt]) {
    if (typeof f !== "string") continue; let m; URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(f)) !== null) { if (hasHebrew(decodeURIComponent(m[2]))) rawUrls.add(m[0]); }
  }
  console.log(`כתובות מדיה עבריות ייחודיות: ${rawUrls.size} — פותר מול storage...`);
  // שלב 3: בניית מפת החלפה raw→new (רק מאומתים) — במקביל
  const map = new Map(); let resolved = 0, i = 0;
  const rawList = [...rawUrls];
  async function worker() {
    while (rawList.length) {
      const raw = rawList.shift();
      const mm = raw.match(/uploads\/(\d{4}\/\d{2})\/([^\s"'<>)\\]+)/);
      if (!mm) continue;
      const folder = "uploads/" + mm[1];                       // ← כולל uploads/
      const file = decodeURIComponent(mm[2].replace(/[?#].*$/, ""));
      const name = await resolveStorageName(folder, file);
      if (name) { map.set(raw, `${PUBLIC_BASE}${folder}/${encodeURI(name)}`); resolved++; }
      if (++i % 40 === 0) process.stdout.write(`\r  ${i}/${rawUrls.size}`);
    }
  }
  await Promise.all(Array.from({ length: 12 }, worker));
  console.log(`\nנפתרו ${resolved}/${rawUrls.size}; ללא קובץ ב-storage: ${rawUrls.size - resolved} (יישארו ללא שינוי).`);
  // שלב 4: החלפה בפוסטים
  let changed = 0, updated = 0;
  const apply = (s) => { if (typeof s !== "string") return s; let out = s; for (const [oldU, newU] of map) if (out.includes(oldU)) out = out.split(oldU).join(newU); return out; };
  for (const p of rows) {
    const content = apply(p.content), excerpt = apply(p.excerpt);
    if (content !== p.content || excerpt !== p.excerpt) {
      changed++;
      if (APPLY) { const r = await REST(`posts?id=eq.${p.id}`, { method: "PATCH", body: JSON.stringify({ content, excerpt }) }); if (r.ok) updated++; else console.error("fail id=" + p.id, r.status); }
    }
  }
  console.log(`${APPLY ? "APPLIED" : "DRY-RUN"} — ${changed} פוסטים עם החלפות${APPLY ? `; עודכנו ${updated}` : ""}.`);
  if (!APPLY) console.log("להרצה אמיתית:  APPLY=true node scripts/rewrite-hebrew-media.mjs");
}
main();
