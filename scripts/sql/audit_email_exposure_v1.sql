-- Read-only audit (safe on any database): lists functions in schema public that a client role can execute,
-- that run with owner rights and that read an e-mail/phone column or auth.users without an obvious caller check.
-- Expected result after DEF-001: zero rows. Heuristic by design - every row must be reviewed by hand.
select p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and p.prosecdef
  and (p.prosrc ~* '\m(email|phone)\M' or p.prosrc ~* 'auth\.users')
  and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  and not (p.prosrc ~* '(auth\.uid\(\)|rd_is_admin|is_admin\(|admin only|forbidden|not authorized|service_role)')
  and p.prorettype <> 'trigger'::regtype
order by p.proname;
