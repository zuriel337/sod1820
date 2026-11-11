# SOD1820 — ביקורת היררכיית חוזים ואיחוד סמכויות (קריאה בלבד)

**משימה:** CONTRACT GOVERNANCE AUDIT · **תאריך:** 10.11.2026 · **מוגש ל:** ZURIEL
**מאגר:** `zuriel337/sod1820` · **בסיס שנקרא:** `origin/main` = `6deeb1008285e19aad4cfcb9ae21681863ee0695` (HEAD מקומי זהה, working tree נקי) · **מסד קנוני:** `linswmnnkjxvweumprav`
**מה שונה במהלך הביקורת:** כלום. לא נכתב ל־DB, לא נוצר חוזה, לא נפתח PR, לא שונו `main`/ענפים/Production. הדוח נכתב כקובץ בתיקיית הסשן בלבד.
**נספח §10 (10.11):** ביקורת Legacy Retirement — סיווג החוקים, ה־spec והקודקס, הוראות שסותרות ש־2029 הוא Production, ורשימה לאישור (א׳/ב׳/ג׳). הנספח משולב בדוח זה ואינו פרויקט מקביל. **§10.10 (רמז התאריכים של צוריאל, 10.11):** מבט לפי תקופות — מאמת את הרמז (האתר מיוני–יולי, 2029 מאוגוסט), משנה פריט אחד ברשימות ומתקן ראיה אחת.
**§11 (11.11):** הכנת מימוש מאושר לפי ״הוראת ביצוע מאוחדת״ של צוריאל — קומיט מקומי אחד בענף `ccr-b2565041-d94syf` (md בלבד, לא נדחף), 7 הצעות SQL עם rollback שלא הורצו, בדיקות וסימולציות מקומיות, ניתוחי ד2/ד3/§5, תיקונים לטענות קודמות בדוח, ודוח מסירה. **לא בוצעה כתיבה ל־DB, דחיפה, PR, מיזוג או פריסה.** כשיש הבדל בין §11 לסעיפים קודמים — §11 קובע.
**§12 (11.11, הוראת המשך מאושרת — שמונה החלטות):** הכנה בענף ובדיקות בלבד: אימות P0 מחדש עם SHA-256 מלא, תיקון היורשים (`20_`), החרגת V1/V2 (`24_`), מסלול Corpus Admission (`40_`, פונקציות בלבד), רישום PLAN37 (`50_`), שינוי לוגיקת הסדרות (קומיט `6ab74289f`), מלאי ״בני ההיכל״ והצעות שם, ודיווח על שני דפי Legacy שמוגשים חי. **שום SQL לא הורץ; לא הייתה דחיפה, מיזוג או פריסה.** כשיש הבדל בין §12 לסעיפים קודמים — §12 קובע.
**§13 (11.11, קריאה בלבד):** השוואת PR #1296 מול `6ab74289f` (מטריצת קובץ/פונקציה/חוזה/החלטה, בדיקות והתאמה בין הזהות לשאילתה), הצעת נשא קנוני לסדרות, ונוסח SQL 10 המדויק לפני/אחרי (נספח 13.A) עם תלויות, rollback וסיכונים. שתי המלצות לאישור: 13.10.
**§14 (11.11, הכנות ובדיקות בלבד):** החלטה 1 (הנשא הקנוני של הסדרות, ועבודת הפוטר של #1296 שנשמרה בנפרד) ושער ההרצה של SQL 10: אימות SHA-256, שש שורות היעד, תנאי עצירה, rollback ונוסח ההרשאות המלא (נספח 14.A). ממצא שער: נדרשת גרסת הרצה שקולה, `10e_` (פקודה אחת, SHA-256 `f2775634…`). ההמלצה לאישור: 14.9.
**§15 (11.11, הרצה מאושרת):** ‏SQL 10 הוחל פעם אחת ב־04:32:42 UTC באמצעות `10e_` (SHA-256 `f2775634…`), אחרי preflight מלא. התוצאה אומתה (APPLIED + VERIFIED), כולל הטקסט שהורץ בפועל. שם האוסף הוכרע: ״הצופן בסרטים״. ‏patch ‏0001 הוחל כקומיט מקומי `a174089be`. BEFORE/AFTER: 15.2–15.3.
**מה לא נבדק:** (א) טקסט מלא של כל 87 החוקים (חלקם עד 68K תווים) — נקרא רק מה שנחוץ להכרעה בכל ממצא; (ב) Doc37 (619K תווים) — נקרא באמצעות חילוץ ממוקד, לא לינארית; (ג) מצב Vercel/Production — לא נקרא (לא נדרש לביקורת חוזים); (ד) התנהגות UI חיה בדפדפן.

> **מוסכמות בדוח.** **מוכח** = ציטוט/שאילתה מדויקים משני צדדים. **פער** = חוזה או החלטה בלי מימוש (או להפך), בלי סתירה בין טקסטים. **חפיפה** = שני מקורות שונים לאותו נושא, ללא סתירה מוכחת. ״חסר `depends_on`״ אינו מסווג כסתירה (כהנחיית המשימה).

---

## 0. תקציר מנהלים

**המספרים אומתו:** 468 גרסאות חוק (`nodes.type='rule'`), 87 חוקים פעילים, 50 פעילים בלי `depends_on` — זהים לביקורת הקודמת.

**ההיררכיה המחייבת כבר קיימת ואין צורך להמציא אחרת.** היא כתובה ב־`project_codex._index` (״LAW TREE / CLASSIFICATION ROUTER v1״, 8.9.2026, Human-Gate) ובחוק `inter_agent_coordination_law` (סעיפים 28, 31, 36: ״NO NEW HIERARCHY SYSTEM״). ההיררכיה המוצעת במשימה מתיישבת איתה בארבע שכבות מתוך חמש; ״החלטות ואישורים״ אינה שכבת סמכות אלא כלל קדימות (ראו §2).

**חמש הבעיות החמורות ביותר (מוכחות):**

| # | ממצא | למה זה מסוכן |
|---|---|---|
| 1 | **סמכות שחרור סותרת — הוכרע ב־10.11 (אישור מפורש לכל מיזוג ולכל פריסה; אין הרשאה עומדת), טרם יושם בחוקים.** `deploy_on_request` v3 (סעיפים 1, 2, 8) ו־`inter_agent_coordination_law` v17 (סעיף 82) מעניקים **הרשאה עומדת** לשחרור שגרתי נקי־שערים, בלי אישור נוסף של צוריאל (הציטוטים המדויקים ב־C1); `CLAUDE.md` (כלל 7 בשורה 11, §0.4 בשורה 41, §12 בשורה 250) דורש **אישור מפורש לקומיט ולפריסה מדויקים**, ושורה 64 מצטטת את `deploy_on_request` כמקור לדרישה הזאת. אין ביומן או בחוק רישום של ביטול ההרשאה העומדת (חיפוש `work_log` מ־20.10: 0 תוצאות). | סוכן שמנתב ל־`deploy_on_request` לפי Owner Index (שורה 60) עלול לפרוס בלי אישור. |
| 2 | **בעל חוזה העיצוב: V1 מול V2.** 5 חוקים פעילים רשומים עם בעלים קנוני `SOD1820_DESIGN_CONTRACT_V1.md`, וכך גם הנתב ב־`_index`; אבל V1 עצמו מצהיר ״SUPERSEDED by V2״ ו־Owner Index מכריז ש־V2 ״2029 ACTIVE״. | כל סוכן שעובד על מותג/צבעים/לוגו מנותב למסמך שהוכרז היסטורי. |
| 3 | **בעל הפוסטים אינו חוק גרסתי.** 19 חוקים פעילים (פרסום, גימטריה, משפחת מספרים) הם ״ילדים״ של שורות `project_codex` — שורת טקסט אחת, ללא גרסאות, ללא טריגר שמירה (`publishing_conventions`: 72K תווים, **עודכנה היום**). | ההיסטוריה נדרסת במקום; אין אכיפת תקינות שיש לחוקי `nodes`. |
| 4 | **החלטה מאוחרת מחוץ לחוק.** `reality_graph_law` פעיל = v8 מ־16.9; בשורת הקודקס שלו יש 7 סעיפים מתוארכים מ־23.9 עד 31.10 (6 מהם מסומנים Human-Gate; כולל ״ONE TREE / LIVING CONTENT, CHANGE AND CONTEXT״ — בדיוק ההחלטה על אירוע חדש מול תיקון וחברות ביותר מהורה אחד). לא קיימת גרסה v9. | שתי גרסאות ״אמת״ של אותו חוק־על; הלא־גרסתית חדשה יותר. |
| 5 | **שרשרת תלויות שבורה.** 20 קשתות `depends_on` (ב־13 חוקים פעילים) מצביעות על חוקים לא־פעילים (19) או על קובץ md (1); `_index` עצמו מנתב ל־2 חוקים שפרשו; 11 חוקים פעילים חסרות להם שורות של גרסאות קודמות. | ניתוב לפי `depends_on` מוביל לחוק פרוש; היסטוריית חוק נעלמה. |

**נספח §10 — Legacy Retirement (10.11, קריאה בלבד):** ניקוי ה־Legacy של 5.11 (#1239) כלל קוד, שערים ותיעוד בלבד — **ה־DB לא נוקה**. מתוך 87 החוקים הפעילים רק שניים הם Legacy בלבד, ושניהם מותנים (`number_page_law`, ‏`no_row_without_number_law`); 10 רשומות ה־spec (אפס צרכנים) מתארות את האתר הישן; וההוראות המטעות ביותר הן עובדות פריסה/Production מיושנות ב־`deploy_on_request`, `inter_agent_coordination_law`, `branches_deploy` ו־`publishing_conventions`. הרשימה המדויקת לאישור (א׳ ביטול פעילות · ב׳ עדכון סעיפים · ג׳ השארה) ב־§10.7. רמז התאריכים (האתר מיוני–יולי, 2029 מאוגוסט) אומת ב־§10.10: ההוראות הסותרות ש־2029 הוא Production נכתבו בספטמבר, בשכבת המעבר — לא בשכבת Legacy.

**החלטות הנדרשות מצוריאל** מרוכזות ב־§8; תוכנית התיקון המינימלית ב־§7.

---

## 1. אימות המספרים (שאילתות חיות, 10.11.2026)

| מדד | ערך | הערה |
|---|---|---|
| שורות `nodes.type='rule'` | **468** | 450 עם `rule_id`; 18 בלי `rule_id` — כולן לא־פעילות, היסטוריה של ״הגדרות יסודיות״ מ־6/2026 עם `superseded_by` |
| חוקים פעילים | **87** | כל אחד עם גרסה פעילה אחת בדיוק (0 חוקים עם 2 גרסאות פעילות) |
| פעילים בלי `depends_on` | **50** | 8 מהם בעלי־בית (שורשים), 42 ילדים שתלותם מוצהרת ב־`owner_routing`/`compaction_v1` (ראו §4.3) |
| `rule_id` ייחודיים ב־`type='rule'` | 271 | 87 עם גרסה פעילה; **184 ללא גרסה פעילה** — 165 עם מיפוי ״LEGACY_RETIRE_OR_SUPERSEDE״ + בעלים, **19 ללא מיפוי** (281 = 271 + 10 `spec`, ללא חפיפה ביניהם) |
| `type='spec'` פעילים | 10 | רשומות מפרט נפרדות מהחוקים (לא נספרו ב־87) |
| קשתות `depends_on` בין פעילים | 129 | נעיצת גרסה (`@13`) רק ב־1 |
| טריגר אכיפה | `trg_rule_compaction_integrity_guard_v1` | על `nodes` בלבד: גרסה רציפה, `canonical_owner` חובה, ללא כפל גרסה פעילה. **אינו בודק** שכל יעד ב־`depends_on` קיים/פעיל |

---

## 2. מפת היררכיית החוזים

### 2.1 ההיררכיה המחייבת הקיימת (כפי שנמצאה, לא כפי שהוצעה)

| מקור | מה הוא קובע |
|---|---|
| `project_codex._index` — **LAW TREE / CLASSIFICATION ROUTER v1** (8.9.2026, Human-Gate ZURIEL) | שרשרת קריאה מחייבת: **0** META/OWNER ROUTER → **1** FOUNDATION/GOVERNANCE → **2** DOMAIN STATE OWNER → **3** CONFIG/DATA (לא חוקים) → **4** PROJECTION OWNERS (שפה/ייצוג/עיצוב/ניווט) → **5** IMPLEMENTATION CONSUMERS. כלל ירושה: חוק־על אינו משוכפל בילד. |
| `project_codex._index` — **G1 AUTHORITY SPLIT** (12.9.2026) + `CLAUDE.md` §5 | live DB + `origin/main` + Production = מציאות חיה · בעל תחום = סמנטיקה · Master State = מצב מתועד · Roadmap = ניווט · `work_log` = תיאום/פרובננס · adapters/codex/זיכרון = מצביעים בלבד. סתירה → DRIFT, והבעלים/המצב החי גוברים. |
| `inter_agent_coordination_law` v17 | (28) OWNER CHECK לפני בעלים חדש: EXTEND_EXISTING / SUPERSEDE_EXISTING / GENUINELY_NEW_DOMAIN · (31) NO SILENT PARALLEL CONTRACT · (36) **NO NEW HIERARCHY SYSTEM** · (72) אין מערכת/תור/Store מקבילים · (58) התאמת הוראות סותרות בצד ה־adapter. |
| `experience_governance_foundation_v1_law` v10 — Canonical Ownership Matrix | **החלטה** = תוצאת Human-Gate המיוצגת בארטיפקט הקנוני שהיא יוצרת (**לעולם לא `work_log`**); חוק = `nodes`; חוזה ארוך = `project_codex` (חי מרגע ה־INSERT) או `audits/<slug>` (קנוני רק אחרי מיזוג ל־main או רישום בקודקס). מחזור חיים: PROPOSED → HUMAN-GATE APPROVED → ACTIVE → IMPLEMENTATION CONSUMES → ACCEPTANCE VERIFIED → RELEASE ELIGIBLE → SUPERSEDED. |
| `work_log_authority_law` v2 + `inter_agent_coordination_law` (6) | `work_log` הוא Coordination Ledger בלבד; CURRENT ≠ SUPERSEDED ≠ ARCHIVED; בסתירה בין handoff למצב בפועל — `live_state_resolution_law`. |
| **כללי קדימות של החלטה מאוחרת (שלושה, לא מתואמים)** | (א) Doc37 (פתיח, 2.11.2026): ״ההוראה הישירה המאוחרת ביותר של צוריאל באותו נושא מחליפה החלטה מוקדמת סותרת, גם כשהמוקדמת סומנה APPROVED… אינה ראיה שהקוד או חוזי הבעלים כבר השתנו ואינה הכרזת פריסה״. (ב) `CLAUDE.md` §0.1(1): סעיפי Doc37 ״נקראים לפי תאריכם (החלטה מאוחרת גוברת), אך אינם הוכחת מצב חי ואינם הרשאת מיזוג או פרסום״; §0.1(6): בסתירה ״עוצרים ומדווחים; לא מנחשים; עד להכרעה פועלים לפי הכלל המגביל יותר״. (ג) `research_strategy_layer_law` v17 / `cross_vs_convergence_criteria` v4 §14: ״PRECEDENCE CLARIFICATION״ מקומי לתחומם. |

### 2.2 ההיררכיה המוצעת במשימה מול הקיימת

| שכבה מוצעת | מקבילה קיימת | הערכה |
|---|---|---|
| 1. חוקי יסוד (זהות, גרף אחד, אמת, פרטיות, הרשאות) | שלב 1 + בעלי ה־OWNER: `reality_graph_law`, `truth_axes_foundation_law`, `person_foundation_contract_law` (+ ילדי פרטיות), `research_intake_foundation_contract_law`, `site_flags_lock_law`, `platform_tiers_law` | **מתיישב.** |
| 2. חוזי תחום (פוסטים, סדרות, תגיות, גימטריה, תוכן, פרסום) | שלב 2 DOMAIN STATE OWNER | **מתיישב** — אבל בעל תחום הפוסטים הוא שורת קודקס, לא חוק (ממצא #3). |
| 3. חוזי חוויה (תצוגה, עיצוב, ניווט, נגישות) | שלב 4 PROJECTION OWNERS: `experience_governance_foundation_v1_law`, `canonical_ui_components_law`, `mobile_acceptance_law`, `DESIGN_CONTRACT_V2`, `docs/sod1820-system-frame-contract-v1.md` | **מתיישב.** חסרה בהצעה שכבה 3 הקיימת (CONFIG/DATA — רשומות מצב כמו `site_flags`, שאינן חוקים). |
| 4. החלטות ואישורים (יומן ומסמכי החלטה) | **אין שכבת סמכות.** החלטה נקלטת בארטיפקט קנוני; `work_log` = פרובננס; Doc37 = רישום מתוארך של החלטות מוצר; `decision_ledger` (1,028 שורות, 969 מהן `research_graph_attach`) = החלטות נתונים | **לא להוסיף כשכבה.** להתייחס אליה כ״כלל קדימות + חובת הטמעה״ (ראו §5/O3–O4). הוספת שכבה תפר את `inter_agent_coordination_law` (36). |
| 5. מימוש (קוד, בדיקות, פריסה) | שלב 5 IMPLEMENTATION CONSUMERS; CLAUDE.md: DOCUMENTED ≠ IMPLEMENTED ≠ … ≠ VERIFIED | **מתיישב** כראיה, לא כסמכות. |

**מסקנה:** אין צורך בהיררכיה חדשה. נדרש (א) ליישר את הבעלים המוצהרים לשרשרת הקיימת, (ב) להכריע בקדימות בין שלושת כללי ״ההחלטה המאוחרת״, (ג) לסגור את פערי ההטמעה.

### 2.3 מפת הבעלים (23 בעלי־בית פעילים) ומקורות שאינם חוקי DB

```
META  : project_codex._index  +  SOD1820_MASTER_OWNER_INDEX.md   (נתבים בלבד)
FOUNDATION / GOVERNANCE (OWNER)
  reality_graph_law · truth_axes_foundation_law · person_foundation_contract_law
  research_intake_foundation_contract_law · foundation_closure_protocol_law
  inter_agent_coordination_law · live_state_sync_law · work_log_authority_law · deploy_on_request
DOMAIN OWNER
  research_strategy_layer_law · research_workspace_law (+ docs/research-studio-v1-contract.md)
  research_gold_hints_law · canonical_methods_registry_law · engine_governance_registry_authority_law
  els_research_layer_law · subscription_funnel_law · traffic_intelligence_law · system_suggestions_law
  platform_tiers_law · raziel_companion_layer_law · content_translation_law · site_flags_lock_law
  [בעלי תחום שהם שורות קודקס]  project_codex.publishing_conventions · .gematria_engine · .numeric_rule_family_index
PROJECTION OWNER
  experience_governance_foundation_v1_law → canonical_ui_components_law · mobile_acceptance_law
  SOD1820_DESIGN_CONTRACT_V2.md  (ולא V1 — ראו ממצא #2)  · docs/sod1820-system-frame-contract-v1.md
```

---

## 3. טבלת 87 החוקים הפעילים

**מקרא עמודות:** תפקיד — **O** בעל־בית (OWNER) / **c→X** ילד של X (לפי `compaction_v1.canonical_owner`) · תלות — מספר פריטי `depends_on` (״0״ בילד = תלות מוצהרת דרך `owner_routing` בלבד) · סטטוס — ״תקין״ = אין אף סימון.
**סימוני סטטוס:** `D#` # קשתות `depends_on` ליעד לא־פעיל · `G` חסרות שורות של גרסאות קודמות ב־`nodes` · `L` תווית≠מספר גרסה · `R` מסומן `LEGACY_COMPAT_RETIRE_WHEN_REPLACED` · `M` הבעלים הוא מסמך (md/קודקס) ולא חוק פעיל · `C` בלולאת תלות הדדית (A↔B) · `X` `owner_routing`≠`compaction_v1` · `S` שרשרת `supersedes_version` שבורה · `I` תוקן במקום (v1 מתאר תיקון של v1) · `T` סתירה בין תווית לגוף · `P` דחוי להחלטת מוצר · `H` סעיפים בגוף החוק הפעיל שמצהירים עובדה שהפכה שגויה · `W` עותק הקודקס של החוק מכיל סעיפי החלטה מאוחרים מהגרסה הפעילה (**נבדק בתוכן**) · `w` עותק הקודקס עודכן אחרי הגרסה הפעילה (`updated_at` בלבד, **תוכן לא נבדק**) · **`K`** סתירה מוכחת מול CLAUDE.md.

| # | חוק (`rule_id`) | v | תחום | תפקיד / בעלים | תלות | סטטוס |
|---|---|---|---|---|---|---|
| 1 | platform_tiers_law | 5 | access_product | O | 3 | C |
| 2 | unified_credit_system | 1 | access_product | c→platform_tiers_law | 0 | P |
| 3 | inter_agent_coordination_law | 17 | agent_governance | O | 1 | **K** (סעיף 82) · **H** (סעיפים 75–80) · L (תווית ״v16״) |
| 4 | brand_spelling_law | 1 | brand_design | c→DESIGN_CONTRACT_**V1**.md | 0 | M · בעלים היסטורי (ממצא #2) |
| 5 | canonical_colors_law | 2 | brand_design | c→DESIGN_CONTRACT_**V1**.md | 0 | M · בעלים היסטורי |
| 6 | logo_integrity_law | 3 | brand_design | c→DESIGN_CONTRACT_**V1**.md | 3 | M · בעלים היסטורי |
| 7 | sod1820_canonical_identity_law | 5 | brand_design | c→DESIGN_CONTRACT_**V1**.md | 5 | D1(md) M C · בעלים היסטורי |
| 8 | worlds_color_law | 1 | brand_design | c→DESIGN_CONTRACT_**V1**.md | 0 | M · בעלים היסטורי |
| 9 | els_research_layer_law | 9 | els_cipher | O | 5 | תקין |
| 10 | els_seed_expansion_law | 1 | els_cipher | c→els_research_layer_law | 0 | תקין |
| 11 | els_single_engine_law | 2 | els_cipher | c→els_research_layer_law | 1 | תקין |
| 12 | testimony_not_prophecy | 1 | els_cipher | c→els_research_layer_law | 0 | תקין |
| 13 | experience_governance_foundation_v1_law | 10 | experience_ui | O | 7 | C |
| 14 | canonical_ui_components_law | 12 | experience_ui | c→experience_governance | 4 | תקין |
| 15 | mobile_acceptance_law | 1 | experience_ui | c→experience_governance | 0 | תקין |
| 16 | foundation_closure_protocol_law | 7 | foundation_governance | O | 0 | תקין |
| 17 | canonical_methods_registry_law | 6 | gematria | O | 0 | G |
| 18 | engine_governance_registry_authority_law | 1 | gematria | O | 5 | D2 |
| 19 | gematria_auto_registry_law | 2 | gematria | c→codex:gematria_engine | 4 | D1 G M |
| 20 | gematria_db_first_and_enrich_law | 3 | gematria | c→codex:gematria_engine | 0 | M |
| 21 | gematria_engine_law | 2 | gematria | c→codex:gematria_engine | 4 | M w |
| 22 | method_lifecycle | 2 | gematria | c→canonical_methods_registry_law | 0 | תקין |
| 23 | method_priority | 1 | gematria | c→codex:gematria_engine | 0 | M |
| 24 | no_kolel_no_additions | 1 | gematria | c→codex:gematria_engine | 0 | M |
| 25 | **deploy_on_request** | 3 | live_release_governance | O | 0 | **K** · L (תווית ״v2״) |
| 26 | live_state_sync_law | 1 | live_release_governance | O | 0 | תקין |
| 27 | work_log_authority_law | 2 | live_release_governance | O | 0 | S |
| 28 | live_state_resolution_law | 3 | live_release_governance | c→live_state_sync_law | 0 | תקין (ילד מאוחר וחזק יותר מההורה — חפיפה, §5/O9) |
| 29 | content_translation_law | 4 | localization | O | 3 | C |
| 30 | video_transcription_law | 1 | localization | c→content_translation_law | 1 | תקין |
| 31 | big_number | 1 | numeric_research | c→codex:numeric_rule_family_index | 1 | D1 M |
| 32 | decimal_point_join_law | 1 | numeric_research | c→codex:numeric_rule_family_index | 2 | M |
| 33 | moment_clock_law | 2 | numeric_research | c→codex:numeric_rule_family_index | 6 | M |
| 34 | no_row_without_number_law | 1 | numeric_research | c→codex:numeric_rule_family_index | 0 | R M |
| 35 | number_page_law | 1 | numeric_research | c→codex:numeric_rule_family_index | 0 | R M |
| 36 | root_exception | 1 | numeric_research | c→codex:numeric_rule_family_index | 1 | M |
| 37 | shitat_haechad_alef_law | 1 | numeric_research | c→codex:numeric_rule_family_index | 2 | D1 M |
| 38 | zero_navigation | 1 | numeric_research | c→codex:numeric_rule_family_index | 0 | M |
| 39 | zero_scale_law | 1 | numeric_research | c→codex:numeric_rule_family_index | 0 | M |
| 40 | person_foundation_contract_law | 6 | person_identity | O | 3 | G C w |
| 41 | identity_architecture_law | 1 | person_identity | c→person_foundation_contract_law | 0 | תקין |
| 42 | auto_share_uses_live_post_law | 1 | publishing_content | c→codex:publishing_conventions | 0 | M |
| 43 | legacy_content_protocol | 2 | publishing_content | c→codex:publishing_conventions | 1 | R M (נועץ `research_intake…@13`) |
| 44 | post_og_image_law | 1 | publishing_content | c→codex:publishing_conventions | 0 | M |
| 45 | post_system_voice_law | 1 | publishing_content | c→codex:publishing_conventions | 0 | M I |
| 46 | preserve_linked_row | 1 | publishing_content | c→codex:publishing_conventions | 0 | R M |
| 47 | raziel_companion_layer_law | 3 | raziel_ai | O | 2 | C |
| 48 | bot_delivery_law | 1 | raziel_ai | c→raziel_companion_layer_law | 0 | תקין |
| 49 | raziel_full_answer_and_route_law | 3 | raziel_ai | c→raziel_companion_layer_law | 5 | D2 G |
| 50 | raziel_group_privacy_law | 1 | raziel_ai | c→raziel_companion_layer_law | 0 | תקין |
| 51 | raziel_response_contract | 1 | raziel_ai | c→raziel_companion_layer_law | 0 | תקין |
| 52 | raziel_routing_law | 2 | raziel_ai | c→raziel_companion_layer_law | 7 | D1 C |
| 53 | raziel_voice_law | 1 | raziel_ai | c→raziel_companion_layer_law | 0 | תקין |
| 54 | raziel_whatsapp_access_adapter_law | 1 | raziel_ai | c→raziel_companion_layer_law | 1 | תקין |
| 55 | reality_graph_law | 8 | reality_graph | O | 0 | G W (ממצא #4; `depends_on` ריק אף שהטקסט מצהיר על 5+ תלויות) |
| 56 | convergence_blocklist_law | 1 | reality_graph | c→reality_graph_law | 0 | תקין |
| 57 | cross_vs_convergence_criteria | 4 | reality_graph | c→reality_graph_law | 6 | D3 G |
| 58 | master_anchor_1820_law | 1 | reality_graph | c→reality_graph_law | 0 | תקין |
| 59 | reality_stream_law | 1 | reality_graph | c→reality_graph_law | 0 | תקין |
| 60 | research_gold_hints_law | 4 | reality_world_ranking | O | 9 | D1 C |
| 61 | ktiv_male_haser_repair_law | 2 | representation_taxonomy | c→research_intake_foundation_contract_law | 0 | תקין |
| 62 | unified_tags_law | 1 | representation_taxonomy | c→research_intake_foundation_contract_law | 0 | R (ראו §5/O7 ו־§6.2) |
| 63 | research_intake_foundation_contract_law | 13 | research_intake | O | 2 | G C w |
| 64 | corpus_admission_foundation_v1 | 1 | research_intake | c→research_intake… | 0 | תקין |
| 65 | raw_vs_curated | 1 | research_intake | c→research_intake… | 0 | תקין |
| 66 | shared_expression_extraction_contract_v1 | 1 | research_intake | c→research_intake… | 0 | תקין |
| 67 | source_video_publish_law | 1 | research_intake | c→research_intake… | 0 | תקין |
| 68 | word_approval_required_law | 1 | research_intake | c→research_intake… | 0 | R |
| 69 | writer_material_home_law | 6 | research_intake | c→research_intake… | 4 | D1 |
| 70 | research_strategy_layer_law | 17 | research_os | O | 5 | C |
| 71 | research_workspace_law | 5 | research_os | O (compaction) / `docs/research-studio-v1-contract.md` (routing) | 3 | M C X |
| 72 | research_object_identity_invariant_law | 2 | research_os | c→docs/research-studio-v1-contract.md | 3 | D2 M |
| 73 | workspace_layout_standard | 2 | research_os | c→research_workspace_law | 1 | תקין |
| 74 | cross_reference_is_not_disclosure | 1 | security_privacy | c→person_foundation_contract_law | 0 | תקין |
| 75 | graph_privacy_foundation_law | 1 | security_privacy | c→person_foundation_contract_law | 0 | תקין |
| 76 | zuriel_surname_privacy_law | 1 | security_privacy | c→person_foundation_contract_law | 0 | תקין |
| 77 | site_flags_lock_law | 3 | site_availability | O | 1 | תקין |
| 78 | subscription_funnel_law | 22 | subscription_follow | O | 0 | G |
| 79 | system_suggestions_law | 5 | system_intelligence | O | 6 | C |
| 80 | ai_analyze_contract | 2 | system_intelligence | c→system_suggestions_law | 2 | D2 |
| 81 | israel_time_law | 1 | time_context | c→truth_axes_foundation_law | 0 | תקין |
| 82 | relative_time_display_law | 4 | time_context | c→truth_axes_foundation_law | 0 | תקין |
| 83 | traffic_intelligence_law | 11 | traffic_analytics | O | 0 | G |
| 84 | truth_axes_foundation_law | 3 | truth_governance | O | 7 | D2 C |
| 85 | golden_entity_law | 4 | truth_governance | c→truth_axes_foundation_law | 3 | תקין |
| 86 | signal_vs_curation | 2 | truth_governance | c→truth_axes_foundation_law | 0 | G |
| 87 | verify_seal_manual_only | 3 | truth_governance | c→truth_axes_foundation_law | 0 | G T |

**סיכום הסימונים:** 34 חוקים ללא כל סימון SQL (33 אחרי `P` ידני) · `D` 13 חוקים / 20 קשתות · `G` 11 · `M` 26 (19 על שורות קודקס, 7 על קובצי md) · `C` 13 חוקים ב־9 זוגות הדדיים · `R` 6 · `L` 2 · `X` 1 · `S` 1 · `K` 1 · `W` 1 · `w` 3 · `I` 1 · `T` 1 · `P` 1.

---

## 4. סתירות מוכחות

**כלל ההכללה:** רק ממצא שיש לו ציטוט/שאילתה משני הצדדים. הפניות: `DB:` = טבלת `nodes`/`project_codex` במסד הקנוני (מספר שורה = שורה בגוף הרשומה, כפי שפוצל לפי `\n`); `repo:` = קובץ ב־`origin/main` `6deeb100…`.
**המלצה** — אחת מארבע: **להשאיר** · **להרחיב** (גרסה/תיקון באישור) · **לסמן כהיסטורי** · **הכרעת צוריאל**. אף אחת מהן אינה מבוצעת כאן.

### 4.1 טבלת הסתירות

| # | סתירה | צד א׳ (ציטוט והפניה) | צד ב׳ (ציטוט והפניה) | חומרה | המלצה |
|---|---|---|---|---|---|
| **C1** | **הרשאת שחרור: עומדת מול לכל־קומיט** | `DB: deploy_on_request v3` §1: ״A separate “תעלה” / “העלה” message is no longer required for such releases״; §2: ״should merge/apply/deploy … without asking ZURIEL for an extra confirmation״; §8: ״‘תעלה’ remains an override/expedite command, not a required token״. `DB: inter_agent_coordination_law v17` (82): ״the Primary Owner proceeds through merge/migration/deploy/live verification without a second user prompt״. | `repo: CLAUDE.md:11` (כלל 7): ״כל שינוי בפרודקשן דורש אישור מפורש של ZURIEL לקומיט ולפריסה מדויקים: merge ל־main, פרסום…״; `:41–47` (§0.4): ״אישור שנצרך… ואישור מסשן אחר אינם מתחדשים; אישור אינו מורחב לפעולה אחרת״; `:242–250` (§12): ״Do not merge/deploy/push main merely because work is implemented. Release only after explicit ZURIEL authorization (such as תעלה) for the exact commit״; `:64` מצטט את `deploy_on_request` כמקור לאישור מפורש. `repo: SOD1820_MASTER_OWNER_INDEX.md:60`: ״Release authorization → deploy_on_request v3 ACTIVE״. `repo: SOD1820_MASTER_ROADMAP.md:176` מכנה את ההרשאה העומדת ״Historical release-semantics pointer (superseded for current coordination…)״ אך אינו מציין באיזו החלטה ובאיזה בעלים היא בוטלה — והחוקים ב־DB לא עודכנו (OI:36: סמכות חוק = `nodes.is_active`). | **קריטית** (בטיחות Production) | **הוכרע ב־10.11 (שיחה):** אישור מפורש לכל מיזוג ולכל פריסה; אין הרשאה עומדת. נותר ליישם בחוקים (§10.7, ב׳). עד היישום — לפי `CLAUDE.md` §0.1(6): הכלל המגביל. אחרי ההכרעה: גרסה v4 ל־`deploy_on_request` שמציינת במפורש מה בוטל/נשאר. |
| **C2** | **בעל חוזה העיצוב: V1 מול V2** | `DB: nodes` — 5 חוקים (`brand_spelling_law`, `canonical_colors_law`, `logo_integrity_law`, `sod1820_canonical_identity_law`, `worlds_color_law`): `metadata.owner_routing.canonical_owner` = `metadata.compaction_v1.canonical_owner` = `SOD1820_DESIGN_CONTRACT_V1.md`; `sod1820_canonical_identity_law.depends_on` ∋ `SOD1820_DESIGN_CONTRACT_V1.md`; `DB: project_codex._index` (Routing Map): ״Public product language/visual language/typography/icons → SOD1820_DESIGN_CONTRACT_V1.md״. | `repo: SOD1820_DESIGN_CONTRACT_V1.md:3`: ״2029 STATUS: SUPERSEDED by SOD1820_DESIGN_CONTRACT_V2.md… do not route new 2029 UI work here״; `repo: SOD1820_MASTER_OWNER_INDEX.md:196`: ״SOD1820_DESIGN_CONTRACT_V2.md — 2029 ACTIVE; V1 = preserved Legacy provenance״; `DB: experience_governance_foundation_v1_law v10` שורה 133: ״V2 (active 2029 web visual contract; V1 remains historical…)״; `DB: inter_agent_coordination_law v17` (89). בנוסף `repo: SOD1820_DESIGN_CONTRACT_V2.md:5` מצהיר בעלות ״experience_governance_foundation_v1_law v9״ (כיום v10). | גבוהה | **הכרעת צוריאל** ואז **לסמן כהיסטורי** את מצביע הבעלים ל־V1 (גרסה חדשה של 5 החוקים + תיקון `_index`). **אזהרה:** אי אפשר להעביר את V1 להיסטורי בלי לטפל קודם ב־Naming / product language law — הוא קיים רק ב־`V1:92–100`, ל־V2 אין סעיף מקביל (`V2:337` הוא רק Global Rail), ו־`docs/sod1820-system-frame-contract-v2-addendum.md:22` מפנה אליו כבעלים. עוד 5 מסמכים מצהירים על V1 כבעל חזותי: `els-matrix-projection-contract-v1.md:4`, `g3-gematria-presentation-contract-v1.md:8`, `w0-5-visual-foundation-2027-v1.md:11`, `g3-2029-cutover-acceptance-checklist.md:51`, `experience-capability-color-note.md:5` (נאסף בידי סוכן הקריאה; ציטוט הסעיף ב־V1 והחסר ב־V2 אומתו על ידי). |
| **C3** | **`post_update_on_top`: חל / היסטורי** | `DB: project_codex.publishing_conventions` שורה 21: ״עדכון על אירוע חדש הוא סוג תוכן אחר: post_update_on_top ממשיך לחול עליו״. | אותו מסמך, שורה 110: ״The historical ‘update-on-top’ layout is a legacy presentation choice, not a Foundation invariant. Current temporal/provenance owners govern identity/history; Experience governs layout״. בנוסף: החוק עצמו (`nodes`, `post_update_on_top` v1) **לא פעיל** (`LEGACY_RETIRE_OR_SUPERSEDE`, בעלים = אותה שורת קודקס), כלומר החוק ״ממשיך לחול״ אף שאין לו גרסה פעילה. `DB: project_codex.reality_graph_law` שורות 300–316 (30.10): ״יחידה חדשה או שינוי תוכן משמעותי מקבלים זהות אירוע/גרסה… modified כללי… אינם מספיקים להמצאת תוספת משמעותית״. וגם `repo: SOD1820_DESIGN_CONTRACT_V2.md` §8.1 (Human Gate 12.10.2026, שורות 181–189): ״An update is visible as ‘new’ only when the canonical source/segment identity, meaningful change and allowed revision/version are supported… posts.modified alone… never certifies which unit changed… Do not append updated units mechanically to the bottom of the source״ (מועדף: ״one slim actionable anchored update strip״ בראש המקור). | בינונית־גבוהה (נוגעת ישירות להחלטה ״אירוע חדש בראש הפוסט״) | **הכרעת צוריאל** איזו מהקביעות גוברת, ואז הרחבת השורה (לא יצירת חוזה חדש). הנטייה העולה מהמקורות: שורה 110 + V2 §8.1 + קודקס 30.10 (ארבעה מקורות מאוחרים יותר) מול שורה 21 בודדת. |
| **C4** | **`verify_seal_manual_only`: תווית מול גוף** | `DB: nodes` `verify_seal_manual_only` v3, כותרת: ״חותם אימות — רק ידני, לעולם לא אוטומטי״ ושם ה־`rule_id`. | אותו חוק, גוף: ״תיקון עיקרון מהותי: החותם נקבע על ידי חישוב מתמטי אוטומטי — לא החלטה אנושית… החישוב/האימות המתמטי = אוטומטי… הבחירה מה להבליט… = ידנית״. | בינונית (בלבול סוכנים בהבחנה ״חישוב מאומת״) | **להרחיב** — גרסה v4 עם תווית ו־`rule_id` מתואמים (שם ה־`rule_id` נשמר כמפתח; התווית מתוקנת), באישור. |
| **C5** | **״הייצור הנוכחי = Legacy״ בחוק פעיל** | `DB: inter_agent_coordination_law v17` (75): ״Until ZURIEL explicitly declares cutover, the currently deployed legacy site remains the operational production surface״; (79); (80): ״CURRENT PRODUCTION = legacy/transitional until explicit cutover… Confusing those two states is an entry-routing failure and must be reported as DRIFT״. אין סעיף מאוחר בחוק שמציין שהמעבר בוצע. | `repo: CLAUDE.md:5–10`: Legacy retired (5.11.2026), ״אין ריצת Legacy… כתובת שאינה מוכרת מסתיימת ב־404 של 2029״; Doc37 §12.45: ״LIVE: מעבר 2029 ל־Production בוצע באישור ZURIEL (4.11.2026)״. | גבוהה (מבחן קבלת סוכן־טרי של החוק עצמו נכשל בעובדה הנוכחית) | **לסמן כהיסטורי** את סעיפים 75–80 בגרסה חדשה (`H`). |
| **C6** | **תלויות שבורות + נתב שמצביע על חוק פרוש** | `DB: nodes` — 20 קשתות `depends_on` ב־13 חוקים פעילים: ליעדים לא־פעילים `unified_graph_law`(×4), `everything_additive_law`(×3), `never_silent_metatron_law`(×2), `ai_quota_law`(×2), `research_two_pass_law`, `featured_cross_insight_law`, `convergence_single_trigger`, `gematria_methods_catalog`, `convergence_explanation_law`, `messiah_frequency_in_every_person_law`, `research_contribution_law`, `essence_appendix`; ובנוסף `sod1820_canonical_identity_law` → קובץ md. `DB: project_codex._index` מנתב ל־`unified_graph_law` ול־`subscribe_gate_law`. | אותם יעדים: `is_active=false`, מיפוי `compaction_v1` = `LEGACY_RETIRE_OR_SUPERSEDE` עם בעלים (למשל `unified_graph_law` → `reality_graph_law`; `ai_quota_law` → `platform_tiers_law`; `everything_additive_law`, `essence_appendix` → `foundation_closure_protocol_law`). הטריגר `trg_rule_compaction_integrity_guard_v1` אינו בודק יעדי `depends_on`. | בינונית | **להרחיב** — עדכון `depends_on` לבעלים שנקבעו ב־`compaction_v1` (גרסאות חדשות) + תיקון `_index`; הצעה בלבד, באישור. הערה: המיפוי `essence_appendix → foundation_closure_protocol_law` נראה לא טבעי (חוק מספרים → פרוטוקול סגירה) — **הכרעת צוריאל** על הבעלים האמיתי. |
| **C7** | **היסטוריית גרסאות נדרסה / חסרה** | `DB: project_codex._index`: ״nodes where type='rule' … מנוהלי־גרסאות, לא נמחקים״; כלל Everything-Additive. | 11 חוקים פעילים שחסרות להם שורות גרסה ב־`nodes` (גרסאות חסרות בסוגריים): `canonical_methods_registry_law` (v3) · `cross_vs_convergence_criteria` (v1–2) · `gematria_auto_registry_law` (v1) · `person_foundation_contract_law` (v1) · `raziel_full_answer_and_route_law` (v1) · `reality_graph_law` (v1) · `research_intake_foundation_contract_law` (v1–7) · `signal_vs_curation` (v1) · `subscription_funnel_law` (v1–15) · `traffic_intelligence_law` (v1–3) · `verify_seal_manual_only` (v1–2); `work_log_authority_law` v2: `supersedes_version=NULL` ו־v1 קיימת; `post_system_voice_law` v1 מצהיר ״גרסה 1 של החוק ניסחה את ההפך… זו הגרסה הנכונה״ בעוד שרק v1 קיימת — כלומר תוקן במקום. | בינונית (שחזור/אחריות) | **להשאיר** + **הכרעת צוריאל** אם לשחזר מ־git/גיבוי (`project_codex_backup_20260820`, `_post_backup_*`). לא לייצר שורות היסטוריה מומצאות. מקור השחזור לא נבדק כאן. |
| **C8** | **שני בעלים ל־`research_workspace_law`** | `DB:` `owner_routing.canonical_owner` = `docs/research-studio-v1-contract.md` (resolution `EXTEND_EXISTING`); `project_codex._index`: ״Research OS / Context / Finding / Journey / Workspace composition → docs/research-studio-v1-contract.md + …״. | אותו חוק, `compaction_v1`: `classification=OWNER`, `canonical_owner=research_workspace_law` (עצמו). `research_object_identity_invariant_law` הוא ילד של ה־md; `workspace_layout_standard` ילד של החוק. | בינונית | **הכרעת צוריאל** (md כמפרט יישום של החוק, או להפך), ואז יישור שני השדות. |
| **C9** | **תוויות גרסה שגויות** | `DB: inter_agent_coordination_law` `rule_version=17`; `deploy_on_request` `rule_version=3`. | כותרות: ״Inter-Agent Coordination **v16**…״; ״Auto Release **v2**…״. `CLAUDE.md` מצטט ״v17״ נכון. | נמוכה | **להרחיב** בגרסה הבאה של כל חוק (לא גרסה נפרדת). |
| **C10** | **נעיצות גרסה מיושנות במסמכי הסמכות** | `DB: Doc37 (codex id 37)` E5: ״subscription_funnel_law v19״; `repo: DESIGN_CONTRACT_V2.md:5`: ״experience_governance… v9״; `DB: _index`: ״FOLLOW COMPLETION ROUTER… v18״. | חיים: `subscription_funnel_law` **v22**, `experience_governance_foundation_v1_law` **v10**. `inter_agent_coordination_law` (53) FRESHNESS GATE: ״Profile names never pin stale versions״. | נמוכה | **להשאיר** (Doc37 הוא רישום מתוארך; הנעיצה היא צילום ולא סמכות) — לסמן ב־Doc37 ״צילום בתאריך״ בעת העדכון הבא. |
| **C11** | **חברות בסדרות: החלטות PLAN37 מול טיוטת PR #1296** | `DB: Doc37` שורה 1005: ״DEC-SERIES-003 \| APPROVED \| … 5003/5004 יוצאים ממימד חמש ומשויכים לצופן בסרטים ולמפרסם המערכת״; שורה 1103: ״DEC-SERIES-003 נשאר בתוקף: 5003/5004 … מחוץ למימד חמש. הסבב אינו חוזר לאישור החפיפה הישן״; שורה 1007: ״DEC-SERIES-005 \| APPROVED \| אלון לוי הוא כתב; מה קורה הבורא היא סדרה שלו… יתר חומריו לא מצורף אוטומטית״; `repo: SOD1820_CONTENT_FOUNDATION_CONTRACT.md:225` ו־`:242` ״אין ליצור שיוך־סדרה אוטומטי״ / ״DEC-SERIES-003 (APPROVED): 5003/5004 יוצאים ממימד חמש…״. | `repo` (PR #1296, `docs/2029-post-connections-contract-20261110.md` שורות 15–19, ״owner approved 2026-11-10״): ״מה קורה הבורא: all public posts with verified author exactly אלון לוי; tag not required״; ״post 5003 … and 5004: dual membership מימד חמש and the site's **צופן בתרבות** collection/category״. הקוד בטיוטה (`contentSeries2029Identity.js`, `contentSeriesKeysForPost`) מקודד זאת כחריגי id/מחבר. **אימות:** ״צופן בתרבות״ — 0 פוסטים (categories/tags) ו־0 אזכורים ביומן; ״הצופן בסרטים״ — 2. אין רשומה של אישור 10.11 ב־Doc37, ב־`work_log` או ב־`decision_ledger`. | **גבוהה** (חברות בסדרה מזינה Home/Follow/ספירות) | **הכרעת צוריאל**: לאשר/לדחות את החלטות 10.11; אם אושרו — לרשום ב־PLAN37 (הבעלים לפי CFC:93–97) החלטה שמחליפה במפורש את DEC-SERIES-003/005 ולעדכן את טבלת CFC §12, ורק אחר כך לממש. עד אז: PR #1296 נשאר טיוטה (לפי כלל הקדימות של Doc37, הוראה ישירה מאוחרת גוברת — אך היא אינה מתועדת בשום בעל קנוני; `CLAUDE.md` §0.1(6): עוצרים ומדווחים). |
| **C12** | **שני בעלים שקיימים יחד לסמנטיקת מצב: ״SSOT״ מול ״documented state״** | `repo: CLAUDE.md:163` ו־OI:250: Master State = ״documented state״ / ״Master pointer/status״ (לא SSOT). | `repo: docs/MASTER_STATE_STRATEGIC_ADDENDA.md:8`: ״SOD1820_MASTER_STATE.md remains the SSOT and governance authority״ (ו־`docs/w0-2027-master-state-supersession-delta-v1.md:10`: ״documented-state authority״). | נמוכה־בינונית | **להרחיב** — יישור המילה בנספח (מסמך ב־`docs/`, ללא נגיעה בבעלים). |
| **C13** | **באנרים מיושנים בקבצי הסמכות** | `repo: SOD1820_CONTENT_FOUNDATION_CONTRACT.md` שורות 5, 9, 183: ״ענף־בלבד · לא־מוזג · לא־פרוס״; `docs/sod1820-system-frame-contract-v2-addendum.md:4`: ״BRANCH ONLY UNTIL MERGED״; OI:6: ״Date: 2026-10-01״. | שלושת הקבצים נמצאים ב־`origin/main` `6deeb100…`; OI מכיל נספחי 31.10 והיום (שורה 183). | נמוכה | **להרחיב** (עדכון באנר בלבד, ב־PR נפרד באישור). |
| **C14** | **הפניות לבעל שאינו קיים / ארכיון** | `repo: docs/research-studio-v1-contract.md:10`: ״MASTER_STATE §20 — Gate #18…״ (ב־Master State v3 אין התאמה); `:11`: `convergence_one_per_value` ״(locked nodes type='rule')״. | `repo: OI:120`: ״Old Convergence layout/trigger/one-per-value/single-anchor/display laws are Archive after v4/v7 consolidation״; `DB:` `convergence_one_per_value` — `is_active=false`. | נמוכה־בינונית (המסמך הוא ״baseline lineage״ של Research OS) | **לסמן כהיסטורי** את ההפניות (הערה במסמך), באישור. |

### 4.2 עובדות מבניות נוספות (מוכחות, אינן סתירה בין טקסטים)

* **9 זוגות תלות הדדית** (A↔B) בין חוקים פעילים: `content_translation_law`↔`experience_governance_foundation_v1_law` · `content_translation_law`↔`truth_axes_foundation_law` · `experience_governance_foundation_v1_law`↔`research_gold_hints_law` · `experience_governance_foundation_v1_law`↔`sod1820_canonical_identity_law` · `person_foundation_contract_law`↔`truth_axes_foundation_law` · `platform_tiers_law`↔`raziel_companion_layer_law` · `raziel_routing_law`↔`system_suggestions_law` · `research_intake_foundation_contract_law`↔`truth_axes_foundation_law` · `research_strategy_layer_law`↔`research_workspace_law`. בגרף כולו נמצאו מסלולים מעגליים (219 מסלולים בעומק עד 12) המערבים 16 חוקים.
* **18 שורות `type='rule'` בלי `rule_id`** — כולן לא־פעילות, ״הגדרות יסודיות״ מ־6/2026 עם `superseded_by`; נקיות להשארה כהיסטוריה.
* **184 `rule_id` ללא גרסה פעילה**: 165 ממופים ל־`LEGACY_RETIRE_OR_SUPERSEDE` + בעלים; **19 בלי מיפוי** — ביניהם חוקי עיצוב ופוסט: `post_theme_safe_colors_law`, `dual_theme_every_element_law`, `light_mode_background_law`, `atlas_dual_theme_law`, `city_background_dual_theme_law`, `light_calculator_dark_temple`, `ai_box_theme_aware`, `admin_command_theme_law`, `number_click_hint_law`, `corpus_admission_lifecycle_law`, `verified_value_is_system_data`, `method_hierarchy_ragil_foundation`, `method_alias_meshulash_kadmi`, `kadmi_def`, `meshulash_kadmi_law`, `anagram_not_novel`, `metatron_brain_persona_lens_law`, `agent_onboarding_law`, `agent_research_team_law`. לא ניתן להוכיח אובדן משמעות; כן ניתן להוכיח שאין רישום ליורש.

### 4.3 בדיקת `depends_on` — האם משקף את התלות האמיתית? (50 הפעילים ללא תלות)

אין לראות בחוסר ב־`depends_on` סתירה. מה שהוכח:

| קבוצה | מספר | פרשנות |
|---|---|---|
| ללא `depends_on` ובעל־בית (O) | 8 | שורשים: `foundation_closure_protocol_law`, `canonical_methods_registry_law`, `reality_graph_law`, `deploy_on_request`, `live_state_sync_law`, `work_log_authority_law`, `subscription_funnel_law`, `traffic_intelligence_law`. תקין כשורש — אך `reality_graph_law` מצהיר בטקסט (קודקס, 30.10) ״consumes Research Intake, research_object_identity_invariant_law v2, research_workspace_law, research_strategy_layer_law v17, research_gold_hints_law v4, Publishing, Truth/Access״ ו־`depends_on` ריק: **תלות תחתונה לא מוצהרת** (פער תיעוד, לא סתירה). |
| ללא `depends_on` ובן (c) | 42 | התלות בבעלים מוצהרת דרך `owner_routing`/`compaction_v1.canonical_owner` — **מנגנון חלופי מלא**, לא פגם. |
| בן עם `depends_on` שלא כולל את הבעלים | 13 | המנגנון הכפול אינו עקבי: חלק מהילדים מצהירים בעלים בשני מקומות, חלק רק באחד. |
| בן עם `depends_on` שכולל את הבעלים | 9 | עקבי. |

**מסקנה:** נשא התלות ההיררכית בפועל הוא `owner_routing`/`compaction_v1`; `depends_on` משמש לתלות אופקית. אין לתקן את ה־50 אוטומטית. המלצה: **להשאיר** + להגדיר בחוק קיים (`foundation_closure_protocol_law` או `experience_governance…` ״Law Lifecycle״) איזה מהשניים הוא הנשא — **הכרעת צוריאל**.

---

## 5. חפיפות שאינן בהכרח סתירות

| # | חפיפה | עדות | הערכה | המלצה |
|---|---|---|---|---|
| **O1** | **קודקס כבעלים ״חוקי״** | 19 חוקים פעילים הם ילדים של `project_codex.publishing_conventions` (5) / `.gematria_engine` (5) / `.numeric_rule_family_index` (9). `_index` פותח ב־״[הקודקס] אינו bootstrap חובה, אינו Owner Index ואינו מקור־אמת מקביל״; לעומת זאת Canonical Ownership Matrix (`experience_governance…` שורה 3): ״Long-form Contract = project_codex (live once INSERTed)״. | שתי הקביעות אינן סותרות בהכרח (״לא מקביל״ ≠ ״לא בעלים״), אך השורה היא טקסט יחיד **בלי גרסאות ובלי טריגר שמירה** (`trg_rule_compaction_integrity_guard_v1` רק על `nodes`); `publishing_conventions` עודכנה 10.11 11:13 ללא רשומת בעלות ביומן (ראו §6.1). | **הכרעת צוריאל**: האם בעלים־קודקס מחייבים גרסאות (למשל snapshot בכל עדכון). עד אז — **להשאיר**. |
| **O2** | **תאומי חוק↔קודקס (11 זוגות)** | `reality_graph_law`, `person_foundation_contract_law`, `research_intake_foundation_contract_law`, `experience_governance_foundation_v1_law`, `gematria_engine_law`, `foundation_closure_protocol_law`, `traffic_intelligence_law`, `truth_axes_foundation_law`, `corpus_admission_foundation_v1`, `shared_expression_extraction_contract_v1`, `reality_stream_law`. בארבעה — `updated_at` של הקודקס מאוחר מתאריך הגרסה הפעילה: `reality_graph_law` (קודקס 31.10 מול חוק 15.9; **תוכן נבדק**: 7 סעיפים מתוארכים 23.9–31.10 (6 מסומנים Human-Gate) שאינם בחוק) · `person_foundation_contract_law` (25.9 מול 15.9) · `research_intake_foundation_contract_law` (24.9 מול 20.9) · `gematria_engine_law` (24.9 מול 14.9) — **בשלושת האחרונים התוכן לא נבדק**. | שני מקורות לאותו חוק־על; הלא־גרסתי חדש יותר. | **להרחיב** את גרסת החוק בהפניה/סיכום (ולא העתקה), באישור; לפני כן — **הכרעת צוריאל** מי מהשניים ״המקור״. |
| **O3** | **Doc37: ״DRAFT״ שנושא קדימות מחייבת** | `DB: project_codex id=37`: `category=planning_draft`, `priority=5`, גוף: ״מצב המסמך: **DRAFT**… אינה Master סמכות מתחרה״; ובאותו פתיח ״כלל קדימות מחייב״ (ראו §2.1). `publishing_conventions` (HOME-UPDATES-VISUAL-20261103) מפנה ל״החלטת צוריאל המאוחרת במסמך 37 מחליפה…״. `CLAUDE.md` §0.1(1) מכוון לקרוא את סעיפיו לפי תאריכם. `project_codex._index` (עודכן 17.9, לפני יצירת Doc37 ב־16.10) **אינו מזכיר אותו**. הוא עודכן 10.11 11:13. | מסמך שמוגדר טיוטה משמש בפועל כרישום החלטות מוצר; `decision_ledger` (1,028 שורות) משמש להחלטות נתונים בלבד (969 `research_graph_attach`; החלטת פרסום אחת). | **להרחיב** את `_index` (שורה אחת: ״Doc37 = רישום מתוארך של החלטות מוצר; כלל קדימות — פתיח Doc37; אינו מצב חי ואינו הרשאת שחרור״) — **הכרעת צוריאל** לפני כתיבה. לא ליצור שכבת החלטות חדשה. |
| **O4** | **שלושה כללי ״החלטה מאוחרת״** | (א) פתיח Doc37; (ב) `CLAUDE.md` §0.1(1)+(6); (ג) `PRECEDENCE CLARIFICATION` מקומי ב־`research_strategy_layer_law` v17 וב־`cross_vs_convergence_criteria` v4 §14. | משלימים אך אינם מתואמים: (א) מחליף לפי תאריך גם החלטה APPROVED; (ב) עוצר ומדווח, ופועל לפי המגביל; (ג) מקומי. מקרה בוחן: C1 — ההחלטה המאוחרת (CLAUDE.md, 5–7.11) מול החוק המוקדם (DB, 17.9) — כלל (א) ״מחליף״, כלל (ב) ״עוצר״, והחוק עצמו (`inter_agent_coordination_law` 58) קובע ש״החוק הפעיל גובר על adapter״. | **הכרעת צוריאל** על סדר בין (א)(ב)(58). |
| **O5** | **שלוש משמעויות ל״מאומת״** | (1) שדה פוסט `verified`/`ai_touched` — `publishing_conventions` שורה 8: ״מפעילים רק כשה־AI אימת ידיעה ממקור מפוקפק״; (2) חותם גימטריה — `verify_seal_manual_only`; (3) ״SYSTEM VERIFIED — deterministic engine/source verification״ — `publishing_conventions` שורה 142; (4) Truth Axes. בנתונים: מתוך 1,320 פוסטים רק 3 `verified=true` (2 ללא `verified_by`, כולם `verify_level='none'`: 5003, 5004). | `publishing_conventions` שורה 25 מפריד: ״חישוב מאומת ≠ פרשנות מאומתת; ai_touched ≠ verified״ — כלומר הכוונה קיימת; המימוש בשדות הפוסט דל. | **להרחיב** (הבהרת מילון בשורה קיימת) — הכרעת צוריאל אם `posts.verified` נשאר. |
| **O6** | **ציר ״נושא״ בשלושה שמות** | `publishing_conventions` שורה 14: Series ≠ Category (`posts.categories`) ≠ Medium ≠ Representation; `unified_tags_law`: משפחות ״מקור / נושא / מספר־אם״; Doc37 (שורה 1853) ״סדרה=מימד חמש, נושא=הצופן בסרטים״. בנתונים ״הצופן בסרטים״ הוא ערך ב־`categories` (לא ב־`tags`). | אותו ציר מכונה ״קטגוריה״ / ״נושא״ — לא סתירה, אך גורם לחוסר בהירות במימוש ובמדיניות תגיות (O7). | **להרחיב** (מילון נכון אחד ב־`publishing_conventions`). |
| **O7** | **סדרה = תגית; תגיות = טבלה** | `unified_tags_law` (פעיל, `R`): ״טבלת tags היא מקור האמת היחיד… junction tables… post_tags/gallery_tags עתידיים״; `publishing_conventions` שורה 14/318: סימון הסדרה הוא `posts.tags`. בפועל: **אין** טבלאות `post_tags`/`gallery_tags`/`series`; טבלת `tags` מכילה **25 שורות** מול **1,982** ערכי תגית ייחודיים ב־`posts.tags` (רק 12 מ־25 הרשומות מופיעות בפוסטים); טבלאות הצומת `word_tags` ו־`discovery_tags` — **0 שורות**; `posts.tags` מערך חופשי; 3 פוסטים נושאים תגיות מערכת `2029-*` ו־9 את ״טיוטה״; `מימד חמש` מופיע ב־45 פוסטים גם ב־`tags` וגם ב־`categories` ובשניים ב־`categories` בלבד. | החוק מצהיר על הגירה הדרגתית (״פריט־פריט״) — פער מימוש מתועד ולא סתירה. הסיכון: תגיות מערכת חוצות ל־SEO/דפי תגיות. | **הכרעת צוריאל** (ראו §6.2). |
| **O8** | **גימטריה: שלושה בעלי־בית** | `canonical_methods_registry_law` (O), `engine_governance_registry_authority_law` (O), ושורת הקודקס `gematria_engine` (בעלים של 5 ילדים). `_index` מחלק במפורש; אך `engine_governance…` (O) תלוי ב־`gematria_engine_law` שהוא ילד־קודקס. | פיצול מכוון, עם תלות מבעל־בית בילד־קודקס. | **להשאיר**. |
| **O9** | **הורה־ילד הפוך בזמן** | `live_state_resolution_law` v3 (9.10, משקל 5) ילד של `live_state_sync_law` v1 (25.8); `_index` מציין את ההורה, `inter_agent_coordination_law` (6) את הילד. | חפיפה סמנטית מוצהרת; שניהם פעילים. | **להשאיר**. |
| **O10** | **`work_log`: רעש וכפילות** | 470 שורות ניטור אוטומטי (״🚨/⚠️ ניטור…״) ב־CURRENT (לא נארכבו, לא הוחלפו); 3 קבוצות של שורות AFTER זהות (15 עודפות), למשל 13 עותקים של `PUBLIC_DOC37_ALIGNMENT_20261102 / AFTER_DOC37_ALIGNMENT_SCOPE_RELEASED`. | אינו חוזה, אך מקשה על ״בדיקת היומן בתחילת סשן״ (CLAUDE.md §10). | **הכרעת צוריאל** (ארכוב נוגע בנתונים). |
| **O11** | **סמנטיקת פוסטים/סדרות בחמישה מקומות** | (1) `DB: project_codex.publishing_conventions` (בעלים לפי OI:178); (2) `repo: SOD1820_CONTENT_FOUNDATION_CONTRACT.md` — מצהיר על עצמו כלא־מגדיר: ״מסמך זה אינו מגדיר סדרות ואינו מגדיר חברות בסדרה… כשיש סתירה בין סעיף זה לבין PLAN37 או הקוד, הם קובעים״ (:93–97), ובכל זאת §12 מכיל טבלת ״סדרה נפתרת היום״ לפוסטים; (3) `DB: Doc37` (החלטות DEC-SERIES-*); (4) הקוד `contentSeries2029Identity.js` (״bounded presentation contract… not a registry״, שורות 4–5); (5) **חדש**: `docs/2029-post-connections-contract-20261110.md` (טיוטת PR #1296). OI:247–256 ״One Decision → One Canonical Body… Other surfaces may point. They do not carry competing full semantic copies״. | PR #1296 מציין ״Extend existing reality_graph_law v8״ ו״Status: proposal, not activated״ — כלומר אינו מכריז על בעלים חדש, ולכן **אינו הפרה מוכחת** של (31) NO SILENT PARALLEL CONTRACT; אך הוא מוסיף עותק שלם חמישי של החלטות סדרה/מגירה, בלי רישום ב־PLAN37. | **הכרעת צוריאל**: PLAN37 = החלטות, קוד = חברות, `publishing_conventions` = ייצוג; CFC §12 ומסמך ה־PR הופכים למצביעים. לא למזג את מסמך ה־PR כחוזה עצמאי. |
| **O12** | **רשימת ההיתרים הטכנית** | `repo: .claude/settings.json` — `permissions.allow` בלבד (49 רשומות, ללא deny/ask/hooks), כולל `execute_sql` בשני שרתי Supabase (יכול לכתוב). `CLAUDE.md:47` ו־`:82`: ״זמינות של כלי אינה אישור… ההגנה עליו היא האישור המפורש בלבד״. | סיכון **ידוע ומתועד**, לא סתירה: מחסום הכתיבה הוא משמעת בלבד. בביקורת זו נעשה שימוש ב־`execute_sql` ל־SELECT בלבד. | **להשאיר**; הכרעת צוריאל אם להוסיף מחסום טכני (שינוי הגדרות — מחוץ לתחום הביקורת). |
| **O13** | **בדיקות הסמכות אינן מחוברות ל־CI** | `scripts/test-g1-agent-routing-smoke.mjs` נועץ מחרוזות ב־CLAUDE.md, AGENTS.md, OI, V1, V2 — **לא מוזכר בשמו** ב־`package.json` או ב־`.github/workflows`; `test/follow-category-series-alignment.test.mjs` (מבטיח ש־״אלון לוי״ בלי תגית = `[]`) — אינו מוזכר בשמו אף הוא. | קריאה סטטית: הקוד בטיוטת PR #1296 יהפוך את האסרשן לשגוי; ריצת CI אינה מכסה זאת. | **להרחיב** (חיבור בדיקות ל־`package.json`/workflow) — מחוץ לתחום הביקורת; לדווח בלבד. |
| **O14** | **נתיבי כתיבה: CLAUDE חזותי מול Codex יישומי** | `repo: OI:72`: ״CLAUDE is the mandatory writer for every 2029 surface and visual component״ (v16 §§89–96). `AGENTS.md:49–50`: Codex ״default technical implementation lead״ אך ״workflow preference, not a transfer of canonical product/domain authority״. | מתיישב דרך ההסתייגות ב־AGENTS.md; אין סתירה. | **להשאיר**. |
| **O15** | **שארית ״Legacy lock״ בתוך פסקה היסטורית** | `repo: SOD1820_MASTER_ROADMAP.md:176`: ״…the 22.10 Legacy lock and later explicit task restrictions govern this candidate״ (בתוך ״Historical release-semantics pointer״). | מול `CLAUDE.md:94–96`: ״None of this is a current state or restriction״. סימון היסטורי קיים בראש הפסקה; שארית ניסוח בלבד. | **להשאיר** / לסמן בעדכון הבא של ה־Roadmap. |

---

## 6. פערים בין חוזה, החלטה ומימוש

### 6.1 פערים כלליים (ללא סתירה בין טקסטים)

| # | פער | עדות | המלצה |
|---|---|---|---|
| **G1** | **החלטות Human-Gate מאוחרות קיימות רק בשורת קודקס** | `DB: project_codex.reality_graph_law` (43,871 תווים, עודכן 31.10): 7 סעיפים מתוארכים 23.9, 24.9 (×2), 6.10, 30.10 (×2), 31.10; הסעיף ״ONE TREE / LIVING CONTENT, CHANGE AND CONTEXT״ (30.10, שורות 233–330) מציג עצמו כ״EXTEND_EXISTING reality_graph_law v8״ — ואין גרסה v9 ב־`nodes`. לעומתו הגרסה הפעילה v8 (15.9) מסתיימת ב־UPDATE v8 מ־16.9. בשלושה חוקים נוספים `updated_at` של הקודקס מאוחר מגרסת החוק (תוכן לא נבדק): `person_foundation_contract_law`, `research_intake_foundation_contract_law`, `gematria_engine_law`. | **להרחיב** — גרסה חדשה של החוק (אותו `rule_id`) שמפנה לסעיפי הקודקס, באישור; **הכרעת צוריאל** מי ״המקור״ (O2). |
| **G2** | **החלטות הסדרה מ־10.11 אינן אצל הבעלים הקנוני** | ראו C11: רק במסמך טיוטת PR #1296. | **הכרעת צוריאל** (C11). |
| **G3** | **DEC-SERIES-003 אושר ולא מומש** | `DB: Doc37` שורה 220: ״שיוך היעד החדש טרם הוחל״; שורה 321: ״אחסון typed NOT_MAPPED״; שורה 1005: ״מימוש טרם בוצע״. נתונים (10.11): פוסטים 5003 ו־5004 עדיין נושאים `tags ∋ מימד חמש` **וגם** `categories = [מימד חמש, הצופן בסרטים]`; ה־`author` שלהם `NULL` (ההחלטה מגדירה ביעד מפרסם ״המערכת״; כיצד מפרסם מיוצג בנתונים — לא נבדק). | אם 10.11 יאושר (C11) — הפער נסגר בהחלטה אחרת; אחרת — **הכרעת צוריאל** על מועד מימוש התיקון בנתונים (שינוי DB — באישור בלבד). |
| **G4** | **DEC-SERIES-002 פתוח; נתונים מסתעפים** | `DB: Doc37` שורה 957: ״OPEN… אין הכללה אוטומטית״. מתוך 45 פוסטים עם התגית ״מימד חמש״: 35 מפרסם ״בדרך לנצח״ (עומדים בתנאי הקוד `exactAuthor`), 10 אחרים — 4 `NULL`, 2 מחרוזת ריקה, 3 ״מדריך לריפוי 10 הספירות״, 1 ״מזכה הרבים״. ה־`author` ריק מופיע בשתי צורות (`NULL` ו־`''`). | **להשאיר** (ההחלטה פתוחה במכוון) + **הכרעת צוריאל** על 10 הפוסטים; נרמול `NULL`/`''` — שינוי נתונים, באישור. |
| **G5** | **`unified_tags_law`: חוק־יסוד בלי מימוש** | ראו O7: טבלת `tags` 25 שורות מול 1,982 ערכים ייחודיים; `word_tags`/`discovery_tags` ריקות; אין `post_tags`. מסומן `R` (retire-when-replaced) ובו בזמן PR #1296 נשען עליו כ״unified_tags_law v1״. | **הכרעת צוריאל**: האם החוק עדיין מחייב (ואז לסמן `R` מחדש), או שמשתמשים ב־`posts.tags` כמקור (ואז לתקן את החוק). |
| **G6** | **אין הבחנה מובנית בין ״אירוע חדש״ ל״תיקון עריכה״ בנתונים** | `post_revisions` (261 שורות, 110 פוסטים): `note` טקסט חופשי; 159 שורות ״edit״ גנרי, **122 ללא `saved_by`**. פוסט 5107: 19 גרסאות, האחרונה היום 16:56 (״edit״, ללא מבצע); ביומן אין אזכור של 5107 אחרי 6.11. ההחלטה בקודקס (30.10 §ג) מגדירה ״זהות אירוע/גרסה… published_at, זמן האירוע, זמן הקליטה וגרסת התוספת״ כתפקידים נפרדים. | **להרחיב** — לא בנתונים (אין שדה): לממש דרך מסלול העדכונים הקיים כפי שההחלטה קובעת; **הכרעת צוריאל** על C3 לפני כל מימוש. |
| **G7** | **כתיבות היום לשני בעלי הליבה ללא רשומת תיאום** | `project_codex`: `publishing_conventions` עודכנה 10.11 11:45 UTC, Doc37 (id 37) 10.11 11:13 UTC. חיפוש ב־`work_log` (לא־מאורכב, מ־8.11) אחרי `publishing_conventions`/`Doc37`/`מסמך 37`/`project_codex`: **0 תוצאות**. | ONE SCOPE — ONE ACTIVE WRITER לא ניתן לאימות. **הכרעת צוריאל**/ציון הכותב. (תחזית בדוח: טביעות האצבע בסוף §9.) **נוסף (§10.10.6):** גם `video_transcription_law` (v1, נוצר 12.8) נערך במקום ב־10.11 — בלוק ״OWNERSHIP CLARIFICATION · 2026-11-10 · HUMAN-GATE ZURIEL״ — וביומן אין אזכור (0 תוצאות). |
| **G8** | **19 חוקים הוצאו מכלל פעילות בלי רישום יורש** | רשימה ב־§4.2 — כולל ששה חוקי עיצוב/ערכות (`post_theme_safe_colors_law`, `dual_theme_every_element_law`, `light_mode_background_law`, `atlas_dual_theme_law`, `city_background_dual_theme_law`, `light_calculator_dark_temple`). | **הכרעת צוריאל**: לאשר שהיורש הוא `canonical_colors_law` v2 / `DESIGN_CONTRACT_V2`, ואז לרשום מיפוי (גרסה אחרונה של כל חוק — עדכון מטא־דאטה, באישור). לא ניתן להוכיח אובדן. |
| **G9** | **6 חוקים בסימון ״לפרוש כשיוחלפו״ בעוד 2029 חי** | `g3_disposition_v1.classification='LEGACY_COMPAT_RETIRE_WHEN_REPLACED'`: `legacy_content_protocol` (`CLAUDE.md:198` עדיין מפנה אליו לעבודה על פוסטים/גלריות ישנים), `no_row_without_number_law`, `number_page_law`, `preserve_linked_row`, `unified_tags_law`, `word_approval_required_law`. 2029 עלה ל־Production 4.11; Legacy פרש 5.11 (`CLAUDE.md:5–10`). | **הכרעת צוריאל** לכל חוק בנפרד (התנאי ״כשיוחלף״ אינו נבדק אוטומטית). לא לסמן כהיסטורי בבת אחת. **עדכון (§10.10):** כל ששת החוקים נוצרו ביוני–יולי; תנאי ״כשיוחלף״ נבדק מחדש מול #1239 — ראו §10.10.3–10.10.4. |
| **G10** | **חוזה שקיים בנתונים כקטגוריה ולא כתגית** | המילה ״הצופן בסרטים״ מופיעה ב־`categories` של 2 פוסטים (5003, 5004) ואין אף פוסט עם התגית; Doc37 קורא לה ״נושא״ (שורות 321, 1005), CFC קורא ״נושא״ ו־`publishing_conventions:14` מגדיר Category כציר נפרד. | **להרחיב**: מילון אחד (O6). |

### 6.2 בדיקה מיוחדת — מערכת הפוסטים והסדרות (9 ההחלטות מול חוזה, נתונים וקוד)

**מקורות הראיה:** חוזה/החלטה — DB (`project_codex` Doc37, `publishing_conventions`, `reality_graph_law` בקודקס; חוקי `nodes`) ו־repo (`DESIGN_CONTRACT_V2`, `CONTENT_FOUNDATION_CONTRACT`=CFC, `OWNER_INDEX`=OI, `ROADMAP`=RM). נתונים — שאילתות חיות ל־`posts`/`post_revisions` (10.11.2026). קוד — קריאה סטטית של `origin/main` בידי סוכן קריאה־בלבד; ארבע הטענות המרכזיות בו (`ai_addition` לא מוצג, אין רכיב מגירת תגיות ו־`posts.tags` לא מוצג, שלושה ״master posts״ מקודדים לפי slug, עדכוני מקור רק ל־5113/5107) **אומתו על ידי** ב־grep. **לא הורצו בדיקות**. קיצורים: `P`=`src/pages/Post2029Page.jsx` · `PRP`=`src/lib/research/post2029ReadingProjection.js` · `CSI`=`src/lib/research/contentSeries2029Identity.js` · `R1`=`src/pages/post2029-reading.css` · `BT`=`test/post-one-tree-measures-2029.browser.test.mjs`.
**פסק:** ✅ מתיישב · 🟡 חלקי · ❌ פער · ⛔ סתירה · ❔ אין בעלים קנוני להחלטה.

| # | ההחלטה | חוזה / החלטה (בעלים, מצב) | נתונים (10.11) | קוד (ראיה) | פסק |
|---|---|---|---|---|---|
| **D1** | מעטפת פוסט אחידה לכל הסדרות, מותאמת לסוג תוכן | הניסוח המדויק **לא נמצא** בבעלים קנוני. הקרובים: Doc37 `POST-SHELL-20261020…` ו־`ONE-SHELL-EXTENSIBLE-NO-DUPLICATE-CHROME-20261021` (״USER_APPROVED_ARCHITECTURAL_PRINCIPLE… NOT_IMPLEMENTATION_OR_RELEASE״ — מעטפת גלובלית SystemFrame2029, לא ״מעטפת פוסט לפי סוג״); `publishing_conventions:294` (״Image + audio + text is a valid projection over the same Post identity״); `RM:224–225` (״no Bennett/FZ1073-specific UI law… rather than slug-specific semantics״); CFC:43–45. | `posts.theme`: `auto` 1,003 · `legacy-dark` 310 · `seo` 5 · `light` 2 (דריסת תצוגה פר־פוסט; 5003 ו־5004 = `legacy-dark`). | מסלול אחד: `App2029.jsx:389` → `P` (`Sod2029Shell`) → `<article>` אחד, ללא ענפי וידאו/אודיו/גלריה/יוצר חיצוני. **אבל** שלושה ״master posts״ מקודדים לפי slug (`P:623–625` `bennett-melach-631-78`, `flydubai-fz1073-…`, `sharshar-elections-…`) עם 64 שורות CSS לפי slug ב־`R1` ופרויקציה פר־slug ב־`PRP`; ״אופי״ הפוסט נגזר מ־slug/סימון (`src/lib/postCharacters2029.js:13–20`; slug `matrix-506` ב־`postFx.js:4`). בדיקות מקבעות את החריגים (`scripts/test-post-characters-2029.mjs:5–11`: ״master posts keep their own surface״). | 🟡 + ❔ — אחידות טכנית כן; אחידות לפי סוג תוכן מושגת בקידוד פר־פוסט; ההחלטה עצמה אינה כתובה אצל בעל קנוני. |
| **D2** | מרכוז תוכן, מספרים ומדיה לפי חוזה העיצוב | `DESIGN_CONTRACT_V2.md:195–204` (§8.2; ״Posts alignment · Human Gate ZURIEL · 31.10.2026״): מישור הקריאה וניווט המקטעים וכותרת הפוסט — ממורכזים; פסקאות וכותרות משנה — `start` (ימין בעברית); כותרות ריבוע הגימטריה והמשוואות הנפרדות — ממורכזות; ציטוט/שיר — חריג. `V2:202`: ״composition rule, not a command to center every Hebrew sentence״. Doc37 (HOME-06, F.3): ״כל הפוסטים בעמודת קריאה מרכזית ממורכזת״ — תואם כשקוראים ״מישור״ ולא ״טקסט״. | — | `R1:1096–1101` (מישור `min(790px,100%)`), `R1:1345–1351` (פרוזה `start`; פסוק/שורת גימטריה/משוואה ממורכזים), `R1:1445` (תמונת שער). אין כלל משותף שממרכז `<img>/<video>` של המקור (INF: מגיע מסימון מחבר). רוחב הקריאה משתנה לפי ״אופי״: 36–42rem לפוסטים שאינם plain מול 790px (`post2029-legacy-grade.css:12,50,133…`). בדיקות Playwright `BT:219–221,232–235` — **אינן ברשימת CI** ודלוגות בלי דפדפן. | ✅ למישור/כותרת/משוואות · ❔ ל״מספרים ומדיה״ — החוזה מזכיר רק כותרות ריבוע וקוסמטיקת משוואות; מדיה לא מוגדרת בשום שורה. אם ״מרכוז התוכן״ משמעו טקסט — **סותר** את V2:204. |
| **D3** | חיבורי עץ הם חלק ממנגנון הגרף הקיים | חזק: `reality_graph_law` (קודקס 30.10 §א: ״הצגת אותו ממצא בכמה משטחים אינה יוצרת עותקי תוכן, זהויות, מנוע, מאגר או גרף נוספים״); Doc37 `POST-SHELL…` פריט 2: ״קשרים \| מפגש \| מקורות הן שלוש תצוגות על אותו מקור/Research Context/Reality Graph, לא קורא, גרף או Store שני״; V2:181,189; OI:115,179. | — | מגירת ״מקורות וקשרים״ (`P:1150–1222`) קוראת `experience.connections` ו־`topic_cards_public`, ודוחפת ממצאים ל־ResearchProvider הקיים; אין כתיבת קשתות (`PRP:975–976`). **אבל** `experience.connections` מוגדר בקוד רק לשלושת ה־master posts (`PRP:874–886`). ובנוסף **מבנה מקביל**: `src/lib/research/postLineage2029.js` מצהיר עץ פוסטים בקוד (`POSTS`: 5107, 5113; ציר 631) ומוצג ב־`EventSequencePanel2029.jsx`; כותרתו: ״TREE view only… never a system update… declared per existing post identity״ — בעוד שמקבילו בעולם קורא ממצאים מהגרף (`worldSourceConnections.js`, `storyTreeSequence2029.js`). | 🟡 — המנגנון הכללי תואם; ההצהרה בקוד ל־2 פוסטים היא עותק־עץ חלקי (חשד להפרת ״אין גרף נוסף״; INF). |
| **D4** | מגירת תגיות וסיווגים סגורה כברירת מחדל בכל הפוסטים | **אין בבעלים קנוני** (Doc37: 0 התאמות; `publishing_conventions`: 0; V2:175 רק ״compact row with expandable details״). **נמצאת רק** בטיוטת PR #1296 (`docs/2029-post-connections-contract-20261110.md:12`: ״Secondary collapsed disclosure: ‘תגיות וסיווגים’, on ALL posts, including historical posts״). | `posts.tags`: 1,982 ערכים ייחודיים; 3 פוסטים עם תגיות מערכת `2029-*`, 9 עם ״טיוטה״. | **אין רכיב מגירת תגיות.** `posts.tags` **אינן מוצגות** בעמוד הפוסט (grep: אין `.tags` ב־`P`). קיימים: `<details class="sod29-post-details">` ״פרטי הפוסט״ (`P:1031`, סגור) ו־`#post-research` (`P:1150`, `useState(false)` ב־`P:84`) המכיל את `#post-classification`; **צ׳יפים** של סדרה/סיווג/מקור מוצגים מחוץ למגירה (`P:1029`, ≤4) ואף נבדקים כגלויים (`BT:505–512`). בדיקות ״סגור״: `BT:325,484` — לא ב־CI. | ❌ + ❔ — ההחלטה אינה מיושמת ואינה רשומה אצל בעל קנוני; הסיווגים כיום גלויים כצ׳יפים. הסיכון בהחלה עיוורת: חשיפת תגיות מערכת (`2029-*`, ״טיוטה״) לציבור. |
| **D5** | הבחנה בין חישוב מאומת, פרשנות, מקור ותוספת AI | חזק: `publishing_conventions` שורות 13, 21–27 (״חישוב מאומת ≠ פרשנות מאומתת; ai_touched ≠ verified״; תוספת AI אחרי טקסט המחבר), 99, 142; `truth_axes_foundation_law` (4 צירים); Doc37 DEC-WORLD-001; CFC:117,131,153; V2:175. | 1,320 פוסטים: `verified=true` — 3 (2 בלי `verified_by`); `ai_touched` 46; `ai_addition` **7** (92, 5109, 5120, 5127, 5128, 5129, 5130); `source='ai'` 129. | הבחנה ברמת טקסט בלבד (`P:1052`, `PostConvergenceMeasures2029.jsx:78,110`, ״טענת הפוסט״ ב־CSS `post2029-legacy-grade.css:97–106`); בדיקת מנוע רק בלחיצה (`PRP:1435`). **`posts.ai_addition` לא מוצג בשום רכיב 2029**: מופיע ב־`postReaderColumns.js:19` (רשימת עמודות) וב־`home2029Projection.js:245–256` (ניתוח regex לממצאי Home) בלבד — אומת ב־grep על כל קבצי הקוד. | ❌ **מוכח**: Decision #7 (`publishing_conventions:13,27`; CFC:117) קובעת שתוספת מערכת על פוסט של יוצר חיצוני נשמרת ב־`ai_addition` ומובחנת חזותית — השדה נשמר (7 פוסטים) ואינו מוצג. אם התוספת אינה גם בתוך ה־HTML של הפוסט, הקורא אינו רואה אותה (לא נבדק). |
| **D6** | אירוע חדש בראש הפוסט / תיקון עריכה נשאר בהקשר | מקביל לסתירה **C3**. תמיכה: V2 §8.1 (12.10, שורות 181–189) וקודקס `reality_graph_law` 30.10 §ג (זהות אירוע/גרסה); OI:179,203; RM:228. אין מסמך שמגדיר ״תיקון עריכה״. | `post_revisions`: 261 שורות, `note` חופשי, 159 ״edit״ גנרי, 122 בלי `saved_by`; פוסט 5107 נערך היום 16:56. | פס עדכון אחרי ה־hero (`P:1077–1093`, החדש ראשון, ״+N״ עד 5) מוזן מ־`PROVEN_POST_SOURCE_UPDATES` — **רק פוסטים 5113 ו־5107** (`postSourceUpdates2029.js`, אומת); אין מושג ״תיקון״ (כל פריט ״תוספת לפוסט״); המקטע החדש עצמו נשאר במקומו — ״בראש״ נכון רק לשורת המצביע. קטלוג הפוסטים ממיין `modified desc` (`postsCatalog2029Projection.js:231`; INF: תיקון מעלה פוסט מחדש). | 🟡 + ⛔ (C3) — הכוונה מיושמת ידנית ל־2 פוסטים; בנתונים אין הבחנה. |
| **D7** | חברות בכמה סדרות בלי שכפול פוסטים | `reality_graph_law` קודקס 30.10 §א: ״אותו תוכן עשוי להשתתף בכמה סיפורים ונושאים בלי להיכפות להורה יחיד ובלי להעתיק את גוף המקור״; CFC:91–106: אין שדה/טבלת `series`, ״Category≠Series״. **אך** Doc37 DEC-SERIES-003 (19.10) דווקא **הסיר** את החברות הכפולה היחידה (5003/5004) — ראו C11. | סדרה = סימון במערך (`tags`/`categories`); 45 פוסטים ״מימד חמש״ גם ב־tags וגם ב־categories, 2 ב־categories בלבד; ״מה קורה הבורא״ ב־tags בלבד (8). | `CSI` (5 תיאורים): `contentSeriesKeysForPost` מחזיר **מערך** (`CSI:163–166`), חברות = OR על `{field, value}` + `exactAuthor` אופציונלי. בדיקות: אותו פוסט בשתי סדרות = שורה אחת (`test/reality-map-now-projection-2029.test.mjs:38–50`), דה־דופליקציה של צ׳יפים (`seriesShadowedCategories`, `CSI:135`). `nowPublications2029.js:115` משתמש ב**מפתח הראשון בלבד**. מראה SQL `post_content_series_keys_v1` מכסה **3 מתוך 5** סדרות ושתי מיגרציות המועמדות **לא הוחלו** (`20261026012207_…`, `20261031091248_…`). | 🟡 — רב־חברות נתמך בקוד; אין מקור יחיד לסימון (tags/categories/או שניהם לפי סדרה); JS(5) מול SQL(3) מקבילים. |
| **D8** | שימור SEO, קישורים ותגיות היסטוריות | Doc37 §12.29–12.30, 12.46–12.47; `docs/w0-2027-route-seo-addressability-matrix-v1.md`; `docs/w0-2027-post-url-immutability-gate-v1.md`; V2/OI; `unified_tags_law` (״בלי לשבור SEO״). | — | canonical ב־`api/og.js:341` ו־`P:130–137`; מדיניות כתובות `src/lib/publicPostUrls.js`; נתיבי `/tag/:slug`,`/category/:slug` (`App2029.jsx:345–346`) בתנאי `publicFoundationPreview` או `PUBLIC_READING_RELEASE` (`:59`); sitemap `api/sitemap.js:268–294`; `?series=` noindex. בדיקות CI: `public-url-continuity-2029` (`live-contracts-2029.yml:86`). חסר: בדיקה שדפי תגית/קטגוריה מופיעים ב־sitemap XML. | ✅ ללא סתירה מול ההחלטה; הערה: `docs/w0-2027-…matrix…:361` ״tag route is still missing״ מול `:378` (מסמך פנימית מיושן). |
| **D9** | אלון לוי · מטריקס · משחקי הדיונון | DEC-SERIES-003 (מטריקס/דיונון **מחוץ** למימד חמש; נושא ״הצופן בסרטים״ + מפרסם ״המערכת״), DEC-SERIES-005 (אלון לוי כתב, ״יתר חומריו לא מצורף אוטומטית״), CFC:225,242; **מול** PR #1296 (אלון לוי לפי מחבר בלבד; 5003/5004 חברות כפולה) — ראו **C11**. ״יוצר/מרואיין חיצוני״: Doc37 (בלוק השימור) ״לדברי אלון לוי״ — ציטוט מיוחס ליוצר, בלי לוגו SOD1820 כאילו זו עמדת האתר. | אלון לוי: 13 פוסטים (מחבר); 8 עם התגית (5076, 5081, 5092, 5108, 5117, 5119, 5122, 5131), **5 בלי** (54 [הרצאה מ־2025, ״הרצאות״], 5021, 5035, 5042, 5069). 5003/5004: `author=NULL`, `tags∋מימד חמש`, `categories=[מימד חמש, הצופן בסרטים]`. | `CSI:60–73`: ״מה קורה הבורא״ = תגית **וגם** מחבר ``אלון לוי``; `CSI:82–85`: ״מימד חמש״ דורש מפרסם ״בדרך לנצח״ → 5003/5004 (author NULL) **אינם** בסדרה (`test/follow-category-series-alignment.test.mjs:32–38`; `tests/sql/follow_category_series_alignment_v1.sql:69,111–112`) ומוצגים כ״סיווג במקור״. כלומר הקוד **מיישם את DEC-SERIES-003/005** ולא את 10.11. אין שום בדיקה לייחוס ציטוט ליוצר חיצוני; הכלל ״בלי לוגו אתר״ קיים רק ל־Now (`nowPublications2029.js:52–60`). | ⛔ **C11** — הקוד והחוזה מסונכרנים על ההחלטה הישנה; הטיוטה מציעה את החדשה. אילו אומצה כלשונה — +5 פוסטים לסדרת אלון לוי, ביניהם הרצאה מ־2025 (54). |

### 6.3 מקרי בוחן

**פוסט 5107 — מחקר מקורי (״הבחירות לכנסת ה־26 — כשהמספרים מתחילים להתחבר״).** `categories=[רמזי הגאולה, בחירות]`, בלי סדרה, 26 תגיות (רובן מספריות) ובהן **תגית מערכת `2029-migration-anchor`**; `source='ai'`, `ai_touched=true` עם הערה, `verified=false`; 19 עריכות ב־`post_revisions`, האחרונה **היום 16:56 (״edit״, בלי מבצע)** וללא אזכור ביומן אחרי 6.11. בקוד הוא ״master post״: slug `sharshar-elections-redemption-hints-draft` (`P:625`) עם קשרים מקודדים, שורש ״עץ הפוסטים״ (`postLineage2029.js`) ואחד משני הפוסטים בעלי פס עדכון (`PROVEN_POST_SOURCE_UPDATES[5107]`). **מסקנה:** כל מנגנוני ״מחקר מקורי״ (קשרים, עדכונים, ציר 631) קיימים רק כקוד פר־פוסט — אין דרך כללית שפוסט חדש יקבל אותם (D1/D3/D6).

**סדרת מימד חמש (יוצר חיצוני ״בדרך לנצח״).** 45 פוסטים מסומנים; 35 עם מפרסם ״בדרך לנצח״ (עומדים בתנאי הקוד), 10 אחרים (4 `NULL`, 2 `''`, 3 ״מדריך לריפוי 10 הספירות״, 1 ״מזכה הרבים״) — פתוחים לפי DEC-SERIES-002. 4 פוסטים בסדרה נושאים `ai_addition` (5109, 5127, 5129, 5130) והוא **אינו מוצג** (D5). ״הצופן בסרטים״ קיים כקטגוריה בלבד.

**סדרת מה קורה הבורא (אלון לוי).** הקוד והחוזה מיושרים על ״תגית ומחבר״; הטיוטה מציעה ״מחבר בלבד״ (D9, C11). לא נמצאה בדיקה שמוודאת ייחוס ציטוט ליוצר החיצוני בעמוד הפוסט; כלל ״ללא לוגו SOD1820״ קיים רק ב־Now.

**ממצא מערכתי: בדיקות הפוסטים והסדרות אינן ב־CI.** לפי סוכן הקוד (grep ב־`.github/workflows`, `package.json`, `scripts`): `BT`, `post-classification`, `post-backgrounds`, `reality-map-series`, `post-lineage`, `posts-taxonomy`, `posts-public-reading-seo`, `posts-follow-targets`, `now-publications`, `post2029-connections` — אינן ברשימת CI; ברשימה: `public-url-continuity-2029`, `post-hierarchy-raziel-2029`, `postSourceUpdates2029.test.js`. אימתתי בעצמי רק את `follow-category-series-alignment.test.mjs` ואת `test-g1-agent-routing-smoke.mjs`; השאר — לפי הסוכן.

---

## 7. תוכנית תיקון מינימלית — לפי סדר עדיפויות

**עקרונות:** (1) אפס חוזים חדשים, אפס רשומות מאוחדות, אפס מחיקות — רק `EXTEND_EXISTING` (`inter_agent_coordination_law` 28/31/36). (2) גרסה חדשה **אחת** לכל חוק בכל באץ׳ (הטריגר `trg_rule_compaction_integrity_guard_v1` דורש `supersedes_version` = הגרסה הקודמת הישירה ושלושת שדות המטא־דאטה). (3) כל צעד שנוגע ב־DB/`main`/PR דורש אישור מפורש לפי `CLAUDE.md` §0.4; **שום דבר מהתוכנית אינו מבוצע כאן**. (4) קודם החלטות, אחר כך תיקון.

### P0 — החלטות שחוסמות כל עבודה נוספת (אפס שינוי בקוד/מסד)

| צעד | מה | נימוק | ממצא |
|---|---|---|---|
| 0.1 | ~~להכריע איזה משטר שחרור בתוקף~~ **הוכרע 10.11:** אישור מפורש לכל פעולה; אין הרשאה עומדת. נותר ליישם בחוקים (`deploy_on_request` v4, `inter_agent_coordination_law` v18) — §10.7, ב׳. | בטיחות Production; כל סוכן ננתב ל־`deploy_on_request` ע״י Owner Index | C1 |
| 0.2 | להכריע בהחלטות הסדרה של 10.11 (אלון לוי לפי מחבר בלבד; 5003/5004 חברות כפולה; שם הקבוצה: **הוכרע 11.11.2026 — ״הצופן בסרטים״, §15**). | חברות בסדרה מזינה Home/Follow/ספירות; PR #1296 תלוי בכך | C11, G2–G4 |
| 0.3 | לציין כותב פעיל יחיד ל־`publishing_conventions` ול־Doc37 (נכתבו היום ללא רשומת תיאום). | ONE SCOPE — ONE ACTIVE WRITER | G7 |
| 0.4 | להכריע בקדימות בין שלושת כללי ״ההחלטה המאוחרת״ ו־(58). | מניעת הכרעה לפי מי שקורא | O4 |

### P1 — יישור בעלים (באץ׳ B: עדכוני חוקים/קודקס, מתועד BEFORE/AFTER אחד)

| צעד | מה | רכיבים | ממצא |
|---|---|---|---|
| 1.1 | גרסה חדשה ל־`deploy_on_request` (v4) ול־`inter_agent_coordination_law` (v18): ביטוי המשטר שנקבע ב־0.1; סעיפים 75–80 מסומנים היסטוריים; תווית גרסה מתוקנת (שני החוקים באותו באץ׳). | 2 חוקים | C1, C5, C9 |
| 1.2 | אחרי החלטה על מיקום ה־Naming / product language law: גרסה חדשה ל־5 חוקי המותג (בעלים → `DESIGN_CONTRACT_V2`), תיקון נתב `_index`, ו־`sod1820_canonical_identity_law` (גם `depends_on`). | 5 חוקים + שורת קודקס | C2 |
| 1.3 | `verify_seal_manual_only` v4 (תווית); `research_workspace_law` (יישור שני שדות הבעלים); `depends_on` של 13 החוקים עם יעדים שבורים → הבעלים לפי `compaction_v1` (או הסרה). | עד 15 חוקים, גרסה אחת לכל חוק | C4, C6, C8 |
| 1.4 | `publishing_conventions`: הכרעה בין שורה 21 לשורה 110 + מילון ציר ״סדרה / קטגוריה / נושא״ + מגירת תגיות סגורה כברירת מחדל (כיום קיימת רק בטיוטת PR). | שורת קודקס אחת | C3, O6, D4 |
| 1.5 | PLAN37: רשומת החלטה אחת עם מזהה, שמחליפה במפורש DEC-SERIES-003/005 (אם אושר 10.11) ומעדכנת את טבלת CFC §12. שורה אחת ב־`_index` שמגדירה את מעמד Doc37. | Doc37 + `_index` | C11, O3 |
| 1.6 | `reality_graph_law` v9: הפניה לסעיפי הקודקס 23.9–31.10 (ללא העתקה) או החלטה שהקודקס הוא הנושא ואז ניסוח ה־rule כמצביע. | חוק אחד | G1, O2 |

### P2 — היגיינה (PR נפרד אחד של מסמכי md בלבד; לא נוגע בקוד ובבעלים)

* באנרים מיושנים: `SOD1820_CONTENT_FOUNDATION_CONTRACT.md` (5, 9, 183), `docs/sod1820-system-frame-contract-v2-addendum.md:4`, `SOD1820_MASTER_OWNER_INDEX.md:6`; הערת ״ארכיון״ להפניות ב־`docs/research-studio-v1-contract.md:10–11`; יישור המילה ״SSOT״ ב־`docs/MASTER_STATE_STRATEGIC_ADDENDA.md:8`; נעיצות גרסה ב־`DESIGN_CONTRACT_V2.md:5` (v9→v10) ובכותרת Doc37 E5. (C10, C12–C14)
* מסמך PR #1296: לא למזג כחוזה עצמאי; אחרי 0.2 — לקפל את ההחלטות ל־PLAN37/`publishing_conventions` ולהשאיר בו רק מפרט יישום, או לסגור. (O11)
* חיבור הבדיקות `scripts/test-g1-agent-routing-smoke.mjs` ו־`test/follow-category-series-alignment.test.mjs` ל־`package.json`/workflow — מחוץ לתחום ביקורת זו. (O13)

### P3 — מדיניות (החלטות, לא תיקונים)

* האם בעלים־קודקס מחייבים גרסאות/snapshot (O1); מי נושא את ההיררכיה — `owner_routing` או `depends_on` (§4.3).
* ששת חוקי `LEGACY_COMPAT_RETIRE_WHEN_REPLACED` (G9); יורשי 19 החוקים הלא־ממופים (G8); מקור לשחזור גרסאות חסרות (C7).
* ארכוב שורות ניטור/כפולות ב־`work_log` (O10).
* נתונים (רק אחרי החלטות 0.2/1.4): נרמול `author` ריק, שיוך 5003/5004, תגיות מערכת `2029-*`/״טיוטה״ מחוץ לתגיות הציבוריות — כל אלה שינוי DB.

---

## 8. החלטות הנדרשות מצוריאל (לפי חשיבות)

| # | שאלה | ברירת מחדל מוצעת |
|---|---|---|
| 1 | ~~משטר שחרור: הרשאה עומדת או אישור מפורש לקומיט?~~ **הוכרע 10.11:** אישור מפורש לכל מיזוג ולכל פריסה; אין הרשאה עומדת | ליישם: `deploy_on_request` v4 + `inter_agent_coordination_law` v18 + הפונקציה `admin_suggestion_decide` (§10.7–10.8) |
| 2 | החלטות הסדרה של 10.11 אכן ניתנו? (אלון לוי לפי מחבר; 5003/5004 כפולים; שם האוסף: **הוכרע 11.11.2026 — ״הצופן בסרטים״, §15**) | לרשום ב־PLAN37 עם הפניה מפורשת ל־DEC-SERIES-003/005 |
| 3 | בעל חוזה העיצוב: V2. איפה יושב ה־Naming / product language law? | להעתיק את הסעיף (V1:92–100) אל V2 כסעיף בבעלות V2, ואז לסמן V1 כהיסטורי |
| 4 | `post_update_on_top`: ״ממשיך לחול״ או ״בחירת תצוגה היסטורית״? | בחירת תצוגה היסטורית; זהות האירוע לפי הקודקס 30.10 §ג |
| 5 | מעמד Doc37 וקודקס־כבעלים: רישום החלטות מתוארך + גרסאות? | שורה ב־`_index`; snapshot בכל עדכון של שורת קודקס שהיא בעלים |
| 6 | סדר קדימות בין: כלל Doc37 / `CLAUDE.md` §0.1(6) / (58) ״חוק פעיל גובר על adapter״ | ״עוצרים ומדווחים; עד הכרעה — המגביל״, והחלטה שנרשמה ב־PLAN37 מחליפה |
| 7 | ששת חוקי ״לפרוש כשיוחלפו״ — מי מהם כבר הוחלף? | לבדוק אחד־אחד; `legacy_content_protocol` נשאר פעיל (CLAUDE.md:198) |
| 8 | שחזור גרסאות חסרות: מ־git/גיבויים או לתעד כפער? | לתעד כפער; לא לייצר שורות |
| 9 | מי הכותב הפעיל ל־`publishing_conventions` ול־Doc37? | הסשן המרכזי; כל כתיבה אחרת דרך claim ביומן |
| 10 | 10 פוסטי ״מימד חמש״ עם מפרסם שאינו ״בדרך לנצח״ — בסדרה או לא? (DEC-SERIES-002) | להשאיר פתוח עד סקירה פרטנית |

---

## 9. דוח מסירה (לפי `CLAUDE.md` §0.5)

| שדה | ערך |
|---|---|
| **מה בוצע** | ביקורת קריאה־בלבד של: `nodes` (468 גרסאות חוק, 87 פעילים, 10 `spec`), `project_codex` (35 שורות; קראתי במלואן/בחילוץ ממוקד את `_index`, `publishing_conventions`, `reality_graph_law`, Doc37), `work_log` (9,691 שורות; שאילתות ממוקדות), `decision_ledger`, `posts`/`post_revisions`/`tags`, קבצי ה־Markdown והקוד ב־`origin/main`, ו־PR #1296 (דרך GitHub MCP). שני סוכני קריאה־בלבד (מסמכי repo + PR; מיפוי קוד) — דוחותיהם טופלו כנתונים; הטענות המכריעות אומתו על ידי ומסומנות. |
| **מה לא בוצע** | כל שינוי: אין כתיבה ל־DB (נעשה שימוש ב־`execute_sql` ל־SELECT בלבד), אין קומיט/דחיפה/מיזוג, אין שינוי ענפים או PR (כולל #1296), אין פריסה, אין יצירת/איחוד חוזים, אין מחיקה. לא נקרא Vercel. לא הורצו בדיקות מקומיות ולא נבדק דפדפן. |
| **מאגר · ענף · SHA** | `zuriel337/sod1820` · ענף עבודה מקומי `ccr-b2565041-d94syf` · בסיס = ראש = `6deeb1008285e19aad4cfcb9ae21681863ee0695` (= `origin/main`, ‎0 מאחור/0 לפנים). |
| **קבצים שהשתנו** | במאגר: **אין**. נוצרו רק קבצי דוח בתיקיית הסשן (ראו להלן). |
| **קומיטים** | אין. |
| **בדיקות ו־CI** | לא הורצו בדיקות. CI של PR #1296 (נקרא בלבד, head `a377d023…`): 11 בדיקות, **10 הצליחו, 1 נכשלה** — ״Mobile + Accessibility Acceptance״ (Release Visual Gate); לפי סוכן הקריאה (שלא אומת): הכשל בבדיקת ״Calculator 2029 viral Golden״, וריצות אחרות באותו יום עברו — כנראה לא קשור. הערה: ה־CI ירוק ברובו אף שהקוד בטיוטה משנה לפי קריאה סטטית אסרשן בבדיקה שאינה מחוברת ל־CI (O13). |
| **מצב PR #1296** | פתוח, טיוטה, `mergeable_state=unstable`, ללא ביקורות/הערות, 3 קומיטים, 2 קבצים (+34/−6), בסיס `54fac787…` (אב־קדמון של `main` הנוכחי), לא נגעתי בו. |
| **Production שונה?** | **לא.** |
| **סולם מצבים (§12)** | כל הממצאים הם **DOCUMENTED/IMPLEMENTED-בקוד-בלבד** כפי שנקראו; לא נטען MERGED/DEPLOYED/LIVE/VERIFIED על שום דבר. |
| **חסמים וסיכונים** | (1) C1 — סתירת סמכות שחרור (קריטי). (2) כתיבות ללא רישום תיאום היום ל־`publishing_conventions` ול־Doc37 (G7) — ייתכן שהקריאות שלי כבר מיושנות; טביעות אצבע בסוף. (3) הדוח נשען על קריאה סטטית של הקוד; ארבע הטענות הקריטיות אומתו, השאר לא הורצו. (4) Doc37 נקרא בחילוץ ממוקד (619K תווים) — ייתכנו החלטות רלוונטיות שלא עלו בחיפוש. |
| **החלטות ממתינות** | §8 (10 שאלות). |
| **צעד הבא מומלץ** | P0 בלבד (§7): הכרעה בשאלות 1, 2, 9 (משטר שחרור · החלטות הסדרה של 10.11 · כותב פעיל ל־`publishing_conventions`/Doc37). אל תמזגו את PR #1296 ואל תפרסמו עד שהן מוכרעות. |

**קבצי הדוח:** `/tmp/claude-0/-home-user-sod1820/a0e1057f-583d-5146-a7ff-2fa62b42ebc6/scratchpad/SOD1820-contract-governance-audit-20261110.md` (הדוח המלא).

**ראו גם §10.9 — דוח מסירה לנספח Legacy Retirement.**

### טביעות אצבע (לאימות עתידי של הממצאים; 10.11.2026, שעון UTC)

| מקור | MD5 / אורך | עודכן |
|---|---|---|
| `project_codex._index` | `fd0ac4629412ea51965cf9213fda18e2` · 10,904 | 17.9 |
| `project_codex.publishing_conventions` | `26b473b72d55c57153c6678543d25094` · 72,651 | **10.11 11:45** |
| `project_codex.reality_graph_law` | `69ad82ef952f6a882da629a2d89ff17e` · 43,871 | 31.10 |
| `project_codex` id 37 (Doc37) | `c06a461d21a661953b297370bca72138` · 618,963 | **10.11 11:13** |
| 87 החוקים הפעילים (חתימה מצטברת: `rule_id@גרסה:md5(description)`) | `fae24986b558ee63c5f2cdf9b7c799a6` | — |
| `work_log` | 9,691 שורות | אחרונה 10.11 19:30 |
| `origin/main` | `6deeb1008285e19aad4cfcb9ae21681863ee0695` | — |

> **הערה על מקורות:** כל טקסט שנקרא מ־DB, מהקוד ומדוחות סוכני המשנה טופל כנתונים. לא בוצעה שום הוראה שהופיעה בתוכנם. דוח סוכן המסמכים הצביע על כך ש־`.claude/settings.json` מתיר `execute_sql` בשני שרתי Supabase ללא בקשת אישור (O12) — זהו ממצא, ולא שונתה בעקבותיו שום הגדרה.

---

## 10. נספח — ביקורת Legacy Retirement (10.11.2026 · קריאה בלבד)

> נספח לדוח הקיים ולא פרויקט מקביל: אין כאן היררכיה חדשה, חוזה חדש או שינוי. הממצאים משתלבים ב־§4 (C1, C2, C5), §5 (O1) ו־§6 (G8, G9). **כל פריט ברשימות §10.7 דורש אישור מפורש לפני ביצוע.** בוצעו רק קריאות (SELECT, `git grep`, GitHub read); אפס שינוי ב־DB, בקוד, בענפים, ב־PR וב־Production.

### 10.0 הכרעות צוריאל שנרשמו בנספח (10.11.2026, בשיחה)

1. כל מיזוג ל־`main` וכל פריסה ל־Production דורשים אישור מפורש של צוריאל לפעולה המסוימת. **אין הרשאה עומדת.** ← **C1 הוכרע**; נותר ליישם בחוקים (§10.7, ב׳: `deploy_on_request` v4 ו־`inter_agent_coordination_law` v18).
2. Legacy פרש; 2029 הוא המוצר הפעיל היחיד.
3. עדיפות: **ביטול פעילות** (`is_active=false`) של חוקים ומפרטים מיושנים — לא מחיקה פיזית של היסטוריית חוקים.

ההכרעות נרשמות **כאן בלבד**: הן עדיין לא ב־`work_log`, ב־`decision_ledger` או בחוקים (כתיבה אליהם דורשת אישור, §10.8).

### 10.1 התוצאה בקצרה

| אוכלוסייה | 2029 | משותף | Legacy בלבד | היסטורי | סה״כ |
|---|---|---|---|---|---|
| חוקים פעילים (`type='rule'`) | 65 | 20 | 2 | 0 | 87 |
| רשומות `type='spec'` פעילות | 0 | 0 | 8 | 2 | 10 |
| שורות `project_codex` | 20 | 6 | 2 | 7 | 35 |

1. **ניקוי ה־DB לא בוצע.** ההסרה של 5.11 (#1239) מחקה 415 קבצים בקוד (246 רכיבים, 76 ספריות, 67 דפים) ושינתה 187; `REMOVAL.md` קובע במפורש ״לא בוצע… שינוי DB״. במסד: לא נוצר חוק או spec אחרי 3.11 18:17, אין החלטה על חוקים ב־`decision_ledger` אחרי 4.11, ואין ביומן רשומה על פרישת חוקי Legacy.
2. **ה־Legacy ה״אמיתי״ שנותר קטן ומוגדר:** 10 רשומות spec (8 של האתר הישן, 2 תוכניות היסטוריות — אפס צרכנים בכל מקום), שני חוקים מותנים (`number_page_law`, ‏`no_row_without_number_law` — §10.10), 4 שורות קודקס מיושנות בלי באנר STALE, וסעיפים בתוך 22 חוקים, 7 שורות קודקס ו־7 מסמכי md משותפים.
3. **ההוראות המטעות ביותר אינן ״חוקי Legacy״ אלא עובדות פריסה/Production מיושנות** בבעלים חיים: `deploy_on_request` (״push ל־main = פריסה״ + הרשאה עומדת), `inter_agent_coordination_law` (״CURRENT PRODUCTION = legacy״ + שחרור אוטומטי), `branches_deploy` ו־`publishing_conventions` (Legacy כיעד פרסום). ראו §10.4.
4. **״legacy״ הוא שני דברים:** (א) מוצר/ריצה (פרש) — נדון כאן; (ב) נתונים, תוכן ומזהים היסטוריים (1,299 פוסטים עם `wp_id`, 310 בערכת `legacy-dark`, 2,152 תמונות Huge-IT, `redirect_map`, `legacy_traffic`…) — **חייבים להישאר** (§10.5).
5. **עדכון ל־G9 (§6.1):** מתוך ששת החוקים המסומנים ״לפרוש כשיוחלפו״ — `number_page_law` ו־`no_row_without_number_law` הם Legacy בלבד (מותנים; §10.10.4). `legacy_content_protocol` (3 צרכנים חיים) ו־`preserve_linked_row` (נתונים) נשארים; `word_approval_required_law` — אין קורא בקוד, אך 2,894 מילים ממתינות: הכרעה (§10.10.4); `unified_tags_law` — ב׳.

### 10.2 איך נבדק (לא רק חיפוש המילה Legacy)

* **חתימות התנהגות:** 353 שמות רכיבים/דפים/ספריות שנמחקו ב־#1239 (נגזרו מ־`git diff` של הקומיט ומהקבצים שאינם קיימים ב־HEAD) — נשלפו מגופי כל 87 החוקים, 10 ה־spec ו־35 שורות הקודקס; מילות תפריט/עיצוב/ממשק (תפריט עליון, Mega Menu, טיקר, Marquee, פופאפ, Navbar, BottomBar, legacy-dark, #0a0a0f); נתיבים (קובץ שהוזכר מול קיום ב־HEAD ובקומיט שלפני ההסרה `8ae69125`); ועובדות פריסה מול `vercel.json` (שני השורשים).
* **צרכנים אמיתיים (לפי מזהה):** `src`, `api`, `public-reading-deploy`, Edge Functions, `scripts`, `tests`, מיגרציות, `.github`/`package.json`/`vercel.json`, מסמכי סוכנים וחוזים (CLAUDE, AGENTS, HANDOFF, OI, RM, MS, V1/V2, CFC, System Frame, Research Studio) — ב־HEAD **וגם** בקומיט שלפני ההסרה; ב־DB: גופי כל פונקציות `public`, תצוגות (`rules_layer`, `rules_active`, `rules_dependency_tree`), קשתות גרף, ושאילתות קוד על `nodes`.
* **שני צרכנים חיים ברמת המערכת:** (א) `src/lib/research/numberSystemMethods.js` קורא את הגרסה הפעילה של 4 חוקים לפי מזהה — `zero_scale_law`, `shitat_haechad_alef_law`, `zero_navigation`, `moment_clock_law` (צורכים אותו `Number2029Page`, `post2029ReadingProjection`, `worldSourceConnections`); ביטול פעילותם ישבור כרטיסי ״שיטות מערכת״. (ב) `raziel-attention` שולף חוקים פעילים לפי רלוונטיות דרך `fn_raziel_relevant_rules` (`type='rule'`, `is_active`) — **ביטול פעילות מוציא חוק מההקשר של רזיאל** (רצוי לחוקים מיושנים).
* **מגבלות:** קריאה סטטית; לא הורצו בדיקות; Production/Vercel חי לא נקרא; מצב ה־Edge Functions נקבע מהקוד שבריפו.

### 10.3 מה כבר הושלם בקוד — לא מומלץ שוב

| נושא | מצב | ראיה |
|---|---|---|
| ריצת Legacy, App/routes, `legacy.jsx` (265KB), Navbar/BottomBar/טיקרים, UserCenter, דפי תוכן | **הוסר** | #1239 (`a5ef82cce`): 415 נמחקו, 187 שונו, 30 נוספו |
| מסוף ניהול ישן ועורכי פוסטים (AdminPage, PostEditorPage, AdvancedPostEditor, ContributorStudio, WaInboxPage…) | **הוסר** | `REMOVAL.md` ״מה הוסר״ |
| 43 קבצי UI מתים, חוזי theme/palette (`palette.js`→`paletteTokens2029.js`, `themeMode`, `lightRoutes`, `chromeTheme`, `stream`) | **הוסר** | שם |
| יעד build, `build:legacy`, שער Legacy lock, rollback worker, 18 בדיקות של קוד שנמחק | **הוסר**; הוחלף ב־`scripts/test-legacy-retired.mjs` + workflow `legacy-production-lock` (שם נשמר בכוונה) | `package.json` (`prebuild`), `.github/workflows/legacy-production-lock.yml:21–22` |
| בלוק ״Legacy פרש״ ב־`CLAUDE.md` / `AGENTS.md`; ניסוח ״היסטורי, לפי דרישה״ ב־`legacy_content_protocol` וב־`publishing_conventions` 109–112 | **קיים** | — |
| שאריות קוד מתועדות (3 קבצי src רדומים עם import שבור, `xlsx`, `src/theme.js`, בדיקות Python, תוויות, `personalPanels`, `site_flags`, ענפים) | **מתועדות ב־`REMOVAL.md` §148–160, ממתינות להחלטתך — לא נכללות כאן ולא מומלצות שוב** | שם |
| **כל מה שב־DB:** 10 spec, `number_page_law`, סעיפים בחוקים משותפים, שורות קודקס | **לא בוצע** — זו רשימת §10.7 | §10.1 |

### 10.4 הוראות שסותרות את העובדה ש־2029 הוא Production

| # | מיקום | מה כתוב | מה נכון היום | קבוצה |
|---|---|---|---|---|
| 1 | `inter_agent_coordination_law` v17, שורות 119–125 (סעיפים 75–80) | ״TEMPORARY LEGACY PRODUCTION… CURRENT PRODUCTION = legacy/transitional until explicit cutover״; ״confusing those two states… must be reported as DRIFT״ | 2029 עלה ל־Production ב־4.11 (Doc37 §12.45); Legacy פרש ב־5.11 (`CLAUDE.md` 5–10). אין בחוק סעיף מאוחר שמציין שהמעבר בוצע (אומת: 157 שורות, אזכורי legacy בשורות 77, 82, 119–125, 135 בלבד) | ב׳ |
| 2 | `inter_agent_coordination_law` v17, שורות 129–131, 139 (סעיפים 81–82) | ״AUTO-RELEASE ON CLEAN STATE… proceeds through merge/migration/deploy/live verification without a second user prompt״ | החלטתך 10.11: אישור מפורש לכל מיזוג ולכל פריסה; אין הרשאה עומדת | ב׳ |
| 3 | `deploy_on_request` v3, שורה 1 | ״כל push ל-main = פריסת Vercel, והמכסה החינמית מוגבלת (100 פריסות/יום)״ | שני קבצי `vercel.json` (שורש + `public-reading-deploy`): `git.deploymentEnabled=false`; פריסה = יצירה ידנית דרך Vercel MCP + Ignored Build Step; מיזוג אינו פורס (`CLAUDE.md` 73–84) | ב׳ |
| 4 | `deploy_on_request` v3, שורות 3–13 (v2: ״STANDING AUTO-RELEASE AUTHORIZATION״, סעיפים 1, 2, 4, 5, 8) | הרשאה עומדת; ״תעלה״ כ״override, not a required token״ | החלטתך 10.11 (ראו 10.0) | ב׳ |
| 5 | `deploy_on_request` שורה 11, `foundation_closure_protocol_law` שורה 96, `inter_agent_coordination_law` שורה 135 | ״major (production) cutover Legacy→2029״ כמילואת Human-Gate | המעבר בוצע; השמירה צריכה להיות על כל שינוי Production, לא על ״cutover״ | ב׳ |
| 6 | פונקציית DB `admin_suggestion_decide` | מפיקה טקסט: ״a release controller may classify AUTO_RELEASE_NOW under deploy_on_request v2״ | צרכן חי של המדיניות הישנה — תיקון דורש אישור DB נפרד (§10.8) | תלות |
| 7 | קודקס `branches_deploy`, שורות 8–9 וכותרת | ״main = production; Merge/push to main may create a production Vercel deployment״; ״Canonical owner: deploy_on_request v2״ | ראו שורה 3; הבעלים כיום v3 | ב׳ |
| 8 | קודקס `project_overview` | ״פריסה: רק ענף main נפרס לפרודקשן״; ״wp.sod1820.co.il (וורדפרס מקורי)״ | מיושן (שורה 3); בלי באנר STALE | א׳ |
| 9 | קודקס `publishing_conventions`, שורות 472, 476, 481–482, 413, 463 | ״מכבדים את היעד שנקבע (Legacy, 2029, או אחר)״; ״בדוק… ביעד שנתבקש, לרבות Legacy״; ״LEGACY MODIFIED DATE REQUIRED… Legacy Home fetchHomePosts״ | אין יעד Legacy; `fetchHomePosts` של Legacy נמחק. שורה 112 באותו מסמך אומרת במפורש ״אין מוצר Legacy פעיל״ — סתירה פנימית. ב־2029 `posts.modified` לבדו אינו אות לחידוש (V2 §8.1) | ב׳ |
| 10 | קודקס `gematria_engine`, שורה 53 | ״Legacy GematriaCalculator… remain compatibility/reference surfaces until cutover״ | הרכיבים נמחקו ב־#1239 | ב׳ (נמוך) |
| 11 | קודקס `_index` + 5 חוקי מותג + `sod1820_canonical_identity_law` | בעלים/נתב: `SOD1820_DESIGN_CONTRACT_V1.md`; בגוף החוק: ״EXTEND_EXISTING only under SOD1820_DESIGN_CONTRACT_V1.md״ | V1 מוכרז SUPERSEDED (V1:3); V2 ״2029 ACTIVE״ (OI:196) — ראו C2 | ב׳ |
| 12 | `SOD1820_DESIGN_CONTRACT_V2.md` שורות 22, 52, 104 | ״Legacy binary consumers may continue to read light/dark״; ״extends… `palette.js`… Legacy palettes remain intact״; ״do not alter… Legacy behavior״ | אין צרכני Legacy; `palette.js` נמחק (→ `paletteTokens2029.js`) | ב׳ |
| 13 | `docs/sod1820-system-frame-contract-v1.md:156` | ״preserving legacy launchers for everyone else… Never remove a legacy entry point…״ | כלל rollout מעברי שפג — אין launchers של Legacy | ב׳ |
| 14 | `docs/sod1820-system-frame-contract-v2-addendum.md:4, 22` | ״BRANCH ONLY UNTIL MERGED״ (הקובץ ב־main); ״Naming / product language owner = V1״ | באנר מיושן; סעיף Naming קיים רק ב־V1:92–100 — לטפל לפני סימון V1 כהיסטורי | ב׳ |
| 15 | `SOD1820_MASTER_ROADMAP.md:176` | ״the 22.10 Legacy lock and later explicit task restrictions govern this candidate״ (בתוך פסקה מסומנת היסטורית) | שארית ניסוח; `CLAUDE.md` 94–96: ״None of this is a current state or restriction״ | ב׳ (נמוך) |

### 10.5 נתונים היסטוריים שחייבים להישאר (אין לגעת)

| נתון | היקף (10.11) | למה נשאר |
|---|---|---|
| פוסטים מ־WordPress | 1,299 שורות עם `wp_id`; 1,177 עם `source='wordpress'` | זהות, SEO והפניות; כלל 5 ב־`CLAUDE.md` |
| ערכת עיצוב ישנה של פוסטים | 310 פוסטים עם `theme='legacy-dark'` + נכסי `legacy-dark-bg-post-*.webp` ב־`vercel.json` | הנכסים בשימוש חי ב־`postBackground2029.js` וב־`community2029.css`; ערך `theme` נשאר נתון בפוסט — אינו קוד Legacy |
| גלריות ותמונות | `gallery_images` 2,566 (2,152 ממיגרציית Huge-IT, עם `wp_gallery_id` / `wp_image_id`); `galleries.wp_gallery_id` | מדיה והיסטוריית מקור |
| הפניות ו־SEO | `redirect_map.wp_id`, `post_share_counts.wp_id`, `comments.wp_id` | המשכיות כתובות (Doc37 §12.29–12.30, 12.46–12.47) |
| טבלאות גיבוי | `posts_content_backup`, `posts_image_backup`, `posts_img_backup`, `posts_seo_backup`, `posts_deleted_backup_20260614`, `_post_backup_20260615`, `post_content_backup`, `gallery_junk_backup`, `image_dedup_backup`, `project_codex_backup_20260820` | מנגנון שחזור |
| תעבורה היסטורית ומזהים | `legacy_traffic` 5,309 שורות; `ti_demand_signals.legacy_human_visits`; `identity_edges.legacy_id` | נתוני ארכיון (כלל 5: ״שם שמכיל legacy אינו הוכחה לקוד Legacy״) |
| מודל מספרי־אם | `number_roots` 15 · `number_branches` 36 — נקראים ע״י `fn_number_journey`, `fn_metatron_scan` | צרכן חי ב־DB |
| דיווחי רמזים | `community_hints` 3 — `ReportHint.jsx`, `community.js`, `ai-analyze` | צרכן חי |
| היסטוריית חוקים | 184 `rule_id` לא־פעילים + 18 שורות בלי `rule_id` + כל גרסאות הפעילים | העדפתך: ביטול פעילות, לא מחיקה; `_index`: ״מנוהלי־גרסאות, לא נמחקים״ |
| נתיבי אחסון היסטוריים | `gallery/sod1820/videos`, `media/uploads/*`, `gallery/posts/*` ועוד | `_index`: אין להזיז/לשנות שם/למלא־לאחור ללא שער מיגרציה |

### 10.6 טבלאות החלטה

**סימון המלצה:** **א׳** ביטול פעילות · **ב׳** עדכון סעיפים בחוזה משותף · **ג׳** השארה. ״שימוש פעיל״ מבוסס על הפניה לפי מזהה בקבצים (לא על מספר שורות); ״היה N״ = מספר קבצי `src`+`api` שהפנו לפני #1239.

#### 10.6.1 רשומות spec (10)

| # | spec | v | סיווג | שימוש פעיל | תלות | המלצה | סיכון / הערה |
|---|---|---|---|---|---|---|---|
| 1 | `site_menu` | 1 | Legacy בלבד | **אפס**: קוד, Edge, CI, בדיקות, מסמכי סוכנים, חוזים, DB-fn, תצוגות, קשתות — גם לפני #1239 | אין (`depends_on` ריק; אין קשתות) | **א׳** | נמוך — תפריט עליון סופי של האתר הישן; תפריט 2029 בבעלות SystemFrame / Design V2 (Global Rail) |
| 2 | `site_home_layout` | 1 | Legacy בלבד | **אפס**: קוד, Edge, CI, בדיקות, מסמכי סוכנים, חוזים, DB-fn, תצוגות, קשתות — גם לפני #1239 | אין (`depends_on` ריק; אין קשתות) | **א׳** | נמוך — פריסת בית ישנה (ציר שמאל / תוכן במרכז); הבית ב־2029 מוגדר ב־Doc37 (CONTENT-AUDIENCES-HYBRID-NOW) |
| 3 | `beit_hamidrash` | 1 | Legacy בלבד | **אפס**: קוד, Edge, CI, בדיקות, מסמכי סוכנים, חוזים, DB-fn, תצוגות, קשתות — גם לפני #1239 | אין (`depends_on` ריק; אין קשתות) | **א׳** | נמוך — Mega Menu של בית המדרש; מעבר בית המדרש ל־2029 מוגדר ב־Doc37 (DEC-MIDRASH-CROSSWALK); השם חי ב־21 קבצי 2029 תחת בעלים אחרים |
| 4 | `bnei_haheichal` | 1 | Legacy בלבד | **אפס**: קוד, Edge, CI, בדיקות, מסמכי סוכנים, חוזים, DB-fn, תצוגות, קשתות — גם לפני #1239 | אין (`depends_on` ריק; אין קשתות) | **א׳ (מותנה)** | בינוני — דף מנויים סגור (space=private). ״בני ההיכל״ חי כשם מוצר ב־`SubscribeGate.jsx` (״זה לא אזור המנויים בתשלום״) וב־`marketing.js`, ומוגדר רק כאן וב־`number_page_law`. **תנאי:** אישור שהמושג מוחזק ב־`platform_tiers_law` / Doc37 |
| 5 | `codes_els_page` | 1 | Legacy בלבד | **אפס**: קוד, Edge, CI, בדיקות, מסמכי סוכנים, חוזים, DB-fn, תצוגות, קשתות — גם לפני #1239 | אין (`depends_on` ריק; אין קשתות) | **א׳** | נמוך — דף ״הצופן התנ״כי״ הישן; ב־2029 דף הצופן בבעלות `els_research_layer_law` (Els2029Page) |
| 6 | `live_activity_bar` | 1 | Legacy בלבד | **אפס**: קוד, Edge, CI, בדיקות, מסמכי סוכנים, חוזים, DB-fn, תצוגות, קשתות — גם לפני #1239 | אין (`depends_on` ריק; אין קשתות) | **א׳** | נמוך — שורת פעילות עליונה; ״עכשיו״/טיקר ב־2029 מוגדרים ב־Doc37 / SystemFrame |
| 7 | `archive_revelation` | 1 | Legacy בלבד | **אפס**: קוד, Edge, CI, בדיקות, מסמכי סוכנים, חוזים, DB-fn, תצוגות, קשתות — גם לפני #1239 | אין (`depends_on` ריק; אין קשתות) | **א׳** | נמוך — דף ארכיון ההתגלות הישן; Gallery2029Page קיים (השם מופיע בקובץ אחד) |
| 8 | `timeline_feature_build` | 1 | Legacy בלבד | **אפס**: קוד, Edge, CI, בדיקות, מסמכי סוכנים, חוזים, DB-fn, תצוגות, קשתות — גם לפני #1239 | אין (`depends_on` ריק; אין קשתות) | **א׳** | נמוך — רכיב React של ציר הזמן (#0a0a0f, Segoe UI, `post_update_on_top`, `legacy_traffic`); עקרונות התאריך (תאריך אמיתי; הופעה ראשונה = מקור) מוחזקים ב־Doc37 / `reality_stream_law`; הטבלה `legacy_traffic` (5,309 שורות) נשמרת |
| 9 | `image_boost_mechanism` | 1 | היסטורי | **אפס**: קוד, Edge, CI, בדיקות, מסמכי סוכנים, חוזים, DB-fn, תצוגות, קשתות — גם לפני #1239 | אין (`depends_on` ריק; אין קשתות) | **א׳** | נמוך — אמירת צורך; ״boost״ מומש כעמודות `importance` / `curator_hidden` ב־`gallery_images` |
| 10 | `site_master_plan` | 1 | היסטורי | **אפס**: קוד, Edge, CI, בדיקות, מסמכי סוכנים, חוזים, DB-fn, תצוגות, קשתות — גם לפני #1239 | אין (`depends_on` ריק; אין קשתות) | **א׳** | נמוך — חזון ותוכנית מ־11.6 (״התוכנית המלאה לשימור״); הוחלפו ב־Roadmap / Doc37 |

#### 10.6.2 חוקים פעילים (87)

| # | חוק | v | סיווג | שימוש פעיל (HEAD) | תלות (נכנסות · ילדים · יוצאות) | המלצה | סיכון / הערה |
|---|---|---|---|---|---|---|---|
| 1 | `platform_tiers_law` | 5 | 2029 | קוד 2 (היה 4) · Edge 10 · DB-fn 1 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 3 | 1 · 1 · 3 | **ב׳ — עדכון סעיפים** | בינוני — (מותנה בא׳) הוספת שורת עיקרון ״המספר לא מוסתר — העומק כן״ מ־number_page_law |
| 2 | `unified_credit_system` | 1 | משותף | קוד 0 · Edge 1 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך — החלטת מוצר דחויה (G5); אין קוד/טבלת קרדיטים; CreditsBuyPage נמחק — הכרעת צוריאל, לא ביטול |
| 3 | `inter_agent_coordination_law` | 17 | משותף | קוד 0 · Edge 2 · DB-fn 3 · בדיקות/סקריפטים 3 · CI 0 · סוכנים 6 | 1 · 0 · 1 | **ב׳ — עדכון סעיפים** | גבוה — v18: סעיפים 75–80 → היסטורי (2029=Production); 81–82 → אישור מפורש; 86; 139; תווית v16 |
| 4 | `brand_spelling_law` | 1 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 1 · 0 · 0 | **ב׳ — עדכון סעיפים** | נמוך — בעלים V1→V2; (אופציונלי) שמות רכיבים שנמחקו |
| 5 | `canonical_colors_law` | 2 | 2029 | קוד 2 (היה 3) · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 3 · 0 · 0 | **ב׳ — עדכון סעיפים** | נמוך — בעלים V1→V2; פריט 5 (״legacy נשאר עד redesign״) |
| 6 | `logo_integrity_law` | 3 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 3 | **ב׳ — עדכון סעיפים** | נמוך — בעלים V1→V2; סעיף 9 (Heritage / legacy runtime) |
| 7 | `sod1820_canonical_identity_law` | 5 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 2 · 0 · 5 | **ב׳ — עדכון סעיפים** | נמוך — בעלים V1→V2; הטקסט ״under V1״; depends_on על ה־md |
| 8 | `worlds_color_law` | 1 | משותף | קוד 1 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | **ב׳ — עדכון סעיפים** | נמוך — בעלים V1→V2 (יש צרכן חי: NumberCore2029) |
| 9 | `els_research_layer_law` | 9 | 2029 | קוד 3 (היה 4) · Edge 2 · DB-fn 6 · בדיקות/סקריפטים 2 · CI 0 · סוכנים 2 | 1 · 3 · 5 | **ב׳ — עדכון סעיפים** | נמוך — ניסוח ״legacy/classic renderer״ (הנכס חי) |
| 10 | `els_seed_expansion_law` | 1 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 11 | `els_single_engine_law` | 2 | 2029 | קוד 6 (היה 7) · Edge 2 · DB-fn 1 · בדיקות/סקריפטים 1 · CI 0 · סוכנים 1 | 0 · 0 · 1 | **ב׳ — עדכון סעיפים** | נמוך — ניסוח ״tzofen.html legacy consumer״ (הנכס חי כ־TzofenEmbed) |
| 12 | `testimony_not_prophecy` | 1 | 2029 | קוד 0 (היה 1) · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 13 | `experience_governance_foundation_v1_law` | 10 | 2029 | קוד 5 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 5 · CI 0 · סוכנים 2 | 6 · 2 · 7 | **ב׳ — עדכון סעיפים** | בינוני — שורות 7,9,11: BrandTicker/Marquee/Navbar כהיסטוריה (שומרים את סעיפי ה־cutover כשער למשטחים) |
| 14 | `canonical_ui_components_law` | 12 | 2029 | קוד 6 (היה 19) · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 2 · CI 0 · סוכנים 2 | 0 · 0 · 4 | **ב׳ — עדכון סעיפים** | בינוני — שורות 4,10,26,54,81: רכיבים שנמחקו (DimensionFiveBadge/VideoBadge/TopicPage) וסעיפי ״Legacy migrates…״ |
| 15 | `mobile_acceptance_law` | 1 | 2029 | קוד 1 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 16 | `foundation_closure_protocol_law` | 7 | משותף | קוד 0 · Edge 0 · DB-fn 4 · בדיקות/סקריפטים 1 · CI 0 · סוכנים 2 | 0 · 0 · 0 | **ב׳ — עדכון סעיפים** | נמוך — שורה 96: ״major Legacy→2029 production cutover״ → ניסוח Production |
| 17 | `canonical_methods_registry_law` | 6 | 2029 | קוד 3 (היה 5) · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 1 · CI 0 · סוכנים 1 | 4 · 1 · 0 | **ב׳ — עדכון סעיפים** | נמוך — שורה 26: LeadOrderEditor (נמחק; ה־RPC admin_set_lead_ranks חי) |
| 18 | `engine_governance_registry_authority_law` | 1 | 2029 | קוד 0 (היה 1) · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 1 · 0 · 5 | ג׳ — ללא שינוי | נמוך |
| 19 | `gematria_auto_registry_law` | 2 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 4 | ג׳ — ללא שינוי | נמוך |
| 20 | `gematria_db_first_and_enrich_law` | 3 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 21 | `gematria_engine_law` | 2 | 2029 | קוד 8 (היה 16) · Edge 3 · DB-fn 0 · בדיקות/סקריפטים 1 · CI 0 · סוכנים 1 | 3 · 0 · 4 | ג׳ — ללא שינוי | נמוך |
| 22 | `method_lifecycle` | 2 | 2029 | קוד 0 · Edge 0 · DB-fn 1 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 1 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 23 | `method_priority` | 1 | 2029 | קוד 0 · Edge 1 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 1 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 24 | `no_kolel_no_additions` | 1 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 25 | `deploy_on_request` | 3 | משותף | קוד 0 · Edge 2 · DB-fn 1 · בדיקות/סקריפטים 5 · CI 1 · סוכנים 3 | 1 · 0 · 0 | **ב׳ — עדכון סעיפים** | גבוה — v4: להסיר הרשאה עומדת (שורות 3,5,6,8,9,12); לתקן ״push=פריסה״ (1) ו־cutover (11); לשמור שער canary (17–23) |
| 26 | `live_state_sync_law` | 1 | משותף | קוד 1 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 1 · CI 0 · סוכנים 1 | 0 · 1 · 0 | ג׳ — ללא שינוי | נמוך |
| 27 | `work_log_authority_law` | 2 | משותף | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 28 | `live_state_resolution_law` | 3 | משותף | קוד 0 · Edge 1 · DB-fn 1 · בדיקות/סקריפטים 2 · CI 0 · סוכנים 1 | 1 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 29 | `content_translation_law` | 4 | 2029 | קוד 2 (היה 3) · Edge 2 · DB-fn 1 · בדיקות/סקריפטים 1 · CI 0 · סוכנים 2 | 6 · 1 · 3 | ג׳ — ללא שינוי | נמוך |
| 30 | `video_transcription_law` | 1 | 2029 | קוד 0 (היה 4) · Edge 2 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 0 · 0 · 1 | **ב׳ — עדכון סעיפים** | נמוך — רכיבי VideoGallery/VideoTranscript שנמחקו |
| 31 | `big_number` | 1 | משותף | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 1 | ג׳ — ללא שינוי | נמוך — צרכנים ב־DB: fn_number_journey, fn_metatron_scan קוראות number_roots (15) / number_branches (36); אין קוד בצד לקוח |
| 32 | `decimal_point_join_law` | 1 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 2 | ג׳ — ללא שינוי | נמוך |
| 33 | `moment_clock_law` | 2 | 2029 | קוד 6 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 1 · CI 0 · סוכנים 0 | 0 · 0 · 6 | ג׳ — ללא שינוי | נמוך — צרכן חי 2029: numberSystemMethods.js |
| 34 | `no_row_without_number_law` | 1 | Legacy בלבד | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | **א׳ — ביטול פעילות** (מותנה; עודכן ב־§10.10.4, היה ב׳) | נמוך–בינוני — נוצר 7.7 ולא שונה; נימוק G3 (30.9): `not a universal 2029 truth invariant`; הרכיב היחיד שמוזכר (TopicPage) נמחק ב־#1239. **תנאי:** אישורך שהעיקרון ״ערך גימטרי ליד כל ביטוי״ אינו נדרש כחוק עומד, או העברת שורה אחת לבעלים של הצגה מספרית |
| 35 | `number_page_law` | 1 | Legacy בלבד | קוד 0 (היה 1) · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | **א׳ — ביטול פעילות** (מותנה) | בינוני — לא נמצא צרכן בקוד/DB/CI (ב־#1239 הוסרו הרמזים ״✦ מספר יסוד״); נשען על `subscribe_gate_law` (פרש) ועל ״בני ההיכל״. **תנאי:** עיקרון ״המספר לא מוסתר, העומק כן״ מופיע רק כאן ובשורת קודקס `number_page_1820` — להעביר שורה אחת ל־`platform_tiers_law` (ב׳) או לאשר ויתור |
| 36 | `root_exception` | 1 | משותף | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 1 | ג׳ — ללא שינוי | נמוך — אותה משפחה כמו big_number |
| 37 | `shitat_haechad_alef_law` | 1 | 2029 | קוד 8 · Edge 2 · DB-fn 0 · בדיקות/סקריפטים 4 · CI 0 · סוכנים 0 | 0 · 0 · 2 | ג׳ — ללא שינוי | נמוך — צרכן חי 2029: numberSystemMethods.js |
| 38 | `zero_navigation` | 1 | 2029 | קוד 6 · Edge 0 · DB-fn 2 · בדיקות/סקריפטים 1 · CI 0 · סוכנים 0 | 1 · 0 · 0 | ג׳ — ללא שינוי | נמוך — צרכן חי 2029: numberSystemMethods.js + fn_zero_navigation |
| 39 | `zero_scale_law` | 1 | 2029 | קוד 13 (היה 17) · Edge 0 · DB-fn 1 · בדיקות/סקריפטים 3 · CI 0 · סוכנים 0 | 1 · 0 · 0 | ג׳ — ללא שינוי | נמוך — צרכן חי 2029: numberSystemMethods.js + fn_zero_scale |
| 40 | `person_foundation_contract_law` | 6 | 2029 | קוד 2 · Edge 0 · DB-fn 3 · בדיקות/סקריפטים 3 · CI 0 · סוכנים 3 | 1 · 4 · 3 | ג׳ — ללא שינוי | נמוך |
| 41 | `identity_architecture_law` | 1 | 2029 | קוד 3 (היה 9) · Edge 0 · DB-fn 1 · בדיקות/סקריפטים 2 · CI 0 · סוכנים 0 | 0 · 0 · 0 | **ב׳ — עדכון סעיפים** | נמוך — שורה 20 (טאב AdminPage) ו״הפיצ׳ר הראשון לבנות״ → היסטורי (הרעיון חי: community_hints) |
| 42 | `auto_share_uses_live_post_law` | 1 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך — RPC social_share_post קיים ב־DB |
| 43 | `legacy_content_protocol` | 2 | משותף | קוד 3 (היה 4) · Edge 0 · DB-fn 1 · בדיקות/סקריפטים 2 · CI 0 · סוכנים 3 | 0 · 0 · 1 | ג׳ — ללא שינוי | נמוך — משותף: מצהיר על עצמו ״היסטורי, לפי דרישה״; 3 צרכנים חיים (cleanName/‏.sod-post-content ב־Lightbox, galleryName.js, TopicConvergenceContent; פונקציית מלאי DB; CLAUDE.md §8 / OI:181) |
| 44 | `post_og_image_law` | 1 | 2029 | קוד 0 · Edge 1 · DB-fn 0 · בדיקות/סקריפטים 1 · CI 0 · סוכנים 0 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך — צרכן חי: api/og.js (waSafeImage) |
| 45 | `post_system_voice_law` | 1 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 1 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 46 | `preserve_linked_row` | 1 | משותף | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך — שימור נתונים (gematria_words ↔ post_gematria_links); מחיקת כפילויות בלבד |
| 47 | `raziel_companion_layer_law` | 3 | 2029 | קוד 2 (היה 3) · Edge 3 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 3 | 4 · 7 · 2 | ג׳ — ללא שינוי | נמוך |
| 48 | `bot_delivery_law` | 1 | משותף | קוד 0 · Edge 3 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך — צרכנים חיים: Edge wa-* (3 קבצים) |
| 49 | `raziel_full_answer_and_route_law` | 3 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 0 · 0 · 5 | ג׳ — ללא שינוי | נמוך |
| 50 | `raziel_group_privacy_law` | 1 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 1 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 51 | `raziel_response_contract` | 1 | 2029 | קוד 1 (היה 2) · Edge 1 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 0 · 0 · 0 | **ב׳ — עדכון סעיפים** | נמוך — שורה 21: <AskRaziel> (נמחק) |
| 52 | `raziel_routing_law` | 2 | 2029 | קוד 1 · Edge 2 · DB-fn 1 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 2 · 0 · 7 | ג׳ — ללא שינוי | נמוך |
| 53 | `raziel_voice_law` | 1 | 2029 | קוד 0 (היה 1) · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 2 · 0 · 0 | **ב׳ — עדכון סעיפים** | נמוך — שורה 16: <AskRaziel> (נמחק) |
| 54 | `raziel_whatsapp_access_adapter_law` | 1 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 1 | ג׳ — ללא שינוי | נמוך |
| 55 | `reality_graph_law` | 8 | 2029 | קוד 8 · Edge 2 · DB-fn 1 · בדיקות/סקריפטים 2 · CI 0 · סוכנים 2 | 7 · 4 · 0 | ג׳ — ללא שינוי | נמוך |
| 56 | `convergence_blocklist_law` | 1 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 57 | `cross_vs_convergence_criteria` | 4 | 2029 | קוד 1 · Edge 0 · DB-fn 1 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 1 · 0 · 6 | ג׳ — ללא שינוי | נמוך |
| 58 | `master_anchor_1820_law` | 1 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 59 | `reality_stream_law` | 1 | 2029 | קוד 1 (היה 2) · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 0 · 0 · 0 | **ב׳ — עדכון סעיפים** | נמוך — RealityWorld/Stream/Pulse ו־LatestUpdatesRail שנמחקו (reality.js חי) |
| 60 | `research_gold_hints_law` | 4 | 2029 | קוד 4 (היה 5) · Edge 0 · DB-fn 1 · בדיקות/סקריפטים 1 · CI 0 · סוכנים 1 | 1 · 0 · 9 | ג׳ — ללא שינוי | נמוך |
| 61 | `ktiv_male_haser_repair_law` | 2 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 62 | `unified_tags_law` | 1 | משותף | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | **ב׳ — עדכון סעיפים** | בינוני — סעיף העיצוב (כחול/פינה שמאלית) מול V2; פער post_tags שלא נבנה — הכרעת צוריאל |
| 63 | `research_intake_foundation_contract_law` | 13 | 2029 | קוד 6 · Edge 1 · DB-fn 1 · בדיקות/סקריפטים 3 · CI 0 · סוכנים 3 | 8 · 8 · 2 | ג׳ — ללא שינוי | נמוך |
| 64 | `corpus_admission_foundation_v1` | 1 | 2029 | קוד 0 · Edge 1 · DB-fn 1 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 1 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 65 | `raw_vs_curated` | 1 | משותף | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך — עיקרון שימור: raw לא נמחק |
| 66 | `shared_expression_extraction_contract_v1` | 1 | 2029 | קוד 0 · Edge 1 · DB-fn 0 · בדיקות/סקריפטים 1 · CI 0 · סוכנים 1 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 67 | `source_video_publish_law` | 1 | 2029 | קוד 0 · Edge 1 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 68 | `word_approval_required_law` | 1 | משותף | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | ג׳ — ללא שינוי, **בהמתנה להכרעה** (תוקן ב־§10.10.4) | בינוני — אין קורא לעטיפה `adminReviewWord` ב־HEAD (הקורא היחיד, `LanguageEngineTab.jsx`, נמחק ב־#1239); נשארו RPC `wa_word_review` (אין פונקציית DB קוראת), ברירת מחדל `gematria_words.is_verified=false` ו־2,894 מילים ממתינות. אין כיום ממשק אישור — הכרעה: לספוג ל־Corpus Admission ולפרוש, או לבנות מסלול אישור ב־2029 |
| 69 | `writer_material_home_law` | 6 | 2029 | קוד 0 (היה 1) · Edge 0 · DB-fn 1 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 2 | 0 · 0 · 4 | ג׳ — ללא שינוי | נמוך |
| 70 | `research_strategy_layer_law` | 17 | 2029 | קוד 18 · Edge 3 · DB-fn 1 · בדיקות/סקריפטים 5 · CI 0 · סוכנים 3 | 10 · 0 · 5 | ג׳ — ללא שינוי | נמוך |
| 71 | `research_workspace_law` | 5 | 2029 | קוד 6 (היה 23) · Edge 2 · DB-fn 1 · בדיקות/סקריפטים 3 · CI 0 · סוכנים 2 | 4 · 1 · 3 | ג׳ — ללא שינוי | נמוך |
| 72 | `research_object_identity_invariant_law` | 2 | 2029 | קוד 1 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 0 · 0 · 3 | ג׳ — ללא שינוי | נמוך |
| 73 | `workspace_layout_standard` | 2 | 2029 | קוד 0 (היה 1) · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 0 · 0 · 1 | ג׳ — ללא שינוי | נמוך |
| 74 | `cross_reference_is_not_disclosure` | 1 | משותף | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 75 | `graph_privacy_foundation_law` | 1 | משותף | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 1 · CI 0 · סוכנים 0 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 76 | `zuriel_surname_privacy_law` | 1 | משותף | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 0 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 77 | `site_flags_lock_law` | 3 | 2029 | קוד 4 (היה 7) · Edge 4 · DB-fn 1 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 2 | 3 · 0 · 1 | ג׳ — ללא שינוי | נמוך |
| 78 | `subscription_funnel_law` | 22 | 2029 | קוד 5 (היה 9) · Edge 0 · DB-fn 1 · בדיקות/סקריפטים 3 · CI 0 · סוכנים 3 | 0 · 0 · 0 | **ב׳ — עדכון סעיפים** | בינוני — שורות 12,52,77,85,138,152,154,207,212: UserCenter/CollectiveBadge/JoinPage/ProfilePage/RecentSearches/SubmitChidush/Navbar שנמחקו; SubscribeGate נשאר |
| 79 | `system_suggestions_law` | 5 | 2029 | קוד 6 (היה 7) · Edge 9 · DB-fn 3 · בדיקות/סקריפטים 2 · CI 0 · סוכנים 3 | 3 · 1 · 6 | **ב׳ — עדכון סעיפים** | נמוך — SystemSuggestionsTab (נמחק) |
| 80 | `ai_analyze_contract` | 2 | 2029 | קוד 2 (היה 3) · Edge 3 · DB-fn 1 · בדיקות/סקריפטים 1 · CI 0 · סוכנים 1 | 5 · 0 · 2 | ג׳ — ללא שינוי | נמוך |
| 81 | `israel_time_law` | 1 | משותף | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 1 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 82 | `relative_time_display_law` | 4 | 2029 | קוד 1 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 0 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 83 | `traffic_intelligence_law` | 11 | 2029 | קוד 3 (היה 4) · Edge 1 · DB-fn 4 · בדיקות/סקריפטים 1 · CI 0 · סוכנים 1 | 2 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 84 | `truth_axes_foundation_law` | 3 | 2029 | קוד 11 (היה 12) · Edge 1 · DB-fn 1 · בדיקות/סקריפטים 4 · CI 0 · סוכנים 1 | 13 · 5 · 7 | ג׳ — ללא שינוי | נמוך |
| 85 | `golden_entity_law` | 4 | 2029 | קוד 3 (היה 4) · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 1 · 0 · 3 | ג׳ — ללא שינוי | נמוך |
| 86 | `signal_vs_curation` | 2 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 2 · 0 · 0 | ג׳ — ללא שינוי | נמוך |
| 87 | `verify_seal_manual_only` | 3 | 2029 | קוד 0 · Edge 0 · DB-fn 0 · בדיקות/סקריפטים 0 · CI 0 · סוכנים 1 | 1 · 0 · 0 | ג׳ — ללא שינוי | נמוך |

#### 10.6.3 שורות `project_codex` (35)

| id | שורת קודקס | סיווג | עודכן | ממצא / שימוש | המלצה |
|---|---|---|---|---|---|
| 1 | `_index` | משותף (נתב) | 17.9 | מנתב לעיצוב אל V1 (SUPERSEDED), ל־`unified_graph_law` ול־`subscribe_gate_law` (פרשו); חסר מעמד Doc37 | **ב׳** |
| 2 | `project_overview` | היסטורי | 14.6 | ״React 18+Vite; רק main נפרס לפרודקשן; wp.sod1820.co.il״ — בלי באנר STALE (priority 1) | **א׳ (באנר STALE)** |
| 3 | `data_model_map` | היסטורי | 14.6 | מפת טבלאות מ־14.6 (״~1181 פוסטים״; כיום 1,320) — בלי באנר STALE (priority 1) | **א׳ (באנר STALE)** |
| 4 | `publishing_conventions` | משותף (בעלים של 19 חוקים) | 10.11 11:45 | שורות 472, 476, 481–482, 413, 463 מציגות Legacy כיעד פרסום/אימות — בסתירה לשורה 112 (״אין מוצר Legacy פעיל״); שורות 109–112, 521, 525 כבר מעודכנות | **ב׳** |
| 5 | `gematria_engine` | 2029 | 24.9 | שורה 53: ״Legacy GematriaCalculator… until cutover״ (הרכיבים נמחקו) | **ב׳ (נמוך)** |
| 6 | `entity_layer` | היסטורי | 20.8 | כבר ״⚠️ STALE״ | ג׳ |
| 7 | `cross_method` | Legacy בלבד | 20.8 | דף /cross הישן; כבר ״⚠️ STALE״ | ג׳ |
| 8 | `system_rules_index` | היסטורי | 14.6 | רשימת חוקים ״שמומשו בקוד״ עם VerifiedBadge.jsx / InsightCard.jsx (נמחקו) ו־`subscribe_gate_law` (פרש) — בלי באנר | **א׳ (באנר STALE)** |
| 9 | `branches_deploy` | משותף (תפעול) | 23.9 | ״main = production; Merge/push to main may create a production Vercel deployment״ + רשימת `git.deploymentEnabled` לפי ענפים + ״Canonical owner: deploy_on_request v2״ — מול `vercel.json` (שני השורשים: `false` גלובלי) ומול נוהל הפריסה הידני | **ב׳ (גבוה)** |
| 10 | `session_2026_06_14` | היסטורי | 20.8 | סיכום סשן; כבר STALE | ג׳ |
| 11 | `roadmap_open_threads` | משותף (מצביע) | 20.8 | ״שורה זו אינה מקור־אמת״ | ג׳ |
| 12 | `golden_entities` | 2029 | 23.9 | אזכורי GematriaCalculator / GematriaCalculator3D / goldTier (נמחקו) | **ב׳ (נמוך)** |
| 13 | `number_page_1820` | Legacy בלבד | 14.6 | תאום של `number_page_law` (priority 1), בלי STALE | **א׳ (באנר STALE, יחד עם החוק)** |
| 15 | `convergence_law` | 2029 | 20.9 | ״★ קרא לפני כל עבודה״ — מזכיר BeitMidrashPage / CrossMethodPage / LiveActivityBar / TopicPage / EntityPage (נמחקו) | **ב׳** |
| 16 | `growth_os_vision` | משותף (עסקי) | 22.6 | חזון Meta/CAPI — לא תלוי ב־Legacy | ג׳ |
| 17 | `reality_stream_law` | 2029 (תאום) | 23.6 | עותק של החוק; יטופל יחד איתו | ג׳ |
| 18 | `reality_graph_law` | 2029 | 31.10 | חוק־העל; סעיפי Human-Gate 23.9–31.10 (ראו G1) | ג׳ |
| 19 | `raziel_mind_architecture` | 2029 | 23.9 | — | ג׳ |
| 20 | `traffic_intelligence_law` | 2029 (תאום ישן) | 26.8 | ישן מגרסת החוק v11 (27.9) — ראו O2 | ג׳ |
| 21 | `sod1820-master-architecture-draft` | היסטורי | 17.8 | מסומן ״DRAFT… אינה מחייבת״ | ג׳ |
| 22 | `research_intake_foundation_contract` | 2029 | 24.9 | 9 אזכורי legacy = נתונים/פרובננס; GematriaCube / Gematria3DPage בהקשר היסטורי | ג׳ |
| 24 | `person_foundation_contract` | 2029 | 25.9 | שורה 239 כבר קובעת: Legacy = מקור היסטורי בלבד | ג׳ |
| 25 | `shared_expression_extraction_v1` | 2029 | 26.8 | — | ג׳ |
| 26 | `corpus_admission_foundation_v1` | 2029 | 26.8 | — | ג׳ |
| 27 | `spatial_research_runtime_vision_v1` | 2029 (חזון) | 4.10 | — | ג׳ |
| 28 | `foundation_closure_protocol_v1` | 2029 (תאום ישן) | 24.9 | ישן מגרסת החוק v7 (29.9) | ג׳ |
| 30 | `experience_governance_foundation_v1` | 2029 | 16.10 | BrandTicker / Marquee / Navbar / ContributorPage / WelcomePage / themeMode (נמחקו) | **ב׳** |
| 31 | `truth_axes_foundation_v1` | 2029 | 8.9 | — | ג׳ |
| 32 | `numeric_rule_family_index` | משותף | 13.9 | אינדקס 9 חוקי המספרים (בעלים־קודקס) | ג׳ |
| 33 | `public_language_revelation_geula_law` | 2029 | 18.10 | — | ג׳ |
| 34 | `people_standing_calibration_v0` | 2029 | 25.9 | 3 אזכורי legacy = נתונים | ג׳ |
| 35 | `canonical_logo_v2_asset_pointer` | 2029 | 3.10 | — | ג׳ |
| 36 | `sod1820_motion_identity_master_v1` | 2029 | 4.10 | — | ג׳ |
| 37 | `sod1820_reality_stream_os_master_v3_20261016_draft (Doc37)` | 2029 (רישום החלטות, DRAFT) | 10.11 11:13 | 243 אזכורי Legacy = היסטוריה מתוארכת; סעיף 1 קובע: ״אין מערכת Legacy פעילה… אזכורי Legacy בהמשך הם היסטוריית מעבר בלבד״ | ג׳ |
| 38 | `session_2026_10_18_ai_control_reconciliation` | היסטורי | 18.10 | סיכום סשן (רשומה מתוארכת) | ג׳ |

#### 10.6.4 מסמכי md ו־CI

| קובץ / רכיב | ממצא | המלצה |
|---|---|---|
| `SOD1820_DESIGN_CONTRACT_V2.md` (4, 22, 52, 104) | כותרת ״experience_governance… v9״ (כיום v10); שלוש שורות המניחות Legacy חי / `palette.js` | **ב׳** — עדכון שורות; לשמור את הנעיצות שבבדיקת smoke |
| `docs/sod1820-system-frame-contract-v1.md` (156) | כלל rollout של launchers ישנים | **ב׳** |
| `docs/sod1820-system-frame-contract-v2-addendum.md` (4, 22) | באנר ״BRANCH ONLY״ מיושן; Naming owner = V1 | **ב׳** (שורה 22 אחרי הכרעה על מיקום Naming) |
| `SOD1820_MASTER_ROADMAP.md` (176) | שארית ״Legacy lock״ בפסקה היסטורית | **ב׳** (נמוך) |
| `SOD1820_MASTER_OWNER_INDEX.md` (6) | תאריך 2026-10-01 מיושן | **ב׳** (נמוך) |
| `SOD1820_CONTENT_FOUNDATION_CONTRACT.md` (5, 9, 183) | ״ענף־בלבד · לא־מוזג״ — הקובץ ב־main | **ב׳** (נמוך) |
| `docs/research-studio-v1-contract.md` (10–11) | הפניה ל־Master State §20 שאינו קיים; `convergence_one_per_value` כ״locked״ (בארכיון) | **ב׳** (נמוך) |
| `SOD1820_DESIGN_CONTRACT_V1.md` | כבר ״SUPERSEDED״; הבאנר נעוץ בבדיקת smoke; מכיל את Naming law היחיד | **ג׳** — לא לגעת |
| `CLAUDE.md`, `AGENTS.md`, `AGENT_HANDOFF.md` | כבר מעודכנים (בלוק ״Legacy פרש״); `CLAUDE.md:64` מצטט את `deploy_on_request` כמקור לאישור מפורש — יתיישר אחרי ב׳-1 | **ג׳** |
| `.github/workflows/legacy-production-lock.yml` + `scripts/test-legacy-retired.mjs` | שער ״Legacy פרש״; השם נשמר בכוונה (שמות בדיקות נדרשות) | **ג׳** |
| `.github/workflows/2029-isolation-gate.yml:146, 202` | שמות צעדים ״Legacy/2029 boundary״, ״Legacy-host adapter״ — קוסמטי | **ג׳** (שינוי שם עלול לשבור בדיקה נדרשת) |
| `vercel.json` — נכסי `legacy-dark-bg-post-*` | נכסי רקע בשימוש חי (`postBackground2029.js`, `community2029.css`) | **ג׳** |

### 10.7 הרשימה המדויקת לאישור

> **עדכון 11.11 (§11):** ההכרעות ד1–ד6 משנות את הרשימות. א׳: 9 רשומות spec (״בני ההיכל״ הוחרג לפי ד3); `number_page_law` ו־`no_row_without_number_law` רק בשלב 3, אחרי שהעקרונות הועברו ואומתו (ד1/ד4); 4 שורות הקודקס מקבלות באנר STALE ונשארות. ב׳: 9 חוקים מתוך 49 המוקפאים (ד5) לא נכללו; `unified_tags_law` מוחזק (G5, PR #1296). ג׳: `word_approval_required_law` נשאר עד שהחלופה תוכח (ד2). הקבצים והגרסאות: §11.4; הרשימות המעודכנות: §11.10.

#### א׳ — ביטול פעילות (16 פריטים; עודכן ב־§10.10)

*ביצוע מוצע: `is_active=false` בלבד (UPDATE), בלי מחיקה; כל הגרסאות והמטא־דאטה נשארים ב־`nodes`; ל־`project_codex` (שאין בו `is_active`) — שורת באנר ״⚠️ STALE / HISTORICAL״ במנגנון הקיים ב־`_index`.*

**א1 — `nodes` `type='spec'` (10)**, כולם v1, אפס צרכנים: `site_menu`, `site_home_layout`, `beit_hamidrash`, `codes_els_page`, `live_activity_bar`, `archive_revelation`, `timeline_feature_build`, `image_boost_mechanism`, `site_master_plan` — **ו־`bnei_haheichal`** (מותנה: אישור שמושג אזור המנויים מוחזק ב־`platform_tiers_law` / Doc37; ״בני ההיכל״ חי כשם מוצר ב־`SubscribeGate.jsx` ו־`marketing.js`).

**א2 — `nodes` `type='rule'` (2):** (1) `number_page_law` v1 — מותנה בקיום שורת העיקרון ב־`platform_tiers_law` (ב׳, פריט 14) **או** באישור שלך לוותר עליו. (2) `no_row_without_number_law` v1 — **נוסף ב־§10.10.4**; מותנה באישורך שהעיקרון ״ערך גימטרי ליד כל ביטוי״ אינו נדרש כחוק עומד, או בהעברת שורה אחת לבעלים של הצגה מספרית (`numeric_rule_family_index` / עיצוב V2).

**א3 — `project_codex` (4), באנר STALE:** `project_overview` (id 2), `data_model_map` (id 3), `system_rules_index` (id 8), `number_page_1820` (id 13, יחד עם א2).

**השפעה צפויה:** חוקים פעילים 87→85; spec פעילים 10→0; `fn_raziel_relevant_rules` יפסיק להחזיר את `number_page_law` ואת `no_row_without_number_law` לרזיאל (רשומות ה־spec אינן `type='rule'`, ולכן אינן מוחזרות לרזיאל גם היום). אין צרכן בקוד/CI/DB-fn לאף אחד מהם.

#### ב׳ — עדכון סעיפים בחוזים משותפים (36 פריטים; עודכן ב־§10.10)

*ביצוע מוצע: גרסה חדשה אחת לכל חוק (`rule_version`+1, `supersedes_version` = הקודמת); שורות קודקס ו־md — עריכת שורות ממוקדת. כל פריט מתייחס לשורות/סעיפים שמצוינים ב־§10.4 / §10.6.*

**ב־DB — חוקים (22; פריט 17 הועבר לקבוצה א׳):**

**P0 — מדיניות שחרור ו־Production**

1. `deploy_on_request` v3→v4 — v4: להסיר הרשאה עומדת (שורות 3,5,6,8,9,12); לתקן ״push=פריסה״ (1) ו־cutover (11); לשמור שער canary (17–23)  _(סיכון: גבוה)_
2. `inter_agent_coordination_law` v17→v18 — v18: סעיפים 75–80 → היסטורי (2029=Production); 81–82 → אישור מפורש; 86; 139; תווית v16  _(סיכון: גבוה)_
3. `foundation_closure_protocol_law` v7→v8 — שורה 96: ״major Legacy→2029 production cutover״ → ניסוח Production  _(סיכון: נמוך)_

**P1 — בעלים V1→V2 (עיצוב ומותג)**

4. `canonical_colors_law` v2→v3 — בעלים V1→V2; פריט 5 (״legacy נשאר עד redesign״)  _(סיכון: נמוך)_
5. `logo_integrity_law` v3→v4 — בעלים V1→V2; סעיף 9 (Heritage / legacy runtime)  _(סיכון: נמוך)_
6. `brand_spelling_law` v1→v2 — בעלים V1→V2; (אופציונלי) שמות רכיבים שנמחקו  _(סיכון: נמוך)_
7. `sod1820_canonical_identity_law` v5→v6 — בעלים V1→V2; הטקסט ״under V1״; depends_on על ה־md  _(סיכון: נמוך)_
8. `worlds_color_law` v1→v2 — בעלים V1→V2 (יש צרכן חי: NumberCore2029)  _(סיכון: נמוך)_

**P2 — רכיבי Legacy שנמחקו בתוך חוקים גדולים**

9. `subscription_funnel_law` v22→v23 — שורות 12,52,77,85,138,152,154,207,212: UserCenter/CollectiveBadge/JoinPage/ProfilePage/RecentSearches/SubmitChidush/Navbar שנמחקו; SubscribeGate נשאר  _(סיכון: בינוני)_
10. `canonical_ui_components_law` v12→v13 — שורות 4,10,26,54,81: רכיבים שנמחקו (DimensionFiveBadge/VideoBadge/TopicPage) וסעיפי ״Legacy migrates…״  _(סיכון: בינוני)_
11. `experience_governance_foundation_v1_law` v10→v11 — שורות 7,9,11: BrandTicker/Marquee/Navbar כהיסטוריה (שומרים את סעיפי ה־cutover כשער למשטחים)  _(סיכון: בינוני)_
12. `identity_architecture_law` v1→v2 — שורה 20 (טאב AdminPage) ו״הפיצ׳ר הראשון לבנות״ → היסטורי (הרעיון חי: community_hints)  _(סיכון: נמוך)_
13. `unified_tags_law` v1→v2 — סעיף העיצוב (כחול/פינה שמאלית) מול V2; פער post_tags שלא נבנה — הכרעת צוריאל  _(סיכון: בינוני)_
14. `platform_tiers_law` v5→v6 — (מותנה בא׳) הוספת שורת עיקרון ״המספר לא מוסתר — העומק כן״ מ־number_page_law  _(סיכון: בינוני)_

**P3 — ניסוח בלבד (לצרף לגרסה רק אם החוק מתעדכן ממילא)**

15. `video_transcription_law` v1→v2 — רכיבי VideoGallery/VideoTranscript שנמחקו  _(סיכון: נמוך)_
16. `reality_stream_law` v1→v2 — RealityWorld/Stream/Pulse ו־LatestUpdatesRail שנמחקו (reality.js חי)  _(סיכון: נמוך)_
17. `no_row_without_number_law` v1→v2 — **הועבר לקבוצה א׳ (א2) ב־§10.10.4**; אם לא יאושר שם — v2 לתיקון שם הרכיב TopicPage (נמחק) בלבד  _(סיכון: נמוך)_
18. `canonical_methods_registry_law` v6→v7 — שורה 26: LeadOrderEditor (נמחק; ה־RPC admin_set_lead_ranks חי)  _(סיכון: נמוך)_
19. `system_suggestions_law` v5→v6 — SystemSuggestionsTab (נמחק)  _(סיכון: נמוך)_
20. `raziel_voice_law` v1→v2 — שורה 16: <AskRaziel> (נמחק)  _(סיכון: נמוך)_
21. `raziel_response_contract` v1→v2 — שורה 21: <AskRaziel> (נמחק)  _(סיכון: נמוך)_
22. `els_single_engine_law` v2→v3 — ניסוח ״tzofen.html legacy consumer״ (הנכס חי כ־TzofenEmbed)  _(סיכון: נמוך)_
23. `els_research_layer_law` v9→v10 — ניסוח ״legacy/classic renderer״ (הנכס חי)  _(סיכון: נמוך)_

**ב־`project_codex` (7):** `branches_deploy` (שורות 8–9, כותרת הבעלים — P0) · `publishing_conventions` (שורות 472, 476, 481–482, 413, 463 — P0) · `_index` (נתב עיצוב V1→V2, הסרת `unified_graph_law`/`subscribe_gate_law`, שורת מעמד ל־Doc37 — P1) · `experience_governance_foundation_v1` · `convergence_law` · `gematria_engine` (שורה 53) · `golden_entities`.

**ב־md (7):** `SOD1820_DESIGN_CONTRACT_V2.md` (4, 22, 52, 104) · `docs/sod1820-system-frame-contract-v1.md` (156) · `docs/sod1820-system-frame-contract-v2-addendum.md` (4, 22) · `SOD1820_MASTER_ROADMAP.md` (176) · `SOD1820_MASTER_OWNER_INDEX.md` (6) · `SOD1820_CONTENT_FOUNDATION_CONTRACT.md` (5, 9, 183) · `docs/research-studio-v1-contract.md` (10–11).

#### ג׳ — השארה ללא שינוי

* **חוקים (63):** 2029 (48): `els_seed_expansion_law`, `testimony_not_prophecy`, `mobile_acceptance_law`, `engine_governance_registry_authority_law`, `gematria_auto_registry_law`, `gematria_db_first_and_enrich_law`, `gematria_engine_law`, `method_lifecycle`, `method_priority`, `no_kolel_no_additions`, `content_translation_law`, `decimal_point_join_law`, `moment_clock_law`, `shitat_haechad_alef_law`, `zero_navigation`, `zero_scale_law`, `person_foundation_contract_law`, `auto_share_uses_live_post_law`, `post_og_image_law`, `post_system_voice_law`, `raziel_companion_layer_law`, `raziel_full_answer_and_route_law`, `raziel_group_privacy_law`, `raziel_routing_law`, `raziel_whatsapp_access_adapter_law`, `reality_graph_law`, `convergence_blocklist_law`, `cross_vs_convergence_criteria`, `master_anchor_1820_law`, `research_gold_hints_law`, `ktiv_male_haser_repair_law`, `research_intake_foundation_contract_law`, `corpus_admission_foundation_v1`, `shared_expression_extraction_contract_v1`, `source_video_publish_law`, `writer_material_home_law`, `research_strategy_layer_law`, `research_workspace_law`, `research_object_identity_invariant_law`, `workspace_layout_standard`, `site_flags_lock_law`, `ai_analyze_contract`, `relative_time_display_law`, `traffic_intelligence_law`, `truth_axes_foundation_law`, `golden_entity_law`, `signal_vs_curation`, `verify_seal_manual_only`. משותפים (15): `unified_credit_system`, `live_state_sync_law`, `work_log_authority_law`, `live_state_resolution_law`, `big_number`, `root_exception`, `legacy_content_protocol`, `preserve_linked_row`, `bot_delivery_law`, `raw_vs_curated`, `word_approval_required_law`, `cross_reference_is_not_disclosure`, `graph_privacy_foundation_law`, `zuriel_surname_privacy_law`, `israel_time_law`.
* **שורות קודקס (24):** `entity_layer`, `cross_method`, `session_2026_06_14` (כבר STALE), `roadmap_open_threads`, `growth_os_vision`, `reality_stream_law`, `reality_graph_law`, `raziel_mind_architecture`, `traffic_intelligence_law`, `sod1820-master-architecture-draft`, `research_intake_foundation_contract`, `person_foundation_contract`, `shared_expression_extraction_v1`, `corpus_admission_foundation_v1`, `spatial_research_runtime_vision_v1`, `foundation_closure_protocol_v1`, `truth_axes_foundation_v1`, `numeric_rule_family_index`, `public_language_revelation_geula_law`, `people_standing_calibration_v0`, `canonical_logo_v2_asset_pointer`, `sod1820_motion_identity_master_v1`, Doc37, `session_2026_10_18_ai_control_reconciliation`.
* **md / CI (5):** `SOD1820_DESIGN_CONTRACT_V1.md` (נעוץ בבדיקת smoke; מכיל את Naming law), `CLAUDE.md` / `AGENTS.md` / `AGENT_HANDOFF.md`, `legacy-production-lock.yml` + `test-legacy-retired.mjs`, צעדי `2029-isolation-gate.yml` (שמות), נכסי `legacy-dark-bg-post-*` ב־`vercel.json`.
* **נתונים:** כל מה שב־§10.5; 184 החוקים הלא־פעילים; 18 שורות ללא `rule_id`.
* **ג׳ שנראים כ־Legacy אך חיים (נבדקו אחד־אחד):** `legacy_content_protocol`, `word_approval_required_law` (אין קורא בקוד; 2,894 מילים ממתינות — הכרעה, §10.10.4), `preserve_linked_row`, `raw_vs_curated`, `unified_credit_system` (החלטת מוצר דחויה — לא ביטול), `big_number` / `root_exception` (פונקציות DB), ארבעת חוקי `numberSystemMethods` (`zero_navigation`, `zero_scale_law`, `shitat_haechad_alef_law`, `moment_clock_law`).

### 10.8 תלויות, אילוצים וסדר ביצוע מוצע

1. **אישור שלך** לפי הקבוצות; במיוחד ב׳-1 ו־ב׳-2 (מדיניות השחרור), ושלושת התנאים (א1: `bnei_haheichal`; א2: `number_page_law` ו־`no_row_without_number_law`).
2. **באץ׳ אחד מתועד** (BEFORE/AFTER ב־`work_log`, מזהה משימה אחד): קודם ב׳ (ביטול סעיפים מסוכנים), אחר כך א׳. הטריגר `trg_rule_compaction_integrity_guard_v1` בודק רק שורות פעילות: גרסה חדשה חייבת `supersedes_version` = הקודמת הישירה וה־`owner_routing`/`compaction_v1`/`g3_disposition_v1` (מועתקים אוטומטית אם חסרים); `is_active=false` אינו נבדק בו.
3. **תלות DB נפרדת (אישור נפרד):** הפונקציה `admin_suggestion_decide` מפיקה טקסט ״AUTO_RELEASE_NOW under deploy_on_request v2״ — צרכן חי של המדיניות הישנה; עד שתעודכן, הטקסט יסתור את ב׳-1.
4. **אילוצי בדיקת smoke** (`scripts/test-g1-agent-routing-smoke.mjs` — אינה מחוברת ל־CI, ראו O13): אסור להסיר ב־V1 את ״2029 STATUS: SUPERSEDED by״ ו־״V1 is retained for Legacy compatibility and historical/provenance use only״; ב־`SOD1820_DESIGN_CONTRACT_V2.md` (שורה 5) — ״V1 remains historical/Legacy provenance״; וב־`CLAUDE.md` וב־`AGENTS.md` את הליטרלים `dpl_46k9WvaD5QBUo969obYzJ7pKkNyq`, `2029 Production cutover`, ״ONE SCOPE — ONE ACTIVE WRITER״ ו־״אין להמתין ל-ACK מ-GPT״.
5. **לא לסמן את V1 היסטורי לפני** שחוק ה־Naming / product language (`V1:92–100`) מוסדר ב־V2 (ראו C2).
6. **אחרי הביצוע:** חתימת 87 החוקים תשתנה — לתעד חתימה חדשה; לבדוק ש־`numberSystemMethods` עדיין מקבל 4 חוקים פעילים; לוודא ש־`fn_raziel_relevant_rules` לא מחזיר חוקים שבוטלו.
7. **מה אינו נכלל:** מחיקה פיזית; 184 החוקים הלא־פעילים; קוד, ענפים, PR #1296 (נשאר טיוטה; C11 פתוח), Production.

### 10.9 דוח מסירה — נספח Legacy Retirement

| שדה | ערך |
|---|---|
| **מה בוצע** | ביקורת קריאה־בלבד: סיווג 87 חוקים, 10 spec ו־35 שורות קודקס; מטריצת צרכנים (קוד/Edge/CI/DB/סוכנים) ב־HEAD ובקומיט שלפני ההסרה; סריקת חתימות התנהגות; מיפוי הוראות סותרות; §10.10 — מבט לפי תקופות (תאריכי יצירה ועריכה, ציר היומן, סימוני G3) |
| **מה לא בוצע** | כל שינוי: DB (נעשו SELECT בלבד), קוד, ענפים, PR, Production; לא נכתבה הכרעתך ל־`work_log` |
| **בסיס · ראש** | `origin/main` `6deeb1008285e19aad4cfcb9ae21681863ee0695` (לא השתנה) · אין קומיטים |
| **בדיקות/CI** | לא הורצו; ראו מגבלות ב־§10.2 |
| **Production שונה?** | **לא** |
| **חסמים** | אישורך לקבוצות א׳/ב׳/ג׳; שלושת התנאים (א1, ושניים ב־א2); הכרעה בשתי שאלות חדשות (§10.10.7: ד1, ד2); אישור נפרד לתיקון `admin_suggestion_decide` |
| **חתימות לאימות** | 87 החוקים `fae24986b558ee63c5f2cdf9b7c799a6` (זהה לחתימה הראשונה — לא השתנה); 10 ה־spec `7764f7b6a87f2d7ee2eebc87ec997bb3`; קודקס `branches_deploy` `6cee6559506bba1be4f1e71a86693285`; `publishing_conventions` ו־Doc37 — זהות לחתימות ב־§9 (לא השתנו במהלך הנספח) |
| **צעד הבא מומלץ** | לאשר ב׳ P0 (שלושה חוקים + `branches_deploy` + `publishing_conventions`) ואת א1 (9 ה־spec הבלתי־מותנים) — השאר אחר כך |

### 10.10 מבט לפי תקופות — רמז התאריכים של צוריאל (10.11.2026 · קריאה בלבד)

> **הרמז שנמסר:** האתר הוקם בערך ביוני–יולי (או קודם), ו־2029 תוכנן באוגוסט. **נבדק מול ה־DB ו־git.** התוצאה: הרמז **מאומת**, והוא מוסיף ציר סינון — אך **אינו משנה את מבנה הרשימות**. הוא משנה פריט אחד (`no_row_without_number_law`: ב׳ → א׳ מותנה), מתקן ראיה אחת (`word_approval_required_law`), ומגלה ש**ההוראות הסותרות ״2029 הוא Production״ אינן משכבת Legacy אלא משכבת המעבר (ספטמבר)** — מסנן ״נוצר לפני אוגוסט״ לא היה מוצא אותן. לא בוצע שום שינוי (SELECT, `git`, GitHub read בלבד).

#### 10.10.1 אימות ציר הזמן

| אות | ערך מאומת (10.11) | משמעות |
|---|---|---|
| תחילת העבודה | שורת `work_log` ראשונה 6.6.2026. שורות לפי חודש: יוני 295 · יולי 532 · אוגוסט 1,093 · ספטמבר 4,201 · אוקטובר 3,182 · נובמבר (עד 10.11) 391 | כדבריך: האתר מיוני |
| האתר הראשון עלה | היומן: ״העברת דומיין ל־Vercel״ 13.6, ״מעבר דומיין הושלם״ 14.6; ב־21.6: ״האתר WordPress הישן כבר לא עובד״ | ה־React ״Legacy״ הוא האתר החי מאמצע יוני עד המעבר ל־2029 ב־4.11 (`CLAUDE.md`; Doc37 §12.45) |
| קוד האתר הראשון | ב־14.6 היומן מציין את `src/legacy/legacy.jsx` כקובץ האתר; הקובץ (265KB) הוסר ב־#1239 | ״legacy״ ביוני–יולי (50 שורות ביומן) = שם הקובץ, `legacy_traffic` (נתוני Jetpack/WordPress) ו״עמודי הלגאסי״ — לא החלטה לפרוש |
| ״אולי לפני״ | פוסטים מ־WordPress מ־11.11.2013 (יובאו 7.6); `legacy_traffic` 2015 → 10.6.2026 (8,091,307 צפיות) | ימי WordPress הם **נתונים להישמר** (§10.5), לא קוד |
| תכנון 2029 | אזכור ראשון של ״2029״ ביומן: 30.8 (5 שורות באוגוסט); ספטמבר 1,388 · אוקטובר 1,666 | כדבריך: תכנון באוגוסט, בנייה מספטמבר |
| ״2029״ בחוקים | אפס בשורות חוק שנוצרו לפני 30.8, פרט לחוק אחד: `raziel_whatsapp_access_adapter_law` (נוצר 16.7) — האזכור בבלוק ״WHATSAPP SURFACE PROFILE V1 · 2026-10-06״ (עריכה במקום מ־6.10) | אין טקסט חוק מיולי שמתכנן את 2029 |
| ״2029״ בקודקס | 19 שורות; העדכון האחרון הכי מוקדם ביניהן: 17.9 (`_index`) | הקודקס נוצר 14.6; תוכן 2029 נוסף מספטמבר |

#### 10.10.2 חלוקה לפי מוצא הטקסט הפעיל, מוצלבת מול ההמלצות

המוצא נקבע לפי תאריך יצירת השורה הראשונה של החוק (`min(created_at)` על כל גרסאותיו), תאריך יצירת הגרסה הפעילה, ותאריכים שמופיעים בגוף הטקסט (עריכות במקום אינן מעדכנות `created_at` — ראו 10.10.6).

| מוצא הגרסה הפעילה | חוקים | א׳ | ב׳ | ג׳ | סימון G3 (15.9) |
|---|---|---|---|---|---|
| יוני–יולי ולא שונתה מאז (״קפואים״) | 27 | 2 | 4 | 21 | 21 KEEP_SCOPED · 5 RETIRE_WHEN_REPLACED · 1 DEFER_G5 |
| יוני–יולי, נערכה במקום אחרי כן | 4 | 0 | 1 | 3 | 4 KEEP_SCOPED |
| נוצר ביוני–יולי; הגרסה הפעילה נכתבה מחדש בספט׳–אוק׳ | 23 | 0 | 8 | 15 | 12 KEEP_SCOPED · 10 KEEP_OWNER · 1 RETIRE_WHEN_REPLACED |
| נוצר באוגוסט (תכנון 2029) | 27 | 0 | 5 | 22 | 16 KEEP_SCOPED · 11 KEEP_OWNER |
| נוצר מספטמבר (בניית 2029) | 6 | 0 | 4 | 2 | 4 KEEP_SCOPED · 2 KEEP_OWNER |
| **סה״כ** | **87** | **2** | **22** | **63** | — |

(הספירה אחרי השינוי היחיד ברשימות — 10.10.4. ה״קפואים״: `big_number`, `root_exception`, `method_priority`, `testimony_not_prophecy`, `raw_vs_curated`, `unified_credit_system`, `verify_seal_manual_only`, `no_kolel_no_additions`, `preserve_linked_row`, `zero_navigation`, `unified_tags_law`, `number_page_law`, `zero_scale_law`, `worlds_color_law`, `post_system_voice_law`, `word_approval_required_law`, `no_row_without_number_law`, `israel_time_law`, `zuriel_surname_privacy_law`, `convergence_blocklist_law`, `master_anchor_1820_law`, `bot_delivery_law`, `raziel_group_privacy_law`, `raziel_voice_law`, `raziel_response_contract`, `shitat_haechad_alef_law`, `cross_reference_is_not_disclosure`. הנערכים במקום: `signal_vs_curation`, `reality_stream_law`, `gematria_auto_registry_law`, `raziel_whatsapp_access_adapter_law`.)

#### 10.10.3 מה ההצלבה מגלה

1. **גיל אינו Legacy.** 27 החוקים ה״קפואים״ מיוני–יולי עברו כולם את סבב G3 (15.9; 11 חוקים מתוך ה־87 נבדקו שוב ב־30.9, מהם 7 מה״קפואים״): 21 סומנו `KEEP_SCOPED_SEMANTIC` (נשארו במכוון בעץ של 2029), 5 `LEGACY_COMPAT_RETIRE_WHEN_REPLACED`, אחד `DEFER_PRODUCT_DECISION_G5`. חוקים כמו `bot_delivery_law`, `raziel_whatsapp_access_adapter_law` ו־`raziel_response_contract` הוגדרו ב־G3 כ״מועמדים לבדיקה חובה״ ונשארו עם נימוק חי נכון ל־30.9, לפני #1239 (`wa-*` ו־`bot_outbox`, `wa_vip_senders.raziel_access`, `ai-analyze`). ערוץ WhatsApp וכללי גימטריה, זמן ופרטיות אינם קשורים למסך מסוים של האתר הראשון.
2. **ההוראות הסותרות הן משכבת המעבר, לא משכבת Legacy.** תאריכי הופעה בגרסאות (אומתו משורות `nodes`):

   | הוראה | מופיעה לראשונה | שכבה |
   |---|---|---|
   | ״push ל־main = פריסה / 100 פריסות ליום״ (`deploy_on_request`) | v1, 1.9 | תחילת המעבר; ככל הנראה נכון אז (פריסה אוטומטית מ־Git) — כיום `git.deploymentEnabled=false` בשני השורשים |
   | ״TEMPORARY LEGACY PRODUCTION… CURRENT PRODUCTION״ (`inter_agent_coordination_law`) | v12, 15.9 22:37 | בניית 2029 |
   | ״AUTO-RELEASE ON CLEAN STATE״ ושער ״cutover Legacy→2029״ (`inter_agent_coordination_law`) | v13, 17.9 12:07 | בניית 2029 |
   | ״STANDING AUTO-RELEASE AUTHORIZATION״ ושער cutover (`deploy_on_request`) | v2, 17.9 12:07 | בניית 2029 |

   כולן נכתבו כשה־Legacy **היה** הפרודקשן ו־2029 עוד לא; הן הפכו שגויות ב־4.11 ולא כי הן ישנות. הקבוצה ב׳ (P0) נשארת כפי שהיא — הדחיפות נובעת מהסתירה למדיניות השחרור, לא מהגיל.
3. **ה־DB כבר מחזיק סיווג משלו של שכבת Legacy.** כל 87 החוקים נושאים `metadata.g3_disposition_v1` (86 סווגו ב־15.9, אחד ב־11.10). שישה סומנו `LEGACY_COMPAT_RETIRE_WHEN_REPLACED` (ועוד אחד `DEFER_PRODUCT_DECISION_G5`), **וכולם נוצרו ביוני–יולי** — כלומר רמז התאריכים והסימון של G3 מצביעים על אותה קבוצה:

   | חוק | נוצר | גרסה פעילה מ־ | נבדק שוב ב־G3 | המלצה (אחרי 10.10) |
   |---|---|---|---|---|
   | `preserve_linked_row` | 10.6 | 10.6 | — | ג׳ (שמירת נתונים) |
   | `unified_tags_law` | 12.6 | 12.6 | 30.9 | ב׳ (מוזכר כ״unified_tags_law v1״ ב־PR #1296; ראו G5) |
   | `number_page_law` | 14.6 | 14.6 | 30.9 | א׳ מותנה |
   | `legacy_content_protocol` | 21.6 | 30.9 (v2) | — | ג׳ (מתאם היסטורי מוצהר; 3 צרכנים חיים) |
   | `word_approval_required_law` | 5.7 | 5.7 | 30.9 | ג׳ + הכרעה (10.10.4) |
   | `no_row_without_number_law` | 7.7 | 7.7 | 30.9 | **א׳ מותנה (חדש)** |
   | `unified_credit_system` (DEFER_G5) | 9.6 | 9.6 | — | ג׳ (החלטת מוצר דחויה) |

4. **תור פתוח של G3 עצמו, לא חלק מהאישור הזה:** 49 חוקים נושאים נימוק כללי ״final G3 compaction may absorb/archive it after proving semantic preservation״; 18 מהם ״קפואים״ מיוני–יולי (`big_number`, `root_exception`, `method_priority`, `testimony_not_prophecy`, `raw_vs_curated`, `verify_seal_manual_only`, `no_kolel_no_additions`, `zero_navigation`, `zero_scale_law`, `post_system_voice_law`, `israel_time_law`, `zuriel_surname_privacy_law`, `convergence_blocklist_law`, `master_anchor_1820_law`, `raziel_group_privacy_law`, `raziel_voice_law`, `shitat_haechad_alef_law`, `cross_reference_is_not_disclosure`). אלה מועמדים עתידיים לספיגה בסגירת G3 — **לא הוכח שהם Legacy**, ושלושה מהם (`zero_navigation`, `zero_scale_law`, `shitat_haechad_alef_law`) הם צרכנים חיים של `numberSystemMethods` (יחד עם `moment_clock_law` מספטמבר).

#### 10.10.4 מה משתנה ברשימות (§10.7)

| # | פריט | היה | עכשיו | ראיה חדשה (תאריך + בדיקה) | תנאי / סיכון |
|---|---|---|---|---|---|
| 1 | `no_row_without_number_law` v1 | ב׳, פריט 17 (תיקון שם רכיב) | **א׳ — מותנה** | נוצר 7.7 ולא שונה מאז; נימוק G3 (15.9, אושר שוב 30.9): `legacy numeric-row presentation assumption is not a universal 2029 truth invariant; modern findings/results may be nonnumeric and current numeric owners govern value-bearing projections`; אפס צרכנים ותלויות (קוד, Edge, DB, CI, סוכנים); הרכיב היחיד שמוזכר בו (`TopicPage`) נמחק ב־#1239; החוק המשלים (`convergence_display_law`, 7.7) כבר אינו פעיל; לא נמצא חוק או חוזה פעיל של 2029 שחוזר על העיקרון (חיפוש מחרוזות בחוקים הפעילים ובמסמכי המאגר — לא קריאה מלאה) | תנאי: אישורך שהעיקרון ״ערך גימטרי ליד כל ביטוי״ אינו נדרש כחוק עומד, **או** העברת שורה אחת לבעלים של הצגה מספרית (`numeric_rule_family_index` / עיצוב V2). סיכון נמוך–בינוני: העיקרון יוצא מהקשר רזיאל (`fn_raziel_relevant_rules`) |
| 2 | `word_approval_required_law` v1 | ג׳ ״צרכן חי: RPC + עטיפה״ | ג׳ — **תיקון ראיה והכרעה** | העטיפה `adminReviewWord` (`src/lib/supabase.js:477`) **ללא קורא ב־HEAD**; הקורא היחיד (`LanguageEngineTab.jsx`, 3 קריאות) נמחק ב־#1239. נשארו: ה־RPC `wa_word_review` (אין פונקציית DB שקוראת לו); ברירת המחדל `gematria_words.is_verified=false`; **2,894 מילים ממתינות** מתוך 15,592 (אחת מהן מ־30 הימים האחרונים). אין כיום ממשק לאשר אותן | הכרעה: (א) לספוג ל־Corpus Admission (`corpus_admission_foundation_v1`) ולפרוש את החוק, או (ב) לבנות מסלול אישור ב־2029 ולהשאיר. עד אז: ג׳ |
| 3 | ללא שינוי, והתאריך מחזק | `number_page_law` (א׳ מותנה) · 10 רשומות ה־spec (א׳) · 4 שורות קודקס שלא עודכנו מאז 14.6 (`project_overview`, `data_model_map`, `system_rules_index`, `number_page_1820` — א׳ באנר STALE) | אותו דבר | ה־spec נוצרו כולם ב־11.6 (תשעה עם `build_env=claude_code`) — אצווה אחת של האתר הראשון; `number_page_law` ו־`number_page_1820` מ־14.6 ללא שינוי. ארבע שורות אחיות מ־14.6 (`entity_layer`, `cross_method`, `session_2026_06_14`, `roadmap_open_threads`) עודכנו ב־20.8 (שלוש עם באנר STALE; `roadmap_open_threads` עם ״שורה זו אינה מקור־אמת״) — ויש טבלת גיבוי `project_codex_backup_20260820`: ככל הנראה סבב סימון ב־20.8 שפספס את ארבע השורות שברשימה (היסק מתאריכים, לא הוכחה) | כפי שנקבע ב־§10.7 |
| 4 | ללא שינוי | `preserve_linked_row` · `unified_tags_law` · `legacy_content_protocol` · `unified_credit_system` | אותו דבר | `preserve_linked_row`: 583 שורות ב־`post_gematria_links` (נתוני קישור WordPress↔גימטריה), אין קורא בקוד או ב־DB; נימוק G3: `retain through migration, then absorb into provenance/data-integrity owner or archive after old linked-row model is retired`. השאר — ראו הטבלה ב־10.10.3 | שמירת נתונים היסטוריים; ספיגה בסגירת G3 |

**אחרי העדכון:** א׳ = **16 פריטים** (10 spec · 2 חוקים · 4 שורות קודקס) · ב׳ = **36 פריטים** (22 חוקים · 7 קודקס · 7 md) · ג׳ ללא שינוי (63 חוקים). סיווג 87 החוקים: 2029 — 65 · משותף — 20 · Legacy בלבד — 2 (שניהם מותנים) · היסטורי — 0.

#### 10.10.5 הנוהל הקיים לביצוע — לא ליצור חדש

* **קיים סבב G3 עם אוצר מילים משלו:** `audits/g3-implementation-compaction/G3_IMPLEMENTATION_COMPACTION_ARCHIVE_GATE_V1.md` — ארבע החלטות אפשריות (`KEEP_CURRENT` · `ABSORB_THEN_ARCHIVE` · `TEMPORARY_COMPATIBILITY` · `RETIRE_REMOVE`, שורות 60–63); קריטריון קבלה 5 (שורה 73): `Every LEGACY_COMPAT_RETIRE_WHEN_REPLACED item has either been retired or has an explicit unresolved live dependency and removal condition`; קריטריון 9 (שורה 77): `Full provenance remains available in Git, inactive rules, work_log and migration history`; בעלים: `EXTEND_EXISTING foundation_closure_protocol_law only` ו־`Do not create a Legacy System, Archive System, Migration Registry, Runtime Truth Store or second coordination mechanism` (שורות 128–132). המסמך תחת `audits/` (ראיה, לא סמכות — `CLAUDE.md` §15).
* **פער תיעוד:** אוצר המילים הזה מופיע רק ב־`metadata.g3_disposition_v1` של שורות החוקים ובמסמך הביקורת — **לא** בטקסט של אף חוק פעיל או שורת קודקס (חיפוש מחרוזות מדויקות: 0 תוצאות). לכן המיפוי המוצע: א׳ → `RETIRE_REMOVE` (spec, `number_page_law`) או `ABSORB_THEN_ARCHIVE` (`no_row_without_number_law`, אם תבחר להעביר שורה לבעלים); `legacy_content_protocol` ו־`preserve_linked_row` → `TEMPORARY_COMPATIBILITY` (תנאי הסרה: החלפת צרכני הגלריה/WordPress ההיסטוריים).
* **ביצוע (אם יאושר):** לתעד את ההחלטה בשדה הקיים `g3_disposition_v1` של השורות המתבטלות, באותו באץ׳ BEFORE/AFTER יחיד (§10.8); אופציונלי — שורה אחת ב־`foundation_closure_protocol_law` v8 (שממילא מתעדכן בקבוצה ב׳) שמפנה לארבע ההחלטות. אין טבלה, שדה או חוק חדשים.

#### 10.10.6 מגבלות הרמז

* **`created_at` אינו תאריך התוכן.** ל־`nodes` אין `updated_at`, וחוקים נערכים במקום בלוקים מתוארכים, בלי גרסה חדשה. לדוגמה: `video_transcription_law` v1 (נוצר 12.8) מכיל בלוק ״OWNERSHIP CLARIFICATION · 2026-11-10 · HUMAN-GATE ZURIEL״ — **עריכה מיום הביקורת**, ללא רישום ביומן (0 תוצאות; ראו G7). נקראו ואומתו עוד ארבעה — אלה ה״נערכים במקום״ בטבלת 10.10.2: `signal_vs_curation` (בלוק 27.8), `gematria_auto_registry_law` (בלוק 4.9), `reality_stream_law` (בלוק 2.9), `raziel_whatsapp_access_adapter_law` (בלוק 6.10). בעוד 7 שורות יש תאריך בגוף הטקסט מאוחר מיצירת השורה (`cross_vs_convergence_criteria`, `reality_graph_law`, `research_gold_hints_law`, `israel_time_law`, `raziel_companion_layer_law`, `writer_material_home_law`, `relative_time_display_law`) — לא נקראו אחד־אחד ואינן משנות את המוצא שנקבע (הגרסה הפעילה של שש מהן נכתבה בספט׳–אוק׳ ממילא; ב־`israel_time_law` הפער הוא יום אחד ונחשב רעש).
* **היסטוריית git קצרה** (שוכפלה רדודה: 101 קומיטים, העתיק ביותר 5.11) — אי אפשר לתארך את בניית האתר הראשון מהמאגר; התיארוך הוא מה־DB והיומן בלבד.
* **תאריך הוא סינון, לא ראיה.** ביטול פעילות נשען על צרכנים (§10.2, §10.6), על סימון G3 ועל אישורך — לא על גיל. 21 החוקים ה״קפואים״ שנשארו ג׳ נשארו כי הם חיים לפי ראיה, לא כי נבדקו בגלל התאריך בלבד.
* **שינוי בזמן הביקורת:** `origin/main` ללא שינוי (`6deeb1008…`, ‎0/0); חתימת 87 החוקים אומתה שוב (`fae24986b558ee63c5f2cdf9b7c799a6`, מפריד `|` בין `rule_id@גרסה:md5`) ולא השתנתה — כולל הבלוק מ־10.11 ב־`video_transcription_law`, כלומר הוא קדם לקריאה הראשונה. ביומן נוספו מאז הטביעה 3 שורות של סשנים אחרים (PR #1299 ומיפוי SW/מדיה) — אינן נוגעות בחוקים או בקודקס.

#### 10.10.7 החלטות חדשות וההשפעה על 10.8–10.9

| # | החלטה | ברירת מחדל אם לא תכריע |
|---|---|---|
| ד1 | להעביר את `no_row_without_number_law` לקבוצה א׳ (מותנה) — ואם כן: לוותר על העיקרון או להעביר שורה לבעלים של הצגה מספרית | נשאר פעיל; ב׳ פריט 17 (תיקון שם הרכיב בלבד) |
| ד2 | `word_approval_required_law`: לספוג ל־Corpus Admission ולפרוש, או לבנות ב־2029 מסלול אישור ל־2,894 המילים הממתינות | נשאר ג׳ |
| ד3 | תור G3 (49 חוקים עם נימוק כללי, מהם 18 מיוני–יולי): האם לפתוח סבב נפרד אחרי האישור הנוכחי | לא נפתח; אין שינוי |

**השפעה על §10.8:** שלושה תנאים לביצוע א׳ במקום שניים (`bnei_haheichal`, `number_page_law`, `no_row_without_number_law`); הסדר והאילוצים ללא שינוי. **חתימות לאימות:** כפי שב־§10.9 (87 החוקים — ללא שינוי).

---

## 11. הכנת מימוש מאושר — סגירת Legacy, תיקון היררכיית חוזים (10–11.11.2026)

> **סטטוס:** הוכנו תיקונים בענף מבודד והצעות SQL לבדיקה, ונבדקו מקומית. **לא בוצעה שום כתיבה ל־DB** (גם לא ל־`work_log`, ל־`project_codex` או ל־`nodes`), **לא בוצעה דחיפה ל־remote**, לא נפתח ולא שונה PR, לא היה מיזוג, לא הייתה פריסה ולא נמחק דבר. כל פעולה שמתוארת כאן ממתינה לאישור מפורש ונפרד של צוריאל לקובץ ולפעולה המדויקים (`CLAUDE.md` §0.4).

### 11.1 ההכרעות שנרשמו (הוראת הביצוע המאוחדת)

| # | הכרעה | איך יושמה בהכנה |
|---|---|---|
| ד1 | `no_row_without_number_law`: להעביר את העיקרון לבעלים פעיל של 2029 ולפרוש את הישן; לא להפוך אותו לחובת מספר בכל שורה | הוכן בעלים: `canonical_methods_registry_law` v7 §§26–27, בהיקף מצומצם (11.6). הפרישה הוכנה כשלב 3 נעול (`30_…`) |
| ד2 | `word_approval_required_law`: לשלב את אישור המילים ב־Corpus Admission; לשמר את 2,894 השורות ואת מצבן; בלי אוטומציה; לא לפרוש לפני שהחלופה הוכחה | ניתוח ותוכנית בלבד (11.7); החוק לא נוגע |
| ד3 | ״בני ההיכל״: לא לבטל ולא לשנות שם; לבדוק מחדש ולהמליץ | ניתוח, חלופות והמלצה (11.8); ה־spec הוחרג מכל הצעה |
| ד4 | `number_page_law`: לשמר את «המספר לא מוסתר, העומק כן» בבעלים הפעיל, בלי לשנות הרשאות | הוכן ב־`platform_tiers_law` v6 §§19–21; הפרישה נעולה לשלב 3 |
| ד5 | 49 החוקים בעלי הנימוק הכללי של G3 מוקפאים | נאכף: 9 חוקים מקבוצה ב׳ שנמצאים ברשימה **לא** נכללו בשום הצעה, ואף אחד מעשרת החוקים שמשתנים אינו בין ה־49 (נבדק חי ב־11.11; 11.10) |
| ד6 | גבולות ביצוע: ענף, בדיקות מקומיות, SQL לא מורץ | נשמר (11.2, 11.5) |
| P0 | ״כל מיזוג ל־main וכל פריסה ל־Production מחייבים אישור מפורש לפעולה המסוימת. אין הרשאה עומדת.״ | הוכן לחמשת היעדים + `system_suggestions_law` שנמצא תוך כדי + תיקון DB נפרד ל־`admin_suggestion_decide` (11.4) |

### 11.2 ענף, SHA וקבצים

| שדה | ערך |
|---|---|
| מאגר · ענף | `zuriel337/sod1820` · `ccr-b2565041-d94syf` (מקומי בלבד; אין upstream; אין עותק ב־origin) |
| בסיס | `origin/main` = `01d96b627694d9c611b181721daa3a384284b300` (נקרא ב־11.11). הדוח המקורי נקרא על `6deeb1008`; מאז נכנסו ל־main ‏#1299 (`932aba4bd`) ו־#1300 (`01d96b627`). הענף הועבר קדימה ל־`01d96b627` ונבדק מחדש. אף אחד מהשניים לא נוגע בששת הקבצים (`git diff 6deeb1008 01d96b627` עליהם ריק). **בזמן הכתיבה נכנס גם #1301** (`d6662fdcb`, Meta Pixel + AdSense), ולכן הענף מאחור בקומיט אחד. #1301 לא נוגע בששת הקבצים, `git merge-tree` נקי, וה־patch הוחל נקי על `d6662fdcb` בעותק זמני. לפני מיזוג נדרש rebase מקומי (לא בוצע, כדי לא לשנות את ה־SHA המתועד) |
| ראש | `921a3c15024f5f81014db00bf6284d83d68f8908` — קומיט אחד מעל `origin/main`, עץ נקי |
| קבצים ששונו (6, md בלבד) | `SOD1820_DESIGN_CONTRACT_V2.md` · `docs/sod1820-system-frame-contract-v2-addendum.md` · `docs/sod1820-system-frame-contract-v1.md` · `SOD1820_MASTER_ROADMAP.md` · `SOD1820_CONTENT_FOUNDATION_CONTRACT.md` · `docs/research-studio-v1-contract.md` (38+/24−) |
| דיפ מדויק | `repo/921a3c150-contract-docs.patch` בחבילת המסירה (`SOD1820-contract-governance-pack-20261111.zip`) |
| לא שונו בכוונה | `CLAUDE.md`, `AGENTS.md`, `AGENT_HANDOFF.md`, `SOD1820_DESIGN_CONTRACT_V1.md` (נעוץ בבדיקת smoke), `SOD1820_MASTER_OWNER_INDEX.md` (מספרי הגרסאות בו מתעדכנים רק אחרי אצוות ה־DB — 11.12) |

**מה שונה ב־md (בתמצית):** ב־V2 — כל הוראות ההפעלה שהפנו לקבצים שנמחקו ב־5.11 (`palette.js`, `themeMode.js`, `chromeTheme.js`, `QuickActions`/`DocActions`, פלטות Legacy, צרכני light/dark של Legacy) מפנות עכשיו לבעלים הקיימים של 2029 (`paletteTokens2029.js`, `palette2029.js`, `themePreset2029.js`). שורת הבעלים כבר לא נועצת v9. **חוק ה־Naming הועבר ל־V2 לפני כל שינוי במעמד V1**: V1 לא נגוע, וההפניה המתה ל־`STREAMS` סומנה. ב־addendum של מסגרת המערכת — הבאנר ״BRANCH ONLY״ תוקן ל־MERGED, ובעלי ה־Naming = V2. בחוזה מסגרת המערכת v1 — כלל ה־launchers הישנים סומן היסטורי. ב־Roadmap — המצביע ההיסטורי כבר לא נועץ v17 ואת נעילת 22.10, ומציין את כלל 10.11. ב־CFC — באנרי ״ענף בלבד״ עודכנו (המסמך מוזג; PR #1278). ב־Research Studio — נוספו הערות: ההפניה ל־Master State §20 מתה, `convergence_one_per_value` לא פעיל, ו־`ResearchCenter` הוסר.

### 11.3 מנגנון הביצוע (קיים, לא חדש)

* **גרסאות:** כל שינוי בחוק = שורה חדשה `v+1` עם `supersedes_version=v`; הגרסה הקודמת עוברת ל־`is_active=false` ונשארת. זה בדיוק מה שהטריגר הקיים `trg_rule_compaction_integrity_guard_v1` אוכף (גרסה עוקבת, מטא־דאטה ממשלית, גרסה פעילה אחת), יחד עם האינדקס `nodes_one_active_rule_per_id_uidx`.
* **ניתוב:** דרך ה־LAW TREE ROUTER הקיים (`project_codex._index`) ו־Owner Index. לא נוצר מנגנון קדימות חדש; הקדימות היא הכלל הקיים (החלטה מאוחרת ומפורשת של צוריאל גוברת; `CLAUDE.md` §0.1).
* **חסמים בכל קובץ SQL:** ה־md5 של הטקסט ושל המטא־דאטה (או של גוף הקודקס / הגדרת הפונקציה) חייב להיות זהה לבסיס שנבדק, אחרת הקובץ מסרב לרוץ. אחרי הריצה הוא מאמת את ה־md5 של התוצאה. הכול בטרנזקציה אחת לכל קובץ. אין DELETE, TRUNCATE או DROP. לכל קובץ יש קובץ rollback שמחזיר את הבסיס המדויק בלי למחוק שורות.

### 11.4 טבלת פעולות DB מוצעות — **לא בוצעו**

| שלב | קובץ (md5) | יעד | פעולה | חסם | rollback | תלות |
|---|---|---|---|---|---|---|
| 1 | `10_p0_release_policy.sql` (`68839a70…`) | `deploy_on_request` v3→**v4** · `inter_agent_coordination_law` v17→**v18** · `foundation_closure_protocol_law` v7→**v8** · `system_suggestions_law` v5→**v6** · קודקס #4 `publishing_conventions` · #9 `branches_deploy` | 4 גרסאות + 2 עדכוני גוף | md5 בסיס: `f93e73ce…` · `02d188d1…` · `336934e5…` · `9b5c19de…` · `26b473b7…` · `6cee6559…` | `19_…` (`00a066c9…`) | — |
| 1b | `11_admin_suggestion_decide_text.sql` (`ef2716e6…`) | פונקציית DB `admin_suggestion_decide` | `CREATE OR REPLACE`: שתי מחרוזות טקסט — ״…may classify AUTO_RELEASE_NOW under deploy_on_request v2…״ → ״…READY_FOR_APPROVAL: merge and deploy only after explicit approval by ZURIEL of the exact action (deploy_on_request v4, no standing authorization)…״, ושורת ה־provenance → v4/v18. חתימה, `SECURITY DEFINER`, הרשאות ולוגיקה ללא שינוי | md5 הגדרה `12961a8c…` → `abf4efb3…` | `18_…` (`31238244…`) | אחרי 10; **אישור DB נפרד** |
| 2 | `20_number_principles_to_2029_owners.sql` (`c3f5fb72…`) | `platform_tiers_law` v5→**v6** (§§19–21) · `canonical_methods_registry_law` v6→**v7** (§§26–27 + הערת LeadOrderEditor) | 2 גרסאות | `9619c2af…` · `f921c88e…` | `29_…` (`e0de780a…`) | — |
| 2 | `23_shared_contracts_groupB.sql` (`bf9900ef…`) | `worlds_color_law` v1→v2 (בעלים V1→V2) · `subscription_funnel_law` v22→v23 · `experience_governance_foundation_v1_law` v10→v11 · `identity_architecture_law` v1→v2 · קודקס #1 `_index` · #30 · #15 · #5 · #12 | 4 גרסאות + 5 עדכוני גוף (הערות במקום; משמעות ללא שינוי) | md5 לכל אחד (בקובץ) | `26_…` (`300110b2…`) | — |
| 2 | `21_retire_9_legacy_specs.sql` (`34e640c2…`) | 9 רשומות `type='spec'` (כל העשר פרט ל״בני ההיכל״) | `is_active=false` בלבד | label + md5 לכל אחת; בודק ש״בני ההיכל״ נשאר פעיל | `28_…` (`ceb01f79…`) | — |
| 2 | `22_codex_stale_banners.sql` (`403992de…`) | קודקס #2 `project_overview` · #3 `data_model_map` · #8 `system_rules_index` · #13 `number_page_1820` | באנר STALE בראש הגוף; הגוף המקורי נשמר במלואו | md5 לכל אחד | `27_…` (`41f4f7bc…`) | — |
| 3 | `30_STAGE3_retire_number_laws.sql` (`248de947…`) | `number_page_law` v1 · `no_row_without_number_law` v1 | `is_active=false` בלבד (`number_page_law` מסומן `immutable` — התוכן לא נוגע) | **מסרב לרוץ** אם v6/v7 של היורשים אינם פעילים עם הסעיפים; md5 לשני החוקים | `39_…` (`f81384e5…`) | אחרי 20 **ואימותו** |

**לא הוכן כ־SQL (מחכה להחלטה):** רשומות `work_log` BEFORE/AFTER לביצוע (הנוסח המוצע ב־11.13); עדכוני גרסאות ב־OI/Roadmap ונעיצת ה־smoke (11.12); כל פעולה על `gematria_words` (ד2); כל שינוי בשם או בהרשאות של ״בני ההיכל״ (ד3); כל שינוי בשיוכי פוסטים (11.9).

### 11.5 בדיקות — מקומיות בלבד (אין CI, כי אין דחיפה)

| בדיקה | תוצאה |
|---|---|
| `scripts/test-g1-agent-routing-smoke.mjs` (נועץ מחרוזות ב־CLAUDE/AGENTS/OI/V1/V2) | לפני: עבר · אחרי: **18/18** |
| `scripts/test-legacy-retired.mjs` | **PASS** |
| `scripts/test-one-tree-content-contract.mjs` | **79/79** (אחרי `npm ci --ignore-scripts`; לפני ההתקנה נכשל על חבילה חסרה — סביבתי) |
| `test/follow-category-series-alignment.test.mjs` | **8/8** (אותה הערה) |
| `npm run build` | הצליח (אזהרת גודל chunk קיימת מראש) |
| אחרי ש־main התקדם ל־`d6662fdcb` (#1301) | ה־patch הוחל נקי בעותק זמני: smoke **18/18**, legacy-retired **PASS**. שאר הבדיקות לא הורצו שוב, כי #1301 לא נוגע בקבצים שלי |
| סביבת הבדיקות | Node 22.23.4, בעוד `package.json` דורש Node ‎>=24.9 <25 (אזהרת EBADENGINE). התוצאות מקומיות בלבד; CI הוא המקור המחייב |
| `git diff --check` | אזהרה אחת: שני רווחים בסוף שורה 4 ב־addendum — מעבר שורה של markdown שהיה כבר בשורה המקורית, ונשמר בכוונה |
| סימולציית P0 (PGlite / Postgres 16 בזיכרון, על עותקים מאומתים של השורות החיות) | **65/65**: התאמה ל־md5 החי של המטא־דאטה ושל הגדרת הפונקציה; ריצה; סריקות קבלה; הרצת הפונקציה המתוקנת; rollback; סירוב להרצה כפולה; סירוב על סטייה בלי שינוי חלקי |
| סימולציית שלבים 2–3 | **34/34** (כולל: שלב 3 מסרב לפני שלב 2) |
| סימולציה משולבת (כל הקבצים לפי הסדר + rollback הפוך מלא) | **48/48**; אחרי rollback המצב זהה לבסיס (גרסה, md5 תיאור, md5 מטא־דאטה, קודקס, spec, פונקציה) |

**בדיקות הקבלה 1–9:**

| # | דרישה | ראיה | מה לא נבדק |
|---|---|---|---|
| 1 | אין הוראת פריסה פעילה עם הרשאה עומדת | **סריקה חיה (קריאה בלבד, 11.11)** של כל 87 החוקים הפעילים (טקסט, מטא־דאטה, תווית), כל 35 שורות הקודקס וכל פונקציות `public`, ב־13 תבניות הענקה: כל ההתאמות נמצאות ביעדים של `10_`/`11_` בלבד — `deploy_on_request` v3 (כולל התווית ״Gate-Clean Standing Authorization״), `inter_agent_coordination_law` v17, `foundation_closure_protocol_law` v7, `system_suggestions_law` v5, קודקס #9 והפונקציה `admin_suggestion_decide`. חריג אחד: קודקס #38 (מסירת סשן 18.10, מסומן NON-CANONICAL) מזכיר ״standing auto-release״ כתיאור של v3 ושל ההחלטה על אישור מפורש. זו לא הענקה, והשורה נשארת כהיסטוריה. בסימולציה, אחרי החלה: 0 התאמות ב־8 תבניות, גם במטא־דאטה | **ב־DB החי ההוראות הישנות עדיין קיימות** עד שיאושר `10_…` |
| 2 | סוכנים לא מתייחסים ל־Legacy כ־Production | סריקה חיה ב־5 תבניות: ההתאמות רק ביעדים (`inter_agent_coordination_law` v17, קודקס #1, #4, #9). בסימולציה, אחרי החלה: 0. בקובצי הסוכנים והחוזים בענף: 0 | התנהגות סוכן חי לא נבדקה |
| 3 | פרישת ה־spec לא שוברת צרכנים | אומת מחדש ב־HEAD ובמסד: 0 הפניות במזהה או בתווית בקוד/CI/מסמכים/פונקציות/תצוגות/קשתות; אין קורא ל־`type='spec'`; `fn_raziel_relevant_rules` קורא רק `type='rule'` | — |
| 4 | עקרונות המספר נשמרים ב־2029 | v6/v7 בסימולציה; שלב 3 נעול עליהם | ממשק חי לא נבדק (בדיקה סטטית: 11.6) |
| 5 | 2,894 השורות ללא שינוי מצב | חתימת מצב `09b4e65afbaee2962aea42ca0624df58` נמדדה במהלך הסשן וזהה בסופו; אף הצעה לא נוגעת ב־`gematria_words` או ב־`wa_word_review` (בדיקה סטטית) | — |
| 6 | ״בני ההיכל״ ללא שינוי | ה־spec מוחרג ונבדק בסימולציה; אף אחד מששת הקבצים ששונו לא מכיל את השם; `SubscribeGate`, `og.js`, `marketing.js` ו־`ai-analyze` לא נגעו | — |
| 7 | אין אובדן היסטוריה/הפניות/תגיות/תוכן | אין DELETE/DROP; מספר השורות רק עולה (30→40 בסימולציה); כל גוף קודקס שווה ל־md5 שנבדק; שורות F11 ב־`branches_deploy` נשמרו מילה במילה; ב־md רק החלפות בשורה ותוספת סעיף | — |
| 8 | בדיקות smoke עוברות | 18/18, כולל נעיצות V1/V2 | — |
| 9 | אין שינוי לא מורשה ב־main/DB/Production | `origin/main` לא שונה ממני; הענף לא נדחף (`ls-remote`: 0); טביעות DB שנמדדו שוב ב־11.11 לפני המסירה: 87 חוקים `fae24986…`, spec ‎`ee0bbd8e…`, קודקס `efdb5db7…` (35 שורות), מילים `09b4e65a…`, הפונקציה `12961a8c…` — כולן זהות לפתיחה; 0 רשומות `work_log` ממני; לא נעשתה שום קריאה ל־Vercel | Vercel לא נקרא. לפי היומן, סשנים אחרים פרסמו בחלון הזה את #1299 ו־#1300 — לא אני, ולא אומת מול Vercel |

### 11.6 ד1 + ד4 — העקרונות והיורשים

* **ד4 → `platform_tiers_law` v6** (הבעלים של שער הגישה, OI:167):
  * §19 «המספר לא מוסתר, העומק כן». זהות המספר, ערכי המנוע הדטרמיניסטיים והחתימות נשארים קריאים במדיניות הציבורית. מותר שההקרנה הציבורית תהיה מדגם תחום של התאמות. רק עומק נעול (ניתוח רזיאל/AI, כל מסלולי הגרף, הצלבות נדירות, מסעות ודוחות).
  * §20: לא מועברים הרכב שלוש השכבות, המכסה ״~20 מתוך 250״ ושם הדרגה. הם ממתינים להכרעה לפי §18 ולד3.
  * §21: אין שינוי הרשאה.
  * בדיקת התאמה (סטטית): ב־`Number2029Page` נעול רזיאל (`shell.razielLocked`), והמספר והביטויים מוצגים. זה תואם את §§15–16 הקיימים. לא נדרש שינוי התנהגות.
* **ד1 → `canonical_methods_registry_law` v7** (בעלי ״One-Tree Method Presentation״; נימוק G3: ״current numeric owners govern value-bearing projections״):
  * §26: שורה שמוצגת כהתאמה גימטרית מציגה ערך קנוני מהמנוע/הרישום. ערך משותף לכל הרשימה מותר פעם אחת.
  * §27: לא חל על שורות שאינן התאמה גימטרית, ולא גובר על משמעת האמת.
  * **בדיקת שינוי התנהגות מצאה סתירה בנוסח הישן:** `src/components/research/TopicConvergenceContent.jsx:18–19` קובע ״a phrase without an authored value/method is rendered WITHOUT a number״ ו״an authored value is shown with the AUTHOR'S method label verbatim (or none), never resolved״ (לפי `truth_axes_foundation_law`). העברת הנוסח הישן (״חשב במנוע בזמן רינדור״ לכל שורה) הייתה משנה את 2029. לכן §27 מגביל במפורש.

### 11.7 ד2 — Corpus Admission ו־2,894 השורות

**תיקון לניסוח קודם שלי:** ״2,894 מילים ממתינות״ אינו מדויק. אלה כל השורות עם `is_verified=false`. לפי ההגדרה של המסוף הקיים (`admin_words_console`): ״pending״ = `is_verified=false` ושלא `rejected_by_admin` = **1,506**; ״rejected״ = **1,388**. בנוסף, `is_verified=false` מסמן גם ביטוי שהמנוע לא אימת: `fn_verify_gematria_word_engine` מאפס ביטוי שאינו עברית נקייה, ביטוי שחסר בו אחד מ־14 ערכי השיטות, או ביטוי עם רשומה ב־`gematria_integrity`.

| מצב (סיווג בלעדי) | שורות | מקור עיקרי |
|---|---|---|
| נדחה ע״י אדמין (`rejected_by_admin`) | 1,388 | `excel_import` 1,274 · `wa-vip` 86 · אחרים 28 |
| הוסתר בבת אחת ב־3.7 (`bulk_hide_2026_07_03`) | 115 | `wa-vip` 81 · `wa-deep` 14 · `community` 11 · אחרים 9 |
| נוסף ע״י צוריאל (מקור ״ZURIEL session/Human Gate״, 30.9–18.10) | 11 | — |
| מקור culture_cipher (מטריקס/דיונון, 29.9) | 6 | — |
| ממתין מערוץ (`pending_wa` 29 + `pending_review` 12) | 41 | `wa-vip`, 4–5.7 |
| פורמט שהמנוע לא מאמת (לא עברית נקייה) | 108 | `excel_import` (79 `pending_review` · 29 `exposed_general_clean`) |
| ייבוא ישן שלא נבדק: בלי סיבה 634 · `exposed_general_clean` 590 · `pending_review` 1 | 1,225 | `excel_import` מ־5.6.2026 (1,224) + שורה אחת ממקור אחר (8.6) |
| **סה״כ** | **2,894** | 0 מקושרות לפוסטים; 0 שהביטוי שלהן קיים גם כמאומת; 2 ביטויים כפולים בתוכן |

**מה המנגנון הקיים כבר נותן:**
* חוזה זהות מילה (`fn_resolve_word_identity`: EXACT / SAFE_NORMALIZED / POSSIBLE_VARIANT, שאף פעם לא מתמזג אוטומטית / NEW).
* שער `fn_corpus_admission_gate`.
* תור `word_review_queue`, ש־`resolve_word_review` מכריע בו: אדמין בלבד (`rd_is_admin`), עם `decided_by`/`decided_at`. אישור דרכו מריץ את בדיקת המנוע ומסמן `visibility_reason='approved_by_admin'`. לפי החוזה, זה הייצוג של ״CORPUS APPROVED״ במסלול התור.
* טבלת ביקורת `decision_ledger`.

**מה חסר:**
* (א) 2,894 השורות לא נמצאות בתור. יש בו 14 שורות, כולן נדחו, ואין מיפוי מ־6 ערכי `visibility_reason` למצבי התור.
* (ב) ״CORPUS APPROVED״ אינו עמודה אחת. זה פער מוצהר בחוזה עצמו (`docs/corpus-admission-foundation-v1-contract.md`, טבלת מחזור החיים).
* (ג) `wa_word_review` לא רושם מי החליט, ושני המסלולים לא כותבים ל־`decision_ledger`.
* (ד) יש שתי בדיקות אדמין שונות: `resolve_word_review` ו־`wa_word_review` בודקות `rd_is_admin()`, ואילו `admin_words_console`, `admin_bulk_triage` ו־`admin_hide_word` בודקות `users.role='admin'`.
* (ה) `wa_word_review('delete')` מוחק את המילה עצמה פיזית. `resolve_word_review('delete')` מוחק את שורת התור, ואיתה את תיעוד ההחלטה.
* (ו) אין היום ממשק 2029: לחמש העטיפות ב־`src/lib/supabase.js` (`adminWordsConsole`, `adminReviewWord`, `adminHideWord`, `adminBulkTriage`, `adminTriageCounts`) אין קורא.
* (ז) `admin_bulk_triage` (`approve_good` / `reject_junk`) מאשרת או דוחה בבת אחת. אין לה קורא, אבל היא סותרת את ״אין אישור או דחייה אוטומטיים״. מומלץ לא לחבר אותה לשום ממשק, או לחסום אותה באישור.
* (ח) `corpus_admission_foundation_v1` נמצא בין 49 החוקים המוקפאים (ד5). השלב האחרון בתוכנית — העברת העיקרון אליו — ידרוש החרגה מפורשת שלך.

**תוכנית מוצעת (EXTEND_EXISTING, ללא ביצוע):**
1. **שלב 0:** לשמור את חתימת המצב הנוכחית `09b4e65a…` ולוודא אותה לפני ואחרי כל צעד.
2. **שלב 1 (DB, באישור):** מיפוי קריא בלבד מ־6 המצבים לשלבי Corpus Admission. מוצע כ־view או כשאילתת דוח, בלי לשנות שורות.
3. **שלב 2 (DB, באישור):** להכניס לתור רק את מה שצוריאל בוחר לבדוק. לא את הנדחות, ולא אוטומטית. כל כניסה עוברת ב־`fn_resolve_word_identity` כדי שלא תיווצר כפילות. כל החלטה מתבצעת ב־`resolve_word_review`, עם הרחבה:
   * דחייה של מילה קיימת מסמנת `rejected_by_admin` ולא מוחקת.
   * פעולת `delete` חסומה לשורות האלה.
   * כל החלטה נכתבת ל־`decision_ledger`.
   * בדיקת אדמין אחת.
4. **שלב 3 (ממשק):** מסך אישור ב־`/2029/control` (החלטת מוצר; לפי `inter_agent_coordination_law` §96 שייך למסלול החזותי של CLAUDE).
5. **שלב 4:** בדיקת החלופה על עותק ואז על דגימה מאושרת.
6. **רק אחר כך:** להעביר את העיקרון («שום מילה חדשה לא עולה אוטומטית; כל מקור נכנס כלא־מאומת ומחכה לאישור אדמין מפורש; ספאם נחסם מראש») ל־`corpus_admission_foundation_v1` v2, ולפרוש את `word_approval_required_law` באישור נפרד.

### 11.8 ד3 — ״בני ההיכל״: ממצאים, חלופות והמלצה

**איפה השם מופיע ב־2029 (נבדק שוב על `d6662fdcb`):**
* `SubscribeGate.jsx:43` — טקסט גלוי למשתמש: ״זה לא אזור המנויים «בני ההיכל»״ (ובשורה 11 הערת קוד).
* `api/og.js:118–119` — מפת OG סטטית ל־`/members`: ״בני ההיכל · אזור המנויים… הצטרפו להיכל״.
* `src/lib/marketing.js:87` (ב־`01d96b627` שורה 85) — הערה ליד מיפוי אירוע Meta Pixel ‏`members_signup: "CompleteRegistration"`: ״הצטרפות לבני ההיכל״.
* `supabase/functions/ai-analyze/index.ts:2659` — פרומפט מדריך של רזיאל: ״‎/members — מנוי מתקדם (בני ההיכל)״.

**ב־DB:**
* ה־spec ״בני ההיכל״ ו־`number_page_law` (פעילים).
* קודקס `number_page_1820`.
* חוקים לא פעילים (`subscribe_gate_law`, `number_as_gateway`, גרסה ישנה של `platform_tiers_law`).
* 25 רשומות יומן.
* 0 פוסטים.

**מה המשמעות בפועל:**
* זה שם בלי מוצר: אין תפקיד או דרגה (`users.role`: admin 2 · user 227; `users.tier`=free לכולם; `profiles.tier`=0 לכולם).
* `platform_tiers_law` v5 הפעיל לא מזכיר אותו, ומשאיר שמות תוכניות להכרעה עתידית (§18).
* תשתית תשלום קיימת כפיילוט בלי שם ציבורי (`membership_subscription_pilots` 1, `paid_subscribers` 1).

**כפילויות וסתירות:**
* **`/members` נושא שתי משמעויות.** ב־2029 הנתיב מציג ״אנשים בקהילה״ (`App2029.jsx:350`, `og.js:529`). אבל מפת ה־OG הסטטית ופרומפט רזיאל מציגים אותו כאזור המנויים בתשלום. מכאן סיכון שרזיאל ימסור מידע שגוי.
* **התנגשות עם ״היכל״.** ״היכל״ הוא השם הציבורי של סביבת המחקר (חוק ה־Naming). ״הצטרפו להיכל״ מערבב את סביבת המחקר עם מנוי.

**חלופות למיקום המוצרי:**
* (א) שם של דרגת זכאות ב־`platform_tiers_law`, שמגדירה עומק בלבד לפי §19.
* (ב) שם של קבוצת אנשים או תג קהילה תחת בעלי הזהות (`identity_architecture_law`/`person_foundation_contract_law`).
* (ג) לפרוש את המושג ולתת לתוכנית שם כשתעוצב.

**חלופות לשם:**
* (1) להשאיר «בני ההיכל» כשם התוכנית העתידית.
* (2) שם שאינו מתנגש ב״היכל״ (מנוי מתקדם / שם קהילתי אחר — לבחירתך).

**המלצה:** (א) עם שם שתכריע עליו לפי §18, ושמירת `/members` = ״אנשים בקהילה״. אחרי ההכרעה — לתקן את שלושת האזכורים שמשתמש או רזיאל רואים (טקסט `SubscribeGate`, מפת ה־OG, פרומפט רזיאל) ואת ההערה ב־`marketing.js`, ורק אז להכריע על ה־spec. כל אלה שינויי קוד ו־Edge שדורשים אישור. לא שיניתי דבר.

### 11.9 §5 — סתירות שיוך הסדרות (ניתוח; אין שינוי)

הנתונים נבדקו מחדש ב־11.11. הקוד ב־main הוא `contentSeries2029Identity.js`: חברות = התאמה מדויקת לשדה **וגם** `exactAuthor`. PR #1296 ללא שינוי (טיוטה פתוחה, ראש `a377d023…`, עדכון אחרון 10.11 16:34 UTC — נקרא ב־11.11).

| # | שאלה | קבוצת הפוסטים המושפעת (מדויקת) | אפשרויות |
|---|---|---|---|
| S1 | ״מה קורה הבורא״ (אלון לוי) | ב־main: 8 (5076, 5081, 5092, 5108, 5117, 5119, 5122, 5131) — תגית ומחבר, לפי DEC-SERIES-005. ב־PR #1296 (מחבר בלבד) נוספים 5: **54, 5021, 5035, 5042, 5069** | להשאיר DEC-SERIES-005 / לאמץ את הטיוטה |
| S2 | 5003, 5004 (מטריקס, משחקי הדיונון) | הקוד כבר מוציא אותם ממימד חמש (המחבר `NULL`). בנתונים עדיין `tags∋מימד חמש` ו־`categories=[מימד חמש, הצופן בסרטים]` | DEC-SERIES-003 (מחוץ למימד חמש; ״הצופן בסרטים״; מפרסם ״המערכת״ — תיקון נתונים באישור) / חברות כפולה לפי הטיוטה |
| S3 | מימד חמש — מפרסם שאינו ״בדרך לנצח״ (DEC-SERIES-002 פתוח) | 11 בקטגוריה: 2, 29, 45, 5003, 5004, 5037, 5068, 5109, **5116**, 5127, 5130. **5116 הוא פוסט הכיול של מימד חמש** (`publishing_conventions` §13), והקוד הנוכחי לא סופר אותו בסדרה | הכרעה פרטנית: ״מדריך לריפוי 10 הספירות״ (5109, 5116, 5127) · ״מזכה הרבים״ (29) · מחבר ריק (2, 45) או NULL (5037, 5068, 5130) |
| S4 | שם הקבוצה | ב־main: משפחת ״הצופן בסרטים״ (הערה: ״מטריקס · משחקי הדיונון״) | ״הצופן בסרטים״ / ״צופן בתרבות״ |

### 11.10 רשימות

* **יפרשו (אחרי אישור, לפי שלבים):** 9 רשומות spec (`21_…`); `number_page_law` ו־`no_row_without_number_law` (`30_…`, רק אחרי `20_…` ואימותו). 4 שורות קודקס יקבלו באנר STALE (`22_…`); הן לא ייפרשו או יימחקו.
* **יישארו ללא שינוי:**
  * spec ״בני ההיכל״ (ד3).
  * `word_approval_required_law` (ד2).
  * 49 החוקים המוקפאים (ד5). מתוכם 9 שסומנו בקבוצה ב׳ ומוחזקים: `canonical_colors_law`, `logo_integrity_law`, `brand_spelling_law`, `sod1820_canonical_identity_law`, `canonical_ui_components_law`, `reality_stream_law`, `raziel_voice_law`, `els_single_engine_law`, `video_transcription_law`.
  * `unified_tags_law` (G5 פתוח; PR #1296 נשען עליו).
  * `els_research_layer_law` ו־`raziel_response_contract` (ניסוח בלבד, P3; לפי הדוח מצטרפים רק אם החוק מתעדכן ממילא).
  * כל החוקים ברשימה ג׳ של §10.7. אף אחד מעשרת החוקים שסעיף זה משנה אינו בה; כולם ברשימה ב׳ (נבדק).
  * `CLAUDE.md`, `AGENTS.md`, `AGENT_HANDOFF.md`, V1.
  * כל הנתונים ההיסטוריים (§10.5).
* **דורשים הכרעת צוריאל:**
  1. אישור לכל קובץ SQL לפי md5 ולפי הסדר שב־11.13 (`10`, `11`, `20`, `23`, `21`, `22`, `30`).
  2. `admin_suggestion_decide`: האם לטפל גם ביצירת `ASSIGNMENT`/`QUEUED` (תיקון DB נפרד; לא הוכן).
  3. עדכון OI/Roadmap ונעיצת ה־smoke מ־v17 ל־v18, אחרי אצוות ה־DB.
  4. החרגה מד5 ליישור V1→V2 ב־`canonical_colors_law`, `logo_integrity_law`, `brand_spelling_law`, `sod1820_canonical_identity_law` ו־`canonical_ui_components_law` — או השארתם.
  5. ד2: אישור התוכנית (11.7) ואחר כך מימוש נפרד, כולל החרגה ל־`corpus_admission_foundation_v1` וגורל `admin_bulk_triage`.
  6. ד3: מיקום ושם (11.8), ואחר כך התיקונים בקוד וב־Edge.
  7. §5: S1–S4 (11.9).
  8. זהות הכותב של העריכות במקום מ־10.11 (`publishing_conventions`, Doc37, `video_transcription_law`).
  9. מיזוג הענף `921a3c150` (md בלבד).
  10. רשומות `work_log` BEFORE/AFTER (כתיבת DB).

### 11.11 תיקונים לטענות קודמות בדוח זה

1. **״2,894 מילים ממתינות״ (§10.1, §10.6.2, §10.7 ג׳, §10.10.4, §10.10.7).** אלה שורות `is_verified=false`: 1,506 ממתינות לפי המסוף, 1,388 נדחו (11.7).
2. **כלל ״LEGACY MODIFIED DATE REQUIRED״ (§10.4 #9).** לא מיושן. קוראי 2029 ממיינים לפי `modified DESC NULLS LAST` (`getLatestPostCards`, `fetchPostSearchSuggestions2029`, `fetchPostsCatalog2029` כשאין סדרה, `home2029Projection`, `worldDiscoveryStream`). ב־`10_…` הוא **הוגדר מחדש ל־2029**; לא סומן היסטורי.
3. **§10.10.5 הציע לתעד פרישה ב־`g3_disposition_v1` של השורות המתבטלות.** בפועל ההצעות לא נוגעות בתוכן השורות המתבטלות (`number_page_law` מסומן `immutable`). התיעוד נמצא במטא־דאטה של היורשים וב־`work_log` המוצע.
4. **חתימת ה־spec.** החתימה כאן (`ee0bbd8e…`) מחושבת בנוסחה אחרת מזו שב־§10.9 (`7764f7b6…`). אין להשוות ביניהן.
5. **`inter_agent_coordination_law` v17.** התווית שלו אמרה ״v16״. תוקן בתווית של v18.

### 11.12 סיכונים ותלויות שנותרו

* **חסמי md5 עלולים לסרב** אם שורה תשתנה לפני האישור. זה מכוון. ב־10.11 נמצאו עריכות במקום בלי רישום ביומן ב־`publishing_conventions`, ב־Doc37 וב־`video_transcription_law` (G7). אם יש כותב פעיל — צריך לזהות אותו ולייצר מחדש.
* **אחרי אצוות ה־DB:** Owner Index עדיין יציין כ־ACTIVE את `deploy_on_request` v3, `foundation_closure_protocol_law` v7, `system_suggestions_law` v5, `platform_tiers_law` v5, `canonical_methods_registry_law` v6, `inter_agent_coordination_law` v17, `experience_governance_foundation_v1_law` v10 ו־`subscription_funnel_law` v22. גם ב־Roadmap מופיעים חלק מהם (חלקם בגרסאות ישנות עוד יותר). העדכון כולל גם את נעיצת ה־smoke `inter_agent_coordination_law **v17 ACTIVE**`, וכל שינוי בקובץ הבדיקה הזה דורש הכרעה שלך (`CLAUDE.md`). תיקון המשך מוכן להכנה.
* **מחרוזות provenance מיושנות בקוד** (`materialGate.js`, `ai-analyze`: ״platform_tiers_law v4״) — היו מיושנות עוד לפני השינוי. לידיעה.
* **`admin_suggestion_decide`** עדיין יוצרת `ASSIGNMENT`/`QUEUED` ל־CLAUDE, בניגוד ל־v17 (דיווח פסיבי בלבד). דווח, לא תוקן.
* **פרומפט רזיאל ב־`ai-analyze`** מציג את `/members` כ״מנוי מתקדם (בני ההיכל)״. תיקון דורש אישור פריסת Edge.
* **סימולציה ≠ Production.** PGlite / Postgres 16, בלי RLS והרשאות. מלאי הטריגרים החי נבדק: ב־`nodes` טריגר אחד, ב־`project_codex` אין. ה־md5 של המטא־דאטה ושל הגדרת הפונקציה שווים בין PGlite למסד החי.
* **הענף לא נדחף.** הקומיט קיים רק בסשן הזה ובקובץ ה־patch שבחבילה. הסביבה זמנית.
* **סשנים מקבילים.** לפי היומן (11.11), סשני CLAUDE אחרים פעילים:
  * GA4 ‏(#1300) — פורסם והדומיינים הוזזו.
  * מדיה ‏(#1299) — פורסם.
  * Meta Pixel + AdSense — מוזג ל־main כ־#1301 (`d6662fdcb`) תוך כדי הכתיבה. מצב הפריסה שלו לא נבדק.
  * קליטת מדיה מוואטסאפ — ענף בלבד.

  אף אחד מהם לא בתחום שלי (חוקים, קודקס, מסמכי חוזה). אבל `src/lib/marketing.js` הוא אחד מאזכורי ״בני ההיכל״ (ד3), ו־#1301 כבר שינה אותו. לכן תיקון ד3 צריך תיאום עם בעלי התחום `marketing-2029`.

### 11.13 סדר ביצוע מדורג מומלץ

| שלב | פעולה | אישור נדרש |
|---|---|---|
| 0 | רשומת BEFORE ב־`work_log` (מוצע: `task_key=CONTRACT_GOVERNANCE_EXEC_20261111`, `from=CLAUDE`, `to=ZURIEL`, `dispatch_kind/state=NULL`, מצב בסיס + md5 הקבצים) | כתיבת DB |
| 1 | `10_p0_release_policy.sql` → אימות (גרסה פעילה אחת לכל חוק, md5) → `11_admin_suggestion_decide_text.sql` → אימות | שני אישורים נפרדים |
| 2 | `20_…` → אימות; `23_…` → אימות; `21_…` → אימות; `22_…` → אימות | אישור לכל קובץ |
| 3 | `30_STAGE3_…` (נעול על שלב 2) | אישור |
| 4 | rebase מקומי של `921a3c150` על `main` העדכני (נבדק נקי) ומיזוג (md בלבד; בלתי תלוי ב־DB) → תיקון ההמשך ל־OI/Roadmap ולנעיצת ה־smoke | מיזוג + הכרעה על קובץ הבדיקה |
| 5 | ד2 (מימוש מסלול האישור), ד3 (שם ומיקום + 3 תיקונים), §5 (S1–S4), חריגה מד5 לארבעת חוקי המותג (V1→V2) אם תרצה | הכרעות נפרדות |
| כל שלב | רשומת AFTER ב־`work_log` + טביעות אצבע חוזרות | — |

### 11.14 דוח מסירה (`CLAUDE.md` §0.5)

| שדה | ערך |
|---|---|
| מה בוצע | עריכות ב־6 קובצי md בענף מבודד (קומיט מקומי). 14 קובצי SQL (7 הצעות + 7 rollback) עם חסמים. 3 סימולציות מקומיות (65/65, 34/34, 48/48). בדיקות מקומיות. ניתוחי ד2, ד3, §5. עדכון הדוח הזה |
| מה לא בוצע | כתיבה ל־DB (כולל `work_log`), דחיפה, PR, מיזוג, פריסה, שינוי alias, מחיקה. שינויי קוד או Edge. כל שינוי בשיוכים, בשם ״בני ההיכל״ או במילים. החוקים המוקפאים |
| מאגר · ענף · SHA | `zuriel337/sod1820` · `ccr-b2565041-d94syf` · בסיס `01d96b627694d9c611b181721daa3a384284b300` · ראש `921a3c15024f5f81014db00bf6284d83d68f8908` · `origin/main` בזמן המסירה: `d6662fdcbfa51f16304aacd36c28f0a304b5e12b` (הענף קומיט אחד לפני וקומיט אחד מאחור; rebase נקי נבדק, לא בוצע) |
| בדיקות | מקומיות בלבד (11.5). CI לא רץ (אין דחיפה) |
| מצב PR | אין PR. PR #1296 לא נגע |
| Production שונה? | **לא — על ידי.** לפי היומן, סשנים אחרים פרסמו בחלון הזה את #1299 ו־#1300 (לא אומת מול Vercel) |
| חבילת מסירה | `SOD1820-contract-governance-pack-20261111.zip`: 14 קובצי SQL + MANIFEST md5 (נבדק: 14/14), 32 דיפים (32/32), patch ו־diff של הענף, סקריפטי הסימולציה ותוצאותיהם. להרצה חוזרת של הסימולציה צריך גם את עותקי הבסיס מתיקיית העבודה; הם לא בחבילה |
| צעד הבא מומלץ | לאשר (או לתקן) את `10_p0_release_policy.sql` לפי md5 `68839a70…`, ורק אחריו את `11_…` |

---

## 12. הוראת המשך מאושרת — שמונה ההחלטות (11.11.2026)

> **סטטוס:** הכנה, תיקונים בענף מבודד ובדיקות בלבד. **לא בוצעה שום כתיבה ל־DB** (גם לא ליומן, לחוזים או לקודקס), **לא הורץ SQL**, לא הייתה דחיפה, לא נפתח ולא שונה PR (כולל #1296), לא היה מיזוג, לא הייתה פריסה ולא נמחק שום נתון. כל קריאה מהמסד, מ־GitHub, מהאתר החי ומ־YouTube הייתה קריאה בלבד. כשיש הבדל בין סעיף זה לסעיפים קודמים — סעיף 12 קובע.

### 12.1 מה הושלם ומה עדיין מוצע בלבד

| נושא | מה נעשה | מצב (סולם §12 ב־`CLAUDE.md`) |
|---|---|---|
| אימות בסיס | הענף, הקומיט והחבילה נמצאו. ה־patch זהה בייט־לבייט לקומיט `921a3c150`. `origin/main` נבדק: `d6662fdcb` (#1301), ובהמשך `43c00b728` (#1302). שניהם לא נוגעים בקבצי הענף | VERIFIED |
| החלטה 1 — P0 | `10_` אומת מחדש מול המסד החי: כל טביעות הבסיס זהות, אין גרסה חדשה יותר, התלויות פעילות, ה־rollback מתאים לאותו בסיס. לא נמצאה סתירה מהותית מול `CLAUDE.md`/`AGENTS.md`; נמצאה הפניה שתתיישן (v17) והוכן לה תיקון שמוחל רק אחרי SQL 10. `11_` לא שונה | `10_`: PREPARED · לא הורץ |
| החלטה 2 — פרישת Legacy | נמצאו ותוקנו שתי הרחבות מעבר למשמעות המקורית ב־`20_`, ונוספה שורת פתיחה שמגיעה לרזיאל. צרכנים, תלויות, הרשאות ומנגנוני מספרים נבדקו. `21_`, `30_` — `is_active=false` בלבד | PREPARED · לא הורץ |
| החלטה 3 — ״בני ההיכל״ | מלאי מלא (קוד, Edge חי, DB, דפים חיים). 5 הצעות שם עם הפרדה בין שם שיווקי לתפקיד טכני. ממצא: שני דפי Legacy סטטיים מוגשים בפרודקשן | DOCUMENTED · שום שם לא שונה |
| החלטה 4 — Corpus Admission | מפת מצבים מדויקת ל־2,894 הרשומות; הצעת SQL של פונקציות בלבד (`40_`) עם rollback; סימולציה 37/37 שמוכיחה שאף רשומה לא משתנה; בקשת החרגה נפרדת מוכנה כדיף טקסט בלבד | PREPARED · לא הורץ |
| החלטה 5 — V1/V2 | `24_`: ארבעה חוקי מותג מוקפאים בהחרגה נקודתית ועוד חוק אחד שאינו מוקפא. `canonical_ui_components_law` לא נכלל (אין בו הפניה ל־V1) | PREPARED · לא הורץ |
| החלטות 6–7 — סדרות | 13 הפוסטים של אלון לוי אומתו מול ערוץ היוטיוב שלו; 5003/5004 בשיוך כפול; 9 הפוסטים האחרים לא נוספו. שינוי קוד מבוסס־נתונים, אותו כלל לשאילתה ולבדיקת השורה; בדיקות עודכנו ונוספו; `50_` מוצע לרישום ב־PLAN37 | COMMITTED (BRANCH-ONLY) · `50_` לא הורץ |
| בדיקות | Node 24.21.0 רשמי (כמו `.nvmrc` של CI), עם עזרי הבדיקה של CI; השוואת בסיס מול אחרי; סימולציות | VERIFIED מקומית · CI לא רץ (אין דחיפה) |

### 12.2 ענף, SHA, בסיס ובדיקת התנגשויות

| שדה | ערך |
|---|---|
| ענף | `ccr-b2565041-d94syf` — מקומי בלבד, לא נדחף |
| בסיס הענף | `01d96b627694d9c611b181721daa3a384284b300` |
| קומיטים בענף | `921a3c15024f5f81014db00bf6284d83d68f8908` (מסמכי חוזה, 11.11) → `6ab74289f8dd14fdb584bed038ff5919ec02c834` (סדרות, החלטות 6–7) |
| ראש | `6ab74289f8dd14fdb584bed038ff5919ec02c834` |
| `origin/main` עדכני | `43c00b728b7b1904b690c7bb80577b184ed26421` (#1302; לפניו #1301 `d6662fdcb`) — הענף 2 קומיטים לפניו ו־2 מאחוריו |
| התנגשות עם main | נקי. `git merge-tree` מול `origin/main` העדכני `43c00b728b7b1904b690c7bb80577b184ed26421` (#1302, נכנס תוך כדי העבודה) מחזיר עץ בלי קונפליקט. #1301 ו־#1302 לא נוגעים באף קובץ של הענף או של תיקוני ההפניות |
| rebase | לא בוצע (ההיסטוריה המתועדת נשמרת). יידרש rebase או מיזוג של main לפני המיזוג — החלטה שלך |

**עבודות של סוכנים אחרים (נבדק 11.11, ענפים ו־PRs פתוחים):**

| PR / ענף | תחום | חפיפה עם הענף |
|---|---|---|
| #1296 `gpt/2029-post-connections-contract-20261110` (טיוטה, GPT) | חוזה חיבורי פוסטים + שינוי זהות סדרות | **כן:** `src/lib/research/contentSeries2029Identity.js`. `git merge-tree` מול ראש #1296 (`a377d023`) מחזיר קונפליקט תוכן בקובץ הזה, כצפוי: שני מימושים לאותן החלטות |
| #1302 `ccr-d05c4578-8f9w85` | Pixel/AdSense המשך | אין |
| #1303 `media-intake-youtube-world-2029` (טיוטה) | קליטת מדיה | אין |
| `more-panel-2029-redesign` (ענף בלבד) | חלונית „עוד” | אין |
| #1288, #1283, #1259, #1246, #1218, #1211, #1204, #1203, #1199, #1189, #1187 (טיוטות ישנות) | — | נבדקו #1288 ו־#1283: אין חפיפה |

**על החפיפה עם #1296:** ה־PR מממש את אותן שתי החלטות ברמת הזהות בלבד, בקוד קשיח (`spec.key === "mah-kore-habora"`, `[5003, 5004]`), ובלי השאילתה למסד. במסמך שלו מופיע השם «צופן בתרבות», שאינו שם מאושר. השינוי בענף הזה מבוסס־נתונים (`admission` בהגדרת הסדרה), מחיל את אותו כלל גם על השאילתה וגם על בדיקת השורה, ונבדק מול ה־API החי. **צריך לבחור נשא אחד:** הענף הזה או #1296. לא נגעתי ב־#1296.

### 12.3 דיפים ובדיקות

**קבצים בענף (שני קומיטים):**

| קומיט | קבצים |
|---|---|
| `921a3c150` | 6 מסמכי md (ראו 11.2) |
| `6ab74289f8dd14fdb584bed038ff5919ec02c834` | `src/lib/research/contentSeries2029Identity.js` · `src/lib/research/contentSeries2029Projection.js` · `src/lib/research/postsCatalog2029Projection.js` · `SOD1820_CONTENT_FOUNDATION_CONTRACT.md` (הערה מתוארכת אחרי הטבלה; הטבלה של 6.11 לא שונתה) · 5 קובצי בדיקה (9 קבצים, 108+/34−) |

**מה השתנה בקוד:**
* בהגדרת הסדרה נוסף שדה `admission`, שאומר מי נכנס לסדרה. ל«מה קורה הבורא»: `exactAuthorAllPosts`, כלומר כל הפוסטים של המחבר המדויק. ל«מימד חמש»: `approvedPostIds: [5003, 5004]`. ההחלטה ותאריכה רשומים לצד כל ערך.
* נוספו `contentSeriesExclusionReason`, `contentSeriesAdmits` ו־`contentSeriesAdmissionFilter`. כלל אחד משמש גם לבדיקת השורה וגם למסנן PostgREST, כך שהשאילתה והבדיקה לא יכולות לחלוק.
* בשני מקומות, הצירוף הקודם של `.or(membership)` ו־`.eq("author")` הוחלף בפילטר הכניסה האחד. `projectContentSeriesItems` משתמש באותם קודי סיבה (`membership_not_exact` / `author_not_mapped`).
* `contentSeriesMembershipFilter` ו־`hasExactMembership` לא שונו. גם שלוש הסדרות האחרות לא שונו: הפילטר שלהן זהה לקודם, ובדיקה מאמתת את זה.
* בקוד ההקרנה לא נכתב אף מפתח סדרה. הבדיקה הקיימת שאוכפת זאת עוברת.

**אימות מול ה־API החי (GET בלבד, מפתח ציבורי):** `or=(author.eq."אלון לוי")` החזיר 13 שורות, בדיוק 13 הפוסטים. `or=(and(categories.cs.{"מימד חמש"},author.eq."בדרך לנצח"),id.in.(5003,5004))` החזיר 37 שורות: 5003, 5004 ועוד 35 פוסטים של «בדרך לנצח». הפוסט ה־36, 5088, מסומן «טיוטה» ונחסם בגבול הציבורי, כמו היום. «סוד החשמל» ו«מפת המציאות» לא השתנו.

**בדיקות (מקומיות; CI לא רץ כי אין דחיפה):**

| בדיקה | תוצאה |
|---|---|
| גרסת Node | `v24.21.0` רשמי מ־nodejs.org; SHA-256 של הקובץ אומת מול `SHASUMS256.txt` (`fd8e59d5…`). זו הגרסה של `.nvmrc` שבה CI משתמש. עזרי הבדיקה הותקנו בלי לגעת ב־`package.json` וב־lockfile: `react-test-renderer@19.3.0` ו־`esbuild@0.28.2`, כמו ב־CI |
| בדיקות הסדרות והפוסטים (43 קבצים) | בסיס: 323 בדיקות, 319 עברו, 4 נכשלו · אחרי: 325 בדיקות (2 חדשות), 321 עברו, 4 נכשלו — **אותן 4 בדיוק**, וכולן קיימות כבר בבסיס (ראו למטה) |
| כל בדיקות ה־node שאינן בדפדפן (בסיס מול אחרי) | בסיס: 3,278 בדיקות, 3,209 עברו, 56 נכשלו, 1 בוטלה · אחרי: 3,280 (2 חדשות), 3,215 עברו, 54 נכשלו. **46 כשלים משותפים לשניהם** וקיימים לפני השינוי; לא חקרתי אותם לעומק. ההבדל בין הרשימות הוא רק בבדיקות דפדפן וחישוב כבד של ELS, ב־6 קבצים שלא מייבאים את מודולי הסדרות. שתי ההרצות רצו במקביל ועמסו זו על זו. בהרצה סדרתית של 6 הקבצים: **בענף 93/93**, ובבסיס 90/93 (3 בדיקות ״executable״ שתלויות בתזמון). כלומר, אין רגרסיה |
| `scripts/test-g1-agent-routing-smoke.mjs` | 18/18 (בענף, וגם אחרי ארבעת תיקוני ההפניות) |
| `scripts/test-legacy-retired.mjs` | PASS |
| `npm run build` ב־Node 24 | הצליח: Node 24.21.0, 1,051 מודולים, כולל שלב ה־prebuild. אזהרת גודל ה־chunk קיימת מראש |
| טביעות DB בסוף (קריאה בלבד, 11.11) | זהות לפתיחה: 87 חוקים `fae24986…` · spec `ee0bbd8e…` · קודקס `efdb5db7…` (35) · PLAN37 `c06a461d…` (618,963) · 2,894 מילים `09b4e65a…` · `admin_suggestion_decide` `12961a8c…` · 4 פונקציות המילים = הבסיס · 0 פונקציות חדשות · 0 רשומות יומן ממני |
| סימולציות (PGlite, Postgres 16) ב־Node 24 | P0 **65/65** · שלבים 2–3 **34/34** · Corpus Admission **37/37** · משולבת (כל הקבצים לפי הסדר + rollback הפוך מלא) **60/60** |

**ארבעת הכשלים הקיימים בבסיס (לא קשורים לשינוי):**
* `test/home-live-updates-2029.test.mjs` — 3 בדיקות: `ReferenceError: buildNowEntries is not defined` בתוך המודול הזמני שהבדיקה בונה.
* `test/public-canonical-parity-repair.test.mjs` — נדרש הקובץ `public-reading-deploy/.generated/protected-review-build.js`, שנוצר רק בבניית הפרודקשן.

**CI:** כל ה־workflows משתמשים ב־`node-version-file: .nvmrc` (24.21.0), ולכן לא צריך שינוי CI. הבדיקות החדשות והמעודכנות הן קובצי `test/*.test.mjs`, שה־workflows הקיימים כבר מריצים. לא הוספתי workflow.

### 12.4 קובצי SQL — SHA-256 מלא ו־rollback תואם (אף קובץ לא הורץ)

כל קובץ רץ בטרנזקציה אחת ומסרב לרוץ אם הבסיס החי שונה ממה שנבדק. הבדיקה נעשית לפי md5 של הטקסט, המטא־דאטה, גוף הקודקס או הגדרת הפונקציה. אחרי הריצה כל קובץ מאמת את תוצאתו. כל ה־rollback נבדקו בסימולציה, והם מחזירים את הבסיס המדויק.

| שלב | קובץ | SHA-256 | rollback | SHA-256 של ה־rollback | מצב האישור |
|---|---|---|---|---|---|
| 1 | `10_p0_release_policy.sql` | `d1ac658b6e2ace922ac5d32a3021f6ef8aa88dc06390b05aca095da0d48963fb` | `19_p0_release_policy_ROLLBACK.sql` | `cbe420f72e2ad43bcf244aee1e49dd363ead9f4d1b499000c2ebc3adc0b0d9c4` | הנוסח אושר עקרונית (החלטה 1). **ההרצה לא אושרה** |
| 1b | `11_admin_suggestion_decide_text.sql` | `a43b12ca9542b74f49488c180ab6cccbaba8794437270c819bea6619c0a47a1a` | `18_admin_suggestion_decide_ROLLBACK.sql` | `da9d08e77f63f32c0be7ee2223e0da4f34729871c925b114fff96d2136681701` | דורש אישור DB נפרד. לא שונה מהחבילה הקודמת |
| 2 | `20_number_principles_to_2029_owners.sql` | `922aef030633ee0267cd502e904749fc362fe7b2cde40c1eb38fd3ecf91d367b` | `29_number_principles_ROLLBACK.sql` | `6c9401c252a80b25be411c6bd512f819c92e47d94e9b0f228ab37a413c578bb9` | **השתנה** מהחבילה הקודמת (12.6). דורש אישור |
| 2 | `23_shared_contracts_groupB.sql` | `3d866a4f44460b0d0617dc4a2d2b5046bb4fdbe223f3de16fb4c20218a419517` | `26_shared_contracts_groupB_ROLLBACK.sql` | `d74e1ca8fd28740b8879273af285861b94721af982d0c9fb091f6747af536272` | דורש אישור. ללא שינוי |
| 2 | `24_design_v1_v2_alignment.sql` | `3373c8193412f572c1653343b9c9718246df1e77df185de59f96da4640b3a3f9` | `25_design_v1_v2_alignment_ROLLBACK.sql` | `56a0b1ada1190bae82c522d0d091685cd3b708cbd0d6238ee73fbb9992a5db8c` | **חדש.** ההחרגה (החלטה 5) אושרה עקרונית; הכתיבה לא |
| 2 | `21_retire_9_legacy_specs.sql` | `33b62ed0a99e5b23c3dd6f199202dd2b09e418091f961fa9da9957e15c32ae9c` | `28_retire_9_legacy_specs_ROLLBACK.sql` | `78abfec26388cb1f85a81290dc4c53f2552f9cd04317a1abef6898ca799d6510` | הפרישה אושרה עקרונית (החלטה 2). נדרש אישור DB מדויק |
| 2 | `22_codex_stale_banners.sql` | `17cfccb1df22108a671c9340d24e9a279fd8912ee54c8fc7b313be58c5859ae6` | `27_codex_stale_banners_ROLLBACK.sql` | `46711d380195df6c6c78d7b8d704ed6c8b015a50a9948068555aa4f73b70e8f2` | דורש אישור |
| 3 | `30_STAGE3_retire_number_laws.sql` | `804c9bb7062fe9ba71f75028ef3591fcf284ab5ad8ac99ab988fc5a02b08ff8f` | `39_STAGE3_retire_number_laws_ROLLBACK.sql` | `6d5563e804642be3675f8a9da1bbeb4a1d16eab3f8977e18abf4a6109a968374` | נעול: מסרב לרוץ לפני ש־`20_` הוחל ואומת |
| — | `40_corpus_admission_approval_path.sql` | `3b0295a0f5d2ba1f1f63e256b7431dc2d744305af78bda579f4a5eb6fc2ffa94` | `49_corpus_admission_approval_path_ROLLBACK.sql` | `0b0ff3dcbca911bb7e3ea6625a9d9581aef82144c912bb797fae8c8aab0ac214` | **חדש.** הצעה (החלטה 4). דורש אישור DB |
| — | `50_plan37_series_decisions_6_7.sql` | `c8cef8ca00b56e03856d54326c83abaffeb4b612e63066b0ec86dea6fe5ac9ee` | `59_plan37_series_decisions_6_7_ROLLBACK.sql` | `fb1f9aec80f0231dadecc8171e95d6771dfadbe4ab008cc43c83bea20f0c5315` | **חדש.** רישום ההחלטות 6–7 ב־PLAN37. append בלבד. דורש אישור |

**הערה על `20_`:** ה־rollback שלו (`29_`) ושלב 3 (`30_`) לא השתנו ונשארו תקינים. הסיבה: הם בודקים את הגרסה ואת הסמנים בטקסט, לא את ה־md5 של הנוסח החדש. זה נבדק בסימולציה.

### 12.5 החוקים, המפרטים והשורות שצפויים להשתנות

| קובץ | יעד | שינוי |
|---|---|---|
| `10_` | `deploy_on_request` v3→v4 · `inter_agent_coordination_law` v17→v18 · `foundation_closure_protocol_law` v7→v8 · `system_suggestions_law` v5→v6 · קודקס #4 `publishing_conventions` · #9 `branches_deploy` | אין הרשאה עומדת; 2029 הוא המוצר היחיד (הנוסח המדויק: נספח 12.A) |
| `11_` | הפונקציה `admin_suggestion_decide` | שתי מחרוזות: ״…may classify AUTO_RELEASE_NOW under deploy_on_request v2…״ ← ״…READY_FOR_APPROVAL: merge and deploy only after explicit approval by ZURIEL of the exact action (deploy_on_request v4, no standing authorization)…״, ושורת ה־provenance ← v4/v18. החתימה, `SECURITY DEFINER`, ההרשאות והלוגיקה לא השתנו. ההגדרה המלאה: `new/fn/admin_suggestion_decide.sql` בחבילה. הדיף: `diff/fn_admin_suggestion_decide.diff` |
| `20_` | `platform_tiers_law` v5→v6 · `canonical_methods_registry_law` v6→v7 | §19–21 ו־§26–27 (12.7), ושורת פתיחה לחלון של רזיאל |
| `23_` | `worlds_color_law` v1→v2 · `subscription_funnel_law` v22→v23 · `experience_governance_foundation_v1_law` v10→v11 · `identity_architecture_law` v1→v2 · קודקס #1, #5, #12, #15, #30 | יישור להסרת Legacy; המשמעות לא שונתה |
| `24_` | `brand_spelling_law` v1→v2 · `canonical_colors_law` v2→v3 · `logo_integrity_law` v3→v4 · `sod1820_canonical_identity_law` v5→v6 (ארבעתם מוקפאים — החרגה נקודתית) · `research_workspace_law` v5→v6 (לא מוקפא) | בעלים V1→V2 בלבד (12.8) |
| `21_` | 9 רשומות `type='spec'` | `is_active=false` בלבד. ״בני ההיכל״ (`875ec683…`) מוחרג, והקובץ בודק שהוא נשאר פעיל |
| `22_` | קודקס #2 `project_overview` · #3 `data_model_map` · #8 `system_rules_index` · #13 `number_page_1820` | באנר STALE בראש הגוף; הגוף נשמר במלואו |
| `30_` | `number_page_law` v1 · `no_row_without_number_law` v1 | `is_active=false` בלבד; התוכן לא נוגע (`number_page_law` מסומן `immutable`) |
| `40_` | הפונקציות `resolve_word_review`, `wa_word_review`, `admin_bulk_triage`, `admin_hide_word` (אותן חתימות) + 4 חדשות | 12.10. אין שינוי בנתונים |
| `50_` | קודקס #37 (PLAN37) | הוספת סעיף 12.58 בסוף; 618,963 התווים הקיימים לא נוגעים |

**לא ישתנו:** ה־spec ״בני ההיכל״; `word_approval_required_law` (נשאר פעיל); `corpus_admission_foundation_v1` (מוקפא; לא הוכן SQL — 12.10); 45 מתוך 49 החוקים המוקפאים; `canonical_ui_components_law`; `unified_tags_law`; כל נתוני WordPress, המזהים ההיסטוריים, ההפניות, התמונות, הפוסטים ונתוני הגימטריה. הנקודה האחרונה נבדקה: אף קובץ לא נוגע ב־`posts`, `gematria_words`, `post_gematria_links`, בטבלאות מדיה או בטבלאות `wp_*` (בדיקה [11] בסימולציה). היוצא מן הכלל: `40_` מחליף פונקציות שעובדות על מילים, ומוכח בסימולציה שהוא לא משנה אף רשומה.

### 12.6 החלטה 1 — P0: אימות מחדש, נוסח מדויק וסתירות

**אימות חי (קריאה בלבד, 11.11):**

| יעד | גרסה פעילה | md5 תיאור | md5 מטא־דאטה | גרסה חדשה יותר? | תלוי ב (פעילים) | חוקים שתלויים בו |
|---|---|---|---|---|---|---|
| `deploy_on_request` | v3 | `f93e73ce…` ✓ | `8a4b80b7…` ✓ | לא | — | `system_suggestions_law` |
| `inter_agent_coordination_law` | v17 | `02d188d1…` ✓ | `982e7976…` ✓ | לא | `live_state_resolution_law` (v3 פעיל) | `system_suggestions_law` |
| `foundation_closure_protocol_law` | v7 | `336934e5…` ✓ | `b26961fa…` ✓ | לא | — | — |
| `system_suggestions_law` | v5 | `9b5c19de…` ✓ | `aa247fb2…` ✓ | לא | `ai_analyze_contract`, `deploy_on_request`, `inter_agent_coordination_law`, `raziel_routing_law`, `research_strategy_layer_law`, `traffic_intelligence_law` (כולם פעילים) | `canonical_ui_components_law`, `els_research_layer_law`, `raziel_routing_law` |
| קודקס #4 / #9 | — | `26b473b7…` ✓ / `6cee6559…` ✓ | — | — | — | — |

ההפניות ב־`depends_on` הן לפי מזהה החוק, לא לפי גרסה. לכן העלאת גרסה לא שוברת אותן.

**ה־rollback מתאים לאותו בסיס:** `19_` משחזר את שני גופי הקודקס המדויקים, אחרי שבדק שהם במצב של `10_`. בחוקים הוא מכבה את v+1 ומפעיל מחדש את v, שלא נגעו בה. בסימולציה: הבסיס שוחזר בדיוק, והרצה שנייה סורבה.

**סריקה חיה של הרשאה עומדת** (13 תבניות, על כל 87 החוקים, 35 שורות הקודקס וכל הפונקציות): כל ההתאמות נמצאות רק ביעדים של `10_`/`11_`. היוצא מן הכלל: קודקס #38, מסירת סשן היסטורית שמתארת את v3.

**סתירות מול `CLAUDE.md` / `AGENTS.md`:** לא נמצאה סתירה מהותית.
* אישור מפורש למיזוג ולפריסה, מיזוג≠פריסה, שני אישורים נפרדים, אישור ל־DB — כולם מתאימים ל־`CLAUDE.md` §0.4, לכלל 7 ול־`AGENTS.md:9`.
* ההפניות ל־`CLAUDE.md` (״נוהל פריסה ל־Production מסשן ענן״, §0.4, כלל 7) קיימות.
* כלל הדיווח הפסיבי של v17 נשמר ב־v18.
* **נמצאה הפניה אחת שתתיישן** אחרי `10_`: `CLAUDE.md:89`, `AGENTS.md:16` ו־`AGENT_HANDOFF.md:6` אומרים ״החוק הפעיל `inter_agent_coordination_law v17`״. ב־Owner Index וב־Roadmap נעוצים v3/v7/v5, וגם בדיקת ה־smoke נועצת ״v17 ACTIVE״. לכן הוכנו **ארבעה תיקוני הפניות** (`post-db/` בחבילה), אחד לכל שלב, וכל אחד מוחל **רק אחרי** שה־SQL שלו הוחל ואומת:

| patch | אחרי | קבצים |
|---|---|---|
| `0001-…after-SQL-10…` | `10_` | `CLAUDE.md`, `AGENTS.md`, `AGENT_HANDOFF.md` (v17→v18, ״נושא את כלל הדיווח של v17 ללא שינוי״), Owner Index (v3→v4, v7→v8, v17→v18, v5→v6), Roadmap (v7→v8, v5→v6), בדיקת ה־smoke (v17→v18) |
| `0002-…after-SQL-20…` | `20_` | Owner Index (`canonical_methods_registry_law` v7, `platform_tiers_law` v6), Roadmap |
| `0003-…after-SQL-23…` | `23_` | Owner Index (`subscription_funnel_law` v23, `experience_governance_foundation_v1_law` v11), Roadmap (v8→v11; היה מיושן עוד קודם) |
| `0004-…after-SQL-24…` | `24_` | Owner Index (`research_workspace_law` v6) |

עם ארבעתם: smoke 18/18 ושער ה־Legacy PASS. השינוי ב־`scripts/test-g1-agent-routing-smoke.mjs` הוא עדכון נעיצה מ־v17 ל־v18, לא החלשה. ובכל זאת זה קובץ בדיקה של G1, ולכן הוא דורש את הכרעתך.

**`11_` / `admin_suggestion_decide`:** לא שונה. מוצג לאישור DB נפרד: הדיף המלא בחבילה, וסימולציית P0 מריצה את הפונקציה המתוקנת ואת ה־rollback שלה. נשאר פתוח, ולא תוקן: הפונקציה עדיין יוצרת `ASSIGNMENT`/`QUEUED` ל־CLAUDE, בניגוד למדיניות v17.

### 12.7 החלטה 2 — פרישת Legacy

**1. העקרונות עברו לחוזי 2029 — בלי הרחבה.** בבדיקה מחדש מול הנוסח המקורי מצאתי ב־`20_` הקודם שתי הרחבות, ותיקנתי אותן:

| עיקרון | מה היה רחב מדי | הנוסח המתוקן |
|---|---|---|
| ד4 — `platform_tiers_law` §19 | חל על **כל מספר**, ועל ״access, entitlement, availability and budget״ | רק ״דגם התצוגה של מספרי יסוד וישויות זהב (במיוחד 1820) ודפי המספר שלהם״, כמו ב־v1. ״מנוי לא מסתיר את המספר״: המספר, הגימטריות, החתימות וה־DNA הבסיסי פתוחים לכולם, ושכבת החינם רשאית להציג מדגם תחום של ההתאמות. העומק — לפי רשימת v1 המלאה, כולל ״מסר אישי מהדאטה״. §20 מוסיף: ״בלי להרחיב לאף מספר או שער אחר״ |
| ד1 — `canonical_methods_registry_law` §26 | ״never typed by hand and never computed by a general model״ | ״הערך השמור, או — כשאין ערך שמור — הערך שהמנוע הקנוני מחשב בזמן הרינדור (כמו ש־v1 דרש: calcGem / fn_ragil)״, בהקשר המקורי בלבד: רשימות ביטויים, ישויות או חתימות שמוצגות כהתאמות. ההחרגה ״ערך שמשותף לכל הרשימה מוצג פעם אחת״ מסומנת כצמצום לפי ד1 (10.11) |

**2. מנגנוני מספרים — ממצא ותיקון.** `fn_raziel_relevant_rules` בוחר חוקים לפי מילות מפתח ומעביר לרזיאל רק את **600 התווים הראשונים** של כל חוק. היום רזיאל מקבל את העיקרון מתחילת `number_page_law`. §19 ו־§26 נוספו בסוף היורשים, ולכן לא היו מגיעים אליו. לכן נוספה ליורשים שורת פתיחה קצרה ותווית בעברית (״המספר לא מוסתר, העומק כן״, ״ערך ליד כל שורת התאמה״). בסימולציה העיקרון נמצא בחלון של שני היורשים (בדיקה [4b]). שאר החלון נשאר בלי שינוי, חוץ מכ־200 תווים שזזו לסופו.

**3. צרכנים פעילים — אין.**
* 9 רשומות ה־spec: 0 הפניות לפי מזהה ב־`origin/main` העדכני. ההתאמות לתוויות ״הצופן התנ״כי״ ו״ארכיון ההתגלות״ הן שמות מוצר בממשק, לא קריאה של רשומת spec.
* במסד: 0 קשתות (`edges.from_node/to_node`), 0 הפניות במטא־דאטה של צמתים אחרים ו־0 הפניות בקודקס. אין פונקציה או view שקוראים `type='spec'`.
* `fn_raziel_relevant_rules` קורא רק `type='rule'`.

**4. תלויות, הרשאות והפניות.**
* אף חוק פעיל לא תלוי ב־`number_page_law` או ב־`no_row_without_number_law`, ואף חוק פעיל לא מזכיר אותם. אין פונקציה שמזכירה אותם, ו־0 הפניות בקוד ובבדיקות.
* ההפניות היחידות: מסמכי audit היסטוריים, וקודקס #13 שמקבל באנר STALE.
* RLS על `nodes`: קריאה ציבורית לפי `fn_graph_space_is_public(metadata)`, וקריאת אדמין לפי `rd_is_admin()`. `is_active=false` לא משנה הרשאה.

**5. שמירת נתונים:** אף קובץ לא נוגע בנתוני WordPress, בפוסטים, בתמונות, במזהים היסטוריים או בגימטריה (12.5). השורות שנפרשות נשארות כהיסטוריה (`is_active=false`), ולא נמחקות.

**6. ⚠ סתירה שאני מדווח (`CLAUDE.md` כלל 1): שני דפי Legacy מוגשים בפרודקשן.** `public/heichal.html` הוא ״היכל השערים״ התלת־ממדי של Legacy, שנוצר ב־11.6.2026 (`daff8af1`) ונגעו בו לאחרונה ב־#593, 20.9. `public/preview.html` הוא דף תצוגה מ־8.6.2026. בבניית 2029, Vite מעתיק את `public/` לתוצר, ושניהם מחזירים 200 ב־`sod1820.co.il` (נבדק ב־GET). `heichal.html` גם קורא את הטבלה `gates` מהמסד, עם המפתח הציבורי. הם לא מופיעים ברשימת השאריות של REMOVAL.md. לפי הכלל לא מחקתי ולא ״השלמתי הסרה״. נדרשת הכרעה שלך. עוד חמישה דפי HTML סטטיים מ־`public/` מוגשים חי (`book`, `entity-hub-observatory-1237`, `journey-preview-1237`, `kolombia`, `tzofen`); לא סיווגתי אותם.

### 12.8 החלטה 5 — החרגה נקודתית V1/V2

סריקה חיה של כל החוקים הפעילים לפי ״DESIGN_CONTRACT_V1״ מצאה שבעה. ההחרגה חלה רק על המוקפאים שבהם:

| חוק | גרסה | מוקפא (ד5)? | מה משתנה בדיוק |
|---|---|---|---|
| `brand_spelling_law` | v1→v2 | כן — מוחרג | מטא־דאטה `owner_routing.canonical_owner` ו־`compaction_v1.canonical_owner`: V1→V2 (+`previous_canonical_owner`) · שורת הערה בסוף התיאור |
| `canonical_colors_law` | v2→v3 | כן — מוחרג | כנ״ל · התווית ״…v2…״←״…v3…״ |
| `logo_integrity_law` | v3→v4 | כן — מוחרג | 2 שורות בתיאור: ״EXTEND_EXISTING under SOD1820_DESIGN_CONTRACT_V1.md.״ ← ״…V2.md (written under V1; V1 is kept as history).״ · ״10. ONE OWNER. This rule extends SOD1820_DESIGN_CONTRACT_V1.md / …״ ← ״…V2.md (formerly V1) / …״ · מטא־דאטה (`canonical_owner` עליון + השניים) · הערה · התווית v3←v4 |
| `sod1820_canonical_identity_law` | v5→v6 | כן — מוחרג | שורה אחת בתיאור: ״EXTEND_EXISTING only under SOD1820_DESIGN_CONTRACT_V1.md.״ ← ״…V2.md (written under V1; V1 is kept as history).״ · מטא־דאטה · הערה · התווית v5←v6 |
| `research_workspace_law` | v5→v6 | לא | `visual_owner` V1→V2 (+`previous_visual_owner`) · הערה |
| `worlds_color_law` | (ב־`23_`) | לא | כבר ב־`23_` |
| `foundation_closure_protocol_law` | — | לא | false positive: שם קובץ audit שמסתיים ב־`_V1.md` |

* **`canonical_ui_components_law` לא נכלל:** אין בו הפניה ל־V1. ההחרגה לא פותחת מחדש את 49 החוקים. בסימולציה: מבין ה־49 בדיוק ארבעת החוקים האלה מקבלים גרסה (בדיקה [9]). אחרי ההחלה, אף חוק פעיל לא מציין את V1 כבעלים (בדיקה [10]).
* **מחרוזות שהבדיקות תלויות בהן:** בדיקת ה־smoke קוראת את V1 ואת V2 מהריפו (״V1 remains historical/Legacy provenance״, ״2029 STATUS: SUPERSEDED by״, ״V1 is retained for Legacy compatibility…״). V1 לא נגוע, ו־V2 שומר את המחרוזת. אף בדיקה או קוד לא קוראים את הטקסט של חוקי המותג מהמסד.
* **השפעה על המותג ועל רכיבי 2029:** רק הפניית הבעלים משתנה; ערכי הצבע, הלוקאפ, הכתיב והזהות לא משתנים. רכיבי 2029 לא קוראים את החוקים בזמן ריצה. רזיאל יראה ״V2״ במקום ״V1״ בשורת הבעלים, שנמצאת בתוך חלון 600 התווים. הערות בקוד מצטטות גרסאות ישנות (למשל `systemFrame2029.css`: ״canonical_colors_law v2״); הן לא תפקודיות, ולא שיניתי אותן.
* **ההחרגה אינה אישור כתיבה ל־DB:** `24_` ממתין לאישור נפרד.

### 12.9 החלטה 3 — ״בני ההיכל״: מלאי מלא והצעות שם

**איפה השם מופיע היום** (`origin/main` = `d6662fdcb`, המסד החי, האתר החי ופונקציית ה־Edge הפרוסה):

| סוג | מיקום | מה כתוב | מי רואה |
|---|---|---|---|
| חי | `src/components/SubscribeGate.jsx:43` (+ הערה ב־:11) | ״זה לא אזור המנויים «בני ההיכל»״ | משתמשים |
| חי | `api/og.js:118–119` | כותרת ה־OG של `/members`: ״בני ההיכל · …״, ״אזור המנויים — שיעורים, קורסים, עץ מתקדם וצפנים בלעדיים״, ״הצטרפו להיכל״. אבל ב־2029 `/members` = ״אנשים בקהילה״ (`og.js:529`, `App2029.jsx:350`) | שיתופים ומנועי חיפוש |
| חי | `src/lib/marketing.js:87` | הערה ליד מיפוי אירוע Meta Pixel ‏`members_signup` | קוד בלבד |
| חי | Edge `ai-analyze`, גרסה 91 פרוסה (`ezbr 2c810072…`) | ״/members — מנוי מתקדם (בני ההיכל)״ בפרומפט של רזיאל | רזיאל — עלול למסור מידע שגוי |
| חי ⚠ | `public/heichal.html` · `public/preview.html` (דפי Legacy, 12.7.6) | ״השער ייפתח למוזמנים בלבד — רק בני ההיכל״, ״🔐 רק בני ההיכל״, ״קריאת העומק — לבני ההיכל״, ״הצטרף אל בני ההיכל״ | כל מי שנכנס לכתובת |
| DB | טבלת `gates`, שורת `heichal` (נקראת רק על ידי `heichal.html`) | ״השער ייפתח למוזמנים בלבד — רק בני ההיכל.״ | דרך הדף הנ״ל |
| DB | `page_content` — `beit-midrash/mistater` | ״הצטרפו לבני ההיכל״ | אין קורא ב־2029 |
| DB | spec `bnei_haheichal` (פעיל) · specs ‏`site_master_plan`, `site_menu` (פעילים; פורשים ב־`21_`) · `number_page_law` v1 (פעיל; פורש בשלב 3) | — | סוכנים |
| DB היסטוריה | חוקים לא פעילים: `platform_tiers_law` v1 (״בני היכל״), `number_as_gateway` v1, `subscribe_gate_law` v1–v2, `ecosystem_gates_activity_feed` v2, `learning_sharing_architecture` v1, `master_vision_6_layers` v1, `vision_page_principles` v2, ״שפת עיצוב — ההיכל המלכותי״ v1 · קודקס #13 (באנר STALE) · 21 רשומות יומן | — | היסטוריה, לא לגעת |
| מסמכים היסטוריים | `SOD1820_CLAUDE_SESSION_EXPORT.md:38` (PayPlus ל«בני ההיכל») · `docs/work-journal.md:195` · הערה במיגרציה `20260723_…` | — | היסטוריה |
| `platform_tiers_law` v5 (פעיל) | — | לא מזכיר את השם. §18 משאיר את שמות התוכניות להכרעה עתידית | — |

בפועל אין מוצר מאחורי השם: כל 229 המשתמשים ב־`users.tier=free` וב־`profiles.tier=0`, ואין תפקיד או דרגה כאלה. יש פיילוט תשלום אחד בלי שם ציבורי.

**הצעות שם (5).** כולן בלי ״היכל״, כי ״היכל״ הוא השם הציבורי של סביבת המחקר. כולן בלי ״בני״, כדי שלא יהיו מגדריות:

| שם | משמעות | איפה במוצר | מה הוא מתאר | הערות |
|---|---|---|---|---|
| **«חוג הכתר»** | החוג הפנימי סביב הכתר, הסמל המרכזי של המותג (הכתר בלוגו, ״כי לה׳ המלוכה״). ״כתר״ הוא גם הספירה העליונה, וזה רומז לעומק | שם התוכנית בתשלום (שכבת העומק): דף ההצטרפות, התשלום ותג בפרופיל | **דרגת חברות** (שם שיווקי של תוכנית) | שם בלבד, בלי אייקון כתר לבדו (`logo_integrity_law`: ״Crown Never Alone״) |
| **«יודעי הסוד»** | מי שנכנסים עמוק יותר לתוך הסוד. מתחבר לעיקרון «המספר לא מוסתר, העומק כן» ולשם «סוד 1820» | שם התוכנית בתשלום | **דרגת חברות** | צריך לנסח ״עומק, לא הסתרה״, כדי שלא יישמע כידע סודי |
| **«בסוד ישרים»** | מתהילים קיא, א: ״בְּסוֹד יְשָׁרִים וְעֵדָה״. כאן ״סוד״ הוא חוג קרוב, וזה קושר לשם המותג | שם מרחב הקהילה של החברים (קבוצת אנשים), לא שם התוכנית | **קהילה** | משלב גבוה ופורמלי |
| **«חצר המלכות»** | החצר סביב המלך (העדשה ״כי לה׳ המלוכה״) | שם המקום של החברים (האזור), והתוכנית בתוכו | **קהילה / מרחב** | קונוטציה היררכית; ״מלכות״ היא גם ספירה |
| **«שומרי הסוד»** | התומכים שמחזיקים את המפעל | הכרה בתומכים משלמים | **מנוי** (תומך) + תג קהילה | צירוף נפוץ, ועם קונוטציה של ״שמירת סודות״ |

**הפרדה בין שם שיווקי לתפקיד טכני ולהרשאות:**
* **תוכנית (טכני):** מזהה יציב שאינו תלוי בשם, למשל `plan_depth_v1`. הזכאויות מוגדרות לפי יכולת, בשרת, לפי `platform_tiers_law` §15 (למשל ניתוח רזיאל). החלפת שם לא נוגעת בהן.
* **הרשאות:** `users.role` (admin/user) לא משתנה. אף שם לא מקודד הרשאה.
* **קהילה:** סולם הזהות של `identity_architecture_law` (אנונימי → מזוהה־רך → חשבון → חוקר → תורם). שם קהילה הוא תווית של קבוצה, לא הרשאה.
* **נתיב:** `/members` נשאר ״אנשים בקהילה״. אם יידרש דף תוכנית, הוא יקבל נתיב נפרד (החלטת מוצר).

**המלצה:** «חוג הכתר» לתוכנית העומק בתשלום. אם תרצה שם נפרד למרחב הקהילה — «בסוד ישרים»; אחרת שם אחד לשניהם.
**אחרי שתבחר:** מתקנים את ארבעת האזכורים החיים (טקסט `SubscribeGate`, מפת ה־OG, הערת `marketing.js` ופרומפט רזיאל — האחרון דורש פריסת Edge), ומכריעים על שני דפי ה־Legacy, על שורת `gates`, על ה־spec ועל §20 ב־`platform_tiers_law`. כל זה באישור נפרד. בינתיים לא שיניתי דבר.

### 12.10 החלטה 4 — Corpus Admission: תוכנית ושמירת המצב של 2,894 הרשומות

**המצב המדויק** (חתימה `09b4e65afbaee2962aea42ca0624df58`, נבדקה שוב ב־11.11 וזהה). **אף אחת מהשורות האלה אינה ציבורית.** הקריאה האנונימית דורשת `is_verified=true` **וגם** `is_published=true` (מדיניות `anon_read_verified_gematria`).

| מצב | שורות | `visibility_reason` | מה זה אומר |
|---|---|---|---|
| **דחייה** | 1,388 | `rejected_by_admin` | החלטת אדמין קיימת; לא נוגעים |
| **הסתרה** | 115 | `bulk_hide_2026_07_03` | הוסתרו בבת אחת ב־3.7; לא החלטה פרטנית |
| **חשיפה (תווית בלבד)** | 590 | `exposed_general_clean` | תווית מטיפול קודם; בפועל לא ציבורי, כי `is_verified=false` |
| **חוסר סיבה** | 634 | (ריק) | ייבוא אקסל מ־5.6.2026, לא נבדק |
| חוסר סיבה — מקור צוריאל | 11 | (ריק) | מקור ״ZURIEL session/Human Gate״, 30.9–18.10 |
| חוסר סיבה — culture_cipher | 6 | (ריק) | מטריקס/דיונון, 29.9 |
| **המתנה אמיתית (ערוץ)** | 41 | `pending_wa` 29 · `pending_review` 12 | `wa-vip`, 4–5.7 |
| המתנה — פורמט שהמנוע לא מאמת | 108 | `pending_review` 79 · `exposed_general_clean` 29 | לא עברית נקייה; המנוע מאפס את `is_verified` |
| המתנה — אחר | 1 | `pending_review` | מקור אחר, 8.6 |
| **סה״כ** | **2,894** | | 0 מקושרות לפוסטים · 14 שורות בתור, כולן נדחו |

**מה מצאתי במנגנון הקיים (מתקן את 11.7):**
1. `rd_is_admin()` הוא בדיוק `users.role='admin'` לפי `auth.uid()`. כלומר אין שתי הרשאות שונות; זה אותו תנאי, שממומש פעמיים.
2. `wa_word_review('approve')` קובע `is_verified=true` ישירות, בלי בדיקת מנוע. זה סותר את `corpus_admission_foundation_v1`, שלפיו `is_verified` שייך למנוע ולעולם לא מסמן אישור אנושי. `word_approval_required_law` אומר ״אישור = wa_word_review(approve)״, ולכן יש כאן סתירה בין שני חוקים פעילים.
3. `wa_word_review('delete')` מוחק מילה פיזית, ו־`post_gematria_links` מוגדרת עם `ON DELETE CASCADE`, כך שהקישורים של המילה לפוסטים נמחקים איתה. `resolve_word_review('delete')` מוחק את שורת התור ואת תיעוד ההחלטה.
4. `admin_bulk_triage` מאשרת או דוחה המונית לפי היוריסטיקה (`_word_rec`). היא ניתנת להרצה על ידי `PUBLIC`, ונחסמת בתוכה רק על ידי בדיקת אדמין.
5. הטריגר `wrq_emit_contribution` מזכה את `submitted_by` ב־״word_approved״ ברגע האישור. אם אדמין יכניס מילה קיימת לתור, האדמין יקבל קרדיט על מילה שלא תרם.
6. `resolve_word_review('approve')` על ביטוי שקיים כמילה שנדחתה מעביר אותה ל־`approved_by_admin`. זה שינוי בדיעבד של החלטת אדמין.

**ההצעה — `40_` (פונקציות בלבד; אין שינוי בנתונים):**
* `resolve_word_review` v2:
  * שורה שכבר הוכרעה לא מוכרעת שוב, ו־`delete` חסום (״delete_disabled_use_reject״).
  * מסלול חדש למילה קיימת (`entity_word_id`): אישור מסמן `approved_by_admin` ומריץ את בדיקת המנוע, ו־`is_verified` נקבע לפי המנוע. דחייה מסמנת `rejected_by_admin` בלי מחיקה. עריכה ומיזוג של מילה קיימת דורשים החלטה נפרדת.
  * במסלול המקורי: אסור להפוך מילה שאדמין דחה.
  * כל החלטה נרשמת ב־`decision_ledger` עם זהות האדמין, המצב הקודם והמצב החדש.
* `wa_word_review` v2: `delete` חסום. האישור מסמן `approved_by_admin` ו־`is_verified` נקבע לפי המנוע. החלטת אדמין קיימת נשמרת. כל החלטה נרשמת ביומן.
* `admin_bulk_triage` v2: מושבתת לאדמין (שגיאה מפורשת). למי שאינו אדמין היא ממשיכה להחזיר ‎-1, כמו היום.
* `admin_hide_word` v2: אותה פעולת מודרציה, עם רישום לכל מילה. שורות שכבר נדחו לא נוגעות.
* חדש — `admin_corpus_admission_state_v1()`: דוח קריאה בלבד של המצבים למעלה, כולל חתימת המצב.
* חדש — `admin_corpus_enqueue_existing_words_v1(uuid[])`:
  * מכניס לבדיקה רק מילים שאדמין בחר, עד 200 בקריאה. לא משנה אף מילה.
  * מסרב למילה מאומתת, למילה שכבר הוכרעה, לכפילות ולביטוי שכבר נמצא בתור.
  * `submitted_by` נשאר ריק, כדי שלא יוענק קרדיט. המצב הקודם נשמר ב־`flags.prior_state`, ומי שהכניס נשמר ב־`flags.enqueued_by`.
* הרשאות: `anon` לא יכול להריץ אף פונקציה חדשה, והפונקציות הפנימיות לא זמינות ללקוחות.

**הסימולציה (`run_corpus_sim.mjs`, 37/37, על עותק של 2,894 השורות שאומת מול החתימה החיה):**
* התאמה: ה־md5 של 4 ההגדרות החיות זהה, וההחלה עוברת.
* ההחלה לא משנה אף מצב ואף ספירת שורות, ו־2,894 נשארות זהות. הרצה שנייה מסורבת.
* הדוח מחזיר בדיוק את הספירות שלמעלה.
* כל חוקי ההכנסה לתור מתקיימים, כולל חסימת כפילות ושורה בלי קרדיט.
* אישור ודחייה: ב־`decision_ledger` נרשמים האדמין, המצב הקודם והמצב החדש. ביטוי שאינו עברית נקייה מאושר אבל נשאר `is_verified=false`.
* `delete` מסורב בשני המסלולים, והמילה וקישור הפוסט נשארים. `admin_bulk_triage` לא משנה דבר. מי שאינו אדמין מסורב.
* המסלול המקורי ממשיך ליצור ולאשר מילה חדשה, ולא הופך מילה שנדחתה.
* רק שלוש השורות שהוכרעו במפורש השתנו. ה־rollback מחזיר את ההגדרות בייט־לבייט, ואין בקובץ DML מחוץ לגופי הפונקציות.

**החרגה מהקפאת ד5 — לא נדרשת עכשיו.** `40_` עקבי עם הטקסט הנוכחי של `corpus_admission_foundation_v1` ולא נוגע בו: `approved_by_admin` במסלול התור, זהות בארבע רמות, ובלי מיזוג אוטומטי. ההחרגה **תידרש רק** בשלב האחרון: כשמעבירים את העיקרון של `word_approval_required_law` (״שום מילה לא עולה אוטומטית…״) ואת הכללים החדשים (אישור = `visibility_reason`, רישום ביומן, בלי מחיקה, בלי החלטות המוניות) לתוך `corpus_admission_foundation_v1` v2, לפני שפורשים את החוק הישן.
* **הבקשה המדויקת:** החרגה של `corpus_admission_foundation_v1` בלבד, v1→v2. בלי שום שינוי בנוסח הקיים, רק תוספת אחת: הדיף ב־`diff/rule_corpus_admission_foundation_v1_v1_to_v2.PROPOSED_REQUIRES_EXEMPTION.diff`.
* לא הוכן לזה SQL, ו־`word_approval_required_law` נשאר פעיל.

**סדר מוצע:** אישור `40_` → מסך אישור ב־`/2029/control` (החלטת מוצר) → בדיקה על דגימה שתבחר → הכרעה על ההחרגה ועל הפרישה.

### 12.11 החלטה 6 — «מה קורה הבורא»: 13 הפוסטים של אלון לוי

**אימות הזהות:**
* אין רשומת `contributors` לאלון לוי. האימות נעשה לפי המקור.
* בדקתי ב־oEmbed הציבורי של YouTube את 13 מזהי הסרטונים שמוטמעים בפוסטים: כולם מהערוץ **״אלון לוי - מה קורה הבורא״** (`youtube.com/@alonlevifaithfull`).
* בקבצים שבאחסון יש שמות שמזהים אותו (`alon-mondial`, `alon-levi-yuval`, `spain-alon-levy`). בכל 13 הפוסטים התוכן מציין אותו.
* השם ״מה קורה הבורא״ הוא שם הערוץ שלו.
* אין אף פוסט אחר שהמחבר שלו ״אלון לוי״. רק פוסט 149, עם מחבר ריק, מזכיר אותו בתוכן; הוא לא ייכלל.

| ID | כותרת | מחבר · מקור | קשר לסדרה | תגיות רלוונטיות | תוכן מקורי שלו? | סיכון |
|---|---|---|---|---|---|---|
| 54 | השפה הסמלית של הבורא — איך הבורא מתקשר איתנו דרך החרקים… | אלון לוי · WordPress (wp 35531), 11.3.2025 | בלי תגית. מטמיע 11 סרטונים מהערוץ שלו, חלקם פרקי «מה קורה הבורא» | «אלון לוי» · הרצאות, תיעוד אירועים | **חלקית:** טקסט בקול של SOD1820 (״בערוץ שלנו…״) וסרטונים שלו | **פוסט־אוסף** מלפני הסדרה, בתוך רשימת פרקים. להכרעתך |
| 5021 | צרפת וספרד במונדיאל — הקוד הנסתר בנבואת עובדיה | אלון לוי · ai, 16.7.2026 | בלי תגית; סרטון `alon-mondial.mp4` | — | כן (כתבה מסרטון שלו) | נמוך; מלפני שם הסדרה |
| 5035 | יובל קוגן ורס״ן יובל עזרא הי״ד — הסוד שבשם «יובל» | אלון לוי · ai, 29.7.2026 | בלי תגית; ״מתוך הסרטון של אלון לוי״ | — | כן | נמוך |
| 5042 | מה קורה בספרד? המסר הנסתר מאחורי השריפות — ונבואת עובדיה | אלון לוי · ai, 8.8.2026 | בלי תגית; `spain-alon-levy.mp4` | «אלון לוי» | כן | נמוך |
| 5069 | מלי וליאל יהלומי — הקוד הנסתר מאחורי ההיעלמות | אלון לוי · ai, 17.8.2026 | בלי תגית; קליפ, ו**אותה הרצאה ביוטיוב כמו 5076** (`Vpci759lTAg`) | «אלון לוי» | כן | **אותה הרצאה תופיע פעמיים** בסדרה. להכרעתך |
| 5076 | מה קורה הבורא — הסודות הקבליים של מלי וליאל יהלומי ורעידות האדמה | אלון לוי · ai, 18.8.2026 | חבר (תגית) | «מה קורה הבורא» | כן | — |
| 5081 | הספינה אלטלנה, חודש אלול ושיר «נדנדה» של ביאליק | אלון לוי · ai, 25.8.2026 | חבר (תגית) | כנ״ל | כן | — |
| 5092 | אסון השיטפון בנפאל — הצופן של יום הדין ונבואת נחום | אלון לוי · ai, 30.8.2026 | חבר (תגית) | כנ״ל | כן | קובץ הווידאו נקלט בנתיב `dim5-…`. מומלץ לאמת את מקור הקובץ; לא משנה את השיוך |
| 5108 | מה קורה הבורא — הסערה סביב הסרט «נז״א» ונבואת ישעיהו מ״ט | אלון לוי · ai, 19.9.2026 | חבר (תגית) | כנ״ל | כן | — |
| 5117 | מה קורה הבורא — פיצוץ הנפל בהרי נפתלי | אלון לוי · ai, 13.10.2026 | חבר (תגית) | כנ״ל | כן | — |
| 5119 | מה קורה הבורא — גוליית, נחלת בנימין וקריית גת | אלון לוי · ai, 16.10.2026 | חבר (תגית) | כנ״ל | כן | — |
| 5122 | מה קורה הבורא — צרפת, 17 באוקטובר ונבואת עובדיה | אלון לוי · ai, 20.10.2026 | חבר (תגית) | כנ״ל | כן | — |
| 5131 | מה קורה הבורא — תוצאות הבחירות, ערבות הדדית והבחירה בבורא | אלון לוי · ai, 1.11.2026 | חבר (תגית) | כנ״ל | כן | — |

**השינוי בלוגיקה (בענף):** כל פוסט שהמחבר שלו בדיוק «אלון לוי» נכנס לסדרה, עם תגית או בלי. כינוי עם רווחים או מחבר אחר עם התגית לא נכנסים. אין עותקים, והקרדיט נשאר של הפוסט. מול ה־API החי זה מחזיר בדיוק 13. **פתוחות להכרעתך:** 54 (אוסף) ו־5069/5076 (אותה הרצאה). אם תחליט להוציא מהם, צריך להוסיף לשדה `admission` רשימת החרגה; זה לא הוכן.

### 12.12 החלטה 7 — «מימד חמש»: 5003/5004 ו־9 הפוסטים הנוספים

**הבהרת מספרים:** 11 הפוסטים שזוהו ב־11.6/11.9 **כוללים** את 5003 ו־5004. מעבר להם יש **9** פוסטים נוספים.

| ID | מחבר | סדרה היום (`main`) | סדרה מוצעת | מקור | המלצה |
|---|---|---|---|---|---|
| **5003** | (NULL) | «מפת המציאות» (תגית) · משפחת «הצופן בסרטים» (קטגוריה) | **+ «מימד חמש»** (שיוך כפול) | ai, 26.6.2026 | **מומש בענף** (`approvedPostIds`), לפי החלטה 7 |
| **5004** | (NULL) | כנ״ל | **+ «מימד חמש»** | ai, 27.6.2026 | **מומש בענף** |
| 2 | (ריק) | אין | ללא שינוי | WordPress, 18.5.2026; «הגל הראשון של העליה מתקרב» | לא להוסיף. מקור המסר לא ידוע |
| 29 | מזכה הרבים | אין | ללא שינוי | WordPress, 31.8.2025; «מסרי רות קדם 3#» | לא להוסיף. מסרי רות קדם: «מימד חמש» כנושא, לא כסדרה של «בדרך לנצח» |
| 45 | (ריק) | אין | ללא שינוי | WordPress, 19.5.2025; «מסרי מימד חמש \| …», תגית רות קדם | כנ״ל |
| 5037 | (NULL) | אין | ללא שינוי | ai, 1.8.2026; «… \| רות קדם»; `home_hidden=true` | כנ״ל |
| 5068 | (NULL) | אין | ללא שינוי | ai, 17.8.2026; «התקף חרדה הוא אור שנתקע — חידוש מספר הזוהר»; וידאו; בלי תגית «מימד חמש» | לא להוסיף. לאמת את מקור הסרטון |
| 5109 | מדריך לריפוי 10 הספירות | אין | ללא שינוי | ai, 22.9.2026 | הכרעה: האם המפרסם הזה חלק מהסדרה? אם כן — החלטה מפורשת, לא אוטומטית |
| 5116 | מדריך לריפוי 10 הספירות | אין | ללא שינוי | הועלה כקובץ, 6.10.2026 | כנ״ל. **שימו לב:** `publishing_conventions` §13 מגדיר אותו כקלט הכיול של «מימד חמש», בעוד שהקוד לא סופר אותו בסדרה. זו סתירה להכרעה |
| 5127 | מדריך לריפוי 10 הספירות | אין | ללא שינוי | ai, 28.10.2026 | כנ״ל |
| 5130 | (NULL) | אין | **מועמד אחרי אימות מקור** | הועלה כקובץ, 31.10.2026; הכותרת מסתיימת «… \| מימד חמש», כמו 5100 של «בדרך לנצח» | לאמת את המקור. אם הוא של «בדרך לנצח»: תיקון שדה המחבר (שינוי נתונים, באישור) או הוספה ל־`approvedPostIds` (החלטה) |

* לא נוצר שם סדרה חדש. ב־#1296 מופיע «צופן בתרבות»; הוא **לא** נכלל כאן. השם הקיים בקוד הוא משפחת «הצופן בסרטים».
* Series, Category, Medium ו־Representation נשארים צירים נפרדים. החברות בסדרה לא מבוססת על «וידאו» (medium), והקטגוריות של 5003/5004 לא משתנות.

### 12.13 פעולות שממתינות לאישור מפורש של צוריאל

כל אישור צריך לציין את הפעולה ואת ה־SHA-256 המדויק (12.4). אין הרשאה עומדת.

1. **SQL 10** (`d1ac658b…`) — הרצה. מיד אחריה: אימות, ואז patch 0001 של ההפניות (כולל שינוי נעיצת ה־smoke — החלטה על קובץ בדיקה של G1).
2. **SQL 11** (`a43b12ca…`) — אישור DB נפרד. **החלטה נוספת:** האם לטפל גם ביצירת `ASSIGNMENT`/`QUEUED` (לא הוכן).
3. **SQL 20** (`922aef03…`) → אימות → patch 0002. אחריו **SQL 30** (`804c9bb7…`, פרישת שני חוקי המספר).
4. **SQL 23** (`3d866a4f…`) → patch 0003 · **SQL 24** (`3373c819…`) → patch 0004 · **SQL 21** (`33b62ed0…`) · **SQL 22** (`17cfccb1…`).
5. **SQL 40** (`3b0295a0…`, Corpus Admission) — DB. ואחריו: מסך האישור (החלטת מוצר), ובקשת ההחרגה ל־`corpus_admission_foundation_v1` (12.10).
6. **SQL 50** (`c8cef8ca…`, רישום החלטות 6–7 ב־PLAN37) — לפני מיזוג קוד הסדרות.
7. **סדרות:** האם להשאיר את 54 ואת 5069 בסדרה; 9 הפוסטים של «מימד חמש» (במיוחד 5116 ו־5130); **בחירת נשא אחד: הענף הזה או PR #1296.**
8. **«בני ההיכל»:** בחירת שם (12.9), ואחריה ארבעת התיקונים החיים (פרומפט רזיאל דורש פריסת Edge).
9. **⚠ שני דפי Legacy שמוגשים בפרודקשן** (`heichal.html`, `preview.html`) ושורת `gates` שהם קוראים: הסרה או השארה. זו סתירה לכלל 1.
10. **מיזוג הענף** (`921a3c150` + `6ab74289f8dd14fdb584bed038ff5919ec02c834`), אחרי rebase או מיזוג של `main` ואחרי CI, ופריסה — כל אחד באישור נפרד.
11. רשומות `work_log` BEFORE/AFTER — כתיבת DB.

### 12.14 תיקונים לטענות קודמות בדוח

1. **11.7 (ד):** ״שתי בדיקות אדמין שונות״ — לא מדויק. `rd_is_admin()` הוא אותו תנאי (`users.role='admin'`), שממומש פעמיים (12.10).
2. **11.7:** ״`wa_word_review` — אישור״ לא תואר במלואו. הוא קובע `is_verified=true` בלי בדיקת מנוע (12.10, 2).
3. **11.9 / S3:** ״11 פוסטים״ כוללים את 5003/5004. הנוספים הם 9 (12.12).
4. **11.6:** ״לא נדרש שינוי התנהגות״ — נכון לגבי הממשק. אבל הנוסח הקודם של §19 ושל §26 הרחיב מעבר ל־v1, ותוקן (12.7). שורות הפתיחה לחלון של רזיאל הן תוספת חדשה.
5. **11.14:** ״בדיקות מקומיות בלבד״ רצו על Node 22. כעת הן רצו גם על Node 24.21.0 עם העזרים של CI (12.3).
6. **12.3 (תיקון עצמי):** אף workflow ב־CI לא מריץ את חמשת קובצי הבדיקה שעדכנתי (`test/content-series-2029-projection`, `follow-category-series-alignment`, `post-backgrounds-2029`, `post-classification-2029`, `posts-follow-targets-2029`). הם רצים רק מקומית. בדיקות `follow` ב־CI הן קבצים אחרים, תחת `src/`.

### 12.15 דוח מסירה (`CLAUDE.md` §0.5)

| שדה | ערך |
|---|---|
| מה בוצע | אימות החבילה והבסיס · אימות P0 מחדש, SHA-256 וארבעה תיקוני הפניות אחרי DB · תיקון `20_` (בלי הרחבה, ועם החלון של רזיאל) · `24_` (V1/V2) · `40_` (Corpus Admission, פונקציות בלבד) · `50_` (PLAN37) · שינוי לוגיקת הסדרות והבדיקות (קומיט מקומי) · מלאי ״בני ההיכל״ ו־5 שמות · טבלאות סדרות · Node 24 ובדיקות · עדכון הדוח הזה |
| מה לא בוצע | אף SQL לא הורץ · אין כתיבה ל־DB, ליומן או לחוזים · אין דחיפה, PR, מיזוג או פריסה · לא שונה שם, זכויות או ה־spec · לא נמחק דבר · #1296 לא שונה · דפי ה־Legacy לא הוסרו · `11_` לא שונה |
| מאגר · ענף · SHA | `zuriel337/sod1820` · `ccr-b2565041-d94syf` · בסיס `01d96b627694d9c611b181721daa3a384284b300` · ראש `6ab74289f8dd14fdb584bed038ff5919ec02c834` · `origin/main` = `43c00b728b7b1904b690c7bb80577b184ed26421` |
| בדיקות | 12.3 · CI לא רץ (אין דחיפה) |
| PR | אין. #1296 חופף לקובץ אחד (12.2) |
| Production שונה? | **לא — על ידי.** נמצאו שני דפי Legacy שמוגשים חי (12.7.6) |
| חבילה | `SOD1820-contract-governance-pack-20261111-v2.zip` (12.16) |
| צעד הבא מומלץ | אישור SQL 10 לפי SHA-256 `d1ac658b6e2ace922ac5d32a3021f6ef8aa88dc06390b05aca095da0d48963fb`. במקביל: בחירת שם במקום ״בני ההיכל״, הכרעה על דפי ה־Legacy, ובחירת נשא לסדרות (הענף או #1296) |

### 12.16 חבילת המסירה v2

`SOD1820-contract-governance-pack-20261111-v2.zip`:
* `README.md` ו־`MANIFEST.sha256` (SHA-256 לכל קובץ).
* `sql/`: 10 הצעות + 10 rollback.
* `post-db/`: 4 תיקוני הפניות.
* `repo/`: שני ה־patch של הענף, ודיף מול `origin/main`.
* `diff/`, `sim/`, `base/`, `new/`, `tools/`, `evidence/`, `out/`.

הסימולציות הורצו גם מתוך החבילה עצמה, ונתנו את אותן תוצאות (65/65, 34/34, 37/37, 60/60). החבילה הקודמת (v1) נשארת כמות שהיא, כתיעוד.

### 12.A נספח — הנוסח המדויק של שינויי P0 (`10_p0_release_policy.sql`)
> הדיפים להלן הם בדיוק מה שהקובץ כותב (נוצרו מאותו מקור כמו ה־SQL; md5 של כל יעד מופיע ב־12.6). שורות `-` = הבסיס החי, `+` = הגרסה החדשה. דיף המטא־דאטה מוצג אחרי דיף התיאור.

#### deploy_on_request v3→v4

```diff
--- nodes:deploy_on_request@v3→v4.description (base)
+++ nodes:deploy_on_request@v3→v4.description (proposed)
@@ -1,14 +1,18 @@
-צוריאל מחליט מתי מעלים לאוויר. לא דוחפים ל-main אוטומטית. כל push ל-main = פריסת Vercel, והמכסה החינמית מוגבלת (100 פריסות/יום). אסור לבזבז אותה על כל תיקון קטן. צוברים שינויים כ-commits (לענף הפיתוח לשמירה), ומעלים ל-main רק כשצוריאל אומר במפורש («תעלה»/«העלה»). אז מעלים את כל המצטבר בבת אחת. ליזום עדכון: בכל הזדמנות מתאימה לומר לצוריאל כמה חלקים מוכנים וממתינים לפריסה, ולשאול אם להעלות עכשיו. שינויי נתונים (Supabase) חיים מיד ולא תלויים בפריסה — מותר להמשיך בהם כרגיל בלי לשרוף מכסה.
+[v4 · Human-Gate ZURIEL · 10.11.2026 — אישור מפורש לכל מיזוג ולכל פריסה · אין הרשאה עומדת · 2029 הוא המוצר הפעיל היחיד]
+צוריאל מחליט על כל שחרור. כל מיזוג ל-main וכל פריסה ל-Production מחייבים אישור מפורש של צוריאל לפעולה המסוימת — לקומיט ולפריסה המדויקים שהוצגו לו. אין הרשאה עומדת, ואישור אינו עובר מסשן לסשן, מפעולה לפעולה או מ-PR שמוזג. מיזוג אינו פריסה: push או מיזוג ל-main אינם יוצרים פריסה (git.deploymentEnabled=false בשני קובצי vercel.json, ולפי CLAUDE.md גם Ignored Build Step מדלג על main); פריסת Production היא פעולה נפרדת ומאושרת לפי הנוהל המתועד ב-CLAUDE.md («נוהל פריסה ל-Production מסשן ענן»). 2029 הוא המוצר הפעיל היחיד — Production מאז 4.11.2026; Legacy פרש ב-5.11.2026 ואינו יעד פריסה, Preview או חזרה.
+צוברים שינויים בענף העבודה, מציגים לצוריאל מה מוכן וממתין עם המלצת שחרור (§4), ושואלים. שינויי נתונים ב-Supabase (DB, SQL, מיגרציות, Edge Functions) חיים מיד ואינם תלויים בפריסה, ולכן גם הם דורשים אישור מפורש לפעולה המדויקת (CLAUDE.md §0.4).
 
-[UPDATE v2 · Human-Gate ZURIEL · 17.9.2026 — STANDING AUTO-RELEASE AUTHORIZATION · SUPERSEDES EXPLICIT “תעלה” REQUIREMENT FOR ROUTINE RELEASES]
+[v4 · consolidated release protocol — replaces the standing authorization of v2 (17.9.2026, §§1, 2, 8)]
 
-1. STANDING AUTHORIZATION. ZURIEL grants standing Human-Gate authorization for routine code/runtime releases that are demonstrably GATE-CLEAN, DEPENDENCIES-CLOSED, CURRENT-MAIN-RECONCILED, CI/GOLDEN-GREEN, SECURITY/PRIVACY-CLEAN where applicable, and free of overlapping active writers. A separate “תעלה” / “העלה” message is no longer required for such releases.
-2. RELEASE WHEN READY, NOT WHEN ASKED. The primary agent owns release timing. When the complete dependency batch becomes clean, it should merge/apply/deploy the authorized bounded release and verify live state without asking ZURIEL for an extra confirmation. Do not leave gate-clean work indefinitely branch-only merely waiting for a release word.
-3. DEPENDENCY-AWARE BATCHING. Release follows the canonical dependency DAG/batch, not PR creation order. A higher layer waits for required lower layers. Independent clean lanes may release independently when doing so cannot create a temporary incompatible state. Stacked/dependent PRs are composed/rebased/reconciled before release rather than blindly merged one by one.
-4. RELEASE RECOMMENDATION IS MANDATORY. Every material completion/handoff must classify its release state as exactly one of: AUTO_RELEASE_NOW · BUNDLE_WITH(<scope>) · BLOCKED_BY(<dependency/gate>) · SAFE_INDEPENDENT_WAITING_RUNTIME · DO_NOT_RELEASE_SUPERSEDED/PARKED. The agent explains the decisive dependency in plain language.
-5. AUTO-RELEASE PREFLIGHT. Before automatic release refresh live sync and verify at minimum: canonical owner/current main; exact head/base; open dependency/blocker state; required tests/checks; migration/RLS/security gates when touched; no active overlapping writer; rollback/recovery path; release batch compatibility. Any uncertainty that can change safety = BLOCKED, not guessed.
-6. POST-RELEASE PROOF. Automatic release is not complete at merge. Verify actual production/live object state, exact deployed version/bundle/function/migration as applicable, critical smoke/golden path, and record AFTER with MERGED/APPLIED/DEPLOYED/LIVE/VERIFIED separately. Silent deployment failure remains failure.
-7. STANDING AUTHORIZATION DOES NOT COVER IRREVERSIBLE PRODUCT/TRUTH DECISIONS. Still require explicit ZURIEL Human Gate for: canonicalizing/publishing governed research truth when owner requires Human Gate; destructive/non-recoverable data loss; new paid prices/economics; major production cutover Legacy→2029; materially weakening privacy/security; permanent deletion/retirement of preserved capability/history; or an explicit active law that names a separate Human decision. Routine reversible schema migrations that are already owner/gate-approved may ship as part of a clean batch.
-8. “תעלה” REMAINS AN OVERRIDE/EXPEDITE COMMAND, NOT A REQUIRED TOKEN. If ZURIEL says תעלה, proceed only if gate-clean; the command never bypasses blockers. If he says wait/hold, that explicit hold overrides standing authorization for the named scope until lifted.
-9. VERCEL/RESOURCE SAFETY REMAINS. Batch releases sensibly, preserve quota safeguards, and avoid duplicate deployments. Optimization of deployment count must not postpone a dependency-clean release indefinitely.
+1. EXPLICIT APPROVAL PER ACTION. ZURIEL's explicit approval is required for each specific action on its exact object: merge to main (exact head SHA); Production deployment (exact SHA and deployment); alias/domain change or rollback (exact target); DB/SQL/migration, Edge Function deployment, flag or protected Preview (exact statement/version). Approval is not inherited from an earlier session, a merged PR, a passing workflow or a general instruction, and it does not extend to another action. «תעלה»/«העלה» counts as approval only for the exact commit and deployment presented.
+2. MERGE ≠ DEPLOY. A merge to main never deploys by itself. After every merge re-read the live alias before reporting deployed / not deployed (a parallel session may deploy). Report DEPLOYED only after READY + alias + live verification.
+3. DEPENDENCY-AWARE BATCHING. Release follows the canonical dependency DAG/batch, not PR creation order. A higher layer waits for required lower layers. Independent clean lanes may be presented for approval independently when doing so cannot create a temporary incompatible state. Stacked/dependent PRs are composed/rebased/reconciled before release rather than blindly merged one by one.
+4. RELEASE RECOMMENDATION IS MANDATORY. Every material completion/handoff classifies its release state as exactly one of: READY_FOR_APPROVAL · BUNDLE_WITH(<scope>) · BLOCKED_BY(<dependency/gate>) · SAFE_INDEPENDENT_WAITING_RUNTIME · DO_NOT_RELEASE_SUPERSEDED/PARKED, and explains the decisive dependency in plain language. READY_FOR_APPROVAL (formerly AUTO_RELEASE_NOW) means ready to be presented to ZURIEL for explicit approval — never an automatic merge or deploy.
+5. RELEASE PREFLIGHT. Before presenting a release, and again immediately before executing an approved action, refresh live sync and verify at minimum: canonical owner/current main; exact head/base; open dependency/blocker state; required tests/checks; migration/RLS/security gates when touched; no active overlapping writer; rollback/recovery path; release batch compatibility. Any uncertainty that can change safety = BLOCKED, not guessed.
+6. POST-RELEASE PROOF. A release is not complete at merge. Verify actual production/live object state, exact deployed version/bundle/function/migration as applicable, critical smoke/golden path, and record AFTER with MERGED/APPLIED/DEPLOYED/LIVE/VERIFIED separately. Silent deployment failure remains failure.
+7. SEPARATE HUMAN DECISIONS. Release approval does not cover: canonicalizing/publishing governed research truth when the owner requires Human Gate; destructive/non-recoverable data loss; new paid prices/economics; materially weakening privacy/security; permanent deletion/retirement of preserved capability/history; or an explicit active law that names a separate Human decision. Each needs its own explicit ZURIEL decision.
+8. HOLD. «תעלה» never bypasses a failed or missing gate. If ZURIEL says wait/hold, that hold applies to the named scope until lifted.
+9. VERCEL/RESOURCE SAFETY REMAINS. Batch releases sensibly, preserve quota safeguards and avoid duplicate deployments. Ready work is reported to ZURIEL as READY_FOR_APPROVAL rather than held silently.
+
+מקור וקדימות: הכרעת צוריאל 10.11.2026 — «כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.» — מחליפה את ההרשאה העומדת של v2 לפי כלל הקדימות הקיים (החלטה מאוחרת ומפורשת של צוריאל גוברת על מוקדמת). v1–v3 נשמרות כגרסאות לא פעילות.
 
@@ -17,3 +21,3 @@
 [UPDATE v3 · G3_RELIABILITY_PRECLOSE · EXTEND_EXISTING — PRODUCTION CANARY GATE FOR THE NEXT RELEASE]
-1. PREFLIGHT ADDITION. AUTO-RELEASE PREFLIGHT (v2 §5) additionally requires the latest GitHub commit status with context sod1820/post-deploy-canary on the current successful Production deployment SHA to be success, unless public.fn_release_canary_override_status() reports an active bounded Human-Gate override. GitHub Actions/commit status is the release evidence; arbitrary events rows are never release evidence.
+1. PREFLIGHT ADDITION. RELEASE PREFLIGHT (§5) additionally requires the latest GitHub commit status with context sod1820/post-deploy-canary on the current successful Production deployment SHA to be success, unless public.fn_release_canary_override_status() reports an active bounded Human-Gate override. GitHub Actions/commit status is the release evidence; arbitrary events rows are never release evidence.
 2. BLOCK, DO NOT ROLL BACK. Missing, failed or pending canary status for the exact Production SHA blocks the NEXT release only. There is no automatic rollback. Recovery = a fixing/deploy canary that passes, or an explicit audited Human-Gate override.
```

<details><summary>מטא־דאטה</summary>

```diff
--- nodes:deploy_on_request@v3→v4.metadata (base)
+++ nodes:deploy_on_request@v3→v4.metadata (proposed)
@@ -1,11 +1,2 @@
 {
- "auto_release_preconditions": [
-  "gate_clean",
-  "dependencies_closed",
-  "current_main_reconciled",
-  "required_checks_green",
-  "security_privacy_clean_if_applicable",
-  "no_overlapping_writer",
-  "rollback_recovery_known"
- ],
  "cited_by": [
@@ -22,2 +13,3 @@
  "complemented_by": "deploy_quota_protection",
+ "explicit_approval_required_per_action": true,
  "explicit_human_gate_remaining": [
@@ -26,3 +18,2 @@
   "pricing_economics",
-  "legacy_to_2029_cutover",
   "privacy_security_weakening",
@@ -39,2 +30,4 @@
  "human_gate_v2": "ZURIEL 2026-09-17",
+ "human_gate_v4": "ZURIEL 2026-11-10",
+ "merge_is_not_deploy": true,
  "owner_check": "EXTEND_EXISTING",
@@ -49,4 +42,7 @@
  },
+ "release_advice_state_aliases": {
+  "AUTO_RELEASE_NOW": "READY_FOR_APPROVAL"
+ },
  "release_advice_states": [
-  "AUTO_RELEASE_NOW",
+  "READY_FOR_APPROVAL",
   "BUNDLE_WITH",
@@ -62,5 +58,25 @@
  "release_canary_override_reader": "fn_release_canary_override_status",
- "separate_taale_required": false,
+ "release_preconditions": [
+  "gate_clean",
+  "dependencies_closed",
+  "current_main_reconciled",
+  "required_checks_green",
+  "security_privacy_clean_if_applicable",
+  "no_overlapping_writer",
+  "rollback_recovery_known"
+ ],
+ "separate_taale_required": true,
  "source": "CLAUDE.md deploy section, mirror write approved by ZURIEL",
- "standing_auto_release": true
+ "standing_auto_release": false,
+ "v4_explicit_release_approval": {
+  "active_product": "2029",
+  "decided_at": "2026-11-10",
+  "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.",
+  "legacy_retired": "2026-11-05",
+  "no_new_system": true,
+  "owner_check": "EXTEND_EXISTING",
+  "procedure_ref": "CLAUDE.md — נוהל פריסה ל-Production מסשן ענן",
+  "production_since": "2026-11-04",
+  "supersedes": "v2 standing authorization (§§1, 2, 8)"
+ }
 }
```

</details>

#### inter_agent_coordination_law v17→v18

```diff
--- nodes:inter_agent_coordination_law@v17→v18.description (base)
+++ nodes:inter_agent_coordination_law@v17→v18.description (proposed)
@@ -4,4 +4,7 @@
 
+הוראת צוריאל מחייבת — 10.11.2026 (v18): 2029 הוא Production והמוצר הפעיל היחיד; אין הרשאת שחרור עומדת.
+2029 עלה ל-Production ב-4.11.2026 ו-Legacy פרש ב-5.11.2026 (קוד Legacy נשמר בהיסטוריית Git בלבד ואינו יעד פריסה, Preview או חזרה). סעיפים 75, 79 ו-80 (v12) תיארו את המצב שלפני המעבר והם היסטוריים; 76–78 נשארים בתוקף כעיקרון: חומר Legacy הוא ראיה היסטורית בלבד, לא סמכות עיצוב או ארכיטקטורה. כל מיזוג ל-main וכל פריסה ל-Production מחייבים אישור מפורש של צוריאל לפעולה המסוימת (deploy_on_request, הגרסה הפעילה). ההרשאה העומדת והשחרור האוטומטי של v13 (סעיפים 82, 86, 87) בוטלו; ייעוץ השחרור (81, 83–85, 88) נשאר, ותוצאתו המלצה לצוריאל — לעולם לא פעולה אוטומטית.
 
---- HISTORICAL V1–V16: conflicting communication clauses superseded by v17 ---
+
+--- HISTORICAL V1–V16: conflicting communication clauses superseded by v17; production/release clauses 75–82 and 86–88 updated by v18 ---
 עיקרון-על: כשצוריאל עובד עם כמה סוכנים, הם מתאמים ביניהם לבד דרך היומן (work_log) — צוריאל אף פעם לא צריך להעביר מידע מסוכן לסוכן. כללים קשיחים: (1) ערוץ אחד: כל תיאום/מסירה/שאלה בין סוכנים נכתב ב-work_log כ-memo עם FROM/TO, ההקשר, מה נדרש, ומה מוכן. אין ערוץ אחר. (2) סריקה בתחילת סשן (הרחבת agent_onboarding_law): כל סוכן, בתחילת כל סשן, חייב לסרוק את רשומות work_log האחרונות אחר memos המופנים אליו (topic/what_we_did מכיל «תיאום בין-סוכני» / «→ סוכן» / FROM/TO / status=«ממתין ל…»), לפעול עליהם, ולעדכן status+תשובה באותה רשומה או ברשומת-המשך. (3) השארת-עבודה = memo: סוכן שמסיים משהו שנוגע בסוכן אחר חייב להשאיר memo לפני סיום. (4) פריסת main מתואמת (הרחבת deploy_on_request): אף סוכן לא דוחף ל-main עצמאית. כל סוכן מצהיר ביומן מה מוכן (ענף+commit), וצוריאל מפעיל פריסה אחת מאוגדת. אין פריסות כפולות (בזבוז מכסה + קוד חצי-אפוי). תוצאה: צוריאל מפעיל N סוכנים והם נסגרים ביניהם דרך היומן. מגבלה כנה: החוק אמין כל עוד כל סוכן מכבד onboarding; לכן הסריקה בתחילת סשן היא חובה, לא רשות.
@@ -118,4 +121,4 @@
 
-[UPDATE v12 · Human-Gate ZURIEL · 16.9.2026 — 2029 TARGET / TEMPORARY LEGACY PRODUCTION BOUNDARY, additive; EXTEND_EXISTING only]
-75) TEMPORARY LEGACY PRODUCTION. Until ZURIEL explicitly declares cutover, the currently deployed legacy site remains the operational production surface for real users, production verification, urgent fixes and release safety. Its being live does NOT make its routes, components, information architecture, page composition or local implementation patterns the target architecture.
+[UPDATE v12 · Human-Gate ZURIEL · 16.9.2026 — 2029 TARGET / TEMPORARY LEGACY PRODUCTION BOUNDARY, additive; EXTEND_EXISTING only] — HISTORICAL PRE-CUTOVER STATE: superseded by v18 (10.11.2026); 2029 = Production since 4.11.2026
+75) [HISTORICAL · superseded by v18] TEMPORARY LEGACY PRODUCTION. Until ZURIEL explicitly declares cutover, the currently deployed legacy site remains the operational production surface for real users, production verification, urgent fixes and release safety. Its being live does NOT make its routes, components, information architecture, page composition or local implementation patterns the target architecture.
 76) 2029 TARGET AUTHORITY. Foundation, capability, identity, truth, provenance, Research OS, routing, cost/provider, authorization and future product decisions must target the approved 2029 architecture under Foundation → Projection → Experience. A legacy UI pattern may be preserved only when it expresses a still-valid capability/contract, not merely because it exists in production.
@@ -123,4 +126,4 @@
 78) NEW WORK DEFAULT. New foundation/runtime work should be surface-agnostic and reusable by the 2029 site through bounded adapters/Result Bundles/canonical owners. Avoid coupling new capabilities to legacy components or routes. If a temporary legacy adapter is necessary before cutover, label it transitional and keep the underlying capability independent.
-79) CUTOVER IS EXPLICIT. No agent may assume the new site is production merely because 2029 work exists, and no agent may assume the legacy site is the long-term system merely because it is currently live. The transition point is a Human-Gate decision by ZURIEL and must be recorded with exact release/live state.
-80) FRESH-AGENT ACCEPTANCE. A project-entry agent must be able to state both truths without prior conversation memory: CURRENT PRODUCTION = legacy/transitional until explicit cutover; TARGET ARCHITECTURE = 2029. Confusing those two states is an entry-routing failure and must be reported as DRIFT.
+79) [HISTORICAL · cutover executed 4.11.2026 by explicit ZURIEL decision; Legacy retired 5.11.2026] CUTOVER IS EXPLICIT. No agent may assume the new site is production merely because 2029 work exists, and no agent may assume the legacy site is the long-term system merely because it is currently live. The transition point is a Human-Gate decision by ZURIEL and must be recorded with exact release/live state.
+80) FRESH-AGENT ACCEPTANCE (updated by v18). A project-entry agent must be able to state without prior conversation memory: CURRENT PRODUCTION = 2029 (since 4.11.2026); Legacy is retired (5.11.2026) and is not a production, Preview or rollback target; TARGET ARCHITECTURE = 2029. Treating Legacy as current production is an entry-routing failure and must be reported as DRIFT. [Historical pre-cutover wording: CURRENT PRODUCTION = legacy/transitional until explicit cutover.]
 
@@ -128,5 +131,5 @@
 
-[UPDATE v13 · Human-Gate ZURIEL · 17.9.2026 — DEPENDENCY-AWARE AUTO-RELEASE / RELEASE ADVICE · EXTEND_EXISTING]
-81) AGENT OWNS RELEASE RECOMMENDATION. At completion/checkpoint, Primary Owner must tell ZURIEL what should happen operationally, not merely “waiting for תעלה”. It classifies the exact scope using the canonical release-advice states from deploy_on_request v2 and names dependencies/bundle order.
-82) AUTO-RELEASE ON CLEAN STATE. For routine release scopes covered by standing authorization, once live preflight proves GATE-CLEAN + DEPENDENCIES-CLOSED + CI/GOLDEN/SECURITY CLEAN as applicable + NO OVERLAP, the Primary Owner proceeds through merge/migration/deploy/live verification without a second user prompt.
+[UPDATE v13 · Human-Gate ZURIEL · 17.9.2026 — DEPENDENCY-AWARE RELEASE ADVICE · EXTEND_EXISTING · standing auto-release revoked by v18 (10.11.2026)]
+81) AGENT OWNS RELEASE RECOMMENDATION. At completion/checkpoint, Primary Owner must tell ZURIEL what should happen operationally, not merely “waiting for תעלה”. It classifies the exact scope using the canonical release-advice states from deploy_on_request (active version) and names dependencies/bundle order.
+82) [REVOKED by v18 · 10.11.2026] EXPLICIT APPROVAL, NO AUTO-RELEASE. A clean live preflight (GATE-CLEAN + DEPENDENCIES-CLOSED + CI/GOLDEN/SECURITY CLEAN as applicable + NO OVERLAP) makes a scope READY_FOR_APPROVAL; the Primary Owner presents the exact commit/deployment to ZURIEL and merges, applies migrations or deploys only after his explicit approval of that specific action. [Former v13 text: auto-release on clean state under standing authorization, without a second user prompt.]
 83) DEPENDENCY GRAPH BEFORE PR ORDER. Agent scans active/relevant work_log + open PR lineage + current Roadmap/dependency plan + live owner state to decide whether a scope is independent, stacked, superseded, or must be bundled. “Finished first” never means “release first”.
@@ -134,10 +137,10 @@
 85) BLOCKER COMMUNICATION. When not releasable, state BLOCKED_BY with: exact blocker, lower dependency, current evidence, smallest closure path, and who/what can close it. Do not ask ZURIEL to decide technical dependency ordering that owners/gates can determine.
-86) AUTO-RELEASE DOES NOT AUTO-CANONICALIZE. Dispatch/release standing authorization does not grant autonomous governed-truth publication, destructive irreversible changes, pricing/economics, major Legacy→2029 cutover, or other explicitly Human-Gated product decisions. Those remain separately gated.
-87) USER HOLD. Explicit ZURIEL “hold/wait/do not release” for a scope creates a release hold in coordination context and overrides standing authorization until lifted.
-88) AFTER MUST INCLUDE RELEASE ADVICE/RESULT. Every material AFTER includes: release_advice; dependency_state; exact branch/PR/head; merged/applied/deployed/live/verified booleans/states; blocker if any; next auto-action. Session end must leave enough information for a fresh agent to continue release choreography without asking ZURIEL what to upload.
+86) RELEASE APPROVAL DOES NOT CANONICALIZE. There is no standing release authorization (v18). Approval of a release does not grant autonomous governed-truth publication, destructive irreversible changes, pricing/economics, or other explicitly Human-Gated product decisions. Those remain separately gated.
+87) USER HOLD. Explicit ZURIEL “hold/wait/do not release” for a scope creates a release hold in coordination context until lifted.
+88) AFTER MUST INCLUDE RELEASE ADVICE/RESULT. Every material AFTER includes: release_advice; dependency_state; exact branch/PR/head; merged/applied/deployed/live/verified booleans/states; blocker if any; next proposed action (a merge, deploy or DB action still awaits ZURIEL's explicit approval). Session end must leave enough information for a fresh agent to continue release choreography without asking ZURIEL what to upload; approval of the action itself is still required.
 
-OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law + deploy_on_request v2. No new queue/release store/registry.
+OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law + deploy_on_request (active version). No new queue/release store/registry.
 
 [UPDATE v14 · Human-Gate ZURIEL · 11.10.2026 — VISUAL DESIGN LANE / DESIGN-FIRST SURFACE CYCLE / ONE-DIRECTIONAL DISPATCH · EXTEND_EXISTING]
-89) VISUAL DESIGN LANE. For 2029 surfaces CLAUDE is the primary writer of the visual layer: shared frame composition (rails, Raziel presence, Now), the shared component kit, per-surface composition/layout, and the final visual acceptance pass. Semantic authority stays with the existing owners: SOD1820_DESIGN_CONTRACT_V2.md + palette.js/designTokens.js (values), SystemFrame (frame contract), canonical_ui_components_law, experience_governance_foundation_v1_law v9. This assigns a writer lane only; it creates no design owner and changes none of those contracts. Token/contract/icon-family changes go through their owner with Human Gate.
+89) VISUAL DESIGN LANE. For 2029 surfaces CLAUDE is the primary writer of the visual layer: shared frame composition (rails, Raziel presence, Now), the shared component kit, per-surface composition/layout, and the final visual acceptance pass. Semantic authority stays with the existing owners: SOD1820_DESIGN_CONTRACT_V2.md + paletteTokens2029.js/designTokens.js (values; palette.js was removed on 5.11.2026), SystemFrame (frame contract), canonical_ui_components_law, experience_governance_foundation_v1_law v9. This assigns a writer lane only; it creates no design owner and changes none of those contracts. Token/contract/icon-family changes go through their owner with Human Gate.
 90) DOMAIN / DATA LANE. GPT (coordinator, including Codex executors it dispatches) remains primary writer for capabilities, readers, truth/provenance, PUBLIC/ADMIN/PRIVATE access, research logic, migrations, permissions and release choreography. GPT does not introduce new visual styles, page-local tokens, components or icons; when a surface needs one it assigns CLAUDE. CLAUDE does not change truth/access/data logic, reader semantics, migrations or permissions.
```

<details><summary>מטא־דאטה</summary>

```diff
--- nodes:inter_agent_coordination_law@v17→v18.metadata (base)
+++ nodes:inter_agent_coordination_law@v17→v18.metadata (proposed)
@@ -56,2 +56,4 @@
   "owner_check": "EXTEND_EXISTING",
+  "status": "HISTORICAL_PRE_CUTOVER",
+  "superseded_by": "v18_2029_production_explicit_release",
   "target_architecture": "2029"
@@ -73,2 +75,4 @@
   "standing_auto_release": true,
+  "status": "STANDING_AUTO_RELEASE_REVOKED_2026-11-10",
+  "superseded_by": "v18_2029_production_explicit_release",
   "user_hold_overrides": true
@@ -146,2 +150,25 @@
   "recipient": "ZURIEL"
+ },
+ "v18_2029_production_explicit_release": {
+  "current_production": "2029",
+  "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.",
+  "explicit_approval_per_merge_and_deploy": true,
+  "human_gate": "ZURIEL 2026-11-10",
+  "label_corrected": "label read 'v16' while rule_version was 17",
+  "legacy_is_current_production_runtime": false,
+  "legacy_retired": "2026-11-05",
+  "no_new_system": true,
+  "owner_check": "EXTEND_EXISTING",
+  "production_since": "2026-11-04",
+  "release_advice_state_aliases": {
+   "AUTO_RELEASE_NOW": "READY_FOR_APPROVAL"
+  },
+  "release_advice_states": [
+   "READY_FOR_APPROVAL",
+   "BUNDLE_WITH",
+   "BLOCKED_BY",
+   "SAFE_INDEPENDENT_WAITING_RUNTIME",
+   "DO_NOT_RELEASE_SUPERSEDED/PARKED"
+  ],
+  "standing_auto_release": false
  },
```

</details>

#### foundation_closure_protocol_law v7→v8

```diff
--- nodes:foundation_closure_protocol_law@v7→v8.description (base)
+++ nodes:foundation_closure_protocol_law@v7→v8.description (proposed)
@@ -92,9 +92,9 @@
 
-[UPDATE v6 · Human-Gate ZURIEL · 17.9.2026 — STANDING AUTO-RELEASE BINDING · EXTEND_EXISTING]
-AUTO-RELEASE BINDING. Once a bounded routine release scope has satisfied every applicable lower MUST, gate, dependency, current-main reconciliation, required specialist/security/privacy acceptance and release recovery condition, standing Human-Gate authorization under deploy_on_request v2 permits the Primary Owner to release without waiting for a separate “תעלה”. Gate-clean is the authorization condition.
-NO-SKIP REMAINS ABSOLUTE. Standing authorization changes who triggers a clean release; it does not weaken any Foundation MUST or acceptance standard. קדימה/תעלה/auto-release never waive a blocker.
-HUMAN-DECISION RESERVE. Explicit Human Gate remains for decisions that change canonical governed truth/publication where required, destructive irreversible state, paid product economics, major Legacy→2029 production cutover, material privacy/security weakening, permanent deletion/retirement of preserved history/capability, or another owner-specific Human decision.
-RELEASE ADVICE. Gate closure/handoff must expose whether the scope is AUTO_RELEASE_NOW, BUNDLE_WITH, BLOCKED_BY, SAFE_INDEPENDENT_WAITING_RUNTIME, or DO_NOT_RELEASE_SUPERSEDED/PARKED, so ZURIEL is not required to infer dependencies.
+[UPDATE v6 · Human-Gate ZURIEL · 17.9.2026 — RELEASE BINDING · EXTEND_EXISTING · standing auto-release revoked by v8 (ZURIEL 10.11.2026)]
+RELEASE BINDING (v8). Once a bounded release scope has satisfied every applicable lower MUST, gate, dependency, current-main reconciliation, required specialist/security/privacy acceptance and release recovery condition, it is READY_FOR_APPROVAL: the Primary Owner presents the exact commit/deployment to ZURIEL and releases only after his explicit approval of that specific action (deploy_on_request, active version). Gate-clean is a precondition, never an authorization; there is no standing release authorization.
+NO-SKIP REMAINS ABSOLUTE. Explicit approval does not weaken any Foundation MUST or acceptance standard. קדימה/תעלה never waive a blocker.
+HUMAN-DECISION RESERVE. Explicit Human Gate remains for decisions that change canonical governed truth/publication where required, destructive irreversible state, paid product economics, material privacy/security weakening, permanent deletion/retirement of preserved history/capability, or another owner-specific Human decision.
+RELEASE ADVICE. Gate closure/handoff must expose whether the scope is READY_FOR_APPROVAL (formerly AUTO_RELEASE_NOW), BUNDLE_WITH, BLOCKED_BY, SAFE_INDEPENDENT_WAITING_RUNTIME, or DO_NOT_RELEASE_SUPERSEDED/PARKED, so ZURIEL is not required to infer dependencies.
 
-OWNER CHECK: EXTEND_EXISTING foundation_closure_protocol_law + deploy_on_request v2. No new gate system.
+OWNER CHECK: EXTEND_EXISTING foundation_closure_protocol_law + deploy_on_request (active version). No new gate system.
 
```

<details><summary>מטא־דאטה</summary>

```diff
--- nodes:foundation_closure_protocol_law@v7→v8.metadata (base)
+++ nodes:foundation_closure_protocol_law@v7→v8.metadata (proposed)
@@ -4,3 +4,3 @@
   "kadima": "within_current_gate_only",
-  "taale": "release_gate_clean_scope_only",
+  "taale": "explicit_approval_for_exact_presented_scope",
   "waiver": "explicit_replan_or_supersession_only"
@@ -69,3 +69,5 @@
   "separate_taale_required": false,
-  "standing_auto_release_for_gate_clean_routine_scope": true
+  "standing_auto_release_for_gate_clean_routine_scope": true,
+  "status": "STANDING_AUTO_RELEASE_REVOKED_2026-11-10",
+  "superseded_by": "v8_explicit_release_approval_binding"
  },
@@ -96,2 +98,10 @@
   "verify_before_build": true
+ },
+ "v8_explicit_release_approval_binding": {
+  "explicit_approval_per_merge_and_deploy": true,
+  "human_gate": "ZURIEL 2026-11-10",
+  "no_new_system": true,
+  "no_skip_unchanged": true,
+  "owner_check": "EXTEND_EXISTING",
+  "standing_auto_release": false
  }
```

</details>

#### system_suggestions_law v5→v6

```diff
--- nodes:system_suggestions_law@v5→v6.description (base)
+++ nodes:system_suggestions_law@v5→v6.description (proposed)
@@ -1,2 +1,2 @@
-החלטת צוריאל 12.7.2026 (הרחבת ai_style_learning_law לכל המערכת, לפי פרוטוקול שהציע וצוריאל אישר): «המערכת לעולם אינה משנה את עצמה. היא רק לומדת, מסבירה ומציעה.» חמישה שלבים: (1) Observe — כל רכיב רושם תצפיות (ai_analysis_log, relation_evidence, אירועים). (2) Detect — detect_suggestions() רץ מחזורית ומזהה דפוסים חוצי-סף (כרגע גלאי style_continue_rate: סגנון עם ≥40 ניתוחים ופער continue-rate ≥10 נק׳; ו-pending_ratings ≥20). (3) Suggest — יוצר שורה ב-system_suggestions (category ai/ux/research/performance/knowledge, title, dedupe_key אנטי-ספאם; לא מעלה שוב משהו שנדחה ב-30 יום). (4) Explain — כל המלצה נושאת reason + observed(jsonb הנתונים) + confidence(0-100, היוריסטיקה מסומנת ככזו) + sample_size + estimated_impact. (5) Decide — רק צוריאל: admin_suggestion_decide → accepted/rejected/later/pending. UI: טאב אדמין «🧠 המלצות המערכת» (כרטיסי Confidence/Reason/Observed/Impact + קבל/דחה/המתן, טאבי-סטטוס). ⛔ אין ביצוע אוטומטי של המלצה — קבלה = החלטה אנושית, המימוש ידני. השומר (system-watchman): edge function + cron שבועי (jobid 19, ראשון 08:00) — מריץ גלאים, בונה site_pulse(7), ושולח דייג׳סט (אימייל Resend + וואטסאפ wa_send) רק כשיש משהו מעל-סף (worth); admin_notify (server-only) מחזיק יעדים; admin_fire_watchman = «שלח עכשיו». תלות-קונפיג של צוריאל: (א) וואטסאפ דורש chat_id פרטי (@c.us) שהוא מזין בפאנל — לא נשמר בקוד/אתר; (ב) אימייל דורש RESEND_API_KEY ב-Edge secrets (בבדיקה חזר no_resend_key). RPCs: suggest_add/detect_suggestions/site_pulse (service) · admin_suggestions_list/decide/notify_get/set/fire_watchman (rd_is_admin). רכיב: SystemSuggestionsTab.jsx. הרחבה עתידית: גלאי UX/Performance/Knowledge + A/B כשתצטבר תנועה.
+החלטת צוריאל 12.7.2026 (הרחבת ai_style_learning_law לכל המערכת, לפי פרוטוקול שהציע וצוריאל אישר): «המערכת לעולם אינה משנה את עצמה. היא רק לומדת, מסבירה ומציעה.» חמישה שלבים: (1) Observe — כל רכיב רושם תצפיות (ai_analysis_log, relation_evidence, אירועים). (2) Detect — detect_suggestions() רץ מחזורית ומזהה דפוסים חוצי-סף (כרגע גלאי style_continue_rate: סגנון עם ≥40 ניתוחים ופער continue-rate ≥10 נק׳; ו-pending_ratings ≥20). (3) Suggest — יוצר שורה ב-system_suggestions (category ai/ux/research/performance/knowledge, title, dedupe_key אנטי-ספאם; לא מעלה שוב משהו שנדחה ב-30 יום). (4) Explain — כל המלצה נושאת reason + observed(jsonb הנתונים) + confidence(0-100, היוריסטיקה מסומנת ככזו) + sample_size + estimated_impact. (5) Decide — רק צוריאל: admin_suggestion_decide → accepted/rejected/later/pending. UI: טאב אדמין «🧠 המלצות המערכת» (כרטיסי Confidence/Reason/Observed/Impact + קבל/דחה/המתן, טאבי-סטטוס). ⛔ אין ביצוע אוטומטי של המלצה — קבלה = החלטה אנושית, המימוש ידני. השומר (system-watchman): edge function + cron שבועי (jobid 19, ראשון 08:00) — מריץ גלאים, בונה site_pulse(7), ושולח דייג׳סט (אימייל Resend + וואטסאפ wa_send) רק כשיש משהו מעל-סף (worth); admin_notify (server-only) מחזיק יעדים; admin_fire_watchman = «שלח עכשיו». תלות-קונפיג של צוריאל: (א) וואטסאפ דורש chat_id פרטי (@c.us) שהוא מזין בפאנל — לא נשמר בקוד/אתר; (ב) אימייל דורש RESEND_API_KEY ב-Edge secrets (בבדיקה חזר no_resend_key). RPCs: suggest_add/detect_suggestions/site_pulse (service) · admin_suggestions_list/decide/notify_get/set/fire_watchman (rd_is_admin). רכיב: SystemSuggestionsTab.jsx (מסוף הניהול הישן; הוסר ב-5.11.2026, #1239). הרחבה עתידית: גלאי UX/Performance/Knowledge + A/B כשתצטבר תנועה.
 
@@ -39,3 +39,3 @@
 18. PREPARATION IS NOT RELEASE. The maintenance assignment may reverify current main, update only the bounded dependency/runtime files required by the accepted suggestion, regenerate the lockfile, run tests and open a PR. The assignment itself is BRANCH_ONLY_NO_MERGE_NO_DEPLOY and never grants publication/canonicalization or production release.
-19. RELEASE REUSES deploy_on_request. Patch/minor routine maintenance may be released only after current-main reconciliation, dependency closure, peer-resolution, CI/Golden/security checks and no writer overlap under deploy_on_request v2. Major runtime/framework upgrades remain Foundation changes: they may be prepared after Human acceptance but require Foundation redesign-risk challenge and any applicable Human Gate before release.
+19. RELEASE REUSES deploy_on_request. Patch/minor routine maintenance may be released only after current-main reconciliation, dependency closure, peer-resolution, CI/Golden/security checks and no writer overlap, and then only with ZURIEL's explicit approval of the exact merge/deploy (deploy_on_request, active version; no standing authorization). Major runtime/framework upgrades remain Foundation changes: they may be prepared after Human acceptance but require Foundation redesign-risk challenge and any applicable Human Gate before release.
 20. STALE SUGGESTION FAILS CLOSED. The maintenance agent must re-read origin/main and authoritative provider metadata before editing. If current no longer equals the accepted observed.current, or latest is no longer the same stable target, it stops/no-ops rather than upgrading from stale evidence.
```

<details><summary>מטא־דאטה</summary>

```diff
--- nodes:system_suggestions_law@v5→v6.metadata (base)
+++ nodes:system_suggestions_law@v5→v6.metadata (proposed)
@@ -43,2 +43,12 @@
  "human_gate_v5": "ZURIEL 2026-09-27",
+ "human_gate_v6_release": {
+  "changed": [
+   "§19: release reuses deploy_on_request (active version) only with explicit approval",
+   "SystemSuggestionsTab.jsx marked removed (5.11.2026, #1239)"
+  ],
+  "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.",
+  "human_gate": "ZURIEL 2026-11-10",
+  "no_new_system": true,
+  "owner_check": "EXTEND_EXISTING"
+ },
  "incident_intelligence": true,
```

</details>

#### קודקס #4 publishing_conventions

```diff
--- project_codex#4:publishing_conventions.body (base)
+++ project_codex#4:publishing_conventions.body (proposed)
@@ -412,3 +412,3 @@
 Acceptance:
-- Same Post identity in legacy and 2029.
+- Same Post identity across historical (WordPress/Legacy-era) records and 2029.
 - Source witness/media preserved.
@@ -462,3 +462,3 @@
 7. EDITORIAL EMPHASIS != STATUS / VERIFICATION: צבעי ההדגשה של הכותב נפרדים מצבעי פעולה/סטטוס/אימות של המערכת. ירוק אינו אישור חישוב, אדום אינו שגיאה וזהב אינו עובדה/איכות/Canonical. שומרים את הנוסח, השיטה והראיות תחת בעלי הסמכות הקיימים.
-8. ONE SHARED IMPLEMENTATION: ההגדרה החזותית שייכת לחוזה Design V2 ולפלטה הקנונית; רכיב הפוסט המשותף צורך אותה. אין theme store נוסף, palette נפרדת לכל פוסט, CSS חדש במקור כדי לכפות צבעי 2029 או שינוי של תצוגת Legacy.
+8. ONE SHARED IMPLEMENTATION: ההגדרה החזותית שייכת לחוזה Design V2 ולפלטה הקנונית; רכיב הפוסט המשותף צורך אותה. אין theme store נוסף, palette נפרדת לכל פוסט, CSS חדש במקור כדי לכפות צבעי 2029. (תצוגת Legacy אינה קיימת עוד מאז 5.11.2026.)
 9. VISUAL ACCEPTANCE: לפני מימוש גורף נדרש פיילוט תחום על פוסט קצר, פוסט ארוך ופוסט גימטריה עם סימוני מקור אמיתיים. לבדוק יום/קלף/לילה, מובייל/מחשב, קריאות של כל תו מסומן, גבולות תת-ביטוי, סדר RTL, קבוצות נבדלות, מיקוד מקלדת וחזרה. חישוב ניגודיות או הדמיה מקומית לבדם אינם אישור תצוגת האתר.
@@ -471,3 +471,3 @@
 
-1. טריגר וסמכות: הוראה מפורשת לפרסם/להעלות לאתר מתירה לבצע את שלבי פרסום המדיה הנדרשים ללא שאלות חוזרות על העברת הקובץ ותמונת שער. שיתוף קישור/קובץ ללא הוראת פרסום אינו מתיר פרסום אוטומטי. מכבדים את היעד שנקבע (Legacy, 2029, או אחר); הוראת פרסום אינה אישור לשינוי קוד/ענפי Preview, מיזוג, פריסה או העלאה כפולה לשתי המערכות.
+1. טריגר וסמכות: הוראה מפורשת לפרסם/להעלות לאתר מתירה לבצע את שלבי פרסום המדיה הנדרשים ללא שאלות חוזרות על העברת הקובץ ותמונת שער. שיתוף קישור/קובץ ללא הוראת פרסום אינו מתיר פרסום אוטומטי. היעד הוא 2029 — המוצר הפעיל היחיד (Legacy פרש ב-5.11.2026 ואינו יעד פרסום); הוראת פרסום אינה אישור לשינוי קוד/ענפי Preview, מיזוג או פריסה.
 2. מסלול ChatGPT בברירת מחדל: בדוק תחילה תוכן כפול ונתיב הפרסום הפעיל. שמור את קובץ המדיה המקורי, ללא שינוי ביטים, תחילה ב-Dropbox כמקור גיבוי קבוע כאשר חיבור Dropbox זמין; אמת שההעלאה הושלמה ושמור שם קובץ ייחודי לפי מזהה פוסט/תאריך. אחרי האישור העבר דרך מנגנון agent-upload/AGENT_MEDIA_UPLOAD_BRIDGE הקיים עם כרטיס הרשאה תחום אל canonical Supabase Storage (media/gallery לפי חוזה), וקבל Receipt מאומת. Dropbox הוא שער כניסה וגיבוי, לא כתובת הוידאו/התמונה הציבורית; אסור לסמוך על לינק שיתוף פרטי או קישור זמני כספק המדיה באתר. אם גישה/הרשאה/קובץ חסרים — דווח חסימה ברורה, אל תמציא הצלחה או תעקוף מנגנוני אבטחה.
@@ -475,3 +475,3 @@
 4. פרסום והקשר: חבר את video src, poster/image_url ו-thumb_url לכתובות הציבוריות הקבועות ב-Supabase, באותה זהות Post/Media; שמור קרדיט מקור וקישור יוצר, תאריך ותגיות/קטגוריות קיימות בלי ליצור כפילויות. דרישות תמלול ותרגומים, Human Gate והבחנה עובדה/ייחוס/רמז נשארות מחייבות; אין לדווח READY כשה-preflight הקנוני חסר.
-5. אימות וסיום: בצע קריאת-חזרה לחשבונית אחסון, בדיקת קיום קובץ מקור ונגזרות, בדיקת שדות והפניות הפוסט; בדוק תצוגה בפועל במובייל/דפדפן וביעד שנתבקש, לרבות Legacy אם הוזכר. DB INSERT/UPDATE לבדו אינו הוכחת פרסום חי או נראות. דווח באופן מפורד מה בוצע, מה אומת ומה עדיין חסום, עם קישור לצפייה רק אם אומת. אל תכפה שינוי ב-Production או בפריוויו כדי לעקוף חסימה.
+5. אימות וסיום: בצע קריאת-חזרה לחשבונית אחסון, בדיקת קיום קובץ מקור ונגזרות, בדיקת שדות והפניות הפוסט; בדוק תצוגה בפועל במובייל/דפדפן ב-2029. DB INSERT/UPDATE לבדו אינו הוכחת פרסום חי או נראות. דווח באופן מפורד מה בוצע, מה אומת ומה עדיין חסום, עם קישור לצפייה רק אם אומת. אל תכפה שינוי ב-Production או בפריוויו כדי לעקוף חסימה.
 6. תחולה: זוהי ברירת מחדל תפעולית לפרסומי SOD1820 דרך ChatGPT כאשר הכלים והרשאות המדיה זמינים, ולא שינוי בכללי המערכת הפנימיים של ChatGPT או הבטחה שכל סשן/סוכן יקרא מסמך זה אוטומטית. כל סוכן שמבצע פרסום בפרויקט צריך לקרוא את publishing_conventions לפני הפעולה.
@@ -480,4 +480,4 @@
 
-—— LEGACY MODIFIED DATE REQUIRED · 27.10.2026 · publishing_conventions operational correction ——
-כש-ChatGPT מפרסם פוסט חדש ב-public.posts לצפייה ב-Legacy או כפרסום משותף, חובה להגדיר posts.modified לתאריך הפרסום (לרוב זהה ל-posts.date; בעריכה בפועל לפי updated time) כבר ב-INSERT. אין להסתפק ב-date/created_at בלבד: ה-Legacy Home fetchHomePosts בגרסה הפעילה ממיין לפי modified DESC NULLS LAST, והיעדר modified עלול להוריד פוסט חדש לתחתית ולהעלימו מ״עדכונים אחרונים״ למרות home_hidden=false. לאחר כתיבה לוודא שהפוסט נכנס ל-32 התוצאות הראשונות, אינו טיוטה/פורום/לא-בבית, ונראה בפיד; לא לשנות קוד, פריסה, Preview או שדות לא קשורים לשם עקיפת התקלה. בדיקת DB/מיון אינה תחליף לבדיקת תצוגה בדפדפן. כיול: posts.id=5126 (27.10.2026), תוקן modified=NULL ל-date, עלה ממקום 1295 למקום 1 במיון הרשימה. 
+—— POST MODIFIED DATE REQUIRED · 27.10.2026 · re-scoped to 2029 on 10.11.2026 · publishing_conventions operational correction ——
+כש-ChatGPT או כל סוכן אחר מפרסם פוסט חדש ב-public.posts, חובה להגדיר posts.modified לתאריך הפרסום (לרוב זהה ל-posts.date; בעריכה בפועל לפי updated time) כבר ב-INSERT. אין להסתפק ב-date/created_at בלבד: קוראי 2029 ממיינים לפי modified DESC NULLS LAST (getLatestPostCards ב-src/lib/supabase.js; fetchPostsCatalog2029 ו-fetchPostSearchSuggestions2029 ב-src/lib/research/postsCatalog2029Projection.js), והיעדר modified עלול להוריד פוסט חדש לתחתית הרשימות. (ב-27.10 נכתב הכלל עבור דף הבית של Legacy, fetchHomePosts, שהוסר ב-5.11.2026; הדרישה נשארת בתוקף ב-2029.) modified קובע סדר בלבד ואינו אות ל״עדכון חדש״ (SOD1820_DESIGN_CONTRACT_V2.md §8.1). לאחר כתיבה לוודא שהפוסט מופיע בראש רשימות הפוסטים של 2029, אינו טיוטה/פורום/מוסתר מהבית, ונראה בפועל; לא לשנות קוד, פריסה, Preview או שדות לא קשורים לשם עקיפת התקלה. בדיקת DB/מיון אינה תחליף לבדיקת תצוגה בדפדפן. כיול: posts.id=5126 (27.10.2026), תוקן modified=NULL ל-date, עלה ממקום 1295 למקום 1 במיון הרשימה. 
 
```

#### קודקס #9 branches_deploy

```diff
--- project_codex#9:branches_deploy.body (base)
+++ project_codex#9:branches_deploy.body (proposed)
@@ -1,5 +1,5 @@
 
-# Branches & Deploy — Live 2026-09-23
+# Branches & Deploy — vercel.json re-read at main 932aba4bd (11.11.2026); release policy per ZURIEL 10.11.2026
 
-Canonical owner: `deploy_on_request v2`.
+Canonical owner: `deploy_on_request` (active version).
 This codex is an operational projection of the live owner + current `vercel.json`; it is not a second deployment law.
@@ -7,4 +7,5 @@
 ## Production
-- `main` = production.
-- Merge/push to `main` may create a production Vercel deployment and must follow the release owner/gates.
+- 2029 is the only active product: Production since 2026-11-04. Legacy was retired on 2026-11-05 and is not a deployment, Preview or rollback target.
+- `main` is the release source, not an automatic deployment. A merge or push to `main` does not create a Production deployment: `git.deploymentEnabled=false` in both `vercel.json` roots (repository root and `public-reading-deploy`), and per CLAUDE.md the project's Ignored Build Step skips `main` builds.
+- A Production deployment is a separate, manual action for an exact `main` SHA (Vercel MCP, per CLAUDE.md «נוהל פריסה ל-Production מסשן ענן»). Every merge to `main` and every Production deployment, alias change or rollback requires ZURIEL's explicit approval for that specific action. There is no standing authorization.
 - Never use production as a workaround for Preview tooling.
@@ -12,34 +13,12 @@
 ## Development branches
-Live `vercel.json` currently uses `git.deploymentEnabled`:
-- `gpt/g3-topic-golden-slug-rank-foundation-v1` → true (historical explicit exception)
-- `gpt/*` → false
-- `claude/*` → false
+Current `vercel.json` (both roots) sets `git.deploymentEnabled: false` globally. By Vercel's semantics no branch — `main`, `gpt/*`, `claude/*`, `preview/*` or any other — creates a deployment merely by being pushed. (Live Vercel project settings were not re-read in this pass.)
 
-Therefore normal GPT/CLAUDE development branches intentionally do **not** create Vercel Preview deployments and do not consume deployment quota.
+Superseded, kept as history (2026-09-23): the per-branch map (`gpt/g3-topic-golden-slug-rank-foundation-v1` → true; `gpt/*` → false; `claude/*` → false) and the earlier `ignoreCommand` note no longer describe the configuration.
 
-This supersedes the old operational note that `ignoreCommand` is the live non-main mechanism. Live verification on 2026-09-23 found no such active `ignoreCommand`; branch filtering is currently implemented by `git.deploymentEnabled`.
+## Preview
+A Preview deployment is created only as an explicitly approved, bounded action (CLAUDE.md rule 7: a protected Preview requires ZURIEL's explicit approval), from an exact approved artifact head, never as production (`target=null`). Verify before sharing: source artifact known; Preview target; `READY`; requested route returns HTTP 200. Generate/share a protected Preview URL when Deployment Protection is enabled. Never merge or promote a preview carrier branch.
 
-## Authorized Preview lane
-Reserved branch namespace: `preview/*`.
+Historical mechanism (2026-09-23): a `preview/*` carrier branch with an inert marker commit triggered Vercel Git Integration because `preview/*` was outside the blocked namespaces. With the global `deploymentEnabled: false` a push to `preview/*` no longer deploys by itself; the record below is provenance only.
 
-Purpose:
-- Human Visual Gate / temporary branch preview only.
-- Created only when preview/release is authorized by ZURIEL or the active release owner permits it.
-- Source must be an exact approved artifact head.
-- If branch creation alone does not fire Vercel Git Integration, create one inert carrier/marker commit on the `preview/*` branch to produce a real push event.
-- Marker must not modify application behavior.
-- Verify Vercel deployment metadata before sharing:
-  - Git ref starts with `preview/`;
-  - source artifact is known;
-  - `target=null` / Preview, never production;
-  - deployment reaches `READY`;
-  - requested preview route returns HTTP 200.
-- Generate/share a protected Preview URL when Deployment Protection is enabled.
-- Never merge/promote a preview carrier branch.
-- Close/delete preview carrier after Human Visual review when no longer needed.
-
-Why this works:
-Vercel `deploymentEnabled` uses minimatch; unspecified branches default to deployment enabled. The current `gpt/*` and `claude/*` rules remain false, while `preview/*` is outside those blocked namespaces.
-
-## F11 proof
+## F11 proof (historical, 2026-09-23)
 On 2026-09-23:
@@ -55,4 +34,2 @@
 ## Safety
-Do not broaden `gpt/*` or `claude/*` to true merely to get a Preview.
-Use `preview/*` so development remains quota-protected and Preview creation remains an explicit, bounded action.
-
+Do not enable Git deployments (globally or per branch) merely to get a Preview. Preview and Production creation remain explicit, bounded, approved actions.
```

#### הפונקציה `admin_suggestion_decide` (`11_`, לאישור DB נפרד)

```diff
--- admin_suggestion_decide (live def)
+++ admin_suggestion_decide (proposed)
@@ -86,3 +86,3 @@
           then 'MAJOR: branch/PR preparation only; release advice must be BLOCKED_BY Foundation redesign-risk challenge/Human Gate.'
-          else 'PATCH/MINOR: branch/PR preparation only; after exact-head gates a release controller may classify AUTO_RELEASE_NOW under deploy_on_request v2. Radar current baseline is dynamic from origin/main; do not create a baseline-only DB migration.'
+          else 'PATCH/MINOR: branch/PR preparation only; after exact-head gates the release advice is READY_FOR_APPROVAL: merge and deploy only after explicit approval by ZURIEL of the exact action (deploy_on_request v4, no standing authorization). Radar current baseline is dynamic from origin/main; do not create a baseline-only DB migration.'
         end,
@@ -93,3 +93,3 @@
         v_scope,
-        'system_suggestions_law v3 + deploy_on_request v2 + inter_agent_coordination_law v13',
+        'system_suggestions_law v3 + deploy_on_request v4 + inter_agent_coordination_law v18',
         'BRANCH_ONLY_NO_MERGE_NO_DEPLOY',
```

---

## 13. השוואת PR #1296 מול `6ab74289f`, ונוסח SQL 10 לפני/אחרי (11.11.2026 · קריאה בלבד)

> **סטטוס:** קריאה ובדיקות מקומיות בלבד. **לא הורץ SQL**, לא הייתה דחיפה, **PR #1296 לא שונה**, ולא היה מיזוג. המיזוג של #1296 ל־`main` נעשה רק בעותק זמני מקומי, כדי להריץ עליו בדיקות; העותק נמחק.

### 13.1 עובדות על PR #1296 (נקרא מ־GitHub)

| שדה | ערך |
|---|---|
| ראש · בסיס | `a377d023733bd89ef834a42bf5da4f8f230a8615` · `54fac7876` (8 קומיטים מאחורי `main`). קבצי הסדרות לא השתנו ב־`main` מאז |
| מצב | טיוטה, פתוח, `mergeable_state: unstable`. אין הערות ואין ביקורות |
| קומיטים | `dcf194031` — ״Align 2029 series membership…״: רוקן את `membership` של «מה קורה הבורא» והוסיף חריגים קשיחים ב־`contentSeriesKeysForPost` · `86d9c0d28` — ״Preserve series fetch compatibility while preparing author-based query״: החזיר את התגית, כי שאילתת הסדרה נשענת עליה · `a377d0237` — מסמך חוזה חדש |
| CI על הראש | 10 עברו · 1 נכשל: ״Mobile + Accessibility Acceptance״ (לא בדקתי את הסיבה) |
| קבצים | `src/lib/research/contentSeries2029Identity.js` (13 שורות) · `docs/2029-post-connections-contract-20261110.md` (חדש, 27 שורות) |
| מיזוג ל־`main` העדכני | נקי (`git merge-tree`). מול הענף שלי: קונפליקט בקובץ הזהות |

### 13.2 מטריצה — רמת קובץ

| קובץ | #1296 | `6ab74289f` | יחס |
|---|---|---|---|
| `src/lib/research/contentSeries2029Identity.js` | חריגים קשיחים בפונקציה; ניסוח `relationNote` | שדה `admission` בהגדרה; 4 פונקציות כניסה; `relationNote` | **חופף וסותר** (אותו קובץ, מנגנון שונה) |
| `src/lib/research/postsCatalog2029Projection.js` | — | שאילתה ובדיקת שורה לפי כלל הכניסה | ייחודי לענף |
| `src/lib/research/contentSeries2029Projection.js` | — | תצוגת הבית והחרגות לפי כלל הכניסה | ייחודי לענף |
| 5 קובצי בדיקה | — (5 בדיקות קיימות נכשלות, 13.6) | עודכנו להחלטות 6–7, ועוד 2 בדיקות חדשות | ייחודי לענף |
| `docs/2029-post-connections-contract-20261110.md` | חדש: פוטר פוסט, תגיות וסדרות | — | ייחודי ל־PR |
| `SOD1820_CONTENT_FOUNDATION_CONTRACT.md` | — | הערה מתוארכת אחרי טבלת 6.11 | ייחודי לענף |
| PLAN37 (DB) | — | `50_` מוצע (לא הורץ) | ייחודי לענף |

### 13.3 מטריצה — רמת פונקציה

| פונקציה / הגדרה | #1296 | `6ab74289f` | יחס |
|---|---|---|---|
| הגדרת `mah-kore-habora` | אותה תגית; `relationNote` חדש | אותה תגית; `admission.exactAuthorAllPosts` עם decisionRef; `relationNote` חדש | חופף; הניסוח שקול |
| הגדרת `dimension-five` | ללא שינוי | `admission.approvedPostIds: [5003, 5004]` | ייחודי לענף |
| `contentSeriesKeysForPost` | `spec.key === "mah-kore-habora" && author === "אלון לוי"` · `spec.key === "dimension-five" && [5003,5004]` · אחרת הכלל הישן | `contentSeriesAdmits` לכל הגדרה | **סותר:** אותה החלטה, שני מימושים |
| `contentSeriesMembershipFilter`, `hasExactMembership` | ללא שינוי | ללא שינוי | זהה |
| `isApprovedSeriesPost`, `contentSeriesExclusionReason`, `contentSeriesAdmits`, `contentSeriesAdmissionFilter` | — | חדשות | ייחודי לענף |
| `publicCatalogQuery` (דף הסדרה) | ללא שינוי: `.or(membership)` + `.eq(author)` | `.or(contentSeriesAdmissionFilter)` | **ב־#1296 השאילתה סותרת את הזהות** |
| `validatePostRows` | ללא שינוי | `contentSeriesAdmits` | ייחודי לענף |
| `fetchSeriesPreview` (הבית) | ללא שינוי | פילטר הכניסה | ייחודי לענף |
| `projectContentSeriesItems` | ללא שינוי (מחריג את הנוספים) | `contentSeriesExclusionReason` | ייחודי לענף |

### 13.4 מטריצה — רמת חוזה

| נושא | #1296 | `6ab74289f` | יחס |
|---|---|---|---|
| מקום התיעוד | מסמך חוזה חדש ב־`docs/`, שמצהיר ״Extend existing reality_graph_law v8…״ | בלי מסמך חדש: הערות בקוד, הערה ב־CFC ורישום ב־PLAN37 (`50_`, הבעלים לפי CFC:93–97) | ב־#1296 זה מקור תיעוד נוסף לסדרות, מחוץ ל־PLAN37 |
| פוטר פוסט («החיבורים בעץ», «המשך המסע», «תגיות וסיווגים») | חוזה מוצע, לא ממומש | — | ייחודי ל־PR; לא חלק משמונה ההחלטות |
| תגיות (`tags` כמרשם; `post_tags` חסר) | הערה | — | ייחודי ל־PR (`unified_tags_law`, G5 פתוח) |
| שערי קבלה | 5 שערים | — | **ניתן לשלב** כרשימת בדיקה (13.7) |

### 13.5 מטריצה — רמת החלטת מוצר

| החלטה | #1296 | `6ab74289f` | יחס |
|---|---|---|---|
| «מה קורה הבורא» = כל הפוסטים של המחבר המדויק | ״owner approved 2026-11-10״; בזהות בלבד | החלטה 6 (11.11), אחרי אימות זהות מול YouTube; בזהות, בשאילתה ובתצוגה | **חופף**. ב־#1296 דף הסדרה לא מציג 5 פוסטים |
| 5003/5004 בשיוך כפול | ״…dual membership מימד חמש and the site's **צופן בתרבות** collection/category״ | החלטה 7; המשפחה נשארת «הצופן בסרטים» | **סותר:** «צופן בתרבות» הוא שם לא מאושר (החלטה 7: ״אין להמציא שם סדרה חדש״) |
| שאר המפרסמים בקטגוריה | ״remain unapproved״ | לא נוספו (9) | זהה |
| בלי עותקים, קרדיט נשמר | כן | כן (נבדק) | זהה |
| אימות זהות היוצר | לא מתועד | מתועד (13 פוסטים, ערוץ `@alonlevifaithfull`) | ייחודי לענף |
| פוטר ותגיות | הצעה | — | ייחודי ל־PR; לא הוכרע |

### 13.6 ראיות

**בדיקות** (Node 24.21.0; #1296 מוזג ל־`main` רק בעותק זמני): 323 בדיקות, 314 עברו, 9 נכשלו. כלומר 5 כשלים חדשים, מעבר ל־4 שקיימים בבסיס. אלה בדיוק חמש הבדיקות שמבטאות את ההחלטות הישנות, וה־PR לא עדכן אותן:
* ״series membership is exact and keeps author, publisher and topic separate״
* ״unmapped posts, a title, a slug, a tag alone and a different publisher keep the general background״
* ״an unresolved source classification remains reachable without a series/topic/publisher guess״
* ״writer controls require an exact public canonical contributor…״
* ״an unavailable writer lookup leaves independently resolved category targets usable״

בענף: 325 בדיקות, 321 עברו, ורק 4 הכשלים הקיימים (12.3). קובצי הבדיקה האלה לא רצים ב־CI, ולכן ה־CI של #1296 לא תפס את הכשלים.

**הזהות מול שאילתת השרת** (ה־API החי, GET בלבד, מפתח ציבורי; הסקריפט `/tmp/claude-0/-home-user-sod1820/a0e1057f-583d-5146-a7ff-2fa62b42ebc6/scratchpad/exec/tools/probe_series.mjs`):

| מימוש | «מה קורה הבורא»: זהות / שאילתה | חסרים בשאילתה | «מימד חמש»: זהות / שאילתה | חסרים בשאילתה |
|---|---|---|---|---|
| #1296 על `main` | 13 / **8** | 54, 5021, 5035, 5042, 5069 | 37 / **35** | 5003, 5004 |
| `6ab74289f` | 13 / 13 | — | 37 / 37 | — |

**המשמעות ב־#1296:** שבעה פוסטים יוצגו כחברי סדרה בדף הפוסט — בתג, ברקע, בסיווג ובכפתור המעקב — אבל לא יופיעו בדף הסדרה ולא בתצוגת הבית. גם הספירות לא יתאימו.

### 13.7 סיכום: חופף · ייחודי · סותר · ניתן לשלב

* **חופף:** אותן שתי החלטות. אותו קובץ זהות. אותם עקרונות (בלי עותקים, קרדיט נשמר, בלי מפרסמים נוספים). ניסוח `relationNote` שקול.
* **ייחודי לענף:** צד השאילתה וצד התצוגה. 4 פונקציות כניסה. הבדיקות. אימות זהות היוצר. הערת CFC. `50_` ל־PLAN37.
* **ייחודי ל־PR:** חוזה הפוטר והתגיות, ורשימת שערי קבלה.
* **סותר:**
  * (1) שני מימושים שונים ל־`contentSeriesKeysForPost` (קונפליקט git).
  * (2) ב־#1296 הזהות לא מתאימה לשאילתה.
  * (3) השם «צופן בתרבות».
  * (4) תיעוד ההחלטות במסמך חדש, ולא ב־PLAN37.
* **ניתן לשלב בלי לאבד דבר:**
  * שערי הקבלה של #1296 כרשימת בדיקה לנשא:

    | שער | מצב בענף |
    |---|---|
    | כניסה לפי מחבר בלבד, כולל בלי תגית | מתקיים |
    | חסימת טיוטה/פורום | מתקיים |
    | 5003/5004 בלי מחברים אחרים | מתקיים |
    | התאמה בין ספירות, בית, רשימה ומעקב | מתקיים (פילטר אחד) |
    | בדיקות רגרסיה | מתקיים (+ שער ה־SEO: PASS) |
    | פוטר | מחוץ לתחום |

  * חוזה הפוטר — כפריט עבודה נפרד, בבעלות `reality_graph_law`, באישור.
  * הניסוח של `relationNote` מ־#1296 — אם תעדיף אותו.

  אין ב־#1296 בדיקות או נתונים שצריך לשמר.

### 13.8 הנשא הקנוני המוצע לסדרות

**נשא אחד: הקומיט `6ab74289f8dd14fdb584bed038ff5919ec02c834`**, בענף `ccr-b2565041-d94syf`.

* **בדיקות:** אף בדיקה לא נמחקה. 5 עודכנו להחלטות שאושרו (כל אחת שומרת את הכוונה המקורית שלה), ונוספו 2. ל־#1296 אין בדיקות לשמר.
* **נתונים:** אף צד לא משנה נתונים. 5003/5004 שומרים את הקטגוריות ואת שדה המחבר.
* **החלטות:**
  * DEC-SERIES-003/004/005/006 נשמרות, מלבד שני החלקים שהחלטות 6–7 מחליפות במפורש. ההחלפה מתועדת ב־`50_` (PLAN37, סעיף 12.58), שממתין לאישור.
  * ההחלטות ש־#1296 מתאר כ״אושרו ב־10.11״ הן אותן החלטות, ולכן הן נשמרות.
  * «צופן בתרבות» לא אומץ.
* **#1296:** לא נגעתי בו. מה לעשות בו — החלטה שלך, למשל לסגור אותו כ״הוחלף״ לגבי הסדרות, או להשאיר אותו רק לחוזה הפוטר אחרי הסרת קוד הסדרות. כל פעולה עליו דורשת את אישורך.
* **סדר מוצע:**
  1. אישור `50_` (רישום ב־PLAN37).
  2. rebase מקומי של הענף על `main` העדכני (נבדק נקי).
  3. דחיפה ופתיחת PR, באישור.
  4. CI.
  5. מיזוג, באישור.
  6. פריסה, באישור נפרד.

  אם תרצה שהסדרות ימוזגו בנפרד מקומיט המסמכים `921a3c150`, אפשר להעביר את `6ab74289f` לענף נקי מ־`main` (cherry-pick של קומיט שלי). גם זה באישורך.

### 13.9 SQL 10 — סיכום לפני/אחרי, תלויות, rollback וסיכונים

הנוסח המדויק המלא, כל קטע שהשתנה לפני ואחרי כולל חלון רזיאל ומפתחות המטא־דאטה, נמצא בנספח **13.A**. הבסיס נבדק שוב עכשיו: **כל 6 היעדים זהים לבסיס של הקובץ**, ואין גרסה חדשה יותר.

| יעד | גרסה | תווית לפני → אחרי | md5 תיאור/גוף לפני → אחרי | חלון רזיאל |
|---|---|---|---|---|
| `deploy_on_request` | v3 → v4 | «🚀 Auto Release v2 — Gate-Clean Standing Authorization» → «⛔ Release v4 — Explicit Approval per Merge & Deployment · No Standing Authorization» | `f93e73ce…` → `78d80d22…` | **משתנה:** היום רזיאל רואה ״STANDING AUTO-RELEASE״, ״תעלה״ ו״כל push ל-main = פריסת Vercel״. אחרי: אישור מפורש לכל פעולה, ו־2029 הוא המוצר היחיד |
| `inter_agent_coordination_law` | v17 → v18 | «Inter-Agent Coordination v16 — Mandatory Claude Visual Lane» (שגיאה בתווית) → «Inter-Agent Coordination v18 — 2029 Production · Explicit Release Approval» | `02d188d1…` → `0ce1688c…` | ללא שינוי (השינויים עמוק בטקסט) |
| `foundation_closure_protocol_law` | v7 → v8 | «…v7 — Bottom-Up Closure + Maintenance Acceptance» → «…v8 — Bottom-Up Closure + Explicit Release Approval» | `336934e5…` → `eb603a65…` | ללא שינוי |
| `system_suggestions_law` | v5 → v6 | «…v5 — Resource-Aware Reliability + Incident Budget» → «…v6 — Resource-Aware Reliability + Explicit Release Approval» | `9b5c19de…` → `98d4d88e…` | ללא שינוי |
| קודקס #4 `publishing_conventions` | — | — | `26b473b7…` → `f39efab9…` | — |
| קודקס #9 `branches_deploy` | — | — | `6cee6559…` → `8d87b845…` | — |

**מה השינוי עושה, בקצרה:**
* **`deploy_on_request` v4:** מבטל את ההרשאה העומדת ואת ״תעלה כעקיפה״. קובע: אישור מפורש לכל מיזוג ולכל פריסה; מיזוג≠פריסה; אישור גם לשינוי DB; מצב הייעוץ ״READY_FOR_APPROVAL״ (קודם ״AUTO_RELEASE_NOW״); ומפנה לנוהל שב־`CLAUDE.md`. בלוק הקנרית של v3 נשמר מילה במילה (5 מ־6 השורות), חוץ משינוי שם אחד: ״AUTO-RELEASE PREFLIGHT (v2 §5)״ ← ״RELEASE PREFLIGHT (§5)״. ערך הסף לא כתוב בחוק; הוא מוגדר בקוד ובוורקפלואו, ולא השתנה.
* **`inter_agent_coordination_law` v18:** כותרת 10.11 (2029 = Production, אין הרשאה עומדת). §75 ו־§79 מסומנים היסטוריים, ו־§80 מעודכן. §82 (שחרור אוטומטי) מבוטל ומוחלף ב״READY_FOR_APPROVAL ואז אישור מפורש״. §86 ו־§88 מעודכנים. ב־§89 `palette.js` מוחלף ב־`paletteTokens2029.js`. כלל הדיווח של v17 לא נוגע.
* **`foundation_closure_protocol_law` v8 ו־`system_suggestions_law` v6:** כל ההפניות ל״standing authorization under deploy_on_request v2״ מוחלפות ב״אישור מפורש של צוריאל״.
* **קודקס #4:** ״(Legacy, 2029, או אחר)״ ו״לרבות Legacy״ מוסרים. כלל ה־modified date מוגדר מחדש ל־2029, כי קוראי 2029 ממיינים לפי `modified`.
* **קודקס #9:** ״main = production; push may create a deployment״ מוחלף בעובדות של היום: `git.deploymentEnabled=false`, ה־Ignored Build Step ונוהל `CLAUDE.md`. שורות הראיות של F11 נשמרות מילה במילה.

**תלויות:**
* `depends_on` של הגרסאות החדשות מועתק מהבסיס. כל היעדים פעילים: `live_state_resolution_law`, `ai_analyze_contract`, `raziel_routing_law`, `research_strategy_layer_law`, `traffic_intelligence_law`.
* החוקים שתלויים ביעדים (`system_suggestions_law`, `canonical_ui_components_law`, `els_research_layer_law`, `raziel_routing_law`) מפנים לפי מזהה ולא לפי גרסה, ולכן לא נשברים.
* `admin_suggestion_decide` ממשיך להפיק את הטקסט הישן עד `11_`.
* הפניות מיושנות במסמכים — patch 0001 אחרי ההרצה.
* הערות provenance בקוד וב־Edge (״deploy_on_request v3״, ״system_suggestions_law v5״) — קוסמטיות, לא תפקודיות.

**Rollback (`19_`, SHA-256 `cbe420f72e2ad43bcf244aee1e49dd363ead9f4d1b499000c2ebc3adc0b0d9c4`):**
* ההחזרה:
  * בודק שהקודקס נמצא במצב של `10_` (md5), ואז משחזר את שני הגופים המדויקים.
  * מכבה את v4/v18/v8/v6 ומפעיל מחדש את v3/v17/v7/v5. בשורות האלה לא נגעו, ולכן הן חוזרות בדיוק לבסיס.
* מה לא קורה בהחזרה:
  * הגרסאות החדשות נשארות כשורות לא פעילות. אין מחיקה.
  * ה־rollback מסרב לרוץ אם `10_` לא הוחל.
  * אחרי rollback, הרצה חוזרת של `10_` מסורבת (כבר קיימת גרסה מעל הבסיס). הרצה חוזרת תדרוש קובץ חדש.

**סיכוני הפעלה:**

| # | סיכון | חומרה | צמצום |
|---|---|---|---|
| 1 | שורה משתנה לפני ההרצה. ב־10.11 נמצאו עריכות במקום, בלי רישום, ב־`publishing_conventions` | נמוכה (כשל בטוח) | הקובץ מסרב לרוץ ולא משנה כלום. מייצרים אותו מחדש |
| 2 | אחרי ההרצה, `CLAUDE.md`, `AGENTS.md`, `AGENT_HANDOFF.md`, Owner Index, Roadmap ובדיקת ה־smoke עדיין אומרים v17/v3/v7/v5 | נמוכה (המשמעות זהה) | patch 0001 מיד אחרי האימות (מיזוג באישור; כולל נעיצת ה־smoke) |
| 3 | `admin_suggestion_decide` עדיין מפיק ״AUTO_RELEASE_NOW under deploy_on_request v2״ | בינונית־נמוכה: טקסט ייעוץ שסותר את v4 | לאשר את `11_` מיד אחרי `10_` (אישור DB נפרד) |
| 4 | שינוי במה שרזיאל אומר על שחרור | שיפור | החלון החדש מתאר את המדיניות הנכונה |
| 5 | שינוי בתוויות של 4 חוקים בממשקים שמציגים חוקים | נמוכה | התוויות מתוקנות (כולל ״v16״ השגוי) |
| 6 | הטריגר והאינדקסים: גרסה פעילה אחת, רצף גרסאות, מטא־דאטה ממשלית | נבדק | כל ריצה בטרנזקציה אחת, והסימולציה עם פונקציית הטריגר החיה עברה (65/65) |
| 7 | הרשאות ו־RLS | אין שינוי | המטא־דאטה של הגרסאות החדשות נגזרת מהבסיס, ולכן אותה חשיפה ציבורית |
| 8 | היומן | — | רשומות BEFORE/AFTER הן כתיבת DB נפרדת. מומלץ לאשר יחד |
| 9 | קנרית וספים | אין שינוי בדרישה | בלוק הקנרית נשמר, מלבד שם אחד (״RELEASE PREFLIGHT״). הספים בקוד לא נוגעים |

### 13.10 שתי המלצות לאישור

**המלצה 1 — נשא הסדרות:**
* לאשר את `6ab74289f8dd14fdb584bed038ff5919ec02c834` כנשא הקנוני היחיד להחלטות 6–7, בסדר שב־13.8. כל צעד באישור נפרד: `50_` (PLAN37), rebase, דחיפה ו־PR, CI, מיזוג ופריסה.
* לאשר ש־#1296 **לא** ימוזג לגבי הסדרות, ושחוזה הפוטר שבו יטופל כפריט נפרד. מה לעשות ב־PR עצמו — לפי הנחייתך.

**המלצה 2 — SQL 10:**
* לאשר הרצה אחת של `10_p0_release_policy.sql`, ‏SHA-256 `d1ac658b6e2ace922ac5d32a3021f6ef8aa88dc06390b05aca095da0d48963fb`, כפי שהוא. ה־rollback מוכן: `19_`, ‏`cbe420f7…`.
* באותו אישור: רשומות BEFORE/AFTER ביומן.
* מיד אחרי ההרצה: אימות (גרסה פעילה אחת לכל חוק, md5 של 6 היעדים), ואז patch 0001 של ההפניות. המיזוג שלו באישור, כולל עדכון נעיצת ה־smoke.
* מומלץ לאשר את `11_` (‏`a43b12ca…`) מיד אחר כך, כדי לסגור את סיכון 3.

### 13.A נספח — SQL 10: הנוסח המדויק לפני/אחרי (`10_p0_release_policy.sql`, SHA-256 `d1ac658b6e2ace922ac5d32a3021f6ef8aa88dc06390b05aca095da0d48963fb`)
> קריאה בלבד. ה״לפני״ = השורה החיה (md5 אומת מול המסד ב־11.11). ה״אחרי״ = הטקסט שהקובץ כותב (md5 מאומת בתוך הקובץ). כל קטע שונה מוצג במלואו; שורות שלא השתנו לא מוצגות.

#### deploy_on_request — v3 → v4
* תווית: לפני — «🚀 Auto Release v2 — Gate-Clean Standing Authorization» · אחרי — «⛔ Release v4 — Explicit Approval per Merge & Deployment · No Standing Authorization»
* md5 תיאור: `f93e73ce0ad3bc66457e6ff07cdb2322` → `78d80d2264e0b5062b425319b25a3e3a` · אורך: 5,820 → 6,532 תווים
* `supersedes_version`: 3 · v3 נשאר שורה לא פעילה (היסטוריה)

**חלון רזיאל (600 התווים הראשונים) — לפני:**

```text
צוריאל מחליט מתי מעלים לאוויר. לא דוחפים ל-main אוטומטית. כל push ל-main = פריסת Vercel, והמכסה החינמית מוגבלת (100 פריסות/יום). אסור לבזבז אותה על כל תיקון קטן. צוברים שינויים כ-commits (לענף הפיתוח לשמירה), ומעלים ל-main רק כשצוריאל אומר במפורש («תעלה»/«העלה»). אז מעלים את כל המצטבר בבת אחת. ליזום עדכון: בכל הזדמנות מתאימה לומר לצוריאל כמה חלקים מוכנים וממתינים לפריסה, ולשאול אם להעלות עכשיו. שינויי נתונים (Supabase) חיים מיד ולא תלויים בפריסה — מותר להמשיך בהם כרגיל בלי לשרוף מכסה.

[UPDATE v2 · Human-Gate ZURIEL · 17.9.2026 — STANDING AUTO-RELEASE AUTHORIZATION · SUPERSEDES EXPLICIT “תעלה”
```

**אחרי:**

```text
[v4 · Human-Gate ZURIEL · 10.11.2026 — אישור מפורש לכל מיזוג ולכל פריסה · אין הרשאה עומדת · 2029 הוא המוצר הפעיל היחיד]
צוריאל מחליט על כל שחרור. כל מיזוג ל-main וכל פריסה ל-Production מחייבים אישור מפורש של צוריאל לפעולה המסוימת — לקומיט ולפריסה המדויקים שהוצגו לו. אין הרשאה עומדת, ואישור אינו עובר מסשן לסשן, מפעולה לפעולה או מ-PR שמוזג. מיזוג אינו פריסה: push או מיזוג ל-main אינם יוצרים פריסה (git.deploymentEnabled=false בשני קובצי vercel.json, ולפי CLAUDE.md גם Ignored Build Step מדלג על main); פריסת Production היא פעולה נפרדת ומאושרת לפי הנוהל המתועד ב-CLAUDE.md («נוהל פריסה ל-Production מ
```

##### קטע 1 — שורות 1–1 (לפני) → 1–3 (אחרי) · replace

**לפני:**

```text
צוריאל מחליט מתי מעלים לאוויר. לא דוחפים ל-main אוטומטית. כל push ל-main = פריסת Vercel, והמכסה החינמית מוגבלת (100 פריסות/יום). אסור לבזבז אותה על כל תיקון קטן. צוברים שינויים כ-commits (לענף הפיתוח לשמירה), ומעלים ל-main רק כשצוריאל אומר במפורש («תעלה»/«העלה»). אז מעלים את כל המצטבר בבת אחת. ליזום עדכון: בכל הזדמנות מתאימה לומר לצוריאל כמה חלקים מוכנים וממתינים לפריסה, ולשאול אם להעלות עכשיו. שינויי נתונים (Supabase) חיים מיד ולא תלויים בפריסה — מותר להמשיך בהם כרגיל בלי לשרוף מכסה.
```

**אחרי:**

```text
[v4 · Human-Gate ZURIEL · 10.11.2026 — אישור מפורש לכל מיזוג ולכל פריסה · אין הרשאה עומדת · 2029 הוא המוצר הפעיל היחיד]
צוריאל מחליט על כל שחרור. כל מיזוג ל-main וכל פריסה ל-Production מחייבים אישור מפורש של צוריאל לפעולה המסוימת — לקומיט ולפריסה המדויקים שהוצגו לו. אין הרשאה עומדת, ואישור אינו עובר מסשן לסשן, מפעולה לפעולה או מ-PR שמוזג. מיזוג אינו פריסה: push או מיזוג ל-main אינם יוצרים פריסה (git.deploymentEnabled=false בשני קובצי vercel.json, ולפי CLAUDE.md גם Ignored Build Step מדלג על main); פריסת Production היא פעולה נפרדת ומאושרת לפי הנוהל המתועד ב-CLAUDE.md («נוהל פריסה ל-Production מסשן ענן»). 2029 הוא המוצר הפעיל היחיד — Production מאז 4.11.2026; Legacy פרש ב-5.11.2026 ואינו יעד פריסה, Preview או חזרה.
צוברים שינויים בענף העבודה, מציגים לצוריאל מה מוכן וממתין עם המלצת שחרור (§4), ושואלים. שינויי נתונים ב-Supabase (DB, SQL, מיגרציות, Edge Functions) חיים מיד ואינם תלויים בפריסה, ולכן גם הם דורשים אישור מפורש לפעולה המדויקת (CLAUDE.md §0.4).
```

##### קטע 2 — שורות 3–3 (לפני) → 5–5 (אחרי) · replace

**לפני:**

```text
[UPDATE v2 · Human-Gate ZURIEL · 17.9.2026 — STANDING AUTO-RELEASE AUTHORIZATION · SUPERSEDES EXPLICIT “תעלה” REQUIREMENT FOR ROUTINE RELEASES]
```

**אחרי:**

```text
[v4 · consolidated release protocol — replaces the standing authorization of v2 (17.9.2026, §§1, 2, 8)]
```

##### קטע 3 — שורות 5–13 (לפני) → 7–17 (אחרי) · replace

**לפני:**

```text
1. STANDING AUTHORIZATION. ZURIEL grants standing Human-Gate authorization for routine code/runtime releases that are demonstrably GATE-CLEAN, DEPENDENCIES-CLOSED, CURRENT-MAIN-RECONCILED, CI/GOLDEN-GREEN, SECURITY/PRIVACY-CLEAN where applicable, and free of overlapping active writers. A separate “תעלה” / “העלה” message is no longer required for such releases.
2. RELEASE WHEN READY, NOT WHEN ASKED. The primary agent owns release timing. When the complete dependency batch becomes clean, it should merge/apply/deploy the authorized bounded release and verify live state without asking ZURIEL for an extra confirmation. Do not leave gate-clean work indefinitely branch-only merely waiting for a release word.
3. DEPENDENCY-AWARE BATCHING. Release follows the canonical dependency DAG/batch, not PR creation order. A higher layer waits for required lower layers. Independent clean lanes may release independently when doing so cannot create a temporary incompatible state. Stacked/dependent PRs are composed/rebased/reconciled before release rather than blindly merged one by one.
4. RELEASE RECOMMENDATION IS MANDATORY. Every material completion/handoff must classify its release state as exactly one of: AUTO_RELEASE_NOW · BUNDLE_WITH(<scope>) · BLOCKED_BY(<dependency/gate>) · SAFE_INDEPENDENT_WAITING_RUNTIME · DO_NOT_RELEASE_SUPERSEDED/PARKED. The agent explains the decisive dependency in plain language.
5. AUTO-RELEASE PREFLIGHT. Before automatic release refresh live sync and verify at minimum: canonical owner/current main; exact head/base; open dependency/blocker state; required tests/checks; migration/RLS/security gates when touched; no active overlapping writer; rollback/recovery path; release batch compatibility. Any uncertainty that can change safety = BLOCKED, not guessed.
6. POST-RELEASE PROOF. Automatic release is not complete at merge. Verify actual production/live object state, exact deployed version/bundle/function/migration as applicable, critical smoke/golden path, and record AFTER with MERGED/APPLIED/DEPLOYED/LIVE/VERIFIED separately. Silent deployment failure remains failure.
7. STANDING AUTHORIZATION DOES NOT COVER IRREVERSIBLE PRODUCT/TRUTH DECISIONS. Still require explicit ZURIEL Human Gate for: canonicalizing/publishing governed research truth when owner requires Human Gate; destructive/non-recoverable data loss; new paid prices/economics; major production cutover Legacy→2029; materially weakening privacy/security; permanent deletion/retirement of preserved capability/history; or an explicit active law that names a separate Human decision. Routine reversible schema migrations that are already owner/gate-approved may ship as part of a clean batch.
8. “תעלה” REMAINS AN OVERRIDE/EXPEDITE COMMAND, NOT A REQUIRED TOKEN. If ZURIEL says תעלה, proceed only if gate-clean; the command never bypasses blockers. If he says wait/hold, that explicit hold overrides standing authorization for the named scope until lifted.
9. VERCEL/RESOURCE SAFETY REMAINS. Batch releases sensibly, preserve quota safeguards, and avoid duplicate deployments. Optimization of deployment count must not postpone a dependency-clean release indefinitely.
```

**אחרי:**

```text
1. EXPLICIT APPROVAL PER ACTION. ZURIEL's explicit approval is required for each specific action on its exact object: merge to main (exact head SHA); Production deployment (exact SHA and deployment); alias/domain change or rollback (exact target); DB/SQL/migration, Edge Function deployment, flag or protected Preview (exact statement/version). Approval is not inherited from an earlier session, a merged PR, a passing workflow or a general instruction, and it does not extend to another action. «תעלה»/«העלה» counts as approval only for the exact commit and deployment presented.
2. MERGE ≠ DEPLOY. A merge to main never deploys by itself. After every merge re-read the live alias before reporting deployed / not deployed (a parallel session may deploy). Report DEPLOYED only after READY + alias + live verification.
3. DEPENDENCY-AWARE BATCHING. Release follows the canonical dependency DAG/batch, not PR creation order. A higher layer waits for required lower layers. Independent clean lanes may be presented for approval independently when doing so cannot create a temporary incompatible state. Stacked/dependent PRs are composed/rebased/reconciled before release rather than blindly merged one by one.
4. RELEASE RECOMMENDATION IS MANDATORY. Every material completion/handoff classifies its release state as exactly one of: READY_FOR_APPROVAL · BUNDLE_WITH(<scope>) · BLOCKED_BY(<dependency/gate>) · SAFE_INDEPENDENT_WAITING_RUNTIME · DO_NOT_RELEASE_SUPERSEDED/PARKED, and explains the decisive dependency in plain language. READY_FOR_APPROVAL (formerly AUTO_RELEASE_NOW) means ready to be presented to ZURIEL for explicit approval — never an automatic merge or deploy.
5. RELEASE PREFLIGHT. Before presenting a release, and again immediately before executing an approved action, refresh live sync and verify at minimum: canonical owner/current main; exact head/base; open dependency/blocker state; required tests/checks; migration/RLS/security gates when touched; no active overlapping writer; rollback/recovery path; release batch compatibility. Any uncertainty that can change safety = BLOCKED, not guessed.
6. POST-RELEASE PROOF. A release is not complete at merge. Verify actual production/live object state, exact deployed version/bundle/function/migration as applicable, critical smoke/golden path, and record AFTER with MERGED/APPLIED/DEPLOYED/LIVE/VERIFIED separately. Silent deployment failure remains failure.
7. SEPARATE HUMAN DECISIONS. Release approval does not cover: canonicalizing/publishing governed research truth when the owner requires Human Gate; destructive/non-recoverable data loss; new paid prices/economics; materially weakening privacy/security; permanent deletion/retirement of preserved capability/history; or an explicit active law that names a separate Human decision. Each needs its own explicit ZURIEL decision.
8. HOLD. «תעלה» never bypasses a failed or missing gate. If ZURIEL says wait/hold, that hold applies to the named scope until lifted.
9. VERCEL/RESOURCE SAFETY REMAINS. Batch releases sensibly, preserve quota safeguards and avoid duplicate deployments. Ready work is reported to ZURIEL as READY_FOR_APPROVAL rather than held silently.

מקור וקדימות: הכרעת צוריאל 10.11.2026 — «כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.» — מחליפה את ההרשאה העומדת של v2 לפי כלל הקדימות הקיים (החלטה מאוחרת ומפורשת של צוריאל גוברת על מוקדמת). v1–v3 נשמרות כגרסאות לא פעילות.
```

##### קטע 4 — שורות 18–18 (לפני) → 22–22 (אחרי) · replace

**לפני:**

```text
1. PREFLIGHT ADDITION. AUTO-RELEASE PREFLIGHT (v2 §5) additionally requires the latest GitHub commit status with context sod1820/post-deploy-canary on the current successful Production deployment SHA to be success, unless public.fn_release_canary_override_status() reports an active bounded Human-Gate override. GitHub Actions/commit status is the release evidence; arbitrary events rows are never release evidence.
```

**אחרי:**

```text
1. PREFLIGHT ADDITION. RELEASE PREFLIGHT (§5) additionally requires the latest GitHub commit status with context sod1820/post-deploy-canary on the current successful Production deployment SHA to be success, unless public.fn_release_canary_override_status() reports an active bounded Human-Gate override. GitHub Actions/commit status is the release evidence; arbitrary events rows are never release evidence.
```

**מטא־דאטה — מפתחות שהשתנו (11):**

* `auto_release_preconditions`
  * לפני: `["gate_clean", "dependencies_closed", "current_main_reconciled", "required_checks_green", "security_privacy_clean_if_applicable", "no_overlapping_writer", "rollback_recovery_known"]`
  * אחרי: `"∅"`

* `explicit_approval_required_per_action`
  * לפני: `"∅"`
  * אחרי: `true`

* `explicit_human_gate_remaining`
  * לפני: `["governed_truth_canonicalization_or_publication", "destructive_irreversible_data_loss", "pricing_economics", "legacy_to_2029_cutover", "privacy_security_weakening", "permanent_capability_history_retirement"]`
  * אחרי: `["governed_truth_canonicalization_or_publication", "destructive_irreversible_data_loss", "pricing_economics", "privacy_security_weakening", "permanent_capability_history_retirement"]`

* `human_gate_v4`
  * לפני: `"∅"`
  * אחרי: `"ZURIEL 2026-11-10"`

* `merge_is_not_deploy`
  * לפני: `"∅"`
  * אחרי: `true`

* `release_advice_state_aliases`
  * לפני: `"∅"`
  * אחרי: `{"AUTO_RELEASE_NOW": "READY_FOR_APPROVAL"}`

* `release_advice_states`
  * לפני: `["AUTO_RELEASE_NOW", "BUNDLE_WITH", "BLOCKED_BY", "SAFE_INDEPENDENT_WAITING_RUNTIME", "DO_NOT_RELEASE_SUPERSEDED/PARKED"]`
  * אחרי: `["READY_FOR_APPROVAL", "BUNDLE_WITH", "BLOCKED_BY", "SAFE_INDEPENDENT_WAITING_RUNTIME", "DO_NOT_RELEASE_SUPERSEDED/PARKED"]`

* `release_preconditions`
  * לפני: `"∅"`
  * אחרי: `["gate_clean", "dependencies_closed", "current_main_reconciled", "required_checks_green", "security_privacy_clean_if_applicable", "no_overlapping_writer", "rollback_recovery_known"]`

* `separate_taale_required`
  * לפני: `false`
  * אחרי: `true`

* `standing_auto_release`
  * לפני: `true`
  * אחרי: `false`

* `v4_explicit_release_approval`
  * לפני: `"∅"`
  * אחרי: `{"active_product": "2029", "decided_at": "2026-11-10", "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.", "legacy_retired": "2026-11-05", "no_new_system": true, "owner_check": "EXTEND_EXISTING", "procedure_ref": "CLAUDE.md — נוהל פריסה ל-Production מסשן ענן", "production_since": "2026-11-04", "supersedes": "v2 standing authorization (§§1, 2, 8)"}`

#### inter_agent_coordination_law — v17 → v18
* תווית: לפני — «Inter-Agent Coordination v16 — Mandatory Claude Visual Lane» · אחרי — «Inter-Agent Coordination v18 — 2029 Production · Explicit Release Approval»
* md5 תיאור: `02d188d1b92e32ea51907d059b18c47f` → `0ce1688c34a59353b42c2e1b53322c78` · אורך: 40,807 → 42,309 תווים
* `supersedes_version`: 17 · v17 נשאר שורה לא פעילה (היסטוריה)

**חלון רזיאל (600 התווים הראשונים) — לפני:**

```text
הוראת צוריאל מחייבת — 14.10.2026: דיווחים לצוריאל בלבד.
אין לשלוח הודעות, בקשות, מסירות, RESULT_WAKE או דרישות ACK ל-GPT. אין להמתין לתשובת GPT ואין לבצע retry לשם מסירה אליו. כל סוכן משיב לצוריאל בשיחה שבה הוא עובד ומתעד ביומן פסיבי TO=ZURIEL, ללא dispatch. עבודה שכבר אושרה ממשיכה; אין לבטל משימות מוצר. קריאת היומן לבדיקת בעלות ומניעת דריסה נשמרת, אך אינה תיבת הודעות ואינה דורשת ACK. בהתנגשות כתיבה אמיתית אין לערוך קבצים חופפים ויש לדווח לצוריאל.
כל סעיף קודם בחוק זה או בחוזה/adapter אחר המחייב מסירה ל-GPT או ACK ממנו מוחלף בהוראה זו. אין הפעלת סוכן אחר אוטומטית מכוח חובת דיווח; הפעלה חדשה דו
```

**אחרי:**

```text
הוראת צוריאל מחייבת — 14.10.2026: דיווחים לצוריאל בלבד.
אין לשלוח הודעות, בקשות, מסירות, RESULT_WAKE או דרישות ACK ל-GPT. אין להמתין לתשובת GPT ואין לבצע retry לשם מסירה אליו. כל סוכן משיב לצוריאל בשיחה שבה הוא עובד ומתעד ביומן פסיבי TO=ZURIEL, ללא dispatch. עבודה שכבר אושרה ממשיכה; אין לבטל משימות מוצר. קריאת היומן לבדיקת בעלות ומניעת דריסה נשמרת, אך אינה תיבת הודעות ואינה דורשת ACK. בהתנגשות כתיבה אמיתית אין לערוך קבצים חופפים ויש לדווח לצוריאל.
כל סעיף קודם בחוק זה או בחוזה/adapter אחר המחייב מסירה ל-GPT או ACK ממנו מוחלף בהוראה זו. אין הפעלת סוכן אחר אוטומטית מכוח חובת דיווח; הפעלה חדשה דו
```

##### קטע 1 — שורות 5–4 (לפני) → 5–6 (אחרי) · insert

**לפני:**

```text
(אין — שורות חדשות בלבד)
```

**אחרי:**

```text
הוראת צוריאל מחייבת — 10.11.2026 (v18): 2029 הוא Production והמוצר הפעיל היחיד; אין הרשאת שחרור עומדת.
2029 עלה ל-Production ב-4.11.2026 ו-Legacy פרש ב-5.11.2026 (קוד Legacy נשמר בהיסטוריית Git בלבד ואינו יעד פריסה, Preview או חזרה). סעיפים 75, 79 ו-80 (v12) תיארו את המצב שלפני המעבר והם היסטוריים; 76–78 נשארים בתוקף כעיקרון: חומר Legacy הוא ראיה היסטורית בלבד, לא סמכות עיצוב או ארכיטקטורה. כל מיזוג ל-main וכל פריסה ל-Production מחייבים אישור מפורש של צוריאל לפעולה המסוימת (deploy_on_request, הגרסה הפעילה). ההרשאה העומדת והשחרור האוטומטי של v13 (סעיפים 82, 86, 87) בוטלו; ייעוץ השחרור (81, 83–85, 88) נשאר, ותוצאתו המלצה לצוריאל — לעולם לא פעולה אוטומטית.
```

##### קטע 2 — שורות 6–6 (לפני) → 8–9 (אחרי) · replace

**לפני:**

```text
--- HISTORICAL V1–V16: conflicting communication clauses superseded by v17 ---
```

**אחרי:**

```text

--- HISTORICAL V1–V16: conflicting communication clauses superseded by v17; production/release clauses 75–82 and 86–88 updated by v18 ---
```

##### קטע 3 — שורות 119–120 (לפני) → 122–123 (אחרי) · replace

**לפני:**

```text
[UPDATE v12 · Human-Gate ZURIEL · 16.9.2026 — 2029 TARGET / TEMPORARY LEGACY PRODUCTION BOUNDARY, additive; EXTEND_EXISTING only]
75) TEMPORARY LEGACY PRODUCTION. Until ZURIEL explicitly declares cutover, the currently deployed legacy site remains the operational production surface for real users, production verification, urgent fixes and release safety. Its being live does NOT make its routes, components, information architecture, page composition or local implementation patterns the target architecture.
```

**אחרי:**

```text
[UPDATE v12 · Human-Gate ZURIEL · 16.9.2026 — 2029 TARGET / TEMPORARY LEGACY PRODUCTION BOUNDARY, additive; EXTEND_EXISTING only] — HISTORICAL PRE-CUTOVER STATE: superseded by v18 (10.11.2026); 2029 = Production since 4.11.2026
75) [HISTORICAL · superseded by v18] TEMPORARY LEGACY PRODUCTION. Until ZURIEL explicitly declares cutover, the currently deployed legacy site remains the operational production surface for real users, production verification, urgent fixes and release safety. Its being live does NOT make its routes, components, information architecture, page composition or local implementation patterns the target architecture.
```

##### קטע 4 — שורות 124–125 (לפני) → 127–128 (אחרי) · replace

**לפני:**

```text
79) CUTOVER IS EXPLICIT. No agent may assume the new site is production merely because 2029 work exists, and no agent may assume the legacy site is the long-term system merely because it is currently live. The transition point is a Human-Gate decision by ZURIEL and must be recorded with exact release/live state.
80) FRESH-AGENT ACCEPTANCE. A project-entry agent must be able to state both truths without prior conversation memory: CURRENT PRODUCTION = legacy/transitional until explicit cutover; TARGET ARCHITECTURE = 2029. Confusing those two states is an entry-routing failure and must be reported as DRIFT.
```

**אחרי:**

```text
79) [HISTORICAL · cutover executed 4.11.2026 by explicit ZURIEL decision; Legacy retired 5.11.2026] CUTOVER IS EXPLICIT. No agent may assume the new site is production merely because 2029 work exists, and no agent may assume the legacy site is the long-term system merely because it is currently live. The transition point is a Human-Gate decision by ZURIEL and must be recorded with exact release/live state.
80) FRESH-AGENT ACCEPTANCE (updated by v18). A project-entry agent must be able to state without prior conversation memory: CURRENT PRODUCTION = 2029 (since 4.11.2026); Legacy is retired (5.11.2026) and is not a production, Preview or rollback target; TARGET ARCHITECTURE = 2029. Treating Legacy as current production is an entry-routing failure and must be reported as DRIFT. [Historical pre-cutover wording: CURRENT PRODUCTION = legacy/transitional until explicit cutover.]
```

##### קטע 5 — שורות 129–131 (לפני) → 132–134 (אחרי) · replace

**לפני:**

```text
[UPDATE v13 · Human-Gate ZURIEL · 17.9.2026 — DEPENDENCY-AWARE AUTO-RELEASE / RELEASE ADVICE · EXTEND_EXISTING]
81) AGENT OWNS RELEASE RECOMMENDATION. At completion/checkpoint, Primary Owner must tell ZURIEL what should happen operationally, not merely “waiting for תעלה”. It classifies the exact scope using the canonical release-advice states from deploy_on_request v2 and names dependencies/bundle order.
82) AUTO-RELEASE ON CLEAN STATE. For routine release scopes covered by standing authorization, once live preflight proves GATE-CLEAN + DEPENDENCIES-CLOSED + CI/GOLDEN/SECURITY CLEAN as applicable + NO OVERLAP, the Primary Owner proceeds through merge/migration/deploy/live verification without a second user prompt.
```

**אחרי:**

```text
[UPDATE v13 · Human-Gate ZURIEL · 17.9.2026 — DEPENDENCY-AWARE RELEASE ADVICE · EXTEND_EXISTING · standing auto-release revoked by v18 (10.11.2026)]
81) AGENT OWNS RELEASE RECOMMENDATION. At completion/checkpoint, Primary Owner must tell ZURIEL what should happen operationally, not merely “waiting for תעלה”. It classifies the exact scope using the canonical release-advice states from deploy_on_request (active version) and names dependencies/bundle order.
82) [REVOKED by v18 · 10.11.2026] EXPLICIT APPROVAL, NO AUTO-RELEASE. A clean live preflight (GATE-CLEAN + DEPENDENCIES-CLOSED + CI/GOLDEN/SECURITY CLEAN as applicable + NO OVERLAP) makes a scope READY_FOR_APPROVAL; the Primary Owner presents the exact commit/deployment to ZURIEL and merges, applies migrations or deploys only after his explicit approval of that specific action. [Former v13 text: auto-release on clean state under standing authorization, without a second user prompt.]
```

##### קטע 6 — שורות 135–137 (לפני) → 138–140 (אחרי) · replace

**לפני:**

```text
86) AUTO-RELEASE DOES NOT AUTO-CANONICALIZE. Dispatch/release standing authorization does not grant autonomous governed-truth publication, destructive irreversible changes, pricing/economics, major Legacy→2029 cutover, or other explicitly Human-Gated product decisions. Those remain separately gated.
87) USER HOLD. Explicit ZURIEL “hold/wait/do not release” for a scope creates a release hold in coordination context and overrides standing authorization until lifted.
88) AFTER MUST INCLUDE RELEASE ADVICE/RESULT. Every material AFTER includes: release_advice; dependency_state; exact branch/PR/head; merged/applied/deployed/live/verified booleans/states; blocker if any; next auto-action. Session end must leave enough information for a fresh agent to continue release choreography without asking ZURIEL what to upload.
```

**אחרי:**

```text
86) RELEASE APPROVAL DOES NOT CANONICALIZE. There is no standing release authorization (v18). Approval of a release does not grant autonomous governed-truth publication, destructive irreversible changes, pricing/economics, or other explicitly Human-Gated product decisions. Those remain separately gated.
87) USER HOLD. Explicit ZURIEL “hold/wait/do not release” for a scope creates a release hold in coordination context until lifted.
88) AFTER MUST INCLUDE RELEASE ADVICE/RESULT. Every material AFTER includes: release_advice; dependency_state; exact branch/PR/head; merged/applied/deployed/live/verified booleans/states; blocker if any; next proposed action (a merge, deploy or DB action still awaits ZURIEL's explicit approval). Session end must leave enough information for a fresh agent to continue release choreography without asking ZURIEL what to upload; approval of the action itself is still required.
```

##### קטע 7 — שורות 139–139 (לפני) → 142–142 (אחרי) · replace

**לפני:**

```text
OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law + deploy_on_request v2. No new queue/release store/registry.
```

**אחרי:**

```text
OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law + deploy_on_request (active version). No new queue/release store/registry.
```

##### קטע 8 — שורות 142–142 (לפני) → 145–145 (אחרי) · replace

**לפני:**

```text
89) VISUAL DESIGN LANE. For 2029 surfaces CLAUDE is the primary writer of the visual layer: shared frame composition (rails, Raziel presence, Now), the shared component kit, per-surface composition/layout, and the final visual acceptance pass. Semantic authority stays with the existing owners: SOD1820_DESIGN_CONTRACT_V2.md + palette.js/designTokens.js (values), SystemFrame (frame contract), canonical_ui_components_law, experience_governance_foundation_v1_law v9. This assigns a writer lane only; it creates no design owner and changes none of those contracts. Token/contract/icon-family changes go through their owner with Human Gate.
```

**אחרי:**

```text
89) VISUAL DESIGN LANE. For 2029 surfaces CLAUDE is the primary writer of the visual layer: shared frame composition (rails, Raziel presence, Now), the shared component kit, per-surface composition/layout, and the final visual acceptance pass. Semantic authority stays with the existing owners: SOD1820_DESIGN_CONTRACT_V2.md + paletteTokens2029.js/designTokens.js (values; palette.js was removed on 5.11.2026), SystemFrame (frame contract), canonical_ui_components_law, experience_governance_foundation_v1_law v9. This assigns a writer lane only; it creates no design owner and changes none of those contracts. Token/contract/icon-family changes go through their owner with Human Gate.
```

**מטא־דאטה — מפתחות שהשתנו (3):**

* `v12_2029_temporary_legacy_boundary`
  * לפני: `{"current_production": "LEGACY_TRANSITIONAL_UNTIL_EXPLICIT_CUTOVER", "fresh_agent_must_distinguish_current_vs_target": true, "human_gate": "ZURIEL 2026-09-16", "legacy_is_current_production_runtime": true, "legacy_is_design_authority": false, "new_site_cutover_declared": false, "no_new_owner": true, "owner_check": "EXTEND_EXISTING", "target_architecture": "2029"}`
  * אחרי: `{"current_production": "LEGACY_TRANSITIONAL_UNTIL_EXPLICIT_CUTOVER", "fresh_agent_must_distinguish_current_vs_target": true, "human_gate": "ZURIEL 2026-09-16", "legacy_is_current_production_runtime": true, "legacy_is_design_authority": false, "new_site_cutover_declared": false, "no_new_owner": true, "owner_check": "EXTEND_EXISTING", "status": "HISTORICAL_PRE_CUTOVER", "superseded_by": "v18_2029_production_explicit_release", "target_architecture": "2029"}`

* `v13_auto_release`
  * לפני: `{"auto_canonicalization": false, "dependency_order_agent_owned": true, "human_gate": "ZURIEL 2026-09-17", "owner_check": "EXTEND_EXISTING", "release_advice_states": ["AUTO_RELEASE_NOW", "BUNDLE_WITH", "BLOCKED_BY", "SAFE_INDEPENDENT_WAITING_RUNTIME", "DO_NOT_RELEASE_SUPERSEDED/PARKED"], "release_recommendation_required": true, "separate_taale_required": false, "standing_auto_release": true, "user_hold_overrides": true}`
  * אחרי: `{"auto_canonicalization": false, "dependency_order_agent_owned": true, "human_gate": "ZURIEL 2026-09-17", "owner_check": "EXTEND_EXISTING", "release_advice_states": ["AUTO_RELEASE_NOW", "BUNDLE_WITH", "BLOCKED_BY", "SAFE_INDEPENDENT_WAITING_RUNTIME", "DO_NOT_RELEASE_SUPERSEDED/PARKED"], "release_recommendation_required": true, "separate_taale_required": false, "standing_auto_release": true, "status": "STANDING_AUTO_RELEASE_REVOKED_2026-11-10", "superseded_by": "v18_2029_production_explicit_release", "user_hold_overrides": true}`

* `v18_2029_production_explicit_release`
  * לפני: `"∅"`
  * אחרי: `{"current_production": "2029", "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.", "explicit_approval_per_merge_and_deploy": true, "human_gate": "ZURIEL 2026-11-10", "label_corrected": "label read 'v16' while rule_version was 17", "legacy_is_current_production_runtime": false, "legacy_retired": "2026-11-05", "no_new_system": true, "owner_check": "EXTEND_EXISTING", "production_since": "2026-11-04", "release_advice_state_aliases": {"AUTO_RELEASE_NOW": "READY_FOR_APPROVAL"}, "release_advice_states": ["READY_FOR_APPROVAL", "BUNDLE_WITH", "BLOCKED_BY", "SAFE_INDEPENDENT_WAITING_RUNTIME", "DO_NOT_RELEASE_SUPERSEDED/PARKED"], "standing_auto_release": false}`

#### foundation_closure_protocol_law — v7 → v8
* תווית: לפני — «Foundation Closure Protocol v7 — Bottom-Up Closure + Maintenance Acceptance» · אחרי — «Foundation Closure Protocol v8 — Bottom-Up Closure + Explicit Release Approval»
* md5 תיאור: `336934e50ca48dba8cb00cf64986b878` → `eb603a65f8a4a9a58e8d4548f0663e65` · אורך: 16,930 → 17,029 תווים
* `supersedes_version`: 7 · v7 נשאר שורה לא פעילה (היסטוריה)

**חלון רזיאל (600 התווים הראשונים) — לפני:**

```text
FOUNDATION CLOSURE PROTOCOL v4 — HUMAN-GATE ZURIEL · 11.9.2026

OWNER: foundation_closure_protocol_law. EXTEND_EXISTING. v3 supersedes v2 while preserving the Bedrock Ladder and all prior history. This is NOT a new roadmap, sequence, engine, store or governance system.

CORE RULE
Work moves Foundation → Projection → Experience. No higher-gate release/closure may proceed while a known lower-layer MUST FOUNDATION NOW remains unresolved. Safe evidence gathering/prototyping may continue branch-only; it never counts as closure.

ONE SEQUENCE, NOT THREE
The Master Roadmap W0–W9 remains the build/nav
```

**אחרי:**

```text
FOUNDATION CLOSURE PROTOCOL v4 — HUMAN-GATE ZURIEL · 11.9.2026

OWNER: foundation_closure_protocol_law. EXTEND_EXISTING. v3 supersedes v2 while preserving the Bedrock Ladder and all prior history. This is NOT a new roadmap, sequence, engine, store or governance system.

CORE RULE
Work moves Foundation → Projection → Experience. No higher-gate release/closure may proceed while a known lower-layer MUST FOUNDATION NOW remains unresolved. Safe evidence gathering/prototyping may continue branch-only; it never counts as closure.

ONE SEQUENCE, NOT THREE
The Master Roadmap W0–W9 remains the build/nav
```

##### קטע 1 — שורות 93–97 (לפני) → 93–97 (אחרי) · replace

**לפני:**

```text
[UPDATE v6 · Human-Gate ZURIEL · 17.9.2026 — STANDING AUTO-RELEASE BINDING · EXTEND_EXISTING]
AUTO-RELEASE BINDING. Once a bounded routine release scope has satisfied every applicable lower MUST, gate, dependency, current-main reconciliation, required specialist/security/privacy acceptance and release recovery condition, standing Human-Gate authorization under deploy_on_request v2 permits the Primary Owner to release without waiting for a separate “תעלה”. Gate-clean is the authorization condition.
NO-SKIP REMAINS ABSOLUTE. Standing authorization changes who triggers a clean release; it does not weaken any Foundation MUST or acceptance standard. קדימה/תעלה/auto-release never waive a blocker.
HUMAN-DECISION RESERVE. Explicit Human Gate remains for decisions that change canonical governed truth/publication where required, destructive irreversible state, paid product economics, major Legacy→2029 production cutover, material privacy/security weakening, permanent deletion/retirement of preserved history/capability, or another owner-specific Human decision.
RELEASE ADVICE. Gate closure/handoff must expose whether the scope is AUTO_RELEASE_NOW, BUNDLE_WITH, BLOCKED_BY, SAFE_INDEPENDENT_WAITING_RUNTIME, or DO_NOT_RELEASE_SUPERSEDED/PARKED, so ZURIEL is not required to infer dependencies.
```

**אחרי:**

```text
[UPDATE v6 · Human-Gate ZURIEL · 17.9.2026 — RELEASE BINDING · EXTEND_EXISTING · standing auto-release revoked by v8 (ZURIEL 10.11.2026)]
RELEASE BINDING (v8). Once a bounded release scope has satisfied every applicable lower MUST, gate, dependency, current-main reconciliation, required specialist/security/privacy acceptance and release recovery condition, it is READY_FOR_APPROVAL: the Primary Owner presents the exact commit/deployment to ZURIEL and releases only after his explicit approval of that specific action (deploy_on_request, active version). Gate-clean is a precondition, never an authorization; there is no standing release authorization.
NO-SKIP REMAINS ABSOLUTE. Explicit approval does not weaken any Foundation MUST or acceptance standard. קדימה/תעלה never waive a blocker.
HUMAN-DECISION RESERVE. Explicit Human Gate remains for decisions that change canonical governed truth/publication where required, destructive irreversible state, paid product economics, material privacy/security weakening, permanent deletion/retirement of preserved history/capability, or another owner-specific Human decision.
RELEASE ADVICE. Gate closure/handoff must expose whether the scope is READY_FOR_APPROVAL (formerly AUTO_RELEASE_NOW), BUNDLE_WITH, BLOCKED_BY, SAFE_INDEPENDENT_WAITING_RUNTIME, or DO_NOT_RELEASE_SUPERSEDED/PARKED, so ZURIEL is not required to infer dependencies.
```

##### קטע 2 — שורות 99–99 (לפני) → 99–99 (אחרי) · replace

**לפני:**

```text
OWNER CHECK: EXTEND_EXISTING foundation_closure_protocol_law + deploy_on_request v2. No new gate system.
```

**אחרי:**

```text
OWNER CHECK: EXTEND_EXISTING foundation_closure_protocol_law + deploy_on_request (active version). No new gate system.
```

**מטא־דאטה — מפתחות שהשתנו (3):**

* `command_semantics`
  * לפני: `{"kadima": "within_current_gate_only", "taale": "release_gate_clean_scope_only", "waiver": "explicit_replan_or_supersession_only"}`
  * אחרי: `{"kadima": "within_current_gate_only", "taale": "explicit_approval_for_exact_presented_scope", "waiver": "explicit_replan_or_supersession_only"}`

* `v6_auto_release_binding`
  * לפני: `{"human_decision_reserve": true, "human_gate": "ZURIEL 2026-09-17", "no_skip_unchanged": true, "owner_check": "EXTEND_EXISTING", "separate_taale_required": false, "standing_auto_release_for_gate_clean_routine_scope": true}`
  * אחרי: `{"human_decision_reserve": true, "human_gate": "ZURIEL 2026-09-17", "no_skip_unchanged": true, "owner_check": "EXTEND_EXISTING", "separate_taale_required": false, "standing_auto_release_for_gate_clean_routine_scope": true, "status": "STANDING_AUTO_RELEASE_REVOKED_2026-11-10", "superseded_by": "v8_explicit_release_approval_binding"}`

* `v8_explicit_release_approval_binding`
  * לפני: `"∅"`
  * אחרי: `{"explicit_approval_per_merge_and_deploy": true, "human_gate": "ZURIEL 2026-11-10", "no_new_system": true, "no_skip_unchanged": true, "owner_check": "EXTEND_EXISTING", "standing_auto_release": false}`

#### system_suggestions_law — v5 → v6
* תווית: לפני — «System Intelligence v5 — Resource-Aware Reliability + Incident Budget» · אחרי — «System Intelligence v6 — Resource-Aware Reliability + Explicit Release Approval»
* md5 תיאור: `9b5c19de501b1985da01ddfc9c646d3c` → `98d4d88e16d2ec5f70dac6e5a7f98ea5` · אורך: 17,732 → 17,885 תווים
* `supersedes_version`: 5 · v5 נשאר שורה לא פעילה (היסטוריה)

**חלון רזיאל (600 התווים הראשונים) — לפני:**

```text
החלטת צוריאל 12.7.2026 (הרחבת ai_style_learning_law לכל המערכת, לפי פרוטוקול שהציע וצוריאל אישר): «המערכת לעולם אינה משנה את עצמה. היא רק לומדת, מסבירה ומציעה.» חמישה שלבים: (1) Observe — כל רכיב רושם תצפיות (ai_analysis_log, relation_evidence, אירועים). (2) Detect — detect_suggestions() רץ מחזורית ומזהה דפוסים חוצי-סף (כרגע גלאי style_continue_rate: סגנון עם ≥40 ניתוחים ופער continue-rate ≥10 נק׳; ו-pending_ratings ≥20). (3) Suggest — יוצר שורה ב-system_suggestions (category ai/ux/research/performance/knowledge, title, dedupe_key אנטי-ספאם; לא מעלה שוב משהו שנדחה ב-30 יום). (4) Explain — כל ה
```

**אחרי:**

```text
החלטת צוריאל 12.7.2026 (הרחבת ai_style_learning_law לכל המערכת, לפי פרוטוקול שהציע וצוריאל אישר): «המערכת לעולם אינה משנה את עצמה. היא רק לומדת, מסבירה ומציעה.» חמישה שלבים: (1) Observe — כל רכיב רושם תצפיות (ai_analysis_log, relation_evidence, אירועים). (2) Detect — detect_suggestions() רץ מחזורית ומזהה דפוסים חוצי-סף (כרגע גלאי style_continue_rate: סגנון עם ≥40 ניתוחים ופער continue-rate ≥10 נק׳; ו-pending_ratings ≥20). (3) Suggest — יוצר שורה ב-system_suggestions (category ai/ux/research/performance/knowledge, title, dedupe_key אנטי-ספאם; לא מעלה שוב משהו שנדחה ב-30 יום). (4) Explain — כל ה
```

##### קטע 1 — שורות 1–1 (לפני) → 1–1 (אחרי) · replace

**לפני:**

```text
החלטת צוריאל 12.7.2026 (הרחבת ai_style_learning_law לכל המערכת, לפי פרוטוקול שהציע וצוריאל אישר): «המערכת לעולם אינה משנה את עצמה. היא רק לומדת, מסבירה ומציעה.» חמישה שלבים: (1) Observe — כל רכיב רושם תצפיות (ai_analysis_log, relation_evidence, אירועים). (2) Detect — detect_suggestions() רץ מחזורית ומזהה דפוסים חוצי-סף (כרגע גלאי style_continue_rate: סגנון עם ≥40 ניתוחים ופער continue-rate ≥10 נק׳; ו-pending_ratings ≥20). (3) Suggest — יוצר שורה ב-system_suggestions (category ai/ux/research/performance/knowledge, title, dedupe_key אנטי-ספאם; לא מעלה שוב משהו שנדחה ב-30 יום). (4) Explain — כל המלצה נושאת reason + observed(jsonb הנתונים) + confidence(0-100, היוריסטיקה מסומנת ככזו) + sample_size + estimated_impact. (5) Decide — רק צוריאל: admin_suggestion_decide → accepted/rejected/later/pending. UI: טאב אדמין «🧠 המלצות המערכת» (כרטיסי Confidence/Reason/Observed/Impact + קבל/דחה/המתן, טאבי-סטטוס). ⛔ אין ביצוע אוטומטי של המלצה — קבלה = החלטה אנושית, המימוש ידני. השומר (system-watchman): edge function + cron שבועי (jobid 19, ראשון 08:00) — מריץ גלאים, בונה site_pulse(7), ושולח דייג׳סט (אימייל Resend + וואטסאפ wa_send) רק כשיש משהו מעל-סף (worth); admin_notify (server-only) מחזיק יעדים; admin_fire_watchman = «שלח עכשיו». תלות-קונפיג של צוריאל: (א) וואטסאפ דורש chat_id פרטי (@c.us) שהוא מזין בפאנל — לא נשמר בקוד/אתר; (ב) אימייל דורש RESEND_API_KEY ב-Edge secrets (בבדיקה חזר no_resend_key). RPCs: suggest_add/detect_suggestions/site_pulse (service) · admin_suggestions_list/decide/notify_get/set/fire_watchman (rd_is_admin). רכיב: SystemSuggestionsTab.jsx. הרחבה עתידית: גלאי UX/Performance/Knowledge + A/B כשתצטבר תנועה.
```

**אחרי:**

```text
החלטת צוריאל 12.7.2026 (הרחבת ai_style_learning_law לכל המערכת, לפי פרוטוקול שהציע וצוריאל אישר): «המערכת לעולם אינה משנה את עצמה. היא רק לומדת, מסבירה ומציעה.» חמישה שלבים: (1) Observe — כל רכיב רושם תצפיות (ai_analysis_log, relation_evidence, אירועים). (2) Detect — detect_suggestions() רץ מחזורית ומזהה דפוסים חוצי-סף (כרגע גלאי style_continue_rate: סגנון עם ≥40 ניתוחים ופער continue-rate ≥10 נק׳; ו-pending_ratings ≥20). (3) Suggest — יוצר שורה ב-system_suggestions (category ai/ux/research/performance/knowledge, title, dedupe_key אנטי-ספאם; לא מעלה שוב משהו שנדחה ב-30 יום). (4) Explain — כל המלצה נושאת reason + observed(jsonb הנתונים) + confidence(0-100, היוריסטיקה מסומנת ככזו) + sample_size + estimated_impact. (5) Decide — רק צוריאל: admin_suggestion_decide → accepted/rejected/later/pending. UI: טאב אדמין «🧠 המלצות המערכת» (כרטיסי Confidence/Reason/Observed/Impact + קבל/דחה/המתן, טאבי-סטטוס). ⛔ אין ביצוע אוטומטי של המלצה — קבלה = החלטה אנושית, המימוש ידני. השומר (system-watchman): edge function + cron שבועי (jobid 19, ראשון 08:00) — מריץ גלאים, בונה site_pulse(7), ושולח דייג׳סט (אימייל Resend + וואטסאפ wa_send) רק כשיש משהו מעל-סף (worth); admin_notify (server-only) מחזיק יעדים; admin_fire_watchman = «שלח עכשיו». תלות-קונפיג של צוריאל: (א) וואטסאפ דורש chat_id פרטי (@c.us) שהוא מזין בפאנל — לא נשמר בקוד/אתר; (ב) אימייל דורש RESEND_API_KEY ב-Edge secrets (בבדיקה חזר no_resend_key). RPCs: suggest_add/detect_suggestions/site_pulse (service) · admin_suggestions_list/decide/notify_get/set/fire_watchman (rd_is_admin). רכיב: SystemSuggestionsTab.jsx (מסוף הניהול הישן; הוסר ב-5.11.2026, #1239). הרחבה עתידית: גלאי UX/Performance/Knowledge + A/B כשתצטבר תנועה.
```

##### קטע 2 — שורות 40–40 (לפני) → 40–40 (אחרי) · replace

**לפני:**

```text
19. RELEASE REUSES deploy_on_request. Patch/minor routine maintenance may be released only after current-main reconciliation, dependency closure, peer-resolution, CI/Golden/security checks and no writer overlap under deploy_on_request v2. Major runtime/framework upgrades remain Foundation changes: they may be prepared after Human acceptance but require Foundation redesign-risk challenge and any applicable Human Gate before release.
```

**אחרי:**

```text
19. RELEASE REUSES deploy_on_request. Patch/minor routine maintenance may be released only after current-main reconciliation, dependency closure, peer-resolution, CI/Golden/security checks and no writer overlap, and then only with ZURIEL's explicit approval of the exact merge/deploy (deploy_on_request, active version; no standing authorization). Major runtime/framework upgrades remain Foundation changes: they may be prepared after Human acceptance but require Foundation redesign-risk challenge and any applicable Human Gate before release.
```

**מטא־דאטה — מפתחות שהשתנו (1):**

* `human_gate_v6_release`
  * לפני: `"∅"`
  * אחרי: `{"changed": ["§19: release reuses deploy_on_request (active version) only with explicit approval", "SystemSuggestionsTab.jsx marked removed (5.11.2026, #1239)"], "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.", "human_gate": "ZURIEL 2026-11-10", "no_new_system": true, "owner_check": "EXTEND_EXISTING"}`

#### קודקס #4 `publishing_conventions`

* md5 גוף: `26b473b72d55c57153c6678543d25094` → `f39efab93a4d4bfa851586d4fc4259f5` · אורך: 72,651 → 72,978 · `updated_at=now()` · אין גרסאות בקודקס: ה־rollback מחזיר את הגוף המדויק

##### קטע 1 — שורות 413–413 → 413–413 · replace

**לפני:**

```text
- Same Post identity in legacy and 2029.
```

**אחרי:**

```text
- Same Post identity across historical (WordPress/Legacy-era) records and 2029.
```

##### קטע 2 — שורות 463–463 → 463–463 · replace

**לפני:**

```text
8. ONE SHARED IMPLEMENTATION: ההגדרה החזותית שייכת לחוזה Design V2 ולפלטה הקנונית; רכיב הפוסט המשותף צורך אותה. אין theme store נוסף, palette נפרדת לכל פוסט, CSS חדש במקור כדי לכפות צבעי 2029 או שינוי של תצוגת Legacy.
```

**אחרי:**

```text
8. ONE SHARED IMPLEMENTATION: ההגדרה החזותית שייכת לחוזה Design V2 ולפלטה הקנונית; רכיב הפוסט המשותף צורך אותה. אין theme store נוסף, palette נפרדת לכל פוסט, CSS חדש במקור כדי לכפות צבעי 2029. (תצוגת Legacy אינה קיימת עוד מאז 5.11.2026.)
```

##### קטע 3 — שורות 472–472 → 472–472 · replace

**לפני:**

```text
1. טריגר וסמכות: הוראה מפורשת לפרסם/להעלות לאתר מתירה לבצע את שלבי פרסום המדיה הנדרשים ללא שאלות חוזרות על העברת הקובץ ותמונת שער. שיתוף קישור/קובץ ללא הוראת פרסום אינו מתיר פרסום אוטומטי. מכבדים את היעד שנקבע (Legacy, 2029, או אחר); הוראת פרסום אינה אישור לשינוי קוד/ענפי Preview, מיזוג, פריסה או העלאה כפולה לשתי המערכות.
```

**אחרי:**

```text
1. טריגר וסמכות: הוראה מפורשת לפרסם/להעלות לאתר מתירה לבצע את שלבי פרסום המדיה הנדרשים ללא שאלות חוזרות על העברת הקובץ ותמונת שער. שיתוף קישור/קובץ ללא הוראת פרסום אינו מתיר פרסום אוטומטי. היעד הוא 2029 — המוצר הפעיל היחיד (Legacy פרש ב-5.11.2026 ואינו יעד פרסום); הוראת פרסום אינה אישור לשינוי קוד/ענפי Preview, מיזוג או פריסה.
```

##### קטע 4 — שורות 476–476 → 476–476 · replace

**לפני:**

```text
5. אימות וסיום: בצע קריאת-חזרה לחשבונית אחסון, בדיקת קיום קובץ מקור ונגזרות, בדיקת שדות והפניות הפוסט; בדוק תצוגה בפועל במובייל/דפדפן וביעד שנתבקש, לרבות Legacy אם הוזכר. DB INSERT/UPDATE לבדו אינו הוכחת פרסום חי או נראות. דווח באופן מפורד מה בוצע, מה אומת ומה עדיין חסום, עם קישור לצפייה רק אם אומת. אל תכפה שינוי ב-Production או בפריוויו כדי לעקוף חסימה.
```

**אחרי:**

```text
5. אימות וסיום: בצע קריאת-חזרה לחשבונית אחסון, בדיקת קיום קובץ מקור ונגזרות, בדיקת שדות והפניות הפוסט; בדוק תצוגה בפועל במובייל/דפדפן ב-2029. DB INSERT/UPDATE לבדו אינו הוכחת פרסום חי או נראות. דווח באופן מפורד מה בוצע, מה אומת ומה עדיין חסום, עם קישור לצפייה רק אם אומת. אל תכפה שינוי ב-Production או בפריוויו כדי לעקוף חסימה.
```

##### קטע 5 — שורות 481–482 → 481–482 · replace

**לפני:**

```text
—— LEGACY MODIFIED DATE REQUIRED · 27.10.2026 · publishing_conventions operational correction ——
כש-ChatGPT מפרסם פוסט חדש ב-public.posts לצפייה ב-Legacy או כפרסום משותף, חובה להגדיר posts.modified לתאריך הפרסום (לרוב זהה ל-posts.date; בעריכה בפועל לפי updated time) כבר ב-INSERT. אין להסתפק ב-date/created_at בלבד: ה-Legacy Home fetchHomePosts בגרסה הפעילה ממיין לפי modified DESC NULLS LAST, והיעדר modified עלול להוריד פוסט חדש לתחתית ולהעלימו מ״עדכונים אחרונים״ למרות home_hidden=false. לאחר כתיבה לוודא שהפוסט נכנס ל-32 התוצאות הראשונות, אינו טיוטה/פורום/לא-בבית, ונראה בפיד; לא לשנות קוד, פריסה, Preview או שדות לא קשורים לשם עקיפת התקלה. בדיקת DB/מיון אינה תחליף לבדיקת תצוגה בדפדפן. כיול: posts.id=5126 (27.10.2026), תוקן modified=NULL ל-date, עלה ממקום 1295 למקום 1 במיון הרשימה. 
```

**אחרי:**

```text
—— POST MODIFIED DATE REQUIRED · 27.10.2026 · re-scoped to 2029 on 10.11.2026 · publishing_conventions operational correction ——
כש-ChatGPT או כל סוכן אחר מפרסם פוסט חדש ב-public.posts, חובה להגדיר posts.modified לתאריך הפרסום (לרוב זהה ל-posts.date; בעריכה בפועל לפי updated time) כבר ב-INSERT. אין להסתפק ב-date/created_at בלבד: קוראי 2029 ממיינים לפי modified DESC NULLS LAST (getLatestPostCards ב-src/lib/supabase.js; fetchPostsCatalog2029 ו-fetchPostSearchSuggestions2029 ב-src/lib/research/postsCatalog2029Projection.js), והיעדר modified עלול להוריד פוסט חדש לתחתית הרשימות. (ב-27.10 נכתב הכלל עבור דף הבית של Legacy, fetchHomePosts, שהוסר ב-5.11.2026; הדרישה נשארת בתוקף ב-2029.) modified קובע סדר בלבד ואינו אות ל״עדכון חדש״ (SOD1820_DESIGN_CONTRACT_V2.md §8.1). לאחר כתיבה לוודא שהפוסט מופיע בראש רשימות הפוסטים של 2029, אינו טיוטה/פורום/מוסתר מהבית, ונראה בפועל; לא לשנות קוד, פריסה, Preview או שדות לא קשורים לשם עקיפת התקלה. בדיקת DB/מיון אינה תחליף לבדיקת תצוגה בדפדפן. כיול: posts.id=5126 (27.10.2026), תוקן modified=NULL ל-date, עלה ממקום 1295 למקום 1 במיון הרשימה. 
```

#### קודקס #9 `branches_deploy`

* md5 גוף: `6cee6559506bba1be4f1e71a86693285` → `8d87b8459f2fec3c25f9bf7cea443d3b` · אורך: 2,780 → 3,079 · `updated_at=now()` · אין גרסאות בקודקס: ה־rollback מחזיר את הגוף המדויק

##### קטע 1 — שורות 2–2 → 2–2 · replace

**לפני:**

```text
# Branches & Deploy — Live 2026-09-23
```

**אחרי:**

```text
# Branches & Deploy — vercel.json re-read at main 932aba4bd (11.11.2026); release policy per ZURIEL 10.11.2026
```

##### קטע 2 — שורות 4–4 → 4–4 · replace

**לפני:**

```text
Canonical owner: `deploy_on_request v2`.
```

**אחרי:**

```text
Canonical owner: `deploy_on_request` (active version).
```

##### קטע 3 — שורות 8–9 → 8–10 · replace

**לפני:**

```text
- `main` = production.
- Merge/push to `main` may create a production Vercel deployment and must follow the release owner/gates.
```

**אחרי:**

```text
- 2029 is the only active product: Production since 2026-11-04. Legacy was retired on 2026-11-05 and is not a deployment, Preview or rollback target.
- `main` is the release source, not an automatic deployment. A merge or push to `main` does not create a Production deployment: `git.deploymentEnabled=false` in both `vercel.json` roots (repository root and `public-reading-deploy`), and per CLAUDE.md the project's Ignored Build Step skips `main` builds.
- A Production deployment is a separate, manual action for an exact `main` SHA (Vercel MCP, per CLAUDE.md «נוהל פריסה ל-Production מסשן ענן»). Every merge to `main` and every Production deployment, alias change or rollback requires ZURIEL's explicit approval for that specific action. There is no standing authorization.
```

##### קטע 4 — שורות 13–16 → 14–14 · replace

**לפני:**

```text
Live `vercel.json` currently uses `git.deploymentEnabled`:
- `gpt/g3-topic-golden-slug-rank-foundation-v1` → true (historical explicit exception)
- `gpt/*` → false
- `claude/*` → false
```

**אחרי:**

```text
Current `vercel.json` (both roots) sets `git.deploymentEnabled: false` globally. By Vercel's semantics no branch — `main`, `gpt/*`, `claude/*`, `preview/*` or any other — creates a deployment merely by being pushed. (Live Vercel project settings were not re-read in this pass.)
```

##### קטע 5 — שורות 18–18 → 16–16 · replace

**לפני:**

```text
Therefore normal GPT/CLAUDE development branches intentionally do **not** create Vercel Preview deployments and do not consume deployment quota.
```

**אחרי:**

```text
Superseded, kept as history (2026-09-23): the per-branch map (`gpt/g3-topic-golden-slug-rank-foundation-v1` → true; `gpt/*` → false; `claude/*` → false) and the earlier `ignoreCommand` note no longer describe the configuration.
```

##### קטע 6 — שורות 20–20 → 18–19 · replace

**לפני:**

```text
This supersedes the old operational note that `ignoreCommand` is the live non-main mechanism. Live verification on 2026-09-23 found no such active `ignoreCommand`; branch filtering is currently implemented by `git.deploymentEnabled`.
```

**אחרי:**

```text
#### Preview
A Preview deployment is created only as an explicitly approved, bounded action (CLAUDE.md rule 7: a protected Preview requires ZURIEL's explicit approval), from an exact approved artifact head, never as production (`target=null`). Verify before sharing: source artifact known; Preview target; `READY`; requested route returns HTTP 200. Generate/share a protected Preview URL when Deployment Protection is enabled. Never merge or promote a preview carrier branch.
```

##### קטע 7 — שורות 22–23 → 21–21 · replace

**לפני:**

```text
#### Authorized Preview lane
Reserved branch namespace: `preview/*`.
```

**אחרי:**

```text
Historical mechanism (2026-09-23): a `preview/*` carrier branch with an inert marker commit triggered Vercel Git Integration because `preview/*` was outside the blocked namespaces. With the global `deploymentEnabled: false` a push to `preview/*` no longer deploys by itself; the record below is provenance only.
```

##### קטע 8 — שורות 25–44 → 23–23 · replace

**לפני:**

```text
Purpose:
- Human Visual Gate / temporary branch preview only.
- Created only when preview/release is authorized by ZURIEL or the active release owner permits it.
- Source must be an exact approved artifact head.
- If branch creation alone does not fire Vercel Git Integration, create one inert carrier/marker commit on the `preview/*` branch to produce a real push event.
- Marker must not modify application behavior.
- Verify Vercel deployment metadata before sharing:
  - Git ref starts with `preview/`;
  - source artifact is known;
  - `target=null` / Preview, never production;
  - deployment reaches `READY`;
  - requested preview route returns HTTP 200.
- Generate/share a protected Preview URL when Deployment Protection is enabled.
- Never merge/promote a preview carrier branch.
- Close/delete preview carrier after Human Visual review when no longer needed.

Why this works:
Vercel `deploymentEnabled` uses minimatch; unspecified branches default to deployment enabled. The current `gpt/*` and `claude/*` rules remain false, while `preview/*` is outside those blocked namespaces.

#### F11 proof
```

**אחרי:**

```text
#### F11 proof (historical, 2026-09-23)
```

##### קטע 9 — שורות 56–58 → 35–35 · replace

**לפני:**

```text
Do not broaden `gpt/*` or `claude/*` to true merely to get a Preview.
Use `preview/*` so development remains quota-protected and Preview creation remains an explicit, bounded action.

```

**אחרי:**

```text
Do not enable Git deployments (globally or per branch) merely to get a Preview. Preview and Production creation remain explicit, bounded, approved actions.
```

---

## 14. החלטה 1 (סדרות) ושער ההרצה של SQL 10 (11.11.2026 · הכנות ובדיקות בלבד)

**מה ביקש צוריאל:** (1) לאשר את `6ab74289f` כנשא הקנוני היחיד של החלטות 6–7. ‏#1296 לא ימוזג במצבו הנוכחי, עבודת הפוטר והממצאים שלו נשמרים בנפרד, וה־PR לא נסגר ולא נמחק. (2) להתקדם לשער ההרצה של `10_p0_release_policy.sql`. לפני הרצה יש להציג: אימות SHA-256 אחרון, שש שורות היעד, תנאי העצירה, ה־rollback והנוסח המלא של ההרשאות אחרי השינוי. אחר כך צוריאל יחליט על אישור להרצה אחת. SQL 11 נשאר לאישור נפרד. **אין אישור לכתיבת DB, לדחיפה, לפתיחת PR, למיזוג או לפריסה.**

**מה בוצע:** קריאות בלבד מהמסד, מ־GitHub ומ־git, וקבצים בתיקיית הסשן. לא נכתב דבר למסד ולא נרשם דבר ביומן. לא נוצר קומיט, לא בוצעה דחיפה, ו־#1296 לא שונה.

### 14.0 תמצית
1. **החלטה 1 נרשמה.** עבודת הפוטר של #1296 נשמרה בתיקייה נפרדת (`pr1296-preserved/`): עותק מדויק של מסמך הפוטר (blob ‏`16b4c3aa…`), patch של המסמך בלבד שחל נקי על `main` ‏`f250da9f7`, שלושת הקומיטים, וקובץ ממצאים F1–F8. ה־PR לא שונה.
2. **אימות אחרון של SQL 10 עבר:** ה־SHA-256 של `10_` ושל `19_` תואם. שש שורות היעד זהות לבסיס, במספר הגרסה, ב־md5 של התיאור ושל המטא־דאטה, בתווית ובזמן. הטריגר והאינדקסים זהים לסימולציה. טביעות האצבע של כל המסד לא השתנו, ואין כותב חופף.
3. **ממצא שער מהותי: ערוץ ההרצה.** הערוץ היחיד להרצה בסשן הזה הוא `execute_sql`, ושם כל הטקסט עובר כפרמטר אחד. ‏`10_` הוא 186,847 תווים, כ־57 אלף טוקנים, ובנוי משמונה פקודות (`begin;`, שישה בלוקים, `commit;`). העברה כזו אינה אמינה. בנוסף, כשל באמצע עלול להשאיר דרך ה־API טרנזקציה פתוחה עם נעילות. **לכן הוכנה גרסת הרצה שקולה, `10e_`:** פקודה אחת (בלוק `DO` יחיד, 50,049 תווים, כ־14 אלף טוקנים). היא בונה מחדש בדיוק את אותם טקסטים מתוך הבסיס החי המוגן ב־md5, ומסרבת אם התוצאה שונה מ־`10_` ב־md5, ב־SHA-256 או באורך. השקילות הוכחה בסימולציה: 70/70, ורצף מלא 60/60. כך גם ל־rollback ‏(`19e_`).
4. **ההמלצה לאישור:** הרצה אחת של `10e_p0_release_policy_EXEC.sql`, לפי SHA-256 (סעיף 14.9). ‏`10_` נשאר מסמך התוכן המאושר.

### 14.1 החלטה 1 — רישום ושמירה בנפרד
| שאלה | תשובה |
|---|---|
| הנשא הקנוני של החלטות 6–7 | הענף `ccr-b2565041-d94syf`, קומיט `6ab74289f8dd14fdb584bed038ff5919ec02c834` (על `921a3c150`, בסיס `01d96b627`). לא נדחף. מול `main` ‏`f250da9f7`: שני קומיטים קדימה ושלושה אחורה, ו־`merge-tree` נקי. #1304 לא נוגע באף אחד מקבצי הענף |
| #1296 | פתוח, טיוטה, הראש `a377d0237` ללא שינוי (עודכן לאחרונה 10.11 16:34 UTC). **לא שונה, לא נסגר ולא נמחק. לא נכתבה בו הערה.** לא ימוזג במצבו הנוכחי |
| מה נשמר בנפרד | `exec/pr1296-preserved/`: ‏`docs/2029-post-connections-contract-20261110.md` (מדויק), `footer-contract-docs-only.patch` (חל נקי על `f250da9f7`), `patches/0001–0003`, `provenance/` (קובץ הזהות בראש ה־PR והדיף המלא), `README.md`, `FINDINGS.md`, `MANIFEST.sha256` |
| הייחודי ל־#1296 | F1 מבנה הפוטר (״החיבורים בעץ״ עד 6 · ״המשך המסע״ עד 2 · ״תגיות וסיווגים״ מקופל בכל הפוסטים); F2 מדיניות התגיות (תגית ≠ קשת ≠ סדרה; אין דפי תגית דלים; שומרים URLs ו־SEO); F3 ניתוב בעלים; F4 שישה שערי קבלה, מהם (א) ו־(ב) כבר מומשו ב־`6ab74289f` ו־(ד), הפוטר עצמו, לא התחיל |
| מה סותר | F5: הטיוטה נקטה שם אחר לאוסף, אבל הקטגוריה החיה של 5003/5004 היא **״הצופן בסרטים״** (2 פוסטים, `author` = NULL). **הוכרע 11.11.2026: ״הצופן בסרטים״, והמסמך השמור עודכן (§15.5).** תווית ב־`LetterAnatomyGolden2029.jsx` עדיין משתמשת בשם הלא מאושר, וזה פתוח (§15.7). F6: שינוי הזהות ב־#1296 קובע מקרים קשיחים בפונקציה אחת, בלי לעדכן שאילתה והקרנה (13/8, 37/35). הענף מחליף אותו, ואין לשלב אותו |
| אומת חי עכשיו | `reality_graph_law` v8, `graph_privacy_foundation_law` v1, `unified_tags_law` v1 ו־`truth_axes_foundation_law` v3 פעילים. הטבלה `tags` קיימת ו־`post_tags` לא קיימת |
| תיאום חדש ביומן (מידע, לא הפעלה) | **GPT, 11.11 03:27**, ‏`CATEGORY_SERIES_MEDIA_SEPARATION_20261111`: מסירת ניווט ״לסשן הקטגוריות והסדרות״. היא קובעת ארבעה צירים נפרדים: סדרה ≠ קטגוריה ≠ מדיום ≠ ייצוג. היא מציעה משימה רחבה של ניקוי קטגוריית ״וידאו״ (241 פוסטים) ו־fallback ב־`nowPublications2029.js`. **לא נלקחה**, כי אין לכך הוראה של צוריאל בסשן. אם צוריאל יפעיל אותה, היא תחפוף לענף ב־`postsCatalog2029Projection.js` (כותב אחד לתחום) |
| פוסט חדש של סשן מקביל | ״מה קורה הבורא״ PKqKLjO_0nc (ענף `claude/mah-kore-bore-completion-4oobnl`, טיוטה): ‏author = ״אלון לוי״, התגית קיימת, ו־categories = [״תיעוד אירועים״]. **הוא נכלל בסדרה גם לפי הענף, גם לפי `main` וגם לפי רשומת GPT, ולכן אין התנגשות** |
| PRs פתוחים בתחום | בקבצי הסדרות רק #1296 כותב. #1303 נוגע ב־`nowPublications2029.js`, שאינו בענף. #1204 הוא פוטר אתר בסוף העמוד, משטח אחר מהפוטר של הפוסט, וצריך לתאם איתו כשהפוטר ימומש. ענפים ישנים נראו כחופפים רק בגלל בסיס מיזוג ישן, ורשימת הקבצים של ה־PR עצמו הפריכה זאת (נבדק ב־#1204) |

**לא בוצע:** רישום ההחלטה ביומן או ב־PLAN37, כי זו כתיבת DB. ‏SQL ‏`50_` של PLAN37 ממתין לאישור נפרד.

### 14.2 אימות SHA-256 אחרון
| קובץ | SHA-256 | md5 | גודל | פקודות | מצב |
|---|---|---|---|---|---|
| `10_p0_release_policy.sql` (תוכן מאושר) | `d1ac658b6e2ace922ac5d32a3021f6ef8aa88dc06390b05aca095da0d48963fb` | `68839a702fda4812b140de4555163d27` | 208,343 בייט · 186,847 תווים · כ־57 אלף טוקנים | 8 | זהה ב־exec, בחבילה v1 ובחבילה v2, ותואם ל־MANIFEST של v2 |
| `19_p0_release_policy_ROLLBACK.sql` | `cbe420f72e2ad43bcf244aee1e49dd363ead9f4d1b499000c2ebc3adc0b0d9c4` | `00a066c9e3288e06439882409837aec3` | 93,659 בייט · 79,413 תווים · כ־26 אלף טוקנים | 8 | תואם ל־MANIFEST של v2 |
| **`10e_p0_release_policy_EXEC.sql`** (להרצה) | **`f2775634ab6f2b54142ed68d1702fe56cd8a09c2edf288ef11dac5c5d648cb85`** | `dd663547373bd23a1589e3bb053a3bac` | 53,044 בייט · 50,049 תווים · כ־14 אלף טוקנים | **1** | חדש. נבנה מ־`10_`, שקילות הוכחה (14.4) |
| **`19e_p0_release_policy_ROLLBACK_EXEC.sql`** | **`a1bbb3c2c73c0b5c3c5b31affecb4baa3461885734dbd810d3d3a52ed7526861`** | `d10f63f542d534af92d8ae52bff15a56` | 17,875 בייט · כ־4.8 אלף טוקנים | **1** | חדש. נבנה מ־`19_` |

### 14.3 שש שורות היעד — קריאה חיה אחרונה (11.11.2026, כ־04:00 UTC)
| יעד | שורה | היום (חי, זהה לבסיס) | אחרי ההרצה |
|---|---|---|---|
| `deploy_on_request` | `70f1ddf6-98fa-478c-90b8-ac6ff5dab310` | v3 פעילה (גרסאות 1, 2, 3\*) · תיאור `f93e73ce…` · מטא `8a4b80b7…` · 5,820 תווים · «🚀 Auto Release v2 — Gate-Clean Standing Authorization» · 29.9 18:42 | **v4** · `78d80d22…` (SHA-256 `9e0aac28…`) · מטא `4620b9f9…` · 6,532 · «⛔ Release v4 — Explicit Approval per Merge & Deployment · No Standing Authorization»; v3 נשארת לא פעילה |
| `inter_agent_coordination_law` | `0ad5ae0d-ca7a-49a7-b7c2-130530f51e2f` | v17 פעילה (1–17\*) · `02d188d1…` · מטא `982e7976…` · 40,807 · «…v16 — Mandatory Claude Visual Lane» · 14.10 03:18 | **v18** · `0ce1688c…` (`09a21eab…`) · מטא `e69f38e5…` · 42,309 · «Inter-Agent Coordination v18 — 2029 Production · Explicit Release Approval» |
| `foundation_closure_protocol_law` | `986849b7-3d48-43b5-9a9d-067ed4aab394` | v7 פעילה (1–7\*) · `336934e5…` · מטא `b26961fa…` · 16,930 · «…v7 — Bottom-Up Closure + Maintenance Acceptance» · 29.9 16:13 | **v8** · `eb603a65…` (`03bd388c…`) · מטא `6b786f67…` · 17,029 · «Foundation Closure Protocol v8 — Bottom-Up Closure + Explicit Release Approval» |
| `system_suggestions_law` | `d42d4fa7-f7c6-42ac-989e-3831dab6912e` | v5 פעילה (1–5\*) · `9b5c19de…` · מטא `aa247fb2…` · 17,732 · «System Intelligence v5 — Resource-Aware Reliability + Incident Budget» · 27.9 00:17 | **v6** · `98d4d88e…` (`b29d2c5f…`) · מטא `f4e5216a…` · 17,885 · «System Intelligence v6 — Resource-Aware Reliability + Explicit Release Approval» |
| קודקס #4 `publishing_conventions` | id 4 | גוף `26b473b7…` · 72,651 · `updated_at` 10.11 11:45:14 | `f39efab9…` (`d98c9a71…`) · 72,978 · `updated_at` = זמן ההרצה |
| קודקס #9 `branches_deploy` | id 9 | `6cee6559…` · 2,780 · 23.9 19:36:29 | `8d87b845…` (`e2e955af…`) · 3,079 · `updated_at` = זמן ההרצה |

**המנגנונים (חי):** הטריגר `trg_rule_compaction_integrity_guard_v1` (BEFORE INSERT OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version) קיים, וה־md5 של פונקציית הטריגר `56b90b0a…` זהה לזה שבסימולציה. האינדקסים הייחודיים `nodes_one_active_rule_per_id_uidx`, `nodes_identity_rule_uidx` ו־`nodes_identity_canonical_uidx` קיימים. ב־`nodes` רק `type` ו־`label` הם NOT NULL בלי ברירת מחדל, ושניהם ניתנים בהרצה. יש FK ל־`gallery_id` ובדיקת `weight` 1–5, והערכים מועתקים מהשורה הקודמת. RLS פעיל, אבל הערוץ רץ כ־`postgres`. ‏`default_transaction_read_only=off`. השרת הוא Postgres 17.6, והסימולציה PGlite 16. ‏`fn_raziel_relevant_rules` ללא שינוי (`3caa2132…`).

**כל המסד (לא השתנה מאז הבדיקה הקודמת):** `rules87` ‏`fae24986…` · `codex_all` ‏`efdb5db7…` (35) · `specs` ‏`ee0bbd8e…` · PLAN37 ‏`c06a461d…` (618,963) · 2,894 מילים `09b4e65a…` · `admin_suggestion_decide` ‏`12961a8c…` · 0 רשומות יומן שלי. **הצפוי אחרי ההרצה** (חושב במסד עצמו, לפי ה־collation שלו): `rules87` ‏`44fc87f0d88b00ddb2aaa880d287b615`, ‏`codex_all` ‏`8fb398dfe9c1260396433f5c56318a75`, ושורות החוקים 468 → 472.

**עובדות המאגר שהנוסחים החדשים טוענים, נבדקו מחדש ב־`main` ‏`f250da9f7`:** ‏`git.deploymentEnabled=false` בשני קובצי `vercel.json`; הסעיף «נוהל פריסה ל־Production מסשן ענן» קיים ב־`CLAUDE.md`; ‏Ignored Build Step מתואר שם.

**כותבים חופפים:** ביומן נוספו מאז 10.11 ‏47 רשומות, ואף אחת לא נוגעת בשש השורות או במדיניות השחרור. השינוי היחיד בתחום הסדרות הוא רשומת GPT הפסיבית (14.1). **קריאה סופית, כ־04:15 UTC:** שש השורות, הגרסה המקסימלית של כל חוק, `rules87` ו־`codex_all` לא השתנו. מאז הסריקה נוספו שלוש רשומות: שתיים של GPT על תרגום בפוסט ״מה קורה הבורא״, וניטור קיבולת אוטומטי (המסד 2,114MB, מעל סף של 1,400MiB). אף אחת מהן לא כותבת ליעדים. ‏SQL 10 מוסיף ארבע שורות טקסט, וזה זניח לקיבולת.

### 14.4 ממצא שער: ערוץ ההרצה, וגרסת ההרצה `10e_`
**הבעיה.** בסשן הזה אין ערוץ שמריץ קובץ מהדיסק: אין psql עם סיסמה ואין CLI עם טוקן. ‏`execute_sql` מקבל את הטקסט כפרמטר, ולכן אצטרך לכתוב את כל `10_` בתוך קריאה אחת. בגודל של כ־57 אלף טוקנים זה לא אמין, וקריאה שנקטעת או שגיאת העתקה מבזבזות את האישור של ההרצה האחת. בנוסף, `10_` הוא `begin;` ואחריו שישה בלוקים ו־`commit;`. ב־psql עם ON_ERROR_STOP זה בטוח. דרך API של HTTP, כשל באמצע עלול להשאיר את החיבור במצב ״טרנזקציה שבוטלה״ שמחזיק נעילות `for update` על שורות החוקים, עד שה־pool ינקה אותו. התנהגות ה־API במקרה כזה לא ידועה לי, ואי אפשר לבדוק אותה בלי כתיבה.

**הפתרון: `10e_`.** זו פקודה אחת, ולכן היא אטומית בפני עצמה. אם יש שגיאה בכל שלב, או שהטקסט נקטע, לא נכתב דבר ואין טרנזקציה פתוחה. מבנה הפקודה:
* **A.** נעילה ובדיקה של כל שש השורות **לפני כל כתיבה**, עם אותם תנאים ואותן הודעות כמו ב־`10_`: גרסה, md5 של התיאור ושל המטא־דאטה, ״אין גרסה מעל הבסיס״, md5 של הקודקס.
* **B–G.** כל טקסט חדש נבנה מהבסיס החי ב־**22 החלפות קטעים** (2 + 7 + 2 + 2 + 5 + 4). כל קטע ישן חייב להופיע בדיוק פעם אחת, אחרת יש סירוב. אחר כך נבדקים md5, SHA-256 ואורך מול הליטרל של `10_`. המטא־דאטה נבנית כ־`(בסיס − מפתחות שהוסרו) || דלתה`, כשהדלתה חושבה בתוך Postgres, ונבדקת מול ה־md5 של הליטרל ב־`10_`. ה־insert וה־update זהים לאלה של `10_`: אותן עמודות, אותם ערכים מועתקים, ו־`updated_at=now()`.
* **H.** בדיקה צולבת של כל המצב הסופי.
* אין תווים בלתי נראים או תווי בקרה בקטעים (נבדק), ולכן אין סכנה שתו ייעלם בהעתקה.

**הוכחת השקילות** (PGlite, ‏Node 24.21.0; `sim/run_exec_form_sim.mjs` — **70/70**):
| בדיקה | תוצאה |
|---|---|
| ‏`10_` ו־`10e_` על בסיסים זהים | **תוכן סופי זהה**: תוויות, טקסטים, מטא־דאטה, גרסאות, דגלים וגופי קודקס |
| md5 של כל תיאור ומטא־דאטה חדשים | זהים לליטרלים של `10_` |
| סריקת הקבלה (אין הרשאה עומדת, חלון Raziel, שער הקנרית) | עבר |
| הרצה שנייה | סירוב (״active version is v4 (expected v3)״), לא נכתב דבר |
| שש סטיות (תיאור × 2, מטא־דאטה, גרסה חדשה יותר, קודקס #4, קודקס #9) | סירוב בכל אחת, לא נכתב דבר (נבדק בהשוואת snapshot מלא) |
| קיטוע הקובץ ב־11 נקודות | כל ניסיון נכשל ולא נכתב דבר. בלי ה־`;` האחרון הפקודה עדיין שלמה ומוחלת במלואה, לא חלקית |
| שגיאת תו אחד: בטקסט החלופי, בעוגן, בדלתת המטא־דאטה וב־`19e_` | סירוב בכל אחת, לא נכתב דבר |
| ‏`19e_` אחרי `10e_` | מחזיר את הבסיס המדויק; השורות החדשות נשארות לא פעילות; אין מחיקה |
| ‏`10e_`+`19e_` מול `10_`+`19_` | תוכן זהה. גם ההצלבות עובדות: `19_` מחזיר את `10e_`, ו־`19e_` מחזיר את `10_` |
| החלה מחדש אחרי rollback | ‏`10e_` ו־`10_` מסרבים (״a version above v3 already exists״) |
| rollback על בסיס שלא הוחל, או אחרי עריכה של קודקס #4 | ‏`19e_` ו־`19_` מסרבים, לא נכתב דבר |

**הרצף המלא** (10 → 11 → 20 → 23 → 24 → 21 → 22 → 30 · 40 · 50, ו־rollback מלא), כש־`10e_` ו־`19e_` מחליפים את `10_` ו־`19_`: **60/60** (`sim/run_all_sim_v2_exec.mjs`). שלוש בדיקות התחום בקובץ עודכנו כך שיסננו גם ליטרלים מסוג `$sod_frag$`, אחרת הן ״ראו״ את המילה `public.posts` בתוך טקסט הקודקס. הסימולציות המקוריות עדיין 65/65 ו־60/60.

**ההבדלים בין `19e_` ל־`19_`:** `19e_` מחמיר יותר. בנוסף לבדיקות של `19_`, הוא מסרב אם שורת הבסיס חסרה או שונתה, ומוודא בסוף שיש גרסה פעילה אחת, הבסיסית. במצב תקין התוצאה זהה.

**מה לא הוכח:** (1) PGlite הוא Postgres 16, והשרת 17.6. בהרצה משתמשים רק ב־md5, sha256, convert_to, encode, strpos, substr, overlay, char_length ופעולות jsonb, וכולן קיימות מגרסה 11. (2) התנהגות ה־API של Supabase עצמו לא נבדקה, כי אי אפשר בלי כתיבה. (3) ההעתקה בזמן ההרצה תלויה בי. הבדיקות שבתוך הפקודה מבטיחות שכל טעות תגרום לסירוב בלי כתיבה, ושמצב סופי שונה מהמאושר אינו אפשרי.

### 14.5 תנאי עצירה
**לפני ההרצה** (בדיקות קריאה בלבד, ברגע ההרצה עצמו):
| # | תנאי | אם לא מתקיים |
|---|---|---|
| S1 | יש אישור מפורש של צוריאל בסשן, שמציין את `10e_` ואת ה־SHA-256 שלו, להרצה אחת | לא מריצים |
| S2 | ה־SHA-256 של הקובץ, מחושב מחדש, הוא `f2775634…` | עוצרים ומדווחים |
| S3 | קריאה חיה של שש השורות, באותה שאילתה, נותנת את ערכי 14.3 (גרסאות 3/17/7/5 פעילות, כל ה־md5, אין גרסה חדשה יותר) | עוצרים בלי להריץ ומדווחים על סטייה. ‏`10e_` היה מסרב בכל מקרה, אבל לא מבזבזים את האישור |
| S4 | ביומן אין רשומה חדשה שנוגעת בשש השורות או בשחרור, ואין כותב פעיל אחר | עוצרים ומדווחים |
| S5 | הטריגר (`56b90b0a…`) והאינדקסים קיימים, ו־`default_transaction_read_only=off` | עוצרים ומדווחים |
| S6 | ההרצה היא קריאה אחת ל־`execute_sql`, על `linswmnnkjxvweumprav` | — |

**בזמן ההרצה** (בתוך הפקודה, אוטומטי; בכל מקרה כזה לא נכתב דבר):
| # | תנאי | התוצאה |
|---|---|---|
| G1 | סטייה באחד מתנאי הבסיס (גרסה, md5, גרסה חדשה יותר, שורה חסרה) | חריגה, ושום דבר לא משתנה |
| G2 | קטע שלא נמצא, או שמופיע יותר מפעם אחת | חריגה, ושום דבר לא משתנה |
| G3 | טקסט שנבנה מחדש שונה ב־md5, ב־SHA-256 או באורך, או מטא־דאטה שונה ב־md5 | חריגה, ושום דבר לא משתנה |
| G4 | סירוב של הטריגר או הפרה של אינדקס ייחודי | חריגה, ושום דבר לא משתנה |
| G5 | כשל בבדיקה הצולבת הסופית (H) | חריגה, ושום דבר לא משתנה |
| G6 | טקסט קטוע או משובש | שגיאת תחביר, ושום דבר לא רץ |

**אחרי ההרצה** (קריאה בלבד):
| # | בדיקה | אם נכשלת |
|---|---|---|
| P1 | ארבעת החוקים פעילים ב־v4, v18, v8 ו־v6, עם md5 של התיאור ושל המטא־דאטה כמו ב־14.3 ו־`supersedes_version` 3/17/7/5. שורות הבסיס לא פעילות, עם ה־md5 הבסיסי | עוצרים, לא נוגעים בשום דבר נוסף, ומדווחים מיד |
| P2 | md5 של קודקס #4 הוא `f39efab9…` ושל #9 הוא `8d87b845…` | כמו P1 |
| P3 | `rules87` = `44fc87f0…`, ‏`codex_all` = `8fb398df…`, ושורות החוקים = 472 | אם רק טביעת האצבע שונה, בודקים אם סשן אחר שינה חוק אחר ומדווחים. זה לא בהכרח כשל שלנו |
| P4 | 600 התווים הראשונים של `deploy_on_request` v4 (חלון Raziel) כוללים ״אישור מפורש״ ו־2029 | מדווחים |
| P5 | אם החריגה התרחשה בזמן ההרצה, מוודאים שהמצב לא השתנה (S3) ומדווחים את הודעת החריגה | לא מנסים שוב. ניסיון נוסף דורש אישור חדש |

### 14.6 Rollback
| שאלה | תשובה |
|---|---|
| קובץ | `19e_p0_release_policy_ROLLBACK_EXEC.sql` (SHA-256 `a1bbb3c2…`, פקודה אחת, כ־4.8 אלף טוקנים). ‏`19_` שקול לו, אבל הוא כ־26 אלף טוקנים בשמונה פקודות |
| מה הוא עושה | מחזיר את קודקס #9 ו־#4 לגוף הבסיס המדויק, בבדיקת md5, SHA-256 ואורך, עם `updated_at=now()`. מכבה את v4, v18, v8 ו־v6 ומדליק מחדש את v3, v17, v7 ו־v5. **לא מוחק**: השורות החדשות נשארות כהיסטוריה לא פעילה |
| מתי הוא עובד | רק כל עוד שש השורות במצב שהוחל: גוף הקודקס זהה למה שהוחל, והגרסאות החדשות פעילות. **החלון נסגר** אם מישהו עורך את קודקס #4 (מסמך חי, נערך לאחרונה ב־10.11) או יוצר גרסה חדשה לאחד החוקים. במקרה כזה הקובץ מסרב, ונדרש rollback ממוקד חדש |
| מה הוא לא מחזיר | את `updated_at` המקורי של הקודקס (הוא יהיה זמן ה־rollback); את מה שסוכנים קראו או את מה ש־Raziel ענה בינתיים; את patch 0001 אם הוחל; רשומות יומן. אחרי rollback אי אפשר להחיל שוב את `10_` או `10e_`, ונדרשת גרסה חדשה (v5 וכו') |
| בדיקה אחרי rollback | `rules87` חוזר ל־`fae24986…`, ‏`codex_all` חוזר ל־`efdb5db7…`, ושורות החוקים נשארות 472 |
| אישור | rollback הוא כתיבת DB ודורש אישור מפורש. **אפשרות:** צוריאל יכול לאשר מראש הרצה אחת של `19e_` לפי SHA-256, **רק** אם P1 או P2 נכשלות. אחרת, rollback דורש אישור נפרד |

### 14.7 הנוסח המלא של ההרשאות אחרי השינוי
הנוסח המלא נמצא בנספח 14.A: `deploy_on_request` v4 וקודקס #9 במלואם, וכל פסקה שהשתנתה ב־v18, ב־v8, ב־v6 ובקודקס #4, יחד עם דגלי המטא־דאטה. **בקצרה, מה ההרשאות אומרות אחרי השינוי:**
* **אישור מפורש לכל פעולה, על האובייקט המדויק:** מיזוג ל־main (SHA של הראש); פריסת Production (SHA ופריסה); שינוי alias או domain, או חזרה אחורה (יעד מדויק); DB, SQL, מיגרציה, Edge Function, דגל או Preview מוגן (הפקודה או הגרסה המדויקת). אישור לא עובר מסשן קודם, מ־PR שמוזג, מ־workflow שעבר או מהוראה כללית, ולא חל על פעולה אחרת. «תעלה» הוא אישור רק לקומיט ולפריסה שהוצגו.
* **מיזוג ≠ פריסה.** אחרי כל מיזוג קוראים מחדש את ה־alias. ״נפרס״ מדווחים רק אחרי READY, alias ואימות חי.
* **מצבי המלצה:** READY_FOR_APPROVAL (לשעבר AUTO_RELEASE_NOW, היום כינוי שלו) פירושו ״מוכן להצגה לאישור״, ולעולם לא מיזוג או פריסה אוטומטיים.
* **Preflight** לפני הצגה ושוב ממש לפני ביצוע. **הוכחה אחרי שחרור**, עם הפרדה בין MERGED, APPLIED, DEPLOYED, LIVE ו־VERIFIED.
* **החלטות אנושיות נפרדות** נשארות: קנוניזציה או פרסום של אמת מנוהלת, אובדן נתונים בלתי הפיך, תמחור, החלשת פרטיות או אבטחה, ומחיקה או פרישה קבועה.
* **2029 הוא Production והמוצר הפעיל היחיד** מאז 4.11. ‏Legacy פרש ב־5.11, ואינו יעד פריסה, Preview או חזרה.
* **שער הקנרית** (v3) נשמר כמו שהוא, עם שינוי שם אחד: «AUTO-RELEASE PREFLIGHT (v2 §5)» → «RELEASE PREFLIGHT (§5)».
* **מטא־דאטה:** `standing_auto_release=false`, ‏`separate_taale_required=true`, ‏`explicit_approval_required_per_action=true`, ‏`merge_is_not_deploy=true`. ב־v18, ‏`v13_auto_release.status` הוא STANDING_AUTO_RELEASE_REVOKED_2026-11-10. ב־v8, ‏`command_semantics.taale` הוא explicit_approval_for_exact_presented_scope.
* **v18 / v8 / v6:** סעיפים 82, 86 ו־87 של v13 בוטלו. ייעוץ השחרור (81, 83–85 ו־88) נשאר כהמלצה לצוריאל. ‏`foundation_closure` מגדיר: ״Gate-clean is a precondition, never an authorization״. ב־`system_suggestions` §19: שחרור תחזוקה רק באישור מפורש של המיזוג או הפריסה המדויקים.

### 14.8 תלויות וסיכוני הפעלה (עדכון לסעיף 13.9)
| נושא | פירוט |
|---|---|
| SQL 11 (נפרד) | עד שיאושר, הפונקציה `admin_suggestion_decide` תמשיך לכתוב ביומן ״…may classify AUTO_RELEASE_NOW under deploy_on_request v2״ עם בעלות ״deploy_on_request v2 + inter_agent_coordination_law v13״. ב־v4 ‏AUTO_RELEASE_NOW מוגדר ככינוי ל־READY_FOR_APPROVAL, ולכן הסיכון הוא טקסט מיושן ולא הרשאה. **מומלץ לאשר את SQL 11 אחרי ש־SQL 10 אומת.** ‏SQL 10 אינו תלוי ב־SQL 11 |
| patch 0001 (מאגר) | ההפניות ב־`AGENTS.md`, `AGENT_HANDOFF.md`, `CLAUDE.md` ו־`SOD1820_MASTER_OWNER_INDEX.md` (20 שורות). מוחל **רק אחרי** אימות P1–P4, כקומיט מקומי בענף. דחיפה או PR דורשים אישור. נבדק באינדקס זמני: חל לבד ובאופן רציף עם 0002–0004, גם על `HEAD` וגם על `main` ‏`f250da9f7` |
| חלון ה־rollback | ראו 14.6. קודקס #4 הוא מסמך שנערך הרבה |
| סוכנים שקוראים חוקים | אחרי ההרצה, חלון Raziel של `deploy_on_request` אומר ״אישור מפורש״ ו־2029. אין סתירה עם `CLAUDE.md` (§0.4, כלל 7) |
| מה ההרצה לא משנה | קוד, פריסה, alias, דגלים, ‏RLS או הרשאות במסד. משתנות רק שש שורות טקסט ומטא־דאטה |

### 14.9 מה מבקשים לאשר
**המלצה (אחת):** לאשר **הרצה אחת** של `10e_p0_release_policy_EXEC.sql`, ‏SHA-256 `f2775634ab6f2b54142ed68d1702fe56cd8a09c2edf288ef11dac5c5d648cb85`, על `linswmnnkjxvweumprav`, דרך `execute_sql`. התוכן הוא בדיוק התוכן של `10_` המאושר (`d1ac658b…`), כפי שהוכח ב־14.4.

נוסח אישור מוצע: «מאשר הרצה אחת של 10e_p0_release_policy_EXEC.sql, ‏SHA-256 f2775634…cb85».
**אופציונלי באותו אישור:** «ומאשר מראש הרצה אחת של 19e_p0_release_policy_ROLLBACK_EXEC.sql, ‏SHA-256 a1bbb3c2…6861, רק אם בדיקת P1 או P2 נכשלת.»

**אם צוריאל מעדיף להריץ את `10_` עצמו:** זה אפשרי רק בערוץ שקורא את הקובץ ישירות, כמו psql או Supabase CLI עם הרשאות, וערוץ כזה לא קיים בסשן הזה. דרך `execute_sql` לא אריץ את `10_`, מהסיבות שבסעיף 14.4.

**מה האישור לא כולל:** SQL 11 ושאר קובצי ה־SQL, דחיפה, PR, מיזוג, פריסה ו־work_log. אחרי ההרצה אדווח את P1–P5, ואם P1–P4 עברו, אחיל את patch 0001 כקומיט מקומי בלבד.

### 14.10 דוח מסירה (§0.5)
| שדה | ערך |
|---|---|
| בוצע | אימות SHA-256; קריאה חיה של שש השורות, המנגנונים וטביעות האצבע; חישוב טביעות האצבע הצפויות; סריקת יומן ו־PRs; בניית `10e_` ו־`19e_` מתוך `10_` ו־`19_`; סימולציות (70/70, ‏60/60, ‏65/65); הנוסח המלא של ההרשאות; שמירת עבודת הפוטר של #1296; סעיף 14 בדוח וחבילה v3 |
| לא בוצע | כל כתיבה ל־DB, כולל יומן ו־PLAN37; הרצת SQL; קומיט חדש; דחיפה; PR; מיזוג; פריסה; כל שינוי ב־#1296. דפדפן ו־Vercel לא נבדקו (לא נדרשו) |
| מאגר / ענף | `zuriel337/sod1820` · `ccr-b2565041-d94syf` · בסיס `01d96b627` · ראש `6ab74289f` (לא נדחף) · `origin/main` = `f250da9f74f64e701dc70a16258186e555edcef7` |
| קבצים שהשתנו במאגר | אין. כל התוצרים נמצאים בתיקיית הסשן |
| בדיקות | מקומיות בלבד (PGlite, ‏Node 24.21.0). אין CI, כי לא נדחף דבר |
| PR | אין חדש. #1296 לא שונה |
| Production שונה? | **לא** |
| ממתין להחלטה | (1) אישור הרצה אחת של `10e_` (14.9); (2) אופציונלי: אישור מותנה מראש ל־`19e_`; (3) שם האוסף: **הוכרע 11.11.2026 — ״הצופן בסרטים״ (§15)**; (4) SQL 11 ושאר הקבצים בנפרד; (5) האם להפעיל משימה לפי רשומת GPT על הקטגוריות והסדרות |
| הצעד הבא המומלץ | אישור הרצה אחת של `10e_`, ואחריו אימות P1–P5 ו־patch 0001 מקומי |

### 14.A נספח — הנוסח המלא אחרי השינוי (נבנה מהליטרלים של `10_`)

כל טקסט כאן הוא בדיוק מה שייכתב למסד. טביעת האצבע מופיעה ליד כל יעד, כך שאפשר לבדוק את הטקסט מול המסד אחרי ההרצה. ‏`10e_` מייצר בדיוק את אותם טקסטים.

#### 1. deploy_on_request v4 — הנוסח המלא · תווית: «⛔ Release v4 — Explicit Approval per Merge & Deployment · No Standing Authorization»
md5 `78d80d2264e0b5062b425319b25a3e3a` · SHA-256 `9e0aac2829ffaef94170a515df3b808d73fde48a28e2e2d8455f47188e831061` · 6,532 תווים

```text
[v4 · Human-Gate ZURIEL · 10.11.2026 — אישור מפורש לכל מיזוג ולכל פריסה · אין הרשאה עומדת · 2029 הוא המוצר הפעיל היחיד]
צוריאל מחליט על כל שחרור. כל מיזוג ל-main וכל פריסה ל-Production מחייבים אישור מפורש של צוריאל לפעולה המסוימת — לקומיט ולפריסה המדויקים שהוצגו לו. אין הרשאה עומדת, ואישור אינו עובר מסשן לסשן, מפעולה לפעולה או מ-PR שמוזג. מיזוג אינו פריסה: push או מיזוג ל-main אינם יוצרים פריסה (git.deploymentEnabled=false בשני קובצי vercel.json, ולפי CLAUDE.md גם Ignored Build Step מדלג על main); פריסת Production היא פעולה נפרדת ומאושרת לפי הנוהל המתועד ב-CLAUDE.md («נוהל פריסה ל-Production מסשן ענן»). 2029 הוא המוצר הפעיל היחיד — Production מאז 4.11.2026; Legacy פרש ב-5.11.2026 ואינו יעד פריסה, Preview או חזרה.
צוברים שינויים בענף העבודה, מציגים לצוריאל מה מוכן וממתין עם המלצת שחרור (§4), ושואלים. שינויי נתונים ב-Supabase (DB, SQL, מיגרציות, Edge Functions) חיים מיד ואינם תלויים בפריסה, ולכן גם הם דורשים אישור מפורש לפעולה המדויקת (CLAUDE.md §0.4).

[v4 · consolidated release protocol — replaces the standing authorization of v2 (17.9.2026, §§1, 2, 8)]

1. EXPLICIT APPROVAL PER ACTION. ZURIEL's explicit approval is required for each specific action on its exact object: merge to main (exact head SHA); Production deployment (exact SHA and deployment); alias/domain change or rollback (exact target); DB/SQL/migration, Edge Function deployment, flag or protected Preview (exact statement/version). Approval is not inherited from an earlier session, a merged PR, a passing workflow or a general instruction, and it does not extend to another action. «תעלה»/«העלה» counts as approval only for the exact commit and deployment presented.
2. MERGE ≠ DEPLOY. A merge to main never deploys by itself. After every merge re-read the live alias before reporting deployed / not deployed (a parallel session may deploy). Report DEPLOYED only after READY + alias + live verification.
3. DEPENDENCY-AWARE BATCHING. Release follows the canonical dependency DAG/batch, not PR creation order. A higher layer waits for required lower layers. Independent clean lanes may be presented for approval independently when doing so cannot create a temporary incompatible state. Stacked/dependent PRs are composed/rebased/reconciled before release rather than blindly merged one by one.
4. RELEASE RECOMMENDATION IS MANDATORY. Every material completion/handoff classifies its release state as exactly one of: READY_FOR_APPROVAL · BUNDLE_WITH(<scope>) · BLOCKED_BY(<dependency/gate>) · SAFE_INDEPENDENT_WAITING_RUNTIME · DO_NOT_RELEASE_SUPERSEDED/PARKED, and explains the decisive dependency in plain language. READY_FOR_APPROVAL (formerly AUTO_RELEASE_NOW) means ready to be presented to ZURIEL for explicit approval — never an automatic merge or deploy.
5. RELEASE PREFLIGHT. Before presenting a release, and again immediately before executing an approved action, refresh live sync and verify at minimum: canonical owner/current main; exact head/base; open dependency/blocker state; required tests/checks; migration/RLS/security gates when touched; no active overlapping writer; rollback/recovery path; release batch compatibility. Any uncertainty that can change safety = BLOCKED, not guessed.
6. POST-RELEASE PROOF. A release is not complete at merge. Verify actual production/live object state, exact deployed version/bundle/function/migration as applicable, critical smoke/golden path, and record AFTER with MERGED/APPLIED/DEPLOYED/LIVE/VERIFIED separately. Silent deployment failure remains failure.
7. SEPARATE HUMAN DECISIONS. Release approval does not cover: canonicalizing/publishing governed research truth when the owner requires Human Gate; destructive/non-recoverable data loss; new paid prices/economics; materially weakening privacy/security; permanent deletion/retirement of preserved capability/history; or an explicit active law that names a separate Human decision. Each needs its own explicit ZURIEL decision.
8. HOLD. «תעלה» never bypasses a failed or missing gate. If ZURIEL says wait/hold, that hold applies to the named scope until lifted.
9. VERCEL/RESOURCE SAFETY REMAINS. Batch releases sensibly, preserve quota safeguards and avoid duplicate deployments. Ready work is reported to ZURIEL as READY_FOR_APPROVAL rather than held silently.

מקור וקדימות: הכרעת צוריאל 10.11.2026 — «כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.» — מחליפה את ההרשאה העומדת של v2 לפי כלל הקדימות הקיים (החלטה מאוחרת ומפורשת של צוריאל גוברת על מוקדמת). v1–v3 נשמרות כגרסאות לא פעילות.

OWNER CHECK: EXTEND_EXISTING deploy_on_request. No release scheduler/store/registry/second deployment system.

[UPDATE v3 · G3_RELIABILITY_PRECLOSE · EXTEND_EXISTING — PRODUCTION CANARY GATE FOR THE NEXT RELEASE]
1. PREFLIGHT ADDITION. RELEASE PREFLIGHT (§5) additionally requires the latest GitHub commit status with context sod1820/post-deploy-canary on the current successful Production deployment SHA to be success, unless public.fn_release_canary_override_status() reports an active bounded Human-Gate override. GitHub Actions/commit status is the release evidence; arbitrary events rows are never release evidence.
2. BLOCK, DO NOT ROLL BACK. Missing, failed or pending canary status for the exact Production SHA blocks the NEXT release only. There is no automatic rollback. Recovery = a fixing/deploy canary that passes, or an explicit audited Human-Gate override.
3. EXPLICIT AUDITED OVERRIDE. Only ZURIEL Human Gate may authorise select public.fn_release_canary_override(<reason>, <hours 1..72>); it writes work_log and expires. The public override-status reader exposes only active/expiry state, never grants an override.
4. SYNTHETIC ≠ GOLDEN. A synthetic canary PASS is a small deterministic zero-AI smoke set. GitHub workflow budget allows at most four scheduled/manual runs per UTC day; deploy-triggered runs are always evaluated. Canary never substitutes Golden/CI/security gates.
5. HEARTBEAT IS PART OF CANARY TRUTH. The external canary calls public.fn_reliability_heartbeat_status(); missing or >45m heartbeat makes the GitHub canary fail and records failure on the exact deployed SHA. The reader is read-only and exposes only age/health.
6. ONE-TIME INSTALL BOOTSTRAP. The single PR that first installs this gate may pass preflight only when its base-main does not yet contain scripts/release-canary-gate.mjs and no prior canary status exists. Once the gate runtime exists on main, every later release fails closed without exact-SHA success or explicit audited Human-Gate override.
```

**דגלי ההרשאה במטא־דאטה החדשה** (md5 של jsonb ‏`4620b9f9d94ecf9c3ca603910b12691c`):

```text
{
 "standing_auto_release": false,
 "separate_taale_required": true,
 "explicit_approval_required_per_action": true,
 "merge_is_not_deploy": true,
 "human_gate_v4": "ZURIEL 2026-11-10",
 "release_preconditions": [
  "gate_clean",
  "dependencies_closed",
  "current_main_reconciled",
  "required_checks_green",
  "security_privacy_clean_if_applicable",
  "no_overlapping_writer",
  "rollback_recovery_known"
 ],
 "explicit_human_gate_remaining": [
  "governed_truth_canonicalization_or_publication",
  "destructive_irreversible_data_loss",
  "pricing_economics",
  "privacy_security_weakening",
  "permanent_capability_history_retirement"
 ],
 "release_advice_states": [
  "READY_FOR_APPROVAL",
  "BUNDLE_WITH",
  "BLOCKED_BY",
  "SAFE_INDEPENDENT_WAITING_RUNTIME",
  "DO_NOT_RELEASE_SUPERSEDED/PARKED"
 ],
 "release_advice_state_aliases": {
  "AUTO_RELEASE_NOW": "READY_FOR_APPROVAL"
 },
 "v4_explicit_release_approval": {
  "active_product": "2029",
  "decided_at": "2026-11-10",
  "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.",
  "legacy_retired": "2026-11-05",
  "no_new_system": true,
  "owner_check": "EXTEND_EXISTING",
  "procedure_ref": "CLAUDE.md — נוהל פריסה ל-Production מסשן ענן",
  "production_since": "2026-11-04",
  "supersedes": "v2 standing authorization (§§1, 2, 8)"
 }
}
```

הוסר מהמטא־דאטה: `auto_release_preconditions` (הוחלף ב־`release_preconditions`, אותם שבעה תנאים).

#### 2. inter_agent_coordination_law v18 — כל פסקה שהשתנתה, בנוסחה המלא החדש · תווית: «Inter-Agent Coordination v18 — 2029 Production · Explicit Release Approval»
md5 `0ce1688c34a59353b42c2e1b53322c78` · SHA-256 `09a21eaba07b1301e9fdeb6991f22b36856386fbf3a163dc21872b79f8bbb130` · 42,309 תווים

**שורות 5–6** (מחליפות 0 שורות בבסיס):

```text
הוראת צוריאל מחייבת — 10.11.2026 (v18): 2029 הוא Production והמוצר הפעיל היחיד; אין הרשאת שחרור עומדת.
2029 עלה ל-Production ב-4.11.2026 ו-Legacy פרש ב-5.11.2026 (קוד Legacy נשמר בהיסטוריית Git בלבד ואינו יעד פריסה, Preview או חזרה). סעיפים 75, 79 ו-80 (v12) תיארו את המצב שלפני המעבר והם היסטוריים; 76–78 נשארים בתוקף כעיקרון: חומר Legacy הוא ראיה היסטורית בלבד, לא סמכות עיצוב או ארכיטקטורה. כל מיזוג ל-main וכל פריסה ל-Production מחייבים אישור מפורש של צוריאל לפעולה המסוימת (deploy_on_request, הגרסה הפעילה). ההרשאה העומדת והשחרור האוטומטי של v13 (סעיפים 82, 86, 87) בוטלו; ייעוץ השחרור (81, 83–85, 88) נשאר, ותוצאתו המלצה לצוריאל — לעולם לא פעולה אוטומטית.
```

**שורות 8–9** (מחליפות 1 שורות בבסיס):

```text

--- HISTORICAL V1–V16: conflicting communication clauses superseded by v17; production/release clauses 75–82 and 86–88 updated by v18 ---
```

**שורות 122–123** (מחליפות 2 שורות בבסיס):

```text
[UPDATE v12 · Human-Gate ZURIEL · 16.9.2026 — 2029 TARGET / TEMPORARY LEGACY PRODUCTION BOUNDARY, additive; EXTEND_EXISTING only] — HISTORICAL PRE-CUTOVER STATE: superseded by v18 (10.11.2026); 2029 = Production since 4.11.2026
75) [HISTORICAL · superseded by v18] TEMPORARY LEGACY PRODUCTION. Until ZURIEL explicitly declares cutover, the currently deployed legacy site remains the operational production surface for real users, production verification, urgent fixes and release safety. Its being live does NOT make its routes, components, information architecture, page composition or local implementation patterns the target architecture.
```

**שורות 127–128** (מחליפות 2 שורות בבסיס):

```text
79) [HISTORICAL · cutover executed 4.11.2026 by explicit ZURIEL decision; Legacy retired 5.11.2026] CUTOVER IS EXPLICIT. No agent may assume the new site is production merely because 2029 work exists, and no agent may assume the legacy site is the long-term system merely because it is currently live. The transition point is a Human-Gate decision by ZURIEL and must be recorded with exact release/live state.
80) FRESH-AGENT ACCEPTANCE (updated by v18). A project-entry agent must be able to state without prior conversation memory: CURRENT PRODUCTION = 2029 (since 4.11.2026); Legacy is retired (5.11.2026) and is not a production, Preview or rollback target; TARGET ARCHITECTURE = 2029. Treating Legacy as current production is an entry-routing failure and must be reported as DRIFT. [Historical pre-cutover wording: CURRENT PRODUCTION = legacy/transitional until explicit cutover.]
```

**שורות 132–134** (מחליפות 3 שורות בבסיס):

```text
[UPDATE v13 · Human-Gate ZURIEL · 17.9.2026 — DEPENDENCY-AWARE RELEASE ADVICE · EXTEND_EXISTING · standing auto-release revoked by v18 (10.11.2026)]
81) AGENT OWNS RELEASE RECOMMENDATION. At completion/checkpoint, Primary Owner must tell ZURIEL what should happen operationally, not merely “waiting for תעלה”. It classifies the exact scope using the canonical release-advice states from deploy_on_request (active version) and names dependencies/bundle order.
82) [REVOKED by v18 · 10.11.2026] EXPLICIT APPROVAL, NO AUTO-RELEASE. A clean live preflight (GATE-CLEAN + DEPENDENCIES-CLOSED + CI/GOLDEN/SECURITY CLEAN as applicable + NO OVERLAP) makes a scope READY_FOR_APPROVAL; the Primary Owner presents the exact commit/deployment to ZURIEL and merges, applies migrations or deploys only after his explicit approval of that specific action. [Former v13 text: auto-release on clean state under standing authorization, without a second user prompt.]
```

**שורות 138–140** (מחליפות 3 שורות בבסיס):

```text
86) RELEASE APPROVAL DOES NOT CANONICALIZE. There is no standing release authorization (v18). Approval of a release does not grant autonomous governed-truth publication, destructive irreversible changes, pricing/economics, or other explicitly Human-Gated product decisions. Those remain separately gated.
87) USER HOLD. Explicit ZURIEL “hold/wait/do not release” for a scope creates a release hold in coordination context until lifted.
88) AFTER MUST INCLUDE RELEASE ADVICE/RESULT. Every material AFTER includes: release_advice; dependency_state; exact branch/PR/head; merged/applied/deployed/live/verified booleans/states; blocker if any; next proposed action (a merge, deploy or DB action still awaits ZURIEL's explicit approval). Session end must leave enough information for a fresh agent to continue release choreography without asking ZURIEL what to upload; approval of the action itself is still required.
```

**שורה 142** (מחליפות 1 שורות בבסיס):

```text
OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law + deploy_on_request (active version). No new queue/release store/registry.
```

**שורה 145** (מחליפות 1 שורות בבסיס):

```text
89) VISUAL DESIGN LANE. For 2029 surfaces CLAUDE is the primary writer of the visual layer: shared frame composition (rails, Raziel presence, Now), the shared component kit, per-surface composition/layout, and the final visual acceptance pass. Semantic authority stays with the existing owners: SOD1820_DESIGN_CONTRACT_V2.md + paletteTokens2029.js/designTokens.js (values; palette.js was removed on 5.11.2026), SystemFrame (frame contract), canonical_ui_components_law, experience_governance_foundation_v1_law v9. This assigns a writer lane only; it creates no design owner and changes none of those contracts. Token/contract/icon-family changes go through their owner with Human Gate.
```

**המטא־דאטה של ההרשאה:**

```text
{
 "v18_2029_production_explicit_release": {
  "current_production": "2029",
  "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.",
  "explicit_approval_per_merge_and_deploy": true,
  "human_gate": "ZURIEL 2026-11-10",
  "label_corrected": "label read 'v16' while rule_version was 17",
  "legacy_is_current_production_runtime": false,
  "legacy_retired": "2026-11-05",
  "no_new_system": true,
  "owner_check": "EXTEND_EXISTING",
  "production_since": "2026-11-04",
  "release_advice_state_aliases": {
   "AUTO_RELEASE_NOW": "READY_FOR_APPROVAL"
  },
  "release_advice_states": [
   "READY_FOR_APPROVAL",
   "BUNDLE_WITH",
   "BLOCKED_BY",
   "SAFE_INDEPENDENT_WAITING_RUNTIME",
   "DO_NOT_RELEASE_SUPERSEDED/PARKED"
  ],
  "standing_auto_release": false
 },
 "v13_auto_release": {
  "auto_canonicalization": false,
  "dependency_order_agent_owned": true,
  "human_gate": "ZURIEL 2026-09-17",
  "owner_check": "EXTEND_EXISTING",
  "release_advice_states": [
   "AUTO_RELEASE_NOW",
   "BUNDLE_WITH",
   "BLOCKED_BY",
   "SAFE_INDEPENDENT_WAITING_RUNTIME",
   "DO_NOT_RELEASE_SUPERSEDED/PARKED"
  ],
  "release_recommendation_required": true,
  "separate_taale_required": false,
  "standing_auto_release": true,
  "status": "STANDING_AUTO_RELEASE_REVOKED_2026-11-10",
  "superseded_by": "v18_2029_production_explicit_release",
  "user_hold_overrides": true
 },
 "v12_2029_temporary_legacy_boundary": {
  "current_production": "LEGACY_TRANSITIONAL_UNTIL_EXPLICIT_CUTOVER",
  "fresh_agent_must_distinguish_current_vs_target": true,
  "human_gate": "ZURIEL 2026-09-16",
  "legacy_is_current_production_runtime": true,
  "legacy_is_design_authority": false,
  "new_site_cutover_declared": false,
  "no_new_owner": true,
  "owner_check": "EXTEND_EXISTING",
  "status": "HISTORICAL_PRE_CUTOVER",
  "superseded_by": "v18_2029_production_explicit_release",
  "target_architecture": "2029"
 }
}
```

#### 3. foundation_closure_protocol_law v8 — כל פסקה שהשתנתה, בנוסחה המלא החדש · תווית: «Foundation Closure Protocol v8 — Bottom-Up Closure + Explicit Release Approval»
md5 `eb603a65f8a4a9a58e8d4548f0663e65` · SHA-256 `03bd388c36ef418053874b85c8f717af024320cd8ce1badabd43a56bec104e86` · 17,029 תווים

**שורות 93–97** (מחליפות 5 שורות בבסיס):

```text
[UPDATE v6 · Human-Gate ZURIEL · 17.9.2026 — RELEASE BINDING · EXTEND_EXISTING · standing auto-release revoked by v8 (ZURIEL 10.11.2026)]
RELEASE BINDING (v8). Once a bounded release scope has satisfied every applicable lower MUST, gate, dependency, current-main reconciliation, required specialist/security/privacy acceptance and release recovery condition, it is READY_FOR_APPROVAL: the Primary Owner presents the exact commit/deployment to ZURIEL and releases only after his explicit approval of that specific action (deploy_on_request, active version). Gate-clean is a precondition, never an authorization; there is no standing release authorization.
NO-SKIP REMAINS ABSOLUTE. Explicit approval does not weaken any Foundation MUST or acceptance standard. קדימה/תעלה never waive a blocker.
HUMAN-DECISION RESERVE. Explicit Human Gate remains for decisions that change canonical governed truth/publication where required, destructive irreversible state, paid product economics, material privacy/security weakening, permanent deletion/retirement of preserved history/capability, or another owner-specific Human decision.
RELEASE ADVICE. Gate closure/handoff must expose whether the scope is READY_FOR_APPROVAL (formerly AUTO_RELEASE_NOW), BUNDLE_WITH, BLOCKED_BY, SAFE_INDEPENDENT_WAITING_RUNTIME, or DO_NOT_RELEASE_SUPERSEDED/PARKED, so ZURIEL is not required to infer dependencies.
```

**שורה 99** (מחליפות 1 שורות בבסיס):

```text
OWNER CHECK: EXTEND_EXISTING foundation_closure_protocol_law + deploy_on_request (active version). No new gate system.
```

**המטא־דאטה של ההרשאה:**

```text
{
 "v8_explicit_release_approval_binding": {
  "explicit_approval_per_merge_and_deploy": true,
  "human_gate": "ZURIEL 2026-11-10",
  "no_new_system": true,
  "no_skip_unchanged": true,
  "owner_check": "EXTEND_EXISTING",
  "standing_auto_release": false
 },
 "v6_auto_release_binding": {
  "human_decision_reserve": true,
  "human_gate": "ZURIEL 2026-09-17",
  "no_skip_unchanged": true,
  "owner_check": "EXTEND_EXISTING",
  "separate_taale_required": false,
  "standing_auto_release_for_gate_clean_routine_scope": true,
  "status": "STANDING_AUTO_RELEASE_REVOKED_2026-11-10",
  "superseded_by": "v8_explicit_release_approval_binding"
 },
 "command_semantics": {
  "kadima": "within_current_gate_only",
  "taale": "explicit_approval_for_exact_presented_scope",
  "waiver": "explicit_replan_or_supersession_only"
 }
}
```

#### 4. system_suggestions_law v6 — כל פסקה שהשתנתה, בנוסחה המלא החדש · תווית: «System Intelligence v6 — Resource-Aware Reliability + Explicit Release Approval»
md5 `98d4d88e16d2ec5f70dac6e5a7f98ea5` · SHA-256 `b29d2c5fa2b16c5911301872bb2b0762964fe2694dd90b4e27fcce7d6c97dca2` · 17,885 תווים

**שורה 1** (מחליפות 1 שורות בבסיס):

```text
החלטת צוריאל 12.7.2026 (הרחבת ai_style_learning_law לכל המערכת, לפי פרוטוקול שהציע וצוריאל אישר): «המערכת לעולם אינה משנה את עצמה. היא רק לומדת, מסבירה ומציעה.» חמישה שלבים: (1) Observe — כל רכיב רושם תצפיות (ai_analysis_log, relation_evidence, אירועים). (2) Detect — detect_suggestions() רץ מחזורית ומזהה דפוסים חוצי-סף (כרגע גלאי style_continue_rate: סגנון עם ≥40 ניתוחים ופער continue-rate ≥10 נק׳; ו-pending_ratings ≥20). (3) Suggest — יוצר שורה ב-system_suggestions (category ai/ux/research/performance/knowledge, title, dedupe_key אנטי-ספאם; לא מעלה שוב משהו שנדחה ב-30 יום). (4) Explain — כל המלצה נושאת reason + observed(jsonb הנתונים) + confidence(0-100, היוריסטיקה מסומנת ככזו) + sample_size + estimated_impact. (5) Decide — רק צוריאל: admin_suggestion_decide → accepted/rejected/later/pending. UI: טאב אדמין «🧠 המלצות המערכת» (כרטיסי Confidence/Reason/Observed/Impact + קבל/דחה/המתן, טאבי-סטטוס). ⛔ אין ביצוע אוטומטי של המלצה — קבלה = החלטה אנושית, המימוש ידני. השומר (system-watchman): edge function + cron שבועי (jobid 19, ראשון 08:00) — מריץ גלאים, בונה site_pulse(7), ושולח דייג׳סט (אימייל Resend + וואטסאפ wa_send) רק כשיש משהו מעל-סף (worth); admin_notify (server-only) מחזיק יעדים; admin_fire_watchman = «שלח עכשיו». תלות-קונפיג של צוריאל: (א) וואטסאפ דורש chat_id פרטי (@c.us) שהוא מזין בפאנל — לא נשמר בקוד/אתר; (ב) אימייל דורש RESEND_API_KEY ב-Edge secrets (בבדיקה חזר no_resend_key). RPCs: suggest_add/detect_suggestions/site_pulse (service) · admin_suggestions_list/decide/notify_get/set/fire_watchman (rd_is_admin). רכיב: SystemSuggestionsTab.jsx (מסוף הניהול הישן; הוסר ב-5.11.2026, #1239). הרחבה עתידית: גלאי UX/Performance/Knowledge + A/B כשתצטבר תנועה.
```

**שורה 40** (מחליפות 1 שורות בבסיס):

```text
19. RELEASE REUSES deploy_on_request. Patch/minor routine maintenance may be released only after current-main reconciliation, dependency closure, peer-resolution, CI/Golden/security checks and no writer overlap, and then only with ZURIEL's explicit approval of the exact merge/deploy (deploy_on_request, active version; no standing authorization). Major runtime/framework upgrades remain Foundation changes: they may be prepared after Human acceptance but require Foundation redesign-risk challenge and any applicable Human Gate before release.
```

**המטא־דאטה של ההרשאה:**

```text
{
 "human_gate_v6_release": {
  "changed": [
   "§19: release reuses deploy_on_request (active version) only with explicit approval",
   "SystemSuggestionsTab.jsx marked removed (5.11.2026, #1239)"
  ],
  "decision_text": "כל מיזוג ל-main וכל פריסה ל-Production דורשים אישור מפורש שלי לפעולה המסוימת. אין הרשאה עומדת.",
  "human_gate": "ZURIEL 2026-11-10",
  "no_new_system": true,
  "owner_check": "EXTEND_EXISTING"
 }
}
```

#### 5. project_codex #9 branches_deploy — הגוף המלא החדש
md5 `8d87b8459f2fec3c25f9bf7cea443d3b` · SHA-256 `e2e955afda91c3b5affc3fec6ee5aa853c019f72fb2a1dd8fd323cbed49aba9a` · 3,079 תווים

```text

# Branches & Deploy — vercel.json re-read at main 932aba4bd (11.11.2026); release policy per ZURIEL 10.11.2026

Canonical owner: `deploy_on_request` (active version).
This codex is an operational projection of the live owner + current `vercel.json`; it is not a second deployment law.

## Production
- 2029 is the only active product: Production since 2026-11-04. Legacy was retired on 2026-11-05 and is not a deployment, Preview or rollback target.
- `main` is the release source, not an automatic deployment. A merge or push to `main` does not create a Production deployment: `git.deploymentEnabled=false` in both `vercel.json` roots (repository root and `public-reading-deploy`), and per CLAUDE.md the project's Ignored Build Step skips `main` builds.
- A Production deployment is a separate, manual action for an exact `main` SHA (Vercel MCP, per CLAUDE.md «נוהל פריסה ל-Production מסשן ענן»). Every merge to `main` and every Production deployment, alias change or rollback requires ZURIEL's explicit approval for that specific action. There is no standing authorization.
- Never use production as a workaround for Preview tooling.

## Development branches
Current `vercel.json` (both roots) sets `git.deploymentEnabled: false` globally. By Vercel's semantics no branch — `main`, `gpt/*`, `claude/*`, `preview/*` or any other — creates a deployment merely by being pushed. (Live Vercel project settings were not re-read in this pass.)

Superseded, kept as history (2026-09-23): the per-branch map (`gpt/g3-topic-golden-slug-rank-foundation-v1` → true; `gpt/*` → false; `claude/*` → false) and the earlier `ignoreCommand` note no longer describe the configuration.

## Preview
A Preview deployment is created only as an explicitly approved, bounded action (CLAUDE.md rule 7: a protected Preview requires ZURIEL's explicit approval), from an exact approved artifact head, never as production (`target=null`). Verify before sharing: source artifact known; Preview target; `READY`; requested route returns HTTP 200. Generate/share a protected Preview URL when Deployment Protection is enabled. Never merge or promote a preview carrier branch.

Historical mechanism (2026-09-23): a `preview/*` carrier branch with an inert marker commit triggered Vercel Git Integration because `preview/*` was outside the blocked namespaces. With the global `deploymentEnabled: false` a push to `preview/*` no longer deploys by itself; the record below is provenance only.

## F11 proof (historical, 2026-09-23)
On 2026-09-23:
- canonical F11 app artifact: PR #632 head `a00965851deb98b4601f1e38389a543fea49a850`
- preview branch: `preview/f11-raziel-consumer-a0096585`
- inert trigger commit: `facbb942874307a0114bef40bab60a5d55a88d3e`
- Vercel deployment: `dpl_H5v9KuyiTDWECXFnvyMbog669YHU`
- target: Preview (`null`), not production
- state: READY
- route `/2029/preview/synthesis/1820`: HTTP 200
- production/main unchanged.

## Safety
Do not enable Git deployments (globally or per branch) merely to get a Preview. Preview and Production creation remain explicit, bounded, approved actions.
```

#### 6. project_codex #4 publishing_conventions — כל שורה שהשתנתה, בנוסחה המלא החדש
md5 `f39efab93a4d4bfa851586d4fc4259f5` · SHA-256 `d98c9a71fcb4b42b0a956b35d0ae4285ab83fa675c8503e8df66a257a195994b` · 72,978 תווים

**שורה 413** (מחליפות 1 שורות בבסיס):

```text
- Same Post identity across historical (WordPress/Legacy-era) records and 2029.
```

**שורה 463** (מחליפות 1 שורות בבסיס):

```text
8. ONE SHARED IMPLEMENTATION: ההגדרה החזותית שייכת לחוזה Design V2 ולפלטה הקנונית; רכיב הפוסט המשותף צורך אותה. אין theme store נוסף, palette נפרדת לכל פוסט, CSS חדש במקור כדי לכפות צבעי 2029. (תצוגת Legacy אינה קיימת עוד מאז 5.11.2026.)
```

**שורה 472** (מחליפות 1 שורות בבסיס):

```text
1. טריגר וסמכות: הוראה מפורשת לפרסם/להעלות לאתר מתירה לבצע את שלבי פרסום המדיה הנדרשים ללא שאלות חוזרות על העברת הקובץ ותמונת שער. שיתוף קישור/קובץ ללא הוראת פרסום אינו מתיר פרסום אוטומטי. היעד הוא 2029 — המוצר הפעיל היחיד (Legacy פרש ב-5.11.2026 ואינו יעד פרסום); הוראת פרסום אינה אישור לשינוי קוד/ענפי Preview, מיזוג או פריסה.
```

**שורה 476** (מחליפות 1 שורות בבסיס):

```text
5. אימות וסיום: בצע קריאת-חזרה לחשבונית אחסון, בדיקת קיום קובץ מקור ונגזרות, בדיקת שדות והפניות הפוסט; בדוק תצוגה בפועל במובייל/דפדפן ב-2029. DB INSERT/UPDATE לבדו אינו הוכחת פרסום חי או נראות. דווח באופן מפורד מה בוצע, מה אומת ומה עדיין חסום, עם קישור לצפייה רק אם אומת. אל תכפה שינוי ב-Production או בפריוויו כדי לעקוף חסימה.
```

**שורות 481–482** (מחליפות 2 שורות בבסיס):

```text
—— POST MODIFIED DATE REQUIRED · 27.10.2026 · re-scoped to 2029 on 10.11.2026 · publishing_conventions operational correction ——
כש-ChatGPT או כל סוכן אחר מפרסם פוסט חדש ב-public.posts, חובה להגדיר posts.modified לתאריך הפרסום (לרוב זהה ל-posts.date; בעריכה בפועל לפי updated time) כבר ב-INSERT. אין להסתפק ב-date/created_at בלבד: קוראי 2029 ממיינים לפי modified DESC NULLS LAST (getLatestPostCards ב-src/lib/supabase.js; fetchPostsCatalog2029 ו-fetchPostSearchSuggestions2029 ב-src/lib/research/postsCatalog2029Projection.js), והיעדר modified עלול להוריד פוסט חדש לתחתית הרשימות. (ב-27.10 נכתב הכלל עבור דף הבית של Legacy, fetchHomePosts, שהוסר ב-5.11.2026; הדרישה נשארת בתוקף ב-2029.) modified קובע סדר בלבד ואינו אות ל״עדכון חדש״ (SOD1820_DESIGN_CONTRACT_V2.md §8.1). לאחר כתיבה לוודא שהפוסט מופיע בראש רשימות הפוסטים של 2029, אינו טיוטה/פורום/מוסתר מהבית, ונראה בפועל; לא לשנות קוד, פריסה, Preview או שדות לא קשורים לשם עקיפת התקלה. בדיקת DB/מיון אינה תחליף לבדיקת תצוגה בדפדפן. כיול: posts.id=5126 (27.10.2026), תוקן modified=NULL ל-date, עלה ממקום 1295 למקום 1 במיון הרשימה. 
```

כל שאר השורות של הקודקס (72,978 תווים בסך הכול) זהות לבסיס. המילה «מפורד» בשורה 476 מופיעה כך כבר בבסיס החי ולא שונתה (שגיאת כתיב קיימת, מחוץ לתחום SQL 10).

---

## 15. הרצת SQL 10 (`10e_`) והחלטת השם ״הצופן בסרטים״ (11.11.2026)

**מה החליט צוריאל:** (1) השם המאושר של הסדרה/האוסף הוא **״הצופן בסרטים״**, ואין להשתמש בשם האחר שהופיע בטיוטת #1296. יש לעדכן את מסמך הפוטר השמור ואת ההפניות, בלי ליצור סדרה או קטגוריה ובלי לשנות נתונים. (2) **הרצה אחת בלבד** של `10e_p0_release_policy_EXEC.sql`, ‏SHA-256 `f2775634ab6f2b54142ed68d1702fe56cd8a09c2edf288ef11dac5c5d648cb85`, בכפוף לכל תנאי ה־preflight של 14.5. בחריגה עוצרים: אין ניסיון חוזר ואין rollback אוטומטי. אין אישור ל־SQL 11, ל־`19e_`, לדחיפה, ל־PR, למיזוג או לפריסה.

### 15.0 תמצית
1. **SQL 10 הוחל פעם אחת**, ב־11.11.2026 04:32:42 UTC, באמצעות `10e_`. כל תנאי ה־preflight התקיימו, וכל בדיקות האחרי עברו. **מצב: APPLIED + VERIFIED במסד.** לא נדרשה פריסה, ולא בוצעה.
2. **הטקסט שהורץ הוא בדיוק הקובץ המאושר.** לפני ההרצה נשלח הטקסט כמחרוזת בבדיקת קריאה בלבד: ה־md5 שהמסד חישב זהה ל־md5 של הקובץ, וגם 19 הבלוקים זהים. אחרי ההרצה, `pg_stat_statements` מראה `calls=1`, ו־md5 של הפקודה שנרשמה הוא `fcd51e7c…`. זה ה־md5 של הקובץ בלי ה־`;` וירידת השורה שבסופו.
3. **לא בוצעו:** ניסיון חוזר (לא נדרש), rollback, `19e_`, ‏SQL 11, כתיבה ליומן, דחיפה, PR, מיזוג ופריסה.
4. **השם:** מסמך הפוטר השמור, ה־patch שלו, ה־README וה־FINDINGS ושורות ההחלטה בדוח עודכנו ל״הצופן בסרטים״. הנוסח המקורי נשמר רק כהיסטוריה. **נשאר פתוח:** תווית תצוגה אחת במאגר (15.7).
5. **patch ‏0001** (הפניות ל־v4/v18/v8/v6) הוחל כקומיט מקומי `a174089be`. הבדיקות עברו, והוא **לא נדחף**.

### 15.1 תנאי ה־preflight (14.5), ברגע ההרצה
| # | תנאי | תוצאה |
|---|---|---|
| S1 | אישור מפורש שמציין את `10e_` ואת ה־SHA-256 שלו, להרצה אחת | **מתקיים**: הודעת צוריאל, 11.11.2026 |
| S2 | ה־SHA-256 של הקובץ, מחושב מחדש | **`f2775634…cb85`, זהה** לאישור |
| S3 | שש השורות זהות ל־14.3, ואין גרסה חדשה יותר | **זהות** (04:29:52 UTC): ‏v3/v17/v7/v5 פעילות, כל ה־md5 תואמים, וגרסה מקסימלית 3/17/7/5 |
| S4 | אין רשומה חדשה ביומן על היעדים, ואין כותב פעיל | **אין** רשומה מאז 04:08:24 |
| S5 | טריגר, אינדקסים, `read_only=off` | טריגר פעיל (`O`, ‏`56b90b0a…`); שלושת האינדקסים קיימים; ‏`postgres`, ‏`read_only=off`, ‏Postgres 17.6 |
| S6 | קריאה אחת ל־`execute_sql` על `linswmnnkjxvweumprav` | **קריאה אחת**. החזירה `[]`, כצפוי לבלוק `DO`, ובלי שגיאה |
| נוסף | בדיקת העברה בקריאה בלבד (`select md5(...)` על הטקסט, בלי להריץ אותו) | md5 ‏`dd663547…` ו־50,049 תווים, זהים לקובץ; 19/19 בלוקים זהים |

### 15.2 BEFORE / AFTER — שש שורות היעד
| יעד | BEFORE (04:29:52 UTC) | AFTER (04:33:07 UTC) |
|---|---|---|
| `deploy_on_request` | v3 פעילה · `70f1ddf6-98fa-478c-90b8-ac6ff5dab310` · תיאור `f93e73ce0ad3bc66457e6ff07cdb2322` · מטא `8a4b80b7e9b824e79dca9e229549c1c4` · 5,820 | **v4 פעילה** · `0092c6c7-18a3-4ec9-9d2c-78a23e3f4185` · `78d80d2264e0b5062b425319b25a3e3a` (SHA-256 `9e0aac28…`) · מטא `4620b9f9d94ecf9c3ca603910b12691c` · 6,532 · ‏`supersedes_version`=3 · «⛔ Release v4 — Explicit Approval per Merge & Deployment · No Standing Authorization». v3 לא פעילה, ללא שינוי |
| `inter_agent_coordination_law` | v17 פעילה · `0ad5ae0d-ca7a-49a7-b7c2-130530f51e2f` · `02d188d1b92e32ea51907d059b18c47f` · מטא `982e7976d43d62a7a9b08b8d3a591e6f` · 40,807 | **v18 פעילה** · `5c25161d-e575-4673-81dd-d1415c556798` · `0ce1688c34a59353b42c2e1b53322c78` (`09a21eab…`) · מטא `e69f38e5bfa1e25973d6656076cc169c` · 42,309 · sup=17 · «Inter-Agent Coordination v18 — 2029 Production · Explicit Release Approval». v17 לא פעילה |
| `foundation_closure_protocol_law` | v7 פעילה · `986849b7-3d48-43b5-9a9d-067ed4aab394` · `336934e50ca48dba8cb00cf64986b878` · מטא `b26961fac416ac5e4775e9a41b6deae8` · 16,930 | **v8 פעילה** · `26f2537c-cb77-4b01-8804-f123599a57c3` · `eb603a65f8a4a9a58e8d4548f0663e65` (`03bd388c…`) · מטא `6b786f67bc7613c52a5e1640982e58bb` · 17,029 · sup=7. v7 לא פעילה |
| `system_suggestions_law` | v5 פעילה · `d42d4fa7-f7c6-42ac-989e-3831dab6912e` · `9b5c19de501b1985da01ddfc9c646d3c` · מטא `aa247fb211e2fec0454cb457dd4fc86d` · 17,732 | **v6 פעילה** · `aaded9e9-a0c2-4654-b66b-7575be53da96` · `98d4d88e16d2ec5f70dac6e5a7f98ea5` (`b29d2c5f…`) · מטא `f4e5216a8eb44645ea0978b35161a82e` · 17,885 · sup=5. v5 לא פעילה |
| קודקס #4 `publishing_conventions` | `26b473b72d55c57153c6678543d25094` · 72,651 · ‏`updated_at` 10.11 11:45:14 | `f39efab93a4d4bfa851586d4fc4259f5` (`d98c9a71…`) · 72,978 · ‏`updated_at` 11.11 04:32:42.013 |
| קודקס #9 `branches_deploy` | `6cee6559506bba1be4f1e71a86693285` · 2,780 · 23.9 19:36:29 | `8d87b8459f2fec3c25f9bf7cea443d3b` (`e2e955af…`) · 3,079 · 11.11 04:32:42.013 |

לכל אחד מארבעת החוקים יש עכשיו גרסה פעילה אחת. הגרסאות המקסימליות הן 4, 18, 8 ו־6. שום שורה לא נמחקה.

### 15.3 BEFORE / AFTER — טביעות אצבע של כל המסד
| טביעה | BEFORE | AFTER | הצפוי (14.3) |
|---|---|---|---|
| `rules87` | 87 · `fae24986b558ee63c5f2cdf9b7c799a6` | 87 · `44fc87f0d88b00ddb2aaa880d287b615` | `44fc87f0…`, תואם |
| שורות חוקים | 468 | 472 | 472, תואם |
| `nodes` (סה״כ) | 6,701 | 6,705 | +4, תואם |
| `codex_all` | 35 · `efdb5db737d547f9e3e849d7576036b5` | 35 · `8fb398dfe9c1260396433f5c56318a75` | `8fb398df…`, תואם |
| specs | 10 · `ee0bbd8e…` | ללא שינוי | ללא שינוי |
| PLAN37 | 618,963 · `c06a461d…` | ללא שינוי | ללא שינוי |
| 2,894 מילים | `09b4e65a…` | ללא שינוי | ללא שינוי |
| `admin_suggestion_decide` | `12961a8c…` | ללא שינוי | ללא שינוי (SQL 11 לא הורץ) |
| פונקציית הטריגר | `56b90b0a…` | ללא שינוי | ללא שינוי |

**בדיקות האחרי (14.5):** P1 עבר · P2 עבר · P3 עבר · P4 עבר (חלון Raziel של v4 כולל ״אישור מפורש״ ו־2029) · P5 לא רלוונטי, כי לא הייתה חריגה. ביומן אין רשומות חדשות מאז ההרצה (נבדק ב־04:33:07).

### 15.4 מה ההרצה שינתה בפועל, ומה לא
* **השתנה:** שש שורות טקסט ומטא־דאטה. ארבע גרסאות חדשות נוספו, ארבע גרסאות הבסיס כובו ונשמרו כהיסטוריה, ושני גופי קודקס עודכנו. מעכשיו סוכנים ו־Raziel קוראים את נוסח ההרשאות החדש: אישור מפורש לכל מיזוג ולכל פריסה, ואין הרשאה עומדת.
* **לא השתנה:** קוד, פריסה, alias, דגלים, ‏RLS, הרשאות במסד, פונקציות, ‏specs, ‏PLAN37 והמילים.
* **CI:** בדיקת ה־G1 קוראת קובץ baseline מהמאגר ולא את המסד, ואף workflow לא מריץ אותה. אין workflow שקורא גרסאות חוקים חיות. ההרצה לא אמורה לשבור CI.
* **סטייה בתיעוד (DRIFT) עד שיאושר מיזוג:** ב־`main` ‏`f250da9f7` עדיין כתוב v17, v3, v7 ו־v5 בקבצים `CLAUDE.md`, `AGENTS.md`, `AGENT_HANDOFF.md`, `SOD1820_MASTER_OWNER_INDEX.md` ו־`SOD1820_MASTER_ROADMAP.md`. התיקון נמצא בקומיט המקומי `a174089be` (15.6). דחיפתו ומיזוגו דורשים אישור. עד אז, המקור הקובע הוא החוקים במסד.
* **טקסט מיושן בפונקציה:** `admin_suggestion_decide` עדיין כותבת ״AUTO_RELEASE_NOW under deploy_on_request v2״, עד ש־SQL 11 יאושר. ב־v4 ‏AUTO_RELEASE_NOW מוגדר ככינוי ל־READY_FOR_APPROVAL, ולכן זה לא מעניק הרשאה.
* **חלון ה־rollback פתוח עכשיו:** `19e_` (SHA-256 `a1bbb3c2…6861`) תקף כל עוד שש השורות נשארות במצב שהוחל. הוא **לא מאושר ולא הורץ.**

### 15.5 החלטת השם ״הצופן בסרטים״ — מה עודכן
| מקום | מה נעשה |
|---|---|
| `pr1296-preserved/docs/2029-post-connections-contract-20261110.md` | השם הוחלף ל״הצופן בסרטים״, ונוספה שורה: «Collection name confirmed by ZURIEL on 2026-11-11: «הצופן בסרטים», the existing category of posts 5003 and 5004. No new series or category; data unchanged.» ‏השם האחר לא מופיע במסמך |
| `pr1296-preserved/footer-contract-docs-only.patch` | נבנה מחדש מהמסמך המעודכן. חל נקי על `origin/main` ‏`f250da9f7` (נבדק באינדקס זמני) |
| `pr1296-preserved/provenance/…original-at-a377d0237.md` | העותק המדויק מראש ה־PR (blob ‏`16b4c3aa…`), **היסטוריה בלבד**. כך גם `patches/0001–0003` ו־`pr1296-full.diff` |
| `README.md` ו־`FINDINGS.md` של התיקייה | F5 סומן ״הוכרע״. נוסף F9 (התווית הפתוחה). ה־MANIFEST נחתם מחדש |
| הדוח | שורות ההחלטה הפתוחות (0.2, שאלה 2, 14.1 ו־14.10) עודכנו ל״הוכרע: ״הצופן בסרטים״״. בסעיפים 0, 12 ו־13 נשארו ציטוטים של טיוטת #1296, כהיסטוריה בלבד |
| נתונים | **לא שונו.** 5003/5004 נשארים עם categories = [מימד חמש, הצופן בסרטים]. לא נוצרו סדרה או קטגוריה |
| הענף | `contentSeries2029Identity.js` וחוזה Content Foundation כבר משתמשים ב״הצופן בסרטים״. לא נדרש שינוי |

### 15.6 patch ‏0001 — קומיט מקומי
| שדה | ערך |
|---|---|
| קומיט | `a174089be` «Pointers after SQL 10 (applied and verified 11.11.2026): v4/v18/v8/v6», מעל `6ab74289f` |
| קבצים | `AGENTS.md`, `AGENT_HANDOFF.md`, `CLAUDE.md`, `SOD1820_MASTER_OWNER_INDEX.md`, `SOD1820_MASTER_ROADMAP.md`, `scripts/test-g1-agent-routing-smoke.mjs` (13+/13−) |
| בדיקות (Node 24.21.0, מקומי) | `test-g1-agent-routing-smoke` ‏18/18 · `test-legacy-retired` ‏PASS · `test-one-tree-content-contract` ‏79/79 · `git diff --check` נקי · שתי המחרוזות המוגנות (`dpl_46k9…`, ״2029 Production cutover״) נשארו ב־`CLAUDE.md` וב־`AGENTS.md` |
| מצב | **לא נדחף** (`ls-remote` = 0). מול `main` ‏`f250da9f7`: שלושה קומיטים קדימה ושלושה אחורה, ו־`merge-tree` נקי |

### 15.7 פתוח להחלטה
1. **התווית ב־`src/components/experience2029/LetterAnatomyGolden2029.jsx`, שורה 16** (גם ב־`main` וגם בענף), כותרת קטנה ברכיב ״אנטומיית אותיות״ שמשתמשת בשם הלא מאושר. **לא שונתה**, כי לא ברור שהיא מתייחסת לאוסף של 5003/5004. אם ההחלטה חלה גם עליה: שינוי של מחרוזת אחת בענף, באישור.
2. **רישום ביומן:** לא נכתבו רשומות BEFORE/AFTER ב־`work_log`, כי כתיבה ליומן לא אושרה. הדיווח נמצא כאן ובשיחה. אם רוצים אותו ביומן, צריך אישור, ואז אכתוב שתי רשומות פסיביות ל־ZURIEL.
3. **SQL 11** (`a43b12ca…`): מומלץ עכשיו, אחרי ש־SQL 10 אומת. דורש אישור נפרד.
4. **דחיפת הענף ו־PR** (שלושה קומיטים: `921a3c150`, `6ab74289f`, `a174089be`): דורשים אישור. מיזוג דורש אישור נוסף.
5. ‏`19e_` (מותנה) ושאר קובצי ה־SQL (20–50): בנפרד.

### 15.8 דוח מסירה (§0.5)
| שדה | ערך |
|---|---|
| בוצע | preflight S1–S6; בדיקת העברה בקריאה בלבד; **הרצה אחת של `10e_`**; אימות P1–P4 וטביעות האצבע; אימות הטקסט שהורץ ב־`pg_stat_statements`; החלטת השם בתוצרים; קומיט מקומי `a174089be` עם בדיקות; סעיף 15 בדוח; חבילה v4 |
| לא בוצע | ניסיון חוזר, rollback, ‏`19e_`, ‏SQL 11, יומן, PLAN37, דחיפה, PR, מיזוג, פריסה, שינוי בתווית ה־UI, שינוי ב־#1296 |
| מאגר / ענף | `zuriel337/sod1820` · `ccr-b2565041-d94syf` · בסיס `01d96b627` · ראש `a174089be` (לא נדחף) · `origin/main` = `f250da9f74f64e701dc70a16258186e555edcef7` |
| DB | **שונה**: שש שורות ב־`linswmnnkjxvweumprav` (15.2). APPLIED + VERIFIED |
| Production (אתר) | **לא שונה.** אין פריסה ואין alias |
| CI | לא רץ, כי לא נדחף דבר. הבדיקות המקומיות עברו |
| הצעד הבא המומלץ | (1) אישור ל־SQL 11; (2) אישור לדחוף את הענף ולפתוח PR של שלושת הקומיטים, כדי לסגור את הסטייה בתיעוד; (3) החלטה על התווית; (4) אם רוצים, אישור לרשומות יומן |
