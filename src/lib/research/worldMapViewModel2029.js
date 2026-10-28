// World map UI shell → view model (UI only).
//
// Pure projection of WORLD_UNIFIED_PUBLIC_CONTENT_PROJECTION v1 into a bounded
// canvas window. It owns no reader, graph relation, finding truth or ranking.
// Layers stay separate: source → occurrence → finding → treeRelation.
//   * a tree edge exists only when it carries an edgeRef or a governanceRef;
//   * a candidate is never an edge;
//   * series / category / Topic / legacy labels are tags, never relations;
//   * an unavailable or partial window is never rendered as "no relation".

export const WORLD_MAP_LAYERS = Object.freeze(["source", "occurrence", "finding", "tree"]);
export const WORLD_MAP_NODE = Object.freeze({ width: 176, height: 56, gapX: 72, gapY: 16, pad: 24 });
export const WORLD_MAP_DEFAULT_WINDOW = Object.freeze({ sources: 6, occurrencesPerSource: 2, findingsPerSource: 2 });

const clean = (value) => value == null ? "" : String(value).trim();
const list = (value) => Array.isArray(value) ? value : [];

export const nodeId = (kind, ref) => `${kind}:${ref}`;

export const KIND_LABEL = Object.freeze({
  source: "מקור",
  occurrence: "הופעה",
  finding: "ממצא",
  tree: "יעד בעץ",
});

// Honest per-finding relation window. Only "ok" may say that nothing was found,
// and even then only "in the window that was read".
export const RELATION_STATUS = Object.freeze(["idle", "loading", "ok", "partial", "failed", "unavailable"]);

export function relationStatusCopy(status, count = 0) {
  switch (status) {
    case "loading": return "פותח קשרי עץ מתועדים…";
    case "ok": return count
      ? `נפתחו ${count} קשרים מתועדים בחלון שנקרא.`
      : "לא נמצאו קשרים מתועדים בחלון שנקרא. אין להסיק מכך שאין קשרים נוספים בעץ.";
    case "partial": return count
      ? `נפתחו ${count} קשרים, אך חלון הקריאה חלקי — ייתכנו קשרים נוספים שלא נטענו.`
      : "חלון הקריאה חלקי — לא ידוע אם קיימים קשרים. אין זה אומר שאין קשר.";
    case "failed": return "קריאת הקשרים נכשלה. מצב הקשרים לא ידוע — אין זה אומר שאין קשר.";
    case "unavailable": return "פתיחת קשרי עץ אינה זמינה לפריט זה בתצוגה הנוכחית.";
    default: return "קשרי עץ נפתחים רק לפי בקשה.";
  }
}

// An edge row is a tree edge only with documented provenance.
export function isTreeEdgeEvidence(row) {
  return Boolean(clean(row?.edgeRef) || clean(row?.governanceRef));
}

function pickWindow(items, limit) {
  const max = Number.isFinite(limit) ? Math.max(0, limit) : items.length;
  return items.slice(0, max);
}

/**
 * @param {object} input
 * @param {object} input.projection  v1 envelope (already public-reader approved)
 * @param {object} [input.relationStates] findingRef → {status, anchorNodeId, relations[]}
 * @param {object} [input.window]  bounds how many sources/occurrences/findings reach the canvas
 */
