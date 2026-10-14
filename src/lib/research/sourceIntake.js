// Projection over existing source ingress. No store, publication or follow engine.
export const INTAKE_DESTINATIONS = Object.freeze([
  { key: 'world', label: 'העולם' },
  { key: 'nowbar', label: 'סרגל העדכונים' },
  { key: 'writer', label: 'דף הכתב' },
]);
const str = value => value == null ? '' : String(value).trim();
const rfc = value => str(value).replace(/^<|>$/g, '');
const time = value => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
const compare = (a,b) => time(a.received_at)-time(b.received_at) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true });

export function intakeRoute(row) {
  const route = row?.meta?.intake_projection_v1;
  return {
    revision: Number.isInteger(route?.revision) && route.revision >= 0 ? route.revision : 0,
    destinations: [...new Set((Array.isArray(route?.destinations) ? route.destinations : [])
      .filter(x => INTAKE_DESTINATIONS.some(d => d.key === x)))],
    state: route?.state === 'published' ? 'published' : 'draft',
  };
}

// Source identity is the private persisted occurrence, never the subject/display name.
export function emailIntakeDescriptor(row) {
  const sourceRef = `inbound_emails:${row.id}`;
  return {
    rawInput: { value: row.body_text ?? null, kind: 'text', ref: `${sourceRef}:text`, access: { tier: 'private' } },
    sourceArtifact: { ref: sourceRef, kind: 'email', source_ref: sourceRef, access: { tier: 'private' } },
    temporal: { input_time: row.received_at ?? null, access: { tier: 'private' } },
    origin: { channel: 'email', source_ref: sourceRef, message_ref: sourceRef },
    persistence: { mode: 'persisted', persisted_ref: sourceRef },
    accessTier: 'private',
  };
}

// Canonical Follow resolves this descriptor. Mailbox, local row ID and subject
// are not supported subjects; do not mint a mail-specific Follow namespace.
export function intakeFollowSubject(row) {
  const source = row?.meta?.source_email_v1;
  const author = source?.author;
  return source?.admission === 'approved_source_candidate' && !source.technical_test && !source.held && str(author?.author_display)
    ? { entityType: 'author', stableId: str(author.author_display) } : null;
}

export function projectPrivateEmailThreads(rows = []) {
  const unique = new Map(rows.filter(r => r?.id != null).map(r => [String(r.id), r]));
  const aliases = new Map();
  const add = (key, row) => { if (!key) return; const ids = aliases.get(key) || new Set(); ids.add(String(row.id)); aliases.set(key, ids); };
  for (const row of unique.values()) {
    add(str(row.meta?.source_email_v1?.id),row);
    add(rfc(row.meta?.source_email_v1?.message_id || row.message_id),row);
  }
  const parentOf = row => {
    const key = str(row.meta?.source_email_v1?.parent_id) || rfc(row.in_reply_to);
    const ids = aliases.get(key);
    return { key, ambiguous: Boolean(ids?.size > 1), parent: ids?.size === 1 ? unique.get([...ids][0]) : null };
  };
  const groups = new Map();
  for (const row of unique.values()) {
    let root = row, missing = false, ambiguous = false, cyclic = false, external = '';
    const seen = new Set([String(row.id)]);
    while (true) {
      const link = parentOf(root);
      if (!link.key) break;
      if (link.ambiguous) { ambiguous = true; break; }
      if (!link.parent) { missing = true; external = link.key; break; }
      if (seen.has(String(link.parent.id))) { cyclic = true; break; }
      seen.add(String(link.parent.id)); root = link.parent;
    }
    const key = cyclic || ambiguous ? `inbound_emails:${row.id}` : external ? `email-parent:${external}` : `inbound_emails:${root.id}`;
    const group = groups.get(key) || { id:key, root, rows:[], missingParent:missing, ambiguousParent:ambiguous, cyclic };
    group.rows.push(row); groups.set(key,group);
  }
  return [...groups.values()].map(group => {
    const ordered = [], added = new Set(), members = new Set(group.rows.map(r=>String(r.id)));
    const visit = row => {
      if (added.has(String(row.id))) return;
      added.add(String(row.id));
      const parent = parentOf(row).parent;
      if (!group.cyclic && parent && members.has(String(parent.id))) visit(parent);
      ordered.push(row);
    };
    [...group.rows].sort(compare).forEach(visit);
    const latest = [...group.rows].sort(compare).at(-1);
    return { ...group, rows: ordered, latestId: String(latest.id), latestAt: latest.received_at,
      unread: group.rows.filter(r=>!r.read).length };
  }).sort((a,b)=>time(b.latestAt)-time(a.latestAt) || a.id.localeCompare(b.id));
}
