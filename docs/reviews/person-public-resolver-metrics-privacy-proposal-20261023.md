# הצעת תיקון: `person_public_profile_v1` ו-`people_public_rows_v1`

**מצב: הצעה בלבד.** לא הוחל דבר במסד החי, ואין כאן קובץ תחת `supabase/migrations`. התיקון שייך לבעל Person Foundation ודורש BEFORE נפרד ושער אנושי של ZURIEL.
נבדק ב-23.10.2026 מול `linswmnnkjxvweumprav`, בקריאות בלבד (הגדרות פונקציות ושאילתות ספירה; לא נקראו או הודפסו נתוני אדם).
המשך לביקורת `0930bdf5` על העבודה `PEOPLE_2029_COMMUNITY_WRITER_LINK_20261023`.

## 1. ממצא דחוף: החשיפה הציבורית אינה כפופה להסכמה

שתי הפונקציות חיות, `SECURITY DEFINER`, וניתנות להרצה על ידי `anon` (נבדק ב-`has_function_privilege`). מה שנמדד, כמספרים בלבד:

| בדיקה | תוצאה |
| --- | --- |
| `people_public_rows_v1(250, 0)` מחזירה שורות | 186 (כל בעלי החשבון ועוד 6 זהויות מחומרות) |
| שורות עם `username` / `avatarUrl` / `lastSeen` | 180 / 91 / 186 |
| בעלי חשבון שה-profile שלהם לא ריק בלי דוסייה ציבורית כלל | 171 מתוך 180 |
| בעלי חשבון עם דוסייה מסומנת `private` ועדיין לא ריק | 4 |
| שורה כוללת `personRef` (מכיל `person_id`) | כן, ומאפשר קריאה ישירה לפונקציית הפרופיל |

סיבות, מהגדרת הפונקציה החיה:

1. `is_public_eligible = account_user_id is not null OR exists(public_contributors)`. כל חשבון כשיר, בלי הסכמה לפרופיל ציבורי.
2. `public_contributors` מסנן `active`, `locked` ו-`kind <> 'private'` בלבד. אין התייחסות ל-`dossier_settings->>'visibility'` ולא ל-`building`. הטקסט `dossier_settings` לא מופיע בהגדרה.
3. `avatarUrl` נלקח מ-`users.avatar_url` (תמונת החשבון). אין בדיקה של `dossier_settings.public_avatar` (הסכמה מפורשת לתמונה ציבורית, כפי שנקבע בשרשרת הכותבים). `public_avatar` לא מופיע בהגדרה.
4. `lastSeen` ו-`firstSeen` מוחזרים לכולם. אין בעל אות ציבורי מאושר ל-last-seen.
5. `activeDays` מאחד ימי תרומה עם ימי `user_activity` (חיפושים, ביקורים, חישובים). פעילות חיפוש פרטית היא פרטית כברירת מחדל לפי חוזה §15.6, והספירה הנגזרת חשופה.

**מיתון מוצע, כצעד נפרד לפני כל תיקון מדדים (דורש שער אנושי; לא הוחל):**

```sql
revoke execute on function public.person_public_profile_v1(uuid) from anon;
revoke execute on function public.people_public_rows_v1(integer, integer) from anon;
```

אין בקוד המוצר (ענפים נבדקו: main וערימת הכותבים) שום קריאה לשתי הפונקציות. הן נקראות רק בבדיקת מקור (`test/person-public-resolver-foundation.test.mjs`, שמצפה ל-`grant ... to anon, authenticated`, ויש לעדכנה). לכן ההשפעה על מוצר חי נמוכה. יש להחליט אם `authenticated` נשאר.

## 2. מדדים: מה הפונקציה מחזירה ומה הנכון

ערך חסר חייב להיות `null`. אפס מותר רק כשהמדד נמדד, ההקשר מוכר, ואין תוצאות.

| מדד | היום (מההגדרה) | בעיה | הצעה |
| --- | --- | --- | --- |
| `messages` | ספירת תרומות שיש להן `contribution_links.target_type='openweb_message'` | מונה תרומות מקושרות להודעת מקור, לא הודעות הכותב. יניב: 0 | ספירת `public_contributions` עם `origin in ('openweb','community_2029')` וגוף לא ריק, כמו מסנן ה-chat של קורא הקהילה. מדוד כשיש זהות; אחרת `null` |
| `activeDays` | איחוד ימי תרומה וימי `user_activity` | חושף פעילות פרטית; כיסוי `user_activity` חלקי | ימי תרומה ציבורית בלבד, עם `scope` מוצהר. ימי פעילות פרטית רק בהקרנת Self |
| `tenureDays` | `greatest(0, current_date - first_seen::date)` | `greatest(0, null)` = 0 (אומת חי). `first_seen` אינו הוכחת ותק | `null` כשאין תחילת פעילות ציבורית מוכחת. הוותק מתחילת התרומה הציבורית הראשונה, לא מ-`persons.first_seen` |
| `hints`, `findings`, `sources`, `methods`, `els`, `openThreads` | קבוע 0 | אפס מומצא | `null`, `not_measured`, עד שבעל התחום מגדיר מתאם |
| `publications` | קבוע 0 | ליניב יש פרסומים; השיוך לפי שם אסור, ואין קישור קנוני | `null` עד שיוך לפי מזהה בעלים מדויק (כמו קטלוג המקורות) |
| `media` | ספירת תרומות עם תמונה או מדיה | מדוד | להשאיר, עם `scope` |
| `communityImpact.reactionsReceived` | קבוע 0 | אפס מומצא | סכום לפי `legacyLikeCount` על הודעות chat, כשנמדד; אחרת `null` |
| `communityImpact.uniqueResponders` | קבוע 0 | לייקים היסטוריים אנונימיים | `null` |
| `communityImpact.repliesReceived` | קבוע 0 | ניתן לחישוב לפי `parent_id` | ספירת תגובות מאושרות, או `null` בשלב ראשון |
| `researchStanding.label` | דרגת `researcher_reputation` החיה | מוצג רק כשיש יכולת חוקר. היכולת נגזרת גם מ-`users.is_researcher`, שלפי הכיול (id=34) אינו מתיישר עם פלט מאושר | להחליט עם בעל Research אם `is_researcher` כשיר; ברירת מחדל מוצעת: `kind='researcher'` בלבד עד שהכיול יוסדר |

