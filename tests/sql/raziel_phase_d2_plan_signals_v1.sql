-- Throwaway-Postgres regression for RAZIEL_INTELLIGENCE_CORE_V1_PHASE_D2 (builds on Phase A/C stubs) (never run against a live project).
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
\i supabase/migrations/20261005140000_raziel_intelligence_core_v1_phase_c_operator_read.sql
\i supabase/migrations/20261005150000_raziel_intelligence_core_v1_phase_d2_plan_signals.sql

create function pg_temp.pl(q text, c text) returns jsonb language sql as $$ select fn_raziel_plan(q, c, null) $$;
do $$ declare r jsonb; q text; begin
  -- gematria + ELS explicit wording: 2 domains, multi_domain, synthesis floor L2, no engine candidate, nothing executed
  r := pg_temp.pl('גימטריה של משיח וגם דילוגים בתורה','public_user');
  assert r->>'route_intent' = 'multi_domain' and jsonb_array_length(r->'domains') = 2, 'multi: '||r::text;
  assert r->'domains' @> '"gematria_engine"' and r->'domains' @> '"els_cipher"', 'domains: '||r::text;
  assert r->'capabilities' = '["gematria","els"]'::jsonb or r->'capabilities' = '["els","gematria"]'::jsonb, 'caps: '||r::text;
  assert r->>'availability' = 'multi_domain_synthesis' and r->>'capability_class' = 'general_synthesis'
     and r->>'minimum_intelligence' = 'L2_FAST' and r->>'strategy' = 'raziel_synthesis' and r->'candidate' = 'null'::jsonb, 'synthesis floor: '||r::text;
  assert (r->'execution_plan'->>'will_execute')::boolean = false and r->'trace'->'signals'->>'route_intent' = 'multi_domain', 'trace.signals';
  assert r->>'contradictory' = 'false' and r->>'cross_check_required' = 'false', 'no cross-check without declaration';
  -- answer path: falls to synthesis fallback, never a deterministic single-engine answer; resolver not reached
  assert (select count(*) from resolve_calls) = 0;
  r := fn_raziel_answer('גימטריה של משיח וגם דילוגים בתורה','public_user',null,null);
  assert r->>'mode' = 'fallback' and r->'trace'->'signals'->>'route_intent' = 'multi_domain', 'answer carries signals: '||r::text;
  assert (select count(*) from resolve_calls) = 0, 'resolver not reached for multi-domain';
  -- single capability stays deterministic L0, single_domain, no escalation signals
  r := pg_temp.pl('גימטריה של משיח','public_user');
  assert r->>'route_intent' = 'single_domain' and jsonb_array_length(r->'domains') = 1 and r->>'minimum_intelligence' = 'L0_DETERMINISTIC'
     and r->>'capability_class' = 'gematria_expression', 'single stays L0: '||r::text;
  -- several keywords of ONE agent are one domain
  r := pg_temp.pl('גימטריה חישוב ערך של משיח','public_user');
  assert jsonb_array_length(r->'domains') = 1 and r->>'route_intent' = 'single_domain', 'one agent many keywords: '||r::text;
  -- bare gematria keyword rejected by the question-form gate is not a domain
  r := pg_temp.pl('כמה אנשים יש בעולם וגם דילוגים','public_user');
  assert r->'domains' = '["els_cipher"]'::jsonb and r->>'route_intent' = 'single_domain', 'gate-rejected keyword not a domain: '||r::text;
  assert r->>'route_intent_raw' = 'multi_domain', 'raw route token preserved';
  -- compare grammar: bounded; alone does not create domains
  assert (pg_temp.pl('השווה בין שני דברים','public_user')->>'compare_requested')::boolean, 'השווה';
  assert (pg_temp.pl('מה הקשר בין משיח לדילוגים','public_user')->>'compare_requested')::boolean, 'מה הקשר בין';
  assert (pg_temp.pl('compare these','public_user')->>'compare_requested')::boolean, 'compare';
  assert not (pg_temp.pl('מה הקשר?','public_user')->>'compare_requested')::boolean, 'bare מה הקשר? is not compare';
  assert not (pg_temp.pl('מה קורה בתורה?','public_user')->>'compare_requested')::boolean, 'ordinary';
  r := pg_temp.pl('השווה דילוגים של משיח','public_user');
  assert (r->>'compare_requested')::boolean and jsonb_array_length(r->'domains') = 1 and r->>'route_intent' = 'single_domain', 'one-domain compare: '||r::text;
  r := pg_temp.pl('גימטריה מול דילוגים','public_user');
  assert (r->>'compare_requested')::boolean and jsonb_array_length(r->'domains') = 2, 'two-domain compare: '||r::text;
  -- permission: admin-scoped expert is not counted for a public user
  r := pg_temp.pl('גימטריה של משיח וגם מה לחקור','public_user');
  assert jsonb_array_length(r->'domains') = 1 and r->>'route_intent' = 'single_domain', 'admin expert not a public domain: '||r::text;
  assert pg_temp.pl('מה לחקור','public_user')->>'availability' = 'blocked_permission', 'blocked_permission intact';
  r := pg_temp.pl('גימטריה של משיח וגם מה לחקור','admin');
  assert jsonb_array_length(r->'domains') = 2, 'admin counts both: '||r::text;
  -- cross_check_required only from a registered protocol declaring required=true; contradictory never inferred
  update raziel_protocol_agents set cross_check = '{"required":true,"with":"gematria"}'::jsonb where intent='els';
  r := pg_temp.pl('דילוגים בתורה','public_user');
  assert (r->>'cross_check_required')::boolean and r->>'contradictory' = 'false', 'declared required: '||r::text;
  r := pg_temp.pl('גימטריה של משיח','public_user');
  assert not (r->>'cross_check_required')::boolean, 'not declared';
  r := pg_temp.pl('סותר ומנוגד לחלוטין גימטריה של משיח','public_user');
  assert r->>'contradictory' = 'false', 'wording never infers contradiction';
  -- generic long question: plain synthesis, empty signals
  r := pg_temp.pl(repeat('מילה ארוכה ',40),'public_user');
  assert r->>'route_intent' = 'no_clear_match' and jsonb_array_length(r->'domains') = 0 and r->>'minimum_intelligence' = 'L2_FAST', 'long generic: '||left(r::text,200);
  -- admin operator grammar intact and carries no domains
  r := pg_temp.pl('כמה אנשים נכנסו היום?','admin');
  assert r->>'availability' = 'operator_read' and jsonb_array_length(r->'domains') = 0 and r->>'minimum_intelligence' = 'L0_DETERMINISTIC', 'operator intact: '||r::text;
  assert pg_temp.pl('מצב המערכת','public_user')->'operator' = 'null'::jsonb, 'non-admin denial intact';
  -- inactive agent never counted
  r := pg_temp.pl('צופן בגדול וגם גימטריה של משיח','public_user');
  assert not (r->'domains' @> '"big_letter_cipher"'), 'inactive agent never a domain';
  -- flag OFF unchanged
  update raziel_execution_flags set enabled=false where id=1;
  assert fn_raziel_answer('גימטריה של משיח וגם דילוגים','public_user',null,null)->>'mode' = 'disabled', 'flag gate';
end $$;
select 'raziel_phase_d2_plan_signals_v1: PASS';
