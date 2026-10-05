-- Throwaway-Postgres Golden for RAZIEL_INTELLIGENCE_CORE_V1_PHASE_M (cross-surface plan/answer side). Applies the ENTIRE Raziel migration lineage in order
-- (route-boundary, A, C, D2, E, F, G, H, K) over the Phase H stubs, then asserts the natural-language matrix. Never run against a live project.
-- Phase I/J/L are Edge-only (no migration); their adapter side is asserted in src/lib/research/razielPhaseMCrossSurfaceGolden.test.js.
-- stub so the test can prove the gematria resolver is NOT reached for non-gematria plans.
create table agent_identity(agent_id text, name text, capabilities text, does_not text, permission_scope text,
  active boolean, layer text, match_keywords text[]);
insert into agent_identity values
 ('gematria_engine','g','g','x','public',true,'engine',array['גימטריה','ערך','שווה','כמה','חישוב']),
 ('els_cipher','els','els','x','public',true,'engine',array['דילוג','דילוגים','els','דילוגי אותיות','דילוגי-אותיות']),
 ('sandalphon','s','tanakh','x','public',true,'expert',array['תנ"ך','פסוק','פסוקים','מקור','ספר','הופעות','היכן מופיע']),
 ('research_intelligence','ri','ri','x','admin',true,'engine',array['ביקוש','טרנד','מה לחקור']),
 ('big_letter_cipher','b','b','x','public',false,'engine',array['צופן בגדול']);
create table raziel_protocol_agents(intent text, expert_id text, fn_name text, enabled boolean, sort int, deterministic boolean, token_cost int);
insert into raziel_protocol_agents values
 ('gematria','gematria_engine','fn_gematria_pack',true,10,true,0),
 ('els','els_cipher','fn_els_search',true,10,true,0),
 ('research_intel','research_intelligence','fn_raziel_research_intel_scoped',true,10,true,0);
alter table raziel_protocol_agents add column cross_check jsonb;
alter table raziel_protocol_agents add column agent_id text, add column stage text, add column output_key text, add column fn_args jsonb,
  add column result_mode text, add column depends_on text[], add column needs_value boolean, add column source_of_truth text, add column note text,
  add column input_schema jsonb, add column output_schema jsonb;
create table raziel_protocol_allowed_fns(fn_name text, note text);
insert into raziel_protocol_allowed_fns(fn_name) values ('fn_gematria_pack'),('fn_els_search');
create table raziel_execution_flags(id int, enabled boolean, test_visitor_id text);
insert into raziel_execution_flags values (1,true,null);
create table resolve_calls(q text);
-- verbatim LIVE fn_raziel_extract_subject (pre-Phase-F)
create function public.fn_raziel_extract_subject(p_question text, p_intent text)
returns text
language plpgsql
immutable
set search_path to 'public'
as $function$
declare
  v text; w text; parts text[] := '{}'; nwords int;
  stop text[] := array['מה','הערך','ערך','של','בגימטריה','גימטריה','הגימטריה','כמה','שווה','שוה','חישוב',
                       'תמצא','מצא','למצוא','דילוגים','דילוג','דילוגי','אותיות','בתורה','בצופן','בדוק','חפש',
                       -- מילות-קישור/הצבעה שאינן חלק מהנושא (תיקון «זה חיים»):
                       'זה','זו','זהו','הזה','הזו','הזאת','הם','הן','הוא','היא','מהו','מהי','את','הערכים'];
begin
  if coalesce(p_question,'')='' then return null; end if;
  v := regexp_replace(p_question, '[?!.,:;״''\"]+', ' ', 'g');
  v := btrim(regexp_replace(v, '\s+', ' ', 'g'));
  foreach w in array regexp_split_to_array(v, '\s+') loop
    if w <> '' and not (w = any(stop)) then parts := parts || w; end if;
  end loop;
  v := btrim(array_to_string(parts,' '));
  nwords := coalesce(array_length(parts,1),0);
  if v = '' or nwords = 0 or nwords > 4 or length(v) > 30 then return null; end if;
  return v;
end $function$;
create function fn_raziel_resolve(p_message text, p_entitlement text default 'public', p_context_type text default 'public_user') returns jsonb
language plpgsql as $f$ declare s text := fn_raziel_extract_subject(p_message,'gematria'); begin
  insert into resolve_calls values (p_message);
  return jsonb_build_object('has_subject', s is not null, 'subject', s, 'value', 453, 'source_of_truth','stub',
    'pack', jsonb_build_object('stages', jsonb_build_object('methods', jsonb_build_object('evidence', jsonb_build_object('רגיל',453)))),
    'cost', jsonb_build_object('db_calls',1)); end $f$;
