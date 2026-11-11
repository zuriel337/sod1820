// 📡 wa-channel-ingest — משקף ערוצי וואטסאפ → channel_updates.
// use_sender_name → credit=שם הכתב; capture_outgoing → כל הודעה שיוצאת מחשבון הבוט (ידנית או API).
// outgoing_contributor → זהות המחבר הקנונית להודעה ידנית היוצאת מהחשבון המחובר.
// בוט-API=רזיאל·AI (source=ai); ידני=outgoing_contributor או קרדיט המותג (source=auto).
// admin_only+admin_ids = allowlist. block_ids/block_names = חסימת שולחים. block_text = חסימת-תוכן לפי כיתוב/טקסט. dedup לפי ext_msg_id.
// poll_every_min = תדירות משיכה לכל קבוצה (last_run_at מתקדם רק במשיכה מוצלחת).
// quotedMessage = תגובה/reply (למשל תגובה על תמונה) — נקלטת כעדכון (טקסט התגובה; אם צורפה תמונה חדשה — נקלטת גם היא).
// 🔗 איחוד-זהות (20.7.2026): שם-שולח גולמי מוואטסאפ (למשל «אריאל ואצאפ») ממופה לשם התורם הקנוני לפי contributors.wa_names.
// G0: cron/internal invocation uses existing FB_ADMIN_KEY header; no static/query credential in source.
// 2029 media: every NEW public image, video and audio -> media/sod1820/2029/<kind>/YYYY/MM/<asset-id>/original.*, with a
// stable asset id derived from the message (no overwrite, no second copy on a repeated run); legacy URLs are never moved.
// Private media keeps submission-inbox semantics. Content type is taken from the bytes and must match the message kind.
// 📌 pin_ids (JIDs) + pin_hours in the registry (ZURIEL 11.11.2026): an incoming LIVE message whose senderId is listed gets
// pinned_until = message time + pin_hours. Identity is the sender number only, never the display name.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { waAdmin as waGreen } from "../_shared/waGreen.ts";
import { buildWriterIndex, resolveWriterContributorId } from "../_shared/waWriterIdentity.js";
import { WA_MEDIA_MAX_BYTES, waMessageMediaKind, waPublicMediaPath, waSniffMedia, waStableAssetId, waUploadAlreadyExists } from "../_shared/waMediaAsset.js";
import { waPinUntil } from "../_shared/waChannelPin.js";

const ADMIN_KEY = (Deno.env.get("FB_ADMIN_KEY") || "").trim();
const CEIL = 60 * 60 * 30;
const STALE_RECOVERY_AFTER = 60 * 60;
const NORMAL_HISTORY_COUNT = 30;
const RECOVERY_HISTORY_COUNT = 1000;
const RECOVERY_BATCH = 10;
// ZURIEL 11.11.2026: «הגילוי היומי» enters automatically like Or HaGeula (story/live at ingest); research intake keeps its own
// registry policy (channel_ingest_sources.intake_mode), so its research path does not change.
const RESEARCH_FIRST_CHANNELS = new Set(["torat-haremez", "sfot-vheker"]);
const STORY_LIVE_CHANNELS = new Set(["or-geula", "gilui-yomi"]);
const MEDIA_2029_BUCKET = "media";
const MAX_MEDIA = WA_MEDIA_MAX_BYTES;
const BOT_CREDIT = "רזיאל · AI";

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
let trace: any[] = [];

function isBlockedText(text: string, patterns: string[]): boolean {
  if (!patterns.length) return false;
  const hay = (text || "").replace(/\s+/g, " ").trim();
  if (!hay) return false;
  return patterns.some((p) => p && hay.includes(p));
}

type WriterIndex = Map<string, Set<string>>;
let writerIndex: WriterIndex = new Map();

async function loadAliasMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const { data } = await sb.from("contributors").select("id, display_name, wa_names").not("wa_names", "is", null);
    writerIndex = buildWriterIndex(data || []);
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
  const data = await waGreen(sb, method, payload, http);
  return data;
}

