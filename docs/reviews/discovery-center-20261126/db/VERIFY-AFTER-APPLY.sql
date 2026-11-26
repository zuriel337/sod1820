-- בדיקות קריאה בלבד שירוצו מיד אחרי החלה מאושרת של D0-D5 (כל אחת צריכה להחזיר את הערך הצפוי).
-- הרשאות (צפוי): anon/authenticated רשאים להריץ D1 (feed,stats), D2, D0 public_discovery_writer_v1; רק authenticated D3 (ובתוכו rd_is_admin); אף אחד לא D0 rc_unique_contributor_for_user_v1 ולא פונקציית הטריגר.
SELECT
  has_function_privilege('anon', 'public.discovery_center_feed_v1()', 'execute')                         AS anon_feed,            -- true
  has_function_privilege('anon', 'public.discovery_center_stats_v1()', 'execute')                        AS anon_stats,           -- true
  has_function_privilege('anon', 'public.writer_public_material_v1(uuid,text,integer,timestamptz,text)', 'execute') AS anon_writer_material,  -- true
  has_function_privilege('anon', 'public.admin_set_home_featured_discovery_v1(uuid)', 'execute')         AS anon_admin_set,       -- false
  has_function_privilege('authenticated', 'public.admin_set_home_featured_discovery_v1(uuid)', 'execute') AS auth_admin_set,      -- true (ובתוכו rd_is_admin)
  has_function_privilege('anon', 'public.rc_unique_contributor_for_user_v1(uuid)', 'execute')            AS anon_internal_rule,   -- false
  has_function_privilege('authenticated', 'public.rc_resolve_author_contributor()', 'execute')           AS auth_trigger_fn;      -- false
-- פרטיות: הפלט של ה-feed אינו מכיל כותב עם פרופיל פרטי/נעול (צפוי 0):
SELECT count(*) AS private_writers_in_feed FROM jsonb_array_elements(public.discovery_center_feed_v1()->'active_writers') w
 JOIN public.contributors c ON c.slug = w->>'slug' WHERE coalesce(c.locked, false) OR coalesce(c.building, false) OR coalesce(c.dossier_settings->>'visibility', 'public') <> 'public';
-- כותב פרטי מחזיר אפס שורות (צפוי 0):  SELECT count(*) FROM public.writer_public_material_v1((SELECT id FROM public.contributors WHERE slug = 'openweb-u-zawigiuo'));
-- שקילות בחירה/הצגה (צפוי 0): כל גילוי ש-D3 מאפשר לבחור מוצג ב-D1 ולהפך (נבדק על נתוני אמת: 646 מועמדים, 260/260, 0 אי-התאמות).
-- אין שינוי סטטוס עדכוני ערוץ: SELECT count(*) FROM public.channel_updates WHERE status = 'published';  -- צפוי 135 (לא השתנה)
