// wa-video-enrich — enriches public WhatsApp video channels without changing source truth.
// Automatic flow: caption -> nearby channel context -> thumbnail vision -> grounded SEO metadata.
// Full-video STT exists only behind explicit allow_stt=true and NEVER runs from cron.
// Protected by FB_ADMIN_KEY. OPENAI_API_KEY is retrieved through a service-role-only RPC.
import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_KEY = (Deno.env.get("FB_ADMIN_KEY") || "").trim();
const ANTHROPIC_KEY = (Deno.env.get("ANTHROPIC_API_KEY") || "").trim();
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MODEL = (Deno.env.get("FAST_MODEL") || "claude-haiku-4-5").trim();
const SITE_URL = "https://sod1820.co.il";
const MAX_STT_BYTES = 24 * 1024 * 1024;
const VIDEO_RE = /\.(mp4|mov|webm|m4v)(?:[?#]|$)/i;
const GENERIC = new Set(["", "🎬 עדכון וידאו", "📷 עדכון"]);
const PUBLIC_VIDEO_CHANNELS = ["or-geula", "torat-haremez"];

const sb = createClient(SB_URL, SB_KEY);

type VideoTrace = { traceId: string; rootSpanId: string; startedAt: string; inputHash: string };
async function videoHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value || ""));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function beginVideoTrace(body: any): Promise<VideoTrace | null> {
  try {
    const traceId = crypto.randomUUID();
    const rootSpanId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const inputHash = await videoHash(JSON.stringify({
      row_id: cleanText(body?.row_id),
      allow_stt: body?.allow_stt === true,
      limit: Math.max(1, Math.min(10, Number(body?.limit || 4))),
    }));
    const { data, error } = await sb.rpc("op_trace_begin_v1", {
      p_trace_id: traceId,
      p_root_span_id: rootSpanId,
      p_context: {
        capability: "wa-video-enrich",
        surface: "edge:wa-video-enrich",
        channel: "whatsapp",
        locale: "he",
        identity_class: "service",
        subject_ref: "video-enrichment-batch",
        owner_ref: "research_strategy_layer_law v17 + system_suggestions_law v5",
        root_name: "wa-video-enrich",
        replay: { inputRef: "sha256:" + inputHash },
      },
      p_started_at: startedAt,
    });
    if (error || !data) return null;
    return { traceId, rootSpanId, startedAt, inputHash };
  } catch { return null; }
}
async function recordVideoSpan(t: VideoTrace | null, opts: any) {
  if (!t) return;
  try {
    await sb.rpc("op_trace_record_span_v1", {
      p_trace_id: t.traceId,
      p_span_id: opts.spanId,
      p_parent_span_id: opts.parentSpanId || t.rootSpanId,
      p_kind: opts.kind,
      p_name: opts.name,
      p_started_at: opts.startedAt,
      p_ended_at: opts.endedAt,
      p_outcome: opts.outcome,
      p_detail: opts.detail || {},
    });
  } catch { /* trace is observational only */ }
}
async function finishVideoTrace(t: VideoTrace | null, outcome: string, stopReason: string | null = null) {
  if (!t) return;
  try {
    await sb.rpc("op_trace_finish_v1", {
      p_trace_id: t.traceId,
      p_root_span_id: t.rootSpanId,
      p_outcome: outcome,
      p_ended_at: new Date().toISOString(),
      p_stop_reason: stopReason,
    });
  } catch { /* trace is observational only */ }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

function cleanText(v: unknown): string {
  return String(v || "").replace(/\s+/g, " ").trim();
}

function isGeneric(v: unknown): boolean {
  return GENERIC.has(cleanText(v));
}

function validHebrewValue(v: unknown): string | null {
  const s = cleanText(v);
  if (!s || !/[א-ת]/u.test(s)) return null;
  const low = s.toLowerCase();
  if (["string", "string|null", "null", "undefined", "speaker", "title"].includes(low)) return null;
  return s;
}

function validTopics(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v
    .map((x: unknown) => validHebrewValue(x))
    .filter((x): x is string => !!x))]
    .slice(0, 5);
}

