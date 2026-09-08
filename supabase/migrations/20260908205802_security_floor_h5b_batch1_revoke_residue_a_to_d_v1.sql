-- H5 STEP 2, BATCH 1 of 4 (relations a-d). Executed ONLY after the default ACL was proven
-- corrected in pg_default_acl, so revoked objects cannot silently reacquire these grants.
-- NOT A BLIND SWEEP: reachability was established first — PostgREST exposes no TRUNCATE verb
-- and no DDL, and anon/authenticated hold no CREATE on schema public (has_schema_privilege
-- = false), so REFERENCES and TRIGGER are unusable by them by construction. No application
-- path can rely on these three privileges. SELECT/INSERT/UPDATE/DELETE are untouched.
-- Batched alphabetically with a recount between batches, per dispatch.
-- Reversible per object: grant truncate, references, trigger on <obj> to anon, authenticated;

do $$
declare r record; n int := 0;
begin
  for r in
    select c.oid::regclass::text as obj
    from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = 'public'
      and c.relkind in ('r','v','m','p')
      and c.relname < 'e'
    order by c.relname
  loop
    execute format('revoke truncate, references, trigger on %s from anon, authenticated', r.obj);
    n := n + 1;
  end loop;
  raise notice 'H5 batch1 processed % relations', n;
end $$;
