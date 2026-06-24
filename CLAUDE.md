# SOD1820 — הנחיות פרויקט

## 🌳 חוק העץ האחד — חקוק בראש המערכת (קרא לפני כל דבר)
> **כל החומר באתר הוא זהב — וכשהוא מחובר יחד הוא יהלום.** כל סוכן/מנוע, לפני שהוא נוגע בגלריות/מספרים/כרטיסים/כל פיצ׳ר, חייב לראות את התמונה המלאה ולהתחיל מהשורש.
- **עץ ידע אחד.** כל האתר הוא גרף אחד (`nodes`+`edges`). אין "גלריות/גימטריה/פוסטים" כעולמות נפרדים — יש **ישויות וקשרים**. כל דבר הוא node: `number`, `entity` (כולל זהב), `convergence`, `event`, `year`, `post`, `word`, `phrase`, image. כל עמוד = **עדשה** על אותו גרף.
- **מציירים פעם אחת, מפנים מכל מקום.** עמוד קנוני יחיד לכל ישות (מספר → `/number/:n`, התכנסות → `/topic/:slug`). בכל מקום אחר — רק תקציר שמקשר, לעולם לא עותק. **אסור מערכת מקבילה לאותו דבר.**
- **לא לאבד הצלבות (הלב).** לפני פיצ׳ר — לחבר לגרף: `number ↔ convergence ↔ /cross ↔ ישות-זהב ↔ גלריה ↔ פוסט ↔ אירוע` דרך `edges`. דוגמה: 1820 ↔ שתי ישויות הזהב (=שתי החתימות) ↔ `/topic/1820` ↔ תמונות מירון ↔ אירוע מירון.
- **מלמטה למעלה:** שורשים (נתון: OCR, `gematria_words`, `nodes`) → גזע (הגרף) → ענפים (עדשות: `/number`, `/topic`, `/cross`, `/timeline`, בית המדרש) → עלים (UI: רצועת הבית, השורה העליונה). משטח חדש = שאילתה על הגרף, לא טבלה חדשה.
- **שכבת ההתכנסות:** `topic_cards` = המקור הערוך; באישור מוקרן לגרף כ-node `type=convergence` + edges. `convergence_meter` (0-100) → `quality`. כל החלונות קוראים אותו מקור.
- **כבוד לרמז + יושר:** תמיד להפריד גימטריה (עובדה) מפרשנות (רמז משלים).
- **המקור המלא:** `select body from project_codex where slug='convergence_law';` ו-`nodes` rule `unified_graph_law`.

## ⛔ פוסטים ישנים / גלריות — פרוטוקול קשיח (`legacy_content_protocol`)
לפני נגיעה בפוסט ישן (WordPress) או בגלריה/קרוסלה — **קרא את החוק המלא:** `select description from nodes where rule_id='legacy_content_protocol';`. אלו תקלות שחזרו שוב ושוב — דלג עליהן מראש (אל תמציא מנגנון מקביל, השתמש ברכיבים הקנוניים, ותמיד אמת ויזואלית):
1. **כלל ניקוי WP מוחץ גובה:** `.sod-post-content div[style*="height"]{max-height:24px!}` תופס כל `div` עם height ב-inline — **כולל `line-height`!** רכיב מוטמע (קרוסלה/כיתוב) נמחץ ל-24px ("פס שחור"/תגיות שיושבות על ההסבר). פתרון: class ייעודי + override בספציפיות > 0,2,1 (כלול `.sod-post-content` בסלקטור), הסר `max-height` מכל ה-divים והחזר `height` מפורש.
2. **ייצור תמונות עברית:** Pillow כאן `raqm=True` → **RAW בלבד, בלי `get_display`/bidi** (היפוך כפול). אל תרווח ספרות. **אמת ויזואלית (Read) לפני העלאה.** `satori`/`api/card` הופך עברית — לא אמין; העדף כרטיס סטטי מאומת.
3. **שמות `עדכון…`/`נוספה תמונה`** = הערות-לוג WP (~43%), לא כותרות — להסתיר (`cleanName`).
4. **כתיבה ל-`gallery_images`** = מנהל בלבד (RLS `gi_admin_update` + GRANT UPDATE ל-authenticated).
5. **סדר גלריה ברירת-מחדל:** `importance↓` ואז תאריך אמין (`occurred_at` → נתיב `/uploads/YYYY/MM/` → `created_at`).
6. **יום/לילה לפוסט ישן:** WordPress נעול-כהה; להפעלה — `posts.theme='auto'` (`themedPostContentCSS` מנטרל צבעים צרובים).
7. **קרוסלה RTL:** `translateX(-idx*100%)` (מסילה `direction:ltr`).
8. **עץ אחד:** לא לשכפל תוכן — הפוסט מקור; חידוש מצביע דרך `insights.source_ref` ונפתח אינליין. **להפנות, לעולם לא להעתיק.**

