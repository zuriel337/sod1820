-- SOD1820 / Zion David Siboni "Gate 50"
-- OWNER REVIEW ONLY · NOT A MIGRATION · DO NOT EXECUTE AUTOMATICALLY
-- This is the complete proposed single-source-node operation for exact approval.
-- Source issue #1494 · source e-mail #113 (second e-mail, 22.11.2026).
-- Required before applying: merged and verified public reader; owner release
-- signoff for exact SQL/identity; no other active writer; no duplicate identity.
--
-- PHASE A (pre-release): insert exactly one inactive source identity.
-- No service-role key / user identity / unrelated table touched.
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('SOD1820:book:hamasa-leshaar-hahamishim-zion-siboni', 0));
DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.nodes
    WHERE type = 'book'
      AND (
        identity_key = 'book:hamasa-leshaar-hahamishim-zion-siboni'
        OR metadata->>'slug' = 'hamasa-leshaar-hahamishim-zion-siboni'
      )
  ) THEN
    RAISE EXCEPTION 'Siboni Book identity exists: inspect and reconcile; never add duplicate';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects
    WHERE bucket_id='gallery' AND name='Book/zion50.pdf'
      AND metadata->>'size'='1322143'
      AND metadata->>'mimetype'='application/pdf'
  ) THEN
    RAISE EXCEPTION 'Siboni exact object not found; do not create Book identity';
  END IF;
END $guard$;

INSERT INTO public.nodes (type, label, description, identity_key, is_active, metadata)
VALUES (
  'book',
  'המסע לשער החמישים — מהבינה המלאכותית לבינה המלכותית',
  'ספר מחקר מאת ציון דוד סיבוני. שמונה שערים, שני נספחים ונספח מיוחד על המספר 97. ספר המקור הוא קובץ המחבר מן המייל השני בתאריך 22.11.2026.',
  'book:hamasa-leshaar-hahamishim-zion-siboni',
  false,
  jsonb_build_object(
    'slug', 'hamasa-leshaar-hahamishim-zion-siboni',
    'route', '/book/hamasa-leshaar-hahamishim-zion-siboni',
    'space', 'core',
    'author', jsonb_build_object('name_he','ציון דוד סיבוני'),
    'digital_page_count', 110,
    'section_count', 8,
    'source_ref_prefixes', jsonb_build_array('book:hamasa-leshaar-hahamishim-zion-siboni'),
    'identity_tiers', jsonb_build_object(
      'book', jsonb_build_object('title','המסע לשער החמישים — מהבינה המלאכותית לבינה המלכותית', 'identity_key','book:hamasa-leshaar-hahamishim-zion-siboni'),
      'edition', jsonb_build_object('status','author_submitted_updated_covers', 'date','2026-11-22'),
      'witness', jsonb_build_object('provider','ציון דוד סיבוני · מייל שני', 'identity','witness:siboni:2026-11-22:email-113'),
      'locator', jsonb_build_object('kind','pdf_page', 'pattern','book:hamasa-leshaar-hahamishim-zion-siboni#p<PDF_PAGE>'),
      'digital_object', jsonb_build_object(
        'bucket','gallery',
        'path','Book/zion50.pdf',
        'mime','application/pdf',
        'size_bytes',1322143,
        'sha256','35261bcc661d6364353482c9f911de9c39f203e503a68aa97b680e4a85c77e2c'
      )
    ),
    'coverage_2029', jsonb_build_object(
      'structural_sections','EIGHT GATES + APPENDICES SOURCE-MAPPED',
      'engine_verified','NOT_ESTABLISHED',
      'source_exhaustion','NOT ESTABLISHED'
    )
  )
);
COMMIT;

-- PHASE B: separate exact owner-approved release transaction AFTER deployed
-- reader/browser acceptance. Run only if exact identity, SHA and deployment verified.
-- This is NOT to be run as part of phase A.
--
-- BEGIN;
-- UPDATE public.nodes SET is_active = true
-- WHERE type='book'
--   AND identity_key='book:hamasa-leshaar-hahamishim-zion-siboni'
--   AND metadata->>'slug'='hamasa-leshaar-hahamishim-zion-siboni'
--   AND is_active=false;
-- -- Require exactly one affected row; if 0/more, ROLLBACK and inspect.
-- COMMIT;

-- NON-DESTRUCTIVE ROLLBACK if release is withdrawn: set is_active=false
-- for this exact node under owner approval; do NOT delete source or citations.
