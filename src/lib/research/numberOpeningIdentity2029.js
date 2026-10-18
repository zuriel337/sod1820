import { supabase } from "../supabase.js";
import { numberAnchorToUniversalFinding } from "./numberAnchorFinding.js";

const NODE_FIELDS = "id,type,label,description,metadata,identity_key,is_active,created_at";
const NUMBER_ANCHOR_FIELDS = "value,category,fact,hint,created_at,updated_at";
const HUB_ROUTE = "/entity-hub-preview";

const clean = (value) => value == null ? "" : String(value).trim();
const isAccessDenied = (error) => error?.code === "42501" || /permission denied/i.test(String(error?.message || ""));

export const entityHubHref = (type, key) => `${HUB_ROUTE}/${encodeURIComponent(type)}/${encodeURIComponent(key)}`;

/**
 * Small canonical identity reader shared by the compact Number opening and the full Entity Hub.
 * Keeping this seam outside entityHubProjection prevents the full graph/research projection from
 * entering the Number opening module graph while preserving one resolver and one identity contract.
 */
export async function resolveEntityHubNode({ nodeId = null, type = null, key = null } = {}) {
  const exactNodeId = clean(nodeId);
  if (exactNodeId) {
    const { data, error } = await supabase
      .from("nodes")
      .select(NODE_FIELDS)
      .eq("id", exactNodeId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  const entityType = clean(type);
  const entityKey = clean(key);
  if (!entityType || !entityKey) return null;

  const { data: identityHit, error: identityError } = await supabase
    .from("nodes")
    .select(NODE_FIELDS)
    .eq("type", entityType)
    .eq("identity_key", entityKey)
    .limit(1);
  if (identityError) throw identityError;
  if (identityHit?.[0]) return identityHit[0];

  const { data: labelHit, error: labelError } = await supabase
    .from("nodes")
    .select(NODE_FIELDS)
    .eq("type", entityType)
    .eq("label", entityKey)
    .limit(1);
  if (labelError) throw labelError;
  return labelHit?.[0] || null;
}

export async function fetchNumberAnchorProfile(number) {
  const { data, error } = await supabase
    .from("number_anchors")
    .select(NUMBER_ANCHOR_FIELDS)
    .eq("value", number)
    .maybeSingle();
  if (error) {
    if (isAccessDenied(error)) {
      return {
        row: null,
        finding: null,
        access: { available: false, reason: "number_anchor_not_readable_for_current_session" },
      };
    }
    throw error;
  }
  const row = data || null;
  return {
    row,
    finding: row ? numberAnchorToUniversalFinding(row) : null,
    access: { available: true, reason: null },
  };
}

function projectNumberNodeIdentity(node) {
  return {
    nodeId: String(node.id),
    type: node.type,
    key: node.identity_key || String(node.id),
    label: node.label,
    hubHref: entityHubHref(node.type, node.label),
  };
}

// Identity-only gate for the compact Number opening. It performs no anchor, family, graph,
// research or full-row read. A label mismatch fails closed before any dependent request begins.
export async function fetchNumberOpeningIdentity(number) {
  if (number == null || (typeof number === "string" && !number.trim())) return null;
  const value = Number(number);
  if (!Number.isSafeInteger(value)) return null;

  const node = await resolveEntityHubNode({ type: "number", key: String(value) });
  if (!node) return null;

  const resolvedValue = Number(node.label);
  if (!Number.isSafeInteger(resolvedValue) || resolvedValue !== value) return null;

  return {
    value: resolvedValue,
    identity: projectNumberNodeIdentity(node),
  };
}

// Backward-compatible combined seam for non-critical callers. Performance-sensitive callers use
// fetchNumberOpeningIdentity first and start the compact projection and this anchor read together.
export async function fetchNumberOpeningContext(number) {
  const openingIdentity = await fetchNumberOpeningIdentity(number);
  if (!openingIdentity) return null;

  return {
    identity: openingIdentity.identity,
    anchorProfile: await fetchNumberAnchorProfile(openingIdentity.value),
  };
}
