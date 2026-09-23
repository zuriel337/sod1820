// G3 Community Core 2029 Phase 2.1 — post conversation projection, pure logic (no DB connection).
// Owner: experience_governance_foundation_v1_law v7 + research_intake_foundation_contract_law v13.
// Pure-logic twin of `public.post_conversation_projection` (supabase/migrations/*_g3_community_
// core_2029_phase2_shadow.sql) — the SQL function is the actual read seam; this module exists so
// the merge/ordering/never-guess invariants have one unit-testable description, same convention
// as identityBridge.mjs.
//
// "השיחה סביב הפוסט": unifies legacy `public.comments` (WordPress source-native history) with
// native/community `research_contributions` targeted at the same canonical post into one
// chronological, thread-capable projection — without copying any source row into the other
// table. It never guesses which canonical post an unresolved WordPress `post_wp_id` belongs to.

// wpComment: { wp_id, post_wp_id, parent_wp_id, author_name, date, content, status }
// contribution: { id, parent_id, target_type, target_id, author_display_name, author_is_contributor,
//                 body, reactions, created_at, author_user_id? }
export function projectPostConversation(postWpId, wpComments, contributions, { canonicalPostId = null } = {}) {
  const wordpressItems = (wpComments || [])
    .filter((c) => c.post_wp_id === postWpId && c.status === 'publish')
    .map((c) => ({
      source_kind: 'wordpress',
      source_id: String(c.wp_id),
      parent_ref: c.parent_wp_id != null ? String(c.parent_wp_id) : null,
      author_display_name: c.author_name || null,
      author_is_contributor: false,
      body: c.content,
      reactions: null,
      created_at: c.date,
    }));

  const communityItems = (contributions || [])
    .filter((rc) => rc.target_type === 'post' && (canonicalPostId == null || rc.target_id === String(canonicalPostId)))
    .map((rc) => ({
      source_kind: 'community',
      source_id: String(rc.id),
      parent_ref: rc.parent_id != null ? String(rc.parent_id) : null,
      author_display_name: rc.author_display_name || null,
      author_is_contributor: Boolean(rc.author_is_contributor),
      body: rc.body,
      reactions: rc.reactions ?? null,
      created_at: rc.created_at,
    }));

  // Chronological, thread-capable: parent lineage is preserved per source_kind (a WordPress
  // reply's parent_ref only ever resolves within wordpressItems, a community reply's parent_ref
  // only ever resolves within communityItems) — this never fabricates a cross-source thread edge
  // that the two source systems never actually recorded.
  return [...wordpressItems, ...communityItems].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

// Reports WordPress comments whose post_wp_id does not match any current post's wp_id — never
// assigns them to a guessed post. Callers must treat these as unresolved, not as "Home".
export function findUnresolvedWordpressPostRefs(wpComments, posts) {
  const knownWpIds = new Set((posts || []).map((p) => p.wp_id));
  const unresolvedPostWpIds = new Set();
  for (const c of wpComments || []) {
    if (!knownWpIds.has(c.post_wp_id)) unresolvedPostWpIds.add(c.post_wp_id);
  }
  return Array.from(unresolvedPostWpIds);
}