async function loadHistory(chatId: string, count: number) {
  let last: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      last = await waAdmin("getChatHistory", { chatId, count }, "POST");
      const picked = pickHistory<Record<string, any>>(last);
      if (picked.ok) return { ...picked, attempts: attempt, raw: last };
    } catch (e) {
      last = { ok: false, error: String(e) };
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
  }
  return { ok: false, rows: [] as Record<string, any>[], attempts: 3, raw: last };
}

function pickHistory<T>(v: any): { ok: boolean; rows: T[] } {
  if (Array.isArray(v)) return { ok: true, rows: v as T[] };
  if (Array.isArray(v?.result)) return { ok: true, rows: v.result as T[] };
  return { ok: false, rows: [] };
}
// Public source groups. ki-la-hamelucha-gematria joins ONLY the proof/flag path (code); its intake scope (admin_only) is a separate gated config change.
// blaze-888 is the value that was live in v33 (deployed outside the repo); both are kept so the repo and the deployed function match.
const WORLD_GROUP_CHANNELS = new Set(["torat-haremez", "gilui-yomi", "ki-la-hamelucha-gematria", "blaze-888"]);
function channelStatus(channel: string): "live" | "private" {
  return STORY_LIVE_CHANNELS.has(channel) ? "live" : "private";
}

