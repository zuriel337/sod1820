import { topicConvergenceToUniversalFinding } from "../src/lib/research/topicConvergence.js";

let pass = 0, fail = 0;
const failures = [];
const check = (name, condition, detail = "") => {
  if (condition) { pass++; return; }
  fail++;
  failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const card = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "1820",
  title: "ציר 1820",
  subtitle: "בדיקת adapter",
  numbers: [1820, 91],
  highlight_numbers: [1820],
  status: "approved",
  quality: 9,
  meter_score: 88,
  created_at: "2026-08-01T00:00:00Z",
  approved_at: "2026-08-02T00:00:00Z",
  node_id: "22222222-2222-4222-8222-222222222222",
};

const node = {
  id: card.node_id,
  type: "convergence",
  label: card.title,
  metadata: { slug: "1820", numbers: [1820, 91] },
  is_active: true,
  weight: 5,
};

const edges = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    from_node: node.id,
    to_node: "44444444-4444-4444-8444-444444444444",
    relation_type: "contains",
    metadata: {},
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    from_node: node.id,
    to_node: "66666666-6666-4666-8666-666666666666",
    relation_type: "related",
    metadata: {},
  },
];

const targets = [
  { id: edges[0].to_node, type: "number", label: "1820", metadata: { value: 1820 }, is_active: true },
  { id: edges[1].to_node, type: "entity", label: "סוד הויה", metadata: { value: 1820 }, is_active: true },
];

const finding = topicConvergenceToUniversalFinding(
  { card, node, edges, targets },
  { createdAt: "2026-08-31T10:30:00Z" },
);

check("A1 emits one Universal Finding envelope", finding?.v === 1);
check("A2 kind is convergence", finding?.kind === "convergence");
check("A3 source-native identity is topic_card id", finding?.identity?.sourceIdentity?.owner === "topic_cards" && finding?.identity?.sourceIdentity?.id === card.id);
check("A4 canonical graph node is referenced, not copied as identity", finding?.identity?.entityRef === `node:${node.id}`);
check("A5 sourceRef points to canonical topic_cards row", finding?.source?.sourceRef === `topic_cards:${card.id}`);
check("A6 adapter never fabricates epistemic stage", finding?.stage === null);
check("A7 adapter never fabricates Research governance status", finding?.status === null);
check("A8 adapter never fabricates verification_state from graph presence", finding?.verification?.verification_state === null);
check("A9 editorial approval is preserved only as source fact", finding?.evidence?.facts?.some(f => f.type === "topic-card-source" && f.editorial_status === "approved"));
check("A10 graph relations retain exact edge refs", finding?.evidence?.refs?.includes(`edge:${edges[0].id}`) && finding?.evidence?.refs?.includes(`edge:${edges[1].id}`));
check("A11 graph relation target identity survives", finding?.evidence?.facts?.some(f => f.type === "graph-relation" && f.edge_id === edges[0].id && f.target_type === "number" && f.target_label === "1820"));
check("A12 numeric anchors are projections only", finding?.projection?.anchors?.length === 2 && finding.projection.anchors[0].value === 1820);
check("A13 meter score may be represented without becoming verification", finding?.evidence?.score === 88 && finding?.verification?.verification_state === null);
check("A14 createdBy identifies adapter, not SYSTEM truth authority", finding?.provenance?.createdBy === "ADAPTER:topic-convergence-v1");

