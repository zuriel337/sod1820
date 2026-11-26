-- D1 · שני קוראים לבית: discovery_center_feed_v1() (מהיר: גילוי נבחר, גילויים חדשים, תרומות חדשות, כותבים פעילים) ו-discovery_center_stats_v1() (סטטיסטיקות כלליות, יקר יותר, נשמר במטמון).
-- *** טיוטה לאישור מדויק. לא הוחלה. *** קריאה בלבד, STABLE, SECURITY DEFINER, ללא טבלה חדשה. תלויים ב-D0 (העזר public_discovery_writer_v1).
-- שער הפרסום: כותב מוצג (שם, קישור, ספירת כותבים, כותבים פעילים, קרדיט) רק אם הפרופיל פעיל, לא ממוזג, לא נעול (locked), לא בבנייה (building) ו-dossier_settings.visibility='public'
--   (כמו writer_public_contributions_page_v1). בפועל רק 32 מ-2,285 הזהויות הן ציבוריות; כל השאר (private) לא מופיעות ברשימות, בקרדיט או בספירת הכותבים, ותרומה שלהן מוצגת כ"חבר/ת הקהילה".
--   הסטטיסטיקות הכוללות של תוכן ציבורי אינן תלויות בפרופיל. אין שינוי סטטוס של עדכוני ערוץ: נספרים רק live, כפי שהם.
-- זכאות תוכן: תרומות approved/published ללא deleted_at (כלל דף הכותב); גימטריה ציבורית וזכאית; עדכוני ערוץ live; רשומות מחקר public ללא person_only עם עדכון-מקור קיים; צפנים published+public.
-- מהירות: ה-feed מסנן לפי מקור/זמן לפני הפעלת פונקציית הזכאות (מאות שורות, לא 12,579); ה-stats נמדד בנפרד ומיועד למטמון של 10 דקות (readDedupe + מטמון לקוח).
CREATE OR REPLACE FUNCTION public.discovery_center_feed_v1()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
WITH pubw AS (
  SELECT c.id, c.slug, c.display_name, c.kind, c.wa_names, (c.display_name = 'sod1820') AS is_site_account
  FROM public.contributors c
  WHERE c.active AND c.merged_into IS NULL AND NOT coalesce(c.locked, false) AND NOT coalesce(c.building, false)
    AND coalesce(c.dossier_settings->>'visibility', 'public') = 'public'
), names AS (
  SELECT p.id, lower(btrim(x)) AS nm FROM pubw p, LATERAL unnest(array[p.display_name] || coalesce(p.wa_names, '{}')) x WHERE nullif(btrim(x), '') IS NOT NULL
), uq AS (
  SELECT nm, (array_agg(id))[1] AS cid FROM names GROUP BY nm HAVING count(DISTINCT id) = 1
), cand AS (   -- מקורות עם שם: מסננים לפני פונקציית הזכאות
  SELECT g.id, g.phrase, g.ragil, g.source, g.created_at, u.cid, p.slug AS cslug, p.display_name AS cname
  FROM public.gematria_words g
  JOIN uq u ON u.nm = lower(btrim(regexp_replace(coalesce(g.source, ''), '^contribution:', '')))
  JOIN pubw p ON p.id = u.cid
  WHERE (g.is_encrypted = false OR g.is_encrypted IS NULL) AND g.is_verified AND g.is_published
    AND nullif(btrim(g.source), '') IS NOT NULL
    AND g.source !~* '^(promoted|excel_import|entity_|emotion_|auto:|admin_curated|wp_id|wa-vip)' AND lower(btrim(g.source)) <> 'sod1820'
), named AS (SELECT * FROM cand WHERE public.gematria_public_word_eligible(id)),
flag AS (
  SELECT (regexp_match(message, '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'))[1]::uuid AS wid FROM public.site_flags WHERE key = 'home_featured_discovery' AND enabled
), chosen AS (
  SELECT n.* FROM named n JOIN flag f ON f.wid = n.id WHERE public.public_discovery_writer_v1(n.id) IS NOT DISTINCT FROM n.cid
), featured AS (
  SELECT * FROM chosen UNION ALL
  (SELECT * FROM named WHERE NOT EXISTS (SELECT 1 FROM chosen) ORDER BY created_at DESC, id DESC LIMIT 1)
), recent_rc AS (
  SELECT r.id, r.created_at, r.parent_id, r.author_name, r.author_user_id, r.title, r.body,
         coalesce(r.author_contributor_id, CASE WHEN r.author_user_id IS NULL THEN (SELECT cid FROM uq WHERE nm = lower(btrim(r.author_name))) END) AS cid
  FROM public.research_contributions r WHERE r.deleted_at IS NULL AND r.status IN ('approved', 'published') AND r.created_at > now() - interval '30 days' AND nullif(btrim(r.body), '') IS NOT NULL
), ro30 AS (
  SELECT cu.contributor_id AS cid, count(*) AS n
  FROM public.research_objects o JOIN public.channel_updates cu ON split_part(coalesce(o.source_ref, ''), '#', 1) = 'channel_updates:' || cu.id::text
  WHERE o.created_at > now() - interval '30 days' AND o.privacy_scope = 'public' AND o.status IN ('approved', 'canonical', 'candidate') AND coalesce(o.meta #>> '{ext,personal_scope,scope}', '') <> 'person_only'
    AND cu.contributor_id IN (SELECT id FROM pubw)
  GROUP BY cu.contributor_id
), act AS (
  SELECT cid, 'contribution' AS kind, count(*) AS n FROM recent_rc WHERE cid IN (SELECT id FROM pubw) GROUP BY cid
  UNION ALL SELECT cid, 'gematria', count(*) FROM named WHERE created_at > now() - interval '30 days' GROUP BY cid
  UNION ALL SELECT cid, 'research', n FROM ro30
), writers AS (
  SELECT a.cid, p.slug, p.display_name, p.kind AS ckind, p.is_site_account,
         sum(a.n) FILTER (WHERE a.kind = 'contribution') AS contributions, sum(a.n) FILTER (WHERE a.kind = 'gematria') AS gematria,
         sum(a.n) FILTER (WHERE a.kind = 'research') AS research, sum(a.n) AS rank_key
  FROM act a JOIN pubw p ON p.id = a.cid GROUP BY a.cid, p.slug, p.display_name, p.kind, p.is_site_account ORDER BY sum(a.n) DESC, a.cid LIMIT 8
), latest_c AS (
  SELECT r.id, r.created_at, r.cid, r.author_name, r.author_user_id, r.title, r.body
  FROM recent_rc r WHERE r.parent_id IS NULL ORDER BY r.created_at DESC, r.id DESC LIMIT 5
)
SELECT jsonb_build_object(
  'generated_at', now(),
  'featured', (SELECT to_jsonb(f) FROM (SELECT id, phrase, ragil AS value, created_at, cname AS credit_name, cslug AS credit_slug FROM featured LIMIT 1) f),
  'latest_discoveries', coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM (SELECT id, phrase, ragil AS value, created_at, cname AS credit_name, cslug AS credit_slug FROM named ORDER BY created_at DESC, id DESC LIMIT 5) d), '[]'::jsonb),
  'latest_contributions', coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM (
      SELECT r.id, r.created_at,
             coalesce(nullif(left(btrim(regexp_replace(regexp_replace(coalesce(nullif(btrim(r.title), ''), btrim(r.body)), 'https?://\S+', '', 'g'), '\s+', ' ', 'g')), 120), ''), '(קישור)') AS excerpt,
             CASE WHEN p.id IS NOT NULL THEN p.display_name WHEN r.cid IS NOT NULL OR r.author_user_id IS NOT NULL THEN 'חבר/ת הקהילה' ELSE coalesce(nullif(btrim(r.author_name), ''), 'אורח') END AS author_name,
             p.slug AS author_slug
      FROM latest_c r LEFT JOIN pubw p ON p.id = r.cid ORDER BY r.created_at DESC, r.id DESC) c), '[]'::jsonb),
  'active_writers', coalesce((SELECT jsonb_agg(to_jsonb(w) - 'rank_key' - 'cid' ORDER BY w.rank_key DESC, w.slug) FROM writers w), '[]'::jsonb)
);
$$;
GRANT EXECUTE ON FUNCTION public.discovery_center_feed_v1() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.discovery_center_stats_v1()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
WITH pubw AS (
  SELECT c.id, c.display_name, c.wa_names FROM public.contributors c
  WHERE c.active AND c.merged_into IS NULL AND NOT coalesce(c.locked, false) AND NOT coalesce(c.building, false) AND coalesce(c.dossier_settings->>'visibility', 'public') = 'public'
), names AS (
  SELECT p.id, lower(btrim(x)) AS nm FROM pubw p, LATERAL unnest(array[p.display_name] || coalesce(p.wa_names, '{}')) x WHERE nullif(btrim(x), '') IS NOT NULL
), uq AS (SELECT nm, (array_agg(id))[1] AS cid FROM names GROUP BY nm HAVING count(DISTINCT id) = 1),
pub_rc AS (SELECT DISTINCT coalesce(r.author_contributor_id, CASE WHEN r.author_user_id IS NULL THEN (SELECT cid FROM uq WHERE nm = lower(btrim(r.author_name))) END) AS cid
  FROM public.research_contributions r WHERE r.deleted_at IS NULL AND r.status IN ('approved', 'published') AND nullif(btrim(r.body), '') IS NOT NULL
   AND (r.author_contributor_id IN (SELECT id FROM pubw) OR (r.author_contributor_id IS NULL AND r.author_user_id IS NULL AND lower(btrim(r.author_name)) IN (SELECT nm FROM uq)))),
