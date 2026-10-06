import { NON_CHRONOLOGICAL_LANE_KIND as K } from "./eventFamilyContextProjection.js";

// Oct7 Event Family descriptor — contextual lane membership/order as dispatched. Declarative data only:
// no identity, no graph write. Graph gaps are input reality (flags), never a backfill.
// Access tiers are NOT declared here: the caller supplies each member's explicit source tier.

export const OCT7_FAMILY = Object.freeze({
  key: "OCT7",
  label: "7 באוקטובר",
  entity_refs: Object.freeze([
    Object.freeze({ label: "חרבות ברזל", node_id: "e7b2e0dc-308f-4930-86df-94feac093a77" }),
    Object.freeze({ label: "שמחת תורה", node_id: "f3b267ff-662e-488d-a4db-1fd251922a77" }),
  ]),
});

export const OCT7_ROOT = Object.freeze({ post_id: 233, wp_id: 28247 });

export const OCT7_LANES = Object.freeze([
  { key: "ONSET", kind: "onset", ordered: false, post_ids: [174, 165] },
  { key: "GAZA_HOSTAGES", kind: "gaza_hostages", ordered: false, post_ids: [131, 127] },
  { key: "NORTH_LEBANON", kind: "north_lebanon", ordered: true, post_ids: [104, 97, 94, 92, 5005] },
  { key: "IRAN", kind: "iran", ordered: true, post_ids: [43, 42, 41, 2600] },
  { key: "INTERPRETIVE_NUMERIC", kind: K.INTERPRETIVE_NUMERIC, ordered: false, post_ids: [149, 87, 108] },
  { key: "CROSS_TIME", kind: K.CROSS_TIME, ordered: false, post_ids: [5112] },
  { key: "DIM5_CONTINUATION", kind: K.DIM5_CONTINUATION, ordered: false, post_ids: [5116] },
]);

export const OCT7_RELATIONS = Object.freeze([
  { from: "post:5116", to: "post:149", relation: "interpretive_continuation", lane: "DIM5_CONTINUATION" },
]);

// Members known (live, at dispatch) to lack graph nodes — documented input, used only to flag gaps.
export const OCT7_GRAPH_GAPS = Object.freeze({
  no_post_node: [42, 94, 174, 5005, 5112, 5116],
  no_event_node: [42, 94, 174, 5005, 5112, 5116, 149],
});

/** Build compose() input from the descriptor; `tierFor(postId)` supplies each member's explicit source tier. */
export function buildOct7FamilyInput({ tierFor, rootTier, rootDates = {}, rootOccurrence = null, packs = {} }) {
  const gaps = OCT7_GRAPH_GAPS;
  return {
    family: OCT7_FAMILY,
    root: { ...OCT7_ROOT, accessTier: rootTier, date: rootDates.date, modified: rootDates.modified, occurrence: rootOccurrence, graph: { post_node: true, event_node: true }, pack: packs[OCT7_ROOT.post_id] },
    lanes: OCT7_LANES.map(l => ({
      key: l.key,
      kind: l.kind,
      ordered: l.ordered,
      members: l.post_ids.map(id => ({
        post_id: id,
        accessTier: tierFor(id),
        graph: { post_node: !gaps.no_post_node.includes(id), event_node: !gaps.no_event_node.includes(id) },
        pack: packs[id],
      })),
    })),
    relations: OCT7_RELATIONS,
  };
}
