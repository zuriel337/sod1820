-- Throwaway-Postgres regression for RAZIEL_INTELLIGENCE_CORE_V1_PHASE_E (L4 gematria+ELS) (builds on Phase A/C stubs) (never run against a live project).
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
  stop text[] := array['מה','הערך','ערך','של','בגימטריה','גימטריה','הגימטריה','כמה','שווה','שוה','חישוב','זה','זו','זהו','הוא','היא','מהו','מהי','דילוגים','דילוג','דילוגי','אותיות','בתורה','בצופן','בגימטריה','הגימטריה','תמצא','מצא','למצוא','בדוק','חפש','את','הם','הן','הזה','הזו','הזאת','הערכים'];  -- mirrors live fn_raziel_extract_subject stop list
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
create table proto_calls(intent text, subject text);
create table proto_mode(intent text primary key, mode text);   -- ok | fail | empty
create function fn_raziel_protocol(p_subject text, p_intent text, p_context_type text, p_user_ref text, p_opts jsonb default '{}') returns jsonb
language plpgsql as $f$ declare m text := coalesce((select mode from proto_mode where intent=p_intent),'ok'); k text := case p_intent when 'gematria' then 'gematria_pack' else 'els' end; begin
  insert into proto_calls values (p_intent, p_subject);
  if m = 'fail' then raise exception 'boom %', p_intent; end if;
  return jsonb_build_object('plan', jsonb_build_object('no_match', false),
    'agents', jsonb_build_array(jsonb_build_object('agent_id',p_intent,'stage','s','fn','fn_'||p_intent,'output_key',k,'seq',1,'ran',true,'ok',true,'ms',3,'empty', m='empty')),
    'provenance', jsonb_build_object(k, jsonb_build_object('source_of_truth','sot-'||p_intent)),
    'cost', jsonb_build_object('db_calls',1),
    'findings', case when m='empty' then '{}'::jsonb when p_intent='gematria'
        then jsonb_build_object('gematria_pack', jsonb_build_object('value',358,'pack','p','stages',jsonb_build_object('methods',jsonb_build_object('evidence',jsonb_build_object('רגיל',358)))))
        else jsonb_build_object('els', jsonb_build_object('term',p_subject,'els_count',292,'min_skip',2,'hits',(select jsonb_agg(jsonb_build_object('skip',i)) from generate_series(1,40) i))) end);
end $f$;

\i supabase/migrations/20261005050000_raziel_route_token_boundary_match_v1.sql
\i supabase/migrations/20261005130000_raziel_intelligence_core_v1_phase_a_plan_first.sql
\i supabase/migrations/20261005140000_raziel_intelligence_core_v1_phase_c_operator_read.sql
\i supabase/migrations/20261005150000_raziel_intelligence_core_v1_phase_d2_plan_signals.sql
\i supabase/migrations/20261005160000_raziel_intelligence_core_v1_phase_e_l4_tool_research.sql

