-- Throwaway-Postgres regression for RAZIEL_INTELLIGENCE_CORE_V1_PHASE_F (Sandalphon tanakh_source) (builds on Phase A-E) (never run against a live project).
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

-- BEFORE Phase F: baseline extractor outputs (to prove gematria/ELS extraction is unchanged) and the route-token proof
create table base_ext as select q, i, fn_raziel_extract_subject(q,i) s from (values
 ('מה הערך של משיח בגימטריה?'),('כמה זה חיים'),('דילוגים של משיח בתורה'),('בדוק גימטריה של אברהם אבינו'),('איפה מופיע משיח בתנ״ך?'),('מקור של משיח'),('נתח את המספר 26')) a(q),
 (values ('gematria'),('els'),('xyz'),(null)) b(i);
create function pg_temp.route_has_sandalphon(q text) returns boolean language sql as $$ select fn_raziel_route(q)->'expert_selected' @> '[{"expert":"sandalphon"}]'::jsonb $$;
do $$ begin
  assert not pg_temp.route_has_sandalphon('איפה מופיע משיח בתנ״ך?'), 'proof: live keywords do not route «בתנ״ך»';
  assert pg_temp.route_has_sandalphon('באיזה ספר מופיע משיח?') and pg_temp.route_has_sandalphon('מקור של משיח'), 'ספר/מקור route already';
end $$;

\i supabase/migrations/20261005170000_raziel_intelligence_core_v1_phase_f_sandalphon_source.sql
-- idempotent re-apply
\i supabase/migrations/20261005170000_raziel_intelligence_core_v1_phase_f_sandalphon_source.sql

