// 📡 wa-channel-ingest — משקף ערוצי וואטסאפ → channel_updates.
// use_sender_name → credit=שם הכתב; capture_outgoing → כל הודעה שיוצאת מחשבון הבוט (ידנית או API). בוט-API=רזיאל·AI (source=ai); ידני=קרדיט המותג (source=auto).
// admin_only+admin_ids = allowlist. block_ids/block_names = חסימת שולחים. block_text = חסימת-תוכן לפי כיתוב/טקסט. dedup לפי ext_msg_id.
// poll_every_min = תדירות משיכה לכל קבוצה (last_run_at מתקדם רק במשיכה מוצלחת).
// quotedMessage = תגובה/reply (למשל תגובה על תמונה) — נקלטת כעדכון (טקסט התגובה; אם צורפה תמונה חדשה — נקלטת גם היא).
// 🔗 איחוד-זהות (20.7.2026): שם-שולח גולמי מוואטסאפ (למשל «אריאל ואצאפ») ממופה לשם התורם הקנוני לפי contributors.wa_names.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const CEIL = 60 * 60 * 30;
const BUCKET = "gallery";
const MEDIA_DIR = "sod1820/broadcasts";
const MAX_MEDIA = 45 * 1024 * 1024;
const BOT_CREDIT = "רזיאל · AI";

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
let trace: any[] = [];

// 🚫 סינון-תוכן לפי טקסט — הודעה שהכיתוב/טקסט שלה מכיל אחד מהביטויים החסומים לא נקלטת כלל (ולא מורידים לה מדיה = חוסך Egress).
// דאטה-דריבן דרך channel_ingest_sources.block_text (כמו block_names/block_ids). למשל: חסימת סרטוני «עובדיה יוסף» מאור הגאולה.
function isBlockedText(text: string, patterns: string[]): boolean {
  if (!patterns.length) return false;
  const hay = (text || "").replace(/\s+/g, " ").trim();
  if (!hay) return false;
  return patterns.some((p) => p && hay.includes(p));
}

// 🔗 canonicalization — ממפה שם-שולח גולמי מוואטסאפ (alias) לשם התורם הקנוני לפי contributors.wa_names.
// כך זהות אחת (למשל אריאל) לא מתפצלת בין «אריאל» ל«אריאל ואצאפ» בקרדיטים.
async function loadAliasMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const { data } = await sb.from("contributors").select("display_name, wa_names").not("wa_names", "is", null);
    for (const c of (data || [])) {
      const dn = (c as any).display_name;
      for (const alias of (((c as any).wa_names) || [])) {
        const a = String(alias || "").trim();
        if (a && dn) map.set(a, dn);
      }
    }
  } catch (e) { trace.push({ step: "alias-map-fail", error: String(e) }); }
  return map;
}
function canonicalCredit(name: string | null, aliasMap: Map<string, string>): string | null {
  if (!name) return name;
  return aliasMap.get(String(name).trim()) || name;
}

async function waAdmin(method: string, payload: unknown, http: string) {
  const { data } = await sb.rpc("wa_admin", { p_method: method, p_payload: payload, p_http: http });
  return data;
}
function pick<T>(v: any): T[] { return (Array.isArray(v) ? v : (v?.result ?? [])) as T[]; }

async function rehost(url: string, msgId: string, kind: "image" | "video"): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) { trace.push({ msgId, step: "fetch", status: res.status }); return null; }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > MAX_MEDIA) { trace.push({ msgId, step: "toobig", bytes: buf.byteLength }); return null; }
    const ct = res.headers.get("content-type") || (kind === "video" ? "video/mp4" : "image/jpeg");
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : ct.includes("webm") ? "webm" : ct.includes("video") ? "mp4" : "jpg";
    const path = `${MEDIA_DIR}/${msgId}.${ext}`;
    const up = await sb.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true });
    if (up.error) { trace.push({ msgId, step: "upload", error: String(up.error.message || up.error) }); return null; }
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (e) { trace.push({ msgId, step: "throw", error: String(e) }); return null; }
}

