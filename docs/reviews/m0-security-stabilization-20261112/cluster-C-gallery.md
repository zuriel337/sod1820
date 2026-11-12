# M0-C — העלאות לגלריה: תפקיד, נתיב, סוג קובץ וגודל (DEF-004, עדכון 12.11.2026)

> **סטטוס: הכנה בלבד — שום דבר לא הוחל.** לא נכתב דבר ל־DB או ל־Storage בפרודקשן, לא נפרסה פונקציה ולא נדחף קוד. כל הקריאות החיות היו SELECT על קטלוגים וספירות מצטברות בלבד. ההחלה תוצג לצוריאל באישור המאוחד של חבילת M0.
> בסיס: `origin/main` `949c24ad5`. פרויקט Supabase: `linswmnnkjxvweumprav`.

## 1. ההחלטה שמיושמת (ZURIEL, 12.11.2026 — אפשרות 1)

נתיבים + תקרת 120 MB, עם ההתאמות: (1) כל המדיה הציבורית נשארת פתוחה לצפייה; (2) המנהל ממשיך להעלות לכל הנתיבים המורשים, כולל קבצים גדולים יותר כשצריך; (3) כותבים ומשתמשי קהילה מעלים רק לנתיבים שמותרים להם; (4) אין מחיקה או שינוי של קבצים קיימים; (5) התקרה נאכפת טכנית ולא רק בממשק, ואינה חוסמת פעולות מנהל; (6) בדיקה של העלאת תמונה, וידאו וקובץ בכל מסלול קיים.

## 2. מצב חי שנקרא (12.11.2026, קריאה בלבד)

**מדיניות `storage.objects`** (`pg_policy`): `community_anon_upload` (PERMISSIVE INSERT, anon+authenticated, כל `community/`), `public_upload` (PERMISSIVE INSERT, authenticated, כל `gallery`), `community_authenticated_media_paths_v1` (RESTRICTIVE INSERT — וידאו ונתיבי חשבון ב־`community/` רק לבעלים), `public_read` (SELECT ל־public על `gallery`), ו־`magar_*` (insert/update/delete לבעלי `authorized_uploaders`, select ציבורי). **אין שום מדיניות UPDATE או DELETE על `gallery`** — לקוח לא יכול היום לדרוס או למחוק קובץ בגלריה; ההצעה שומרת על כך.

**דליים** (`storage.buckets`): `gallery` ציבורי, `file_size_limit` NULL, `allowed_mime_types` NULL · `media` ציבורי, NULL/NULL · `magar` ציבורי, 10 MiB, jpeg/png/webp · `submission-inbox` פרטי, 2 GiB, רשימת MIME של תמונה/וידאו/שמע/pdf/doc/docx/txt.

**אובייקטים ב־`gallery`** (ספירות בלבד): 1,384 אובייקטים. הגדול ביותר 114,883,491 בתים (109.6 MiB, וידאו שהועלה ב־service role תחת `sod1820/videos/`); זה היחיד מעל 100 MiB; **אף אובייקט אינו מעל 120 MiB**. לפי בעלות: `sod1820/ciphers` 440 של משתמשים (אחרון 09.09), `community/` 10 של משתמשים + 5 ללא בעלים (כולל 3 SVG מ־03.09), `avatars/` 12 של משתמשים (אחרון 08.11), `sod1820/hints` 1, `sod1820/replaced` 1, `sod1820/replies` 2, `posts/` 6 של משתמשים + 29 ללא בעלים; כל השאר (`sod1820/broadcasts`, `videos`, `channel-thumbs`, `cards`, `posts`, `Book/` ועוד) נכתבו ללא בעלים, כלומר בשרת. סוגי MIME שצינורות המנהל/השרת כתבו לגלריה: `image/*`, `video/mp4`, `audio/mp4`, `text/vtt`, `text/html; charset=utf-8`, `image/svg+xml`, `application/pdf`, docx, `text/plain`.

**מי הוא "כותב"**: שורת `public.contributors` עם `kind` ב־`writer`/`author` (`WRITER_KINDS` ב־`src/lib/community/communityWriterLink.js`), המקושרת דרך `contributors.user_id` לחשבון (31 קישורים חיים). ב־`users.role` יש רק `user` (228) ו־`admin` (2). **אין לכותב נתיב גלריה משלו**: הוא מעלה תמונת פרופיל ב־`avatars/` (אותו מסלול כמו כל משתמש; `api/contributor-self.js` מקבל רק כתובת `gallery/avatars/<uid>-<13 ספרות>`), קבצים בקהילה, ומדיה מחקרית דרך `media-upload-intent` אל `submission-inbox` הפרטי (`contributors/<id>/…` או `accounts/<uid>/…`). לכן ההצעה נותנת לכותב בדיוק את נתיבי המשתמש — לא יותר ולא פחות.

