\set ON_ERROR_STOP on
\i test/schema_stub.sql
\i ../../../supabase/proposed/discovery-center-20261126/D0-shared_helpers.sql
\i ../../../supabase/proposed/discovery-center-20261126/D1-discovery_center_v1.sql
\i ../../../supabase/proposed/discovery-center-20261126/D2-writer_public_material_v1.sql
\i ../../../supabase/proposed/discovery-center-20261126/D3-admin_set_home_featured_discovery_v1.sql
\i ../../../supabase/proposed/discovery-center-20261126/D3c-admin_set_verify_display.sql
SET client_min_messages = warning;
INSERT INTO contributors (id, slug, display_name, kind, dossier_settings) VALUES ('11111111-1111-1111-1111-111111111111', 'yaniv-levi', 'יניב לוי', 'person', '{"visibility":"public"}'), ('22222222-2222-2222-2222-222222222222', 'private-one', 'פרטי', 'person', '{"visibility":"private"}');
INSERT INTO gematria_words (id, phrase, source, other_method, ragil, miluy, ribua, misratar, created_at) VALUES
 ('d057b2cf-c50b-4f4c-9e22-f3ff90ec008b', 'תפרצי בתשפז', 'יניב לוי', 'ריבוע', 1569, 2467, 5787, 1421, now() - interval '2 hours'),
 ('b3fff8e8-2c77-45dc-ad1e-7b72eb352298', 'ימין ושמאול תפרצי', 'יניב לוי', 'מילוי', 1273, 2026, 5081, 1352, now() - interval '1 hour'),
 ('c0000000-0000-0000-0000-000000000001', 'מילה רגילה', 'יניב לוי', NULL, 100, 200, 300, 400, now() - interval '3 hours'),
 ('c0000000-0000-0000-0000-000000000002', 'שיטה מורכבת', 'יניב לוי', 'רגיל+מילוי', 111, 222, 333, 444, now() - interval '4 hours'),
 ('c0000000-0000-0000-0000-000000000003', 'של פרטי', 'פרטי', NULL, 5, 6, 7, 8, now()),
 ('c0000000-0000-0000-0000-000000000004', 'מילה רגילה', 'יניב לוי', NULL, 100, 200, 300, 400, now() - interval '1 minute');   -- ביטוי כפול: נספר פעם אחת

