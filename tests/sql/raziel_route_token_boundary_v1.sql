-- Throwaway-Postgres regression for fn_raziel_route token boundary (never run against a live project).
create table agent_identity(agent_id text, name text, capabilities text, does_not text, permission_scope text,
  active boolean, layer text, match_keywords text[]);
insert into agent_identity values
 ('sandalphon','סנדלפון','tanakh','x','public',true,'expert',array['תנ"ך','פסוק','מקור','ספר','היכן מופיע']),
 ('els_cipher','els','els','x','public',true,'engine',array['דילוגי אותיות','דילוגי-אותיות']),
 ('research_intelligence','ri','ri','x','admin',true,'engine',array['מה לחקור']);
\i supabase/migrations/20261005050000_raziel_route_token_boundary_match_v1.sql
create function pg_temp.experts(q text, ct text default 'public_user') returns text language sql as
$$ select coalesce(string_agg(e->>'expert', ',' order by e->>'expert'), '') from jsonb_array_elements(fn_raziel_route(q, ct)->'expert_selected') e $$;
do $$ begin
  assert pg_temp.experts('נתח את המספר 26 ופרש אותו') = '', 'מספר must not match ספר';
  assert pg_temp.experts('באיזה ספר זה מופיע') = 'sandalphon', 'real ספר must match';
  assert pg_temp.experts('ספר') = 'sandalphon', 'bare ספר matches';
  assert pg_temp.experts('היכן המספר מופיע') = '', 'multi-word keyword needs the full phrase';
  assert pg_temp.experts('היכן מופיע הערך') = 'sandalphon', 'multi-word phrase matches';
  assert pg_temp.experts('מה כתוב בתנ"ך') = '', 'attached prefix is not a boundary match';
  assert pg_temp.experts('פסוק בתנ"ך') = 'sandalphon', 'quoted keyword normalized';
  assert pg_temp.experts('דילוגי אותיות בתורה') = 'els_cipher', 'hyphen/space normalization';
  -- permission scope preserved: admin expert surfaces with effective_scope = min(expert,user)
  assert (fn_raziel_route('מה לחקור','public_user')->'expert_selected'->0->>'effective_scope') = 'public', 'no escalation';
  assert (fn_raziel_route('מה לחקור','admin')->'expert_selected'->0->>'effective_scope') = 'admin', 'admin scope';
end $$;
select 'raziel_route_token_boundary_v1: PASS';
