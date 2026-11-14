-- ROLLBACK of CONTRIBUTION_LINKS_VISIBLE_MESSAGE_READ_V1 — NOT APPLIED. Runs only with ZURIEL's explicit approval (CLAUDE.md 0.4).
-- Restores cl_public_read to SELECT, permissive, TO PUBLIC, USING (true), exactly as read live on 14.11.2026, and clears the apply record.
-- NOTE: this makes the provenance rows of every non-public old-chat message readable by any visitor again (the finding this proposal closes).
--
-- PROTECTED AGAINST A CHANGE IN BETWEEN. The rollback proves that the policy is still exactly what the proposal applied before touching it:
--   * it takes the same table lock as the proposal (SHARE UPDATE EXCLUSIVE, the mode of every CREATE/ALTER/DROP POLICY), with lock_timeout 3s:
--     a policy change running in another session makes the rollback fail closed (lock timeout) instead of overwriting it;
--   * once it holds the lock it reads the committed state and refuses unless (a) the policy comment is the apply record of this proposal,
--     (b) the md5 of the current expression equals the md5 recorded at apply, (c) cl_public_read is still the only policy on the table and still
--     SELECT, permissive, TO PUBLIC, with no WITH CHECK. Any later change (an edit, an added or dropped policy, a removed record) refuses and
--     leaves everything as it is: that needs a human decision, never an automatic overwrite.
-- A second run refuses (the record is gone).
begin;
set local lock_timeout = '3s';
set local statement_timeout = '60s';
lock table public.contribution_links in share update exclusive mode;

do $$
declare
  n int; v_pol record; v_comment text; v_recorded text;
begin
  select count(*) into n from pg_policy where polrelid = 'public.contribution_links'::regclass;
  if n <> 1 then
    raise exception 'CL_VISIBLE_READ rollback: expected exactly one policy on contribution_links, found % (changed since apply); nothing changed', n;
  end if;
  select * into v_pol from pg_policy where polrelid = 'public.contribution_links'::regclass and polname = 'cl_public_read';
  if not found then
    raise exception 'CL_VISIBLE_READ rollback: policy cl_public_read does not exist; nothing changed';
  end if;
  v_comment := obj_description(v_pol.oid, 'pg_policy');
  if v_comment is null or v_comment not like 'CONTRIBUTION_LINKS_VISIBLE_MESSAGE_READ_V1 applied%' then
    raise exception 'CL_VISIBLE_READ rollback: not in the applied state (no apply record on cl_public_read: not applied, already rolled back, or the record was removed); nothing changed';
  end if;
  v_recorded := substring(v_comment from 'qual_md5=([0-9a-f]{32})');
  if v_recorded is null then
    raise exception 'CL_VISIBLE_READ rollback: the apply record has no expression fingerprint; nothing changed';
  end if;
  if v_pol.polcmd <> 'r' or v_pol.polpermissive is not true or v_pol.polroles <> array[0::oid] or v_pol.polwithcheck is not null then
    raise exception 'CL_VISIBLE_READ rollback: cl_public_read is no longer SELECT, permissive, TO PUBLIC without WITH CHECK (changed since apply); nothing changed';
  end if;
  if md5(pg_get_expr(v_pol.polqual, v_pol.polrelid)) <> v_recorded then
    raise exception 'CL_VISIBLE_READ rollback: the policy expression changed since it was applied (concurrent or later change); nothing changed — needs a human decision';
  end if;

  alter policy cl_public_read on public.contribution_links using (true);
  comment on policy cl_public_read on public.contribution_links is null;

  select * into v_pol from pg_policy where polrelid = 'public.contribution_links'::regclass and polname = 'cl_public_read';
  if pg_get_expr(v_pol.polqual, v_pol.polrelid) <> 'true' or obj_description(v_pol.oid, 'pg_policy') is not null then
    raise exception 'CL_VISIBLE_READ rollback postcondition: the policy was not restored';
  end if;
end $$;

commit;