create table proto_calls(intent text, subject text);
create table proto_mode(intent text primary key, mode text);   -- ok | fail | empty
create function fn_raziel_protocol(p_subject text, p_intent text, p_context_type text, p_user_ref text, p_opts jsonb default '{}') returns jsonb
language plpgsql as $f$ declare m text := coalesce((select mode from proto_mode where intent=p_intent),'ok'); k text := case p_intent when 'gematria' then 'gematria_pack' else 'els' end; begin
  insert into proto_calls values (p_intent, p_subject);
  if p_intent = 'tanakh_source' then
    declare r jsonb := fn_ev_sources(p_subject); sot text := (select source_of_truth from raziel_protocol_agents where intent='tanakh_source' and enabled);
    begin
      if m = 'fail' then   -- the real _raziel_run_specialists traps fn errors: ok=false, error set, no finding
        return jsonb_build_object('plan', jsonb_build_object('no_match', false), 'findings','{}'::jsonb, 'provenance','{}'::jsonb,
          'agents', jsonb_build_array(jsonb_build_object('agent_id','sources','stage','sources','fn','fn_ev_sources','output_key','sources','seq',1,'ran',true,'ok',false,'ms',1,'error','boom','empty',true)),
          'cost', jsonb_build_object('db_calls',0));
      end if;
      return jsonb_build_object('plan', jsonb_build_object('no_match', false),
        'agents', jsonb_build_array(jsonb_build_object('agent_id','sources','stage','sources','fn','fn_ev_sources','output_key','sources','seq',1,'ran',true,'ok',true,'ms',1,'empty',false)),
        'provenance', jsonb_build_object('sources', jsonb_build_object('source_of_truth', sot)),
        'cost', jsonb_build_object('db_calls',1), 'findings', jsonb_build_object('sources', r));
    end;
  end if;
  if m = 'fail' then raise exception 'boom %', p_intent; end if;
  return jsonb_build_object('plan', jsonb_build_object('no_match', false),
    'agents', jsonb_build_array(jsonb_build_object('agent_id',p_intent,'stage','s','fn','fn_'||p_intent,'output_key',k,'seq',1,'ran',true,'ok',true,'ms',3,'empty', m='empty')),
    'provenance', jsonb_build_object(k, jsonb_build_object('source_of_truth','sot-'||p_intent)),
    'cost', jsonb_build_object('db_calls',1),
    'findings', case when m='empty' then '{}'::jsonb when p_intent='gematria'
        then jsonb_build_object('gematria_pack', jsonb_build_object('value',358,'pack','p','stages',jsonb_build_object('methods',jsonb_build_object('evidence',jsonb_build_object('רגיל',358)))))
        else jsonb_build_object('els', jsonb_build_object('term',p_subject,'els_count',292,'min_skip',2,'hits',(select jsonb_agg(jsonb_build_object('skip',i)) from generate_series(1,40) i))) end);
end $f$;

create table tanach_verses(book_idx int, book text, chapter int, verse int, text text, words text[]);
insert into tanach_verses values
 (1,'בראשית',1,1,'בראשית ברא',array['בראשית','ברא']),
 (10,'ישעיהו',9,5,'משיח בן דוד כאן',array['משיח','בן','דוד','כאן']),
 (19,'תהלים',2,2,'על יהוה ועל משיחו',array['על','יהוה','ועל','משיחו']),
 (19,'תהלים',18,51,'ולמשיחו לדוד',array['ולמשיחו','לדוד']),
 (9,'שמואל א',16,6,'אך נגד יהוה משיח',array['אך','נגד','יהוה','משיח']);
create function fn_name_in_tanach(p_name text) returns jsonb language sql stable as $$
  with hits as (select book_idx, book, chapter, verse, text from tanach_verses where words @> array[p_name]),
  o as (select *, row_number() over (order by book_idx,chapter,verse) rn, count(*) over () tot from hits)
  select jsonb_build_object('name', p_name,'count', (select count(*) from hits),
    'books', (select coalesce(jsonb_agg(jsonb_build_object('book',book,'n',n) order by bi),'[]'::jsonb) from (select book, count(*) n, min(book_idx) bi from hits group by book) b),
    'first', (select jsonb_build_object('ref',book||' '||chapter||':'||verse,'text',text) from o where rn=1),
    'last',  (select jsonb_build_object('ref',book||' '||chapter||':'||verse,'text',text) from o where rn=tot),
    'samples', (select coalesce(jsonb_agg(jsonb_build_object('ref',book||' '||chapter||':'||verse,'text',text)),'[]'::jsonb) from (select * from o where rn<=5) s)); $$;
