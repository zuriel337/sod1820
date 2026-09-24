-- G3 Community Core PR #636 — Community Search Index Gate (BRANCH-ONLY, NOT APPLIED LIVE).
-- Assignment work_log.id=4d89f4b6-7472-4e40-ab36-a49f367c90d1, task_key=
-- G3_COMMUNITY_CORE_PR636_SEARCH_INDEX_GATE_V1, release_authorization_state=
-- BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_OPENWEB_TOUCH_NO_MERGE_NO_DEPLOY_NO_CUTOVER.
--
-- Do NOT run this migration against the live project (linswmnnkjxvweumprav) from this branch.
--
-- Problem: `community_search_facts` (20260923200000_g3_community_core_2029_phase2_shadow.sql
-- §2) and `fn_raziel_community_intel_scoped` (§3) gate only on `research_contributions.status
-- = 'approved'`. That means every approved message becomes search/Raziel-retrieval eligible,
-- including a mere number, a mere URL, a video-only share, or ordinary social chat/reaction
-- text — the classifier assumption this task closes (any number => gematria, any URL =>
-- source is not a search-eligibility decision).
--
-- Fix: reuse the existing `decision_ledger` candidate payload (no new table, no new column).
-- scripts/g3-community-foundation-runtime/classificationSeam.mjs's `toDecisionLedgerCandidate`
-- now emits `candidate.index_eligible` (boolean) + `candidate.index_eligibility_reasons`
-- (text[]) for `decision_type='community_contribution_classification'` rows — a candidate-only
-- AI decision (never publication/canonical/fact status; Human Gate/status is untouched). This
-- migration adds one read-only helper that resolves a contribution's latest such candidate
-- flag, and gates `community_search_facts` + the Raziel research-retrieval path on it.
-- `community_stream_projection` (ordinary chronological community reading) is intentionally
-- left untouched: all approved history stays visible there, exactly as before.
--
-- EXTEND_EXISTING only: reuses `decision_ledger` (research_contribution_law v9 baseline) and
-- the exact SECURITY DEFINER pattern already live on every function in this file family. No
-- parallel Community search table/store.

-- =====================================================================================
-- 0. Index eligibility resolver — latest AI classification candidate for a contribution.
--    Absence of any classification candidate (not yet classified) resolves to NOT eligible:
--    a message only becomes search/Raziel-retrieval eligible once an explicit research-
--    bearing signal has been recorded, never by default.
-- =====================================================================================
create or replace function public.community_contribution_index_eligible(p_contribution_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select (dl.candidate ->> 'index_eligible')::boolean
      from public.decision_ledger dl
      where dl.subject_type = 'research_contribution'
        and dl.subject_ref = p_contribution_id::text
        and dl.decision_type = 'community_contribution_classification'
      order by dl.created_at desc
      limit 1
    ),
    false
  );
$$;

comment on function public.community_contribution_index_eligible is
  'G3 Community Core PR #636 Search Index Gate — resolves a research_contributions row''s '
  'latest community_contribution_classification decision_ledger candidate.index_eligible flag '
  '(defaults to false when no candidate exists yet). Candidate-only: never reads/sets status, '
  'research_state, or human_decision. Reused by community_search_facts and '
  'fn_raziel_community_intel_scoped instead of a parallel eligibility store. Final calibration '
  '(task_key=G3_COMMUNITY_CORE_PR636_SEARCH_INDEX_FINAL_STRUCTURED_GATE_V1): index_eligible is '
  'now sourced exclusively from structured evidence.units[] in classificationSeam.mjs, never '
  'from raw-text regex alone — this function''s SQL is unchanged, since it only ever reads the '
  'resulting boolean off the existing decision_ledger candidate JSON.';

-- =====================================================================================
-- 1. community_search_facts — now returns only approved AND index-eligible content.
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
    -- Search Index Gate: mere number/URL/video/social chat is never search-eligible on its
    -- own; only material Remez/Research-bearing authored text is.
    and public.community_contribution_index_eligible(rc.id)
  order by rank desc
  limit greatest(1, least(coalesce(p_limit, 5), 20));
end;
$$;

comment on function public.community_search_facts is
  'G3 Community Core 2029 Phase 2 — extends chat_search_facts pattern onto approved community '
  'text. Approved-only; no email/PII column selected. Phase 2.2: excludes rows with no '
  'displayable body text. Search Index Gate (PR #636): excludes rows without a recorded '
  'index-eligible research-bearing signal (see community_contribution_index_eligible).';

-- =====================================================================================
-- 2. fn_raziel_community_intel_scoped — the Raziel Community research-retrieval seam now
--    consumes only index-eligible material for its research/search context (new-since count
--    and recent_thread_ids). General chronological reading (community_stream_projection,
--    post_conversation_projection) is untouched and still surfaces ordinary approved messages.
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
    and (p_since is null or rc.last_activity_at > p_since)
    and public.community_contribution_index_eligible(rc.id);

  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'created_at', t.created_at) order by t.created_at desc), '[]'::jsonb)
  into v_recent
  from (
    select rc.id, rc.created_at
    from public.research_contributions rc
    where rc.status = 'approved'
      and (p_root_target_type is null or rc.target_type = p_root_target_type)
      and (p_root_target_id is null or rc.target_id = p_root_target_id)
      and public.community_contribution_index_eligible(rc.id)
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
  'truth store. Search Index Gate (PR #636): new_since_last_visit_count and recent_thread_ids '
  'now consume only index-eligible material — ordinary chronological reading stays on '
  'community_stream_projection, unaffected by this gate.';
