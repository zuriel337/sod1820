# 🧭 SOD1820 — מפת־העל התפעולית (MASTER ROADMAP) · v4 DRAFT (לבדיקה בלבד)

> **⚠️ v4 DRAFT — לא קנוני.** טיוטת־תיעוד לבדיקת צוריאל. אינה ממוזגת ל־`main` ואינה הגרסה הקנונית עדיין. הקנוניזציה (merge ל־main) היא Human-Gate נפרד. **הגרסה הקנונית הנוכחית = v3 על main (`38a8f784`).**
>
> **מהות.** מקור־הניווט התפעולי היחיד של SOD1820. המנוע מגלה ומארגן · **המפה מנווטת** · מרכז־הניהול (עתידי) **מציג** (Lens מעל הקובץ הזה) · `work_log` שומר provenance · **צוריאל מחליט**. שום דבר אינו הופך לקנוני רק משום שסוכן ביצע אותו.
>
> **סדר־סמכות:** live DB + `main` + `SOD1820_MASTER_STATE.md` (מצב קנוני) > המפה הזאת (ניווט) > זיכרון. המפה **מפנה** אל המצב הקנוני; לעולם אינה אמת מקבילה ואינה בסיס־נתונים.

---

## 🇮🇱 חוק — עברית כברירת־מחדל (HEBREW-FIRST COMMAND CENTER)
מרכז־הניהול והמפה מוצגים **בעברית כברירת־מחדל**: כל התוויות, הסטטוסים, הניווט, ההסברים וההודעות למנהל/משתמש — בעברית. **מזהים טכניים נשארים באנגלית כ־provenance** (שם ענף Git · commit SHA · שמות פונקציות/טבלאות · שמות API · מזהים פנימיים), אך ההסבר למשתמש בעברית.

**מילון־סטטוס דו־לשוני (קנוני לכל תצוגה):**
| טכני | תצוגה בעברית |
|---|---|
| BUILDING | 🏗️ בבנייה |
| FUTURE | 🔮 בעתיד |
| PARKED | ⏸️ מושהה |
| BLOCKED | 🚧 חסום |
| LIVE | 🚀 פעיל |
| MERGED | 🔀 מוזג ל־main |
| DEPLOYED | 🌐 נפרס |
| VERIFIED | ✅ אומת |
| DONE | ✔️ הושלם (אחרי אימות) |
| ACTIVE_NOW | 🔵 עכשיו (מועמד עד אישור צוריאל) |
| PARALLEL_READY | 🟡 מוכן־במקביל |
| DESIGN | 📐 תכנון |
| SUPERSEDED | 🗄️ הוחלף (נשמר כ־provenance) |
| UNKNOWN | ❔ לא־ידוע (provenance חסר) |

---

## 🕒 טריות המפה (FRESHNESS)
- **LAST_RECONCILED:** `2026-08-20` (הסשן הזה; יושב מול `work_log` העדכני + `main` HEAD `38a8f784`).
- **SYNC STATUS:** 🟠 **`STALE`** *(תוקן בסשן זה, 20.8.2026 — אומת ישירות מול `git`)*: `origin/main` HEAD בפועל = **`548d4a4`** ("feat(admin): read-only Roadmap command-center tab (CC-1, admin-only)") — **לא** `38a8f784`. `38a8f784` הוא אב-קדמון (`ancestor`) של `548d4a4`, לא ה-HEAD הנוכחי — אומת: `git merge-base --is-ancestor 38a8f784 origin/main` → `true`. **לא תוקן שדה זה עצמו כאן מעבר לסימון-STALE + ציון-העובדה** (לפי כלל-הטריות למטה — מזהים+מסמנים, לא כותבים-קנון-חדש בלי שער נפרד לכל שאר-המפה שתלויה ב-`LAST_RECONCILED`/`38a8f784`). ר' "פערים שנמצאו" בדו"ח-הסגירה.
- **כלל הטריות:** אם קיימת **עבודה מאומתת חדשה יותר מ־LAST_RECONCILED** (רשומת `work_log`, commit ב־`main`, או migration חי) → המפה **`STALE` 🟠 מיושנת** ותסומן ככזו — לעולם לא `SYNCED` ללא בסיס. הזיהוי = השוואת `LAST_RECONCILED` ל־timestamp/commit החדש ביותר.
- **אין עדכון־אוטומטי־שקט:** בסוף סשן אסור לשכתב את המפה אוטומטית. יש **לזהות** drift, לסמן `STALE`, **ולהציע** את העדכון דרך חוקי ה־WRITE/Human-Gate — לעולם לא לכתוב קנון בלי שער.

---

## 👤 שחקנים / בעלות (ACTOR / OWNERSHIP)
- **צוריאל (ZURIEL)** — Human-Gate · החלטות קנוניות · אישור WRITE/merge/deploy · השחקן היחיד שהופך דבר לקנוני/פעיל/משוחרר.
- **קלוד (CLAUDE)** — בנאי · ביקורת־עומק · יישום (מבצע רק בתוך שער מפורש).
- **GPT** — מחקר · אסטרטגיה · אימות־צולב (שחקן מקביל; מציע, לעולם לא קנוני).
- תיאום בין־סוכני עובר **דרך `work_log` בלבד** (`inter_agent_coordination_law`).

---

## 🧩 מודל המצבים — חמישה צירים אורתוגונליים (לא לערבב)
הכלל החשוב ביותר למניעת בלבול: **PROJECT STATE ≠ BRANCH STATE ≠ RELEASE STATE ≠ VISIBILITY ≠ ACCESS.**

| ציר | השאלה | ערכים |
|---|---|---|
| **PROJECT STATE** (מצב העבודה) | היכן עומדת *העבודה*? | `DONE · ACTIVE_NOW · PARALLEL_READY · OPEN · BLOCKED · FROZEN · DESIGN · BUILDING · FUTURE · PARKED · SUPERSEDED · UNKNOWN` |
| **BRANCH STATE** (מצב הענף) | מה מצב הענף? | 🔨 בעבודה · 🟡 מוכן־למיזוג · 🔀 מוזג · 🗄️ נסגר/הוחלף |
| **RELEASE STATE** (מצב השחרור) | היכן בצינור־החיים? | Branch → Review → Main(MERGED) → Deploy(DEPLOYED) → Live → Verified |
| **VISIBILITY** (נראות) | האם המשתמש *רואה* שהפיצ'ר קיים? | `PUBLIC 🏗️` · `ADMIN_ONLY` · `HIDDEN` |
| **ACCESS** (גישה) | האם המשתמש יכול *להשתמש*? | `LOCKED` · `PREVIEW(admin) 👁️` · `ENABLED` |