## 🌊 זרם המציאות + דופק המציאות (`reality_stream_law`)
המעבר מ«גלריות נפרדות» ל**מוצר** בן 3 שכבות מעל `gallery_images` (קרא את החוק המלא: `select description from nodes where rule_id='reality_stream_law';` ו-`select body from project_codex where slug='reality_stream_law';`):
1. **זרם המציאות** — עדשה אחת על `gallery_images where source='update'`. היחידה היא **רמז**: `image_url` + `primary_value` (מספר דומיננטי — מניע את הדופק) + `all_values` (תגיות-מספרים לסינון) + `occurred_at` (תאריך אירוע) + `name` (כותרת) + `ocr_meta.entities` (תגיות-נושא).
2. **אוספים** — הגלריות הישנות (`hugeit_migration`/`manual`) כתערוכות מוזיאון. לא נמחקות.
3. **דופק המציאות** — ספירה אוטומטית לפי חלון (היום/שבוע/חודש/כל-הזמנים) על `primary_value`, **ציר = `occurred_at` עם נפילה ל-`created_at`**, כולל מגמה (השבוע מול הקודם).
- **חישוב טהור:** `src/lib/reality.js` (`computePulse`/`filterHints`/`computeTrend`). נתונים: `getRealityHints`. רכיבים: `RealityWorld`/`RealityStream`/`RealityPulse`. כל מספר = node בגרף → הרמז מפנה ל-`/number/:n` (`EntityPage`), **לא משכפל**.
- **קביעת מספר בהעלאה:** `gallery-ocr` מציע (`ocr_numbers`), צוריאל מאשר את הדומיננטי. אסור לקבוע מספר דומיננטי אוטומטית בלי אישור.

## ⛔ חובה לפני הכל — קרא את ההגדרות הקנוניות (`agent_onboarding_law`)
לפני כל עבודה שנוגעת ב**גימטריה / נתונים / לוגיקה** — **חובה לקרוא קודם** את ההגדרות שמקודדות ב-DB. אל תבנה/תשנה לוגיקה לפי ידע כללי או הנחה — **ההגדרות הנעולות של צוריאל פולייס גוברות תמיד**.
1. `select rule_id, label, description, metadata from nodes where type='rule' and is_active;` — חוקי המערכת, כולל **הגדרות השיטות הנעולות**: `misratar_multi` (מסתתר = מילה-מילה, הרווח שובר את הרצף!), `ribua_definition`, `method_hierarchy_ragil_foundation` (רגיל=יסוד; סופיות ברגיל=רגיל לא 500-900), `method_priority`.
2. `select slug, title, body from project_codex order by priority, id;` — קודקס הפרויקט (התחל מ-`_index`).
3. **חישוב גימטריה = מאושר-מראש** (`auto_compute_preapproved`). **כתיבה לליבה (UPDATE/DELETE/ALTER/הסתרה) דורשת אישור מפורש של צוריאל.** תיקון שורה מחוברת לפוסט = במקום, לא החלפה (`preserve_linked_row`).
4. **מנוע רשמי בלבד** (`gematria_engine_law`): אסור לחשב גימטריה מזיכרון / ניחוש / ידנית — רק דרך פונקציות המערכת (`src/lib/gematria.js`). באי-ודאות — לעצור ולאמת. ביטוי שצוריאל הציג וכבר אומת = **נתון מערכת**, לא לחשב מחדש ללא צורך (`verified_value_is_system_data`).

