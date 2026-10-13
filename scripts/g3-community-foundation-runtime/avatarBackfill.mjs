import { displayAvatarUrl } from '../../src/lib/avatar.js';

// Offline, read-only preparation for the existing contributors.avatar_url field.
// Input sourceAvatars must come from an authorized OpenWeb export/reader, normalized
// to {source_user_id, avatar_url, visibility, observed_at}. No names/emails are keys.
// This does not fetch private profiles, create identities, or execute DB writes.
export function planAvatarBackfill(identityLinks, sourceAvatars) {
  if (!Array.isArray(identityLinks) || !Array.isArray(sourceAvatars)) throw new TypeError('Expected identity and avatar arrays');
  const identities = Map.groupBy(identityLinks, row => row.source_user_id);
  const sources = Map.groupBy(sourceAvatars, row => row.source_user_id);
  const rows = [];
  for (const [sourceId, links] of identities) {
    const targets = new Set(links.map(row => row.contributor_id).filter(Boolean));
    const row = { source_user_id: sourceId, contributor_id: targets.size === 1 ? [...targets][0] : null };
    const add = (status, extra = {}) => rows.push({ ...row, status, ...extra });
    if (!sourceId || targets.size !== 1 || links.some(link => !link.contributor_id)) { add('ambiguous_or_missing_identity'); continue; }
    if (links.some(link => link.account_linked)) { add('linked_account_preserved'); continue; }
    if (links.some(link => link.current_avatar_url)) { add('existing_avatar_preserved'); continue; }
    const observations = sources.get(sourceId) || [];
    if (!observations.length) { add('missing_source'); continue; }
    if (observations.some(item => item.visibility !== 'public')) { add('source_not_public'); continue; }
    if (observations.some(item => typeof item.observed_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(item.observed_at) || !Number.isFinite(Date.parse(item.observed_at)))) { add('missing_observation_date'); continue; }
    const urls = new Set(observations.map(item => displayAvatarUrl(item.avatar_url)));
    if (urls.has(null)) { add('missing_or_invalid_avatar'); continue; }
    if (urls.size !== 1) { add('conflicting_source_avatars'); continue; }
    add('ready_for_review', {
      avatar_url: [...urls][0], expected_current_avatar_url: null,
      observed_at: new Date(Math.max(...observations.map(item => Date.parse(item.observed_at)))).toISOString(),
    });
  }
  // Different source identities must not silently overwrite the same legacy person.
  const targetGroups = Map.groupBy(rows.filter(row => row.contributor_id), row => row.contributor_id);
  for (const group of targetGroups.values()) {
    if (new Set(group.map(row => row.source_user_id)).size <= 1) continue;
    for (const row of group) if (row.status === 'ready_for_review') {
      row.status = 'ambiguous_target_identity';
      delete row.avatar_url; delete row.expected_current_avatar_url; delete row.observed_at;
    }
  }
  return {
    mode: 'dry_run', source: 'openweb', target: 'contributors.avatar_url',
    summary: rows.reduce((counts, row) => ({ ...counts, [row.status]: (counts[row.status] || 0) + 1 }), {}),
    unmatched_source_count: [...sources.keys()].filter(id => !identities.has(id)).length,
    rows,
  };
}
