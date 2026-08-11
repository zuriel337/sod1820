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

---
*בסיס-עובד v2. נשמר בענף `claude/raziel-capabilities-audit-h5k9ww`. השינוי-ב-DB היחיד בסשן: הקפאת cron job 27 (`metatron-nightly`, הפיך). מלבדו READ-ONLY. שום `INFERRED` אינו עובדה; שום שיטה לא-הופעלה; שום convergence לא-חובר/קודם/נמחק; שום קנון לא-שונה (מלבד §0 governance + §8 FREEZE).*
