-- CONTRIBUTION_LINKS_VISIBLE_MESSAGE_READ_V1 — PROPOSAL, NOT APPLIED. Runs only with ZURIEL's explicit approval for this exact file (CLAUDE.md 0.4).
-- Rollback: supabase/proposed/ROLLBACK_20261114180000_contribution_links_visible_message_read_v1.sql
-- Test (throwaway local PostgreSQL only): bash scripts/run-contribution-links-visible-read-sql-test.sh
-- Review: docs/reviews/contribution-links-policy-20261114/README.md
--
-- FINDING (read live on 14.11.2026): policy cl_public_read on public.contribution_links is SELECT, permissive, TO PUBLIC, USING (true), and anon and
-- authenticated hold SELECT. So any visitor can read all 68,997 provenance rows, including the 23,167 rows of 15,583 messages that are NOT public
-- (status hidden 22,258 rows, pending 909 rows). For the old-chat messages those rows carry the source-native message id, the original page address and
-- the original moderation state (derived_from rows: blocked 10,850 / deleted 4,025 / pending 685 / one deleted after approval). research_contributions
-- itself is protected (rc_public_read: status = 'approved' OR author_user_id = auth.uid(); research_contributions_admin_read for administrators), so the
-- messages are hidden but their provenance is not. After the change a guest reads 45,830 rows (the links of the 25,733 approved messages).
--
-- WHAT THIS CHANGES: exactly one thing. The USING expression of the existing policy cl_public_read becomes
--     exists (select 1 from public.research_contributions rc where rc.id = contribution_links.from_contribution_id)
--     and (target_type <> 'contribution' or exists (select 1 from public.research_contributions tc where tc.id = <the target id as a uuid>))
-- i.e. a link is readable exactly when its message is readable by the same caller under the EXISTING research_contributions policies, and, for the
-- one link kind that points at another message (target_type 'contribution'), when that target message is readable by the same caller too (a public
-- message must not reveal the id of a hidden one; a target id that is not a uuid is not readable: fail closed). A guest sees the links of approved
-- messages only, an author also sees the links of their own messages, an administrator sees all. The rule is inherited, not copied: if the message
-- policy changes later, the links follow it. The policy keeps its name and is altered in place (ALTER POLICY), so there is no moment without a policy.
-- Live today (read 14.11.2026): 7 links have target_type 'contribution', all from hidden messages to approved ones (the first condition already hides
-- them from guests); 0 links point from a public message to a non-public one, so the second condition changes nothing today and closes the other direction
-- for later rows (Codex review note, 14.11.2026: "audit both directions").
-- WHAT THIS DOES NOT CHANGE: no table, column, index, grant, function, trigger or row; no other policy. The writers are untouched: the import
-- (g3_openweb_import_batch / g3_openweb_import_message run by service_role, which bypasses RLS), link_contribution and
-- project_contribution_to_graph (SECURITY DEFINER, owner postgres) and the three definer readers that touch the table
-- (people_public_rows_v1, person_public_profile_v1, researcher_reputation) read and write as before. The two browser readers in
-- src/lib/contributions.js (getContributionLinks, an unused export; the forum feed link count, which only counts rows of approved contributions)
-- see the same rows as before for approved contributions.
--
-- SAFETY: the proposal refuses and changes nothing unless the live state is exactly the one read on 14.11.2026 (one policy, the exact old
-- definition, no write grants for anon or authenticated, RLS on both tables, and the two research_contributions read policies this rule inherits).
-- It records itself in the policy comment (with the md5 of the applied expression) so the rollback can prove that nothing changed in between.
-- A second run refuses. The table lock is SHARE UPDATE EXCLUSIVE: it serialises with any other policy change on the table (that DDL takes the same
-- mode) and with a second run of this file or of the rollback, and it blocks neither reads nor the import's writes; lock_timeout 3s, so a running
-- change elsewhere makes this fail closed instead of queueing.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '60s';
lock table public.contribution_links in share update exclusive mode;

do $$
declare
  n int; v_pol record; v_comment text;
