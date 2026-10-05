-- Throwaway-Postgres regression for RAZIEL_BETA_ELS_PREFIX_INTENT_HOTFIX_V1 (never run against a live project).
create table agent_identity(agent_id text, name text, capabilities text, does_not text, permission_scope text,
  active boolean, layer text, match_keywords text[]);
insert into agent_identity values
 ('sandalphon','סנדלפון','tanakh','x','public',true,'expert',array['תנ"ך','פסוק','מקור','ספר','היכן מופיע']),
 ('els_cipher','els','els','x','public',true,'engine',array['דילוג','דילוגים','els','דילוגי אותיות','דילוגי-אותיות']),
 ('uriel','uriel','u','x','public',false,'expert',array['פירוק','אותיות','שיטה','ניצוץ']);
\i supabase/migrations/20261005050000_raziel_route_token_boundary_match_v1.sql
\i supabase/migrations/20261005220000_raziel_beta_els_prefix_intent_hotfix_v1.sql
create function pg_temp.experts(q text) returns text language sql as
$$ select coalesce(string_agg(e->>'expert', ',' order by e->>'expert'), '') from jsonb_array_elements(fn_raziel_route(q,'public_user')->'expert_selected') e $$;
do $$ begin
  -- keywords appended, originals preserved
  assert (select match_keywords from agent_identity where agent_id='els_cipher')
    = array['דילוג','דילוגים','els','דילוגי אותיות','דילוגי-אותיות','בדילוג','בדילוגים','בדילוגי','בדילוגי אותיות'], 'append-only keywords';
  -- subject extraction
  assert fn_raziel_extract_subject('בדוק את משיח בדילוגים','els') = 'משיח', 'subject בדילוגים';
  assert fn_raziel_extract_subject('בדוק את משיח בדילוג','els') = 'משיח', 'subject בדילוג';
  assert fn_raziel_extract_subject('בדוק את משיח בדילוגי אותיות','els') = 'משיח', 'subject בדילוגי אותיות';
  assert fn_raziel_extract_subject('בדוק את משיח דילוגים','els') = 'משיח', 'plain still works';
  assert fn_raziel_extract_subject('מה הגימטריה של משיח','gematria') = 'משיח', 'gematria unchanged';
  -- routing
  assert pg_temp.experts('בדוק את משיח בדילוגים') = 'els_cipher', 'בדילוגים routes';
  assert pg_temp.experts('בדוק את משיח בדילוג') = 'els_cipher', 'בדילוג routes';
  assert pg_temp.experts('בדוק את משיח בדילוגי אותיות') = 'els_cipher', 'בדילוגי אותיות routes (uriel inactive excluded)';
  assert pg_temp.experts('בדוק את משיח דילוגים') = 'els_cipher', 'plain דילוגים routes';
  -- boundaries unchanged: no generic prefix stripping, no false expert
  assert pg_temp.experts('נתח את המספר 26 ופרש אותו') = '', 'מספר must not match ספר';
  assert pg_temp.experts('מה כתוב בתנ"ך') = '', 'attached prefix not a boundary match';
  assert pg_temp.experts('בדילוגיות') = '', 'no prefix/substring leakage';
  assert pg_temp.experts('מה מזג האוויר היום') = '', 'general question no expert';
end $$;
select 'raziel_beta_els_prefix_intent_hotfix_v1: PASS';
