-- Clean Traffic Classification Foundation v1
-- Human-Gate: ZURIEL, approved 2026-09-01, after 3 READ-ONLY calibration passes
-- (governance: nodes.rule_id='traffic_intelligence_law', rule_version 3->4).
--
-- Canonical HUMAN | BOT | UNKNOWN classification, additive ONLY:
--   - public.fn_human_entrances() (Behavioral Bot v3) is NOT modified. Verified
--     byte-identical before/after via whitespace-normalized md5 of
--     pg_get_functiondef (hash 1a2e30ce9e4378b975cbf79710fb4cdb, both passes).
--   - No new table/store/engine. This is ONE new SQL function composing existing
--     canonical primitives (public.events, public.persons, public.fn_human_entrances)
--     — the smallest layer capable of expressing a real BOT branch, which
--     fn_human_entrances structurally cannot (it excludes any_bot=true sessions
--     from its own row population by design, per its "human entrances" name/scope;
--     widening that population would itself be a v3 modification, which is
--     explicitly out of scope for this pass).
--   - Naming follows the existing fn_ti_* agent-contract family
--     (traffic_intelligence_law: "fn_ti_*: the only way agents read TI").
--   - Grants: none added. Matches fn_human_entrances/fn_ti_* (EXECUTE granted only
--     to `postgres`/owner by default in this schema — server-only, consistent with
--     rls_client_read_protocol's "server-only, no grant intended" pattern).
--
-- POSITIVE HUMAN EVIDENCE (frozen, Human-Gate 2026-09-01 — "Candidate A"):
--   real_account (persons.account_user_id IS NOT NULL) OR search/cross_search OR
--   save OR use OR journey OR share/share_story OR measured dwell >= 15s
--   (public.events event_type='engagement', props->>'engaged_ms').
-- NOT sufficient alone (explicitly, per Human-Gate): add, open, click,
-- internal_link_click, multi_page, session_span, person_id alone, is_bot=false alone.
-- This list must not be broadened without a later Human Gate.
--
-- POSITIVE BOT EVIDENCE: public.events.is_bot=true (existing raw signal only —
-- no new detector invented). suspected_bot=true (v3, behavioral) is NEVER treated
-- as positive bot evidence here — it is passed through unchanged as
-- legacy_suspected_bot/legacy_classification_reason so v3's own truth stays visible,
-- not overwritten or hidden.
--
-- UNKNOWN is first-class: neither raw_is_bot nor any positive human evidence.
-- clean_eligible = true only when clean_classification = 'human'
-- ("CLEAN VERIFIED HUMAN"). This is explicitly NOT the same concept as the
-- existing legacy human estimate (traffic_daily.entrances / fn_human_entrances
-- "not suspected_bot" — ~83.6% of traffic) — that legacy metric is untouched,
-- still live, still the default for all existing dashboards. This function adds a
-- second, separately-named, stricter metric; it does not replace anything.

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
      (array_agg(person_id) filter (where person_id is not null))[1] as any_person_id,
      count(*) filter (where event_type in ('search','cross_search')) as n_search,
      count(*) filter (where event_type='save') as n_save,
      count(*) filter (where event_type='use') as n_use,
      count(*) filter (where event_type='journey') as n_journey,
      count(*) filter (where event_type in ('share','share_story')) as n_share,
      coalesce(sum((props->>'engaged_ms')::numeric) filter (where event_type='engagement'),0) as engaged_ms_total
    from base
    group by session_id
  ),
  acct as (
    select s.session_id, (p.account_user_id is not null) as has_account
    from sess s left join public.persons p on p.person_id = s.any_person_id
  ),
  legacy as (
    select h.session_id, h.suspected_bot, h.classification_reason
    from public.fn_human_entrances(p_from, p_to) h
  ),
  joined as (
    select
      s.session_id, s.raw_is_bot, s.engaged_ms_total,
      a.has_account,
      (s.n_search>=1) as ev_search,
      (s.n_save>=1) as ev_save,
      (s.n_use>=1) as ev_use,
      (s.n_journey>=1) as ev_journey,
      (s.n_share>=1) as ev_share,
      (s.engaged_ms_total>=15000) as ev_dwell15,
      l.suspected_bot as legacy_suspected_bot,
      l.classification_reason as legacy_classification_reason
    from sess s
    join acct a using(session_id)
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