DO $$
DECLARE r record; n integer; j jsonb;
BEGIN
  -- (1) זהות הגילוי: שיטה וערך מהעמודה שחישב המנוע, לא תמיד ragil
  SELECT * INTO r FROM gematria_word_method_value_v1('d057b2cf-c50b-4f4c-9e22-f3ff90ec008b'); ASSERT r.method_key = 'ריבוע' AND r.value = 5787, 'ribua default from other_method';
  SELECT * INTO r FROM gematria_word_method_value_v1('b3fff8e8-2c77-45dc-ad1e-7b72eb352298'); ASSERT r.method_key = 'מילוי' AND r.value = 2026, 'miluy default';
  SELECT * INTO r FROM gematria_word_method_value_v1('b3fff8e8-2c77-45dc-ad1e-7b72eb352298', 'ריבוע'); ASSERT r.value = 5081, 'explicit method';
  SELECT * INTO r FROM gematria_word_method_value_v1('c0000000-0000-0000-0000-000000000001'); ASSERT r.method_key = 'רגיל' AND r.value = 100, 'plain';
  SELECT * INTO r FROM gematria_word_method_value_v1('c0000000-0000-0000-0000-000000000002'); ASSERT r.method_key = 'רגיל' AND r.value = 111, 'unregistered source label falls back to the regular method';
  SELECT count(*) INTO n FROM gematria_word_method_value_v1('c0000000-0000-0000-0000-000000000001', 'לא-קיימת'); ASSERT n = 0, 'unknown explicit method: no row';
  SELECT count(*) INTO n FROM gematria_word_method_value_v1('c0000000-0000-0000-0000-000000000001', 'גדול'); ASSERT n = 0, 'inactive method: no row';
  -- (2) בחירות: פורמט ישן, מערך, פגום
  INSERT INTO site_flags VALUES ('home_featured_discovery', true, 'c0000000-0000-0000-0000-000000000001', 'all', now());
  SELECT count(*) INTO n FROM home_featured_picks_v1(); ASSERT n = 1, 'legacy uuid';
  UPDATE site_flags SET message = '[{"id":"d057b2cf-c50b-4f4c-9e22-f3ff90ec008b","method":"ריבוע"},{"id":"b3fff8e8-2c77-45dc-ad1e-7b72eb352298","method":"מילוי"}]';
  SELECT count(*) INTO n FROM home_featured_picks_v1(); ASSERT n = 2, 'array';
  UPDATE site_flags SET message = '[{"id":'; SELECT count(*) INTO n FROM home_featured_picks_v1(); ASSERT n = 0, 'corrupt value draws nothing and does not fail';
  UPDATE site_flags SET message = '', enabled = false;
  -- (3) הרשאות D3
  SET LOCAL test.admin = 'false';
  BEGIN PERFORM admin_set_home_featured_discovery_v1('[{"id":"d057b2cf-c50b-4f4c-9e22-f3ff90ec008b","method":"ריבוע"}]'); ASSERT false, 'non-admin must fail'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  SET LOCAL test.admin = 'true';
  BEGIN PERFORM admin_set_home_featured_discovery_v1('[{"id":"c0000000-0000-0000-0000-000000000003"}]'); ASSERT false, 'private writer must be refused'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM admin_set_home_featured_discovery_v1('[{"id":"d057b2cf-c50b-4f4c-9e22-f3ff90ec008b","method":"גדול"}]'); ASSERT false, 'inactive method refused'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM admin_set_home_featured_discovery_v1('[{"id":"d057b2cf-c50b-4f4c-9e22-f3ff90ec008b"},{"id":"d057b2cf-c50b-4f4c-9e22-f3ff90ec008b","method":"מילוי"}]'); ASSERT false, 'duplicate refused'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM admin_set_home_featured_discovery_v1('[{"id":"d057b2cf-c50b-4f4c-9e22-f3ff90ec008b"},{"id":"b3fff8e8-2c77-45dc-ad1e-7b72eb352298"},{"id":"c0000000-0000-0000-0000-000000000001"},{"id":"c0000000-0000-0000-0000-000000000002"}]'); ASSERT false, 'four refused'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  PERFORM admin_set_home_featured_discovery_v1('[{"id":"d057b2cf-c50b-4f4c-9e22-f3ff90ec008b","method":"ריבוע"},{"id":"b3fff8e8-2c77-45dc-ad1e-7b72eb352298","method":"מילוי"}]');
  ASSERT (SELECT enabled FROM site_flags WHERE key = 'home_featured_discovery'), 'stored';
  -- (4) הקורא: הנבחר ומה שלצדו, עם שיטה וערך
  j := discovery_center_feed_v1();
  ASSERT j->'featured'->>'phrase' = 'תפרצי בתשפז' AND j->'featured'->>'method' = 'ריבוע' AND (j->'featured'->>'value')::int = 5787, 'featured identity: phrase, method, value';
  ASSERT j->'featured'->>'credit_slug' = 'yaniv-levi', 'credit';
  ASSERT j->'featured'->>'method_label' = 'ריבוע (תצוגה)', 'the registry display label travels with the identity';
  ASSERT jsonb_array_length(j->'featured_with') = 1 AND j->'featured_with'->0->>'method' = 'מילוי' AND (j->'featured_with'->0->>'value')::int = 2026, 'companion identity';
  ASSERT (SELECT count(*) FROM jsonb_array_elements(j->'latest_discoveries') d WHERE d->>'phrase' = 'מילה רגילה') = 1, 'a phrase is listed once';
  ASSERT NOT EXISTS (SELECT 1 FROM jsonb_array_elements(j->'latest_discoveries') d WHERE d->>'phrase' = 'של פרטי'), 'private writer never listed';
  -- גילוי שאיבד זכאות נעלם מהבחירה ומההצגה
  UPDATE gematria_words SET is_published = false WHERE id = 'd057b2cf-c50b-4f4c-9e22-f3ff90ec008b';
  j := discovery_center_feed_v1();
  ASSERT j->'featured'->>'phrase' = 'ימין ושמאול תפרצי' AND jsonb_array_length(j->'featured_with') = 0, 'a discovery that lost eligibility disappears';
  UPDATE gematria_words SET is_published = true WHERE id = 'd057b2cf-c50b-4f4c-9e22-f3ff90ec008b';
  -- ביטול: חוזר לגילוי האחרון
  PERFORM admin_set_home_featured_discovery_v1('[]'::jsonb);
  j := discovery_center_feed_v1(); ASSERT j->'featured'->>'phrase' = 'ימין ושמאול תפרצי', 'fallback is the latest named discovery with its own method';
  -- (5) מונה אוטומטי וללא כפל: גימטריה ציבורית חדשה מעלה את המונה, ביטוי כפול לא
  j := discovery_center_stats_v1(); n := (j->>'gematria_public')::int;
  INSERT INTO gematria_words (phrase, source, ragil, miluy, ribua, misratar) VALUES ('ביטוי חדש לגמרי', 'יניב לוי', 9, 9, 9, 9);
  ASSERT (discovery_center_stats_v1()->>'gematria_public')::int = n + 1, 'a new public gematria raises the counter by exactly one, with no manual feed';
  INSERT INTO gematria_words (phrase, source, ragil, miluy, ribua, misratar) VALUES ('ביטוי חדש לגמרי', 'יניב לוי', 9, 9, 9, 9);
  ASSERT (discovery_center_stats_v1()->>'gematria_public')::int = n + 1, 'the same phrase twice is counted once';
  -- (6) דף הכותב: שיטה וערך, ביטוי פעם אחת, אותו מונה בסוג
  SELECT count(*) INTO n FROM writer_public_material_v1('11111111-1111-1111-1111-111111111111', 'gematria', 100);
  ASSERT n = (SELECT count(DISTINCT lower(btrim(phrase))) FROM gematria_words g WHERE source = 'יניב לוי' AND is_verified AND is_published), 'writer page counts each phrase once';
  ASSERT EXISTS (SELECT 1 FROM writer_public_material_v1('11111111-1111-1111-1111-111111111111', 'gematria', 100) WHERE excerpt = 'תפרצי בתשפז = 5787 (ריבוע)'), 'writer page shows phrase = value (method)';
  ASSERT EXISTS (SELECT 1 FROM writer_public_material_v1('11111111-1111-1111-1111-111111111111', 'gematria', 100) WHERE excerpt = 'מילה רגילה = 100'), 'regular method has no suffix';
  RAISE WARNING 'discovery center SQL test: PASS';
