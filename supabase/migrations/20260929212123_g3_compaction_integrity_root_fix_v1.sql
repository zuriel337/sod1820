-- G3 compaction integrity root fix.
-- EXTEND_EXISTING public.nodes rule-version path; no registry/store/system.
-- Preserve all historical rows. Reconcile only active-version flags + governed routing metadata.

update public.nodes
set is_active=false
where type='rule'
  and rule_id='platform_tiers_law'
  and rule_version in (4);

update public.nodes
set is_active=false
where type='rule'
  and rule_id='research_intake_foundation_contract_law'
  and rule_version in (9,10,11,12);

update public.nodes
set is_active=false
where type='rule'
  and rule_id='writer_material_home_law'
  and rule_version in (2,3,4);

do $$
declare
  r record;
  v_src public.nodes%rowtype;
  v_dst public.nodes%rowtype;
  v_meta jsonb;
begin
  for r in
    select * from (values
      ('golden_entity_law'::text,4,3),
      ('platform_tiers_law',5,2),
      ('raziel_companion_layer_law',3,2),
      ('research_intake_foundation_contract_law',13,11),
      ('sod1820_canonical_identity_law',4,1),
      ('writer_material_home_law',5,2)
    ) x(rule_id,dst_version,src_version)
  loop
    select * into v_src
    from public.nodes
    where type='rule' and rule_id=r.rule_id and rule_version=r.src_version;

    select * into v_dst
    from public.nodes
    where type='rule' and rule_id=r.rule_id and rule_version=r.dst_version;

    if v_src.id is null or v_dst.id is null then
      raise exception 'compaction repair missing row % src=% dst=%', r.rule_id,r.src_version,r.dst_version;
    end if;
    if not (v_src.metadata ? 'g3_disposition_v1')
       or not (v_src.metadata ? 'compaction_v1')
       or not (v_src.metadata ? 'owner_routing') then
      raise exception 'verified ancestor lacks governed metadata for % v%', r.rule_id,r.src_version;
    end if;

    v_meta := coalesce(v_dst.metadata,'{}'::jsonb);
    if not (v_meta ? 'g3_disposition_v1') then
      v_meta := jsonb_set(v_meta,'{g3_disposition_v1}',v_src.metadata->'g3_disposition_v1',true);
    end if;
    if not (v_meta ? 'compaction_v1') then
      v_meta := jsonb_set(v_meta,'{compaction_v1}',v_src.metadata->'compaction_v1',true);
    end if;
    if not (v_meta ? 'owner_routing') then
      v_meta := jsonb_set(v_meta,'{owner_routing}',v_src.metadata->'owner_routing',true);
    end if;

    update public.nodes
       set metadata=v_meta,
           supersedes_version=case
             when r.rule_id='platform_tiers_law' and r.dst_version=5 then 4
             else supersedes_version
           end
     where id=v_dst.id;
  end loop;
end $$;

create or replace function public.fn_rule_compaction_integrity_guard_v1()
returns trigger
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
declare
  v_prev public.nodes%rowtype;
  v_expected_prev integer;
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

  return new;
end
$$;

revoke all on function public.fn_rule_compaction_integrity_guard_v1() from public, anon, authenticated;

drop trigger if exists trg_rule_compaction_integrity_guard_v1 on public.nodes;
create trigger trg_rule_compaction_integrity_guard_v1
before insert or update of is_active,metadata,rule_id,rule_version,supersedes_version
on public.nodes
for each row
execute function public.fn_rule_compaction_integrity_guard_v1();

create unique index if not exists nodes_one_active_rule_per_id_uidx
  on public.nodes(rule_id)
  where type='rule' and is_active=true and rule_id is not null;