function fallbackSpeaker(text: string): string | null {
  const compact = cleanText(text);
  const patterns = [
    /(?:הרב|רבי|המקובל הרב|הרה"ג)\s+([א-ת][א-ת"'׳״\- ]{2,45})/u,
    /(?:ד"ר|דוקטור)\s+([א-ת][א-ת"'׳״\- ]{2,45})/u,
  ];
  for (const re of patterns) {
    const m = compact.match(re);
    if (m?.[1]) return cleanText(m[1]).replace(/[,:;.!?].*$/, "").slice(0, 60);
  }
  return null;
}

function fallbackTitle(text: string): string | null {
  const t = cleanText(text).replace(/^[-–—:;,\.\s]+/, "");
  if (!t) return null;
  const first = t.split(/[.!?\n]/)[0]?.trim() || t;
  return first.slice(0, 90);
}

function imageMediaType(url: string): string {
  const u = String(url || "").toLowerCase().split("?")[0];
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function nearbyContext(row: any): Promise<string | null> {
  try {
    const t = new Date(row.created_at).getTime();
    if (!Number.isFinite(t)) return null;
    const from = new Date(t - 20_000).toISOString();
    const to = new Date(t + 20_000).toISOString();

    let q = sb.from("channel_updates")
      .select("id,text,created_at,credit,source")
      .eq("channel", row.channel)
      .neq("id", row.id)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: true })
      .limit(12);

    if (row.credit) q = q.eq("credit", row.credit);

    const { data, error } = await q;
    if (error) return null;

    const candidates = (data || [])
      .map((x: any) => ({ ...x, clean: cleanText(x.text) }))
      .filter((x: any) => x.clean && !GENERIC.has(x.clean));

    if (!candidates.length) return null;

    candidates.sort((a: any, b: any) =>
      Math.abs(new Date(a.created_at).getTime() - t) -
      Math.abs(new Date(b.created_at).getTime() - t)
    );

    const best = candidates[0];
    const delta = Math.abs(new Date(best.created_at).getTime() - t);
    return delta <= 20_000 ? best.clean : null;
  } catch {
    return null;
  }
}

async function thumbnailMetadata(row: any, opTrace: VideoTrace | null = null, parentSpanId: string | null = null): Promise<{ speaker: string | null; title: string | null; topics: string[] } | null> {
  if (!ANTHROPIC_KEY || !row?.thumb_url) return null;
  try {
    const r = await fetch(row.thumb_url);
    if (!r.ok) return null;
    const buf = await r.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > 1_500_000) return null;

    const b64 = toBase64(buf);
    const prompt =
      "Analyze this video thumbnail only. Return strict JSON only: " +
      '{"speaker":string|null,"title":string|null,"topics":string[]}. ' +
      "Do not identify anyone from their face. speaker may be set only when the exact Hebrew name is visibly written. " +
      "title must describe only text/scene visibly supported by the thumbnail, in concise Hebrew, 20-90 characters. " +
      "topics: 0-5 short Hebrew labels visibly supported. No prophecy, hidden meaning, diagnosis, or inference about the unseen video. " +
      "If there is not enough evidence for a useful title, title=null.";

    const modelSpanId = crypto.randomUUID();
    const modelStartedAt = new Date().toISOString();
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 260,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: imageMediaType(row.thumb_url), data: b64 } },
          { type: "text", text: prompt },
        ] }],
      }),
    });
    const modelEndedAt = new Date().toISOString();
    if (!resp.ok) {
      await recordVideoSpan(opTrace, {
        spanId: modelSpanId, parentSpanId, kind: "model_call", name: "wa-video-enrich:thumbnail-metadata",
        startedAt: modelStartedAt, endedAt: modelEndedAt, outcome: "provider_error",
        detail: {
          capability: "wa-video-enrich:thumbnail-metadata", owner_ref: "research_strategy_layer_law v17",
          provider: "anthropic", model: MODEL, output_use: "not_applicable",
          stop_reason: "anthropic_" + resp.status,
          resources: { api_calls: 1, latency_ms: Math.max(0, Date.parse(modelEndedAt) - Date.parse(modelStartedAt)) },
          cost: { certainty: "unknown" },
          replay: { inputRef: "sha256:" + (opTrace?.inputHash || "") },
          privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
        },
      });
      return null;
    }

    const data = await resp.json();
    await recordVideoSpan(opTrace, {
      spanId: modelSpanId, parentSpanId, kind: "model_call", name: "wa-video-enrich:thumbnail-metadata",
      startedAt: modelStartedAt, endedAt: modelEndedAt, outcome: "success",
      detail: {
        capability: "wa-video-enrich:thumbnail-metadata", owner_ref: "research_strategy_layer_law v17",
        provider: "anthropic", model: MODEL, output_use: "used",
        resources: {
          input_tokens: data?.usage?.input_tokens ?? null, output_tokens: data?.usage?.output_tokens ?? null,
          api_calls: 1, latency_ms: Math.max(0, Date.parse(modelEndedAt) - Date.parse(modelStartedAt)),
        },
        cost: { certainty: "unknown" },
        replay: { inputRef: "sha256:" + (opTrace?.inputHash || "") },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });
    await logTokens(data?.usage, opTrace, modelSpanId, "thumbnail_metadata");

    const raw = (data?.content || []).find((x: any) => x?.type === "text")?.text || "";
    const m = String(raw).match(/\{[\s\S]*\}/);
    if (!m) return null;

    const p = JSON.parse(m[0]);
    const title = validHebrewValue(p?.title);
    const speaker = validHebrewValue(p?.speaker);
    const topics = validTopics(p?.topics);

    if (!title) return null;
    return {
      title: title.slice(0, 100),
      speaker: speaker ? speaker.slice(0, 80) : null,
      topics,
    };
  } catch {
    return null;
  }
}