function normalizeProviderMediaUrl(raw: string): string {
  const v = String(raw || "").trim();
  if (!v) return "";
  const lower = v.toLowerCase();
  const explicitHttpScheme = lower.startsWith("https://") || lower.startsWith("http://");
  let candidate = "";
  if (explicitHttpScheme) {
    candidate = v;
  } else if (v.startsWith("//")) {
    candidate = `https:${v}`;
  } else {
    const slash = v.indexOf("/");
    const authority = slash > 0 ? v.slice(0, slash) : "";
    if (!/^[a-z0-9.-]+(?::[0-9]+)?$/i.test(authority)) return "";
    candidate = `https://${v}`;
  }
  try {
    const u = new URL(candidate);
    if (!["http:", "https:"].includes(u.protocol) || !u.hostname) return "";
    if (!explicitHttpScheme) {
      const host = u.hostname.toLowerCase();
      if (host !== "digitaloceanspaces.com" && !host.endsWith(".digitaloceanspaces.com")) return "";
    }
    return u.toString();
  } catch {
    return "";
  }
}
async function rehost(
  url: string,
  msgId: string,
  kind: "image" | "video" | "audio",
  privateMedia: boolean,
  sourceTs: number,
  channel: string,
): Promise<string | null> {
  try {
    const normalizedUrl = normalizeProviderMediaUrl(url);
    if (!normalizedUrl) {
      trace.push({ msgId, step: "invalid-media-url" });
      return null;
    }
    const res = await fetch(normalizedUrl);
    if (!res.ok) { trace.push({ msgId, step: "fetch", status: res.status }); return null; }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > MAX_MEDIA) { trace.push({ msgId, step: "toobig", bytes: buf.byteLength }); return null; }
    const sniffed = waSniffMedia(buf, kind);
    if (!sniffed) { trace.push({ msgId, step: "media-type-rejected", kind, header: String(res.headers.get("content-type") || "").slice(0, 60) }); return null; }
    const ct = sniffed.contentType, ext = sniffed.ext;

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

    // Forward-only 2029 rule: every NEW public image, video and audio receives one immutable asset UUID, stable per message
    // (UUID v5 over channel + message id). Existing broadcasts stay on their legacy URLs; no migration/copy happens here.
    // upsert:false never overwrites; an object that already exists for this message is the same asset and is reused.
    const assetId = await waStableAssetId(channel, msgId);
    const path = waPublicMediaPath(kind, assetId, sourceTs, ext);
    const up = await sb.storage.from(MEDIA_2029_BUCKET).upload(path, buf, { contentType: ct, upsert: false });
    if (up.error && !waUploadAlreadyExists(up.error)) { trace.push({ msgId, step: `${kind}-2029-upload`, error: String(up.error.message || up.error) }); return null; }
    trace.push({ msgId, step: up.error ? `${kind}-2029-existing` : `${kind}-2029-uploaded`, assetId });
    return sb.storage.from(MEDIA_2029_BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (e) { trace.push({ msgId, step: "throw", error: String(e) }); return null; }
}

async function ingestSource(
  src: any,
  nowSec: number,
  aliasMap: Map<string, string>,
  targetMessageId = "",
): Promise<{ ingested: number; recoveryPending: boolean; recoveryBlocked: boolean; historyOk: boolean }> {
  const chatId: string = src.chat_id;
  const adminOnly: boolean = src.admin_only;
  const admins: string[] = src.admin_ids || [];
  const blockIds: string[] = src.block_ids || [];
  const blockNames: string[] = src.block_names || [];
  const blockText: string[] = (src.block_text || []).map((s: string) => String(s || "").trim()).filter(Boolean);
  const minTs: number = Number(src.min_ts || 0);
  const brandCredit: string = src.display_name || src.label || null;
  const outgoingContributor: string | null = String(src.outgoing_contributor || "").trim() || null;
  const useSenderName: boolean = src.use_sender_name === true;
  const captureOutgoing: boolean = src.capture_outgoing === true;
  const lastRunSec = src.last_run_at ? Date.parse(src.last_run_at) / 1000 : 0;
  const targeted = !!targetMessageId;
  const recovering = !lastRunSec || (nowSec - lastRunSec) > STALE_RECOVERY_AFTER;
  const historyCount = targeted ? RECOVERY_HISTORY_COUNT : (recovering ? RECOVERY_HISTORY_COUNT : NORMAL_HISTORY_COUNT);
  let n = 0, maxTs = minTs;
  const history = await loadHistory(chatId, historyCount);
  if (!history.ok) {
    const raw = history.raw as any;
    trace.push({
      step: "hist-invalid",
      channel: src.channel,
      attempts: history.attempts,
      response: String(raw?.result?.stateInstance || raw?.result?.error || raw?.error || "non_array"),
    });
    return { ingested: 0, recoveryPending: recovering, recoveryBlocked: false, historyOk: false };
  }

  const msgs = history.rows;
  const ordered = [...msgs].sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0));
  const gapRows = targeted
    ? ordered.filter((m) => String(m?.idMessage || "") === targetMessageId)
    : ordered.filter((m) => Number(m?.timestamp || 0) > minTs);
  const oldestTs = ordered.length ? Number(ordered[0]?.timestamp || 0) : 0;
  const recoveryBlocked = !targeted
    && recovering
    && msgs.length >= historyCount
    && minTs > 0
    && oldestTs > minTs + 120;

  if (recoveryBlocked) {
    trace.push({ step: "recovery-window-saturated", channel: src.channel, historyCount, minTs, oldestTs });
    return { ingested: 0, recoveryPending: true, recoveryBlocked: true, historyOk: true };
  }

  const recoveryPending = !targeted && recovering && gapRows.length > RECOVERY_BATCH;
  const batch = targeted ? gapRows : (recoveryPending ? gapRows.slice(0, RECOVERY_BATCH) : gapRows);
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
    if (!targeted && (ts <= minTs || (!recovering && (nowSec - ts) > CEIL))) continue;

    // Targeted repair is source-local and never advances checkpoints.
    if (!targeted && ts > maxTs) maxTs = ts;
    if (!["textMessage", "extendedTextMessage", "imageMessage", "videoMessage", "audioMessage", "quotedMessage"].includes(typ)) continue;

    if (outgoing) {
      if (!captureOutgoing) continue;
    } else {
      if (adminOnly && admins.length && !admins.includes(senderId)) continue;
      if (blockIds.length && blockIds.includes(senderId)) continue;
      if (blockNames.length && blockNames.some((bn) => senderName.includes(bn))) continue;
    }

    const { data: dup } = await sb.from("channel_updates").select("id,image_url").eq("ext_msg_id", msgId).maybeSingle();
    if (dup && !targeted) continue;

    const mime = m.mimeType || m.fileMessageData?.mimeType || "";
    const mediaKind = waMessageMediaKind(typ, mime);
    const isImg = mediaKind === "image";
    const isVid = mediaKind === "video";
    const isAud = mediaKind === "audio";
    const caption = m.caption || m.fileMessageData?.caption || "";
    const bodyText = m.textMessage || m.extendedTextMessage?.text || caption || "";

    if (isBlockedText(bodyText, blockText)) {
      trace.push({ msgId, step: "blocked-text", channel: src.channel });
      continue;
    }

    let imageUrl: string | null = null;
    if (isImg || isVid || isAud) {
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
        mediaKind as "image" | "video" | "audio",
        channelStatus(src.channel) === "private",
        ts,
        src.channel,
      );
    }

    if (dup) {
      if (targeted && imageUrl && !dup.image_url) {
        const { error: repairError } = await sb.from("channel_updates").update({ image_url: imageUrl }).eq("id", dup.id);
        if (repairError) trace.push({ msgId, step: "targeted-media-repair-fail", error: String(repairError.message || repairError) });
        else { n++; trace.push({ msgId, step: "targeted-media-repaired", channel: src.channel }); }
      } else {
        trace.push({ msgId, step: "targeted-duplicate-no-repair", channel: src.channel });
      }
      continue;
    }

    if (!bodyText && !imageUrl) continue;
    const text = bodyText || (isVid ? "🎬 עדכון וידאו" : isAud ? "🎧 הקלטה" : "📷 עדכון");
    const isBotApi = outgoing && !!m.sendByApi;
    const rawCredit = isBotApi
      ? BOT_CREDIT
      : (outgoing
        ? (outgoingContributor || brandCredit)
        : (useSenderName ? (senderName || brandCredit) : brandCredit));
    const credit = isBotApi ? rawCredit : canonicalCredit(rawCredit, aliasMap);
    const source = isBotApi ? "ai" : "auto";
    // Stable writer id only on an unambiguous human alias hit; bot/API, ambiguous and unmatched stay null.
    const contributorId = resolveWriterContributorId(rawCredit, writerIndex, { isBotApi });
    // A live (story) channel row is already a public publication: it never also enters the unverified group-source path,
    // so one message stays ONE public row (and its pin is not lost to a second representation).
    const groupIntake = WORLD_GROUP_CHANNELS.has(src.channel) && !STORY_LIVE_CHANNELS.has(src.channel) && !outgoing && !imageUrl && String(chatId).endsWith("@g.us");
    const pinnedUntil = waPinUntil(src, { senderId, outgoing, ts, status: channelStatus(src.channel) });
    if (pinnedUntil) trace.push({ msgId, step: "pinned", channel: src.channel, until: pinnedUntil });

    const ins = await sb.from("channel_updates").insert({
      channel: src.channel,
      text,
      image_url: imageUrl,
      source,
      credit,
      contributor_id: contributorId,
      group_source_intake_public: groupIntake,
      priority: src.priority ?? 50,
      status: channelStatus(src.channel),
      // Sent only when the row is pinned, so an unpinned insert never depends on the pinned_until column.
      ...(pinnedUntil ? { pinned_until: pinnedUntil } : {}),
      ext_msg_id: msgId,
      created_at: new Date(ts * 1000).toISOString(),
    }).select("id").single();
    if (ins.error) trace.push({ msgId, step: "insert-fail", error: String(ins.error.message || ins.error) });
    else {
      n++;
      // Positive group provenance (private side table). Identity comes ONLY from senderId (JID) -> contributors.phone,
      // never from senderName/credit. Any failure leaves the row without proof => excluded from public World reads.
      if (WORLD_GROUP_CHANNELS.has(src.channel) && !STORY_LIVE_CHANNELS.has(src.channel) && !outgoing && !imageUrl && String(chatId).endsWith("@g.us")) {
        const pr = await sb.rpc("record_channel_update_group_proof_v1", {
          p_update_id: ins.data?.id, p_source_id: src.id, p_ext_msg_id: msgId, p_group_chat_id: chatId,
          p_sender_jid: senderId, p_incoming: true, p_type_message: typ,
        });
        if (pr.error || pr.data?.ok !== true) trace.push({ msgId, step: "group-proof-skip", channel: src.channel, reason: String(pr.error?.message || pr.data?.error || "unknown") });
      }
    }
  }

  const upd: Record<string, unknown> = {};
  if (!targeted) {
    if (maxTs > minTs) upd.min_ts = maxTs - 120;
    // last_run_at means successful provider poll, including a valid empty history. During bounded
    // recovery we intentionally keep it stale until the whole known gap has been consumed.
    if (!recoveryPending) upd.last_run_at = new Date(nowSec * 1000).toISOString();
    if (Object.keys(upd).length) await sb.from("channel_ingest_sources").update(upd).eq("id", src.id);
  }
  return { ingested: n, recoveryPending, recoveryBlocked: false, historyOk: true };
}

