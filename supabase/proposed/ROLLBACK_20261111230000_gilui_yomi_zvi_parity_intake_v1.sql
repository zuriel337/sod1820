-- ROLLBACK of GILUI_YOMI_ZVI_PARITY_INTAKE_V1 — NOT APPLIED. Runs only with ZURIEL's explicit approval (CLAUDE.md 0.4).
-- Restores the previous admission of «הגילוי היומי»: only the admin list (admin_ids, kept unchanged by the proposal) is admitted again.
-- Rows admitted while the switch was open are NOT deleted or changed: they stay private research intake, and a row is public only if the
-- unchanged public reader proves it. Removing such rows would be a separate data deletion with its own approval.
begin;

do $$
declare n int; s record;
begin
  select count(*) into n from public.channel_ingest_sources where channel = 'gilui-yomi';
  if n <> 1 then raise exception 'GILUI_YOMI_PARITY rollback: expected exactly one gilui-yomi source, found %', n; end if;
  select * into s from public.channel_ingest_sources where channel = 'gilui-yomi' for update;
  if s.admin_only is not false or coalesce(array_length(s.admin_ids, 1), 0) = 0 then
    raise exception 'GILUI_YOMI_PARITY rollback: gilui-yomi is not in the applied state (admin_only=false with its admin list); nothing changed';
  end if;
  update public.channel_ingest_sources set admin_only = true where id = s.id and admin_only is false;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'GILUI_YOMI_PARITY rollback: expected one row updated, got %', n; end if;
end $$;

commit;
