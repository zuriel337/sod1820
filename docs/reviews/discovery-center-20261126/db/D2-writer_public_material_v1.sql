-- D2 · writer_public_material_v1(p_contributor_id, p_kind, p_limit, p_before) · כל החומר הציבורי של כותב אחד, לפי סוגי תוכן, בלי כפילויות.
-- *** טיוטה לאישור מדויק. לא הוחלה. *** קריאה בלבד: STABLE, SECURITY DEFINER, search_path=public. מרחיבה את writer_public_contributions_page_v1 (אותו שומר כותב, אותו כלל שיוך).
-- שיוך: מזהה תורם ← מזהה משתמש ← שם/כינוי ייחודי בלבד (שם עמום או בלי זהות לא משויך). עדכוני ערוץ/רשומות מחקר/חומר עמוד: לפי מזהה. צפנים: לפי בעלים (משתמש).
-- זכאות: תרומות approved/published; גימטריה ציבורית וזכאית; עדכוני ערוץ live; רשומות מחקר public (ללא person_only); צפנים published+public; חומר עמוד is_public ולא אישי.
-- מוסתר/ממתין/פרטי לעולם לא מוחזר. dedupe_key = סוג + מזהה קנוני: פריט נספר פעם אחת. אין מספרי טלפון, מיילים או מדיה לא ציבורית.
-- p_kind: contribution | reply | research | gematria | update | cipher | content, או NULL לכולם. עימוד לפי p_before (created_at).
CREATE OR REPLACE FUNCTION public.writer_public_material_v1(p_contributor_id uuid, p_kind text DEFAULT NULL, p_limit integer DEFAULT 50, p_before timestamptz DEFAULT NULL)
RETURNS TABLE(kind text, ref_id text, created_at timestamptz, dedupe_key text, title text, excerpt text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
WITH p AS (
  SELECT c.id AS cid, c.user_id AS uid FROM public.contributors c
  WHERE c.id = p_contributor_id AND c.active AND c.merged_into IS NULL AND NOT coalesce(c.locked, false) AND NOT coalesce(c.building, false)
    AND coalesce(c.dossier_settings->>'visibility', 'public') = 'public'
), names AS (
  SELECT c.id, lower(btrim(x)) AS nm FROM public.contributors c, LATERAL unnest(array[c.display_name] || coalesce(c.wa_names, '{}')) x
  WHERE c.active AND c.merged_into IS NULL AND nullif(btrim(x), '') IS NOT NULL
), uq AS (SELECT nm, (array_agg(id))[1] AS cid FROM names GROUP BY nm HAVING count(DISTINCT id) = 1),
items AS (
  SELECT 'contribution'::text AS kind, r.id::text AS ref_id, r.created_at, 'rc:' || r.id AS dedupe_key, nullif(btrim(r.title), '') AS title, left(btrim(regexp_replace(r.body, 'https?://\S+', '', 'g')), 200) AS excerpt
  FROM p JOIN public.research_contributions r ON r.deleted_at IS NULL AND r.status IN ('approved', 'published') AND r.parent_id IS NULL
   AND (r.author_contributor_id = p.cid OR (r.author_contributor_id IS NULL AND r.author_user_id IS NOT NULL AND r.author_user_id = p.uid)
        OR (r.author_contributor_id IS NULL AND r.author_user_id IS NULL AND EXISTS (SELECT 1 FROM uq WHERE uq.cid = p.cid AND uq.nm = lower(btrim(r.author_name)))))
  UNION ALL
  SELECT 'reply', r.id::text, r.created_at, 'rc:' || r.id, NULL, left(btrim(regexp_replace(r.body, 'https?://\S+', '', 'g')), 200)
  FROM p JOIN public.research_contributions r ON r.deleted_at IS NULL AND r.status IN ('approved', 'published') AND r.parent_id IS NOT NULL AND r.author_contributor_id = p.cid
  UNION ALL
  SELECT 'gematria', g.id::text, g.created_at, 'gw:' || g.id, g.phrase, g.phrase || ' = ' || g.ragil
  FROM p JOIN public.gematria_words g ON (g.is_encrypted = false OR g.is_encrypted IS NULL) AND g.is_verified AND g.is_published AND public.gematria_public_word_eligible(g.id)
   AND EXISTS (SELECT 1 FROM uq WHERE uq.cid = p.cid AND uq.nm = lower(btrim(regexp_replace(coalesce(g.source, ''), '^contribution:', ''))))
  UNION ALL
  SELECT 'research', o.id::text, o.created_at, 'ro:' || o.id, NULL, left(btrim(o.statement), 200)
  FROM p JOIN public.channel_updates cu ON cu.contributor_id = p.cid
  JOIN public.research_objects o ON split_part(coalesce(o.source_ref, ''), '#', 1) = 'channel_updates:' || cu.id::text
   AND o.privacy_scope = 'public' AND o.status IN ('approved', 'canonical', 'candidate') AND coalesce(o.meta #>> '{ext,personal_scope,scope}', '') <> 'person_only'
  UNION ALL
  SELECT 'update', cu.id::text, cu.created_at, 'cu:' || cu.id, nullif(btrim(cu.seo_title), ''), left(btrim(regexp_replace(coalesce(cu.text, ''), 'https?://\S+', '', 'g')), 200)
  FROM p JOIN public.channel_updates cu ON cu.contributor_id = p.cid AND cu.status = 'live' AND (cu.expires_at IS NULL OR cu.expires_at > now())
  UNION ALL
  SELECT 'cipher', e.id::text, e.created_at, 'els:' || e.id, e.title, left(btrim(coalesce(e.description, '')), 200)
  FROM p JOIN public.els_records e ON e.owner_user_id = p.uid AND e.status = 'published' AND e.visibility = 'public'
  UNION ALL
  SELECT 'content', cc.id::text, cc.created_at, 'cc:' || cc.id, nullif(btrim(cc.title), ''), left(btrim(coalesce(cc.body, '')), 200)
  FROM p JOIN public.contributor_content cc ON cc.contributor_id = p.cid AND cc.is_public AND NOT cc.is_personal
)
SELECT i.kind, i.ref_id, i.created_at, i.dedupe_key, i.title, i.excerpt FROM items i
WHERE (p_kind IS NULL OR i.kind = p_kind) AND (p_before IS NULL OR i.created_at < p_before)
ORDER BY i.created_at DESC, i.dedupe_key
LIMIT greatest(1, least(coalesce(p_limit, 50), 100));
$$;
GRANT EXECUTE ON FUNCTION public.writer_public_material_v1(uuid, text, integer, timestamptz) TO anon, authenticated;
