// 📥 wa-channel-research-intake — thin adapter: channel_updates → existing Research Intake.
// No second research engine/store. Reuses research-extract + wa-ocr + research_objects.
// Source routing comes from the existing channel_ingest_sources registry.
// No hard-coded channel ownership: intake_mode decides research_first / story_first_selective / off.
// Every resulting Research Object stays candidate/private by default.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { isTrustedAuthor } from "../_shared/waWriterIdentity.js";

const ADMIN_KEY = (Deno.env.get("FB_ADMIN_KEY") || "").trim();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

const RESEARCH_HINT = /(גימטר|רמז|צופן|מילוי|אתב["״']?ש|דילוג|ערך|מספר|\d{2,}\s*=|=\s*\d{2,})/i;
const IMAGE_URL = /\.(?:png|jpe?g|webp)(?:\?|#|$)/i;
const PRIVATE_MEDIA_REF = /^storage-object:([0-9a-f]{8}-[0-9a-f-]{27,})$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function sourceRef(id: string) {
  return `channel_updates:${id}`;
}

function researchEligible(row: any, policy: any) {
  if (!policy || policy.intake_mode === "off") return false;
  if (policy.intake_mode === "research_first") return true;
  return policy.intake_mode === "story_first_selective"
    && RESEARCH_HINT.test(String(row.text || ""));
}

function intakeRoute(policy: any) {
  return policy?.intake_mode === "story_first_selective"
    ? "story_first_selective"
    : "research_first";
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


function compactTerms(rows: any[]) {
  const out = new Set<string>();
  for (const row of rows || []) {
    for (const raw of [...(row?.terms || []), ...(row?.relates || [])]) {
      const v = String(raw || "").trim();
      if (v.length >= 2 && v.length <= 80) out.add(v);
    }
  }
  return [...out].slice(0, 24);
}

function compactValues(rows: any[]) {
  const out = new Set<number>();
  for (const row of rows || []) {
    const n = Number(row?.value);
    if (Number.isSafeInteger(n) && n > 0) out.add(n);
  }
  return [...out].slice(0, 16);
}

async function findExistingTreeTargets(ref: string) {
  const { data: objects } = await sb.from("research_objects")
    .select("id,kind,statement,terms,relates,value,engine_verified")
    .eq("source_ref", ref);

  const terms = compactTerms(objects || []);
  const values = compactValues(objects || []);
  const targets: any[] = [];

  if (values.length) {
    const [{ data: topicByNumber }, { data: topicByHighlight }] = await Promise.all([
      sb.from("topic_cards_public")
        .select("slug,title,numbers,highlight_numbers")
        .overlaps("numbers", values)
        .limit(16),
      sb.from("topic_cards_public")
        .select("slug,title,numbers,highlight_numbers")
        .overlaps("highlight_numbers", values)
        .limit(16),
    ]);
    for (const row of [...(topicByNumber || []), ...(topicByHighlight || [])]) {
      targets.push({ type: "topic", key: row.slug, label: row.title, match: "number" });
    }

    for (const n of values) {
      targets.push({ type: "number", key: String(n), label: String(n), match: "value" });
    }
  }

  if (terms.length) {
    const { data: topicByTerm } = await sb.from("topic_cards_public")
      .select("slug,title,search_terms")
      .overlaps("search_terms", terms)
      .limit(16);
    for (const row of topicByTerm || []) {
      targets.push({ type: "topic", key: row.slug, label: row.title, match: "term" });
    }

    const { data: nodes } = await sb.from("nodes")
      .select("id,type,label,identity_key")
      .in("label", terms)
      .eq("is_active", true)
      .limit(20);
    for (const row of nodes || []) {
      const mappedType = row.type === "post" ? "post" : row.type === "entity" ? "entity" : row.type;
      targets.push({ type: mappedType, key: row.identity_key || row.id, label: row.label, match: "term" });
    }

    const { data: posts } = await sb.from("posts")
      .select("id,slug,title,tags")
      .overlaps("tags", terms)
      .limit(20);
    for (const row of posts || []) {
      targets.push({ type: "post", key: row.slug || String(row.id), label: row.title, match: "tag" });
    }
  }

  const seen = new Set<string>();
  return targets.filter((row) => {
    const key = `${row.type}:${row.key}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}

async function annotateTreeTargets(ref: string) {
  const targets = await findExistingTreeTargets(ref);
  const { data } = await sb.from("research_objects").select("id,meta").eq("source_ref", ref);
  for (const row of data || []) {
    const current = (row as any)?.meta?.ext?.wa_channel_intake || {};
    await sb.from("research_objects").update({
      meta: mergeIntakeMeta((row as any).meta, {
        ...current,
        tree_matches: targets,
        tree_match_state: targets.length ? "matched_existing_tree" : "candidate_unmatched",
      }),
    }).eq("id", (row as any).id);
  }
  return targets;
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
    route: intakeRoute(row._sourcePolicy),
    trusted_author: row._trustedAuthor === true,
    contributor_id: row.contributor_id || null,
    analysis_state: analysisState,
    attempt_count: failureAttempt,
    analyzed_at: new Date().toISOString(),
    source_created_at: row.created_at,
    media_ref: row.image_url || null,
    media_kind: mediaKind,
    media_transcription_pending: mediaKind === "video",
    media_ocr_pending: mediaKind === "image" && !ocrUsed,
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

  if (row.image_url && row._sourcePolicy?.intake_mode === "research_first") {
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
      const reviewedState = mediaKind === "video"
        ? "reviewed_caption_media_needs_transcription"
        : mediaKind === "image" && !ocrUsed
          ? "reviewed_caption_media_needs_ocr"
          : "reviewed_no_structured_findings";
      await fallbackObservation(row, content, reviewedState, ocrUsed, mediaKind);
      const treeMatches = await annotateTreeTargets(ref);
      return { id: row.id, channel: row.channel, state: reviewedState, tree_matches: treeMatches.length };
    }

    const analysisState = mediaKind === "video"
      ? "extracted_caption_media_needs_transcription"
      : mediaKind === "image" && !ocrUsed
        ? "extracted_caption_media_needs_ocr"
        : "extracted";
    await annotateSourceObjects(ref, {
      channel: row.channel,
      route: intakeRoute(row._sourcePolicy),
      trusted_author: row._trustedAuthor === true,
      contributor_id: row.contributor_id || null,
      analysis_state: analysisState,
      analyzed_at: new Date().toISOString(),
      source_created_at: row.created_at,
      media_ref: row.image_url || null,
      media_kind: mediaKind,
      media_transcription_pending: mediaKind === "video",
      media_ocr_pending: mediaKind === "image" && !ocrUsed,
      ocr_used: ocrUsed,
    });
    const treeMatches = await annotateTreeTargets(ref);
    return { id: row.id, channel: row.channel, state: analysisState, produced, tree_matches: treeMatches.length };
  } catch {
    await fallbackObservation(row, content, "analysis_failed_source_preserved", ocrUsed, mediaKind);
    return { id: row.id, channel: row.channel, state: "analysis_failed_preserved" };
  }
}

function selectFair(rows: any[], limit: number) {
  const channels = [...new Set(rows.map((r: any) => String(r.channel || "")).filter(Boolean))];
  const queues = new Map(channels.map((ch) => [ch, rows.filter((r: any) => r.channel === ch)
    .sort((a: any, b: any) => {
      const trustDelta = Number(b._trustedAuthor === true) - Number(a._trustedAuthor === true);
      if (trustDelta) return trustDelta;
      const priorityDelta = Number(b.priority || 0) - Number(a.priority || 0);
      if (priorityDelta) return priorityDelta;
      return +new Date(a.created_at) - +new Date(b.created_at);
    })]));
  const selected: any[] = [];
  while (selected.length < limit) {
    let moved = false;
    for (const ch of channels) {
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

  const { data: sourceRows, error: sourceError } = await sb.from("channel_ingest_sources")
    .select("channel,intake_mode,outgoing_contributor,priority,enabled,admin_only,admin_ids")
    .eq("enabled", true)
    .neq("intake_mode", "off");
  if (sourceError) return json({ error: "source_policy_read_failed" }, 500);

  const policies = new Map((sourceRows || []).map((row: any) => [row.channel, row]));
  const channels = [...policies.keys()];
  if (!channels.length) return json({ ok: true, hours, scanned: 0, eligible: 0, pending: 0, processed: 0, results: [] });

  const { data: vipRows } = await sb.from("wa_vip_senders")
    .select("name_match")
    .eq("active", true);

  const { data: rawRows, error } = await sb.from("channel_updates")
    .select("id,text,image_url,credit,contributor_id,channel,created_at,status,priority")
    .in("channel", channels)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return json({ error: "source_read_failed" }, 500);

  const contributorIds = [...new Set((rawRows || []).map((r: any) => r.contributor_id).filter(Boolean))];
  const trustedContributorIds = new Set<string>();
  if (contributorIds.length) {
    const { data: trustedRows } = await sb.from("contributors")
      .select("id")
      .in("id", contributorIds)
      .eq("trusted", true);
    for (const c of (trustedRows || [])) trustedContributorIds.add((c as any).id);
  }

  const enriched = (rawRows || []).map((row: any) => {
    const policy = policies.get(row.channel);
    return {
      ...row,
      _sourcePolicy: policy,
      _trustedAuthor: isTrustedAuthor(
        { contributorId: row.contributor_id || null, credit: row.credit || null },
        { trustedContributorIds, vips: vipRows || [], policy },
      ),
    };
  });
  const eligible = enriched.filter((row: any) => researchEligible(row, row._sourcePolicy));
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
  for (const row of selected) {
    try {
      results.push(await processRow(row));
    } catch {
      // One malformed/transient source must not abort the remaining bounded batch.
      // With no terminal Research Object recorded, this source remains eligible for a later retry.
      results.push({ id: row.id, channel: row.channel, state: "processing_error_retry_pending" });
    }
  }

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
