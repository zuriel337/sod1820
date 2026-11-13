-- Create one editorial writer page for the reviewed reply on 1158.
BEGIN;

DO $aviad_writer$
DECLARE
  writer constant uuid := 'd9e17da3-3acb-442b-9a20-f9944a31474b';
BEGIN
  LOCK TABLE public.contributors IN SHARE ROW EXCLUSIVE MODE;

  IF EXISTS (
    SELECT 1 FROM public.contributors c
    WHERE c.id <> writer AND (c.slug = 'aviad-sar-shalom' OR EXISTS (
      SELECT 1 FROM unnest(ARRAY[c.display_name] || coalesce(c.wa_names, ARRAY[]::text[])) AS alias(name)
      WHERE regexp_replace(lower(alias.name), '[[:space:]־-]+', '', 'g') IN
        ('אביעדשרשלום', 'aviadsarshalom', 'aviadsharshalom')
    ))
  ) THEN RAISE EXCEPTION 'An existing Aviad Sar Shalom contributor needs review'; END IF;

  INSERT INTO public.contributors (id, slug, display_name, kind, role, source, dossier_settings)
  VALUES (writer, 'aviad-sar-shalom', 'אביעד שר שלום', 'author', 'כתב', 'manual', '{"visibility":"public"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.contributors c
    WHERE c.id = writer AND c.slug = 'aviad-sar-shalom' AND c.display_name = 'אביעד שר שלום'
      AND c.kind = 'author' AND c.active AND NOT c.locked AND NOT c.building
      AND c.dossier_settings->>'visibility' = 'public'
      AND c.email IS NULL AND c.user_id IS NULL AND c.phone IS NULL
  ) THEN RAISE EXCEPTION 'The reviewed Aviad Sar Shalom writer profile has changed'; END IF;
END
$aviad_writer$;

SELECT slug, display_name, kind FROM public.contributors WHERE id = 'd9e17da3-3acb-442b-9a20-f9944a31474b';
COMMIT;
