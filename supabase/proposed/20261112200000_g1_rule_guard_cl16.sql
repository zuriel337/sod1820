-- G1_RULE_GUARD_CL16 — PROPOSAL, NOT APPLIED. Runs only with ZURIEL's explicit approval for this exact file (CLAUDE.md 0.4), and only
-- AFTER the M0 SQL steps (foundation-closure-list.md section 2, track G'). Nothing in M0 depends on it, and no M0 file touches the objects
-- it changes: public.fn_rule_compaction_integrity_guard_v1() and the triggers of public.nodes.
-- Rollback: supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
-- Test (throwaway local PostgreSQL only): bash scripts/run-g1-rule-guard-sql-test.sh
-- Case evidence (live vs proposed, every case with an expected outcome): docs/reviews/m0-security-stabilization-20261112/enforcement-proof/
--
-- Extends the SAME live guard and its SAME trigger (EXTEND_EXISTING; no new function, table or store). For rule rows only
-- (type = 'rule'), it refuses: a type change of a rule row, a new id, an in-place change of rule_id / rule_version /
-- supersedes_version / identity_key, a body (description, label) or owner change without a new version (active or not, with no
-- exception: the historical owner of a version is never rewritten), DELETE of a rule row, TRUNCATE of nodes, a new or newly activated
-- v1 without an owner-creation verdict, a non-extension verdict without an approval reference, a REVIVAL of a retired family at any
-- version without a verdict AND an approval reference, an owner move in a new version without SUPERSEDE_EXISTING + approval, and an
-- approval reference that is not work_log:<uuid> of an existing work_log row naming the rule.
-- OWNER CHAIN (round 3): the owner must resolve AND its chain of owners must end at a valid root. A root is a self-owned active rule,
-- an existing project_codex.<slug>, or a document. Refused: an owner that is retired or does not exist, a chain that passes through a
-- retired or missing owner at any depth, a chain that returns to a rule already on it (a cycle), a chain longer than 16 links, and an
-- owner that is not a rule id, a project_codex.<slug> or a document path.
-- DOCUMENT OWNER (round 3): the database cannot see repository files. A document owner is REGISTERED when another active rule (or the
-- previous version of this rule) already names it as its owner; otherwise it is a NEW document owner and is AUTHORIZED only by an
-- approval reference (owner_routing.human_gate). That the file exists and is routed in the Owner Index is checked by the CI snapshot.
-- SUCCESSOR OF A RETIRED RULE (round 3, contracts session section 16.4): recorded in metadata.retired_routing_v1 only
-- ({successor, relation, approval_ref, ...}); the owner fields of the retired row stay as they were. The key is allowed on a retired
-- row only, and only on the LAST version of a family that has no active version: that is the one row every reader reads
-- (scripts/sql/g1_laws_snapshot.sql). A new or changed record needs a successor that resolves (an active rule, an existing codex
-- item or a document), a relation (REPLACED / COMPLETED / ABSORBED / PARTIAL) and an approval reference that resolves; a record
-- cannot be removed. A family that is revived keeps the old record as history; readers ignore it while the family is active.
-- metadata.rule_guard.deactivated_in_xact is written by the guard on a real retirement (is_active true -> false) and cannot be written
-- by anyone else: a version inserted in the SAME transaction is a supersession; anything else re-activating a retired family is a revival.
-- RULE ROW WITHOUT A rule_id (round 4): it cannot be created or be active, and its body is not rewritten. The live guard and the
-- round-3 proposal returned at once for such a row, while fn_active_method_rules (the assistant context) reads every active rule
-- row marked propagate without filtering rule_id. 18 such rows exist on 12.11.2026, all inactive; they stay as history.
-- Rows that are not rules are not blocked by anything new (the trigger also fires on their type/label/description/id/identity_key
-- updates and returns at once). TRUNCATE is table-wide: it cannot spare rule rows, so it is refused as a whole.
-- NOT ENFORCED HERE (stated, not hidden):
--   * the chain is checked when a rule row is written. Retiring an owner that active rules still route to is NOT refused by this guard
--     (a row trigger cannot tell a retirement from the first half of a supersession); the CI snapshot check refuses the resulting tree,
--     and the next write to such a child is refused here.
--   * HUMAN GATE: that the referenced work_log row really is ZURIEL's approval of this change; semantic duplication.
--   * anything done by a role that can DISABLE TRIGGER, replace this function, or write with session_replication_role = replica.
--     Read-only on 12.11.2026: public.nodes and this function are owned by postgres (the role of the SQL editor and of the MCP
--     execute_sql / apply_migration tools), so postgres can do the first two; service_role is not the owner and cannot; only a
--     superuser can set session_replication_role (no parameter grant exists).
-- Effect on reading: the trigger is replaced with CREATE OR REPLACE TRIGGER (no DROP), so readers of public.nodes are not blocked.
-- The guard reads public.work_log and public.project_codex as the writing role; a writer without SELECT on them is refused (fail-closed).
--
-- Full-match guards (same pattern as M0-B), FAIL-CLOSED (round 3): the state is read into non-null values ('(missing)' for an absent
-- trigger, the enabled flag next to the text) and the file continues ONLY on an exact match; every other state, including a missing or
-- disabled trigger, stops it before anything changes. CREATE OR REPLACE TRIGGER would silently re-enable a disabled trigger, so a
-- disabled trigger is never "repaired" here: it is drift and needs a decision.
--   BEFORE = live 12.11.2026: function md5 56b90b0ae0f9c5915b730314d13ca7a0, the trigger text below ENABLED (origin), no TRUNCATE trigger;
--   AFTER  = function md5 90b5917b1412be02f66d1f805241018c (as PostgreSQL prints it), the two trigger texts below, both ENABLED (origin).
--   The live state must be exactly BEFORE (then it is replaced) or exactly AFTER (already applied; re-created, a no-op). After the
--   change: AFTER exactly, and owner, privileges, SECURITY DEFINER (off), search_path and volatility equal what they were before.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temp table g1rg_before on commit drop as
  select md5(pg_get_functiondef(p.oid)) as def_md5, p.proowner, p.proacl::text as acl, p.prosecdef, p.proconfig, p.provolatile
    from pg_proc p where p.oid = to_regprocedure('public.fn_rule_compaction_integrity_guard_v1()');

do $$
declare
  v_md5 text; v_trg text; v_trunc text; v_before boolean; v_after boolean;
  c_before_md5 constant text := '56b90b0ae0f9c5915b730314d13ca7a0';
  c_after_md5 constant text := '90b5917b1412be02f66d1f805241018c';
  c_before_trg constant text := 'CREATE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1() [enabled=O]';
  c_after_trg constant text := 'CREATE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR DELETE OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version, description, label, type, id, identity_key ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1() [enabled=O]';
  c_after_trunc constant text := 'CREATE TRIGGER trg_rule_compaction_integrity_guard_v1_truncate BEFORE TRUNCATE ON public.nodes FOR EACH STATEMENT EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1() [enabled=O]';
begin
  select def_md5 into v_md5 from g1rg_before;
  if v_md5 is null then raise exception 'G1 rule guard precondition: public.fn_rule_compaction_integrity_guard_v1() not found; stop, nothing changed'; end if;
  -- a missing trigger reads as '(missing)', never as NULL; the enabled flag is part of the compared text
  v_trg := coalesce((select pg_get_triggerdef(t.oid) || ' [enabled=' || t.tgenabled::text || ']' from pg_trigger t where t.tgrelid = 'public.nodes'::regclass and t.tgname = 'trg_rule_compaction_integrity_guard_v1' and not t.tgisinternal), '(missing)');
  v_trunc := coalesce((select pg_get_triggerdef(t.oid) || ' [enabled=' || t.tgenabled::text || ']' from pg_trigger t where t.tgrelid = 'public.nodes'::regclass and t.tgname = 'trg_rule_compaction_integrity_guard_v1_truncate' and not t.tgisinternal), '(missing)');
  v_after := v_md5 = c_after_md5 and v_trg = c_after_trg and v_trunc = c_after_trunc;
  v_before := v_md5 = c_before_md5 and v_trg = c_before_trg and v_trunc = '(missing)';
  if v_after is true then
    raise notice 'G1 rule guard: already applied; re-creating the same objects (no-op)';
  elsif v_before is true then
    null; -- exactly the live 12.11.2026 state: continue
  else
    raise exception 'G1 rule guard drift: function md5 %, trigger %, truncate trigger % is neither the live state read on 12.11.2026 nor the applied state; stop', v_md5, v_trg, v_trunc;
  end if;
end $$;

CREATE OR REPLACE FUNCTION public.fn_rule_compaction_integrity_guard_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_prev public.nodes%rowtype;
  v_expected_prev integer;
  v_owner text;
  v_res text;
  v_gate text;
  v_activation boolean;
  v_revival boolean := false;
  v_xact text := pg_current_xact_id()::text;
  v_rr jsonb;
  v_rr_old jsonb;
  v_succ text;
  v_ref text;
  v_cur text;
  v_next text;
  v_seen text[];
  c_ref constant text := '^work_log:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  c_rule constant text := '^[a-z][a-z0-9_]*$';
  c_doc constant text := '^[A-Za-z0-9_./-]+\.md$';
begin
  if tg_level = 'STATEMENT' then
    raise exception 'TRUNCATE of public.nodes is refused (rule history must not be erased)';
  end if;
  if tg_op = 'DELETE' then
    if old.type = 'rule' then raise exception 'DELETE of rule % v% is refused (retire it with is_active=false instead)', old.rule_id, old.rule_version; end if;
    return old;
  end if;
  -- A rule row keeps its identity: no type change (it would leave every rule check, and then the DELETE check), no new id, no
  -- in-place change of rule_id, rule_version, supersedes_version or identity_key. A new version is a new row.
  if tg_op = 'UPDATE' and old.type = 'rule' then
    if new.type is distinct from 'rule' then
      raise exception 'rule % v% cannot change its type (retire it with is_active=false instead)', old.rule_id, old.rule_version;
    end if;
    if new.id is distinct from old.id then
      raise exception 'rule % v% cannot change its id', old.rule_id, old.rule_version;
    end if;
    if new.rule_id is distinct from old.rule_id or new.rule_version is distinct from old.rule_version
       or new.supersedes_version is distinct from old.supersedes_version or new.identity_key is distinct from old.identity_key then
      raise exception 'rule % v% cannot change its identity or version in place (a new version is a new row)', old.rule_id, old.rule_version;
    end if;
  end if;
  if new.type is distinct from 'rule' then return new; end if;
  -- A rule row WITHOUT a rule_id has no identity, version or owner, so nothing below could govern it; yet readers that do not
  -- filter rule_id (fn_active_method_rules feeds the assistant context from every active rule row marked propagate) would still
  -- read it. No such row may be created or be active; the legacy ones (18 inactive rows on 12.11.2026) stay as history.
  if new.rule_id is null then
    if tg_op = 'INSERT' or old.type is distinct from 'rule' then
      raise exception 'a rule row requires a rule_id (a rule without an identity cannot be governed)';
    end if;
    if coalesce(new.is_active,false) then
      raise exception 'a rule row without a rule_id cannot be active';
    end if;
    if old.description is distinct from new.description or old.label is distinct from new.label then
      raise exception 'rule row without a rule_id: body changed (history is not rewritten)';
    end if;
    return new;
  end if;
  -- metadata.rule_guard is written by this guard only: on a real retirement (is_active true -> false) it records the transaction,
  -- so that a new version inserted in the SAME transaction is a supersession and anything else is a revival.
  if tg_op = 'INSERT' or old.type is distinct from 'rule' then
    if coalesce(new.metadata,'{}'::jsonb) ? 'rule_guard' then
      raise exception 'rule % v%: metadata.rule_guard is written by the rule guard only', new.rule_id, new.rule_version;
    end if;
  elsif coalesce(old.is_active,false) and not coalesce(new.is_active,false) then
    new.metadata := coalesce(new.metadata,'{}'::jsonb) || jsonb_build_object('rule_guard', jsonb_build_object('deactivated_in_xact', v_xact));
  elsif (coalesce(new.metadata,'{}'::jsonb)->'rule_guard') is distinct from (coalesce(old.metadata,'{}'::jsonb)->'rule_guard') then
    raise exception 'rule % v%: metadata.rule_guard is written by the rule guard only', new.rule_id, new.rule_version;
  end if;
  -- body and owner are immutable within a version, active or not, with no exception: history is not rewritten. A successor of a
  -- retired rule is recorded in metadata.retired_routing_v1 (below), never by writing an owner onto the retired row.
  if tg_op = 'UPDATE' and old.type = 'rule' then
    if old.description is distinct from new.description or old.label is distinct from new.label then
      raise exception 'rule % v% body changed without a new version', new.rule_id, new.rule_version;
    end if;
    if (old.metadata#>>'{owner_routing,canonical_owner}') is distinct from (new.metadata#>>'{owner_routing,canonical_owner}')
       or (old.metadata#>>'{compaction_v1,canonical_owner}') is distinct from (new.metadata#>>'{compaction_v1,canonical_owner}') then
      raise exception 'rule % v% owner changed without a new version', new.rule_id, new.rule_version;
    end if;
  end if;
  -- successor routing of a RETIRED rule: metadata.retired_routing_v1. Allowed on a retired row only. A new or changed record needs a
  -- successor that resolves, a relation and an approval reference to an existing work_log row naming the rule. No removal.
  v_rr := coalesce(new.metadata,'{}'::jsonb)->'retired_routing_v1';
  if tg_op = 'UPDATE' and old.type = 'rule' then v_rr_old := coalesce(old.metadata,'{}'::jsonb)->'retired_routing_v1'; end if;
  if coalesce(new.is_active,false) then
    if v_rr is not null then
      raise exception 'rule % v%: retired_routing_v1 belongs to a retired row (an active rule cannot carry it)', new.rule_id, new.rule_version;
    end if;
  elsif v_rr is distinct from v_rr_old then
    if v_rr is null then
      raise exception 'rule % v%: retired_routing_v1 cannot be removed (record a new approved routing instead)', new.rule_id, new.rule_version;
    end if;
    -- one place for every reader: the row of the LAST version of a family that has no active version
    -- (scripts/sql/g1_laws_snapshot.sql reads exactly that row; a record anywhere else would never be read)
    if exists (select 1 from public.nodes r where r.type='rule' and r.rule_id=new.rule_id and r.is_active and r.id <> new.id) then
      raise exception 'rule % v%: retired_routing_v1 is recorded on a retired family only (the rule has an active version)', new.rule_id, new.rule_version;
    end if;
    if exists (select 1 from public.nodes r where r.type='rule' and r.rule_id=new.rule_id and r.rule_version > new.rule_version and r.id <> new.id) then
      raise exception 'rule % v%: retired_routing_v1 is recorded on the last version of the family only', new.rule_id, new.rule_version;
    end if;
    v_succ := case when jsonb_typeof(v_rr) = 'object' then nullif(v_rr->>'successor','') end;
    v_ref := case when jsonb_typeof(v_rr) = 'object' then nullif(v_rr->>'approval_ref','') end;
    if v_succ is null or v_succ = new.rule_id then
      raise exception 'rule % v%: retired_routing_v1 requires a successor other than the rule itself', new.rule_id, new.rule_version;
    end if;
    if (v_rr->>'relation') is null or (v_rr->>'relation') not in ('REPLACED','COMPLETED','ABSORBED','PARTIAL') then
      raise exception 'rule % v%: retired_routing_v1 requires a relation (REPLACED, COMPLETED, ABSORBED or PARTIAL)', new.rule_id, new.rule_version;
    end if;
    if v_succ ~ c_rule then
      if not exists (select 1 from public.nodes r where r.type='rule' and r.rule_id=v_succ and r.is_active) then
        raise exception 'rule % v%: retired_routing_v1 successor % is not an active rule', new.rule_id, new.rule_version, v_succ;
      end if;
    elsif v_succ like 'project_codex.%' then
      if not exists (select 1 from public.project_codex c where c.slug = substr(v_succ, 15)) then
        raise exception 'rule % v%: retired_routing_v1 successor % is a codex entry which does not exist', new.rule_id, new.rule_version, v_succ;
      end if;
    elsif v_succ !~ c_doc then
      raise exception 'rule % v%: retired_routing_v1 successor % is not a rule id, a project_codex.<slug> or a document path', new.rule_id, new.rule_version, v_succ;
    end if;
    if v_ref is null or v_ref !~ c_ref
       or not exists (select 1 from public.work_log w where w.id = substr(v_ref, 10)::uuid
                       and (position(new.rule_id in coalesce(w.topic,'')) > 0 or position(new.rule_id in coalesce(w.what_we_did,'')) > 0)) then
      raise exception 'rule % v%: retired_routing_v1 approval reference % does not resolve to a work_log record naming the rule', new.rule_id, new.rule_version, coalesce(v_ref,'(none)');
    end if;
  end if;
  if not coalesce(new.is_active,false) then return new; end if;

  if new.rule_version is null or new.rule_version < 1 then
    raise exception 'active rule % requires positive rule_version', new.rule_id;
  end if;

  if new.rule_version = 1 then
    if new.supersedes_version is not null then
      raise exception 'rule % v1 cannot supersede v%', new.rule_id,new.supersedes_version;
    end if;
  else
    select max(rule_version) into v_expected_prev
      from public.nodes
     where type='rule'
       and rule_id=new.rule_id
       and rule_version < new.rule_version
       and (tg_op <> 'UPDATE' or id <> new.id);

    if v_expected_prev is null
       or new.supersedes_version is null
       or new.supersedes_version <> v_expected_prev then
      raise exception 'rule % v% requires unambiguous immediate predecessor v% (got supersedes_version=%)',
        new.rule_id,new.rule_version,coalesce(v_expected_prev,-1),new.supersedes_version;
    end if;

    select * into v_prev
      from public.nodes
     where type='rule'
       and rule_id=new.rule_id
       and rule_version=new.supersedes_version;

    if v_prev.id is null then
      raise exception 'rule % predecessor v% unavailable',new.rule_id,new.supersedes_version;
    end if;

    if not (coalesce(new.metadata,'{}'::jsonb) ? 'g3_disposition_v1')
       or not (coalesce(new.metadata,'{}'::jsonb) ? 'compaction_v1')
       or not (coalesce(new.metadata,'{}'::jsonb) ? 'owner_routing') then
      if not (coalesce(v_prev.metadata,'{}'::jsonb) ? 'g3_disposition_v1')
         or not (coalesce(v_prev.metadata,'{}'::jsonb) ? 'compaction_v1')
         or not (coalesce(v_prev.metadata,'{}'::jsonb) ? 'owner_routing') then
        raise exception 'rule % predecessor v% lacks governed compaction/routing metadata',
          new.rule_id,new.supersedes_version;
      end if;

      new.metadata := coalesce(new.metadata,'{}'::jsonb);
      if not (new.metadata ? 'g3_disposition_v1') then
        new.metadata := jsonb_set(new.metadata,'{g3_disposition_v1}',v_prev.metadata->'g3_disposition_v1',true);
      end if;
      if not (new.metadata ? 'compaction_v1') then
        new.metadata := jsonb_set(new.metadata,'{compaction_v1}',v_prev.metadata->'compaction_v1',true);
      end if;
      if not (new.metadata ? 'owner_routing') then
        new.metadata := jsonb_set(new.metadata,'{owner_routing}',v_prev.metadata->'owner_routing',true);
      end if;
    end if;
  end if;

  if not (coalesce(new.metadata,'{}'::jsonb) ? 'g3_disposition_v1')
     or jsonb_typeof(new.metadata->'g3_disposition_v1') <> 'object'
     or nullif(new.metadata#>>'{g3_disposition_v1,classification}','') is null then
    raise exception 'active rule % v% requires valid g3_disposition_v1',new.rule_id,new.rule_version;
  end if;

  if not (new.metadata ? 'compaction_v1')
     or jsonb_typeof(new.metadata->'compaction_v1') <> 'object'
     or nullif(new.metadata#>>'{compaction_v1,canonical_owner}','') is null then
    raise exception 'active rule % v% requires valid compaction_v1 canonical_owner',new.rule_id,new.rule_version;
  end if;

  if not (new.metadata ? 'owner_routing')
     or jsonb_typeof(new.metadata->'owner_routing') <> 'object'
     or nullif(new.metadata#>>'{owner_routing,canonical_owner}','') is null then
    raise exception 'active rule % v% requires valid owner_routing canonical_owner',new.rule_id,new.rule_version;
  end if;

  if exists (
    select 1 from public.nodes n
     where n.type='rule'
       and n.rule_id=new.rule_id
       and n.is_active=true
       and (tg_op <> 'UPDATE' or n.id <> new.id)
  ) then
    raise exception 'rule % already has an active version',new.rule_id;
  end if;

  v_owner := new.metadata#>>'{owner_routing,canonical_owner}';
  v_res := new.metadata#>>'{owner_routing,resolution}';
  v_gate := nullif(new.metadata#>>'{owner_routing,human_gate}','');
  v_activation := tg_op = 'INSERT' or old.type is distinct from 'rule' or not coalesce(old.is_active,false);
  -- a REVIVAL re-activates a retired family: a row this guard saw retired in an earlier transaction, or a version above v1 whose
  -- predecessor was not retired in this same transaction (a supersession retires v(n) and inserts v(n+1) in one transaction).
  if v_activation then
    if tg_op = 'UPDATE' and old.type = 'rule' and (old.metadata#>>'{rule_guard,deactivated_in_xact}') is distinct from v_xact
       and (old.metadata#>>'{rule_guard,deactivated_in_xact}') is not null then
      v_revival := true;
    elsif new.rule_version > 1 and (v_prev.metadata#>>'{rule_guard,deactivated_in_xact}') is distinct from v_xact then
      v_revival := true;
    end if;
  end if;
  -- the owner resolves, and its chain of owners ends at a valid root: a self-owned active rule, an existing project_codex.<slug>,
  -- or a document. A retired or missing link at any depth, a cycle and an unrecognised owner form are refused.
  if v_owner <> new.rule_id then
    v_cur := v_owner; v_seen := array[new.rule_id];
    loop
      if v_cur like 'project_codex.%' then
        if not exists (select 1 from public.project_codex c where c.slug = substr(v_cur, 15)) then
          if v_cur = v_owner then raise exception 'rule % routes to codex entry % which does not exist', new.rule_id, v_cur; end if;
          raise exception 'rule % ownership chain reaches codex entry % which does not exist', new.rule_id, v_cur;
        end if;
        exit;
      elsif v_cur ~ c_doc then
        -- a document root. The DIRECT owner is checked here; a document deeper in the chain was checked when its own child was written.
        -- REGISTERED: another active rule, or this rule's previous version, already names it. Otherwise AUTHORIZED by an approval only.
        if v_cur = v_owner and v_activation and v_gate is null
           and not exists (select 1 from public.nodes r where r.type='rule' and r.is_active and r.id <> new.id
                            and (r.metadata#>>'{owner_routing,canonical_owner}') = v_owner)
           and not (new.rule_version > 1 and v_prev.id is not null and (v_prev.metadata#>>'{owner_routing,canonical_owner}') = v_owner) then
          raise exception 'rule % routes to document % which no active rule names as its owner; a new document owner requires owner_routing.human_gate', new.rule_id, v_owner;
        end if;
        exit;
      elsif v_cur !~ c_rule then
        raise exception 'rule % owner % is not a rule id, a project_codex.<slug> or a document path', new.rule_id, v_cur;
      end if;
      if v_cur = any(v_seen) then
        raise exception 'rule % ownership chain is a cycle (% returns to %)', new.rule_id, array_to_string(v_seen, ' -> '), v_cur;
      end if;
      if array_length(v_seen, 1) > 16 then
        raise exception 'rule % ownership chain is longer than 16 links (%)', new.rule_id, array_to_string(v_seen, ' -> ');
      end if;
      v_next := null;
      select r.metadata#>>'{owner_routing,canonical_owner}' into v_next from public.nodes r where r.type='rule' and r.rule_id=v_cur and r.is_active;
      if not found then
        if exists (select 1 from public.nodes r where r.type='rule' and r.rule_id=v_cur) then
          if v_cur = v_owner then raise exception 'rule % routes to retired owner %', new.rule_id, v_cur; end if;
          raise exception 'rule % ownership chain reaches retired owner % (through %)', new.rule_id, v_cur, array_to_string(v_seen[2:], ' -> ');
        end if;
        if v_cur = v_owner then raise exception 'rule % routes to owner % which does not exist', new.rule_id, v_cur; end if;
        raise exception 'rule % ownership chain reaches owner % which does not exist (through %)', new.rule_id, v_cur, array_to_string(v_seen[2:], ' -> ');
      end if;
      if nullif(v_next,'') is null then
        raise exception 'rule % ownership chain reaches % which records no owner', new.rule_id, v_cur;
      end if;
      v_seen := v_seen || v_cur;
      exit when v_next = v_cur; -- a self-owned active rule: a valid root
      v_cur := v_next;
    end loop;
  end if;
  -- an approval reference must resolve to an existing work_log row that names this rule (authenticity: human gate)
  if v_gate is not null and (v_gate !~ c_ref
       or not exists (select 1 from public.work_log w where w.id = substr(v_gate, 10)::uuid
                       and (position(new.rule_id in coalesce(w.topic,'')) > 0 or position(new.rule_id in coalesce(w.what_we_did,'')) > 0))) then
    raise exception 'rule % approval reference % does not resolve to a work_log record naming the rule', new.rule_id, v_gate;
  end if;
  -- a revival needs the same decision as a new family AND an approval reference, whatever the version
  if v_revival then
    if v_res is null or v_res not in ('EXTEND_EXISTING_SCOPED_CHILD','SUPERSEDE_EXISTING','GENUINELY_NEW_DOMAIN','HUMAN_GATE_APPROVED_NEW_SCOPED_RULE') then
      raise exception 'retired rule % v% re-activated without an owner-creation verdict (owner_routing.resolution)', new.rule_id, new.rule_version;
    end if;
    if v_gate is null then
      raise exception 'retired rule % v% re-activated without owner_routing.human_gate', new.rule_id, new.rule_version;
    end if;
  end if;
  -- a NEW or newly activated family (v1 becoming active by INSERT or by UPDATE) needs a verdict; a new owner needs the approval
  if new.rule_version = 1 and v_activation then
    if v_res is null or v_res not in ('EXTEND_EXISTING_SCOPED_CHILD','SUPERSEDE_EXISTING','GENUINELY_NEW_DOMAIN','HUMAN_GATE_APPROVED_NEW_SCOPED_RULE') then
      raise exception 'new rule family % requires an owner-creation verdict (owner_routing.resolution)', new.rule_id;
    end if;
    if v_res = 'EXTEND_EXISTING_SCOPED_CHILD' and v_owner = new.rule_id then
      raise exception 'new rule family % cannot extend itself', new.rule_id;
    end if;
    if v_res <> 'EXTEND_EXISTING_SCOPED_CHILD' and v_gate is null then
      raise exception 'new rule family % (%) requires owner_routing.human_gate', new.rule_id, v_res;
    end if;
  end if;
  -- a new version (contract change) moves its owner only with SUPERSEDE_EXISTING and an approval reference
  if new.rule_version > 1 and v_prev.id is not null
     and v_owner is distinct from (v_prev.metadata#>>'{owner_routing,canonical_owner}')
     and not (v_res = 'SUPERSEDE_EXISTING' and v_gate is not null) then
    raise exception 'rule % v% changes its canonical owner without SUPERSEDE_EXISTING + human_gate', new.rule_id, new.rule_version;
  end if;

  return new;
end
$function$;

CREATE OR REPLACE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR DELETE OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version, description, label, type, id, identity_key ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1();
CREATE OR REPLACE TRIGGER trg_rule_compaction_integrity_guard_v1_truncate BEFORE TRUNCATE ON public.nodes FOR EACH STATEMENT EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1();

do $$
declare b g1rg_before%rowtype; a record;
begin
  select * into b from g1rg_before;
  select md5(pg_get_functiondef(p.oid)) as def_md5, p.proowner, p.proacl::text as acl, p.prosecdef, p.proconfig, p.provolatile into a
    from pg_proc p where p.oid = 'public.fn_rule_compaction_integrity_guard_v1()'::regprocedure;
  if a.def_md5 is distinct from '90b5917b1412be02f66d1f805241018c' then raise exception 'G1 rule guard postcondition: body md5 % is not the reviewed body', a.def_md5; end if;
  if a.proowner <> b.proowner or a.acl is distinct from b.acl or a.prosecdef <> b.prosecdef or a.proconfig is distinct from b.proconfig or a.provolatile <> b.provolatile then
    raise exception 'G1 rule guard postcondition: owner, privileges, SECURITY DEFINER, search_path or volatility changed';
  end if;
  if coalesce((select pg_get_triggerdef(t.oid) || ' [enabled=' || t.tgenabled::text || ']' from pg_trigger t where t.tgrelid = 'public.nodes'::regclass and t.tgname = 'trg_rule_compaction_integrity_guard_v1' and not t.tgisinternal), '(missing)') <> 'CREATE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR DELETE OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version, description, label, type, id, identity_key ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1() [enabled=O]'
     or coalesce((select pg_get_triggerdef(t.oid) || ' [enabled=' || t.tgenabled::text || ']' from pg_trigger t where t.tgrelid = 'public.nodes'::regclass and t.tgname = 'trg_rule_compaction_integrity_guard_v1_truncate' and not t.tgisinternal), '(missing)') <> 'CREATE TRIGGER trg_rule_compaction_integrity_guard_v1_truncate BEFORE TRUNCATE ON public.nodes FOR EACH STATEMENT EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1() [enabled=O]' then
    raise exception 'G1 rule guard postcondition: the triggers are not exactly the reviewed ones (enabled)';
  end if;
end $$;

commit;
