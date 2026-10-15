// EXTEND_EXISTING One Reality / Research OS projection. No I/O, storage, inferred
// relation, publication grant or independent feed. Input MUST be an already
// authorized, sanitized owner bundle; never pass raw nodes/edges/private rows.
const text = (v, max = 512) => typeof v === 'string' && v.length <= max ? v.trim() : '';
const time = (v) => { const n = Date.parse(v); return Number.isFinite(n) ? n : null; };
const localHref = (v) => typeof v === 'string' && v.length <= 2048 && /^\/(?!\/)/.test(v) && !/[\\\s\u0000-\u001f]/.test(v) ? v : null;
const compare = (a, b) => (a.at ?? Infinity) - (b.at ?? Infinity) || a.id.localeCompare(b.id) || String(a.seenKey || '').localeCompare(String(b.seenKey || ''));
export const eventUpdateSeenKey = (u) => JSON.stringify(['event-update', u.sourceRef, u.id, u.revisionId]);

// Bridge the existing Publishing owner's publicProvenPostSourceUpdates output.
// Bindings are authorized declared source/fragment -> existing Event links.
// A source linked to multiple Events needs an exact fragment binding; never
// select a contextual parent by title, number or first result.
export function provenPostUpdatesToEventUpdates(proofs = [], bindings = [], { streamIds = [] } = {}) {
  const byRef = new Map();
  for (const binding of bindings) {
    const ref = text(binding?.sourceRef), eventId = text(binding?.eventId);
    if (!ref || !eventId) continue;
    if (!byRef.has(ref)) byRef.set(ref, new Set());
    byRef.get(ref).add(eventId);
  }
  const updates = []; let unresolved = 0;
  for (const proof of proofs) {
    if (proof?.kind !== 'source_fragment_revision' || !text(proof.eventKey) || !text(proof.fragmentRef)
      || !Number.isSafeInteger(proof.revision) || proof.revision < 1
      || !text(proof.sourceRef) || !text(proof.label, 1600) || !localHref(proof.targetHref) || time(proof.at) === null) { unresolved++; continue; }
    const targets = byRef.get(proof.fragmentRef) || byRef.get(proof.sourceRef);
    if (!targets || targets.size !== 1) { unresolved++; continue; }
    updates.push({ id: proof.fragmentRef, sourceRef: proof.sourceRef, eventId: [...targets][0],
      revisionId: String(proof.revision), summary: proof.label, href: proof.targetHref,
      arrivalAt: proof.at, streamIds, verification: 'unknown' });
  }
  return { updates, coverage: { state: unresolved ? 'partial' : 'complete', unresolved } };
}

/** Parent relations must be declared by the source/graph owner, not inferred
 * from shared numbers, titles, dates or audience. Missing ancestors and cyclic
 * components are withheld, never silently reparented. Gaps carry counts only.
 * Explicit order is an owner-proved chronological ordinal for undated events.
 */
