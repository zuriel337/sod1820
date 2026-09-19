-- «מה קורה הבורא» — פרסום מתוזמן של סרטון הסערה / הסרט «נז״א» (אלון לוי).
-- -----------------------------------------------------------------------------
-- מקור: TikTok @makorehabore video 7686118687648271624 (הועלה 16.9.2026, 4:47 דק').
--
-- תבנית: זהה ל-public.sod_publish_spain_alonlevy — SECURITY DEFINER, אידמפוטנטי לפי slug,
--   insert ל-public.posts עם overriding system value. אין מנגנון-סטטוס לפוסטים בסכימה;
--   ההסתרה הקנונית היא תגית «טיוטה» (נאכפת ב-getPostsFromSupabase, get_reality_videos,
--   get_category_videos, homeUpdates, DimensionFiveRail/Cloud). לכן «תזמון» = עבודת
--   cron חד-פעמית שמפרסמת בזמן היעד ומבטלת את עצמה — בדיוק כמו sod_jerusalem_reels.
--
-- ⚠️ שער-אמת (CLAUDE.md §11): גוף-הפוסט (התמלול המלא + הקריאה הפרשנית של אלון לוי)
--    חייב להגיע כטקסט מ-ZURIEL. video_transcription_law קובע במפורש «אין STT מאודיו»,
--    ולטיקטוק אין כתוביות לסרטון הזה. אסור להמציא פרשנות ולייחס אותה לאלון לוי.
--    לכן הפונקציה חוסמת את עצמה כל עוד הסמן __PENDING_TRANSCRIPT__ נמצא בתוכן.
--
-- ⚠️ קבצי-מדיה: גשר-ההעלאה לסוכנים (agent_upload_allowed_mimes) מתיר תמונות בלבד,
--    ולכן ה-mp4 חייב להיעלות ל-media/uploads/2026/09/ בידי ZURIEL/service-role.

create or replace function public.sod_publish_mah_kore_nza()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_id   int  := (select coalesce(max(id),0)+1 from public.posts);
  v_wp   int  := (select coalesce(max(wp_id),0)+1 from public.posts);
  v_slug text := 'mah-kore-nza-hasoara';
  v_vid    text := 'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2026/09/mah-kore-nza-hasoara.mp4';
  v_poster text := 'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2026/09/mah-kore-nza-hasoara-poster.jpg';
  v_exist int;
  v_title   text := $ti$מה קורה הבורא — המסר שמאחורי הסערה בארץ והסרט «נז״א» | אלון לוי$ti$;
  v_excerpt text := $ex$__PENDING_TRANSCRIPT__$ex$;
  v_content text := $ct$
<div style="text-align:center;margin:8px 0 18px;">
<video crossorigin="anonymous" src="https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2026/09/mah-kore-nza-hasoara.mp4" controls playsinline preload="none" poster="https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2026/09/mah-kore-nza-hasoara-poster.jpg" style="width:100%;max-width:340px;border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.45);background:#000;"><track kind="subtitles" src="https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/videos/mah-kore-nza-hasoara.he.vtt" srclang="he" label="עברית" default></track><track kind="subtitles" src="https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/videos/mah-kore-nza-hasoara.en.vtt" srclang="en" label="English"></track></video>
<div style="font-size:12.5px;color:#9a8a66;margin-top:6px;">🎬 «מה קורה הבורא» · אלון לוי · כתוביות עברית + English (⚙️/CC) · תמלול מלא למטה</div>
</div>

__PENDING_TRANSCRIPT__

<div style="margin:22px 0 6px;"><a class="sod-post-cta" href="/reality">🌌 עוד מקוד המציאות ←</a></div>

<h3>ראו גם</h3>
<ul>
<li><a href="/ason-hashitafon-nepal-yom-hadin">אסון השיטפון בנפאל — הצופן של יום הדין ונבואת נחום | אלון לוי</a></li>
<li><a href="/altalena-elul">הספינה אלטלנה, חודש אלול ושיר «נדנדה» של ביאליק | אלון לוי</a></li>
<li><a href="/mah-kore-mali-liel">מה קורה הבורא — הסודות הקבליים של מלי וליאל יהלומי</a></li>
</ul>
$ct$;
begin
  -- שער-אמת: לא מפרסמים שלד. כל עוד התמלול/הפרשנות לא הוזנו — עוצרים.
  if position('__PENDING_TRANSCRIPT__' in v_content) > 0
     or position('__PENDING_TRANSCRIPT__' in v_excerpt) > 0 then
    raise exception 'sod_publish_mah_kore_nza: transcript/analysis not supplied yet — refusing to publish a placeholder post';
  end if;

  -- אידמפוטנטיות: ריצה חוזרת לא יוצרת כפילות
  select id into v_exist from public.posts where slug = v_slug limit 1;
  if v_exist is not null then
    return jsonb_build_object('skip','already exists','post_id',v_exist);
  end if;

  insert into public.posts (id, wp_id, title, slug, content, excerpt, date, modified,
     categories, tags, source, author, theme, space, image_url, share_to_fb)
  overriding system value
  values (v_id, v_wp, v_title, v_slug, v_content, v_excerpt, now(), now(),
     array['תיעוד אירועים','וידאו'],
     array['אלון לוי','מה קורה הבורא','נז״א','סערה','גאולה','השגחה פרטית'],
     'ai','אלון לוי','auto','core', v_poster, false);

  return jsonb_build_object('done', now(), 'post_id', v_id, 'wp_id', v_wp, 'slug', v_slug);
end;
$fn$;

revoke all on function public.sod_publish_mah_kore_nza() from public, anon, authenticated;

-- ⏰ חימוש התזמון — הרצה חד-פעמית שמבטלת את עצמה (תבנית sod_jerusalem_reels).
-- 2026-09-20 21:00 שעון ישראל (IDT = UTC+3)  ==  18:00 UTC  →  '0 18 20 9 *'
-- ⚠️ מושבת בכוונה עד שהתוכן מלא ו-ZURIEL מאשר את התאריך. להסרת ההערה בעת החימוש:
--
-- select cron.schedule('sod-mah-kore-nza-publish','0 18 20 9 *',
--   $cron$ select cron.unschedule('sod-mah-kore-nza-publish'); select public.sod_publish_mah_kore_nza(); $cron$);