async function ingestSource(src: any, nowSec: number, aliasMap: Map<string, string>): Promise<number> {
  const chatId: string = src.chat_id;
  const adminOnly: boolean = src.admin_only;
  const admins: string[] = src.admin_ids || [];
  const blockIds: string[] = src.block_ids || [];
  const blockNames: string[] = src.block_names || [];
  const blockText: string[] = (src.block_text || []).map((s: string) => String(s || "").trim()).filter(Boolean);
  const minTs: number = Number(src.min_ts || 0);
  const brandCredit: string = src.display_name || src.label || null;
  const useSenderName: boolean = src.use_sender_name === true;
  const captureOutgoing: boolean = src.capture_outgoing === true;
  let n = 0, maxTs = minTs;
  let hist;
  try { hist = await waAdmin("getChatHistory", { chatId, count: 30 }, "POST"); } catch (e) { trace.push({ step: "hist-fail", error: String(e) }); return 0; }
  const msgs = pick<Record<string, any>>(hist);
  const polled = msgs.length > 0;
  trace.push({ step: "hist", channel: src.channel, count: msgs.length, minTs });

  for (const m of msgs) {
    const msgId = m.idMessage;
    const ts = Number(m.timestamp || 0);
    const typ = m.typeMessage || "";
    const senderId = m.senderId || "";
    const senderName = m.senderName || "";
    const outgoing = m.type === "outgoing";
    if (!msgId || !ts) continue;
    if (ts <= minTs || (nowSec - ts) > CEIL) continue;
    if (!["textMessage", "extendedTextMessage", "imageMessage", "videoMessage", "quotedMessage"].includes(typ)) continue;

    if (outgoing) {
      // 🛠️ 9.7.2026: קולטים כל הודעה שיוצאת מחשבון הבוט (גם ידנית — לא רק sendByApi). כך הודעה שצוריאל שולח דרך הבוט מופיעה בטיקר.
      if (!captureOutgoing) continue;
    } else {
      if (adminOnly && admins.length && !admins.includes(senderId)) continue;
      if (blockIds.length && blockIds.includes(senderId)) continue;
      if (blockNames.length && blockNames.some((bn) => senderName.includes(bn))) continue;
    }

    const { data: dup } = await sb.from("channel_updates").select("id").eq("ext_msg_id", msgId).maybeSingle();
    if (dup) { if (ts > maxTs) maxTs = ts; continue; }

    // זיהוי מדיה גם לפי mimeType (תגובה שמצרפת תמונה/וידאו חדשים = quotedMessage עם mimeType בראש)
    const mime = m.mimeType || m.fileMessageData?.mimeType || "";
    const isImg = typ === "imageMessage" || mime.startsWith("image");
    const isVid = typ === "videoMessage" || mime.startsWith("video");
    const caption = m.caption || m.fileMessageData?.caption || "";
    // extendedTextMessage.text מכסה גם את טקסט התגובה ב-quotedMessage
    const bodyText = m.textMessage || m.extendedTextMessage?.text || caption || "";

    // 🚫 חסימת-תוכן (block_text): הודעה שהטקסט/כיתוב שלה תואם ביטוי חסום — לא נקלטת (וגם לא מורידים מדיה = חוסך Egress).
    if (isBlockedText(bodyText, blockText)) {
      trace.push({ msgId, step: "blocked-text", channel: src.channel });
      if (ts > maxTs) maxTs = ts; // מתקדמים כדי לא לסרוק שוב
      continue;
    }

    let imageUrl: string | null = null;

    if (isImg || isVid) {
      let dl = m.downloadUrl || m.fileMessageData?.downloadUrl || "";
      if (!dl) { try { const d = await waAdmin("downloadFile", { chatId, idMessage: msgId }, "POST"); dl = d?.result?.downloadUrl || d?.downloadUrl || ""; } catch { /* noop */ } }
      if (dl) imageUrl = await rehost(dl, msgId, isVid ? "video" : "image");
    }

    if (!bodyText && !imageUrl) { if (ts > maxTs) maxTs = ts; continue; }
    const text = bodyText || (isVid ? "🎬 עדכון וידאו" : "📷 עדכון");
    // בוט ששולח דרך ה-API (מענה AI) = «רזיאל · AI». הודעה ידנית מחשבון הבוט (צוריאל) = קרדיט המותג.
    const isBotApi = outgoing && !!m.sendByApi;
    const rawCredit = isBotApi
      ? BOT_CREDIT
      : (outgoing ? brandCredit : (useSenderName ? (senderName || brandCredit) : brandCredit));
    // 🔗 איחוד-זהות: שם-שולח גולמי → שם-תורם קנוני (contributors.wa_names). קרדיט-בוט לא ממופה.
    const credit = isBotApi ? rawCredit : canonicalCredit(rawCredit, aliasMap);
    const source = isBotApi ? "ai" : "auto";

    const ins = await sb.from("channel_updates").insert({
      channel: src.channel, text, image_url: imageUrl, source,
      credit, priority: src.priority ?? 50,
      status: "live", ext_msg_id: msgId, created_at: new Date(ts * 1000).toISOString(),
    });
    if (ins.error) trace.push({ msgId, step: "insert-fail", error: String(ins.error.message || ins.error) });
    else { n++; if (ts > maxTs) maxTs = ts; }
  }
  const upd: Record<string, unknown> = {};
  if (maxTs > minTs) upd.min_ts = maxTs - 120;
  if (polled) upd.last_run_at = new Date(nowSec * 1000).toISOString();
  if (Object.keys(upd).length) await sb.from("channel_ingest_sources").update(upd).eq("id", src.id);
  return n;
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (u.searchParams.get("s") !== SECRET) return new Response("forbidden", { status: 403 });
  trace = [];
  const nowSec = Date.now() / 1000;
  const force = u.searchParams.get("force") === "1";
  const aliasMap = await loadAliasMap();
  const { data: sources } = await sb.from("channel_ingest_sources").select("*").eq("enabled", true);
  let ingested = 0;
  for (const src of (sources || [])) {
    const every = Number(src.poll_every_min ?? 3);
    const last = src.last_run_at ? Date.parse(src.last_run_at) / 1000 : 0;
    if (!force && last && (nowSec - last) < every * 60 - 10) { trace.push({ step: "skip", channel: src.channel, every }); continue; }
    try { ingested += await ingestSource(src, nowSec, aliasMap); } catch (e) { trace.push({ step: "src-throw", error: String(e) }); }
  }
  const body: any = { ingested, aliases: aliasMap.size };
  if (u.searchParams.get("debug") === "1") body.trace = trace;
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
});
