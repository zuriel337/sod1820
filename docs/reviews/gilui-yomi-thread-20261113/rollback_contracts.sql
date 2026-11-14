-- Optional reversal of the three exact reviewed addenda.
-- A later contract edit aborts the transaction instead of removing the edit.
BEGIN;

DO $rollback_contracts$
DECLARE
  item record;
  stored_hash text;
  affected integer;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
    (4, 'publishing_conventions', 'f39efab93a4d4bfa851586d4fc4259f5', '62fc7eee6c9631999f920efae960e00b', 72978),
    (22, 'research_intake_foundation_contract', '51c4f1db4c17293ce945e06186008c0c', 'bcc1707243f161a2aca0dc79ec5cf4d2', 79117),
    (37, 'sod1820_reality_stream_os_master_v3_20261016_draft', 'ad31a70026551eab9cb2088dfdbe824b', '952914e83a177151eb7031c115d2262e', 621302)
    ) AS plan(id, slug, before_hash, after_hash, original_length)
    ORDER BY id
  LOOP
    SELECT md5(body) INTO stored_hash
      FROM public.project_codex
      WHERE id = item.id AND slug = item.slug
      FOR UPDATE;

    IF stored_hash = item.before_hash THEN
      CONTINUE;
    END IF;
    IF stored_hash IS DISTINCT FROM item.after_hash THEN
      RAISE EXCEPTION 'Contract % changed after activation', item.id;
    END IF;

    UPDATE public.project_codex
      SET body = left(body, item.original_length),
          updated_at = now()
      WHERE id = item.id
        AND slug = item.slug
        AND md5(left(body, item.original_length)) = item.before_hash;

    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 THEN
      RAISE EXCEPTION 'Contract % original hash mismatch', item.id;
    END IF;
  END LOOP;
END
$rollback_contracts$;

SELECT id, slug, md5(body) AS body_hash, updated_at
FROM public.project_codex
WHERE id IN (4, 22, 37)
ORDER BY id;

COMMIT;