END $$;

-- (7) הרשאות אחרי הביקורת: העזרים פנימיים, הקוראים הציבוריים פתוחים, הכתיבה סגורה לאנונימי
DO $$
DECLARE j jsonb; n integer;
BEGIN
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN PERFORM public.gematria_word_method_value_v1('d057b2cf-c50b-4f4c-9e22-f3ff90ec008b'); ASSERT false, 'anon must not call the method helper'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.home_featured_picks_v1(); ASSERT false, 'anon must not call the picks helper'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.public_discovery_writer_v1('d057b2cf-c50b-4f4c-9e22-f3ff90ec008b'); ASSERT false, 'anon must not call the writer helper'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.admin_set_home_featured_discovery_v1('[]'::jsonb); ASSERT false, 'anon must not call the admin setter'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  j := public.discovery_center_feed_v1(); ASSERT j ? 'featured', 'the public feed works for anon (definer)';
  ASSERT (public.discovery_center_stats_v1()->>'gematria_public')::int > 0, 'the public stats work for anon';
  SELECT count(*) INTO n FROM public.writer_public_material_v1('11111111-1111-1111-1111-111111111111', 'gematria', 10); ASSERT n > 0, 'the public writer reader works for anon';
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN PERFORM public.gematria_word_method_value_v1('d057b2cf-c50b-4f4c-9e22-f3ff90ec008b'); ASSERT false, 'authenticated must not call the method helper'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  EXECUTE 'RESET ROLE';
  -- שער הפרטיות בתוך העזר: גם בהרצה כבעלים, שורה לא ציבורית אינה מחזירה דבר
  INSERT INTO gematria_words (id, phrase, source, ragil, miluy, ribua, misratar, is_published) VALUES ('c0000000-0000-0000-0000-0000000000aa', 'טיוטה', 'יניב לוי', 1, 1, 1, 1, false);
  INSERT INTO gematria_words (id, phrase, source, ragil, miluy, ribua, misratar, is_encrypted) VALUES ('c0000000-0000-0000-0000-0000000000ab', 'מוצפן', 'יניב לוי', 2, 2, 2, 2, true);
  SELECT count(*) INTO n FROM public.gematria_word_method_value_v1('c0000000-0000-0000-0000-0000000000aa'); ASSERT n = 0, 'an unpublished word gives no value';
  SELECT count(*) INTO n FROM public.gematria_word_method_value_v1('c0000000-0000-0000-0000-0000000000ab'); ASSERT n = 0, 'an encrypted word gives no value';
  RAISE WARNING 'privilege and privacy-gate tests: PASS';
