-- Two reviewed editorial writer pages in the existing contributor catalogue.
BEGIN;

DO $writer_profiles$
DECLARE
  profile record;
BEGIN
  LOCK TABLE public.contributors IN SHARE ROW EXCLUSIVE MODE;

  FOR profile IN SELECT * FROM (VALUES
    ('abca2ad1-7033-4f13-9f05-d616501c6dc6'::uuid, 'lior-shitrit', 'ליאור שטרית', ARRAY['ליאור שטרית', 'ליאור שיטרית']),
    ('ff282d1a-b13d-49d2-bf22-90323c2ed2ff'::uuid, 'adam-mi-yisrael', 'אדם מישראל', ARRAY['אדם מישראל', 'אָדָם מִיִּשְׂרָאֵל'])
  ) AS writers(id, slug, name, known_names)
  ORDER BY slug
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.contributors c
      WHERE c.id <> profile.id AND (
        c.slug = profile.slug OR btrim(c.display_name) = ANY(profile.known_names)
        OR c.wa_names && profile.known_names
      )
    ) THEN
      RAISE EXCEPTION 'An existing contributor needs review for %', profile.slug;
    END IF;

    INSERT INTO public.contributors (id, slug, display_name, kind, role, source, dossier_settings)
    VALUES (profile.id, profile.slug, profile.name, 'author', 'כתב', 'manual', '{"visibility":"public"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    IF NOT EXISTS (
      SELECT 1 FROM public.contributors c
      WHERE c.id = profile.id AND c.slug = profile.slug AND c.display_name = profile.name
        AND c.kind = 'author' AND c.active AND NOT c.locked AND NOT c.building
        AND c.dossier_settings->>'visibility' = 'public'
        AND c.email IS NULL AND c.user_id IS NULL AND c.phone IS NULL
    ) THEN
      RAISE EXCEPTION 'The reviewed writer profile has changed for %', profile.slug;
    END IF;
  END LOOP;
END
$writer_profiles$;

SELECT slug, display_name, kind FROM public.contributors
WHERE id IN ('abca2ad1-7033-4f13-9f05-d616501c6dc6', 'ff282d1a-b13d-49d2-bf22-90323c2ed2ff')
ORDER BY slug;
COMMIT;
