-- TRAFFIC_INTELLIGENCE_V6 — Clean Composition (additive implementation).
-- Order: work_log 04d45750-618b-410c-8bc6-f81943b0eb62 (supersedes b11c4785-488c-4a5c-b3a2-4ce4170f74b6).
-- Governance: traffic_intelligence_law v6 (activated by GPT, work_log aaf304af).
--
-- Everything here is additive: new sibling fn_ti_* functions, new nullable columns on
-- ti_demand_signals, and an evidence-only enrichment of Metatron's existing Traffic/
-- Demand recommendations. fn_human_entrances and fn_ti_entity_demand keep their exact
-- OUT signatures untouched. Clean v1 (fn_ti_clean_classification) is read-only here and
-- is not modified. traffic_daily is never written by this migration. No new table/store.

-- ── 1) REPORTING DAY ──────────────────────────────────────────────────────────────────
-- Canonical SOD1820 reporting-day projection: raw event timestamps stay UTC everywhere
-- (traffic_daily, events.ts, etc. are untouched); this is purely a read-side helper that
-- callers opt into. No rebucket/backfill of any historical row happens here or anywhere
-- else in this migration.
CREATE OR REPLACE FUNCTION public.fn_ti_report_day(p_ts timestamptz)
RETURNS date
LANGUAGE sql
STABLE
AS $function$
  select (p_ts at time zone 'Asia/Jerusalem')::date
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_ti_report_day(timestamptz) FROM PUBLIC;

-- ── 2) PAGE-VIEW SEMANTICS — sibling reader, fn_human_entrances untouched ─────────────
-- fn_human_entrances(views/engaged/bounce) keeps counting every event_type='view'
-- regardless of surface, exactly as before — no consumer of it (admin_entries_daily,
-- admin_entries_day_detail, fn_ti_entity_demand, etc.) sees any change. This sibling adds
-- the surface-scoped reading alongside it: page_views counts ONLY surface='page' AND
-- event_type='view' rows, so a session with domain/impression duplicate view events no
-- longer looks falsely engaged (page_engaged/page_bounce use page_views, not legacy_views).
CREATE OR REPLACE FUNCTION public.fn_ti_session_metrics(p_from date, p_to date)
RETURNS TABLE(
  session_id text,
  reporting_day date,
  legacy_views integer,
  page_views integer,
  interactions integer,
  page_engaged boolean,
  page_bounce boolean,
  clean_classification text,
  clean_evidence jsonb
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
      min(ts) filter (where event_type='view') as first_view_ts,
      count(*) filter (where event_type='view') as legacy_views,
      count(*) filter (where surface='page' and event_type='view') as page_views,
      count(*) filter (where event_type in ('search','cross_search','use','save','journey','add','open')) as interactions
    from base
    group by session_id
  ),
  c as (
    select session_id, clean_classification, clean_evidence
    from public.fn_ti_clean_classification(p_from, p_to)
  )
  select
    s.session_id,
    public.fn_ti_report_day(coalesce(s.first_view_ts, now())) as reporting_day,
    s.legacy_views,
    s.page_views,
    s.interactions,
    (s.page_views >= 2) as page_engaged,
    (s.page_views = 1 and s.interactions = 0) as page_bounce,
    c.clean_classification,
    c.clean_evidence
  from sess s
  left join c using(session_id)
  where s.legacy_views >= 1;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_ti_session_metrics(date, date) FROM PUBLIC;

