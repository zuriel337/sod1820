// src/lib/spatial/semanticSceneCompiler.js
// Semantic Scene Compiler — GENERALIZED CORE, re-ported unchanged from the Spatial Gematria Golden
// Slice (work_log 7f0d8ac8) since that branch is unmerged, plus ONE new adapter this task needs:
// compileTorahOccurrenceScene(). Per this task's explicit instruction ("do NOT create a parallel ELS
// Scene Compiler unless existing evidence proves the generic contract cannot represent occurrences")
// — evidence did NOT require a new primitive: TRUTH_TIERS/polar()/buildAvailableActions are reused
// exactly as-is; only a third domain adapter was added beside compileGematriaScene's slot (not
// re-ported here since unused by this task — would be dead code — but the shared core is byte-
// identical, so a future merge can carry all adapters in one file with zero conflict).
//
// Frozen Slice-0 contract: x/y/z, camera, size, color, animation, layout and LOD are PROJECTION STATE
// ONLY and never canonical knowledge. Nothing here persists; every compile is fresh and disposable.
// This module NEVER renders one scene node per Torah letter (see compileTorahOccurrenceScene below) —
// individual glyph rendering is the proven row/chunk Glyph Runtime's job, not the compiler's.

// ===== GENERIC CORE (domain-independent — identical to work_log 7f0d8ac8) =====

export const TRUTH_TIERS = {
  FACT: "FACT",
  FINDING: "FINDING",
  SOURCE_SUPPORTED: "SOURCE_SUPPORTED",
  CANDIDATE: "CANDIDATE",
  ENGINE_MISMATCH: "ENGINE_MISMATCH",
};

export function classifyResearchTruthTier(researchObject) {
  const text = JSON.stringify(researchObject).toLowerCase();
  const statement = (researchObject.statement || "").toLowerCase();
  if (statement.includes("human-gate") || statement.includes("מאומת ע\"י צוריאל") || statement.includes("מאומת על ידי צוריאל")) {
    return TRUTH_TIERS.SOURCE_SUPPORTED;
  }
  if (text.includes("candidate") || text.includes("not_generalized") || text.includes("held") || text.includes("unresolved") || text.includes("pending")) {
    return TRUTH_TIERS.CANDIDATE;
  }
  return TRUTH_TIERS.FINDING;
}

export function polar(index, count, radius, yBase) {
  const angle = (index / Math.max(count, 1)) * Math.PI * 2;
  return { x: Math.cos(angle) * radius, y: yBase, z: Math.sin(angle) * radius };
}

export function buildAvailableActions({ subjectId, sceneNodes, sceneRelations, focused, lensKeys, extra = [] }) {
  return [
    { action: "focus_subject", targetId: subjectId },
    ...sceneNodes.filter((n) => n.id !== focused).map((n) => ({ action: "select_node", targetId: n.id })),
    ...sceneRelations.map((r) => ({ action: "follow_relation", targetId: r.id })),
    { action: "show_source", targetId: focused },
    { action: "switch_depth", options: lensKeys },
    ...extra,
    { action: "back" },
  ];
}

// ===== TORAH OCCURRENCE ADAPTER (this task) =====
// LOD contract (minimum scale contract only, per task): CORPUS/BOOK SUMMARY -> CHUNK/WINDOW ->
// OCCURRENCE DETAIL. Occurrence-level truth (grapheme/niqqud/locator/path-step) is NOT carried as a
// scene node per letter — it lives in the occurrence objects themselves (torahOccurrenceAdapter.js)
// and is looked up on pick; the compiler only lays out BOOK and CHUNK summary nodes plus the path's
// own relation structure, matching the proven "don't make 10,000 glyphs 10,000 meshes" performance law.

export const TORAH_LENSES = {
  summary: { key: "summary", label: "תקציר-ספר", layers: ["book"] },
  chunk: { key: "chunk", label: "חלונות", layers: ["book", "chunk"] },
  detail: { key: "detail", label: "פירוט-מופע", layers: ["book", "chunk", "path"] },
};

const LAYER_Y = { book: 0, chunk: 0.9, path: 1.8 };

/**
 * compileTorahOccurrenceScene({ books, chunks, pathFixture }, { lens, focusId })
 * - books: [{ bookIndex, name, chunkIds:[...] }] — real book(s) covered by the currently-loaded range.
 * - chunks: [{ id, startIndex, endIndex, count, pathMemberCount }] — real 100-letter windows, computed
 *   from real occurrence data (torahOccurrenceAdapter), never invented.
 * - pathFixture: the real captured ELS path (torahElsPathFixture.js) or null.
 * Returns the standard { subjectId, sceneNodes, sceneRelations, availableActions, lens, focusId }.
 */