END $$;

-- (8) D3b ו-D3b-rollback: הכתיבה הראשונית מוגנת, וההחזרה אינה מוחקת בחירת מנהל מאוחרת
DELETE FROM site_flags WHERE key = 'home_featured_discovery';
\i ../../../supabase/proposed/discovery-center-20261126/D3b-initial-featured.sql
DO $$
BEGIN
  ASSERT (SELECT message FROM site_flags WHERE key = 'home_featured_discovery') = '[{"id": "d057b2cf-c50b-4f4c-9e22-f3ff90ec008b", "method": "ריבוע"}, {"id": "b3fff8e8-2c77-45dc-ad1e-7b72eb352298", "method": "מילוי"}]', 'D3b wrote exactly the text the rollback expects';
  ASSERT (SELECT discovery_center_feed_v1()->'featured'->>'phrase') = 'תפרצי בתשפז', 'the initial pick is shown';
END $$;
\i ../../../supabase/proposed/discovery-center-20261126/D3b-rollback.sql
DO $$ BEGIN ASSERT NOT EXISTS (SELECT 1 FROM site_flags WHERE key = 'home_featured_discovery'), 'rollback removed its own exact value'; END $$;
\i ../../../supabase/proposed/discovery-center-20261126/D3b-initial-featured.sql
SET test.admin = 'true';
SELECT admin_set_home_featured_discovery_v1('[{"id":"c0000000-0000-0000-0000-000000000001","method":"רגיל"}]'::jsonb) IS NOT NULL AS later_admin_selection;
\i ../../../supabase/proposed/discovery-center-20261126/D3b-rollback.sql
DO $$ BEGIN ASSERT (SELECT message FROM site_flags WHERE key = 'home_featured_discovery') LIKE '%c0000000-0000-0000-0000-000000000001%', 'a later admin selection survives the rollback'; RAISE WARNING 'D3b + rollback tests: PASS'; END $$;

-- (9) D2: צפנים לפי שלוש דרגות הפרסום, ללא כפילות וללא חשיפת פרטי; עימוד יציב; הרשאות
UPDATE contributors SET user_id = '33333333-3333-3333-3333-333333333333' WHERE id = '11111111-1111-1111-1111-111111111111';
INSERT INTO els_records (id, status, visibility, self_published, owner_user_id, title, created_at) VALUES
 ('e0000000-0000-0000-0000-000000000001', 'published', 'public',  false, '33333333-3333-3333-3333-333333333333', 'library',                 '2026-01-01T10:00:00Z'),
 ('e0000000-0000-0000-0000-000000000002', 'draft',     'public',  true,  '33333333-3333-3333-3333-333333333333', 'own page draft',         '2026-01-01T10:00:00Z'),
 ('e0000000-0000-0000-0000-000000000003', 'pending',   'public',  true,  '33333333-3333-3333-3333-333333333333', 'own page pending',       '2026-01-01T10:00:00Z'),
 ('e0000000-0000-0000-0000-000000000004', 'published', 'public',  true,  '33333333-3333-3333-3333-333333333333', 'both library and own',   '2026-01-01T10:00:00Z'),
 ('e0000000-0000-0000-0000-000000000005', 'draft',     'private', true,  '33333333-3333-3333-3333-333333333333', 'private self-published (the one violating row)', '2026-01-01T10:00:00Z'),
 ('e0000000-0000-0000-0000-000000000006', 'draft',     'private', false, '33333333-3333-3333-3333-333333333333', 'private',                 '2026-01-01T10:00:00Z'),
 ('e0000000-0000-0000-0000-000000000007', 'hidden',    'private', false, '33333333-3333-3333-3333-333333333333', 'hidden private',          '2026-01-01T10:00:00Z'),
 ('e0000000-0000-0000-0000-000000000008', 'hidden',    'public',  true,  '33333333-3333-3333-3333-333333333333', 'hidden by moderation',   '2026-01-01T10:00:00Z'),
 ('e0000000-0000-0000-0000-000000000009', 'published', 'public',  false, '99999999-9999-9999-9999-999999999999', 'another owner',           '2026-01-01T10:00:00Z');