begin
  if to_regclass('public.contribution_links') is null or to_regclass('public.research_contributions') is null then
    raise exception 'CL_VISIBLE_READ precondition: contribution_links or research_contributions is missing; nothing changed';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.contribution_links'::regclass) then
    raise exception 'CL_VISIBLE_READ precondition: row level security is off on contribution_links; nothing changed';
  end if;
  select count(*) into n from pg_policy where polrelid = 'public.contribution_links'::regclass;
  if n <> 1 then
    raise exception 'CL_VISIBLE_READ precondition: expected exactly one policy on contribution_links, found % (changed since 14.11.2026); nothing changed', n;
  end if;
  select * into v_pol from pg_policy where polrelid = 'public.contribution_links'::regclass and polname = 'cl_public_read';
  if not found then
    raise exception 'CL_VISIBLE_READ precondition: policy cl_public_read does not exist; nothing changed';
  end if;
  v_comment := obj_description(v_pol.oid, 'pg_policy');
  if v_comment like 'CONTRIBUTION_LINKS_VISIBLE_MESSAGE_READ_V1 applied%' then
    raise exception 'CL_VISIBLE_READ: already applied (see the policy comment); nothing changed';
  end if;
  if v_pol.polcmd <> 'r' or v_pol.polpermissive is not true or v_pol.polroles <> array[0::oid] or v_pol.polwithcheck is not null
     or pg_get_expr(v_pol.polqual, v_pol.polrelid) <> 'true' then
    raise exception 'CL_VISIBLE_READ precondition: cl_public_read is not SELECT, permissive, TO PUBLIC, USING (true) as read on 14.11.2026; nothing changed';
  end if;
  -- Nobody but the owner and service_role may write: the rule below only governs reads.
  if has_table_privilege('anon', 'public.contribution_links', 'insert, update, delete, truncate')
     or has_table_privilege('authenticated', 'public.contribution_links', 'insert, update, delete, truncate') then
    raise exception 'CL_VISIBLE_READ precondition: anon or authenticated holds a write privilege on contribution_links; nothing changed';
  end if;
  if not has_table_privilege('anon', 'public.contribution_links', 'select') or not has_table_privilege('authenticated', 'public.contribution_links', 'select') then
    raise exception 'CL_VISIBLE_READ precondition: anon or authenticated has lost SELECT on contribution_links; nothing changed';
  end if;
  -- The new rule inherits research_contributions visibility, so that protection must be exactly the live one.
  if not (select relrowsecurity from pg_class where oid = 'public.research_contributions'::regclass) then
    raise exception 'CL_VISIBLE_READ precondition: row level security is off on research_contributions (the rule would expose every link); nothing changed';
  end if;
  select count(*) into n from pg_policy where polrelid = 'public.research_contributions'::regclass;
  if n <> 2 then
    raise exception 'CL_VISIBLE_READ precondition: expected exactly two policies on research_contributions, found % (changed since 14.11.2026); nothing changed', n;
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.research_contributions'::regclass and polname = 'rc_public_read'
       and polcmd = 'r' and polpermissive and polroles = array[0::oid] and polwithcheck is null
       and pg_get_expr(polqual, polrelid) = $q$((status = 'approved'::text) OR (author_user_id = auth.uid()))$q$) then
    raise exception 'CL_VISIBLE_READ precondition: rc_public_read on research_contributions is not the live definition; nothing changed';
  end if;
  if not exists (select 1 from pg_policy p where p.polrelid = 'public.research_contributions'::regclass and p.polname = 'research_contributions_admin_read'
       and p.polcmd = 'r' and p.polpermissive and p.polwithcheck is null
       and p.polroles = array[(select oid from pg_roles where rolname = 'authenticated')]
       and pg_get_expr(p.polqual, p.polrelid) = '( SELECT rd_is_admin() AS rd_is_admin)') then
    raise exception 'CL_VISIBLE_READ precondition: research_contributions_admin_read is not the live definition; nothing changed';
  end if;
end $$;

alter policy cl_public_read on public.contribution_links
  using (
    exists (select 1 from public.research_contributions rc where rc.id = contribution_links.from_contribution_id)
    and (
      contribution_links.target_type <> 'contribution'
      or exists (select 1 from public.research_contributions tc
                 where tc.id = (case when contribution_links.target_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                                     then contribution_links.target_id::uuid end))
    )
  );

do $$
declare
  n int; v_pol record; v_qual text;
begin
  select * into v_pol from pg_policy where polrelid = 'public.contribution_links'::regclass and polname = 'cl_public_read';
  v_qual := pg_get_expr(v_pol.polqual, v_pol.polrelid);
  if v_qual is null or v_qual = 'true' or v_qual not like '%research_contributions%' or v_qual not like '%from_contribution_id%'
     or v_qual not like '%target_type%' or v_qual not like '%target_id%' then
    raise exception 'CL_VISIBLE_READ postcondition: the policy expression is not the new one: %', v_qual;
  end if;
  if v_pol.polcmd <> 'r' or v_pol.polpermissive is not true or v_pol.polroles <> array[0::oid] or v_pol.polwithcheck is not null then
    raise exception 'CL_VISIBLE_READ postcondition: the policy kind changed';
  end if;
  select count(*) into n from pg_policy where polrelid = 'public.contribution_links'::regclass;
  if n <> 1 then raise exception 'CL_VISIBLE_READ postcondition: expected one policy, found %', n; end if;
  execute format('comment on policy cl_public_read on public.contribution_links is %L',
    'CONTRIBUTION_LINKS_VISIBLE_MESSAGE_READ_V1 applied ' || to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    || '; qual_md5=' || md5(v_qual) || '; before=USING (true)');
end $$;

commit;