export function compileTorahOccurrenceScene(input, { lens = "summary", focusId = null } = {}) {
  const activeLens = TORAH_LENSES[lens] || TORAH_LENSES.summary;
  const { books, chunks, pathFixture } = input;

  const sceneNodes = [];
  const sceneRelations = [];

  const subjectId = "corpus";
  sceneNodes.push({
    id: subjectId, kind: "corpus", label: "תורה — קורפוס", subtitle: `${chunks.length} חלונות · ${chunks.reduce((s, c) => s + c.count, 0)} אותיות בטווח הנטען`,
    truthTier: TRUTH_TIERS.FACT, position: { x: 0, y: LAYER_Y.book, z: 0 },
    ref: { type: "torah_corpus", chunkCount: chunks.length },
  });

  if (activeLens.layers.includes("book")) {
    books.forEach((b, i) => {
      const id = `book:${b.bookIndex}`;
      const pos = polar(i, books.length, 2.2, LAYER_Y.book);
      sceneNodes.push({
        id, kind: "book", label: b.name, subtitle: `${b.chunkIds.length} חלונות בטווח`,
        truthTier: TRUTH_TIERS.FACT, position: pos,
        ref: { type: "torah_book", bookIndex: b.bookIndex, name: b.name },
      });
      sceneRelations.push({ id: `rel:${subjectId}->${id}`, from: subjectId, to: id, kind: "contains_book", explanation: `${b.name} — ${b.chunkIds.length} חלונות נטענים` });
    });
  }

  if (activeLens.layers.includes("chunk")) {
    chunks.forEach((c, i) => {
      const id = `chunk:${c.id}`;
      const pos = polar(i, chunks.length, 4.6, LAYER_Y.chunk);
      sceneNodes.push({
        id, kind: "chunk", label: `חלון ${c.id}`, subtitle: `${c.startIndex}–${c.endIndex - 1} (${c.count} אותיות)${c.pathMemberCount ? ` · ${c.pathMemberCount} בציר` : ""}`,
        truthTier: TRUTH_TIERS.FACT, position: pos,
        ref: { type: "torah_chunk", id: c.id, startIndex: c.startIndex, endIndex: c.endIndex, count: c.count, pathMemberCount: c.pathMemberCount },
      });
      const bookId = `book:${c.bookIndex}`;
      sceneRelations.push({ id: `rel:${bookId}->${id}`, from: bookId, to: id, kind: "contains_chunk", explanation: `אותיות ${c.startIndex}–${c.endIndex - 1}` });
    });
  }

  if (activeLens.layers.includes("path") && pathFixture) {
    const pathId = `path:${pathFixture.pathId}`;
    const pos = polar(0, 1, 7.2, LAYER_Y.path);
    sceneNodes.push({
      id: pathId, kind: "path", label: `צופן: ${pathFixture.term}`, subtitle: `דילוג ${pathFixture.skip} · ${pathFixture.positions.length} אותיות · מנוע-ELS אמיתי`,
      truthTier: TRUTH_TIERS.FACT, position: pos,
      ref: { type: "els_path", pathId: pathFixture.pathId, term: pathFixture.term, skip: pathFixture.skip, direction: pathFixture.direction, positions: pathFixture.positions, engineSource: pathFixture.engineSource },
    });
    const memberChunkIds = new Set(chunks.filter((c) => c.pathMemberCount > 0).map((c) => c.id));
    memberChunkIds.forEach((cid) => {
      const chunkNodeId = `chunk:${cid}`;
      sceneRelations.push({ id: `rel:${pathId}->${chunkNodeId}`, from: pathId, to: chunkNodeId, kind: "annotates", explanation: `הצופן «${pathFixture.term}» חוצה חלון ${cid} — הדגשה בלבד, לא שינוי-זהות של האותיות בו` });
    });
  }

  const focused = focusId && sceneNodes.some((n) => n.id === focusId) ? focusId : subjectId;
  const availableActions = buildAvailableActions({ subjectId, sceneNodes, sceneRelations, focused, lensKeys: Object.keys(TORAH_LENSES) });

  return { subjectId, sceneNodes, sceneRelations, availableActions, lens: activeLens.key, focusId: focused };
}
