-- PROPOSAL — NOT APPLIED. Analytics follow-ups of 18.11.2026 (docs/reviews/analytics-google-seo-closure-20261118/README.md §12).
-- Apply only with ZURIEL's explicit approval. Every part is guarded on the live text read 18.11.2026; a second apply changes nothing.
-- Owners: traffic_intelligence_law v11 (events/ingest_event, traffic_history); notification owner of user_notifications (existing functions only).
--
-- 1. ELS searches are measured. The code tool already emits ("els", "search" | "cross_search") with { kind, skip, scope }, but the public
--    action family has no "els" entry, so the client drops it and ingest_event would refuse it. Added as one closed family: two event names,
--    three fields (kind token, scope token, skip integer). The search term and any account id are never admitted (the database stamps the
--    account itself). The same entry is added to readingActionSpec() in src/lib/publicReadingTelemetry2029.js (test checks parity).
-- 2. fn_raziel_activity_notify inserts into user_notifications without the NOT NULL email, so no admin_raziel_activity notice was ever written
--    (the same defect fn_system_suggestion_notify_high had until 18.11 16:02). It now writes the admin's account e-mail.
-- 3. GA4 daily rows 11–15.11.2026: page views were counted twice (the stream's history-based page changes plus the site's manual page_view)
--    until the stream setting was turned off on 15.11 ~12:10 UTC; views per session fell from 3.9–7.6 to ~1.9 on 16.11. Sessions and users are
--    unaffected. Only the existing note column is set (ingest_ga_daily never writes note); no value is changed or deleted.

begin;

do $$
declare
  v_def text := pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure);
  v_old text := '"content":{"events":["view"],"fields":{"kind":"token","item_id":"int"}}}''::jsonb';
  v_new text := '"content":{"events":["view"],"fields":{"kind":"token","item_id":"int"}},"els":{"events":["search","cross_search"],"fields":{"kind":"token","scope":"token","skip":"int"}}}''::jsonb';
begin
  if position(v_new in v_def) > 0 then return; end if; -- already applied
  if md5(v_def) <> '60c470f64cb170ef7b9616f53f263578' then
    raise exception 'ingest_event changed since the 18.11.2026 read (md5 %); re-read before applying', md5(v_def);
  end if;
  execute replace(v_def, v_old, v_new);
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
  if position(v_ins_new in v_def) > 0 then return; end if; -- already applied
  if md5(v_def) <> 'b636d84c4d9d4566b5fdd613e3fefefd' then
    raise exception 'fn_raziel_activity_notify changed since the 18.11.2026 read (md5 %); re-read before applying', md5(v_def);
  end if;
  execute replace(replace(replace(v_def, v_sel_old, v_sel_new), v_where_old, v_where_new), v_ins_old, v_ins_new);
end $$;

update public.traffic_history
   set note = 'צפיות כפולות: עד 15.11 12:10 UTC נשלחה צפייה גם משינוי היסטוריה בזרם GA וגם ידנית מהאתר. מפגשים ומשתמשים תקינים.'
 where source in ('ga', 'ga:country:IL') and granularity = 'day' and period between date '2026-11-11' and date '2026-11-15' and note is null;

commit;
