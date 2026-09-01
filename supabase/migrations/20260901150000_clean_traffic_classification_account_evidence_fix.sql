-- Clean Traffic Classification Foundation v1 — targeted account-evidence fix.
-- Live cross-verification found: fn_ti_clean_classification picked ONE arbitrary
-- person_id per session ((array_agg(person_id) ...)[1]) and checked
-- persons.account_user_id only for that one id. Sessions carrying more than one
-- distinct person_id (549 in the 30d window checked) could have their real
-- account-linked identity ignored if a different, non-linked person_id happened
-- to be picked. This violates the frozen contract: ANY identity representation
-- in the session linked to a verified account must count as real_account
-- evidence. Confirmed live: 6-8 account-linked sessions were missed by the old
-- method, 4 of which were misclassified non-HUMAN as a direct result.
--
-- FIX SCOPE: account-evidence computation only. No other positive-human-evidence
-- signal changed. No BOT logic changed. No touch to fn_human_entrances (v3).
-- No change to output columns/signature — same CREATE OR REPLACE FUNCTION,
-- verified by pg_get_functiondef diff to differ ONLY in the account-lookup CTEs.
--
-- has_account is now: EXISTS/bool_or across every distinct person_id seen
-- anywhere in the session, joined to persons.account_user_id IS NOT NULL —
-- exactly the contract wording ("if ANY identity representation in the session
-- is linked to a verified account, verified_account evidence must be true").
--
-- Applied as a new migration (not an edit to the already-applied
-- 20260901140000 file) because that migration is already live on the canonical
-- DB — editing it in place would desync the repo from what Supabase's migration
-- tracking recorded as applied. This file is layered on top, per repo convention
-- (e.g. 20260831150500_fix_get_or_create_entity_node_overload.sql).

CREATE OR REPLACE FUNCTION public.fn_ti_clean_classification(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date)
 RETURNS TABLE(
   session_id text,
   clean_classification text,
   clean_classification_reason text,
   clean_classification_source text,
   clean_classifier_version text,
   clean_evidence jsonb,
   clean_eligible boolean,
   legacy_suspected_bot boolean,
   legacy_classification_reason text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with base as (
    select e.* from public.events e
    where e.session_id is not null
      and (p_from is null or e.ts::date >= p_from)
      and (p_to   is null or e.ts::date <= p_to)
  ),
  sess as (
    select
      session_id,
      bool_or(is_bot) as raw_is_bot,
      count(*) filter (where event_type in ('search','cross_search')) as n_search,
      count(*) filter (where event_type='save') as n_save,
      count(*) filter (where event_type='use') as n_use,
      count(*) filter (where event_type='journey') as n_journey,
      count(*) filter (where event_type in ('share','share_story')) as n_share,
      coalesce(sum((props->>'engaged_ms')::numeric) filter (where event_type='engagement'),0) as engaged_ms_total
    from base
    group by session_id
  ),
  person_links as (
    -- every distinct person_id seen anywhere in the session, not just one
    select distinct session_id, person_id from base where person_id is not null
  ),
  acct as (
    select pl.session_id, bool_or(p.account_user_id is not null) as has_account
    from person_links pl
    join public.persons p on p.person_id = pl.person_id
    group by pl.session_id
  ),
  legacy as (
    select h.session_id, h.suspected_bot, h.classification_reason
    from public.fn_human_entrances(p_from, p_to) h
  ),
  joined as (
    select
      s.session_id, s.raw_is_bot, s.engaged_ms_total,
      coalesce(a.has_account, false) as has_account,
      (s.n_search>=1) as ev_search,
      (s.n_save>=1) as ev_save,
      (s.n_use>=1) as ev_use,
      (s.n_journey>=1) as ev_journey,
      (s.n_share>=1) as ev_share,
      (s.engaged_ms_total>=15000) as ev_dwell15,
      l.suspected_bot as legacy_suspected_bot,
      l.classification_reason as legacy_classification_reason
    from sess s
    left join acct a using(session_id)
    left join legacy l using(session_id)
  ),
  scored as (
    select j.*,
      (j.has_account or j.ev_search or j.ev_save or j.ev_use or j.ev_journey or j.ev_share or j.ev_dwell15) as has_positive_human_evidence,
      array_remove(array[
        case when j.has_account then 'account' end,
        case when j.ev_search then 'search' end,
        case when j.ev_save then 'save' end,
        case when j.ev_use then 'use' end,
        case when j.ev_journey then 'journey' end,
        case when j.ev_share then 'share' end,
        case when j.ev_dwell15 then 'dwell>=15s' end
      ], null) as human_evidence_labels
    from joined j
  )
  select
    s.session_id,
    case
      when s.raw_is_bot then 'bot'
      when s.has_positive_human_evidence then 'human'
      else 'unknown'
    end as clean_classification,
    case
      when s.raw_is_bot then 'positive_bot_evidence:raw_is_bot'
      when s.has_positive_human_evidence then 'positive_human_evidence:'||array_to_string(s.human_evidence_labels, ',')
      when s.legacy_suspected_bot then 'insufficient_evidence (legacy suspected_bot=true is NOT treated as positive bot evidence per Human-Gate 2026-09-01)'
      else 'insufficient_evidence'
    end as clean_classification_reason,
    case
      when s.raw_is_bot then 'raw_is_bot'
      when s.has_positive_human_evidence then s.human_evidence_labels[1]
      else 'none'
    end as clean_classification_source,
    'clean_traffic_foundation_v1' as clean_classifier_version,
    jsonb_build_object(
      'has_account', s.has_account,
      'has_search', s.ev_search,
      'has_save', s.ev_save,
      'has_use', s.ev_use,
      'has_journey', s.ev_journey,
      'has_share', s.ev_share,
      'dwell_ms', s.engaged_ms_total,
      'raw_is_bot', s.raw_is_bot,
      'legacy_suspected_bot', s.legacy_suspected_bot
    ) as clean_evidence,
    (not s.raw_is_bot and s.has_positive_human_evidence) as clean_eligible,
    s.legacy_suspected_bot,
    s.legacy_classification_reason
  from scored s;
$function$;

-- CREATE FUNCTION resets grants to default (EXECUTE to PUBLIC) — re-apply the
-- server-only correction from 20260901140500 immediately, in the same migration,
-- so there is no window where this is client-readable.
REVOKE EXECUTE ON FUNCTION public.fn_ti_clean_classification(date, date) FROM PUBLIC;
