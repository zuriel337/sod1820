// VIDEO_SEMANTIC_TREE_PROJECTOR_V1
// One-time grounded semantic mapping over an already-produced caption/transcript.
// SOURCE != TRANSCRIPT != REPRESENTATION MAP != FINDING/FACT.
//
// This module owns no persistence and no truth. It extracts bounded source mentions from text.
// The caller may persist the result only through the Research Intake-owned RPC.

const MAX_TEXT = 12000;
const MAX_ANCHORS = 18;
const MAX_LABELS = 6;

const clean = (value) => value == null ? "" : String(value).replace(/\s+/g, " ").trim();

function boundedString(value, max) {
  const v = clean(value);
  return v ? v.slice(0, max) : null;
}

function validTimecode(value, sourceText) {
  const raw = boundedString(value, 8);
  if (!raw || !/^(?:\d{1,2}:)?[0-5]?\d:[0-5]\d$/.test(raw)) return null;
  // Never invent a timestamp: the exact token must occur in the supplied source transcript.
  if (!String(sourceText || "").includes(raw)) return null;
  return raw;
}

function timecodeSeconds(value) {
  if (!value) return null;
  const parts = value.split(":").map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function normalizeLabels(input) {
  return [...new Set((Array.isArray(input) ? input : [])
    .map((v) => boundedString(v, 100))
    .filter(Boolean))]
    .slice(0, MAX_LABELS);
}

function normalizeAnchor(raw, index, sourceText) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const labels = normalizeLabels(raw.labels);
  const exactQuote = boundedString(raw.exact_quote, 220);
  if (!labels.length || !exactQuote || !String(sourceText || "").includes(exactQuote)) return null;
  const timecode = validTimecode(raw.start_timecode, sourceText);
  const numeric = Number(raw.value);
  return {
    id: boundedString(raw.id, 80) || `anchor-${index + 1}`,
    kind: ["number","expression","date","person","place","event","verse","topic"].includes(clean(raw.kind))
      ? clean(raw.kind) : "topic",
    labels,
    exact_quote: exactQuote,
    value: Number.isFinite(numeric) ? numeric : null,
    source_role: clean(raw.source_role) === "claim" ? "claim" : "mention",
    start_timecode: timecode,
    start_sec: timecodeSeconds(timecode),
  };
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(String(text || ""));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function semanticMapTerms(map) {
  const out = new Set();
  for (const anchor of Array.isArray(map?.anchors) ? map.anchors : []) {
    for (const label of anchor.labels || []) out.add(String(label));
    if (Number.isFinite(anchor.value)) out.add(String(anchor.value));
  }
  return [...out].slice(0, 80);
}

/**
 * @param {{
 *   text: string,
 *   title?: string|null,
 *   videoKey: string,
 *   mediaUrl: string,
 *   posterUrl?: string|null,
 *   sourceLang?: string|null,
 *   mappingBasis?: string,
 *   completeness?: "full"|"partial",
 *   anthropicKey: string,
 *   model?: string,
 *   fetchImpl?: typeof fetch
 * }} input
 */
export async function analyzeVideoSemanticMap({
  text,
  title = null,
  videoKey,
  mediaUrl,
  posterUrl = null,
  sourceLang = null,
  mappingBasis = "transcript",
  completeness = "full",
  anthropicKey,
  model = "claude-haiku-4-5",
  fetchImpl = fetch,
}) {
  const sourceText = String(text || "").trim().slice(0, MAX_TEXT);
  const key = clean(videoKey);
  const url = clean(mediaUrl);
  if (!sourceText || !key || !url || !anthropicKey) return { ok: false, error: "mapping_input_missing" };

  const system =
    "You create a SOURCE REPRESENTATION MAP for a video transcript/caption in SOD1820. " +
    "Use ONLY explicit words in the supplied source. Do not infer truth, identity, ideology, prophecy, causal links, hidden meanings or Gematria results. " +
    "Your job is retrieval: identify the few anchors that would let a Projector find this video again by context. " +
    "Return strict JSON only: {\"anchors\":[{\"id\":string,\"kind\":\"number|expression|date|person|place|event|verse|topic\",\"labels\":string[],\"exact_quote\":string,\"value\":number|null,\"source_role\":\"mention|claim\",\"start_timecode\":string|null}]}. " +
    "Rules: max 18 anchors; labels are exact/near-exact source names, not interpretations; exact_quote must be a contiguous substring copied from source; " +
    "value only when the number is explicitly present or explicitly spoken as an equality/identifier; source_role=claim when the speaker/source asserts an equality or proposition, otherwise mention. " +
    "start_timecode only when an explicit timestamp token such as 00:02:03 appears in the supplied source immediately before that passage; otherwise null. " +
    "Do not calculate anything. Do not translate Hebrew expressions. No markdown.";

  const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1400,
      system,
      messages: [{ role: "user", content: sourceText }],
    }),
  });
  if (!response.ok) return { ok: false, error: `semantic_map_provider_${response.status}` };
  const data = await response.json();
  const output = (data?.content || []).find((part) => part?.type === "text")?.text || "";
  const match = String(output).match(/\{[\s\S]*\}/);
  if (!match) return { ok: false, error: "semantic_map_bad_json" };

  let parsed;
  try { parsed = JSON.parse(match[0]); } catch { return { ok: false, error: "semantic_map_bad_json" }; }
  const anchors = (Array.isArray(parsed?.anchors) ? parsed.anchors : [])
    .map((anchor, index) => normalizeAnchor(anchor, index, sourceText))
    .filter(Boolean)
    .slice(0, MAX_ANCHORS);
  const transcriptHash = await sha256Hex(sourceText);
  const map = {
    version: 1,
    map_key: `video:${key}:sha256:${transcriptHash}`,
    video_key: key,
    media_url: url,
    poster_url: clean(posterUrl) || null,
    title: boundedString(title, 160),
    source_lang: clean(sourceLang) || null,
    mapping_basis: clean(mappingBasis) || "transcript",
    completeness: completeness === "partial" ? "partial" : "full",
    transcript_sha256: transcriptHash,
    source_role: "representation",
    independent_evidence: false,
    anchors,
  };

  return {
    ok: true,
    map,
    terms: semanticMapTerms(map),
    statement: `מפת תוכן פנימית לסרטון ${boundedString(title, 120) || key}. המפה מתארת מה מופיע במקור לצורכי אחזור הקשרי; היא אינה אמת, אימות או קנוניזציה.`,
    usage: data?.usage || null,
    model,
  };
}

/**
 * @param {any} result
 * @param {{sourceRef?: string|null, contributor?: string}} options
 */
export function semanticMapRpcArgs(result, { sourceRef = null, contributor = "SYSTEM:video-semantic-map" } = {}) {
  if (!result?.ok || !result.map) return null;
  const ref = clean(sourceRef) || `video:${result.map.video_key}`;
  return {
    p_source_ref: ref,
    p_statement: result.statement,
    p_terms: result.terms,
    p_meta: { ext: { video_semantic_map: result.map } },
    p_contributor: contributor,
  };
}