async function getOpenAiKey(): Promise<string> {
  const { data, error } = await sb.rpc("wa_video_enrich_openai_key");
  if (error) throw new Error("openai_key_rpc:" + error.message);
  const key = String(data || "").trim();
  if (key.length < 20) throw new Error("openai_key_missing");
  return key;
}

async function saveTranscript(row: any, transcript: string, title: string | null = null) {
  const videoKey = `${row.channel || "video"}:${row.id}`;
  const { error } = await sb.from("video_transcripts").upsert({
    video_key: videoKey,
    video_id: null,
    yt: null,
    source_url: row.image_url,
    title,
    lang: "he",
    transcript,
    summary: null,
    is_original: true,
    translated_by: "openai:gpt-transcribe",
    model: "gpt-transcribe",
    status: "published",
  }, { onConflict: "video_key,lang" });
  if (error) throw new Error("transcript_upsert:" + error.message);
}

async function transcribe(row: any, opTrace: VideoTrace | null = null, parentSpanId: string | null = null): Promise<string> {
  const key = await getOpenAiKey();
  const media = await fetch(row.image_url);
  if (!media.ok) throw new Error(`media_fetch_${media.status}`);
  const blob = await media.blob();
  if (!blob.size) throw new Error("media_empty");
  if (blob.size > MAX_STT_BYTES) throw new Error(`media_too_large:${blob.size}`);

  const url = String(row.image_url || "");
  const ext = (url.match(/\.(mp4|webm|m4v|mov)(?:[?#]|$)/i)?.[1] || "mp4").toLowerCase();
  const type = blob.type || (ext === "webm" ? "video/webm" : "video/mp4");
  const form = new FormData();
  form.append("file", new File([blob], `${row.channel || "video"}-${row.id}.${ext}`, { type }));
  form.append("model", "gpt-transcribe");
  form.append("language", "he");

  const spanId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  const endedAt = new Date().toISOString();
  const raw = await r.text();
  await recordVideoSpan(opTrace, {
    spanId, parentSpanId, kind: "tool", name: "wa-video-enrich:openai-transcribe",
    startedAt, endedAt, outcome: r.ok ? "success" : "provider_error",
    detail: {
      capability: "wa-video-enrich:transcribe", owner_ref: "research_strategy_layer_law v17",
      provider: "openai", model: "gpt-transcribe", output_use: r.ok ? "used" : "not_applicable",
      stop_reason: r.ok ? null : "openai_" + r.status,
      resources: { api_calls: 1, media_bytes: blob.size, latency_ms: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)) },
      cost: { certainty: "unknown" },
      replay: { inputRef: "sha256:" + (opTrace?.inputHash || "") },
      privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
    },
  });
  if (!r.ok) throw new Error(`stt_${r.status}:${raw.slice(0, 240)}`);
  let parsed: any = null;
  try { parsed = JSON.parse(raw); } catch { /* noop */ }
  const transcript = cleanText(parsed?.text || raw);
  if (!transcript) throw new Error("stt_empty");
  await saveTranscript(row, transcript, null);
  return transcript;
}

async function logTokens(usage: any, opTrace: VideoTrace | null = null, spanId: string | null = null, kind = "metadata") {
  if (!usage) return null;
  try {
    const row = {
      source: "wa-video-enrich",
      kind,
      model: MODEL,
      input_tokens: Number(usage?.input_tokens || 0),
      output_tokens: Number(usage?.output_tokens || 0),
      trace_id: opTrace?.traceId || null,
      span_id: opTrace?.traceId && spanId ? spanId : null,
    };
    let { data, error } = await sb.from("ai_token_log").insert(row).select("id").maybeSingle();
    if (error) {
      ({ data, error } = await sb.from("ai_token_log").insert({
        source: "wa-video-enrich", kind, model: MODEL,
        input_tokens: row.input_tokens, output_tokens: row.output_tokens,
      }).select("id").maybeSingle());
    }
    if (error) return null;
    const id = Number(data?.id) || null;
    if (id && opTrace && spanId) {
      await sb.rpc("op_trace_link_ai_cost_v1", {
        p_trace_id: opTrace.traceId,
        p_span_id: spanId,
        p_ai_token_log_id: id,
      }).catch(() => null);
    }
    return id;
  } catch { return null; }
}

async function aiMetadata(text: string, opTrace: VideoTrace | null = null, parentSpanId: string | null = null): Promise<{ speaker: string | null; title: string | null; topics: string[] }> {
  const fallback = { speaker: fallbackSpeaker(text), title: fallbackTitle(text), topics: [] as string[] };
  if (!ANTHROPIC_KEY || !cleanText(text)) return fallback;

  const system =
    "You enrich video metadata for SOD1820. Use ONLY the supplied caption/transcript. " +
    "Never invent identities, facts, prophecies, or claims. Return strict JSON only: " +
    '{"speaker":string|null,"title":string|null,"topics":string[]}. ' +
    "speaker: only if the source explicitly identifies the person as the speaker/teacher/interviewee; copy the exact Hebrew spelling from the source, never translate or transliterate; otherwise null. " +
    "title: concise factual Hebrew title, 25-90 characters, describing what is actually said; no clickbait; otherwise null. " +
    "topics: 0-5 short Hebrew topic labels explicitly supported by the source; no inferred ideology, diagnosis, prophecy, or hidden meaning.";

  const modelSpanId = crypto.randomUUID();
  const modelStartedAt = new Date().toISOString();
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 220,
      system,
      messages: [{ role: "user", content: cleanText(text).slice(0, 7000) }],
    }),
  });
  const modelEndedAt = new Date().toISOString();
  if (!r.ok) {
    await recordVideoSpan(opTrace, {
      spanId: modelSpanId, parentSpanId, kind: "model_call", name: "wa-video-enrich:text-metadata",
      startedAt: modelStartedAt, endedAt: modelEndedAt, outcome: "provider_error",
      detail: {
        capability: "wa-video-enrich:text-metadata", owner_ref: "research_strategy_layer_law v17",
        provider: "anthropic", model: MODEL, output_use: "not_applicable", stop_reason: "anthropic_" + r.status,
        resources: { api_calls: 1, latency_ms: Math.max(0, Date.parse(modelEndedAt) - Date.parse(modelStartedAt)) },
        cost: { certainty: "unknown" }, replay: { inputRef: "sha256:" + (opTrace?.inputHash || "") },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });
    return fallback;
  }
  const data = await r.json();
  await recordVideoSpan(opTrace, {
    spanId: modelSpanId, parentSpanId, kind: "model_call", name: "wa-video-enrich:text-metadata",
    startedAt: modelStartedAt, endedAt: modelEndedAt, outcome: "success",
    detail: {
      capability: "wa-video-enrich:text-metadata", owner_ref: "research_strategy_layer_law v17",
      provider: "anthropic", model: MODEL, output_use: "used",
      resources: {
        input_tokens: data?.usage?.input_tokens ?? null, output_tokens: data?.usage?.output_tokens ?? null,
        api_calls: 1, latency_ms: Math.max(0, Date.parse(modelEndedAt) - Date.parse(modelStartedAt)),
      },
      cost: { certainty: "unknown" }, replay: { inputRef: "sha256:" + (opTrace?.inputHash || "") },
      privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
    },
  });
  await logTokens(data?.usage, opTrace, modelSpanId, "text_metadata");
  const out = (data?.content || []).find((x: any) => x?.type === "text")?.text || "";
  const m = String(out).match(/\{[\s\S]*\}/);
  if (!m) return fallback;
  try {
    const p = JSON.parse(m[0]);
    const speaker = validHebrewValue(p?.speaker) || fallback.speaker;
    const title = validHebrewValue(p?.title) || fallback.title;
    const topics = validTopics(p?.topics);
    return {
      speaker: speaker ? speaker.slice(0, 80) : null,
      title: title ? title.slice(0, 100) : null,
      topics,
    };
  } catch {
    return fallback;
  }
}

