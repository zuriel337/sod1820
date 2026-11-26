-- D1 · discovery_center_home_v1() · קורא מאוחד לדף הבית: סטטיסטיקות לפי סוג, גילוי נבחר, גילויים חדשים, תרומות חדשות, כותבים פעילים.
-- *** טיוטה לאישור מדויק. לא הוחלה. *** קריאה בלבד: STABLE, SECURITY DEFINER, search_path=public. אין טבלה חדשה.
-- זכאות ציבורית (כללי ה-RLS והכלל הקנוני של דף הכותב, לא הרחבה): תרומות approved/published בלי deleted_at (כמו writer_public_contributions_page_v1);
-- גימטריה: לא מוצפנת, is_verified, is_published, gematria_public_word_eligible(id); עדכוני ערוץ: status='live' ולא פג תוקף (cu_public_read);
-- רשומות מחקר: privacy_scope='public', סטטוס approved/canonical/candidate, לא person_only, ועדכון-מקור קיים (כמו world_contributor_research_v2, בלי סעיף המנהל);
-- צפנים: status='published' AND visibility='public' (public_read_published_els). מוסתר/ממתין/פרטי לעולם לא נכלל. אין טלפון/מייל/מדיה לא ציבורית.
-- שיוך: כלל הכותב הקנוני (מזהה ← שם/כינוי ייחודי). חשבון האתר sod1820 מסומן is_site_account ואינו כותב אנושי. מקורות תוכן מסומנים בצד הלקוח (CONTENT_SOURCES_2029).
-- גילויים חדשים/ברירת מחדל מוצגים רק עם כותב מזוהה (cid) ולא עם תווית פנימית של סשן/מערכת. קישורים גולמיים מוסרים מקטעי התרומות.
-- הגילוי הנבחר: site_flags['home_featured_discovery'].message = מזהה גימטריה ציבורית (נקבע דרך D3). אם אין, או שאינו זכאי: הגילוי האחרון עם מקור וקרדיט.
CREATE OR REPLACE FUNCTION public.discovery_center_home_v1()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
WITH names AS (
  SELECT c.id, c.slug, c.display_name, c.kind, lower(btrim(x)) AS nm
  FROM public.contributors c, LATERAL unnest(array[c.display_name] || coalesce(c.wa_names, '{}')) x
  WHERE c.active AND c.merged_into IS NULL AND nullif(btrim(x), '') IS NOT NULL
    AND NOT coalesce(c.locked, false) AND NOT coalesce(c.building, false) AND coalesce(c.dossier_settings->>'visibility', 'public') = 'public'
), uq AS (
  SELECT nm, (array_agg(id))[1] AS cid, (array_agg(slug))[1] AS slug, (array_agg(display_name))[1] AS display_name, (array_agg(kind))[1] AS kind
  FROM names GROUP BY nm HAVING count(DISTINCT id) = 1
), gw AS (
  SELECT g.id, g.phrase, g.ragil, g.source, g.created_at
  FROM public.gematria_words g
  WHERE (g.is_encrypted = false OR g.is_encrypted IS NULL) AND g.is_verified AND g.is_published AND public.gematria_public_word_eligible(g.id)
), named AS (
  SELECT gw.id, gw.phrase, gw.ragil, gw.created_at, gw.source, u.cid, u.slug AS cslug, u.display_name AS cname
  FROM gw LEFT JOIN uq u ON u.nm = lower(btrim(regexp_replace(coalesce(gw.source, ''), '^contribution:', '')))
  WHERE nullif(btrim(gw.source), '') IS NOT NULL
    AND gw.source !~* '^(promoted|excel_import|entity_|emotion_|auto:|admin_curated|wp_id|wa-vip)' AND lower(btrim(gw.source)) <> 'sod1820'
), flag AS (
  SELECT (regexp_match(message, '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'))[1]::uuid AS wid FROM public.site_flags WHERE key = 'home_featured_discovery' AND enabled
), chosen AS (
  SELECT n.* FROM named n JOIN flag f ON f.wid = n.id
), featured AS (
  SELECT * FROM chosen UNION ALL
  (SELECT * FROM named WHERE cid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM chosen) ORDER BY created_at DESC LIMIT 1)
), rc AS (
  SELECT r.id, r.created_at, r.parent_id, r.author_name, r.title, r.body,
         coalesce(r.author_contributor_id, CASE WHEN r.author_user_id IS NULL THEN (SELECT cid FROM uq WHERE nm = lower(btrim(r.author_name))) END) AS cid
  FROM public.research_contributions r WHERE r.deleted_at IS NULL AND r.status IN ('approved', 'published') AND nullif(btrim(r.body), '') IS NOT NULL
), ro AS (
  SELECT o.id, o.created_at, cu.contributor_id AS cid
  FROM public.research_objects o JOIN public.channel_updates cu ON split_part(coalesce(o.source_ref, ''), '#', 1) = 'channel_updates:' || cu.id::text
  WHERE o.privacy_scope = 'public' AND o.status IN ('approved', 'canonical', 'candidate') AND coalesce(o.meta #>> '{ext,personal_scope,scope}', '') <> 'person_only'
), act AS (
  SELECT cid, 'contribution' AS kind, count(*) AS n FROM rc WHERE cid IS NOT NULL AND created_at > now() - interval '30 days' GROUP BY cid
  UNION ALL SELECT cid, 'gematria', count(*) FROM named WHERE cid IS NOT NULL AND created_at > now() - interval '30 days' GROUP BY cid
  UNION ALL SELECT cid, 'research', count(*) FROM ro WHERE cid IS NOT NULL AND created_at > now() - interval '30 days' GROUP BY cid
), writers AS (
  SELECT a.cid, c.slug, c.display_name, c.kind AS ckind, (c.display_name = 'sod1820') AS is_site_account,
         sum(a.n) FILTER (WHERE a.kind = 'contribution') AS contributions,
         sum(a.n) FILTER (WHERE a.kind = 'gematria') AS gematria,
         sum(a.n) FILTER (WHERE a.kind = 'research') AS research,
         sum(a.n) AS rank_key
  FROM act a JOIN public.contributors c ON c.id = a.cid AND c.active AND c.merged_into IS NULL
  GROUP BY a.cid, c.slug, c.display_name, c.kind ORDER BY sum(a.n) DESC LIMIT 8
)
SELECT jsonb_build_object(
  'generated_at', now(),
  'stats', jsonb_build_object(
    'gematria_public', (SELECT count(*) FROM gw),
    'contributions', (SELECT count(*) FROM rc WHERE parent_id IS NULL),
    'replies', (SELECT count(*) FROM rc WHERE parent_id IS NOT NULL),
    'research_public', (SELECT count(*) FROM public.research_objects o LEFT JOIN public.channel_updates cu ON split_part(coalesce(o.source_ref, ''), '#', 1) = 'channel_updates:' || cu.id::text
        WHERE o.privacy_scope = 'public' AND o.status IN ('approved', 'canonical', 'candidate') AND coalesce(o.meta #>> '{ext,personal_scope,scope}', '') <> 'person_only'
          AND (split_part(coalesce(o.source_ref, ''), '#', 1) NOT LIKE 'channel_updates:%' OR cu.id IS NOT NULL)),
    'updates_live', (SELECT count(*) FROM public.channel_updates WHERE status = 'live' AND (expires_at IS NULL OR expires_at > now())),
    'ciphers_public', (SELECT count(*) FROM public.els_records WHERE status = 'published' AND visibility = 'public'),
    'writers_with_public_material', (SELECT count(DISTINCT cid) FROM (SELECT cid FROM rc WHERE cid IS NOT NULL UNION SELECT cid FROM ro WHERE cid IS NOT NULL UNION SELECT cid FROM named WHERE cid IS NOT NULL) w)
  ),
  'featured', (SELECT to_jsonb(f) - 'source' FROM (SELECT id, phrase, ragil AS value, created_at, cname AS credit_name, cslug AS credit_slug, source AS credit_text FROM featured LIMIT 1) f),
  'latest_discoveries', coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM (SELECT id, phrase, ragil AS value, created_at, coalesce(cname, source) AS credit_name, cslug AS credit_slug FROM named WHERE cid IS NOT NULL ORDER BY created_at DESC LIMIT 5) d), '[]'::jsonb),
  'latest_contributions', coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM (
      SELECT r.id, r.created_at, coalesce(nullif(left(btrim(regexp_replace(regexp_replace(coalesce(nullif(btrim(r.title), ''), btrim(r.body)), 'https?://\S+', '', 'g'), '\s+', ' ', 'g')), 120), ''), '(קישור)') AS excerpt,
             coalesce(ct.display_name, nullif(btrim(r.author_name), ''), 'אורח') AS author_name, ct.slug AS author_slug
      FROM rc r LEFT JOIN public.contributors ct ON ct.id = r.cid WHERE r.parent_id IS NULL ORDER BY r.created_at DESC LIMIT 5) c), '[]'::jsonb),
  'active_writers', coalesce((SELECT jsonb_agg(to_jsonb(w) - 'rank_key' - 'cid' ORDER BY w.rank_key DESC) FROM writers w), '[]'::jsonb)
);
$$;
GRANT EXECUTE ON FUNCTION public.discovery_center_home_v1() TO anon, authenticated;
