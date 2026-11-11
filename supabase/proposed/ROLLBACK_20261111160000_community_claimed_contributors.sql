-- ROLLBACK for 20261111160000_community_claimed_contributors.sql (proposal; apply only with ZURIEL's approval)
drop function if exists public.community_claimed_contributors(uuid[]);
