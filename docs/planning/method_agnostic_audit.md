# 🔢 Method-Agnostic Audit — האם המערכת באמת אגנוסטית ל-21+ שיטות (READ-ONLY · מיפוי · לא לתקן)

> actor=CLAUDE · 14.8.2026. **מיפוי בלבד — לא תוקן כלום.** נבדק מול הקוד החי והסכמה החיה.
> **תשובה קצרה:** המנוע וה-Field Package **כן** אגנוסטיים; **האחסון, הקליינט, ההצלבות, ההתכנסויות וכל צנרת-הקליטה — לא.** מספר חדש-שיטה יוצג ב-Field Package אך **יאבד** באחסון/קליטה/הצלבה/דף-ישות.

---

## 🧭 שלוש הייצוגים (שורש כל אי-ההתאמות)
| ייצוג | שיטות | אגנוסטי? | הערה |
|---|---|---|---|
| **רישום מנוע** `gematria_methods` | **23** (`method_key, db_column, in_engine, function, active, source_of_truth…`) | ✅ **כן — המקור הקנוני הדינמי** | הוספת שורה = שיטה חדשה. `db_column` ממפה לאחסון. |
| **`bidim`** (base table, long) | 17 distinct | ✅ צורה אגנוסטית (`method,value` לשורה) | מאוכלס מ-`gematria_words`; רק שיטות עם עמודה/נתון מגיעות |
| **`gematria_words`** (wide) | ~14 עמודות-שיטה + `all_values[]` + `other_value/other_method` (1 חריג) | ⚠️ **חלקית-קבוע** | שיטה בלי עמודה ← רק `all_values` (מספר-עירום) או שקע-`other` יחיד |
| **קליינט `gematria.js`** `METHODS`(14)+`DEPTH_METHODS`(9) | **23** | ❌ **hard-coded, לא קורא מהרישום** | תואם ל-23 היום **במקרה** — כל שינוי ברישום = drift |

**ה-drift המרכזי:** הרישום (23) והקליינט (23) הם **שני עותקים נפרדים**. `fn_gematria_pack` בדגימה החזיר **13** ב-`methods.evidence` (תת-קבוצה). ⇒ שלושה מספרים שונים (23 רישום · 23 קליינט · 13 pack · 17 bidim · 14 עמודות · 7 convergences) — אין מספר-אמת אחד.

---

## 1 · איפה רשימת-השיטות hard-coded
- **`src/lib/gematria.js`** — `METHODS` (14 · שו׳ 73-88) · `DEPTH_METHODS` (9 · 114-122) · `CROSS_METHODS` (7 · 93) · `LMAP` (12 · ~133) · `LETTER_COLS` (89). כל אחת עם `fn`/`map` בקוד — **לא נגזר מ-`gematria_methods`**.
- **`src/pages/AdminPage.jsx`** — `SCAN_METHODS` (10 שמות עבריים · 1098) · `METHOD_HE` (latin→עברית, 11 · 4488).
- **`src/pages/CrossMethodPage.jsx`** — `METHOD_COLS` (רשימת-עמודות קשיחה · 16) · `SELECT`/`orFilter` נבנים ממנה (31/107).
- **`src/lib/fieldpackage.js`** — `CONV_METHOD_HE` (10 latin→עברית · לצירוף ערך-התכנסות).
- **`supabase/functions/gematria-api`** — `METHOD_HE` (9).
- **~15 רכיבים** מייבאים `[...METHODS,...DEPTH_METHODS]` (EntityPage:258 · BeitMidrash:918 · GematriaCalculator:21 · NumberDrawer · ActiveEntityPanel:162 · NameLab · SearchesTab · CommunityCalculator:20 · ApiPanel · NumberFamilies…).

## 2 · איפה מניחים שיש `ragil`
- **`src/lib/supabase.js:531`** `GEM_METHOD_COL = {ragil, misratar, kadmi}` — **רק 3 שיטות ניתנות-לבחירה** לחיפוש-ישות; `:534/547` `|| 'ragil'` ברירת-מחדל.
- **`getEntityBundle`** (~1794) `.eq('ragil', value)` — **דף-הישות כולו ננעל על ragil**.
- `supabase.js:347` count `.eq('ragil')` · `:678/679` `.not('ragil','is',null)` · `:962-967` `other_value.eq/ragil.eq` + `r.ragil===anchor?'רגיל'`.
- `fieldpackage.js` `primaryValue` נופל ל-`methodsEvidence["רגיל"]`.
- **217 אזכורי `ragil` ב-41 קבצים** — ragil הוא הראשי/ברירת-המחדל בכל מקום.

