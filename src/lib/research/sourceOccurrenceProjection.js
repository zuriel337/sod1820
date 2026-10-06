// Bounded exact source-occurrence projection v1 — PROJECTION ONLY.
//
// Resolves ONLY sourceRefs already carried by authorized Universal Findings. Exact id lookup,
// no text/fuzzy search, no table scan, no global source store. Unsupported/freeform refs are
// ignored (never guessed). RLS/access denial or an absent row leaves the ref unresolved —
// access is never widened. Source author comes from the occurrence's own contributor_id only;
// never from research_object.row.contributor, uploader, or Human Gate actors.

export const SOURCE_OCCURRENCE_MAX_REFS = 40;
const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const CHANNEL_UPDATES_REF = new RegExp(`^channel_updates:(${UUID})$`);

const clean = (value) => (value == null ? "" : String(value).trim());

// Exact base source identity: strips a "#fragment" and nothing else.
export function baseSourceRef(ref) {
  const text = clean(ref);
  if (!text) return "";
  const hash = text.indexOf("#");
  return hash === -1 ? text : text.slice(0, hash);
}

// Returns { kind, id, ref } for an explicitly supported canonical prefix, else null.
export function parseSupportedSourceRef(ref) {
  const base = baseSourceRef(ref);
  const m = CHANNEL_UPDATES_REF.exec(base);
  return m ? { kind: "channel_updates", id: m[1].toLowerCase(), ref: base } : null;
}

/**
 * @param {Array} findings already access-filtered Universal Findings
 * @returns {{kind:string,id:string,ref:string}[]} unique supported exact refs, capped
 */
export function collectSupportedSourceRefs(findings, { limit = SOURCE_OCCURRENCE_MAX_REFS } = {}) {
  const out = new Map();
  for (const f of Array.isArray(findings) ? findings : []) {
    const parsed = parseSupportedSourceRef(f?.source?.sourceRef);
    if (parsed && !out.has(parsed.ref)) out.set(parsed.ref, parsed);
    if (out.size >= limit) break;
  }
  return [...out.values()];
}

/**
 * @param {Array} findings already access-filtered Universal Findings
 * @param {{client:{from:Function}, limit?:number}} options injected Supabase-like client
 * @returns {Promise<Record<string,{createdAt,status,channel,contributorId,contributorName}>>}
 *   keyed by exact base sourceRef; empty on any failure.
 */
export async function fetchSourceOccurrences(findings, { client, limit = SOURCE_OCCURRENCE_MAX_REFS } = {}) {
  try {
    const refs = collectSupportedSourceRefs(findings, { limit: Math.min(Number(limit) || SOURCE_OCCURRENCE_MAX_REFS, SOURCE_OCCURRENCE_MAX_REFS) });
    const ids = refs.filter((r) => r.kind === "channel_updates").map((r) => r.id);
    if (!client || !ids.length) return {};
    const { data: sources, error } = await client
      .from("channel_updates")
      .select("id, created_at, status, channel, contributor_id, credit, speaker")
      .in("id", ids);
    if (error || !Array.isArray(sources) || !sources.length) return {};

    const contributorIds = [...new Set(sources.map((s) => clean(s.contributor_id)).filter(Boolean))];
    const names = new Map();
    if (contributorIds.length) {
      const { data: people, error: peopleError } = await client
        .from("contributors")
        .select("id, display_name")
        .in("id", contributorIds);
      if (!peopleError && Array.isArray(people)) {
        for (const p of people) if (clean(p?.id) && clean(p?.display_name)) names.set(clean(p.id), clean(p.display_name));
      }
    }

    const byId = new Map(sources.map((s) => [clean(s.id).toLowerCase(), s]));
    const out = {};
    for (const ref of refs) {
      const row = byId.get(ref.id);
      if (!row) continue;
      const contributorId = clean(row.contributor_id) || null;
      out[ref.ref] = {
        createdAt: clean(row.created_at) || null,
        status: clean(row.status) || null,
        channel: clean(row.channel) || null,
        contributorId,
        contributorName: (contributorId && names.get(contributorId)) || null,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export default fetchSourceOccurrences;