-- ── 3) CLEAN COMPOSITION — entity-keyed session map + composition reader ─────────────
-- fn_ti_entity_demand's OUT signature is frozen (do not break it), and it aggregates
-- landing_path straight to visit counts with no session_id in its output, so it cannot be
-- reused directly to attribute Clean/Unknown/Bot per entity. This sibling duplicates its
-- exact entity_type/entity_key parsing (same regex/url_decode/fn_ragil derivation) but
-- keeps session_id, so downstream can join to fn_ti_clean_classification per entity. Keep
-- this parsing in lockstep with fn_ti_entity_demand if that function's landing_path
-- parsing ever changes.
CREATE OR REPLACE FUNCTION public.fn_ti_entity_demand_sessions(p_from date, p_to date)
RETURNS TABLE(entity_type text, entity_key text, session_id text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  with h as (
    select session_id, landing_path
    from public.fn_human_entrances(p_from, p_to)
    where not suspected_bot and landing_path is not null
  ),
  parsed as (
    select h.session_id, h.landing_path,
      case when h.landing_path ~ '^/number/' then 'number'
           when h.landing_path ~ '^/topic/'  then 'topic'
           else 'page' end etype,
      case when h.landing_path ~ '^/number/' then public.url_decode(regexp_replace(h.landing_path,'^/number/',''))
           when h.landing_path ~ '^/topic/'  then regexp_replace(h.landing_path,'^/topic/','')
           else h.landing_path end slug
    from h
  ),
  keyed as (
    select p.session_id, p.etype,
      case when p.etype='number' then
         (case when p.slug ~ '^\d+$' then p.slug else nullif(public.fn_ragil(p.slug),0)::text end)
         else p.slug end ekey
    from parsed p
  )
  select etype, ekey, session_id from keyed where ekey is not null;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_ti_entity_demand_sessions(date, date) FROM PUBLIC;

-- Per-entity Clean/Unknown/Bot composition, computed over the exact same session_ids
-- fn_ti_entity_demand would count as `visits` for that entity/window (legacy
-- not-suspected-bot population), classified via unmodified fn_ti_clean_classification.
CREATE OR REPLACE FUNCTION public.fn_ti_entity_demand_clean_composition(p_from date, p_to date)
RETURNS TABLE(
  entity_type text,
  entity_key text,
  clean_human_visits integer,
  clean_unknown_visits integer,
  clean_bot_visits integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  with ds as (
    select entity_type, entity_key, session_id
    from public.fn_ti_entity_demand_sessions(p_from, p_to)
  ),
  cc as (
    select session_id, clean_classification
    from public.fn_ti_clean_classification(p_from, p_to)
  )
  select
    ds.entity_type, ds.entity_key,
    count(*) filter (where coalesce(cc.clean_classification,'unknown')='human')::int  as clean_human_visits,
    count(*) filter (where coalesce(cc.clean_classification,'unknown')='unknown')::int as clean_unknown_visits,
    count(*) filter (where coalesce(cc.clean_classification,'unknown')='bot')::int     as clean_bot_visits
  from ds
  left join cc using(session_id)
  group by ds.entity_type, ds.entity_key;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_ti_entity_demand_clean_composition(date, date) FROM PUBLIC;

-- ti_demand_signals: additive nullable columns only. No existing column is dropped or
-- reinterpreted; visits/human_visits keep aliasing exactly as before for legacy
-- consumers. Table is fully delete+insert per period on every fn_ti_project_demand run
-- (see below), so no backfill migration is needed — the next run populates these.
ALTER TABLE public.ti_demand_signals
  ADD COLUMN IF NOT EXISTS legacy_human_visits  integer,
  ADD COLUMN IF NOT EXISTS clean_human_visits    integer,
  ADD COLUMN IF NOT EXISTS clean_unknown_visits  integer,
  ADD COLUMN IF NOT EXISTS clean_bot_visits      integer;

COMMENT ON COLUMN public.ti_demand_signals.clean_bot_visits IS
  'Clean Traffic v1 bot-classified visits for this entity/period. Structurally low/zero: '
  'public.ingest_event() drops client-flagged-bot events before they ever reach `events`, '
  'so events.is_bot=true is rare by construction. This column is NOT evidence of "few '
  'bots" — it only reflects bots that survived ingest and were behaviorally re-flagged. '
  'The edge/crawl layer (public.edge_geo_log, see fn_ti_traffic_layers) is the '
  'complementary source for actual bot volume; do not read clean_bot_visits=0 as '
  'zero-bots-observed.';

COMMENT ON COLUMN public.ti_demand_signals.legacy_human_visits IS
  'The pre-v6 human_visits value (legacy fn_human_entrances not-suspected-bot population), '
  'preserved unchanged alongside human_visits for provenance. clean_human_visits/'
  'clean_unknown_visits/clean_bot_visits are the same session population re-classified by '
  'Clean Traffic v1 (fn_ti_clean_classification) and can disagree with legacy_human_visits '
  '— that disagreement is the point (see traffic_intelligence_law v6).';

-- fn_ti_project_demand: same signature, same visits/human_visits population logic and
-- same edges side-effect as before (byte-identical for every existing consumer). Only
-- addition: also computes and stores legacy_human_visits + the three clean_* columns via
-- the new sibling reader above.
CREATE OR REPLACE FUNCTION public.fn_ti_project_demand(p_from date, p_to date, p_period text DEFAULT '7d'::text, p_min integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare src uuid; n_sig int; n_edge int;
begin
  select id into src from public.nodes where type='system' and label='traffic_intelligence' limit 1;
  delete from public.ti_demand_signals where period=p_period;
  insert into public.ti_demand_signals(period,period_from,period_to,entity_type,entity_key,node_id,graph_presence,
     visits,human_visits,depth_rate,search_rate,tool_usage,quality_inputs,rule_version,generated_at,
     legacy_human_visits,clean_human_visits,clean_unknown_visits,clean_bot_visits)
  select p_period, p_from, p_to, d.entity_type, d.entity_key, d.node_id, (d.node_id is not null),
     d.visits, d.visits, d.avg_depth, d.search_rate, d.engaged_rate,
     jsonb_build_object('avg_depth',d.avg_depth,'search_rate',d.search_rate,'engaged_rate',d.engaged_rate), 2, now(),
     d.visits, coalesce(cc.clean_human_visits,0), coalesce(cc.clean_unknown_visits,0), coalesce(cc.clean_bot_visits,0)
  from public.fn_ti_entity_demand(p_from,p_to) d
  left join public.fn_ti_entity_demand_clean_composition(p_from,p_to) cc
    on cc.entity_type=d.entity_type and cc.entity_key=d.entity_key
  where d.entity_type in ('number','topic') and d.visits>=p_min;
  get diagnostics n_sig = row_count;

  delete from public.edges where relation_type='demand_signal' and metadata->>'period'=p_period;
  insert into public.edges(from_node,to_node,relation_type,weight,metadata)
  select src, s.node_id, 'demand_signal', s.visits,
     jsonb_build_object('period',p_period,'period_from',p_from,'period_to',p_to,'visits',s.visits,
        'human_visits',s.human_visits,'depth_rate',s.depth_rate,'search_rate',s.search_rate,'tool_usage',s.tool_usage,
        'quality_inputs',s.quality_inputs,'generated_at',now(),'rule_version',s.rule_version,'source','traffic_intelligence')
  from public.ti_demand_signals s where s.period=p_period and s.node_id is not null;
  get diagnostics n_edge = row_count;
  return jsonb_build_object('signals',n_sig,'edges',n_edge,'period',p_period,'ran_at',now());
end $function$;

-- ── 4) METATRON TRUTH LABELING ONLY ───────────────────────────────────────────────────
-- fn_metatron_recommend: recommendation-creation conditions (the WHERE thresholds
-- s.visits>=50 / s.visits>=20, the on_conflict guard, rule 3's gematria-richness gap
-- detector) are byte-identical to before. The ONLY change is that the two Traffic/Demand
-- rules (create_entity gap, write_article convergence) now also carry the Clean
-- composition of the same ti_demand_signals row in their evidence jsonb, plus a
-- clean_signal_state summary so Metatron/reviewers can see Human vs Unknown at a glance
-- without re-deriving it. No recommendation is deleted, rejected, or auto-approved by
-- this; reason text is untouched.
CREATE OR REPLACE FUNCTION public.fn_metatron_recommend()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n_gap int:=0; n_art int:=0; n_card int:=0;
begin
  -- כלל 1: פער ביקוש↔ייצוג (ביקוש גבוה, אין node בגרף)
  insert into public.recommendations(type,target_entity,target_node,reason,evidence,confidence,status,created_by)
  select 'create_entity', s.entity_key, null,
    'ביקוש גבוה ('||s.visits||' כניסות '||s.period||') לישות '||s.entity_type||' «'||s.entity_key||'» ללא נוכחות בגרף — פער ביקוש↔ייצוג.',
    jsonb_build_object('signal_period',s.period,'visits',s.visits,'graph_presence',false,'depth_rate',s.depth_rate,
      'legacy_visits',s.legacy_human_visits,
      'clean_human_visits',coalesce(s.clean_human_visits,0),
      'clean_unknown_visits',coalesce(s.clean_unknown_visits,0),
      'clean_bot_visits',coalesce(s.clean_bot_visits,0),
      'clean_signal_state',
        case
          when coalesce(s.clean_human_visits,0)=0 and coalesce(s.clean_unknown_visits,0)>0 then 'unknown_only'
          when coalesce(s.clean_human_visits,0)>0 and coalesce(s.clean_unknown_visits,0)=0 and coalesce(s.clean_bot_visits,0)=0 then 'human_only'
          when coalesce(s.clean_human_visits,0)>0 and coalesce(s.clean_unknown_visits,0)>0 then 'mixed'
          when coalesce(s.clean_bot_visits,0)>0 and coalesce(s.clean_human_visits,0)=0 and coalesce(s.clean_unknown_visits,0)=0 then 'bot_only'
          else 'no_data'
        end),
    least(1.0, round((s.visits/500.0)::numeric,2)), 'pending','metatron'
  from public.ti_demand_signals s
  where s.graph_presence=false and s.visits>=50
  on conflict (type,target_entity) where status='pending' do nothing;
  get diagnostics n_gap = row_count;

  -- כלל 2: ביקוש + התכנסות טרייה באותו ערך → הצעת פוסט (למזוהים)
  insert into public.recommendations(type,target_entity,target_node,reason,evidence,confidence,status,created_by)
  select 'write_article', s.entity_key, s.node_id,
    'ביקוש ('||s.visits||') לישות «'||s.entity_key||'» + התכנסות טרייה באותו ערך — הזדמנות לפוסט/הרחבה.',
    jsonb_build_object('signal_period',s.period,'visits',s.visits,'convergence',true,
      'sample',(select (c.phrases)[1] from public.convergences c where c.value=s.entity_key::int order by c.group_size desc limit 1),
      'legacy_visits',s.legacy_human_visits,
      'clean_human_visits',coalesce(s.clean_human_visits,0),
      'clean_unknown_visits',coalesce(s.clean_unknown_visits,0),
      'clean_bot_visits',coalesce(s.clean_bot_visits,0),
      'clean_signal_state',
        case
          when coalesce(s.clean_human_visits,0)=0 and coalesce(s.clean_unknown_visits,0)>0 then 'unknown_only'
          when coalesce(s.clean_human_visits,0)>0 and coalesce(s.clean_unknown_visits,0)=0 and coalesce(s.clean_bot_visits,0)=0 then 'human_only'
          when coalesce(s.clean_human_visits,0)>0 and coalesce(s.clean_unknown_visits,0)>0 then 'mixed'
          when coalesce(s.clean_bot_visits,0)>0 and coalesce(s.clean_human_visits,0)=0 and coalesce(s.clean_unknown_visits,0)=0 then 'bot_only'
          else 'no_data'
        end),
    least(1.0, round((s.visits/300.0)::numeric,2)), 'pending','metatron'
  from public.ti_demand_signals s
  where s.entity_type='number' and s.graph_presence=true and s.visits>=20 and s.entity_key ~ '^\d+$'
    and exists (select 1 from public.convergences c where c.value=s.entity_key::int and c.first_seen >= now()-interval '30 days')
  on conflict (type,target_entity) where status='pending' do nothing;
  get diagnostics n_art = row_count;

  -- כלל 3 (חדש): פער-שלמות — מספר עשיר בגימטריה בלי כרטיס-נושא (fn_metatron_gaps).
  -- מוגבל ל-TOP-12 העשירים ביותר כדי לא להציף; אישור אדם → יצירת כרטיס/ישות.
  -- Unrelated to Traffic/Demand — untouched.
  insert into public.recommendations(type,target_entity,target_node,reason,evidence,confidence,status,created_by)
  select 'create_card', g.v::text, null,
    'מספר '||g.v||' עשיר בגימטריה ('||g.c||' מילים במאגר) אך ללא כרטיס-נושא בעץ — פער שלמות מבני (מטטרון Gap Detector).',
    jsonb_build_object('words',g.c,'kind','completeness_gap','source','fn_metatron_gaps'),
    least(1.0, round((g.c/40.0)::numeric,2)), 'pending','metatron'
  from (
    with card_vals as (
      select distinct n from public.topic_cards,
        unnest(coalesce(numbers,'{}'::int[])||coalesce(highlight_numbers,'{}'::int[])) n),
    wc as (select ragil v, count(*) c from public.gematria_words where ragil is not null group by ragil)
    select v, c from wc
    where c>=10 and v not in (select n from card_vals)
    order by c desc limit 12
  ) g
  on conflict (type,target_entity) where status='pending' do nothing;
  get diagnostics n_card = row_count;

  return jsonb_build_object('create_entity',n_gap,'write_article',n_art,'create_card',n_card,'ran_at',now());
end $function$;

-- ── Refresh today's demand signals now, so ti_demand_signals carries the new columns
-- immediately instead of waiting for tonight's cron (fn_ti_daily runs the same two calls
-- at 03:40 daily) — same periods/thresholds fn_ti_daily already uses, run here only to
-- populate the additive columns without waiting a day. No new schedule/cron created.
select public.fn_ti_project_demand(current_date-7,  current_date, '7d',  10);
select public.fn_ti_project_demand(current_date-30, current_date, '30d', 15);

-- ── Golden-case truth labeling: additive JSON-evidence backfill for existing pending
-- Traffic/Demand recommendations (created before this migration, so fn_metatron_recommend's
-- on_conflict guard will never revisit them). Merges the new clean_* fields into the
-- existing evidence via jsonb `||` — reason/history/confidence/status/created_at are not
-- touched. Matches by (target_entity, evidence.signal_period) against the freshly
-- refreshed ti_demand_signals row for that period. This is what makes recommendation 848
-- (target=98) show clean_signal_state='unknown_only' instead of implying "67 humans".
update public.recommendations r
set evidence = coalesce(r.evidence,'{}'::jsonb) || jsonb_build_object(
    'legacy_visits', s.legacy_human_visits,
    'clean_human_visits', coalesce(s.clean_human_visits,0),
    'clean_unknown_visits', coalesce(s.clean_unknown_visits,0),
    'clean_bot_visits', coalesce(s.clean_bot_visits,0),
    'clean_signal_state',
      case
        when coalesce(s.clean_human_visits,0)=0 and coalesce(s.clean_unknown_visits,0)>0 then 'unknown_only'
        when coalesce(s.clean_human_visits,0)>0 and coalesce(s.clean_unknown_visits,0)=0 and coalesce(s.clean_bot_visits,0)=0 then 'human_only'
        when coalesce(s.clean_human_visits,0)>0 and coalesce(s.clean_unknown_visits,0)>0 then 'mixed'
        when coalesce(s.clean_bot_visits,0)>0 and coalesce(s.clean_human_visits,0)=0 and coalesce(s.clean_unknown_visits,0)=0 then 'bot_only'
        else 'no_data'
      end,
    'clean_evidence_provenance', jsonb_build_object(
      'source','fn_ti_entity_demand_clean_composition',
      'labeled_at', now(),
      'labeled_by', 'traffic_intelligence_v6_migration_backfill'
    )
  )
from public.ti_demand_signals s
where r.status='pending'
  and r.type in ('create_entity','write_article')
  and r.created_by='metatron'
  and s.entity_key = r.target_entity
  and s.period = (r.evidence->>'signal_period');
