-- Research history protection v2: append-only revisions, no TRUNCATE, no DELETE, lawful erasure by REDACTION through one narrow function (PROPOSAL, NOT APPLIED).
-- Apply only on an explicit ZURIEL approval of this exact file (CLAUDE.md 0.4: DDL, grants and policies on the shared DB). Apply as ONE transaction.
-- Package: docs/reviews/db-capacity-audit-20261126/APPROVAL-REQUESTS-20261126.md.
--
-- Owner: research_intake_foundation_contract_law v14 (ADDITIVE_RESEARCH_HISTORY / revision lineage). EXTEND_EXISTING: triggers on the existing tables
-- plus one trigger function and one narrow erasure function; no new table, store or cron; nothing is deleted or rewritten when this file is applied.
-- Evidence read live on 26.11.2026:
--   * research_object_revisions (44,084 rows) has RLS (admin read only) but service_role holds DELETE, UPDATE and TRUNCATE on it, there is NO trigger on
--     it, and nothing but fn_research_object_correct (SECURITY DEFINER) updates it after the snapshot trigger writes it (successor_id NULL -> value).
--   * research_objects: service_role holds TRUNCATE (row triggers do not fire on TRUNCATE, so the delete snapshot is bypassed).
--   * The only user-callable delete of research_objects is fn_remove_family_member (owner-scoped, authorization-checked): NOT blocked, it keeps
--     writing its 'delete' revision.
-- What this does (decision 337):
--   1. fn_research_history_protect(): TRUNCATE of research_object_revisions / research_objects and DELETE of a revision are refused ALWAYS, with no
--      switch, no setting and no exception. UPDATE of a revision is refused except (a) the one sanctioned successor_id link (NULL -> value, every other
--      column identical) and (b) a REDACTION of personal-data columns performed inside fn_research_history_erase_person_v1 (below).
--   2. LAWFUL ERASURE without deleting research history: fn_research_history_erase_person_v1(person, written basis) replaces the personal content of that
--      person's revisions (snapshot body, statement text, claim/source hashes, actor id) by a stub that keeps only {id, kind, status} and "erased": true. The
--      revision rows, their ids, object ids, change kinds, timestamps and links stay: the history of WHAT happened survives, the personal data does not.
--   3. Who can trigger the redaction path: (i) it needs the transaction-local setting app.research_history_redaction = 'on', which only that function sets,
--      AND (ii) the trigger inspects the PL/pgSQL call stack and accepts it only when fn_research_history_erase_person_v1 is on it, AND (iii) the function
--      itself refuses anyone but service_role, a database admin (rd_is_admin) or the postgres session, and EXECUTE is granted to service_role only, AND
--      (iv) a written basis of at least 20 characters is required and a work_log row (count + hash of the person id, never the person) is written.
--      A plain "set app...=on" by any role is useless: DELETE never has a bypass, and UPDATE outside the function is still refused.
--   4. REVOKE UPDATE, DELETE, TRUNCATE on research_object_revisions and TRUNCATE on research_objects FROM service_role. SELECT/INSERT stay.
-- Not wired here: delete_my_account (it relies on FK SET NULL and does not touch revisions). Calling the erasure function from account deletion, and
-- whether redaction of statement text satisfies the privacy basis, are separate decisions (privacy owner / ZURIEL).
-- Detection: a refused statement raises SQLSTATE 42501 with 'research_history_protected' in the Postgres log (Supabase postgres_logs); the aborted
-- transaction cannot persist a log row. Residual risk: the table owner / superuser can disable a trigger or define a look-alike function; that is full
-- compromise, covered only by restore proof (system_suggestions_law v7 item 39).
-- Rollback: 20261126150000_research_history_protection_ROLLBACK.sql.
create or replace function public.fn_research_history_protect()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_ctx text;
  c_personal constant text[] := array['before_snapshot','statement_before','research_object_source_uid','research_object_claim_uid','actor'];
begin
  if TG_OP = 'UPDATE' and TG_TABLE_NAME = 'research_object_revisions' then
    -- (a) the one sanctioned link (nested on purpose: plpgsql does not promise short-circuit evaluation)
    if OLD.successor_id is null and NEW.successor_id is not null
       and (to_jsonb(NEW) - 'successor_id') = (to_jsonb(OLD) - 'successor_id') then
      return NEW;
    end if;
    -- (b) redaction of personal data, only inside the approved erasure function, and only of the personal columns
    if coalesce(current_setting('app.research_history_redaction', true), '') = 'on' then
      get diagnostics v_ctx = pg_context;
      if position('fn_research_history_erase_person_v1' in v_ctx) > 0
         and (to_jsonb(NEW) - c_personal) = (to_jsonb(OLD) - c_personal) then
        return NEW;
      end if;
    end if;
  end if;
  raise exception 'research_history_protected: % on public.% is not allowed (research history is append-only)', TG_OP, TG_TABLE_NAME
    using errcode = '42501';
end;
$function$;

revoke all on function public.fn_research_history_protect() from public, anon, authenticated;

create or replace function public.fn_research_history_erase_person_v1(p_person_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_n integer;
begin
  if p_person_id is null then raise exception 'person required'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 20 then raise exception 'a written legal basis of at least 20 characters is required'; end if;
  if not (coalesce(auth.role(), '') = 'service_role' or session_user = 'postgres' or coalesce(public.rd_is_admin(), false)) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  perform set_config('app.research_history_redaction', 'on', true);
  update public.research_object_revisions r
     set before_snapshot = jsonb_build_object('erased', true, 'erased_at', now(),
           'kept', jsonb_build_object('id', r.before_snapshot -> 'id', 'kind', r.before_snapshot -> 'kind', 'status', r.before_snapshot -> 'status')),
         statement_before = null,
         research_object_source_uid = null,
         research_object_claim_uid = null,
         actor = null
   where r.before_snapshot ->> 'owner_person_id' = p_person_id::text
     and coalesce((r.before_snapshot ->> 'erased')::boolean, false) = false;
  get diagnostics v_n = row_count;
  perform set_config('app.research_history_redaction', '', true);

  insert into public.work_log (session_date, topic, what_we_did, status, open_threads)
  values (current_date, 'מחיקת מידע אישי מהיסטוריית מחקר (redaction)',
          format('הושמטו נתונים אישיים ב־%s גרסאות היסטוריה (שורות, מזהים וחותמות זמן נשמרו). מזהה אדם (hash): %s.', v_n, md5(p_person_id::text)),
          'done', 'בסיס כתוב (ללא מידע אישי): ' || left(btrim(p_reason), 200));
  return jsonb_build_object('ok', true, 'revisions_redacted', v_n);
end;
$function$;

revoke all on function public.fn_research_history_erase_person_v1(uuid, text) from public, anon, authenticated;
grant execute on function public.fn_research_history_erase_person_v1(uuid, text) to service_role;

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
