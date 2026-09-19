// 📡 wa-channel-ingest — משקף ערוצי וואטסאפ → channel_updates.
// use_sender_name → credit=שם הכתב; capture_outgoing → כל הודעה שיוצאת מחשבון הבוט (ידנית או API). בוט-API=רזיאל·AI (source=ai); ידני=קרדיט המותג (source=auto).
// admin_only+admin_ids = allowlist. block_ids/block_names = חסימת שולחים. block_text = חסימת-תוכן לפי כיתוב/טקסט. dedup לפי ext_msg_id.
// poll_every_min = תדירות משיכה לכל קבוצה (last_run_at מתקדם רק במשיכה מוצלחת).
// quotedMessage = תגובה/reply (למשל תגובה על תמונה) — נקלטת כעדכון (טקסט התגובה; אם צורפה תמונה חדשה — נקלטת גם היא).
// 🔗 איחוד-זהות (20.7.2026): שם-שולח גולמי מוואטסאפ (למשל «אריאל ואצאפ») ממופה לשם התורם הקנוני לפי contributors.wa_names.
// G0: cron/internal invocation uses existing FB_ADMIN_KEY header; no static/query credential in source.
import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_KEY = (Deno.env.get("FB_ADMIN_KEY") || "").trim();
const CEIL = 60 * 60 * 30;
const STALE_RECOVERY_AFTER = 60 * 60;
const NORMAL_HISTORY_COUNT = 30;
const RECOVERY_HISTORY_COUNT = 1000;
const RECOVERY_BATCH = 10;
const RESEARCH_FIRST_CHANNELS = new Set(["torat-haremez", "gilui-yomi", "sfot-vheker"]);
const STORY_LIVE_CHANNELS = new Set(["or-geula"]);
const BUCKET = "gallery";
const MEDIA_DIR = "sod1820/broadcasts";
const MAX_MEDIA = 45 * 1024 * 1024;
const BOT_CREDIT = "רזיאל · AI";

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
let trace: any[] = [];

function isBlockedText(text: string, patterns: string[]): boolean {
  if (!patterns.length) return false;
  const hay = (text || "").replace(/\s+/g, " ").trim();
  if (!hay) return false;
  return patterns.some((p) => p && hay.includes(p));
}

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
function pickHistory<T>(v: any): { ok: boolean; rows: T[] } {
  if (Array.isArray(v)) return { ok: true, rows: v as T[] };
  if (Array.isArray(v?.result)) return { ok: true, rows: v.result as T[] };
  return { ok: false, rows: [] };
}
function channelStatus(channel: string): "live" | "private" {
  return STORY_LIVE_CHANNELS.has(channel) ? "live" : "private";
}

async function rehost(
  url: string,
  msgId: string,
  kind: "image" | "video",
  privateMedia: boolean,
  sourceTs: number,
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) { trace.push({ msgId, step: "fetch", status: res.status }); return null; }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > MAX_MEDIA) { trace.push({ msgId, step: "toobig", bytes: buf.byteLength }); return null; }
    const ct = res.headers.get("content-type") || (kind === "video" ? "video/mp4" : "image/jpeg");
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : ct.includes("webm") ? "webm" : ct.includes("video") ? "mp4" : "jpg";

    if (privateMedia) {
      const d = new Date(sourceTs * 1000);
      const yyyy = String(d.getUTCFullYear());
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const submissionId = crypto.randomUUID();
      const path = `sod1820/2029/unresolved/${yyyy}/${mm}/${submissionId}/${kind}/original.${ext}`;
      const up = await sb.storage.from("submission-inbox").upload(path, buf, { contentType: ct, upsert: false });
      if (up.error) { trace.push({ msgId, step: "private-upload", error: String(up.error.message || up.error) }); return null; }
      if (!up.data?.id) {
        trace.push({ msgId, step: "private-object-id", error: "missing_id" });
        return null;
      }
      // Supabase Storage upload returns an object id. Persist only that opaque id, never a signed/private path.
      return `storage-object:${up.data.id}`;
    }

    const path = `${MEDIA_DIR}/${msgId}.${ext}`;
    const up = await sb.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true });
    if (up.error) { trace.push({ msgId, step: "upload", error: String(up.error.message || up.error) }); return null; }
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (e) { trace.push({ msgId, step: "throw", error: String(e) }); return null; }
}

