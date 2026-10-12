// Proven source-level updates, keyed by post id. An entry exists only when the
// live post_revisions pair and the authored fragment were verified; cover-only
// or other snapshots are never listed. Posts without an entry show no strip.
// The strip additionally requires the authored fragment to exist in the live
// source HTML, so a removed fragment hides the strip instead of lying.
export const PROVEN_POST_SOURCE_UPDATES = Object.freeze({
  5113: Object.freeze([
    ...[
      ["bennett-israel-78", "bennett-israel-78-title", "מלח = 78 — וישראל בת 78"],
      ["bennett-dead-sea-sequence", "bennett-sequence-title", "יומיים אחרי ים המלח — המלח מופיע שוב"],
    ].map(([targetId, titleId, label]) => Object.freeze({
      id: targetId,
      sourceSlug: "bennett-melach-631-78",
      // Saved source edit 2026-10-12T14:06:54.127591Z (Asia/Jerusalem 17:06:54), revision 207 -> 208.
      sourceModifiedAt: "2026-10-12T14:06:54.127591Z",
      updatedAt: "2026-10-12T14:06:54.127591Z",
      targetId,
      titleId,
      label,
      date: "2026-10-12",
      beforeRevision: 207,
      afterRevision: 208,
      attribution: "תוספת לפוסט",
    })),
  ]),
  5107: Object.freeze([
    ...[
      ["sharshar-shoes-66", "sharshar-shoes-title", "שרשר · נעליים · בן דוד = 66"],
      ["sharshar-knesset-source", "sharshar-knesset-title", "״הגעתי לכנסת ישראל לשרת את עם ישראל״"],
      ["sharshar-monthly-help-requests", "sharshar-help-title", "שרשר מספר על אלפי בקשות לעזרה בכל חודש"],
    ].map(([targetId, titleId, label]) => Object.freeze({
      id: targetId,
      sourceSlug: "sharshar-elections-redemption-hints-draft",
      // Real addition time of the saved source edit (Asia/Jerusalem 2026-10-12 16:52:58), revision 205 -> 206.
      sourceModifiedAt: "2026-10-12T13:52:58.270789Z",
      updatedAt: "2026-10-12T13:52:58.270789Z",
      targetId,
      titleId,
      label,
      date: "2026-10-12",
      beforeRevision: 205,
      afterRevision: 206,
      attribution: "תוספת לפוסט",
    })),
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

// Newest real addition first; equal times keep authored order. Pure ordering, no new truth.
export function orderedSourceUpdates(entries) {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => Date.parse(b.entry.updatedAt) - Date.parse(a.entry.updatedAt) || a.index - b.index)
    .map(({ entry }) => entry);
}

export function provenSourceUpdatesFor(postId, sourceRoot) {
  const entries = PROVEN_POST_SOURCE_UPDATES[Number(postId)] || [];
  if (!sourceRoot) return [];
  return orderedSourceUpdates(entries.filter((entry) => sourceRoot.querySelector(`[id="${entry.targetId}"]`)));
}

// Exact source-unit id from a URL hash, only when it names a proven unit of this post.
export function provenUpdateForHash(postId, hash = "") {
  let id = "";
  try { id = decodeURIComponent(String(hash || "").replace(/^#/, "")); } catch { return null; }
  return (PROVEN_POST_SOURCE_UPDATES[Number(postId)] || []).find((entry) => entry.targetId === id) || null;
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
export function publicProvenPostSourceUpdates(row) {
  const id = Number(row?.id);
  const slug = String(row?.slug || "").trim();
  if (!Number.isSafeInteger(id) || !slug || row?.home_hidden === true) return [];
  if (["gpt-draft", "web"].includes(String(row?.source || "").trim().toLowerCase())) return [];
  if ((Array.isArray(row?.tags) ? row.tags : []).some((tag) => ["טיוטה", "פורום"].includes(String(tag).trim()))) return [];
  const modifiedAt = Date.parse(String(row?.modified || ""));
  if (!Number.isFinite(modifiedAt)) return [];

  const entries = PROVEN_POST_SOURCE_UPDATES[id] || [];
  // A current certified source version may retain older units. They keep their
  // original event identity and addition time; a newer child never retimestamps them.
  const certifiedVersion = entries.some((entry) => entry.sourceSlug === slug &&
    modifiedAt === Date.parse(entry.sourceModifiedAt));
  if (!certifiedVersion) return [];
  const events = [];
  for (const entry of orderedSourceUpdates([...entries])) {
    if (entry.sourceSlug !== slug || Date.parse(entry.sourceModifiedAt) > modifiedAt) continue;
    // Older units need a live body witness. Metadata-only readers certify only
    // the matching revision, never guess that historical content still exists.
    if (Date.parse(entry.sourceModifiedAt) !== modifiedAt && typeof row.content !== "string") continue;
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
    events.push({
      kind: "source_fragment_revision",
      sourceRef,
      fragmentRef,
      eventKey,
      revision: entry.afterRevision,
      label: entry.label,
      at: new Date(Date.parse(entry.updatedAt)).toISOString(),
      targetId: entry.targetId,
      targetHref: `/post/${encodeURIComponent(slug)}#${encodeURIComponent(entry.targetId)}`,
      attribution: entry.attribution,
    });
  }
  return events;
}

export function publicProvenPostSourceUpdate(row) {
  return publicProvenPostSourceUpdates(row)[0] || null;
}

// Real addition date, Asia/Jerusalem, dd.mm.yyyy. The date comes from the proven entry, never from "now".
export function formatUpdateDate(iso) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  return new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", year: "numeric" })
    .format(new Date(time)).replace(/\//g, ".");
}