export function buildEventSequences({ events = [], updates = [] } = {}, { seen = {}, reducedMotion = false } = {}) {
  if (!Array.isArray(events) || !Array.isArray(updates) || events.length > 1000 || updates.length > 5000) {
    return { sequences: [], streams: [], coverage: { state: 'unavailable', reason: 'invalid_or_oversized_bundle' } };
  }
  const nodes = new Map(); const invalidIds = new Set();
  let invalid = 0; let missingParent = 0; let cycles = 0; let conflicts = 0; let orphanUpdates = 0;
  for (const row of events) {
    const id = text(row?.id); const label = text(row?.label, 256); const href = localHref(row?.href);
    if (!id || !label || !href) { invalid++; continue; }
    const event = { id, label, href, parentId: text(row.parentId) || null,
      occurredAt: time(row.occurredAt) === null ? null : row.occurredAt,
      order: Number.isSafeInteger(row.order) ? row.order : null };
    if (nodes.has(id) && JSON.stringify(nodes.get(id)) !== JSON.stringify(event)) { invalidIds.add(id); conflicts++; }
    else nodes.set(id, event);
  }
  const roots = new Map();
  for (const id of nodes.keys()) {
    const chain = new Set(); let cursor = id; let root = null;
    while (cursor) {
      if (chain.has(cursor)) { cycles++; break; }
      chain.add(cursor);
      if (invalidIds.has(cursor)) break;
      const node = nodes.get(cursor);
      if (!node) { missingParent++; break; }
      if (!node.parentId) { root = cursor; break; }
      cursor = node.parentId;
    }
    if (root) roots.set(id, root);
  }
  const occurrences = new Map(); const badKeys = new Set();
  for (const row of updates) {
    const id = text(row?.id), eventId = text(row?.eventId), revisionId = text(row?.revisionId), sourceRef = text(row?.sourceRef);
    const summary = text(row?.summary, 1600); const href = localHref(row?.href); const at = time(row?.arrivalAt);
    if (!id || !eventId || !revisionId || !sourceRef || !summary || !href || at === null) { invalid++; continue; }
    if (!roots.has(eventId)) { orphanUpdates++; continue; }
    const u = { id, revisionId, sourceRef, summary, href, at,
      arrivalAt: new Date(at).toISOString(),
      streamIds: [...new Set((Array.isArray(row.streamIds) ? row.streamIds : []).map(value => text(value)).filter(Boolean))].sort(),
      verification: ['verified', 'unverified'].includes(row.verification) ? row.verification : 'unknown' };
    const key = eventUpdateSeenKey(u);
    // Same source-native occurrence+revision can appear in several channels,
    // but contradictions never become last-write-wins truth.
    if (occurrences.has(key)) {
      const prior = occurrences.get(key);
      const { streamIds: a, eventIds, ...left } = prior; const { streamIds: b, ...right } = u;
      if (JSON.stringify(left) !== JSON.stringify(right)) { badKeys.add(key); conflicts++; }
      else { prior.streamIds = [...new Set([...a, ...b])].sort(); prior.eventIds = [...new Set([...eventIds, eventId])].sort(); }
    } else occurrences.set(key, { ...u, eventIds: [eventId] });
  }
  const byRoot = new Map();
  for (const [id, rootId] of roots) {
    if (!byRoot.has(rootId)) byRoot.set(rootId, { events: [], updates: [] });
    byRoot.get(rootId).events.push(nodes.get(id));
  }
  for (const [key, update] of occurrences) {
    if (badKeys.has(key)) continue;
    const updateRoots = [...new Set(update.eventIds.map(id => roots.get(id)))];
    for (const rootId of updateRoots) byRoot.get(rootId).updates.push({ ...update,
      eventIds: update.eventIds.filter(id => roots.get(id) === rootId), seenKey: key, isUnread: !seen[key] });
  }
  const sequences = [...byRoot].map(([rootId, group]) => {
    group.updates.sort(compare);
    const latest = group.updates.at(-1) || null;
    const latestKey = latest?.seenKey || null;
    const children = new Map();
    for (const e of group.events) { const parent = e.parentId; if (!children.has(parent)) children.set(parent, []); children.get(parent).push(e); }
    let chronologyAvailable = true;
    for (const list of children.values()) {
      const hasOrder = list.every(e => e.order !== null);
      if (list.length > 1 && !hasOrder && list.some(e => time(e.occurredAt) === null)) chronologyAvailable = false;
      list.sort((a, b) => hasOrder ? a.order - b.order || a.id.localeCompare(b.id)
        : compare({ id: a.id, at: time(a.occurredAt) }, { id: b.id, at: time(b.occurredAt) }));
    }
    const treeRows = []; const stack = [{ id: rootId, depth: 0 }];
    while (stack.length) {
      const next = stack.pop(); treeRows.push({ ...nodes.get(next.id), depth: next.depth });
      const kids = children.get(next.id) || [];
      for (let i = kids.length - 1; i >= 0; i--) stack.push({ id: kids[i].id, depth: next.depth + 1 });
    }
    return { rootId, root: nodes.get(rootId), treeRows, chronologyAvailable,
      updates: group.updates.map(u => ({ ...u, isLatest: u.seenKey === latestKey,
        pulse: u.seenKey === latestKey && u.isUnread && !reducedMotion })),
      latestUpdateKey: latestKey, lastUpdatedAt: latest?.arrivalAt || null,
      unreadCount: group.updates.filter(u => u.isUnread).length };
  }).sort((a, b) => (time(b.lastUpdatedAt) ?? -Infinity) - (time(a.lastUpdatedAt) ?? -Infinity) || a.rootId.localeCompare(b.rootId));
  const streams = new Map();
  for (const sequence of sequences) for (const update of sequence.updates) for (const streamId of update.streamIds) {
    if (!streams.has(streamId)) streams.set(streamId, new Set());
    if (update.isUnread) streams.get(streamId).add(update.seenKey);
  }
  return { sequences, streams: [...streams].sort(([a], [b]) => a.localeCompare(b)).map(([id, keys]) => ({ id, unreadCount: keys.size, hasUnread: keys.size > 0 })),
    coverage: { state: invalid || missingParent || cycles || conflicts || orphanUpdates ? 'partial' : 'complete',
      invalid, missingParent, cycles, conflicts, orphanUpdates } };
}