**הגדרות PROJECT STATE (אוצר־המילים היחיד למצבי־עבודה):**
- `DONE` — הושלם **ואומת** (לעולם לא על סמך הצהרה). `LIVE` = DONE + RELEASE=Verified/Live.
- `ACTIVE_NOW` — העמדה הפעילה היחידה (**מועמד עד אישור צוריאל**).
- `PARALLEL_READY` — אפשר להתקדם עכשיו, מגודר, אך אינו העמדה הפעילה.
- `OPEN` — לא־פתור, דורש שער.
- `BLOCKED` 🚧 — **העבודה אינה יכולה להתחיל** כי תלות/שער לא־פתורים. *(שונה מ־ACCESS=LOCKED.)*
- `FROZEN` — מוקפא עד החלטה/שער **מסוים** (עצירה קצרת־טווח).
- `DESIGN` — מפרט/החלטה קיימים; לא נבנה.
- `BUILDING` 🏗️ — **קיים בקוד/ענף/preview, נבנה עכשיו; אינו DONE, אינו LIVE, אינו פתוח למשתמשים רגילים.** מצב רשמי, לא הערה.
- `FUTURE` 🔮 — **תוכנית ארוכת־טווח**, גלויה במפה, **לא פעילה/לא חסומה/לא בפיתוח עדיין**, נשמרת כדי שלא תיעלם.
- `PARKED` ⏸️ — **הושהתה בכוונה ונשמרת**, אין שער פעיל ממתין. *(שונה מ־`SUPERSEDED`: לא הוחלפה; עשויה לחזור.)*
- `SUPERSEDED` 🗄️ — הוחלף בהחלטה חדשה; נשמר כ־provenance היסטורי בלבד.
- `UNKNOWN` ❔ — provenance חסר; לעולם לא ממציאים.

**ערובות אי־סתירה (יאומתו ב־§FINAL VALIDATION):**
- `BUILDING` (עבודה) ≠ `BLOCKED` (עבודה חסומה) — בנייה פעילה אינה חסימה.
- `LOCKED` (גישה) ≠ `BLOCKED` (עבודה) — פיצ'ר בנוי־אך־נעול אינו עבודה־שלא־החלה.
- `FUTURE` (מתוכנן) ≠ `PARKED` (מושהה) — זה טרם התחיל; זה הושהה אחרי שהיה.
- `LIVE` ≠ `MERGED` — מיזוג ל־main אינו פריסה/הפעלה.
- `MERGED` ≠ `VERIFIED` — מוזג אינו אומת ב־production.
- `Admin Preview` 👁️ ≠ `Production` 🚀 — תצוגת־מנהל אינה הפעלה למשתמשים.
- `VISIBILITY` (רואים) ≠ `ACCESS` (יכולים להשתמש).
- `LIVE` נקבע **רק** מ־RELEASE=Live/Verified, לעולם לא מקיום ענף/commit/preview.

---

## ⚖️ חוקי־על (GOVERNING LAWS)

### 1. חוק BUILDING / נראות־פיצ'ר — `גלוי ≠ מופעל`
**מטרה:** כל פיצ'ר בבנייה **גלוי** במפה ובמרכז־הניהול, אך **אינו פעיל למשתמשים רגילים עד שצוריאל מאשר שהוא מוכן.**
- `BUILDING` הוא **PROJECT STATE רשמי**, לא הערה.
- פיצ'ר `BUILDING` עשוי להתקיים בקוד/ענף/preview, אך **אינו DONE, אינו LIVE, אינו פתוח למשתמשים רגילים**. `גלוי ≠ מופעל`.
- משתמש רגיל **רואה** `🏗️ בבנייה` אך **ללא גישה** לפונקציונליות הלא־גמורה.
- מנהל/צוריאל יכולים לראות/לבדוק `BUILDING` לפי הרשאה (ACCESS=`PREVIEW 👁️`). **Admin Preview ≠ Production.**
- **`BUILDING → LIVE` הוא Human-Gate של צוריאל.** לעולם לא להסיק `BUILDING`/`LIVE` אוטומטית מקיום ענף/commit/prototype.
- **רינדור באתר** כש־PROJECT=`BUILDING` ו־VISIBILITY=`PUBLIC`: **`🏗️ בבנייה — אנחנו עובדים על היכולת הזאת. היא עדיין אינה זמינה.`** לעולם לא להציג פיצ'ר לא־גמור כמוצר פעיל.
- **מודל 5־הצירים** (למעלה) — לעולם לא לערבב PROJECT/BRANCH/RELEASE/VISIBILITY/ACCESS.
- **הערת Control-Plane:** מנגנון Feature-Control העתידי הוא ה־control-plane של מרכז־הניהול, **לא** מקור־האמת של הפרויקט. המפה מתארת *מצב־עבודה*; המנגנון העתידי ינהל *התנהגות־מוצר*. **לא בונים אותו עכשיו** (ראה `WS-FEATURE-CONTROL`).

### 2. חוק פיוס־סשן (SESSION RECONCILIATION)
לאחר **כל שלב מהותי** (לא כל הודעה): **אמת → פייס → עדכן מפה → checkpoint.** לשאול: מה באמת השתנה · מה אומת · מה נכנס ל־DONE · מה נשאר OPEN · מה הפך BLOCKED · האם ACTIVE_NOW זז · האם נוצר Human-Gate · האם יש provenance/commit/migration · האם OPEN נסגר · מה ה־NEXT_ACTION המדויק. **לעולם לא DONE על כוונה. לעולם לא להמציא provenance.** בסוף סשן: **אין להניח שהמפה עודכנה** — לזהות `LAST_RECONCILED < עבודה מאומתת חדשה` → לסמן `STALE`, **ולהציע** עדכון דרך שער; אין כתיבה אוטומטית.

### 3. חוק אין־עבודה־נעלמת (NO-DISAPPEARING-WORK)
כל פריט יושב בדיוק ב־PROJECT STATE אחד. **`BUILDING`, `FUTURE`, `PARKED` לעולם לא נעלמים מהיקום.** עבודה שהסתיימה → **History/Completed** עם provenance. הוחלפה → `SUPERSEDED` + הפניה. הושהתה → `PARKED`. ענף שמוזג → נשמר בהיסטוריית branch/release. היסטוריה לא־ידועה → `UNKNOWN`, לעולם לא ממציאים. **שום עבודה אינה מוסתרת רק משום שאינה פעילה כעת.**

### 4. חוק לוגיקת־החלטה (DECISION LOGIC)
לסווג כל טענה: `FACT · INFERENCE · RECOMMENDATION · DECISION · OPEN QUESTION`. רק **DECISION שאושרה ע״י צוריאל** הופכת לקנון, וכל אחת עם provenance (מי/מתי/מה/מה הוחלף). ראה **יומן ההחלטות**.

### 5. חוק בטיחות־ACTIVE_NOW
בדיוק **אחד** `ACTIVE_NOW`. **`ACTIVE_NOW` הוא מועמד (המלצה) עד שצוריאל מאשר את הפעולה הבאה בפועל** — אסור שיהפוך להחלטה רק משום שקלוד הסיק אותו מסדר־תלויות. מידע לא־מספיק → `ACTIVE_NOW = UNKNOWN` ודרישת פיוס. אין לדלג ל־downstream מעניין בזמן שתלות בעדיפות גבוהה פתוחה.

---

## 🔀 צינור השחרור (RELEASE PIPELINE)
מרכז־הניהול העתידי יציג את שרשרת־החיים, **כל שלב ניתן־לזיהוי בנפרד**:

```
Branch(ענף) → Review(בדיקה) → Main(🔀 מוזג) → Deploy(🌐 נפרס) → Live(🚀 פעיל) → Verified(✅ אומת)
```
- אסור להציג עבודה כ־`LIVE` רק משום שהיא קיימת בענף.
- אסור להציג עבודה כ־`DONE` רק משום שיש commit. **`DONE` דורש אימות** לפי חוקי הפרויקט.
- **דוגמה חיה (ELS Step 3 client):** Branch ✅ · Review ✅ · Main ❌ · Deploy ❌ · Live ❌ · Verified ❌ → לכן אינו LIVE ואינו DONE.

