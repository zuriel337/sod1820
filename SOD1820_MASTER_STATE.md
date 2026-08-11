# 📜 SOD1820 — MASTER STATE (בסיס-עובד v2)

> **מהות המסמך:** בסיס-העובד המעודכן של Master State, מאומת מול ה-DB החי (project `linswmnnkjxvweumprav`, 10.8.2026).
> **docs בלבד.** לא DB-write · לא migration · לא merge · לא deploy · לא שינוי-קוד · לא שינוי-Registry · לא שינוי `active`/`in_engine` · לא חיבור-convergences · לא שינוי-קנון.
> **חוק-ברזל של המסמך:** שום `INFERRED` אינו עובדה. כל תווית-סטטוס מדויקת כפי שהוגדרה.
> **חוק-גישור:** החלטה מאוחרת וברורה גוברת על מוקדמת.

## מקרא-סטטוסים (הפרדה קשיחה)
- `EXISTING` — קיים ב-DB/קוד (עובדה נמדדת).
- `IMPLEMENTED` — מומש בפועל (עובדה).
- `ACTIVE` — פעיל/מוצג (`active=true`).
- `DORMANT` — קיים אך לא-פעיל (`active=false` / `status='new'`).
- `CANDIDATE` — מועמד, **מחוץ לקנון ומחוץ ל-Registry**.
- `UNKNOWN` — אין מספיק ראיות / לא-נבדק במלואו.
- `INFERRED` — **נגזר מדגלים, לא-שמור ישירות ב-DB** (לעולם לא עובדה).
- `PROPOSED` — הצעת-עיצוב, טרם-אושרה.

---

## 0. MASTER STATE GOVERNANCE (חוק-ניהול — נעול 10.8.2026)
> **מהות:** ה-Master State הוא **לא** רק תיעוד-מצב — הוא **מקור-האמת המרכזי (Single Source of Truth)** של פרויקט SOD1820, ניתן-להעברה בין Claude / ChatGPT / סשנים-חדשים. הכללים הבאים מחייבים כל סוכן/סשן:

1. **כל החלטה קנונית חדשה חייבת להירשם כאן** — לפני שהיא נחשבת בתוקף.
2. **כל שינוי משמעותי ב-SOD1820 חייב להשתקף כאן**, כולל: שמות · מיתוג · צבעים · UI/UX · מבנה-מסכים · ארכיטקטורה · חוקים · שיטות-גימטריה · AI/agents · flags · מודולים · מוצרים · מודל-עסקי · התנהגות-מערכת · הגדרות-קנוניות.
3. **אין להסתמך על «זיכרון-הסשן»** במקום לעדכן את ה-Master State.
4. **לפני שינוי מהותי — לבדוק כאן** שלא שוברים החלטה קודמת.
5. **אחרי שינוי שאושר/בוצע — לעדכן כאן** לפי המצב-האמיתי.
6. **כל שינוי כולל תאריך/הקשר** כאשר ידוע.
7. **Change Log חובה** (ראה §CL) — מה השתנה · מתי · למה · מה הוחלף · ובאיזה סטטוס (`APPROVED`/`IMPLEMENTED`/`PROPOSED`/`CANDIDATE`/`UNKNOWN`…).
8. **החלטה חדשה שסותרת ישנה — לא מוחקים היסטוריה.** מסמנים שהחדשה החליפה את הישנה; **המאוחרת והברורה גוברת**.
9. **אין להפוך `IMPLEMENTED` ל-`CANONICAL` אוטומטית.**
10. **אין להפוך `CANDIDATE` / `IDEA` / `PROPOSED` לעובדה.**
11. **לא-ידוע → נשאר `UNKNOWN`.**
12. **קיים-בקוד אך לא-אושר-כקנוני → `IMPLEMENTED BUT NOT CANONICAL`.**
13. **כל שינוי עתידי של צבע/שם/UI/UX/התנהגות עובר דרך מנגנון זה** — אין «שינוי קטן» מחוץ ל-Master State.
14. **ה-Master State נשאר ה-Single Source of Truth** הניתן-להעברה בין מודלים וסשנים.

> **סטטוס חוק-הניהול:** `APPROVED` + `CANONICAL` (החלטת צוריאל, 10.8.2026). התוספת אינה משנה שום החלטה קיימת אחרת במסמך.

---

## 1. רישום השיטות — `gematria_methods`
- **`EXISTING` · Registry קנוני קיים של 23 רשומות** (base 14 · depth 9). זהו מקור-האמת לשיטות. **לא נבנה Registry מקביל.**
- **`EXISTING` · אין עמודת `status`/`lifecycle`** בטבלה. עמודות-המצב הקיימות: `in_engine`, `active`, `deterministic`, `function`, `db_column`, `version`, `category`, `sub`, `source_of_truth`, `required_entitlement`.
- ⚠️ **כל תווית lifecycle שמוצגת במסמך זה = `INFERRED`** מ-`in_engine`/`active`/`function` — **לא נתון-שמור**.
- ספירה (`EXISTING`, עובדה נמדדת): `in_engine=true`=16 · `in_engine=false`=7 · `active=true`=13 · `active=false`=10.

