-- TRAFFIC_INTELLIGENCE_V6 — post-implementation correction patch.
-- Order: work_log d6f64494-d0fb-4c13-8348-55a92f8342f3 (GPT independent verification of
-- AFTER e9e6464f). Same branch (claude/traffic-intel-v6-clean-composition), same
-- additive posture: no new architecture, no Clean v1 change, no traffic_daily rewrite,
-- no new table/store, no signature change on fn_human_entrances/fn_ti_entity_demand.

-- ── Helper: single source of truth for the human/unknown/bot summary label ────────────
-- Factored out because this patch needs the exact same state logic in more places
-- (demand_signal edge metadata, fn_metatron_weekly, admin_command_center) than the first
-- pass anticipated; keeping one function avoids the CASE drifting between call sites.
CREATE OR REPLACE FUNCTION public.fn_ti_clean_signal_state(p_human integer, p_unknown integer, p_bot integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  select case
    when coalesce(p_human,0)=0 and coalesce(p_unknown,0)>0 then 'unknown_only'
    when coalesce(p_human,0)>0 and coalesce(p_unknown,0)=0 and coalesce(p_bot,0)=0 then 'human_only'
    when coalesce(p_human,0)>0 and coalesce(p_unknown,0)>0 then 'mixed'
    when coalesce(p_bot,0)>0 and coalesce(p_human,0)=0 and coalesce(p_unknown,0)=0 then 'bot_only'
    else 'no_data'
  end
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_ti_clean_signal_state(integer, integer, integer) FROM PUBLIC;

-- ── BUG #1 FIX: fn_ti_session_metrics must select by reporting-day, not UTC e.ts::date ─
-- Previous version filtered `base` with e.ts::date >= p_from/<= p_to, which is a UTC-date
-- filter — the exact timezone gap v6 was created to close (verified live: 292-view hole
-- on 2026-09-07). Fix: filter by fn_ti_report_day(e.ts) instead. Clean v1
-- (fn_ti_clean_classification) is frozen and itself filters by e.ts::date (UTC), so it is
-- called over a widened window (one day of slack each side) and joined down to exactly
-- the session_ids selected by the reporting-day-filtered base — Clean v1's own filtering/
-- classification logic is not touched.
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
      and (p_from is null or public.fn_ti_report_day(e.ts) >= p_from)
      and (p_to   is null or public.fn_ti_report_day(e.ts) <= p_to)
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
    from public.fn_ti_clean_classification(
      (coalesce(p_from, current_date) - interval '1 day')::date,
      (coalesce(p_to,   current_date) + interval '1 day')::date
    )
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

-- ── GAP #2a: demand_signal edge metadata gains Clean composition (truth-labeling only) ─
-- weight/ranking/thresholds are byte-identical (weight=s.visits, same delete+insert scope,
-- same node filter). Only the metadata jsonb gains fields.
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
        'quality_inputs',s.quality_inputs,'generated_at',now(),'rule_version',s.rule_version,'source','traffic_intelligence',
        'legacy_human_visits',s.legacy_human_visits,
        'clean_human_visits',s.clean_human_visits,
        'clean_unknown_visits',s.clean_unknown_visits,
        'clean_bot_visits',s.clean_bot_visits,
        'clean_signal_state',public.fn_ti_clean_signal_state(s.clean_human_visits,s.clean_unknown_visits,s.clean_bot_visits))
  from public.ti_demand_signals s where s.period=p_period and s.node_id is not null;
  get diagnostics n_edge = row_count;
  return jsonb_build_object('signals',n_sig,'edges',n_edge,'period',p_period,'ran_at',now());
end $function$;

