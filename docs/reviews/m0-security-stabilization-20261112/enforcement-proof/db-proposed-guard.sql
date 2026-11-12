-- PROTOTYPE ONLY (evidence; NOT a migration, NOT applied anywhere). The proposed extension of the SAME live guard
-- public.fn_rule_compaction_integrity_guard_v1() and its SAME trigger, plus one statement-level TRUNCATE trigger on the same function.
-- Why TRUNCATE needs its own trigger object: a row trigger never fires on TRUNCATE (PostgreSQL); the only alternatives are revoking
-- TRUNCATE from service_role (a permission change) or accepting the gap. Both are listed in foundation-closure-list.md (B4 / CL-16).
-- TECHNICAL (enforced here): lineage and one active version (live); owner resolves (active rule or existing project_codex slug; a file
-- path cannot be checked in the database and is left to the CI snapshot check); no retired owner; a new or re-activated family needs a
-- verdict; a new owner (verdict other than EXTEND_EXISTING_SCOPED_CHILD) and an owner move need owner_routing.human_gate =
-- work_log:<uuid> of an EXISTING work_log row that names the rule; no owner change and no body (description/label) change without a
-- new version; no DELETE of a rule row; no TRUNCATE of nodes.
-- HUMAN GATE (not enforceable here): that the referenced work_log row really is ZURIEL's approval of exactly this change; semantic
-- duplication of responsibility; anything done by a role that can DISABLE TRIGGER or replace this function (DDL privileges).
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
begin
  if tg_level = 'STATEMENT' then
    raise exception 'TRUNCATE of public.nodes is refused (rule history must not be erased)';
  end if;
  if tg_op = 'DELETE' then
    if old.type = 'rule' then raise exception 'DELETE of rule % v% is refused (retire it with is_active=false instead)', old.rule_id, old.rule_version; end if;
    return old;
  end if;
  if new.type is distinct from 'rule' or new.rule_id is null then return new; end if;
  -- body and owner are immutable within a version, active or not (history is not rewritten)
  if tg_op = 'UPDATE' and old.type = 'rule' and old.rule_id = new.rule_id and old.rule_version = new.rule_version then
    if old.description is distinct from new.description or old.label is distinct from new.label then
      raise exception 'rule % v% body changed without a new version', new.rule_id, new.rule_version;
    end if;
    if (old.metadata#>>'{owner_routing,canonical_owner}') is distinct from (new.metadata#>>'{owner_routing,canonical_owner}')
       or (old.metadata#>>'{compaction_v1,canonical_owner}') is distinct from (new.metadata#>>'{compaction_v1,canonical_owner}') then
      raise exception 'rule % v% owner changed without a new version', new.rule_id, new.rule_version;
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
  v_activation := tg_op = 'INSERT' or not coalesce(old.is_active,false);
  -- the owner resolves: a rule-like owner must be an active rule (or the rule itself); a project_codex.<slug> owner must exist
  if v_owner ~ '^[a-z][a-z0-9_]*$' and v_owner <> new.rule_id then
    if exists (select 1 from public.nodes r where r.type='rule' and r.rule_id=v_owner)
       and not exists (select 1 from public.nodes r where r.type='rule' and r.rule_id=v_owner and r.is_active) then
      raise exception 'rule % routes to retired owner %', new.rule_id, v_owner;
    end if;
    if not exists (select 1 from public.nodes r where r.type='rule' and r.rule_id=v_owner and r.is_active) then
      raise exception 'rule % routes to owner % which does not exist', new.rule_id, v_owner;
    end if;
  elsif v_owner like 'project_codex.%' and not exists (select 1 from public.project_codex c where c.slug = substr(v_owner, 15)) then
    raise exception 'rule % routes to codex entry % which does not exist', new.rule_id, v_owner;
  end if;
  -- an approval reference must resolve to an existing work_log row that names this rule (authenticity: human gate)
  if v_gate is not null and (v_gate !~ '^work_log:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or not exists (select 1 from public.work_log w where w.id = substr(v_gate, 10)::uuid
                       and (position(new.rule_id in coalesce(w.topic,'')) > 0 or position(new.rule_id in coalesce(w.what_we_did,'')) > 0))) then
    raise exception 'rule % approval reference % does not resolve to a work_log record naming the rule', new.rule_id, v_gate;
  end if;
  -- a NEW or RE-ACTIVATED family (v1 becoming active by INSERT or by UPDATE) needs a verdict; a new owner needs the approval
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
CREATE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version, description, label OR DELETE
  ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1();
CREATE TRIGGER trg_rule_compaction_integrity_guard_v1_truncate BEFORE TRUNCATE ON public.nodes FOR EACH STATEMENT EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1();
