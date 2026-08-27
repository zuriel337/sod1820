// ===== Spatial Research Scene presentation specs =====
// Presentation only: no engine, truth store, graph or DB identity is created here.
// Stable scene_id != post slug. The post marker points to scene_id.
// Canonical verification remains in the Research OS / engines, never duplicated here.

export const SPATIAL_REVEALS = {
  "sg_birkat_kohanim_outer_inner_v1": {
    scene_id: "sg_birkat_kohanim_outer_inner_v1",
    kind: "triangle-outer-inner",
    projectionDefault: "layered_3d",
    postSlug: "birkat-kohanim-spatial-1820-898", // integration metadata only
    title: "ברכת כהנים — החוץ והפנים",
    subtitle: "כל מילה היא אריח חי. החיצוניות מתכנסת ל־1820 — ואז נכנסים פנימה ל־898.",
    rows: [
      ["יברכך"],
      ["יהוה", "וישמרך"],
      ["יאר", "יהוה", "פניו"],
      ["אליך", "ויחנך", "ישא", "יהוה"],
      ["פניו", "אליך", "וישם", "לך", "שלום"],
    ],
    innerCells: { 2: [1], 3: [1, 2], 4: [1, 2, 3] },
    groups: {
      outer: {
        group_id: "bk_outer_boundary_v1", role: "outer",
        member_item_ids: ["r0c0","r1c0","r1c1","r2c0","r2c2","r3c0","r3c3","r4c0","r4c4"],
        label: "החיצוניות · מעטפת המשולש", aggregate_value: 1820, aggregate_operation: "sum",
      },
      inner: {
        group_id: "bk_inner_triangle_v1", role: "inner",
        member_item_ids: ["r2c1","r3c1","r3c2","r4c1","r4c2","r4c3"],
        label: "הפנים · שש המילים הפנימיות", aggregate_value: 898, aggregate_operation: "sum",
      },
    },
    outer: { label: "החיצוניות · מעטפת המשולש", value: 1820 },
    inner: { label: "הפנים · שש המילים הפנימיות", value: 898 },
    total: 2718,
    crossrefs: [
      {
        crossref_id: "bk_inner_panim_hadashot_898",
        display: "פנים חדשות",
        term: "פנים חדשות",
        value: 898,
        // Open the phrase itself so NumberDrawer can show all registered methods for it.
        drawer_value: "פנים חדשות",
        note: "לחצו כדי לפתוח את „פנים חדשות” במגירת המספר ולראות את ערכי הביטוי בשיטות השונות.",
      },
      {
        crossref_id: "divine_symmetry_tashpu_786",
        display: "סימטריה אלוהית = 786 · תשפ״ו = 786",
        term: "סימטריה אלוהית",
        value: 786,
        drawer_value: 786,
        note: "שני הערכים אומתו בגימטריה רגילה. „השנה שהכול מתגלה” — רובד פרשני.",
      },
    ],
    capabilities: {
      interactiveTiles: true, selectionGroups: true, nestedRecompose: true,
      numberDrawer: true, interactiveCrossrefs: true,
    },
  },
};

export function getSpatialReveal(sceneId) {
  if (!sceneId) return null;
  return SPATIAL_REVEALS[sceneId] || null;
}
