-- Restore the printed byline on two existing public articles. No new source rows.
BEGIN;

DO $lior_author_credit$
DECLARE
  article record;
  current_author text;
  current_authors text[];
  current_hash text;
  changed integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.contributors c
    WHERE c.id = 'abca2ad1-7033-4f13-9f05-d616501c6dc6'
      AND c.slug = 'lior-shitrit' AND c.display_name = 'ליאור שטרית'
      AND c.kind = 'author' AND c.active AND NOT c.locked AND NOT c.building
      AND c.dossier_settings->>'visibility' = 'public'
  ) OR EXISTS (
    SELECT 1 FROM public.contributors c
    WHERE c.id <> 'abca2ad1-7033-4f13-9f05-d616501c6dc6'
      AND (btrim(c.display_name) = 'ליאור שטרית' OR 'ליאור שטרית' = ANY(c.wa_names))
  ) THEN
    RAISE EXCEPTION 'Canonical writer credit is no longer unique and public';
  END IF;

  FOR article IN SELECT * FROM (VALUES
    (161, 31044, '72047b544393e01adcfc7273dd8d6617'),
    (1550, 14382, '2498cdd15461938e1f31f64f3f8b9449')
  ) AS plan(id, wp_id, body_hash)
  ORDER BY id
  LOOP
    SELECT p.author, p.authors, md5(p.content)
      INTO current_author, current_authors, current_hash
    FROM public.posts p
    WHERE p.id = article.id AND p.wp_id = article.wp_id AND p.source = 'wordpress'
      AND NOT (coalesce(p.tags, '{}'::text[]) && ARRAY['טיוטה','פורום']::text[])
    FOR UPDATE;

    IF current_hash IS DISTINCT FROM article.body_hash OR current_authors IS NOT NULL THEN
      RAISE EXCEPTION 'Article % has changed since review', article.id;
    END IF;
    IF current_author = 'ליאור שטרית' THEN CONTINUE; END IF;
    IF current_author IS DISTINCT FROM '' THEN
      RAISE EXCEPTION 'Article % already has an explicit author', article.id;
    END IF;

    UPDATE public.posts SET author = 'ליאור שטרית' WHERE id = article.id;
    GET DIAGNOSTICS changed = ROW_COUNT;
    IF changed <> 1 THEN RAISE EXCEPTION 'Article % was not updated', article.id; END IF;
  END LOOP;
END
$lior_author_credit$;

SELECT id, wp_id, author, md5(content) AS content_hash, date, modified
FROM public.posts
WHERE id IN (161,1550)
ORDER BY id;

COMMIT;
