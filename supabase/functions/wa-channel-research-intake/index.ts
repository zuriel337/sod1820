// 📥 wa-channel-research-intake — thin adapter: channel_updates → existing Research Intake.
// No second research engine/store. Reuses research-extract + wa-ocr + research_objects.
// Heavy channels are always eligible; Or-Geula remains story-first and is analyzed only when its text
// carries a clear research signal. Every resulting Research Object stays candidate/private by default.
import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_KEY = (Deno.env.get("FB_ADMIN_KEY") || "").trim();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

const HEAVY_CHANNELS = new Set(["torat-haremez", "gilui-yomi", "sfot-vheker"]);
const CHANNELS = ["torat-haremez", "gilui-yomi", "sfot-vheker", "or-geula"];
const RESEARCH_HINT = /(גימטר|רמז|צופן|מילוי|אתב["״']?ש|דילוג|ערך|מספר|\d{2,}\s*=|=\s*\d{2,})/i;
const IMAGE_URL = /\.(?:png|jpe?g|webp)(?:\?|#|$)/i;
const PRIVATE_MEDIA_REF = /^storage-object:([0-9a-f]{8}-[0-9a-f-]{27,})$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function sourceRef(id: string) {
  return `channel_updates:${id}`;
}

function researchEligible(row: any) {
  if (HEAVY_CHANNELS.has(row.channel)) return true;
  return row.channel === "or-geula" && RESEARCH_HINT.test(String(row.text || ""));
}

async function invokeInternal(slug: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-fb-admin-key": ADMIN_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { data = { error: text.slice(0, 160) }; }
  if (!res.ok) throw new Error(`${slug}_http_${res.status}`);
  return data;
}

function mergeIntakeMeta(meta: any, intake: Record<string, unknown>) {
  const base = (meta && typeof meta === "object" && !Array.isArray(meta)) ? meta : {};
  const ext = (base.ext && typeof base.ext === "object" && !Array.isArray(base.ext)) ? base.ext : {};
  return { ...base, ext: { ...ext, wa_channel_intake: intake } };
}

async function annotateSourceObjects(ref: string, intake: Record<string, unknown>) {
  const { data } = await sb.from("research_objects").select("id,meta").eq("source_ref", ref);
  for (const row of (data || [])) {
    await sb.from("research_objects")
      .update({ meta: mergeIntakeMeta((row as any).meta, intake) })
      .eq("id", (row as any).id);
  }
}

async function priorFailureAttempts(ref: string) {
  const { data } = await sb.from("research_objects").select("meta").eq("source_ref", ref);
  let max = 0;
  for (const row of (data || [])) {
    const n = Number((row as any)?.meta?.ext?.wa_channel_intake?.attempt_count || 0);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return max;
}

async function fallbackObservation(
  row: any,
  content: string,
  analysisState: string,
  ocrUsed: boolean,
  mediaKind: "image" | "video" | null = null,
) {
  const ref = sourceRef(row.id);
  const failureAttempt = analysisState === "analysis_failed_source_preserved"
    ? (await priorFailureAttempts(ref)) + 1
    : 1;
  const intake = {
    channel: row.channel,
    route: HEAVY_CHANNELS.has(row.channel) ? "research_first" : "story_first_selective",
    analysis_state: analysisState,
    attempt_count: failureAttempt,
    analyzed_at: new Date().toISOString(),
    source_created_at: row.created_at,
    media_ref: row.image_url || null,
    media_kind: mediaKind,
    media_transcription_pending: mediaKind === "video",
    ocr_used: ocrUsed,
  };
  const statement = (content || String(row.text || "") || "מקור WhatsApp ללא טקסט קריא").slice(0, 500);
  const { error } = await sb.from("research_objects").insert({
    kind: "observation",
    statement,
    source: "channel_updates",
    source_ref: ref,
    contributor: row.credit || null,
    engine_verified: false,
    engine_detail: null,
    evidence: (content || "").slice(0, 600) || null,
    status: "candidate",
    privacy_scope: "private",
    meta: { ext: { wa_channel_intake: intake } },
  });
  if (error && (error as any).code !== "23505") throw error;
  await annotateSourceObjects(ref, intake);
}

async function mediaForAnalysis(row: any): Promise<{ url: string; kind: "image" | "video" } | null> {
  const raw = String(row.image_url || "");
  if (!raw) return null;
  const privateMatch = raw.match(PRIVATE_MEDIA_REF);
  if (!privateMatch) return IMAGE_URL.test(raw) ? { url: raw, kind: "image" } : null;

  const { data: resolved, error } = await sb.rpc("private_channel_media_access", {
    p_channel_update_id: row.id,
    p_storage_object_id: privateMatch[1],
  });
  if (error || !resolved?.ok || !resolved?.path || resolved?.bucket !== "submission-inbox") return null;
  const mime = String(resolved.mime || "").toLowerCase();
  const kind = mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : null;
  if (!kind) return null;
  const { data, error: signError } = await sb.storage.from("submission-inbox").createSignedUrl(resolved.path, 300);
  if (signError || !data?.signedUrl) return null;
  return { url: data.signedUrl, kind };
}

async function processRow(row: any) {
  const ref = sourceRef(row.id);
  let ocrUsed = false;
  let ocrText = "";
  let mediaKind: "image" | "video" | null = null;
  const sourceText = String(row.text || "").trim();
  const rawText = /^(?:📷 עדכון|🎬 עדכון וידאו)$/.test(sourceText) ? "" : sourceText;

  if (row.image_url && HEAVY_CHANNELS.has(row.channel)) {
    try {
      const media = await mediaForAnalysis(row);
      mediaKind = media?.kind || null;
      if (media?.kind === "image") {
        const ocr = await invokeInternal("wa-ocr", { imageUrl: media.url });
        if (typeof ocr?.text === "string" && ocr.text.trim()) {
          ocrText = ocr.text.trim();
          ocrUsed = true;
        }
      }
    } catch {
      // OCR/signing failure is not source loss; text analysis can continue and provenance remains addressable.
    }
  }

  const parts = [];
  if (rawText) parts.push(rawText);
  if (ocrText && ocrText !== rawText) parts.push(`OCR מהמדיה:\n${ocrText}`);
  const content = parts.join("\n\n").trim();

  if (content.length < 8) {
    const state = mediaKind === "video"
      ? "source_preserved_needs_transcription"
      : row.image_url
        ? "source_preserved_needs_deeper_media_analysis"
        : "source_preserved_needs_text_review";
    await fallbackObservation(row, content, state, ocrUsed, mediaKind);
    return { id: row.id, channel: row.channel, state };
  }

  try {
    const result = await invokeInternal("research-extract", {
      source: "channel_updates",
      source_ref: ref,
      contributor: row.credit || null,
      content,
    });

    if (result?.error) {
      await fallbackObservation(row, content, "analysis_failed_source_preserved", ocrUsed, mediaKind);
      return { id: row.id, channel: row.channel, state: "analysis_failed_preserved" };
    }

    const produced = Number(result?.inserted || 0) + Number(result?.absorbed || 0);
    if (produced <= 0) {
      await fallbackObservation(row, content, mediaKind === "video" ? "reviewed_caption_media_needs_transcription" : "reviewed_no_structured_findings", ocrUsed, mediaKind);
      return { id: row.id, channel: row.channel, state: "reviewed_observation" };
    }

    const analysisState = mediaKind === "video"
      ? "extracted_caption_media_needs_transcription"
      : "extracted";
    await annotateSourceObjects(ref, {
      channel: row.channel,
      route: HEAVY_CHANNELS.has(row.channel) ? "research_first" : "story_first_selective",
      analysis_state: analysisState,
      analyzed_at: new Date().toISOString(),
      source_created_at: row.created_at,
      media_ref: row.image_url || null,
      media_kind: mediaKind,
      media_transcription_pending: mediaKind === "video",
      ocr_used: ocrUsed,
    });
    return { id: row.id, channel: row.channel, state: analysisState, produced };
  } catch {
    await fallbackObservation(row, content, "analysis_failed_source_preserved", ocrUsed, mediaKind);
    return { id: row.id, channel: row.channel, state: "analysis_failed_preserved" };
  }
}

function selectFair(rows: any[], limit: number) {
  const queues = new Map(CHANNELS.map((ch) => [ch, rows.filter((r) => r.channel === ch)
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))]));
  const order = ["torat-haremez", "gilui-yomi", "torat-haremez", "sfot-vheker", "gilui-yomi", "or-geula"];
  const selected: any[] = [];
  while (selected.length < limit) {
    let moved = false;
    for (const ch of order) {
      const q = queues.get(ch) || [];
      const row = q.shift();
      if (row) {
        selected.push(row);
        moved = true;
        if (selected.length >= limit) break;
      }
    }
    if (!moved) break;
  }
  return selected;
}

Deno.serve(async (req) => {
  if (!ADMIN_KEY) return json({ error: "not_configured" }, 503);
  if (req.headers.get("x-fb-admin-key") !== ADMIN_KEY) return new Response("forbidden", { status: 403 });

  const u = new URL(req.url);
  const hours = Math.max(1, Math.min(Number(u.searchParams.get("hours") || 168), 720));
  const limit = Math.max(1, Math.min(Number(u.searchParams.get("limit") || 4), 8));
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

  const { data: rawRows, error } = await sb.from("channel_updates")
    .select("id,text,image_url,credit,channel,created_at,status")
    .in("channel", CHANNELS)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return json({ error: "source_read_failed" }, 500);

  const eligible = (rawRows || []).filter(researchEligible);
  const refs = eligible.map((r: any) => sourceRef(r.id));
  const existing = new Map<string, any[]>();
  for (let i = 0; i < refs.length; i += 100) {
    const chunk = refs.slice(i, i + 100);
    const { data } = await sb.from("research_objects").select("source_ref,meta").in("source_ref", chunk);
    for (const r of (data || [])) {
      const ref = String((r as any).source_ref || "");
      if (!ref) continue;
      const rows = existing.get(ref) || [];
      rows.push(r);
      existing.set(ref, rows);
    }
  }

  const now = Date.now();
  const pending = eligible.filter((r: any) => {
    const rows = existing.get(sourceRef(r.id));
    if (!rows?.length) return true;

    let maxAttempts = 0;
    let latestFailure = 0;
    for (const ro of rows) {
      const intake = (ro as any)?.meta?.ext?.wa_channel_intake;
      // Pre-adapter/legacy Research Objects already prove this source entered Research.
      if (!intake?.analysis_state) return false;
      if (intake.analysis_state !== "analysis_failed_source_preserved") return false;
      maxAttempts = Math.max(maxAttempts, Number(intake.attempt_count || 1));
      latestFailure = Math.max(latestFailure, Date.parse(String(intake.analyzed_at || "")) || 0);
    }
    return maxAttempts < 3 && latestFailure > 0 && now - latestFailure >= 30 * 60 * 1000;
  });
  const selected = selectFair(pending, limit);
  const results = [];
  for (const row of selected) results.push(await processRow(row));

  return json({
    ok: true,
    hours,
    scanned: rawRows?.length || 0,
    eligible: eligible.length,
    pending: pending.length,
    processed: results.length,
    results,
  });
});
