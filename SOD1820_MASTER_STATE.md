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

> **סטטוס חוק-הניהול:** `APPROVED` + `CANONICAL` (החלטת צוריאל, 10.8.2026; סעיף 15 נוסף 20.8.2026). התוספת אינה משנה שום החלטה קיימת אחרת במסמך.

---

## 0-A. RESEARCH STUDIO v1 — ARCHITECTURE DECISION (24.8.2026)
> **STATUS: APPROVED by ZURIEL Human-Gate · DOCUMENTED on Draft PR #187 · not merged/deployed by this decision alone.**
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

### PRIORITY DECISION
`ACTIVE_NOW` עובר ברמת-הניווט ל-**Research Studio Foundation**. `WS-GEMATRIA-CORPUS-PACKAGES` אינו מבוטל ואינו SUPERSEDED; הוא נשאר workstream יסודי/תלות ומתחבר כ-Number/Gematria source לתוך Research Studio. סדר הבנייה המאושר: Universal Finding → Global Workspace → ELS Lens integration → Number/Gematria Adapter → Discovery adapters → Findings Workspace UX → Judgment Surface → legacy capability reconciliation → Depth/Research Universe.

### IMPLEMENTATION STATE (24.8)
- PR #185: merged/main — ELS state + Matrix + 2D/Layered/3D + Verse integration.
- PR #186: BUILDING/DRAFT — exact Journey + Focus/Fit + add-Finding cross bridge.
- PR #187: DOCS/DRAFT — architecture + Universal Finding contracts.
- PR #188: BUILDING/DRAFT stacked on #186 — Universal Finding adapter over existing ResearchProvider + explicit `📌 למחקר`.
- No merge/deploy to main is authorized by this Master-State entry itself.

### NEXT ACTION
Human Preview #188 → verify canonical Number/Gematria callable path → add Number/Gematria adapter. Do not build a parallel Workspace/Graph/engine and do not calculate gematria from memory.

### CHANGE LOG ENTRY — 24.8.2026
- **מה השתנה:** Research Studio v1 + Universal Finding + Layered/3D first-class + ResearchProvider reuse + priority order documented in §0-A and Roadmap v5.2 candidate.
- **למה:** Human-Gate ZURIEL approved the architecture; live state after PR #185 and Drafts #186/#188 made Roadmap v5.1 stale.
- **מה הוחלף:** navigation-level `ACTIVE_NOW=WS-GEMATRIA-CORPUS-PACKAGES` is superseded by `WS-RESEARCH-STUDIO-FOUNDATION`; the corpus workstream itself is preserved as a dependency/source, not deleted or superseded.
- **סטטוס:** `APPROVED` architecture/priority decision · `DOCUMENTED` on Draft PR #187 · product code remains `BUILDING` on Drafts #186/#188 · no merge/deploy implied.



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
| 29 | 20.8.2026 | **§19 נכתב לראשונה לגוף-המסמך (P1 sync 19.8 החריג אותו בכוונה):** §19-A γ שתי-שכבות-ממצא (Atlas=`relation_evidence`/Ledger=`research_objects`/מנוע=מחסנית-עצמו, קישור-string `source`/`source_ref`, אפס-DB-change) — מטמיע `docs/decisions/2026-08-20-gamma-two-layer-atlas-ledger.md` (`7985e0ce`, ענף `claude/raziel-capabilities-audit-h5k9ww`, לא-במיין) · §19-B SOD1820 Universal Research Contract v1.0 (18 סעיפים, verbatim, Entry-Context→Focused→Method-Preserving→Calculation→Value-Scan→Zero-Nav→Finding→One-Tree→Fact-separation→Contextual-Intelligence→External-Research→Raziel→Human-Gate→Privacy→Premium-as-gate→Future-proof→Canonical-Architecture-Principle→Test-Case) | GPT/צוריאל: לעדכן SSOT+Roadmap לפי חוזה מאושר; לסגור את שער `WS-GAMMA`/OPEN-GATE#6 (§19→γ) | §19-old (שתי-שכבות-ממצא, לא-נכתב-מעולם לגוף) → §19-A/γ | `APPROVED` (documentation-only) · §19 (החלטות-זהות/OD-F10a, Change-Log #26) **נשאר-פער-נפרד, לא-נכתב, לא-הומצא** · אפס DB/schema/migration/deploy |

---
*בסיס-עובד v2, מעודכן 20.8.2026 (§19 A/B). נשמר בענף `claude/raziel-capabilities-audit-h5k9ww` (מקור γ) + נכתב לגוף-המסמך על ענף `claude/els-function-inventory-86klre` (סשן זה). שינויי-DB בסשן זה: **אפס** (documentation-only). שינויי-DB היסטוריים (סשנים קודמים): (1) הקפאת cron job 27 (`metatron-nightly`, הפיך); (2) **H-1** — RPC `fn_persist_discovery` + מועמד-בדיקה-אחד (878=משיח↔דבר-מתוך-דבר, status=`candidate`, ממתין ל-Human-Gate). מלבדם READ-ONLY. שום `INFERRED` אינו עובדה; שום שיטה לא-הופעלה; שום convergence היסטורי לא-חובר/קודם/נמחק; שום קנון לא-שונה (מלבד §0 governance + §8 FREEZE + §10 חזון + H-1 front-half + §19 A/B התיעוד-הזה).*
