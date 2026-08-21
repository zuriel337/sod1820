# 🧭 SOD1820 — מפת־העל התפעולית (MASTER ROADMAP) · v5 DRAFT (מרוכז, ממתין לשער־קנוניזציה)

> **⚠️ v5 DRAFT — לא קנוני עדיין.** כתיבה מרוכזת אחת, לפי inter_agent_coordination_law, על-בסיס Absorption Matrix מאושר (21.8.2026) + Resolution מאומת ל-ELS FSS. **אינה ממוזגת ל-`main`.** קנוניזציה (merge) היא Human-Gate **נפרד**, בדיוק כמו v3→v4. **הגרסה הקנונית הנוכחית = v4 על `main` (`f375327f`).**
>
> **מהות.** מקור־הניווט התפעולי היחיד של SOD1820. המנוע מגלה ומארגן · **המפה מנווטת** · מרכז־הניהול (עתידי) **מציג** (Lens מעל הקובץ הזה) · `work_log` שומר provenance · **צוריאל מחליט**. שום דבר אינו הופך לקנוני רק משום שסוכן ביצע אותו.
>
> **סדר־סמכות:** live DB + `main` + `SOD1820_MASTER_STATE.md` (מצב קנוני) > המפה הזאת (ניווט) > זיכרון. המפה **מפנה** אל המצב הקנוני; לעולם אינה אמת מקבילה ואינה בסיס־נתונים.
>
> **v5 מוסיף על v4:** ספיגת עבודה-היסטורית (ELS/Premium-Research/Legacy-Systems) שנחקרה ב-4 סבבי-READ-ONLY (Architecture Reconstruction · Legacy Reconciliation · GPT-docs cross-check · Absorption Matrix) + פתרון Decision #1 (ELS Full-Search-Space) לפי provenance קיים. **כל תוכן v4 שלא צוין כאן במפורש כ-SUPERSEDED/DRIFT-CORRECTED נשאר בתוקף ללא-שינוי** (NO-DISAPPEARING-WORK).

---

## 🏷️ אוצר־תגיות v5 (משמש בכל טבלת-ספיגה למטה — משלים, לא מחליף, את מודל 5-הצירים)
> **שכבות-שימוש (תיקון-מבנה, לא-שינוי-עובדה):** תגיות-v5 (טור-שמאל) משמשות בתוך **כרטיסי-Workstream** (שדה `STATE`). הסקציות-העליוניות (`🔵 ACTIVE_NOW`, `🟡 PARALLEL_READY`) ממשיכות-להשתמש באוצר-המילים-המקורי (`ACTIVE_NOW`/`PARALLEL_READY`) כי אלה **ניווט-סשן**, לא סיווג-workstream. הטבלה הזו היא מפת-ההמרה הרשמית ביניהם — **אין שתי-מערכות סותרות, יש שתי-רמות (workstream-level / session-navigation-level).**

| תגית v5 | משמעות | מקביל במודל-הקיים |
|---|---|---|
| `LIVE` | חי בקוד/UI בפרודקשן, נצפה-בפועל | PROJECT=`DONE`, RELEASE=Live |
| `DB-LIVE` | חי ב-DB (טבלה/RPC נקראת-בפועל), לאו-דווקא עם UI | PROJECT=`DONE`/`EXISTING`, ACCESS משתנה |
| `BUILDING` 🏗️ | קיים בקוד/ענף, לא-פרוס/לא-שלם | PROJECT=`BUILDING` |
| `PREVIEW` | ארטיפקט-מועמד מוגדר, ממתין לשער-אדם להעלאה ל-Preview/main | PROJECT=`BUILDING`, ACCESS=`PREVIEW(admin)` יעדי |
| `OPEN-HUMAN-GATE` | דורש הכרעת-צוריאל לפני שיזוז | PROJECT=`OPEN` |
| `PARKED` | הושהה בכוונה, לא-הוחלף | PROJECT=`PARKED` |
| `SUPERSEDED` | הוחלף בהחלטה חדשה, נשמר כ-provenance | PROJECT=`SUPERSEDED` |
| `DESIGN` | מפרט/חוזה קיים, לא-נבנה | PROJECT=`DESIGN` |
| `OUTSIDE` | קיים בריפו/DB אך מחוץ-לתחום SOD1820 | — (חדש ב-v5) |

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
| OUTSIDE | 🚪 מחוץ-לתחום (חדש, v5) |

---

## 🕒 טריות המפה (FRESHNESS)
- **LAST_RECONCILED:** `2026-08-21` (הסשן הזה; יושב מול `work_log` העדכני + `main` HEAD `d245e5eb`).
- **SYNC STATUS:** `SYNCED` *נכון ל־LAST_RECONCILED — אבל המסמך הזה עצמו (v5) עדיין DRAFT, לא-קנוני, לא על main.*
- **כלל הטריות:** אם קיימת **עבודה מאומתת חדשה יותר מ־LAST_RECONCILED** (רשומת `work_log`, commit ב־`main`, או migration חי) → המפה **`STALE` 🟠 מיושנת** ותסומן ככזו — לעולם לא `SYNCED` ללא בסיס.
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

**ערובות אי־סתירה:**
- `BUILDING` (עבודה) ≠ `BLOCKED` (עבודה חסומה). · `LOCKED` (גישה) ≠ `BLOCKED` (עבודה). · `FUTURE` (מתוכנן) ≠ `PARKED` (מושהה). · `LIVE` ≠ `MERGED`. · `MERGED` ≠ `VERIFIED`. · `Admin Preview` 👁️ ≠ `Production` 🚀. · `VISIBILITY` ≠ `ACCESS`. · `LIVE` נקבע **רק** מ־RELEASE=Live/Verified.

---

## ⚖️ חוקי־על (GOVERNING LAWS)

### 1. חוק BUILDING / נראות־פיצ'ר — `גלוי ≠ מופעל`
כל פיצ'ר בבנייה **גלוי** במפה, אך **אינו פעיל למשתמשים רגילים עד אישור צוריאל**. `BUILDING → LIVE` הוא Human-Gate. לעולם לא להסיק `BUILDING`/`LIVE` אוטומטית מקיום ענף/commit/prototype.

### 2. חוק פיוס־סשן (SESSION RECONCILIATION)
אמת → פייס → עדכן מפה → checkpoint. לעולם לא DONE על כוונה. לעולם לא להמציא provenance.

### 3. חוק אין־עבודה־נעלמת (NO-DISAPPEARING-WORK)
כל פריט יושב בדיוק ב־PROJECT STATE אחד. `BUILDING`/`FUTURE`/`PARKED` לעולם לא נעלמים. הושלמה→History. הוחלפה→SUPERSEDED. הושהתה→PARKED.

### 4. חוק לוגיקת־החלטה (DECISION LOGIC)
לסווג כל טענה: `FACT · INFERENCE · RECOMMENDATION · DECISION · OPEN QUESTION`. רק DECISION שאושרה ע״י צוריאל הופכת לקנון, עם provenance.

### 5. חוק בטיחות־ACTIVE_NOW
בדיוק **אחד** `ACTIVE_NOW`. מועמד עד אישור-בפועל של צוריאל.

---

## 🏛️ עקרונות־ארכיטקטורה (ARCHITECTURE PRINCIPLES LEDGER) — חדש ב-v5
> נבדקו-מחדש מול קוד+3 מסמכי-GPT+כל מה שנבדק בסשן זה — **כולם מקוימים, אפס-הפרה נמצאה.**

