-- Extend publishing_conventions and the existing posts write boundary. No new table/store/writer.
create or replace function public.guard_post_image_representations()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $guard$
declare
  prefix constant text := 'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/';
  reading_path text;
  preview_path text;
  reading_dir text;
  candidate text;
  reading_meta jsonb;
  preview_meta jsonb;
begin
  if TG_OP = 'UPDATE' and NEW.image_url is not distinct from OLD.image_url
     and NEW.thumb_url is not distinct from OLD.thumb_url then return NEW; end if;
  if nullif(btrim(NEW.image_url), '') is null then
    if nullif(btrim(NEW.thumb_url), '') is not null then
      raise exception using errcode='23514', message='POST_IMAGE_READING_REQUIRED';
    end if;
    return NEW;
  end if;
  if left(NEW.image_url, length(prefix)) <> prefix then
    raise exception using errcode='23514', message='POST_IMAGE_CANONICAL_REQUIRED';
  end if;
  reading_path := substring(NEW.image_url from length(prefix)+1);
  if reading_path !~ '^sod1820/2029/(image|video)/[0-9]{4}/[0-9]{2}/[A-Za-z0-9_-]+/([A-Za-z0-9_-]+/)*[A-Za-z0-9_.-]+\.(jpg|jpeg|png)$'
     or reading_path ~ '(^|/)\.\.?(/|$)' then
    raise exception using errcode='23514', message='POST_IMAGE_CANONICAL_REQUIRED';
  end if;
  reading_dir := regexp_replace(reading_path, '[^/]+$', '');
  select metadata into reading_meta from storage.objects where bucket_id='media' and name=reading_path;
  if reading_meta is null or coalesce(reading_meta->>'mimetype','') not in ('image/jpeg','image/png')
     or coalesce((reading_meta->>'size')::bigint,0) not between 1 and 600000 then
    raise exception using errcode='23514', message='POST_IMAGE_READING_INVALID_OR_TOO_LARGE';
  end if;
  -- Both existing writers accept image_url only. Resolve a VERIFIED sibling, never the heavy source.
  if nullif(btrim(NEW.thumb_url), '') is null
     or (TG_OP='UPDATE' and NEW.thumb_url is not distinct from OLD.thumb_url and NEW.image_url is distinct from OLD.image_url) then
    NEW.thumb_url := null;
    foreach candidate in array array[reading_dir || 'preview.jpg', reading_dir || 'thumb-fast-v1.jpg'] loop
      if exists (select 1 from storage.objects where bucket_id='media' and name=candidate
                 and metadata->>'mimetype' in ('image/jpeg','image/png')
                 and coalesce((metadata->>'size')::bigint,0) between 1 and 100000) then
        NEW.thumb_url := prefix || candidate; exit;
      end if;
    end loop;
  end if;
  if NEW.thumb_url is null or left(NEW.thumb_url,length(prefix)) <> prefix or NEW.thumb_url=NEW.image_url then
    raise exception using errcode='23514', message='POST_IMAGE_PREVIEW_REQUIRED';
  end if;
  preview_path := substring(NEW.thumb_url from length(prefix)+1);
  if regexp_replace(preview_path,'[^/]+$','') <> reading_dir
     or preview_path !~ '^sod1820/2029/(image|video)/[0-9]{4}/[0-9]{2}/[A-Za-z0-9_-]+/([A-Za-z0-9_-]+/)*[A-Za-z0-9_.-]+\.(jpg|jpeg|png)$'
     or preview_path ~ '(^|/)\.\.?(/|$)' then
    raise exception using errcode='23514', message='POST_IMAGE_PREVIEW_IDENTITY_MISMATCH';
  end if;
  select metadata into preview_meta from storage.objects where bucket_id='media' and name=preview_path;
  if preview_meta is null or coalesce(preview_meta->>'mimetype','') not in ('image/jpeg','image/png')
     or coalesce((preview_meta->>'size')::bigint,0) not between 1 and 100000 then
    raise exception using errcode='23514', message='POST_IMAGE_PREVIEW_INVALID_OR_TOO_LARGE';
  end if;
  return NEW;
