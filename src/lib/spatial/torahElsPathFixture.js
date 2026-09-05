// src/lib/spatial/torahElsPathFixture.js
// ONE real result captured from the existing canonical ELS engine (public/tzofen.html — the exact
// production build from tools/els/build.py, no reimplementation). Not hand-authored positions.
//
// PROVENANCE: captured this session by driving the real production tool through its own #q/#go UI
// (term "משיח" typed exactly as a user would; the one-time onboarding gate bypassed via the SAME
// localStorage flag a returning real user already has, tzofen_onboarded_v1 — no engine code touched),
// then reading the real rendered grid's own `.mc.main[data-i]` cells — the exact DOM the production
// tool already uses for its own "click a letter to see its location" feature. Captured on
// 2026-09-05 during branch claude/torah-occurrence-spatial-adapter, see work_log d504776d/[AFTER id].
//
// INDEPENDENTLY VERIFIED (not just trusted from the DOM): re-read tools/els/data/tk-letters.txt at
// these 4 exact positions directly (bypassing the UI entirely) and confirmed they spell מ-ש-י-ח with
// a constant step of 8 — i.e. this fixture reproduces byte-for-byte from the raw corpus file itself,
// independent of the search UI.
export const TORAH_ELS_PATH_FIXTURE = {
  pathId: "torah-els-fixture:mashiach-skip8",
  term: "משיח",
  positions: [13936, 13944, 13952, 13960],
  skip: 8,
  direction: 1,
  scope: "torah",
  engineSource: "public/tzofen.html (tools/els/build.py output, els_single_engine_law)",
  capturedVia: "real #q/#go search, real .mc.main[data-i] DOM read",
  independentlyVerifiedAgainst: "tools/els/data/tk-letters.txt (direct read, bypassing UI)",
  expectedLocator: { book: "בראשית", chapter: 11, verse: 29 }, // all 4 letters land in the same verse
};

// A path is ANNOTATION, never identity — this Map is discarded/rebuilt on every render, exactly like
// scene coordinates. Removing/changing it must not rebuild or renumber any occurrence's corpusIndex.
export function buildPathAnnotationMap(fixture = TORAH_ELS_PATH_FIXTURE) {
  const map = new Map();
  fixture.positions.forEach((pos, step) => {
    map.set(pos, { pathId: fixture.pathId, step, skip: fixture.skip, direction: fixture.direction });
  });
  return map;
}