| עיקרון | חוק-מקור (`rule_id`) | סטטוס-קיום | הערה |
|---|---|---|---|
| **ONE ENGINE** | `els_single_engine_law`, §10.6 | `LIVE` ✅ | מאומת: מימושי-ELS מקבילים הוסרו, `gematria.js` מקור-יחיד |
| **ONE TREE** | `unified_graph_law`, §11.10 | `LIVE`-חלקי ⚠️ | `persons`/`els_records`/`relation_evidence` עדיין מחוץ ל-`nodes`/`edges` — DRIFT-ידוע, לא-נפתר ב-v5 |
| **ONE HUMAN GATE** | §12.4, §13.8 | `LIVE`-חלקי ⚠️ | ≥5 מנגנוני-שיפוט נפרדים בפועל (ר' `WS-JUDGE-UNIFICATION`) |
| provenance | §0 governance | `LIVE` ✅ | עקבי בכל commit/work_log |
| Candidate ≠ Fact | §10.0, §19-B#9 | `LIVE` ✅ | עקבי |
| HOT ≠ TRUE | §10.3.1 | `LIVE` ✅ | עקבי (`journey_seeds`, `demand_gaps`) |
| Premium ≠ Truth | §19-B#15 | `LIVE` ✅ | אין-הפרה כי אין-מימוש-בכלל (`PARKED`) |
| Canonical ≠ Published | §19-A | `LIVE` ✅ | עקבי |
| Rank, Don't Hide | §11.6 | `LIVE` ✅ | עקבי, מאושש גם ע"י `research-object-map.md`#18 |

---

## 🔀 צינור השחרור (RELEASE PIPELINE)
```
Branch(ענף) → Review(בדיקה) → Main(🔀 מוזג) → Deploy(🌐 נפרס) → Live(🚀 פעיל) → Verified(✅ אומת)
```
- אסור להציג עבודה כ־`LIVE` רק משום שהיא קיימת בענף. אסור להציג עבודה כ־`DONE` רק משום שיש commit.
- **דוגמה חיה (ELS Step 3 client):** Branch ✅ · Review ✅ · Main ❌ · Deploy ❌ · Live ❌ · Verified ❌ → אינו LIVE ואינו DONE.
- **דוגמה חיה נוספת (`/lab/els` shell, v5):** Branch ✅ · Review ✅ · **Main ✅** (`3e77f15a`/`d245e5eb`) · Deploy ✅ · **Live ✅ (ACCESS מוגבל — ראוט קיים, אין ניווט-פנימי אליו)** · **Verified ⚠️ חלקי** (מוצהר-אינרטי במפורש: "עדיין לא הגיעה תמונת-מצב" עד שהמנוע ב-`main` ישדר `type:"state"` — זה **מחיר-מכוון** של "אל תיגע במנוע", לא תקלה).

---

## 🌌 היקום המלא (FULL UNIVERSE) — כלום לא מוסתר
- **🔵 עכשיו (NOW)** → `WS-ELS-IDENTITY` — Step 3 completion *(ACTIVE_NOW — מועמד, ממתין לאישור צוריאל, ללא-שינוי מ-v4)*.
- **🟡 הבא (NEXT)** → פריסת `claude/els-unified-merge`@`542c7147` ל-Preview (Decision #1 פתור, ממתין-לשער-בלבד) · שחזור `fn_els_search` secdef · עדכון Master State §17-אנומרציה.
- **🔮 בעתיד (FUTURE)** → מרכז־הניהול + Feature-Control · Meta Growth OS · פלטפורמת־6־דרגות + Credits + Academy · UGC · רב־לשוניות · ELS שלב ב׳.
- **⏸️ מושהה (PARKED)** → סליקה/מנויים (Hyp) · Human-Design/Tarot/`digit_language`/`number_series`/`number_products` (schema-בלבד, מכוון-נכון).
- **🗄️ הוחלף (SUPERSEDED, provenance)** → writer-os · `CommandCenterTab.jsx` (הוחלף ע"י `WarRoomTab`) · §19-old · ELS-2 Item-1 **כענף-עצמאי** (תוכנו נספג בפועל ל-D4, ר' `WS-ELS-FSS`).
- **🚪 מחוץ־לתחום (OUTSIDE, חדש-v5)** → "מעבדה להבנת משמעות" (`/meaning-lab`, `lab_*` tables) — פרויקט-צד נפרד לגמרי, לא-שייך ל-SOD1820, לא-לגעת.

---

## 🧭 ניווט מרכז־הניהול (בעברית — למימוש עתידי)
המפה העתידית תציג: 📍 איפה אני · ❓ למה זה הצעד הבא · ⏭️ מה עושים עכשיו · 🚫 מה לא לבנות עדיין · 🕐 מה השתנה · 📜 למה התקבלה ההחלטה.

## 🔵 ACTIVE_NOW — **מועמד (ממתין לאישור צוריאל)** — ללא-שינוי מ-v4
> **📍 איפה אני (מועמד):** `WS-ELS-IDENTITY` — השלמת ELS Finding Identity Step 3 (deploy + אימות).
> **❓ למה זה הצעד הבא:** Steps 1–3 בנויים; ה־client של Step 3 (`7045f7b3`) הוא החלק היחיד בין Finding Identity לבין LIVE מקצה־לקצה; Step 4 חסום-עליו.
> **⏭️ מה עושים עכשיו (באישור):** merge `claude/els-step3-identity` (`7045f7b3`) → `main` → deploy → אימות `start_index` → שחרור Step 4.
> **🕐 מה השתנה מאז v4:** תוקן-header-drift (`f375327f`) · `/lab/els` shell עלה ל-main כמעטפת-בלבד (`d245e5eb`) · ELS FSS Decision #1 נפתר (D4+Item1-graft, `claude/els-unified-merge`@`542c7147`) · Universal Research Contract §19-A/B/C/D על-main.

## 🟡 PARALLEL_READY (מגודר; אינו העמדה הפעילה)
- **`WS-ELS-REGRESSION-FN`** — שחזור `search_path=public` + `security definer` על `fn_els_search` החי.
- **`WS-MASTERSTATE`** — §17 אנומרציה + סנכרון-provenance.
- **`WS-ELS-FSS`** *(workstream-tag: `PREVIEW`/`OPEN-HUMAN-GATE`)* — **עודכן v5:** לא-עוד "הכרעת D4/Item1" (הוכרע) — אלא שער **מיזוג/פריסה-ל-Preview** של `claude/els-unified-merge`@`542c7147`.
- **`WS-LEDGER-REVIEW`** *(workstream-tag: `DESIGN`/`OPEN-HUMAN-GATE`)* — `admin_research_review` מ־DESIGN לתכנון.
- **`WS-ELS-CAPABILITY-AUDIT`** *(workstream-tag: `OPEN-HUMAN-GATE`, חדש-v5)* — 4 שאלות ל-צוריאל מ-18.8, 3 ימים ללא-מענה.

## 🚫 DO NOT BUILD YET — מה שלא מתחילים עדיין
| מה | למה לא עכשיו | מה חוסם | מה פותח אותו |
|---|---|---|---|
| ELS Step 4 (dedup/UNIQUE) | זהות חייבת להיות חיה קודם | Step 3 לא נפרס/לא אומת | פריסת+אימות Step 3 |
| KU-3D / Navigator / ELS-Matrix (כמוצר) | תלוי בזהות חיה | Finding Identity לא LIVE מקצה־לקצה | Step 3 LIVE+Verified |
| מרכז־הניהול UI (בנייה חדשה) | **עודכן v5:** לא-עוד "v4 טרם קנוני" (זה נפתר) — אלא: 3 ארטיפקטים חיים כבר-קיימים (`WarRoomTab`/`RoadmapCommandCenter`/מפרט-לא-בנוי) בלי הכרעה-איזה-הוא-CC-1 | הכרעת-CC-1-target | Human-Gate ייעודי |
| מנגנון WS-FEATURE-CONTROL | תכנון בלבד | אין ארכיטקטורת Command Center סגורה | שער design → שער build |
| Person F-1b (בני־משפחה) | חוזה־זהות לא סגור | OD-F9a / OD-F9b / OD-F8 | הכרעת שלושת ה־OD |
| חיווט Raziel (`fn_raziel_turn`, `session_state`, L1–L14) | פתוח | אין שער בנייה | שער בנייה של צוריאל |
| השלמת זהות תנ״ך | `corpus_id` תנ״ך פתוח | אין corpus_id תנ״ך קנוני (§17) | הכרעת צוריאל |
| מיזוג/פריסת `els-unified-merge` (המנוע, לא ה-shell) *(חדש-v5)* | Decision #1 פתור אך שער-אדם עוד לא ניתן | אישור-Human-Gate | צוריאל מאשר Preview |
| אימוץ Number-Language / Name-Lab-רשמי / איחוד-שופטים *(חדש-v5)* | כולם OPEN-HUMAN-GATE, ר' שערים #16/#17/#18 (Decision Register) | הכרעות-צוריאל נפרדות | ר' שערים 15-19 למטה |

---

## 🗂️ מרשם ה־Workstreams
*(כל workstream: WHERE_WE_ARE / WHAT_IS_DONE / WHAT_IS_OPEN / WHAT_IS_BLOCKED / HUMAN_GATE / NEXT_ACTION / DEPENDENCIES / CANONICAL_HOME / PROVENANCE / LAST_VERIFIED / STATE)*

### WS-CC — ממשל המפה + מרכז־הניהול
- **WHERE_WE_ARE:** המפה (v4) **קנונית על main**; v5 בכתיבה. מרכז־הניהול UI — **DRIFT-CORRECTED v5:** לא "לא-התחיל" — **`WarRoomTab.jsx`(1,589 שורות) ו-`RoadmapCommandCenter.jsx` שניהם `LIVE` על main כבר!** `CommandCenterTab.jsx` = `SUPERSEDED` (הוסר מהרינדור, RPC עדיין חי בלי caller).
- **WHAT_IS_DONE:** v1→v4 קנוני (`0d247a1d`→`38a8f784`→`a757eeec`→`f375327f`). `WarRoomTab`/`RoadmapCommandCenter` `LIVE`.
- **WHAT_IS_OPEN:** איזה מ-3 הארטיפקטים (`WarRoomTab`/`RoadmapCommandCenter`/מפרט-§11-§13-לא-בנוי) הוא יעד-הבנייה הרשמי של CC-1 — **ר' Gate #9** (Decision Register).
- **WHAT_IS_BLOCKED:** בנייה-נוספת של Command Center — עד הכרעת-CC-1-target.
- **HUMAN_GATE:** צוריאל — הכרעת-CC-1-target.
- **NEXT_ACTION:** ממתין להכרעה; שום בנייה נוספת.
- **DEPENDENCIES:** `WS-JUDGE-UNIFICATION` (תלוי בהכרעה זו).
- **CANONICAL_HOME:** `SOD1820_MASTER_ROADMAP.md` (main) + `src/components/WarRoomTab.jsx`/`RoadmapCommandCenter.jsx` (main).
- **PROVENANCE:** `548d4a4` (RoadmapCommandCenter deploy) · work_log `fbe34f97` ("צוריאל אמר תעלה").
- **LAST_VERIFIED:** 2026-08-21.
- **STATE:** `LIVE` (2 ארטיפקטים) · `SUPERSEDED` (1) · `OPEN-HUMAN-GATE` (הכרעת-יעד).

### WS-ELS-CORPUS — קורפוס ELS קנוני (§17) — ללא-שינוי
- **WHERE_WE_ARE:** קורפוס־תורה קנוני וחי; זהות־תנ״ך לא מוגדרת.
- **WHAT_IS_DONE:** `torah_stream`=304,805 (Koren); `corpus_id 0b022e8eef6f9c16`; `fn_els_search` 0-based.
- **WHAT_IS_OPEN:** `corpus_id` תנ״ך (`WS-TANAKH`).
- **HUMAN_GATE:** אין (סגור).
- **CANONICAL_HOME:** Master State §17 + live DB.
- **STATE:** `DB-LIVE`.

### WS-ELS-REGRESSION — נטרול רגרסיית־קורפוס — ללא-שינוי-עובדתי (תיקון-מבנה בלבד, שוחזרו-שדות)
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
- **STATE:** `LIVE` (`f5834f44`, main). תת-פריט `WS-ELS-REGRESSION-FN`: `OPEN-HUMAN-GATE`.

### WS-ELS-IDENTITY — ELS Finding Identity `{corpus_id, term_norm, dir, skip, start}` — ללא-שינוי-עובדתי (שוחזרו-שדות)
- **WHERE_WE_ARE:** Steps 1–3 הושלמו; client (`7045f7b3`) בנוי, לא נפרס; Step 4 חסום.
- **WHAT_IS_DONE:** Step 1 (LIVE) · Step 2 13-arg (LIVE) · R1 (start 0-based, `positions[0]===start`, מרחב־תורה תואם) · Step 3 DB helpers + INSERT-only + `save_els_matrix_anon` 11-arg (LIVE, `20260820023525`) · Step 3 client (`7045f7b3`). regression suite PASS.
- **WHAT_IS_OPEN:** פריסת ה־client; זהות־תנ״ך (`WS-TANAKH`).
- **WHAT_IS_BLOCKED:** **Step 4 (dedup/UNIQUE) = `BLOCKED` 🚧** עד פריסת+אימות Step 3.
- **HUMAN_GATE:** צוריאל — merge+deploy של Step 3; בהמשך שער Step 4.
- **NEXT_ACTION:** merge `claude/els-step3-identity` → main → deploy → אימות `start_index`.
- **DEPENDENCIES:** `WS-ELS-CORPUS` (LIVE); שלמות־תנ״ך על `WS-TANAKH`.
- **CANONICAL_HOME:** פונקציות live DB + Master State §17 (דורש עדכון).
- **PROVENANCE:** migrations step1/2/3 (`20260820023525`); client `7045f7b3`.
- **LAST_VERIFIED:** 2026-08-20 (חתימות + regression suite ב-rollback).
- **STATE:** `ACTIVE_NOW` 🔵 · Steps 1-3 `DB-LIVE` · client `BUILDING` 🏗️ · Step 4 `OPEN-HUMAN-GATE`.
- תת-פריט `WS-TANAKH` — זהות־תורה `0b022e8eef6f9c16`; זהות־תנ״ך = תנאי פתוח מפורש (§17), בלי המצאה: `OPEN-HUMAN-GATE`.

### WS-ELS-FSS — ELS Full Search Space — **Decision #1 נפתר, v5**
- **WHERE_WE_ARE:** D4 נבחר-קנונית (`cfc995ca`, 19.8) ← **Item1 כבר-grafted-לתוכו** (`fdd94acd`, 19.8 22:51, "canonical merge") ← ניקוי-מיגרציה עליו (`542c7147`). **החבילה המאוחדת = `claude/els-unified-merge`@`542c7147` = מועמד-Preview יחיד.** אין-עוד "שתי-חלופות".
- **WHAT_IS_DONE:** D4 (`7f066e23`) מתקן cap-prefix-bias + backward-starvation; Item1's fix (בידוד-כיוון-הפוך) הושתל לתוך `findAll` של D4 (`fdd94acd`) בלי-לפגוע ב-`scopeRange`. בדיקת-קבלה **ל-D4-בלבד**: 97 `els_records`, 13/13 שדות, 84/84 מטריצות זהות-מופע, 0 הפרות-superset.
- **WHAT_IS_OPEN:** (א) **אין רשומת-בדיקה מתועדת ל-מצב-המאוחד-הסופי** (אחרי ה-graft) — הבדיקה היסודית קדמה ל-`fdd94acd`. (ב) שער-מיזוג/Preview עצמו.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** צוריאל — (1) אישור-Preview ל-`els-unified-merge`@`542c7147`; (2) לוודא/לבקש בדיקת-קבלה טרייה למצב-המאוחד לפני main.
- **NEXT_ACTION:** ממתין לאישור-צוריאל בלבד — שום קוד/בדיקה נוספת בלי שער.
- **DEPENDENCIES:** חולק קורפוס+זהות עם `WS-ELS-IDENTITY`; מזין `WS-ELS-WORKAREA` (למטה).
- **CANONICAL_HOME:** `claude/els-unified-merge`@`542c7147` (ענף, לא-main).
- **PROVENANCE:** `cfc995ca`(החלטה) · `fdd94acd`(graft) · `542c7147`(תיק-נוכחי) · `fb9c23ea`(Item1 המקורי, superseded-reference-בלבד).
- **LAST_VERIFIED:** 2026-08-21 (אומת-שוב ב-git ישירות).
- **STATE:** `PREVIEW` (מועמד) / `OPEN-HUMAN-GATE`.

### WS-ELS-WORKAREA — `/lab/els` + State Contract + FORMS — **חדש-v5, מפוצל מ-WS-ELS-FSS**
- **WHERE_WE_ARE:** **פוצל לשני שכבות שונות בפריסה:** (1) **ה-shell עצמו — `LIVE` על `main`** (`3e77f15a`/`d245e5eb`, 21.8) — `ElsWorkAreaPage.jsx`, ראוט `/lab/els`, מבודד-מאומת (0 קריאות-מנוע, 0 כתיבות `els_records`, `tzofen.html`/template **לא-נגועים**, md5 זהה-ל-main). (2) **State Contract + FORMS/Split-Join — עדיין `BUILDING`🏗️ רק על `claude/els-unified-merge`** — לא-פרוסים, המנוע לא-משדר `type:"state"` עדיין.
- **WHAT_IS_DONE:** ה-shell חי; מוצהר-במפורש-אינרטי ("עדיין לא הגיעה תמונת-מצב") — זה **תוצאה-מכוונת** של "אל תיגע במנוע", לא-תקלה.
- **WHAT_IS_OPEN:** מתי (אם) לפרוס את שכבת-המנוע (`WS-ELS-FSS`) כדי שה-shell יקבל תוכן אמיתי.
- **WHAT_IS_BLOCKED:** תוכן-אמיתי ב-`/lab/els` — עד פריסת `WS-ELS-FSS`.
- **HUMAN_GATE:** תלוי-לחלוטין ב-`WS-ELS-FSS`.
- **NEXT_ACTION:** אין — ה-shell כבר-חי, ממתין-בלבד לשכבת-המנוע.
- **DEPENDENCIES:** `WS-ELS-FSS`.
- **CANONICAL_HOME:** `src/pages/ElsWorkAreaPage.jsx` (main, shell) + `claude/els-unified-merge` (מנוע, ענף).
- **PROVENANCE:** `3e77f15a`, `d245e5eb` (main) · `98d91a5b`,`2dbb658f` (state-contract/forms, ענף).
- **LAST_VERIFIED:** 2026-08-21 (git ישיר).
- **STATE:** shell=`LIVE` · מנוע=`BUILDING`🏗️/`OPEN-HUMAN-GATE`.

### WS-ELS-CAPABILITY-AUDIT — ביקורת-85-היכולות — **חדש-v5**
- **WHERE_WE_ARE:** תגובה-קלוד ל-3 מסמכי-אסטרטגיה של GPT (`gpt/research-object-map`, `gpt/els-capability-map`, `gpt/els-foundation-integration`, כולם 17.8) — `docs/els-capability-audit.md`, ממתין-3-ימים ל-Human-Gate.
- **WHAT_IS_DONE:** 85 יכולות ייחודיות מוצלבות (72 חיות·2 בענף·2 חלקיות·1 מת·7 חסרות·1 אסורה) · 9 GAPs קונקרטיים (GAP-1 חלון-סטטיסטיקה≠חלון-תצוגה · GAP-2 `CW=min(S,80)` חותך-בלי-provenance · GAP-3 `ctxR` קפוא · GAP-4 `findAtSkips()` קוד-מת · GAP-5 `els_records` חסרה-עמודות-provenance · GAP-6 אין-Worker · GAP-7 אין-חיווט-ל-Research-Bus · GAP-8 4-פונקציות-יתומות · GAP-9 FORMS/State-Contract רק-בענף — **סעיף זה נפתר ב-v5 דרך `WS-ELS-FSS`/`WS-ELS-WORKAREA`**) · סדר-עדיפויות מומלץ.
- **WHAT_IS_OPEN:** 4 שאלות-מפורשות לצוריאל (ר' Gate #15, Decision Register).
- **WHAT_IS_BLOCKED:** עדיפויות 2-10 בביקורת חסומות עד מענה.
- **HUMAN_GATE:** צוריאל — 4 שאלות, ר' Gate #15 (Decision Register).
- **NEXT_ACTION:** ממתין למענה-צוריאל.
- **DEPENDENCIES:** `WS-ELS-FSS`.
- **CANONICAL_HOME:** `docs/els-capability-audit.md` (ענף `claude/els2-b45k5h`, `e0a2247a`, לא-main).
- **PROVENANCE:** work_log `fe4a3cef` (18.8).
- **LAST_VERIFIED:** 2026-08-21 (קרוא ומאומת בסשן זה).
- **STATE:** `OPEN-HUMAN-GATE`.

### WS-GAMMA — γ שתי־שכבות + Universal Research Contract v1.0 — עודכן-v5 (מוזג-למיין)
- **WHERE_WE_ARE:** **§19-A/B/C/D כולם על `main`** (לא-עוד "ענף, טרם-מיין") — `6b8160b4`/`3a09b8dd` דרך `c8d3672`.
- **WHAT_IS_DONE:** γ (Atlas=`relation_evidence`/Ledger=`research_objects`) + חוזה-18-סעיפים + §19-C הבהרות + §19-D status + §0#15 Context-Integrity-Law — כולם ב-Master-State החי.
- **WHAT_IS_OPEN:** יישום-UX בפועל (Entry-Context/Focused-before-Expansion) — **עדיין `OPEN` לפי §19-D המפורש, לא `CLOSED`**.
- **HUMAN_GATE:** צוריאל — שער-בנייה נפרד לכל יישום-UX פר-משטח.
- **NEXT_ACTION:** אין בנייה — מפת-מסך-קודם אם/כשיאושר.
- **DEPENDENCIES:** מזין `WS-LEDGER-REVIEW`, `WS-URC`.
- **CANONICAL_HOME:** `SOD1820_MASTER_STATE.md` §19-A/B/C/D (main).
- **PROVENANCE:** `6b8160b4`,`3a09b8dd`,`c8d3672` (main) · `7985e0ce` (decision-record, עדיין-ענף-בלבד).
- **LAST_VERIFIED:** 2026-08-21.
- **STATE:** תיעוד `LIVE` (על main) · יישום-UX `DESIGN`/`OPEN-HUMAN-GATE`.

### WS-URC — SOD1820 Universal Research Contract v1.0 — עודכן-v5 (שוחזרו-שדות)
- **WHERE_WE_ARE:** החוזה (18-סעיפים) **תיעודו כבר על `main`** *(עודכן-v5: לא-עוד "ענף, טרם-מיין" — ר' `WS-GAMMA`)*. יישום-UX **לא-התחיל, לא-אושר**.
- **WHAT_IS_DONE:** 18-סעיפי-החוזה (Entry Context·Focused-before-Expansion·Method-Preserving Discovery·Calculation·Value Scan·Zero Navigation·Research Finding·One Knowledge Tree·Fact-separation·Contextual Intelligence·External Research·Raziel·Human-Gate·Privacy·Premium-as-gate·Future-proof·Canonical Architecture Principle·Test-Case) + §19-C הבהרות + §19-D status — כולם ב-Master-State החי (main).
- **WHAT_IS_OPEN:** יישום-UX בפועל (Entry-Context-aware navigation · Focused-result-first UI · Method-tag תמידי) בכל משטח (ELS/Number/Gematria/Cross/Beit-Midrash/Command-Center) — **טרם-אושר, טרם-תוכנן ברמת-מסך**, ועדיין `OPEN` לפי §19-D המפורש (לא `CLOSED`).
- **WHAT_IS_BLOCKED:** יישום-UX — עד מפת-מסך מאושרת פר-משטח (per `research_workspace_law`/`command_center_law`/§11.33).
- **HUMAN_GATE:** צוריאל — שער-תכנון פר-משטח, ואז שער-בנייה (שני שערים נפרדים, כמו `WS-FEATURE-CONTROL`).
- **NEXT_ACTION:** אין בנייה כעת. אם/כשצוריאל יבקש יישום — להתחיל ממשטח-בודד (למשל ELS/tzofen "Focused Before Expansion", הכי-קרוב-להשלמה כי `§CC-2` GAP-1/GAP-1A כבר-בנוי-על-branch) ולהציג מפת-מסך לפני קוד.
- **DEPENDENCIES:** `WS-GAMMA` (מספק שכבת Finding/Atlas/Ledger) · `WS-CC` (Command-Center הוא אחד המשטחים שהחוזה חל-עליו) · `WS-MASTERSTATE`. **חדש-v5:** קשר-ישיר ל-`WS-RESEARCH-OBJECT-FRAMEWORK` (למטה) — שני המסמכים חופפים-משמעותית (Entry-Context/Focused-before-Expansion ⇔ North-Star/Object-Value-Cost-Coverage-Risk) בלי-סתירה.
- **CANONICAL_HOME:** `SOD1820_MASTER_STATE.md` §19-B/C/D (main).
- **PROVENANCE:** `6b8160b4`,`3a09b8dd` (main) · Master State Change Log #29/#30 · work_log (20.8.2026).
- **LAST_VERIFIED:** 2026-08-21.
- **STATE:** תיעוד `LIVE` (main, כחלק מ-`WS-GAMMA`) · יישום-UX `DESIGN`/`OPEN-HUMAN-GATE` (§19-D: "לא CLOSED").

### WS-SEC — הקשחת אבטחה (RLS / privacy) — ללא-שינוי-עובדתי (שוחזרו-שדות)
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
- **STATE:** `DB-LIVE` (פר־פריט).

### WS-LEDGER-REVIEW — admin_research_review / תכנון Ledger — ללא-שינוי-עובדתי (שוחזרו-שדות)
- **WHERE_WE_ARE:** smoke-test READ-ONLY עבר; תכנון לא התחיל.
- **WHAT_IS_DONE:** `admin_research_review` על `research_objects` (fact+relation), rollback מלא, PASS (19.8).
- **WHAT_IS_OPEN:** provenance על `node.metadata`; כתיבות `decision_ledger`; מסלולים מרובי-איברים דרך `relates`/`engine_detail`.
- **WHAT_IS_BLOCKED:** —
- **HUMAN_GATE:** צוריאל — אישור מעבר לתכנון.
- **NEXT_ACTION:** שער → תכנון provenance/decision_ledger (בלי קוד).
- **DEPENDENCIES:** `WS-GAMMA`. **חדש-v5:** תלוי גם ב-`WS-JUDGE-UNIFICATION`.
- **CANONICAL_HOME:** `research_objects`/`relation_evidence` + רשומת־החלטה עתידית.
- **PROVENANCE:** work_log 19.8 smoke-test.
- **LAST_VERIFIED:** 2026-08-19 (לא אומת מחדש).
- **STATE:** `DESIGN`/`OPEN-HUMAN-GATE`.

### WS-JUDGE-UNIFICATION — איחוד מנגנוני-שיפוט — **חדש-v5**
- **WHERE_WE_ARE:** נמצאו **≥5 מנגנוני-שיפוט נפרדים** חיים/חלקיים, אף אחד מאוחד: (1) `admin_research_review` (RPC, אין UI) · (2) `ConvergenceWizard`+`admin_convergence_candidates`/`admin_candidate_decide` (משוגר) · (3) `AnchorFamiliesTab`/`FindingsTab` (Atlas-judge, `relation_evidence`) · (4) Decision/Learning-workflow ("שופט ההתכנסויות" ב-`AdminPage.jsx`, `research_candidates`→`decision_ledger`→`learned_patterns`) · (5) מפרט-CC-§12.4 עצמו (מתכנן-לאחד-2, לא-3-4-5).
- **WHAT_IS_DONE:** מיפוי-מלא של 5-המנגנונים, סכימות אומתו (`decision_ledger` 29 עמודות, `research_candidates` 14, `learned_patterns` 9).
- **WHAT_IS_OPEN:** האם/איך לאחד את כולם תחת שער-אחד (§12.4).
- **WHAT_IS_BLOCKED:** תלוי בהכרעת-`WS-CC` (CC-1-target).
- **HUMAN_GATE:** צוריאל — ר' Gate #18 (Decision Register).
- **CANONICAL_HOME:** `AdminPage.jsx` (מפוזר, main).
- **PROVENANCE:** נמצא ב-Legacy-Reconciliation (21.8) + Absorption-Matrix (21.8).
- **LAST_VERIFIED:** 2026-08-21.
- **STATE:** `DB-LIVE` (5 המנגנונים) · `OPEN-HUMAN-GATE` (איחוד).

### WS-RAZIEL — תשתית Raziel + L1–L14 — עודכן-v5
- **WHERE_WE_ARE:** 3 מימושים-LLM/DB-native ידועים + **תשתית-WA-תפעולית רביעית, חדש-v5** (`raziel_unlimited`/`raziel_quota`/`raziel_dm_policy`/`raziel_link_flow` — כולם `DB-LIVE`, נקראים-בפועל ע"י `wa-raziel/index.ts`) + **`raziel_brain` — חדש-v5: נקרא-חי (`number-researcher/index.ts:218`) אך 0-שורות, מחזיר `null`.**
- **WHAT_IS_DONE:** `fn_raziel_route`,`agent_identity`(12 שורות, לא-4),`resolve_person`/`identity_edges`(67,552) — קיימים. תשתית-WA מאומתת-חיה.
- **WHAT_IS_OPEN:** חיווט `fn_raziel_turn`(STUB); `raziel_brain` ריק; אף מימוש לא-קורא `resolve_person`/`identity_edges` — **החסם המדויק ל-"Raziel אישי"**, חוזר בכל משטח.
- **HUMAN_GATE:** צוריאל — (א) אישור-בניית-חיווט; (ב) לאכלס `raziel_brain` או להסיר-את-התלות (ר' Gate #19, Decision Register).
- **DEPENDENCIES:** Ledger, metatron.
- **CANONICAL_HOME:** live DB + `wa-raziel`/`number-researcher` edge functions.
- **PROVENANCE:** נמצא ב-Legacy-Reconciliation (21.8), אומת שוב באודיט-ממוקד (21.8).
- **LAST_VERIFIED:** 2026-08-21.
- **STATE:** 3-variants+WA-infra=`LIVE`/`DB-LIVE` · `raziel_brain`=`OPEN-HUMAN-GATE` · חיווט-זהות=`OPEN-HUMAN-GATE`.

### WS-MASTERSTATE — ממשל/סנכרון Master State — עודכן-v5
- **WHERE_WE_ARE:** §19 A/B/C/D **כבר על main** (לא-עוד "טרם-מיין"). §17 עדיין `FROZEN`-חלקית לגבי-Finding-Identity.
- **WHAT_IS_OPEN:** §17 אנומרציה; רשומת-זהות-שנותרה-בפער (Change Log #26, OD-F10a); **אם v5 יאושר — עדכון-Master-State-מתאים נשאר `PENDING`, לא-בוצע-כאן** (per הוראה מפורשת: לא-לשנות Master State אלא-כחלק-מפורש-מאושר).
- **HUMAN_GATE:** צוריאל — Master WRITE gate נפרד.
- **CANONICAL_HOME:** `SOD1820_MASTER_STATE.md` (main).
- **STATE:** sync `LIVE` · §19 `LIVE`(main) · §17-אנומרציה `OPEN-HUMAN-GATE`.

### WS-PERSON — זהות־אדם (OD-F10a) — ללא-שינוי-עובדתי (שוחזרו-שדות)
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
- **STATE:** חוזה `DESIGN` · F-1a′ `LIVE`/`DB-LIVE` · F-1b `OPEN-HUMAN-GATE`.

### WS-KU3D — GPT Knowledge Universe 3D preview — ללא-שינוי-עובדתי (שוחזרו-שדות)
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
- **STATE:** `BUILDING`🏗️ (ענף/preview GPT) · הפעלה `OPEN-HUMAN-GATE`.

### WS-FEATURE-CONTROL — מרכז־ניהול נראות־פיצ'רים — עודכן-v5
- **WHAT_IS_BLOCKED:** **עודכן:** לא-עוד "v4 טרם קנוני" — אלא ארכיטקטורת-Command-Center עדיין לא-סגורה (תלוי ב-`WS-CC`/CC-1-target).
- **STATE:** `FUTURE`🔮 (מימוש) · `DESIGN`📐 (חוק/מפרט).

### WS-NUMBER-LANGUAGE — "שפת המספרים" (8 טבלאות) — **חדש-v5**
- **WHERE_WE_ARE:** `number_roots`/`digit_language`/`number_readings`/`number_series`/`number_branches`/`number_sets`/`number_products`/`number_anchors` — הערות-DB מזהות-מחבר=צוריאל, מבנה 4-שכבתי מכוון (אות→מילה→משפט→טקסט).
- **WHAT_IS_DONE:** `number_anchors` — **`DB-LIVE`, מחובר בפועל ל-`EntityPage.jsx` בכל דף-מספר** (`getNumberAnchor()`) — ריק (0 שורות), לכן אינרטי-בשקט. `number_roots`/`number_branches` — קומפוננטה בנויה (`NumberTree.jsx`) + 2 פונקציות-DB (`fn_number_journey`,`fn_metatron_scan`) — **אף route לא מרכיב את הקומפוננטה.**
- **WHAT_IS_OPEN:** לאמץ (לתעד+לחווט) או להשאיר `PARKED`.
- **HUMAN_GATE:** צוריאל — ר' Gate #16 (Decision Register).
- **CANONICAL_HOME:** live DB + `src/features/numbertree/NumberTree.jsx` (יתום).
- **PROVENANCE:** Legacy-Reconciliation (21.8).
- **LAST_VERIFIED:** 2026-08-21.
- **STATE:** `number_anchors`=`DB-LIVE` · `roots/branches`=`BUILDING`🏗️(יתום) · היתר=`DESIGN`/`PARKED`-מועמד · כולו `OPEN-HUMAN-GATE`.

### WS-NAMELAB — Name Lab + Christina + Maftech — **חדש-v5**
- **WHERE_WE_ARE:** 3 כלים חיים-וציבוריים, בלי-ייצוג-רשמי: Name Lab (`/name-lab`, 178 שאילתות, אחרונה 20.8 19:35) · Christina (`/research?tool=christina`) · Maftech (`/research?tool=maftech`, **חסר גם ברשימת-הכלים ב-CLAUDE.md**).
- **WHAT_IS_DONE:** שלושתם `LIVE` ופעילים.
- **WHAT_IS_OPEN:** להוסיף-כ-workstream-רשמי / לתקן רשימת-כלים ב-CLAUDE.md — ר' Gate #17 (Decision Register).
- **HUMAN_GATE:** צוריאל.
- **CANONICAL_HOME:** `NameLabPage.jsx`/`ChristinaEngine.jsx`/`MaftechShowcase.jsx` (main).
- **PROVENANCE:** Legacy-Reconciliation (21.8); §9.4 (Christina, ישן).
- **LAST_VERIFIED:** 2026-08-21.
- **STATE:** `LIVE` (שלושתם) · `OPEN-HUMAN-GATE` (פורמליזציה).

### WS-TIME-DISAMBIGUATION — Journey / journey_seeds / RevelationAxis / Timeline — **חדש-v5**
- **WHERE_WE_ARE:** "זמן" = **3 דברים לא-קשורים**: (1) Journey v1/v2 (`/journey`,`/journey-beta`) — `LIVE`, legacy-מוצהר. (2) `journey_seeds` (461 שורות) — `DB-LIVE`, admin-בלבד, מזין `CommandCenterTab`. (3) `RevelationAxis.jsx` — `LIVE`, קומפוננטה ציבורית גלובלית בסיידבר. (4) `/timeline` route — `LIVE`, עומק לא-נבדק. (5) "מרחבי הזמן" בטיקר — **שיווק-בלבד**, מצביע ל-`ComingSoonModal`, לא-פיצ'ר.
- **WHAT_IS_OPEN:** האם לאחד/לשיים-מחדש/להבהיר — Decision Register (סעיף חדש, לא-חוסם).
- **HUMAN_GATE:** צוריאל, לא-דחוף.
- **CANONICAL_HOME:** מפוזר (`JourneyPage.jsx`/`V2`/`RevelationAxis.jsx`/`TimelinePage.jsx`).
- **PROVENANCE:** Legacy-Reconciliation (21.8).
- **LAST_VERIFIED:** 2026-08-21.
- **STATE:** `LIVE`/`DB-LIVE` (כל הרכיבים) · `OPEN-HUMAN-GATE` (עיצוב-מחדש, לא-דחוף).

### WS-READ-COMPOSER — Unified Context Item Contract — **חדש-v5 (תיקון: לא UNKNOWN)**
- **WHERE_WE_ARE:** נמצא — **קיים כבר כ-DESIGN גמור**, לא UNKNOWN כפי שסומן-בטעות ב-Absorption-Matrix הקודם. `work_log 61c3ee2a` (15.8): "Read-Composer × R1 — Unified Context Item Contract".
- **WHAT_IS_DONE:** חוזה-קריאה מלא (`{bucket,context_type,resolved_person_id,via,confidence,owner_person_id,privacy_scope,status,class,is_fact,epistemic,source_ref,payload}`) + מיפוי מלא ל-14-שכבות-Research-Context (L1-L14) + policy לגזירת `is_fact`.
- **WHAT_IS_OPEN:** מפת-גזירה קבועה `(kind,status,owner_person_id)→{bucket,class,epistemic,is_fact}` ששני-הצרכנים (Web+WhatsApp) גוזרים-ממנה זהה — עדיין לא-נבנתה.
- **HUMAN_GATE:** אין-שער-דחוף — DESIGN בלבד, ממתין-ליישום.
- **DEPENDENCIES:** קשור-ישירות ל-`els-foundation-addendum.md` §8 ("Unified Context Item Contract") — **אותו-רעיון-בדיוק**, לא-כפילות.
- **CANONICAL_HOME:** work_log `61c3ee2a` (לא-קובץ נפרד).
- **PROVENANCE:** 15.8.2026.
- **LAST_VERIFIED:** 2026-08-21 (אותר תוך-כדי resolution של Decision #1).
- **STATE:** `DESIGN` (גמור, לא-מיושם).

### WS-RESEARCH-OBJECT-FRAMEWORK — מסגרת-העל של GPT — **חדש-v5**
- **WHERE_WE_ARE:** `docs/research-object-map.md`+`els-capability-map.md`+`els-foundation-addendum.md` (GPT, 17.8) — North-Star, 20-סוגי-Research-Object, Context בן-14-שכבות, AI-Navigator/Budget/Challenge-Mode. **מעולם לא-נספג ל-Master-State** (0 אזכורים מאומתים).
- **WHAT_IS_DONE:** קריאה-מלאה+cross-check הושלמו (21.8) — **אין סתירה** מול קנון-קיים; חופף-משמעותית ל-`WS-READ-COMPOSER` (14-שכבות ⇔ Unified-Context-Contract).
- **WHAT_IS_OPEN:** האם/איך-לספוג את המסגרת-הכללית (לא רק את החלק-ה-ELS-הספציפי, שכבר-נענה דרך `WS-ELS-CAPABILITY-AUDIT`) — ר' Gate #20 (Decision Register).
- **HUMAN_GATE:** צוריאל.
- **CANONICAL_HOME:** ענפי-GPT (לא-main).
- **PROVENANCE:** work_log `346ac96c`,`56f01027`,`bbed9a30`,`d5e02c7d`,`39dd51f7` (17.8).
- **LAST_VERIFIED:** 2026-08-21.
- **STATE:** `DESIGN` (ענף-בלבד) · `OPEN-HUMAN-GATE`.

---

## 🔮 מרשם העתיד (FUTURE REGISTRY) — **INCOMPLETE**
| תוכנית | מטרה | canonical home | dependencies | provenance | status |
|---|---|---|---|---|---|
| מרכז־הניהול + `WS-FEATURE-CONTROL` | ניהול Feature states ע״י צוריאל | Command Center | `WS-CC` (CC-1-target) | מפה + צוריאל | `FUTURE`/`DESIGN` |
| Meta Growth OS (24 שכבות) | הפיכת האתר למערכת־הפעלה | Master State + `CLAUDE.md` | Meta Graph API tokens | `CLAUDE.md` | `FUTURE` |
| פלטפורמת 6־דרגות + Credits + Academy | דרגות־גישה + מטבע | `platform_tiers_law` | `profiles`/RLS | `CLAUDE.md` | `FUTURE` |
| UGC / Collective Discovery | תרומת־תוכן קהילתית | `identity_architecture_law` | `community_hints` | `CLAUDE.md` | `FUTURE`/`DESIGN` |
| רב־לשוניות | האתר רב־לשוני | `content_translation_law` | `video-transcribe` | §15 | `FUTURE` |
| ELS `els_records` שלב ב׳ | ELS כמאגר־מחקר | ELS map | Finding Identity LIVE | `CLAUDE.md`/work_log | `FUTURE` |
| מסגרת Research-Object (GPT) *(חדש-v5)* | North-Star/AI-Navigator/Budget/Challenge | `WS-RESEARCH-OBJECT-FRAMEWORK` | Gate #20 | `gpt/research-object-map` | `FUTURE`/`DESIGN` |

## ⏸️ מרשם המושהים (PARKED REGISTRY)
| פריט | למה מושהה | provenance |
|---|---|---|
| סליקה / מנויים (Hyp Pay) | קרדיטים פעילים כחלופה; עשוי לחזור | `CLAUDE.md` |
| Human-Design/Tarot טבלאות *(חדש-v5)* | schema-בלבד, מכוון-נכון, `fn_human_design_gate`/`fn_tarot_sos` UNKNOWN-כשיטה | Legacy-Reconciliation |
| `number_series`/`number_products`/`digit_language`/`number_readings` *(חדש-v5)* | schema-בלבד, ממתין להכרעת `WS-NUMBER-LANGUAGE` | Legacy-Reconciliation |

## ✔️ הושלם / היסטוריה (HISTORY / COMPLETED)
| עבודה | תוצאה | provenance |
|---|---|---|
| נטרול רגרסיית־קורפוס | 🔀 מוזג · 🌐 חי · ✅ אומת | `f5834f44` |
| ELS Finding Identity Step 3 (DB) | 🚀 חי · ✅ אומת | `20260820023525` |
| γ + Universal Research Contract v1.0 → main *(עודכן-v5)* | 🔀 מוזג · 🌐 חי | `6b8160b4`,`3a09b8dd`,`c8d3672` |
| Master Roadmap v1→v4 קנוני + תיקון-header-drift *(עודכן-v5)* | 🔀 מוזג · 🌐 חי · ✅ אומת מול הבנדל-הפרוס | `0d247a1d`→`38a8f784`→`a757eeec`→`f375327f` |
| הקשחת אבטחה #8/#9/#10B/metatron/LATENT-A | 🚀 חי · ✅ אומת | work_log 19.8 |
| **ELS Full-Search-Space — D4 נבחר, Item1 grafted** *(חדש-v5)* | ✅ הוכרע ומומש טכנית; ממתין-Preview-בלבד | `cfc995ca`,`fdd94acd`,`542c7147` |
| **`/lab/els` Work-Area shell → main** *(חדש-v5)* | 🔀 מוזג · 🌐 חי (מעטפת אינרטית-מכוונת) | `3e77f15a`,`d245e5eb` |
| **ELS capability audit (85 יכולות) הופק** *(חדש-v5)* | ✅ נכתב; מענה-לצוריאל עדיין-פתוח | `fe4a3cef`,`e0a2247a` |

---

## 🧾 יומן ההחלטות (DECISIONS LOG)
| החלטה | מי / מתי | מה | מחליף | provenance |
|---|---|---|---|---|
| קורפוס קנוני (§17) | צוריאל · 18–19.8 | תורה 304,805, 0-based | קורפוס מזוהם 306,269 | §17 |
| תיקון־רגרסיה = Option A | צוריאל · 20.8 | נטרול in-place ב-main | ענף מחיקה (Option B) | `f5834f44` |
| γ שתי־שכבות | צוריאל · 20.8 | שתי שכבות + קישור־מחרוזת | §19-old | `7985e0ce` |
| ELS Finding Identity Steps 1–3 | צוריאל · 20.8 | זהות server-derived, INSERT-only | הקפאת Finding-Identity | `20260820023525` |
| Master Roadmap v1→v4 = מפת־העבודה | צוריאל · 20.8 | מסמך ניווט קנוני | — | `a757eeec` |
| חוק BUILDING/נראות + פורמט v4 | צוריאל · 20.8 | החוק + מודל־מצבים | פורמט v2/v3 | v4 |
| Universal Research Contract v1.0 | צוריאל · 20.8 | חוזה-על 18-סעיפים, תיעוד-בלבד | §19-old | §19-A/B |
| **ELS FSS: D4 קנוני, Item1 grafted-לתוכו, לא-נמזג-בנפרד** *(חדש-v5)* | צוריאל (מרומז דרך-אישור-ראשוני, 19.8) + מומש-טכנית ע"י CLAUDE | D4=superset מוכח; Item1=reference-בלבד | "שתי-חלופות" | `cfc995ca`,`fdd94acd` |
| **תיקון header-drift v4 → מוזג ל-main** *(חדש-v5)* | צוריאל · 21.8 ("אני ארצה שתמזג") | איחוד 2 נסיונות-תיקון | הכותרת-הסותרת-הישנה | `f375327f` |

---

## 🌿 מעקב הענפים (BRANCH TRACKER) — עודכן-מלא v5
| ענף | actor | העבודה | Work State | Branch State | main | deploy | verified | provenance | next action |
|---|---|---|---|---|---|---|---|---|---|
| `main` | צוריאל | production | `LIVE` 🚀 | 🔀 מוזג | ✅ | 🌐 ✅ | ✅ | `f375327f`→`3e77f15a`→`d245e5eb` | — |
| `claude/els-step3-identity` | CLAUDE | ELS Step 3 client | `BUILDING` 🏗️ | 🟡 מוכן־למיזוג | ❌ | ❌ | ❌ | `7045f7b3` | merge→deploy→verify (ACTIVE_NOW) |
| `claude/els-unified-merge` | CLAUDE | **מנוע-ELS-מאוחד (D4+Item1-graft+FORMS+WorkArea+ניקוי)** *(תוקן-v5, ראה DRIFT למטה)* | `BUILDING`🏗️/`PREVIEW`-מועמד | 🟡 מוכן־למיזוג | ❌ | ❌ | ❌ | `542c7147` | Human-Gate → Preview → main |
| `claude/els-work-area` | CLAUDE | D4 + FORMS + Work-Area (בסיס ל-unified-merge) | `SUPERSEDED`🗄️ *(תוכן, לא ענף)* | 🗄️ הוחלף | ❌ | ❌ | ❌ | `ce148f07` | ר' `els-unified-merge` — **הענף עצמו לא-נמחק/לא-נסגר-בגיט**, כל commits שלו הם אבות-קדמונים מלאים של `els-unified-merge`; ה-`SUPERSEDED` מתייחס לתפקיד-התוכן בלבד |
| `claude/els2-b45k5h` | CLAUDE | תיקוני-רגרסיה (על-main) + capability-audit + FSS-Item1 (superseded) | חלקי | 🗄️ (רגרסיה נספגה; היתר reference | ✅(חלקי, `f5834f44`) | — | — | `fb9c23ea`,`e0a2247a` | אין — Item1 לא-נמזג-בנפרד |
| `gpt/research-object-map` | GPT | מפת-מוצר zoom-out + ELS-capability-map | `DESIGN` | 🔨 בעבודה | ❌ | — | — | `7cc48889` | Gate #20 |
| `gpt/els-foundation-integration` | GPT | חוזה-שילוב-ELS | `DESIGN`, חלק-ELS `SUPERSEDED`(נענה) | 🔨 בעבודה | ❌ | — | — | `daabf497` | Gate #20 |
| `claude/raziel-capabilities-audit-h5k9ww` | CLAUDE | γ record + roadmap v2/v3 draft | `DONE`-חלקי (γ נספג ל-main בנפרד) | 🔨 בעבודה | ❌(תוכן-כן-נספג) | — | — | `7985e0ce`,`6c16e9b3` | אין |
| `claude/premium-research-audit-bzmjop` | CLAUDE | §19-old (הוחלף ע"י γ) | `SUPERSEDED` 🗄️ | 🗄️ נסגר | ❌ | — | — | `38eed658` | אין |
| GPT 3D-preview | GPT | Knowledge Universe | `BUILDING` 🏗️ | 🔨 בעבודה | ❌ | ❌ | ❌ | work_log 19.8 | preview בלבד |

**⚠️ DRIFT-CORRECTED (v5):** בגרסאות-קודמות `claude/els-unified-merge` תויג "נטרול מחיקה (Option B) SUPERSEDED" — **שגוי**. אימות-git ישיר (21.8) מראה ש-HEAD הנוכחי (`542c7147`) הוא **המשך-ישיר** של `els-work-area`(D4)←`fdd94acd`(Item1-graft) — כלומר **חבילת-המנוע-המאוחדת**, לא "Option B". הזהות/ענף המדויקים של "Option B" ההיסטורי (המוחלף ב-`f5834f44`) — **לא אומתו מחדש כאן ונשארים UNKNOWN**; לא הומצא ענף חלופי.

**כלל:** אין להסיק `LIVE` מקיום ענף; אין להסיק `DONE` מקיום commit — `DONE` דורש `✅ אומת`.

---

## 🚪 שערי־צוריאל פתוחים (OPEN HUMAN-GATES) — ממוספר-מחדש v5
1. ~~Roadmap v4 → קנוני~~ — **✅ נסגר** (`f375327f`, main, אומת מול הבנדל-הפרוס). הועבר ל-History.
2. **ELS FSS → Preview** — `claude/els-unified-merge`@`542c7147` (עודכן-v5, לא-עוד "D4 מול Item1" — זה הוכרע).
3. **ELS Step 3 merge + deploy + אימות** (ACTIVE_NOW).
4. **ELS Step 4** (`BLOCKED` עד #3).
5. **`corpus_id` תנ״ך.**
6. **`fn_els_search`** שחזור secdef/search_path.
7. **§17 אנומרציה + Master-State §18** (γ עצמה כבר-נספגה, ר' `WS-GAMMA`).
8. **admin_research_review** → תכנון.
9. **Command-Center CC-1-target** (עודכן-v5: 3 ארטיפקטים קיימים, לא "UI לא-התחיל").
10. **WS-FEATURE-CONTROL** שער תכנון+בנייה.
11. **Person F-1b** (OD-F9a/F9b/F8).
12. **חיווט Raziel** (`fn_raziel_turn`, `session_state`, L1-L14).
13. **יישום-UX Universal Research Contract** (עדיין `OPEN` per §19-D).
14. **רשומת-זהות OD-F10a שנותרה-בפער** (Change Log #26).
15. **4 שאלות ELS-capability-audit** *(חדש-v5)* — merge/גניזת `els-work-area`(נפתר-חלקית ב-v5, ר' #2) · רשימת-78-רשמית-חיצונית? · `SIGNIFICANT`/`DICT` כחוקים-מגורסים? · עמודות-provenance ל-`els_records` (GAP-5).
16. **Number-Language אימוץ/גניזה** *(חדש-v5)*.
17. **Name-Lab/Christina/Maftech פורמליזציה** *(חדש-v5)*.
18. **איחוד-5-מנגנוני-שיפוט** *(חדש-v5, תלוי ב-#9)*.
19. **`raziel_brain` — לאכלס או להסיר-תלות** *(חדש-v5)*.
20. **מסגרת Research-Object-Map — לספוג ואיך** *(חדש-v5)*.

## 🧬 עמוד־השדרה של התלויות (DEPENDENCY SPINE) — עודכן-v5
```
קורפוס (WS-ELS-CORPUS, LIVE) ── מוגן ע״י ── WS-ELS-REGRESSION (LIVE, f5834f44)
   ├── WS-TANAKH corpus_id ............................ OPEN
   └── WS-ELS-IDENTITY  «ACTIVE_NOW מועמד»
          Steps 1–3 DONE/LIVE (client BUILDING, פריסה ממתינה)
          Step 4 BLOCKED → KU-3D/Navigator/ELS-Matrix BLOCKED
WS-ELS-FSS (Decision #1 נפתר, PREVIEW-מועמד 542c7147) ── שער-Human-Gate ── WS-ELS-WORKAREA (shell LIVE, מנוע ממתין)
   └── WS-ELS-CAPABILITY-AUDIT (4 שאלות פתוחות)
WS-GAMMA (LIVE, main) ── יישום-UX OPEN ── WS-URC (OPEN) ── WS-RESEARCH-OBJECT-FRAMEWORK (Gate #20)
WS-SEC (LIVE) ── §18 enumeration OPEN
WS-RAZIEL (3-variants+WA-infra LIVE) ── חיווט-זהות OPEN ── L1–L14 DESIGN ── raziel_brain OPEN
WS-PERSON: F-1a′ LIVE ── F-1b BLOCKED
WS-KU3D (BUILDING preview) ── הפעלה BLOCKED
WS-CC (LIVE ×2 ארטיפקטים) ── CC-1-target OPEN ── WS-FEATURE-CONTROL FUTURE ── WS-JUDGE-UNIFICATION OPEN
WS-NUMBER-LANGUAGE / WS-NAMELAB / WS-TIME-DISAMBIGUATION / WS-READ-COMPOSER — עצמאיים, לא-חוסמים
מרשם העתיד (INCOMPLETE) · מרשם המושהים · הושלם/היסטוריה · SUPERSEDED (provenance)
```

---

## 📌 נקודת־בקרה לסשן (SESSION HANDOFF — כל התשובות מהמפה בלבד) — רענון-מלא v5
```
LAST_RECONCILED: 2026-08-21   SYNC: SYNCED (v5 עצמו DRAFT, לא-קנוני)

איפה אנחנו:        ELS Finding Identity כמעט שלם (client ממתין-לפריסה); ELS FSS Decision #1 נפתר
                   (D4+Item1-graft, מועמד-Preview מוגדר); v4 קנוני+מתוקן על main; /lab/els shell
                   עלה ל-main (מעטפת-בלבד, אינרטי-מכוון); URC+γ על main במלואם.
מה הושלם:          f5834f44(קורפוס) · Step3 DB 20260820023525 · f375327f(header-fix) ·
                   3e77f15a/d245e5eb(/lab/els shell) · cfc995ca/fdd94acd(ELS-FSS resolution) ·
                   6b8160b4/3a09b8dd(URC על main) · fe4a3cef/e0a2247a(capability-audit).
מה בבנייה:          Step3 client · claude/els-unified-merge(המנוע, ממתין-Preview) · GPT 3D preview.
מה מחכה:           Preview-אישור ל-els-unified-merge · 4-שאלות-capability-audit · CC-1-target ·
                   Number-Language/Name-Lab/judge-unification/raziel_brain/Research-Object-framework
                   (5 החלטות-v5 חדשות, כולן לא-חוסמות-זו-את-זו).
מה חסום:           Step 4 · KU-3D product · Person F-1b · תוכן-אמיתי ב-/lab/els (עד Preview-מנוע).
מה הצעד הבא:        (1) merge els-step3-identity→main (ACTIVE_NOW, ללא-שינוי). (2) בנפרד: אישור-Preview
                   ל-els-unified-merge@542c7147 (Decision #1, פתור-טכנית, ממתין-לשער-בלבד).
למה זה הצעד הבא:    שניהם כבר-מוכנים-טכנית ומאומתים; מה שחסר בשניהם הוא אך-ורק שער-Human-Gate.
מה אסור לבנות:      Step 4 · KU-3D product · Command-Center-UI-חדש (יש-כבר-2-חיים) · Feature-Control ·
                   F-1b · Raziel-wiring · זהות־תנ״ך · שום-קוד-נוסף ב-ELS-engine בלי-שער.
מה בעתיד:           Command Center+Feature-Control · Meta Growth OS · Platform-tiers+Credits+Academy ·
                   UGC · רב־לשוניות · ELS שלב ב׳ · מסגרת-Research-Object (FUTURE REGISTRY=INCOMPLETE).
אילו החלטות:        ראה יומן ההחלטות + Decision Register (v5, 9 סעיפים חדשים).
provenance:        main d245e5eb · Step3 client 7045f7b3 · els-unified-merge 542c7147 ·
                   capability-audit e0a2247a · γ/URC 6b8160b4/3a09b8dd.
ROADMAP:           קנוני על main = v4 (f375327f). v5 זה — DRAFT, ממתין לשער-קנוניזציה נפרד,
                   בדיוק כמו v3→v4.
```

---

## 🎯 Decision Register — v5 (הרחבת-A/B/C לשערים קיימים — **תיקון-מבנה:** אינו-מספור-עצמאי-נפרד. כל שורה = הרחבה של Gate-מספר-מ-OPEN-HUMAN-GATES למעלה, אותו-מספר-בדיוק, לא-שני-רישומים-נפרדים)
| Gate # | Decision | A/B/C | למה מהותי | מה משתנה A מול B |
|---|---|---|---|---|
| — | ~~ELS FSS D4/Item1~~ | — | **✅ נפתר בסשן זה** לפי provenance קיים (Gate-הקודם #1-הישן נסגר; שער-ההמשך = **Gate #2**, ר' שורה הבאה) | D4+Item1-graft = הקנון; `els-unified-merge`@`542c7147` = Preview-מועמד |
| **#2** | פריסת-Preview ל-`els-unified-merge`@`542c7147` | A=כן-עכשיו · B=לבקש-קודם בדיקת-קבלה-טרייה ל-graft · C=לא-עכשיו | ה-shell כבר-חי וממתין-לתוכן | A:תוכן-מיד. B:איכות-מאומתת-קודם. C:נשאר-אינרטי |
| **#9** | Command Center — איזה ארטיפקט = CC-1? | A=`WarRoomTab` · B=`RoadmapCommandCenter` · C=שלישי-לפי-מפרט | חוסם §12.0 | קובע-כיוון-בנייה |
| **#15** | 4 שאלות capability-audit (`fe4a3cef`) | ר' פירוט ב-`WS-ELS-CAPABILITY-AUDIT` | חוסמות עדיפויות 2-10 | תלוי-בשאלה |
| **#16** | Number-Language — לאמץ או לגנוז? | A=לאמץ+לתעד · B=`PARKED` | `number_anchors` כבר-רץ-ריק על כל דף-מספר | A:תוכן+חיווט. B:נשאר-ריק |
| **#17** | Name-Lab/Christina/Maftech — workstreams רשמיים? | A=כן · B=להשאיר-שקוף | חיים-בלי-ייצוג | A:נראים-לכל-audit. B:ממשיכים-להיעלם |
| **#18** | לאחד 5 מנגנוני-שיפוט? | תלוי-ב-#9 | כרגע נפרדים | קובע-היקף-CC-2 |
| **#19** | `raziel_brain` — לאכלס או להסיר-תלות? | A=לאכלס · B=להסיר | קוד-פרודקשן קורא-ומקבל-null | A:זהות-מרכזית. B:שינוי-קוד |
| **#20** | לספוג את `research-object-map.md` ל-Master-State? | A=מלא(§20) · B=רק-עקרונות(כמו §10.0) · C=לא-עכשיו | קובע אוצר-מילים-חדש (Research-Object/Axis/Cluster) | A:שינוי-גדול. B:תוספת-קטנה. C:נשאר-בענף |

> **הערה:** מספור-Gate הוא **המספור היחיד-הקנוני** לכל 8 ההחלטות הפתוחות. הטבלה הזו רק **מוסיפה עמודות A/B/C/למה/מה-משתנה** לשערים שכבר-קיימים ברשימת ה-OPEN HUMAN-GATES — היא **אינה** יוצרת סט-שני-של-מזהים.

---

**עיקרון־על:** המנוע מגלה ומארגן · **המפה מנווטת** · מרכז־הניהול מציג · `work_log` שומר provenance · **צוריאל מחליט** · שום דבר אינו הופך לקנוני/פעיל/משוחרר רק משום שסוכן ביצע אותו.

_v5 DRAFT — כתיבה מרוכזת אחת, per אישור-מפורש ("GO — WRITE v5 ONLY"). קנוניזציה (merge ל-main) היא Human-Gate **נפרד**, בדיוק כמו כל גרסה קודמת. אין merge/deploy/DB-write בכתיבה הזו. שינוי-Master-State הנדרש (למשל: §19 provenance-location, §17 אנומרציה) נשאר `PENDING` — לא בוצע כאן, כמבוקש במפורש._
