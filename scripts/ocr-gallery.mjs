#!/usr/bin/env node
/**
 * ocr-gallery.mjs — OCR עשיר לתמונות הגלריה עם Claude Vision.
 *
 * לכל תמונה ממתינה ב-gallery_images: מוריד, שולח ל-Claude, ומחזיר JSON עם:
 *   text, numbers, category, is_news, country, source, topic, people, language, summary
 * ושומר ל-ocr_text / ocr_numbers / ocr_meta (jsonb) / ocr_status='done'.
 *
 * אין תלות חיצונית (Node 18+ עם fetch מובנה). idempotent — מדלג על מה שכבר done.
 *
 * מפתחות (env, או מקובץ בתיקייה — חסין-הדבקה, בלי גרשיים):
 *   ANTHROPIC_API_KEY   או קובץ .anthropic_key
 *   SUPABASE_SERVICE_KEY (service_role!) או קובץ .service_key
 *
 * הרצה (ב-Codespace, מתוך תיקיית הריפו):
 *   node scripts/ocr-gallery.mjs            # רץ עד שמסיים את כל הממתינים
 *   node scripts/ocr-gallery.mjs --retry    # כולל גם כאלה שנכשלו (error)
 *   LIMIT=50 node scripts/ocr-gallery.mjs   # רק 50 (לבדיקה)
 */
import fs from "fs";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://linswmnnkjxvweumprav.supabase.co";
const MODEL = process.env.OCR_MODEL || "claude-sonnet-4-6";
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const PAGE = Number(process.env.PAGE || 20);
const MAX_TOTAL = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;
const RETRY = process.argv.includes("--retry");
const MAX_BYTES = 4_800_000; // מגבלת base64 של Anthropic ~5MB

function readKey(envName, file) {
  let k = process.env[envName];
  if (!k) { try { k = fs.readFileSync(file, "utf8").trim(); } catch { /* none */ } }
  return k;
}
const ANTHROPIC_KEY = readKey("ANTHROPIC_API_KEY", ".anthropic_key");
const SERVICE_KEY = readKey("SUPABASE_SERVICE_KEY", ".service_key");
if (!ANTHROPIC_KEY) { console.error("חסר ANTHROPIC_API_KEY (env או קובץ .anthropic_key)"); process.exit(1); }
if (!SERVICE_KEY) { console.error("חסר SUPABASE_SERVICE_KEY (service_role — env או קובץ .service_key)"); process.exit(1); }

const sbHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

const mediaType = (url) => {
  const u = url.toLowerCase().split("?")[0];
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
};

const PROMPT = [
  "נתח את התמונה והחזר אך ורק JSON תקין (ללא Markdown) עם השדות הבאים:",
  "text: תעתוק מדויק של כל הטקסט בתמונה (עברית/אנגלית), שורה אחר שורה.",
  "numbers: מערך כל המספרים השלמים שמופיעים כספרות (ללא חישוב).",
  "category: סוג התמונה — אחד מ: news_screenshot, document, portrait, car, map, gematria_chart, building, nature, event_photo, meme, social_post, video_frame, weapon, money, religious, other.",
  "is_news: true/false — האם זו ידיעה או צילום מסך חדשותי.",
  "country: שם המדינה הרלוונטית בתמונה בעברית (למשל סין, איראן, ארהב, ישראל), אחרת null.",
  "source: שם מקור החדשות/הפרסום אם מזוהה (ערוץ/אתר/רשת חברתית), אחרת null.",
  "topic: נושא קצר בעברית (2-5 מילים).",
  "people: מערך שמות אנשים שמופיעים או מוזכרים.",
  "gematria_word: אם זו תמונה ממחשבון/תוכנת גימטריה — המילה או הביטוי העברי המרכזי שמחושב; אחרת null.",
  "language: שפת הטקסט הראשית (עברית/אנגלית/אחר).",
  "summary: תיאור קצר במשפט אחד מה רואים בתמונה.",
].join("\n");