תוספת מוצעת לחוזה הפלט, בלי לשבור את הקיים:

```json
"coverage": {
  "messages":      {"state": "measured",     "scope": "public chat contributions of linked identities", "source": "research_contributions"},
  "hints":         {"state": "not_measured", "reason": "no owner adapter yet"},
  "publications":  {"state": "not_measured", "reason": "no exact authorship link"}
},
"identityScope": {"accounts": 1, "publicContributors": 1, "humanGatedEdges": 0}
```

הלקוח כבר מטפל ב-`null` (הקרנת הפרופיל והרשימה בענף): מדד חסר מוצג "לא נמדד", ואינו יוצר או מסתיר לשונית.

## 3. טיוטת תיקון להגדרה (לא להחלה, לבדיקת בעל Person)

```sql
-- 1) eligibility only by explicit public dossier
public_contributors as (
  select lc.* from linked_contributors lc
  where coalesce(lc.active,true) and not coalesce(lc.locked,false)
    and coalesce(lc.kind,'community') <> 'private'
    and lc.dossier_settings->>'visibility' = 'public'
    and not coalesce(lc.building,false)
),
eligibility as (
  select pr.*, exists(select 1 from public_contributors) as is_public_eligible from person_row pr
),
-- 2) avatar only with explicit publication consent; never the raw account photo
--    'avatarUrl', nullif(btrim(pc.dossier_settings->>'public_avatar'),'')
-- 3) no lastSeen / firstSeen in the public projection
--    'lastSeen', null, 'firstSeen', null
-- 4) messages = chat contributions
count(*) filter (where pc.origin in ('openweb','community_2029'))::int as message_count,
-- 5) unmeasured metrics are null, not 0
--    'hints', null, 'findings', null, 'sources', null, 'methods', null, 'els', null,
--    'openThreads', null, 'publications', null
-- 6) tenure only from the first public contribution
--    'tenureDays', case when m.first_public_at is null then null else (current_date - m.first_public_at::date) end
```

עמודות הקיימות בטבלאות (`contributors.dossier_settings`, `contributors.building`) נבדקו בקוד קורא הכותבים (`writerPersonal2029.js`). ההצעה אינה מוסיפה סכמה.

## 4. בדיקות נדרשות לפני כל החלה

1. **known 0 מול unknown:** אדם עם זהות מקושרת ובלי הודעות מחזיר `messages: 0` ו-`coverage.messages.state: measured`. אדם בלי זהות מחזיר `null`. `first_seen` ריק מחזיר `tenureDays: null`.
2. **כיסוי:** כל מדד שאינו נמדד מחזיר `null` ו-`not_measured`. אין קבוע 0.
3. **הרשאות:** `anon` לא מקבל פרופיל של חשבון בלי דוסייה ציבורית (`null`); `visibility='private'` ו-`building=true` מחזירים `null`; תמונה רק עם `public_avatar`; אין `lastSeen`; אין ספירת פעילות פרטית.
4. **הקבלה לקורא הקהילה:** `messages` שווה לספירת מסנן ה-chat בקורא הקיים עבור אותו מזהה, לשלוש זהויות לפחות (כותב מקושר, חבר קהילה, ללא דוסייה).
5. **שתי זהויות:** `account` ו-`contributor` נפרדים (כמו `VERIFIED_OWNER_PAIRS`) לא מתאחדים לפי שם. 7 מול 31 (תרומות) אינם הוכחה לשום ספירת הודעות.
6. **רגרסיה:** `people_public_rows_v1` ו-`person_public_profile_v1` נותנים אותם ערכים לאותו אדם.
7. **שינוי הרשאה:** בדיקת המקור הקיימת מעודכנת בהתאם להחלטה על `authenticated`.

## 5. מה לא נקבע כאן

- אם `authenticated` נשאר עם הרשאת ביצוע.
- מי בעל אות ציבורי ל-`lastSeen`, ומתי מאשרים אותו.
- אם `users.is_researcher` כשיר כיכולת חוקר.
- הגדרת Community Impact ו-`uniqueResponders` מעבר לספירה גסה.
- הקרנת Self נפרדת (`auth.uid`-bound) לפעילות פרטית, קרדיטים והפניות. המנוי והקרדיטים נשארים פתוחים ואינם חלק מהצעה זו.