---

## 🌌 היקום המלא (FULL UNIVERSE) — כלום לא מוסתר
- **🔵 עכשיו (NOW)** → `WS-ELS-IDENTITY` — Step 3 completion *(ACTIVE_NOW — מועמד, ממתין לאישור צוריאל)*.
- **🟡 הבא (NEXT)** → שחזור `fn_els_search` secdef · עדכון Master State §17/γ · מיזוג ELS Full-Search-Space · תכנון admin_research_review.
- **🔮 בעתיד (FUTURE)** → מרכז־הניהול + Feature-Control · Meta Growth OS · פלטפורמת־6־דרגות + Credits + Academy · UGC · רב־לשוניות · ELS שלב ב׳ *(ראה מרשם העתיד — מסומן INCOMPLETE)*.
- **⏸️ מושהה (PARKED)** → סליקה/מנויים (Hyp) *(ראה מרשם המושהים)*.
- **🗄️ הוחלף (SUPERSEDED, provenance)** → writer-os · ענף מחיקת־ELS (Option B) · §19-old.

---

## 🧭 ניווט מרכז־הניהול (בעברית — למימוש עתידי)
המפה העתידית תציג:
- **📍 איפה אני** — ה־workstream הפעיל (`ACTIVE_NOW`).
- **❓ למה זה הצעד הבא** — הסיבה התלויית־Roadmap.
- **⏭️ מה עושים עכשיו** — ה־NEXT_ACTION.
- **🚫 מה לא לבנות עדיין** — DO NOT BUILD YET.
- **🕐 מה השתנה מאז הסשן הקודם** — WHAT CHANGED.
- **📜 למה התקבלה ההחלטה** — Decision + provenance.

## 🔵 ACTIVE_NOW — **מועמד (ממתין לאישור צוריאל)**
> **עמדת־עבודה שאושרה ע״י צוריאל: `טרם אושרה` (המועמד להלן).**
>
> **📍 איפה אני (מועמד):** `WS-ELS-IDENTITY` — השלמת ELS Finding Identity Step 3 (deploy + אימות).
> **❓ למה זה הצעד הבא (הסקה, לא החלטה):** Steps 1–3 בנויים; ה־client של Step 3 (`7045f7b3`) הוא החלק היחיד בין Finding Identity לבין LIVE מקצה־לקצה; Step 4 ו־downstream `BLOCKED` עליו. *זו הסקת־תלויות של קלוד — היא הופכת לפעולה הפעילה רק באישורך.*
> **⏭️ מה עושים עכשיו (באישור):** merge `claude/els-step3-identity` (`7045f7b3`) → `main` → deploy → אימות ש־`start_index` נכתב בשמירות־תורה חדשות → שחרור Step 4 מ־BLOCKED.
> **🕐 מה השתנה מאז הסשן הקודם:** נטרול רגרסיית־הקורפוס ב־main (`f5834f44`); Step 3 DB חי (`20260820023525`) + client בנוי (`7045f7b3`); המפה נוצרה→main (`0d247a1d`) ושודרגה v2→v3→v4.

## 🟡 PARALLEL_READY (מגודר; אינו העמדה הפעילה)
- **`WS-ELS-REGRESSION-FN`** — שחזור `search_path=public` + `security definer` על `fn_els_search` החי.
- **`WS-MASTERSTATE` §17/γ** — הסרת הקפאת Finding-Identity + γ אל Master State.
- **`WS-ELS-FSS`** — הכרעת מיזוג/פריסה (Item 1 `fb9c23ea` מול els-work-area D4).
- **`WS-LEDGER-REVIEW`** — admin_research_review מ־DESIGN לתכנון.

## 🚫 DO NOT BUILD YET — מה שלא מתחילים עדיין
| מה | למה לא עכשיו | מה חוסם | מה פותח אותו |
|---|---|---|---|
| ELS Step 4 (dedup/UNIQUE) | זהות חייבת להיות חיה קודם | Step 3 לא נפרס/לא אומת | פריסת+אימות Step 3 |
| KU-3D / Navigator / ELS-Matrix (כמוצר) | תלוי בזהות חיה | Finding Identity לא LIVE מקצה־לקצה | Step 3 LIVE+Verified |
| מרכז־הניהול UI | המפה חייבת להיסגר קודם | v4 טרם קנוני | אישור v4 + canonicalize |
| מנגנון WS-FEATURE-CONTROL | תכנון בלבד | אין ארכיטקטורת Command Center | שער design נפרד → שער build |
| Person F-1b (בני־משפחה) | חוזה־זהות לא סגור | OD-F9a / OD-F9b / OD-F8 | הכרעת שלושת ה־OD |
| חיווט Raziel (`fn_raziel_turn`, `session_state`, L1–L14) | פתוח | אין שער בנייה | שער בנייה של צוריאל |
| השלמת זהות תנ״ך | `corpus_id` תנ״ך פתוח | אין corpus_id תנ״ך קנוני (§17) | הכרעת צוריאל (בלי המצאה) |

---

## 🗂️ מרשם ה־Workstreams
*(כל workstream: WHERE_WE_ARE / WHAT_IS_DONE / WHAT_IS_OPEN / WHAT_IS_BLOCKED / HUMAN_GATE / NEXT_ACTION / DEPENDENCIES / CANONICAL_HOME / PROVENANCE / LAST_VERIFIED / STATE)*

### WS-CC — ממשל המפה + מרכז־הניהול
- **WHERE_WE_ARE:** המפה ב־v4 draft; מרכז־הניהול UI לא התחיל.
- **WHAT_IS_DONE:** v1 (`b3a19102`→`0d247a1d` main) · v2 (`8a45ddb2`) · v3 (`6c16e9b3`→`38a8f784` main, קנוני) · v4 draft.
- **WHAT_IS_OPEN:** קנוניזציית v4; Lens של מרכז־הניהול.
- **WHAT_IS_BLOCKED:** מרכז־הניהול UI — עד שהמפה מאומתת+קנונית.
- **HUMAN_GATE:** צוריאל — אישור v4→קנוני; בהמשך שער בניית CC.
- **NEXT_ACTION:** בדיקת v4 → שער קנוניזציה → (בהמשך) CC-1 Lens קורא־בלבד.
- **DEPENDENCIES:** קורא את המפה בלבד; אין store חדש.
- **CANONICAL_HOME:** `SOD1820_MASTER_ROADMAP.md` (main).
- **PROVENANCE:** `b3a19102` · `0d247a1d` · `8a45ddb2` · `6c16e9b3` · `38a8f784` · v4 draft.
- **LAST_VERIFIED:** 2026-08-20.
- **STATE:** ממשל־מפה `DONE`-לגרסה · מרכז־הניהול `DESIGN`.

