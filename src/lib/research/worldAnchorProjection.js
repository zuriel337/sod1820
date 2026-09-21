import { supabase } from "../supabase.js";

const ROOT_VALUES = [1820, 776];
const EDGE_ROLE = "research_anchor_branch";
const NODE_FIELDS = "id,type,label,metadata,is_active";

function cleanNumber(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

export async function fetchWorldAnchorProjection() {
  if (!supabase) return { roots: [], generatedAt: null };

  const { data: rootNodes, error: rootError } = await supabase
    .from("nodes")
    .select(NODE_FIELDS)
    .eq("type", "number")
    .eq("is_active", true)
    .in("label", ROOT_VALUES.map(String));
  if (rootError) throw rootError;

  const rootsByValue = new Map((rootNodes || [])
    .map((node) => [cleanNumber(node?.label), node])
    .filter(([value]) => value != null));

  const rootIds = [...rootsByValue.values()].map((node) => node.id).filter(Boolean);
  if (!rootIds.length) return { roots: [], generatedAt: new Date().toISOString() };

  const { data: edges, error: edgeError } = await supabase
    .from("edges")
    .select("id,from_node,to_node,relation_type,metadata,created_at")
    .in("from_node", rootIds)
    .eq("relation_type", "related")
    .eq("metadata->>relation_role", EDGE_ROLE)
    .order("created_at", { ascending: true })
    .limit(24);
  if (edgeError) throw edgeError;

  const childIds = [...new Set((edges || []).map((edge) => edge.to_node).filter(Boolean))];
  let childNodes = [];
  if (childIds.length) {
    const { data, error } = await supabase
      .from("nodes")
      .select(NODE_FIELDS)
      .in("id", childIds)
      .eq("is_active", true)
      .limit(24);
    if (error) throw error;
    childNodes = data || [];
  }

  const nodesById = new Map([...(rootNodes || []), ...childNodes].map((node) => [String(node.id), node]));

  const roots = ROOT_VALUES.map((value) => {
    const rootNode = rootsByValue.get(value);
    if (!rootNode) return null;
    const children = (edges || [])
      .filter((edge) => String(edge.from_node) === String(rootNode.id))
      .map((edge) => {
        const child = nodesById.get(String(edge.to_node));
        const childValue = cleanNumber(child?.label);
        if (!child || childValue == null) return null;
        return {
          id: child.id,
          value: childValue,
          label: child.label,
          edgeId: edge.id,
          relationRole: edge?.metadata?.relation_role || EDGE_ROLE,
          explainWhy: edge?.metadata?.explain_why || null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.value - b.value);

    return {
      id: rootNode.id,
      value,
      label: rootNode.label,
      role: value === 1820 ? "super_anchor" : "research_anchor",
      children,
    };
  }).filter(Boolean);

  return { roots, generatedAt: new Date().toISOString() };
}

export default fetchWorldAnchorProjection;
