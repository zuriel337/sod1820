-- PROPOSAL ONLY - NOT APPLIED (S1, 27.11.2026). A DATA CHANGE: needs ZURIEL's explicit approval of this exact file and a retention decision.
-- Free text must not sit in analytics. The 7 issue_report events written before the support-store change (surface='issue_report') carry the text a person typed in
-- props.message. This file (1) COPIES each message into the support store (public.feedback via record_feedback's table, context 'issue_report_migrated') and
-- (2) only then removes the 'message' key from those event rows. No event row is deleted. It refuses to remove a message that was not copied first.
\set ON_ERROR_STOP on
begin;
  insert into public.feedback(context,verdict,target,detail,meta,created_at)
  select 'issue_report_migrated','reported',left(coalesce(props->>'surface',''),64),left(props->>'message',1000),
         (props - 'message') || jsonb_build_object('event_id',event_id::text,'migrated_from','events'), ts
  from public.events
  where surface='issue_report' and event_type='issue_report' and props ? 'message'
    and not exists (select 1 from public.feedback f where f.context='issue_report_migrated' and f.meta->>'event_id'=event_id::text);
  do $$
  begin
    if exists (select 1 from public.events e where e.surface='issue_report' and e.props ? 'message'
               and not exists (select 1 from public.feedback f where f.context='issue_report_migrated' and f.meta->>'event_id'=e.event_id::text)) then
      raise exception 'an issue_report message was not copied to the support store; nothing is removed';
    end if;
  end $$;
  update public.events set props = props - 'message' where surface='issue_report' and event_type='issue_report' and props ? 'message';
commit;