async function enrichRow(row: any, allowStt = false, opTrace: VideoTrace | null = null) {
  if (!row?.id || !PUBLIC_VIDEO_CHANNELS.includes(row.channel) || !VIDEO_RE.test(String(row.image_url || ""))) {
    return { id: row?.id || null, ok: false, skipped: "not_supported_public_video_channel" };
  }

  const canonical = row.channel === "or-geula"
    ? `${SITE_URL}/or-geula/video/${row.id}`
    : (row.link_url || null);
  const updates: Record<string, unknown> = {};
  if (row.channel === "or-geula" && row.link_url !== canonical) updates.link_url = canonical;

  const generic = isGeneric(row.text);
  let basis = cleanText(row.text);
  let transcript: string | null = null;
  let meta: { speaker: string | null; title: string | null; topics: string[] } | null = null;
  let enrichmentSource = "caption";

  if (generic) {
    const neighbor = await nearbyContext(row);
    if (neighbor) {
      basis = neighbor;
      enrichmentSource = "neighbor_context";
      meta = await aiMetadata(basis, opTrace);
    } else {
      meta = await thumbnailMetadata(row, opTrace);
      if (meta?.title) {
        enrichmentSource = "thumbnail_vision";
      } else if (allowStt) {
        try {
          transcript = await transcribe(row, opTrace);
          basis = transcript;
          enrichmentSource = "stt";
          meta = await aiMetadata(basis, opTrace);
        } catch (e) {
          updates.enrichment_status = "retry_stt";
          updates.enrichment_source = "stt";
          const { error: markError } = await sb.from("channel_updates").update(updates).eq("id", row.id);
          return {
            id: row.id,
            ok: false,
            retryable: true,
            stage: "stt",
            error: String((e as Error)?.message || e),
            mark_error: markError?.message || null,
          };
        }
      } else {
        updates.enrichment_status = "retry_stt";
        updates.enrichment_source = "thumbnail_unresolved";
        const { error: markError } = await sb.from("channel_updates").update(updates).eq("id", row.id);
        return {
          id: row.id,
          ok: false,
          retryable: true,
          stage: "needs_stt",
          error: "no_grounded_caption_or_thumbnail_metadata",
          mark_error: markError?.message || null,
        };
      }
    }
  }

  if (!meta) meta = await aiMetadata(basis, opTrace);
  const title = meta.title || fallbackTitle(basis);

  if (row.speaker == null && meta.speaker) updates.speaker = meta.speaker;
  if (title) updates.seo_title = title;
  updates.topics = meta.topics || [];
  updates.enrichment_status = "enriched";
  updates.enrichment_source = enrichmentSource;
  updates.enriched_at = new Date().toISOString();

  if (transcript && title) {
    try {
      await sb.from("video_transcripts")
        .update({ title })
        .eq("video_key", `${row.channel || "video"}:${row.id}`)
        .eq("lang", "he");
    } catch { /* noop */ }
  }

  const { error } = await sb.from("channel_updates").update(updates).eq("id", row.id);
  if (error) return { id: row.id, ok: false, stage: "update", error: error.message };

  return {
    id: row.id,
    ok: true,
    canonical,
    generic_before: generic,
    transcribed: !!transcript,
    speaker: meta.speaker || null,
    seo_title: title || null,
    topics: meta.topics || [],
    enrichment_source: enrichmentSource,
  };
}

