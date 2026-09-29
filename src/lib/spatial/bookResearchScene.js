import {
  TRUTH_TIERS,
  classifyResearchTruthTier,
  polar,
  buildAvailableActions,
} from "./semanticSceneCompiler.js";

export const BOOK_SPATIAL_LENSES = Object.freeze({
  overview: { key: "overview", label: "מפת־ליבה" },
  deep: { key: "deep", label: "כל השכבות" },
  challenge: { key: "challenge", label: "ביקורת / Challenge" },
});

const LAYER_ORDER = Object.freeze([
  "source",
  "origin",
  "language",
  "aleph",
  "geometry",
  "manifest",
  "return",
  "challenge",
]);

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function projectionOf(row) {
  const projection = row?.meta?.ext?.spatial_projection;
  return projection && typeof projection === "object" ? projection : null;
}

function findingKeyOf(row) {
  return clean(row?.meta?.ext?.bentov_book2?.finding_key || row?.meta?.ext?.finding_key || row?.id);
}

function visibleInLens(projection, lens) {
  if (!projection?.enabled) return false;
  const lenses = Array.isArray(projection.lenses) ? projection.lenses : ["deep"];
  return lenses.includes(lens);
}

function layerIndex(layer) {
  const index = LAYER_ORDER.indexOf(clean(layer));
  return index >= 0 ? index : LAYER_ORDER.length;
}

function layoutNodes(rows) {
  const byLayer = new Map();
  for (const row of rows) {
    const projection = projectionOf(row);
    const key = clean(projection?.layer) || "research";
    if (!byLayer.has(key)) byLayer.set(key, []);
    byLayer.get(key).push(row);
  }

  const laidOut = [];
  for (const [layer, layerRows] of byLayer.entries()) {
    layerRows.sort((a, b) => Number(projectionOf(a)?.sort_order || 0) - Number(projectionOf(b)?.sort_order || 0));
    const li = layerIndex(layer);
    const radius = layer === "challenge" ? 6.6 : 2.1 + (li * 0.62);
    const yBase = layer === "challenge" ? 0.35 : Math.min(li * 0.58, 3.5);
    layerRows.forEach((row, index) => {
      laidOut.push({
        row,
        position: polar(index, layerRows.length, radius, yBase),
      });
    });
  }
  return laidOut;
}

export function hasBookSpatialProjection(rows) {
  return (Array.isArray(rows) ? rows : []).some((row) => projectionOf(row)?.enabled === true);
}

export function compileBookResearchScene(book, rows, { lens = "overview", focusId = null } = {}) {
  const activeLens = BOOK_SPATIAL_LENSES[lens] || BOOK_SPATIAL_LENSES.overview;
  const allRows = (Array.isArray(rows) ? rows : []).filter((row) => projectionOf(row)?.enabled === true);
  const visibleRows = allRows.filter((row) => visibleInLens(projectionOf(row), activeLens.key));
  const subjectId = clean(book?.identity_key) || (book?.id ? `book:${book.id}` : "book:unknown");

  const sceneNodes = [{
    id: subjectId,
    kind: "book",
    label: clean(book?.label) || "ספר",
    subtitle: "זהות הספר · אותו Research OS",
    truthTier: TRUTH_TIERS.FACT,
    position: { x: 0, y: 0, z: 0 },
    visualHint: "book",
    ref: {
      type: "book",
      nodeId: book?.id || null,
      identityKey: book?.identity_key || null,
      slug: book?.metadata?.slug || null,
    },
  }];

  const idByKey = new Map();
  const laidOut = layoutNodes(visibleRows);

  for (const { row, position } of laidOut) {
    const projection = projectionOf(row);
    const findingKey = findingKeyOf(row);
    const id = `research:${row.id}`;
    idByKey.set(findingKey, id);
    sceneNodes.push({
      id,
      kind: clean(row?.kind) || "research",
      label: clean(projection?.label) || clean(row?.statement) || "ממצא מחקר",
      subtitle: clean(projection?.summary) || clean(row?.statement),
      truthTier: row?.engine_verified === true ? TRUTH_TIERS.FACT : classifyResearchTruthTier(row),
      position,
      visualHint: clean(projection?.visual_hint) || "research",
      layer: clean(projection?.layer) || "research",
      sceneRole: clean(projection?.scene_role) || "research",
      sortOrder: Number(projection?.sort_order || 0),
      ref: {
        type: "research_object",
        researchObjectId: row?.id || null,
        findingKey,
        sourceRef: row?.source_ref || null,
        engineVerified: row?.engine_verified === true,
        verificationState: row?.engine_detail?.verification_state || null,
        status: row?.status || null,
        privacyScope: row?.privacy_scope || null,
      },
    });
  }

  const sceneRelations = [];
  const incoming = new Set();

  for (const row of visibleRows) {
    const projection = projectionOf(row);
    const fromKey = findingKeyOf(row);
    const from = idByKey.get(fromKey);
    if (!from) continue;
    const links = Array.isArray(projection?.links) ? projection.links : [];
    for (const toKeyRaw of links) {
      const toKey = clean(toKeyRaw);
      const to = idByKey.get(toKey);
      if (!to || to === from) continue;
      incoming.add(to);
      sceneRelations.push({
        id: `rel:${from}->${to}`,
        from,
        to,
        kind: "research_projection_link",
        explanation: "קישור מחקרי קיים; המיקום המרחבי הוא ייצוג בלבד.",
      });
    }
  }

  for (const node of sceneNodes) {
    if (node.id === subjectId || incoming.has(node.id)) continue;
    sceneRelations.push({
      id: `rel:${subjectId}->${node.id}`,
      from: subjectId,
      to: node.id,
      kind: "book_contains_research_projection",
      explanation: "הממצא שייך למחקר הספר; אין כאן יצירת Edge קנוני.",
    });
  }

  const requestedFocus = clean(focusId);
  const focusByKey = requestedFocus ? idByKey.get(requestedFocus) : null;
  const resolvedFocus = sceneNodes.some((node) => node.id === requestedFocus)
    ? requestedFocus
    : (focusByKey || subjectId);

  return {
    contract: "book_research_scene_v1",
    sourceContract: "research_objects.meta.ext.spatial_projection",
    projectionOnly: true,
    coordinatesCanonical: false,
    visualProximityIsEvidence: false,
    accessPolicy: "inherit_research_object",
    sceneKey: clean(book?.metadata?.projection?.spatial_golden?.scene_key) || null,
    subjectId,
    sceneNodes,
    sceneRelations,
    availableActions: buildAvailableActions({
      subjectId,
      sceneNodes,
      sceneRelations,
      focused: resolvedFocus,
      lensKeys: Object.keys(BOOK_SPATIAL_LENSES),
    }),
    lens: activeLens.key,
    focusId: resolvedFocus,
    lensOptions: Object.values(BOOK_SPATIAL_LENSES),
  };
}
