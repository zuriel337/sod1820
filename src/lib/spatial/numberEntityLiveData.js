// src/lib/spatial/numberEntityLiveData.js
// READ-ONLY live data fetch for the Number/Entity Spatial Golden Scene (Slice 1).
// Reuses the ONE existing Supabase client + the ONE canonical gematria engine's own RPC output —
// no second engine, no second Reality Graph, no new tables. Every fact returned here traces to a
// live row/RPC call; nothing is hard-coded from memory.

import { supabase } from "../supabase.js";

// number_dossier_json(n) — the canonical engine's own ranked method/topic/post summary for a number.
// Already used in production (EntityPage.jsx). We call it directly, not reimplement it.
async function fetchDossier(value) {
  const { data, error } = await supabase.rpc("number_dossier_json", { n: Number(value) });
  if (error) throw error;
  return data || null;
}

// Convergence nodes containing this number — the SAME query getNumberGraph() in supabase.js uses,
// called directly here rather than duplicating a second copy of the query.
async function fetchConvergences(value) {
  const n = Number(value);
  const { data, error } = await supabase
    .from("nodes")
    .select("id,label,description,metadata")
    .eq("type", "convergence")
    .eq("is_active", true)
    .contains("metadata", { numbers: [n] });
  if (error) throw error;
  return data || [];
}

// The curated topic_card for this exact number, if one exists (a Finding, not a Fact — its own
// `findings.caveat` field, when present, is surfaced verbatim as the interpretation boundary).
async function fetchTopicCard(value) {
  const { data, error } = await supabase
    .from("topic_cards")
    .select("slug,title,subtitle,status,quality,meter_score,created_by,findings")
    .contains("numbers", [Number(value)])
    .eq("status", "approved")
    .order("meter_score", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

// A small, curated sample of research_objects mentioning this number — genuine candidate/finding
// material with its own live truth_boundary/status fields, not invented. Bounded to a handful so
// the scene stays a golden case, not a dump of the whole research corpus.
async function fetchResearchSamples(value) {
  const v = String(value);
  const { data, error } = await supabase
    .from("research_objects")
    .select("id,kind,statement,source_ref,meta,created_at")
    .or(`statement.ilike.%${v}%,source_ref.ilike.%${v}%`)
    .order("created_at", { ascending: false })
    .limit(6);
  if (error) throw error;
  return data || [];
}

// Engine-verified published representations at this exact ragil value — the FACT-tier word list,
// independent of any curated narrative (topic_cards) or candidate research (research_objects).
async function fetchVerifiedWords(value, limit = 12) {
  const { data, error } = await supabase
    .from("gematria_words")
    .select("id,phrase,ragil,source,is_verified,category")
    .eq("ragil", Number(value))
    .eq("is_published", true)
    .order("is_verified", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// One call, all live sources, read-only. Returns raw data — shaping into a scene is the compiler's
// job (semanticSceneCompiler.js), kept strictly separate per the frozen Slice-0 boundary.
export async function fetchNumberEntityLiveData(value) {
  const [dossier, convergences, topicCard, researchSamples, verifiedWords] = await Promise.all([
    fetchDossier(value).catch((e) => { console.error("number_dossier_json failed", e); return null; }),
    fetchConvergences(value).catch((e) => { console.error("convergence fetch failed", e); return []; }),
    fetchTopicCard(value).catch((e) => { console.error("topic_card fetch failed", e); return null; }),
    fetchResearchSamples(value).catch((e) => { console.error("research_objects fetch failed", e); return []; }),
    fetchVerifiedWords(value).catch((e) => { console.error("gematria_words fetch failed", e); return []; }),
  ]);
  return { value: Number(value), dossier, convergences, topicCard, researchSamples, verifiedWords };
}
