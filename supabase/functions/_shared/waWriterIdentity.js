// Stable writer identity for WhatsApp channel sources (ZVI_STABLE_WRITER_BINDING_V1).
// Pure helpers shared by wa-channel-ingest and wa-channel-research-intake; no I/O.
// channel_updates.contributor_id is set ONLY on an unambiguous human alias hit.
// Bot/API, ambiguous and unmatched authors stay null (fail-closed); credit text is never rewritten here.

const clean = (v) => String(v || "").trim();

// rows: contributors { id, display_name, wa_names }. Returns Map<alias, Set<contributor_id>>.
// An alias is any wa_names entry; display_name is also a key (contributors.display_name is not unique).
export function buildWriterIndex(rows) {
  const index = new Map();
  const add = (key, id) => {
    const k = clean(key);
    if (!k || !id) return;
    if (!index.has(k)) index.set(k, new Set());
    index.get(k).add(id);
  };
  for (const c of rows || []) {
    add(c?.display_name, c?.id);
    for (const alias of c?.wa_names || []) add(alias, c?.id);
  }
  return index;
}

// Returns the contributor id, or null when bot/API, unmatched or ambiguous.
export function resolveWriterContributorId(rawName, index, { isBotApi = false } = {}) {
  if (isBotApi) return null;
  const hit = index.get(clean(rawName));
  if (!hit || hit.size !== 1) return null;
  return [...hit][0];
}

// Trusted-author determination. Stable id wins; legacy credit/vip fallback is preserved.
// trustedContributorIds: Set of contributors.id with trusted=true.
export function isTrustedAuthor({ contributorId, credit }, { trustedContributorIds, vips, policy }) {
  if (contributorId && trustedContributorIds?.has(contributorId)) return true;
  if (policy?.admin_only === true && Array.isArray(policy?.admin_ids) && policy.admin_ids.length > 0) return true;
  const value = clean(credit);
  if (!value) return false;
  if (policy?.outgoing_contributor && value === clean(policy.outgoing_contributor)) return true;
  return (vips || []).some((vip) => {
    const name = clean(vip?.name_match);
    return !!name && (value === name || value.includes(name) || name.includes(value));
  });
}