## 3. מפת מסלולי ההעלאה (grep של `src/`, `public-reading-deploy/`, `api/`, `supabase/functions/`)

"לפני" = מה ש־Storage מתיר היום. "אחרי" = עם ההצעה. התקרה (120 MiB) חלה על כל שורה של `gallery` "אחרי".

| # | מסלול בקוד (רכיב קורא) | מי | נתיב | סוגים | גודל בלקוח | upsert | לפני | אחרי |
|---|---|---|---|---|---|---|---|---|
| R1 | `ReportHint.jsx` `uploadToGallery` (← `ContactGateway` ← `SystemFrame2029`) | אנונימי ומחובר | `community/<ts>-<rand>.<ext>` | `image/*` (סיומת משם הקובץ) | 12 MB | לא | כל סיומת שאינה וידאו, בלי גבול | jpg/jpeg/png/webp/gif/avif בלבד |
| R2 | `communityAttachments.js` (← `CommunityLive2029`) | מחובר (משתמש, כותב) | `community/<uid>/<uuid>.<ext>` | jpg/jpeg/png/webp/gif/pdf/txt/docx/mp4/webm/mov | 8 MB / וידאו 50 MB | לא | מותר | מותר (אותן סיומות) |
| R3 | `ProfileSettings.jsx` (← `QuickProfileAvatar2029`, `WriterPersonal2029Page`); בפרודקשן דרך `public-reading-deploy/personal-request.js` | מחובר (משתמש, כותב) | `avatars/<uid>-<13 ספרות>.<ext>` | jpg/jpeg/png/webp/gif (+avif) | 5 MB | לא — שם חדש בכל החלפה | מותר | מותר |
| R4 | `TzofenEmbed.jsx` `uploadCipherCard` | מחובר | `sod1820/ciphers/c-<b36>-<rand>.png` | png | — | לא | מותר | מותר |
| R5 | `hints.js` `uploadHintImage` — **אין קורא** | — | `sod1820/hints/<uid\|anon>/<ts>-<n>.<ext>` | תמונה | — | לא | כל מחובר | מנהל בלבד |
| R6 | `supabase.js` `captureAndUploadPoster` ← `broadcastChannelUpdate` — **אין קורא** | — | `sod1820/<key>-thumbs/<ts>-<n>.jpg` | jpg | — | לא | כל מחובר | מנהל בלבד |
| R7 | `supabase.js` `uploadGalleryImage` (החלפת תמונה, מנהל) — **אין קורא** | מנהל | `sod1820/replaced/<ts>-<n>.<ext>` | תמונה | — | **כן** (שם חדש → INSERT בלבד) | כל מחובר | מנהל |
| R8 | ענף המנהל של ה־worker הציבורי (`transport.js` `adminFetch`: `/storage/v1/(object\|upload)/`, TUS) | מנהל | כל נתיב | כל סוג | — | כן/לא | כל מחובר | מנהל, כל נתיב |
| R9 | פונקציות Edge עם service role אל `gallery`: `storage-put`, `storage-put-raw`, `sign-upload` (מפתח `FB_ADMIN_KEY`, דלי ברירת מחדל gallery), `wa-avatars` (JWT מנהל, ≤8 MB, upsert), `agent-upload` (כרטיס; ב־gallery רק `sod1820/posts/`, `sod1820/agent/`, ≤25 MiB) | שרת | לפי הפונקציה | כולל vtt/html | — | כן | עוקף RLS | עוקף RLS; רק התקרה חלה |
| R10 | `media-upload-intent` (שער ההעלאה הקיים): scope `public` (מנהל) → דלי `media`, `sod1820/2029/<kind>/YYYY/MM/<asset>/original.<ext>`, TUS חתום, תמונה 25 MB · וידאו 2 GiB · שמע 500 MB · מסמך 250 MB; scope `submission` ומדיית רמז → `submission-inbox` | מנהל / מחובר | — | לפי `MIME_POLICY` | לפי סוג | לא | ללא שינוי | ללא שינוי — **זה מסלול המנהל לקבצים מעל 120 MiB** |
| R11 | דליים אחרים: `media` (`upload-image` מנהל, `gen-thumb`, `video-migrate` ≤1 GiB, `raw-put`, `wa-channel-ingest`), `submission-inbox` (`wa-channel-ingest`, `wa-raziel`), `magar` (RLS לפי `authorized_uploaders`) | שרת/מורשים | — | — | — | — | — | ללא שינוי |

**היסטוריים, ללא קוד נוכחי**: `sod1820/replies/r-…` (2 אובייקטים של משתמשים, אוגוסט), `posts/<slug>…` של משתמשים (6, יוני–ספטמבר), `community/` בצורה אחרת (5 ללא בעלים, כולל ה־SVG). מקורם אינו ניתן למעקב בעותק הרדוד הזה (Legacy פרש ב־5.11). אחרי ההצעה — מנהל בלבד; האובייקטים עצמם נשארים.