### WS-ELS-CORPUS — קורפוס ELS קנוני (§17)
- **WHERE_WE_ARE:** קורפוס־תורה קנוני וחי; זהות־תנ״ך לא מוגדרת.
- **WHAT_IS_DONE:** `torah_stream`=304,805 (Koren, `md5 0066c243…`); מקור `tk-letters.txt` (1,204,583 אותיות); `corpus_id 0b022e8eef6f9c16`; `fn_els_search` 0-based, `coverage 'partial'`.
- **WHAT_IS_OPEN:** `corpus_id` תנ״ך (`WS-TANAKH`).
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** אין (סגור).
- **NEXT_ACTION:** אין.
- **DEPENDENCIES:** מוגן ע״י `WS-ELS-REGRESSION`.
- **CANONICAL_HOME:** Master State §17 + live DB.
- **PROVENANCE:** §17 sync `ae8272c2`; corpus SWAP 18.8.
- **LAST_VERIFIED:** 2026-08-20.
- **STATE:** `DONE` / `LIVE` 🚀.

### WS-ELS-REGRESSION — נטרול רגרסיית־קורפוס
- **WHERE_WE_ARE:** נטרול in-place (Option A) חי ב־main.
- **WHAT_IS_DONE:** `main f5834f44` — הסרת `TRUNCATE+INSERT`, סנכרון `fn_els_search` בקובץ ל־0-based, כותר SUPERSEDED.
- **WHAT_IS_OPEN:** תכונות האובייקט החי (סעיף־משנה).
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** סגור (Option A אושר).
- **NEXT_ACTION:** לוודא שאף ענף לא משחזר את הקורפוס המזוהם.
- **DEPENDENCIES:** מגן על `WS-ELS-CORPUS`.
- **CANONICAL_HOME:** `supabase/migrations/20260726_…_els_real.sql` (main).
- **PROVENANCE:** `f5834f44` · מקור `f946ed51`.
- **LAST_VERIFIED:** 2026-08-20.
- **STATE:** `DONE` / `LIVE` 🚀.
  - **`WS-ELS-REGRESSION-FN`:** שחזור `search_path`+`security definer` על `fn_els_search` החי. **STATE:** `PARALLEL_READY`/`OPEN`. שער: צוריאל.

### WS-ELS-IDENTITY — ELS Finding Identity `{corpus_id, term_norm, dir, skip, start}` — **אינו FROZEN**
- **WHERE_WE_ARE:** Steps 1–3 הושלמו; client של Step 3 בנוי, לא נפרס; Step 4 חסום.
- **WHAT_IS_DONE:** Step 1 (LIVE) · Step 2 13-arg (LIVE) · R1 (start 0-based, `positions[0]===start`, מרחב־תורה תואם) · Step 3 DB helpers + INSERT-only + `save_els_matrix_anon` 11-arg (LIVE, `20260820023525`) · Step 3 client (`7045f7b3`). regression suite PASS.
- **WHAT_IS_OPEN:** פריסת ה־client; זהות־תנ״ך (`WS-TANAKH`).
- **WHAT_IS_BLOCKED:** **Step 4 (dedup/UNIQUE) = `BLOCKED` 🚧** עד פריסת+אימות Step 3.
- **HUMAN_GATE:** צוריאל — merge+deploy של Step 3; בהמשך שער Step 4.
- **NEXT_ACTION:** merge `claude/els-step3-identity` → main → deploy → אימות `start_index`.
- **DEPENDENCIES:** `WS-ELS-CORPUS` (LIVE); שלמות־תנ״ך על `WS-TANAKH`.
- **CANONICAL_HOME:** פונקציות live DB + Master State §17 (דורש עדכון).
- **PROVENANCE:** migrations step1/2/3 (`20260820023525`); client `7045f7b3`.
- **LAST_VERIFIED:** 2026-08-20 (חתימות + regression suite ב-rollback).
- **STATE:** `ACTIVE_NOW` *(מועמד)* 🔵; Steps 1–3 `DONE`/`LIVE`; Step 4 `BLOCKED`.
  - **`WS-TANAKH` — `corpus_id` תנ״ך:** זהות־תורה `0b022e8eef6f9c16`; זהות־תנ״ך = תנאי פתוח מפורש (§17). **בלי המצאה.** **STATE:** `OPEN`.

### WS-ELS-FSS — ELS Full Search Space / כיוון־הפוך
- **WHERE_WE_ARE:** הכיוון הוכרע; ממתין לשער מיזוג/פריסה.
- **WHAT_IS_DONE:** ניתוח מרחב־חיפוש READ-ONLY (els_records 1743/1743, 19.8); Item 1 write+verify; הכרעה: els-work-area **D4** מועדף על ELS-2 **Item 1**.
- **WHAT_IS_OPEN:** איזה ארטיפקט מתמזג; מיזוג/פריסה.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** צוריאל — הכרעת מיזוג/פריסה.
- **NEXT_ACTION:** צוריאל בוחר D4/Item 1 → שער מיזוג.
- **DEPENDENCIES:** חולק קורפוס+זהות עם `WS-ELS-IDENTITY`.
- **CANONICAL_HOME:** ארטיפקטי ענף (`claude/els-work-area`, ELS-2).
- **PROVENANCE:** Item 1 `fb9c23ea`; work_log 19.8.
- **LAST_VERIFIED:** 2026-08-19 (לא אומת מחדש בסשן זה).
- **STATE:** `PARALLEL_READY`/`OPEN`.