-- ── GAP #3 (forward-looking half): newly created recommendations carry their own
-- period_from/period_to directly, and use the shared helper for clean_signal_state.
-- Creation conditions (WHERE thresholds, on_conflict guard, rule 3) are unchanged.
CREATE OR REPLACE FUNCTION public.fn_metatron_recommend()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n_gap int:=0; n_art int:=0; n_card int:=0;
begin
  insert into public.recommendations(type,target_entity,target_node,reason,evidence,confidence,status,created_by)
  select 'create_entity', s.entity_key, null,
    'ביקוש גבוה ('||s.visits||' כניסות '||s.period||') לישות '||s.entity_type||' «'||s.entity_key||'» ללא נוכחות בגרף — פער ביקוש↔ייצוג.',
    jsonb_build_object('signal_period',s.period,'visits',s.visits,'graph_presence',false,'depth_rate',s.depth_rate,
      'legacy_visits',s.legacy_human_visits,
      'clean_human_visits',coalesce(s.clean_human_visits,0),
      'clean_unknown_visits',coalesce(s.clean_unknown_visits,0),
      'clean_bot_visits',coalesce(s.clean_bot_visits,0),
      'clean_signal_state',public.fn_ti_clean_signal_state(s.clean_human_visits,s.clean_unknown_visits,s.clean_bot_visits),
      'clean_evidence_period_from',s.period_from,
      'clean_evidence_period_to',s.period_to,
      'clean_evidence_is_reassessment',false),
    least(1.0, round((s.visits/500.0)::numeric,2)), 'pending','metatron'
  from public.ti_demand_signals s
  where s.graph_presence=false and s.visits>=50
  on conflict (type,target_entity) where status='pending' do nothing;
  get diagnostics n_gap = row_count;

  insert into public.recommendations(type,target_entity,target_node,reason,evidence,confidence,status,created_by)
  select 'write_article', s.entity_key, s.node_id,
    'ביקוש ('||s.visits||') לישות «'||s.entity_key||'» + התכנסות טרייה באותו ערך — הזדמנות לפוסט/הרחבה.',
    jsonb_build_object('signal_period',s.period,'visits',s.visits,'convergence',true,
      'sample',(select (c.phrases)[1] from public.convergences c where c.value=s.entity_key::int order by c.group_size desc limit 1),
      'legacy_visits',s.legacy_human_visits,
      'clean_human_visits',coalesce(s.clean_human_visits,0),
      'clean_unknown_visits',coalesce(s.clean_unknown_visits,0),
      'clean_bot_visits',coalesce(s.clean_bot_visits,0),
      'clean_signal_state',public.fn_ti_clean_signal_state(s.clean_human_visits,s.clean_unknown_visits,s.clean_bot_visits),
      'clean_evidence_period_from',s.period_from,
      'clean_evidence_period_to',s.period_to,
      'clean_evidence_is_reassessment',false),
    least(1.0, round((s.visits/300.0)::numeric,2)), 'pending','metatron'
  from public.ti_demand_signals s
  where s.entity_type='number' and s.graph_presence=true and s.visits>=20 and s.entity_key ~ '^\d+$'
    and exists (select 1 from public.convergences c where c.value=s.entity_key::int and c.first_seen >= now()-interval '30 days')
  on conflict (type,target_entity) where status='pending' do nothing;
  get diagnostics n_art = row_count;

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

