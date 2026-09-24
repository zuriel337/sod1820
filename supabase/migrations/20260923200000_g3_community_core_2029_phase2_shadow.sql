-- G3 Community Core 2029 Phase 2 — hidden runtime substrate (BRANCH-ONLY, NOT APPLIED LIVE).
-- Assignment work_log.id=dd097ffa-1689-4d97-ad29-b3144c4d38ed, task_key=
-- G3_COMMUNITY_CORE_2029_PHASE2_SHADOW_V1, release_authorization_state=
-- BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_OPENWEB_TOUCH_NO_MERGE_NO_DEPLOY_NO_CUTOVER.
--
-- Do NOT run this migration against the live project (linswmnnkjxvweumprav) from this branch.
-- It is committed for review/Phase-3 human gate only. See
-- docs/g3-community-core-2029-phase2-shadow-branch-notes.md for the full design rationale,
-- the DRIFT carried over from Phase 1, and what remains for Phase 3.
--
-- EXTEND_EXISTING only: every function below reuses `research_contributions` / `contributors`
-- / `contribution_links` / `decision_ledger` (research_contribution_law v9 content baseline,
-- per Phase 1's owner-resolution note) and follows the exact SECURITY DEFINER + explicit
-- authority-check pattern already live in `fn_raziel_research_intel_scoped` and the exact
-- RLS predicate already live in `rc_public_read` / `contributors_read`. No new table, no new
-- column, no new parallel store.

-- =====================================================================================
-- 1. Community conversation projection — re-applies rc_public_read's own predicate, so this
--    is safe to expose more broadly (including, later, to a Realtime broadcast channel) than
--    a raw table subscription would be. Classifier/intent fields are intentionally NOT
--    selected here: "classifier invisible to ordinary visitor" (assignment verification #1).
--    author identity never includes email (contributors.email is never selected).
--    p_root_target_type/p_root_target_id are the projection hook: the same function serves a
--    root-scoped thread (Post/Number/Person/World/Home) via the columns `research_contributions`
--    already carries (`target_type`,`target_id`) with no duplicated storage.
-- =====================================================================================
create or replace function public.community_stream_projection(
  p_root_target_type text default null,
  p_root_target_id text default null,
  p_since timestamptz default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  parent_id uuid,
  target_type text,
  target_id text,
  body text,
  author_display_name text,
  author_is_contributor boolean,
  reactions jsonb,
  created_at timestamptz,
  last_activity_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    rc.id,
    rc.parent_id,
    rc.target_type,
    rc.target_id,
    rc.body,
    coalesce(rc.author_name, c.display_name) as author_display_name,
    (rc.author_contributor_id is not null) as author_is_contributor,
    rc.reactions,
    rc.created_at,
    rc.last_activity_at
  from public.research_contributions rc
  left join public.contributors c on c.id = rc.author_contributor_id
  where (rc.status = 'approved' or rc.author_user_id = auth.uid())
    and (p_root_target_type is null or rc.target_type = p_root_target_type)
    and (p_root_target_id is null or rc.target_id = p_root_target_id)
    and (p_since is null or rc.last_activity_at > p_since)
    -- Phase 2.2 integrity fix (task_key=G3_COMMUNITY_CORE_2029_PHASE2_2_SOURCE_FIDELITY_V1):
    -- never project a visually empty Community item. A row with no displayable authored
    -- payload (blank body/title and no real media/image) stays stored for lineage/audit but is
    -- omitted from this display projection.
    and (
      coalesce(btrim(rc.body), '') <> ''
      or coalesce(btrim(rc.title), '') <> ''
      or rc.image_url is not null
      or jsonb_array_length(rc.media) > 0
    )
  order by rc.last_activity_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

comment on function public.community_stream_projection is
  'G3 Community Core 2029 Phase 2 — read projection over research_contributions, re-applies '
  'rc_public_read predicate. No classifier/intent field exposed. Hidden runtime, no route '
  'wired to it live yet. Phase 2.2: omits rows with no displayable authored payload (blank '
  'body/title and no media/image) — they stay stored, never displayed as an empty item.';

-- =====================================================================================
-- 2. Community semantic history search — extends the existing `chat_search_facts` pattern
--    (tokenized to_tsvector search, same stopword-filtering approach) onto approved community
--    text, instead of adding a vector/embedding column or a new search store. No sufficient
--    embedding-based owner exists for `research_contributions` today (only `discoveries` and
--    `words` carry an `embedding vector` column, and neither has a matching RPC to extend) —
--    that gap is reported, not silently filled with a new vector store; see branch notes §2.
-- =====================================================================================
create or replace function public.community_search_facts(p_query text, p_limit integer default 5)
returns table (
  id uuid,
  snippet text,
  rank real,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tsq tsquery;
begin
  with toks as (
    select array(
      select w from (
        select regexp_replace(t, '[^א-תa-zA-Z0-9]', '', 'g') as w
        from regexp_split_to_table(coalesce(p_query, ''), '\s+') t
      ) x
      where char_length(w) >= 2
    ) as ws
  )
  select case when array_length(ws, 1) is null then null
              else to_tsquery('simple', array_to_string(ws, ' | ')) end
  into v_tsq
  from toks;

  if v_tsq is null then
    return;
  end if;

  return query
  select
    rc.id,
    left(regexp_replace(rc.body, '\s+', ' ', 'g'), 280) as snippet,
    ts_rank(to_tsvector('simple', coalesce(rc.body, '')), v_tsq) as rank,
    rc.created_at
  from public.research_contributions rc
  where rc.status = 'approved'
    -- Phase 2.2 integrity fix: never surface a search result with no displayable authored
    -- body text (blank/missing source payload rows stay stored for lineage, not searchable).
    and coalesce(btrim(rc.body), '') <> ''
    and v_tsq @@ to_tsvector('simple', coalesce(rc.body, ''))
  order by rank desc
  limit greatest(1, least(coalesce(p_limit, 5), 20));
end;
$$;

comment on function public.community_search_facts is
  'G3 Community Core 2029 Phase 2 — extends chat_search_facts pattern onto approved community '
  'text. Approved-only; no email/PII column selected. Phase 2.2: excludes rows with no '
  'displayable body text.';

-- =====================================================================================
-- 3. Raziel Community Partner read seam — extends fn_raziel_research_intel_scoped's exact
--    authority pattern (trusted-server / authenticated-caller / denial reasons), adding
--    community-scoped aggregate signals only. It does not create a second persona, memory, or
--    truth store: no write, no ai_reasoning/canonicalization, and any calculable claim is a
--    handoff pointer to the existing canonical engine (number_dossier), never computed here.
-- =====================================================================================
create or replace function public.fn_raziel_community_intel_scoped(
  p_root_target_type text default null,
  p_root_target_id text default null,
  p_since timestamptz default null,
  p_limit integer default 8
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_caller uuid;
  v_new_since_count integer;
  v_recent jsonb;
begin
  begin
    v_caller := auth.uid();
  exception when others then
    v_caller := null;
  end;

  select count(*) into v_new_since_count
  from public.research_contributions rc
  where rc.status = 'approved'
    and (p_root_target_type is null or rc.target_type = p_root_target_type)
    and (p_root_target_id is null or rc.target_id = p_root_target_id)
    and (p_since is null or rc.last_activity_at > p_since);

  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'created_at', t.created_at) order by t.created_at desc), '[]'::jsonb)
  into v_recent
  from (
    select rc.id, rc.created_at
    from public.research_contributions rc
    where rc.status = 'approved'
      and (p_root_target_type is null or rc.target_type = p_root_target_type)
      and (p_root_target_id is null or rc.target_id = p_root_target_id)
    order by rc.created_at desc
    limit greatest(1, least(coalesce(p_limit, 8), 20))
  ) t;

  return jsonb_build_object(
    'scope', 'community_public',
    'root_target_type', p_root_target_type,
    'root_target_id', p_root_target_id,
    'caller_authenticated', v_caller is not null,
    'new_since_last_visit_count', v_new_since_count,
    'recent_thread_ids', v_recent,
    'canonical_engine_handoff', jsonb_build_object(
      'note', 'any calculable claim inside recent_thread_ids routes through public.number_dossier; this function never computes or verifies a claim itself'
    ),
    'boundary', 'popularity ≠ research_strength ≠ canonical_truth · Raziel is not a second message/truth/memory owner',
    'generated_at', now()
  );
end;
$$;

comment on function public.fn_raziel_community_intel_scoped is
  'G3 Community Core 2029 Phase 2 — Raziel Community Partner read seam, extends the '
  'fn_raziel_research_intel_scoped authority pattern. Read-only aggregate; no persona/memory/'
  'truth store.';

-- =====================================================================================
-- 4. Identity bridge claim path — never auto-links, never creates an auth.users row. Only the
--    authenticated caller's own verified email may claim a matching, still-unclaimed legacy
--    contributor row. Mirrors scripts/g3-community-foundation-runtime/identityBridge.mjs's
--    resolveLegacyClaim invariant exactly (same three checks: unclaimed, has email, exact match).
-- =====================================================================================
-- Phase 2.1 integrity fix (task_key=G3_COMMUNITY_CORE_2029_PHASE2_1_INTEGRITY_FIXES_V1): the
-- Phase 2 version of this function checked only that the caller's auth.users row had a non-empty
-- `email`, never that it was actually *confirmed*. That let a caller claim a legacy identity using
-- an email they merely entered but never verified. This version additionally requires
-- `email_confirmed_at is not null`. Multi-claim by one verified mailbox across several
-- independently source-verified historical identities remains possible (each call is its own
-- explicit, auditable action) — this function still never merges rows, only ever sets one row's
-- `user_id` per call.
create or replace function public.contributors_claim_legacy(p_contributor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid;
  v_caller_email text;
  v_caller_email_confirmed_at timestamptz;
  v_contributor record;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;

  select email, email_confirmed_at into v_caller_email, v_caller_email_confirmed_at
  from auth.users where id = v_caller;
  if v_caller_email is null or btrim(v_caller_email) = '' then
    raise exception 'caller_email_not_confirmed';
  end if;
  if v_caller_email_confirmed_at is null then
    raise exception 'caller_email_not_confirmed';
  end if;

  select id, email, user_id into v_contributor from public.contributors where id = p_contributor_id;
  if not found then
    raise exception 'legacy_claim_not_eligible';
  end if;
  if v_contributor.user_id is not null then
    raise exception 'legacy_claim_not_eligible';
  end if;
  if v_contributor.email is null or lower(btrim(v_contributor.email)) <> lower(btrim(v_caller_email)) then
    raise exception 'legacy_claim_not_eligible';
  end if;

  update public.contributors set user_id = v_caller, updated_at = now() where id = p_contributor_id;

  return jsonb_build_object('claimed', true, 'contributor_id', p_contributor_id, 'user_id', v_caller);
end;
$$;

comment on function public.contributors_claim_legacy is
  'G3 Community Core 2029 Phase 2.1 — identity bridge claim path. Never auto-links; requires an '
  'authenticated caller whose email is confirmed (email_confirmed_at is not null) and exactly '
  'matches the unclaimed legacy contributor row. See '
  'scripts/g3-community-foundation-runtime/identityBridge.mjs for the pure-logic twin.';

-- =====================================================================================
-- 6. Post conversation projection ("השיחה סביב הפוסט") — unifies legacy public.comments
--    (WordPress source-native comment history, joined by posts.wp_id) with native/community
--    research_contributions targeted at that same canonical post into one chronological,
--    thread-capable read seam. Extends the same rc_public_read predicate as
--    community_stream_projection for the native half; the WordPress half is restricted to
--    status='publish' (source-native historical visibility, see planner.mjs's moderation
--    carry-forward note). Never guesses an unresolved post_wp_id: if p_post_wp_id does not match
--    any current posts.wp_id, this returns an empty set rather than attaching orphaned comments
--    to Home or any other post. No source row is copied into the other table. Pure-logic twin:
--    scripts/g3-community-foundation-runtime/postConversationProjection.mjs.
-- =====================================================================================
create or replace function public.post_conversation_projection(
  p_post_wp_id bigint,
  p_limit integer default 200
)
returns table (
  source_kind text,
  source_id text,
  parent_ref text,
  author_display_name text,
  author_is_contributor boolean,
  body text,
  reactions jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_post_id bigint;
begin
  select id into v_post_id from public.posts where wp_id = p_post_wp_id;
  if v_post_id is null then
    return; -- unresolved post_wp_id: never guess a canonical post to attach comments to
  end if;

  return query
  select * from (
    select
      'wordpress'::text as source_kind,
      c.wp_id::text as source_id,
      c.parent_wp_id::text as parent_ref,
      c.author_name as author_display_name,
      false as author_is_contributor,
      c.content as body,
      null::jsonb as reactions,
      c.date as created_at
    from public.comments c
    where c.post_wp_id = p_post_wp_id
      and c.status = 'publish'

    union all

    select
      'community'::text as source_kind,
      rc.id::text as source_id,
      rc.parent_id::text as parent_ref,
      coalesce(rc.author_name, ct.display_name) as author_display_name,
      (rc.author_contributor_id is not null) as author_is_contributor,
      rc.body,
      rc.reactions,
      rc.created_at
    from public.research_contributions rc
    left join public.contributors ct on ct.id = rc.author_contributor_id
    where rc.target_type = 'post'
      and rc.target_id = v_post_id::text
      and (rc.status = 'approved' or rc.author_user_id = auth.uid())
      -- Phase 2.2 integrity fix: never project a visually empty Community reply into the post
      -- conversation. A visible reply whose parent is one of these invisible rows keeps its
      -- parent_ref by id; the WordPress half of this union is unaffected (its own source never
      -- exhibited this blank-payload defect).
      and (
        coalesce(btrim(rc.body), '') <> ''
        or coalesce(btrim(rc.title), '') <> ''
        or rc.image_url is not null
        or jsonb_array_length(rc.media) > 0
      )
  ) unified
  order by created_at asc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
end;
$$;

comment on function public.post_conversation_projection is
  'G3 Community Core 2029 Phase 2.1 — unifies legacy WordPress public.comments with native '
  'research_contributions for one canonical post into a single chronological projection. Never '
  'guesses an unresolved post_wp_id. Phase 2.2: omits community rows with no displayable '
  'authored payload. See '
  'scripts/g3-community-foundation-runtime/postConversationProjection.mjs for the pure-logic twin.';

-- =====================================================================================
-- 7. Realtime — NOT enabled here. Verified live (2026-09-23): supabase_realtime publication
--    currently carries only `discoveries` and `post_share_counts`; `research_contributions` is
--    not a member. Per Phase 1's own §6 recommendation, adding it directly would broadcast
--    pending/hidden rows to unauthenticated subscribers ahead of moderation, because Supabase
--    Realtime's default row-change broadcast is not RLS-aware in every client configuration.
--    The RLS-safe path is Realtime Broadcast from within `community_stream_projection` (or a
--    trigger that calls `realtime.broadcast_changes` using the same predicate as §1), not table
--    replication. That wiring is intentionally left for Phase 3, once RLS-aware Realtime is
--    confirmed live against the Supabase version actually in use — do not uncomment the
--    statement below in this branch:
--
-- alter publication supabase_realtime add table public.research_contributions; -- DO NOT RUN
