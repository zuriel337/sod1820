-- ROLLBACK of 20261112200000_g1_rule_guard_cl16.sql — PROPOSAL, NOT APPLIED. Runs only with ZURIEL's explicit approval (CLAUDE.md 0.4).
-- Restores the live 12.11.2026 state exactly: the function body (md5 56b90b0ae0f9c5915b730314d13ca7a0), the original trigger and no
-- TRUNCATE trigger. Full-match guards: the state must be exactly AFTER (then restored) or exactly BEFORE (already rolled back; a no-op).
-- A missing function stops it and nothing is created; any other state (drift) stops it before anything changes.
-- Not undone: metadata.rule_guard stamps written on retirements while the extension was applied stay as audit metadata (the live guard
-- ignores the key); removing them would be a separate data change that needs its own approval.
-- Lock: DROP TRIGGER of the TRUNCATE trigger takes a brief exclusive lock on public.nodes (lock_timeout 5s).
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temp table g1rg_before on commit drop as
  select md5(pg_get_functiondef(p.oid)) as def_md5, p.proowner, p.proacl::text as acl, p.prosecdef, p.proconfig, p.provolatile
    from pg_proc p where p.oid = to_regprocedure('public.fn_rule_compaction_integrity_guard_v1()');

do $$
declare v_md5 text; v_trg text; v_trunc text;
begin
  select def_md5 into v_md5 from g1rg_before;
  if v_md5 is null then raise exception 'G1 rule guard rollback: public.fn_rule_compaction_integrity_guard_v1() not found; stop, nothing created'; end if;
  select pg_get_triggerdef(t.oid) into v_trg from pg_trigger t where t.tgrelid = 'public.nodes'::regclass and t.tgname = 'trg_rule_compaction_integrity_guard_v1';
  select pg_get_triggerdef(t.oid) into v_trunc from pg_trigger t where t.tgrelid = 'public.nodes'::regclass and t.tgname = 'trg_rule_compaction_integrity_guard_v1_truncate';
  if v_md5 = '56b90b0ae0f9c5915b730314d13ca7a0' and v_trg = 'CREATE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1()' and v_trunc is null then
    raise notice 'G1 rule guard rollback: already the live 12.11.2026 state; re-creating it (no-op)';
  elsif not (v_md5 = '8a75cb63eecfbc61e70d85deb6a1fe51' and v_trg = 'CREATE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR DELETE OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version, description, label, type, id, identity_key ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1()' and v_trunc = 'CREATE TRIGGER trg_rule_compaction_integrity_guard_v1_truncate BEFORE TRUNCATE ON public.nodes FOR EACH STATEMENT EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1()') then
    raise exception 'G1 rule guard rollback drift: function md5 %, trigger %, truncate trigger % is neither the applied state nor the live 12.11.2026 state; stop', v_md5, coalesce(v_trg, '(none)'), coalesce(v_trunc, '(none)');
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
$function$;

CREATE OR REPLACE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1();
DROP TRIGGER IF EXISTS trg_rule_compaction_integrity_guard_v1_truncate ON public.nodes;

do $$
declare b g1rg_before%rowtype; a record;
begin
  select * into b from g1rg_before;
  select md5(pg_get_functiondef(p.oid)) as def_md5, p.proowner, p.proacl::text as acl, p.prosecdef, p.proconfig, p.provolatile into a
    from pg_proc p where p.oid = 'public.fn_rule_compaction_integrity_guard_v1()'::regprocedure;
  if a.def_md5 <> '56b90b0ae0f9c5915b730314d13ca7a0' then raise exception 'G1 rule guard rollback postcondition: body md5 % is not the live 12.11.2026 body', a.def_md5; end if;
  if a.proowner <> b.proowner or a.acl is distinct from b.acl or a.prosecdef <> b.prosecdef or a.proconfig is distinct from b.proconfig or a.provolatile <> b.provolatile then
    raise exception 'G1 rule guard rollback postcondition: owner, privileges, SECURITY DEFINER, search_path or volatility changed';
  end if;
  if (select pg_get_triggerdef(t.oid) from pg_trigger t where t.tgrelid = 'public.nodes'::regclass and t.tgname = 'trg_rule_compaction_integrity_guard_v1' and t.tgenabled = 'O') is distinct from 'CREATE TRIGGER trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version ON public.nodes FOR EACH ROW EXECUTE FUNCTION fn_rule_compaction_integrity_guard_v1()'
     or exists (select 1 from pg_trigger t where t.tgrelid = 'public.nodes'::regclass and t.tgname = 'trg_rule_compaction_integrity_guard_v1_truncate') then
    raise exception 'G1 rule guard rollback postcondition: the triggers are not exactly the live 12.11.2026 ones';
  end if;
end $$;

commit;