## 3 · איפה מניחים מספר-שיטות קבוע
- **`gematria_words`** — סכמה רחבה (~14 עמודות-שיטה). שיטה 21 בלי עמודה = אין איפה לשמור (רק `all_values` מערך + `other_*` שקע-יחיד).
- `GEM_METHOD_COL` (3) · `SCAN_METHODS` (10) · `CrossMethodPage.METHOD_COLS` · `CROSS_METHODS` (7).
- הערות-קוד «20 שיטות (14 ליבה + 6 עומק)» מקבעות מספר.
- `fn_gematria_pack` דגימה: `method_count:13`.

## 4 · איפה הגימטריה נשמרת דינמית (הטוב)
- ✅ **`bidim`** — long format (`word_id, phrase, method, value, is_verified`) = המודל האגנוסטי הנכון.
- ✅ **`gematria_words.all_values` (int[])** — כל הערכים כמערך (אגנוסטי לְערכים, אבל **מאבד את מיפוי method↔value**).
- ✅ **`gematria_methods.db_column`** — ממפה שיטה→עמודה דינמית (הגשר בין רישום לאחסון).
- ⚠️ **`other_value/other_method`** — שקע-חריג **יחיד** לשיטה לא-מעומדת (לא נסקייל).

## 5 · איפה ה-UI עובד עם `methods[]`
- ✅ **`fieldpackage.js projectFinding`** — `Object.entries(methodsEvidence).map` = אגנוסטי מלא (מרנדר כל מה שהמנוע מחזיר).
- ✅ **`WarRoomTab FieldPackageSection`** — `pkg.finding.methods.map` = אגנוסטי.
- ⚠️ **`GematriaCalculator`/`NumberDrawer`/`EntityPage` (שכבת-שורשים)** — `[...METHODS,...DEPTH_METHODS].map` = אגנוסטי מעל ה**רשימה-הקשיחה** (לא מעל פלט-המנוע). ⇒ מרנדר מה שבקוד, לא מה שהמנוע יודע.

## 6 · איפה ה-Field Package מטפל במספר-שיטות בלתי-מוגבל
- ✅ `finding.methods` — אגנוסטי מלא (iterate על מפתחות-המנוע).
- ✅ `classifyState`/`buildFieldPackage` — ספירות (`.length`), אגנוסטי לספירה.
- ⚠️ `finding.convergences` — `CONV_METHOD_HE[g.method]` נופל ל-latin, אבל `value: methodsEvidence[he]` ← **null אם השם-העברי לא במפה**. הרינדור אגנוסטי, **צירוף-הערך תלוי-שם**.

## 7 · איפה ההתכנסויות תלויות בשם-שיטה
- **`convergences.method`** = latin key; קיימות רק **7 ערכים** (`ragil,miluy,misratar,kadmi,gadol,siduri,any`). ⇒ **הגנרציה מכסה תת-קבוצה**; שיטה חדשה = אין שורות-התכנסות.
- `fieldpackage.js CONV_METHOD_HE` + `AdminPage METHOD_HE` — צירוף latin→עברית קשיח.
- ⇒ שיטה 21: אין convergences, וה-join בקליינט מחזיר `value=null`.

## 8 · איפה OCR / פוסטים / WhatsApp / תרומות עלולים לאבד שיטה חדשה
- **OCR / גלריה** (`gallery_images`, `getRealityHints`) — שומר `primary_value` + `all_values` (int[]) + `ocr_meta` = **מבוסס-מספר בלבד, בלי מימד-שיטה**. ⇒ שיטה חדשה: הערך נשמר כמספר-עירום, **זהות-השיטה אבודה**.
- **תרומות** (`contributions.js` → `gematria_words`) — עמודות-קבועות + `other_value/other_method` (שקע יחיד). טענת-שיטה-חדשה נכנסת רק ל-`other_method` (אחד) או **אובדת**.
- **פוסטים** — גימטריה מוטמעת ב-HTML (`data-gem`/`sod-gemlink`); העוטף-אוטומטי (`post_autolink_law`) תופס **מספר/ביטוי**, לא שיטה. ⇒ מימד-שיטה לא-מובנה.
- **WhatsApp** (`wa_vip_inbox.numbers/phrases`) — מספרים+ביטויים, **בלי מימד-שיטה**. ⇒ method-blind.
- **מסקנה:** כל 4 נתיבי-הקליטה הם **value-centric**, לא method-centric ← שיטה חדשה מאבדת את זהותה בקליטה (רק המספר שורד, ומתפרש כ-ragil).

