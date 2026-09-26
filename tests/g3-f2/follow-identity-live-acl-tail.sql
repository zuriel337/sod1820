-- SOD1820 G3-F2 isolated baseline ACL tail.
-- Two verified live ACLs are intentionally broader than the explicit grants in the minimal
-- structural fixture: notification_events is SELECT-granted to authenticated (RLS still gates),
-- and the legacy pre-PR notify_on_new_follower trigger function still inherits PUBLIC execute.
-- Recreate those exact pre-PR conditions so PR #486 must prove its own hardening.
-- Test fixture only: never copied to production migrations.

grant select on public.notification_events to authenticated;
grant execute on function public.notify_on_new_follower() to public;