## ⛔ פרסום פוסטים — חוק ליבה (`post_publish_law`) — לקרוא לפני כל INSERT
> **חוק נעול ב-DB:** `select description from nodes where rule_id='post_publish_law';`

**הכי חשוב — שדות שגורמים לפוסט להיעלם:**
- **`modified` חייב להיות שווה ל-`date`** — לעולם לא null. רשימת /post ממוינת לפי `modified DESC nullsFirst:false`; פוסט עם `modified=null` שוקע לסוף ולא נראה.
- **תמונה בתוכן:** אם יש `image_url` — להכניסה גם לתוך `content` עם הגבלת גודל. לא מכניסים תמונה ענקית ללא `max-width`. פורמט:
  ```html
  <div style="text-align:center;margin:22px 0;"><img src="URL" alt="תיאור" style="max-width:280px;width:100%;border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,0.5);" /></div>
  ```
- **אימות אחרי INSERT:** `SELECT id, slug, date, modified FROM posts WHERE slug='<slug>' LIMIT 1;` — אם modified=null → `UPDATE posts SET modified=date WHERE id=<id>;`

## פרסום פוסטים — מוסכמות (לכבד תמיד)
- **פוסט על אירוע שקורה ("משהו שקורה" / חדשות / תיעוד בזמן אמת)** → תמיד לשייך לקטגוריה **`תיעוד אירועים`**.
- **קטגוריות ותגיות — להשתמש בקיימות, לא להמציא כפילויות.** לפני פרסום: `select distinct unnest(categories) from posts;` / `... unnest(tags) ...` ולחפש את הקיים (למשל פוסט פרה אדומה → תגית `פרה אדומה`, קטגוריה `בית המקדש השלישי`).
- **קטגוריית `רמזים חזקים` = רק הפוסטים של צוריאל.** אסור לשייך אליה פוסט של כותב אחר (ציון סיבוני / גולשים / מזכה הרבים וכו'). פוסט של כותב אחר → קטגוריות תוכן מתאימות (`סוד האותיות והמספרים`, `תיעוד אירועים`, וכו'), **לא** `רמזים חזקים`.
- **לקשר פוסטים קשורים** — להוסיף בתחתית התוכן בלוק «ראו גם» עם קישורים לפוסטים באותו נושא (`<a href="/<slug>">`).
- **תמונה ראשית** — אפשר לעשות שימוש חוזר בתמונה קיימת מ-Storage של פוסט קשור (`image_url`), כדי שתופיע גם בתצוגות (דף הבית / רשימות).
- פוסט נוצר ידנית: `insert into posts (id, wp_id, title, slug, content, excerpt, date, modified, categories, tags, source, image_url) overriding system value values (...)` — `id`/`wp_id` = מעל ה-max הקיים; `source='ai'` לפוסט שנכתב ב-AI.
- **כותבים (`author`):** שדה ריק = מוצג **"המערכת"** (לוגו SOD1820). אשכול קטגוריית **`התחזקות`** = הכותב **"מזכה הרבים"**. מרשם הכותבים: `src/lib/authors.js`.
- **תווית/אימות AI (`verified` / `ai_touched`):** מפעילים **רק** כשה-AI אימת ידיעה ממקור חדשות מפוקפק/לא אמין — **לא** סימון לכל פוסט שנכתב ב-AI (כתיבה ב-AI = `source='ai'` בלבד, בלי דגל אימות).

## יומן העבודה — מקור האמת
כשצוריאל מבקש "לפתוח את היומן" / "יומן" / "רשומות אחרונות" וכו' —
**המקור הוא טבלת `work_log` ב-Supabase** (project `linswmnnkjxvweumprav`), לא הקובץ `docs/work-journal.md`.

