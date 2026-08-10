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
  - 3 שיטות-Registry חסרות-פונקציה (`משולש מילה/הפוך/מדרגות`) **+** 3 ה-`CANDIDATE` (Ordered-Digit `1234` · Embedded-Core `1358→358`/`1676→676` · Definite-Article `אדם→הָאָדָם`).
  - `APPROVED`: **רצויות בתוך המנוע** כ-COMPUTE/STORAGE פנימי; בהמשך זמינות למנויים/מחקר; **לא בהכרח בדף-המספר.** מאפשר להחזיק שיטות-חדשות בפנים **בלי ללכלך את דף-המספרים.**
- **ד. השיטות האזוטריות** (`fn_arcana`/`fn_tarot_sos`/`fn_destiny_matrix`/`fn_human_design_gate`/`fn_notarikon`/`fn_maftech_decompose`/`fn_transforms_tanach`/`fn_zero_navigation`/`fn_zero_scale`): **`UNKNOWN` — לא להכניס ולא למחוק.** סיווגן כ«method» נשאר פתוח.
- **ה. 8,917 convergences:** `FROZEN`. לא-למחוק · לא-לחבר-לעץ · לא-להשתמש-כמנוע-החדש.
- **ו. Metatron scan:** נשאר כבוי עד שקיים מנוע-גילויים חדש (ראה §8).

### 9.4 כריסטינה — שימור כפי-שהיא (`APPROVED`)
מנוע-כריסטינה הקיים + מסלול-המחקר הנפרד שלו **נשמרים כפי שהם**. **הארכיטקטורה החדשה אינה משנה אותו.** (עקבי עם `publicIdentity`: כריסטינה = מקור-חומר/מסלול-מחקר, לא נדרס.)

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

---
*בסיס-עובד v2. נשמר בענף `claude/raziel-capabilities-audit-h5k9ww`. השינוי-ב-DB היחיד בסשן: הקפאת cron job 27 (`metatron-nightly`, הפיך). מלבדו READ-ONLY. שום `INFERRED` אינו עובדה; שום שיטה לא-הופעלה; שום convergence לא-חובר/קודם/נמחק; שום קנון לא-שונה (מלבד §0 governance + §8 FREEZE).*