### WS-GAMMA — γ שתי־שכבות (Atlas / Ledger) + SOD1820 Universal Research Contract v1.0
- **WHERE_WE_ARE:** החלטה מאושרת+מתועדת+**כעת גם כתובה ב-Master State**; אפס שינוי DB. הורחב בסשן זה (20.8) לכלול את ה-Universal Research Contract v1.0 המלא (18 סעיפים) שאושר ע״י צוריאל וממסגר את γ כחלק ממנו (סעיפים 7-8).
- **WHAT_IS_DONE:** `docs/decisions/2026-08-20-gamma-two-layer-atlas-ledger.md` (`7985e0ce`, ענף `claude/raziel-capabilities-audit-h5k9ww`) · **§19-A/§19-B נכתבו ל-`SOD1820_MASTER_STATE.md`** (סשן זה, ענף `claude/els-function-inventory-86klre`, Change Log #29) — Atlas=`relation_evidence` · Ledger=`research_objects` · מנועים שומרים store · קישור `source_ref` · `nodes`/`edges` קנוני · + חוזה-העל המלא (Entry Context/Focused-before-Expansion/Method-Preserving/Calculation/Value-Scan/Zero-Nav/Finding/One-Tree/Fact-separation/Contextual-Intelligence/External-Research/Raziel/Human-Gate/Privacy/Premium-as-gate/Future-proof/Canonical-Architecture-Principle/Test-Case).
- **WHAT_IS_OPEN:** מיזוג `claude/raziel-capabilities-audit-h5k9ww`→`main` (כדי ש-`docs/decisions/...` עצמו יהיה על main — כרגע רק Master State's §19 מכיל את התוכן, לא הקובץ המקורי); יישום-בפועל של עקרונות-החוזה בממשק (Entry Context/Focused-before-Expansion UX) — **טרם-אושר לבנייה, מפרט-בלבד**.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** צוריאל — אישור-בנייה נפרד לכל יישום-UX של החוזה (§19-B סעיף 17).
- **NEXT_ACTION:** אין בנייה כעת. אם/כשצוריאל יאשר יישום — מפת-מסך קודם (per `research_workspace_law`/`command_center_law` deliverable-before-UI).
- **DEPENDENCIES:** מזין את `WS-LEDGER-REVIEW`, `WS-MASTERSTATE`, `WS-URC` (חדש, למטה).
- **CANONICAL_HOME:** `SOD1820_MASTER_STATE.md` §19-A/§19-B (main, אחרי מיזוג-ענף זה) + רשומת־החלטה `7985e0ce`.
- **PROVENANCE:** `7985e0ce` · work_log (20.8.2026, "UNIVERSAL RESEARCH CONTRACT v1.0 — SSOT update") · Master State Change Log #29.
- **LAST_VERIFIED:** 2026-08-20.
- **STATE:** `DONE` (החלטה) · §19→γ Master rewrite **`DONE`** (סעיף זה סגר את שער-פתוח #6-חלק-γ) · §19-old `SUPERSEDED` 🗄️ · יישום-UX `FUTURE`/`DESIGN`.

### WS-SEC — הקשחת אבטחה (RLS / privacy)
- **WHERE_WE_ARE:** דליפות קונקרטיות נסגרו ב-live DB (19.8).
- **WHAT_IS_DONE:** `engraved_facts` P1 (#8) · `metatron_context` P2/P3/P4 (#9) · `numbers_worked`/`metatron_context` P2 identity-scoping (#10B) · `metatron_plan` REVOKE-from-public · `number_dossier_json` privacy guard (LATENT-A). כל WRITE אומת.
- **WHAT_IS_OPEN:** אימות אנומרציה ב-Master State §18.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** סגור פר־פריט.
- **NEXT_ACTION:** אנומרציה ב-§18 ב-Master WRITE הבא.
- **DEPENDENCIES:** `research_objects` (Ledger), metatron.
- **CANONICAL_HOME:** מדיניות live DB + Master State §18.
- **PROVENANCE:** work_log 19.8.
- **LAST_VERIFIED:** 2026-08-19 (לא אומת מחדש בסשן זה).
- **STATE:** `DONE`/`LIVE` (פר־פריט).

### WS-LEDGER-REVIEW — admin_research_review / תכנון Ledger
- **WHERE_WE_ARE:** smoke-test READ-ONLY עבר; תכנון לא התחיל.
- **WHAT_IS_DONE:** `admin_research_review` על `research_objects` (fact+relation), rollback מלא, PASS (19.8).
- **WHAT_IS_OPEN:** provenance על `node.metadata`; כתיבות `decision_ledger`; מסלולים מרובי-איברים דרך `relates`/`engine_detail`.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** צוריאל — אישור מעבר לתכנון.
- **NEXT_ACTION:** שער → תכנון provenance/decision_ledger (בלי קוד).
- **DEPENDENCIES:** `WS-GAMMA`.
- **CANONICAL_HOME:** `research_objects`/`relation_evidence` + רשומת־החלטה עתידית.
- **PROVENANCE:** work_log 19.8 smoke-test.
- **LAST_VERIFIED:** 2026-08-19 (לא אומת מחדש).
- **STATE:** `DESIGN`/`OPEN`.

### WS-RAZIEL — תשתית Raziel + L1–L14
- **WHERE_WE_ARE:** תשתית DB פרוסה אך לא־מחווטת; חוזה read-model מתוכנן.
- **WHAT_IS_DONE:** `fn_raziel_route`, `agent_identity`, `ti_demand_signals`, `fn_raziel_research_intel[_scoped]` live (migrations 20260809); R1, `resolve_person`/identity_edges (67,552), `fn_raziel_context`.
- **WHAT_IS_OPEN:** חיווט: `fn_raziel_turn` STUB; `session_state` חסר; הפעלת L1–L14.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** צוריאל — אישור בניית חיווט.
- **NEXT_ACTION:** בשער, תכנון החיווט.
- **DEPENDENCIES:** Ledger, metatron.
- **CANONICAL_HOME:** live DB + Master State (§ Raziel).
- **PROVENANCE:** migrations 20260809; `writer-os`=SUPERSEDED; `raziel-upgrade` main-tracking `UNKNOWN`.
- **LAST_VERIFIED:** 2026-08 (תשתית קודם; לא הורץ מחדש).
- **STATE:** תשתית `LIVE`-לא־מחווטת · חיווט `OPEN` · L1–L14 `DESIGN` · repo-tracking `UNKNOWN` ❔.

### WS-MASTERSTATE — ממשל/סנכרון Master State
- **WHERE_WE_ARE:** P1 sync חי ב-main; §17 מיושן לגבי Finding Identity; **§19 A/B נכתב בסשן זה (ענף, טרם-main)**.
- **WHAT_IS_DONE:** `ae8272c2` — §15/§16/§17/§18 + Change Log #23–#28. §19 הוחרג ב-P1, **כעת נכתב** (Change Log #29, סשן 20.8 זה) — γ (§19-A) + Universal Research Contract v1.0 (§19-B).
- **WHAT_IS_OPEN:** §17 (`FROZEN → IN_PROGRESS`, Steps 1–3 LIVE, `f5834f44`); אנומרציית `WS-SEC`; ציון Roadmap `0d247a1d`/`38a8f784`; מיזוג §19-A/B מהענף ל-main; רשומת-הזהות-האחרת שגם-תויגה "§19" (Change Log #26, OD-F10a) **עדיין לא-נכתבה לגוף-המסמך** — פער-נפרד, לא-טופל בסבב זה.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** צוריאל — Master WRITE gate.
- **NEXT_ACTION:** בשער, עדכוני §17/security כירורגית; ואם-יאושר — כתיבת רשומת-הזהות (OD-F10a) שנותרה-בפער.
- **DEPENDENCIES:** `WS-GAMMA`, `WS-ELS-IDENTITY`, `WS-SEC`.
- **CANONICAL_HOME:** `SOD1820_MASTER_STATE.md` (main).
- **PROVENANCE:** `ae8272c2` · Change Log #29 (20.8, ענף `claude/els-function-inventory-86klre`).
- **LAST_VERIFIED:** 2026-08-20 (§17 עדיין FROZEN; §19 A/B נכתב היום).
- **STATE:** sync `DONE`/`LIVE` · §19 A/B `DONE`(ענף)/`OPEN`(מיזוג-למיין) · עדכון §17 `PARALLEL_READY`/`OPEN` · רשומת-זהות-OD-F10a `OPEN` (פער-ישן, לא-חדש).

### WS-PERSON — זהות־אדם (OD-F10a)
- **WHERE_WE_ARE:** חוזה מאושר (design); self-ledger חי; משפחה חסומה.
- **WHAT_IS_DONE:** חוזה `docs/planning/family_identity_contract.md`; **F-1a′** `fn_upsert_self_profile` LIVE.
- **WHAT_IS_OPEN:** F-1b (בני־משפחה + parent_of).
- **WHAT_IS_BLOCKED:** F-1b — OD-F9a / OD-F9b / OD-F8.
- **HUMAN_GATE:** צוריאל — OD-F9a/F9b/F8 לפני F-1b.
- **NEXT_ACTION:** אין עד ההכרעות.
- **DEPENDENCIES:** `nodes_public_read` (OD-F8), Ledger.
- **CANONICAL_HOME:** חוזה + `research_objects` (self rows).
- **PROVENANCE:** F-1a′ live; רשומת־חוזה.
- **LAST_VERIFIED:** 2026-08 (F-1a′ קודם).
- **STATE:** חוזה `APPROVED`/`DESIGN` · F-1a′ `DONE`/`LIVE` · F-1b `BLOCKED`.

### WS-KU3D — GPT Knowledge Universe 3D preview
- **WHERE_WE_ARE:** preview חזותי בבניית GPT על ענף; לא נפרס.
- **WHAT_IS_DONE:** 3D Knowledge Universe visual preview (actor=GPT), ענף/preview בלבד.
- **WHAT_IS_OPEN:** היקף; מקור־נתונים (חייב לקרוא את הגרף האחד, לא store מקביל); שער־שחרור.
- **WHAT_IS_BLOCKED:** הפעלה כמוצר — BUILDING/LOCKED: אסור LIVE; downstream חסום עד זהות LIVE.
- **HUMAN_GATE:** צוריאל — כל deploy / הפעלה למשתמשים.
- **NEXT_ACTION:** להשאיר כ-preview גלוי בבנייה; אימות־צולב מול `unified_graph_law`.
- **DEPENDENCIES:** `WS-ELS-IDENTITY`; הגרף האחד.
- **CANONICAL_HOME:** ענף/preview של GPT.
- **PROVENANCE:** work_log 19.8 "3D Knowledge Universe visual preview (actor=GPT)".
- **LAST_VERIFIED:** 2026-08-19 (דווח ע״י GPT; לא אומת ע״י CLAUDE).
- **STATE:** PROJECT=`BUILDING` 🏗️ · VISIBILITY(מתוכנן)=`PUBLIC` · ACCESS=`PREVIEW(admin)` 👁️ · RELEASE=`UNRELEASED`.

### WS-FEATURE-CONTROL — מרכז־ניהול נראות־פיצ'רים (control plane)
- **WHERE_WE_ARE:** החוק מתוכנן (מסמך זה); מנגנון לא נבנה.
- **WHAT_IS_DONE:** חוק BUILDING/נראות + מודל 5־הצירים מוגדרים במפה.
- **WHAT_IS_OPEN:** ה-control-plane עצמו — אזור עתידי שבו צוריאל קובע פר־פיצ'ר: Project State (`LIVE/BUILDING/LOCKED/FUTURE/PARKED/HIDDEN`), האם מוצג במפה, האם משתמש רגיל רואה, האם יכול להשתמש, האם admin רואה preview.
- **WHAT_IS_BLOCKED:** בנייה — עד ש-v4 קנוני **וגם** קיימת ארכיטקטורת Command Center; רצף: v4 → שער → קנוניזציה, ואז **בנפרד** תכנון Feature-Control → תוכנית schema/impl → שער → build.
- **HUMAN_GATE:** צוריאל — שער תכנון, ואז שער בנייה (שני שערים נפרדים).
- **NEXT_ACTION:** אין כעת — **לא בונים את המנגנון**; המפה תגיד בדיוק היכן הוא נכנס.
- **DEPENDENCIES:** Roadmap v4 (קנוני) + ארכיטקטורת Command Center.
- **CANONICAL_HOME:** Command Center / ממשל־המפה.
- **PROVENANCE:** v4 draft (טקסט־החוק סופק ע״י צוריאל, 2026-08-20). אין מימוש.
- **LAST_VERIFIED:** 2026-08-20 (החוק תועד; אין קוד).
- **STATE:** `FUTURE` 🔮 (מימוש) · `DESIGN` 📐 (חוק/מפרט). **אין ליצור טבלת DB או feature-flag infrastructure בשלב הזה.**

### WS-URC — SOD1820 Universal Research Contract v1.0 (עקרון-על, `NEW` 20.8.2026)
- **WHERE_WE_ARE:** החוזה **מאושר לתיעוד** (`APPROVED FOR SSOT DOCUMENTATION`, Scope: `DOCUMENTATION / ROADMAP ONLY`); נכתב ל-Master State §19-B. יישום-UX **לא-התחיל, לא-אושר**.
- **WHAT_IS_DONE:** 18-סעיפי-החוזה (Entry Context·Focused-before-Expansion·Method-Preserving Discovery·Calculation·Value Scan·Zero Navigation·Research Finding·One Knowledge Tree·Fact-separation·Contextual Intelligence·External Research·Raziel·Human-Gate·Privacy·Premium-as-gate·Future-proof·Canonical Architecture Principle·Test-Case) נכתבים verbatim ל-Master State §19-B, מאומתים מול תשתית-חיה (§19-B "תשתית-תומכת"), אפס-סתירה נמצאה מול חוקים-קיימים.
- **WHAT_IS_OPEN:** יישום-UX בפועל (Entry-Context-aware navigation · Focused-result-first UI · Method-tag תמידי על ערך מוצג) בכל משטח (ELS/Number/Gematria/Cross/Beit-Midrash/Command-Center) — **טרם-אושר, טרם-תוכנן ברמת-מסך**.
- **WHAT_IS_BLOCKED:** יישום-UX — עד מפת-מסך מאושרת פר-משטח (per `research_workspace_law`/`command_center_law`/§11.33 "דליברבל לפני UI").
- **HUMAN_GATE:** צוריאל — שער-תכנון פר-משטח, ואז שער-בנייה (כמו `WS-FEATURE-CONTROL`, שני-שערים-נפרדים).
- **NEXT_ACTION:** אין בנייה כעת. אם/כשצוריאל יבקש יישום — להתחיל ממשטח-בודד (למשל ELS/tzofen "Focused Before Expansion", הכי-קרוב-להשלמה כי `§CC-2` GAP-1/GAP-1A כבר-בנוי-על-branch) ולהציג מפת-מסך לפני קוד.
- **DEPENDENCIES:** `WS-GAMMA` (§19-A מספק את שכבת ה-Finding/Atlas/Ledger שהחוזה בסעיף 7 מסתמך-עליה) · `WS-CC` (Command-Center הוא אחד המשטחים שהחוזה חל-עליו) · `WS-MASTERSTATE`.
- **CANONICAL_HOME:** `SOD1820_MASTER_STATE.md` §19-B.
- **PROVENANCE:** הועבר בצ'אט כ-`actor=ZURIEL`/`HUMAN-GATE DECISION`, 20.8.2026 · Master State Change Log #29 · work_log (20.8.2026).
- **LAST_VERIFIED:** 2026-08-20.
- **STATE:** חוזה `APPROVED`(תיעוד) · יישום-UX `FUTURE`🔮/`DESIGN`📐 — **אין ליצור UI/קוד/מנוע בשלב הזה.**

---

## 🔮 מרשם העתיד (FUTURE REGISTRY) — **INCOMPLETE** (רק provenance קיים; בלי המצאה)
> מסומן `INCOMPLETE`: תוכניות עתידיות הקיימות ב-provenance (`CLAUDE.md`) או שסופקו ע״י צוריאל. **אינו ממצה**; מוסיפים לפי צוריאל. שום שם לא הומצא.

| תוכנית | מטרה | canonical home | dependencies | provenance | status |
|---|---|---|---|---|---|
| מרכז־הניהול + `WS-FEATURE-CONTROL` | ניהול Feature states/visibility/access/release ע״י צוריאל | Command Center / ממשל־המפה | Roadmap v4 + ארכיטקטורת CC | מפה + צוריאל (2026-08-20) | `FUTURE`/`DESIGN` |
| Meta Growth OS (24 שכבות; 5–9, 12–24 לא נעשו) | הפיכת האתר למערכת־הפעלה של משמעות | Master State + `CLAUDE.md` | Meta Graph API tokens (6–9) | `CLAUDE.md` טבלת Meta Growth OS | `FUTURE` |
| פלטפורמת 6־דרגות + Sod Credits + Academy | דרגות־גישה + מטבע פנימי + קורסים | `platform_tiers_law` | `profiles`/RLS-per-tier | `CLAUDE.md` `platform_tiers_law` | `FUTURE` |
| UGC / `community_hints` / Collective Discovery / Research Score | שכבת תרומת־תוכן קהילתית | `identity_architecture_law` | `community_hints` table + admin review | `CLAUDE.md` `identity_architecture_law` | `FUTURE`/`DESIGN` |
| רב־לשוניות (he·en·ar·es·fr·ru·pt·de) | האתר רב־לשוני | `content_translation_law` | `video-transcribe`/`video_translate` | `CLAUDE.md` `content_translation_law` (§15 APPROVED) | `FUTURE` |
| ELS `els_records` שלב ב׳ (מאגר־מחקר) | ELS כמאגר־מחקר | ELS map | Finding Identity LIVE | `CLAUDE.md` ELS map / `work_log` | `FUTURE` |

## ⏸️ מרשם המושהים (PARKED REGISTRY) — הושהה בכוונה, נשמר; ≠ SUPERSEDED
| פריט | למה מושהה (לא הוחלף) | provenance |
|---|---|---|
| סליקה / מנויים (Hyp Pay, HK) | הושהה בכוונה; מערכת ה**קרדיטים** פעילה כחלופה־ביניים; עשוי לחזור | `CLAUDE.md` §סליקה («מנויי-תשלום בהקפאה») |

## ✔️ הושלם / היסטוריה (HISTORY / COMPLETED) — נשמר עם provenance (NO-DISAPPEARING-WORK)
| עבודה | תוצאה | provenance |
|---|---|---|
| נטרול רגרסיית־קורפוס | 🔀 מוזג ל-main · 🌐 חי · ✅ אומת | `f5834f44` |
| ELS Finding Identity Step 3 (DB) | 🚀 חי · ✅ אומת (regression PASS) | migration `20260820023525` |
| γ שתי־שכבות (החלטה) | ✅ מתועד | `7985e0ce` |
| SOD1820 Universal Research Contract v1.0 → SSOT | ✅ נכתב ל-Master State §19-A/B (ענף; ממתין-למיזוג ל-main) | Change Log #29, work_log 20.8.2026 |
| Master Roadmap v1→v3 קנוני | 🔀 מוזג ל-main | `0d247a1d` (v1) · `38a8f784` (v3) |
| הקשחת אבטחה #8/#9/#10B/metatron/LATENT-A | 🚀 חי · ✅ אומת | work_log 19.8 |

---

## 🧾 יומן ההחלטות (DECISIONS LOG) — מאושר ע״י צוריאל, עם provenance
| החלטה | מי / מתי | מה | מחליף | provenance |
|---|---|---|---|---|
| קורפוס קנוני (§17) | צוריאל · 18–19.8 | תורה 304,805, `corpus_id 0b022e8eef6f9c16`, 0-based | קורפוס מזוהם 306,269 | Master State §17 (`ae8272c2`) |
| תיקון־רגרסיה = Option A | צוריאל · 2026-08-20 | נטרול in-place ב-main | ענף מחיקה (Option B) | `f5834f44` |
| γ שתי־שכבות | צוריאל · 2026-08-20 | שתי שכבות + קישור־מחרוזת | מודל §19-old | `7985e0ce` |
| ELS Finding Identity Steps 1–3 | צוריאל · 2026-08-20 | זהות server-derived, INSERT-only, legacy ללא־שינוי | הקפאת Finding-Identity | migrations step1/2/3 (`20260820023525`), client `7045f7b3` |
| Master Roadmap = מפת־העבודה | צוריאל · 2026-08-20 | מסמך ניווט קנוני (v1→v3) | — | `0d247a1d`, `38a8f784`, work_log `790b54c0`/`e6b0b302` |
| חוק BUILDING/נראות + פורמט v3/v4 | צוריאל · 2026-08-20 | החוק + מודל־מצבים + Hebrew-first + Branch Tracker + Release Pipeline | פורמט v2/v3 | v4 draft (מסמך זה) |
| SOD1820 Universal Research Contract v1.0 | צוריאל · 2026-08-20 | חוזה-על 18-סעיפים: Entry Context·Focused-before-Expansion·Method-Preserving Discovery·Calculation·Value Scan·Zero Navigation·Research Finding·One Knowledge Tree·Fact/Evidence/Discovery/Interpretation/Hypothesis-separation·Contextual Intelligence·External Research·Raziel-role·Human-Gate·Privacy·Premium-as-gate·Future-proof·Canonical Architecture Principle·Test-Case. **DOCUMENTATION/ROADMAP-ONLY** — אפס build/migration/schema/deploy | §19-old (שתי-שכבות-ממצא, לא-נכתב-מעולם) — ממסגר-ומרחיב את γ | Master State §19-A/§19-B (Change Log #29) · הועבר בצ'אט כ-`actor=ZURIEL`/`HUMAN-GATE DECISION` |

---

## 🌿 מעקב הענפים (BRANCH TRACKER) — Work State ≠ Branch State ≠ Release State
| ענף | actor | העבודה | Work State | Branch State | main | deploy | verified | provenance | next action |
|---|---|---|---|---|---|---|---|---|---|
| `main` | צוריאל | production | `LIVE` 🚀 | 🔀 מוזג | ✅ | 🌐 ✅ | ✅ | `ae8272c2`→`f5834f44`→`38a8f784` | — |
| `claude/els-step3-identity` | CLAUDE | ELS Step 3 client | `BUILDING` 🏗️ | 🟡 מוכן־למיזוג | ❌ | ❌ | ❌ | `7045f7b3` | merge→deploy→verify (ACTIVE_NOW) |
| `claude/roadmap-v4` | CLAUDE | Roadmap v4 draft | `DESIGN` 📐 | 🟡 מוכן־למיזוג | ❌ | — | — | (this) | אישור צוריאל → קנוניזציה |
| `claude/raziel-capabilities-audit-h5k9ww` | CLAUDE | audits + γ record + v2/v3 draft | `DONE`-חלקי | 🔨 בעבודה | ❌ | — | — | `7985e0ce`,`8a45ddb2`,`6c16e9b3` | — (dev) |
| `claude/els-work-area` / ELS-2 | CLAUDE/GPT | Full-Search-Space | `OPEN` | 🔨 בעבודה | ❌ | ❌ | ❌ | `fb9c23ea` | הכרעת D4/Item 1 |
| `claude/els2-b45k5h` | CLAUDE | מקור נטרול in-place | `SUPERSEDED` 🗄️ | 🗄️ נסגר | (מוזג דרך main) | — | — | `f946ed51` | — |
| `claude/els-unified-merge` | CLAUDE | נטרול מחיקה (Option B) | `SUPERSEDED` 🗄️ | 🗄️ נסגר | ❌ | — | — | `542c7147` | — |
| GPT 3D-preview | GPT | Knowledge Universe | `BUILDING` 🏗️ | 🔨 בעבודה | ❌ | ❌ | ❌ | work_log 19.8 | preview בלבד; אימות מול הגרף |

**כלל:** אין להסיק `LIVE` מקיום ענף; אין להסיק `DONE` מקיום commit — `DONE` דורש `✅ אומת`.

## 🚪 שערי־צוריאל פתוחים (OPEN HUMAN-GATES)
1. **Roadmap v4 → קנוני** (merge ל-main). *(עדיין פתוח; ר' גם FRESHNESS למעלה — `main` HEAD בפועל `548d4a4`, לא `38a8f784`.)*
2. **ELS Step 3 merge + deploy + אימות.**
3. **ELS Step 4** (`BLOCKED` עד #2).
4. **`corpus_id` תנ״ך** (בלי המצאה).
5. **`fn_els_search`** שחזור secdef/search_path.
6. ~~**§19→γ + הסרת הקפאת §17 + אנומרציית אבטחה** ב-Master State.~~ → **פוצל, 20.8.2026:** חלק-γ (§19→§19-A/B) **נסגר** (ר' `WS-GAMMA`/`WS-MASTERSTATE`) — **`DONE`(ענף)/ממתין-למיזוג**. הסרת-הקפאת-§17 + אנומרציית-אבטחה **נשארות פתוחות** כשער עצמאי (מספר #6 להלן, מוחלף).
6′. **הסרת הקפאת §17 (Finding-Identity FROZEN→IN_PROGRESS) + אנומרציית אבטחה** ב-Master State — *(ממשיך את #6 המקורי, אחרי פיצול)*.
7. **ELS Full-Search-Space** מיזוג (D4 מול Item 1).
8. **admin_research_review** → תכנון.
9. **מרכז־הניהול UI** (אחרי שהמפה קנונית).
10. **WS-FEATURE-CONTROL** שער תכנון, ואז שער בנייה.
11. **Person F-1b** (OD-F9a/F9b/F8).
12. **חיווט Raziel.**
13. **יישום-UX של SOD1820 Universal Research Contract v1.0** (Entry Context / Focused-before-Expansion / Method-Preserving Discovery בממשק בפועל) — `NEW, 20.8.2026`. החוזה עצמו **מאושר-לתיעוד** (§19-B); זהו שער-נפרד ל**בנייה**, טרם-נפתח.
14. **רשומת-זהות שנותרה-בפער (Change Log #26, OD-F10a)** — לא-נכתבה-מעולם לגוף Master State; אינה חלק מ-§19-B; שער נפרד אם/כשצוריאל ירצה לסגור אותה. `NEW, 20.8.2026` (זוהה, לא-נוצר).

## 🧬 עמוד־השדרה של התלויות (DEPENDENCY SPINE)
```
קורפוס (WS-ELS-CORPUS, LIVE) ── מוגן ע״י ── WS-ELS-REGRESSION (LIVE, f5834f44)
   ├── WS-TANAKH corpus_id ............................ OPEN
   └── WS-ELS-IDENTITY  «ACTIVE_NOW מועמד»
          Steps 1–3 DONE/LIVE (client BUILDING, פריסה ממתינה)
          Step 4 BLOCKED → KU-3D/Navigator/ELS-Matrix BLOCKED
WS-GAMMA (DONE) ── §19→γ rewrite OPEN ── WS-LEDGER-REVIEW (DESIGN)
WS-SEC (DONE/LIVE) ── §18 enumeration OPEN
WS-RAZIEL (LIVE-לא־מחווט) ── חיווט OPEN ── L1–L14 DESIGN
WS-PERSON: F-1a′ DONE/LIVE ── F-1b BLOCKED
WS-KU3D (BUILDING preview) ── הפעלה BLOCKED על זהות LIVE
WS-CC (מפה) ── Command Center UI DESIGN ── WS-FEATURE-CONTROL FUTURE/DESIGN
מרשם העתיד (INCOMPLETE) · מרשם המושהים · הושלם/היסטוריה · SUPERSEDED (provenance)
```

---

## 📌 נקודת־בקרה לסשן (SESSION HANDOFF — כל התשובות מהמפה בלבד)
```
LAST_RECONCILED: 2026-08-20   SYNC: SYNCED (נכון לפיוס)

איפה אנחנו:        ELS Finding Identity כמעט שלם; client של Step 3 בנוי, ממתין לפריסה.
מה הושלם:          f5834f44 (קורפוס) · Step3 DB 20260820023525 · Step3 client 7045f7b3 · γ 7985e0ce ·
                   roadmap→main 0d247a1d(v1)/38a8f784(v3) · v2 8a45ddb2 · הקשחת אבטחה 19.8.
מה בבנייה:          Step3 client (BUILDING) · GPT 3D preview (BUILDING).
מה מחכה:           fn_els_search secdef · Master State §17/γ · ELS Full-Search-Space · Ledger planning.
מה חסום:           Step 4 · KU-3D product · Person F-1b.
מה הצעד הבא:        merge claude/els-step3-identity (7045f7b3) → main → deploy → verify → שחרור Step4.
למה זה הצעד הבא:    הזהות חייבת LIVE מקצה־לקצה לפני Step 4/downstream (סדר־תלויות; מועמד עד אישור צוריאל).
מה אסור לבנות:      Step 4 · KU-3D product · Command Center UI · Feature-Control · F-1b · Raziel wiring · זהות־תנ״ך.
מה בעתיד:           Command Center+Feature-Control · Meta Growth OS · Platform tiers+Credits+Academy ·
                   UGC · רב־לשוניות · ELS שלב ב׳  (FUTURE REGISTRY = INCOMPLETE).
מה השתנה מאז העדכון האחרון: Finding Identity FROZEN→IN_PROGRESS (Steps 1–3 LIVE); Roadmap v3→v4
                   (Hebrew-first, Branch Tracker, Release Pipeline, Admin Preview, History/Completed).
אילו החלטות:        ראה יומן ההחלטות (קורפוס/OptionA/γ/Steps1-3/roadmap/feature-law).
provenance:        main 38a8f784 · Step3 client 7045f7b3 · γ 7985e0ce · Step3 DB 20260820023525.
ROADMAP:           קנוני על main = 38a8f784 (v3) · v4 DRAFT על claude/roadmap-v4 (לבדיקה, לא מוזג).
```

---

**עיקרון־על:** המנוע מגלה ומארגן · **המפה מנווטת** · מרכז־הניהול מציג · `work_log` שומר provenance · **צוריאל מחליט** · שום דבר אינו הופך לקנוני/פעיל/משוחרר רק משום שסוכן ביצע אותו.

_v4 DRAFT — לבדיקה בלבד. קנוניזציה (merge ל-main) ובניית מנגנון Feature-Control הם שערי־Human-Gate נפרדים. קודם סוגרים את המפה כמפת־על; אחר כך היא תגיד בדיוק היכן מנגנון ה-BUILDING נכנס. אחרי v4 — רעיונות חדשים נכנסים לפי חוקי ה-Roadmap, לא פותחים את המפה מחדש כל יומיים._