DO $$
DECLARE titles text[]; n integer; total integer; seen text[] := '{}'; k text; last_at timestamptz; last_key text; page record; got integer; rounds integer := 0;
BEGIN
  SELECT array_agg(title ORDER BY title) INTO titles FROM writer_public_material_v1('11111111-1111-1111-1111-111111111111', 'cipher', 100);
  ASSERT titles = ARRAY['both library and own','library','own page draft','own page pending'], 'tiers: library + own page, once each, never private or hidden: ' || coalesce(titles::text, 'null');
  SELECT count(*) - count(DISTINCT dedupe_key) INTO n FROM writer_public_material_v1('11111111-1111-1111-1111-111111111111', 'cipher', 100); ASSERT n = 0, 'no duplicate cipher rows';
  ASSERT NOT EXISTS (SELECT 1 FROM writer_public_material_v1('11111111-1111-1111-1111-111111111111', NULL, 100) WHERE title ILIKE '%private%' OR title ILIKE '%hidden%' OR title = 'another owner'), 'no private, hidden or foreign cipher in any kind';
  -- עימוד יציב על חותמות זמן זהות (4 צפנים באותה שנייה), עמוד של 2
  last_at := NULL; last_key := NULL; total := 0;
  LOOP
    got := 0; rounds := rounds + 1; EXIT WHEN rounds > 10;
    FOR page IN SELECT * FROM writer_public_material_v1('11111111-1111-1111-1111-111111111111', 'cipher', 2, last_at, last_key) LOOP
      ASSERT NOT (page.dedupe_key = ANY(seen)), 'pagination repeated a row: ' || page.dedupe_key;
      seen := seen || page.dedupe_key; got := got + 1; total := total + 1; last_at := page.created_at; last_key := page.dedupe_key;
    END LOOP;
    EXIT WHEN got < 2;
  END LOOP;
  ASSERT total = 4, 'pagination covered all 4 rows exactly once, none skipped: ' || total;
  -- הרשאות: anon קורא את דף הכותב הציבורי; כותב פרטי אינו מחזיר דבר
  EXECUTE 'SET LOCAL ROLE anon';
  SELECT count(*) INTO n FROM writer_public_material_v1('11111111-1111-1111-1111-111111111111', 'cipher', 100); ASSERT n = 4, 'anon reads the public writer page';
  SELECT count(*) INTO n FROM writer_public_material_v1('22222222-2222-2222-2222-222222222222', NULL, 100); ASSERT n = 0, 'a private writer returns nothing to anon';
  EXECUTE 'RESET ROLE';
  RAISE WARNING 'D2 cipher tiers, pagination and permission tests: PASS';
END $$;

-- (10) D3c: בחירה חייבת להיות ניתנת להצגה (מקור יחיד: הקורא הציבורי), גם בביטוי כפול וגם בחוסר שיטת ברירת מחדל
INSERT INTO gematria_words (id, phrase, source, ragil, miluy, ribua, misratar, created_at) VALUES
 ('f0000000-0000-0000-0000-000000000001', 'ביטוי כפול', 'יניב לוי', 10, 20, 30, 40, now() - interval '10 days'),
 ('f0000000-0000-0000-0000-000000000002', 'ביטוי כפול', 'יניב לוי', 10, 20, 30, 40, now() - interval '9 days');
INSERT INTO gematria_words (id, phrase, source, ragil, miluy, ribua, misratar, created_at) VALUES
 ('f0000000-0000-0000-0000-000000000003', 'בלי ברירת מחדל', 'יניב לוי', NULL, 5, 6, 7, now() - interval '8 days');
