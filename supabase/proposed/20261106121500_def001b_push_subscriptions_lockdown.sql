-- DEF-001b (step 2 of 2) - PROPOSED, not in supabase/migrations on purpose.
-- Precondition: step 1 is applied AND the frontend that uses push_subscription_upsert_v1 / push_subscription_delete_v1
-- (src/lib/push.js) is live. Applying this earlier breaks anonymous Web Push subscribe / unsubscribe.
-- After this, visitor_id, endpoint and the push keys of anonymous subscribers are no longer readable by clients.
-- Rollback: re-create the four ps_anon_* policies and `grant select, insert, update, delete ... to anon`.

drop policy if exists ps_anon_select on public.push_subscriptions;
drop policy if exists ps_anon_insert on public.push_subscriptions;
drop policy if exists ps_anon_update on public.push_subscriptions;
drop policy if exists ps_anon_delete on public.push_subscriptions;
revoke all on public.push_subscriptions from anon;