-- ── GAP #2b: fn_metatron_weekly's entity_demand section gains Clean composition ───────
-- Sort order (visits desc) and the 10-row limit are unchanged; only new keys are added
-- per entity.
CREATE OR REPLACE FUNCTION public.fn_metatron_weekly(p_days integer DEFAULT 7, p_persist boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare
  v_from timestamptz := now()-(p_days||' days')::interval;
  d_to date := current_date;
  d_from date := current_date - p_days;
  d_prev_from date := current_date - 2*p_days;
  d_prev_to date := current_date - p_days - 1;
  v_sec1 jsonb; v_sec2 jsonb; v_sec3 jsonb; v_sec4 jsonb; v_sec5 jsonb; v_sec6 jsonb; v_integ jsonb; v_base jsonb; v_digest jsonb;
begin
  -- 1) תגליות (התכנסויות/עוגנים) — ללא שינוי
  select jsonb_build_object(
    'new_convergences', coalesce((select count(*) from convergences where first_seen>=v_from),0),
    'new_anchors', coalesce((select count(*) from convergences where kind='anchor_hit' and first_seen>=v_from),0),
    'new_equalities', coalesce((select count(*) from convergences where kind='same_method_equality' and first_seen>=v_from),0),
    'top_new', coalesce((select jsonb_agg(x order by (x->>'group_size')::int desc) from (
        select jsonb_build_object('value',value,'group_size',group_size,'sample',(phrases)[1]) x
        from convergences where kind='anchor_hit' and first_seen>=v_from order by group_size desc limit 5) y),'[]'::jsonb)
  ) into v_sec1;

  -- 2) 🔁 מגמות לפי surface — עכשיו מ-fn_ti_surface_activity (נטו-אנושי, מסונן התנהגותית) — ללא שינוי
  select coalesce(jsonb_agg(t order by (t->>'this_week')::int desc),'[]'::jsonb) into v_sec2 from (
    select jsonb_build_object('section',cur.surface,'this_week',cur.events,'prev_week',coalesce(prev.events,0),
      'sessions',cur.sessions,
      'pct',case when coalesce(prev.events,0)=0 then null else round(100.0*(cur.events-prev.events)/prev.events) end) t
    from public.fn_ti_surface_activity(d_from,d_to) cur
    left join public.fn_ti_surface_activity(d_prev_from,d_prev_to) prev on prev.surface=cur.surface
    where cur.events>=5 order by cur.events desc limit 10) s;

  -- 3) סוכנים — ללא שינוי
  select coalesce(jsonb_agg(a order by a->>'agent_id'),'[]'::jsonb) into v_sec3 from (
    select jsonb_build_object('agent_id',ai.agent_id,'name',ai.name,'role',ai.role,'domain',ai.domain,'phase',ai.phase,
      'user_facing',ai.user_facing,'memory_total',(select count(*) from agent_user_memory m where m.agent=ai.agent_id),
      'by_status',coalesce((select jsonb_object_agg(status,c) from (select status,count(*) c from agent_user_memory m where m.agent=ai.agent_id group by status) z),'{}'::jsonb),
      'stats',coalesce((select jsonb_agg(jsonb_build_object('label',label,'value',value,'detail',detail) order by sort) from agent_research_stats rs where rs.agent=ai.agent_id),'[]'::jsonb)) a
    from agent_identity ai where ai.active) q;

  -- 4) מועמדי מסע — ללא שינוי
  select coalesce(jsonb_agg(r order by (r->>'readiness')::int desc),'[]'::jsonb) into v_sec4 from (
    select jsonb_build_object('value',value,'readiness',readiness,'action',action,'status','ממתין לאישור',
      'engine_hits',(metrics->>'engine_hits')::int,'human_views',(metrics->>'human_views')::int,
      'reason','נוצר מועמד למסע: '||value||' — ממתין לאישור','suggestion',suggestion) r
    from journey_seeds where status='draft' and action in ('CREATE_JOURNEY','INVESTIGATE_FIRST')
    order by readiness desc limit 6) q;

  -- 5) הצעות-מערכת — ללא שינוי
  select coalesce(jsonb_agg(s),'[]'::jsonb) into v_sec5 from (
    select jsonb_build_object('area','gabriel','priority','med','text','יש '||v||' גשרים ממתינים לאישור — כדאי מחזור-אישור לגבריאל') s
    from (select coalesce(value,0) v from agent_research_stats where agent='gabriel' and metric_key='bridges_pending') g where v>5
    union all select jsonb_build_object('area','uriel','priority','med','text','אוריאל צבר '||v||' פירוקים אישיים — כדאי סבב מיון למועמדים קנוניים')
    from (select count(*) v from agent_user_memory where agent='uriel' and status='private') u where v>=20
    union all select jsonb_build_object('area','system','priority','high','text','נסרקו '||v||' התכנסויות — כדאי דירוג/סף-תצוגה (min_group) לצמצום רעש')
    from (select count(*) v from convergences) c where v>1000
    union all select jsonb_build_object('area','gabriel','priority','low','text','יש '||v||' שאלות-מחקר פתוחות אצל גבריאל')
    from (select coalesce(value,0) v from agent_research_stats where agent='gabriel' and metric_key='open_questions') o where v>0) x;

  -- 6) 🌉 ביקוש-ישויות — גשר TI↔גרף, עכשיו כולל Clean composition (truth-labeling only,
  --    אותו מיון visits desc, אותו limit 10, ללא שינוי לוגיקת-דירוג)
  select coalesce(jsonb_agg(e order by (e->>'visits')::int desc),'[]'::jsonb) into v_sec6 from (
    select jsonb_build_object('entity_type',ed.entity_type,'key',ed.entity_key,'node_label',ed.node_label,
      'in_graph',(ed.node_id is not null),'visits',ed.visits,'depth',ed.avg_depth,'engaged_rate',ed.engaged_rate,
      'clean_human_visits',coalesce(cc.clean_human_visits,0),
      'clean_unknown_visits',coalesce(cc.clean_unknown_visits,0),
      'clean_bot_visits',coalesce(cc.clean_bot_visits,0),
      'clean_signal_state',public.fn_ti_clean_signal_state(cc.clean_human_visits,cc.clean_unknown_visits,cc.clean_bot_visits)) e
    from public.fn_ti_entity_demand(d_from,d_to) ed
    left join public.fn_ti_entity_demand_clean_composition(d_from,d_to) cc
      on cc.entity_type=ed.entity_type and cc.entity_key=ed.entity_key
    where ed.entity_type in ('number','topic') order by ed.visits desc limit 10) q;

  -- data_integrity — עכשיו מ-fn_ti_summary (net/suspected/human_pct התנהגותי) — ללא שינוי
  select public.fn_ti_summary(d_from,d_to) into v_base;
  v_integ := v_base || jsonb_build_object(
    'bot_filtering_active', true, 'rule', 'suspected_bot v2 (behavioral)', 'recommendations_trusted', true,
    'note', case when (v_base->>'human_pct')::numeric < 66
                 then 'רעש-בוטים גבוה — כל המדדים מחושבים על נטו-אנושי בלבד (חוזה traffic_intelligence_law)'
                 else 'איכות תנועה תקינה — מסונן התנהגותית' end);

  v_digest := jsonb_build_object('title','👑 Metatron Weekly Digest','generated_at',now(),
    'period',jsonb_build_object('from',v_from,'to',now(),'days',p_days),
    'data_integrity',v_integ,'discoveries',v_sec1,'trends',v_sec2,'agents',v_sec3,
    'recommendations',v_sec4,'system_suggestions',v_sec5,'entity_demand',v_sec6);

  if p_persist then
    insert into public.metatron_weekly (week_start,week_end,digest,status)
    values ((now()-(p_days||' days')::interval)::date, now()::date, v_digest,'draft')
    on conflict (week_start) do update set digest=excluded.digest,week_end=excluded.week_end,generated_at=now();
  end if;
  return v_digest;
