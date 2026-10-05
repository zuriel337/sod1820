-- Throwaway-Postgres regression for RAZIEL_INTELLIGENCE_CORE_V1_PHASE_A (never run against a live project).
-- Stubs mirror the live registry rows (agent_identity keywords, raziel_protocol_agents). fn_raziel_resolve is a counting
-- stub so the test can prove the gematria resolver is NOT reached for non-gematria plans.
create table agent_identity(agent_id text, name text, capabilities text, does_not text, permission_scope text,
  active boolean, layer text, match_keywords text[]);
insert into agent_identity values
 ('gematria_engine','g','g','x','public',true,'engine',array['גימטריה','ערך','שווה','כמה','חישוב']),
 ('els_cipher','els','els','x','public',true,'engine',array['דילוג','דילוגים','els','דילוגי אותיות','דילוגי-אותיות']),
 ('sandalphon','s','tanakh','x','public',true,'expert',array['תנ"ך','פסוק','מקור','ספר','היכן מופיע']),
 ('research_intelligence','ri','ri','x','admin',true,'engine',array['ביקוש','טרנד','מה לחקור']),
 ('big_letter_cipher','b','b','x','public',false,'engine',array['צופן בגדול']);
create table raziel_protocol_agents(intent text, expert_id text, fn_name text, enabled boolean, sort int, deterministic boolean, token_cost int);
insert into raziel_protocol_agents values
 ('gematria','gematria_engine','fn_gematria_pack',true,10,true,0),
 ('els','els_cipher','fn_els_search',true,10,true,0),
 ('research_intel','research_intelligence','fn_raziel_research_intel_scoped',true,10,true,0);
alter table raziel_protocol_agents add column cross_check jsonb;
create table raziel_protocol_allowed_fns(fn_name text);
insert into raziel_protocol_allowed_fns values ('fn_gematria_pack'),('fn_els_search');
create table raziel_execution_flags(id int, enabled boolean, test_visitor_id text);
insert into raziel_execution_flags values (1,true,null);
create table resolve_calls(q text);
create function fn_raziel_extract_subject(p_question text, p_intent text) returns text language plpgsql immutable as $f$
declare v text; w text; parts text[] := '{}';
  stop text[] := array['מה','הערך','ערך','של','בגימטריה','גימטריה','הגימטריה','כמה','שווה','שוה','חישוב','זה','זו','זהו','הוא','היא','מהו','מהי','דילוגים','דילוגי','אותיות','בתורה'];
begin
  v := btrim(regexp_replace(regexp_replace(coalesce(p_question,''), '[?!.,:;]+', ' ', 'g'), '\s+', ' ', 'g'));
  foreach w in array regexp_split_to_array(v, '\s+') loop if w <> '' and not (w = any(stop)) then parts := parts || w; end if; end loop;
  v := btrim(array_to_string(parts,' '));
  if v = '' or array_length(parts,1) > 4 or length(v) > 30 then return null; end if; return v; end $f$;
create function fn_raziel_resolve(p_message text, p_entitlement text default 'public', p_context_type text default 'public_user') returns jsonb
language plpgsql as $f$ declare s text := fn_raziel_extract_subject(p_message,'gematria'); begin
  insert into resolve_calls values (p_message);
  return jsonb_build_object('has_subject', s is not null, 'subject', s, 'value', 453, 'source_of_truth','stub',
    'pack', jsonb_build_object('stages', jsonb_build_object('methods', jsonb_build_object('evidence', jsonb_build_object('רגיל',453)))),
    'cost', jsonb_build_object('db_calls',1)); end $f$;
create function fn_raziel_protocol(p_subject text, p_intent text, p_context_type text, p_user_ref text, p_opts jsonb default '{}') returns jsonb
language sql as $f$ select jsonb_build_object('agents','[]'::jsonb,'provenance','{}'::jsonb,'cost',jsonb_build_object('db_calls',1),
  'findings', jsonb_build_object('els', jsonb_build_object('els_count',3,'min_skip',7))) $f$;

