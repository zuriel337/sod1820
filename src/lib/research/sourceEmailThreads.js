// Projection adapter for the existing source stream. No UI and no alternate source store.
// Input MUST come from an authorized server reader; private inbox rows are never client input.
const at = value => Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const compare = (a, b) => (a.arrival_at || '').localeCompare(b.arrival_at || '') || a.id.localeCompare(b.id);

export function projectSourceEmailThreads(rows = []) {
  const admitted = new Map();
  const duplicates = new Map();
  for (const row of rows) {
    if (!row?.id || row.source_admitted !== true || row.status !== 'live' || row.held === true ||
        !row.author_key || !row.author_display || row.source_state !== 'unverified') continue;
    if (admitted.has(row.id)) { duplicates.set(row.id, (duplicates.get(row.id) || 0) + 1); continue; }
    admitted.set(row.id, row);
  }
  const groups = new Map();
  for (const row of admitted.values()) {
    let root = row;
    const visited = new Set([row.id]);
    let missingParent = false;
    let cyclic = false;
    while (root.parent_id) {
      if (visited.has(root.parent_id)) { cyclic = true; break; }
      const parent = admitted.get(root.parent_id);
      if (!parent) { missingParent = true; break; }
      visited.add(parent.id);
      root = parent;
    }
    if (cyclic) continue; // Corrupt lineage must not be presented as a valid thread.
    // Siblings with an unavailable parent stay together; subject strings never merge threads.
    const key = missingParent ? root.parent_id : root.id;
    const group = groups.get(key) || { rows: [], missingParent };
    group.rows.push(row);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([key, group]) => {
    const ordered = group.rows.sort(compare);
    const root = ordered.find(row => !row.parent_id) || ordered[0];
    const messages = [root, ...ordered.filter(row => row !== root)].map(row => ({
      id: row.id, author_key: row.author_key, author_display: row.author_display,
      at: at(row.source_published_at) || at(row.arrival_at), text: row.full_text || '',
      reply_to_id: row.parent_id || null, quoted_omitted: row.quoted_omitted === true,
      text_state: row.text_state || 'unavailable',
      // A provider reference alone is NOT a publicly authorized image URL.
      images: (row.images || []).map(image => ({
        id: image.id, thumb_url: image.public_authorized === true ? image.thumb_url || null : null,
        full_url: image.public_authorized === true ? image.full_url || null : null,
        width: image.width || null, height: image.height || null,
        is_quoted_reference: image.is_quoted_reference ?? null,
        duplicate_of: image.duplicate_of || null,
        state: image.public_authorized === true && image.full_url ? 'available' : 'unavailable',
      })),
    }));
    const last = ordered.at(-1);
    return {
      id: `email-thread:${key}`, kind: messages.length > 1 || group.missingParent ? 'thread' : 'message', channel: 'email',
      root: { author_display: root.author_display, author_key: root.author_key },
      arrival_at: at(root.arrival_at), source_published_at: at(root.source_published_at),
      title_text: group.missingParent ? 'ההודעה המקורית אינה זמינה' : (root.full_text || '').split('\n').find(Boolean) || 'הודעת מקור',
      full_text: group.missingParent ? '' : root.full_text || '', images: messages.flatMap(message => message.images),
      thread: { message_count: messages.length, participant_count: new Set(messages.map(m => m.author_key)).size,
        last_activity_at: at(last.arrival_at), messages, missing_parent: group.missingParent },
      hidden_duplicate_count: ordered.reduce((n, row) => n + (duplicates.get(row.id) || 0), 0), source_state: 'unverified',
    };
  }).sort((a, b) => (b.thread.last_activity_at || '').localeCompare(a.thread.last_activity_at || '') || a.id.localeCompare(b.id));
}

export async function fetchSourceEmailThreads({ load, cursor = null, limit = 12 } = {}) {
  if (!load) return { state: 'unavailable', reason: 'reader_not_connected', items: [], cursor: null };
  // Server must paginate complete threads, not slice raw messages and invent missing parents.
  const page = await load({ cursor, limit: Math.max(1, Math.min(50, limit)) });
  if (page?.state !== 'available') return { state: 'unavailable', reason: page?.reason || 'reader_unavailable', items: [], cursor: null };
  const items = projectSourceEmailThreads(page.rows);
  return { state: items.length ? 'available' : 'empty', items, cursor: page.cursor || null };
}