Deno.serve(async (req) => {
  if (!ADMIN_KEY) return json({ error: "not_configured" }, 503);
  if (req.headers.get("x-fb-admin-key") !== ADMIN_KEY) return json({ error: "forbidden" }, 403);
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body = backfill */ }
  const opTrace = await beginVideoTrace(body);

  const rowId = cleanText(body?.row_id);
  const allowStt = body?.allow_stt === true;
  const limit = Math.max(1, Math.min(10, Number(body?.limit || 4)));

  let rows: any[] = [];
  if (rowId) {
    const { data, error } = await sb.from("channel_updates")
      .select("id,channel,text,image_url,thumb_url,speaker,link_url,seo_title,topics,enrichment_status,created_at,credit,source")
      .eq("id", rowId)
      .maybeSingle();
    if (error) return json({ error: "row_lookup_failed", detail: error.message }, 500);
    if (data) rows = [data];
  } else {
    const { data, error } = await sb.from("channel_updates")
      .select("id,channel,text,image_url,thumb_url,speaker,link_url,seo_title,topics,enrichment_status,created_at,credit,source")
      .in("channel", PUBLIC_VIDEO_CHANNELS)
      .eq("status", "live")
      .ilike("image_url", "%.mp4%")
      .eq("enrichment_status", "pending")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return json({ error: "batch_lookup_failed", detail: error.message }, 500);
    rows = data || [];
  }

  const results = [];
  for (const row of rows) results.push(await enrichRow(row, allowStt, opTrace));
  const failed = results.filter((x: any) => !x.ok && !x.retryable && !x.skipped).length;
  await finishVideoTrace(opTrace, failed ? "failed_with_reason" : "success", failed ? "row_failure" : null);
  return json({
    ok: true,
    selected: rows.length,
    enriched: results.filter((x: any) => x.ok).length,
    retryable: results.filter((x: any) => x.retryable).length,
    results,
  });
});
