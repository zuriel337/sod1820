-- Throwaway-Postgres regression for RAZIEL_INTELLIGENCE_CORE_V1_PHASE_C (builds on Phase A stubs) (never run against a live project).
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

create function pg_temp.pl(q text, c text) returns jsonb language sql as $$ select fn_raziel_plan(q, c, null) $$;
create function pg_temp.ans(q text, c text) returns jsonb language sql as $$ select fn_raziel_answer(q, c, null, null) $$;
do $$ declare r jsonb; q text; cap text; cls text; n0 bigint; begin
  -- admin positives: bounded grammar → operator descriptor under the existing owners; plan never executes
  for q, cap, cls in values
    ('כמה אנשים נכנסו היום?','traffic_count','analytics_traffic'),
    ('כמה אנשים נכנסו השבוע?','traffic_count','analytics_traffic'),
    ('מה מצב התנועה?','traffic_state','analytics_traffic'),
    ('מה קורה באתר?','system_overview','system_live_state'),
    ('מצב המערכת','system_overview','system_live_state'),
    ('יש תקלות?','system_faults','system_live_state'),
    ('כמה עלה AI השבוע?','ai_cost_week','system_live_state'),
    ('מה כדאי לחקור לפי הביקוש?','research_demand','research_intelligence')
  loop
    r := pg_temp.pl(q,'admin');
    assert r->'operator'->>'capability' = cap and r->>'capability_class' = cls, 'admin plan: '||q||' → '||r::text;
    assert (r->'operator'->>'read_only')::boolean and (r->'execution_plan'->>'will_execute')::boolean = false, 'read-only, plan only: '||q;
    assert r->>'availability' = 'operator_read' and r->'candidate' = 'null'::jsonb, 'no expert candidate: '||q;
  end loop;
  assert pg_temp.pl('כמה אנשים נכנסו היום?','admin')->>'minimum_intelligence' = 'L0_DETERMINISTIC', 'exact count is L0';
  assert pg_temp.pl('כמה עלה AI השבוע?','admin')->>'strategy' = 'operator_read_deterministic', 'ai cost deterministic projection';
  assert pg_temp.pl('כמה אנשים נכנסו השבוע?','admin')->'operator'->>'days' = '7', 'week window';
  assert pg_temp.pl('מה קורה באתר?','admin')->>'minimum_intelligence' = 'L2_FAST', 'broad question → L2_FAST synthesis';
  assert pg_temp.pl('מה קורה באתר?','admin')->>'strategy' = 'operator_read_synthesis', 'broad strategy';
  assert pg_temp.pl('מה כדאי לחקור לפי הביקוש?','admin')->'operator'->>'owner' like 'research_strategy_layer_law%', 'research owner';
  -- via fn_raziel_answer (existing fallback shape) the descriptor rides in trace.operator and nothing is computed
  r := pg_temp.ans('כמה אנשים נכנסו היום?','admin');
  assert r->>'mode' = 'fallback' and r->>'availability' = 'operator_read' and r->'trace'->'operator'->>'capability' = 'traffic_count', 'answer carries operator in trace: '||r::text;
  assert r->>'answer' is null and (r->'cost'->>'used_llm')::boolean = false, 'no answer computed in SQL';
  -- NEGATIVE: anon / authenticated / whatsapp never receive an operator capability; fail closed to ordinary synthesis
  foreach cap in array array['public_user','authenticated_user','whatsapp_user'] loop
    foreach q in array array['כמה אנשים נכנסו היום?','מה קורה באתר?','מצב המערכת','יש תקלות?','כמה עלה AI השבוע?','מה כדאי לחקור לפי הביקוש?','מה מצב התנועה?'] loop
      r := pg_temp.pl(q, cap);
      assert r->'operator' = 'null'::jsonb, 'non-admin must not get operator: '||cap||' '||q;
      assert r->>'capability_class' in ('general_synthesis','expert_unavailable') or r->>'availability' in ('blocked_permission','no_match','unavailable_matched'), 'non-admin class: '||cap||' '||q||' → '||r::text;
      assert r->>'capability_class' not in ('analytics_traffic','system_live_state','research_intelligence'), 'no operator class: '||cap||' '||q;
      assert r->>'strategy' not like 'operator_read%', 'no operator strategy: '||cap||' '||q;
    end loop;
    assert pg_temp.pl('כמה אנשים נכנסו היום?', cap)->'trace'->>'operator_denied' = 'admin_required', 'denial recorded without data';
  end loop;
  -- unknown / null context never counts as admin
  assert pg_temp.pl('מצב המערכת', null)->'operator' = 'null'::jsonb, 'null context';
  assert pg_temp.pl('מצב המערכת', 'ADMIN ')->'operator' = 'null'::jsonb, 'client-shaped context string not trusted';
  -- ordinary admin phrases containing כמה / אתר / מערכת must NOT classify as operator
  foreach q in array array['כמה זה עולה?','כמה שווה הדולר?','כמה אנשים יש בעולם?','מה האתר הזה עושה?','איך בונים אתר?','מערכת היחסים שלי','תסביר את מערכת השמש','כמה אנשים נכנסו לארון?','מה קורה בתורה?','מה כדאי לעשות עכשיו?','כמה עלה הבית?','מה כדאי לחקור בפרשה הזו?'] loop
    r := pg_temp.pl(q,'admin');
    assert r->'operator' = 'null'::jsonb, 'admin ordinary phrase must not be operator: '||q||' → '||r::text;
  end loop;
  -- Phase A behaviour intact for admin: gematria still resolves, once, deterministically
  n0 := (select count(*) from resolve_calls);
  r := pg_temp.ans('גימטריה של משיח','admin');
  assert r->>'mode' = 'deterministic' and r->>'capability_class' = 'gematria_expression', 'phase A gematria for admin: '||r::text;
  -- permission fail-closed preserved
  assert fn_raziel_plan('מה לחקור','public_user')->>'availability' = 'blocked_permission', 'admin expert blocked for public';
  -- flag OFF unchanged
  update raziel_execution_flags set enabled=false where id=1;
  assert pg_temp.ans('מצב המערכת','admin')->>'mode' = 'disabled', 'flag gate before operator';
end $$;
select 'raziel_phase_c_operator_read_v1: PASS';