**ממצא לוואי (לא שונה):** ב־build הציבורי, ה־worker (`public-reading-deploy/transport.js`) חוסם כבר היום את R1 (לאנונימי אין uid, והנתיב השטוח אינו בתבנית הקהילה שלו) ואת R4 למי שאינו מנהל (כתיבת Storage שאינה קהילה/אווטאר עוברת לענף המנהל). כלומר, בפרודקשן כרגע דיווח רמז עם תמונה וכרטיס צופן של משתמש רגיל נכשלים עוד לפני Storage. ההצעה שומרת את שני המסלולים פתוחים בשרת (בצורה המצומצמת) כדי לא לשבור אותם אם ה־worker יתוקן; ההחלטה אם לפתוח אותם ב־worker או לסגור אותם גם בשרת היא של צוריאל.

## 4. מה ההצעה עושה (`supabase/proposed/20261106130000_def004_gallery_storage_upload_policies.sql`)

1. **תנאים מוקדמים (קריאה בלבד, נכשל סגור):** הדלי קיים וציבורי; `file_size_limit` הוא NULL או כבר 120 MiB; `allowed_mime_types` NULL; אין אובייקט קיים מעל 120 MiB.
2. מוחקת את `community_anon_upload` ו־`public_upload` (ו־drop-if-exists לשמות החדשים, כדי שהקובץ יהיה ניתן להרצה חוזרת).
3. `gallery_flat_image_upload_v1` — anon+authenticated: `community/<10–16 ספרות>-<1–12 תווים>.(jpe?g|png|webp|gif|avif)`.
4. `gallery_client_upload_scoped_v1` — authenticated (משתמש וכותב): `community/<uid>/<uuid>.(jpe?g|png|webp|gif|pdf|txt|docx|mp4|webm|mov)`, `avatars/<uid>-<10–16 ספרות>.(jpe?g|png|webp|gif|avif)`, `sod1820/ciphers/c-…png`.
5. `gallery_admin_upload_v1` — authenticated עם `users.role = 'admin'` (אותו כלל של `media-upload-intent`, `upload-image`, `wa-avatars`): כל נתיב, כל סיומת. המדיניות ה־RESTRICTIVE של וידאו בקהילה ממשיכה לחול על כולם, כולל מנהל — בדיוק כמו היום.
6. `update storage.buckets set file_size_limit = 125829120 where id = 'gallery'`.
7. **תנאים לאחר:** הגבול 120 MiB, MIME עדיין NULL, הדלי ציבורי, `public_read` קיים, ואין מדיניות UPDATE/DELETE/ALL על gallery.

לא נוגעים ב: `public_read`, `community_authenticated_media_paths_v1`, `magar_*`, דליים אחרים, ושום אובייקט קיים. לא נוסף דלי, לא שער חדש, לא מנגנון הרשאות חדש.

**שינויים לעומת טיוטת 06.11:** (א) מנהל במדיניות נפרדת; (ב) R5 ו־R6 הפכו למנהל בלבד — לאף אחד מהם אין קורא, תיקיית `hints/anon` הייתה פתוחה לכל חשבון, ותבנית ה־thumbs אפשרה לכל חשבון להוסיף קבצים לתיקייה `sod1820/channel-thumbs/` של צינור השרת; (ג) סיומות הקהילה זהות ל־`communityUploadPolicy.js` ולמדיניות ה־RESTRICTIVE (ה־avif בטיוטה היה מת, כי ה־RESTRICTIVE דחה אותו), וה־UUID קפדני; (ד) תקרת 120 MiB; (ה) הרצה חוזרת בטוחה ותנאים סגורים.

## 5. התקרה: האם היא נאכפת טכנית, ומה היא לא עושה