\i supabase/migrations/20261005050000_raziel_route_token_boundary_match_v1.sql
\i supabase/migrations/20261005130000_raziel_intelligence_core_v1_phase_a_plan_first.sql

create function pg_temp.ans(q text) returns jsonb language sql as $$ select fn_raziel_answer(q,'public_user',null,null) $$;
create function pg_temp.calls() returns bigint language sql as $$ select count(*) from resolve_calls $$;
do $$ declare r jsonb; n0 bigint; q text; begin
  -- positives: deterministic gematria, 0 LLM, resolver reached exactly once
  foreach q in array array['כמה זה משיח?','גימטריה של משיח','משיח שווה כמה?'] loop
    n0 := pg_temp.calls(); r := pg_temp.ans(q);
    assert r->>'mode' = 'deterministic' and r->>'intent' = 'gematria', 'gematria positive: '||q||' → '||r::text;
    assert r->>'capability_class' = 'gematria_expression' and r->>'minimum_intelligence' = 'L0_DETERMINISTIC', 'class: '||q;
    assert (r->'cost'->>'used_llm')::boolean = false and pg_temp.calls() = n0 + 1, 'zero-llm + resolver once: '||q;
  end loop;
  assert pg_temp.ans('גימטריה של משיח')->>'answer' like 'משיח = 453%', 'answer text preserved';
  -- ELS keeps its deterministic path and never touches the gematria resolver
  n0 := pg_temp.calls(); r := pg_temp.ans('דילוגי אותיות של משיח');
  assert r->>'mode' = 'deterministic' and r->>'intent' = 'els' and r->>'capability_class' = 'els_search', 'els path: '||r::text;
  assert pg_temp.calls() = n0, 'els must not call the gematria resolver';
  -- negatives: no calculation, resolver never reached, truthful fallback to synthesis
  foreach q in array array['מה קורה עכשיו באתר?','מה אפשר לחקור כאן?','תסביר לי את הפוסט שאני קורא','מה כדאי לעשות עכשיו?',
                           'איפה אנחנו בתוכנית?','כמה אנשים נכנסו היום?','כמה זה עולה?','כמה שווה הדולר?'] loop
    n0 := pg_temp.calls(); r := pg_temp.ans(q);
    assert r->>'mode' = 'fallback' and r->>'availability' = 'no_match', 'negative must fall back: '||q||' → '||r::text;
    assert r->>'capability_class' = 'general_synthesis' and r->>'strategy' = 'raziel_synthesis' and (r->>'needs_synthesis')::boolean, 'synthesis contract: '||q;
    assert r->>'minimum_intelligence' = 'L2_FAST' and r->>'answer' is null, 'no answer computed: '||q;
    assert pg_temp.calls() = n0, 'resolver must not run for: '||q;
  end loop;
  -- ספר/מספר boundary preserved (route level): מספר ≠ ספר
  assert fn_raziel_plan('נתח את המספר הזה')->>'capability_class' = 'general_synthesis', 'מספר must not become sandalphon';
  assert fn_raziel_plan('באיזה ספר זה מופיע')->'candidate'->>'expert' = 'sandalphon', 'real ספר still routes';
  assert fn_raziel_plan('באיזה ספר זה מופיע')->>'strategy' = 'raziel_synthesis', 'sandalphon (no protocol) → synthesis';
  -- permission / inactive fail-closed preserved
  assert fn_raziel_plan('מה לחקור','public_user')->>'availability' = 'blocked_permission', 'admin expert blocked for public';
  assert fn_raziel_plan('צופן בגדול')->>'availability' = 'unavailable_matched', 'inactive agent never selected';
  assert fn_raziel_plan('מה לחקור','public_user')->'permission'->>'effective_scope' = 'public', 'no escalation';
  -- flag OFF unchanged
  update raziel_execution_flags set enabled=false where id=1;
  assert pg_temp.ans('גימטריה של משיח')->>'mode' = 'disabled', 'flag gate';
end $$;
select 'raziel_phase_a_plan_first_v1: PASS';
