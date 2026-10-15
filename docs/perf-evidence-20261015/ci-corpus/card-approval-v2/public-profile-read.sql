-- Manual outside-CI source receipt. Explicit user approval covers these seven
-- fields only. Profile id is not account user_id. No aliases/dossier exported.
BEGIN READ ONLY;
SET LOCAL ROLE anon;
SELECT id,slug,display_name,kind,role,trusted,active
FROM public.contributors
WHERE slug IN ('tzvi-opoc','shimon-haimov','yaniv-levi','shachar-kandro')
  AND coalesce(dossier_settings->>'visibility','public') <> 'private';
SELECT id,slug,display_name,kind,role,trusted,active
FROM public.contributors
WHERE active=true AND trusted=true AND kind <> 'external'
  AND coalesce(dossier_settings->>'visibility','public') <> 'private';
COMMIT;