create function pg_temp.ans(q text, c text default 'public_user') returns jsonb language sql as $$ select fn_raziel_answer(q, c, null, null) $$;
do $$ declare r jsonb; p jsonb; q text; begin
  -- registry
  assert (select count(*) from raziel_protocol_agents where intent='tanakh_source') = 1, 'single registry row';
  assert (select count(*) from raziel_protocol_allowed_fns where fn_name='fn_ev_sources') = 1, 'single allowlist row';
  assert (select count(*) from unnest((select match_keywords from agent_identity where agent_id='sandalphon')) k where k like 'בתנ%') = 2, 'keywords idempotent';
  assert (select deterministic and token_cost=0 and result_mode='scalar' and fn_name='fn_ev_sources' and source_of_truth like 'public.tanach_verses%' from raziel_protocol_agents where intent='tanakh_source'), 'registry row shape';
  -- extractor: gematria/ELS/other intents byte-identical to pre-Phase-F
  assert not exists (select 1 from base_ext b where b.s is distinct from fn_raziel_extract_subject(b.q, b.i) and b.i is distinct from 'tanakh_source'), 'extractor unchanged outside tanakh_source';
  assert fn_raziel_extract_subject('איפה מופיע משיח בתנ״ך?','tanakh_source') = 'משיח', 'extract 1';
  assert fn_raziel_extract_subject('באיזה ספר מופיע משיח?','tanakh_source') = 'משיח', 'extract 2';
  assert fn_raziel_extract_subject('מקור של משיח','tanakh_source') = 'משיח', 'extract 3';
  assert fn_raziel_extract_subject('איפה מופיע משיח?','gematria') = 'איפה מופיע משיח', 'gematria extraction keeps source words';
  -- Golden: plan = Sandalphon / tanakh_source / L0 / zero model; execution zero model, with provenance
  foreach q in array array['איפה מופיע משיח בתנ״ך?','באיזה ספר מופיע משיח?','מקור של משיח'] loop
    truncate proto_calls; truncate resolve_calls;
    p := fn_raziel_plan(q,'public_user',null);
    assert p->>'capability_class' = 'tanakh_source' and p->>'strategy' = 'deterministic_engine' and p->>'minimum_intelligence' = 'L0_DETERMINISTIC'
       and p->>'availability' = 'available' and p->'candidate'->>'expert' = 'sandalphon' and p->'protocol'->>'intent' = 'tanakh_source'
       and p->'protocol'->>'specialist_fn' = 'fn_ev_sources' and (p->'protocol'->>'fn_allowlisted')::boolean, 'plan: '||q||' '||left(p::text,400);
    r := pg_temp.ans(q);
    assert r->>'mode' = 'deterministic' and r->>'intent' = 'tanakh_source' and r->>'subject' = 'משיח' and not (r->>'needs_synthesis')::boolean, 'answer: '||q||' '||left(r::text,300);
    assert (r->'cost'->>'used_llm')::boolean = false and (r->'cost'->>'tokens')::int = 0 and (r->'cost'->>'llm_calls')::int = 0, 'zero model';
    assert (select count(*) from proto_calls) = 1 and (select count(*) from resolve_calls) = 0, 'one protocol call, no gematria resolver';
    assert r->'source_result'->>'count' = '2' and (r->'source_result'->>'found')::boolean and r->'source_result'->'books' is not null
       and r->'source_result'->'first'->>'ref' = 'שמואל א 16:6' and r->'source_result'->'last'->>'ref' = 'ישעיהו 9:5'
       and jsonb_array_length(r->'source_result'->'samples') = 2, 'count/books/first/last/samples preserved: '||left(r::text,500);
    assert r->>'source_of_truth' like 'public.tanach_verses via fn_ev_sources%' and r->>'source_fn' = 'fn_ev_sources' and r->>'expert_selected' = 'sandalphon'
       and r->'evidence'->'sources'->>'source_of_truth' = r->>'source_of_truth' and r->'specialists'->0->>'source_of_truth' = r->>'source_of_truth', 'provenance';
    assert r->>'answer' like '%2 פסוקים%' and r->>'answer' like '%מילה שלמה מדויקת%', 'answer text states exact-token semantics';
    assert r->'trace'->>'match' = 'exact_whole_token', 'trace';
  end loop;
  -- zero findings = truthful negative result, still deterministic (not model fallback), still L0
  truncate proto_calls;
  r := pg_temp.ans('איפה מופיע זבולון בתנ״ך?');
  assert r->>'mode' = 'deterministic' and not (r->>'needs_synthesis')::boolean and r->'source_result'->>'count' = '0' and not (r->'source_result'->>'found')::boolean
     and r->>'answer' like '%לא נמצא%' and r->>'source_of_truth' is not null, 'negative result: '||left(r::text,300);
  -- fail closed: multiword phrase → zero tool calls, no exact claim, no substring result (the stub table even contains a «משיח בן דוד» verse)
  foreach q in array array['איפה מופיע משיח בן דוד בתנ״ך?','מקור של משיח בן דוד','באיזה ספר מופיע משיח בן דוד?'] loop
    truncate proto_calls;
    r := pg_temp.ans(q);
    assert r->>'mode' = 'needs_clarification' and r->>'unsupported' = 'multiword_phrase' and r->>'recommendation' is not null
       and (select count(*) from proto_calls) = 0 and r->'source_result' is null and r->>'answer' is null, 'fail closed: '||q||' '||left(r::text,300);
  end loop;
  truncate proto_calls;
  r := pg_temp.ans('איפה מופיע בתנ״ך?');
  assert r->>'mode' = 'needs_clarification' and r->>'unsupported' = 'no_subject' and (select count(*) from proto_calls) = 0, 'no subject: '||left(r::text,300);
  -- must NOT route to Sandalphon: number analysis, plain gematria, els
  foreach q in array array['נתח את המספר 26','מה הערך של משיח בגימטריה?','דילוגים של משיח'] loop
    p := fn_raziel_plan(q,'public_user',null);
    assert coalesce(p->'candidate'->>'expert','') <> 'sandalphon' and p->>'capability_class' <> 'tanakh_source', 'not sandalphon: '||q||' '||left(p::text,300);
  end loop;
  -- no-match public question stays L2 / synthesis / no tool
  truncate proto_calls;
  p := fn_raziel_plan('מה דעתך על הבוקר היפה?','public_user',null);
  assert p->>'availability' = 'no_match' and p->>'minimum_intelligence' = 'L2_FAST' and p->>'strategy' = 'raziel_synthesis', 'no-match L2';
  r := pg_temp.ans('מה דעתך על הבוקר היפה?'); assert r->>'mode' = 'fallback' and (r->>'needs_synthesis')::boolean and (select count(*) from proto_calls) = 0, 'no-match fallback';
  -- source + gematria stays the honest Phase E fallback: zero tools (L4 combination is the NEXT phase)
  truncate proto_calls;
  r := pg_temp.ans('גימטריה של משיח וגם איפה מופיע פסוק');
  assert r->>'mode' = 'fallback' and (select count(*) from proto_calls) = 0 and r->'tool_availability'->'executed' = '[]'::jsonb, 'no auto-combine: '||left(r::text,400);
  -- source protocol failure is explicit, never fabricated
  insert into proto_mode values ('tanakh_source','fail');
  r := pg_temp.ans('מקור של משיח');
  assert r->>'mode' = 'fallback' and r->'source_result' is null and r->>'answer' is null, 'failure explicit: '||left(r::text,300);
  delete from proto_mode;
  -- Phase E L4 gematria+ELS and single paths preserved
  truncate proto_calls;
  r := pg_temp.ans('בדוק גימטריה ודילוגים של משיח'); assert r->>'mode' = 'tool_research' and (select count(*) from proto_calls) = 2, 'phase E preserved';
  r := pg_temp.ans('דילוגים של משיח'); assert r->>'mode' = 'deterministic' and r->>'intent' = 'els', 'els single preserved';
  r := pg_temp.ans('גימטריה של משיח'); assert r->>'mode' = 'deterministic' and r->>'intent' = 'gematria', 'gematria single preserved';
  -- flag OFF unchanged
  update raziel_execution_flags set enabled=false where id=1;
  assert pg_temp.ans('מקור של משיח')->>'mode' = 'disabled', 'flag gate';
end $$;
select 'raziel_phase_f_sandalphon_source_v1: PASS';