create function pg_temp.ans(q text, c text default 'public_user') returns jsonb language sql as $$ select fn_raziel_answer(q, c, null, null) $$;
create function pg_temp.calls() returns text language sql as $$ select coalesce(string_agg(intent||':'||subject, ',' order by intent desc),'') from proto_calls $$;
do $$ declare r jsonb; q text; begin
  -- golden: explicit gematria+ELS and equivalent orderings → exactly 2 deterministic calls, one clean subject, tool_research
  foreach q in array array['בדוק גימטריה ודילוגים של משיח','גימטריה ודילוגים של משיח','דילוגים וגימטריה של משיח','בדוק דילוגים וגימטריה של משיח',
                           'בדוק גם גימטריה וגם דילוגים של משיח','גימטריה של משיח וגם דילוגים בתורה'] loop
    truncate proto_calls; truncate resolve_calls;
    r := pg_temp.ans(q);
    assert r->>'mode' = 'tool_research' and r->>'status' = 'complete' and (r->>'needs_synthesis')::boolean, 'mode: '||q||' '||left(r::text,300);
    assert (select count(*) from proto_calls) = 2 and (select count(*) from proto_calls where subject = 'משיח') = 2, 'two calls one clean subject: '||q||' '||pg_temp.calls();
    assert (select count(*) from proto_calls where intent='gematria') = 1 and (select count(*) from proto_calls where intent='els') = 1, 'once each';
    assert (select count(*) from resolve_calls) = 0, 'resolver not reached';
    assert jsonb_array_length(r->'specialists') = 2 and r->'tool_research'->'specialists' = r->'specialists', 'specialists[]';
    assert r->'findings_by_capability' ?& array['gematria','els'] and r->'evidence_by_capability' ?& array['gematria','els'], 'findings/evidence by capability';
    assert r->'evidence_by_capability'->'gematria'->'gematria_pack'->>'source_of_truth' = 'sot-gematria'
       and r->'evidence_by_capability'->'els'->'els'->>'source_of_truth' = 'sot-els', 'provenance kept separate per tool';
    assert jsonb_array_length(r->'findings_by_capability'->'els'->'hits_sample') = 5, 'ELS hits bounded';
    assert r->'trace'->>'selected_semantic_level' = 'L4_TOOL_RESEARCH' and r->'trace'->>'synthesis_intelligence' = 'L3_DEEP'
       and (r->'trace'->>'tools_executed')::int = 2, 'trace levels recorded separately';
    assert r->'cross_checks'->>'performed' = 'false', 'no invented cross-check';
    assert r->'tool_research'->>'contract' = 'tool_research_v1' and r->'trace'->'signals'->>'route_intent' = 'multi_domain', 'contract+signals';
  end loop;
  -- admin/non-admin: same tools, same level (no intelligence selection by tier)
  truncate proto_calls;
  r := pg_temp.ans('בדוק גימטריה ודילוגים של משיח','admin'); assert r->>'mode' = 'tool_research' and (select count(*) from proto_calls) = 2, 'admin same: '||left(r::text,400);
  -- single tool paths unchanged
  truncate proto_calls; truncate resolve_calls;
  r := pg_temp.ans('גימטריה של משיח');
  assert r->>'mode' = 'deterministic' and not (r->>'needs_synthesis')::boolean and (select count(*) from proto_calls) = 0 and (select count(*) from resolve_calls) = 1, 'gematria single L0: '||left(r::text,200);
  r := pg_temp.ans('דילוגים של משיח');
  assert r->>'mode' = 'deterministic' and r->>'intent' = 'els' and (select count(*) from proto_calls) = 1 and (select intent from proto_calls) = 'els', 'els single: '||left(r::text,200);
  -- no clean subject / malformed multi-domain → zero tools
  foreach q in array array['בדוק גימטריה ודילוגים','גימטריה ודילוגים','גימטריה ודילוגים של משיח ושל אברהם','גימטריה של משיח לעומת דילוגים של אברהם'] loop
    truncate proto_calls;
    r := pg_temp.ans(q);
    assert r->>'mode' <> 'tool_research' and (select count(*) from proto_calls) = 0, 'zero tools: '||q||' '||left(r::text,200);
  end loop;
  assert pg_temp.ans('בדוק גימטריה ודילוגים')->>'mode' = 'needs_clarification', 'clarification';
  -- unsupported multi-domain (source/Sandalphon + gematria; system/admin-only + ELS) → zero tools, honest availability
  truncate proto_calls;
  r := pg_temp.ans('גימטריה של משיח וגם איפה מופיע פסוק');
  assert r->>'mode' = 'fallback' and (select count(*) from proto_calls) = 0 and r->'tool_availability'->'executed' = '[]'::jsonb
     and r->'tool_availability'->'unavailable' ? 'sandalphon', 'sandalphon+gematria: '||left(r::text,400);
  r := pg_temp.ans('דילוגים של משיח וגם מה לחקור','admin');
  assert r->>'mode' = 'fallback' and (select count(*) from proto_calls) = 0, 'research_intel + els not combined: '||left(r::text,300);
  -- partial failure labelled
  update proto_mode set mode='ok'; insert into proto_mode values ('els','fail') on conflict (intent) do update set mode='fail';
  truncate proto_calls;
  r := pg_temp.ans('בדוק גימטריה ודילוגים של משיח');
  assert r->>'mode' = 'tool_research' and r->>'status' = 'partial' and r->'tool_research'->'tool_status' = '{"gematria":"ok","els":"failed"}'::jsonb, 'partial: '||left(r::text,300);
  assert not (r->'findings_by_capability' ? 'els') and (r->'findings_by_capability' ? 'gematria') and (select count(*) from proto_calls where intent='gematria') = 1, 'no fabricated els (failed call rolled back with its subtransaction)';
  assert r->'specialists'->1->>'error' like 'boom%', 'error preserved';
  update proto_mode set mode='empty' where intent='els';
  r := pg_temp.ans('בדוק גימטריה ודילוגים של משיח');
  assert r->>'status' = 'partial' and r->'tool_research'->'tool_status'->>'els' = 'empty', 'empty els partial: '||left(r::text,300);
  update proto_mode set mode='fail';
  insert into proto_mode values ('gematria','fail') on conflict (intent) do update set mode='fail';
  assert pg_temp.ans('בדוק גימטריה ודילוגים של משיח')->>'status' = 'failed', 'both failed';
  delete from proto_mode;
  -- permission: an admin-only partner is never executed for a public user (domain count stays 1)
  truncate proto_calls;
  r := pg_temp.ans('גימטריה של משיח וגם מה לחקור','public_user');
  assert r->>'mode' <> 'tool_research' and (select count(*) from proto_calls) = 0 or (select count(*) from proto_calls where intent='research_intel') = 0, 'no research_intel';
  -- flag OFF unchanged
  update raziel_execution_flags set enabled=false where id=1;
  assert pg_temp.ans('בדוק גימטריה ודילוגים של משיח')->>'mode' = 'disabled', 'flag gate';
end $$;
select 'raziel_phase_e_l4_tool_research_v1: PASS';
