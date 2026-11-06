-- Rollback of 20261106121000_def001b_visitor_id_exposure_step1.sql (and, if it was applied, of the step-2 lockdown). Restores the pre-change grants/policies.
-- Step-2 rollback (only if the lockdown file was applied):
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'ps_anon_select') then
    create policy ps_anon_select on public.push_subscriptions for select to anon using (user_id is null);
    create policy ps_anon_insert on public.push_subscriptions for insert to anon with check (user_id is null);
    create policy ps_anon_update on public.push_subscriptions for update to anon using (user_id is null) with check (user_id is null);
    create policy ps_anon_delete on public.push_subscriptions for delete to anon using (user_id is null);
    grant select, insert, update, delete on public.push_subscriptions to anon;
  end if;
end $$;
-- Step-1 rollback:
drop policy if exists feedback_admin_read on public.feedback;
create policy feedback_public_read on public.feedback for select using (true);
grant select on public.feedback to anon;
revoke select on public.els_records from anon, authenticated;
grant select on public.els_records to anon, authenticated;
drop function if exists public.push_subscription_upsert_v1(text, text, text, text[], text, text);
drop function if exists public.push_subscription_delete_v1(text);