### 1.1 טבלת `gematria_methods` המלאה (23 שורות)
> עמודת «status/lifecycle» כולה `INFERRED` (אין עמ' status ב-DB). כל השורות: `deterministic=true`, `version=1`, `entitlement=public`.

| method_key | status/lifecycle (`INFERRED`) | in_engine | active | function | db_column |
|---|---|---|---|---|---|
| רגיל | verified·live | ✅ | ✅ | fn_ragil | ragil |
| מילוי | verified·live | ✅ | ✅ | fn_miluy | miluy |
| מסתתר | verified·live | ✅ | ✅ | fn_misratar | misratar |
| קדמי·משולש | verified·live | ✅ | ✅ | kadmi_calc | kadmi |
| ריבוע | verified·live | ✅ | ✅ | fn_ribua | ribua |
| גדול | verified·live | ✅ | ✅ | fn_gadol | gadol |
| סידורי | verified·live | ✅ | ✅ | fn_siduri | siduri |
| אתבש | verified·live | ✅ | ✅ | atbash_calc | atbash |
| אלבם | verified·live | ✅ | ✅ | fn_albam | albam |
| אותיות אחרי | verified·live | ✅ | ✅ | fn_otiot_after | — |
| אותיות לפני | verified·live | ✅ | ✅ | fn_otiot_before | — |
| משולש גדול | verified·live | ✅ | ✅ | kadmi_gadol_calc | kadmi_gadol |
| **אטבח** | candidate·reconstructed (פונקציה קיימת, לא-מחוברת) | ❌ | ✅ | fn_atbach | — |
| הכפלה | verified·dormant (מחושב, לא-מוצג) | ✅ | ❌ | — | hakpala |
| מילוי דמילוי | verified·dormant | ✅ | ❌ | — | miluy_demiluy |
| הכפלה גדולה | verified·dormant | ✅ | ❌ | — | hakpala_gadol |
| ריבוע גדול | verified·dormant | ✅ | ❌ | — | ribua_gadol |
| **מילוי בלבד** | candidate·reconstructed | ❌ | ❌ | — (קיים `fn_milui_only`) | — |
| **מסתתר גדול** | candidate·reconstructed | ❌ | ❌ | — (קיים `mistater_gadol_calc`) | — |
| **מילוי דמילוי גדול** | candidate·reconstructed | ❌ | ❌ | — (קיים `fn_milui_demilui_gadol`) | — |
| **משולש מילה** | known·needs-reconstruction | ❌ | ❌ | — (אין) | — |
| **משולש הפוך** | known·needs-reconstruction | ❌ | ❌ | — (אין) | — |
| **משולש מדרגות** | known·needs-reconstruction | ❌ | ❌ | — (אין) | — |

### 1.2 מה חסר לכל שיטה `in_engine=false` (תיעוד בלבד — לא לבצע)
**קבוצה 1 — הפונקציה כבר קיימת במנוע (אומת `to_regprocedure`); חסר רק חיבור (`reconstructed → verified`):**
- **אטבח** — `fn_atbach(text)` קיים (+`fn_atbach_maharshal`). הרשומה כבר מצביעה על `fn_atbach`. חסר: אימות-דטרמיניזם מול whitelist (`method_lifecycle`) + הכללה ב-`fn_all_methods`/pack + היפוך `in_engine=true`. אין קוד-חדש.
- **מילוי בלבד** — `fn_milui_only(text)` קיים. חסר: קישור עמ' `function` + אימות + היפוך דגלים.
- **מסתתר גדול** — `mistater_gadol_calc(text)` קיים. חסר: קישור `function` + אימות + היפוך דגל.
- **מילוי דמילוי גדול** — `fn_milui_demilui_gadol(text)` / `miluy_demiluy_gadol_calc(text)` קיימים. חסר: קישור `function` + אימות + היפוך דגל.

**קבוצה 2 — אין פונקציה; טעון בנייה (`known → reconstruction`):**
- **משולש מילה** («בונים את הביטוי אות-אחר-אות מההתחלה») — חסר: פונקציית-מנוע חדשה (דטרמיניסטית, whitelist) + אימות + קישור + הפעלה.
- **משולש הפוך** («מורידים אות מההתחלה בכל שלב») — חסר: פונקציית-מנוע חדשה + אימות + קישור + הפעלה.
- **משולש מדרגות** («כל אות מוכפלת במיקומה במילה») — חסר: פונקציית-מנוע חדשה + אימות + קישור + הפעלה.

**קבוצה 3 — `in_engine=true` אך `active=false` (דורמנטיות):** הכפלה · מילוי-דמילוי · הכפלה-גדולה · ריבוע-גדול — אין חסר-מנוע; מחושבות ושמורות ב-`db_column`. «חסר» = החלטת-תצוגה בלבד (`active=true`). **לא לשנות כעת.**

---

## 2. חוק מחזור-החיים — `method_lifecycle`
- **`EXISTING` · נעול** (label: «מחזור-חיי שיטה + שחזור חסום + provenance», v1, owner=רזיאל).
- מחזור: **`known → reconstructed → candidate → verified → canonical`**.
- שיטה `candidate`/`reconstructed` **לעולם לא קנונית אוטומטית**; כניסה ל-`gematria_methods` רק אחרי אימות-דטרמיניזם (whitelist קבוע ובלתי-תלוי-קלט) + **אישור-אדם**. אין חיפוש-חופשי/מניפולציה שנבחרת כדי לפגוע ביעד.
- ⚠️ **מיפוי השלב ל-Registry = `INFERRED`** — הטבלה אינה שומרת את שלב-ה-lifecycle; הוא נגזר מהדגלים בלבד.

---

## 3. שכבת-הבינה והבוטים — 8 חוקים נעולים (`EXISTING`)
> אומתו `is_active=true`, v1. **תוכן-מלא טרם-נקרא במלואו ≠ `UNKNOWN`** — קיימים ונעולים. השורות = label מאומת מ-DB.

| rule_id | מהות (label, מאומת) |
|---|---|
| `unified_ai_brain_law` | מוח-AI אחד — ai-analyze + רזיאל + כל הבוטים תמיד יחד, לעולם לא נפרד (23.7.2026) |
| `research_engine_law` | רזיאל = מנוע-מחקר, לא מנוע-תשובות; כל תשובה = תוצר-לוואי של מחקר (23.7.2026) |
| `raziel_companion_layer_law` | רזיאל = שכבת-ליווי של כל האתר (3 שכבות) + מוח-אחד אתר↔וואטסאפ (23.7.2026) |
| `never_silent_metatron_law` | לעולם-לא-שתיקה — 3 שכבות (עובדות→פרשנות→שומר), מטטרון סמכות-אחרונה (23.7.2026) |
| `metatron_rollout_law` | סדר-פריסת מטטרון 4 שלבים: יציבות→הוכחה→משתמשים (23.7.2026); נלווה ל-`metatron_single_mind_law` |
| `bot_experience_architecture_law` | חוויית-בוט = 80% סביבה·כלים·חשיבה · 20% מודל (23.7.2026) |
| `ai_analyze_contract` | חוזה מנוע-ה-AI (`ai-analyze`) — CORS / temperature / verify_jwt (9.7.2026) |
| `method_lifecycle` | מחזור-חיי-שיטה + שחזור-חסום + provenance (ראה §2) |

---

## 4. מנוע הגימטריה (`EXISTING` / `IMPLEMENTED`)
- **`IMPLEMENTED`:** משפחת `fn_` רחבה. אומת ישירות בסשן: `fn_ragil` · `fn_misratar` · `fn_kadmi` · `fn_miluy` · `atbash_calc` · `fn_zero_navigation` · `fn_zero_scale` · ועוד.
- **`EXISTING` · משפחה שאינה-מתועדת-בקנון (אזוטרי/מתקדם) — `MISSING FROM MASTER STATE`:** `fn_arcana*`, `fn_tarot_sos`, `fn_destiny_matrix`, `fn_human_design_gate`, `fn_anagrams_engine`, `fn_maftech_decompose`, `fn_notarikon`, `fn_random_reading`, `fn_transforms_tanach`. קיימות בקוד, **לא-קנוניות ולא-מופעלות במסמך זה** — מסומן בלבד.
- **`EXISTING` · תשתית-«מספר חם»:** `fn_warm_number` · `fn_promote_hot` · `fn_hot_context` · `fn_metatron_*`. עמודות `gematria_words.lead_rank` (165 בשימוש) · `vip_source` (394) · edges `demand_signal` (6).
- **`UNKNOWN`:** «מספר-חם» **כחוק/מנגנון-דירוג רשמי** — התשתית קיימת, ההגדרה חסרה.

---

## 5. שלוש השיטות החדשות — `CANDIDATE` בלבד, **מחוץ ל-Registry**
> לא נכנסות ל-`gematria_methods` עד מעבר-lifecycle מסודר (`known → reconstructed → candidate → verified → canonical`).
1. **Ordered Digit Sequence / 1234** (=1·2·3·4) — `CANDIDATE`. אין `fn_` תואם (קיים רק `digit_reverse` = היפוך).
2. **Embedded Core / 1358→358, 1676→676** — `CANDIDATE`. **אומת: ≠ `zero_navigation`** (`fn_zero_navigation(1358)` ו-`(1676)` החזירו `applicable:false` — «לא מסתיים באפס»). אין `fn_`.
3. **Definite Article Reading / אדם(45) → הָאָדָם(50)** — `CANDIDATE`. הערך `EXISTING`-מאומת במנוע (`fn_ragil('האדם')=50`, `fn_ragil('אדם')=45`); **כשיטה** = `CANDIDATE`.

---

## 6. הגרף והקישוריות (`EXISTING`, עובדות-מדידה חיות)
- `nodes` = **5,867** (active 5,849) · `edges` = **5,093** · `gematria_words` = **15,442**.
- `convergences` = **8,917** — `DORMANT` (כולן `status='new'`, **0 מחוברות לגרף**). לא-מחוברות במסמך זה.
- קישוריות (עובדות): `gematria_words`→node = 505 (3.3%) · `research_contributions` fully-unlinked = 315/334 (94%) · insight→node ≈ 0 (nodes type=insight = 1) · `year`→number edges = **0** · `event`→number edges = **0** (לפי הצטלבות ישירה).
- טבלאות-ליבה נוספות: `topic_cards` (212, approved 203) · `gallery_images` (1,851 עם primary_value, treasure=3) · `research_items` (קיים) · `insights` (296 active: צוריאל 269 / ai 27).

---

## 7. זהות ציבורית (`IMPLEMENTED`)
- `src/lib/publicIdentity.js` + חיווט 5-מסלולים — committed על הענף `claude/raziel-capabilities-audit-h5k9ww` (`5b90e19` insightAuthor · `79225f8` resolver).
- `SYSTEM_BYLINE` = «מערכת כי לה׳ המלוכה». השם הפרטי «צוריאל» לעולם לא ככותב-ציבורי. מקור-חומר ≠ עיבוד ≠ author.
- **`UNKNOWN` / לא-`DEPLOYED`:** הקוד על **הענף בלבד**; לא אומת על `main`.

---

# 🔻 סיכום-הכרעה

## מה עכשיו נעול (`CANONICAL`)
13 עקרונות Baseline v1.0 · חוק-ההשוואה (Existing ≠ Canonical ≠ Proposed) · זהות (`SYSTEM_BYLINE`) · כל חוקי-הגימטריה (`gematria_engine_law`, `method_hierarchy_ragil_foundation`, `meshulash_kadmi_law`, `misratar_multi`, `cross_vs_convergence_criteria`, `shitat_haechad_alef_law`, `root_exception`, `core_protection`) · **`method_lifecycle` + `gematria_methods` כמקור-אמת-לשיטות** · 8 חוקי-הבינה/בוטים (§3) · Rank-don't-hide / Discovery≠Filter · candidate≠canonical≠discard · «לא-אושר=UNKNOWN» · חוקי-CLAUDE.md (deploy/RLS/UI/logo/city-bg/reality/broadcast/post-publish).

## מה עכשיו קיים (`EXISTING` / `IMPLEMENTED`)
Registry 23 שיטות · 16 `in_engine=true` (13 `ACTIVE`) · משפחת `fn_` מלאה כולל האזוטריים · תשתית-חם · `convergences` 8,917 (`DORMANT`) · `publicIdentity` על-הענף · גרף 5,867 nodes / 5,093 edges.

## מה עכשיו מועמד (`CANDIDATE`)
3 השיטות החדשות (רצף-ספרות · ליבה-מוטמעת · קריאת-ה'-הידיעה) — מחוץ ל-Registry · + 4 שיטות `in_engine=false` שהפונקציה שלהן כבר קיימת (אטבח / מילוי-בלבד / מסתתר-גדול / מילוי-דמילוי-גדול) = `reconstructed`, ממתינות ל-lifecycle.

## מה דורש החלטה של צוריאל
1. `gematria_methods` = ה-Registry היחיד? (אישור רשמי; מונע כפילות).
2. אילו `in_engine=false` להעביר ב-lifecycle ובאיזה סדר · אילו `active=false` לחשוף.
3. הגדרת «מספר-חם» / «האפס הנע של הגדול» / «296» / אילו שנים-להוסיף.
4. חיבור `convergences` ↔ גרף — מתי · commit→deploy של `publicIdentity` ל-main — מתי.

## הצעד הבא המומלץ
עצירה מכוונת: **בדיקת Master State מול Claude Export** (`SOD1820_CLAUDE_SESSION_EXPORT.md`) לפני תחילת פיתוח. שום בנייה/כתיבה עד להכרעת צוריאל בנקודות שלמעלה.

---

## 8. Metatron Convergence Scan — FROZEN (`APPROVED` + `CANONICAL`, 10.8.2026)
> **החלטת צוריאל, נעולה.** מקור-הראיות: `CONVERGENCE_DEEP_AUDIT_01` (סשן זה).

- **`metatron-nightly` / `fn_metatron_scan` מושבתים** עד להשלמת **תכנון וחיווט מנוע-הגילויים החדש**.
  - מימוש בפועל (`IMPLEMENTED`): pg_cron job `metatron-nightly` (jobid 27, `select public.fn_metatron_scan(4);`, לוח `0 1 * * *`) → **`active=false`** דרך `cron.alter_job(27, active:=false)`. **הקפאה הפיכה** (הפעלה-מחדש = `active:=true`). ה-job והפונקציה **לא נמחקו**.
  - `fn_metatron_scan` היא **הכותב היחיד** ל-`convergences` (מאומת); אין job/פונקציה אחרים שמפעילים אותה → היצירה **מוקפאת לחלוטין**.
- **8,917 הרשומות הקיימות = קורפוס-היסטורי** בסטטוס **`FROZEN` / `EXISTING` / `OBSERVED` / `UNVALIDATED` / `NOT CANONICAL`**. **אינן נחשבות לגילויים קנוניים.**
  - ⛔ **אין** למחוק · **אין** לקדם (`fn_convergence_promote`) · **אין** לחבר לגרף (nodes/edges) · **אין** להציג אוטומטית — **ללא החלטה מפורשת של צוריאל.**
- **⚠️ הבחנה קריטית — «Metatron כולו כבוי» ≠ «Convergence Scan מוקפא»:** מוקפא **רק** ה-scan (job 27). **3 jobs אחרים של מטטרון נשארו `active=true` במכוון** — הם **אינם** מפעילים `fn_metatron_scan`:
  - `metatron-weekly` (`fn_metatron_weekly`) · `metatron-seeds` (`fn_metatron_journey_seeds`) · `metatron-recommend` (`fn_metatron_recommend`).
- **עקרון המנוע החדש (`APPROVED` + `CANONICAL`): איכות לפני כמות.** «עדיף **אפס** התכנסויות מאומתות מאשר אלפי תוצאות חלשות.» היעד = גילויים חזקים · עצים משמעותיים · קשרים איכותיים — **לא נפח.**
  - נגזרת (`APPROVED`): **כל תוצאה יכולה להישמר — אך רק חומר-חזק מתקדם.** אחסון ≠ קידום ≠ חשיפה (הרחבת Storage≠Promotion≠Display). שיטות/חישובים חדשים יכולים להיות **מחושבים ונשמרים** גם כשאינם מוצגים בדף-המספר או פתוחים-לציבור — **החשיפה היא שלב נפרד.**
- **מסלול המנוע החדש (`PROPOSED` — Design בלבד, טרם-נבנה):**
  `Seed → Methods → Discoveries → Cross-links → Convergence → Discovery Tree → Human Gate → Canonical → Display`
  (עם העיקרון «הכל נשמר, רק חזק מתקדם»). **לא לבנות · לא לתת הרשאת-כתיבה — עד אישור נפרד.**

---

## 9. מנוע-הגילויים החדש — עקרון-הצינור + הנחיות-מעבדה (`APPROVED` + `CANONICAL`, 10.8.2026)
> **החלטת צוריאל, נעולה.** מקור-הראיות: `FULL METHOD LABORATORY AUDIT` (סשן זה). **Design בלבד — טרם-נבנה, אין הרשאת-כתיבה.**

### 9.1 עקרון-הצינור (החוק המרכזי החדש)
**המערכת אינה «כל מה שהמנוע מוצא → מופיע באתר».** אלא צינור בן-6 שלבים:
```
Engine מחשב הכל → System שומר הכל → Discovery מוצא מעניין → Human Gate/Rank קובע מה חזק → רק מאושר מתקדם → רק מתאים מוצג
```
- **הרחבת `Storage ≠ Promotion ≠ Display`** — נעול: אחסון-הכל תמיד · קידום רק לחזק (שער-אדם) · הצגה רק למאושר-ומתאים.
- **המערכת מחשבת הרבה יותר ממה שהמשתמש רואה** — זה היעד, לא תקלה.

### 9.2 «מה חזק» = `UNDEFINED` (אזהרת-ברזל)
- מדד-החוזק **טרם-מוגדר** — `UNKNOWN`/`TODO`.
- ⛔ **`group_size` אסור כמדד-חוזק.** זו בדיוק הטעות שיצרה את 8,917. `convergence ≠ discovery`; נפח ≠ איכות.

### 9.3 הנחיות-מעבדה לשיטות (מ-ה-Audit — `APPROVED`)
- **א. 23 השיטות (`gematria_methods`):** ⛔ **אין לשנות Registry עדיין.** קודם מעבדת-בדיקה.
- **ב. 4 ה-RECONSTRUCTED** (אטבח · מילוי-בלבד · מסתתר-גדול · מילוי-דמילוי-גדול): ⛔ **לא להפעיל בפרודקשן.** קודם בדיקה-במעבדה (`method_lifecycle`: reconstructed→verified→…).
- **ג. שיטות חדשות — COMPUTE/STORAGE פנימי, לא-בהכרח DISPLAY:**
  - 3 שיטות-Registry חסרות-פונקציה (`משולש מילה/הפוך/מדרגות`) **+** 2 ה-`CANDIDATE` (Ordered-Digit `1234` · Embedded-Core `1358→358`/`1676→676`).
  - `APPROVED`: **רצויות בתוך המנוע** כ-COMPUTE/STORAGE פנימי; בהמשך זמינות למנויים/מחקר; **לא בהכרח בדף-המספר.** מאפשר להחזיק שיטות-חדשות בפנים **בלי ללכלך את דף-המספרים.**
  - ⛔ **הוסר (10.8.2026, החלטת צוריאל):** «Definite Article Reading / אדם→הָאָדָם» **אינו Method ואינו Candidate.** הָאָדָם=50 היה **דוגמה מחקרית חד-פעמית** (ערך מאומת במנוע), **לא שיטה** — אין להכניסו ל-`gematria_methods` או למנוע-השיטות.
- **ד. השיטות האזוטריות** (`fn_arcana`/`fn_tarot_sos`/`fn_destiny_matrix`/`fn_human_design_gate`/`fn_notarikon`/`fn_maftech_decompose`/`fn_transforms_tanach`/`fn_zero_navigation`/`fn_zero_scale`): **`UNKNOWN` — לא להכניס ולא למחוק.** סיווגן כ«method» נשאר פתוח.
- **ה. 8,917 convergences:** `FROZEN`. לא-למחוק · לא-לחבר-לעץ · לא-להשתמש-כמנוע-החדש.
- **ו. Metatron scan:** נשאר כבוי עד שקיים מנוע-גילויים חדש (ראה §8).

### 9.4 כריסטינה — שימור כפי-שהיא (`APPROVED`)
מנוע-כריסטינה הקיים + מסלול-המחקר הנפרד שלו **נשמרים כפי שהם**. **הארכיטקטורה החדשה אינה משנה אותו.** (עקבי עם `publicIdentity`: כריסטינה = מקור-חומר/מסלול-מחקר, לא נדרס.)

---

## 10. מנוע-הגילויים — חזון + עקרונות-ארכיטקטורה (VISION / PROPOSED, 11.8.2026)
> **החלטת צוריאל: לנעול כ-VISION/עיקרון-ארכיטקטוני, לא כמומש.** אף חלק מ§10 אינו `IMPLEMENTED`. אין ליצור טבלאות/מערכות חדשות רק כדי לתת שם לרעיון. המטרה: **שהארכיטקטורה שנחבר עכשיו לא תחסום את החזון.**

### 10.0 חוק-היסוד — Fact-first (`APPROVED` + `CANONICAL`; הרחבת `ai_analyze_contract`+`gematria_engine_law`+Rank-don't-hide)
- **`Discovery ≠ Interpretation` · Fact-first · Interpretation-tagged · Traceable Tree.** רצף: `חישוב → מקור → קשר → Discovery → Evidence → Interpretation`. **לעולם לא הופכים פרשנות לחישוב/עובדה.**
- **המנוע מתקן את המשתמש — לא מתאים את המציאות להשערה.** אם ערך אינו מאמת → אומרים זאת.
- **מבחני-אמת מאומתי-מנוע (החישוב, לא הפרשנות):**
  - `FACT`: אינטרנט · קדמי(משולש) = **1331** · משיח · קדמי(משולש) = **1331** → הצלבה מאומתת (ברגיל שונים: 329/358). הפרשנות «רמז לקשר משיח↔רשת» = **`INTERPRETATION`/hypothesis**, שכבה נפרדת.
  - `FACT`: בינה מלאכותית · רגיל = **974** (מוצלב עם «מי נבחר למשיחו האחרון»/«זכות ישראל»). ⚠️ **`דורות`=616 · `בריאת העולם`=764 — אינם 974**; הצמד «דורות/בריאת→974» **נדחה ע"י המנוע** (דוגמה חיה לחוק-היסוד).
  - `FACT`: רשת האינטרנט · רגיל = **1234** (מסתתר=676) — נשמר/מוצג רק כי החישוב מאומת; המערכת **לא** אומרת «1234 מוכיח X».
- **פורמט-הצגה קנוני לכל ממצא:** `FACT`(חישוב) · `CROSS`(מה באותו ערך/שיטה) · `SOURCE`(מאיפה) · `DISCOVERY`(הקשר) · `INTERPRETATION`(קריאה מוצעת, מתויגת) · `STATUS`(רמת-אימות). = Rank, Don't Hide.

### 10.1 החזון הרחב (`VISION`/`PROPOSED`) — «Global Research Intake → Fact-first Discovery → Traceable Knowledge Tree»
10 עקרונות (כולם `PROPOSED`, למעט 1-2-8-9 שהם הרחבת-קנון-קיים):
1. **Fact-first** (§10.0, `CANONICAL`).
2. **Interpretation-tagged** (§10.0, `CANONICAL`).
3. **Full provenance** — seed/source/method/value/cross/creator/timestamp/rank/evidence/parent (מבנה `research_objects` כבר תומך). `PROPOSED` (שימוש).
4. **One knowledge tree** — **גוף-ידע אחד** (`nodes`+`edges`), לא עצים-נפרדים (OCR/Language/Gematria/Discovery/Journey = **שכבות/סוגי-צמתים באותו עץ**). הרחבת `unified_graph_law`. `PROPOSED`.
5. **Cross-language by design** — שפה **אינה** יוצרת Number-Entity חדש; אותו `value` = אותו צומת. `shared_value ≠ translation ≠ transliteration` (שדות נפרדים ב-`language_links`). גבריאל/`xlang_calibration`/`englishGematria`/`getGraphBridges` נכנסים למסלול. `PROPOSED` (מנועים `EXISTING`).
6. **OCR / user-submitted intake** — OCR = **שער-כניסה** למנוע, לא «עוד כלי». זרימה: `Input → OCR → Language Detection → Source Extraction → Methods → Values → Cross → Discovery → Evidence → Human Gate → Tree → Canonical`. (`wa-ocr`/`gallery-ocr` `EXISTING`; חיבורם-כשער = `PROPOSED`.)
7. **Signals from user demand** — דיווחים/בקשות/גיאוגרפיה = **Research Signal**. `Signal ≠ Discovery ≠ Canonical`; דיווח נכנס כ-`CANDIDATE`/`UNKNOWN` עם provenance, מתקדם רק אחרי בדיקה. (`edge_geo_log`/`translit_suggestions`/`research_intelligence` `EXISTING`; surface-מאוחד `PROPOSED`.)
8. **Human Gate before Canonical** — הרחבת §9 + `method_lifecycle`. `CANONICAL`.
9. **PAST → PRESENT → FUTURE navigation** — כניסה ממושג-מודרני («רשת האינטרנט») **או** מהעבר; העץ **תמיד יורד עד העובדות והמקורות**. `PROPOSED`.
10. **Journey & 3D = renderings** מעל **אותו עץ** — 3D הוא **Renderer של הידע, לא בסיס-נתונים חדש**. `FUTURE IDEA`.

### 10.2 עקרון-אי-חסימה (המחייב עכשיו)
- **KEEP EVERYTHING → REORGANIZE → SIMPLIFY → ADD.**
- כל מבנה שנחבר בשלב-הקרוב (למשל חיווט Discovery→`research_objects`) חייב להישאר **גנרי** (provenance מלא · `parent_id`/`kind` · `meta` jsonb לתיוג-שכבה) כדי שהחזון (one-tree · PAST→FUTURE · 3D-renderer · cross-language · intake) **לא ייחסם**.
- **המערכת לומדת מהעולם — אך אינה הופכת את מה שהעולם שלח לאמת אוטומטית.**

### 10.3 «זרם המציאות» — ציר-מקור/קורפוס עתידי של מנוע-הגילויים (`VISION`/`PROPOSED`, 11.8.2026)
> **החלטת צוריאל: להוסיף למפת One-Knowledge-Tree כ-ציר-מקור עתידי — לא כ-UI נפרד, לא כעץ-חדש. אין לשנות/לסנכרן עכשיו · אין schema.**
- **מה הוא (`EXISTING`):** `reality_stream_law` (חוק נעול) · ראוט `/archive` · `gallery_images source='update'` (**23** שורות, `primary_value` 21, `occurred_at` 22) · רכיבים `RealityWorld`/`RealityStream`/`RealityPulse` · חישוב `src/lib/reality.js`. הקורפוס הרחב: `gallery_images`(2,533) → **2,020 תמונות כבר `nodes type=image` עם 2,020 קשתות למספרים** (כלומר הציר **כבר מחובר-חלקית** לגרף).
- **התפקיד בחזון (`PROPOSED`):** «זרם המציאות» = **SOURCE / CORPUS / SEED** — ציר-הקשר (תמונות/אירועים/היסטוריה/תאריכים/מספרים/גימטריות/פסוקים/אוצרות שהצטברו) ש**מזין** את מנוע-הגילויים. **לא** מקור-אמת-לפרשנות, **לא** עץ-נפרד.
- **השרשרת העתידית (`PROPOSED`):**
  `זרם המציאות → אוצרות/תמונות/אירועים → OCR/חילוץ → Language → Source → Methods → Values → Cross → Convergence → Discovery Candidate → research_objects → Human Gate → Knowledge Graph → [דף-המספר · זרם-המציאות · מעבדת-המחקר · מספרים-קשורים · מסעות · מקורות · שפות · (עתיד) 3D]`.
- **⚠️ כלל-ברזל (`CANONICAL`, הרחבת §10.0):** **התוכן מזין, לא קובע.** תמונה/אירוע/פרשנות שצוריאל מעלה = `FACT`/`SOURCE`/`OBSERVATION`/`SIGNAL`/`SEED` — אך **רק החישוב והראיות קובעים את ה-Discovery**. פרשנות-בזרם **אינה** הופכת אוטומטית לעובדה.
- **עקרון-שימור (`CANONICAL`):** האוצרות שנבנו לאורך השנים **לא נבנים מחדש** — המנוע **לומד לקרוא ולחבר** אותם לעץ; **לא** מעתיקים אותם למקום-אחר.

#### 10.3.1 שני ממדים של הזרם + Temporal Discovery + `HOT ≠ TRUE` (`VISION`/`PROPOSED`, 11.8.2026)
- **הזרם בשני תפקידים נפרדים (`PROPOSED` הגדרה):**
  1. **ARCHIVE / CORPUS** — כל מה שכבר נאסף לאורך השנים: תמונות · היסטוריה · אירועים · גימטריות · מספרים · תאריכים · ממצאים. (`EXISTING`: `gallery_images` — `hugeit_migration`/`manual`/`update`.)
  2. **REALITY SIGNAL** — מה **מתעורר עכשיו** לאורך הזמן: מספרים/מילים/אירועים חדשים · הופעות-חוזרות · הצטברויות · שינויי-תדירות. (`EXISTING`-חלקי: `RealityPulse`/`computePulse` = ספירה-לפי-חלון על `primary_value`, ציר `occurred_at`, כולל מגמה שבוע-מול-קודם · `fn_warm_number`/`hot_numbers_live`/`fn_hot_context` · `demand_signal` edges · `research_intelligence`.)
- **Temporal Discovery (`PROPOSED`, עתידי) — שאלות שהמנוע יוכל לשאול:** מה חדש? · מה הופיע לראשונה? · מה התחיל להופיע שוב? · מה עלה בתדירות? · איזה מספר מצטבר סביב אירוע/נושא? · איזה מספר מופיע גם בזרם וגם באוצרות? · איזה מספר-חדש יוצר Cross/Convergence?
- **⚠️ `HOT ≠ TRUE` (`CANONICAL`, הרחבת §10.0):** «חם» = **Signal של פעילות/התעוררות במציאות בלבד** — **לא** אמת ולא Discovery. מספר **אינו** הופך ל-Discovery רק כי הוא חדש/חם. המסלול המחייב:
  `REALITY → SIGNAL → NUMBER/TERM/EVENT → GEMATRIA+METHODS → CROSS → CONVERGENCE → DISCOVERY CANDIDATE → EVIDENCE → HUMAN GATE → CANONICAL`.
- **הזמן כהקשר-מחקרי (`PROPOSED`):** לשמר את הזמן (`occurred_at`) כחלק מה-provenance, כדי לאפשר בעתיד «מה התעורר במציאות בתקופה האחרונה?» ולא רק «מה קיים במאגר?». (ב-`research_objects` — דרך `created_at`/`meta`, בלי עמודה חדשה.)
- **השתלבות-עתידית עם:** `gallery_images` · `RealityWorld`/`RealityStream`/`RealityPulse` · `occurred_at` · `primary_value` · `source='update'` · מספרים-חדשים · היסטוריית-הופעות · `research_intelligence` · `demand_signals` · Discovery-Engine — **הכל תואם §10** (הזרם=מקור-לחומר-ול-Signals · המנוע=מחשב-ומצליב · Human-Gate=קובע-קנוני).
- **⛔ עכשיו:** לא ליצור מנוע-HOT חדש · לא טבלה חדשה · לא לשנות את זרם-המציאות. **רק הגדרה-ארכיטקטונית** של הזרם כחלק מ-One-Knowledge-Tree בשני-הממדים.
- **גבול עכשיו:** ⛔ לא לשנות זרם-המציאות · לא schema · לא סנכרון · **H-1 נשאר בדיוק כפי-שאושר** (`collectionConvergences → research_objects(candidate) → Human Gate → Graph`). «זרם המציאות» (ARCHIVE + REALITY SIGNAL) = **מקורות עתידיים** שיזינו את אותה שרשרת — `FUTURE`.

### 10.4 אזור-הממצאים בדף-המספר = View קנוני קיים (`CANONICAL` — לא-לעצב-מחדש, 11.8.2026)
> **החלטת צוריאל (מתוך צילום `/number/199`): אזור-הממצאים אהוב ונשאר כפי-שהוא.** מקור: `EntityPage` findings/convergence view (מד-ההתכנסות · התכנסות-מילים/ישויות · רב-שיטתי · אשכול-אותו-עולם · קשרי-גרף · כרטיס-התכנסות · צירופי-שיטות · צירופי-מילים · «199=צְדָקָה»).
- **`CANONICAL EXISTING` — נעול:** ⛔ לא לשנות עיצוב/היררכיה · ⛔ **לא להפוך לאקורדיון** כדי «לסדר את הדף» · ⛔ לא למחוק שיטות/התכנסויות/צירופי-מילים/קשרים/נתונים שמוצגים בו.
- **תיקון/צמצום ל-Blueprint §A (בצ׳אט):** הצעת ה-Accordion/reorg חלה **רק** על (א) המעטפת והסדר **בין** אזורים, ו-(ב) קיבוץ «מספרים קשורים» (6 מקורות) — **לא** על אזור-הממצאים/ההתכנסות הזה. הסידור נעשה **סביב** האזור, לא על-חשבונו.
- **`Rank, Don't Hide` בפועל:** האזור כבר מדגים זאת — הרבה מידע בלי לשטח לממצא-אחד; החזק-ביותר ראשון, השאר זמין. **לא לשטח, לא להסתיר.**
- **View מרכזי של מנוע-הגילויים:** האזור = אחד ה-Views המרכזיים של Discovery-Engine העתידי, בשני הכיוונים:
  `Reality Stream → אוצרות/תמונות/אירועים → OCR/טקסט/מספרים → 23 שיטות → ממצאים → הצלבות/התכנסויות → Discovery → Human Gate → Knowledge Graph → דף-המספר → האזור הזה`
  והכיוון-ההפוך: `משתמש רואה ממצא → לוחץ מספר/מילה/קשר → דף-המספר → ממשיך לחקור → נוצר מסע → (עתיד) 3D`.
- **חוק-על:** ממצאי-Discovery **חדשים** (כשהמנוע יזין את הדף) נכנסים ל**אותו עולם-תצוגה** — **לא** UI מקביל של «עוד מערכת». `KEEP EVERYTHING → REORGANIZE → SIMPLIFY → ADD` — הסידור **מסביב**, לא על-חשבון-האזור.

### 10.5 POST CORPUS + ONE DISCOVERY ENGINE — מקורות-קלט מרובים, מנוע אחד (11.8.2026)
> **החלטת צוריאל: «זרם המציאות» אינו המקור היחיד. כל קורפוס-קיים = SOURCE/CORPUS/SEED לאותו מנוע-גילויים ולאותו עץ.**
- **ONE DISCOVERY ENGINE, מקורות-Input מרובים (`CANONICAL` עיקרון):** `זרם-המציאות` · `פוסטים` · `דיווחי-משתמשים` · `גלריות` · `OCR` — **כולם מזינים מנוע-אחד**, לא מנוע-לכל-מקור:
  ```
       Reality Stream   Posts   User Reports   Galleries   OCR
              └──────────────┴──────┴──────────┴──────┘
                             ↓
        INPUT → OCR/TEXT → LANGUAGE → SOURCE → PHRASE/WORD → METHODS → VALUES
              → CROSS → CONVERGENCE → DISCOVERY → EVIDENCE → HUMAN GATE
              → KNOWLEDGE GRAPH → CANONICAL      (אותו lifecycle לכולם)
  ```
  ⛔ **אין** «Post Discovery Engine»/«Gallery Discovery Engine»/«User-Report Discovery Engine» נפרדים.
- **POST CORPUS (`VISION`/`PROPOSED`):** פוסט = **מקור-מחקר אפשרי**, גם אם לא הוזן ל«זרם המציאות». `POST → extract → calculate → cross → convergence → candidate discovery`. **הפוסט נשאר במקורו** (לא מועתק לזרם), עם provenance ברור.
- **⚠️ `POST CONTENT ≠ TRUTH` (`CANONICAL`, הרחבת §10.0):** גימטריה שהכותב כתב («X=974») = **טענה/קלט לבדיקה, לא אמת**. המנוע: מזהה X → **מחשב בעצמו** → בודק שיטות/הצלבות → שומר הפוסט כ-provenance → **מבחין בין מה-שאומת-במנוע לבין מה-שהכותב-טען** → רק אם נמצא Discovery → `research_objects(candidate)`. **Human Gate = השער היחיד לקנוני.** (מקביל ל-`SIGNAL ≠ DISCOVERY ≠ CANONICAL` ול-re-verify של H-1.)
- **פוסטים = אוצר-היסטורי (`CANONICAL` שימור):** לא «תוכן-אתר» בלבד — אוצר-מחקרי שהצטבר לאורך השנים. **לא בונים מחדש, לא מוחקים** — המנוע לומד לקרוא/לחשב/להצליב/לחבר לעץ.
- **הבחנת-מקורות (לא לאחד):** `זרם-המציאות`=ציר מה-שמתעורר-לאורך-זמן · `פוסטים`=קורפוס-תוכן/מחקר היסטורי+שוטף · `גלריות`=קורפוס-חזותי · `דיווחי-משתמשים`=UGC · `OCR`=שער-חילוץ · `Discovery-Engine`=המצליב · `Knowledge-Graph`=היעד. **מזינים אותו מנוע, לא הופכים לאותו-דבר.**
- **HOT ממקור-פוסטים (`PROPOSED`):** מספר שמופיע בפוסטים-חדשים/חוזרים → `HOT/SIGNAL/DEMAND`. **`HOT ≠ TRUE`** (§10.3.1) — חם ≠ Discovery ≠ Canonical.
- **זמן-כחלק-מהמודל (`PROPOSED`):** `posts.date`/`modified` (100% מלא) = temporal-provenance → «מה הופיע/מתי/איפה/מה-לפני-מה/מה-התעורר-לאחרונה» → ציר `PAST→PRESENT→FUTURE`, **בלי להפוך פרשנות-עתידית לעובדה.**
- **אימות-חי (`EXISTING`):** `posts`(1,235, date/modified 100%, source wordpress/ai) · 304 post-nodes · `posts_by_number_tag`/`posts_harvested_for_number`/`cross_source_posts`/`fn_raziel_extract_subject`/`fn_split_gematria` · OCR (`wa-ocr`/`gallery-ocr`) · `research-extract` cron שעתי · מנוע-גימטריה (קריא). **`MISSING`:** 0 קשתות `post→number` (קישור דרך tags) · pipeline post→discovery לא-מחווט · re-verify-טענות לא-מוחל.
- **⛔ עכשיו — KEEP EVERYTHING:** לא לשנות פוסטים · לא להעביר פוסטים לזרם · לא Tree/Store/מנוע/מקור-אמת חדש · לא לשנות §10.0 · לא לעקוף Human-Gate · לא להפוך טענות-בפוסטים לעובדות. **רק תוספת-חזון:** כל קורפוס-קיים = Source/Corpus/Seed, והפלט עובר את אותו Fact-first lifecycle. `research_objects` + One-Knowledge-Tree הקיימים מספיקים — **אין מערכת חדשה.**

### 10.6 DISCOVERY ENGINE כ-LOGICAL LAYER אחד (`APPROVED` + `CANONICAL`, 11.8.2026)
> **החלטת צוריאל: Discovery Engine = LAYER לוגי אחד בלבד.** ⛔ אין ליצור Engine פיזי חדש · Store חדש · Tree חדש · טבלת-Discovery חדשה.
- **הנוסחה:** `ONE DISCOVERY ENGINE + MULTIPLE EXISTING CORPORA + ONE KNOWLEDGE GRAPH/TREE`.
- **הצינור הלוגי:** `INPUT SOURCES → EXTRACTION → NORMALIZATION → GEMATRIA/METHODS → VALUES → CROSS → CONVERGENCE → RANK → DISCOVERY → research_objects → HUMAN GATE → KNOWLEDGE GRAPH → VIEWS`.
- **נקודת-הכתיבה המשותפת:** **`fn_persist_discovery`** — RPC **generic**, אינו תלוי ב-`EntityPage`/Reality-Stream/Gallery/Post. כל מקור עתידי מזין את **אותו** lifecycle ו**אותה** נקודת-כתיבה; `source`/`source_ref`/provenance מזהים מאיפה הגיע הממצא.
- **מקורות (`source=`):** `reality_stream` · `post` · `gallery` · `user_report` · `ocr` · `tanach` · `els` · `language` · `news` · `raw` · `channel` · וכל מקור-עתידי-מאושר. כל מקור = **adapter/feeder דק** ל-extraction/normalization; ⛔ **אין** Discovery-Engine נפרד לכל מקור.
- **LIFECYCLE CANONICAL:** `SIGNAL ≠ DISCOVERY` · `DISCOVERY ≠ CANONICAL` · `HOT ≠ TRUE`. כל מקור עובר `Input → Calculation → Verification → Cross → Discovery → Evidence → Human Gate → Graph`. **אין מסלול-promotion נפרד לפי מקור.**
- **`research_objects` = memory/provenance layer** של Discovery. **Human Gate = השער היחיד ל-Canonical.** **Fact-first** נשאר חוק-היסוד (§10.0): `Discovery ≠ Interpretation · Fact-first · Interpretation-tagged · Traceable Tree`.
- **H-1 (`APPROVED spec`, טרם-בוצע) = רק הגשר-הראשון:** `collectionConvergences → fn_persist_discovery → research_objects(candidate) → Human Gate → Graph`. **H-1 אינו כולל feeders נוספים.**
- **ROADMAP (`ROADMAP` בלבד — אינו אישור-ביצוע; כל שלב דורש אישור+בדיקה נפרדים לפני WRITE):**
  - **H-1** — `collectionConvergences → research_objects` (Discovery persistence).
  - **H-2** — Reality-Stream / Gallery ingestion.
  - **H-3** — Post-Corpus ingestion.
  - **H-4** — Additional corpora (ELS/news/raw/verses/language).
  - **H-5** — Temporal / HOT intelligence (כפוף `HOT ≠ TRUE`).
- **למידה דו-כיוונית (`CANONICAL`):** המערכת לומדת מ-`USER DEMAND` **וגם** מ-`EXISTING CORPUS` — לא רק מגיבה למה-שמחפשים, אלא (בעתיד) **קוראת-מחדש את האוצר** ההיסטורי והחי. **היעד:** *כל מה שנבנה לאורך השנים → נקרא-מחדש-חישובית → נבדק-מחדש → מוצלב → נשמר-עם-provenance → Human-Gate → אותו Knowledge-Tree → נגיש דרך ה-Views הקיימים.*
- **⛔ עיקרון-שימור:** `KEEP EVERYTHING → REORGANIZE → SIMPLIFY → ADD`. אין למחוק/להחליף אוצר קיים כדי לבנות את Discovery-Engine.
- **⚠️ עיקרון-ארכיטקטוני בלבד:** §10.6 **אינו** מחייב שום שינוי בקוד/DB/RPC/UI. **לא משנה החלטות-קודמות · לא משנה את H-1 · לא מבצע H-1 · לא יוצר RPC/adapter בפועל.**

---

## §11. DISCOVERY CONTROL CENTER — «חדר המפקדה» (מפרט Product/UX קנוני)
> **נעל ע״י צוריאל 11.8.2026.** פקודת **Product/UX ל-View**, *לא* שינוי-מנוע. `status`: מפרט=`CANONICAL` · מימוש=`ROADMAP`/פאזות.
> **משפט-העל:** «המנוע מגלה ומארגן; **אני** חוקר, מפרש ובוחר.» ה-Control Center = **עמדת-המחקר-והבחירה של צוריאל**, לא מכונה שמחליטה מה לפרסם.

**11.0 עקרון-יסוד (חוק):** המנוע **לא מחליט משמעות**. הוא מציג **תבניות-גילוי אפשריות**, וצוריאל מחליט מה לחקור/לפרסם. ניסוח-הממשק תמיד «המנוע מצא את התבנית הבאה — רוצה לחקור?» ולעולם לא «המנוע גילה שהאירוע הוא…».

**11.1 המסך במבט-אחד עונה:** מה התעורר במציאות? · אילו מספרים הופיעו? · אילו תבניות המנוע מצא? · אילו מאומתות? · אילו רק Candidate/Interpretation? · מה אפשר לקחת למחקר/פרסום?

**11.2 ראש-המסך — REALITY / HOT:** מה שעלה במקורות (זרם-המציאות · פוסטים · גלריות · דיווחי-משתמשים · OCR · חדשות/מקורות-נוספים). לכל פריט: `תאריך → מקור → מספר/ים → מה-נמצא → כמה-חדש/חוזר → קישור-למקור`. **חוק:** `HOT ≠ TRUE` — «חם/חדש» = אות-עדיפות בלבד, לא אמת ולא דירוג-אמינות.

**11.3 מרכז-המסך — DISCOVERY PATTERNS (הלב):** לא «ממצא אחד» — **כמה תבניות אפשריות מאותו seed**. טיפוסים: **A** שרשרת-מספרית (74→דע→474→דעת→4740) · **B** Number↔Concept (74↔דע: כל המילים ב-74, מקורות, פוסטים, גלריות, הופעות-היסטוריות, מספרים-קשורים) · **C** Historical-recurrence («המספר מתעורר שוב?» — עכשיו/פוסטים/גלריות/אירועים-קודמים) · **D** Expansion (74→474→4740 עם החוליות והדרך) · **E** Cross-system (`number→phrase→method→cross→source`).

**11.4 כרטיס-החלטה לכל Pattern:** `שם-התבנית` · `הזרע (seed)` · `FACTS` (מה-המנוע-אימת) · `CROSSES` (הצלבות) · `SOURCES` (מאיפה כל נתון) · `TEMPORAL` (מתי-הופיע) · `INTERPRETATION` (אם קיימת — **בנפרד וברור שהיא פרשנות**) · `STATUS` ∈ {FACT · CROSS · DISCOVERY · CANDIDATE · HYPOTHESIS · UNKNOWN}. **לעולם לא לערבב בין הסטטוסים.**

**11.5 פעולות על כל Pattern (6):** 🔍 **חקור** (פותח עץ+מקורות) · 🌳 **פתח-בעץ** (מאיפה הגיע ולאן מתחבר) · ➕ **הוסף-למחקר** (Research Journey / Research Bus) · ✏️ **בחר-לפרסום** · 🚫 **דחה-כיוון** (**לא מוחק נתון** — רק «לא-מעניין-כרגע», הפיך) · 📌 **שמור**.

**11.6 RANK, DON'T HIDE (חוק):** מיון חוזק `1-Strong · 2-Interesting · 3-Possible · 4-Weak · 5-Unknown` — **אבל כולן נשארות נגישות**. אסור למחוק/להסתיר אפשרות רק כי חלשה.

**11.7 שני ציונים נפרדים (חוק):** `Evidence/Verification` **≠** `Interestingness/Discovery-Priority`. אפשרי Verified-גבוה+Interesting-נמוך, או Verified-חלקי+Interesting-גבוה. **מעניין ≠ נכון.** אסור לערבב.

**11.8 «Why this pattern?»:** תצוגה נפתחת `Seed ↓ Methods ↓ Values ↓ Crosses ↓ Sources ↓ Temporal ↓ Convergence ↓ Discovery` — לראות בדיוק איך המנוע הגיע להצעה.

**11.9 «NOT FOUND / REJECTED»:** להציג גם כישלונות («חיפשנו X בגלריות/ערוצים — לא נמצא»). לא להעלים — חלק מהמחקר.

**11.10 ONE KNOWLEDGE TREE (חוק):** כל Pattern מחובר לאותו Knowledge-Graph. **אין «Pattern-Database» נפרד.** ה-Control Center = **View על העץ, לא עץ חדש.** צינור: `מקור → Input → Extraction → Methods → Values → Cross → Convergence → Discovery → Evidence → Human-Gate → Knowledge-Graph → Patterns/Views`.

**11.11 SELECTED BY ME:** אחרי בחירת-Pattern — אזור «My Selected Discoveries»: `Pattern → Research-Journey → Evidence → Draft → Publication`. כך ה-Control Center = עמדת-המחקר-והבחירה, לא מכונת-פרסום.

**11.12 שימור אזור-הממצאים הקנוני:** `EntityPage`/אזור-הממצאים הנעולים (§10.4) **נשארים כפי שהם**. ה-Control Center **לא מחליף** אותם — שכבת-עבודה **מעל** המידע: `Reality → Discovery-Control-Center → Pattern → EntityPage/Research → Knowledge-Tree`.

**11.13 כלל-יסוד:** `KEEP EVERYTHING → REORGANIZE → SIMPLIFY → ADD`. לא-למחוק-מקורות · לא-מנוע-נפרד-לכל-מקור · לא-עץ-חדש · לא Candidate→Fact · לא Interpretation→Fact · לא-להסתיר-חלשים. **מטרת-המסך:** לתת כמה דרכים לקרוא את אותה מציאות — ואז לתת לצוריאל לבחור לאן ללכת.

### §11-B. הרחבה קנונית (11.8.2026) — המפקדה = שער-כניסה יחיד לכל SOD1820
> **תיקון-מהות של צוריאל:** המפקדה **אינה** Dashboard של Discovery Patterns בלבד — היא **השער המרכזי היחיד** שדרכו צוריאל רואה, מנהל ומנתב את **כל** חומר-המחקר שנכנס למערכת מכל מקום. «SOD1820 RESEARCH COMMAND CENTER».

**11.14 הגדרה-על:** המפקדה = המקום שבו **כל מה שנכנס ל-SOD1820 עובר דרך שער אחד**, ושם צוריאל **רואה · בודק · בוחר · חוקר · מאשר** מה הופך לממצא. ציר-העל: `מה-נכנס → מה-התגלה → מה-נבדק → מה-נדחה → מה-אושר → מה-נחקר → מה-מוכן-לפרסום → מה-פורסם`.

**11.15 כל-המקורות → מפקדה (16+):** הודעות · תגובות · קבוצות-WhatsApp · דיווחי-משתמשים · פוסטים · גלריות · זרם-המציאות · תמונות · OCR · שפות · המלצות · חיפושים · מקורות-חיצוניים · חדשות · פסוקים/מקורות · ELS · מספרים-חדשים · גילויי-מנוע-עצמאיים · **וכל מקור עתידי**. לא-משנה-מאיפה — נראה במפקדה.

**11.16 הצינור (INTAKE→DISCOVERY→JUDGE→PUBLISH):** `INPUT ↓ INTAKE ↓ EXTRACTION/OCR/LANGUAGE ↓ CALCULATION ↓ CROSS/CONVERGENCE ↓ PATTERN-DISCOVERY ↓ REVIEW/JUDGE ↓ APPROVED-DISCOVERY ↓ RESEARCH ↓ PUBLISH`. **לא כפייה-אוטומטית** — המפקדה מראה **באיזה שלב** כל דבר נמצא.

**11.17 🔴 INCOMING «מה נכנס עכשיו»:** אזור-על עם הדברים החדשים שהגיעו (וגם **חומר שטרם-נבדק**). לכל פריט: `SOURCE · TIME · LANGUAGE · RAW-CONTENT · EXTRACTED-NUMBERS · STATUS`.

**11.18 מחזור-החיים המלא (7 סטטוסים — כולם נראים):** `SIGNAL` (משהו הגיע) · `CANDIDATE` (נראה מעניין) · `DISCOVERY` (המנוע מצא קשר מאומת) · `PATTERN` (תבנית שמחברת כמה גילויים) · `REVIEW` (צוריאל/השופט בודקים) · `APPROVED` (עבר שער) · `PUBLISHED` (פורסם). לראות את **כל החיים** של הממצא.

**11.19 שער-אחד ≠ מקור-אמת-אחד:** המקורות נשארים **נפרדים**; המפקדה רק **מרכזת**. כל פריט שומר provenance מלא: `Source → Author/User → Date → Language → Original-Content → Extraction → Calculations → Evidence`.

**11.20 תפקידים (לא מתערבבים):** **המנוע** מחשב ומוצא · **רזיאל** מבין-קלט/מסביר/מקשר/מסייע · **השופט** בודק-לפי-חוקים · **צוריאל** חוקר+מאשר-סופי-לפרסום. **AI מציע ומסייע — לא מחליט מה אמת ומה מתפרסם.**

**11.21 AUTOMATIC DISCOVERY (עתיד):** המערכת יכולה לומר «מצאתי משהו בקורפוס» (למשל `Reality→74 → דע → 474 → דעת` + בדיקת מקורות/היסטוריה/פוסטים/גלריות/שפות/אירועים) ולהציג `🔎 NEW DISCOVERY PATTERN` — **בלי לפרסם לבד**. צוריאל מחליט.

**11.22 🔥 HOT NUMBERS «מספרים שהתעוררו»:** זיהוי-לאורך-זמן של מה-חדש-במציאות. ליד כל מספר: מתי-הופיע · איפה · כמה-מקורות · כמה-לאחרונה · האם-בעבר · גילויים-סביבו · שפות-קשורות · פוסטים/גלריות. **`HOT ≠ TRUE`** (פעיל/מתעורר, לא אמת).

**11.23 PATTERN LAB:** «אלה התבניות שמצאתי» (PATTERN 01… שרשרת/הופעות-היסטוריות/מקורות-שונים-אותו-ערך/שפות-shared-value). לכל תבנית: `FACTS · EVIDENCE · SOURCES · CROSSINGS · INTERPRETATION · STATUS`.

**11.24 החוקר בוחר (המערכת לא אומרת «זו המשמעות», אלא «מצאתי את האפשרויות»):** `🔍 INVESTIGATE · ⭐ SELECT · ❌ DISMISS-DIRECTION (לא-מחיקה — הנתונים נשארים) · 📤 PREPARE-FOR-PUBLICATION`.

**11.25 🟢 APPROVED DISCOVERIES (הכספת):** כל מה שעבר-שער. לכל אחד: `Discovery-ID · Source · Numbers · Evidence · Methods · Crossings · Research · Approval · Publication-status`. זו כספת-הצפנים/הממצאים המאושרים.

**11.26 🟡 PUBLICATION QUEUE:** אחרי אישור — לא-חייב-מיד-להתפרסם. `READY FOR PUBLICATION` → בחירת-יעד: פוסט · זרם-המציאות · גלריה · Newsletter · WhatsApp · Research · אתר · קורס-עתידי. **`DISCOVERY ≠ PUBLICATION`.**

**11.27 🔒 חוקים-שלא-לשבור:** מקורות-מרובים→**מנוע-גילויים-אחד** · **שער-אחד** (לא מערכות-אישור-נפרדות) · `Signal ≠ Discovery ≠ Canonical ≠ Publication` · `HOT ≠ TRUE` · `Fact ≠ Interpretation` · `Rank, Don't Hide` · **כל provenance נשמר** · **שום חומר-היסטורי לא-נמחק** · ידני-**או**-אוטומטי · AI-מציע-לא-מחליט · **Human-Gate נשאר השער הקנוני** · מאושרים חוזרים לאותו **Knowledge-Graph** ול-**Views הקיימים**.

**11.28 סדר-ביצוע (חוק):** **קודם למפות את ה-UI והזרימה מול התשתיות שכבר קיימות** ולשמר את כל הסטטוסים וההפרדות הקנוניות — **לא לבנות מערכת חדשה מאחור**. הבנייה בפאזות, כל פאזה על-אישור. המימוש = View מעל התשתית הקיימת (§11.12), לא engine/tree/DB חדש (§10.6).

### §11-C. חידוד קנוני (11.8.2026) — מערכת-אחת + טיפוסי-תבנית + אזורי-מסך
**11.29 רזיאל+מטטרון+שופט = חלקים ממערכת-אחת (לא מוצרים נפרדים):** **רזיאל** = שכבת-הבנה/סיוע-מחקר (עוזר להבין מה הגיע · מסדר · מסביר · מציע כיוונים · מזהה קשרים · מצביע על מידע-חסר · מחזיר-למקור · מציע-צעד-הבא — «אני רואה תבנית מעניינת», **לא** «זו אמת»). **מטטרון** = שכבת-מערכת/ידע/בקרה (מה זוהה · אילו נתונים/קשרים/תהליכים/Signals/תבניות קיימים · מה דורש-בדיקה · מה עבר-Gate · מה קנוני) — **לא מחליף את השופט האנושי**. **השופט** = שער-שיפוט-אחד לכל מקור. **צוריאל** = החוקר והמאשר-הסופי.

**11.30 טיפוסי-תבנית קנוניים (לכל מספר/ישות — «כמה כיוונים», לא תשובה-אחת):** (1) שרשרת (74→דע→474→דעת) · (2) הופעות-קודמות-במאגר · (3) קשר-בין-מספרים · (4) שפות (ערך-משותף) · (5) זרם-המציאות (אירוע→תאריך→מקור) · (6) פוסטים-היסטוריים · (7) Convergences · (8) אירועים-בזמן. כל תבנית: `FACTS·SOURCES·CALCULATION·METHOD·CROSS·#SOURCES·DATE·HISTORY·NOT-YET-VERIFIED·POSSIBLE-INTERPRETATION` → ואז צוריאל בוחר.

**11.31 8 אזורי-המסך («מה קורה עכשיו»):** `🔴 נכנס-עכשיו · 🔥 מתעורר-עכשיו (Signals, HOT≠TRUE) · 🧩 תבניות-שהתגלו · 🔎 דורש-חקירה (אין-די-ראיות) · ⚖️ ממתין-לשיפוט (candidates) · ✅ אושר (עבר-שער) · 📚 במחקר-שלי (בחירת-צוריאל) · 📝 מוכן-לפרסום`. פרסום ≠ אישור (`CANONICAL ≠ PUBLISHED`).

**11.32 גלובלי + שפה:** OCR→זיהוי-שפה→חילוץ→חישוב→הצלבות. **השפה אינה משנה את מקור-החישוב-העברי.** להבדיל: `ערך-משותף ≠ תרגום ≠ תעתיק` (language_links/xlang — §מערכות-שפה נפרדות).

**11.33 דליברבל לפני UI (חוק):** לפני כתיבת-קוד — **מפת-מסך מלאה בעברית** (ראש/צדדים/מרכז · כרטיסים · סטטוסים · איך-נראה Discovery/Pattern/Source/Evidence/Judge/Approved · «חקור»/«פרסם» · כניסת רזיאל/מטטרון/שופט · התכנסות-כל-המקורות-לשער-אחד · חזרה גילוי→דף-מספר→זרם→גרף-ידע). רק אחרי אישור-המפה — מתחילים UI.

---

## §12. COMMAND CENTER — מפת-התשתית (INFRASTRUCTURE MAP, READ-ONLY · 11.8.2026)
> **מסקנת-על:** רוב מחזור-החיים **כבר בנוי** — מפוזר בין ~10 טבלאות-סטטוס ו-~14 טאבי-אדמין. המפקדה = **View שמאחד** את הקיים תחת שער-אחד; **מרחיבים את `admin_command_center` הקיים, לא בונים aggregator מקביל.** ממלאים רק את הפערים האמיתיים.

**12.0 עיקרון-מימוש:** קיים כבר aggregator — RPC **`admin_command_center`** (helper `getCommandCenter()` · טאב `CommandCenterTab`=«🧠 מפקדה») שמאגד: המלצות · `ti_demand_signals`/`demand_gaps` · `convergences_new_7d` · `journey_seeds` · `work_log` · `zuriel_definitions` · `hints_pending` · counters + `NumberResearcher` (רזיאל). **מרחיבים אותו** + מטמיעים טאבים קיימים כ-**עדשות**, לא משכפלים.

**12.1 צינור (§11.16) ↔ עמוד-שדרה קיים:**
| שלב | תשתית חיה | מצב |
|---|---|---|
| INTAKE | טבלאות-מקור עם `status` (למטה §12.2) | ✅ מפוזר |
| EXTRACTION/OCR/LANGUAGE | `gallery-ocr`·`wa-ocr` · `word_review_queue`·`translit_suggestions`·`language_links` (`LanguageEngineTab`) | ✅ |
| CALCULATION | מנוע רשמי (`fn_ragil…` · `computeEntity` · `crossMethodPairs`) | ✅ |
| CROSS/CONVERGENCE | `collectionConvergences` · `convergences` (8917, קפוא) · `number_cross_resonance` | ✅ |
| PATTERN-DISCOVERY | `discovery_events` (739 `detected`) · `scan_discovery_events`/`discovery_events_pending` | 🟡 קיים, קבור ב-Language tab |
| REVIEW/JUDGE | **שני מסלולים** (§12.4): `admin_research_review` (DB, לא-מחווט) · `ConvergenceWizard`+`admin_convergence_candidates`/`admin_candidate_decide` (משוגר) + `FindingsTab`/`ScannerTab`/`ChiddushReviewTab`/`word_review_queue` | 🟡 מפוצל |
| APPROVED | `research_objects.status=canonical`→`promoted_node_id` → `nodes`+`edges` · `decision_ledger` | ✅ |
| RESEARCH | `research_items` (5214) · Research Bus · `EntityPage`/§10.4 | ✅ |
| PUBLISH | פוסטים · `social_post` (FB/IG) · `send-newsletter` · `channel_updates`/`BroadcastTab` · זרם | ✅ מפוזר |

**12.2 מקורות-קליטה (§11.15) ↔ מה קיים ↔ טאב-מאחד:**
| מקור | תשתית + טאב קיים | מצב |
|---|---|---|
| WhatsApp | edge `wa-webhook/poll/process/ocr/raziel/vip-backfill` · `wa_deep_queue`/`wa_vip_inbox`/`wa_bot_log` · טאב `walink` (קישור בלבד) | 🟡 backend חי, **אין תור-אדמין לקליטה הגולמית** |
| תגובות/תרומות | `research_contributions` (330) · `contributions.js` · `ContribModTab` | ✅ |
| דיווחי-רמזים | `community_hints` · `community.js` · `HintReportsTab` | ✅ |
| פוסטים | `posts` (1224) · `getPostsFromSupabase` · `TopicsTab` | 🟡 קליטת-טענת-גימטריה-של-כותב לא-בנויה |
| גלריות/OCR/תמונות | `gallery_images` (2525) · `gallery-ocr`/`wa-ocr` · `CurationTab`/`OcrTab`/`ClassifyTab` | ✅ |
| זרם-המציאות | `getRealityHints`·`computePulse` · `StreamAdminTab` | ✅ |
| שפות | `word_review_queue`/`translit_suggestions`/`language_links` · `LanguageEngineTab` | ✅ |
| המלצות | `admin_recommendation_review`·`admin_run_metatron_recommend` · `SystemSuggestionsTab` | ✅ |
| חיפושים (ביקוש) | `search_log` (48K) · `getHotNumbers` · `SearchesTab` | ✅ |
| חדשות/חיצוני | `news_gematria` (11, לא-מחווט) · אין edge-קליטת-חדשות | 🔴 חסר |
| פסוקים/תורה | `tanach_verses` (23K)·`torah_stream` (306K) — נתונים ללא טאב-אדמין | 🟡 נתונים, אין עדשה |
| ELS | `els_records` (77)·`els_finds` · `ElsModerationTab` | ✅ |
| גילויי-מנוע | `discovery_events` (739)·`convergences`·`research_objects` (82 `candidate`) | 🟡 אין טאב שמציג את הפיד |
| הגדרות-חוקר | `researcher_definitions` · `DefinitionsInbox` (בתוך `AnchorFamiliesTab`) | ✅ |
| מספרים-חמים | `hot_research_nodes` (סכמה עשירה, **0 שורות**)·`fn_promote_hot`·`getHotNumbers`·pulse | 🟡 סכמה-מוכנה, ריקה |

**12.3 הפערים האמיתיים למילוי (רק אלה):** (a) **אין תור-אדמין לקליטת WhatsApp** הגולמית/VIP. (b) **אין UI לפיד/שער של `research_objects`** — `admin_research_feed`/`admin_research_review` קיימים ב-DB אך **לא מחווטים לקליינט**; ה-converter `src/lib/discovery.js` (טיוטה) עוד לא בשימוש שום טאב. (c) קליטת-חדשות + טענת-גימטריה-מפוסט לא-בנויה. (d) פסוקים/תורה — נתונים בלי עדשת-אדמין. (e) `discovery_events` קבור ב-Language tab. (f) `hot_research_nodes` ריק (אין populate).

**12.4 שני שערי-שיפוט — לאחד, לא לשכפל:** (1) `admin_research_review(id,decision)` — DB-RPC שמקדם `research_objects`→`nodes+edges+status=canonical` (מה ש-H-1 מזין; **אין לו UI**). (2) `ConvergenceWizard`+`admin_convergence_candidates`/`admin_candidate_decide`+`decision_ledger` — שער-הקליינט **המשוגר** (JudgeQueue). **המפקדה = השער-האחד (§11.27) שמאחד את שניהם** — לא שער שלישי.

**12.5 סדר-בנייה מוצע (ROADMAP · `PROPOSED` · כל פאזה על-אישור-נפרד · §11.28):**
- **CC-1 (View קורא-בלבד):** טאב-אדמין «🎛️ חדר המפקדה» שמרחיב את payload `admin_command_center` ומרנדר: 🔴 INCOMING (מ-`research_objects` דרך `discovery.js` + `discovery_events` + counters קיימים) · 🔥 HOT (getHotNumbers+pulse) · Pattern-Lab (המועמדים) · Approved (canonical) — **בלי כתיבה, בלי engine, בלי DB חדש.** מטמיע טאבים קיימים כעדשות (deep-link), לא משכפל.
- **CC-2:** חיווט השער — `admin_research_feed`/`admin_research_review` לקליינט **מאוחד עם** `ConvergenceWizard` (§12.4), 4 הפעולות (§11.24) עם DISMISS הפיך.
- **CC-3:** Publication Queue (§11.26) מעל יעדי-הפרסום הקיימים · SELECTED-BY-ME (§11.11) מעל `research_items`.
- **CC-4+:** מילוי פערים (§12.3) — תור-WA · populate `hot_research_nodes` · חדשות/פסוקים · AUTOMATIC-DISCOVERY (§11.21) מ-`discovery_events`.

---

## נספח — פערים מסומנים (`MISSING FROM MASTER STATE`, לא-מוכנס-לקנון)
1. `gematria_methods` (23 שורות) — הרישום עצמו לא-הוכרז קודם ב-CLAUDE.md/EXPORT.
2. `method_lifecycle` — קדם ל«Candidate Registry» שהוצע בסשן; אין לבנות מקביל.
3. `raziel_companion_layer_law` · `never_silent_metatron_law` · `unified_ai_brain_law` · `research_engine_law` · `metatron_rollout_law` · `bot_experience_architecture_law` — נעולים, נתפסו קודם כ-PROPOSED/UNKNOWN.
4. משפחת `fn_arcana` / `fn_tarot_sos` / `fn_destiny_matrix` / `fn_human_design_gate` / `fn_anagrams_engine` / `fn_maftech_decompose`.
5. תיקון-נתון: `nodes` = 5,867 (לא ~9,200 כפי שנרשם ב-EXPORT).

---

## §CL. CHANGE LOG
> כל שינוי מהותי נרשם כאן: **מה · מתי · למה · מה-הוחלף · סטטוס**. לא מוחקים היסטוריה — החלטה חדשה מסמנת שהחליפה את הישנה; המאוחרת והברורה גוברת.

| # | תאריך | מה השתנה | למה | מה הוחלף | סטטוס |
|---|---|---|---|---|---|
| 1 | 10.8.2026 | יצירת `SOD1820_MASTER_STATE.md` (בסיס-עובד v2) מאומת מול DB חי | לקבע Single Source of Truth | — (מסמך חדש) | `APPROVED` |
| 2 | 10.8.2026 | הוספת §0 «MASTER STATE GOVERNANCE» (14 כללים) | לנעול את ה-Master State כמקור-אמת מחייב, לא רק תיעוד | — (תוספת; לא שינתה החלטה קיימת) | `APPROVED` + `CANONICAL` |
| 3 | 10.8.2026 | §8 «Metatron Convergence Scan — FROZEN»: השבתת `metatron-nightly`/`fn_metatron_scan` (cron job 27 → `active=false`, הפיך) + עקרון «איכות לפני כמות» + מסלול-מנוע-חדש (Design בלבד) | לעצור יצירת אלפי התכנסויות אוטומטיות-חלשות לפני תכנון המנוע החדש; למנוע חזרה-בטעות | מנגנון ה-convergence הישן (יצירה אוטומטית) — מוקפא, לא נמחק | `APPROVED` + `CANONICAL` (FREEZE=`IMPLEMENTED` ב-DB) |
| 4 | 10.8.2026 | §9 «מנוע-הגילויים החדש»: עקרון-הצינור (Engine→Store→Discovery→Gate/Rank→Promote→Display) · `group_size` אסור כמדד-חוזק · הנחיות-מעבדה א-ו (23 שיטות/4 reconstructed/3 חדשות COMPUTE-STORAGE-פנימי/אזוטרי UNKNOWN) · שימור-כריסטינה | לעגן את החלטות-ה-Audit לפני בניית המנוע; להבטיח COMPUTE≫DISPLAY | «כל-מה-שנמצא→מוצג» → צינור עם Human-Gate | `APPROVED` + `CANONICAL` (Design; טרם-נבנה) |
| 5 | 10.8.2026 | תיקון §9.3ג: הסרת «Definite Article / אדם→הָאָדָם» מרשימת-השיטות (2 candidate, לא 3) | צוריאל הבהיר: זו דוגמה-מחקרית חד-פעמית, לא Method/Candidate | «Definite-Article כ-candidate» → הוסר לגמרי | `APPROVED` (תיקון) |
| 6 | 10.8.2026 | בקשת-רישום ל-`gematria_methods` של 3 שיטות-המשולש (משולש מילה/הפוך/מדרגות) → **אימות מצא שהן כבר רשומות** (שורות 21–23, `in_engine=false`/`active=false`/ללא function/db_column). **0 שורות נוספו · 0 עודכנו** — המצב-הרצוי כבר מתקיים. לא בוצע INSERT (מנע כפילות) | לרשום את המתודות כ-Storage בלבד, ממתינות ל-lifecycle | — (אין שינוי; כבר קיים) | `EXISTING` (מאומת); כתיבה=no-op |
| 7 | 11.8.2026 | §10 «מנוע-הגילויים — חזון + עקרונות-ארכיטקטורה»: §10.0 חוק-היסוד Fact-first (Discovery≠Interpretation, המנוע-מתקן, פורמט FACT/CROSS/SOURCE/DISCOVERY/INTERPRETATION/STATUS) + מבחני-אמת מאומתי-מנוע (1331/974/1234; דורות≠974) · §10.1 חזון «Global Research Intake→Fact-first Discovery→Traceable Tree» (10 עקרונות: one-tree/cross-language/OCR-intake/signals/PAST→FUTURE/3D-renderer) · §10.2 אי-חסימה | לנעול את החזון כ-VISION לפני בנייה, כדי שהארכיטקטורה לא תחסום אותו | הרחבת §9 (הצינור) + `ai_analyze_contract`/`unified_graph_law` | §10.0/2/8/9 = `APPROVED`+`CANONICAL` · שאר §10.1 = `VISION`/`PROPOSED` · אפס `IMPLEMENTED` |
| 8 | 11.8.2026 | §10.3 «זרם המציאות» כציר-מקור/קורפוס עתידי (SOURCE/CORPUS/SEED) של מנוע-הגילויים · כלל-ברזל «התוכן מזין, לא קובע» · עקרון-שימור (לא בונים מחדש אוצרות) · אימות-חי: source='update' 23 · 2,020 image-nodes עם 2,020 קשתות-למספרים (מחובר-חלקית) | להוסיף את «זרם המציאות» למפת One-Knowledge-Tree כציר-מקור, לא כ-UI/עץ נפרד | «זרם המציאות = עוד UI/אוסף בצד» → ציר-מקור שמזין את המנוע | ציר-מקור = `VISION`/`PROPOSED` · כלל «תוכן-לא-קובע»+שימור = `CANONICAL` (הרחבת §10.0) · אפס-שינוי/schema/sync · H-1 ללא-שינוי |
| 9 | 11.8.2026 | §10.3.1 שני-ממדי-הזרם (ARCHIVE/CORPUS + REALITY-SIGNAL) · Temporal Discovery (מה-חדש/מה-מצטבר/מה-חוזר) · כלל `HOT ≠ TRUE` (חם=Signal-של-פעילות, לא-אמת/לא-Discovery) · הזמן-כהקשר-מחקרי (occurred_at) · השתלבות-עתידית עם RealityPulse/hot-fns/demand_signal/research_intelligence | להפריד תפקיד-ארכיון מתפקיד-אות-חי; לנעול ש«חם» אינו הופך למספר-אמת ללא המסלול המלא | «חם/חדש = discovery» → `HOT ≠ TRUE`, המסלול המלא חובה | שני-הממדים = `VISION`/`PROPOSED` · `HOT≠TRUE` = `CANONICAL` (הרחבת §10.0) · אפס מנוע-HOT/טבלה/שינוי-זרם · H-1 ללא-שינוי |
| 10 | 11.8.2026 | §10.4 אזור-הממצאים בדף-המספר (`EntityPage` מד-התכנסות/התכנסות-מילים/רב-שיטתי/אשכול/קשרי-גרף/צירופי-שיטות-ומילים) = View קנוני קיים — לא-לעצב-מחדש, לא-אקורדיון, לא-למחוק-נתונים. צמצום Blueprint §A: reorg=מעטפת+סדר-בין-אזורים+קיבוץ-«מספרים-קשורים» בלבד, לא אזור-הממצאים. ממצאי-Discovery עתידיים → אותו עולם-תצוגה, לא UI מקביל | צוריאל אוהב את האזור (צילום /number/199); לשמר אותו כ-View מרכזי של מנוע-הגילויים | «לפשט דף-מספר ע"י אקורדיון/עיצוב-מחדש של אזור-הממצאים» → הסידור מסביב, לא על-חשבונו | `CANONICAL` (שימור-View) · Rank-Don't-Hide · אפס-שינוי-קוד/UI |
| 11 | 11.8.2026 | §10.5 POST CORPUS + ONE DISCOVERY ENGINE: כל קורפוס (זרם/פוסטים/דיווחים/גלריות/OCR) = Source/Corpus/Seed → מנוע-אחד → עץ-אחד (אין מנוע-לכל-מקור) · כלל `POST CONTENT ≠ TRUTH` (טענת-כותב=קלט, המנוע מחשב+מאמת בעצמו) · פוסטים=אוצר-היסטורי (שימור) · HOT-ממקור-פוסטים כפוף ל-HOT≠TRUE · temporal-provenance (posts.date/modified) · אימות-חי (posts 1235/304-nodes/extract-fns/OCR/research-extract-cron; חסר: 0 post→number edges + pipeline לא-מחווט) | «זרם המציאות = המקור היחיד» → כל קורפוס-קיים מזין את אותו מנוע; המנוע לומד לקרוא את כל האתר | «פוסט=תוכן-להצגה בלבד» / «גימטריית-הכותב=אמת» → קורפוס-מחקר + טענה-לבדיקה | One-Engine + `POST CONTENT≠TRUTH` + שימור = `CANONICAL` (הרחבת §10.0) · POST-CORPUS-כמקור = `VISION`/`PROPOSED` · אפס engine/store/tree/שינוי · Human-Gate ללא-עקיפה |
| 12 | 11.8.2026 | §10.6 DISCOVERY ENGINE כ-LOGICAL LAYER אחד: מנוע-לוגי-אחד (לא engine/store/tree/table פיזי חדש) · נקודת-כתיבה-משותפת `fn_persist_discovery` (generic, source/source_ref) · מקורות reality_stream/post/gallery/user_report/ocr/tanach/els/language/news/raw/channel + adapters-דקים · lifecycle-אחד (SIGNAL≠DISCOVERY≠CANONICAL, HOT≠TRUE, Fact-first) · research_objects=memory · Human-Gate=שער-יחיד · H-1=גשר-ראשון-בלבד · ROADMAP H-1..H-5 (לא-אישור-ביצוע) · למידה דו-כיוונית (USER DEMAND + EXISTING CORPUS) | לקבע Discovery-Engine כ-layer לוגי עם נקודת-כתיבה-אחת לכל המקורות, בלי מנועים-נפרדים | «מנוע-לכל-מקור» / «H-1 תלוי-EntityPage» → layer-אחד generic | `APPROVED`+`CANONICAL` (עיקרון-ארכיטקטוני) · Roadmap = `PROPOSED`/`ROADMAP` (כל H-stage אישור-נפרד) · אפס code/DB/RPC/UI/שינוי-H-1 |
| 13 | 11.8.2026 | **H-1 מומש (WRITE ראשון בסשן, באישור-מפורש):** נוצר RPC `fn_persist_discovery` (SECURITY DEFINER · `kind='relation'`+`status='candidate'` קבועים · אימות-מנוע-חוזר לכל (ביטוי,שיטה) מול `fn_ragil/fn_miluy/fn_misratar/kadmi_calc/fn_gadol/fn_siduri/atbash_calc/fn_albam/fn_ribua` · dedup value+sorted-distinct-terms תחת `pg_advisory_xact_lock` · `revoke public`+`grant execute authenticated`). Call-site `persistDiscoveries()` ב-`deepAnalysis.js` (non-blocking, requestIdleCallback) + חיווט ב-3 משטחים (EntityPage.runCombo · ResearchCenter.runAnalyze · ActiveEntityPanel.DefaultTower) בלי שינוי-UI. E2E מלא (A valid→candidate · B dedup · C engine-fail · D insufficient · feed · promotion הפיך→node+edge ב-rollback). front-half בלבד | לחבר את ה-Discovery-Engine (front-half): התכנסות-אמיתית → מועמד ל-Human-Gate, בלי לקבע/לקדם | «התכנסויות מחושבות-ונשכחות (0-linked)» → נשמרות כמועמד ל-review | RPC+Call-site = `IMPLEMENTED` · Human-Gate ללא-עקיפה · H-2..H-5 טרם (אישור-נפרד) · 8,917 FROZEN + Metatron-off ללא-שינוי |
| 14 | 11.8.2026 | §11 «DISCOVERY CONTROL CENTER» — מפרט Product/UX (11.0-11.13): המנוע-מגלה/המשתמש-בוחר · Reality-HOT · Discovery-Patterns (A-E) · כרטיס-החלטה (FACTS/CROSSES/SOURCES/TEMPORAL/INTERPRETATION/STATUS) · 6 פעולות · Rank-Don't-Hide · שני-ציונים · Why-this-pattern · Not-Found · One-Tree · Selected-By-Me · שימור-§10.4 | לנעול את פקודת ה-Product/UX של חדר-הבקרה כקנון | «מנוע מחליט משמעות» → «מנוע מציג, צוריאל בוחר» | מפרט=`CANONICAL` · מימוש=`ROADMAP` · H-1 בלבד `IMPLEMENTED` (deploy נפרד ל-main) |
| 15 | 11.8.2026 | §11-B הרחבה (11.14-11.28): המפקדה = **שער-כניסה יחיד לכל SOD1820** (לא Dashboard) · צינור INTAKE→DISCOVERY→JUDGE→PUBLISH · 16 מקורות · 🔴 INCOMING · 7 סטטוסי-מחזור-חיים · provenance מלא · תפקידים (מנוע/רזיאל/שופט/צוריאל) · AUTOMATIC-DISCOVERY · HOT-NUMBERS · Pattern-Lab · Approved-Vault · Publication-Queue (DISCOVERY≠PUBLICATION) · 12 חוקים-שלא-לשבור · §11.28 «מפה-קודם-לא-בנה» | תיקון-מהות של צוריאל: המפקדה היא השער המרכזי לכל החומר הנכנס, לא רק תצוגת-תבניות | «Discovery-Patterns Dashboard» → «SOD1820 Research Command Center — שער-אחד» | `CANONICAL` (הגדרה) · מימוש=`ROADMAP` בפאזות · אפס-בנייה עד מיפוי+אישור |
| 16 | 11.8.2026 | §12 מפת-התשתית (READ-ONLY): צינור+16-מקורות ↔ תשתית-חיה (EXISTS/PARTIAL/MISSING) · `admin_command_center` = aggregator-קיים-להרחבה · שני-שערי-שיפוט לאיחוד (§12.4) · 6 פערים-אמיתיים (§12.3) · ROADMAP CC-1..CC-4 · טיוטת `src/lib/discovery.js` (converter טהור, לא-מחווט) | «קודם למפות מול הקיים» (§11.28) — לגלות שרוב מחזור-החיים כבר בנוי ומפוזר | «לבנות מערכת חדשה» → «View שמאחד ~10 טבלאות + ~14 טאבים קיימים» | מפה=`READ-ONLY` מאומתת-DB · CC-1..CC-4=`PROPOSED`/`ROADMAP` · `discovery.js`=טיוטה לא-מחווטת · אפס engine/DB-write/UI-חי |
| 17 | 11.8.2026 | §11-C חידוד + `command_center_law` ל-CLAUDE.md: רזיאל/מטטרון/שופט/צוריאל = **מערכת-אחת** (11.29) · 8 טיפוסי-תבנית קנוניים (11.30) · 8 אזורי-מסך (11.31) · גלובלי+שפה (ערך≠תרגום≠תעתיק, 11.32) · דליברבל «מפת-מסך לפני UI» (11.33). הוראת-פרויקט חדשה `🎛️ command_center_law` ב-CLAUDE.md שמצביעה ל-§11/§11-B/§12 | צוריאל: ההגדרה חייבת להיות **בהוראות** כדי שסוכן לא יבין את המפקדה כ-Dashboard טכני | «חדר-מפקדה = טאב-אדמין» → «שער-אחד, מערכת-אחת, מנוע-מציג-צוריאל-בוחר» | `CANONICAL` (הוראה+חידוד) · אפס-קוד/DB/UI · מפת-מסך = הדליברבל הבא (טרם-בנייה) |

---
*בסיס-עובד v2. נשמר בענף `claude/raziel-capabilities-audit-h5k9ww`. שינויי-DB בסשן: (1) הקפאת cron job 27 (`metatron-nightly`, הפיך); (2) **H-1** — RPC `fn_persist_discovery` + מועמד-בדיקה-אחד (878=משיח↔דבר-מתוך-דבר, status=`candidate`, ממתין ל-Human-Gate). מלבדם READ-ONLY. שום `INFERRED` אינו עובדה; שום שיטה לא-הופעלה; שום convergence היסטורי לא-חובר/קודם/נמחק; שום קנון לא-שונה (מלבד §0 governance + §8 FREEZE + §10 חזון + H-1 front-half).*