SET test.admin = 'true';
DO $$
BEGIN
  -- D3 לבדו היה מאפשר את שתיהן; D3c דוחה: הביטוי הכפול שאינו הראשון, ושיטה מפורשת כשאין שיטת ברירת מחדל
  BEGIN PERFORM admin_set_home_featured_discovery_v1('[{"id":"f0000000-0000-0000-0000-000000000002"}]'::jsonb); ASSERT false, 'a later duplicate phrase must be refused'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM admin_set_home_featured_discovery_v1('[{"id":"f0000000-0000-0000-0000-000000000003","method":"מילוי"}]'::jsonb); ASSERT false, 'a word without a default method must be refused'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  ASSERT NOT EXISTS (SELECT 1 FROM site_flags WHERE key = 'home_featured_discovery' AND message LIKE '%f0000000-0000-0000-0000-00000000000%'), 'a refused selection leaves nothing behind';
  PERFORM admin_set_home_featured_discovery_v1('[{"id":"f0000000-0000-0000-0000-000000000001"}]'::jsonb);
  ASSERT (SELECT discovery_center_feed_v1()->'featured'->>'phrase') = 'ביטוי כפול', 'the first duplicate is displayable and shown';
  RAISE WARNING 'D3c display-guard tests: PASS';
END $$;

-- (11) D3b ו-NULL: אם הקורא אינו מציג את שתי הבחירות (כאן: רק הנבחר, ללא "לצדו"), הערך החסר הוא NULL והבדיקה חייבת להיכשל ולבטל את הכתיבה
\set ON_ERROR_STOP off
DELETE FROM site_flags WHERE key = 'home_featured_discovery';
CREATE OR REPLACE FUNCTION discovery_center_feed_v1() RETURNS jsonb LANGUAGE sql STABLE AS $f$ SELECT jsonb_build_object('featured', jsonb_build_object('id', 'd057b2cf-c50b-4f4c-9e22-f3ff90ec008b', 'method', 'ריבוע'), 'featured_with', '[]'::jsonb) $f$;
\i ../../../supabase/proposed/discovery-center-20261126/D3b-initial-featured.sql
\set ON_ERROR_STOP on
DO $$ BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM site_flags WHERE key = 'home_featured_discovery'), 'D3b wrote the flag although the feed did not show both picks (NULL must cancel the write)';
  RAISE WARNING 'D3b NULL-safety regression test: PASS';
END $$;
-- החזרת הקורא האמיתי
\i ../../../supabase/proposed/discovery-center-20261126/D1-discovery_center_v1.sql

-- (12) D4: שיוך בקליטה לפי הכלל היחיד (מזהה משתמש בלבד, התורם הפעיל והיחיד); לא נוגע בסטטוס; אורח לא משויך
\i ../../../supabase/proposed/discovery-center-20261126/D4-trg_rc_resolve_author_contributor.sql
INSERT INTO contributors (id, slug, display_name, kind, dossier_settings, user_id, trusted) VALUES
 ('44444444-4444-4444-4444-444444444444', 'solo', 'יחיד', 'person', '{"visibility":"public"}', '55555555-5555-5555-5555-555555555555', true),
 ('66666666-6666-6666-6666-666666666661', 'dup-a', 'כפול א', 'person', '{"visibility":"public"}', '77777777-7777-7777-7777-777777777777', false),
 ('66666666-6666-6666-6666-666666666662', 'dup-b', 'כפול ב', 'person', '{"visibility":"public"}', '77777777-7777-7777-7777-777777777777', false);