create function fn_ev_sources(p_name text) returns jsonb language sql stable as $$
  select jsonb_build_object('method_id','sources','version',1,'source_of_truth','tanach_verses (fn_name_in_tanach)','name',p_name,
    'found', coalesce(jsonb_array_length(r->'books'),0) > 0, 'evidence', r) from (select fn_name_in_tanach(p_name) r) s; $$;

\i supabase/migrations/20261005050000_raziel_route_token_boundary_match_v1.sql
\i supabase/migrations/20261005130000_raziel_intelligence_core_v1_phase_a_plan_first.sql
\i supabase/migrations/20261005140000_raziel_intelligence_core_v1_phase_c_operator_read.sql
\i supabase/migrations/20261005150000_raziel_intelligence_core_v1_phase_d2_plan_signals.sql
\i supabase/migrations/20261005160000_raziel_intelligence_core_v1_phase_e_l4_tool_research.sql

\i supabase/migrations/20261005170000_raziel_intelligence_core_v1_phase_f_sandalphon_source.sql
create table f_plan_snapshot as select q, fn_raziel_plan(q,'public_user',null) p from (values ('איפה מופיע משיח בתנ״ך?'),('מקור של משיח'),('מה הערך של משיח בגימטריה?'),('דילוגים של משיח'),('מה דעתך על הבוקר היפה?')) a(q);
\i supabase/migrations/20261005180000_raziel_intelligence_core_v1_phase_g_source_l4_combination.sql
-- idempotent re-apply (the migration inserts nothing; registry must stay single-row)
\i supabase/migrations/20261005180000_raziel_intelligence_core_v1_phase_g_source_l4_combination.sql