async function ingestSource(src: any, nowSec: number, aliasMap: Map<string, string>): Promise<{ ingested: number; recoveryPending: boolean; recoveryBlocked: boolean; historyOk: boolean }> {
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
  const lastRunSec = src.last_run_at ? Date.parse(src.last_run_at) / 1000 : 0;
  const recovering = !lastRunSec || (nowSec - lastRunSec) > STALE_RECOVERY_AFTER;
  const historyCount = recovering ? RECOVERY_HISTORY_COUNT : NORMAL_HISTORY_COUNT;
  let n = 0, maxTs = minTs;
  let hist;
  try {
    hist = await waAdmin("getChatHistory", { chatId, count: historyCount }, "POST");
  } catch (e) {
    trace.push({ step: "hist-fail", channel: src.channel, error: String(e) });
    return { ingested: 0, recoveryPending: recovering, recoveryBlocked: false, historyOk: false };
  }

  const picked = pickHistory<Record<string, any>>(hist);
  if (!picked.ok) {
    trace.push({ step: "hist-invalid", channel: src.channel, response: String(hist?.result?.stateInstance || hist?.result?.error || "non_array") });
    return { ingested: 0, recoveryPending: recovering, recoveryBlocked: false, historyOk: false };
  }

  const msgs = picked.rows;
  const ordered = [...msgs].sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0));
  const gapRows = ordered.filter((m) => Number(m?.timestamp || 0) > minTs);
  const oldestTs = ordered.length ? Number(ordered[0]?.timestamp || 0) : 0;
  const recoveryBlocked = recovering
    && msgs.length >= historyCount
    && minTs > 0
    && oldestTs > minTs + 120;

  if (recoveryBlocked) {
    trace.push({ step: "recovery-window-saturated", channel: src.channel, historyCount, minTs, oldestTs });
    return { ingested: 0, recoveryPending: true, recoveryBlocked: true, historyOk: true };
  }

  const recoveryPending = recovering && gapRows.length > RECOVERY_BATCH;
  const batch = recoveryPending ? gapRows.slice(0, RECOVERY_BATCH) : gapRows;
  trace.push({
    step: "hist",
    channel: src.channel,
    count: msgs.length,
    eligible: gapRows.length,
    batch: batch.length,
    minTs,
    recovering,
    recoveryPending,
  });

  for (const m of batch) {
    const msgId = m.idMessage;
    const ts = Number(m.timestamp || 0);
    const typ = m.typeMessage || "";
    const senderId = m.senderId || "";
    const senderName = m.senderName || "";
    const outgoing = m.type === "outgoing";
    if (!msgId || !ts) continue;
    if (ts <= minTs || (!recovering && (nowSec - ts) > CEIL)) continue;

    // The checkpoint advances across intentionally ignored message types too, but only inside
    // the bounded oldest-first recovery batch, so no unseen gap can be skipped.
    if (ts > maxTs) maxTs = ts;
    if (!["textMessage", "extendedTextMessage", "imageMessage", "videoMessage", "quotedMessage"].includes(typ)) continue;

    if (outgoing) {
      if (!captureOutgoing) continue;
    } else {
      if (adminOnly && admins.length && !admins.includes(senderId)) continue;
      if (blockIds.length && blockIds.includes(senderId)) continue;
      if (blockNames.length && blockNames.some((bn) => senderName.includes(bn))) continue;
    }

    const { data: dup } = await sb.from("channel_updates").select("id").eq("ext_msg_id", msgId).maybeSingle();
    if (dup) continue;

    const mime = m.mimeType || m.fileMessageData?.mimeType || "";
    const isImg = typ === "imageMessage" || mime.startsWith("image");
    const isVid = typ === "videoMessage" || mime.startsWith("video");
    const caption = m.caption || m.fileMessageData?.caption || "";
    const bodyText = m.textMessage || m.extendedTextMessage?.text || caption || "";

    if (isBlockedText(bodyText, blockText)) {
      trace.push({ msgId, step: "blocked-text", channel: src.channel });
      continue;
    }

    let imageUrl: string | null = null;
    if (isImg || isVid) {
      let dl = m.downloadUrl || m.fileMessageData?.downloadUrl || "";
      if (!dl) {
        try {
          const d = await waAdmin("downloadFile", { chatId, idMessage: msgId }, "POST");
          dl = d?.result?.downloadUrl || d?.downloadUrl || "";
        } catch { /* noop */ }
      }
      if (dl) imageUrl = await rehost(
        dl,
        msgId,
        isVid ? "video" : "image",
        channelStatus(src.channel) === "private",
        ts,
      );
    }

    if (!bodyText && !imageUrl) continue;
    const text = bodyText || (isVid ? "🎬 עדכון וידאו" : "📷 עדכון");
    const isBotApi = outgoing && !!m.sendByApi;
    const rawCredit = isBotApi
      ? BOT_CREDIT
      : (outgoing ? brandCredit : (useSenderName ? (senderName || brandCredit) : brandCredit));
    const credit = isBotApi ? rawCredit : canonicalCredit(rawCredit, aliasMap);
    const source = isBotApi ? "ai" : "auto";

    const ins = await sb.from("channel_updates").insert({
      channel: src.channel,
      text,
      image_url: imageUrl,
      source,
      credit,
      priority: src.priority ?? 50,
      status: channelStatus(src.channel),
      ext_msg_id: msgId,
      created_at: new Date(ts * 1000).toISOString(),
    });
    if (ins.error) trace.push({ msgId, step: "insert-fail", error: String(ins.error.message || ins.error) });
    else n++;
  }

  const upd: Record<string, unknown> = {};
  if (maxTs > minTs) upd.min_ts = maxTs - 120;
  // last_run_at means successful provider poll, including a valid empty history. During bounded
  // recovery we intentionally keep it stale until the whole known gap has been consumed.
  if (!recoveryPending) upd.last_run_at = new Date(nowSec * 1000).toISOString();
  if (Object.keys(upd).length) await sb.from("channel_ingest_sources").update(upd).eq("id", src.id);
  return { ingested: n, recoveryPending, recoveryBlocked: false, historyOk: true };
}