- לפתיחה/קריאה: `select * from work_log order by created_at desc limit N;`
- הקובץ `docs/work-journal.md` הוא יומן ישן/רטרוספקטיבי — לא לפתוח אותו כברירת מחדל ולא להתייחס אליו כיומן הפעיל.
- לרישום רשומת עבודה חדשה: `insert into work_log (session_date, topic, numbers, what_we_did, status, open_threads) ...`

## חוקי מערכת (nodes type='rule') — לכבד תמיד
החוקים נשמרים בטבלת `nodes` (`type='rule'`, עם `rule_id`, `rule_version`, `is_active`).
לפני שינוי לוגיקה מהותית — לקרוא חוקים רלוונטיים: `select rule_id, label, metadata from nodes where type='rule' and is_active;`
שינוי חוק = גרסה חדשה (לפי `rule_versioning`), לא מוחקים.

### חוקים שמומשו בקוד (בית המדרש)
- **`verified_badge_law`** — הסמל המאומת = לוגו + סימן אימות בינלאומי (✓). רכיב: `src/components/VerifiedBadge.jsx`.
  variants: `ai` (🔵✓ ליד חידושי AI), `post` (ליד פוסט מאומת), `gematria` (ליד גימטריה מאומתת).
- **`whats_new_law`** — כל הדגשת "חדש"/הבהוב = **פר-משתמש לפי הביקור האחרון**, לא חלון זמן גלובלי. פריט "חדש" רק אם נוצר אחרי שהמשתמש ראה לאחרונה את המשטח; אחרי צפייה מסמנים נראה (לא יהבהב שוב); אין חדש → אין הבהוב; משתמש חדש → חלון התחלתי 14 יום. מימוש: `src/lib/crossesNew.js` (`seenCutoff(key)`, `markSeenKey(key)`, `isNewSince`). הוחל: בית המדרש, `InsightCard`, דף הבית (התכנסויות + עדכונים). **אסור** חלון גלובלי קבוע.
- **`insight_card_law`** — מבנה חידוש קצר ונפתח. רכיב: `src/components/InsightCard.jsx`.
  אם החידוש מקושר לפוסט (`insights.source_ref`) — לחיצה מנווטת לפוסט במקום לפתוח.
- **`subscribe_gate_law`** (v2) — שער הרשמה עם **אימות מייל אמיתי** (Supabase Auth OTP).
  2 חידושים חינם → רישום + אימות קוד במייל פותח את ההמשך (משתמש מאומת = יש session). **לא** בני ההיכל.
  רכיבים: `SubscribeGate.jsx`, `EmailVerify.jsx`, `lib/auth.js`, `AuthProvider.jsx` (`useAuth`).
  הגדרת דאשבורד: Email provider פעיל; בתבנית Magic Link להוסיף `{{ .Token }}` לקוד 6 ספרות; SMTP מותאם לפרודקשן.