pub_ro AS (SELECT DISTINCT cu.contributor_id AS cid FROM public.channel_updates cu JOIN public.research_objects o ON split_part(coalesce(o.source_ref, ''), '#', 1) = 'channel_updates:' || cu.id::text
  WHERE cu.contributor_id IN (SELECT id FROM pubw) AND o.privacy_scope = 'public' AND o.status IN ('approved', 'canonical', 'candidate') AND coalesce(o.meta #>> '{ext,personal_scope,scope}', '') <> 'person_only'),
pub_gw AS (
  WITH c AS MATERIALIZED (   -- מסננים לפי שם וקרדיט לפני פונקציית הזכאות (מאות שורות, לא 12,579)
    SELECT g.id, u.cid FROM public.gematria_words g JOIN uq u ON u.nm = lower(btrim(regexp_replace(coalesce(g.source, ''), '^contribution:', '')))
    WHERE (g.is_encrypted = false OR g.is_encrypted IS NULL) AND g.is_verified AND g.is_published AND lower(btrim(g.source)) <> 'sod1820')
  SELECT DISTINCT cid FROM c WHERE public.gematria_public_word_eligible(id))
SELECT jsonb_build_object(
  'generated_at', now(),
  'gematria_public', (SELECT count(*) FROM public.gematria_words g WHERE (g.is_encrypted = false OR g.is_encrypted IS NULL) AND g.is_verified AND g.is_published AND public.gematria_public_word_eligible(g.id)),
  'contributions', (SELECT count(*) FROM public.research_contributions r WHERE r.deleted_at IS NULL AND r.status IN ('approved', 'published') AND r.parent_id IS NULL AND nullif(btrim(r.body), '') IS NOT NULL),
  'replies', (SELECT count(*) FROM public.research_contributions r WHERE r.deleted_at IS NULL AND r.status IN ('approved', 'published') AND r.parent_id IS NOT NULL AND nullif(btrim(r.body), '') IS NOT NULL),
  'research_public', (SELECT count(*) FROM public.research_objects o LEFT JOIN public.channel_updates cu ON split_part(coalesce(o.source_ref, ''), '#', 1) = 'channel_updates:' || cu.id::text
      WHERE o.privacy_scope = 'public' AND o.status IN ('approved', 'canonical', 'candidate') AND coalesce(o.meta #>> '{ext,personal_scope,scope}', '') <> 'person_only'
        AND (split_part(coalesce(o.source_ref, ''), '#', 1) NOT LIKE 'channel_updates:%' OR cu.id IS NOT NULL)),
  'updates_live', (SELECT count(*) FROM public.channel_updates WHERE status = 'live' AND (expires_at IS NULL OR expires_at > now())),
  'ciphers_public', (SELECT count(*) FROM public.els_records WHERE status = 'published' AND visibility = 'public'),
  'writers_with_public_material', (SELECT count(DISTINCT cid) FROM (SELECT cid FROM pub_rc WHERE cid IN (SELECT id FROM pubw) UNION SELECT cid FROM pub_ro UNION SELECT cid FROM pub_gw) w)
);
$$;
GRANT EXECUTE ON FUNCTION public.discovery_center_stats_v1() TO anon, authenticated;
