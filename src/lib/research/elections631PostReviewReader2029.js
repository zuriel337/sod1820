// One bounded read for the existing source Post (already supplied by the Post page).
// Read results are presentation data only; the canonical Supabase and method owners
// retain all truth/publication authority. No second body read, graph, score or cache.
import { supabase } from "../supabase.js";
import { METHODS } from "../gematria.js";
import {
  ELECTIONS_REVIEWED_PHRASES,
  isElectionsPublicSource,
  projectElections631Context,
} from "./contextualAxisPriority2029.js";

export const ELECTIONS_631_PREVIEW_ENABLED_2029 =
  import.meta.env?.VITE_ELECTIONS_631_PREVIEW === "true";

export async function readElections631PostReview2029(post, { client = supabase, methods = METHODS } = {}) {
  if (!isElectionsPublicSource(post)) return { available: false, reason: "source_not_public_or_mismatched" };
  if (!client) return { available: false, reason: "reader_unavailable" };
  const { data, error } = await client.from("gematria_words")
    .select("phrase,ragil,is_verified,is_published")
    .in("phrase", ELECTIONS_REVIEWED_PHRASES)
    .eq("ragil", 631).eq("is_verified", true).eq("is_published", true)
    .limit(ELECTIONS_REVIEWED_PHRASES.length);
  if (error) return { available: false, reason: "public_calculation_reader_error" };
  const methodFns = new Map((methods || []).map(({ key, fn }) => [key, fn]));
  const verifyCalculation = (phrase, method, value) => {
    try {
      const calculate = methodFns.get(method);
      return typeof calculate === "function" && calculate(phrase) === value;
    } catch { return false; }
  };
  return projectElections631Context({ post, gematriaRows: data || [], verifyCalculation });
}

// Research Context carries only a bounded *projection pointer*: six coverage
// categories and source identity. It never stores source body, model facts,
// calculation rows, private approvals, or the six-dimensional graph.
export function summaryForElections631Context2029(model) {
  if (!model?.available || model.sourceId !== 5107 || model.depth?.dimensions?.length !== 6) return null;
  const coverages = model.depth.dimensions.map((dim) => dim.coverage);
  if (coverages.some((status) => !["full", "partial", "none", "unmapped"].includes(status))) return null;
  return ["post:5107", ...coverages];
}
