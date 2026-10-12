// Proven source-level updates, keyed by post id. An entry exists only when the
// live post_revisions pair and the authored fragment were verified; cover-only
// or other snapshots are never listed. Posts without an entry show no strip.
// The strip additionally requires the authored fragment to exist in the live
// source HTML, so a removed fragment hides the strip instead of lying.
export const PROVEN_POST_SOURCE_UPDATES = Object.freeze({
  5107: Object.freeze([
    Object.freeze({
      id: "netanyahu-77-mazal",
      sourceSlug: "sharshar-elections-redemption-hints-draft",
      // Exact revision-pair publication timestamp, not the later cover-only snapshot.
      sourceModifiedAt: "2026-10-10T23:19:35.974936Z",
      updatedAt: "2026-10-10T23:19:35.974936Z",
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

/**
 * Public-safe PROJECTION of an already owner-reviewed source-section revision.
 *
 * Revision snapshots are admin-only in Supabase. A public reader may NOT read
 * post_revisions or infer an update from posts.modified alone. It can consume
 * this existing bounded proof only when the public source still matches the
 * certified post identity, slug and exact body-modified revision.
 *
 * Missing proof, a changed source version or a hidden/draft post => no event.
 * The original post publication and ordinary source href remain separate.
 */
export function publicProvenPostSourceUpdate(row) {
  const id = Number(row?.id);
  const slug = String(row?.slug || "").trim();
  if (!Number.isSafeInteger(id) || !slug || row?.home_hidden === true) return null;
  if (["gpt-draft", "web"].includes(String(row?.source || "").trim().toLowerCase())) return null;
  if ((Array.isArray(row?.tags) ? row.tags : []).some((tag) => ["טיוטה", "פורום"].includes(String(tag).trim()))) return null;
  const modifiedAt = Date.parse(String(row?.modified || ""));
  if (!Number.isFinite(modifiedAt)) return null;

  const entries = PROVEN_POST_SOURCE_UPDATES[id] || [];
  for (const entry of [...entries].sort((a, b) => b.afterRevision - a.afterRevision)) {
    if (entry.sourceSlug !== slug || modifiedAt !== Date.parse(entry.sourceModifiedAt)) continue;
    if (!Number.isSafeInteger(entry.afterRevision) || !Number.isSafeInteger(entry.beforeRevision)) continue;
    if (entry.afterRevision <= entry.beforeRevision || !/^[-a-z0-9]+$/.test(entry.targetId || "")) continue;
    // If a caller DID load live source HTML, require the original fragment.
    // Public feed readers don't download all article bodies for this decision:
    // the exact owner-certified modified/version tuple is the bounded witness.
    if (typeof row.content === "string" &&
        !row.content.includes(`id="${entry.targetId}"`) &&
        !row.content.includes(`id='${entry.targetId}'`)) continue;
    const sourceRef = `posts:${id}`;
    const fragmentRef = `${sourceRef}#${entry.targetId}`;
    const eventKey = `${fragmentRef}@revision:${entry.afterRevision}`;
    return {
      kind: "source_fragment_revision",
      sourceRef,
      fragmentRef,
      eventKey,
      revision: entry.afterRevision,
      label: entry.label,
      at: new Date(Date.parse(entry.updatedAt)).toISOString(),
      targetId: entry.targetId,
      // The consumer should enable exact-jump href only AFTER Post restores
      // native authored fragments from URL hash and reload.
      targetHref: `/post/${encodeURIComponent(slug)}#${encodeURIComponent(entry.targetId)}`,
      attribution: entry.attribution,
    };
  }
  return null;
}
