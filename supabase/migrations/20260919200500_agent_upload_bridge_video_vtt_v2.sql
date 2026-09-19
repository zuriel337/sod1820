-- AGENT_MEDIA_UPLOAD_BRIDGE_V1 — הרחבה ל-video/mp4 ו-text/vtt.
-- -----------------------------------------------------------------------------
-- EXTEND_EXISTING (CLAUDE.md §7): אותו בעלים, אותו גשר, אותם prefixes מאושרים.
-- לא נוצרת מערכת-העלאה מקבילה ולא נפתח נתיב חדש.
--
-- הצורך: סדרת «מה קורה הבורא» מגישה וידאו מתארח-עצמית + מסלולי כתוביות he/en.
-- עד כה הגשר התיר תמונות בלבד, ולכן כל סרטון חייב העלאה ידנית של ZURIEL.
--
-- מה *לא* משתנה — שכבות ההגנה נשארות במלואן:
--   · agent_upload_allowed_prefixes  — ללא שינוי (gallery: sod1820/posts/, sod1820/agent/;
--     media: sod1820/agent/, sod1820/2029/). אין גישה לשום נתיב חדש.
--   · תקרת הגודל בכרטיס — ללא שינוי (max_bytes <= 26214400 = 25MiB).
--   · כרטיס חד-פעמי עם TTL <= 600 שניות, sha256 אופציונלי, allow_overwrite מפורש.
--   · ההרשאות: execute ל-service_role בלבד; anon/authenticated/PUBLIC חסומים.
--   · התאמת סיומת↔mime נאכפת כמו קודם דרך agent_upload_mime_extensions.

create or replace function public.agent_upload_allowed_mimes()
returns text[] language sql immutable set search_path to 'public' as $$
  select array['image/png', 'image/jpeg', 'image/webp', 'image/gif',
               'video/mp4', 'text/vtt'];
$$;

create or replace function public.agent_upload_mime_extensions(p_mime text)
returns text[] language sql immutable set search_path to 'public' as $$
  select case p_mime
    when 'image/png'  then array['png']
    when 'image/jpeg' then array['jpg', 'jpeg']
    when 'image/webp' then array['webp']
    when 'image/gif'  then array['gif']
    when 'video/mp4'  then array['mp4']
    when 'text/vtt'   then array['vtt']
    else array[]::text[]
  end;
$$;
