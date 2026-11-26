-- Rollback of 20261126150000_research_history_protection_PROPOSAL.sql (NOT APPLIED; only after an explicit ZURIEL approval).
-- Restores the privileges read live on 26.11.2026 (service_role: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on both
-- tables) and removes the three triggers and the function. Revision rows are never touched. Apply as ONE transaction.
drop trigger if exists trg_research_revisions_append_only on public.research_object_revisions;
drop trigger if exists trg_research_revisions_no_truncate on public.research_object_revisions;
drop trigger if exists trg_research_objects_no_truncate on public.research_objects;
drop function if exists public.fn_research_history_protect();
grant update, delete, truncate on public.research_object_revisions to service_role;
grant truncate on public.research_objects to service_role;
