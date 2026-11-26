-- אחרי D0 ו-D3 (לא דורש D1, D2, D4, D5). קריאה בלבד.
SELECT has_function_privilege('anon', 'public.admin_set_home_featured_discovery_v1(jsonb)', 'execute') AS anon_admin_set,              -- false
       has_function_privilege('authenticated', 'public.admin_set_home_featured_discovery_v1(jsonb)', 'execute') AS auth_admin_set;   -- true (ובתוכו rd_is_admin)
