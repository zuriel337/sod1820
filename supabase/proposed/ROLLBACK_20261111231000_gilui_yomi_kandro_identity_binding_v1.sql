-- ROLLBACK of GILUI_YOMI_KANDRO_IDENTITY_BINDING_V1 — NOT APPLIED. Runs only with ZURIEL's explicit approval (CLAUDE.md 0.4).
-- Removes the bound number from shachar-kandro, so new messages of that sender are unverified again (not public, not pinned).
-- Messages proved while the binding was applied keep their first proof (verified_phone_unique), as for every proof; taking one of them out of
-- the public reader is a hold (channel_update_group_proof.held_at), a separate action with its own approval.
begin;

do $$
declare n int;
begin
  select count(*) into n from public.contributors where slug = 'shachar-kandro' and phone is not null and user_id is null;
  if n <> 1 then raise exception 'KANDRO_BINDING rollback: shachar-kandro is not in the applied state (a bound number, no account); nothing changed'; end if;
  update public.contributors set phone = null where slug = 'shachar-kandro' and phone is not null and user_id is null;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'KANDRO_BINDING rollback: expected one row updated, got %', n; end if;
end $$;

commit;
