// Proven source-level updates, keyed by post id. An entry exists only when the
// live post_revisions pair and the authored fragment were verified; cover-only
// or other snapshots are never listed. Posts without an entry show no strip.
// The strip additionally requires the authored fragment to exist in the live
// source HTML, so a removed fragment hides the strip instead of lying.
export const PROVEN_POST_SOURCE_UPDATES = Object.freeze({
  5107: Object.freeze([
    Object.freeze({
      id: "netanyahu-77-mazal",
      targetId: "netanyahu-77-mazal",
      titleId: "netanyahu-77-title",
      label: "נתניהו בן 77 — מזל ופרשת בראשית",
      date: "2026-10-10",
      beforeRevision: 183,
      afterRevision: 184,
      attribution: "תוספת מחברת שפורסמה בפוסט",
    }),
  ]),
});

export function provenSourceUpdatesFor(postId, sourceRoot) {
  const entries = PROVEN_POST_SOURCE_UPDATES[Number(postId)] || [];
  if (!sourceRoot) return [];
  return entries.filter((entry) => sourceRoot.querySelector(`[id="${entry.targetId}"]`));
}
