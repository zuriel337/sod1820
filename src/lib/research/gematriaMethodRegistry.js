import { supabase } from "../supabase.js";

// Canonical method-state projection. This is a reader over the existing Registry/governance
// owners; it is NOT a second Registry and owns no method truth of its own.
const METHOD_STATE_FIELDS = [
  "method_key",
  "display_label",
  "category",
  "sort_order",
  "registered",
  "active",
  "in_engine_declared",
  "executable",
  "engine_verified",
  "scannable",
  "execution_kind",
  "operator",
  "function",
  "derived_from",
  "dependency_versions",
  "method_version",
  "required_entitlement",
  "in_engine_drift",
  "not_scannable_reason",
].join(",");

export async function fetchGematriaMethodStates() {
  const { data, error } = await supabase
    .from("v_method_states")
    .select(METHOD_STATE_FIELDS)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("method_key", { ascending: true });

  if (error) throw error;
  return data || [];
}

export function indexGematriaMethodStates(rows) {
  if (!Array.isArray(rows)) return null;
  return new Map(rows.map(row => [row.method_key, row]));
}