create table g_plan_snapshot as select q, fn_raziel_plan(q,'public_user',null) p from (values ('איפה מופיע משיח בתנ״ך?'),('בדוק את משיח בגימטריה ובתנך'),('מה הערך של משיח בגימטריה?'),('דילוגים של משיח'),('מה דעתך על הבוקר היפה?'),('כמה אנשים נכנסו לאתר היום?'),('איפה בתנך מופיע 631')) a(q);
\i supabase/migrations/20261005190000_raziel_intelligence_core_v1_phase_h_reality_number_context.sql
\i supabase/migrations/20261005190000_raziel_intelligence_core_v1_phase_h_reality_number_context.sql
\i supabase/migrations/20261005200000_raziel_intelligence_core_v1_phase_k_operator_coordination_read.sql
\i supabase/migrations/20261005200000_raziel_intelligence_core_v1_phase_k_operator_coordination_read.sql
create table op_calls(n int);   -- the plan layer must never execute any operator RPC itself
create function pg_temp.ans(q text, c text default 'public_user') returns jsonb language sql as $$ select fn_raziel_answer(q, c, null, null) $$;
do $$ declare r jsonb; p jsonb; q text; begin
  -- 1. Number: exact gematria, deterministic, zero model, zero tools beyond the single resolver
  truncate resolve_calls; truncate proto_calls;
  q := 'כמה זה משיח?'; p := fn_raziel_plan(q,'public_user',null); r := pg_temp.ans(q);
  assert p->>'capability_class' = 'gematria_expression' and p->>'minimum_intelligence' = 'L0_DETERMINISTIC' and p->>'strategy' = 'deterministic_engine', 'M1 plan '||left(p::text,300);
  assert r->>'mode' = 'deterministic' and not (r->>'needs_synthesis')::boolean and (r->'cost'->>'llm_calls')::int = 0 and not (r->'cost'->>'used_llm')::boolean
     and (r->'cost'->>'tokens')::int = 0 and (select count(*) from resolve_calls) = 1 and (select count(*) from proto_calls) = 0, 'M1 answer '||left(r::text,300);

  -- 2. Number context: number_map + dossier deterministic descriptor (execution is Edge-side), zero DB tools here
  truncate proto_calls; q := 'איפה עוד 631 מופיע?'; p := fn_raziel_plan(q,'public_user',null); r := pg_temp.ans(q);
  assert p->>'capability_class' = 'reality_number_context' and p->>'minimum_intelligence' = 'L0_DETERMINISTIC' and p->'number_context'->>'anchor' = 'explicit'
     and (p->'number_context'->>'number')::int = 631 and p->'number_context'->>'mode' = 'deterministic', 'M2 plan '||left(p::text,300);
  assert r->>'mode' = 'number_context' and not (r->>'needs_synthesis')::boolean and (select count(*) from proto_calls) = 0, 'M2 answer';

  -- 3. Combined: gematria + ELS + Sandalphon exactly once each, in order, then L3 synthesis target
  truncate proto_calls; q := 'בדוק את משיח בגימטריה בדילוגים ובתנך'; p := fn_raziel_plan(q,'public_user',null); r := pg_temp.ans(q);
  assert p->>'minimum_intelligence' = 'L4_TOOL_RESEARCH' and p->>'synthesis_target' = 'L3_DEEP' and p->>'route_intent' = 'multi_domain'
     and p->'domains' = '["gematria_engine","els_cipher","sandalphon"]'::jsonb, 'M3 plan '||left(p::text,400);
  assert r->>'mode' = 'tool_research' and (r->>'needs_synthesis')::boolean, 'M3 answer mode';
  assert (select array_agg(intent order by ctid) from proto_calls) = array['gematria','els','tanakh_source'] and (select count(*) from proto_calls) = 3
     and (select count(distinct intent) from proto_calls) = 3, 'M3 tool order/count once each';
  assert r->'tool_research'->'tool_status' = '{"gematria":"ok","els":"ok","tanakh_source":"ok"}'::jsonb, 'M3 tool_status '||left((r->'tool_research')::text,300);

  -- 4-8. Post / Topic / World / Journey / ELS-occurrence / Heichal: no plan-side tool, no capability invented, L2 synthesis; context rides Edge-side surface_semantic
  truncate proto_calls; truncate resolve_calls;
  foreach q in array array['תסביר לי את מה שאני קורא','מה מעניין בציר הזה?','מה כדאי לבדוק מכאן?','איפה אני במסע ומה אפשר לבדוק עכשיו?','תסביר לי את המופע הזה','מה אפשר לחקור כאן?'] loop
    p := fn_raziel_plan(q,'public_user',null); r := pg_temp.ans(q);
    assert p->>'capability_class' = 'general_synthesis' and p->>'minimum_intelligence' = 'L2_FAST' and p->'domains' = '[]'::jsonb and p->'number_context' = 'null'::jsonb
       and not (p->'execution_plan'->>'will_execute')::boolean, 'M surface plan '||q||' '||left(p::text,300);
    assert coalesce((r->>'needs_synthesis')::boolean,false) and r->>'mode' = 'fallback' and not (r->'cost'->>'used_llm')::boolean, 'M surface answer '||q||' '||r::text;
  end loop;
  assert (select count(*) from proto_calls) = 0 and (select count(*) from resolve_calls) = 0, 'surface questions run no tool/resolver (no global search)';

  -- 9-10. Admin: coordination + deployment are operator_read descriptors (L0), executed Edge-side with the caller JWT; plan layer executes nothing
  q := 'על מה עובדים עכשיו?'; p := fn_raziel_plan(q,'admin',null); r := pg_temp.ans(q,'admin');
  assert p->>'capability_class' = 'operator_coordination' and p->>'availability' = 'operator_read' and p->>'minimum_intelligence' = 'L0_DETERMINISTIC'
     and p->'trace'->'operator'->>'capability' = 'work_now' and r->'trace'->'operator'->>'owner' = 'inter_agent_coordination_law v13' and (r->'trace'->'operator'->>'read_only')::boolean, 'M9 '||left(r::text,300);
  q := 'מה מצב הפריסה?'; p := fn_raziel_plan(q,'admin',null); r := pg_temp.ans(q,'admin');
  assert p->>'capability_class' = 'operator_coordination' and p->'trace'->'operator'->>'capability' = 'live_external_state' and p->>'minimum_intelligence' = 'L0_DETERMINISTIC'
     and r->'trace'->'operator'->>'owner' = 'live_state_resolution_law v2', 'M10 '||left(r::text,300);

  -- 11. Non-admin (public + authenticated + whatsapp): same questions ⇒ ordinary synthesis, no operator descriptor at all
  foreach q in array array['על מה עובדים עכשיו?','מה מצב הפריסה?'] loop
    foreach p in array array[fn_raziel_plan(q,'public_user',null), fn_raziel_plan(q,'authenticated_user','u'), fn_raziel_plan(q,'whatsapp_user','u')] loop
      assert p->>'availability' <> 'operator_read' and coalesce(p->'trace'->'operator','null'::jsonb) = 'null'::jsonb and p->>'capability_class' = 'general_synthesis' and p->>'minimum_intelligence' = 'L2_FAST', 'M11 non-admin '||q||' '||left(p::text,300);
    end loop;
  end loop;

  -- 12. Global routing flag stays off: nothing in the lineage touched the flag
  assert not exists (select 1 from pg_proc where proname = 'fn_raziel_model'), 'no fn_raziel_model introduced by the lineage';
end $$;
select 'raziel_phase_m_cross_surface_golden_v1: PASS';
