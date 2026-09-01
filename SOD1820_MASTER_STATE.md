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
15. **CONTEXT INTEGRITY / NO CONTEXT LOSS LAW** (`חוק חדש`, Human-Gate ZURIEL, 20.8.2026 — הבהרה ל-§19-B, ר' §19-C): לפני החלטה מהותית, סיכום ארכיטקטוני, שינוי Master/Roadmap, או הכרזה על CLOSED — הסוכן חייב **לשחזר את ההקשר המצטבר של הסשן** (Context Reconstruction), לא להסתמך על ההודעה האחרונה בלבד. חובה להפריד בין: **Architecture Decision · Contract · Feature · Example · Open Question · Build Task** — ולא לערבב ביניהם. **אין להניח שהנושא האחרון שנדון הוא מטרת-העל של הסשן.** אם קיים ספק לגבי רלוונטיות של הקשר קודם — לבצע Context Reconstruction לפני החלטה, לא אחריה. **אין להכריז על ארכיטקטורה/חוזה כ-`CLOSED`** כאשר קיימות החלטות ארכיטקטוניות רלוונטיות שטרם עברו Human-Gate.
16. **CANONICAL-OWNER POINTER CLARIFICATION** (`חוק חדש`, Human-Gate ZURIEL, 29.8.2026, `EXPERIENCE_GOVERNANCE_FOUNDATION_V1_CLOSURE`, ר' §23.17): סעיף 1 לעיל ("כל החלטה קנונית חדשה חייבת להירשם כאן") פירושו ש-Master State רושם **שהחלטה נפלה, מה מצבה-המאושר, והיכן חי הגוף הקנוני שלה** (rule_id ב-`nodes` / slug ב-`project_codex` / נתיב תחת `audits/`) — **לא** שכפול הגוף המלא של כל חוק/חוזה לתוך המסמך הזה. Operational Laws (`nodes type='rule'`) נשארים הבעלים הקנוני של גוף-החוק; חוזי-על ארוכים (`project_codex`/`audits/`, קנוניים ברגע ה-INSERT או המיזוג ל-`main`, ר' §23.17) נשארים הבעלים הקנוני של הנמקה-ארכיטקטונית; Master State מאנדקס את שניהם. **ההבהרה אינה משנה שום החלטה קיימת ואינה מורידה את Master State מסדר-הסמכות הקיים** — סדר-הסמכות העומד נשאר: live DB + `origin/main` + Master State זה **מעל** Roadmap (ניווט) **מעל** זיכרון-שיחה/סשן, כפי-שהיה תמיד.

> **סטטוס חוק-הניהול:** `APPROVED` + `CANONICAL` (החלטת צוריאל, 10.8.2026; סעיף 15 נוסף 20.8.2026). התוספת אינה משנה שום החלטה קיימת אחרת במסמך.

---

## 0-A. RESEARCH STUDIO v1 — ARCHITECTURE DECISION (24.8.2026)
> **STATUS: APPROVED by ZURIEL Human-Gate · MERGED to main via PR #187 (2026-08-24T05:05:07Z).**
> **🔵 עדכון 25.8.2026 (SSOT RECONCILIATION, branch `claude/relation-engine-v1`):** אומת ישירות מול GitHub — PR #187 `state=closed`, `merged=true`, `merged_by=zuriel337`. הסטטוס ההיסטורי "DOCUMENTED on Draft PR #187 · not merged" למטה נשמר כ-provenance (NO-DISAPPEARING-WORK); הסטטוס-החי הוא MERGED מ-24.8.2026 05:05 ואילך.
> provenance: `docs/research-studio-v1-contract.md`, `docs/research-universal-finding-contract.md`, work_log 24.8 actor=GPT, live verification of `ResearchProvider`/main + PRs #185/#186/#188.

### DECISION
SOD1820 מחזיק **Research OS אחד**: Reality Graph אחד, Research Workspace גלובלי אחד ו-Human Gate אחד. ELS, Gematria/Numbers, Cross, Verse, Entity/Person/Name, Reality Signals, research/posts ו-AI הם engines/sources/lenses בתוך אותו Research OS — לא מוצרים/עצי-אמת מקבילים.

ה-flow המאושר: **Discovery → Universal Findings → Investigation → Judgment**.
- `Clean ↔ Pro` הם presentation-depth של אותו state.
- Journey הוא workflow/history אוטומטי עם exact identity/restore, לא אפליקציה שלישית.
- Universal Finding שומר source-native identity + provenance; display/view metadata לעולם אינו identity.
- AI suggestions נכנסות כ-`candidate`; אין קידום אוטומטי ל-Finding/Fact/Canonical/Published.
- Numbers הם first-class graph entities; תוצאת שיטת-גימטריה וה-Number Entity אינם אותה identity.

### LAYERED / 3D FIRST-CLASS LAW
2D, Layered ו-3D/Depth הם projections/renderers של **אותו Research/Finding State**. אסור מנוע-3D, Matrix truth או Finding store מקביל. כל adapter חדש צריך לחשוף, כאשר טבעי למקור, stable anchors/relations/dimensions שמאפשרים projection ל-2D/Layered/3D. Depth semantics חייבים להיות מפורשים.

Performance: 2D+Focus/Fit הוא baseline זול; Layered/3D lazy/on-demand; large matrices מיועדות ל-viewport virtualization; חומרה חלשה/מובייל משנה renderer strategy בלבד, לא research truth/canonical data.

### GLOBAL WORKSPACE / STORAGE DECISION
`src/lib/research/ResearchProvider.jsx` הקיים הוא תשתית-ה-Workspace הקנונית להרחבה. `cart/saved/pinned/history/collections/journeys/mode` ו-cloud path דרך `research_items` נשמרים. חוזה Universal Finding **אינו** מאשר טבלת `findings` או Context/Store מקביל.

**חידוד (actor=CLAUDE, 24.8.2026, לפני מיזוג #187):** האחסון אינו בעיה בינארית — שלושה בתים קיימים, כל אחד עם תפקיד נבדל: (1) מנוע/DB מקור-נטיבי = מקור-האמת לטענה שלו; (2) `research_items` = חברות-ב-Workspace בלבד (cart/save/pin/Journey-reference); (3) `research_objects` (כולל `engine_verified`/`engine_detail` מ-Research DNA v1 §1) = טענת-מחקר-עמידה (evidence/claim/interpretation). ה-Universal Finding הוא מעטפת+refs לשלושת הבתים, **אינו** בעל-בית רביעי — **אסור יצירת שורת `research_objects` אוטומטית לכל Finding**; רק פעולת-workflow מפורשת מקדמת Finding ל-evidence/claim/interpretation. **Research Context אינו בעל-אחסון חדש** — חוזה לוגי (inquiry/scope/Findings-פעילים/Dimensions/Lens/Journey-position) שעשוי להפנות ל-`research_objects`/`person-ref`/מספר/נושא, אך אינו ממופה אוטומטית לאף טבלה. פרטים: `docs/research-universal-finding-contract.md` §1/§18.

### PRIORITY DECISION
`ACTIVE_NOW` עובר ברמת-הניווט ל-**Research Studio Foundation**. `WS-GEMATRIA-CORPUS-PACKAGES` אינו מבוטל ואינו SUPERSEDED; הוא נשאר workstream יסודי/תלות ומתחבר כ-Number/Gematria source לתוך Research Studio. סדר הבנייה המאושר: Universal Finding → Global Workspace → ELS Lens integration → Number/Gematria Adapter (דף-מספר: H2 היברידי, `NumberDNA`→"🧬 צירי ההתכנסות"/`NumberConvergences`) → **Topic/Convergence Adapter (נפרד מ-ELS, מפנה בלבד ל-`topic_card_id`/convergence `node_id` קיימים)** → Discovery adapters (כולל Person self-scope ו-Name/NameLab — נבדלים זה-מזה, Name Journey ≠ Person/Life Journey) → Findings Workspace UX → Judgment Surface (השלכת Gate #18/§20, לא pipeline שביעי) → legacy capability reconciliation (כולל Name Journey החי) → Depth/Research Universe.

### IMPLEMENTATION STATE (24.8)
- PR #185: merged/main — ELS state + Matrix + 2D/Layered/3D + Verse integration.
- PR #186: BUILDING/DRAFT — exact Journey + Focus/Fit + add-Finding cross bridge.
- PR #187: **MERGED to main (2026-08-24T05:05:07Z)** — architecture + Universal Finding contracts (היסטורי: היה DOCS/DRAFT בזמן-הכתיבה המקורי של סעיף זה; מוזג-בפועל מאז, ר' עדכון-25.8 בראש הסעיף).
- PR #188: BUILDING/DRAFT stacked on #186 — Universal Finding adapter over existing ResearchProvider + explicit `📌 למחקר`.
- No merge/deploy to main is authorized by this Master-State entry itself.
- **🔵 עדכון 25.8.2026:** Numeric Root Finalization + Relation Engine v1 נבנו-ואומתו-חי על ענף נפרד (`claude/relation-engine-v1`), **אחרי** מיזוג #187 — `fn_number_lookup` (atomic+composite) ו-`fn_relation_candidate` הם עכשיו callable path קנוני וקיים ל-Number/Gematria adapter. ר' §21 למטה לפירוט המלא.
- **🔵 עדכון-נוסף 25.8.2026 (v5.3 RECONCILIATION — סטטוס-מיזוג מתוקן, אומת חי מול `origin/main`+`work_log`):** השורה שמעל ("`BUILDING`🏗️/ענף-בלבד — לא-מוזג/לא-פרוס") הייתה נכונה-לרגע-כתיבתה אך **התיישנה תוך אותו יום** — `claude/relation-engine-v1` **מוזג בפועל** ל-`main` דרך **PR #190** ("Numeric Root + Relation Engine v1"), ולאחריו גם **PR #191** ("ELS direction identity, Geometry Contract, FORMS, Research Journey") ו-**PR #192** ("Number Page Integration v1") — כולם `merged=true`, כולם מאוחדים ל-`origin/main` (מאומת: `git log origin/main`, ו-`work_log` "Merge to main, Deploy, Smoke-Test", 25.8.2026 04:12-04:41). טקסט-ה-"לא-מוזג" ההיסטורי **נשמר כפי-שהוא למעלה** (NO-DISAPPEARING-WORK) — הסטטוס-בפועל מ-25.8.2026 04:12 ואילך הוא `MERGED`+`DEPLOYED`. ר' §22 למטה לפירוט המלא של סבב-הריכוך.

### NEXT ACTION (היסטורי, 24.8.2026 — נשמר; ר' NEXT ACTION מעודכן מיד למטה)
Human Preview #188 → verify canonical Number/Gematria callable path → add Number/Gematria adapter. Do not build a parallel Workspace/Graph/engine and do not calculate gematria from memory.

### NEXT ACTION (מעודכן 25.8.2026)
**Number Page Integration v1 / Research Studio wiring.** ה-callable path הקנוני של Number/Gematria **כבר קיים ומאומת-חי** (`fn_number_lookup` מורחב + `fn_relation_candidate`, §21) — הצעד-הבא הוא לחבר אותם כ-Number/Gematria Adapter בתוך Research Studio Foundation (H2 היברידי בדף-המספר), במקביל להמשך Human Preview #188. אין-בנייה-בפועל של UI/`EntityPage.jsx` בלי-שער-נפרד; אין-מיזוג/פריסה של `claude/relation-engine-v1`/`claude/numeric-root-finalization` בלי אישור-מפורש-של-צוריאל.

### CHANGE LOG ENTRY — 24.8.2026
- **מה השתנה:** Research Studio v1 + Universal Finding + Layered/3D first-class + ResearchProvider reuse + priority order documented in §0-A and Roadmap v5.2 candidate.
- **למה:** Human-Gate ZURIEL approved the architecture; live state after PR #185 and Drafts #186/#188 made Roadmap v5.1 stale.
- **מה הוחלף:** navigation-level `ACTIVE_NOW=WS-GEMATRIA-CORPUS-PACKAGES` is superseded by `WS-RESEARCH-STUDIO-FOUNDATION`; the corpus workstream itself is preserved as a dependency/source, not deleted or superseded.
- **סטטוס:** `APPROVED` architecture/priority decision · `DOCUMENTED` on Draft PR #187 · product code remains `BUILDING` on Drafts #186/#188 · no merge/deploy implied.

### CHANGE LOG ENTRY — 24.8.2026 (actor=CLAUDE, correction pass on Draft #187, pre-merge)
- **מה השתנה:** תוקנו/הורחבו על Draft #187 בלבד (docs, `main` לא נגעה): (1) אחסון = שלושה-בתים מפורשים, לא בעיה בינארית, ואוסר יצירת `research_objects` אוטומטית לכל Finding; (2) Research Context הוגדר כחוזה לוגי ללא בעל-אחסון; (3) Topic/Convergence קיבל מיפוי-adapter נפרד מ-ELS; (4) H1 (`NumberDNA`→"🧬 צירי ההתכנסות"/`NumberConvergences`) ו-H2 (טופולוגיה היברידית בדף-מספר) שולבו במפורש בטקסט הבנייה; (5) נחקר ואומת "Name Journey" (NameLab/`fn_name_protocol`, חי ב-`/name-lab`) כיכולת אמיתית שלא נכללה קודם — נוסף כמיפוי-adapter נפרד (`kind="name"`), מובחן מ-Person/Life Journey, ללא re-design של הקוד החי.
- **למה:** צוריאל אישר את ה-reconciliation "עקרונית" וביקש שלושה חידודים לפני patch (storage roles, H1, H2 hybrid), ואז עצר את הביצוע עוד פעם כדי לוודא ש-Name Journey לא נבלע/אבד מול Person/Life Journey.
- **מה נבדק ולא שונה:** PR #188 לא נגעה; אין קוד מוצר/DB/schema/merge/deploy בפעולה זו.
- **סטטוס:** `DOCUMENTED` on Draft PR #187 (branch `gpt/research-studio-v1-contract`) · עדיין ממתין למיזוג-Human-Gate ל-`main`.



---

## 1. רישום השיטות — `gematria_methods`
> **⚠️ סעיף זה = תמונת-מצב מ-10.8.2026 (STALE, נשמר per NO-DISAPPEARING-WORK).** מאז נוספה שורה אחת (אי"ק בכ"ר/AIQ BEKAR, 24.8.2026) → **24 רשומות** נכון ל-25.8.2026, וה-Registry קיבל 11 עמודות-dependency-metadata נוספות + 4 ה-Composite rows עברו `premium→public`. **ר' §21 למטה למצב-המעודכן-המלא ולמקור-הראיות.**
- **`EXISTING` · Registry קנוני קיים של 23 רשומות (10.8.2026; 24 נכון ל-25.8.2026, ר' §21)** (base 14 · depth 9). זהו מקור-האמת לשיטות. **לא נבנה Registry מקביל.**
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

**11.34 Discovery-Gate = שער-החלטה, לא שער-ראות (חוק-על):** `research_objects` **אינו תנאי** להופעה במפקדה. המפקדה מציגה את **כל** החומר לאורך כל מחזור-החיים — כולל RAW/לא-מנותח — עם סטטוס גלוי: `INCOMING/RAW · EXTRACTED · CALCULATED · CROSSED · PATTERN · CANDIDATE · JUDGMENT · APPROVED · PUBLISHED` + `REJECTED · UNVERIFIED · UNKNOWN`. **שום אוצר לא נעלם רק כי טרם-Discovery.** פורום: `פוסט → כל-תגובותיו → מי/מתי/טענה/אימות-מנוע/מספרים/הצלבות` — נראה גם בלי `research_objects` (יניב-בתגובה = קלט-מחקר בפני-עצמו, לא metadata). WhatsApp/צופן: הקלט נראה + **«איפה נעצר»**. השער קובע מה מתקדם ל-Discovery/Canonical — **לא** מה מותר לראות. **המפקדה = מפקדת-כל-האוצר-והמחקר; Discovery = שלב אחד בתוכה, לא הגדרתה** (חידוד §11.17-11.18).

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

### §12-B. מפת-תקיעות-הקלט + «הקיר-האחד» (מיפוי-קוד READ-ONLY · 11.8.2026)
> **מסקנה:** התשתית בנויה ~90%. יש **קיר מבני אחד** שבו כל מקור-שרת נתקע לפני השער.
- **🧱 הקיר האחד:** בדיקת-קוד — **אף אחת מ-29 פונקציות-הקצה לא כותבת `research_objects`** (0 אזכורים ל-`research_objects`/`fn_persist_discovery`). הכותב היחיד = הדפדפן (`deepAnalysis.persistDiscoveries`→`fn_persist_discovery`, source='discovery-engine', H-1). לכן **WhatsApp/גלריה/חדשות/צופן/פוסט — כולם נתקעים לפני המנוע.** המינימום-היחיד-שפותח: קריאת-שרת משותפת ל-`fn_persist_discovery` (מ-`wa-process` ומכל feeder).
- **📱 WhatsApp — config-driven אך רדום:** קבוצות = טבלת `wa_bot_config`(group_id,enabled) → קבוצה חדשה = **נתון בלבד, בלי קוד** ✅. אבל: תמונות **לא** נשמרות ל-`gallery_images` (OCR-טקסט בלבד); מספרי-OCR לא מוזנים לגימטריה; `wa-process` **כן מחשב הצלבות בין-שיטתיות** אך הפלט → `channel_updates`/מאגר-מילים, **לא** `research_objects`. **⚠️ דגל-חַיּוּת:** `wa_vip_inbox` אחרון 3.7 · `wa_deep_queue` 5.7 (היום 11.8) → **קליטה נראית רדומה ~5 שבועות** (UNKNOWN: cron/חברות מספר-הגרין).
- **👤 כתבים-מועדפים = תשתית קיימת:** `wa_vip_senders` (5: שמעון-חיימוב · צבי · כריסטינה · יסכה · יצחק-שחר-קנדרו) — provenance+priority. חסר: הוספת-שמות (יניב-לוי = כותב-פוסטים, **לא** שולח-WA) + ניתוב-VIP→מנוע.
- **🗺️ סטטוס לפי-שלב:** קבוצה→מאזין=`EXISTING` · טקסט=`PARTIAL` · שרשור=`UNKNOWN` · תמונה=`PARTIAL`(לא-נשמרת) · OCR=`EXISTING` · שפה=`PARTIAL`(לא-מנותב-אוטו; המערכת קיימת) · מספרים=`PARTIAL` · גימטריה/הצלבה=`EXISTING` · **→`research_objects`=`MISSING` (הקיר)** · Human-Gate=`EXISTING`. News=`MISSING`(אין edge; 11 ידני). פוסט-parser=`MISSING`. תגובת-אתר=`PARTIAL`. צופן→Seed=`PARTIAL` (ערך-בודד crossable; אין feeder).
- **🤖 Agents→Adapters (מסקנת Q11):** קיימים כבר ~6 סוכני-wa (`wa-raziel/michael/hatishbi/gabriel/uriel/mora`)+`field-router`+`number-researcher` — **יותר-מדי.** קנון: **1 מנוע · 1 שער · 1 סוכן-שיחה (רזיאל) · מטטרון=ניטור · שופט=צוריאל+`admin_research_review`.** WhatsApp/News/Gallery/Post/Cipher = **Adapters/Workers/Pipelines (feeders), לא Agents.**
- **מינימום-פתיחה (סדר-תשואה):** (1) דלת-שרת→`research_objects` מ-`wa-process` · (2) adapter תמונה→גלריה + מספר→Seed · (3) EN→מערכת-השפות · (4) parser פוסט/תגובה · (5) news adapter · (6) אימות WA-חי. **הכול מיפוי — טרם-בנייה, על-אישור-נפרד (§11.28).**

### §12-C. מפת-קליטה-חיה (עובדות מאומתות-DB · READ-ONLY · 11.8.2026)
> נעול כ**עובדות** בלבד (לא החלטות). הליבה:
- **דלת-המנוע:** הכותב-היחיד ל-`research_objects` = `fn_persist_discovery` (דפדפן, H-1). 81 שורות `wa-raziel` = **הכנסה חד-פעמית 23.7–5.8 שנעצרה** → **אין feeder-שרת חי.**
- **WhatsApp:** `wa_bot_config` = 3 שורות **כולן `enabled=false` (כבוי)**; מחקר-קבוצות אחרון 13.7; `wa_vip_inbox` (שמעון, 41, text+image, **`numbers=0`**); `wa_deep_queue` 102 `done` (5.7); טיקרים `torat-haremez`(1030)/`gilui-yomi`(105) חיים = **פלט**, לא קליטה.
- **פורום:** `research_contributions` 339 (**248 `gematria_claim`**); יניב-לוי 35 (אחרון היום; claim מובנה + `engine_verified_layers` + `needs_investigation` = Fact≠Claim **כבר מיושם**); הפוריים (ציון 120·צבי 44·יניב 35·שמעון 15) → **0 בגרף, 0 במנוע**; רק ~17 הגיעו לגרף (`ConvergenceWizard`).
- **גלריות:** `all_values`(int[]) חילוץ-OCR **עובד**; 2701=בראשית ברא אלהים (208 קשתות, הכי-מחובר).
- **פוסטים:** אין parser-מספרים (`raw_gematria` = ייבוא DOCX, לא-מפוסט).
- **מסקנה:** ~90% (מנוע/OCR/שפות/claim-מאומת/שער/הקרנה/אגרגטור) **קיים**; החסר = **חוט אחד** (דלת-שרת→`fn_persist_discovery`) + adapters דקים. **אין צורך בסוכן חדש** — הקיימים (רזיאל/gabriel/uriel/gallery-ocr/ContribMod/ConvergenceWizard) מספיקים.

---

## §13. CC-1 SPEC — «חדר המפקדה» View קורא-בלבד (מאושר · נעול 11.8.2026)
> **מהות:** מפקדת-**כל-האוצר** (לא מפקדת-Discovery). View/Control-Center מעל המידע הקיים. `status`: מפרט=`APPROVED` · מימוש=`READ-ONLY`/טרם-בנייה (על-אישור-נפרד).

**13.1 שני מרחבים:** 🔴 **«עכשיו»** (נכנס/מתעורר — `wa_bot_log`/`wa_vip_inbox`/`research_contributions`/`posts`/`gallery_images`/`discovery_events` + `getHotNumbers`/`computePulse` + Pattern-Lab) · 🗂️ **«כל-האוצר»** (בורר: כתב/קבוצה/פוסט/תגובות/גלריה/WhatsApp/צופן/שפה/מספר → **כל-חומר-הישות, היסטורי+טרי** + «עובד/מחכה»).

**13.2 מסלול-חומר (לכל פריט):** `מקור → חילוץ → גימטריה → הצלבות → Pattern → רזיאל → שיפוט → גרף → פרסום`, כל שלב 🟢 הושלם · 🟡 חלקי · ⚪ לא-נבדק · 🔴 נעצר. **כל מצב נגזר מנתונים קיימים** (`all_values`/`gematria_claim`/`engine_verified`/`convergences`/`research_objects`/`nodes-edges`/`channel_updates`) — 🔴 = חומר-מחושב-שלא-התקדם («איפה נעצר»). אפס מנוע/סוכן חדש.

**13.3 עדשת-כתבים (VIP=עדיפות, לא-אמת):** כל-חומר-הכותב מאוחד בין-מקורות (יניב/שמעון/ציון/צבי/יצחק + עתידיים) — `research_contributions.author`+`posts.author`+`wa_vip_senders`+`wa_vip_inbox.sender`. אותו-שם בכמה-מקומות = אותו כותב.

**13.4 שכבות:** 🤖 רזיאל=הבנה+הצעת-תבניות (לא-שופט) · 🕸️ מטטרון=תמונת-על (לא-שופט) · ⚖️ שופט=Human-Gate יחיד (`admin_research_review`+`ConvergenceWizard`, לא שער-שלישי) · 👤 צוריאל=מחליט.

**13.5 חוקים:** `HOT≠TRUE · VIP≠TRUE · Claim≠Fact · Interpretation≠Fact` · Rank-Don't-Hide · שום-חומר-לא-נמחק (◻️ «לא-נעלם»: UNKNOWN/UNVERIFIED/REJECTED/WEAK נגישים).

**13.6 מסלולי-מעבר:** פריט→«חקור»→`/number/:n` (§10.4, לא-נוגעים)→«בעץ» (`getNumberGraph`) · מועמד→⚖️→canonical/גרף→📝 Publication-Queue (יעדי-פרסום קיימים; CANONICAL≠PUBLISHED).

**13.7 קיים-להציג:** `admin_command_center`·`getHotNumbers`·`computePulse`·`getRealityHints`·`getPostsFromSupabase`·`getAllContributions`·`getGematriaByValue`·`getConvergenceForValue`·`getNumberGraph`·`getGraphBridges`·`getDiscoveries`·`getAiAnalysis`·`admin_research_review`·`research_items`. **חסר (למען View):** (1) read-RPC אחד (SECURITY-DEFINER, **בלי כתיבת-נתונים**) לחשיפת טבלאות-WA השרת-בלבד · (2) client-wrapper ל-`admin_research_feed` · (3) הרכבת-View (`discovery.js` טיוטה).

**13.8 🔒 20 גבולות-הברזל של CC-1 (נעולים):** (1) לא מאגר-חדש · (2) לא Discovery-Engine-חדש · (3) לא Source-of-Truth-חדש · (4) רק View/Control-Center מעל הקיים · (5) `research_objects`=שכבת-זיכרון-Discovery (ללא-שינוי) · (6) Knowledge-Graph=הגרף-הקנוני · (7) `EntityPage`/§10.4 ללא-שינוי · (8) רזיאל=הבנה, לא-שופט · (9) מטטרון=תמונת-על, לא-שופט · (10) השופט=Human-Gate-יחיד · (11) צוריאל=המחליט · (12) שום-חומר-לא-נמחק (חלש/לא-מאומת/UNKNOWN) · (13) HOT≠TRUE · (14) VIP≠TRUE · (15) Claim≠Fact · (16) Interpretation≠Fact · (17) CC-1 לא מקדם ל-canonical · (18) CC-1 לא מפעיל H-1 ולא פותח-הקיר · (19) CC-1 לא בונה feeders · (20) CC-1 לא משנה מנוע-גימטריה. **חומר לפני-`research_objects` נראה במפקדה** (§11.34).

**13.9 היקף:** CC-1=View קורא-בלבד (+read-RPC אחד, על-אישור-WRITE נפרד). פתיחת-הקיר (`fn_persist_discovery` מצד-שרת)=**CC-2**. adapters (פוסט-parser/חדשות)=**CC-3+**. **הבא:** מפרט-בנייה-טכני (קומפוננטות·helpers·read-RPC·שאילתות·הרכבה·ביצועים·מניעת-כפילות·ייצוג-מסלול) → עצירה לאישור לפני WRITE.

---

## §14. הרחבות קנוניות (11.8.2026) — 4 חוקים שנוספו לפני CC-1
**14.1 ציר-רביעי «My Preference» (Personalization):** המערכת תלמד לאורך-זמן מה צוריאל בוחר/דוחה/מעמיק/מסמן-בזבוז — ומשפיעה **רק על סדר-הצגה/המלצות.** **`Preference ≠ Truth ≠ Evidence ≠ Canonical`.** ארבעה צירים נפרדים: `Evidence (מה-אומת) · Interest (כמה-מעניין) · Operational-Status (איפה-נעצר) · My-Preference (מה-אעדיף-לראות-קודם)`. רזיאל יכול לומר «אתה נוטה להעדיף הצלבות-חוצות-שיטות» — **לעולם לא** «זה נכון כי צוריאל מעדיף». **ב-CC-1 לא בונים מנוע-למידה/DB — רק לא חוסמים אותו ארכיטקטונית** (ציר-Preference כ-hook ניטרלי).

**14.2 רב-לשוניות = ציר-מרכזי (לא טאב-צדדי):** אנגלית/שפות = חלק-מהאוצר. מסלול: `SOURCE→EXTRACTION→LANGUAGE→GEMATRIA/METHODS→CROSS→PATTERN→RAZIEL→HUMAN-GATE→GRAPH→PUBLICATION` — **אותו מנוע/שער/גרף, רק source/language/provenance שונים.** **`תרגום ≠ תעתיק ≠ ערך-משותף ≠ משמעות`** — לא לאחד; לשמור **מקור-אנגלי לצד מקור-עברי** (לא להחליף); provenance מלא «מה-מהמקור ומה-נוצר-בתרגום». (`language_links.relationship_type`: shared_value/translation/transliteration/parallel.)

**14.3 צופן/סדרות = Seed לאותו מנוע (עתידי, לא סוכן חדש):** `סדרת-מספרים → Seed → שיטות → הצלבות → שפות → רזיאל → Pattern-Lab → Human-Gate`. כבר היום CC-1 יכול להראות מה נמצא סביב סדרה (ערך-בודד crossable), גם לפני אוטומציית-צופן מלאה. **לא DB/מנוע נפרד לצופן.**

**14.4 ריסון-סוכנים (חוק):** רזיאל=הבנה · מטטרון=תמונת-על · שופט=Human-Gate · Workers-קיימים=משימות. **סוכן חדש רק אם יש תפקיד אמיתי שאף קיים לא ממלא.**

**14.5 סדרי-עדיפויות (צוריאל, 11.8.2026):** `P1` כל חומרי-המקורות למפקדה (כתבים·תגובות·WhatsApp·קבוצות·VIP·פוסטים·חומר-מחושב-שלפני-השער) · `P2` תשתית אנגלית/רב-לשונית · `P3` צופן/סדרות→Seed · `P4` חדשות/חיצוני. **HOT/Rank לא משנים את סדר-העדיפויות — Rank עוזר לבחור *בתוך* חומר שכבר בחרתי לראות.**

---

## §CC-2. COMMAND CENTER RESEARCH LAYER — מחקר-ניווטי מעל CC-1 (14.8.2026)
> הרחבת §11/§13: הפיכת CC-1 (View קורא-בלבד) לשרשרת-מחקר-ניווטית **מעל המנועים הקיימים** (reuse-first, אין מנוע/גרף/טבלה/מערכת מקבילה). מקור-מלא: `docs/planning/master_v_next_draft.md` + `work_log` (14.8) + חוזי `docs/planning/*`. **הפרדה קשיחה: branch ≠ main · build/test ≠ deploy ≠ live-verified · המלצה ≠ החלטה · FUTURE ≠ roadmap-מחייב.**

**§CC-2.0 · עקרון-המחזור (`CONTRACT`):** `RESEARCH → DECISION → MASTER → SESSION CLOSURE → IMPLEMENTATION`. **ה-Master = נקודת-המעבר בין מחקר לביצוע — לא רשימת-משימות שצריך לסיים כולה.** מחזור-ביצוע חדש מתחיל מ-Master, לא מזיכרון-סשן. **OPEN אינו BLOCKER** (מתועד עד הכרעה עתידית).

**§CC-2.1 · FACT (`EXISTING`/`IMPLEMENTED`; אומת ב-unit/build/render-harness — לא live):**
- F1 P1 Information Request (`inforequest.js`, state-machine + reuse `research_items`, unit 23/23). · F2 P2 Field Package read-model (`fieldpackage.js`, מפת-מצב + selfBridge, לא-מצמצם-ragil, agnostic ל-21 שיטות, unit 24+11). · F3 P2-UI ב-`WarRoomTab.DetailPanel` (render-harness). · F4 P2.5 ניווט→`/number/:phrase` הקיים + selfBridge «1020(רגיל·גדול)⇄1820(מילוי)». · F5 GAP-1/1A method-aware nav (`ccnav`+באנר+עדשת-cross+src-link, ccnav 13/13). · F6 GAP-2 cross דטרמיניסטי-חינם נפרד מ-AI (cross_no_ai 9/9). · F7 GAP-3 `projectCompoundFinding` read-model (compound 13/13 על «נאות מדבר(703)+אליך(61)=נאות דשא(764)»). · F8 Edge `field-pack` wrapper אדמין-gated (§CC-2.5/2.6). · F9 108 tests + `npm run build` ✓. · F10 תשתית-קיימת: `gematria_methods`(23) · `fn_gematria_pack` tokens:0 · `convergences` 8,917 FROZEN · CC-1 (§13) · `raziel_*`/`wa_vip_inbox`/`research_items`.

**§CC-2.2 · DECISION (החלטות מפורשות של צוריאל):** D1 מסלול P1→P2→P2-UI→P2-server→P2.5 (reuse-first). · D2 P2-server = **Option ב (Edge wrapper)**. · D3 GAP-1 (method-aware via query) · **GAP-2 Option A** · **GAP-3 read-model בלבד**. · D4 GAP-1A (תוכן מתועדף להקשר-שיטה; `src`→קישור-חזרה כשיש URL). · D5 מנוע-עמוק (Sonnet)=2/יום לכולם. · D6 **AI חינמי/Claude/Gemini/deep נשארים פעילים** (ניסוי+למידה) — לא לבטל; Premium=Future. · D7 אין P3 עדיין; לעצור-ולהחליט. · D8 (12.7) declutter. · D9 **OPEN אינו BLOCKER ל-Master**.

**§CC-2.3 · CONTRACT / RULE (`CANONICAL` — כללי-עבודה שאושרו):** C1 `handled`≠finding-status («סיום בדיקה»≠«אישור ממצא»). · C2 Information Request: תשובת-אדם=**RAW pointer**, לא Fact-אוטומטי; Request≠Finding≠Fact; owner-scoped. · C3 Field Package=**read-model** (אין מערכת מקבילה). · C4 **expression×method×value** (לא expression→value); selfBridge; אין צמצום-ragil; method-count-agnostic. · C5 cross-resonance=דטרמיניסטי-חינם, נפרד מ-AI (עובדה-חינם לא נעולה מאחורי AI-בתשלום). · C6 Compound: equality/sum כממצא-אחד; **arithmetic-verification ≠ gematria-verification**; claim≠Fact; interpretation isFact:false. · C7 Human-Gate: AI מציע, צוריאל מחליט; Field Package לא מקדם/מפרסם/שולח. · C8 חוק-עלות: DB/engine קודם; AI=פרשנות בלבד; עובדות-מנוע=0 tokens. · C9 `field-pack`: שער-אדמין בצד-שרת (mirror `wa_admin_reply`); פלט verbatim; לא-כותב/לא-מקדם. · C10 method-aware nav=provenance/lens בלבד; המספר נשאר צומת קנוני; לא משנה משמעות ולא הופך ל-Fact. · C11 עקרון-המחזור (§CC-2.0).

**§CC-2.4 · IMPLEMENTED (`IMPLEMENTED` — ענף `claude/raziel-capabilities-audit-h5k9ww`; לא-main, לא-deployed-frontend, not-live-verified):** commits `72affa3`(P1) `d0c91a0`(P2) `8dc266a`(P2-UI) `fffd965`(field-pack source) `752a23f`(agnostic-test) `8f2308b`(GAP-1) `c404ceb`(GAP-2) `fb72b86`(GAP-3) `47f4363`(GAP-1A+src+cross-test) + docs. **מאומת מול origin/main (READ-ONLY, 14.8): קבצי-CC ABSENT-on-main; הענף NOT-in-main.**

**§CC-2.5 · DEPLOYED (רק מה שנפרס):** Edge `field-pack` v1 → **Supabase (ACTIVE, verify_jwt=true)** דרך MCP (לא git-main). **Inertness:** ה-frontend הקורא לו על branch/לא-main ⇒ production-frontend אינו קורא לו (אינרטי למשתמשים). **לא-נפרס:** כל ה-UI/frontend (דורש Vercel-preview שלא בוצע). **DB/canonical: 0 שינוי** (0 migration · 0 canonical-write; `research_items` bucket='info_request'=reuse, 0 רשומות נכתבו).

**§CC-2.6 · LIVE-VERIFIED (רק מה שנצפה חי):** Edge `field-pack` — **deny-paths בלבד (curl בפועל):** no-auth→401 · anon-key→`{"error":"unauthenticated"}` · OPTIONS→200. **⛔ NOT live-verified:** `field-pack` admin-success (אין JWT-אדמין — unit 7/7 בלבד) · כל ה-UI/frontend (0 ריצה-חיה). **אין שום פריט-frontend ב-LIVE-VERIFIED.**

**§CC-2.7 · OPEN (`OPEN` · מתועד · לא-מוכרע · לא-BLOCKER):** O1 האם P3 נחוץ ומה ממנו. · O2 תצוגת Compound Finding (GAP-3 display). · O3 GAP-1A — עדשת-cross מספיקה או סינון-תוכן-מלא. · O4 פערי-אגנוסטיות legacy (קליטה value-centric · אחסון `gematria_words` wide · client METHODS hard-coded). · O5 live-verify (Vercel preview) + מתי (אם) merge ל-main. · O6 `gematria_methods`=Registry-רשמי? · lifecycle · convergences↔graph · deploy publicIdentity.

**§CC-2.8 · FUTURE / STRATEGY (⚠️ לא-קנון · לא-roadmap-מחייב · לא-דרישה):** FUT-1 Premium AI Analysis (ידע-משולב+שמות+תאריכים+מספרים+המרות-תאריך-למילים+צירופים+הצלבות; עד אישור-תכנון). · FUT-2 Field Map/מפה-רוחנית (אדם·זמן·רמזים·מספרים·אירועים; לא-מאושר-לבנייה). · FUT-3 Raziel outward — תשתית קיימת ורדומה (`raziel_*`,`enabled=false`) **≠ הפעלה** (הפעלה=החלטה-עתידית). · FUT-4 P3 thread-stitching (proposed). · FUT-5 אנגלית/אנגרמות/ELS/ציר — לא-לחסום בלבד. · FUT-6 H-2..H-5 (§10.6/§CL#13; אישור-נפרד לכל stage).

**§CC-2.9 · REJECTED / DEFERRED:** REJ-1 GAP-1 Option א (GRANT `fn_gematria_pack` ל-public/authenticated) — **נדחה ע"י צוריאל**. · REJ-2 GAP-1 Option ג (הרכבת-pack בקליינט) — **נדחה** (מנוע-מקביל/drift). · DEF-1 refactor אחסון long-format/rewrite-אגנוסטי-מלא — מוקפא (FUTURE). · DEF-2 אנגלית/אנגרמות/ELS/ציר — מוקפא (רק לא-לחסום). · DEF-3 «GAP-7 (Master State חסר)» — **בוטל/תוקן:** המסמך קיים (542 שורות); האודיט טעה.

---

## נספח — פערים מסומנים (`MISSING FROM MASTER STATE`, לא-מוכנס-לקנון)
1. `gematria_methods` (23 שורות) — הרישום עצמו לא-הוכרז קודם ב-CLAUDE.md/EXPORT.
2. `method_lifecycle` — קדם ל«Candidate Registry» שהוצע בסשן; אין לבנות מקביל.
3. `raziel_companion_layer_law` · `never_silent_metatron_law` · `unified_ai_brain_law` · `research_engine_law` · `metatron_rollout_law` · `bot_experience_architecture_law` — נעולים, נתפסו קודם כ-PROPOSED/UNKNOWN.
4. משפחת `fn_arcana` / `fn_tarot_sos` / `fn_destiny_matrix` / `fn_human_design_gate` / `fn_anagrams_engine` / `fn_maftech_decompose`.
5. תיקון-נתון: `nodes` = 5,867 (לא ~9,200 כפי שנרשם ב-EXPORT).

---

## §15. MULTILINGUAL INPUT — חוזה-קלט קנוני (`APPROVED` · Human-Gate ZURIEL · 15.8.2026)
> פורמליזציה של §14.2 (רב-לשוניות=ציר-מרכזי). **צוריאל אישר את העיקרון כתשתית (15.8.2026).**
- **עיקרון:** קלט יכול להיות עברית/אנגלית/שפה-נתמכת. **שפת-הקלט-המקורית והערך-המקורי נשמרים ללא-שינוי.** תרגום/תעתיק/מועמדים-עבריים = **DERIVED בלבד** — לא הופכים ל-Fact ולא מחליפים את המקור. כמה-מועמדים → מוצגים כמועמדים + provenance; אין בחירה-משמעותית-כאמת בלי **Human-Gate/בחירה**. `translation ≠ transliteration ≠ shared_value ≠ meaning`.
- **6 שדות לפני כל מנוע רגיש-טקסט:** `original_value · original_language · input_type · derived_candidates · selected_research_form · provenance`.
- **חל על:** שמות-אנגלית · מילים-אנגלית · ביטויים/פסוקים · **קלט-ELS** · תאריכים · Research-Context · Raziel.
- **קיים (EXISTING · מאומת-DB/קוד):** `translit_suggestions` (input_norm/lang/**input_type**/proposed_hebrew/**alt_answers**/confirmations/rejections/**resolved_hebrew**/reason) · `word_aliases` (alias/lang/source/confidence/verified/is_primary) · `language_links` (foreign_word/lang/relationship_type/**evidence_level**/**translation_source**/**human_verified**) · `name_variants` · `xlang_calibration` (ai_score/ai_reason) · `englishGematria.js`+`translit.js` (hasLatin=input_type · hebrewLatinOptions=candidates) · NameLab (heInput=input_type · translitOpts=derived_candidates · enWord=selected_research_form · «תעתוק מוצהר»=provenance) · תאריך-לידה (Gregorian מקור → `gregToHebrewSpelled` derived; profiles.birth_date נשאר SoT).
- **חסר-חיווט (NEEDS WIRING · לא-עכשיו):** (1) **קלט-ELS** — `tzofen norm()` מוחק לא-עברית; אין English→Hebrew-candidate לפני ELS. (2) **חוזה-אחיד** — 6-השדות מפוזרים per-domain; אין מעטפת-קלט יחידה מפורשת לכל מנוע רגיש-טקסט. (3) Research-Context/Raziel — רושמים input+evidence_legend, לא את 6-השדות כמבנה-אחיד.
- **⛔ עכשיו:** אפס schema/migration/translation-engine/UI/שינוי-ELS/שינוי-NameLab — Audit+תיעוד בלבד. חיווט = `ROADMAP` (כל שלב אישור-נפרד).

---

## נספח — פערים מסומנים (`MISSING FROM MASTER STATE`, לא-מוכנס-לקנון)
1. `gematria_methods` (23 שורות) — הרישום עצמו לא-הוכרז קודם ב-CLAUDE.md/EXPORT.
2. `method_lifecycle` — קדם ל«Candidate Registry» שהוצע בסשן; אין לבנות מקביל.
3. `raziel_companion_layer_law` · `never_silent_metatron_law` · `unified_ai_brain_law` · `research_engine_law` · `metatron_rollout_law` · `bot_experience_architecture_law` — נעולים, נתפסו קודם כ-PROPOSED/UNKNOWN.
4. משפחת `fn_arcana` / `fn_tarot_sos` / `fn_destiny_matrix` / `fn_human_design_gate` / `fn_anagrams_engine` / `fn_maftech_decompose`.
5. תיקון-נתון: `nodes` = 5,867 (לא ~9,200 כפי שנרשם ב-EXPORT).

---

## §16. R1 — פרטיות-ממצא-מחקר (`owner_person_id` + `privacy_scope`) — `APPLIED` (Human-Gate ZURIEL · 19.8.2026)
> **נעול ומאומת ב-DB חי.** `research_objects` הוא כעת owner/privacy-scoped — כל סוכן חייב לדעת זאת לפני שנוגע בו.
- **סכימה (הוחל):** `research_objects.owner_person_id uuid NULL` (FK→`persons.person_id`, `ON DELETE SET NULL`) + `privacy_scope text NOT NULL DEFAULT 'private'` CHECK ∈ {`private`,`family_shared`,`public_candidate`} + index `(owner_person_id,privacy_scope)`.
- **גשר-אכיפה:** `owner_person_id` ≠ `auth.uid`; RLS עתידי עובר דרך `persons.account_user_id`. הטבלה **server-only** כיום (אין GRANT ללקוח).
- **תיקון-merge:** `link_identity` בענף-המיזוג מ-re-point את `owner_person_id` לפני `DELETE v_old` — מיזוג-זהות לא מאבד בעלות.
- **legacy (backfill):** שורות קיימות → `owner_person_id=NULL` + `privacy_scope='public_candidate'` (אפס-רגרסיה).
- **חוקי-ברזל:** `privacy_scope`=הרשאת-גישה · `status`=מעמד-מחקרי — **צירים נפרדים**. אין person_id → אין owner-scoped. `private ≠ candidate ≠ approved ≠ canonical ≠ published`. `family_shared` = ערך-חוזה-עתידי (אין ACL פעיל; נקרא כ-owner בלבד).

## §17. ELS — קורפוס קנוני + `corpus_id` — `APPLIED` (Session 2 · 18-19.8.2026)
> **יישור-קורפוס נסגר.** ELS-שרת = ELS-לקוח = אמת-אחת.
- **קורפוס קנוני:** `torah_stream` = **304,805** (Koren, `tk-letters.txt`) · `corpus_id = 0b022e8eef6f9c16` · position-space **0-based**.
- **`fn_els_search` normalized** + חוזה provenance/coverage (`corpus_id`/`position_base`/`coverage`/`skip_domain`). **20/20 baseline-equivalence** מול הלקוח.
- **migration ישנה** `20260726_name_protocol_wave2_1_els_real.sql` = **SUPERSEDED** (replay לא משחזר קורפוס/חוזה ישן).
- **Finding Identity — `DECIDED` (Gate #4, Human-Gate ZURIEL · 22.8.2026, ELS-scope בלבד — Roadmap Canonical Gate Map שורה 4):** `FindingID = {corpus_id, term_norm, dir, skip, start}` (positions/geometry נגזרות — lens, לא-זהות). **מפורש מחוץ-לזהות** (provenance/context, לא Finding Identity): `source`, `source_ref`, `contributor`, `time` (`created_at`/`observed_at`), `confidence`, `privacy_scope`, `channel`. **אותו Finding רשאי להחזיק כמה observations/provenance** — זה עיקרון-מוחלט; **מנגנון-הקישור הטכני בפועל (כיצד observation מסוים משוייך ל-FindingID) לא הוכרע** — implementation נפרד, לא Gate #4. **Visibility/Privacy ≠ Finding Identity** — ציר נפרד לגמרי: צפני-ELS ציבוריים-קיימים בדפי-המשתמשים נשארים ציבוריים, **אין שינוי רטרואקטיבי בהרשאות**; אפשרויות-visibility עתידיות באזור-האישי הן תוספת (additive) בלבד ולא-נוגעות ב-FindingID/provenance-פרטי. **הוחלט-במפורש-שלא לכלול כאן:** מפתח-זהות אוניברסלי חוצה-דומיינים (Research-DNA-Identity, שלב 4 נפרד ב-Strategic Foundation Order — לא-מוזג), סמנטיקת multilingual (Multilingual Foundation v1), ושינוי-schema/constraint/RPC כלשהו (כולל `relation_evidence`) — כולם נשארים בדיוק כפי-שהיו. legacy `els_records` (106) → `corpus_id` **לא-מוכח** מ-provenance קיים → נשאר `NULL` (אין batch-assign, אין המצאה; re-anchor=opt-in פר-רשומה).
  - **תיקון-עובדה (22.8.2026, באותה החלטה):** ההערה הקודמת ("הלקוח `tzofen.html` חייב לפלוט `corpus_id`, כיום 0 אזכורים" — הוצגה כתנאי-חוסם) **אינה gap**. אומת מול קוד חי (`save_els_matrix`/`save_els_matrix_anon`): `corpus_id`/`term_norm` **נגזרים בצד-שרת** (`fn_els_corpus_id`/`fn_els_term_norm`) בכל שמירה, **ללא-תלות בקלט-הלקוח** — כך גם ברשומות אנונימיות. שורות חיות מ-20–22.8.2026 מאשרות `corpus_id` מלא בפועל על כל שמירה חדשה. אין-חסימה בשמירה עצמה; לכל-היותר UI-הלקוח לא-מציג את corpus_id למשתמש — אינו-נושא-ל-Gate.
  - **Gate #4 status:** `CLOSED` (Identity/Architecture Decision, ELS-scope בלבד). **Implementation** (אכיפת-DB אם-בכלל/unique-index, חיווט-כתיבת-observations בפועל) נשאר `OPEN` כ-workstream-build **נפרד**, **אינו-חלק מסטטוס-הסגירה של Gate #4** — ר' Roadmap Canonical Gate Map + Parallel/Non-blocking Work.

## §18. SECURITY — סחיפת-הקשחה (privacy/ACL) — `APPLIED`+verified (19.8.2026)
> **~10 פרצות נסגרו עם WRITE+אימות. אל תפתח מחדש — כולן חיות.**
- `link_identity` account-takeover · `admin_research_feed` bypass · `visitor_events` harvesting (ALTER POLICY) · `research_meta` aggregate-bypass (REVOKE EXECUTE) · `metatron_context` ACL + privacy-guards P2/P3/P4 · `number_dossier_json` (LATENT-A — מחזיר RO רק ב-`public_candidate`) · `metatron_plan` (דליפת `researcher_definitions` ל-anon → REVOKE) · `engraved_facts` P1 · `numbers_worked` P2 (identity-scoped).
- **עיקרון:** פונקציות server-internal = `REVOKE FROM PUBLIC` + `GRANT service_role`; owner-scoped reads דרך `account_user_id`.

## §19. γ — TWO-LAYER RESEARCH IDENTITY + SOD1820 UNIVERSAL RESEARCH CONTRACT v1.0 — `APPROVED` (Human-Gate ZURIEL · 20.8.2026 · DOCUMENTATION-ONLY — אפס DB/schema/migration/deploy)
> **מסגרת ותיקון-פער:** ה-Change Log (למטה, רשומות #26-#28) מזכיר "§19" פעמיים לשני נושאים שונים — אף אחד מהם לא נכתב בפועל לגוף-המסמך עד כה. **§19-old = «שתי-שכבות-ממצא» (premium-research-audit, 19.8, רשומה #27)** — נושא זה **סופרסס** במפורש ע"י γ (ר' §19-A למטה), ה-supersession תועד לראשונה ב-`docs/decisions/2026-08-20-gamma-two-layer-atlas-ledger.md` (`7985e0ce`, ענף `claude/raziel-capabilities-audit-h5k9ww`, **לא-במיין**); כתיבה זו ל-Master State היא ה-"§19→γ rewrite" שה-γ-record עצמו הגדיר כ"שער-נפרד" (`WS-GAMMA`/שער-פתוח #6 ב-Master Roadmap). **הנושא-האחר שגם-הוא תויג "§19" (רשומה #26, החלטות-זהות/OD-F10a) נשאר פער-נפרד, לא-מטופל כאן** — ר' "פערים שנמצאו" בסוף הסשן; לא הומצא תוכן.

### §19-A. γ — שתי שכבות ממצא-מחקר (Atlas / Ledger) — `APPROVED`+`DOCUMENTED` (אפס DB-change, `7985e0ce`)
> Reuse בלבד — שתי המחסניות כבר קיימות, מוסכמת-הקישור כבר חיה. הרשומה רק **קוראת בשם** את הקשר המיועד.
- **ההחלטה:** ממצאי-מחקר חיים בשתי שכבות מכוונות, מקושרות — **אין שכבה שלישית, אין טבלה חדשה, אין schema-change.**
  - **שכבת Atlas = `relation_evidence`** — ממצאים ציבוריים/חוצי-שיטה; נקרא דרך `atlas_findings(relation_type)`; **כתיבה server-only, קריאה ציבורית**. (ELS כבר מגושר לכאן דרך `cipher_link`.)
  - **שכבת Ledger = `research_objects`** — יחידות-מחקר פרטיות; **server-only**; `owner_person_id`+`privacy_scope` (R1, §16); משפחה/R1/גילוי.
  - **מחסנית-המנוע נשארת במנוע עצמו** — ELS `els_records`; גימטריה `bidim`/`gematria_words`; שמות `fn_name_multi`. אף שכבה לא מחליפה את מחסנית-המנוע.
  - **קישור בין השכבות = מוסכמת מחרוזת `source`/`source_ref`** — פולימורפי-טקסט, **בלי FK, בלי עמודה חדשה, בלי טבלה חדשה**: Atlas→מנוע: `relation_evidence.source='els_record:<id>'` (כבר חי). Ledger→מנוע: `research_objects.source_ref='els_record:<id>'`. Ledger↔Atlas: `research_objects.source_ref='relation_evidence:<id>'` (או ב-`relates[]`).
  - **`nodes`/`edges` נשארים הגרף הקנוני.** ממצא הופך ל-node/edge רק כשצמתי-הקצה כבר קיימים (כלל-גשר-אטלס: **לא ממציאים node**). שתי השכבות מוקרנות לתוך הגרף האחד.
  - **`PUBLISHED ≠ CANONICAL ≠ privacy`** — שלושה צירים אורתוגונליים: PUBLISHED=משטח/מודרציה · CANONICAL=`engine_verified`+`status='confirmed'`+קודם-לגרף · privacy=`privacy_scope`(private/family_shared/public_candidate)=גישה, לא-אמת.
- **עובדות-חיות מאומתות (READ-ONLY, אושרו מחדש בסבב הזה):** `relation_evidence`=132 שורות (`cipher_link`=37·`mirror`=20·`complement`=11·`convergence_candidate`=8·`cross_method_convergence`=5…); ELS-sourced=36; **אין FK ל-`els_records`; אין עמודת `cipher_link`/`finding_ref` על `research_objects`** — הקישור מוסכמה בכוונה. **γ דורש אפס שינוי-DB.**
- **Supersession:** §19-old («Finding = research_object OR research_contribution», premium-research-audit, 19.8) **מוחלף ע"י γ**. הסופרסשן נרשם כאן (ובתיעוד ההחלטה המקורי) בלבד.

### §19-B. SOD1820 UNIVERSAL RESEARCH CONTRACT v1.0 — `APPROVED` (Human-Gate ZURIEL · 20.8.2026 · **DOCUMENTATION/ROADMAP-ONLY** — אפס build/migration/schema/deploy)
> **מקור:** הועבר בצ'אט כ-`actor=ZURIEL` · `HUMAN-GATE DECISION` · `Status: APPROVED FOR SSOT DOCUMENTATION` · `Scope: DOCUMENTATION / ROADMAP ONLY`. מוטמע כאן **verbatim** (18 סעיפים) לפי חוק-הפרויקט `agent_onboarding_law`/`inter_agent_coordination_law` — לא נערך/לא סוכם, רק מובנה לפורמט Master State. **אומת מול הסכמה-החיה ומול חוקי-הפרויקט הקיימים לפני כתיבה זו (ר' "תשתית-תומכת" בסוף); לא נמצאה סתירה.**

1. **ENTRY CONTEXT** — כל מחקר מתחיל בהקשר-הכניסה שלו (ELS/מספר/ביטוי/גימטריה/חידוש/חדשות-אירוע/פסוק/שפה/OCR/חיפוש/מקור-עתידי). המערכת שומרת את Entry Context לאורך המחקר.
2. **FOCUSED BEFORE EXPANSION** — המערכת מציגה תחילה תוצאות רלוונטיות להקשר-הכניסה. ELS אינו הופך אוטומטית לחיפוש-גימטריה-מלא. רק «חקור/Research» או בקשה מפורשת מרחיבים למחקר-האוניברסלי.
3. **METHOD-PRESERVING DISCOVERY** — כל ערך מספרי נשמר יחד עם `value`·`method`·`source`·`calculation provenance`·`entry context`. דוגמה: ELS 1258→"מפתח לגן"→מילוי=1258 → התוצאה הממוקדת מציגה **"מפתח לגן — מילוי 1258"**, לא את כל שיטות-הגימטריה. רק ב-Research נפתחות שאר-השיטות. **אסור לאבד את השיטה שבה נוצר הערך.**
4. **CALCULATION** — כל החישובים במנועים הקנוניים הקיימים. AI אינו מחשב ערכים מתמטיים. Core-8 → הרחבה עתידית ל-Extended/Full/Custom. **מספר-השיטות הוא Configuration, לא חוזה-קשיח.**
5. **VALUE SCAN** — ערכים מאומתים יכולים להפוך ל-Search Seeds: Exact·Value Navigation·Zero Navigation·Zero Scale·Cross·Atlas·Graph·Verses·ELS·Languages·Years/Events·Existing Research·External Sources. רק מנגנון מוגדר רשאי לייצר ערך-נגזר; כל ערך-נגזר שומר provenance.
6. **ZERO NAVIGATION / "האפס הנע"** — מנגנון **קיים**, לא מנוע חדש. יש לשמור את שרשרת-המקור של כל ערך שנוצר באמצעותו.
7. **RESEARCH FINDING** — מחקר מורכב יכול להשתייך ל-Research Finding אחד הכולל Source·Evidence·Calculations·Crosses·Relations·Interpretation·External Sources·Provenance·Human Decision. **אין ליצור Finding Table חדשה** (מתיישר עם §19-A: הממצא מפוזר בין Atlas/Ledger/מנוע, מקושר במוסכמה, לא בטבלה מאוחדת).
8. **ONE KNOWLEDGE TREE** — ELS/Gematria/Numbers/Cross/Atlas/Languages/News/OCR/3D/Beit Midrash/Raziel וכל מנוע-עתידי הם עדשות על אותו Knowledge Tree. **אין ליצור עצי-ידע מקבילים.**
9. **FACT / EVIDENCE / DISCOVERY / INTERPRETATION / HYPOTHESIS** — הפרדה חובה. Discovery או Interpretation **אינם** הופכים אוטומטית ל-Fact או Canonical.
10. **CONTEXTUAL INTELLIGENCE** — המערכת מזהה את סוג-המידע וההקשר ובוחרת מנועים רלוונטיים (News→אירוע/תאריך/שמות/מקומות/מקורות · ELS→דילוג/פסוק/מיקום/מטריצה · Number→שיטות/קשרים/ממצאים · Language→מילה/תרגום/שורש/קשרים · Novelty/Research→טענת-חוקר/ראיות/קשרים). **זיהוי-ההקשר אינו משנה את רמת-הראיה.**
11. **EXTERNAL RESEARCH** — מותר שימוש במקורות-חיצוניים כשחסר-מידע/ההקשר-מצדיק/כהצעת-הרחבה. מקורות-מועדפים וסדרי-עדיפויות ניתנים-לשינוי. מקור-חיצוני נשמר כ-External Source, **אינו** הופך אוטומטית ל-Fact/Canonical.
12. **RAZIEL** — שכבת הבנה·הקשר·הסבר·הצעות-מחקר·סינתזה. **אינו** Judge/Canonicalizer/Publisher. חייב להבדיל בין מידע-מאומת לפרשנות/הצעה.
13. **HUMAN GATE** — AI מגלה/מחשב/מארגן/מציע. **ZURIEL הוא Human-Gate ומחליט.** אין קיצור-דרך מ-Discovery ל-Canonical.
14. **PRIVACY** — חל גם על מחקר-אישי/עצמי/עץ-משפחה/מחקר-פרטי/מחקר-ציבורי. הפרטיות נשלטת לפי חוזי-הפרטיות-שכבר-אושרו (R1/§16). **אין ליצור עץ-ידע-פרטי נפרד.**
15. **PREMIUM** — Access Gate, **לא** מאגר-ידע נפרד: `ONE TREE ├─ Public ├─ Premium └─ Research/Admin`. אפשר לשנות בעתיד אילו-שכבות סגורות בלי לשנות את מודל-הידע. **לא מתוכנן/מתומחר כאן** (נשאר עקרון-מבני בלבד, עקבי עם `platform_tiers_law`/FUT-1 — Premium טרם-מאופיין לפרטים).
16. **FUTURE-PROOF** — החוזה אינו-מקבע מספר-מנועים/שיטות/מקורות/סוגי-מחקר. הרחבות-עתידיות (שיטות-גימטריה/ELS/שפות/מקורות/חדשות/אירועים/חוקים/מנועי-חישוב/3D/Discovery-types) מתווספות **על** התשתית הקיימת, **אינן מחייבות החלפת-החוזה.**
17. **CANONICAL ARCHITECTURE PRINCIPLE** — `Entry Context → Focused Result → Research Expansion → Finding → One Knowledge Tree`. המערכת אינה-מציפה את המשתמש בכל-הידע כבר-בכניסה; מתחילה ממוקדת ומעמיקה לפי-הקשר או בקשת-Research.
18. **TEST CASE — MANDATORY (Reference, לא Finding Canonical):** ELS 1258 → זיהוי-התאמה "מפתח לגן" → `method`=מילוי · `value`=1258 → ELS-context מציג רק **"מפתח לגן — מילוי 1258"** → Research פותח את כל-שיטות-הגימטריה והקשרים-הרלוונטיים. **זהו Test Case לחוזה, לא Finding מאומת/קנוני בפני-עצמו — לא בוצע חישוב-מחדש/אימות-מנוע לערך זה בסשן זה** (per `verified_value_is_system_data` — לא לחשב-מחדש נתון-שהוצג, אך גם לא-לקנן אותו כ-Fact בלי מסלול-האימות הרגיל).

**תשתית-תומכת קיימת (ללא-בנייה — למה זה `APPROVED` ולא `PROPOSED`):** §19-A/γ (סעיפים 7-8) · §CC-2 C4 "expression×method×value (לא expression→value)... method-count-agnostic" (סעיף 3, Method-Preserving) · §CC-2 GAP-1/GAP-1A method-aware nav (סעיף 2, Focused-before-Expansion) · `unified_discovery_architecture` 7-שלבים (סעיפים 4/5/9/10/11/13) · `never_silent_metatron_law` 3-שכבות עובדות/פרשנות/שומר (סעיף 9) · `research_engine_law`+`raziel_companion_layer_law` (סעיף 12) · R1/§16 `owner_person_id`+`privacy_scope` (סעיף 14) · `zero_scale_law`/`getZeroResonance` (סעיף 6) · `gematria_methods` 23-שורות `in_engine`/`active` config (סעיף 4) · `platform_tiers_law` (סעיף 15). **אפס תשתית חדשה נדרשה לאישור-החוזה.**

**סתירות שנבדקו ולא נמצאו:** נבדק מול `els_single_engine_law`, `gematria_engine_law`, `unified_graph_law`, `reality_graph_law`, §10.0-§10.6, §11-§15, §CC-2, §16-§18 — **לא נמצאה סתירה חיה**. פער-תיעוד (לא-סתירה) נמצא ותועד למעלה: "§19" הכפול ב-Change Log ורשומה #26 (החלטות-זהות) שלא-נכתבה-מעולם לגוף-המסמך.

### §19-C. הבהרות מחייבות ל-§19-B (Human-Gate ZURIEL · 20.8.2026) — **אינן משנות את 18 הסעיפים עצמם**
> תוקן ממוקד, ללא audit חוזר. מבהיר/מחדד שלושה סעיפים קיימים — לא מוסיף עקרון חדש לחוזה.

- **A. Entry Context = חלק מזהות-המחקר (הרחבת סעיף 1):** Entry Context **אינו רק UI/navigation-context** — הוא חלק מה-**provenance וה-זהות** של מסלול-המחקר, ויש לשמרו לאורך כל השרשרת `Discovery → Finding → Research` (לא רק בכניסה).
- **B. Method-Preserving Discovery = חובה, לא-אופציה (הבהרת סעיף 3):** כשערך נוצר באמצעות method מסוים — ה-method נשמר כחלק **מזהות ההתאמה עצמה**, לא רק כמטא-דאטה נלווה. **דוגמה מחייבת (לא רק Test-Case לדוגמה):** ELS 1258 → "מפתח לגן" → מילוי=1258 → בתוצאת-ELS מוצג **"מפתח לגן — מילוי 1258" בלבד**. פתיחת כל שיטות-הגימטריה של הביטוי מותרת **רק** כשהמשתמש נכנס ל-Research/Explore.
- **C. Focused Result ≠ Full Research Context (הבהרת סעיף 2, עקרון-הפרדה מפורש):** משטח-הכניסה (Entry surface) מציג את התוצאה הרלוונטית להקשר-הכניסה **בלבד**. משטח-המחקר (Research surface) רשאי להרחיב לאותו Finding, למנועים, לקשרים, ול-One Knowledge Tree. **אסור להציף את משטח-הכניסה בכל הידע הקיים** — ההפרדה בין שני המשטחים היא עקרון-ארכיטקטוני מפורש, לא רק המלצת-UX.

**§19-D. STATUS (עדכון 20.8.2026 — Human-Gate ZURIEL, ללא ביטול תיעוד קיים):** 18-סעיפי ה-Universal Research Contract v1.0 (§19-B) **נשארים מתועדים ומאושרים-לתיעוד** כפי שאושרו — **לא בוטלו ולא שונו**. יחד עם זאת: **המסגרת הארכיטקטונית הרחבה יותר** (כיצד היישום-בפועל של 18 הסעיפים יתפרס על-פני משטחים, מה סדר-הבנייה, אילו החלטות-משנה נוספות נדרשות) **נשארת `OPEN`** ל-review נוסף של צוריאל בסשן חדש — **אינה `CLOSED`**. אין ב-status זה כדי לגרוע מהאישור-לתיעוד של §19-A/§19-B; הוא חל על **ההמשך מעבר לתיעוד**, לא על התיעוד עצמו. אין merge ל-main. אין build/schema/migration/deploy.

---

## §20. Gate #18 — Unified Judgment & Human-Gate Contract — `APPROVED` (Architecture Decision, Human-Gate ZURIEL · 23.8.2026)
> **מקור-סמכות:** ההחלטה עצמה + הפירוט המלא חיים ב-Roadmap Canonical Gate Map (שורה 18) + כרטיס `WS-JUDGE-UNIFICATION`. הסעיף הזה **מתעד ומפנה**, אינו-כותב-מחדש את תוכן-החוקים הקיימים — לפי עיקרון: Master State = פרשנות-והקשר-ארכיטקטוני, `nodes type='rule'`/Roadmap = מקור-האמת לתוכן.

- **ההחלטה (Option C, Contract-over-Consolidation):** אין physical consolidation של ה-pipelines (research_objects/research_contributions/topic_cards/els_records/language_links/research_candidates/word_review_queue), ואין Judgment system חדש/מקביל. כל pipeline נשאר מקור/מחסנית בתחומו, כפוף ל-**Unified Judgment Contract** מערכתי אחד.
- **`decision_ledger`** — append-only audit trail משותף להחלטות Human-Gate משמעותיות. מצביע לישות-המקורית (polymorphic `subject_type`/`subject_ref`, מוסכמה זהה ל-`source`/`source_ref` של γ/§19-A) — **אינו מעתיק/מחליף אותה, ואינו Source-of-Truth למחקר עצמו.**
- **Automation Boundary:** deterministic processing (חישוב-גימטריה, dedup, FindingID-matching, אימות-מנוע-חוזר) יכול-להיות אוטומטי. AI/Raziel רשאים לחקור/לדרג/להמליץ **בלבד**. Canonical judgment נשאר Human-Gate של צוריאל, ללא-יוצא-מהכלל.
- **Raziel** — אינו-pipeline, אין-לו חוזה-Judgment פרטי. הוא צרכן/orchestrator של החוזים-והמנועים-המערכתיים הקיימים (`raziel_routing_law`, `raziel_response_contract`, `raziel_full_answer_and_route_law` — ר' `nodes type='rule'`). **עיקרון-אילוץ נלווה (Human-Gate ZURIEL, אותה החלטה):** כל חוק-Judgment/AI-Authority שחוצה יותר-מסוכן/מקור אחד (לא-רק-רזיאל) חייב-להיות בבעלות **System Contract כללי**, ורזיאל/מפקדה/וואטסאפ/ELS **צורכים** אותו — לא-בעלים-של-עותק. פועל יוצא: `raziel_full_answer_and_route_law` (Human-Gate `nodes type='rule'`) מכיל היום סעיף חוצה-מערכת (no-auto-publish/approval-queue) שראוי-להיות בבעלות-חוזה-כללי — **refactor בפועל של הרול נדחה ל-implementation/reconciliation נפרד**, ורק לאחר בדיקה שאין כבר rule כללי-מספיק שמכסה זאת (`word_approval_required_law`/`research_contribution_law` מועמדים-לבדיקה ראשונים). לא בוצע כאן.
- **Canonical ≠ Published/Visible** — נעול-כעיקרון. **`nodes.is_active` פסול-במפורש** כ-publication flag (מיועד-רב-תכליתי, לא-ייעודי). **מנגנון-המימוש המדויק נשאר Implementation Gate נפרד**, אינו-חוסם את סגירת Gate #18 עצמה.
- **`admin_research_review`** — נשאר orphan/unused כפי-שהוא; אין-מחיקה/החלפה בשער הזה.
- **Security Work** (3 פונקציות anon-writable + null-bypass ב-`admin_research_review`) — מאושר-לתיקון כ-**נפרד ודחוף לפני Research Intake Build**; אינו-חלק מהחלטת-הארכיטקטורה של Gate #18 עצמה.
- **מעבר ל-Intake Build אינו-אוטומטי:** עומד שלב **INTAKE READINESS** (לא-Gate, לא-Human-Gate-נוסף) — Security Fix · `decision_ledger`-wiring (רק-לפייפליינים-שה-Intake-יזין) · Canonical≠Published-decision · Methods Build #1 · Corpus/Number DNA Persistence · Multilingual Foundation v1 · ELS Identity/Provenance implementation — כל-אחד לרמת-בשלות **מספקת-ל-Intake בלבד**, לא "לסיים-הכול". פירוט מלא: Roadmap `### Parallel/Non-blocking Work`.
- **מה נשאר Implementation** (לא-חלק מסטטוס-הסגירה): חיווט `decision_ledger` ל-5 pipelines נוספים · View מאוחד ב-War Room (עדשת AUTO-PROCESSED/NEEDS-ZURIEL/RESOLVED, בלי-store-חדש) · Security Work · עיצוב-מנגנון Canonical≠Published בפועל.
- **תיעוד `## 🚪 שערי־צוריאל פתוחים`/`## 🎯 Decision Register`:** פריט/שורה 18 עודכנו ב-Roadmap. שורת ה-Decision Register נשמרה כ-provenance היסטורי מלא (טקסט-ה-OPEN המקורי לא-נמחק) עם annotation מאוחר-ומתוארך שמסמן CLOSED — לפי `NO-DISAPPEARING-WORK`.
- **אימות-מכני (23.8.2026):** `src/lib/roadmapParser.js` (הפרסר-החי שמזין את המפה-התלת-ממדית ב-War Room) + `roadmapParser.test.js` — 16/16 טסטים עוברים, כולל אימות-מפורש ש-Gate #18 מזוהה `CLOSED` (`status_confidence: high`) ואין-עוד `OPEN_INTAKE_CRITICAL` פעיל בקובץ.

---

## §21. NUMERIC ROOT + RELATION ENGINE v1 — `IMPLEMENTED`/`CLOSED` (ברמת-בנייה; ענף-בלבד) — 25.8.2026
> **SSOT RECONCILIATION BEFORE MERGE** (branch `claude/relation-engine-v1`, docs-only). כל-מה-שמתועד-כאן **כבר-הוכח-חי** ב-Supabase `linswmnnkjxvweumprav` בפאסים קודמים על אותו ענף — provenance: 4 commits (`git log --oneline origin/main..HEAD`) + 4 זוגות `work_log` BEFORE/AFTER (24.8.2026, 12:59-18:10). **§1 למעלה נשאר כפי-שהוא כתמונת-מצב-היסטורית (10.8.2026)** — סעיף זה הוא ה-מצב-העדכני.

### PR #187 — MERGED (מקור-סמכות)
`pull_request_read`: `state=closed` · `merged=true` · `merged_by=zuriel337` · `merged_at=2026-08-24T05:05:07Z` · head `gpt/research-studio-v1-contract`@`7136a2bd` → base `main`@`a665a4dc`. Numeric Root/Relation Engine v1 נבנו **אחרי** מיזוג זה, על-גבי `main` הכולל-אותו.

### Numeric Root — `IMPLEMENTED`/`CLOSED` (build-level)
| פאס | ענף | commit | work_log | תוכן |
|---|---|---|---|---|
| 1 | `claude/numeric-research-root-implement` | `83427b80` | BEFORE 12:59 / AFTER 13:04 | 11 עמודות dependency-metadata על `gematria_methods` · `fn_dispatch_method`/`fn_composite_calc`/`fn_composite_calc_all_ops` (4 Composite Transforms, Decision E) · `fn_deep_cross`/`fn_deep_cross_reverse` · `fn_number_lookup` · `fn_method_profile`. 18/18 regression. |
| 2 | `claude/anchor-freeze-aiq-bekar` | `73f2592f` | BEFORE 15:52 / AFTER 15:56 | Anchor Freeze + AIQ BEKAR (ר' תתי-סעיפים למטה). 13/13 fixture. |
| 3 | `claude/numeric-root-finalization` | `7644cbb6` | AFTER 17:37 | reconciles 1+2 (0 conflicts). Composite `premium→public` (4/4, ה-premium-הקודם נשמר ב-`source_of_truth`). `bidim` SUM-materialized (+50,368 שורות, exact, 0 dup; 294,119→344,487). `bidim_sync()`→registry-driven (Decision K). `fn_number_lookup` הורחב (`atomic_or_composite`/`component_methods`/`component_values`/`operator`). 19/19 regression. |

**DRIFT מתועד-לא-תוקן:** `gw_enforce_engine` (14 עמודות Legacy Baseline) מכיל פונקציות-פנימיות (`ragil_calc`,`mistater_calc`,`miluy_calc`,`gadol_calc`,`siduri_calc`,`albam_calc`,`ribua_calc`) שמשכפלות מתמטית את `fn_ragil`/`fn_misratar`/`fn_miluy`/`fn_gadol`/`fn_siduri`/`fn_albam`/`fn_ribua` — זהות-מדויקת בכל-דגימה (6 מילים × 7 זוגות), שני-מימושים-מקבילים תחת שמות-שונים. `gw_enforce_engine` לא-נגעה (הוראה מפורשת), מוצע-לניקוי-עתידי.

**STATE (מודל 5-הצירים):** PROJECT STATE=`DONE`(build)/`ACTIVE_NOW`-adjacent · BRANCH STATE=🔨בעבודה (`claude/relation-engine-v1`, מכיל-3-הפאסים) · RELEASE STATE=Branch✅→Review/Main/Deploy/Live/Verified❌ (`BUILDING`🏗️) · VISIBILITY=`ADMIN_ONLY`(DB-only, אין-UI) · ACCESS=`LOCKED`(client). "NUMERIC_ROOT_READY_FOR_MERGE — no blocker found" (work_log) — **מיזוג טעון אישור-Human-Gate מפורש, לא-בוצע.**

> **🔵 עדכון `V5_3_FINAL_DRIFT_CLOSURE` (25.8.2026, אותו-יום, אחרי-כתיבת-הפסקה-שמעל) — תואם-במלואו את התיקון שכבר-נכתב ב-§0-A למעלה (שורת "עדכון-נוסף 25.8.2026"), מובא-כאן-גם כדי-ש-§21 עצמו לא-יסתור אותו:** ה-STATE שמעל היה נכון-לרגע-כתיבתו אך **התיישן תוך אותו-יום**. מאומת-חי (GitHub `pull_request_read` + `git log origin/main` + Supabase, שלושה-מקורות-עצמאיים): `claude/relation-engine-v1` **מוזג בפועל ל-`main` דרך PR #190** (`merged=true`, `merged_by=zuriel337`, `merged_at=2026-08-25T03:37:03Z`, מיזוג `80edf767`), ולאחריו **PR #191** ("ELS direction identity, Geometry Contract, FORMS, Research Journey", מיזוג `71fb94d4`) ו-**PR #192** ("Number Page Integration v1", `merged_at=2026-08-25T04:40:17Z`, מיזוג `2a051814`) — **כולם `merged=true`, כולם אבות-קדמונים ישירים של `origin/main` הנוכחי.** **RELEASE STATE מעודכן: Branch✅→Review✅→Main✅→Deploy✅→Live✅→Verified⚠️-חלקי** (regression-מלא pre-merge + post-merge live facts תואמים בדיוק: `gematria_methods`=29, `bidim`=344,487, `aiq_bekar_calc`/`fn_relation_candidate` חיים; interactive-production-QA חלקי בלבד — Playwright חסום ע"י sandbox-proxy לפי PR #192 body, לא-בעיית-קוד). VISIBILITY/ACCESS מעודכנים: `PUBLIC`🏗️/`ENABLED` (חשוף ל-`anon` דרך `EntityPage.jsx`, אחרי-תיקון-הרשאה נלווה ב-`fn_relation_independent_evidence`→SECURITY DEFINER, migration `20260825_relation_engine_anon_access_fix.sql`, PR #192).

### Composite SUM (ציבוריים) + bidim — `IMPLEMENTED`
4 ה-Composite Research Transforms המאושרים (Decision E: sum/diff, שיטות-אטומיות-קנוניות בלבד) — `required_entitlement`: `premium→public` על התוצאה-הבסיסית (מעשיר דפי-מספר-נדירים/גדולים); כלים-מתקדמים נשארים ENTITLED-capable נפרד. `SUM` בלבד ב-`bidim` (50,368 שורות = 12,592 מילים-מאושרות × 4, exact, 0 כפילויות); `DIFF` נשאר on-demand (§27.4: column/index-free כברירת-מחדל עד-שנדרש-בפועל, טרם-נדרש). מאומת-חי: `fn_number_lookup(1820)`=146 atomic+30 composite · `fn_number_lookup(368)` מציג סבל/פחד/דחף/… כ-composite עם provenance-רכיבים מלא, מעורב עם atomic.

### AIQ BEKAR (אי"ק בכ"ר) — `IMPLEMENTED`
שיטה-חיצונית-קלאסית מאומתת (Nine Chambers, כמו אתב"ש/אלב"ם/אח"ס-בט"ע החיים) — כיוון נעוץ ע"י fixture פומבי (שלום→גשסו→369, משוחזר-מדויק דרך `fn_ragil`). `aiq_bekar_transform`/`aiq_bekar_calc` — תחלופה-טהורה בלבד, ללא-מנוע-שני. **שורה חדשה** ב-`gematria_methods` (לא-הייתה-קיימת קודם — DRIFT מול-הנחת-משימה-מקורית, תועד): `category=base`, `active=true`, `required_entitlement=public`, dependency-metadata מלא. `bidim` אוכלס ל-12,592 שורות (קורפוס-מאושר-מלא). **24 שורות ב-`gematria_methods` נכון-לעכשיו (23+1).** 13/13 fixture.

### Anchor Freeze — `IMPLEMENTED`
`number_anchors`: `REVOKE ALL` מ-`anon`/`authenticated` (service_role/postgres נשארו) — 35 שורות, טבלה שלמה, ללא-שינוי. הצרכן (`getNumberAnchor()`, `src/lib/supabase.js`, נקרא מ-`EntityPage.jsx`) קוצר-מעגל ל-no-op **לפני** ה-revoke (EntityPage כבר null-safe — לא-נוצר-מצב-שבירה-חדש). שחזור-עתידי מתועד inline (re-GRANT + הסרת-early-return, שני תיקוני-שורה).

### Relation Engine v1 — `IMPLEMENTED` (read-only candidate layer, ענף-בלבד)
`claude/relation-engine-v1`, `161f9701`, על-גבי `numeric-root-finalization`@`7644cbb6`. **0 כתיבה ל-`edges`/`nodes`** (מאומת: ספירת-edges זהה 5099 לפני/אחרי). 5 פונקציות `STABLE`/read-only: `fn_relation_dependency_groups` · `fn_relation_noise_flags` (labels-בלבד, לעולם-לא-מוחק, עקבי עם `Rank, Don't Hide`) · `fn_relation_independent_evidence` (edges/topic_cards/research_objects קיימים) · `fn_relation_composite_evidence` (per-candidate) · `fn_relation_candidate` (המטען הקנוני: `entity_a/b, relation_kind, engine_evidence[], composite_evidence[], independent_evidence[], noise_flags[], engine_signal, research_priority, confidence, provenance, status='candidate'`). Proof set שוחזר-אוטומטית מנתונים-קיימים (ירושלים/שומרים תואם topic_card מאושר קיים quality=9 + אי"ק-בכ"ר-חדש · סבל/פחד=368 · יראה/רוגז=1080 · תיקוני-35-הסט ציון/ניילון ובכי/גאווה). Performance: ~15ms/candidate (batch/shortlist-first, לא-אינטראקטיבי-לסריקת-1000+-זוגות). **מוכן-להזין** חוזה-Number-Page עתידי; `EntityPage.jsx` **לא-נגעה**. קידום-לגרף-קנוני (edges אמיתיים) נשאר Human-Gate נפרד לכל-יחס.

**STATE:** `IMPLEMENTED`(build) · `BUILDING`🏗️ ב-RELEASE PIPELINE (Branch✅→Review/Main/Deploy/Live/Verified❌).

### Cross-reference
Roadmap: `🧭 NUMERIC ROOT + RELATION ENGINE v1 — RECONCILIATION 25.8.2026` (מקביל-מלא, כולל Canonical Gate Map / Parallel-Work bullet update ל-"Methods Build #1"). NEXT ACTION מעודכן: ר' §0-A למעלה.

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
| 18 | 11.8.2026 | §12-B מפת-תקיעות-הקלט + «הקיר-האחד» (מיפוי-קוד READ-ONLY): **אף edge-function (0/29) לא כותב `research_objects`** → כל מקור-שרת נתקע לפני השער; מינימום = דלת-שרת אחת ל-`fn_persist_discovery` · WhatsApp config-driven (`wa_bot_config`) אך **רדום ~5 שבועות** (inbox 3.7/queue 5.7) · כתבים-מועדפים = `wa_vip_senders` קיים (5, כולל שמעון-חיימוב) · Agents→Adapters (1 מנוע/1 שער/1 סוכן-שיחה; השאר feeders) · Seed-Dry-Run (358·676·974·1234·1331·1820 + 2701=בראשית מהגלריות) הצליב חי מול האוצר — EXISTING פר-מספר, אין feeder | צוריאל: «לפתוח את זרימת האוצר אל השער» — לוודא שכל מקור מגיע לשער-אחד, לא עוד Agent | «חבר עוד 5 קבוצות» → «כל מקור=feeder לאותו מנוע; קיר-אחד לפתוח» | `READ-ONLY` מיפוי-קוד מאומת · אפס בנייה/DB/UI · פתיחת-הקיר=`PROPOSED` (CC-4+) |
| 19 | 11.8.2026 | §11.34 «Discovery-Gate = שער-החלטה לא שער-ראות» (המפקדה מציגה כל-החומר לפני-Discovery; `research_objects` אינו תנאי-לראות; סטטוסי-מחזור-חיים כולל REJECTED/UNVERIFIED/UNKNOWN; פורום=פוסט+כל-תגובותיו נראים) + §12-C מפת-קליטה-חיה (עובדות): דלת-יחידה=`fn_persist_discovery` · 81 wa-raziel=הכנסה-שנעצרה · WA כבוי (`enabled=false`) · פורום 339/248-claim (יניב `engine_verified_layers`) 0-במנוע · גלריות `all_values` עובד · ~90% קיים | צוריאל: «מפקדת-כל-האוצר, לא מפקדת-Discovery» — שער-החלטה≠שער-ראות | «Command-Center = research_objects viewer» → «חלון-אחד לכל-האוצר; Discovery=שלב» | `CANONICAL` (§11.34 חוק) + `READ-ONLY` עובדות (§12-C) · אפס בנייה/DB/סוכן/engine |
| 21 | 11.8.2026 | **CC-1 v1 נבנה (WRITE-קוד ראשון של המפקדה, באישור):** טאב-אדמין «🎛️ חדר המפקדה» = **View קורא-בלבד**. קבצים: `WarRoomTab.jsx` (חדש) · `discovery.js` (+`materialTrack`/`preferenceScore`/`langRelLabel`) · `supabase.js` (+`getResearchFeed`/`getWaGroups`/`getWaLog`/`getForumMaterial`/`getLanguageLinks`/`getLanguageStats` — **reuse-first, אפס RPC חדש**) · חיווט AdminPage. תכולה: 2-מרחבים (🔴עכשיו/🗂️כל-האוצר) · מסלול-חומר 9×4 («איפה נעצר») · עדשות כתבים/קבוצות(סימון-כבוי)/**שפות** (תרגום≠תעתיק≠ערך-משותף+233-תעתיקים+21K-כיול)/מועמדים · רזיאל(AiAnalyze)/מטטרון · באנרים HOT/VIP/Claim/Interpretation≠ · ציר-העדפה ניטרלי · `build ✓` | לבנות CC-1 לפי המפרט המאושר + תיקוני-Audit (H1–H4/F1–F5) | «מפרט» → «View חי על-branch» | `IMPLEMENTED` (branch, **לא-פרוס**) · READ-ONLY (SELECT/RPC-קריאה בלבד) · אפס WRITE-DB/engine/EntityPage/גרף/RPC-חדש |
| 20 | 11.8.2026 | **§13 CC-1 SPEC נעול (מאושר):** מפקדת-כל-האוצר · שני-מרחבים (🔴עכשיו / 🗂️כל-האוצר-היסטורי+טרי) · מסלול-חומר 9-שלבים×4-מצבים (🟢🟡⚪🔴 «איפה נעצר») · עדשת-כתבים (VIP=עדיפות) · רזיאל/מטטרון/שופט/צוריאל · **20 גבולות-ברזל** (View-בלבד · לא מאגר/engine/SoT/feeder · research_objects+גרף+EntityPage קנוניים · אין קידום-לקנוני/H-1/קיר/שינוי-מנוע · שום-חומר-לא-נמחק · HOT/VIP/Claim/Interpretation≠TRUE/Fact) · חומר-לפני-research_objects נראה · חסר=read-RPC-אחד(קריאה)+wrapper+הרכבת-View | צוריאל אישר עקרונית + בדיקת-גבולות סופית | «מפרט-מסך» → «CC-1 קנוני נעול» | `APPROVED` (מפרט) · `READ-ONLY`/טרם-בנייה · הבא=מפרט-בנייה-טכני→עצירה-לאישור-לפני-WRITE |
| 22 | 14.8.2026 | **§CC-2 Command Center Research Layer:** P1 Info-Request · P2 Field Package read-model · P2-UI · P2.5 nav-gateway · GAP-1/1A method-aware · GAP-2 cross-AI-free · GAP-3 compound read-model · Edge `field-pack` (הכל §CC-2) | להפוך CC-1 (View קורא-בלבד) לשרשרת-מחקר-ניווטית מעל המנועים הקיימים, reuse-first | «Field Package=מסך-מידע» → «שער-ניווט read-model» · «cross מאחורי AI» → «cross דטרמיניסטי-חינם» | **קוד: `IMPLEMENTED`** (branch `claude/raziel-capabilities-audit-h5k9ww`, **לא-main · לא-deployed-frontend · not-live-verified**; unit 108+build) · **Edge `field-pack`: `DEPLOYED`** (Supabase ACTIVE v1); **`LIVE-VERIFIED` deny-paths בלבד** (admin לא) · **DB: 0 שינוי** (0 migration/canonical-write) · OPEN O1–O6 = non-blocker |
| 23 | 18-19.8.2026 | **§16 R1 מומש (WRITE · Human-Gate ZURIEL):** `owner_person_id`+`privacy_scope` על `research_objects` (FK→persons · CHECK · index) + תיקון-merge `link_identity` (re-point owner לפני DELETE) + backfill legacy→`public_candidate`. הכל בטרנזקציה אחת · אומת (constraints/FK/index/116-rows/regression 0-הפרות · server-only נשמר) | שכבת-פרטיות owner-scoped לממצאי-מחקר (Family/Life/Hints) בלי טבלה מקבילה | «research_objects בלי owner/privacy» → owner/privacy-scoped | `APPLIED`+verified (DB חי · server-only · אפס deploy) |
| 24 | 18-19.8.2026 | **§17 ELS קורפוס קנוני (Session 2):** `torah_stream`=**304,805** · `corpus_id=0b022e8eef6f9c16` · 0-based · `fn_els_search` normalized+provenance/coverage · migration `wave2_1_els_real`=SUPERSEDED · Finding-Identity `FROZEN` | ELS-שרת=ELS-לקוח=אמת-אחת (יישור-קורפוס) | קורפוס 306,269 + `fn_els_search` ישן → 304,805 Koren + חוזה | `APPLIED` (DB · 20/20 baseline) · Finding-Identity=`FROZEN` |
| 25 | 19.8.2026 | **§18 סחיפת-אבטחה (WRITE-per-item · Human-Gate ZURIEL):** ~10 privacy/ACL guards — link_identity account-takeover · admin_research_feed bypass · visitor_events harvesting · research_meta · metatron_context P2/P3/P4 · number_dossier_json (LATENT-A) · metatron_plan (דליפת researcher_definitions ל-anon) · engraved_facts P1 · numbers_worked P2 | לסגור bypass/harvesting/leaks חיים | פונקציות פתוחות-ל-PUBLIC + דליפות-anon → REVOKE+identity-scoped | `APPLIED`+verified · אפס deploy |
| 26 | 19.8.2026 | **§19 החלטות-זהות (מאושר):** `persons`/`identity_edges`=קנוני · `wa_account_links`=channel · `own_in_progress_allowed=TRUE` · רזיאל propose≠decide · Person-Identity Contract OD-F10a + `fn_upsert_self_profile` (SELF) | לקבע זהות-קנונית לפני מסעות Family/Life; רזיאל קורא-own בלי לקדם | «זהות מפוזרת / רזיאל-מקדם-status» → person_id קנוני + propose-only | `APPROVED` · `fn_upsert_self_profile`=`IMPLEMENTED` |
| 27 | 19.8.2026 | **§19 שתי-שכבות-ממצא (DESIGN/READ-ONLY):** `research_contributions`(ציבורי-מיוחס, ELS-ציבורי 27 כבר כאן) מול `research_objects`(שרת/R1-פרטי); פיצול-לפי-פרטיות; `open/closed`=ציר-העל; **חוב Human-Gate כפול** (`graph_node_id` מול `promoted_node_id`) | להגדיר יחס במקום לאחד; מסע-חיים פרטי עוקף את השער-הציבורי | **(S1)** «ELS→research_objects.engine_detail» **SUPERSEDED** · **(S2)** «corpus_id על els_records» **SUPERSEDED** | `DESIGN`/READ-ONLY · V3+G2=`OPEN` · טרם-בנייה |
| 28 | 19.8.2026 | **סנכרון Master (drift 15.8→19.8):** הוספת §16-§19 + רשומות #23-#27 + סימון 2 supersessions (S1/S2). אין סתירות-חיות | צוריאל: «כל ההחלטות ב-Master + סמן סותרות» | Master קפוא ב-15.8 (רק §15) → מעודכן ל-19.8 | `APPROVED` (תיעוד) · ענף `claude/premium-research-audit-bzmjop` · אפס deploy |
| 30 | 20.8.2026 | **תיקון ממוקד ל-§19-B (ללא audit חוזר):** §19-C — 3 הבהרות מחייבות (A. Entry Context=חלק-מזהות-המחקר/provenance, לא רק UI · B. Method-Preserving Discovery=חובה לא-אופציה, דוגמת ELS-1258-מילוי מחייבת · C. Focused-Result≠Full-Research-Context, הפרדת Entry-surface/Research-surface מפורשת) · §19-D STATUS (18-הסעיפים נשארים מתועדים-ומאושרים; **המסגרת-הרחבה-יותר נשארת `OPEN`** ל-review-נוסף, לא `CLOSED`) · §0 סעיף 15 חדש — CONTEXT INTEGRITY / NO CONTEXT LOSS LAW (Context-Reconstruction לפני החלטה-מהותית/CLOSED; הפרדת Architecture-Decision/Contract/Feature/Example/Open-Question/Build-Task; איסור-הנחה-שהנושא-האחרון=מטרת-העל) | צוריאל: הבהרות ממוקדות לחוזה + חוק-עבודה כללי למניעת אובדן-הקשר, בלי לפתוח סבב-audit חדש | אינו-מחליף כלום; מוסיף-בלבד | `APPROVED` · documentation-only · אפס DB/build/migration/deploy · אפס merge-ל-main |
| 31 | 25.8.2026 | **תיקון-סטטוס PR #187:** `state=closed`/`merged=true`/`merged_at=2026-08-24T05:05:07Z` (אומת מול GitHub). §0-A ותוצאותיה עוברות מ-"DOCUMENTED on Draft #187" ל-"MERGED to main"; טקסט-היסטורי נשמר כפי-שהוא (NO-DISAPPEARING-WORK) | SSOT reconciliation לפני-מיזוג `claude/relation-engine-v1` — לא-לדווח #187 כ-Draft כשהוא-כבר-מוזג | "Draft PR #187"/"טרם-ממוזג" → "MERGED 24.8.2026 05:05" | `APPLIED` (תיעוד) · docs-only · אפס DB/build/deploy |
| 32 | 25.8.2026 | **§21 חדש — Numeric Root + Relation Engine v1:** Methods Dependency Metadata + Composite/Cross/Lookup (`83427b80`) → Anchor Freeze+AIQ BEKAR (`73f2592f`) → Numeric Root Finalization (`7644cbb6`, composite `premium→public`+bidim+registry-driven-sync) → Relation Engine v1 (`161f9701`, 5 read-only functions, 0 edges/nodes written) — כולם ענף `claude/relation-engine-v1`, `IMPLEMENTED`/`CLOSED` ברמת-בנייה, `BUILDING`🏗️ ב-release-pipeline. NEXT ACTION §0-A עודכן ל-Number Page Integration v1 / Research Studio wiring | לתעד עבודה-מוכחת-חיה שמעולם-לא-נקלטה ב-Master-State (23-25.8.2026, 4 work_log AFTER-memos) | §1 (23-רשומות, 10.8) נשאר-provenance; §21 הוא-המצב-העדכני (24 רשומות) | `IMPLEMENTED`(build) · `BUILDING`🏗️ (לא-מוזג/לא-פרוס) · docs-only, אפס DB/קוד נגעו בפאס-הזה |
| 29 | 20.8.2026 | **§19 נכתב לראשונה לגוף-המסמך (P1 sync 19.8 החריג אותו בכוונה):** §19-A γ שתי-שכבות-ממצא (Atlas=`relation_evidence`/Ledger=`research_objects`/מנוע=מחסנית-עצמו, קישור-string `source`/`source_ref`, אפס-DB-change) — מטמיע `docs/decisions/2026-08-20-gamma-two-layer-atlas-ledger.md` (`7985e0ce`, ענף `claude/raziel-capabilities-audit-h5k9ww`, לא-במיין) · §19-B SOD1820 Universal Research Contract v1.0 (18 סעיפים, verbatim, Entry-Context→Focused→Method-Preserving→Calculation→Value-Scan→Zero-Nav→Finding→One-Tree→Fact-separation→Contextual-Intelligence→External-Research→Raziel→Human-Gate→Privacy→Premium-as-gate→Future-proof→Canonical-Architecture-Principle→Test-Case) | GPT/צוריאל: לעדכן SSOT+Roadmap לפי חוזה מאושר; לסגור את שער `WS-GAMMA`/OPEN-GATE#6 (§19→γ) | §19-old (שתי-שכבות-ממצא, לא-נכתב-מעולם לגוף) → §19-A/γ | `APPROVED` (documentation-only) · §19 (החלטות-זהות/OD-F10a, Change-Log #26) **נשאר-פער-נפרד, לא-נכתב, לא-הומצא** · אפס DB/schema/migration/deploy |
| 33 | 25.8.2026 | **§22 חדש — v5.3 Foundation Delta Reconciliation (Live Sync Foundation + Contributor/Finding/Methods/Person/Year/Verse/Source):** ר' §22 למטה לפירוט המלא | ZURIEL Human-Gate — challenge-pass רב-סבבי על Foundation Delta, מאושר ליישום | תיקוני-ניסוח בלבד על §21/§CC/§17 (ללא מחיקת provenance) + §22 חדש | `APPLIED` (תיעוד) · docs-only · DB: הוספת `nodes.rule_id='live_state_sync_law'` (חוק-תפעולי) בלבד |
| 34 | 25.8.2026 | **`V5_3_FINAL_DRIFT_CLOSURE` — סגירת v5.3:** (1) תיקון-דיוק ל-§21 (עדכון-STATE דומה-ל-§0-A: PR #190/#191/#192 `merged=true`+`deployed_live`, מאומת GitHub+`git log`+DB) · (2) §23 חדש — **FOUNDATION-FIRST / BOTTOM-UP REBUILD** (Strategic Phase Declaration: שלוש-שכבות Foundation→Projection→Experience + חידוד Preserve&Expand ל-"Preserve Capability, Not Legacy Interface") · (3) Roadmap.md תואם: DRIFT-1/2/3 תוקנו (Numeric-Root/Relation-Engine/ELS מיזוג, PR #193 נספג ל-History, ELS-capability-audit citation-precision) | Human-Gate ZURIEL — "v5.3 FINAL RECONCILIATION · WRITE PASS", תיקון-DRIFT-עובדתי-שכבר-נמצא + קיבוע-שלב-אסטרטגי-נוכחי, בלי-לפתוח-Feature/Audit/Security/Intake/Pesukim חדשים | אינו-מחליף-כלום; מוסיף-ומתקן-דיוק-בלבד (NO-DISAPPEARING-WORK — כל-טקסט-היסטורי-נשמר עם-annotation-מתוארך) | `APPLIED` (תיעוד) · docs-only · אפס DB/schema/migration/deploy/merge-ל-main בסבב-הזה (מלבד `work_log` coordination entries) |
| 35 | 25.8.2026 | **`INTAKE_FOUNDATION_CLOSURE` — §23.6 חדש (יישום-ראשון של §23.5 Foundation Expansion Gate, על דומיין Research Intake):** (1) **Security Fix**: `wa_word_review` — `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO authenticated,service_role` (זהה-ל-ACL של הפונקציות-האחיות); אומת `anon_exec=false` אחרי. (2) **Extension Contract** — `nodes.rule_id='research_intake_foundation_contract_law'` + `project_codex.slug='research_intake_foundation_contract'`: META REGISTRY / SOURCE-CITATION semantics / RELATION VOCABULARY / HUMAN-GATE PROVENANCE ל-relations (מרחיב `decision_ledger` הקיים) / PRIVACY PROMOTION LAW (`PRIVATE CANONICAL≠PUBLIC`) | Human-Gate ZURIEL — Challenge-pass (unknown-unknowns) מצא 0 MUST חדש + 5 Extension Points; סגירה-מפורשת התבקשה | אינו-מחליף-כלום; סוגר-תיעודית 5 סעיפים פתוחים, לא-נוגע בהיסטוריה (`research_objects`/`edges`) | `APPLIED`+verified · DB: `REVOKE`/`GRANT` על `wa_word_review` (מאומת-חי) + 1 שורת `nodes` + 1 שורת `project_codex` · **0 שינוי-קנון-היסטורי, 0 טבלה/engine/ledger חדש** · docs (Master State §23.6 זה) על-ענף, לא-ממוזג |
| 36 | 26.8.2026 | **`SHARED_EXPRESSION_EXTRACTION_V1_MERGED` — §23.8 חדש (Zvi Full-Corpus Pass → Christina second-writer stress test → Shared Expression Extraction v1 Foundation Contract, Human-Gate ZURIEL/GPT מאושר · **MERGED ל-main**, `796b3a3d`):** מנוע-חילוץ-ביטויים-משותף אחד (SOURCE→SEGMENTATION→EXTRACTION→AST→OPERAND RESOLUTION→CANONICAL ENGINE→VERIFICATION→TRUTH CLASSIFICATION→PROVENANCE→PROJECTION) ל-WhatsApp/OCR/Writer-Intake/Raziel-עתידי — 36 חוקים-נלמדים (34 `ACTIVE_SHARED` + 1 `REJECTED_REVERTED` R31 + 1 `SUPERSEDED` R33), חוזה-כינוי-שיטות קדמי↔משולש מאומת מול לוח `gematria_methods` החי (לא-ניחוש), 4 שיטות-משולש-ספציפיות נשארות נפרדות, Regression Corpus v1 (Zvi 378/623/213 + Christina). קוד: `src/lib/analysisFlow.js`+`src/lib/triage.js` (תיקון-דריפט-שיטה + Rule #35 vertical-arithmetic + Rule #36 trailing-prose). חוזה מלא: `docs/shared-expression-extraction-v1-contract.md` + `project_codex.slug='shared_expression_extraction_v1'` + `nodes.rule_id='shared_expression_extraction_contract_v1'` | Human-Gate ZURIEL/GPT — Foundation Closure לפני Writer 3, למנוע Zvi-parser/Christina-parser/Raziel-parser מקבילים | אינו-מחליף-כלום; מרחיב את `unified_discovery_architecture`/`gematria_engine_law` הקיימים בשכבת-חילוץ-לפני-מנוע שלא-הייתה-מתועדת | `APPLIED`+verified · **MERGED to main** (`796b3a3d`, ff-merge, 0-conflict) · `npm run build` נקי · Zvi-regression זהה-לגמרי (623/213, 0-שינוי) · Christina-regression עבר · **0 Zvi-corpus write, 0 213-residual write, 0 שיטת-גימטריה חדשה, 0 א׳-רבתי, 0 קידום-לעץ-כללי** · Raziel/OCR runtime wiring = `EXTENSION POINT` בלבד, לא-ממומש · Deploy(Vercel)/Live = ר' Roadmap, לא-מאומת-בסבב-זה |
| 37 | 26.8.2026 | **`CORPUS_ADMISSION_FOUNDATION_V1` — §23.9 חדש (fresh port של PR #198 על `main` נוכחי, אחרי-#197/#196; 4 סבבי-סגירה, סבב-4 = אימות-חי-טרי-בסבב-הזה):** שער-זהות-משותף-אחד (`fn_corpus_admission_gate`) נחווט ל-10/10 נתיבי-יצירת-מילה; VIP/`p_safe_to_auto` כבר-לא-עוקפים; RLS-INSERT נסגר; `add_entity` חוזק; `resolve_word_review` מעלה `is_verified=true`. **תיקון-אמיתי-בסבב-הזה:** `created_by`-coverage אומת-מחדש חי כ-**7/7** (לא 6/7 כפי-שדיווחו הן-PR-#198-עצמו והן-הפסקה-הקודמת-שכבר-מוזגת ב-Roadmap) — `admin_promote_contrib_card`+`wizard_build_convergence` כבר-נושאים `created_by=auth.uid()` בפועל. **0 `admission_status` חדש, 0 טבלה חדשה.** PR #198 עצמו לא-ניתן-ל-raw-merge (`mergeable_state=dirty` אחרי-שמיין-#197/#196), לכן זהו-port-טרי-בענף-חדש, לא-מיזוג-#198 | Human-Gate ZURIEL — "FINAL CORPUS ADMISSION RECONCILIATION", fresh-sync+cross-check-מול-#196+אימות-חי-מלא לפני-פתיחת-PR | אינו-מחליף-כלום; מרחיב `gematria_auto_registry_law`/`corpus_admission_lifecycle_law` הקיימים | `APPLIED`(DB חי) · docs-only fresh-port · **PR #199** (`draft`) טרם-ממוזג, ממתין ל-Human-Gate · 7/7 `created_by` (מתוקן) · 10/10 נתיבים דרך-השער (מאומת-חי) · 0 `admission_status` חדש · **תוקן 26.8.2026 (מיזוג-סופי):** PR #199 **מוזג ל-`main`** (`06087fca`) · PR #198 **סגור, לא-מוזג, מסומן-superseded-by-#199 בגוף-ה-PR** · סטטוס נוכחי `FOUNDATION_SUFFICIENT_MERGED_VERIFIED` |
| 42 | 27.8.2026 | **`RESEARCH_INTAKE_FINAL_CLOSURE_FREEZE` — §23.15 חדש (Final Closure Pass: Article Corpus Stress Test #3 [`posts.id=145`] + §6.6 Exhaustion-Before-Freeze עודכן 2/N→3/N + Freeze Decision):** אומתו-עצמאית (לא-handoff) כל 15-הדרישות-הקיימות בגוף-החוזה-החי (Contributor Scope/Corpus-Completeness/Representation-Collapse/Access⟂Truth/No-Contributor-Engine/Source-Authorship≠Interpretation/Procedure-Extraction/Private-Derivation/Symbol-Identity/Formula-Instance/per-member-verification/multilingual/spatial/numeric-routing/Research-OS-ownership) — 0-חסר. Article 145 (תוכן-עורכי-מפורסם, `wp_id=31656`, "סוד החשמל") אומת-חי כ-corpus שלישי שונה-מהותית מ-צבי/עמית (קורפוסי-תורם-פרטיים); כל-הממצאים-המרכזיים אומתו-ישירות-מול-המנוע (2701/73/541/156/385/45/271/703-Gadol/271-Kadmi ✓, כולל holds: מגן-דוד=107-לא-108 ✓). 2 Extension Points חדשים — Text-Position-Provenance (ALREADY COVERED/CLARIFICATION-ONLY, תוקן-ניסוח-מינורי §2) ו-Spatial-Counting-Semantics (EXTENSION POINT NOW — ADAPTER CONTRACT, כבר-מתועד) — **0 CONTRACT DELTA מהותי, 0 MUST FOUNDATION NOW**. Future-Capability-Challenge סופי על-13-צירים — 0-פערים. §6.6 עודכן 2/N→3/N (צבי+עמית+Article-145) | Human-Gate ZURIEL — "FINAL UNIVERSAL RESEARCH INTAKE CONTRACT CLOSURE", Closure-Pass-אחרון-ולא-audit-חדש | אינו-מחליף-כלום; מרחיב §1-§6-RECON הקיימים (§2 תוקן-ניסוח-מינורי, §6.6 עודכן-עובדתית) | `APPLIED`(DB חי, additive) · `rule_version` 4→5 · `project_codex` 26,115→32,663+ תווים · **FOUNDATION SUFFICIENT — FROZEN FOR CONTROLLED UNIVERSAL INGESTION** · Freeze≠ingestion-authorization (זרימה-מלאה נשארת: Source→Extraction→Research-Object→Verification→Universal-Finding→Human-Gate→Canonical→Published, בלתי-משתנה) · 0 ingestion-המוני בוצע · 0 נגיעה-בקוד-PR#206 · ענף `claude/research-intake-final-freeze`, טרם-merge, ממתין ל-Cross-verification GPT/ZURIEL |
| 40 | 26.8.2026 | **`RESEARCH_INTAKE_PRE_INTEGRATION_RECONCILIATION` — §23.13 חדש (Pre-Integration Cross-Contract Reconciliation מול PR #206 + משפחת-Research-OS הקיימת, לפני Controlled Zvi+Amit Admission):** נבדק-במפורש שאין Router/Contract/Truth-Lifecycle כפול. תגלית: קיימת-כבר משפחת-חוזים שלמה שקדמה-לכל-זה — `docs/research-studio-v1-contract.md` (One Research OS, APPROVED 24.8.2026) · `docs/research-universal-finding-contract.md` (Universal Finding envelope, APPROVED, merged PR #187) · Research DNA v1 Foundation Contract (PR #166, CLOSED, `verification_state` vocabulary). PR #206 עצמו כבר-כותב "existing Research OS/Reality Graph" — ממקם-עצמו-כ-Lens בתוכה, לא-כמתחרה. **5 בדיקות:** CHECK 1 (גבולות-חוזה) — מפת-בעלות מלאה, 0 שני-חוזים תובעים-אותה-אחריות; Router משתמש-חוזר ב-`makeUniversalFinding()` הקיים (אומת-חי בקוד), לא-משכפל. תיקון-ניסוח יחיד (לא-חוק): Intake''s `research_objects.meta` provenance (שורת-DB) ↔ Finding.provenance (פרויקציה-ארעית) — כיוון-מיפוי, לא-schema. CHECK 2 (§6.10) — תוקן-ניסוח: `gematria_methods` נשאר-ייעודי-לגימטריה-בלבד, `operation_key` למתמטיקה-כללית חי ב-`meta.ext.numeric_op.*`/רגיסטרי-נפרד-עתידי. CHECK 3 (Fibonacci/derived-sequence, [888,1480,2368]→296→[3,5,8]) — מוכח-הרכב-בלי-subsystem-חדש (GCD כ-operation_key חדש-יחיד + fibonacciSequenceAdapter הקיים ×3 קריאות + בדיקת-רציפות טריוויאלית) → `EXTENSION POINT SUFFICIENT`. CHECK 4 (Spatial) — אושר-תואם ל-`EXISTING CAPABILITY — ADAPTER NEEDED` שכבר-ב-PR#206, זהה-לניתוב שכבר-נכתב ב-§23.12. CHECK 5 (Admission Readiness) — כל-סוגי-הממצאים (צבי: source/image-provenance/numeric-spatial/operand-provenance-לא-ידוע/interpretation≠fact; עמית: convergence-families/37-73-2701/π-Fibonacci-prime-MOD-binary-totient/multilingual/private-derivations/source-claims-לא-משוחזרים) מיוצגים-אוצרתית, חלק כ-Extension-Point-שטרם-נבנה (Spatial-Adapter, GCD/MOD/prime/totient) לא-כ-Foundation-Gap | Human-Gate ZURIEL/GPT — "PRE-INTEGRATION CROSS-CONTRACT RECONCILIATION", לוודא-היעדר-Router/Contract-כפול לפני-Controlled-Admission | אינו-מחליף-כלום; מרחיב §1-§6.11 (תיקון-ניסוח §6.10 בלבד, לא-שינוי-מהותי) + מוסיף §6-RECON חדש | `APPLIED`(DB חי, additive) · `rule_version` 3→4 · `project_codex` 18,597→26,115 תווים · **0 MUST FOUNDATION NOW** · **FOUNDATION SUFFICIENT FOR CONTROLLED ZVI+AMIT ADMISSION** · לא-נגעו-בקוד/PR #206 · אין merge/deploy/Admission-בפועל בסבב-הזה · ענף `claude/research-intake-contributor-scope-v1`, טרם-Commit-בזמן-כתיבה |
| 39 | 26.8.2026 | **`RESEARCH_INTAKE_CONTRIBUTOR_SCOPE_V1_DELTA2` — §23.12 חדש (Closure Delta #2 ל-אותו-חוזה `research_intake_foundation_contract`, נגזר מ-GPT Amit Exhaustion Pass v2, `work_log.5aa4cb1d`):** 7 תבניות-ראיה-נוספות נבדקו מול-החוזה-הקיים (§1-§6) **לפני-כתיבה** (ONE-CONTRACT — אין Amit Contract/Zvi Contract מקבילים). תוצאה: §6.7 Source Authorship≠Analyst Interpretation (attribution per-object לא-יורש) · §6.8 Research Procedure Extraction (פרוצדורה=רצף-שלבים-על-primitives-קיימים, לא-kind/engine-חדש) · §6.9 Private-Derivation Boundary (מרחיב §5: `derived_from`-chain יורש privacy_scope-מחמיר; ממצא-כללי-עצמאי=שורה-נפרדת) · §6.10 Mathematical Symbol/Operation Identity (מרחיב `method_key`-locked-identity לכל-אופרטור-מתמטי, לא-רק-גימטריה — φ Euler≠φ Golden) · §6.11 Formula Instance≠New Law (מוסיף `derived_from` כקטגוריה-שלישית ב-§3, לצד equals*/same_as* — T37−T36=37=instance-של-T(n)−T(n−1)=n, לא-Method-חדש) — **כולם CONTRACT DELTA מינימלי, 0-schema.** + Routing Crosswalk: numeric-ops→Numeric Research Router (EXTENSION POINT כבר-מתועד, item #5, לא-נבנה-כאן) · 37/73-spatial→Spatial/3D-infra הקנונית (ALREADY COVERED) · multilingual→§1/§3 primitives (ALREADY COVERED, `shared_expression_extraction_contract_v1`) · per-member-method-provenance→`fn_composite_convergence_candidate` Eligibility Gate+`group_size≠strength` (ALREADY COVERED, item #4, 0 חוק-נוסף) | Human-Gate ZURIEL — "AMIT STRESS TEST · CLOSURE DELTA #2", למנוע כפילות-חוק ולוודא-שהחוזה-האחד ממשיך-להחזיק על-ראיה-נוספת מאותו-קורפוס | אינו-מחליף-כלום; מרחיב §1-§6 הקיימים (כולל תוספת-קטגוריה ל-§3 עצמו, ללא-דריסת-הקיים) | `APPLIED`(DB חי, additive) · `nodes.rule_id='research_intake_foundation_contract_law'` `rule_version` 2→3 · `project_codex` +8,209 תווים (10,388→18,597) · 5/7 CONTRACT DELTA · 1/7 EXTENSION POINT (כבר-מתועד) · 1/7 ALREADY COVERED · **0 MUST FOUNDATION NOW** · Contract Freeze עדיין-לא-נסגר (2/N — אותו-קורפוס-עמית, לא-שלישי) · ענף `claude/research-intake-contributor-scope-v1`, טרם-Commit-בזמן-כתיבה, טרם-PR/merge/deploy/Admission |
| 38 | 26.8.2026 | **`RESEARCH_INTAKE_CONTRIBUTOR_SCOPE_V1` — §23.11 חדש (§6 additive ל-`research_intake_foundation_contract`, נגזר מ-Zvi Track A [4 סבבים] + Amit Existing Corpus [2 סבבים] stress tests):** נבחן במפורש האם החוזה מ-§23.6 (§1-§5) מחזיק על corpus/חוקר/מקור שונה-לגמרי בלי redesign — **כן**, בתוספת 6 חוקים-אוניברסליים חדשים כ-§6: (1) Contributor Scope Separation (ABOUT-CONTRIBUTOR↔דוסייה vs BY-CONTRIBUTOR-ABOUT-WORLD↔`research_objects`, ברמת-תוכן לא ברמת-שורה) · (2) Source-Window/Corpus Completeness (3 רמות: SOURCE EXHAUSTED / KNOWN CORPUS EXHAUSTED / CONTRIBUTOR CORPUS COMPLETE) · (3) Representation Collapse (SOURCE ARTIFACT→EXTRACTED CONTENT→CORE FINDING/CLAIM→EVIDENCE/REPRESENTATIONS, ריבוי-ייצוגים≠כפילות) · (4) Access⊥Truth/Scope (מרחיב §5 PRIVATE CANONICAL≠PUBLIC) · (5) No Contributor-Specific Engine (מרחיב `els_single_engine_law`/`gematria_engine_law`) · (6) Exhaustion Before Freeze (N≥3 corpora שונים-במהות לפני Contract Freeze; 2/N הושלמו). כל 6 מנוסחים מעל primitives קיימים בלבד (`contributor_id`/`source_ref`/`privacy_scope`/`meta.ext.<domain>.<key>`) | Human-Gate ZURIEL — "AMIT CORPUS STRESS TEST → UNIVERSAL EXTRACTION CONTRACT UPDATE", לתעד לקחים ארכיטקטוניים בלי Contract Freeze ובלי להפוך לחוקים ספציפיים-לעמית | אינו-מחליף-כלום; מרחיב §1-§5 של `research_intake_foundation_contract` (§23.6) הקיים | `APPLIED`(DB חי, additive, §1-§5 נשמרים-verbatim) · `nodes.rule_id='research_intake_foundation_contract_law'` `rule_version` 1→2 · `project_codex.slug='research_intake_foundation_contract'` +§6 (10,388 תווים) · כל 6 החוקים **EXTENSION POINT NOW** · **2 פערים-ידועים מוצהרים** (אין שדה-מבני ABOUT-vs-BY ברמת-שורה; אין שדה-מבני completeness-tier) · **Contract Freeze לא-נסגר** (2/N corpora) · ענף `claude/research-intake-contributor-scope-v1`, טרם-ממוזג/טרם-PR |
| 43 | 29.8.2026 | **`EXPERIENCE_GOVERNANCE_FOUNDATION_V1_CLOSURE` — עדכון-סטטוס מתוארך ל-§23.17: PR #234 מוזג ל-`main` (`e5f21efc`)** | שורת-ה-STATUS המקורית אמרה «טרם-merge, טרם-deploy» — נכונה-לזמנה; המצב-החי התקדם | לא-הוחלף — נוסף עדכון-מתוארך מתחת לשורה המקורית (`NO-DISAPPEARING-WORK`); הפסיקה `FOUNDATION SUFFICIENT — CONTRACT LEVEL` **לא-השתנתה** | `CLOSED` + `MERGED` |
| 44 | 29.8.2026 | **`CANONICAL_RECONCILIATION_2026_08_29` — §23.18 חדש (יישום חבילת-הפיוס הרב-יומית של GPT: `docs/canonical-reconciliation-2026-08-29.md`, commit `3b262fdf`, PR #237) — סעיף-אינדקס-בלבד המקבע 8 מצבי-שחרור + 6 פערים-פתוחים + תיקון-ניווט קריטי ל-Full Scan.** מאונדקסים: Work Log Authority v2 (`IMPLEMENTED`/`LIVE`/`MERGED`, PR #229) · Gematria Verified≠Published (`MERGED`+`RELEASED`, PR #235) · User Center Target + reachability (`MERGED`, PR #227/#228/#230) · Human Date Input v1 + אימוץ + סגירת-מובייל (`MERGED`, PR #231/#232/#233) · Experience Governance v1 (`CLOSED`+`MERGED`, PR #234) · Admin RPC P1+M3/M4 (`SECURITY BLOCKER CLEARED`, `DB LIVE`+`MERGED` דרך PR #236) · M1 Truth Contract (`CLOSED — FOUNDATION SUFFICIENT`, PR #236) · Engine Governance (`CLOSED`, ארבעה שערים `PASS`, PR #236) | ליישר Master/Roadmap/§CL מול המצב-החי אחרי מיזוג #236 בלי-לאבד טקסט-היסטורי; להפריד מצב-שחרור מבעלות-קנונית | **לא-הוחלף שום סעיף** — §23.18 מאנדקס בעלים-קנוניים ואינו-משכפל גופי-חוק/חוזה החיים ב-`nodes`/`project_codex`/`docs` (§0 סעיף 16). טענות היסטוריות («טרם-מוזג» וכו') נשמרו כפי-שהן + עדכון-מתוארך | `APPLIED` (docs-only; אפס schema/DB/engine/קוד) |
| 45 | 29.8.2026 | **⛔ תיקון-ניווט קריטי (חלק מ-§23.18-C): Full Canonical Method Scan **אינו-מאושר** בעקבות סגירת Engine Governance.** השרשרת הקנונית: `ENGINE GOVERNANCE CLOSED → CANONICAL DOC RECONCILIATION → PRE-SCAN READINESS GATE → ורק אם PASS: FULL CANONICAL METHOD SCAN` | ה-`work_log` החי של Engine עדיין רושם תנאי-קורפוס/רישום פתוחים (de-stratification של `bidim`, סחיפת active/in_engine, אימות-fixtures ל-composites); שער-המוכנות הוא **החלטתי** ועשוי לשנות את החלטת-הסריקה | מונע פרשנות-שגויה של «Foundation Sufficient» כאישור-סריקה | `OPEN GATE` (טרם-הורץ) |
| 46 | 29.8.2026 | **פערים פתוחים שנשמרו במפורש (§23.18-B), אינם-חוסמי-Foundation:** 78 ערכי `topic_cards.meter_score` מיושנים (חישוב-מחדש = שער-אנושי נפרד, ⛔ אין mass-rewrite שקט) · `relation_evidence` חסר פרימיטיב-שחקן (`source` אינו-provenance קנוני של שחקן) · `decision_ledger` CHECK נשאר `NOT VALID` עד הכרעת שורה-היסטורית אחת · אין נתיב-UI ל-canonicalize · איחוד תלות-שקילות-מותנית (`גדול` CASE ב-`convergence_meter` + רשימות-שיטות קשיחות) · תנאי-קדם-לסריקה | לשמר פערים ידועים כפריטים-מנווטים במקום להשאירם משתמעים או «סגורים-בטעות» | לא-הוחלף — נרשמו כפתוחים-במכוון | `OPEN` (מתועד, לא-חוסם) |
| 47 | 29.8.2026 | **`ENGINE_CORPUS_CANONICAL_CLOSURE` — §23.19 חדש: PRE-SCAN READINESS FINAL PASS + סגירת Engine Corpus ליקום-הסריקה הנוכחי.** כיסוי מושל נוכחי **18 שיטות SCANNABLE × 12,592 ביטויים מאומתים = 226,656** שורות `bidim` `provenance_state='governed'` (אומת חי: כל שיטה בדיוק 12,592, min=max; 0 שורות מושלות של שיטה לא-scannable; אי-התאמת-חישוב מדווחת 0/226,656, ואומתה כאן בדגימה קריאה-בלבד 216/216). **Full Canonical Method Scan — הדרישה החישובית סופקה ע"י ה-governed re-certification**; חיפוש-חי לא-מצא מנוע/job נפרד של Full Scan (רק `fn_method_scan_report` דיווח-בלבד · cron 27 `metatron-nightly` סורק-התכנסות ומוקפא · cron 40 `research-extract-scan` דומיין אחר). **הרצה-חוזרת מיותרת לא-בוצעה במכוון** (`NO-REDUNDANT-AUDIT LAW`). סחיפת-רישום (7 שורות) — חפיפה 0 עם 18 ה-SCANNABLE, `NON-BLOCKING`; `מילוי בלבד` סתירת-מטא-דאטה אמיתית אך inactive/unverified/non-scannable — **לא-תוקנה במכוון**. אימות-fixtures ל-composites הועבר ל**שער PRE-ACTIVATION נפרד** (כיוון-התלות atomic→composite). שורות legacy/לא-scannable **נשמרו** (121,584, מתוכן 50,368 composite) | לסגור את מסלול Engine Corpus אחרי ה-PRE-SCAN בלי להריץ מחדש 226,656 חישובים זהים, ובלי להסוות זאת כ«סריקה נפרדת שהורצה» | **לא-הוחלף שום סעיף.** אמירות היסטוריות («Full Scan טרם-הורץ» — §23.18-C, §CL שורה 45, פסקת-הסיום של §23.18) **נשמרו כלשונן** ונוסף מעליהן עדכון-מתוארך גובר בלבד | `CLOSED` ליקום-הסריקה הנוכחי (docs-only; אפס DB/חישוב/schema/engine/UI) |
| 48 | 29.8.2026 | **`COMPOSITE_ACTIVATION_1_TO_3` — §23.19-A חדש (עדכון-מתוארך גובר): יקום-הסריקה עבר מ-18 ל-21 שיטות.** שער-אנושי של צוריאל אישר הפעלת **שלושה** composites בלבד (`רגיל+מילוי` · `רגיל+מסתתר` · `רגיל+משולש`), אחרי סגירת שני חוסמי-`MUST FOUNDATION NOW`: **CA-1** (37,776 שורות היסטוריות מופתחו-מחדש לזהות `fn_bidim_id` הקנונית, מאומתות-בתוך-הפקודה, כדי שההפעלה תשדרג-במקום במקום ליצור 50,368 כפילויות) ו-**CA-2** (`dependency_verified_at` מראיות 732/732; `engine_verified` **נגזר**, לא-נדרס). מצב-חי מאומת: **21 SCANNABLE × 12,594 = 264,474** שורות מושלות · 12,594 לכל composite · 0 `legacy_verified` שנותרו · 0 כפילויות `bid_id`/(word_id,method) · 0 מושלות לא-scannable · `bidim` 348,282 · דגימת-אימות 3,000 → 0 אי-התאמות. **Full Scan עדיין לא-הורץ ואינו-נדרש** (`NO-REDUNDANT-AUDIT LAW`) — הכיסוי נעשה בפעולה ממוקדת לשלוש השיטות, לא בסריקה-מלאה. התכנסות לא-נופחה (הסרה הוכחה ב-30/50/94; ציון 1820 נותר 89) | ליישר את §23.19 עם המצב-החי אחרי ההפעלה, בלי למחוק את מספרי-ה-18 שהיו נכונים-לזמנם | **לא-הוחלף שום סעיף.** כל §23.19 A-F נשמר כלשונו כ-provenance; §23.19-A מוסיף בלבד | `APPLIED` (docs-only). DB של ההפעלה **חי**; קבצי-המיגרציה ב-**PR #240 פתוח וטרם-מוזג** |
| 49 | 30.8.2026 | **`MF1_INTAKE_IDENTITY_INVARIANT_CLOSURE` — §23.20 חדש: שער-הרחבת-היסוד (§23.5) הופעל על **Research Intake · Source-Native Identity** וסגר את **INTAKE READINESS CLOSURE**.** מעבר-קריאה-בלבד ראשון החזיר **`FOUNDATION NOT SUFFICIENT`** עם **`MUST FOUNDATION NOW` יחיד (MF-1)** — זהות-מקור-נייטיב ב-`research_objects` לא-מוגדרת, לא-נאכפת ולא-ניתנת-לשחזור (`work_log` `d91623ce`). מיפוי-כותבים הוכיח **9 מחלקות-כותבים, כולן current, 0 legacy** — שורש-הבעיה הוא **היעדר invariant-זהות משותף**, לא דו-קיום-legacy; והכותב הדומיננטי הוא **SQL ישיר של סוכן דרך service-role/MCP, 410 מתוך 579 שורות (70.8%)**, שאי-אפשר לנתב דרך RPC — ומכאן שנקודת-האכיפה היחידה שמכסה 100% מהכותבים היא **גבול-הטבלה** (`work_log` `372d7a5c`). מומש-בפועל: `fn_research_source_uid` + `fn_research_claim_uid` (IMMUTABLE) + `research_objects_identity_uidx` — UNIQUE **חלקי, קדימה-בלבד**, חתך-ליטרל **קבוע** `2026-08-29 21:00:00+00` (לא `now()`), כך ש-**כל 579 השורות ההיסטוריות נשארות מחוץ לאילוץ** — 0 מחיקה, 0 מיזוג, 0 backfill, 0 קנוניזציה; 5 כותבי-SQL הפכו אידמפוטנטיים; באג אובדן-מידע-שקט ב-`research_artifact_save` נסגר. שער-בטיחות 6/6 (Gate-6 תפס פגם-אמת בנרמול המתוכנן וצומצם, לא-נעקף — פרגמנטים סמנטיים `#interpretation`/`#mem-stuma`/`#valuation` נשמרים) · 575/579 זהויות-נבדלות · self-test 8/8 · מבחן-לחץ 16-מקרים `PASS 10 / FAIL 0 / DEFERRED 6` | לעצור כפילות-קליטה-חוזרת בגבול-המשותף בלי-להרחיב-Foundation, ולשחרר את המעבר ל-Projection | **לא-הוחלף שום סעיף.** פסיקת-ה-`NOT SUFFICIENT` המקורית (`work_log` `d91623ce`) **נשמרת כלשונה** כטענה-שהייתה-נכונה-בזמנה; §23.20 מוסיף **עדכון-מתוארך גובר** בלבד (`NO-DISAPPEARING-WORK`) | `CLOSED` + **`DB LIVE`** + **`MERGED`** (PR #241, merge `cc400db1`) · **`APP DEPLOYED` לא-אומת** · **Edge `research-extract` לא-נפרס** (עדיין version 2) |
| 50 | 31.8.2026 | **`SUBSCRIBER_ATTRIBUTION_WIRING_V1` — כל הרשמה חדשה מקושרת ל-journey שלה.** מימוש PR #262 → `main` (`8d851c17`). Pointer: `docs/IDENTITY_ATTRIBUTION_FOUNDATION.md` (Identity · Journey · Traffic Intelligence · Attribution · Communication). | Human-Gate ZURIEL אישר release מפורש ("תעלה") | לא-הוחלף שום סעיף | `IMPLEMENTED`+`MERGED`+`DEPLOYED`+`LIVE` (backend חי + frontend production-ready) · `VERIFIED=partial` — **שיוריות מפורשת, לא-מוסתרת:** signup טבעי/מורשה אחד post-release לא-נצפה-חי בזמן-הסגירה-האחרון (`work_log` `5aa29f83`); **לא-נטען שחזור-attribution-היסטורי** — Unknown נשאר Unknown |
| 51 | 31.8.2026 | **`MULTILINGUAL_IDENTITY_FOUNDATION` — §23.5 Foundation Expansion Gate יושם על דומיין Multilingual Identity, MUST #1-#5 נסגרו.** PR #265 → `main` (`82b93cc4`). GPT ביצע post-merge reconciliation + cross-verify עצמאי (`work_log` `8445bf7a`, 31.8) — `CLOSED_NO_CHANGE`, לא-נמצא-פער. | Human-Gate ZURIEL | לא-הוחלף שום סעיף. **נקודת-הרחבה נשמרת, לא-נבנתה:** representation-owner/aliases **אסור** שיהפכו למערכת-זהות שנייה — ההרחבה נשארת מעל spine-הזהות הקיים (`persons`/`identity_edges`) | `IMPLEMENTED`+`MERGED` · Representation UI **לא-הומצא/לא-נבנה** בסבב-הזה |
| 52 | 1.9.2026 | **`TRACKING_CLOSURE` — Canonical Share Human-Gate predicate נסגר וחי.** PR #267 → `main` (`c2f3b91f`, image-share+/archive-entry+WhatsApp-CTA+video-play+share-contract). Predicate קנוני: `event_type='share' OR section='share'` (מיושם ב-`supabase/migrations/20260901120000_canonical_share_predicate_readers.sql`, כבר על `main`). | Human-Gate ZURIEL | לא-הוחלף שום סעיף. **הבחנה קפואה, לא-לטשטש:** `historical_baseline` (`community_share_count`=7326, provenance **`UNKNOWN`** — לא-משוחזר, לא-נמחק) **≠** `tracked_share_events` (הזרם-הנספר-מהיום, 334 בזמן-הכתיבה). 7326+334=7660 מוצג-כשקיפות-שני-מספרים, לא-כ"אמת-אחת" | `CLOSED`+`LIVE`. **לא-בוצע audit-tracking נוסף בסבב-הזה** (per הוראה מפורשת) |
| 53 | 1.9.2026 | **`CLEAN_TRAFFIC_CLASSIFICATION_FOUNDATION_V1` — §23.23 חדש: חוזה-סיווג קנוני HUMAN\|BOT\|UNKNOWN מעל Behavioral Bot v3 הקיים.** Human-Gate **ZURIEL, 2026-09-01**, אחרי 3 סבבי-כיול READ-ONLY. PR #280 → `main` (merge commit `9893e9b1`). DB LIVE · Vercel `SUCCESS` על ה-merge-commit. Canonical owner: `nodes.rule_id='traffic_intelligence_law'` **rule_version 3→4** + `project_codex.slug='traffic_intelligence_law'` (מירור מלא, תבנית-קיימת לחוזה-זה). ר' §23.23 למטה לסיכום-Pointer בלבד — **הגוף התפעולי-המלא חי ב-nodes/project_codex, לא כאן** (Canonical-Owner Pointer, §0 סעיף 16). | Human-Gate ZURIEL | לא-הוחלף שום סעיף. `traffic_intelligence_law` v1-v3 (Behavioral Bot v2/v3) **נשמר-כלשונו, לא-נערך** — אומת bytewise (`pg_get_functiondef` hash `1a2e30ce9e4378b975cbf79710fb4cdb`, זהה לפני/אחרי כל שלב) | `IMPLEMENTED`+`MERGED`+`DEPLOYED`(Vercel `SUCCESS`)+`LIVE`+`VERIFIED` (14 מבחני-קבלה, כולל תיקון-זהות-חשבון post-hoc: כל `person_id` בסשן נבדק, לא-רק-אחד) |
| 54 | 1.9.2026 | **PR #222 (`gpt/traffic-temp-disk-fix`) — סגירה מדויקת: מעולם לא-מוזג; `CLOSED AS SUPERSEDED`.** ה-migration המאומת שלו (temp-disk cache fix) הועבר-בפועל ל-`main` **דרך PR #280** (reproducibility-only port, זהות-hash מאומתת 3 פעמים נפרדות). ה-drift הספציפי שייצג PR #222 (קוד-חי-ב-DB שלא-קיים ב-`main`) **`CLOSED`**. | עובדתי, אין-Human-Gate-נדרש לתיעוד-סגירה | **רשומות `work_log` ההיסטוריות של PR #222 לא-נכתבות-מחדש** (`NO-DISAPPEARING-WORK`) — זו תוספת-provenance בלבד | `CLOSED AS SUPERSEDED` · `NOT MERGED` (עצמו) · תוכנו `LIVE` (via #280) |

---

## §22 — v5.3 Foundation Delta Reconciliation (25.8.2026, ZURIEL Human-Gate — READ-ONLY challenge-pass, מיושם כתיעוד בלבד)

> מקור: multi-round Foundation & SSOT Reconciliation audit + Foundation Delta v2 challenge-pass (8 תיקוני-ניסוח שאומתו חי מול הסכמה/הקוד לפני קבלה). **אין כאן שום החלטת-קנון חדשה** מעבר למה שכבר אושר ב-Human-Gate — זהו תיקון-דיוק על ניסוח קודם, לא audit חדש.

**תיקוני-דיוק (היו שגויים/לא-מדויקים בניסוח קודם, מתוקנים כאן):**
- **Contributor:** `contributors`+`contributor_content`+`research_contributions.author_contributor_id` (uuid אמיתי) — spine קיים וחי. הפער האמיתי: `research_objects.contributor` הוא שדה-טקסט-חופשי, לא FK ל-`contributors.id` — spine קיים, חיווט לא-עקבי בטבלה אחת בלבד.
- **Finding ≠ research_objects (1:1):** Universal Finding (PR #187) הוא מעטפת+refs לשלושת-הבתים (מנוע-נטיבי/`research_items`/`research_objects`) — **אינו** בעל-בית רביעי. רק פעולת-workflow מפורשת מקדמת Finding ל-`research_objects` (evidence/claim/interpretation); אין יצירה אוטומטית.
- **Methods:** לא "24 שיטות" גורף — `gematria_methods`: 29 רשומות רשומות, 23 `in_engine=true`, 23 `active=true`, 14 בלבד עם `db_column` (מאוחסן ב-bidim).
- **Person:** F-1a′+F-1b (self+family ledger) `LIVE`/`DB-LIVE`, **0 כתיבות ל-`nodes`/`edges`** (מפורש). הקרנה-לגרף-ציבורי = `OD-F8`, `BLOCKED`/`OPEN-HUMAN-GATE` בנפרד (Ledger-LIVE ≠ graph-projection-LIVE).

**Year/Date/Verse/Source — Foundation Delta v2 (ר' Roadmap Gate `OD-TIME-8` להשלכה התפעולית):**
- **Time כ-first-class research dimension** — `CONTRACTED-NOT-IMPLEMENTED`, **לא** "אין חוזה". מקור: `docs/sod1820-research-time-and-extensible-laws.md` (`Status: APPROVED strategic requirements`), כולל FACT/DERIVED/INTERPRETATION/CONFIDENCE/PROVENANCE model + Temporal Anchors + pipeline `Source→Extraction→Calculation→Discovery→Evidence→AI/Challenge→Human Decision→Canonical Knowledge`. המסמך עצמו: *"No code, DB/schema, migration, UI implementation, merge, deploy or canonical promotion is authorized by this document."*
- **Verse Identity + Text Representation** — `BUILT`: `tanach_verses`, PK יציב `(book_idx,chapter,verse)`, + `text`/`ragil`/`words[]`/`rashei`/`sofei`.
- **Structured Verse Citation relation (FK)** — `TRUE MISSING`: 0 foreign keys אל `tanach_verses` מכל טבלה אחרת (0 FK ≠ 0 יכולת-ציטוט — `research_objects.source_ref`/`evidence`/`meta` עשויים כבר לשאת ציטוטים לא-מובנים).
- **Source→Extraction→Claim→Entity pipeline** — כבר **מספיק וקיים** (`research_objects` + Time Layer doc §13); Pesukim.docx **אינו** דורש time-shaped intake pipeline נפרד. Time הוא dimension/entity על-גבי אותו pipeline, לא סוג-Source חדש.
- **CANONICAL ≠ PUBLISHED (עקרון-ממשל, נשמר במפורש):** קידום Research-Object/Claim ל-canonical `nodes`+`edges` הוא החלטה נפרדת מ-publication/public-visibility. שתי החלטות שונות, לא שלב-אחד.
- **Canonical flow:** `Source → Extraction → Research Object/Claim → Human Gate → Canonical Entity/Relation → Publication/Visibility` — 5 שלבים נפרדים.
- **Gate מוצע ל-Roadmap v5.3:** `OD-TIME-8` — governs **רק** promotion ל-canonical `nodes`+`edges` (Year/Date/Verse/Event); **אינו** governs publication/visibility. `OPEN/BLOCKED` — ZURIEL Human-Gate. ר' פירוט מלא ב-Roadmap.

**Pesukim.docx GPT pilot — תיקון-סטטוס:** `PAUSED BY ZURIEL` (**לא** `in_progress`). 0 commits / 0 import (מאומת: `git diff origin/main...origin/gpt/pesukim-year-journey-import` ריק). שורת ה-`work_log` הקיימת (2026-08-25 05:15, `status=in_progress`) היא **stale coordination state** — מסומנת כאן, לא נמחקת, ותתואם בנפרד ב-`work_log` עצמו בסבב עתידי (מחוץ-להיקף v5.3 זה).

**Live State Sync Foundation:** ר' `live_state_sync_law` (CLAUDE.md + `nodes.rule_id`) — תיקון-שורש לתקרית local-checkout 154-קומיטים-מאחור שהתגלתה תוך-כדי ה-reconciliation הזה עצמו. `scripts/live-sync-check.sh` — diagnostic.

**מה לא השתנה כאן:** אין WRITE קנוני חדש, אין schema/migration, אין import של Pesukim.docx, אין publication/visibility decision. תיעוד-דיוק בלבד על גבי החלטות שכבר עברו Human-Gate.

---

## §23 — FOUNDATION-FIRST / BOTTOM-UP REBUILD — Strategic Phase Declaration (`Governance Principle`, Human-Gate ZURIEL, 25.8.2026, `V5_3_FINAL_DRIFT_CLOSURE`)

> **מהות:** זהו **חידוד/קיבוע-מפורש** של עיקרון שכבר-היה-קיים **במשתמע** במסמכים הקנוניים (Strategic Foundation Order, Research DNA v1 Foundation Contract, Preserve & Expand Law, `KEEP EVERYTHING → REORGANIZE → SIMPLIFY → ADD`) — **לא** ארכיטקטורה חדשה, לא-Engine/Store/Graph מקביל. הבית הקנוני היחיד לעיקרון הזה הוא **כאן**; Roadmap.md מפנה-אליו (באנר-עליון + Return Point) ואינו-משכפל את התוכן.

### 23.1 העיקרון — FOUNDATION-FIRST / BOTTOM-UP / TOP-LAYER-REBUILD-PENDING
SOD1820 נמצא-כעת בשלב שבו **השורשים והגזע** (Identity · Provenance · Research DNA · Methods · Calculation Engines · Relations · Research Objects/Claims/Evidence · Universal Finding contracts · Research Context · One Tree/Reality Graph · Human Gate · Entity Contracts · Decision/Judgment lifecycle · Intake Readiness · extensibility · `Source→Extraction→Claim→Canonical` flow) הם מוקד-העבודה — **לא** השכבה-העליונה (Number Page redesign · Person/Life Journey surfaces · Year Journey · ELS experiences · Research Studio surfaces · Entity Hub evolution · Navigation/IA · Mobile · Premium surfaces · Multilingual UI · visual redesign · publishing surfaces · future journeys).

**האתר הקיים וה-UI הקיים הם `Transitional`/`Legacy Surface`:** עדות ליכולות-קיימות (evidence of existing capabilities) · בסיס-תאימות-לאחור (backward-compatibility baseline) · provenance · מקור להבנת-מה-שכבר-נבנה — **אך אינם ארכיטקטורת-היעד** (Target Architecture) של המוצר-העתידי.

**איסורים מפורשים (הרחבה מפעילה, לא-חוק-חדש):**
- אין להסיק ממבנה-האתר-הקיים מה-חייב-להיות מודל-הנתונים-העתידי.
- אין להתאים את השורשים למה-שה-UI-הישן מסוגל-להציג.
- אין לבצע schema shortcut רק-כדי-לשרת component/page קיים.
- אין לדחות first-class entity/identity/relation/contract נחוץ רק-משום-שה-UI-הנוכחי אינו-יודע-להציג-אותו.
- אין לבנות מערכת/Graph/Store/Engine מקביל לצורך-ה-UI-החדש (עקבי-במלואו עם `unified_graph_law`/§10.6/§0-A LAYERED-3D-FIRST-CLASS-LAW).

השכבה-העליונה **תיבנה/תעוצב-מחדש בהמשך מעל אותה תשתית** — **זהו תיאור-שלב-אסטרטגי בלבד, אינו-אישור-בנייה** לאף-אחד-מהפריטים-שברשימה.

### 23.2 THREE-LAYER ARCHITECTURAL DIRECTION (חידוד, לא-מערכת-חדשה)
| שכבה | מהות | דוגמאות | הבית-הקנוני-הקיים |
|---|---|---|---|
| **1. FOUNDATION** | האמת והתשתית | DB · canonical entities · identity · provenance · engines · methods · relations · Research OS · Research Context contracts · Research Objects · Decision/Human Gate · One Tree/Reality Graph · source/evidence/claim lifecycle | `unified_graph_law` · §16-§21 · Research DNA v1 Foundation Contract · γ (§19-A) |
| **2. PROJECTION** | עדשות-שונות מעל **אותה** אמת — **אינו** Truth Store חדש | Number Page · Entity Hub · ELS · Person Journey · Name Journey · Year Journey · Timeline · Research Workspace · Topic/Cross/Convergence surfaces | `§0-A` LAYERED/3D-FIRST-CLASS-LAW ("2D,Layered,3D הם projections/renderers של אותו State") — **אותו-עיקרון, כאן מוכרז כחל על כל SOD1820, לא-רק-ELS/Research-Studio** |
| **3. EXPERIENCE** | איך המשתמש חווה את ה-Projections | UI · layout · navigation · visual hierarchy · mobile · multilingual presentation · premium packaging · animations · 3D/rendering · public/admin/research modes | `research_workspace_law` (CLAUDE.md) — עדשה/UI-נפרד-על-מידע-אחד |

**חוק-הכיוון:** `FOUNDATION → PROJECTION → EXPERIENCE`, **ולא** `EXPERIENCE → SCHEMA`. ה-Experience יכול-לדרוש Projection חדש, וה-Projection יכול-לחשוף gap אמיתי-ב-Foundation — **אבל אין לעוות Foundation רק-כדי-להתאים ל-UI קיים.**

### 23.3 PRESERVE CAPABILITY, NOT LEGACY INTERFACE — חידוד ל-Preserve & Expand Law / KEEP EVERYTHING
> **תיקון-פרשנות (לא-שינוי-חוק):** `Preserve & Expand Law` (Roadmap, PR #166) ו-`KEEP EVERYTHING → REORGANIZE → SIMPLIFY → ADD` (§10.2/§10.6/§11.13) **לא** נועדו-להתפרש כ"יש-לשמר-את-האתר/העמוד/component/layout-הקיים לנצח". המשמעות-הנכונה: **PRESERVE CAPABILITY + TRUTH + PROVENANCE — NOT NECESSARILY LEGACY INTERFACE.**

**מה-אסור-לאבד** (יכולות קיימות היום: Number DNA · צירי-התכנסות · ביטויים/מילים-שוות · Topics · Cross · Sources · Sharing · ELS · Research · Gematria methods · contributors · journeys · findings): **היכולת, האמת, וה-provenance שלהן.**

**מה-מותר-בעתיד** (בכפוף ל-6 התנאים למטה): לפרק page קיים · להחליף component hierarchy · לשנות layout/navigation · להעביר capability למיקום-מתאים-יותר · לאחד projections · לפצל experience · לבנות Research Mode חדש · לעצב-מחדש את Number Page · לשנות את כל-המעטפת-החזותית.

**6 התנאים (חובה כולם):** (1) capability לא-נעלמת · (2) truth לא-משתנה-בגלל-UI · (3) provenance נשמר · (4) אין Store/Graph/Engine מקביל · (5) migration/transition נעשה-באופן-מפורש · (6) Human Gate נשמר.

`NO-DISAPPEARING-WORK` חל על **ידע/החלטות/provenance/capabilities** — **אינו** מתפרש-כחובה-להנציח UI legacy לנצח.

### 23.4 סטטוס ותחולה
`APPROVED` (Governance Principle, Human-Gate ZURIEL) · **documentation-only** — אפס-קוד/DB/schema/migration/deploy/merge שונה בעקבות-הצהרה-זו. **אינו-מבטל/סותר** אף-חוזה-קיים (Research Studio v1 §0-A, Research DNA v1 Foundation Contract, γ/§19, Gate #18/§20) — הוא **חידוד-כיוון מעליהם**, עקבי-במלואו עם `unified_graph_law`, `Rank Don't Hide`, ו-Preserve & Expand Law המקורי. **אין** באישור-זה הרשאה לבניית Feature/redesign/migration/Security-Fix/Intake-Build כלשהו — ר' Roadmap `🏁 v5.3 FINAL RETURN POINT`.

### 23.5 FOUNDATION EXPANSION GATE (`Governance Principle`, Human-Gate ZURIEL, 25.8.2026, `V5_3_FINAL_DRIFT_CLOSURE` — הרחבה ישירה של §23.1-§23.2)

> **מהות:** לפני מעבר של **תחום** (domain) מ-`FOUNDATION` אל `PROJECTION`/`EXPERIENCE` (§23.2), חובה Gate קצר שבודק אם ה-Foundation של אותו תחום **רחב-מספיק-לעתיד-הסביר**. **אין-משמעות-ה-Gate "לבנות-את-כל-העתיד-מראש"** — מטרתו-היחידה למנוע redesign/migration/identity-break **צפויים** לפני-שעולים-שכבה, לא-לנחש-את-כל-העתיד. `FOUNDATION → EXPANSION GATE → PROJECTION → EXPERIENCE`.

**12 הצירים שנבדקים בכל Gate:** Identity · Representations/aliases/variants · Relations · Time/Context · Provenance · Truth Lifecycle · Engines/calculations · Extensibility · Human Gate/approval · Multilingual readiness · Cross-domain connections · Privacy/access (כאשר-רלוונטי) — ובנוסף: האם Projection עתידי-סביר ידרוש schema-redesign אם-לא-נטפל-בציר-הזה עכשיו.

**כל ממצא מסווג לאחת-משלוש בלבד:**
- **`MUST FOUNDATION NOW`** — אם-נדחה, סביר שנידרש בעתיד ל-redesign/migration/identity-break.
- **`EXTENSION POINT NOW`** — אין-צורך-לבנות-את-היכולת-עכשיו, אך **חובה** להשאיר contract/identity/relation/extension-point שמאפשר להוסיף-אותה-בלי-redesign.
- **`LATER`** — ניתן-לדחות-בבטחה ל-Projection/Experience בלי-לפגוע-ב-Foundation.

**חוק-נגד-over-engineering:** אין-לבנות יכולת-עתידית רק-משום-שהיא-אפשרית. המטרה **למנוע redesign-צפוי, לא לנחש-את-כל-העתיד.**

**פלט-מחייב לפני המלצה-לעבור-למעלה:** Agent חייב-להחזיר **`FOUNDATION SUFFICIENT`** או **`FOUNDATION NOT SUFFICIENT`**; אם `NOT SUFFICIENT` — **רק** את-פריטי-`MUST FOUNDATION NOW` שחוסמים-בפועל את-העלייה (לא-את-כל-12-הצירים, לא-`EXTENSION POINT`/`LATER`).

**תחולה:** ה-Gate חל-על **כל domain** — Number · Person · Year · Verse · Source · Contributor · ELS · Event · Place · Topic · Finding וכו' — לא-רק-על-אלה-שכבר-נדונו-ב-v5.3.

**גבולות (עקבי-במלואו עם §23.1/§23.4):** אין-ליצור מערכת/טבלה/Engine/Graph חדשה **מעצם-קיום-ה-Gate**. ה-Gate עצמו הוא **פרוצדורת-בדיקה/checklist**, לא-אישור-בנייה, לא-workstream, לא-Human-Gate-נוסף-במספור (`OPEN HUMAN-GATES` הממוספר) — הוא-שכבת-משמעת שחלה **בתוך** כל שער-קיים כשמדובר-במעבר-Foundation→Projection. `APPROVED` (Governance Principle) · **documentation-only** — אפס-קוד/DB/schema/migration בעקבות-ההוספה-הזו.

### 23.6 INTAKE FOUNDATION CLOSURE — יישום-ראשון של §23.5 על דומיין Research Intake (`APPLIED`, Human-Gate ZURIEL, 25.8.2026, `INTAKE_FOUNDATION_CLOSURE`)

> **מהות:** ה-Gate (§23.5) הופעל בפועל לראשונה — READ-ONLY audit + Challenge-pass (unknown-unknowns) על דומיין Research Intake, ואז סגירה. תוצאה: **`FOUNDATION SUFFICIENT AFTER SECURITY`**. הסעיף הזה מתעד-ומצביע (state/decision summary) — ה**סמנטיקה** המלאה חיה ב-Rules/Codex, לא כאן (עקבי עם עקרון-ההפרדה: Roadmap=status · Master State=סיכום-החלטה · Rules/Codex=סמנטיקה).

- **Security Fix (BLOCKING היחיד שנמצא) — `CLOSED`, מאומת-חי:** `wa_word_review(uuid,text)` היה `SECURITY DEFINER` עם `EXECUTE` פתוח ל-`PUBLIC` (ומכאן גם ל-`anon`) — אישור/דחייה/**מחיקה** של `gematria_words` בלי שום בדיקת-הרשאה בגוף-הפונקציה. תוקן: `REVOKE ALL ... FROM PUBLIC` + `GRANT EXECUTE ... TO authenticated, service_role` — **תואם-בדיוק** את ה-ACL של שתי-הפונקציות-האחיות (`admin_research_review`, `project_contribution_to_graph`). אומת-אחרי: `anon_exec=false` · `authenticated_exec=true` · `service_role_exec=true`. 0 שינוי ל-function body, 0 שינוי-scope.
- **Extension Contract — `research_intake_foundation_contract_law`** (`nodes.rule_id`, גוף מלא ב-`project_codex.slug='research_intake_foundation_contract'`): סוגר-תיעודית (0 schema/migration/table/engine/ledger חדשים) את חמשת ה-Extension Points שנמצאו ב-Challenge-pass: **(1)** META REGISTRY ל-`research_objects.meta` (reserved-keys מול `meta.ext.<domain>.<key>`; `temporal_context`=placeholder-בלבד, נדחה-במפורש ל-Roadmap Gate `OD-TIME-8` + `docs/sod1820-research-time-and-extensible-laws.md` — **אין** Time-model מתחרה); **(2)** SOURCE/CITATION semantics (`source_ref`=ראשי, `meta.source_refs[]`=נוספים-בלבד — לא-כפילות-למחיקה; Source/Book/Edition עתידיים=`nodes`, לא-טבלה); **(3)** RELATION VOCABULARY (`equals*`=שוויון-מספרי בלבד, `same_as`/`alias_of`/`variant_of`=זהות-ישויות — 0 edges היסטוריים נוגעים); **(4)** HUMAN-GATE PROVENANCE ליחסים (מרחיב `decision_ledger` הקיים — `subject_type='relation'`/`subject_ref=edges.id` + `edges.metadata.decision_ledger_id` הדדי — **לא** ledger נוסף); **(5)** PRIVACY PROMOTION LAW (`privacy_scope='private'` **לעולם לא** מקודם ל-graph ציבורי רק-בגלל `engine_verified=true`; מרחיב `CANONICAL≠PUBLISHED` (§20) ל-`PRIVATE CANONICAL≠PUBLIC`).
- **מה לא-נעשה כאן (מפורש):** אין WRITE להיסטוריה (192 שורות `research_objects` / 5,099 `edges` נשארות כפי-שהן) · אין schema/migration/constraint חדש · אין טבלת/engine/ledger מקביל · אין פתרון ל-`OD-TIME-8` (נשאר `OPEN/BLOCKED`, ZURIEL Human-Gate) · אין Intake build עצמו (מפרט בלבד, §13/`command_center_law`).
- **STATUS:** `FOUNDATION SUFFICIENT AFTER SECURITY` — אין MUST FOUNDATION NOW פתוח יותר על דומיין Research Intake. ה-Extension Contract נכנס-לתוקף **מכאן-ואילך** לכל כתיבה של Intake, לא רטרואקטיבית.

### 23.7 PERSONAL FOUNDATION CLOSURE — יישום-שני של §23.5 על דומיין Person (`APPLIED`, Human-Gate ZURIEL, 25.8.2026, `PERSONAL_FOUNDATION_CANONICALIZATION`)

> **מהות:** ה-Gate (§23.5) הופעל על דומיין Person, בעקבות Ariel×Yiska stress-test (שני מקרי-אמת: מחקר-עצמי ו-ציר-חיים+סנכרון) + Person Foundation Contract Crosswalk (5 בדיקות-מקבילות: זהות/מיזוג, Research Context/Scope, Life Event/Time/Numeric-Language, Sensitive-Processing, Person-in-graph). תוצאה: **`FOUNDATION SUFFICIENT — CONTRACT LEVEL`**. הסעיף הזה מתעד-ומצביע — הסמנטיקה המלאה חיה ב-`project_codex.slug='person_foundation_contract'`/`nodes.rule_id='person_foundation_contract_law'`, לא כאן.

- **תיקוני-ייחוס שנעשו בתהליך (לא-drift, תוקנו-תוך-כדי):** (1) F-1b — הוכרז-בטעות כ"authorization drift" מול `docs/planning/family_identity_contract.md` (19.8.2026, לא-ממוזג); תוקן: Master State/Roadmap (24.8.2026, מאוחר-יותר) קובעים F-1a′+F-1b `LIVE` (Ledger-פרטי), רק `OD-F8` חסום — הטקסט-הישן הוא provenance, לא-drift. (2) Numeric Language — אותר בטעות כ"לא קיים חוזה"; תוקן: קיים חוזה מלא, `audits/research_dna_v1_foundation_contract/RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md` §20-22 (Human-Gate ZURIEL 22.8.2026), פשוט לא-תחת `nodes`/`project_codex` (והמסמך-עצמו ממליץ-שלא-לקבע-שם עד ש-readiness ישתפר). (3) Adaptive Research Learning — זוהה כמושג-חדש-נדרש; תוקן: קיים חוזה מאושר, `RAZIEL_PERSONALIZATION_LAW.md` (companion, אותו Human-Gate) — לא-הוגדר-מחדש.
- **Extension Contract — `person_foundation_contract_law`** (`nodes.rule_id`, גוף מלא ב-`project_codex.slug='person_foundation_contract'`): סוגר-ברמת-חוזה (0 schema/migration/table/engine/ledger חדשים) את שלושת ה-MUST שנמצאו: **(1)** PERSON IDENTITY + RESEARCH ROLES (person-ref addressing, role-vocabulary researcher/subject/contributor/owner/participant/mentioned-person, שוויון-מחרוזות-לעולם-לא-מספיק-למיזוג); **(2)** RESEARCH LINEAGE/REPRODUCIBILITY (Finding אישי חייב snapshot-inline של קלטיו, הרחבת דפוס `rule_versioning` הקיים אל `research_objects`); **(3)** PERSONAL DATA PROCESSING (STORE≠RETRIEVE≠PARTICIPATE-IN-RESEARCH≠ANALYZE≠PROMOTE≠PUBLISH, חוק Research-OS גנרי לא-Raziel-specific). Extension Points (לא-נבנים-עכשיו): Representations (`same_as`/`alias_of`/`variant_of`) · Life Event (הרחבת `nodes`/`edges`, לא `events*` טלמטריה) · Participation Scope · Personal Significance taxonomy · Time (תואם `OD-TIME-8`) · Relation Temporality.
- **פריט-אבטחה נפרד, נשאר-פתוח (לא-נסגר-בפאס-הזה):** `fn_mem_add`/`fn_raziel_fact` — `SECURITY DEFINER` עם `EXECUTE` פתוח ל-`anon`+`authenticated`; `fn_raziel_fact` ללא בדיקת-בעלות על `p_user_ref` (כתיבה אפשרית לזיכרון-של-אדם-אחר). אותה-מחלקת-באג כמו `wa_word_review` שכבר-תוקן (§23.6) — כאן **מאומת-חי, לא-תוקן**, ממתין ל-WRITE-authorization נפרד.
- **מה לא-נעשה כאן (מפורש):** אין WRITE להיסטוריה (`research_objects`/`nodes`/`edges` נשארים כפי-שהם) · אין Person table חדשה · אין Life Event/Timeline/Synchronization-Engine · אין Raziel build/redesign · אין תיקון-אבטחה (`fn_mem_add`/`fn_raziel_fact`) · אין merge/deploy.
- **STATUS:** `FOUNDATION SUFFICIENT — CONTRACT LEVEL` על דומיין Person. פריט-האבטחה נשאר-מעקב-נפרד-ודחוף, אינו-חוסם את הסגירה-התיעודית-הזו.

### 23.8 SHARED EXPRESSION EXTRACTION v1 — FOUNDATION CLOSURE (`APPLIED`+`MERGED`, Human-Gate ZURIEL/GPT, 26.8.2026, `SHARED_EXPRESSION_EXTRACTION_V1_MERGED`)

> **מהות:** ה-Gate (§23.5) הופעל על שכבת-חילוץ-הביטויים (שקדמה-למנוע) — לא דומיין-ישות (Number/Person) אלא **שכבה חוצת-דומיינים**: איך טקסט-מקור (WhatsApp/OCR/Writer-Intake) הופך לביטוי-גימטרי/אריתמטי ניתן-לבדיקה, לפני שהמנוע-הקנוני (`gematria_methods`) מחשב אותו. נבנה ונבחן על קורפוס-אמיתי (צבי, 378 מקורות) + כתב-שני-לבדיקה (כריסטינה) לפני-הקיבוע, בדיוק לפי §23.5 (לא-לנחש-את-כל-העתיד, רק-למנוע redesign-צפוי).

- **תוצאה:** `FOUNDATION SUFFICIENT` תחת-היקף-עברי-בלבד; **פער-אחד-מזוהה-ולא-פתור** (Multilingual — טוקנייזר `[א-ת]`-בלבד לא-יעמוד בכתב שממזג עברית עם תעתיק-לטיני/שיטה-לא-עברית; מסווג `EXTENSION POINT NOW`, לא `MUST FOUNDATION NOW`, כי-לא-נצפה-עדיין).
- **Extension Contract — `shared_expression_extraction_contract_v1`** (`nodes.rule_id`, גוף מלא ב-`project_codex.slug='shared_expression_extraction_v1'` + `docs/shared-expression-extraction-v1-contract.md`): Pipeline קנוני SOURCE→SEGMENTATION→EXTRACTION→AST→OPERAND-RESOLUTION→ENGINE→VERIFICATION→TRUTH-CLASSIFICATION→PROVENANCE→PROJECTION · **36 חוקים-נלמדים** (34 `ACTIVE_SHARED`, R31 `REJECTED_REVERTED` נשמר-בהיסטוריה, R33 `SUPERSEDED` ע"י תיקון-זהות-השיטות) · **חוזה-כינוי-שיטות**: `method_key='קדמי'` ↔ `display_label="קדמי · משולש"` מאומת-חי מול `gematria_methods` (לא-ניחוש); "משולש" בלי-הקשר נשאר-עמום-ביודעין (5 method_key חיים) · **4 שיטות-משולש-ספציפיות** (גדול/מילה/הפוך/מדרגות) נשארות method_key נפרדים-לגמרי, אף-אחת-לא-התמזגה · **Regression Corpus v1** (צבי 378/623/288/122/213 + כריסטינה — רפרנסים-מדויקים בחוזה) · **חוק-שינוי-חוזה** (FIX/EXTENSION/NEW_CANDIDATE_RULE/SUPERSESSION/REVERT + regression-מחדש חובה לכל-שינוי-עתידי).
- **קוד שבוצע (2 תיקונים בפועל, לא-רק-תיעוד):** `analysisFlow.js:normMethod()` — הוסר-מיזוג שגוי `ריבוע|משולש→ריבוע` (דריפט-אמיתי מול הלוח-החי, לא-רק-גס) · `triage.js` — **Rule #35** (`extractVerticalArithmetic`, פריסה-אנכית-רב-שורתית כמו OCR, מחייב-עדות-מבנית ≥3-שורות-עירומות/≥2-מספר/1-"=", שלילי מאומת) · **Rule #36** (`stripStrandedTrailingPhrases`, הפרדת-פרוזה-נגררת כמו "543×4 גילויים..=2172", מוגבל-ל-EQ-ממשי-בלבד אחרי שרגרסיה-אמיתית-על-קורפוס-צבי תפסה-גרסה-קודמת-מזיקה — נתפס-ותוקן לפני-מיזוג).
- **מה לא-נעשה כאן (מפורש):** אין WRITE ל-`research_objects`/`gematria_words` של צבי (297 שורות נשארות-כפי-שהן) · אין-פתרון ל-213 המקרים-הלא-פתורים (כולל 101 NO_ENGINE_MATCH/א+יב"ק/א---ברחמים-גדולים) · אין שיטת-גימטריה חדשה · אין א׳-רבתי · אין קידום-לעץ-כללי/Number-Page/Premium · אין חיווט-Raziel/OCR בפועל (Extension Point בלבד, מוגדר-לא-בנוי) · אין Writer 3.
- **STATUS:** `APPLIED`+verified+**MERGED to main** (`796b3a3d`, ff-merge נקי מ-`origin/main@3351bac9`, 0-קונפליקט) — `npm run build` נקי, Zvi-regression זהה-בדיוק (623 artifacts/213 unresolved, 0-שינוי), Christina-regression עבר (חיובי+שלילי-בקרה). **Deploy(Vercel)/Live-verification — לא-בוצע בסבב-הזה**, ר' Roadmap להחזרה.

### 23.9 CORPUS ADMISSION FOUNDATION v1 — FOUNDATION FROZEN, זה-הענף השני (`APPLIED`, Human-Gate ZURIEL/GPT ממתין, 26.8.2026, `CORPUS_ADMISSION_FOUNDATION_V1`)

> **מהות:** §23.5-Gate הופעל על שכבת-קבלת-מילים-לקורפוס (`gematria_words`) — אודיט מלא של 22 נתיבים חיים שיכולים ליצור/לקדם/לאמת שורת-מילה, ואז סגירת-כל-ה-bypass-ים שנמצאו בפועל. נבנה ונבחן מול קורפוס-אמיתי (אותם קורפוסי-בדיקה) ומול חוזה-הקנוני **הקיים-מראש** `audits/research_dna_v1_foundation_contract/CORPUS_APPROVAL_LIFECYCLE.md` (22.8.2026) — לא הומצא lifecycle מקביל. בוצע-ב-4 סבבי-סגירה (`docs/corpus-admission-foundation-v1-contract.md`), כולל תיקון-דריפט אחד אמיתי מול אותו חוזה (`resolve_word_review` מעלה כעת `is_verified=true`, לא-רק `visibility_reason`) ותיקון-נוסף בסבב-4 (ר' למטה).
>
> **מקור זה `PR #198`** (`claude/corpus-admission-foundation-v1`, ענף שהתקדם `9f90136b→34ca0df8→365b40a8` על-פני 4 סבבי-סגירה), נפתח כ-PR נגד `main` ישן (`2a5a25c1`) ולא-היה-ניתן-ל-raw-merge אחרי ש-PR #197/#196 התמזגו (`mergeable_state=dirty`). התוכן-הייחודי-שלו **הועתק-מחדש** (fresh port) על-`main` הנוכחי בסבב הזה, לא-מוזג-גולמית.
>
> - **תוצאה (מתוקנת בסבב-4, ר' למטה):** `FOUNDATION SUFFICIENT` — אפס-bypass נותר מבין 10 הנתיבים היוצרי-מילה (`wa_add_word`/`wa_add_vip_word`/`enqueue_word_review`/`resolve_word_review`/`admin_add_word`/`admin_add_alias`/`admin_edit_alias`/`promote_finding_to_dict`/`admin_promote_contrib_card`/`wizard_build_convergence`) — כולם עוברים כעת דרך שער-זהות משותף-אחד (`fn_corpus_admission_gate`, ישירות או דרך `wa_add_word`+`fn_resolve_word_identity` בנתיב-האישור).
> - **Extension Contract — `corpus_admission_foundation_v1`** (`nodes.rule_id`, גוף מלא ב-`project_codex.slug='corpus_admission_foundation_v1'` + `docs/corpus-admission-foundation-v1-contract.md`): **שער-זהות אחד** (`fn_corpus_admission_gate`, עוטף `fn_resolve_word_identity` הקיים — משתמש-חוזר ב-`fn_normalize_for_calc`/`find_similar_words` הקיימים, אפס-לוגיקה-מטושטשת-חדשה) · 4 רמות-זהות EXACT_MATCH/SAFE_NORMALIZED_MATCH/POSSIBLE_VARIANT(לעולם-לא-auto-merge)/NEW · **גילוי-חוזר** — כתב חדש שמגלה-מחדש מילה-קיימת-עם-ערך-נטען → שורת `research_objects` (משתמשת-חוזרת, `meta.ext.corpus_admission`), **בלי** ערך-נטען → אין-שורה · **סגר INSERT-RLS** על `gematria_words` (היה כל-משתמש-רשום → אדמין-בלבד) · **`add_entity` חוזק** (`SECURITY DEFINER`+admin, אומת כלגיטימי מול `gematria_auto_registry_law` הנעול) · **VIP≠bypass**/**`p_safe_to_auto`≠bypass** (שניהם עוברים כעת דרך התור, לא-insert-ישיר) · **`created_by`** נוסף לכל 7 נתיבי-האדמין-המפורשים.
> - **🔧 תיקון-סבב-4 (26.8.2026, אימות-חי טרי מול `linswmnnkjxvweumprav`, אותו-סבב-הזה):** הפאס-הקודם (סגירה-3, וגם הפסקה-הקודמת ב-Roadmap שכבר-מוזגת) דיווחו "6/7 — `admin_promote_contrib_card` בלבד עדיין-חסר `created_by`". **אימות-חי טרי מצא זאת מיושן-לטובה:** `pg_get_functiondef` על `admin_promote_contrib_card` **וגם** שני-הלולאות של `wizard_build_convergence` (core+candidate) מראה `created_by=auth.uid()` כבר-קיים ברשימת-העמודות של ה-INSERT. **7/7, לא 6/7.** מקור-התיקון-המדויק (איזה-סבב/סוכן סגר את זה) לא-זוהה בסבב הזה — מתועד כדריפט-לא-משויך, לא-נטען כעבודת-הסבב-הזה. שאר-6-הבדיקות (10/10 נתיבים דרך השער · VIP-bypass סגור · `p_safe_to_auto`-bypass סגור · רעש-prefix ב-`find_similar_words` סגור · `resolve_word_review` מעלה `is_verified=true` · **אפס** עמודת `admission_status` חדשה ב-`information_schema.columns`) — כולן אומתו-מחדש ותואמות-בדיוק את-הנטען.
> - **`admission_status` — הוכח-שלא-נדרש:** החוזה הקנוני כבר-ממפה כל-שלב לשדה-קיים ומצהיר-במפורש "לא-טבלה/עמודה/state-machine-חדשה"; אחרי תיקון `resolve_word_review`, `is_verified` נושא-משמעות-עקבית לכל-הנתיבים. **אפס עמודה חדשה** (מאומת-מחדש חי, סבב-4).
> - **מה לא-נעשה כאן (מפורש):** אין שיטת-גימטריה חדשה · אין טבלה/engine/store מקביל · אין שינוי-התנהגות-קצה-משתמש-VIP/וואטסאפ (עדיין-מקבל-עדיפות/סדר בתור, לעולם-לא-מקצר-Human-Gate) · אין UI חדש · אין Writer 3 · אין merge/deploy עדיין (docs-only fresh-port, Human-Gate ממתין).
> - **STATUS:** `APPLIED`(DB חי, `linswmnnkjxvweumprav`) — קוד-ה-RPC/RLS חי-בפרודקשן-DB (עצמאי-מ-git-deploy, לפי-מוסכמת-הפרויקט). המסמך (`docs/corpus-admission-foundation-v1-contract.md`) **fresh-port `PR #199` פתוח (`draft`), טרם-ממוזג** (מחליף/משלים את PR #198 שלא-ניתן-היה-ל-raw-merge). **0 שורות-כפולות בכל-בדיקות-הגילוי-החוזר, 0 `admission_status` חדש, 7/7 `created_by`-coverage (מתוקן, סבב-4), 10/10 נתיבים דרך-השער (מאומת-חי סבב-4).** **Deploy/Live-verification — לא-רלוונטי** (שינויי-DB בלבד, אפס-שינוי-קוד-קליינט מלבד המסמך).
> - **🏁 תיקון-מיזוג-סופי (26.8.2026, `CANONICAL_METADATA_RECONCILIATION`):** `PR #199` **מוזג ל-`main`** (`06087fca`, `merged=true`). `PR #198` **נסגר ללא-מיזוג** — גוף-ה-PR עודכן (ע"י-הסבב-שביצע-את-המיזוג) לסמן במפורש `SUPERSEDED BY #199`, אין-אובדן-תוכן (כל-התוכן-הייחודי כבר-הועתק ב-fresh-port). `docs/corpus-admission-foundation-v1-contract.md` אומת חי כקיים על `main` (Closure Pass 4). **סטטוס נוכחי:** `FOUNDATION_SUFFICIENT_MERGED_VERIFIED`. `nodes.rule_id='corpus_admission_foundation_v1'` ו-`project_codex.slug='corpus_admission_foundation_v1'` עודכנו (additive, היסטוריה-נשמרת) לשקף merged=true/PR #199/superseded=#198 — ר' `work_log` לפירוט-מלא. **נקודת-החזרה-הבאה:** `Writer 3 validation` (לא-נפתח בסבב-זה).

### 23.10 NUMERIC RESEARCH ROUTER v1 — π + Fibonacci Sequence Lens (`IMPLEMENTED ON BRANCH`, Draft PR #203, Human-Gate ZURIEL/GPT ממתין, 26.8.2026, `NUMERIC_RESEARCH_ROUTER_V1_PI_FIBONACCI`)

> **מהות:** לא-§23.5-Gate על-דומיין-חדש (Number עצמו כבר-מוקם, §23 §Numeric-Root) אלא **סנכרון-תיעודי** של עבודה-שכבר-בוצעה-ואומתה-חי, per הנחיית-צוריאל המפורשת ("Canonical Documentation Sync Only" — אין-קוד/DB-חדש בסבב-הזה עצמו). GPT בנה על ענף `gpt/numeric-research-router-v1-pi` (HEAD `f65bb07a94fa5706c3dc9ec81e8af1f322346754`, 8 קומיטים); Claude ביצע אימות-חי-עצמאי-מלא (לא-סמך-על-הדיווח): `git diff --stat` מול `main` = בדיוק 5 קבצים-חדשים תחת `src/lib/research/`, 0-קבצים-קיימים-נגעו, 0-DDL; `grep` = אפס-imports (קוד רדום); **הרצת-node ישירה** של `piSequence.js`/`fibonacciSequence.js` שיחזרה bit-for-bit את כל-הטענות המספריות.

- **תוצאה:** `FOUNDATION SUFFICIENT` — הוכח דרך **שני** stress tests (π `digit_stream`, Fibonacci `term_sequence`), לא-רק-π, שניהם דרך אותו חוזה-גנרי `sequenceLens.js` בלי Router-redesign.
- **הרחבה של תשתית קיימת, לא-מערכת-מקבילה:** `numericResearch.js` משתמש-חוזר ב-`Universal Finding` (`makeUniversalFinding`, כבר-קיים) ובקריאות-RPC קיימות-בלבד (`fn_number_lookup`/`fn_number_dossier`/`fn_number_journey`/`number_neighbors`/`fn_hot_context`) דרך `rpc()` מוזרק-מבחוץ — הקוד עצמו לא-מחזיק חיבור-DB, לא-כותב, אף-פעם.
- **חוזה `Sequence Lens` (`sequenceLens.js`):** רגיסטרי+dispatch גנרי, לא-יודע-כלום-על-π/פיבונאצ'י ספציפית — כל `sequence:<id>` עתידי מתחבר-לאותו-שקע.
- **π stress test:** `piSequence.js`, `representation_kind='digit_stream'`, Chudnovsky binary-splitting+BigInt (חישוב-דטרמיניסטי-אמיתי, לא-קירוב). מוסכמת-מיקום: `position 1 = הספרה-הראשונה-אחרי-הנקודה-העשרונית`. מאומת (Claude, node): `337→230` · `3060→5679` · `1820→24653`.
- **Fibonacci stress test:** `fibonacciSequence.js`, `representation_kind='term_sequence'`, מוסכמה `F1=1,F2=1`, one-based. מאומת: `233→איבר13` · `1→איבר1` · `337→NOT FOUND`. **Foundation leak אמיתי נמצא-ותוקן-בפועל:** הגרסה-הראשונה של Router כפתה operation ספציפי-ל-π; תוקן כך ש-`defaultOperation` שייך-לכל-adapter, Router-core לא-מקודד-שוב סמנטיקת-רצף-ספציפית — **הוכחה שהחוזה-הגנרי אכן-עומד-במבחן-שני-רצפים-שונים, לא-רק-הראשון**.
- **חוזה Truth/Admission (Human-Gate, לא-קוד-נוסף):** `Sequence Finding` (זמני) → שמירה-מפורשת-של-אדם → שורת `research_objects` מועמדת (בצורה-הקיימת-כבר, `engine_verified=true` דטרמיניסטי) → בחירה-מפורשת-של-IDs → `fn_composite_convergence_candidate` (הגשר של Claude, §23-Numeric-Root — חתימתו החיה דורשת `p_target_value`+`p_research_object_ids`+`p_by`, **לעולם לא-אוטומטי**) → `research_candidate` → Human Gate. `priority`=`NOT_A_TRUTH_SIGNAL`, לעולם-לא-סף-קבלה-אוטומטי.
- **שימור מסלולי-צבי:** 1020×3=3060 · 612×5=3060 · 17×180=3060 — נשארו-חיים ב-`research_objects` ללא-שינוי; π/Fibonacci הם additive-בלבד.
- **מה לא-נעשה כאן (מפורש):** אין קוד/DB-חדש בסבב-התיעוד-הזה עצמו · אין Prime/Geometry adapter נוסף · אין UI · אין טבלה/schema חדשה · אין "מחשבון-פאי" נפרד · אין Divine Symmetry Engine · אין bulk-scan · אין הכנסה-אוטומטית של Sequence Findings ל-`research_objects` · אין merge/deploy.
- **STATUS:** `IMPLEMENTED ON BRANCH` בלבד. **Draft PR #203** (`gpt/numeric-research-router-v1-pi`→`main`, `draft=true`, `merged=false`, +514/-0, 5 קבצים) — **לא MERGED, לא DEPLOYED, לא LIVE ב-production.** **נקודת-החזרה-הבאה:** `Number Research Dossier v2 — Projection Contract` (חוזה-נתונים: "אם פותחים 1820 עכשיו — מהו תיק-המחקר-המלא שהמערכת מסוגלת-להרכיב, בלי-קשר-לאיך-מציגים" — עדיין-לא-UI, צוריאל מוביל את הצד-המחקרי).

### 23.11 CONTRIBUTOR SCOPE & CORPUS COMPLETENESS — §6 additive ל-`research_intake_foundation_contract` (`APPLIED`, Human-Gate ZURIEL ממתין, 26.8.2026, `RESEARCH_INTAKE_CONTRIBUTOR_SCOPE_V1`)

> **מהות:** לא-דומיין-חדש — **סטרס-טסט על חוזה קיים** (§23.6, `research_intake_foundation_contract`/`research_intake_foundation_contract_law`). המבחן שנשאל במפורש: "האם החוזה שנבנה מ-עמית יעבוד מחר באותה-צורה על חוקר-אחר, corpus-אחר ומקור-אחר — בלי redesign?" בוצע מול 2 corpus stress tests **עצמאיים-לגמרי** שכבר-הושלמו קודם (Zvi Corpus Track A — 4 סבבי-חילוץ WhatsApp/3D-Geometry; Amit Existing Corpus — 2 סבבי-חילוץ media-archive רב-לשוני/writer-method). **תוצאה: כן, מחזיק — בתוספת §6.**
>
> **LIVE-FIRST verification (לפני-כתיבה):** `git fetch origin` אישר `origin/main` ב-`b7363348` (זז מ-`06087fca` בעקבות PR #207/#204/#200 שכבר-מוזגים, לא-חופפים לסקופ-הזה — אומת via `git log`/`git diff --stat`, אינו-DRIFT); `SOD1820_MASTER_ROADMAP.md`+`SOD1820_MASTER_STATE.md` נקראו-חי מ-`origin/main`; `nodes(type='rule')`+`project_codex` נסרקו לאיתור-החוזה-הקיים — אותר `research_intake_foundation_contract`/`_law` (לא `corpus_admission_foundation_v1`, שהוא-חוזה-צר-יותר על `gematria_words`-admission בלבד); `work_log` נסרק — אותרה רשומת-אסטרטגיה קודמת (GPT) שקבעה Skeleton→Stress-Tests[Zvi,Amit,...]→Contract-Freeze, מאשרת שה-Freeze אינו-עדיין-דרוש.
>
> **§6 CONTRIBUTOR SCOPE & CORPUS COMPLETENESS** (גוף מלא ב-`project_codex.slug='research_intake_foundation_contract'` §6, ~10.4K תווים): 6 חוקים, כולם EXTENSION POINT NOW, מנוסחים מעל primitives קיימים בלבד —
> - **6.1 Contributor Scope Separation** — ABOUT-CONTRIBUTOR (דוסייה, `contributors`+`dossier_settings`) מול BY-CONTRIBUTOR-ABOUT-WORLD (`research_objects`+`meta.contributor_id`), ברמת-תוכן לא ברמת-שורת-מקור.
> - **6.2 Source-Window/Corpus Completeness** — 3 רמות-מיצוי נבדלות (SOURCE EXHAUSTED / KNOWN CORPUS EXHAUSTED / CONTRIBUTOR CORPUS COMPLETE), אסור-לערבב, אסור-להצהיר-בלי-ראיה.
> - **6.3 Representation Collapse** — שרשרת מחייבת SOURCE ARTIFACT→EXTRACTED CONTENT→CORE FINDING/CLAIM→EVIDENCE/REPRESENTATIONS; ריבוי-ייצוגים (שפה/צורה) של אותו CORE FINDING ≠ כפילות/ממצא-נפרד.
> - **6.4 Access⊥Truth/Scope** — `privacy_scope`/`sensitive` הוא-ציר-נפרד-לגמרי מ-CLAIM/VERIFIED/CANONICAL ומ-§6.1; מרחיב את §5 PRIVATE CANONICAL≠PUBLIC. שינוי-גישה תמיד-נפרד-ומפורש, לעולם-לא תוצר-לוואי.
> - **6.5 No Contributor-Specific Engine** — אין מנוע/טבלה ייחודי-לתורם-בודד (למשל "Rov-44" של עמית); writer-method נשמר כ-`meta.ext.writer_method.<name>`, קידום-לקנוני עובר תמיד דרך `agent_onboarding_law`/`method_priority`. מרחיב `els_single_engine_law`/`gematria_engine_law`.
> - **6.6 Exhaustion Before Freeze** — Contract Freeze אסור לפני N≥3 corpora שונים-במהות; **נכון-לעכשיו 2/N** (Zvi, Amit).
>
> **פערים ידועים (מוצהרים, לא-נסגרים בפאס-הזה):** (א) אין שדה-מבני לסימון ABOUT-vs-BY ברמת שורת-מקור בודדת (§6.1) — כרגע סיווג פרשני-ידני בלבד. (ב) אין שדה-מבני ל-completeness-tier (§6.2) — כרגע ניסוח-טקסטואלי-בדוח בלבד. שניהם מועמדים ל-`meta.ext.scope.*`/`meta.ext.corpus.*` עתידי — לא נבנה כאן.
>
> **Future-Capability Challenge:** האם עולה פער עתידי-סביר שיאלץ redesign? **לא-כרגע** — §6 מנוסח כולו מעל primitives-חוצי-דומיין (`contributor_id`/`source_ref`/`privacy_scope`/`meta.ext.<domain>.<key>`) שכבר-קיימים ומשומשים משני-קורפוסים-שונים-לגמרי; corpus-שלישי/רביעי (קול/וידאו/שפה-נוספת) צפוי-להיכנס לאותם primitives בלי שינוי-מבני, בכפוף-לאימות-חוזר בסבב-הבא.
>
> **מה לא-נעשה כאן (מפורש):** אין UI · אין מנוע/עץ/store מקביל · אין schema/migration/טבלה חדשה (גם-לא "שדה-נוח") · אין קידום-Claim→Fact/Canonical · אין הכרזת-corpus כ-"מוצה" בלי-ראיה (Zvi/Amit נשארים 2/N, לא-הוכרזו-שלמים) · אין merge/deploy · אין Contract Freeze.
>
> **STATUS:** `APPLIED` (DB חי: `nodes.rule_id='research_intake_foundation_contract_law'` `rule_version` 1→2 additive · `project_codex.slug='research_intake_foundation_contract'` §1-§5 נשמרים verbatim + §6 נוסף, Cross-reference עודכן) · git: ענף `claude/research-intake-contributor-scope-v1` (base `origin/main`@`b7363348`) — **טרם-Commit בזמן-כתיבת-השורות-האלו, טרם-PR, טרם-merge, טרם-deploy, טרם-Contract-Freeze.**

### 23.12 CLOSURE DELTA #2 — Source Authorship / Procedure / Private-Derivation / Symbol-Identity / Formula-Instance (`APPLIED`, Human-Gate ZURIEL ממתין, 26.8.2026, `RESEARCH_INTAKE_CONTRIBUTOR_SCOPE_V1_DELTA2`)

> **מהות:** **לא-חוזה-שני.** GPT המשיך למצות את-אותו-קורפוס-עמית (`work_log.5aa4cb1d-0f6f-4bed-890b-cd24395d7a01`, "AMIT EXISTING CORPUS EXHAUSTION PASS V2") ומצא 7 תבניות-ראיה-נוספות שהחוזה-האחד (§23.6/§23.11) לא-קרא-בשם-עדיין. **ONE-CONTRACT/ONE-SYSTEM (הבהרת-צוריאל, אותו-סבב):** אין Amit Contract/Zvi Contract/corpus-specific Foundation contracts מקבילים — Zvi/Amit/קורפוסים-הבאים הם **Stress Tests** של `research_intake_foundation_contract` היחיד; כל חוק-חדש עובר מבחן-אוניברסליות (אוניברסלי→הרחבה-additive של-החוזה-האחד; לא→provenance/implementation-detail-של-אותו-corpus, לא-Foundation-Law). קבצי `docs/*.md` הם **historical-provenance git-mirror בלבד** של-תוכן-ה-DB-הקנוני-האחד — **לא SSOT מקביל**.
>
> **7 הממצאים, נבדקו מול-החוזה-הקיים לפני-כתיבה (ROUTE-FIRST):**
> 1. **Source Authorship ≠ Analyst Interpretation** → `CONTRACT DELTA` (§6.7). ראיה-חיה: שורת `research_objects` על "הרב זיגדון" (`attribution_type='mixed_fact_interpretation'`, `source='SOD1820 research synthesis'`) חשפה בלבול-קיים-בפועל בין-טענה-מקורית לסינתזה-מאוחרת. תיקון: attribution הוא per-object, לא-יורש.
> 2. **Research Procedure Extraction** → `CONTRACT DELTA` (§6.8). פרוצדורה (tokenize→gematria→is_prime→findings) אינה-kind-חדש ואינה-Engine-נפרד; מתועדת כ-`meta.ext.procedure.steps[]` מעל-primitives-קיימים; כל-שלב עדיין-עובר `shared_expression_extraction_contract_v1`.
> 3. **Private-Derivation Boundary** → `CONTRACT DELTA` (§6.9, מרחיב §5). `derived_from`-chain יורש privacy_scope-מחמיר; ממצא-כללי-עצמאי (לא-תלוי-באופרנד-הפרטי) הוא-שורה-נפרדת עם privacy_scope משלו.
> 4. **Per-Member Method Provenance** → `ALREADY COVERED` — `fn_composite_convergence_candidate`'s Eligibility Gate (engine_verified+value+status+source_ref לכל-חבר) + `group_size≠strength` (§9). **0 חוק-נוסף.**
> 5. **Derived-Sequence Detection** → `EXTENSION POINT` — כבר-מתועד ב-Numeric Research Router (Master State §23.10, `arithmetic_stride`/Number-as-Operator, PR #206 טרם-ממוזג). **לא-נבנה-מסלול-מקביל.**
> 6. **Mathematical Symbol/Operation Identity** → `CONTRACT DELTA` (§6.10). מרחיב את-עיקרון `gematria_methods.method_key` (זהות-נעולה≠display_label) לכל-אופרטור-מתמטי (φ Euler Totient≠φ Golden Ratio) דרך `meta.ext.numeric_op.<key>`. רגיסטרי-בפועל = `EXTENSION POINT` עתידי.
> 7. **Formula Instance ≠ New Law** → `CONTRACT DELTA` (§6.11, מוסיף ל-§3 בלבד). `edges.relation_type='derived_from'` (4 שורות-קיימות-בפועל, למשל `"1024 = 512 × 2"`) מוכרז-רשמית כקטגוריה-שלישית ב-§3 (לצד equals*/same_as*) — T37−T36=37 מתועד כ-`derived_from`-edge עם-`operation`, לעולם-לא כ-Method/Law חדש.
>
> **הבהרה-לדוח הקודם (§23.11, לא-נשמר-בלי-הסתייגות):** "לא-נמצא פער-עתידי-סביר שיאלץ redesign" — **נכון ברמת-schema** (0 מ-7 דרש-redesign/טבלה/engine-חדש), **אך-מסויג**: הקריאה-הנכונה היא "לא-נמצא פער-שובר-סכמה", **לא** "החוזה כבר-ממצה-את-כל-צורות-הראיה" — כל-סבב-סטרס-טסט ממשיך-לחשוף **צורות** חדשות (שכבת-פרשנות, פרוצדורה, גבול-נגזרת, זהות-סמל) שהחוזה לא-קרא-בשם-קודם.
>
> **מה לא-נעשה כאן (מפורש):** אין Amit-specific/Zvi-specific contract · אין UI · אין engine/table/schema חדש (`derived_from` הוא-text-חופשי-כבר, ללא-CHECK) · אין קידום-Claim→Fact/Canonical · אין הכנסת-convergence-families-של-עמית לעץ, אין `research_objects` חדשים (Admission Pass נפרד ומבוקר, לא-בסבב-הזה) · אין merge/deploy/Contract-Freeze.
>
> **STATUS:** `APPLIED` (DB חי: `rule_version` 2→3 additive · `project_codex` §1-§6 נשמרים verbatim + §6.7-§6.11 + Routing Crosswalk נוספו, 10,388→18,597 תווים) · git: אותו-ענף `claude/research-intake-contributor-scope-v1` — **טרם-Commit-נוסף-בזמן-כתיבת-השורות-האלו, טרם-PR, טרם-merge/deploy/Admission/Contract-Freeze.**

### 23.13 PRE-INTEGRATION CROSS-CONTRACT RECONCILIATION — vs PR #206 + Research OS family (`APPLIED`, Human-Gate ZURIEL/GPT ממתין, 26.8.2026, `RESEARCH_INTAKE_PRE_INTEGRATION_RECONCILIATION`)

> **מהות:** לפני Controlled Admission של Zvi+Amit, ZURIEL/GPT ביקשו reconciliation ממוקד מול PR #206 (Numeric Research Router) — לוודא **שאין** Router/Contract/Truth-Lifecycle כפול בין `research_intake_foundation_contract`, PR #206, ו-Spatial Gematria. **תגלית מרכזית לפני-הבדיקות עצמן:** קיימת-כבר, מקודם, משפחת-חוזים שלמה ("Research OS") שאף-אחד-מהצדדים-לא-התנגש-בה: `docs/research-studio-v1-contract.md` (**One Research OS**, APPROVED ZURIEL 24.8.2026 — Discovery→Universal Findings→Investigation→Judgment, טקסונומיית Lens/Dimension), `docs/research-universal-finding-contract.md` (**Universal Finding envelope**, APPROVED, ממוזג ב-PR #187 — `subject/source/identity/verification/evidence/access/provenance/projection/view`, "פרויקציה בלבד, לא-storage-owner"), ו-**Research DNA v1 Foundation Contract** (`audits/research_dna_v1_foundation_contract/`, PR #166, `CONTRACT: CLOSED` — `verification_state`: match/mismatch/method_unknown/not_tested). PR #206 עצמו **כבר-כותב במפורש** "existing Research OS / Reality Graph" — כלומר-כבר-ממקם-את-עצמו-כ-Lens **בתוך** המערכת-הזו, לא-כמתחרה-בה.
>
> **5 הבדיקות שבוצעו (מול-קוד-חי, `pull_request_read`+`get_file_contents` על PR #206, לא-רק-דיווח):**
> - **CHECK 1 — גבולות-חוזה:** מפת-בעלות מלאה (Research DNA v1 / Intake / Universal Finding / Research Studio v1 / Numeric Router / Gate #18-decision_ledger / `fn_composite_convergence_candidate` / Spatial Gematria) — **0 שני-חוזים תובעים-בעלות על-אותה-אחריות-lifecycle**. אומת-חי בקוד: `numericResearch.js` מייבא ומשתמש-חוזר ב-`makeUniversalFinding()` הקיים (`src/lib/research/universalFinding.js`) — **לא-משכפל** את-ה-envelope. תיקון-ניסוח יחיד (לא-חוק-חדש): `research_objects.meta` (שורת-DB, Intake §1) מול `Finding.provenance` (פרויקציה-ארעית, Universal Finding Contract) הם **שני-אובייקטים-שונים** — הובהר-שהשני נמלא-מהראשון בהקרנה, לא-מוגדר-מחדש. **verdict: NO DRIFT.**
> - **CHECK 2 — §6.10 Operation Identity:** אומת-שהניסוח-הקיים **לא** הפך את `gematria_methods` לרגיסטרי-כללי — תוקן-ניסוח (לא-שונה-מהותית) להבהיר-במפורש: `gematria_methods` נשאר-ייעודי-לגימטריה-בלבד (ragil/atbash/miluy...), ו-`operation_key` למתמטיקה-כללית (prime/MOD/Euler-totient/π/binary) חי ב-`meta.ext.numeric_op.<key>` או-ברגיסטרי-נפרד-עתידי — `method_key` הוא-**precedent-לעיקרון** (זהות-יציבה≠display-label), לא storage-home-אוניברסלי.
> - **CHECK 3 — Fibonacci/Derived-Sequences:** נבדק-הרכב-בלי-subsystem-חדש עבור `[888,1480,2368]→factor-296→[3,5,8]→Fibonacci` (ראיית-עמית): (א) common-factor/GCD = operation_key **חדש-יחיד** (מיוצג כ-`derived_from`-edges, בדיוק-כמו-הדוגמאות-החיות-הקיימות `"1024=512×2"`); (ב) 3/5/8 עצמם **כבר-ניתנים-לבדיקה היום** מול `fibonacciSequenceAdapter` הקיים ב-PR#206 (3 קריאות-נפרדות, ללא-שינוי-קוד: `first_position` 3→איבר4, 5→איבר5, 8→איבר6); (ג) רציפות-האינדקסים (4,5,6) = בדיקה-אריתמטית-טריוויאלית, לא-engine. **0 רכיב-חדש נדרש מעבר ל-operation_key אחד. verdict: EXTENSION POINT SUFFICIENT, לא Foundation Gap.**
> - **CHECK 4 — Spatial:** ההכרעה-הקיימת-ב-PR#206 (`EXISTING CAPABILITY — ADAPTER NEEDED`, 4-שכבות Text→Gematria(מאומת)→Mathematical-Structure→Geometric-Form, `fact≠midrash`) **תואמת-במדויק** את-הניתוב-שכבר-נכתב-ב-§23.12/§6-Routing-Crosswalk עבור 37/73-עמית וממצאי-צבי — **אותו Spatial Adapter-יחיד לשניהם, אין Geometry Engine שני.** **verdict: CONFIRMED, ללא-סתירה.**
> - **CHECK 5 — Admission Readiness:** צבי (source/image-provenance→Intake§1-2+Finding.source/identity; numeric/spatial→Router+Spatial-Adapter[טרם-נבנה, אך research_objects-ישיר כבר-עובד כמו 1020/910/620 הקיימים]; operand-provenance-לא-ידוע[911]→`derived_from`+status; interpretation≠fact→Research-Studio-Core-Rule+`attribution_type` **כבר-חי בפועל**) ועמית (convergence-families→`fn_composite_convergence_candidate`; 37/73/2701→numeric+spatial extension-points; π/Fibonacci→**כבר-ממומש**; prime/MOD/binary/totient→`operation_key` extension-points; multilingual→§3+`shared_expression_extraction_v1`; private-derivations→§6.9; source-claims-לא-משוחזרים→`verification_state=mismatch/method_unknown` **בדיוק-הערך-הנכון-שכבר-קיים**) — **כולם מיוצגים-אוצרתית** ברמת-חוזה, חלק כ-Extension-Point-שטרם-נבנה (לא-Foundation-Gap).
>
> **Foundation Expansion Gate (Reconciliation Pass):** **0 MUST FOUNDATION NOW.** EXTENSION POINT NOW: בניית-Spatial-Adapter · `operation_key` ל-GCD/MOD/prime/totient/binary · רגיסטרי-נפרד-לפעולות-מתמטיות (לא-`gematria_methods`). LATER: טוקנייזר-רב-לשוני-מלא · traversal-רקורסיבי-אוטומטי-מעבר-ל-Depth-2 · סריקה-המונית.
>
> **פסיקה: `FOUNDATION SUFFICIENT FOR CONTROLLED ZVI+AMIT ADMISSION`** — החוזים-יחד (Intake+Universal-Finding+Research-Studio-v1+Numeric-Router+Spatial-existing+Composite-Convergence) מסוגלים-לקבל-את-כל-סוגי-הממצאים-שנמנו ברמת-חוזה/אוצר; מימושי-Lens/Adapter ספציפיים (Spatial, GCD/MOD/prime/totient) נשארים ל-Numeric-Router's-own-roadmap להשלים — לא-חוסמים-Admission-מבוקר (מסלול-ישיר-קיים ל-`research_objects`, כפי-שכבר-משמש-לצבי).
>
> **מה לא-נעשה כאן (מפורש):** אין-נגיעה-בקוד-PR#206 · אין-merge-של-PR#206 · אין-Controlled-Admission-בפועל (0 research_objects חדשים) · אין-Contract-Freeze.
>
> **STATUS:** `APPLIED` (DB חי: `rule_version` 3→4 additive · `project_codex` §1-§6.11 נשמרים כמעט-verbatim [תיקון-ניסוח §6.10 בלבד] + §6-RECON נוסף, 18,597→26,115 תווים) · git: אותו-ענף `claude/research-intake-contributor-scope-v1` — **טרם-Commit-בזמן-כתיבת-השורות-האלו, טרם-PR, טרם-merge/deploy/Admission.**

### 23.15 FINAL UNIVERSAL RESEARCH INTAKE CONTRACT CLOSURE — Article Stress Test #3 + Freeze Decision (`FROZEN`, Human-Gate ZURIEL, 27.8.2026, `RESEARCH_INTAKE_FINAL_CLOSURE_FREEZE`)

> **מהות:** Closure Pass אחרון וממוקד — **לא** audit חדש, **לא** בנייה. §23.13 (הפאס-הקודם) קבע `FOUNDATION SUFFICIENT FOR CONTROLLED ZVI+AMIT ADMISSION` אך השאיר את §6.6 (`Exhaustion Before Freeze`) ב-2/N. GPT ביצע READ-ONLY Article Corpus Stress Test על `posts.id=145` (`work_log.09ee30cd-86f1-47be-ab6b-f9d7b986afcf`) — Claude אימת-עצמאית, לא-מ-handoff-בלבד.
>
> **LIVE-FIRST verification:** `git fetch` אישר `origin/main=adffd5bf` (PR #208 ממוזג, ר' §23.11-§23.13). PR #206 נבדק-חי — **לא-שונה, לא-נגע-בו** (עדיין `draft`, `mergeable_state=unknown`, `merged=false`). ענף חדש נוסף `claude/spatial-gematria-reveal` (UI-רכיב, `src/components/`+`src/legacy`+`src/lib/spatialReveals.js` בלבד) — **0 חפיפת-קבצים** עם ה-scope-הזה, אין-קונפליקט. `nodes.rule_id='research_intake_foundation_contract_law'` אומת `rule_version=4` (לפני-הסבב) ✓.
>
> **Part B — אימות-תוכן-קיים (לא-handoff, ישירות-מגוף-החוזה-החי):** נקראה-במלואה `project_codex.slug='research_intake_foundation_contract'` (26,115 תווים) ואומתו-כקיימות-בפועל **כל 15 הדרישות**: Contributor Scope Separation(§6.1) · Source/Corpus Completeness 3-tiers(§6.2) · Representation Collapse(§6.3) · Access⟂Truth/Scope(§6.4) · No Contributor-Specific Engine(§6.5) · Source Authorship≠Analyst Interpretation(§6.7) · Research Procedure Extraction(§6.8) · Private-Derivation Boundary(§6.9) · Mathematical Symbol/Operation Identity(§6.10) · Formula Instance≠New Law/`derived_from`(§6.11) · per-member convergence verification(Routing Crosswalk, item #4) · multilingual routing(Routing Crosswalk) · Spatial existing-capability routing(Routing Crosswalk) · Numeric/Fibonacci/π routing(Routing Crosswalk) · Research-OS/Universal-Finding/Intake/Router/Human-Gate ownership boundaries(§6-RECON). **0 חסר — לא-נדרש STOP.**
>
> **Part C — Article 145 כ-Corpus #3:** אומת-חי (לא-הונח): `posts.id=145`, `wp_id=31656`, `source='wordpress'`, 50,895 תווים, כותרת-מזכירה-במפורש מבנה-גיאומטרי-מגן-דוד+רמזי-73/37 — תואם-בדיוק לתיאור-GPT. **שוני-מהותי אמיתי:** תוכן-עורכי-מפורסם (לא-קורפוס-תורם-פרטי כמו-צבי/עמית). כל-הממצאים-המרכזיים **אומתו-ישירות מול-המנוע** (לא-מ-handoff): `בראשית ברא אלהים...`=2701 ✓ · `חכמה`=73 ✓ · `ישראל`=541 ✓ · `ציון`=156 ✓ · `156+385=541` ✓ · `שכינה`=385 ✓ · `גאולה`=`אדם`=45 ✓ · `הריון`=271 ✓ · `נקודה`+`קו`=271 ✓ · `אבן` ב-Gadol=703 ✓ (`fn_gadol`) · `חכמה` ב-Kadmi=271 ✓ (`kadmi_calc`) · **וגם ה-holds אומתו-כנכונים**: `מגן דוד`=107 ברגיל (לא-108 — קולל לא-מוצהר, `fn_ragil`).
>
> **Part D — Article Deltas (2 Extension Points, נבדקו-עצמאית):** (1) **Text-Position Provenance** ("המילה ה-787 בפרשה") → **ALREADY COVERED / CLARIFICATION ONLY**: הובהר-ב-§2 (תוקן-ניסוח מינורי) ש-tokenizer/version+counting-convention נכנסים **תחת-אותו** Extension Point (Source/Book/Edition/Textual Version) שכבר-הוגדר — לא-קטגוריה-חדשה, לא-נבנה tokenizer. (2) **Spatial Counting Semantics** (ספירת-נקודות תלוית-model/order/region/boundary/interior/overlap-policy) → **EXTENSION POINT NOW — ADAPTER CONTRACT** (לא-Geometry-Engine-שני) — כבר-מתועד ב-Routing Crosswalk + PR#206's-own-Spatial-section; Article-145 הוא-מופע-קונקרטי-נוסף, לא-גילוי-חדש. **0 MUST FOUNDATION NOW נמצא.**
>
> **Part E — Future-Capability Challenge (13 צירים):** Identity · Representations · Relations · Time/Context(`OD-TIME-8` בעלים-נפרד, אין-קונפליקט) · Provenance · Truth Lifecycle · Engines · Extensibility(`meta.ext.<domain>.<key>` — המנגנון-המוכח) · Human Gate · Multilingual · Cross-domain · Privacy · Source/Corpus-Completeness(3/3) — **0 MUST FOUNDATION NOW בכל-הצירים.**
>
> **§6.6 עודכן 2/N→3/N:** שלושת ה-corpora — (1) צבי Track A (WhatsApp/contributor, spatial) · (2) עמית Existing Corpus (media-archive, multilingual/writer-method, private) · (3) Article 145 (תוכן-עורכי-מפורסם, שוני-מהותי-אמיתי). כולם-הניבו 0 MUST FOUNDATION NOW.
>
> **הבהרה-חובה (Freeze≠כל-יודע, לא-לשמר-בלי-הסתייגות):** Freeze **אינו** טוען ש"כל-צורות-הראיה-העתידיות ידועות". פירושו: ה-primitives+extension-mechanism (`meta.ext.<domain>.<key>`, `derived_from`, `attribution_type`/`contributor_id`, `privacy_scope`, `verification_state`) רחבים-מספיק להתחיל ingestion **בלי redesign-צפוי**. Lens/Adapter/`operation_key`/representation/source-type חדשים עתידיים **אינם-שוברים** Freeze כל-עוד ניתנים-להרחבה דרך-החוזים-הקיימים.
>
> ## **פסיקה: `FOUNDATION SUFFICIENT — RESEARCH INTAKE FOUNDATION CONTRACT FROZEN FOR CONTROLLED UNIVERSAL INGESTION`**
>
> **מה Freeze-אומר בפועל:** הזרימה נשארת `SOURCE→EXTRACTION→CALCULATION/DISCOVERY→RESEARCH OBJECT/CANDIDATE→VERIFICATION→UNIVERSAL FINDING→HUMAN GATE→CANONICAL→(בנפרד)PUBLISHED/VISIBLE/ACCESSIBLE`. נשמר: `HOT≠TRUE`·`VIP≠TRUE`·`CLAIM≠FACT`·`ENGINE VERIFIED≠CANONICAL`·`CANONICAL≠PUBLISHED`·`PRIVATE CANONICAL≠PUBLIC`. **Freeze אינו-מאשר source→canonical ואינו-מאשר ingestion-המוני.**
>
> **מה לא-נעשה כאן (מפורש):** אין ingestion המוני · אין קורפוס-רביעי · אין פתיחה-מחדש-של-החלטות-שכבר-הוכרעו · אין Spatial Adapter/Numeric-operations/Personal-Hints נבנו · אין נגיעה-בקוד-PR#206 (READ-ONLY, אומת-לא-שונה) · אין קידום-לקנוני · אין פרסום · אין חוזה-שני נוצר (אותו `research_intake_foundation_contract`, `rule_version` 4→5).
>
> **STATUS:** `APPLIED`(DB חי, additive: `rule_version` 4→5 · `project_codex` 26,115→32,663+ תווים) · git: ענף `claude/research-intake-final-freeze` (base `origin/main`@`adffd5bf`) — **טרם-merge, טרם-deploy, טרם-ingestion. ממתין ל-Cross-verification של GPT/ZURIEL לפני-כל-המשך.**

### 23.16 NO UNIVERSAL ANCHOR · IDENTITY/REPRESENTATION/CONTEXTUAL-CENTER FOUNDATION CLOSURE (`APPLIED`, Human-Gate ZURIEL, 27.8.2026, `FOUNDATION_SUFFICIENT_APPLIED_REALITY_GRAPH_LAW_V2`)

> **מהות:** יישום שלישי של §23.5 `FOUNDATION EXPANSION GATE` — הפעם **לא על דומיין בודד** (כמו §23.6 Intake, §23.7 Person) אלא **ברמת-ארכיטקטורה**: הצירים Identity/Representations/Relations נבדקו על-פני כל המערכת, בעקבות בקשת-סגירת-חוזה מפורשת של צוריאל ("SOD1820 — NO UNIVERSAL ANCHOR"). READ-ONLY audit מלא (git+DB חי) בוצע לפני כל המלצה.
>
> **LIVE-FIRST:** `git fetch` אישר `origin/main` זז `ef7da26e→d7a66ae2` (2 קומיטים לא-חופפים — ענף GPT `command-center-vnext-projection` + `זרם המציאות: כרטיס-רמז מקושר לפוסט`) — הענף-המקומי `fast-forward`-מוזג ל-`d7a66ae2` לפני עריכת-קבצים, 0 חפיפה. אין WRITE מקביל בנושא-זהות/ייצוג ב-`work_log`.
>
> **ממצאי-אודיט מרכזיים (חיים, לא מהזיכרון):** `entity_types` **קיימת וחיה עם 13 שורות** (כולל type=`relationship` — קשר-כישות, כבר-קיים) — סנפשוט-ראשוני-שגוי הראה 0, תוקן ע"י `count(*)` ישיר. `nodes.type` מכיל 30 ערכים שונים מול 13 ב-`entity_types` — פער מתועד, לא נסגר. טבלת `convergences` (8,917 שורות) מנותקת-מהגרף — 0 edges ל-`nodes`. אוצר-המילים `same_as`/`alias_of`/`variant_of` (מוגדר כבר ב-`research_intake_foundation_contract_law`) חי אך עם 0 edges בפועל. `metatron_context` אומת כ-RPC (קומפוזיציה בזמן-שאילתה), **לא טבלה** — תקדים-חי לכך שלא-נדרשת טבלת `research_context` חדשה, בדיוק כפי-שהתבקש.
>
> **מבחן-לחץ 786 (חי, אומת ב-SQL):** Number 786 = node חי (`20addd29`) עם 2 edges `mentions` בלבד (פוסטים ישנים). Finding-786 = חי אך מקוטע: 4 שורות `convergences` נפרדות (ragil/misratar/miluy/gadol), `status='new'`, לא-מאוחדות, לא-מחוברות ל-node. Post 5087 = חי (רק 786 מוצג, לפי `zuriel_focus_law`). Reality Signal = חי (`gallery_images` 15cfda5c, `primary_value=786`). וידאו-TikTok = חי כקובץ, **MISSING** כ-node. Person דונלד טראמפ ו-Year תשפ״ו = **MISSING** (0 nodes, אומת ישירות ב-SQL). Reality→Post ו-Post/Reality→nodes/edges = GAP מתועד (0 projection pipeline) — הצטלב במדויק מול ממצאי `work_log` מוקדם-יותר-באותו-יום ("SOURCE VIDEO LAW...786...One Tree crosswalk").
>
> **פסיקה: `FOUNDATION SUFFICIENT`.** 0 `MUST FOUNDATION NOW`. Identity/Representations/Relations → `EXTENSION POINT NOW`. Contextual Center → `NOT NEEDED` (כבר-חי בפועל דרך `zuriel_focus_law`/`signal_vs_curation` v2 + ניתוב-קיים).
>
> **Human-Gate ZURIEL — שתי החלטות:** Q1 = **כן**, להרחיב את `reality_graph_law` בדיוק-כמוצע (לא 3 חוקים-נפרדים). Q2 = **עדיין-לא** — הרחבת `entity_types` (types כגון post/topic/convergence/finding/source) מתועדת כ-`EXTENSION POINT NOW` בלבד; **לא נוספה אף שורה** — ממתין לסבב ontology-crosswalk ייעודי שיקבע אילו types באמת-כשירים.
>
> **מה בוצע (DB חי, additive, 0 חוק-מקביל נוצר):** `nodes.rule_id='reality_graph_law'` `rule_version` 1→2 (`supersedes_version=1`) — נוסף: מבחן-כשירות-זהות, חוק-הצמדת-ייצוג (מרחיב את אוצר-המילים הקיים ב-`research_intake_foundation_contract_law`, לא-כפול), חוק-מרכז-הקשרי (query-time, `metatron_context` כתקדים), ודחיית `entity_types` מפורשת. `project_codex.slug='reality_graph_law'` גוף עודכן `2,347→6,979` תווים (אותו תוכן, גרסה-מלאה + מבחן-786). `work_log.3dbd5043` תיעוד-מלא.
>
> **מה לא-נעשה כאן (מפורש):** אין `no_universal_anchor_law`/`identity_qualification_law`/`contextual_center_law` נפרדים נוצרו. אין שורות נוספו ל-`entity_types`. אין edges נוצרו בין `convergences`↔`nodes`. אין projection-pipeline נבנה. אין schema/migration/table/engine חדש. אין קוד שונה בסבב-הזה (docs+DB בלבד).
>
> **STATUS:** `APPLIED` (DB חי) + docs (Master State §23.16 זה + Roadmap pointer) על ענף `claude/sod1820-foundation-contract-yt6e29` — **טרם-merge, טרם-deploy** (docs-only, אינו-דורש-deploy כשלעצמו, אך merge ל-`main` עדיין ממתין ל"תעלה" מפורש של צוריאל לפי `deploy_on_request`).

### 23.17 EXPERIENCE GOVERNANCE FOUNDATION v1 — Canonical Ownership + Law Lifecycle + Locale/Identity/Design Crosswalk (`APPLIED`, Human-Gate ZURIEL, 29.8.2026, `EXPERIENCE_GOVERNANCE_FOUNDATION_V1_CLOSURE`)

> **מהות:** יישום-רביעי של §23.5 `FOUNDATION EXPANSION GATE` — הפעם על **שכבת-הממשל** (Governance) עצמה: מי הבעלים הקנוני של כל סוג-אמת (Decision/Rule/Contract/State/Navigation/Implementation/Acceptance-Evidence/Release-State/Provenance) כדי שצוריאל לא יצטרך לזכור "תכניס ל-Rule/Codex/Master/Map" בכל פעם. הופעל בעקבות handoff מפורש של GPT (חוזה `foundation_closure_protocol_v1` + crosswalk-חי RTL/Identity/Design/Accessibility). הסעיף הזה מתעד-ומצביע — הסמנטיקה המלאה חיה ב-`project_codex.slug='experience_governance_foundation_v1'`/`nodes.rule_id='experience_governance_foundation_v1_law'` + `audits/experience_governance_foundation_v1/EXPERIENCE_GOVERNANCE_V1_FOUNDATION_CONTRACT.md`, לא כאן.
>
> **מחזור-סגירה (3 סבבים, כולם 29.8.2026, `work_log` chain `b26475aa→c3ce5850→86daaade→5a4b6756→f4811264`):** סבב 1 (Claude) הכריז-בטעות `FOUNDATION SUFFICIENT` בעוד §16 (בחוזה) עדיין-הציג 9 פריטי-`MUST FOUNDATION NOW` פתוחים — סתירה-ישירה ל-§23.5 עצמו. GPT ביקר (`86daaade`, `CHANGES_REQUESTED`) עם 7 תיקונים (בעלות-Decision מתוקנת ל-artifact-קנוני ולא `work_log`; קובץ-על-ענף-בלבד=`PROPOSED` לא-קנוני עד-מיזוג; טקסונומיית-`applies_to` מפוצלת ל-3 צירים; §9 (לוקליזציה) מתוקן מ"מערכות-נפרדות" ל"ממשל-אחד, תחומים-נבדלים" (`ONE SYSTEM LAW`); 16px/44px הורד מ-MUST-NOW ל-Human-Gate-candidate; ניסוח-Master-State מחזיר-במפורש את סדר-הסמכות המלא) — כולם-יושמו (`5a4b6756`). צוריאל אישר (`f4811264`) שמונה-החלטות (ר' למטה) וביקש Closure מלא.
>
> **שמונה-החלטות Human-Gate (ZURIEL, `f4811264`), מיושמות בסבב-הזה:** (1) `identity_architecture_law` מקודם ל-`nodes` (רשומה נעולה, המשמעות-נשמרת-מילה-במילה מ-CLAUDE.md — לא-נכתב-מחדש). (2) 16px-פונט/44px-touch-target — עקרונות-נגישות **מאושרים**, **לא** מתווספים אוטומטית ל-`mobile_acceptance_law` עד-שנקבע-בעלים — נשאר Extension Point מתועד. (3) הכפלת-ה-marquee ב-`BrandTicker.jsx` — **אין grandfathering**, הוחלט לתקן ולהשתמש ב-`Marquee.jsx` הקנוני — **התיקון-בקוד-עצמו לא בוצע בסבב-הזה** (משימת-המשך נפרדת, מחוץ להיקף docs-only). (4) תשתית-תאריך/מספר (`formatDateHe`/`HumanDateInput`, `human_date_input_law`) נשארת עברית-בלבד-במכוון; פרמטריזציית-לוקאל = Extension Point. (5) `research_contributions.author_contributor_id` **נשמר** (לא-נמחק מ-selects); חיווט נדחה ל-החלטת "Public Identity Projection" עתידית. (6) זרם-המציאות: provenance-שדה-המקור **נשמר**; קרדיט-"מאת" גלוי = בחירת-Projection/UI עתידית, לא-חוסם-Foundation. (7) ניסוח §0 (ר' §0 סעיף 16 החדש, לעיל) — Master State מאנדקס-בעלים-קנוניים, לא-משכפל-גופי-חוק/חוזה-מלאים, סדר-הסמכות **נשאר-ללא-שינוי**. (8) לוקליזציית-UI = `EXTENSION POINT NOW` תחת ממשל-לוקליזציה/ייצוג **אחד** המשותף ל-`content_translation_law` (תחומים נבדלים, לא-מערכות-מקבילות) — לא-נבנה.
>
> **פסיקה (מתוקנת, סבב-3):** `FOUNDATION SUFFICIENT` — ברמת-חוזה. כל 9 פריטי-ה-`MUST FOUNDATION NOW` שנמצאו ב-crosswalk (בעלות-`dir` ב-`index.html` · קונבנציית-CSS-פיזי-מול-לוגי · תשתית-תאריך-עברית · הפרדת-תרגום-תוכן/UI · תיעוד-תפקידי-זהות · קידום `identity_architecture_law` · בעלות-Design-Tokens · הכפלת-`BrandTicker` · ניסוח-Master-State) **נסגרו-או-סווגו-מחדש** לפי שמונה-ההחלטות למעלה — אף-אחד לא-נשאר-פתוח-בלי-הכרעה. **מימוש** של פריטים ספציפיים (תיקון-`BrandTicker`, חוק-נגישות עתידי, פרמטריזציית-לוקאל) נשאר `OPEN`/`FUTURE` ואינו-חוסם את סגירת-ה-Foundation — תואם-תקדים (§23.6/§23.7/§23.9 כולם נסגרים ברמת-חוזה בעוד יישום-פרטני נשאר-פתוח).
>
> **מה בוצע (DB חי, additive, 0 חוק-מקביל נוצר):** `nodes.rule_id='identity_architecture_law'` רשומה-חדשה `rule_version=1`, `is_active=true`. `nodes.rule_id='experience_governance_foundation_v1_law'` רשומה-חדשה `rule_version=1`, `is_active=true`. `project_codex.slug='experience_governance_foundation_v1'` רשומה-חדשה (`category='architecture'`, `priority=1`). Master State §0 סעיף 16 (לעיל) + §23.17 זה. Roadmap: הפניית-ניווט מינימלית נוספה (ר' Roadmap), `ACTIVE_NOW` **לא-שונה** (`WS-RESEARCH-STUDIO-FOUNDATION` נשאר).
>
> **מה לא-נעשה כאן (מפורש):** אין Experience Center UI · אין Design System חדש · אין i18n/UI-translation engine · אין שכתוב/מיזוג-טבלת-זהות · אין mass-CSS-refactor · אין תיקון-קוד ל-`BrandTicker` · אין schema/migration/table חדשים · אין merge · אין deploy — לפי הוראת-צוריאל המפורשת "עצור לפני merge/deploy".
>
> **STATUS:** `FOUNDATION SUFFICIENT — CONTRACT LEVEL`, DB חי + docs על ענף `claude/experience-governance-foundation-v1-1ki2s6` (PR #234) — **טרם-merge, טרם-deploy**, ממתין ל-GPT re-cross-verification (לפי open_threads של `f4811264`) ואז ל"תעלה" מפורש של צוריאל.
>
> **🟢 עדכון-סטטוס מתוארך 29.8.2026 (`CANONICAL_RECONCILIATION_2026_08_29`) — מוסיף-על שורת-ה-STATUS שמעליה, לא-מוחק-אותה:** שורת-ה-STATUS למעלה נשארת נכונה-לזמנה (`NO-DISAPPEARING-WORK`). **המצב-החי מאותו-רגע-ואילך: PR #234 מוזג ל-`main` (merge `e5f21efc04d9ba79ec547118cca686b9f0cd4866`).** הפסיקה עצמה **לא-השתנתה** — `FOUNDATION SUFFICIENT — CONTRACT LEVEL`. הגבול נשאר: Experience רשאית **לייצג** מצב-סמנטי-במעלה-הזרם, ואינה-רשאית **ליצור/להגדיר-מחדש** אותו. הבעלים-הקנוניים ללא-שינוי: `nodes.rule_id='experience_governance_foundation_v1_law'` · `project_codex.slug='experience_governance_foundation_v1'` · `audits/experience_governance_foundation_v1/EXPERIENCE_GOVERNANCE_V1_FOUNDATION_CONTRACT.md`. פריטי-היישום שנשארו `OPEN`/`EXTENSION POINT` (תיקון-`BrandTicker`, חוק-נגישות עתידי, פרמטריזציית-לוקאל) **נשארים פתוחים ואינם-חוסמים** — ר' §23.18.

---

### 23.18 CANONICAL MULTI-DAY RECONCILIATION — Master/Roadmap/Change-Log Alignment (`APPLIED`, Human-Gate ZURIEL/GPT, 29.8.2026, `CANONICAL_RECONCILIATION_2026_08_29`)

> **מהות:** סבב-**יישום** (APPLY) של חבילת-הפיוס שנחקרה-ואומתה ע"י GPT — `docs/canonical-reconciliation-2026-08-29.md` (ענף `gpt/canonical-reconciliation-2026-08-29`, commit `3b262fdf5c1bd5a282e49704c5904a7b051a6cf1`, PR #237). **אין כאן audit חדש, אין החלטה חדשה, אין schema/DB/engine/קוד.** הסעיף **מאנדקס בעלים-קנוניים** ומצבי-שחרור — הוא **אינו-משכפל** גופי-חוק/חוזה שכבר-חיים ב-`nodes`/`project_codex`/`docs` (§0 סעיף 16).
>
> **בסיס-חי:** `origin/main` = `2cc0725372e3260b06b510f1b93101da14f665c7` (Merge PR #236) · Supabase קנוני `linswmnnkjxvweumprav` · `work_log` הפיוס: `a326de5c-68c5-4717-87ef-1faf0eb47eb0`.
>
> **חוק-הפיוס שהופעל:** סמכות = live DB + `origin/main` + Master State > Roadmap > שיחה. **טענה שהייתה-נכונה-בזמנה נשארת כפי-שהיא**; מצב-מאוחר נוסף כ-UPDATE/superseding מתוארך — **אפס מחיקה** של טקסט היסטורי גם כשהסטטוס התקדם מ«טרם-מוזג» ל«מוזג». Foundation → Projection → Experience.
>
> **A. מה נקבע קנונית בסבב-הזה (אינדקס בלבד — הגוף חי אצל הבעלים):**
> 1. **Work Log Authority v2** — `IMPLEMENTED + DB LIVE + MERGED`. בעלים: `nodes.rule_id='work_log_authority_law'` (v2 פעיל). provenance: PR #229 / merge `dc70e0a8`, commits `63c021a9`,`84f15e6c`. היסטוריית `work_log` היא **provenance additive, לא-סמכות-נוכחית-מכוח-עדכניות**; `superseded_by_id`+`work_log_current` מגדירים CURRENT מול SUPERSEDED/ARCHIVED; `get_work_log_current()` = נתיב-דפדפן-אדמין-מאומת, בעוד bootstrap של סוכן/service-role קורא את ה-**view** ישירות ולא את ה-RPC. אי-התאמת-אבטחה שנמצאה בסגירה **תוקנה** — anon אינו-יכול לנצל את ה-SECURITY DEFINER לעקיפת RLS. זו סמכות-provenance/תיאום, **לא** בעלות-קנונית על תוכן-החלטה. אין חוסם-Foundation חדש.
> 2. **Gematria Verified ≠ Published / חוק-נראות-ציבורית** — `IMPLEMENTED + DB LIVE + MERGED + RELEASED`. provenance: PR #235 / merge `1e03cb46`, commits `f03c5824`,`ae517a90`,`7397d379`; שחרור: `work_log 4e4bb41e`. `gematria_words.is_verified` ו-`is_published` הם **צירים בלתי-תלויים**; `is_verified=true` **אינו** גורר פרסום/גישה; קריאות-גימטריה-ציבוריות כפופות לחוזה-הפרסום, ונראות-`bidim` הציבורית **נגזרת-מהמקור** (verified+published של מילת-המקור) במקום אמת-פרסום-משוכפלת; נתיבי-דליפה של SECURITY DEFINER וקוראי-WhatsApp/service-role יושרו לאותו חוק. **0 ביטויי-קורפוס נמחקו/נכתבו-מחדש.** קודם ל-M1 ועקבי עם ציר ה-Publication/Access האורתוגונלי שלו.
> 3. **User Center Target + Reachability** — `MERGED` ברמת-Projection/Experience בלבד. provenance: PR #227 merge `ddb365bd` · #228 merge `0c839ccf` · #230 merge `8a1a3d7b`. User Center משתמש ב-Research כשער-ראשי במקום להטמיע/לשכפל את ResearchCenter; קודים-אישיים וחומר-אישי legacy שומרים **reachability מעברי**; Contributions ו-Saved-targeting עושים reuse לחוזים קיימים — **אפס store/context/route חדש**. החלטת-Human-Gate מאוחרת הסירה את ה-nudge-הקהילתי מפעולות-ההמשך-האישיות והחזירה את שער-הנראות `posts > 0` — זה **מחליף רק** את החלטת-תצוגת-הכותרת-לפי-יכולת-כותב של #228, **לא** את יכולת-`myposts` עצמה. ⛔ אין להעלות קיצורי-legacy לדרגת ארכיטקטורת-יעד.
> 4. **Human Date Input Law** — `IMPLEMENTED + MERGED` (כולל סגירת-מובייל). provenance: PR #231 merge `2b6284f2` · #232 merge `afc445bc` · #233 merge `fc10eb5c`. בעלים: `human_date_input_law` + רכיב `HumanDateInput` הקנוני. תאריך-אנושי-ידוע חייב לתמוך בהזנת יום/חודש/שנה ישירה — גלגל-מובייל נטיבי **אינו** הממשק-היחיד; **Draft ≠ Canonical** (הקלדה חלקית/לא-תקינה נשארת מקומית ואינה-דורסת/מנקה state-הורה קנוני; ניקוי-כל-השדות = אות-ה-null המפורש); אין שנת-מינימום גלובלית שרירותית, והגבלת-עתיד היא caller-specific (`disableFuture`) ודחייה לעולם אינה-משכתבת-בשקט כוונת-משתמש; אימוץ: UserCenter birth date · Community Calculator · DatesTool (שם עתיד מותר); רספונסיביות 320/360/390px נסגרה. פרמטריזציית-לוקאל = Extension Point של Experience Governance, **לא חוסם**.
> 5. **Experience Governance Foundation v1** — `CLOSED + MERGED` (PR #234, merge `e5f21efc`). ר' §23.17 + עדכון-הסטטוס-המתוארך שם.
> 6. **Admin RPC Security — P1 + M3/M4** — `SECURITY BLOCKER CLEARED` להיקף-הזה; `DB LIVE + MERGED` דרך PR #236 (commits `41fddeac` M3/M4, `8fd1c488` P1; migrations `20260829124609`,`20260829131313`). נסגרו עקיפות-הרשאה ב-`admin_manage_alias`,`admin_storage_put`,`admin_inbox`,`admin_mark_message_read`,`admin_live_visitors` — בדיקת-אדמין-קנונית ברמת-גוף-הפונקציה + הידוק EXECUTE; anon נדחה, authenticated-לא-אדמין נדחה, אדמין-אמיתי מאומת-עובד. `ADMIN_PASSWORD='sod1820'` הישן נשאר **גידור-UI בלבד** ואינו-נושא-עוד כוח-הרשאה-DB ל-RPC-ים אלה. סמנטיקת ה-hard-delete של `admin_manage_alias('delete')` נשארת **שער-אנושי-נפרד מאוחר**, ואינה חוסם-אבטחה שנפתח-מחדש. ⛔ אין לפתוח-מחדש audit-אבטחה רחב.
> 7. **M1 — חוזה-האמת/אפיסטמי** — `CLOSED — FOUNDATION SUFFICIENT FOR TRUTH CONTRACT` + `MERGED` (PR #236, merge `2cc07253`). בעלים: `nodes.rule_id='truth_axes_foundation_law'` · `project_codex.slug='truth_axes_foundation_v1'` · `docs/m1-truth-contract-implementation.md`. החלטות-Human-Gate מאונדקסות: Option D/Hybrid — **אין** `lifecycle_state` שטוח-אוניברסלי; צירים אורתוגונליים **EPISTEMIC TYPE ≠ VERIFICATION ≠ GOVERNANCE ≠ PUBLICATION/ACCESS** + ציר תפעולי/דומיין נפרד; **`approved` ≠ `canonical`** (קנוניזציה = מעשה-Human-Gate מפורש וחזק-יותר, ואינה-מפרסמת/מרחיבה-פרטיות אוטומטית); אימות הוא **mandatory-declared**, לא mandatory-match — מצבי non-match/not-tested/unknown-method הם מצבים כנים, **והיעדר-קלט אסור שיזויף כ-`not_tested`**; AI/Projection אינם רשאים לייצר מצב-סמנטי מקלט-חסר.
> 8. **Engine Governance Foundation** — `CLOSED / FOUNDATION SUFFICIENT` + `MERGED` (PR #236, merge `2cc07253`). בעלים: `nodes.rule_id='engine_governance_registry_authority_law'` · `docs/engine-governance-foundation-implementation.md`. חוק: **REGISTERED / ACTIVE / EXECUTABLE / ENGINE_VERIFIED / SCANNABLE / PUBLICLY-DISPLAYABLE אינם נרדפים**; `in_engine` נשאר **דיאגנוסטי/תאימות ולא סמכות-סריקה**; כתיבות-אוטומטיות-עתידיות מגודרות **אך-ורק** בממשל-הרישום הקנוני (SCANNABLE חי = 18, composites SCANNABLE = 0 בסגירה); ארבעת ה-composites ההיסטוריים נשארים **REGISTERED אך inactive/non-scannable**, ו-50,368 שורות-ה-`bidim` שלהם **נשמרות ולא-מופעלות**; `רגיל+אתבש` **לא-נרשם** בסגירה הזו; **HG-E4 RANK, DON'T HIDE** — גישה-ציבורית ועדות-מושלת הן צירים נפרדים: תוצאה היסטורית/ציבורית-לא-מנוהלת **רשאית להישאר גלויה** אך חייבת לשאת סמנטיקת-ממשל ו**אסור** שתקבל משקל-עדות-קנוני; סדר-ההתכנסות הקנוני **DISCOVERABLE → GOVERNANCE ELIGIBILITY → DEPENDENCY/INDEPENDENCE → SCORE**; `fn_number_lookup`/הקרנת-משפחת-הערך חושפות מצב-ממשל במקום להשאיר תוצאה-לא-מנוהלת בלתי-נבדלת-סמנטית מתוצאה-מושלת. **עדות-סגירה (ארבעה שערים):** WRITE GOVERNANCE `PASS` · PUBLIC READ GOVERNANCE `PASS` · HISTORICAL PRESERVATION `PASS` (`bidim` 344,487 · ארבעת ה-composites 50,368 · אפס הופעלו) · CONVERGENCE DEPENDENCY GOVERNANCE `PASS`.
>
> **B. פערים פתוחים שנשמרים במפורש — אינם-חוסמי-Foundation ואינם-עילה-לפתיחה-מחדש:**
> - **78 ערכי `topic_cards.meter_score` מיושנים** תחת כלל-ההתכנסות המתוקן. חישוב-מחדש מבוקר מחייב **שער-אנושי נפרד** (עלול להוריד רטרואקטיבית איכות של כרטיסים שכבר-אושרו). ⛔ אין mass-rewrite שקט.
> - **`relation_evidence` — פרימיטיב-שחקן (actor) חסר.** עמודת `source` אינה-יכולה לשאת-בבטחה גם מקור-עדות וגם שחקן-מבצע; ברירת-המחדל כשחסר מקור היא **מעברית** ואסור להתייחס אליה כ-provenance קנוני.
> - **`decision_ledger`** — CHECK הממשל נשאר `NOT VALID` עד הכרעת שורה-היסטורית אחת.
> - **אין עדיין נתיב-UI ל-canonicalize.**
> - **איחוד תלות-שקילות-מותנית** — ה-CASE הפרטי של `גדול` ב-`convergence_meter` + רשימות-השיטות-האטומיות הקשיחות הקיימות צריכים להתאחד בהמשך אל ממשל-התלות הקנוני (זו שקילות-מותנית — **סוג-כלל שונה** מהיסק-composite, ודורשת תנאים-ברמת-ביטוי).
> - **תנאי-קדם-לסריקה נשארים פתוחים** — אימות-fixtures ל-composites לפני כל הפעלה עתידית · פיוס-רישום לסחיפת active/in_engine · **de-stratification של `bidim`** לפני כל Full Canonical Method Scan.
>
> **C. ⛔ תיקון-ניווט קריטי — Full Scan אינו-מאושר:** סגירת Engine Governance **אינה** מאשרת הרצת **Full Canonical Method Scan**. השרשרת הקנונית היא: **ENGINE GOVERNANCE CLOSED → CANONICAL DOC RECONCILIATION → PRE-SCAN READINESS GATE → ורק אם `PASS`: FULL CANONICAL METHOD SCAN.** ה-`work_log` החי של Engine עדיין רושם תנאי-קורפוס/רישום פתוחים. שער-המוכנות הוא **החלטתי** (עשוי לשנות את החלטת-הסריקה), ולכן אינו-audit-מיותר.
>
> **D. מה לא-נעשה כאן (מפורש):** אין schema · אין migration · אין שינוי-engine/קוד · אין הפעלת-שיטה · אין הפעלת-composite · אין `רגיל+אתבש` · אין חישוב-מחדש של `topic_cards` · אין Full Scan · אין UI · אין audit-אבטחה · אין פתיחה-מחדש של M1 או של Engine Governance · **אין מחיקה/שכתוב של טקסט-Master היסטורי** · אין merge · אין deploy.
>
> **STATUS:** `CANONICAL RECONCILIATION APPLIED` — Master State + Roadmap + §CL מיושרים. ענף `gpt/canonical-reconciliation-2026-08-29` (PR #237), docs-only — **טרם-merge, טרם-deploy**, ממתין ל-GPT acceptance ואז ל"תעלה" מפורש של צוריאל.
>
> **🟢 עדכון-סטטוס מתוארך 29.8.2026 — מוסיף-על שורת-ה-STATUS שמעליה, לא-מוחק-אותה:** שורת-ה-STATUS למעלה נשארת נכונה-לזמנה. **המצב-החי מאותו-רגע-ואילך: PR #237 מוזג ל-`main` (merge `643061b575d12cc1340a6c3b71daa9d8b5e54e9c`)** אחרי קבלת GPT («CANONICAL RECONCILIATION CONSISTENT / APPROVED FOR MERGE») ושער-אנושי של צוריאל. תוכן §23.18 עצמו **לא-השתנה**.

---

### 23.19 ENGINE CORPUS CANONICAL CLOSURE — PRE-SCAN FINAL PASS + FULL-SCAN REQUIREMENT SATISFIED (`APPLIED`, Human-Gate ZURIEL/GPT, 29.8.2026, `ENGINE_CORPUS_CANONICAL_CLOSURE`)

> **מהות:** סגירה קנונית של מסלול **Engine Corpus** אחרי ה-PRE-SCAN. **סבב תיעודי-בלבד** — 0 חישוב-DB חוזר · 0 Full Scan · 0 schema/migration/engine/UI · 0 הפעלת-שיטה/composite. הסעיף **מאנדקס** ומצביע; הבעלים הקנוני נשאר `nodes.rule_id='engine_governance_registry_authority_law'` + `docs/engine-governance-foundation-implementation.md`.
>
> **בסיס-חי מאומת לפני הכתיבה:** `origin/main` = `fbc201bb489d68de4dc6732c3c1067a9db189819` («Merge PR #238: Pre-Scan Closure Pass») · Supabase קנוני `linswmnnkjxvweumprav` · **PR #238 אומת חי כ-`merged=true`** (merged_by `zuriel337`, base `643061b5`, head `06a0ec34`; שינה **אך-ורק 3 קבצי-migration**, לא-נגע בשום מסמך קנוני) · provenance של ה-PRE-SCAN: `work_log` BEFORE `5811476e` → AFTER `fcab2510`.
>
> **A. PRE-SCAN READINESS — FINAL PASS (`PASS`).** שלוש תנאי-הקדם שנרשמו ב-§23.18-B נסגרו או סווגו-מחדש:
> 1. **De-stratification / כיסוי-מושל נוכחי — סגור.** יקום-הסריקה הנוכחי = **18 שיטות SCANNABLE**; קורפוס מאומת = **12,592** ביטויים; **כיסוי מושל = 226,656 שורות `bidim` עם `provenance_state='governed'`**. אומת חי בסבב-הזה: 18 × 12,592 = 226,656 (זהות אריתמטית, לא-הנחה) · **כל אחת מ-18 השיטות בדיוק 12,592 שורות** (min=max=12,592, אפס שיטות חורגות) · **0 שורות מושלות של שיטה לא-scannable** · `bidim` סה״כ 348,240 = 226,656 מושלות + 121,584 `legacy_unknown`.
> 2. **סחיפת-רישום (`in_engine_drift`) — סווגה NON-BLOCKING ליקום-הסריקה הנוכחי.** קיימות **7** שורות-סחיפה (`איק בכר` · `מילוי בלבד` · `מילוי גדול` · `מילוי דמילוי גדול` · `משולש הפוך` · `משולש מדרגות` · `משולש מילה`) — **החפיפה עם 18 השיטות ה-SCANNABLE = 0**. `in_engine` נשאר **מטא-דאטה דיאגנוסטי/תאימות ואינו סמכות-סריקה** (חוק קיים, ללא שינוי). ל-`מילוי בלבד` יש **סתירת-מטא-דאטה אמיתית** (`in_engine=true` בעוד `function=NULL` / `execution_kind='unimplemented'`), אך היא `active=false`, `engine_verified=false`, `scannable=false` — ולכן **אינה-חוסמת**. ⛔ **לא-תוקנה בסגירה הזו במכוון.**
> 3. **אימות-fixtures ל-composites — הועבר לשער PRE-ACTIVATION נפרד.** אינו-חוסם את סריקת-18-השיטות הנוכחית, מפני שכיוון-התלות הוא **atomic → composite** (composite צורך אטומים; אף אטום נוכחי אינו תלוי באימות-composite). ארבעת ה-composites אומתו חי כ-`active=false` · `scannable=false` · `engine_verified=false` · `dependency_verified_at=null` · `execution_kind='composite_engine'` · `operator='sum'` · תלויות מוצהרות — ו-**50,368 שורותיהם ההיסטוריות נשמרות**.
>
> **B. ⛔ FULL CANONICAL METHOD SCAN — COMPUTATIONAL REQUIREMENT SATISFIED BY GOVERNED RE-CERTIFICATION.** ה-governed re-certification כבר ביצע בפועל את **העבודה החישובית** שסריקת-18-השיטות הנוכחית דורשת: **18 שיטות × 12,592 ביטויים = 226,656 חישובי `fn_method_value` קנוניים**, שנשמרו כשורות מושלות עם provenance מלא. חיפוש-חי בסבב-הזה **לא-מצא** שום מנוע/job נפרד של «Full Canonical Method Scan» שמבצע עבודת-גילוי/candidate/convergence נוספת במורד-הזרם: הממצאים היחידים היו `fn_method_scan_report` (**דיווח בלבד, לעולם לא-כותב**), cron 27 `metatron-nightly` (סורק-**התכנסות**, לא-סורק-שיטות, ו-`active=false`/מוקפא לפי §8) ו-cron 40 `research-extract-scan` (חילוץ-תוכן ל-Research Intake — דומיין אחר לגמרי).
> ⚠️ **אין לנסח זאת כ«הורצה סריקה נפרדת».** לא-הורצה. הניסוח הקנוני הוא **«הדרישה החישובית סופקה ע"י ה-governed re-certification»**. הרצה-חוזרת של אותם 226,656 חישובים בדיוק תהיה **מיותרת** — חל **NO-REDUNDANT-AUDIT LAW**.
>
> **C. שמירת-אמת היסטורית (מחייב).** כל אמירה קודמת ש«ה-Full Scan טרם-הורץ» הייתה **נכונה בזמנה ונשמרת כלשונה** — §23.18-C («Full Scan אינו-מאושר»), §CL שורה 45 («`OPEN GATE` (טרם-הורץ)»), ופסקת-הסיום של §23.18 («0 Full Scan»). הסעיף הזה **מוסיף עדכון-מתוארך גובר בלבד**: פיוס מאוחר קבע שה-governed re-certification סיפק את הדרישה החישובית, ולכן הרצה-חוזרת מיותרת. **אפס מחיקה, אפס ניסוח-מחדש.**
>
> **D. סטטוס-סגירה:** **ENGINE CORPUS CANONICALIZATION — `CLOSED` עבור יקום-הסריקה הנוכחי (18 שיטות).** כיסוי-הקורפוס הקנוני הנוכחי **מלא**. **לא-בוצעה הרצה-חוזרת מיותרת.** שורות legacy/לא-scannable **נשמרו** (121,584, מתוכן 50,368 composite).
>
> **E. נשאר פתוח בשעריו הנכונים (לא-הופך לנתיב-קריטי רק משום שהוא פתוח):** אימות-fixtures ל-composites + הפעלתם = **שער PRE-ACTIVATION נפרד** · `רגיל+אתבש` = רישום עתידי תחת אותו שער · **78** ערכי `topic_cards.meter_score` מיושנים = **שער-אנושי נפרד** לחישוב-מחדש מבוקר (⛔ אין mass-rewrite שקט) · תיקון-מטא-דאטה ל-`מילוי בלבד` · איחוד תלות-שקילות-מותנית (`גדול` CASE + רשימות-אטומיות) · `relation_evidence` actor · `decision_ledger` `NOT VALID` · נתיב-UI ל-canonicalize.
>
> **F. מה לא-נעשה כאן (מפורש):** אין הרצת-חישוב-DB · אין Full Scan · אין הפעלת-composite · אין הרחבת-fixtures · אין `רגיל+אתבש` · **אין שינוי ל-`אות רבתי`** (אומת חי: `active=true`, `executable=true`, `engine_verified=true`, `execution_kind='context_activated'`, `scannable=false` — נשאר כפי-שהוא) · אין חישוב-מחדש של 78 ה-`topic_cards` · אין תיקון-רישום ל-`מילוי בלבד` · אין UI · אין עיצוב-מחדש של Foundation · אין מחיקה/ניסוח-מחדש של אמת היסטורית · אין כתיבה ישירה ל-`main` · אין merge/deploy.
>
> **STATUS:** `ENGINE CORPUS CANONICAL CLOSURE — APPLIED (docs-only)`. ענף `claude/engine-corpus-canonical-closure`, בסיס `main`@`fbc201bb` — **טרם-merge, טרם-deploy**, ממתין ל-GPT review.
>
> ---
>
> ### 23.19-A ⟳ עדכון-מתוארך גובר (29.8.2026, `COMPOSITE_ACTIVATION_1_TO_3`) — יקום-הסריקה עבר מ-18 ל-**21** שיטות
>
> > **מוסיף-על כל הטקסט שמעליו, לא-מוחק ולא-מנסח-מחדש דבר.** כל המספרים ב-§23.19 A-F (18 שיטות · 12,592 ביטויים · 226,656 שורות מושלות · `bidim` 348,240) היו **נכונים-לזמנם** ונשמרים כ-provenance מדויק של סגירת-המסלול-האטומי. המצב-החי מאותו-רגע-ואילך מתואר כאן.
> >
> > **מה קרה:** אחרי סגירת §23.19, **שער-אנושי של צוריאל אישר הפעלה של שלושה composites בלבד** — `רגיל+מילוי` · `רגיל+מסתתר` · `רגיל+משולש` (=`רגיל+קדמי`). קדמו לכך שני חוסמי-`MUST FOUNDATION NOW` שנמצאו בשער-קדם-ההפעלה (`work_log b80f9e6a`) ונסגרו (`work_log a0ce889b`): **CA-1** (זהות `bid_id` — 37,776 שורות היסטוריות מופתחו-מחדש לזהות הקנונית `fn_bidim_id`, בשמירה על הערך ובאימות-בתוך-אותה-פקודה, כדי שהפעלה **תשדרג-במקום ולא-תשכפל**; ללא זה היו נוצרות 50,368 שורות כפולות) ו-**CA-2** (`dependency_verified_at` נקבע מראיות-פיקסצ׳רים 732/732; `engine_verified` **נגזר** מהפרדיקט הקנוני ולא-נדרס).
> >
> > **מצב-חי מאומת (נבדק ישירות מול `linswmnnkjxvweumprav`, לא-הונח):** יקום-סריקה = **21 שיטות SCANNABLE** (18 אטומיות + 3 composites) · קורפוס כשיר = **12,594** ביטויים מאומתים, **וכולם גם `is_published=true`** · **כיסוי מושל = 264,474 = 21 × 12,594** (זהות אריתמטית מאומתת) · לכל אחד משלושת ה-composites **12,594 שורות מושלות בדיוק**, 0 שורות `legacy_verified` שנותרו, 0 שורות במפתח-הישן, 0 כפילויות-`bid_id`, 0 כפילויות-(word_id, method), 0 שורות מושלות של שיטה לא-scannable · `bidim` סה״כ **348,282**.
> >
> > **הניסוח הקנוני מתעדכן ל:** **CURRENT 21-METHOD CANONICAL CORPUS COVERAGE COMPLETE.** ההבחנה נשמרת במדויק: ה-re-certification המקורי של **18 השיטות האטומיות סיפק את דרישת-הסריקה האטומית** (וזה נשאר נכון); הפעלת שלושת ה-composites **הרחיבה** את יקום-הסריקה הנוכחי ל-21; כיסוי-מושל **מלא לכל 21 השיטות ה-scannable הנוכחיות**.
> >
> > **⛔ ללא שינוי — Full Canonical Method Scan עדיין לא-הורץ ואינו-נדרש.** לא בוצעה שום הרצה-חוזרת מיותרת, לא של 226,656 החישובים האטומיים ולא בכלל. הכיסוי ה-composite נוצר בפעולת-כיסוי-מושל ממוקדת לשלוש השיטות שאושרו, לא בסריקה-מלאה. `NO-REDUNDANT-AUDIT LAW` בתוקף מלא. הקביעה של §23.19-B — «הדרישה החישובית סופקה ע"י ה-governed re-certification» — **נשארת נכונה**, ומורחבת כאן לכלול את שלושת ה-composites.
> >
> > **מה שלא-השתנה:** `משולש מילה+משולש הפוך` (#4) נשאר **`active=false` · `scannable=false` · `engine_verified=false`** ב**שער PRE-ACTIVATION נפרד** — חסום ב-CA-2 וגם בהיפוך-הממשל של מרכיביו (שניהם `historical_public` עם 12,009 שורות מיושנות); אומת חי כבלתי-נוגע. `רגיל+אתבש` **עדיין לא-רשום** (0 רשומות; סה״כ composites רשומים = 4) — כעת מוגן מבנית מכפילות-זהות ע"י `fn_composition_identity` + האינדקס הייחודי. סחיפת-הרישום (7 שורות) ו-`מילוי בלבד` נשארים `NON-BLOCKING` ולא-תוקנו. 78 ערכי `topic_cards.meter_score` המיושנים נשארים לשער-אנושי נפרד.
> >
> > **התכנסות — ללא ניפוח:** חוק-התלות פועל חי אחרי ההפעלה — composite מוסר כשכל מרכיביו נוכחים (הוכח בערכים 30 · 50 · 94, 3 שיטות → 2), ושורד רק כשמרכיב אחד בלבד מגיע לערך (למשל 1820, שם הציון נותר **89** — ההפעלה **לא ניפחה** את ההתכנסות הקנונית).
> >
> > **מצב-שחרור מדויק:** שינויי-ה-DB של ההפעלה **חיים בפועל** ב-`linswmnnkjxvweumprav`. קבצי-המיגרציה שלהם חיים על ענף `claude/composite-foundation-patch-ca1-ca2` ב-**PR #240, שנכון לכתיבת שורה זו הוא פתוח וטרם-מוזג** — כלומר DB-LIVE ו-git-merge-pending בו-זמנית. אין לרשום כאן «PR #240 מוזג». `origin/main` = `fbc201bb489d68de4dc6732c3c1067a9db189819` ללא-שינוי.

---
*בסיס-עובד v2. עודכן לאחרונה 25.8.2026 (§19 A/B, §21, §22, §23) — נשמר בענף `claude/raziel-capabilities-audit-h5k9ww` (מקור γ) + נכתב לגוף-המסמך על ענף `claude/els-function-inventory-86klre` + `claude/relation-engine-v1` + `claude/live-sync-v5.3-reconciliation` + `claude/sod1820-roadmap-reconciliation-jmbti4` + `claude/sod1820-personal-journey-research-kr4mcp` (סשנים; האחרון = `PERSONAL_FOUNDATION_CANONICALIZATION`, §23.7). שינויי-DB בסבב-ה-25.8: `project_codex.slug='person_foundation_contract'` + `nodes.rule_id='person_foundation_contract_law'` בלבד (חוזה-תיעודי, לא-קנון-תוכן/לא-schema) + רשומות `work_log` coordination — **0 שינוי-סכמה/migration/history-row בסבב-הסגירה עצמו**. שינויי-DB היסטוריים (סשנים קודמים): (1) הקפאת cron job 27 (`metatron-nightly`, הפיך); (2) **H-1** — RPC `fn_persist_discovery` + מועמד-בדיקה-אחד (878=משיח↔דבר-מתוך-דבר, status=`candidate`, ממתין ל-Human-Gate). מלבדם READ-ONLY. שום `INFERRED` אינו עובדה; שום שיטה לא-הופעלה; שום convergence היסטורי לא-חובר/קודם/נמחק; שום קנון לא-שונה (מלבד §0 governance + §8 FREEZE + §10 חזון + H-1 front-half + §19 A/B + §21 + §22 + §23 התיעוד-הזה).

**עדכון נוסף, 26.8.2026 (§23.8, `SHARED_EXPRESSION_EXTRACTION_V1_MERGED`):** נכתב-לגוף-המסמך על ענף `claude/zvi-full-corpus-dossier`, **ואז מוזג ל-`main`** (commit `796b3a3d`, Human-Gate ZURIEL/GPT מאושר). שינויי-DB בסבב-הזה: `project_codex.slug='shared_expression_extraction_v1'` + `nodes.rule_id='shared_expression_extraction_contract_v1'` (חוזה-תיעודי) + רשומות `work_log` coordination. שינויי-קוד (ממוזגים ל-main): `src/lib/analysisFlow.js` (תיקון-דריפט `normMethod`) + `src/lib/triage.js` (Rule #35/#36) + `docs/shared-expression-extraction-v1-contract.md` (חדש). **0 שינוי ל-`research_objects`/`gematria_words` של צבי, 0 שיטת-גימטריה חדשה, 0 קידום-לעץ-כללי.** Deploy(Vercel)/Live-verification טרם-בוצע בסבב-הזה.*

**עדכון נוסף, 26.8.2026 (§23.9, `CORPUS_ADMISSION_FOUNDATION_V1` — מיזוג-סופי/`CANONICAL_METADATA_RECONCILIATION`):** ענף-`claude/corpus-admission-foundation-v1` (PR #198, base ישן) לא-ניתן-היה-ל-raw-merge אחרי-שמיין-PR #197/#196 — תוכנו-הייחודי הועתק-מחדש (fresh-port, סבב-4) לענף חדש ונפתח כ-`PR #199`, **שמוזג ל-`main`** (`06087fca`). `PR #198` נסגר-ללא-מיזוג, גוף-ה-PR מסומן `SUPERSEDED BY #199`, אין-אובדן-תוכן. `docs/corpus-admission-foundation-v1-contract.md` (Closure Pass 1-4 המלא) חי היום על `main`. שינויי-DB (סבב-זה בלבד): `nodes.rule_id='corpus_admission_foundation_v1'` ו-`project_codex.slug='corpus_admission_foundation_v1'` עודכנו additive (merged=true/pr_number=199/superseded_pr=198/main_sha) — **0 שינוי-סכמה, 0 שינוי-לוגיקה/RPC** (אלה כבר חיים-ומאומתים מסבבים-קודמים). **סטטוס:** `FOUNDATION_SUFFICIENT_MERGED_VERIFIED`. נקודת-החזרה-הבאה: `Writer 3 validation` — לא-נפתח בסבב-זה.*

**עדכון נוסף, 26.8.2026 (§23.10, `NUMERIC_RESEARCH_ROUTER_V1_PI_FIBONACCI` — Canonical Documentation Sync בלבד):** נכתב-לגוף-המסמך (Roadmap+Master State) על ענף `claude/numeric-router-doc-sync`, base `main`@`0bbc8873` (אחרי-מיזוג PR #200). **0 קוד/DB חדש בסבב-הזה** — סנכרון-תיעודי-בלבד של עבודה-שכבר-קיימת-וחיה על ענף `gpt/numeric-research-router-v1-pi` (Draft PR #203, **לא-מוזג**). כל-הנתונים-המספריים (π: 337→230/3060→5679/1820→24653; Fibonacci: 233→13/1→1/337→NOT-FOUND) אומתו-חי ע"י Claude בהרצת-node ישירה על הקוד-האמיתי, לא-שוחזרו-עצמאית ולא-נלקחו-מהדיווח-בלבד. `gpt/numeric-router-roadmap-sync` (ענף-ריק שGPT-פתח-קודם ולא-הצליח-לכתוב-אליו, tooling-limitation) אומת-ריק (0 ahead/0 behind) לפני-הכתיבה — אין-overlap. **נקודת-החזרה-הבאה:** `Number Research Dossier v2 — Projection Contract` (צוריאל מוביל את הצד-המחקרי במקביל).*

**עדכון נוסף, 29.8.2026 (§23.17, `EXPERIENCE_GOVERNANCE_FOUNDATION_V1_CLOSURE`):** נכתב-לגוף-המסמך (Master State §0 סעיף 16 + §23.17 + Roadmap pointer) על ענף `claude/experience-governance-foundation-v1-1ki2s6`, base `main`@`fc10eb5c` (0-drift, נבדק-חי לפני כל commit בשרשרת). שינויי-DB בסבב-הזה: `nodes.rule_id='identity_architecture_law'` רשומה-חדשה (`rule_version=1`, `is_active=true`, המשמעות-נשמרת-מילה-במילה מ-CLAUDE.md) + `nodes.rule_id='experience_governance_foundation_v1_law'` רשומה-חדשה (`rule_version=1`, `is_active=true`) + `project_codex.slug='experience_governance_foundation_v1'` רשומה-חדשה (`category='architecture'`, `priority=1`). **0 שינוי-סכמה, 0 טבלה/engine חדשים, 0 שינוי-קוד-אפליקציה.** שמונה-החלטות Human-Gate של צוריאל (`work_log.f4811264`) יושמו — פירוט-מלא ב-§23.17 לעיל, לא-מוכפל-כאן. PR **#234, טרם-מוזג, טרם-פרוס** — לפי הוראת-צוריאל המפורשת לעצור-לפני-merge/deploy עד ל-GPT re-cross-verification.*

**עדכון נוסף, 29.8.2026 (§23.18, `CANONICAL_RECONCILIATION_2026_08_29`):** נכתב-לגוף-המסמך (Master State §23.17 עדכון-סטטוס-מתוארך + §23.18 חדש + §CL שורות 43-46 + Roadmap pointer) על ענף `gpt/canonical-reconciliation-2026-08-29` (PR #237), בסיס `main`@`2cc0725372e3260b06b510f1b93101da14f665c7` (Merge PR #236). **סבב APPLY בלבד** של חבילת-הפיוס `docs/canonical-reconciliation-2026-08-29.md` (commit `3b262fdf`) — **0 audit חדש, 0 החלטה חדשה, 0 שינוי-סכמה, 0 migration, 0 שינוי-DB (למעט רשומת `work_log` provenance), 0 שינוי-קוד/engine, 0 הפעלת-שיטה/composite, 0 חישוב-מחדש של `topic_cards`, 0 Full Scan.** הפסקה-הקודמת (§23.17, "PR #234, טרם-מוזג, טרם-פרוס") **נשמרת כפי-שהיא** כטענה-שהייתה-נכונה-בזמנה; המצב-החי מאותו-רגע-ואילך הוא **PR #234 מוזג (`e5f21efc`) ו-PR #236 מוזג (`2cc07253`)** — ר' §23.18-A. ⛔ **תיקון-ניווט קריטי:** סגירת Engine Governance **אינה** מאשרת Full Canonical Method Scan; השרשרת היא `ENGINE GOVERNANCE CLOSED → CANONICAL DOC RECONCILIATION → PRE-SCAN READINESS GATE → ורק אם PASS: FULL SCAN` (§23.18-C). `work_log` הפיוס: `a326de5c-68c5-4717-87ef-1faf0eb47eb0`. PR **#237, טרם-מוזג, טרם-פרוס** — עצירה לפני merge/deploy לפי ההוראה המפורשת.*

**עדכון נוסף, 29.8.2026 (§23.19, `ENGINE_CORPUS_CANONICAL_CLOSURE`):** נכתב-לגוף-המסמך (§23.18 עדכון-סטטוס-מתוארך [PR #237 מוזג, `643061b5`] + §23.19 חדש + §CL שורה 47 + Roadmap navigation) על ענף `claude/engine-corpus-canonical-closure`, בסיס `main`@`fbc201bb489d68de4dc6732c3c1067a9db189819` (Merge PR #238). **סגירה תיעודית-בלבד: 0 הרצת-חישוב-DB, 0 Full Scan, 0 schema/migration, 0 שינוי-engine/קוד/UI, 0 הפעלת-שיטה/composite, 0 שינוי ל-`אות רבתי`, 0 תיקון-רישום ל-`מילוי בלבד`, 0 חישוב-מחדש של `topic_cards`** — שינויי-ה-DB היחידים בסבב הם שתי רשומות `work_log` (BEFORE `0ec2f3c3` + AFTER). **כל העובדות-החיות שנטענו אומתו חי לפני הכתיבה ולא נלקחו כנתון** (PR #238 `merged=true`; 18/12,592/226,656 עם min=max לכל שיטה; 0 שורות מושלות לא-scannable; 7 שורות-סחיפה עם חפיפה 0; ארבעת ה-composites; שדות `אות רבתי`; היעדר מנוע Full-Scan נפרד) — ר' `work_log` `0ec2f3c3` לפירוט המלא. האמירות ההיסטוריות «Full Scan טרם-הורץ» **נשמרות כלשונן**; §23.19-B/C מוסיפים עדכון-מתוארך גובר בלבד: הדרישה החישובית סופקה ע"י ה-governed re-certification, ולכן הרצה-חוזרת של אותם 226,656 חישובים מיותרת (`NO-REDUNDANT-AUDIT LAW`). PR **טרם-נפתח-למיזוג — טרם-merge, טרם-deploy**, עצירה לפני merge לפי ההוראה.*


---

## §23.20 — MF-1 INTAKE IDENTITY INVARIANT · INTAKE READINESS CLOSURE (30.8.2026, `MF1_INTAKE_IDENTITY_INVARIANT_CLOSURE`, Human-Gate ZURIEL)

> **מעמד:** הפעלה שלישית של **`FOUNDATION EXPANSION GATE` (§23.5)**, הפעם על דומיין **Research Intake · Source-Native Identity**. סוגר את **`Return Point`: INTAKE READINESS CLOSURE** שנקבע ב-Roadmap v5.3.
> **הבית הקנוני של החוק עצמו** הוא `nodes.rule_id='research_object_identity_invariant_law'` (v1) — הסעיף כאן הוא **אינדקס-מצב ותיעוד-שער**, ואינו-משכפל את גוף-החוק (§0 סעיף 16).

### A. שמירת-אמת היסטורית (מחייב)
המעבר הקורא-בלבד (30.8.2026, `work_log` **`d91623ce`**) החזיר במפורש **`FOUNDATION NOT SUFFICIENT`** עם `MUST FOUNDATION NOW` יחיד. **פסיקה זו הייתה נכונה בזמנה ונשמרת כלשונה** — היא לא-נמחקת ולא-מנוסחת-מחדש. הסעיף הזה מוסיף **עדכון-מתוארך גובר בלבד**: החסם נסגר, ולכן הפסיקה העדכנית היא `FOUNDATION SUFFICIENT`. **אפס מחיקה, אפס ניסוח-מחדש** (`NO-DISAPPEARING-WORK`).

### B. הממצא (READ-ONLY, `work_log` `d91623ce`)
`research_objects` (579 שורות) לא-החזיקה **שום** ערובת-זהות: 0 אילוצי-UNIQUE, 0 FK על `source`/`source_ref`, ו-`ro_dedup_idx` הוא אינדקס **לא-ייחודי**. החוזה הקפוא (`research_intake_foundation_contract` §2) מגדיר את `source_ref` כ**ציטוט**, ומעולם לא כמפתח-זהות — אך המימוש **העמיס עליו תפקיד של מפתח-ייחודיות בחמש דרכים שונות ובלתי-נראות זו-לזו**. תוצאה חיה ומוכחת: אותה טענה בודדת («המילה יכחד מתפרקת לצירוף כח-יד») נקלטה **7 פעמים** מאותו `source_ref` על-פני 4 ימים, כי `research-extract-scan` (cron 40, `0 * * * *`, `hours=3`) קורא-מחדש חלון-3-שעות **כל שעה** ונרמול-הניסוח של ה-LLM עקף את ה-dedup המחרוזתי, כולל מקרה שבו `kind` התהפך `observation→relation`. ב-6 מקרים שונים אותה טענה נכנסה משני נתיבי-קליטה שלא-רואים זה-את-זה (`channel_updates:<uuid>` מול `…#a0`). מבחן-לחץ 16-מקרים: `PASS 1 / PARTIAL 3 / FAIL 10 / NOT-IMPLEMENTED 2`.

### C. שורש-הבעיה (מיפוי-כותבים, `work_log` `372d7a5c`)
**9 מחלקות-כותבים** מגיעות ל-`research_objects`. **כולן current — 0 legacy, 0 transitional**: כל אחת נוצרה 24-26.8.2026 או-מאוחר-יותר, וההיסטוריה כולה מתחילה 23.7.2026. לכן **השורש אינו דו-קיום-legacy אלא היעדר invariant-זהות משותף** — חמישה שבועות של בנייה מקבילה שבהם כל כותב המציא תשובה משלו ל«מה נחשב אותו-מקור». **הכותב הדומיננטי הוא SQL ישיר של סוכן דרך service-role/MCP — 410 מתוך 579 שורות (70.8%)** — והוא **לא-ניתן-לניתוב** דרך RPC. מכאן: ניסיון לאכוף ברמת-הכותבים מכסה לכל-היותר 29% מהנפח, ולכן **נקודת-האכיפה היחידה שמכסה 100% מהכותבים היא גבול-הטבלה** — שהוא גם הפתרון **הקטן ביותר** (invariant אחד במקום תשעה טלאים). תקדים ישיר: `gm_composition_identity_uidx` (מעבר-המנוע, CA-1).

### D. מה מומש (המינימום המאושר בלבד — `DB LIVE`)
- **`public.fn_research_source_uid(text)`** — IMMUTABLE. מסיר **רק** סיומות-קליטה/אצווה מוכחות `#batchN` / `#aN`. **פרגמנטים סמנטיים** (`#interpretation`, `#mem-stuma`, `#valuation`) **נשמרים** במפורש.
- **`public.fn_research_claim_uid(text)`** — IMMUTABLE. נרמול **שמרני**: מאחד משפחת-מקף/מקף-עברי, מוחק משפחת-מרכאות ורווחים. **ספרות ואופרטורים מתמטיים נשארים משמעותיים-לזהות** לפי §6.10 של החוזה — נרמול לא-גובר-על-חוזה.
- **`research_objects_identity_uidx`** — UNIQUE **חלקי** על שתי-הפונקציות, **קדימה-בלבד**, חתך-ליטרל **קבוע** `2026-08-29 21:00:00+00` (**לא** `now()`, שהוא גם אסור-בפרדיקט-אינדקס וגם הופך את ה-invariant ללא-משוחזר). נבחר כי `max(created_at)`=`20:54:23.87Z`, ולכן `rows_at_or_after_cutoff = 0` — **כל 579 השורות ההיסטוריות מחוץ לאילוץ מבנית**.
- **מחוץ-למפתח במכוון:** `kind` (משפחת-הכפילות החיה שינתה `observation→relation`; הכללתו היא-עצמה הסיבה שה-dedup הישן פספס) ו-`source` (40 איותים ל-~15 מקורות לוגיים).
- **כותבים אידמפוטנטיים:** `channel_update_save_to_research` · `image_artifact_route_to_intake` · `research_artifact_save` · `fn_persist_discovery` · `fn_corpus_admission_gate` — `ON CONFLICT … DO NOTHING` + החזרת-השורה-הקיימת. `research_artifact_save` העביר את הבדיקה-המקדימה מ-`source_ref` בלבד לזהות-הקנונית → **נסגר באג אובדן-מידע שקט** (טענה-שנייה שונה מאותו מקור נזרקה, והוחזר `already_existed` עם id לא-קשור).
- **לא-נגעו במכוון:** `fn_upsert_self_profile` / `fn_upsert_family_member` / `fn_upsert_family_relation` — כבר אידמפוטנטיים לפי ref דטרמיניסטי, ו-`DO NOTHING` היה מחזיר NULL במרוץ ושובר את חוזה-ההחזרה שלהם.
- **SQL ישיר של סוכן מקבל שגיאת-unique אמיתית** — התנהגות מכוונת ונכונה, לא רגרסיה.
- `supabase/functions/research-extract/index.ts` **הוטמע-לריפו** (vendored) עם שני-תיקונים בלבד — אי-ההתאמה `""`-מול-`NULL` ב-`source_ref`, ו-`23505` כ«כבר-נקלט» — **וטרם-נפרס**.

### E. הוכחות (חי)
שער-בטיחות **6/6**, כאשר **Gate-6 תפס פגם-אמת בנרמול המתוכנן**: `split_part(source_ref,'#',1)` גנרי היה הורס גם את שלושת הפרגמנטים הסמנטיים — הנרמול **צומצם, לא-נעקף**. אחרי הצמצום: **579 → 575 זהויות-נבדלות · 1 קבוצת-התנגשות · 4 שורות-עודפות** (בדיוק משפחת-ה-`יכחד` המכוונת) · `channel_updates:d0d58a89` שומר **9 מתוך 9** טענות-לגיטימיות · אופרטורים וספרות נשארים נבדלים. **self-test 8/8** (חזרה-זהה / ניסוח-מרכאות / היפוך-`kind` / `#batch0` → **נחסמו**; טענה-שנייה-שונה / מספר-שהשתנה / `#interpretation` → **נכנסו**), שורות-הבדיקה נמחקו אחר-כך. **היסטוריה זהה-בייט:** 579 שורות, `id fingerprint` `1a31c4511b5bbb447f31f0550461c988` ו-`content fingerprint` `8e5d14ac0e8d0ffeaa3b52a7d2e29ecb` — לפני ואחרי. מחזור-cron אמיתי אחרי-המיגרציה (23:00:00Z) — 0 שורות-חדשות, 0 זהויות-כפולות-חדשות. `npm run build` ✓. RLS ו-GRANT-עמודות ללא-שינוי. **Human Gate ללא-שינוי** (`admin_research_review` לא-נגעו).

### F. פסיקה ומצב-שחרור
**`FOUNDATION SUFFICIENT` — MF-1 `CLOSED`.** מבחן-הלחץ אחרי-המימוש: **`PASS 10 · PARTIAL 0 · FAIL 0 · DEFERRED-BY-DESIGN 6`** (היה `PASS 1 / PARTIAL 3 / FAIL 10 / NI 2`). כל 8 מקרי-ה-`MUST NOW` נסגרו; כל דחייה סווגה מראש `EXTENSION POINT NOW` או `LATER` ואף-אחת אינה-מפרה את MF-1.
**נדחו-במכוון (לא-חוסמי-Foundation):** זהות-תורם אל `persons`/`identity_edges` · ישויות-מקור מדרגה-ראשונה (`nodes` `type='source'/'book'/'edition'`) · hashing/גרסאות של תוכן-מקור · תיקון/משיכה-בחזרה · ריבוי-ציטוטים · איחוד אוצר-המילים החופשי של `source` (40→~15) · באג-חלון `buildConversation()` (40-ההודעות-הראשונות).
**מועבר ל-Projection, לא ל-Foundation:** מדיניות ה-RLS הציבורית `ro_dossier_read` מקשרת נראות לשם-תצוגה חופשי ובר-שינוי (`contributor`, 354 שורות תואמות) — עניין-נראות, לא עניין-זהות-Intake.
**שארית מוצהרת:** ניסוחים-מחדש של LLM שנבדלים ב**מילים** (לא בפיסוק) אינם-נתפסים — אילוץ UNIQUE לעולם לא-מנחש סמנטיקה.
**Provenance:** `work_log` `d91623ce` (READ-ONLY, `NOT SUFFICIENT`) → `372d7a5c` (עיצוב-המינימום) → `091b7274` (BEFORE) → `c5eeeb8e` (AFTER) → merge. ענף `claude/mf1-intake-identity-invariant`, commit `da68099c`, **PR #241 מוזג ל-`main` (`cc400db1`)**, 3 קבצים / 733 תוספות / **0 מחיקות**. **`APP DEPLOYED` לא-אומת** (אפס קבצי-`src/` שונו; פרודקשן מחזיר 403 לסוכן) · **Edge `research-extract` לא-נפרס** (אומת: עדיין version 2).

**⛔ אין בסעיף זה אישור** ל: Intake Build · ingestion-המוני · source→canonical · Projection/UI · פתיחת-מסלול-Foundation נוסף.

---

## §23.21 — WS-CROSS-ENGINE FOUNDATION EXPANSION GATE CLOSURE + HUMAN-GATE CLOSURE (30.8.2026, `WS_CROSS_ENGINE_HUMAN_GATE_CLOSURE`, Human-Gate ZURIEL)

> **מעמד:** הפעלה נוספת של **`FOUNDATION EXPANSION GATE` (§23.5)** — אחרי Intake (§23.20/MF-1) ואחרי One Tree/Reality-Graph (ר' הערת-פער למטה) — הפעם על **דומיין `WS-CROSS-ENGINE`** עצמו (Cross-Research Engine / מנוע-הצלבות-מתקדם), לא-רק על-תלויותיו. סוגר את «הצעד-הבא-בשרשרת = `WS-CROSS-ENGINE`» שנקבע ב-Roadmap אחרי סגירת One Tree (30.8.2026).
> **הערת-פער (לתיעוד-בלבד, מחוץ-להיקף-המשימה-הזו):** סגירת One Tree/Reality-Graph (MF-G1/MF-G2/MF-G3, `work_log eead0455`/`17397f71`) תועדה עד-כה **רק ב-Roadmap** (`ONE_TREE_FOUNDATION_CLOSURE`) — לא נמצא סעיף-מקביל כאן ב-Master-State בזמן-כתיבת-סעיף-זה. אינו-נפתר-כאן (מחוץ-להיקף `WS-CROSS-ENGINE` docs-only); מתועד כ-DRIFT-ידוע לסבב-תיעוד-עתידי.

### A. שרשרת-המימוש הטכנית (כולה מאומתת-חי, `main` `d8f2a768`)
| שלב | PR | main SHA אחרי-מיזוג | תיאור |
|---|---|---|---|
| MF-X1 | #251 | `49660b98` | ACL-closure — `fn_generate_convergence_candidates` נוצר-בלי-ACL-מפורש (`proacl NULL`→ברירת-מחדל EXECUTE-ציבורי); צומצם ל-`postgres`+`service_role` בלבד, ללא-שינוי-גוף-הפונקציה. |
| MF-X1b | #252 | `63b839e1` | ACL-closure נפרד (סיבת-שורש שונה מ-MF-X1, נשמר-בכוונה כ-provenance-נפרד) — מענק-`EXECUTE` מפורש-רחב-מדי ל-`authenticated` על `fn_composite_convergence_candidate`, בלי-שער-פנימי; צומצם לאותה-ACL. |
| MF-X2 | #253 | `bb2be817` | `fn_dispatch_method` לא-בדק `active` — שיטה-מושבתת-ע"י-Human-Gate המשיכה-להתחשב (הדגמה: `מילוי גדול` השבתה, עדיין-החזיר-1887). נוסף-פרדיקט-eligibility יחיד (`registered AND active AND function IS NOT NULL`), נגזר מ-6 קוראים-קיימים, לא-הומצא. |
| MF-X2b | READ-ONLY, ללא-PR/branch | — (registry ללא-שינוי) | Crosswalk סמנטי: האם `fn_method_is_executable` צריך-גם-לבדוק `active`. **וורדיקט A — אין-שינוי**: `fn_method_is_executable` נועד-במפורש-לבדוק יכולת-חישוב-גולמית (raw-implementation-resolves), לא-מצב-ממשל; `fn_method_is_scannable` כבר-בודק `active` בנפרד ובאופן-מכריע. ממצא-אח-נפרד שהתגלה: `fn_composite_calc` עצמו לא-בודק `active` על ה-composite (1-מתוך-4 composites מושפע) — דווח, נסגר בשלב-הבא (Composite Lifecycle Gate). |
| Composite Lifecycle Gate | #254 | `c85e589f` | סוגר-את-הפער-שדיווח-MF-X2b: composite מושבת (`משולש מילה+משולש הפוך`) עדיין-חושב 1764 דרך `fn_composite_calc`+Deep-Cross. נוסף-בדיקת-`active` ל-composite עצמו (0 שורות אחרי, לעומת-1764 לפני). גם-אומתה (Part B) הכשירות-הפורמלית-לקבלה-חדשה של אותה-שיטה-מורכבת (0/19 סטיות על-2-סטי-ביטויים, שחזור-מדויק דרך-כל-4-הנתיבים-הקנוניים). |
| Human-Gate Activation | #255 | `dc23dcd2` | הפעלת «משולש מילה+משולש הפוך» בפועל: `active` false→true, `engine_verified` false→true, `dependency_verified_at` נקבע (לא `now()` — timestamp-ליטרלי-קבוע, אידמפוטנטי). מחשב 1764 בהצלחה דרך-כל-4-הנתיבים הקנוניים = סכום-רכיבים-ישיר (483+1281). |
| **MF-X3** | **#256** | **`d8f2a768`** | הסרת-hardcode ב-`fn_metatron_scan` (מערך-ליטרלי-קבוע של-6-שיטות) → registry-driven דרך `fn_method_is_scannable`+עמודת-DB. יקום-הסריקה עולה 6→14 שיטות-כשירות (8 חדשות: אלב"ם/אתב"ש בין-השאר). `convergences` (8,917 שורות) **ללא-שינוי** — לא-הורצה-סריקה-בפועל (cron-27 עדיין-מושבת, `Section D`/`targets≠computed_value_of` הוצף-לא-נפתר). |

### B. פסיקת-הסגירה (`work_log c27f1a57`, READ-ONLY, בסיס `main d8f2a768` אחרי-מיזוג-#256)
**`FOUNDATION SUFFICIENT`** — **14/14 צירים** נבדקו-מחדש (12 הצירים הקאנוניים של §23.5 — Identity/Representations/Relations/Time-Context/Provenance/Truth-Lifecycle/Engines/Extensibility/Human-Gate/Multilingual/Cross-domain/Privacy — + 2 צירים-משלימים-ייעודיים-לתחום-ה-Cross) וכולם `SUFFICIENT`. **`MUST FOUNDATION NOW` = 0.** **`EXTENSION POINT NOW` = 7 · `LATER` = 4** — כל 11 הפריטים **נשמרים כרשומים במלואם ב-`work_log c27f1a57`** (הדוח-המלא, לא-מוכפל-כאן כדי-שלא-ליצור-עותק-שני-שיכול-לסטות ממנו) — **נדחים-במפורש, לא-אבודים** (`NO-DISAPPEARING-WORK`; כל-אחד ימשיך-להיבדק-מחדש בכל-סבב-Foundation-Expansion-Gate-עתידי-שנוגע-בו).
**ממצא-מפתח שנחשף (מתועד, לא-Foundation-חוסם):** שלוש אוצרות-מילים-נבדלים לאותה-שיטה חיים-במקביל — `convergences.method` (עמודת-DB חופשית) · `bidim`+`fn_dispatch_method` (`method_key` קנוני) · `relation_evidence` (מעורב). נמדד: 45 שורות-לא-תואמות-אף-אחד משתי-המערכות; אותה-שיטה («רגיל») מיוצגת תחת-שני-טוקנים-שונים בכל-מקום (21 מול 5) — אך **הרגיסטרי מחזיק-את-שניהם**, כך-שה-resolver יכול-להישאר **פונקציה-טהורה בלי-שינוי-סכימה**. `targets`≠`computed_value_of` (שני-סוגי-קשת נבדלים בגרף) **הוצף מחדש, לא-נפתר** — נשאר `EXTENSION POINT`; מיפוי-ל-`edges`/`relates[]` בפועל שייך-לשלב-הבנייה-העתידי-של-ה-Projection, לא-ל-Foundation.

### C. Human-Gate
**ZURIEL אישר במפורש** את סגירת ה-`FOUNDATION EXPANSION GATE` הזה (30.8.2026). האישור **חל על-ה-Foundation בלבד** — כלומר: הבסיס-הטכני (ACL/lifecycle/registry-driven-scan תחת `fn_dispatch_method`/`fn_metatron_scan`/`fn_composite_calc`/כותב-מועמדי-התכנסות) בטוח-ומספיק-כדי-שבנייה-עתידית-של-Cross-Research-Engine (Orchestrator+Candidate-Generator+Ranking-Layer, כמתואר-במפרט-המקורי בכרטיס-ה-workstream `WS-CROSS-ENGINE` ב-Roadmap) לא-תצטרך-redesign. **האישור אינו** אישור לבניית-ה-Orchestrator/Projection/UI עצמם — אלה נשארים שלב `Projection` נפרד, לפי-סדר `Foundation → Projection → Experience`, וטעונים Human-Gate נפרד משלהם, טרם-נפתח.

### D. שחרור-מצב ומה-הבא
**`WS-CROSS-ENGINE` FOUNDATION: `CLOSED`.** `ACTIVE_NOW` (`WS-RESEARCH-STUDIO-FOUNDATION`) **לא-שונה** — סגירת-שער-Foundation אינה-דחיפת-עדיפות. לפי שרשרת-התלויות הקיימת (`… ← Research Intake ← One Tree/Entity Hub ← WS-CROSS-ENGINE ← Raziel`), **הצעד-הבא-בשרשרת (זיהוי-בלבד, טרם-הופעל, טרם-נבנה) הוא הפעלת `FOUNDATION EXPANSION GATE` (§23.5) על דומיין `Raziel`** — באותה-מתודולוגיה-בדיוק שהופעלה כאן ועל One Tree/Intake לפניו.
**⛔ אין בסעיף זה אישור** ל: Cross-Research-Engine Projection/UI בפועל · Number-Page-redesign · Raziel-wiring/runtime · ingestion-המוני · פתיחת-מסלול-Foundation נוסף.
**Provenance:** `work_log` `c27f1a57` (Gate, READ-ONLY, CLOSING VERDICT) · `1fe84e3b` (PR256_MFX3_MERGE — AFTER) · `ba6e41c5`/`360120e4` (MFX3 implementation, AFTER/BEFORE) · `7609bd3c`/`f109c820` (composite activation, merge+AFTER) · `39937421`/`ff573891` (composite lifecycle, AFTER/BEFORE) · `22e977c5` (MFX2b, READ-ONLY verdict A) · `5a1e8acf`/`5fad403d`/`4e258971` (MFX2, merge/AFTER/BEFORE) · `13cfd6f6`/`9306801a`/`8c2fd983` (MFX1b, merge/AFTER/BEFORE) · `6ada12b3`/`deb04009`/`27102a6b` (MFX1, merge/AFTER/BEFORE) · `d4502d68`/`856c194b`/`aaee10b3` (PR250 merge + design gate + roadmap drift closure). ענפים (כולם מוזגים ל-`main`): `claude/mfx1-convergence-candidate-acl` · `claude/mfx1b-composite-convergence-acl` · `claude/mfx2-dispatch-method-lifecycle` · `claude/composite-lifecycle-active-gate` · `claude/activate-meshulash-composite` · `claude/mfx3-metatron-scan-registry-driven`. Docs-reconciliation (סעיף זה + Roadmap-updates, סעיף-נוכחי): ענף `claude/ws-cross-engine-human-gate-docs-ymhvqy`.

## §23.22 — RAZIEL FOUNDATION EXPANSION GATE CLOSURE + `RAZIEL_ADVANCED_NUMBER_PAGE_v0` SSOT RECONCILIATION (31.8.2026, `RAZIEL_FOUNDATION_EXPANSION_GATE_CLOSURE`, Human-Gate ZURIEL)

> **מעמד:** תיעוד-SSOT **docs-only**, מבוקש-במפורש ע"י ZURIEL, המתאם שני ממצאים שכבר-נצפו/אומתו בסבבים read-only קודמים מול המסמכים הקנוניים: (א) הפעלת **`FOUNDATION EXPANSION GATE` (§23.5)** במלואה על דומיין **`Raziel`** עצמו (audit מלא-דומיין: Identity/Persona-Role/Memory/Research-Lifecycle/Tools-Engines/Provenance-Truth/Human-Gate/Permissions-Privacy-Tiers/Multilingual/Cross-domain, בנוסף ל-12 הצירים הקאנוניים של §23.5) — סוגר את «הצעד-הבא-בשרשרת = הפעלת Foundation Expansion Gate על דומיין Raziel» שנקבע ב-§23.21/Roadmap אחרי סגירת WS-CROSS-ENGINE (30.8.2026); ו-(ב) עדכון-עובדתי-מדויק, ליום-31.8.2026, של סטטוס `RAZIEL_ADVANCED_NUMBER_PAGE_v0`. **סעיף זה אינו-יוצר החלטת-ארכיטקטורה חדשה, ואינו-מאשר-המשך-Projection** — הוא מתעד מה-שכבר-נצפה-חי/הוחלט, וכותב-לראשונה ל-`work_log` את-פסיקת-ה-Gate שנצפתה בסבב-read-only-קודם (שם, במפורש, לא-נכתב-DB).

### A. פסיקת-הסגירה — Raziel Foundation Expansion Gate
**`FOUNDATION SUFFICIENT`.** כל-הצירים שנבדקו (12 הצירים הקאנוניים של §23.5 + 10 צירי-הרחבה ספציפיים-לדומיין `Raziel`: Identity · Persona/Role · Memory · Research-Lifecycle · Tools/Engines · Provenance/Truth · Human-Gate · Permissions/Privacy/Tiers · Multilingual · Cross-domain) נמצאו `SUFFICIENT`. **`MUST FOUNDATION NOW` = 0.**
**נקודות-הרחבה שזוהו (`EXTENSION POINT` — נשמרות-כרשומות-בלבד, לא-`MUST`, לא-יושמו בסעיף-זה ולא-אושרה-בנייתן):**
1. גישור canonical-anchors ↔ `metatron_context()`.
2. גישור זהות Person-Foundation (`WS-PERSON`/`person_foundation_contract_law`) ↔ זהות Raziel/WA הקיימת (`resolve_person`/`identity_edges`).
3. Seam לשוני/locale (`content_translation_law`) בתוך זרימת-Raziel.
4. ניקוי-טקסט SYSTEM/ממשל hardcoded בפרסונת-Raziel.
כל 4 הפריטים **נדחים-במפורש, לא-אבודים** (`NO-DISAPPEARING-WORK`) — יישארו-פתוחים-לבדיקה-מחדש בכל-סבב-Foundation-Expansion-Gate-עתידי-שנוגע-בהם. **⛔ סעיף זה אינו-מיישם אף-אחד-מהם.**

### B. `RAZIEL_ADVANCED_NUMBER_PAGE_v0` — LIVE-FACT RECONCILIATION
| שלב | PR | main SHA אחרי-מיזוג | תיאור |
|---|---|---|---|
| Probe ראשוני | #259 | `31e1b6367e6fb318fdc35a944231cc71f4b15959` | `persona="raziel"` אופציונלי (`body.mode==="advanced"`) ב-`ai-analyze`/`EntityPage.jsx` — הרחבה-אדיטיבית, opt-in, `verify_jwt=false` נשמר. |
| Closed-Beta Gate | #260 | `8eecf662` (commit `4690d0a4`) | `mode=advanced` צומצם ל-allowlist מפורש של 2 חשבונות (UUID); כל-קורא-אחר (כולל-אנונימי) מקבל תגובת-שער מנומסת ("רזיאל מתקדם עדיין בבנייה ונמצא בבדיקות סגורות") עם `engine:"gated"`, ללא-קריאה-ל-Claude וללא-עלות-quota; כותרת/תת-כותרת אקורדיון ב-UI עודכנו ל-"רזיאל מתקדם 🚧 (בבנייה — בבדיקות סגורות)". |

**סטטוס מדויק, נכון-ל-31.8.2026: `IMPLEMENTED` · `MERGED` · `DEPLOYED` · `LIVE` (לשני-חשבונות-ה-allowlist בלבד; לכולם-האחרים — gated no-op) · `PARTIALLY VERIFIED`.**
**פריטי-אימות-שיוריים (נשמרים-פתוחים במפורש, לא-נסגרים-בסעיף-זה):**
(a) אימות ויזואלי/קונסולה בדפדפן-Production לא-הושלם-עצמאית (מגבלת-sandbox/proxy-tunnel מול `sod1820.co.il`, לא-בעיית-קוד).
(b) זרימת-Advanced מלאה תחת זהות-משתמש-מזוהה-ומורשית (בתוך ה-allowlist) לא-נבדקה-חי עם זהות-בדיקה-מורשית בפועל (אין credentials זמינים לשני-החשבונות בסבבים-שביצעו-את-המיזוג/הפריסה).
**Provenance-drift שמור, לא-נמחק ולא-נכתב-מחדש:** מיזוג/פריסת PR #259 התקדמו על-בסיס הודעת-אישור-בתוך-הסשן ולא-אירוע-Human-Gate-מאומת-בנפרד — כבר-תועד במפורש ב-`work_log a16047ff` כ-drift-לתשומת-לב/הידוק-תהליך, **לא-כפגם-ארכיטקטוני/אמת/פרטיות שנמצא בקוד, ולא-בוצע/מומלץ Rollback**.

**סעיף זה מבהיר במפורש: `RAZIEL_ADVANCED_NUMBER_PAGE_v0` הוא `EARLY PROJECTION PROBE` / `TRANSITIONAL SURFACE`. הוא אינו:** ארכיטקטורת Number-Page סופית · אישור לעיצוב-מחדש של Number-Page · אישור להמשך-Projection · הגדרת-Foundation · UX קנוני של Raziel · אישור שכבת-Experience.

### C. Human-Gate
**ZURIEL ביקש במפורש** את סבב-התיעוד-הזה (31.8.2026) כ-`docs-only reconciliation`, עם write-scope מוגדר-מראש: שני-מסמכי-ה-Master + provenance ב-`work_log` בלבד. **האישור חל אך-ורק על תיעוד-המצב-הקיים** — לא-על קוד/schema/UI/Raziel-runtime/Number-Page/Metatron/זהות/Single-Mind/3D/Experience, שנשארים-מפורשות מחוץ-להיקף.

### D. שחרור-מצב ומה-הבא
**הפרויקט נשאר `FOUNDATION-FIRST` / `BOTTOM-UP REBUILD`: `Foundation → Projection → Experience`.** קיומו-בפועל והפריסה-החיה (המוגבלת) של `RAZIEL_ADVANCED_NUMBER_PAGE_v0` **אינם** מהווים מעבר-פרויקטלי ל-"Projection" כשלב-פעיל/מאושר, ואינם-דוחפים-סדר-עדיפות. `ACTIVE_NOW` (Roadmap) **לא-שונה**.
**⛔ אין בסעיף זה אישור** ל: המשך-Projection · חיווט-Raziel נוסף · Number-Page-redesign · יישום-4-נקודות-ההרחבה שב-`A` · ingestion/בנייה-חדשה כלשהי.
**Provenance:** `work_log` `123a70cc` (BEFORE, docs-reconciliation זו) · `d27f8361` (PR#260 closed-beta gate, AFTER) · `a16047ff` (governance process-drift reconciliation, AFTER) · `8131fc24` (PR#259 human-gate-approved release, AFTER) · `28c467e8` (pre-release verification pass) · `d365f3b7` (implemented, not-yet-merged) · `0a34e12e` (WS-CROSS-ENGINE docs reconciliation — זיהה את Raziel Gate כצעד-הבא, READ-ONLY). ה-Foundation-Expansion-Gate-verdict-עצמו (§A למעלה) נצפה/הופק בסבב read-only נפרד קודם ולא-נכתב-אז-ל-`work_log` (לפי-הוראת-אותו-סבב) — **נכתב-לראשונה כאן** כחלק מ-provenance-הסעיף-הזה. ענף docs-reconciliation: `claude/raziel-foundation-docs-reconciliation` (בסיס `origin/main` `8eecf662`).

---

## §23.23 — FOCUSED LIVE RECONCILIATION (1.9.2026, `MASTER_STATE_ROADMAP_RECONCILIATION_20260901`, actor=CLAUDE, GPT BEFORE `1fbcff81`)

> **מעמד:** תיעוד-SSOT **docs-only**, additive-בלבד (`NO-DISAPPEARING-WORK` — שום טקסט-היסטורי לא-נמחק). מתאם 5 סגירות/שחרורים שכבר-קרו-בפועל (עובדה, לא-החלטה-חדשה) בין 30.8-1.9.2026, שלא-שוקפו-עדיין ב-Master State: Subscriber Attribution v1 · Multilingual Identity Foundation · Tracking Closure · Behavioral Bot v3 (pointer בלבד) · Clean Traffic Classification Foundation v1. ר' Change Log #50-#54 מעלה לפרטים-מקוצרים; כאן — הסיכום המאוחד.

### A. Subscriber Attribution v1
`IMPLEMENTED`=yes · `MERGED`=yes (PR #262, `8d851c17`) · `DEPLOYED`=yes · `LIVE`=yes · `VERIFIED`=**partial**. Pointer: `docs/IDENTITY_ATTRIBUTION_FOUNDATION.md`. ארכיטקטורה: Identity · Journey · Traffic Intelligence · Attribution · Communication. **שיוריות מפורשת:** signup טבעי/מורשה אחד post-release לא-נצפה-חי בזמן-הסגירה-האחרון — **לא-נטען ש-attribution היסטורי שוחזר**; Unknown נשאר Unknown.

### B. Multilingual Identity Foundation
PR #265 → `main` (`82b93cc4`). §23.5 Foundation Expansion Gate יושם, MUST #1-#5 נסגרו; GPT ביצע cross-verify עצמאי לאחר-המיזוג (`CLOSED_NO_CHANGE`). **נקודת-הרחבה שמורה, לא-בוצעה:** representation-owner/aliases אסור-שיהפכו למערכת-זהות שנייה — נשארים מעל spine-הזהות הקיים.

### C. Tracking Closure
Canonical Share Human-Gate predicate: `event_type='share' OR section='share'` — חי (`supabase/migrations/20260901120000_canonical_share_predicate_readers.sql`, `main`). Pointer: PR #267 (`c2f3b91f`) + המיגרציה הנ"ל. **הבחנה קפואה:** `historical_baseline` (`community_share_count`=7326, provenance **`UNKNOWN`**, לא-משוחזר) **≠** `tracked_share_events` (זרם-נספר-מהיום). לא-בוצע tracking-audit נוסף בסבב-הזה.

### D. Behavioral Bot v3 — Pointer בלבד
`LOCKED` · `preserved` · `not reopened`. Canonical owner: `nodes.rule_id='traffic_intelligence_law'`. **Country = evidence, לא-חסימה** (`country_policy: evidence only`, ללא-שינוי). הגוף-התפעולי-המלא **לא-מוכפל-כאן** — ר' §0 סעיף 16 (Canonical-Owner Pointer).

### E. Clean Traffic Classification Foundation v1
**Human-Gate = ZURIEL, 2026-09-01. פסיקה: `FOUNDATION SUFFICIENT`.** `IMPLEMENTED`+`MERGED` (PR #280 → `main`, merge commit `9893e9b1`)+`DB LIVE`+`VERIFIED`+`Vercel SUCCESS` (על ה-merge-commit). Canonical owner: `nodes.rule_id='traffic_intelligence_law'` **v4** + `project_codex.slug='traffic_intelligence_law'` (מירור-מלא, כתבנית-הקיימת-לחוזה-זה — **לא-מוכפל-כאן**, §0 סעיף 16).

**סיכום-Pointer בלבד (לא-הגוף-המלא):**
- Canonical tri-state: `classification ∈ {human, bot, unknown}`. **היעדר-ראיית-בוט ≠ Human** — `is_bot=false` ו-`person_id` לבדם **אינם** ראיה-חיובית.
- `CLEAN VERIFIED HUMAN` (`clean_eligible=true`) **≠** `LEGACY HUMAN ESTIMATE` (המדד-הקיים, `fn_human_entrances`/`traffic_daily`, ~83%) — שני-מדדים-נפרדים, בעלי-שם-מפורש-שונה, חיים-במקביל. המדד-הישן **לא-הוחלף/לא-נכתב-מעליו**.
- Behavioral Bot v3 **נשמר-כלשונו** — אומת bytewise (`pg_get_functiondef` hash `1a2e30ce9e4378b975cbf79710fb4cdb`, זהה בכל שלב, כולל אחרי תיקון-זהות-החשבון).
- **סגירת-זהות (post-hoc fix, 1.9.2026):** `verified_account` evidence נבדק כעת מול **כל** ה-`person_id`-ים שנצפו בסשן (לא-רק-אחד-שרירותי) — מתוקן ל-`EXISTS`/`bool_or` לפי נוסח-החוזה-הקפוא. אומת-חי: 1,348/1,348 sessions מקושרי-חשבון מסווגים `HUMAN`.
- `EXECUTE`: `postgres`-בלבד (`anon`=false, `authenticated`=false, `PUBLIC`=false — נבדק-מפורש).

### F. PR #222 — סגירת-Drift מדויקת
`gpt/traffic-temp-disk-fix` — **מעולם לא-מוזג**; `CLOSED AS SUPERSEDED`. ה-migration המאומת שלו הועבר בפועל ל-`main` **דרך PR #280** (reproducibility-only, זהות-hash מאומתת 3 פעמים נפרדות). ה-drift הספציפי (קוד-חי-ב-DB שלא-קיים-ב-`main`) **`CLOSED`**. `work_log` ההיסטוריים של PR #222 **לא-נכתבים-מחדש**.

### G. עבודה-מקבילה שנבדקה, לא-נכללת בסגירה-הזו
`claude/els-corpus-identity-d3` (PR #281, "ELS Corpus Identity Closure — distinct Tanakh corpus_id") — **פתוח, לא-מוזג**. נבדק: נוגע-**רק**-ב-migration-אחד (`20260901000000_els_corpus_identity_tanakh_distinct.sql`), **0 חפיפה** עם שני-מסמכי-ה-Master. מוזכר-כאן **כעבודה-מקבילה-בלבד** — **אינו** מסומן קנוני/מוזג במפה.

### H. Return Point — סטטוס-מעודכן (לא INTAKE READINESS)
**`INTAKE READINESS CLOSURE`** (הבאנר-הישן, Roadmap 25.8.2026) **`CLOSED` בפועל כבר ב-30.8.2026** (§23.20, `MF1_INTAKE_IDENTITY_INVARIANT_CLOSURE`) — **וגם** מה-שהיא-גייטה (`Research Intake build`) **`CLOSED`+`MERGED`** מאז (PR #244, `e8475895`, 30.8.2026). **הבאנר-הישן שנשאר ב-Roadmap הוא stale ומוחלף כאן — לא נמחק, ר' Roadmap §🏁 RECONCILIATION 1.9.2026.**
מאז, שרשרת-סגירות-Foundation-Expansion-Gate המשיכה: `WS-CROSS-ENGINE`(§23.21, 30.8) → `Raziel`(§23.22, 31.8) → **`Clean Traffic`(§23.23-E כאן, 1.9)** — כל-אחת `FOUNDATION SUFFICIENT`, `MUST FOUNDATION NOW`=0. **בכל-סגירה נכתב-מפורש: `ACTIVE_NOW` (Roadmap) לא-שונה** — סגירת-Gate-בדומיין-בודד **אינה** מהווה מעבר-פרויקטלי-רוחבי ל-Projection; זו החלטה-נפרדת, שמורה-לצוריאל.
**עבודת-Projection כבר-בפועל-בתנועה במקביל** (לא-השערה): Entity/Graph Universal Finding Projection — PR #274 (superseded)→#275 (merged)→#276 (superseded)→#277 (merged)→#278 (merged)→#279 (merged, "Research Viewer Entity/Graph Lens UI v1") — כל-השרשרת **ממוזגת ל-`main`**, ממשיכה את סדר-הבנייה-המאושר-מראש של Research Studio v1 (§0-A: Universal Finding → Global Workspace → ELS Lens → Number/Gematria Adapter → ...). זו-אינה החלטה-חדשה — זו-המשך-בנוי-מראש שכבר-קורה.
**`ACTIVE_NOW` נשאר `WS-RESEARCH-STUDIO-FOUNDATION`, ללא-שינוי.**

**Provenance:** `work_log` `1fbcff81` (GPT BEFORE) · CLAUDE work_log entries (AFTER, ר' §Change-Log #50-54) · direct git/GitHub/DB verification (PR #262/#265/#267/#274-280/#281, `origin/main`=`9893e9b1`). ענף: `gpt/master-roadmap-reconciliation-20260901`.