end $function$;

-- ── GAP #2c: admin_command_center's demand_gaps/top_demand gain Clean composition ────
-- Both subqueries already read straight from ti_demand_signals, which already carries the
-- clean_* columns (populated by fn_ti_project_demand) — no extra join/function call
-- needed. Sort order and limits are unchanged.
CREATE OR REPLACE FUNCTION public.admin_command_center()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare res jsonb; d0 date := current_date-30; d7 date := current_date-7; d14 date := current_date-14;
  cur numeric; prev numeric;
begin
  if not exists (select 1 from public.users where id=auth.uid() and role='admin') then raise exception 'not authorized'; end if;
  select coalesce(sum(entrances),0) into cur  from public.traffic_daily where day > d7;
  select coalesce(sum(entrances),0) into prev from public.traffic_daily where day > d14 and day <= d7;
  select jsonb_build_object(
    'traffic', (public.fn_ti_summary(d0, current_date) || jsonb_build_object(
        'trend_7d', cur, 'trend_prev_7d', prev,
        'trend_pct', case when prev>0 then round(100.0*(cur-prev)/prev) else null end)),
    'traffic_layers', public.fn_ti_traffic_layers(d0, current_date),
    'metatron_status', public.fn_metatron_status(),
    'counters', jsonb_build_object(
      'recommendations_pending', (select count(*) from public.recommendations where status='pending'),
      'demand_gaps', (select count(*) from public.ti_demand_signals where graph_presence=false),
      'zuriel_definitions', (select count(*) from public.researcher_definitions where status in ('new','ai_replied')),
      'hints_pending', (select count(*) from public.community_hints where status='pending'),
      'journey_drafts', (select count(*) from public.journey_seeds where status='draft' and action in ('CREATE_JOURNEY','INVESTIGATE_FIRST')),
      'convergences_new_7d', (select count(*) from public.convergences where first_seen>=now()-interval '7 days'),
      'worklog_ready_deploy', (select count(*) from public.work_log where status='ready_to_deploy')
    ),
    'recommendations', (select coalesce(jsonb_agg(r order by r.confidence desc nulls last, r.id),'[]'::jsonb) from (
        select id, type, target_entity, target_node, reason, evidence, confidence
        from public.recommendations where status='pending' order by confidence desc nulls last limit 20) r),
    'demand_gaps', (select coalesce(jsonb_agg(g),'[]'::jsonb) from (
        select jsonb_build_object('entity_type',entity_type,'key',entity_key,'visits',visits,'period',period,
          'clean_human_visits',coalesce(clean_human_visits,0),
          'clean_unknown_visits',coalesce(clean_unknown_visits,0),
          'clean_bot_visits',coalesce(clean_bot_visits,0),
          'clean_signal_state',public.fn_ti_clean_signal_state(clean_human_visits,clean_unknown_visits,clean_bot_visits)) g
        from public.ti_demand_signals where graph_presence=false order by visits desc limit 10) x),
    'top_demand', (select coalesce(jsonb_agg(t),'[]'::jsonb) from (
        select jsonb_build_object('key',s.entity_key,'label',n.label,'visits',s.visits,'depth',s.depth_rate,
          'clean_human_visits',coalesce(s.clean_human_visits,0),
          'clean_unknown_visits',coalesce(s.clean_unknown_visits,0),
          'clean_bot_visits',coalesce(s.clean_bot_visits,0),
          'clean_signal_state',public.fn_ti_clean_signal_state(s.clean_human_visits,s.clean_unknown_visits,s.clean_bot_visits)) t
        from public.ti_demand_signals s left join public.nodes n on n.id=s.node_id
        where s.graph_presence=true and s.period='30d' order by s.visits desc limit 8) y),
    'recent_discoveries', (select coalesce(jsonb_agg(d),'[]'::jsonb) from (
        select jsonb_build_object('value',value,'group_size',group_size,'sample',(phrases)[1],'kind',kind) d
        from public.convergences where first_seen>=now()-interval '14 days' order by group_size desc limit 8) z),
    'desk_discoveries', (select coalesce(jsonb_agg(d),'[]'::jsonb) from (
        select jsonb_build_object('value',value,'group_size',group_size,'sample',(phrases)[1],'kind',kind,'method',method) d
        from public.metatron_desk where status='new' order by group_size desc nulls last limit 8) dd),
    'generated_at', now()
  ) into res;
  return res;
