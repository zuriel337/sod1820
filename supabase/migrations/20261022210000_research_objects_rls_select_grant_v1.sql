-- RESEARCH_OBJECTS_RLS_SELECT_GRANT_V1
--
-- The table already has RLS enabled and explicit SELECT policies, but anon and
-- authenticated had no table-level SELECT grant, so every policy was
-- unreachable. Granting SELECT activates those existing fail-closed policies;
-- it does not bypass them and grants no INSERT/UPDATE/DELETE capability.

GRANT SELECT ON TABLE public.research_objects TO anon, authenticated;