* **נאכפת בשרת Storage, לא בממשק.** תיעוד Supabase: "When creating a bucket you can add additional configurations to restrict the type or size of files … If an upload request doesn't meet the above restrictions it will be rejected" ([Creating Buckets → Restricting uploads](https://supabase.com/docs/guides/storage/buckets/creating-buckets#restricting-uploads)); "Upload restrictions like max file size and allowed content types are also defined at the bucket level" ([Storage Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)); החריגה מוחזרת כ־`EntityTooLarge` / 413 ([Error Codes](https://supabase.com/docs/guides/storage/debugging/error-codes)).
* **אינה משנה קבצים קיימים.** לפי התיעוד ההגבלה חלה על *בקשת העלאה*. בנוסף, מכנית: ה־UPDATE משנה עמודה אחת בשורה אחת של `storage.buckets`; קראתי את כל הטריגרים החיים — על `storage.buckets` יש רק טריגרים על `name`, `versioning_status`, `lifecycle_*` ומחיקה, ועל `storage.objects` רק `protect_objects_delete` ו־`update_objects_updated_at`; אף אחד מהם אינו מופעל משינוי `file_size_limit`. כך גם נעשה בעבר ל־`submission-inbox` (`supabase/migrations/20260917160000_submission_inbox_limits_v1.sql`), והגבול שלו חי.
* **גבול גלובלי.** "you can specify the maximum file size on a per bucket level but it can't be higher than this global limit" ([Limits](https://supabase.com/docs/guides/storage/uploads/file-limits)). את הגבול הגלובלי של הפרויקט לא ניתן לקרוא ב־SQL ולא קראתי אותו; קיומו של קובץ של 109.6 MiB מראה שהוא היה לפחות כזה. אם הוא נמוך מ־120 MiB, הוא ממילא הגבול האפקטיבי (לא מזיק). לבדוק בהגדרות Storage לפני ההחלה (תוכנית האימות, V0).
* **RLS אינו יכול לאכוף גודל או Content-Type.** בזמן בדיקת ההרשאה Storage בודק רק את שם האובייקט מול המדיניות; לכן הסוג נאכף דרך הסיומת בנתיב, והגודל — רק דרך הדלי. תקרות קטנות יותר לכל מסלול (8/50/5/12 MB) נאכפות היום רק בלקוח וב־worker הציבורי.

## 6. מנהל מעל 120 MiB

התיעוד אומר ש־service key "entirely bypass RLS policies" ([Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)) — כלומר מדיניות, לא הגבלות דלי. התיעוד אינו אומר במפורש אם service role או TUS פטורים מגבול הדלי; **ההנחה השמרנית היא שאינם פטורים** (ההגבלה מוגדרת על הדלי ועל "upload request"). לכן אי אפשר לפטור מנהל מהתקרה בתוך `gallery` לא ב־RLS ולא ב־service role.

**המסלול הקיים כבר עונה על זה, בלי שינוי קוד:** `media-upload-intent` עם `scope: "public"` מותר למנהל בלבד (`buildUploadIntent` זורק `admin_required` לאחר), מנפיק כתובת TUS חתומה שאינה דורסת לדלי `media` (בלי גבול דלי), בנתיב `sod1820/2029/<kind>/YYYY/MM/<asset-id>/original.<ext>`, עם תקרות לפי סוג (וידאו 2 GiB, שמע 500 MB, מסמך 250 MB, תמונה 25 MB), ואימות read-back. `docs/sod1820-media-ingress-storage-convention-v1.md` כבר קובע ש־`media` הוא הבית של מדיה ציבורית מאושרת ב־2029 ו"לא להרחיב" את תיקיות הווידאו השטוחות של gallery, ו־`postPublishPreflight` דורש לפוסט תמונה/וידאו בדלי `media`. ה־worker הציבורי כבר מתיר למנהל את `media-upload-intent` ואת TUS. **לכן לא נדרש שינוי ב־`supabase/functions/media-upload-intent/**` ולא פריסת Edge.** חסר אחד: אין כיום כפתור בממשק 2029 שמפעיל scope `public` (רק `lifeJourneyHintMedia` משתמש בשער, עבור רמזים פרטיים); מנהל מעלה קובץ גדול דרך הסקריפט/סוכן (`scripts/media-path.mjs` + השער). אם נדרש כפתור — זו משימת ממשק נפרדת.

## 7. למה לא `allowed_mime_types` על הדלי

רשימת MIME של דלי חלה על כל העלאה, כולל מנהל ו־service role. צינורות השרת כתבו לגלריה `text/vtt`, `text/html; charset=utf-8`, `image/svg+xml`, `audio/mp4`, pdf, docx ו־`text/plain` (ראו §2), ו־`agent-upload` מתיר `text/vtt`. רשימה שמכסה את כל אלה כוללת html ו־svg ולכן אינה מגינה מפני משתמשים; רשימה צרה שוברת פעולות מנהל (סותר החלטה 5). לכן הסוג נאכף לאנונימי/משתמש/כותב דרך הסיומת שבביטוי הרגולרי, ומנהל ו־service role אינם מוגבלים בסוג.

## 8. Rollback

`supabase/proposed/ROLLBACK_20261106130000_def004_gallery_storage_upload_policies.sql` מוחק את שלוש המדיניות החדשות, יוצר מחדש את `community_anon_upload` ואת `public_upload` **מילה במילה כפי שנקראו מ־`pg_policy` ב־12.11**, ומחזיר `file_size_limit = NULL`, `allowed_mime_types = NULL`, עם בדיקת תנאי לאחר. אינו נוגע ב־RESTRICTIVE, ב־`public_read`, ב־`magar_*` או באובייקטים. ה־rollback פותח מחדש את החשיפה של DEF-004; גם הוא דורש אישור.