end $function$;

-- ── NIT fix: clean_bot_visits column comment must not claim "behaviorally re-flagged" ─
COMMENT ON COLUMN public.ti_demand_signals.clean_bot_visits IS
  'Clean Traffic v1 bot-classified visits for this entity/period. Structurally low/zero: '
  'bot-marked client events are dropped at ingest (public.ingest_event()) before they ever '
  'reach `events`, so this column can be structurally zero even when real bot traffic '
  'exists. The edge/crawl layer (public.edge_geo_log, see fn_ti_traffic_layers) is the '
  'complementary source for bot volume truth; do not read clean_bot_visits=0 as '
  'zero-bots-observed.';

-- ── Refresh demand signals + edges now, so the new edge metadata / period_from/period_to
-- fields are live immediately instead of waiting for tonight's cron (same periods/
-- thresholds fn_ti_daily already runs at 03:40; no new schedule created).
select public.fn_ti_project_demand(current_date-7,  current_date, '7d',  10);
select public.fn_ti_project_demand(current_date-30, current_date, '30d', 15);

-- ── GAP #3 (backfill half): existing pending recommendations already enriched by the
-- first v6 pass (identified by carrying clean_evidence_provenance) get the reassessment
-- window appended additively. Original reason/visits/confidence/status/created_at are
-- never touched — this only adds three new keys on top of the evidence already merged.
update public.recommendations r
set evidence = r.evidence || jsonb_build_object(
    'clean_evidence_period_from', s.period_from,
    'clean_evidence_period_to', s.period_to,
    'clean_evidence_is_reassessment', true
  )
from public.ti_demand_signals s
where r.evidence ? 'clean_evidence_provenance'
  and s.entity_key = r.target_entity
  and s.period = (r.evidence->>'signal_period');