## 9 · איפה bridges / cross מוגבלים
- **`CROSS_METHODS`** (gematria.js:93) = **7 קבוע** (מדלג בכוונה על מנפחי-ערך: הכפלה/ריבוע/גדול/מילויים-עמוקים).
- `crossMethodPairs` (95-100) עובר רק על CROSS_METHODS · `number_cross_resonance(p_self, p_pairs)` מקבל את 7-הזוגות מהקליינט.
- `fn_gematria_pack.cross` = "strongest_crossings" על תת-קבוצה.
- ⇒ שיטה 21 **לא משתתפת** בהצלבה עד שתתווסף ל-CROSS_METHODS.

## 10 · מה יקרה אם מחר המנוע יחזיר 21 שיטות במקום 13
| שכבה | תוצאה | אגנוסטי? |
|---|---|---|
| רישום `gematria_methods` | כבר 23 — מוכן | ✅ |
| `fn_gematria_pack.methods.evidence` | מחזיר 21 מפתחות | ✅ |
| **Field Package (תצוגה P2)** | **מרנדר את כל 21** (map על פלט-המנוע) | ✅ |
| קליינט `gematria.js` METHODS/DEPTH | לא מכיר את החדשות (23 קשיח) → מחשבון/שורשים/cross לא מחשבים אותן | ❌ drift |
| אחסון `gematria_words` | אין עמודה → רק `all_values` (מספר-עירום) + `other` יחיד | ❌ |
| `bidim` | צריך לוגיקת-אכלוס שתכלול את השיטה | ⚠️ |
| התכנסויות | אין שורות; join בקליינט → value=null | ❌ |
| cross/bridges | מוחרג (CROSS_METHODS=7) | ❌ |
| קליטה OCR/WA/פוסט/תרומה | value-centric → זהות-שיטה אבודה | ❌ |
| דף-ישות / חיפוש | ננעל ragil (`GEM_METHOD_COL`=3) → לא ניתן-לבחירה | ❌ |

**נטו:** שיטה 21 **תוצג** ב-Field Package אבל **תאבד** בכל שאר המערכת (אחסון, קליטה, הצלבה, התכנסות, דף-ישות, מחשבון).

---

## 🎯 מסקנה + השלכה ל-P2-server (לא לתיקון עכשיו)
- **הכיוון הנכון כבר קיים:** `gematria_methods` (רישום · 23) + `bidim` (long) + `fn_gematria_pack` (פלט-דינמי) + `Field Package` (map-אגנוסטי). מי ש**מתחבר למנוע** — אגנוסטי.
- **מי שמאבד שיטות:** כל מי שעוקף את המנוע — עמודות-`gematria_words`, `METHODS`-הקשיח בקליינט, `CROSS_METHODS`(7), convergences(7), וקליטת-value-centric.
- **לכן P2-server (wrapper→`fn_gematria_pack`, פלט מלא בלי צמצום) הוא הצעד הנכון לאגנוסטיות:** הוא מזרים את פלט-המנוע המלא ל-Field Package שכבר אגנוסטי. **אין לצמצם ל-ragil** — וזה בדיוק מה שה-wrapper שומר.
- **פערי-אגנוסטיות (למפה, לא לתקן עכשיו):** (א) קליינט `gematria.js` → לקרוא רישום במקום hard-code · (ב) `gematria_words` → מעבר ל-long (`bidim`) כמקור-אחסון · (ג) convergences/cross → registry-driven · (ד) קליטה → לשמר `{method,value}` לא רק מספר · (ה) `GEM_METHOD_COL`/entity-lookup → לפי `bidim(method)` לא רק ragil. **כל אלה = החלטות עתידיות נפרדות.**