async function fetchJson(url, opts, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, opts);
      if (r.status === 429 || r.status === 529 || r.status >= 500) { await sleep(1000 * 2 ** i); continue; }
      return r;
    } catch (e) { if (i === tries - 1) throw e; await sleep(1000 * 2 ** i); }
  }
  throw new Error("retries exhausted");
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function analyze(imageUrl) {
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error(`fetch image ${imgResp.status}`);
  const buf = Buffer.from(await imgResp.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error(`too_large ${(buf.length / 1048576).toFixed(1)}MB`);
  const b64 = buf.toString("base64");
  const r = await fetchJson("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1800,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mediaType(imageUrl), data: b64 } },
        { type: "text", text: PROMPT },
      ] }],
    }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  const raw = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
  const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  let o = {};
  try { o = JSON.parse(clean); } catch { o = { text: clean }; }
  const numbers = Array.isArray(o.numbers)
    ? [...new Set(o.numbers.map((n) => parseInt(n, 10)).filter((n) => Number.isInteger(n) && n >= 0 && n < 100000))]
    : [];
  const meta = {
    category: o.category ?? null, is_news: o.is_news ?? null, country: o.country ?? null,
    source: o.source ?? null, topic: o.topic ?? null,
    people: Array.isArray(o.people) ? o.people.slice(0, 20) : [],
    gematria_word: o.gematria_word ?? null,
    language: o.language ?? null, summary: o.summary ?? null,
  };
  return { text: typeof o.text === "string" ? o.text : "", numbers, meta };
}

async function patch(id, body) {
  const r = await fetchJson(`${SUPABASE_URL}/rest/v1/gallery_images?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...sbHeaders, "content-type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

async function nextPage() {
  // בוחר כל תמונה שעדיין חסר לה הסיווג העשיר (ocr_meta) — כולל כאלה שכבר נסרקו לטקסט בלבד.
  // עם --retry: גם כאלה שכבר יש להן meta (סריקה חוזרת מלאה).
  const filter = RETRY ? "" : "&ocr_meta=is.null";
  const url = `${SUPABASE_URL}/rest/v1/gallery_images?image_url=not.is.null${filter}&select=id,image_url&limit=${PAGE}`;
  const r = await fetch(url, { headers: sbHeaders });
  if (!r.ok) throw new Error(`select ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return await r.json();
}

let done = 0, errors = 0, processed = 0;

async function handle(row) {
  try {
    const { text, numbers, meta } = await analyze(row.image_url);
    await patch(row.id, { ocr_text: text, ocr_numbers: numbers, ocr_meta: meta, ocr_status: "done", ocr_at: new Date().toISOString() });
    done++;
    const tag = meta.category + (meta.country ? `/${meta.country}` : "") + (numbers.length ? ` [${numbers.slice(0, 4).join(",")}]` : "");
    console.log(`OK  ${tag}  ${row.image_url.split("/").pop()}`);
  } catch (e) {
    errors++;
    try { await patch(row.id, { ocr_status: "error", ocr_text: String(e).slice(0, 400), ocr_at: new Date().toISOString() }); } catch { /* ignore */ }
    console.warn(`ERR ${row.image_url.split("/").pop()} — ${String(e).slice(0, 120)}`);
  }
}

async function main() {
  console.log(`OCR עשיר מתחיל (model=${MODEL}, conc=${CONCURRENCY})...`);
  while (processed < MAX_TOTAL) {
    const rows = await nextPage();
    if (!rows.length) break;
    for (let i = 0; i < rows.length && processed < MAX_TOTAL; i += CONCURRENCY) {
      const chunk = rows.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(handle));
      processed += chunk.length;
      if (processed % 20 === 0 || processed >= MAX_TOTAL) console.log(`— התקדמות: ${done} done, ${errors} errors (סה"כ עובדו ${processed})`);
    }
  }
  console.log(`\nסיום. done=${done} errors=${errors} processed=${processed}`);
}
main().catch((e) => { console.error("נכשל:", e.message); process.exit(1); });