end;
$guard$;
revoke all on function public.guard_post_image_representations() from public, anon, authenticated;
drop trigger if exists trg_post_image_representations on public.posts;
create trigger trg_post_image_representations before insert or update of image_url,thumb_url on public.posts
for each row execute function public.guard_post_image_representations();
comment on function public.guard_post_image_representations() is 'publishing_conventions FAST IMAGE DELIVERY V2: enforced on changed/new post image pointers; legacy unchanged media preserved';
update public.project_codex set body = split_part(body,'—— FAST IMAGE DELIVERY V1',1) || $contract$—— FAST IMAGE DELIVERY V2 · ZURIEL 12.10.2026 · EXTEND_EXISTING ——
חובת מערכת בחוזה הפרסום והמדיה לכל העלאה, ייבוא, החלפה ופרסום, ידניים ואוטומטיים. אותה זהות מדיה בשלושה ייצוגים: מקור מדויק שמור; תמונת קריאה חדה בתוך הפוסט; תמונה קטנה וקלה לרשימות ולדף הבית. אין ליצור זהות/מאגר/מסלול פרסום נוסף.
thumb_url: רוחב עד480px, יעד60KB, תקרה100,000bytes. image_url: תמונת קריאה עד1600px (ללא הגדלת מקור), איכות מותאמת לקריאות אותיות ומספרים, יעד350KB ותקרה600,000bytes. JPEG איכות85–92; PNG מוצדק בלבד במסגרת המשקל. יחס התמונה נשמר. תמונת קריאה אינה נחתכת או מוכהית כשהיא מכילה טקסט; משתמשים בתצוגת הכרטיס השלמה הקיימת. אין להחיל תקציב תמונה קטנה על תמונת הקריאה.
המקור המדויק נשמר בנפרד באחסון הקנוני ובגיבוי המאושר, ואינו מוחלף בנגזרת. מקור/קריאה/תמונה קטנה הם ייצוגים של אותה זהות מדיה, עם קריאה חוזרת מהאחסון ומשקל/MIME מאומתים. נגזרות באותה תיקיית מדיה; שם סטנדרטי derivatives/reading.jpg ו-derivatives/preview.jpg. נשמרת תמיכה בנגזרות המאומתות הקיימות cover-fast-v1.jpg/reading-v2.jpg ו-thumb-fast-v1.jpg.
רשימות וכרטיסי הבית צורכים thumb_url; image_url בתוך פוסט. מקור/תמונה חדה נפתחים במכוון להגדלה דרך המנגנון הקיים. תמונות מחוץ למסך נטענות עצלות; תמונה ראשית גלויה יכולה להיטען מיד. OG נשאר JPG/PNG מאומת לפי post_og_image_law.
אכיפה בשמירת posts: כל INSERT עם image_url או שינוי image_url/thumb_url מחייב זוג ייצוגים שונים באותה תיקיית מדיה קנונית, קיימים באחסון ועם MIME/משקל במסגרת התקציב. sys_save_post/admin_save_post/כתיבה ישירה כפופים לאותה בדיקת שמירה; כש-thumb_url לא נמסר, מותר לחבר רק נגזרת קיימת מאומתת באותה תיקייה. חסר/כבד/סוג לא תקין חוסם את השמירה ומשאיר את הפרסום התקין הקודם. אין fallback שקט למקור כבד. פוסט טקסט ללא תמונה מותר; עריכת טקסט בלבד בפוסט היסטורי אינה מחייבת הסבת מדיה ישנה.
מידות וקריאות חזותית נבדקות בעת יצירת הנגזרות; בדיקת האחסון במסד אוכפת זמינות/MIME/משקל, ואינה טוענת למדוד קריאות חזותית. כלל שמור אינו הוכחת פריסה: מצב יישום וראיות נרשמים ביומן בלבד.$contract$, updated_at=now()
where slug='publishing_conventions' and body like '%—— FAST IMAGE DELIVERY V1%';