export function buildWorldMapViewModel({ projection, relationStates = {}, window: windowSpec = {} } = {}) {
  const bounds = { ...WORLD_MAP_DEFAULT_WINDOW, ...windowSpec };
  const coverage = projection?.coverage || {};
  const allSources = list(projection?.sources);
  const sources = pickWindow(allSources, bounds.sources);
  const sourceRefs = new Set(sources.map((source) => source.sourceRef));

  const nodes = [];
  const edges = [];
  const index = new Map();
  const add = (node) => { if (!index.has(node.id)) { index.set(node.id, node); nodes.push(node); } return index.get(node.id); };

  for (const source of sources) {
    add({ id: nodeId("source", source.sourceRef), kind: "source", ref: source.sourceRef, label: source.title || source.sourceRef, data: source });
  }

  const occurrencesBySource = new Map();
  for (const occurrence of list(projection?.occurrences)) {
    if (!sourceRefs.has(occurrence.sourceRef)) continue;
    const bucket = occurrencesBySource.get(occurrence.sourceRef) || [];
    bucket.push(occurrence);
    occurrencesBySource.set(occurrence.sourceRef, bucket);
  }
  let occurrencesHidden = 0;
  for (const source of sources) {
    const all = occurrencesBySource.get(source.sourceRef) || [];
    const shown = pickWindow(all, bounds.occurrencesPerSource);
    occurrencesHidden += all.length - shown.length;
    for (const occurrence of shown) {
      const id = add({ id: nodeId("occurrence", occurrence.occurrenceRef), kind: "occurrence", ref: occurrence.occurrenceRef,
        label: occurrence.locator || occurrence.occurrenceRef, data: occurrence }).id;
      // Containment: the occurrence lives inside its source. Not a tree relation.
      edges.push({ id: `contains:${source.sourceRef}>${occurrence.occurrenceRef}`, kind: "provenance", from: nodeId("source", source.sourceRef), to: id, label: "מופיע במקור" });
    }
  }

  const findingsBySource = new Map();
  for (const finding of list(projection?.findings)) {
    for (const ref of finding.sourceRefs) {
      if (!sourceRefs.has(ref)) continue;
      const bucket = findingsBySource.get(ref) || [];
      bucket.push(finding);
      findingsBySource.set(ref, bucket);
    }
  }
  let findingsHidden = 0;
  for (const source of sources) {
    const all = findingsBySource.get(source.sourceRef) || [];
    const shown = pickWindow(all, bounds.findingsPerSource);
    findingsHidden += all.length - shown.length;
    for (const finding of shown) {
      const id = add({ id: nodeId("finding", finding.findingRef), kind: "finding", ref: finding.findingRef, label: finding.findingRef, data: finding }).id;
      edges.push({ id: `evidence:${finding.findingRef}<${source.sourceRef}`, kind: "provenance", from: nodeId("source", source.sourceRef), to: id, label: "מבוסס על מקור" });
    }
  }

  // Documented tree relations carried by the projection itself.
  for (const relation of list(projection?.treeRelations)) {
    const findingNode = index.get(nodeId("finding", relation.findingRef));
    if (!findingNode || !isTreeEdgeEvidence(relation)) continue;
    const target = add({ id: nodeId("tree", relation.targetRef), kind: "tree", ref: relation.targetRef, label: relation.targetRef, data: relation });
    edges.push({ id: `tree:${relation.findingRef}>${relation.targetRef}:${relation.edgeRef || relation.governanceRef}`, kind: "tree",
      from: findingNode.id, to: target.id, edgeRef: relation.edgeRef || null, governanceRef: relation.governanceRef || null, label: "קשר עץ מתועד" });
  }

  // Relations the visitor explicitly opened (exact graph read). Only edge: refs.
  for (const [findingRef, state] of Object.entries(relationStates || {})) {
    const findingNode = index.get(nodeId("finding", findingRef));
    if (!findingNode) continue;
    for (const relation of list(state?.relations)) {
      if (!clean(relation?.edgeRef).startsWith("edge:")) continue;
      const anchor = clean(state.anchorNodeId);
      const otherId = clean(relation.fromNodeId) === anchor ? clean(relation.toNodeId) : clean(relation.fromNodeId);
      if (!otherId) continue;
      const otherLabel = clean(relation.fromNodeId) === anchor ? relation.toLabel : relation.fromLabel;
      const target = add({ id: nodeId("tree", `node:${otherId}`), kind: "tree", ref: `node:${otherId}`, label: clean(otherLabel) || `node:${otherId}`, data: { targetRef: `node:${otherId}`, opened: true } });
      edges.push({ id: `tree:${findingRef}>${relation.edgeRef}`, kind: "tree", from: findingNode.id, to: target.id,
        edgeRef: relation.edgeRef, governanceRef: null, label: clean(relation.relationType) || "קשר" });
    }
  }

  layoutWorldMap(nodes);
  placeTreeTargets(nodes, edges);
  const { pad } = WORLD_MAP_NODE;
  const minX = Math.min(0, ...nodes.map((node) => node.x));
  const minY = Math.min(0, ...nodes.map((node) => node.y));
  const maxX = Math.max(WORLD_MAP_NODE.width, ...nodes.map((node) => node.x + node.width));
  const maxY = Math.max(WORLD_MAP_NODE.height, ...nodes.map((node) => node.y + node.height));
  const extent = { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };

  const total = coverage.sources?.available === false ? null : (projection?.metrics?.corpusSources ?? allSources.length);
  return Object.freeze({
    nodes,
    edges,
    extent,
    stats: Object.freeze({
      sourcesShown: sources.length,
      sourcesTotal: total,
      sourcesHidden: total == null ? null : Math.max(0, total - sources.length),
      occurrencesHidden,
      findingsHidden,
    }),
    coverage: Object.freeze({
      sources: coverage.sources?.available !== false,
      occurrences: coverage.occurrences?.available !== false,
      findings: coverage.findings?.available !== false,
      treeRelations: coverage.treeRelations?.available !== false,
    }),
  });
}

