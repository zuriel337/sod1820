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
begin
  if new.type is distinct from 'rule'
     or not coalesce(new.is_active,false)
     or new.rule_id is null then
    return new;
  end if;

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

  -- PROPOSED EXTENSION (same function, same trigger; prototype only, NOT applied anywhere)
  v_owner := new.metadata#>>'{owner_routing,canonical_owner}';
  v_res := new.metadata#>>'{owner_routing,resolution}';
  -- (a) no routing to a retired owner (a rule family that exists but has no active version)
  if v_owner ~ '^[a-z0-9_]+$' and v_owner <> new.rule_id
     and exists (select 1 from public.nodes r where r.type='rule' and r.rule_id=v_owner)
     and not exists (select 1 from public.nodes r where r.type='rule' and r.rule_id=v_owner and r.is_active) then
    raise exception 'rule % routes to retired owner %', new.rule_id, v_owner;
  end if;
  -- (b) a NEW rule family needs an explicit owner-creation verdict; a new owner needs the approval reference
  if tg_op = 'INSERT' and new.rule_version = 1 then
    if v_res is null or v_res not in ('EXTEND_EXISTING_SCOPED_CHILD','SUPERSEDE_EXISTING','GENUINELY_NEW_DOMAIN','HUMAN_GATE_APPROVED_NEW_SCOPED_RULE') then
      raise exception 'new rule family % requires an owner-creation verdict (owner_routing.resolution)', new.rule_id;
    end if;
    if v_res = 'EXTEND_EXISTING_SCOPED_CHILD'
       and (v_owner = new.rule_id or not exists (select 1 from public.nodes r where r.type='rule' and r.rule_id=v_owner and r.is_active)) then
      raise exception 'new rule family % extends % which is not an active owner', new.rule_id, v_owner;
    end if;
    if v_res <> 'EXTEND_EXISTING_SCOPED_CHILD' and nullif(new.metadata#>>'{owner_routing,human_gate}','') is null then
      raise exception 'new rule family % (%) requires owner_routing.human_gate', new.rule_id, v_res;
    end if;
  end if;
  -- (c) a new version of an existing rule (a contract change) does not move its canonical owner silently
  if new.rule_version > 1 and v_prev.id is not null
     and v_owner is distinct from (v_prev.metadata#>>'{owner_routing,canonical_owner}')
     and not (v_res = 'SUPERSEDE_EXISTING' and nullif(new.metadata#>>'{owner_routing,human_gate}','') is not null) then
    raise exception 'rule % v% changes its canonical owner without SUPERSEDE_EXISTING + human_gate', new.rule_id, new.rule_version;
  end if;

  return new;
end
$function$;
