import { declaredPostSequenceEntries } from './postLineage2029.js';
import { publicProvenPostSourceUpdates } from './postSourceUpdates2029.js';
import { buildEventSequences, eventUpdateSeenKey, provenPostUpdatesToEventUpdates } from './eventSequenceProjection.js';

const PUBLIC_ORIGINS = new Set(['wordpress', 'sod1820', 'source_document', 'ai', 'uploaded_file']);
const published = row => row?.home_hidden === false && PUBLIC_ORIGINS.has(String(row.source || '').toLowerCase())
  && !(Array.isArray(row.tags) ? row.tags : []).some(tag => ['טיוטה', 'פורום'].includes(String(tag).trim()));

// Compose ONLY the public source rows already obtained by the existing World
// reader. No network, private revision read, graph admission or audience data.
// The bounded pilot is explicitly authored Post lineage, not invented Event
// identity. Future graph-owned Event bundles use the same pure projection.
export function buildPublicPostSequenceBundle(postRows = []) {
  const publicRows = new Map();
  for (const row of Array.isArray(postRows) ? postRows : []) if (published(row)) publicRows.set(Number(row.id), row);
  const declared = declaredPostSequenceEntries();
  const readable = new Map(declared.filter(entry => publicRows.get(entry.postId)?.slug === entry.sourceSlug).map(entry => [entry.id, entry]));
  const complete = entry => {
    const visited = new Set(); let cursor = entry;
    while (cursor) {
      if (visited.has(cursor.id)) return false;
      visited.add(cursor.id);
      if (!cursor.parentId) return true;
      cursor = readable.get(cursor.parentId);
    }
    return false;
  };
  const events = [], proofs = [], bindings = [];
  for (const entry of declared) {
    const row = publicRows.get(entry.postId);
    if (!row || row.slug !== entry.sourceSlug || !complete(entry)) continue;
    events.push({ id: entry.id, parentId: entry.parentId, label: entry.label, href: entry.href, occurredAt: row.date || null });
    bindings.push({ sourceRef: entry.id, eventId: entry.id });
    proofs.push(...publicProvenPostSourceUpdates(row));
  }
  const adapted = provenPostUpdatesToEventUpdates(proofs, bindings, { streamIds: ['sources'] });
  return { kind: 'authored_post_sequence', events, updates: adapted.updates, coverage: adapted.coverage };
}

// Reuse the current shared Home/Frame seen marks. No second read-state store.
export const sourceSequenceFeedSeenKey = update => `feed:${update.id}@revision:${update.revisionId}`;
export function projectPublicSourceSequences(bundle, { seen = {}, reducedMotion = false } = {}) {
  const occurrenceSeen = {};
  for (const update of bundle?.updates || []) if (seen[sourceSequenceFeedSeenKey(update)]) occurrenceSeen[eventUpdateSeenKey(update)] = true;
  const projection = buildEventSequences(bundle || {}, { seen: occurrenceSeen, reducedMotion });
  return { ...projection, kind: 'authored_post_sequence',
    // Root subject identity is explicit, and does not pretend that the pending
    // resolver migration has been applied or that notifications are active.
    sequences: projection.sequences.map(sequence => ({ ...sequence,
      followSubject: { entityType: 'post_sequence', stableId: sequence.rootId.replace(/^posts:/, ''), available: false },
    })) };
}

export function sourceSequenceAttention(item, projection) {
  const key = item?.sourceUpdate?.eventKey;
  if (!key) return null;
  for (const sequence of projection?.sequences || []) {
    const update = sequence.updates.find(u => `${u.id}@revision:${u.revisionId}` === key);
    if (update) return { rootId: sequence.rootId, rootHref: sequence.root.href,
      updateKey: update.seenKey, isLatest: update.isLatest, pulse: update.pulse,
      isUnread: update.isUnread, unreadCount: sequence.unreadCount };
  }
  return null;
}

// An explicit source-selection action may pass this patch into the EXISTING
// Research Context. Background arrivals never mutate a user's context.
export function withSourceSequenceContext(context, sequence, update) {
  const known = sequence?.updates?.find(row => row.seenKey === update?.seenKey);
  if (!known) return context;
  const postId = known.sourceRef.replace(/^posts:/, '');
  const encodedSlug = /^\/post\/([^#?]+)/.exec(known.href)?.[1];
  let postSlug = null;
  try { postSlug = encodedSlug ? decodeURIComponent(encodedSlug) : null; } catch { return context; }
  return { ...(context || {}),
    selection: { entityType: 'post', entityId: postId, sourceRef: known.sourceRef, locator: known.id },
    dimensions: { ...(context?.dimensions || {}),
      // Existing server-accepted reading/focus fields carry the source locus.
      // sourceSequence below remains optional client metadata, not a new
      // server-authorized capability, fact, audience or read permission.
      readingFocus: { id: known.id, label: known.summary, postId, postSlug, locator: known.id },
      surfaceFocus: { type: 'post', entityType: 'post', entityId: postId, postId, postSlug, sectionLabel: known.summary },
      sourceSequence: {
      kind: 'authored_post_sequence', rootId: sequence.rootId, rootHref: sequence.root.href,
      occurrenceKey: known.seenKey, sourceRef: known.sourceRef, revisionId: known.revisionId, targetHref: known.href,
    } },
  };
}
