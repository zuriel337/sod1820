-- Phase 2e — consume agent-2's contribution_events (contract = users.id).
-- כל אישור מילה עם submitted_by → wrq_emit_contribution (סוכן-2) → contribution_events →
-- הטריגר שלי ce_award → award_contribution → xp/credits/level. amounts אופציונליים מ-metadata.
create or replace function public.ce_award()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if new.user_id is not null then
    perform public.award_contribution(
      new.user_id,
      coalesce((new.metadata->>'xp')::int, 25),
      coalesce((new.metadata->>'credits')::int, 10)
    );
  end if;
  return new;
end $$;

drop trigger if exists ce_award_after_insert on public.contribution_events;
create trigger ce_award_after_insert
  after insert on public.contribution_events
  for each row execute function public.ce_award();

-- "N מהמילים שלך במנוע" — read-path (מונה אירועי-תרומה של המשתמש הקורא).
create or replace function public.my_words_in_engine()
returns integer language sql stable security definer set search_path to 'public'
as $$
  select count(*)::int from public.contribution_events where user_id = (select auth.uid());
$$;
revoke all on function public.my_words_in_engine() from public;
grant execute on function public.my_words_in_engine() to authenticated;
