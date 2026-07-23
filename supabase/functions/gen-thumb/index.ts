// gen-thumb v3 — פתרון-שורש להקטנת תמונות: thumbnail סטטי פעם אחת (ImageScript).
// כללי: עובד על gallery_images (ברירת-מחדל) · posts · channel_updates — לפי ?table=.
// חכם: שומרים thumb רק אם הוא אמתית קטן יותר מהמקור; אחרת thumb_url=המקור (כבר קטן).
// כך כל שורה מקבלת thumb_url עם הקובץ הקטן ביותר — הפיד מגיש אותו ישירות (אפס Image Transformation).
// חשוב: ה-backfill מושך את המקור מ-object/public ומקטין מקומית (ImageScript) — לא צורך טרנספורמציות. guard ב-?s=.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SECRET = "s0d1820wahook_7yq2c9";
const WIDTH = 480;
const QUALITY = 72;
const DEFAULT_N = 20;
const MAX_BYTES = 12 * 1024 * 1024;

// טבלאות מותרות + הקידומת בתיקיית _thumb (namespacing כדי שמזהי-שורה מטבלאות שונות לא יתנגשו).
const TABLES: Record<string, string> = {
  gallery_images: "_thumb/",   // קיים — uuid, נשמר כמו שהוא
  posts: "_thumb/p/",          // bigint
  channel_updates: "_thumb/c/", // uuid
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.get("s") !== SECRET) return json({ error: "forbidden" }, 403);
  const table = url.searchParams.get("table") || "gallery_images";
  const prefix = TABLES[table];
  if (!prefix) return json({ error: "bad_table", allowed: Object.keys(TABLES) }, 400);
  const n = Math.min(60, Math.max(1, parseInt(url.searchParams.get("n") || "") || DEFAULT_N));
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: rows, error } = await admin
    .from(table).select("id,image_url")
    .is("thumb_url", null)
    .like("image_url", "%/storage/v1/object/public/%")
    .limit(n);
  if (error) return json({ error: "query", detail: error.message }, 500);

  let stored = 0, keptOriginal = 0, skipped = 0; const errs: string[] = [];
  for (const row of (rows || [])) {
    try {
      const src: string = row.image_url;
      if (!/\.(jpe?g|png)(\?|$)/i.test(src)) { skipped++; continue; }
      const resp = await fetch(src);
      if (!resp.ok) { skipped++; errs.push(`fetch_${resp.status}`); continue; }
      const buf = new Uint8Array(await resp.arrayBuffer());
      if (buf.byteLength > MAX_BYTES) { skipped++; errs.push("too_big"); continue; }
      const img = await Image.decode(buf);
      if (img.width > WIDTH) img.resize(WIDTH, Image.RESIZE_AUTO);
      const out = await img.encodeJPEG(QUALITY);
      // חכם: רק אם ה-thumb קטן משמעותית (≤85%) — אחרת המקור כבר קטן, מגישים אותו.
      if (out.byteLength >= buf.byteLength * 0.85) {
        await admin.from(table).update({ thumb_url: src }).eq("id", row.id);
        keptOriginal++; continue;
      }
      const path = `${prefix}${row.id}.jpg`;
      const up = await admin.storage.from("media").upload(path, out, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
      if (up.error) { skipped++; errs.push("upload:" + up.error.message.slice(0, 30)); continue; }
      const pub = `${SUPABASE_URL}/storage/v1/object/public/media/${path}`;
      await admin.from(table).update({ thumb_url: pub }).eq("id", row.id);
      stored++;
    } catch (e) { skipped++; errs.push(String(e).slice(0, 40)); }
  }

  const { count: remaining } = await admin.from(table).select("id", { count: "exact", head: true }).is("thumb_url", null).like("image_url", "%/storage/v1/object/public/%");
  return json({ ok: true, table, batch: (rows || []).length, stored, keptOriginal, skipped, remaining, errs: errs.slice(0, 6) });
});