INSERT INTO contributors (id, slug, display_name, kind, dossier_settings, user_id, merged_into) VALUES ('88888888-8888-8888-8888-888888888881', 'merged-away', 'ממוזג', 'person', '{}', '99999999-0000-0000-0000-000000000009', '44444444-4444-4444-4444-444444444444');
DO $$
DECLARE r record;
BEGIN
  INSERT INTO research_contributions (id, author_user_id, body, status) VALUES ('d4000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'x', 'pending') RETURNING * INTO r;
  ASSERT r.author_contributor_id = '44444444-4444-4444-4444-444444444444' AND r.status = 'pending', 'D4: a user with one active contributor is attributed by id; status untouched';
  INSERT INTO research_contributions (id, author_user_id, body, status) VALUES ('d4000000-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777777', 'x', 'pending') RETURNING * INTO r;
  ASSERT r.author_contributor_id IS NULL, 'D4: two active contributors for one user: no arbitrary pick';
  INSERT INTO research_contributions (id, author_user_id, body, status) VALUES ('d4000000-0000-0000-0000-000000000003', '99999999-0000-0000-0000-000000000009', 'x', 'pending') RETURNING * INTO r;
  ASSERT r.author_contributor_id IS NULL, 'D4: a merged contributor is never the target';
  INSERT INTO research_contributions (id, author_user_id, author_contributor_id, body, status) VALUES ('d4000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666661', 'x', 'pending') RETURNING * INTO r;
  ASSERT r.author_contributor_id = '66666666-6666-6666-6666-666666666661', 'D4: an explicit contributor is never overwritten';
  INSERT INTO research_contributions (id, author_name, body, status) VALUES ('d4000000-0000-0000-0000-000000000005', 'יחיד', 'x', 'pending') RETURNING * INTO r;
  ASSERT r.author_contributor_id IS NULL, 'D4: a guest is never attributed by name';
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN PERFORM public.rc_resolve_author_contributor(); ASSERT false, 'the trigger function is not callable'; EXCEPTION WHEN insufficient_privilege THEN NULL; WHEN others THEN NULL; END;
  EXECUTE 'RESET ROLE';
  RAISE WARNING 'D4 tests: PASS';
END $$;

-- (13) D5: מוחלף רק מעל ההגדרה החיה המדויקת; הכלל היחיד; התנהגות זהה בשאר
\i test/add_contribution_live_definition.sql
DO $$ BEGIN
  ASSERT md5(pg_get_functiondef('public.add_contribution(text,text,text,text,text,uuid,text,jsonb,text,text)'::regprocedure)) = '19759e2793b11c1f7ad0e095343ede42', 'the reconstructed live definition has the live md5 (D5 guard will pass)';
END $$;
\i ../../../supabase/proposed/discovery-center-20261126/D5-add_contribution_single_attribution_rule.sql
DO $$
DECLARE new_id uuid; r record; n integer;
BEGIN
  INSERT INTO users (id, display_name, username, role) VALUES ('55555555-5555-5555-5555-555555555555', 'יחיד', 'solo', NULL), ('77777777-7777-7777-7777-777777777777', 'כפול', 'dup', NULL);
  PERFORM set_config('test.uid', '55555555-5555-5555-5555-555555555555', true);
  new_id := add_contribution('תגובה', 'beit_midrash', 'טקסט', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
  SELECT * INTO r FROM research_contributions WHERE id = new_id;
  ASSERT r.author_contributor_id = '44444444-4444-4444-4444-444444444444' AND r.status = 'approved' AND r.research_state = 'discussion', 'D5: a signed-in comment: the unique contributor, immediate approval (unchanged)';
  SELECT count(*) INTO n FROM contribution_events WHERE ref = new_id::text; ASSERT n = 1, 'D5: the contribution event is still written for an approved comment';
  new_id := add_contribution('חידוש', 'beit_midrash', 'טקסט', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
  SELECT * INTO r FROM research_contributions WHERE id = new_id;
  ASSERT r.status = 'pending' AND r.research_state = 'validated', 'D5: a non-comment from a trusted contributor stays pending/validated (unchanged)';
  PERFORM set_config('test.uid', '77777777-7777-7777-7777-777777777777', true);
  new_id := add_contribution('תגובה', 'beit_midrash', 'טקסט', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
  SELECT * INTO r FROM research_contributions WHERE id = new_id;
  ASSERT r.author_contributor_id IS NULL AND r.status = 'approved', 'D5: ambiguous contributors: no arbitrary pick (one rule), behavior otherwise unchanged';
  PERFORM set_config('test.uid', '', true);
  new_id := add_contribution('תגובה', 'beit_midrash', 'אורח', NULL, NULL, NULL, NULL, NULL, 'אורח בדיקה', NULL);
  SELECT * INTO r FROM research_contributions WHERE id = new_id;
  ASSERT r.status = 'pending' AND r.author_user_id IS NULL AND r.author_contributor_id IS NULL AND r.author_name = 'אורח בדיקה', 'D5: a guest comment stays pending and unattributed (unchanged)';
  ASSERT has_function_privilege('anon', 'public.add_contribution(text,text,text,text,text,uuid,text,jsonb,text,text)', 'execute') AND has_function_privilege('authenticated', 'public.add_contribution(text,text,text,text,text,uuid,text,jsonb,text,text)', 'execute'), 'D5: grants unchanged (anon and authenticated)';
  RAISE WARNING 'D5 tests: PASS';
END $$;
