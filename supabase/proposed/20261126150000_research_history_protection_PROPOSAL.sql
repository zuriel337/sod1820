-- Research history protection: append-only revisions, no TRUNCATE of research tables (PROPOSAL, NOT APPLIED).
-- Apply only on an explicit ZURIEL approval of this exact file (CLAUDE.md 0.4: DDL, grants and policies on the shared DB).
-- Apply as ONE transaction. Package: docs/reviews/db-capacity-audit-20261126/PART3-DECISION-337.md section 7.
--
-- Owner: research_intake_foundation_contract_law v14 (ADDITIVE_RESEARCH_HISTORY / revision lineage). EXTEND_EXISTING: triggers on the
-- existing tables and one trigger function; no new table, store or cron; nothing is deleted or rewritten.
-- Evidence read live on 26.11.2026:
--   * research_object_revisions (44,084 rows) has RLS (admin read only) but service_role holds DELETE, UPDATE and TRUNCATE on it,
--     there is NO trigger on it, and no function other than fn_research_object_correct writes to it after the snapshot trigger.
--   * research_objects: service_role holds TRUNCATE (row triggers do not fire on TRUNCATE, so the delete snapshot is bypassed).
--   * The only sanctioned UPDATE of a revision is fn_research_object_correct setting successor_id from NULL to the new id.
--   * The only user-callable delete of research_objects is fn_remove_family_member (owner-scoped, authorization-checked); it is NOT
--     blocked here: object deletes stay allowed and keep writing their 'delete' revision.
-- What this does:
--   1. fn_research_history_protect(): refuses UPDATE/DELETE on research_object_revisions and TRUNCATE on research_object_revisions and
--      research_objects, EXCEPT (a) the one successor_id NULL -> value link, with every other column unchanged, and (b) a transaction
--      that sets app.allow_revision_erasure = 'on' (reserved for an approved privacy-erasure path; no such path is created here).
--   2. Triggers: trg_research_revisions_append_only (row, UPDATE/DELETE), trg_research_revisions_no_truncate and
--      trg_research_objects_no_truncate (statement, TRUNCATE).
--   3. REVOKE UPDATE, DELETE, TRUNCATE on research_object_revisions and TRUNCATE on research_objects FROM service_role. SELECT/INSERT
--      stay. SECURITY DEFINER functions (the snapshot trigger, fn_research_object_correct) run as owner and are unaffected.
-- Detection: a blocked statement raises SQLSTATE 42501 with the text 'research_history_protected' in the Postgres log
-- (Supabase logs, postgres_logs). A blocked statement cannot persist its own log row (the transaction aborts).
-- Residual risk (stated, not solved here): the table owner / superuser can disable a trigger or drop the table; restore proof stays
-- under system_suggestions_law v7 item 39. A privacy erasure of an account's research objects does not touch their revisions today
-- (delete_my_account relies on FK SET NULL), so personal data may remain in snapshots: a separate decision for ZURIEL.
-- Rollback: 20261126150000_research_history_protection_ROLLBACK.sql.
create or replace function public.fn_research_history_protect()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
begin
  if coalesce(current_setting('app.allow_revision_erasure', true), '') = 'on' then
    if TG_OP = 'DELETE' then return OLD; elsif TG_OP = 'UPDATE' then return NEW; else return null; end if;
  end if;
  if TG_OP = 'UPDATE' and TG_TABLE_NAME = 'research_object_revisions' then
    -- nested on purpose: OLD.successor_id exists only for this table and plpgsql does not promise short-circuit evaluation
    if OLD.successor_id is null and NEW.successor_id is not null
       and (to_jsonb(NEW) - 'successor_id') = (to_jsonb(OLD) - 'successor_id') then
      return NEW;
    end if;
  end if;
  raise exception 'research_history_protected: % on public.% is not allowed (research history is append-only)', TG_OP, TG_TABLE_NAME
    using errcode = '42501';
end;
$function$;

revoke all on function public.fn_research_history_protect() from public, anon, authenticated;

drop trigger if exists trg_research_revisions_append_only on public.research_object_revisions;
create trigger trg_research_revisions_append_only
  before update or delete on public.research_object_revisions
  for each row execute function public.fn_research_history_protect();

drop trigger if exists trg_research_revisions_no_truncate on public.research_object_revisions;
create trigger trg_research_revisions_no_truncate
  before truncate on public.research_object_revisions
  for each statement execute function public.fn_research_history_protect();

drop trigger if exists trg_research_objects_no_truncate on public.research_objects;
create trigger trg_research_objects_no_truncate
  before truncate on public.research_objects
  for each statement execute function public.fn_research_history_protect();

revoke update, delete, truncate on public.research_object_revisions from service_role;
revoke truncate on public.research_objects from service_role;