Deno.serve(async (req) => {
  if (!ADMIN_KEY) return new Response("not configured", { status: 503 });
  if (req.headers.get("x-fb-admin-key") !== ADMIN_KEY) return new Response("forbidden", { status: 403 });
  const u = new URL(req.url);
  trace = [];
  const nowSec = Date.now() / 1000;
  const force = u.searchParams.get("force") === "1";
  const aliasMap = await loadAliasMap();
  const { data: sources } = await sb.from("channel_ingest_sources").select("*").eq("enabled", true);
  let ingested = 0;
  let recoveryPending = 0;
  let recoveryBlocked = 0;
  let pollFailures = 0;
  for (const src of (sources || [])) {
    const every = Number(src.poll_every_min ?? 5);
    const last = src.last_run_at ? Date.parse(src.last_run_at) / 1000 : 0;
    if (!force && last && (nowSec - last) < every * 60 - 10) {
      trace.push({ step: "skip", channel: src.channel, every });
      continue;
    }
    try {
      const r = await ingestSource(src, nowSec, aliasMap);
      ingested += r.ingested;
      if (r.recoveryPending) recoveryPending++;
      if (r.recoveryBlocked) recoveryBlocked++;
      if (!r.historyOk) pollFailures++;
    } catch (e) {
      pollFailures++;
      trace.push({ step: "src-throw", channel: src.channel, error: String(e) });
    }
  }
  const body: any = { ingested, aliases: aliasMap.size, recoveryPending, recoveryBlocked, pollFailures };
  if (u.searchParams.get("debug") === "1") body.trace = trace;
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
});