Deno.serve(async (req) => {
  if (!ADMIN_KEY) return new Response("not configured", { status: 503 });
  if (req.headers.get("x-fb-admin-key") !== ADMIN_KEY) return new Response("forbidden", { status: 403 });
  const u = new URL(req.url);
  trace = [];
  const nowSec = Date.now() / 1000;
  const force = u.searchParams.get("force") === "1";
  const recoverChannel = (u.searchParams.get("recover_channel") || "").trim();
  const recoverMessageId = (u.searchParams.get("recover_message_id") || "").trim();
  const targeted = !!recoverChannel || !!recoverMessageId;
  if (targeted && (!recoverChannel || !recoverMessageId)) {
    return new Response(JSON.stringify({ error: "targeted_recovery_requires_channel_and_message_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let providerState = "unknown";
  try {
    const state = await waAdmin("getStateInstance", {}, "GET");
    providerState = String(state?.result?.stateInstance || state?.stateInstance || "unknown");
  } catch (e) {
    trace.push({ step: "provider-state-fail", error: String(e) });
  }
  if (providerState !== "authorized") {
    trace.push({ step: "provider-not-authorized", providerState });
    const body: any = {
      error: "green_not_authorized",
      providerState,
      ingested: 0,
      recoveryPending: 0,
      recoveryBlocked: 0,
      pollFailures: 0,
    };
    if (u.searchParams.get("debug") === "1") body.trace = trace;
    return new Response(JSON.stringify(body), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const aliasMap = await loadAliasMap();
  let sourceQuery = sb.from("channel_ingest_sources").select("*").eq("enabled", true);
  if (targeted) sourceQuery = sourceQuery.eq("channel", recoverChannel);
  const { data: sources } = await sourceQuery;
  if (targeted && !(sources || []).length) {
    return new Response(JSON.stringify({ error: "targeted_recovery_source_not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  let ingested = 0;
  let recoveryPending = 0;
  let recoveryBlocked = 0;
  let pollFailures = 0;
  for (const src of (sources || [])) {
    const every = Number(src.poll_every_min ?? 5);
    const last = src.last_run_at ? Date.parse(src.last_run_at) / 1000 : 0;
    if (!targeted && !force && last && (nowSec - last) < every * 60 - 10) {
      trace.push({ step: "skip", channel: src.channel, every });
      continue;
    }
    try {
      const r = await ingestSource(src, nowSec, aliasMap, targeted ? recoverMessageId : "");
      ingested += r.ingested;
      if (r.recoveryPending) recoveryPending++;
      if (r.recoveryBlocked) recoveryBlocked++;
      if (!r.historyOk) pollFailures++;
    } catch (e) {
      pollFailures++;
      trace.push({ step: "src-throw", channel: src.channel, error: String(e) });
    }
  }
  const body: any = {
    ingested,
    aliases: aliasMap.size,
    recoveryPending,
    recoveryBlocked,
    pollFailures,
    targetedRecovery: targeted ? { channel: recoverChannel, messageId: recoverMessageId } : null,
  };
  if (u.searchParams.get("debug") === "1") body.trace = trace;
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
});
