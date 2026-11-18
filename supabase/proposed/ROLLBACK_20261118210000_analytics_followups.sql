-- ROLLBACK of 20261118210000_analytics_followups_PROPOSAL.sql: restores both functions to their 18.11.2026 live text and clears only the note it set.
-- Events already recorded under the els family are kept (history is never deleted).
begin;

do $$
declare
  v_def text := pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure);
  v_old text := '"content":{"events":["view"],"fields":{"kind":"token","item_id":"int"}}}''::jsonb';
  v_new text := '"content":{"events":["view"],"fields":{"kind":"token","item_id":"int"}},"els":{"events":["search","cross_search"],"fields":{"kind":"token","scope":"token","skip":"int"}}}''::jsonb';
begin
  if position(v_new in v_def) > 0 then execute replace(v_def, v_new, v_old); end if;
end $$;

do $$
declare
  v_def text := pg_get_functiondef('public.fn_raziel_activity_notify(text,text)'::regprocedure);
  v_sel_old text := 'select p.user_id from public.notification_prefs p';
  v_sel_new text := 'select p.user_id, lower(coalesce(nullif(u.email, ''''), nullif(p.email, ''''))) as email from public.notification_prefs p';
  v_where_old text := 'and not exists (select 1 from public.wa_account_links l where l.user_id = p.user_id and l.phone = v_sender)';
  v_where_new text := 'and not exists (select 1 from public.wa_account_links l where l.user_id = p.user_id and l.phone = v_sender)
       and coalesce(nullif(u.email, ''''), nullif(p.email, '''')) is not null';
  v_ins_old text := 'insert into public.user_notifications(user_id, kind, title, body, source_topic, source_ref, dedupe_key)
    values (r.user_id, ''admin_raziel_activity''';
  v_ins_new text := 'insert into public.user_notifications(user_id, email, kind, title, body, source_topic, source_ref, dedupe_key)
    values (r.user_id, r.email, ''admin_raziel_activity''';
begin
  if position(v_ins_new in v_def) > 0 then
    execute replace(replace(replace(v_def, v_ins_new, v_ins_old), v_where_new, v_where_old), v_sel_new, v_sel_old);
  end if;
end $$;

update public.traffic_history set note = null
 where source in ('ga', 'ga:country:IL') and granularity = 'day' and period between date '2026-11-11' and date '2026-11-15'
   and note = 'צפיות כפולות: עד 15.11 12:10 UTC נשלחה צפייה גם משינוי היסטוריה בזרם GA וגם ידנית מהאתר. מפגשים ומשתמשים תקינים.';

commit;
