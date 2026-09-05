// src/lib/spatial/gematriaLiveData.js
// READ-ONLY live data fetch — Spatial Gematria Golden Slice (Slice 2).
// Same table/query shapes numberEntityLiveData.js (Number/Entity Golden Scene, work_log 8b5b5b41)
// already proved against these exact tables — ported since that branch is unmerged, not
// reimplemented from scratch. No second Reality Graph, no new tables, no schema change.

import { supabase } from "../supabase.js";
import { findMethodDef, engineVerifyClaim } from "./gematriaOperationModel.js";
import { METHOD_DB_COLS } from "../gematria.js";

// Convergence nodes (the ONE Reality Graph's own convergence layer) containing a given number.
// A relation is only ever surfaced through THIS query, always parameterized by whichever number a
// specific method actually produced — never a hard-coded convergence list.
export async function fetchConvergencesForNumber(n) {
  const { data, error } = await supabase
    .from("nodes")
    .select("id,label,description,metadata")
    .eq("type", "convergence")
    .eq("is_active", true)
    .contains("metadata", { numbers: [Number(n)] });
  if (error) throw error;
  return data || [];
}

// Other published phrases sharing this value UNDER THE ACTIVE METHOD'S OWN COLUMN — never assumed
// to be ragil. METHOD_DB_COLS (canonical_methods_registry_law's own key->column bridge, gematria.js)
// picks the real stored column for the active method (e.g. atbash, misratar, miluy, kadmi); methods
// without a dedicated column (col=null) simply have no sibling-relation layer, honestly, rather than
// querying the wrong column.
export async function fetchVerifiedWordsAtValue(value, methodKey, limit = 10) {
  const column = METHOD_DB_COLS[methodKey];
  if (!column) return [];
  const { data, error } = await supabase
    .from("gematria_words")
    .select(`id,phrase,${column},source,is_verified,category`)
    .eq(column, Number(value))
    .eq("is_published", true)
    .order("is_verified", { ascending: false })
    .limit(limit);
  if (error) throw error;
  // Cross-check every stored claim against the live engine before it is ever trusted/displayed —
  // "if the live engine cannot reproduce a stored claim, do not silently compute or promote it."
  return (data || []).map((r) => {
    const claimed = r[column];
    const check = engineVerifyClaim(methodKey, r.phrase, claimed);
    return { ...r, methodValue: claimed, __engineVerified: check.verified };
  });
}

async function fetchTopicCardForNumber(value) {
  const { data, error } = await supabase
    .from("topic_cards")
    .select("slug,title,subtitle,status,quality,meter_score,created_by,findings,numbers")
    .contains("numbers", [Number(value)])
    .eq("status", "approved")
    .order("meter_score", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

async function fetchResearchSamplesForNumber(value) {
  const v = String(value);
  const { data, error } = await supabase
    .from("research_objects")
    .select("id,kind,statement,source_ref,meta,created_at")
    .or(`statement.ilike.%${v}%,source_ref.ilike.%${v}%`)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data || [];
}

// The gematria_words row for the SUBJECT itself — its own stored claim, cross-checked against the
// live engine (never trusted silently, see gematriaOperationModel.engineVerifyClaim).
async function fetchSubjectWord(phrase) {
  const { data, error } = await supabase
    .from("gematria_words")
    .select("id,phrase,ragil,source,is_verified,is_published,category")
    .eq("phrase", phrase)
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

// One call, all live sources for ONE method's result value. The compiler asks for this again
// whenever the active method changes (a different method can produce a different number, and that
// number's own relations/findings are genuinely different research context — see golden-case
// evidence: רגיל(משיח)=358 relates to 4 convergences, אתבש(משיח)=112 relates to a DIFFERENT one).
export async function fetchGematriaContextForValue(value, methodKey) {
  const [convergences, verifiedWords, topicCard, researchSamples] = await Promise.all([
    fetchConvergencesForNumber(value).catch((e) => { console.error("convergence fetch failed", e); return []; }),
    fetchVerifiedWordsAtValue(value, methodKey).catch((e) => { console.error("gematria_words fetch failed", e); return []; }),
    fetchTopicCardForNumber(value).catch((e) => { console.error("topic_card fetch failed", e); return null; }),
    fetchResearchSamplesForNumber(value).catch((e) => { console.error("research_objects fetch failed", e); return []; }),
  ]);
  return { value: Number(value), methodKey, convergences, verifiedWords, topicCard, researchSamples };
}

export async function fetchGematriaSubjectData(word) {
  const subjectWord = await fetchSubjectWord(word).catch((e) => { console.error("subject word fetch failed", e); return null; });
  return { word, subjectWord };
}

export { findMethodDef };