- **תיבת עדכונים כללית** — `src/components/UpdatesBox.jsx` (רשימת תפוצה, `variant` panel/inline). ניתנת להצבה בכל מקום.
- **`ai_post_update_law`** — עדכון גימטריה מבוסס-AI בפוסט בפורמט קבוע (קונספט נסראללה 34200 + איראן 36935): סמל "מאומת על ידי AI" (כחול #3ea6ff, סגנון `VerifiedBadge` variant=ai) בראש · פורמט קומפקטי · כל שם/ביטוי = לינק `/beit-midrash?w=<ביטוי>` שפותח את המחשבון עם הביטוי טעון (`GematriaCalculator` seed דרך פרמטר `w`/`calc` ב-`BeitMidrashPage`) · ציטוט מילות צוריאל · `modified=now()` → הבהוב כחול אוטומטי בציר ההתגלות (`RevelationAxis` מזהה content המכיל "מאומת על ידי AI"). נשמר גם כחוק DB `ai_post_update_law`.

## בית המדרש (`/beit-midrash`)
עמוד: `src/pages/BeitMidrashPage.jsx`. שלושה מדורי חידושים + שיטות הלימוד:
1. **חידושי AI** — `insights` עם `origin='ai'` (סמל מאומת, 2 חינם ואז שער).
2. **חידושי גולשים** — "בקרוב" (קהילה).
3. **חידושי המערכת** — התראות התכנסות/1820 (`insights` עם `has_1820` או `convergence_score>0`).

## עמוד הבית (`src/pages/HomePage.jsx`)
הפרדת זרמים (`stream_separation_law`):
- **עדכונים אחרונים** = פוסטים (רק צוריאל מעדכן פוסטים). הרכיב `LatestPostsRail`.
- **חידושי AI** = תיבה מכובדת עם 3 חידושים אחרונים (`origin='ai'`) + "עוד בבית המדרש →". הרכיב `AiInsightsBox`.
- היכל השערים (`heichal.html`) — הוסר ה-overlay "סוד1820" שהסתיר את המרכז.

פוסט היסוד: `wp_id=17` ("שם ה' בתורה 1820 פעם") מוצג בראש בית המדרש כ-«פוסט היסוד» (כבוד לסוד 1820).
כשנוצר חידוש AI מפוסט/גלריה — הוא נשמר ב-`insights` (origin='ai'), מופיע בתיבת ה-AI בבית המדרש, ולחיצה מנווטת לפוסט/גלריה (`source_ref`).

## 🚀 Meta Growth OS — תוכנית העל (24 שכבות)
> **חזון:** Sod1820 הופך ממשהו שאנשים קוראים בו למשהו שאנשים חוזרים אליו כל יום — מערכת הפעלה של משמעות (SodOS).
> הרשומה המלאה: `select what_we_did from work_log where topic='Meta Growth OS — תוכנית העל (24 שכבות)' order by created_at desc limit 1;`

**סטטוס שכבות (עדכני ל-24.6.2026):**

| שכבה | שם | סטטוס |
|------|-----|--------|
| 0 | תשתית (Pixel, CAPI, Secrets) | ✅ הושלם |
| 1 | Pixel + CAPI מקבילי | ✅ הושלם |
| 2 | Event Architecture (number_view, hint_view, journey…) | 🔶 חלקי |
| 3 | UTM Engine | 🔶 חלקי |
| 4 | Share Tracking (WhatsApp/Telegram/Facebook/Copy) | ✅ הושלם |
| 5 | Propagation Engine (rid=, עצי התפשטות) | ❌ לא הושלם |
| 6 | Meta Audiences אוטומטיות | ❌ לא הושלם |
| 7 | Lookalikes | ❌ לא הושלם |
| 8 | Auto Publishing (Graph API) | ❌ לא הושלם |
| 9 | WhatsApp Cloud API | ❌ לא הושלם |
| 10 | Reality Pulse (primary_value, occurred_at, דופק) | ✅ הושלם |
| 11 | Dashboard (AdminPage + MetaTab + PopularityTab) | ✅ הושלם |
| 12 | AI Insights לילי | ❌ לא הושלם |
| 13 | Audience DNA | ❌ לא הושלם |
| 14 | Newsletter Intelligence | ❌ לא הושלם |
| 15 | Holy Grail Dashboard | ❌ לא הושלם |
| 16-24 | Reality Intelligence → SodOS | ❌ חזון עתיד |

**הבשלות הבאה לפיתוח:** שכבה 2 (event architecture מלאה) → שכבה 3 (UTM) → שכבה 5 (rid propagation).
**תלויות חיצוניות:** שכבות 6-9 דורשות System User Token + הרשאות Meta Graph API.

## 👑 ארכיטקטורת הפלטפורמה — 6 רמות + טוקנים + Academy (`platform_tiers_law`)
> Sod1820 = פלטפורמת מחקר, לימוד וקהילה. לא אתר תוכן.
> פרטים: `select what_we_did from work_log where topic='Sod1820 Platform Architecture — 6 רמות + טוקנים + Academy' limit 1;`

**6 רמות גישה:**
```
0. אורח         — גימטריה, חדשות, דפי מספר, חלק מרמזים (חינם, ללא הרשמה)
1. רשום         — אזור אישי, שמירה, מועדפים, היסטוריה (חינם + הרשמה)
2. תלמיד היכל  — מסעות, אוספים, AI בסיסי (מנוי בסיסי)
3. בני היכל    — העלאת רמזים, Reality Profile, AI מתקדם, קורסים (מנוי מרכזי = כסף גדול)
4. חוקרי היכל  — ELS מלא, נדירות, AI Research, Graph Explorer (Premium)
5. שותפי היכל  — VIP, גישה מוקדמת, מפגשים (Elite)
```

**Sod Credits (מטבע פנימי):**
- חיפוש ELS = 10 קרדיטים · דוח AI = 25 · הצלבה = 5 · מסע AI = 30
- מנוי = מכסה חודשית + אפשר לקנות עוד

**5 מנועים:** גימטריה · ELS/תורה · Reality Stream · Academy (5 דרגות) · Community

**אוטומציה:** סיום קורס/דרגה → הוספה אוטומטית לקבוצת טלגרם מתאימה

**DB foundation (לבנות ראשון):**
- `profiles` table: `user_id, email, tier(0-5), credits, xp, level, joined_at`
- RLS לפי tier על כל פיצ'ר רגיש
- **Gate order:** tier≥4 → ELS · tier≥3 → העלאת רמזים · tier≥2 → מסעות

## 👥 ארכיטקטורת זהות — UGC + קהילה (`identity_architecture_law`)
> Sod1820 = ויקיפדיה חיה של רמזים ומספרים. **לא לחייב הרשמה בהתחלה.**
> פרטים מלאים: `select what_we_did from work_log where topic='ארכיטקטורת זהות — אנונימי → חוקר (UGC Layer)' limit 1;`

**מסלול הזהות:**
```
אנונימי (visitor_id)
  ↓ [דיווח רמז / חיפושים / מסעות]
מזוהה רך (visitor_id עם היסטוריה)
  ↓ [הצעה רכה: "שמור תגליות"]
חשבון (Supabase Auth)
  ↓
חוקר (פרופיל, ציון, תגיות)
  ↓
תורם (רמזים מאושרים, Collective Discovery)
  ↓
יוצר מסעות
```

**הפיצ'ר הראשון לבנות: `➕ דווח רמז`**
- טבלה: `community_hints` (visitor_id, image_url, number, description, source_url, status=pending)
- UI: כפתור בזרם המציאות + בדפי מספר
- Admin: טאב אישור ב-AdminPage (community_review)
- אחרי אישור: עובר ל-gallery_images עם source='community'

**Collective Discovery (עתיד):** 5+ דיווחים על אותו מספר → "זוהתה התכנסות קהילתית סביב X" (אוטומטי)
**Research Score (עתיד):** ציון לכל תורם — רמזים שאושרו + תגליות נדירות + שיתופים

## ⛔ פריסה — חוק (`deploy_on_request`)
**צוריאל מחליט מתי מעלים לאוויר. לא דוחפים ל-`main` אוטומטית.**
- כל push ל-`main` = פריסת Vercel, והמכסה החינמית מוגבלת (100 פריסות/יום). אסור לבזבז אותה על כל תיקון קטן.
- **צוברים שינויים** כ-commits (לענף הפיתוח לשמירה), **ומעלים ל-`main` רק כשצוריאל אומר במפורש** ("תעלה" / "העלה"). אז מעלים את כל המצטבר בבת אחת.
- **ליזום עדכון:** בכל הזדמנות מתאימה לומר לצוריאל **כמה חלקים מוכנים וממתינים לפריסה**, ולשאול אם להעלות עכשיו.
- שינויי **נתונים** (Supabase) חיים מיד ולא תלויים בפריסה — מותר להמשיך בהם כרגיל בלי לשרוף מכסה.

## כללי
- האתר: React 18 + Vite, פרוס ב-Vercel (רק `main` = פרודקשן). נתונים מ-Supabase. בדיקת build: `npm run build`.
- ענף פיתוח נוכחי: `claude/prayer-sharing-popup-u1kn3s`.
