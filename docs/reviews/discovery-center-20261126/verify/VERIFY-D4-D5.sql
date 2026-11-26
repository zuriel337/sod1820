-- אחרי D0, D4, D5. קריאה בלבד.
SELECT has_function_privilege('anon', 'public.rc_unique_contributor_for_user_v1(uuid)', 'execute') AS anon_internal_rule,       -- false
       has_function_privilege('authenticated', 'public.rc_resolve_author_contributor()', 'execute') AS auth_trigger_fn;     -- false