// RTL: the source layer is anchored at x=0 (visual right) and deeper layers
// grow to the left, so opening a tree layer never moves a node already drawn.
// Rows are banded per source so occurrences/findings sit beside their source.
export function layoutWorldMap(nodes) {
  const { width, height, gapX, gapY } = WORLD_MAP_NODE;
  const row = height + gapY;
  const place = (node, layer, y) => Object.assign(node, { layer, x: -layer * (width + gapX), y, width, height });
  const sources = nodes.filter((node) => node.kind === "source");
  const parentOf = (node) => node.kind === "occurrence" ? node.data.sourceRef : node.data.sourceRefs.find((ref) => sources.some((source) => source.ref === ref));
  let top = 0;
  for (const source of sources) {
    const children = (kind) => nodes.filter((node) => node.kind === kind && parentOf(node) === source.ref);
    const occurrences = children("occurrence");
    const findings = children("finding");
    occurrences.forEach((node, index) => place(node, 1, top + index * row));
    findings.forEach((node, index) => place(node, 2, top + index * row));
    place(source, 0, top);
    top += Math.max(1, occurrences.length, findings.length) * row;
  }
  return nodes;
}

export function placeTreeTargets(nodes, edges) {
  const { width, height, gapX, gapY } = WORLD_MAP_NODE;
  const row = height + gapY;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const taken = new Set();
  for (const node of nodes.filter((candidate) => candidate.kind === "tree")) {
    const incoming = edges.find((edge) => edge.to === node.id);
    let y = byId.get(incoming?.from)?.y ?? 0;
    while (taken.has(y)) y += row;
    taken.add(y);
    Object.assign(node, { layer: 3, x: -3 * (width + gapX), y, width, height });
  }
  return nodes;
}

export function edgePath(from, to) {
  // Right-to-left bezier between node edges (source layer is on the right).
  const x1 = from.x;
  const y1 = from.y + from.height / 2;
  const x2 = to.x + to.width;
  const y2 = to.y + to.height / 2;
  const dx = Math.max(24, (x1 - x2) / 2);
  return `M ${x1} ${y1} C ${x1 - dx} ${y1}, ${x2 + dx} ${y2}, ${x2} ${y2}`;
}

/** Inspector DTO. Keeps source / occurrence / finding / tree facts apart. */
export function describeWorldMapNode(model, projection, id) {
  const node = model.nodes.find((candidate) => candidate.id === id);
  if (!node) return null;
  const base = { id: node.id, kind: node.kind, kindLabel: KIND_LABEL[node.kind], ref: node.ref, title: node.label };
  if (node.kind === "source") {
    const source = node.data;
    const seriesCategories = list(projection?.seriesCategories).filter((item) => item.sourceRefs.includes(source.sourceRef));
    return {
      ...base,
      boundary: "מקור הוא מקור. ממצא והופעה שמבוססים עליו אינם מקור נוסף.",
      contributor: source.contributor, publisher: source.publisher, href: source.sourceHref, media: source.media,
      occurrences: list(projection?.occurrences).filter((item) => item.sourceRef === source.sourceRef),
      findings: list(projection?.findings).filter((item) => item.sourceRefs.includes(source.sourceRef)),
      tags: seriesCategories.map((item) => ({ key: item.key, kind: item.kind === "series" ? "סדרה" : "קטגוריה", label: item.label })),
      tagNote: seriesCategories.length ? "סדרה וקטגוריה הן תיוג בלבד, לא קשר עץ." : null,
    };
  }
  if (node.kind === "occurrence") {
    const occurrence = node.data;
    return { ...base, boundary: "הופעה היא מיקום בתוך מקור קיים. אינה מקור עצמאי ואינה נספרת כמקור.",
      parentSourceRef: occurrence.sourceRef, locator: occurrence.locator, href: occurrence.href, times: occurrence.times };
  }
  if (node.kind === "finding") {
    const finding = node.data;
    return { ...base, boundary: "ממצא נשען על מקור אך אינו המקור, ואינו קשר עץ בפני עצמו.",
      sourceRefs: finding.sourceRefs, href: finding.href, stage: finding.stage,
      verificationState: finding.verificationState, publicationState: finding.publicationState };
  }
  const evidence = model.edges.filter((edge) => edge.kind === "tree" && edge.to === node.id);
  return { ...base, title: node.label, boundary: "יעד בעץ מוצג רק כשיש edgeRef או governanceRef מתועד.",
    evidence: evidence.map((edge) => ({ edgeRef: edge.edgeRef, governanceRef: edge.governanceRef, relationLabel: edge.label })) };
}

/** Arrow-key target: layers run right→left in RTL; rows run top→bottom. */
export function neighborInDirection(nodes, currentId, direction) {
  const current = nodes.find((node) => node.id === currentId);
  if (!current) return nodes[0]?.id ?? null;
  const dx = direction === "left" ? -1 : direction === "right" ? 1 : 0;
  const dy = direction === "down" ? 1 : direction === "up" ? -1 : 0;
  const candidates = nodes.filter((node) => node.id !== current.id && (dx
    ? Math.sign(node.x - current.x) === dx
    : node.layer === current.layer && Math.sign(node.y - current.y) === dy));
  if (!candidates.length) return null;
  const score = (node) => dx
    ? Math.abs(node.x - current.x) * 4 + Math.abs(node.y - current.y)
    : Math.abs(node.y - current.y);
  return candidates.sort((a, b) => score(a) - score(b))[0].id;
}
