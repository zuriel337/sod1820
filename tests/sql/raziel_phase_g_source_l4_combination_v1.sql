-- Throwaway-Postgres regression for RAZIEL_INTELLIGENCE_CORE_V1_PHASE_G (source + gematria/ELS L4 combination) (builds on Phase A-F) (never run against a live project).
-- Stubs mirror the live registry rows (agent_identity keywords, raziel_protocol_agents). fn_raziel_resolve is a counting
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

create function pg_temp.ans(q text, c text default 'public_user') returns jsonb language sql as $$ select fn_raziel_answer(q, c, null, null) $$;
create function pg_temp.calls() returns text language sql as $$ select coalesce(string_agg(intent||':'||subject, ',' order by intent desc),'') from proto_calls $$;
do $$ declare r jsonb; p jsonb; q text; want text[]; w text; begin
  assert (select count(*) from raziel_protocol_agents where intent='tanakh_source') = 1 and (select count(*) from raziel_protocol_allowed_fns where fn_name='fn_ev_sources') = 1, 'F registry idempotent';
  assert (select count(*) from unnest((select match_keywords from agent_identity where agent_id='sandalphon')) k where k like 'בתנ%') = 2, 'F keywords idempotent';
  -- A-F plans unchanged (G block not entered / no L4 label outside the supported multi-tool set)
  assert not exists (select 1 from f_plan_snapshot s where ((s.p - 'generated_at') #- '{trace,synthesis_target}') is distinct from (((fn_raziel_plan(s.q,'public_user',null)) - 'generated_at' - 'synthesis_target') #- '{trace,synthesis_target}')
     or (fn_raziel_plan(s.q,'public_user',null))->'synthesis_target' <> 'null'::jsonb), 'A-F plans identical outside G (only the null synthesis_target key added)';

  -- GOLDEN: (question, expected capability set). One execution each, one clean subject, no duplicates, no gematria resolver.
  foreach q in array array[
    'בדוק את משיח בגימטריה ובתנך','בדוק את משיח בגימטריה ובתנ״ך','בדוק את משיח ובגימטריה ובתנך',
    'בדוק את משיח בדילוגים ובתנך','בדוק את משיח ובדילוגים ובתנ״ך','בדוק את משיח בתנך ובדילוגים',
    'בדוק את משיח בגימטריה בדילוגים ובתנך','בדוק את משיח בגימטריה ובדילוגים ובתנך','בדוק את משיח ובגימטריה ובדילוגים ובתנ״ך'] loop
    want := array(select c from (values ('gematria',q ~ 'גימטריה'),('els',q ~ 'דילוגים'),('tanakh_source',true)) t(c,b) where b);
    truncate proto_calls; truncate resolve_calls;
    p := fn_raziel_plan(q,'public_user',null);
    assert p->>'availability' = 'multi_domain_synthesis' and p->>'minimum_intelligence' = 'L4_TOOL_RESEARCH' and p->>'synthesis_target' = 'L3_DEEP'
       and (select array_agg(c order by c) from jsonb_array_elements_text(p->'capabilities') c) = (select array_agg(c order by c) from unnest(want) c)
       and jsonb_array_length(p->'domains') = array_length(want,1) and not (p->'execution_plan'->>'will_execute')::boolean, 'plan: '||q||' '||left(p::text,500);
    assert (select count(*) from proto_calls) = 0, 'plan runs nothing';
    r := pg_temp.ans(q);
    assert r->>'mode' = 'tool_research' and r->>'status' = 'complete' and (r->>'needs_synthesis')::boolean and r->>'subject' = 'משיח', 'mode/subject: '||q||' '||left(r::text,400);
    assert (select count(*) from proto_calls) = array_length(want,1) and (select count(distinct intent) from proto_calls) = array_length(want,1)
       and (select count(*) from proto_calls where subject = 'משיח') = array_length(want,1), 'one execution each, same subject: '||q||' '||pg_temp.calls();
    assert (select count(*) from resolve_calls) = 0, 'resolver not reached';
    foreach w in array want loop
      assert exists (select 1 from proto_calls where intent = w), 'executed '||w||' '||q;
    end loop;
    assert jsonb_array_length(r->'specialists') = array_length(want,1) and r->'tool_research'->'specialists' = r->'specialists'
       and (r->'trace'->>'tools_executed')::int = array_length(want,1), 'specialists/trace';
    assert r->'findings_by_capability' ?& want and r->'evidence_by_capability' ?& want
       and (select count(*) from jsonb_object_keys(r->'findings_by_capability')) = array_length(want,1), 'findings/evidence per capability';
    assert r->'findings_by_capability'->'tanakh_source'->>'count' = '2' and (r->'findings_by_capability'->'tanakh_source'->>'found')::boolean
       and r->'findings_by_capability'->'tanakh_source'->>'match' = 'exact_whole_token'
       and r->'findings_by_capability'->'tanakh_source'->'first'->>'ref' = 'שמואל א 16:6', 'source finding bounded: '||left(r::text,300);
    assert r->'evidence_by_capability'->'tanakh_source'->'sources'->>'source_of_truth' like 'public.tanach_verses via fn_ev_sources%', 'source provenance kept: '||left((r->'evidence_by_capability'->'tanakh_source')::text,200);
    assert not (r->'findings_by_capability'->'tanakh_source' ? 'gematria_pack') and not (r->'evidence_by_capability' ? 'merged'), 'unmerged';
    assert r->'trace'->>'selected_semantic_level' = 'L4_TOOL_RESEARCH' and r->'trace'->>'synthesis_intelligence' = 'L3_DEEP'
       and r->'cross_checks'->>'performed' = 'false' and r->'cross_checks'->>'reason' like '%הסכמה%אינה עובדה%', 'levels + no invented cross-check';
    assert (r->'cost'->>'llm_calls')::int = 0 and (r->'cost'->>'tool_calls')::int = array_length(want,1), 'zero model in DB path';
  end loop;

  -- negative source result is truthful, evidence-labelled, still complete
  truncate proto_calls;
  r := pg_temp.ans('בדוק את זבולון בגימטריה ובתנך');
  assert r->>'mode' = 'tool_research' and r->>'status' = 'complete' and r->'findings_by_capability'->'tanakh_source'->>'count' = '0'
     and not (r->'findings_by_capability'->'tanakh_source'->>'found')::boolean and r->'findings_by_capability'->'tanakh_source'->>'negative_result_note' like '%אין זו הוכחה%', 'negative: '||left(r::text,400);
  -- partial: source fails -> explicit, not fabricated; gematria finding kept
  insert into proto_mode values ('tanakh_source','fail');
  truncate proto_calls;
  r := pg_temp.ans('בדוק את משיח בגימטריה ובתנך');
  assert r->>'status' = 'partial' and r->'tool_research'->'tool_status' = '{"gematria":"ok","tanakh_source":"failed"}'::jsonb
     and not (r->'findings_by_capability' ? 'tanakh_source') and (r->'findings_by_capability' ? 'gematria'), 'source failure explicit: '||left(r::text,300);
  delete from proto_mode;

  -- fail closed: multiword common subject with a source leg -> clarification BEFORE any tool; source leg not silently dropped
  foreach q in array array['בדוק את משיח בן דוד בגימטריה ובתנך','בדוק את משיח בן דוד בדילוגים ובתנך','בדוק את משיח בן דוד בגימטריה בדילוגים ובתנך'] loop
    truncate proto_calls;
    r := pg_temp.ans(q);
    -- either the explicit source-leg gate (multiword_phrase + not_executed) or the earlier no-clean-subject gate (extractor >4 words): both zero tools
    assert r->>'mode' = 'needs_clarification' and (select count(*) from proto_calls) = 0 and r->'tool_availability'->'executed' = '[]'::jsonb
       and r->'findings_by_capability' is null and r->>'answer' is null
       and (r->>'unsupported' is null or (r->>'unsupported' = 'multiword_phrase' and r->'tool_availability'->'not_executed' = '["tanakh_source"]'::jsonb)), 'multiword fail-closed: '||q||' '||left(r::text,300);
  end loop;
  -- the explicit source-leg gate itself (3-word subject, source leg named)
  truncate proto_calls;
  r := pg_temp.ans('בדוק את משיח בן דוד בתנך');
  assert r->>'mode' = 'needs_clarification' and r->>'unsupported' = 'multiword_phrase' and (select count(*) from proto_calls) = 0, 'single-source multiword (F): '||left(r::text,200);
  truncate proto_calls;
  r := pg_temp.ans('בדוק את משיח בן דוד בגימטריה ובתנך');
  assert r->>'unsupported' = 'multiword_phrase' and r->'tool_availability'->'not_executed' = '["tanakh_source"]'::jsonb and (select count(*) from proto_calls) = 0, 'source-leg gate: '||left(r::text,300);
  -- non-clear subject -> zero tools
  foreach q in array array['בדוק בגימטריה ובתנך','בדוק משיח ואברהם בגימטריה ובתנך','בדוק את משיח לעומת אברהם בגימטריה ובתנך'] loop
    truncate proto_calls;
    r := pg_temp.ans(q);
    assert r->>'mode' <> 'tool_research' and (select count(*) from proto_calls) = 0 and r->'findings_by_capability' is null, 'non-clear subject zero tools: '||q||' '||left(r::text,200);
  end loop;
  -- unavailable capability: Sandalphon inactive -> no source claim, no source tool
  update agent_identity set active=false where agent_id='sandalphon';
  truncate proto_calls;
  r := pg_temp.ans('בדוק את משיח בגימטריה ובתנך');
  assert (select count(*) from proto_calls where intent='tanakh_source') = 0 and coalesce(r->'findings_by_capability'->'tanakh_source','null'::jsonb) = 'null'::jsonb
     and r->>'mode' <> 'tool_research', 'inactive sandalphon: '||left(r::text,300);
  update agent_identity set active=true where agent_id='sandalphon';
  -- admin-only partner never auto-run; unrelated capability never combined
  truncate proto_calls;
  r := pg_temp.ans('בדוק את משיח בתנך וגם מה לחקור','admin');
  assert r->>'mode' <> 'tool_research' and (select count(*) from proto_calls) = 0, 'research_intel never combined: '||left(r::text,300);

  -- A-F behaviour preserved
  truncate proto_calls;
  r := pg_temp.ans('בדוק גימטריה ודילוגים של משיח'); assert r->>'mode' = 'tool_research' and (select count(*) from proto_calls) = 2 and r->'tool_research'->'tool_status' = '{"gematria":"ok","els":"ok"}'::jsonb and not (r->'findings_by_capability' ? 'tanakh_source'), 'phase E preserved';
  assert fn_raziel_plan('בדוק גימטריה ודילוגים של משיח','public_user',null)->>'minimum_intelligence' = 'L4_TOOL_RESEARCH', 'E plan now labelled L4 (metadata only)';
  r := pg_temp.ans('איפה מופיע משיח בתנ״ך?'); assert r->>'mode' = 'deterministic' and r->>'intent' = 'tanakh_source', 'F single source preserved';
  r := pg_temp.ans('איפה מופיע משיח בן דוד בתנ״ך?'); assert r->>'mode' = 'needs_clarification' and r->>'unsupported' = 'multiword_phrase', 'F multiword preserved';
  r := pg_temp.ans('דילוגים של משיח'); assert r->>'mode' = 'deterministic' and r->>'intent' = 'els', 'els single';
  r := pg_temp.ans('גימטריה של משיח'); assert r->>'mode' = 'deterministic' and r->>'intent' = 'gematria', 'gematria single';
  update raziel_execution_flags set enabled=false where id=1;
  assert pg_temp.ans('בדוק את משיח בגימטריה ובתנך')->>'mode' = 'disabled', 'flag gate';
end $$;
select 'raziel_phase_g_source_l4_combination_v1: PASS';