const nodeOnly = topicConvergenceToUniversalFinding({
  node: {
    id: "77777777-7777-4777-8777-777777777777",
    type: "convergence",
    label: "Node-only convergence",
    metadata: { slug: "node-only", numbers: [42] },
    is_active: true,
  },
  edges: [],
  targets: [],
});
check("B1 node-only convergence still has source-native graph identity", nodeOnly?.identity?.sourceIdentity?.owner === "nodes" && nodeOnly?.identity?.sourceIdentity?.id === "77777777-7777-4777-8777-777777777777");
check("B2 node-only sourceRef points to nodes owner", nodeOnly?.source?.sourceRef === "nodes:77777777-7777-4777-8777-777777777777");
check("B3 node-only truth axes stay unset", nodeOnly?.stage === null && nodeOnly?.status === null && nodeOnly?.verification?.verification_state === null);
check("B4 node-only metadata.numbers (array shape) still projects its anchor", nodeOnly?.projection?.anchors?.length === 1 && nodeOnly.projection.anchors[0].value === 42);

// FOUNDATION_CLOSURE_BEFORE_WORLD_V1 (work_log 77ba98ae): 173/219 live convergence nodes store the
// value as scalar metadata.value instead of metadata.numbers — the node-only fallback must honor
// both real shapes, invent neither, and leave the card-backed path (which always wins) untouched.
const nodeOnlyScalar = topicConvergenceToUniversalFinding({
  node: { id: "88888888-8888-4888-8888-888888888888", type: "convergence", label: "Scalar node", metadata: { value: 1111 }, is_active: true },
  edges: [], targets: [],
});
check("B5 node-only metadata.value (scalar shape) projects the same anchor contract", nodeOnlyScalar?.projection?.anchors?.length === 1 && nodeOnlyScalar.projection.anchors[0].value === 1111 && nodeOnlyScalar.projection.anchors[0].type === "number");

const nodeOnlyNeither = topicConvergenceToUniversalFinding({
  node: { id: "99999999-9999-4999-8999-999999999999", type: "convergence", label: "No numeric metadata", metadata: {}, is_active: true },
  edges: [], targets: [],
});
check("B6 node-only with neither shape invents no anchor (honest empty, not fabricated)", Array.isArray(nodeOnlyNeither?.projection?.anchors) && nodeOnlyNeither.projection.anchors.length === 0);

const nodeOnlyBothShapes = topicConvergenceToUniversalFinding({
  node: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type: "convergence", label: "Array wins over scalar", metadata: { numbers: [7, 8], value: 999 }, is_active: true },
  edges: [], targets: [],
});
check("B7 when both keys are present the array shape (real invariant today) wins, scalar is not additionally invented", nodeOnlyBothShapes?.projection?.anchors?.map(a => a.value).join(",") === "7,8");

const cardPriorityFinding = topicConvergenceToUniversalFinding({
  card: { ...card },
  node: { ...node, metadata: { slug: "1820", value: 999999 } },
  edges, targets,
});
check("B8 card-backed path is unaffected by node.metadata.value — card.numbers always wins", cardPriorityFinding?.projection?.anchors?.map(a => a.value).join(",") === "1820,91");

const determinismInput = { node: { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", type: "convergence", label: "Determinism check", metadata: { value: 2026 }, is_active: true }, edges: [], targets: [] };
const det1 = topicConvergenceToUniversalFinding(determinismInput);
const det2 = topicConvergenceToUniversalFinding(determinismInput);
check("B9 projection.anchors is deterministic/pure: identical input called twice yields deepEqual anchors", JSON.stringify(det1?.projection?.anchors) === JSON.stringify(det2?.projection?.anchors) && det1?.projection?.anchors?.[0]?.value === 2026);

check("C1 unrelated node type is rejected", topicConvergenceToUniversalFinding({ node: { id: "x", type: "number", label: "1820" } }) === null);
check("C2 identity-less payload is rejected", topicConvergenceToUniversalFinding({ card: { title: "No id" } }) === null);
check("C3 label-less payload is rejected", topicConvergenceToUniversalFinding({ card: { id: "abc" } }) === null);

console.log(`\nTopic/Convergence Universal Finding test: ${pass} passed, ${fail} failed`);
if (fail) {
  console.error("FAILURES:\n" + failures.map(f => `  ✗ ${f}`).join("\n"));
  process.exit(1);
}
