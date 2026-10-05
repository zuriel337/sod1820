-- Throwaway-Postgres regression for RAZIEL_INTELLIGENCE_CORE_V1_PHASE_H (reality_number_context) (builds on Phase A-G) (never run against a live project).
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

create table g_plan_snapshot as select q, fn_raziel_plan(q,'public_user',null) p from (values ('איפה מופיע משיח בתנ״ך?'),('בדוק את משיח בגימטריה ובתנך'),('מה הערך של משיח בגימטריה?'),('דילוגים של משיח'),('מה דעתך על הבוקר היפה?'),('כמה אנשים נכנסו לאתר היום?'),('איפה בתנך מופיע 631')) a(q);
\i supabase/migrations/20261005190000_raziel_intelligence_core_v1_phase_h_reality_number_context.sql
\i supabase/migrations/20261005190000_raziel_intelligence_core_v1_phase_h_reality_number_context.sql

create function pg_temp.ans(q text, c text default 'public_user') returns jsonb language sql as $$ select fn_raziel_answer(q, c, null, null) $$;
do $$ declare r jsonb; p jsonb; q text; n int; begin
  -- A-G plans unchanged outside Phase H (only the null number_context key added)
  assert not exists (select 1 from g_plan_snapshot s where (s.p - 'generated_at') is distinct from (((fn_raziel_plan(s.q,'public_user',null)) - 'generated_at' - 'number_context') #- '{trace,number_context}')), 'A-G plans identical';
  assert not exists (select 1 from g_plan_snapshot s where (fn_raziel_plan(s.q,'public_user',null))->'number_context' <> 'null'::jsonb), 'no number_context outside the grammar';

  -- GOLDEN 1: explicit 631 forms (deterministic listing/context)
  foreach q in array array['איפה עוד 631 מופיע?','איפה עוד המספר 631 מופיע באתר?','מה מחובר ל-631 באתר?','מה מחובר ל631?','איזה פוסטים או טופיקים קשורים ל-631?','מה יש סביב המספר 631?','היכן עוד 631 נמצא','איפה 631 מופיע עוד'] loop
    truncate proto_calls;
    p := fn_raziel_plan(q,'public_user',null);
    assert p->>'capability_class' = 'reality_number_context' and p->>'availability' = 'number_context' and p->>'strategy' = 'number_context_deterministic'
       and p->>'minimum_intelligence' = 'L0_DETERMINISTIC' and p->'synthesis_target' = 'null'::jsonb
       and p->'number_context'->>'anchor' = 'explicit' and (p->'number_context'->>'number')::int = 631 and p->'number_context'->>'mode' = 'deterministic'
       and p->'candidate' = 'null'::jsonb and p->'domains' = '[]'::jsonb and not (p->'execution_plan'->>'will_execute')::boolean, 'plan: '||q||' '||left(p::text,500);
    r := pg_temp.ans(q);
    assert r->>'mode' = 'number_context' and r->>'intent' = 'number_context' and not (r->>'needs_synthesis')::boolean and (r->'number_context'->>'number')::int = 631
       and (select count(*) from proto_calls) = 0 and (r->'cost'->>'tool_calls')::int = 0, 'answer descriptor, zero DB tools: '||q||' '||left(r::text,300);
  end loop;
  -- synthesis forms -> L2_FAST
  foreach q in array array['מה המשמעות של החיבורים של 631 באתר?','מה מעניין ב-631?','איך 631 מתחבר באתר?','איך זה מתחבר ל-631?'] loop
    p := fn_raziel_plan(q,'public_user',null);
    assert p->>'strategy' = 'number_context_synthesis' and p->>'minimum_intelligence' = 'L2_FAST' and (p->'number_context'->>'number')::int = 631 and p->'number_context'->>'mode' = 'synthesis', 'synth plan: '||q||' '||left(p::text,300);
    assert (pg_temp.ans(q)->>'needs_synthesis')::boolean, 'synth answer needs synthesis: '||q;
  end loop;

  -- GOLDEN 2: pronoun forms -> surface_root descriptor, number NULL (ai-analyze resolves from bounded surface_semantic only)
  foreach q in array array['איפה עוד זה מופיע?','מה מחובר לזה באתר?','איפה עוד המספר הזה מופיע?','מה מחובר למספר הזה?','איזה פוסטים קשורים לזה?'] loop
    p := fn_raziel_plan(q,'public_user',null);
    assert p->'number_context'->>'anchor' = 'surface_root' and p->'number_context'->'number' = 'null'::jsonb and p->>'capability_class' = 'reality_number_context', 'pronoun plan: '||q||' '||left(p::text,400);
  end loop;

  -- GOLDEN 3: unrelated numerals / years / dates / out-of-range / two numerals are NOT number anchors
  foreach q in array array['מה קרה ב-2026 באתר?','כמה אנשים נכנסו היום 631','איפה מופיע משיח בתנ״ך 631','איפה עוד 631 ו-358 מופיע?','איפה עוד 1234567 מופיע?','איפה עוד 0 מופיע?','תכתוב לי שיר על 631','מה הערך של 631 בגימטריה','איפה אני יכול לקרוא על 631','איפה עוד הבית של 631 מופיע?','בדוק את משיח בגימטריה ובתנך','דילוגים של משיח'] loop
    p := fn_raziel_plan(q,'public_user',null);
    assert p->'number_context' = 'null'::jsonb and p->>'capability_class' <> 'reality_number_context', 'not number_context: '||q||' '||left(p::text,300);
    r := pg_temp.ans(q);
    assert r->>'mode' <> 'number_context', 'answer not number_context: '||q;
  end loop;
  -- grammar clearly asks → year-like decimal IS accepted (explicit decimal, no inference)
  assert (fn_raziel_plan('איפה עוד 2026 מופיע?','public_user',null)->'number_context'->>'number')::int = 2026, 'explicit year-like decimal in the grammar is still just a decimal';

  -- GOLDEN 4: combined gematria + reality — dependency executes first, one clean subject, only the verified value becomes the anchor
  foreach q in array array['מה הערך של משיח בגימטריה ואיפה עוד הוא מופיע באתר?','בדוק את משיח בגימטריה ואיפה עוד המספר הזה מופיע','מה הערך של משיח בגימטריה ומה מחובר אליו באתר?'] loop
    truncate proto_calls;
    p := fn_raziel_plan(q,'public_user',null);
    assert p->>'capability_class' = 'reality_number_context' and p->>'minimum_intelligence' = 'L4_TOOL_RESEARCH' and p->>'synthesis_target' = 'L3_DEEP'
       and p->'number_context'->>'anchor' = 'gematria_dependency' and p->'domains' = '["gematria_engine"]'::jsonb and (select count(*) from proto_calls) = 0, 'combined plan: '||q||' '||left(p::text,500);
    r := pg_temp.ans(q);
    assert r->>'mode' = 'tool_research' and (r->>'needs_synthesis')::boolean and r->>'subject' = 'משיח'
       and (select count(*) from proto_calls) = 1 and (select intent from proto_calls) = 'gematria' and (select subject from proto_calls) = 'משיח'
       and (r->'number_context'->>'number')::int = 358 and r->'number_context'->'dependency'->>'from' = 'gematria' and (r->'number_context'->'dependency'->>'verified')::boolean
       and r->'tool_research'->'tool_status' = '{"gematria":"ok"}'::jsonb and r->'tool_research'->>'contract' = 'tool_research_v1', 'combined answer: '||q||' '||left(r::text,500);
  end loop;
  -- dependency failure/empty -> no reality leg, no fabricated anchor
  insert into proto_mode values ('gematria','fail');
  r := pg_temp.ans('מה הערך של משיח בגימטריה ואיפה עוד הוא מופיע באתר?');
  assert r->>'mode' = 'fallback' and r->'number_context' is null and r->'tool_availability'->'not_executed' = '["reality_number_context"]'::jsonb, 'dependency fail: '||left(r::text,300);
  update proto_mode set mode='empty' where intent='gematria';
  r := pg_temp.ans('מה הערך של משיח בגימטריה ואיפה עוד הוא מופיע באתר?');
  assert r->>'mode' = 'fallback' and r->'number_context' is null, 'dependency empty: '||left(r::text,300);
  delete from proto_mode;
  -- multiword/ambiguous gematria subject -> clarification, zero tools
  truncate proto_calls;
  r := pg_temp.ans('מה הערך של משיח בן דוד אלוהי ישראל בגימטריה ואיפה עוד הוא מופיע באתר?');
  assert r->>'mode' = 'needs_clarification' and (select count(*) from proto_calls) = 0, 'unclear subject zero tools: '||left(r::text,300);

  -- admin plan unaffected; operator read still wins for its own grammar; flag gate
  assert fn_raziel_plan('כמה אנשים נכנסו לאתר היום?','admin',null)->>'availability' = 'operator_read', 'operator preserved';
  update raziel_execution_flags set enabled=false where id=1;
  assert pg_temp.ans('איפה עוד 631 מופיע?')->>'mode' = 'disabled', 'flag gate';
end $$;
select 'raziel_phase_h_reality_number_context_v1: PASS';
