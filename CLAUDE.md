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

> **🟢 תוכן נקי פטור מכל זה (`clean_content_law`):** האתר כבר לא וורדפרס. פוסט שנכתב אצלנו (`source='ai'`) מרונדר עם `class="sod-post-content clean"`, וכל **כללי ניקוי ה-WP ההרסניים מוגבלים ל-`:not(.clean)`** — לכן הם לא נוגעים בו. תוכן חדש = HTML מודרני מלא, בלי מחיצת-גובה, בלי דריסת-צבעים, בלי עקיפות. כללי הניקוי שלמטה רלוונטיים **רק לפוסטים ישנים**. מומש ב-`POST_CONTENT_CSS` (legacy.jsx + theme.js) ובאתרי הרינדור (`PostPageBySlug`/`PostPage`) + `adaptPost`. **כולל `<style>`:** פוסט נקי שומר על בלוקי `<style>` מכוונים (אנימציות CSS בתוך התוכן) — מחיקת `<style>` ב-`PostPageBySlug` חלה **רק** על פוסטים ישנים (תוקן 2.7.2026 אחרי שפוסט-הקוד של עמוס גואטה נמחץ).
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

## 📡 ערוצי השידור החיים (`broadcast_channels_law`) — לקרוא לפני נגיעה בטיקרים
> החוק המלא: `select description from nodes where rule_id='broadcast_channels_law';`
- **מקור אחד:** `channel_updates` (ערוצים: `main` · `reality-code` בבית · `or-geula` בצ'אט · `sod-hachashmal`). רצועות = `BrandTicker.jsx` (מיתוג ב-`BRANDS`); מרכז השידורים = `/broadcasts`; פרסום = טאב אדמין «📡 שדר לטיקר».
- **אפס כפילות:** הטיקר העליון (`LiveActivityBar`) מציג עדכון-חי רק כ**מצביע** («← לצפייה») ומוסתר ב-`/` וב-`/community/chat`. **עדכון מקושר-לפוסט (`link_url`) מוסתר בטיקר של עמוד הבית** (`hidePostLinked` ב-`BrandTicker`) — הפוסט כבר ב«עדכונים אחרונים». בטיקר, עדכון-פוסט = כותרת בלבד + כפתור «📖 לקריאת הפוסט המלא», לא כל התוכן. תקן: ● LIVE אדום + אייקון וואטסאפ, בלי מילים. **קרדיט «מאת» חובה על כל עדכון.**
- **📲 הפצה לקבוצות וואטסאפ (`wa_*`, מספר משני דרך Green API):** מפתחות ב-Vault (`GREEN_API_ID`+`GREEN_API_TOKEN`); פונקציות: `wa_state()` (מצב חיבור) · `wa_groups()` (רשימת קבוצות) · `wa_distribute(text, image?, chat_ids?, slug?, dry_run?)` (בלי chat_ids = כל הקבוצות; תמיד dry_run קודם!). יומן: `wa_publish_log`. **הפצה בפקודת צוריאל בלבד — לא אוטומטית.** חסום מהציבור (service_role בלבד).
- ⛔ שום עדכון לא נכנס לזרם המציאות אוטומטית. וידאו מתנגן רק בהקשה (Egress!); בהיקף — Cloudflare R2. העלאת מדיה: `gallery/sod1820/broadcasts/` (policy זמנית — לסגור מיד!).

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
- **ריבוע גימטריה בפוסט (`post_gematria_box_law`)** — הקופסה «🔢 גימטריה — עובדה מאומתת במנוע» מוצגת **רק כשיש שוויון/התכנסות אמיתי** (≥2 ביטויים עם אותו ערך, למשל מה פעל אל=256=אהרן). אין שוויון → **אין ריבוע** (אסור ריבוע ריק עם ערכים שונים). מיקום: **בתחתית הפוסט (לפני «ראו גם») או באמצע סמוך למקטע התמטי הרלוונטי** — לעולם לא בהתחלה. החוק המלא: `select description from nodes where rule_id='post_gematria_box_law';`.
  - **חובה — קלאס קנוני, לא inline (פתרון שורש ל-`legacy_content_protocol` §1):** הריבוע נכתב **תמיד** עם `<div class="sod-gematria-box">` ולא עם `style` inline. הסיבה: כלל ניקוי ה-WP `.sod-post-content div[style*="height"]{max-height:24px}` תופס כל `div` עם `line-height` ב-inline ומוחץ אותו ל"פס שחור". הסגנון (כולל `line-height`) חי בקלאס ב-`POST_CONTENT_CSS`. **המבנה:** `<div class="sod-gematria-box"><div class="gb-title">🔢 גימטריה — עובדה מאומתת במנוע</div><div class="gb-rows"><div><b>ערך</b> = ביטוי = ביטוי</div></div><div class="gb-note">…</div></div>`. ⚠️ הקלאס מוגדר ב**שני** עותקים: `src/legacy/legacy.jsx` (זה שמרונדר בפועל) ו-`src/theme.js` — לעדכן את שניהם.
- **פוסט על אירוע שקורה ("משהו שקורה" / חדשות / תיעוד בזמן אמת)** → תמיד לשייך לקטגוריה **`תיעוד אירועים`**.
- **קטגוריות ותגיות — להשתמש בקיימות, לא להמציא כפילויות.** לפני פרסום: `select distinct unnest(categories) from posts;` / `... unnest(tags) ...` ולחפש את הקיים (למשל פוסט פרה אדומה → תגית `פרה אדומה`, קטגוריה `בית המקדש השלישי`).
- **קטגוריית `רמזים חזקים` = רק הפוסטים של צוריאל.** אסור לשייך אליה פוסט של כותב אחר (ציון סיבוני / גולשים / מזכה הרבים וכו'). פוסט של כותב אחר → קטגוריות תוכן מתאימות (`סוד האותיות והמספרים`, `תיעוד אירועים`, וכו'), **לא** `רמזים חזקים`.
- **`post_text_colors_law` v3 (חקוק) — עיצוב ברירת-המחדל «של המציאות»:** טקסט רץ לבן-רך (בהיר: כהה), משקל רגיל, **לא הכל צהוב** — זהב שמור לערכים/אקסנטים. גימטריה: ביטוי = `<span class="sod-gemlink" data-gem="<ביטוי>">` (צבע טקסט + קו-זהב מנוקד), ערך = `<b class="sod-numlink" data-gem="<ערך>">` (זהב; בהיר: אדום). **לחיצה פותחת את מגירת המספר בדף — לא ניווט החוצה.** שורות ריבוע זורמות inline. הכל קנוני ב-POST_CONTENT_CSS `.clean`: כל ביטוי-גימטריה עטוף `<a href="/number/<ביטוי>">` וכל ערך `<a href="/number/<ערך>">` (בעיקר הביטוי). הסגנון קנוני ב-POST_CONTENT_CSS (`.sod-post-content.clean`) — לא לצבוע אפור-בז' ב-inline.
- **לקשר פוסטים קשורים** — להוסיף בתחתית התוכן בלוק «ראו גם» עם קישורים לפוסטים באותו נושא (`<a href="/<slug>">`).
- **תמונה ראשית** — אפשר לעשות שימוש חוזר בתמונה קיימת מ-Storage של פוסט קשור (`image_url`), כדי שתופיע גם בתצוגות (דף הבית / רשימות).
- פוסט נוצר ידנית: `insert into posts (id, wp_id, title, slug, content, excerpt, date, modified, categories, tags, source, image_url) overriding system value values (...)` — `id`/`wp_id` = מעל ה-max הקיים; `source='ai'` לפוסט שנכתב ב-AI.
- **כותבים (`author`):** שדה ריק = מוצג **"המערכת"** (לוגו SOD1820). אשכול קטגוריית **`התחזקות`** = הכותב **"מזכה הרבים"**. מרשם הכותבים: `src/lib/authors.js`.
- **תווית/אימות AI (`verified` / `ai_touched`):** מפעילים **רק** כשה-AI אימת ידיעה ממקור חדשות מפוקפק/לא אמין — **לא** סימון לכל פוסט שנכתב ב-AI (כתיבה ב-AI = `source='ai'` בלבד, בלי דגל אימות).
- **`ai_gematria_verified_stamp_law` (חקוק):** פוסט/ריבוע גימטריה שה-AI **יצר או אימת במנוע** → **תמיד** `ai_touched=true` כדי לרנדר את חותמת «🔵 AI · מאומת» (AiVerifiedDisclaimer) בראש — כמו פוסט נסראללה (wp_id=34200). תנאי: כל ערך אומת במנוע הרשמי (`fn_ragil`/`fn_misratar`/`atbash_calc`/`kadmi_calc`…) לפני החותמת. אסור חותמת קטנה/כפולה בתוך התוכן — רק הריבוע הקנוני בראש. החוק המלא: `select description from nodes where rule_id='ai_gematria_verified_stamp_law';`.

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
  - **עדכון (HomeNewPage):** ל"עדכונים אחרונים" מתווספים גם **רמזים מזרם המציאות** (`gallery_images source='update'`) ככרטיסי-תמונה עם **רצועת-מספר ממותגת** (המספר הדומיננטי + ✦סוד1820), ממוזגים לפי תאריך. לחיצה → דף המספר. כך "רואים שעלה עכשיו עדכון גלריה". (`updatesFeed` ב-`HomeNewPage.jsx`.)
- **חידושי AI** = תיבה מכובדת עם 3 חידושים אחרונים (`origin='ai'`) + "עוד בבית המדרש →". הרכיב `AiInsightsBox`.
- היכל השערים (`heichal.html`) — הוסר ה-overlay "סוד1820" שהסתיר את המרכז.

פוסט היסוד: `wp_id=17` ("שם ה' בתורה 1820 פעם") מוצג בראש בית המדרש כ-«פוסט היסוד» (כבוד לסוד 1820).
כשנוצר חידוש AI מפוסט/גלריה — הוא נשמר ב-`insights` (origin='ai'), מופיע בתיבת ה-AI בבית המדרש, ולחיצה מנווטת לפוסט/גלריה (`source_ref`).

## 📣 פרסום לפייסבוק/אינסטגרם — דרך SQL, בלי מפתח (`social_publish_law`)
> **כל סוכן יכול לפרסם לרשתות בלי לבקש מצוריאל את ה-`FB_ADMIN_KEY`.** המפתח שמור ב-Supabase **Vault** (`FB_ADMIN_KEY`) ומוזרק בצד השרת. אל תבקש את הקוד מצוריאל — פשוט הרץ את פונקציות ה-SQL.

**✅ מומלץ — פרסום עם תיוג-מקור אוטומטי (`social_post`):** עוטף את פונקציות הליבה, **מוסיף אוטומטית קישור-אתר מתויג** (`?src=…`) לפי הערוץ, מנתב לדף הנכון ומתעד ל-`social_publish_log`. כך כל פוסט נעשה מדיד בדף האדמין («מקורות-הגעה מתויגים») בלי לזכור לתייג. ערוצים: `ig` (אינסטגרם קוד המציאות) · `fb-code` (פייסבוק קוד המציאות) · `fb-meluha` (פייסבוק כי לה' המלוכה).
```sql
-- p_dry_run=true → רואים את ה-caption/קישור שייווצרו בלי לפרסם (לאימות לפני שליחה אמיתית)
select public.social_post('ig', '<image_url>', '<גוף הטקסט>', '/reality');          -- אינסטגרם, נחיתה /reality
select public.social_post('fb-meluha', '<image_url>', '<גוף הטקסט>', '/');           -- פייסבוק כי לה' המלוכה
select public.social_post('fb-code', '<image_url>', '<גוף הטקסט>', '/topic/1820', true, true);  -- dry-run
```
המפרסם מוסיף `🔗 https://sod1820.co.il<path>?src=<ערוץ>` בסוף ה-caption (אם אין כבר קישור-אתר בגוף). הקישור ב-bio של אינסטגרם הוא שמודד את `?src=ig` (קישור ב-caption של IG אינו לחיץ) — לכן לפרסום ב-IG עדיין חשוב שהקישור ב-bio יישא `?src=ig`.

**פונקציות הליבה (אם צריך שליטה ידנית מלאה / בלי תיוג):**
```sql
select public.fb_publish_photo('<image_url>', '<caption>', '<page_id>');  -- פוסט-תמונה
select public.fb_publish_post('<message>', '<link?>', '<page_id>');        -- פוסט טקסט+קישור
select public.ig_publish('<image_url>', '<caption>', '<page_id|null>');    -- אינסטגרם (דורש דף עם IG מקושר)
select public.fb_set_cover('<image_url>', '<page_id>');                    -- כריכת דף (דורש scope pages_manage_metadata)
select public.social_admin('<action>', '<payload>'::jsonb);               -- גנרי: whoami/list/search/delete/ads_* וכו'
```
- **תמיד `select public.social_admin('whoami')` קודם** כדי לקבל את ה-page_id/ig_id הנכונים.
- **הדפים (נכון ל-6.2026):** «כי לה' המלוכה» = `617996338259568` · «קוד המציאות» = `346556845479563` (IG `@realitycode1820`, ig_id `17841463554031717`). חשבון פרסום: «גאולה 2024» = `act_397316022648143`. טוקן: `sod1820-automation`.
- מאחורי הקלעים: `public.social_admin` (SECURITY DEFINER) מושך את המפתח מ-Vault וקורא ל-Edge Function `facebook-admin` עם header `x-fb-admin-key`. הפונקציות **חסומות מהציבור** (anon/authenticated) — service_role/postgres בלבד.
- **פורמט פוסט-תמונה מועדף (כבקשת צוריאל):** רוב התוכן *בתוך* ה-caption + קישור לאתר בסוף.
- **אישור פרסום — אוטונומיה מלאה (`social_autonomy_law`, החלטת צוריאל 6.2026):** פרסום שגרתי לדפי הפרויקט עצמם (אינסטגרם/פייסבוק «קוד המציאות» ו«כי לה' המלוכה») **לא דורש אישור מראש ולא שאלה כל פעם** — פשוט לפרסם, ואחרי הפרסום לדווח קצר *מה* פורסם + קישור. אין «מיליון אישורים». הרשאת ה-CLI כבר פתוחה (פרסום עובר דרך `execute_sql` שמאושר ב-`.claude/settings.json`). חריג יחיד שעדיין שווה לשאול עליו לפני: תוכן רגיש/חריג באמת (ידיעת-חדשות לא מאומתת, נושא פוליטי טעון, שינוי כריכת-דף). מפתח ה-Vault ממילא לא נדרש.
- אם `set_cover` מחזיר `(#283) pages_manage_metadata` — חסר scope בטוקן; צוריאל מוסיף אותו ב-Business Settings ומעדכן `META_SYSTEM_TOKEN`.

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

## 🔬 סביבת המחקר — Shell קבוע + מרכז מחקר גלובלי (`research_workspace_law`)
> **משפט-העל:** «Sod1820 צריך להרגיש **פשוט ב-5 הדקות הראשונות, וחזק בלי גבול אחרי 5 חודשים**.»
> **נעול ע״י צוריאל 28.6.2026.** החוק המלא: `select description from nodes where rule_id='research_workspace_law';`
> **העיקרון העליון (הרחבת `unified_graph_law`):** כל כלי = עדשה אחת; **המחקר של המשתמש רציף.** בית מדרש/דילוגים/גימטריה לא חיים לבד — כולם מתחברים ל**סביבת מחקר אחת** שנשארת פתוחה לאורך כל המסע.

- **SPA עם Shell קבוע:** Header+Nav+Footer קבועים, רק ה-**Workspace** (מרכז) מתחלף. **«סביבת המחקר»** = רכיב גלובלי שממוקם פעם אחת מחוץ לראוטים → שורד מעבר בין דפים. דסקטופ: עמודה ימין · מובייל: כפתור «🧠 המחקר שלי ▲» → Bottom Sheet (סגנון ChatGPT).
- **שם:** «סביבת המחקר»/«מרכז המחקר» **מחליף את «בית המדרש»** (פחות דתי). ראוט קנוני `/research`; `/beit-midrash` נשמר כ-alias. שמות פנימיים (HeichalShell) לא נחשפים.
- **4 אזורים (סקייל):** 🏠 תוכן · 🧮 מחקר · 📂 סביבת העבודה · 👤 אני.
- **Research Bus (ההמצאה):** כל כלי → «➕ הוסף למחקר» → «המחקר הפעיל» (מספר↓פסוק↓פוסט↓שם↓תאריך), נשאר במעבר אזורים, ואז 🤖 «נתח/הצלב/צור התכנסות». שמירה: אנונימי=localStorage, מחובר=Supabase, טבלה אחת `research_items` (bucket cart/library/draft/favorite) שמאחדת גם את `user_saved_items`.
- **עיצוב:** סביבת המחקר (+ELS) = שפה **בהירה נקייה מודרנית** (Microsoft/ChatGPT/FB): רקע `#f6f7f9`, כרטיסים לבנים, טקסט `#1b1d22`/`#5b6472`, אקסנט כחול `#2f6df6` + נגיעת זהב. **דף הבית/תוכן — לא נוגעים** (זהב-מלכותי, `canonical_colors_law`). פלטה scoped, לא דריסה.
- **מספרים — יושר:** «מה מחפשים אנשים» מיד; מדדים קטנים מוסתרים עד שצוריאל חושף; «כמה עכשיו» אופציונלי. גיימיפיקציה = שדרוג עתידי, לא יסוד.
- **מובייל-ראשון (חובה, רפרנס investing.com):** חייב להיפתח ולעבוד **מצוין באייפון/Safari** — מגע ≥44px · בלי גלילה אופקית · Bottom Sheet · safe-area (notch) · שדות ≥16px (בלי zoom אוטומטי) · נבדק לפני סגירה. נקי (ChatGPT) + צפיפות-נתונים מבוקרת היכן שצריך (investing).
- **מערכת Panels (לא רכיב קשיח):** «סביבת המחקר» = registry של פאנלים-מודולים עצמאיים (`{id,icon,title,collapsible,component}`): 👤 אני · 🧠 המחקר הפעיל · 📂 שמורים · 🔔 חדש במערכת · 🤖 AI Assistant. מוסיפים/מסדרים פאנל בעתיד בלי לגעת בשלד.
- **3 פעולות אחידות בכל כלי** (אותו מקום + עיצוב, תמיד): **➕ הוסף למחקר · ⭐ שמור · 🔗 שתף**. רכיב קנוני יחיד `<ToolActions>` (ה-`DocActions` שנבנה מתאחד לתוכו; «הדפס» = פעולה משנית). חל בבית מדרש/גימטריה/ELS/דף מספר/תפילה.
- **דואליות עמוד:** כל מסך = שימושי גם כעמוד עצמאי (deep-link/SEO/OG מגוגל) וגם כחלק רציף מ-Workspace. השלד עוטף ראוטים; כל ראוט עומד בפ״ע.
- **Event Bus (החוט המחבר):** כל פעולה פולטת Event (`research:add`·`item:save`·`item:share`·`search:gematria`·`page:number:open`·`ai:analyze`). הפאנלים **מאזינים** ל-Bus, לא שואלים את הדפים → אפס תלות בין רכיבים → כל פאנל/כלי עתידי מתחבר בלי לשבור. מימוש: emitter קטן (mitt-style)/store + persist.
- **Quick Actions (זיכרון-שריר):** שכבה אחידה אינליין ליד כל ישות (מספר/פסוק/שם/פוסט) בכל מקום: ➕ הוסף למחקר · ⭐ שמור · 🔗 שתף · 📋 העתק · 🤖 נתח ב-AI — בלי תפריטים. `<ToolActions>`=בולט, `<QuickActions>`=מיקרו אינליין; שתיהן פולטות Events.
- **עיקרון-על — לא מאבדים Context לעולם:** מעבר גימטריה→דילוגים→דף-מספר שומר הקשר; יצא וחזר → «המשך מהמקום שעצרת». ה-Context נשמר (localStorage+ענן) ומוזן מה-Event Bus. תחושת Notion/ChatGPT.
- **Everything is an Entity (= `unified_graph_law` הקיים):** אין סוגים נפרדים — הכל `nodes` (Entity: `{id,type,title,metadata,relations}`). Research Workspace / Event Bus / AI / דפי-מספר עובדים מול Entity אחיד. AI = `Analyze(Entity)` / `Analyze(Collection<Entity>)`, לא פונקציה לכל סוג. **Relation Engine** (ליד ה-Event Bus): ישות/קשר חדש → מתעדכן ב-Knowledge Graph (`edges`).
- **Progressive Disclosure (פשוט→חזק):** 3 שכבות נחשפות בהדרגה — חדש (חיפוש·פוסטים·«הוסף למחקר»·«המחקר שלי») · מתקדם (Research Center מלא·AI·השוואות·התכנסויות·גרף·קיצורים) · מקצועי (Graph Explorer·Entity Relations·Event Timeline·מחקרים מרובים). המערכת «גדלה עם המשתמש».
- **Local-first (בלי התחברות):** קריאה·חיפוש·«הוסף למחקר» מקומי·שמירה זמנית בדפדפן — הכל בלי לוגין. התחברות רק לסנכרון בין-מכשירים/ענן. חיכוך מינימלי.
- **ראייה-עתידית + הסבר אינטראקטיבי:** המשתמש תמיד **רואה לאן אפשר להגיע** (שכבות נראות גם אם נעולות — מפת-דרך, לא הכל פתוח). כל התהליכים, ההתכנסויות ועץ-האחד מוסברים בכל שלב **אינטראקטיבית**: עיגולים שפותחים ריבועים עם הסבר, גם למתחיל וגם למתקדם.
- **מפת שלב 1:** ✅ Event Bus·Entity Model·Research Provider·Panel Registry·Research Center·ToolActions·QuickActions·Bottom Sheet·Workspace קבוע·Local-first·Progressive-Disclosure בסיסי. ❌ בלי גיימיפיקציה·Graph Explorer·AI מורכב.
- **משפט-סיום:** «הכול Entity; כל Entity מקושר לכל Entity; הכל על מודל אחד (nodes+edges) → כל כלי עתידי מצטרף בלי שינוי ארכיטקטורה.» → **היסודות סגורים. עוצרים ללטש, בונים.**
- **היקף שלב 1:** בית המדרש(→מרכז מחקר) + ELS בלבד. **אסור לגעת בדף הבית.** שלבים: 1-שלד+סביבה+פלטה+Panels · 2-Research Bus + `<ToolActions>` · 3-אזורים · 4-ELS באותו שלד · 5-מרכז חי. כל שלב נפרס בנפרד.

## ⛔ פריסה — חוק (`deploy_on_request` + `deploy_quota_protection`)
**צוריאל מחליט מתי מעלים לאוויר. לא דוחפים ל-`main` אוטומטית.**
- **חובה לאמת כל פריסה** מול האתר החי (שם הבאנדל `assets/index-*.js` התחלף / grep למרקר). Vercel נתקע **בשקט** כשמכסת ה-100/יום נגמרת — פרודקשן פשוט לא מתעדכן.
- ⚠️ **תקרית 2.7.2026:** `ignoreCommand` ב-`vercel.json` (בדיקת ענף/סביבה) חסם את *כל* הפריסות כולל main במשך יומיים — המשתנים לא זמינים כצפוי בשלב ה-Ignored Build Step. **הוסר. אסור להחזיר אותו ל-vercel.json בלי לאמת פריסת-main מוצלחת מיד אחרי.** חיסכון מכסה — עדיף דרך Dashboard → Settings → Git → Ignored Build Step.
- 🖼 `thumb()` ב-`src/lib/img.js` חייב `resize=contain` — בלעדיו Supabase חותך תמונות בצדדים (`image_render_contain_law`). ⛔ לא להסיר.
- כל push ל-`main` = פריסת Vercel, והמכסה החינמית מוגבלת (100 פריסות/יום). אסור לבזבז אותה על כל תיקון קטן.
- **צוברים שינויים** כ-commits (לענף הפיתוח לשמירה), **ומעלים ל-`main` רק כשצוריאל אומר במפורש** ("תעלה" / "העלה"). אז מעלים את כל המצטבר בבת אחת.
- **ליזום עדכון:** בכל הזדמנות מתאימה לומר לצוריאל **כמה חלקים מוכנים וממתינים לפריסה**, ולשאול אם להעלות עכשיו.
- שינויי **נתונים** (Supabase) חיים מיד ולא תלויים בפריסה — מותר להמשיך בהם כרגיל בלי לשרוף מכסה.

## כללי
- האתר: React 18 + Vite, פרוס ב-Vercel (רק `main` = פרודקשן). נתונים מ-Supabase. בדיקת build: `npm run build`.
- ענף פיתוח נוכחי: `claude/prayer-sharing-popup-u1kn3s`.
