# יישור ממוקד וסגירת בסיס — 12.11.2026 (קריאה בלבד) · כולל סבב השלמה 3

> תוספת למסירת הביקורת הקיימת ([HANDOFF-20261111.md](../HANDOFF-20261111.md), §8). זה לא מקור אמת ולא קובץ MASTER.
> אין כאן הרצת SQL שמשנה מצב, שינוי חוק חי, שינוי הרשאות, מיזוג או פריסה.
>
> **בסיס:** `origin/main` = `aa0f6bc82` (Production חי: `dpl_FEzrHi2GLSpdHPN1cJDu6rhXtswZ`). נבדק שוב ב־`git fetch` לפני הכתיבה בסבב 3 — לא השתנה.
>
> **#1321:**
> - ההתאמה שהתבקשה — בראש `6352be19d`: ‏157 קבצים, **0 חפיפה** עם הענף הזה.
> - הראש הנוכחי — `c45dd3740` (נוספו `ab83e6b8c` ו־`c45dd3740`): ‏160 קבצים. פירוט ב־§4.
>
> **נתוני מסד:** SELECT בקריאה בלבד על `linswmnnkjxvweumprav`, ‏12.11.2026. מה שלא נבדק מסומן בכל סעיף.
>
> **סבב 3** (אחרי ביקורת Codex על `0a5882774`):
> - עודכנו §§0, 1, 3, 4, 5, 6, 7, 8, 9, 10.
> - נוספו: §11 (פסקי ההפניות והיורשים), §12 (CL-03), §13 (קבלה מחייבת לאכיפה), §14 (מטריצת CL-13), §15 (מסירה לסשן הביקורת).
> - ה־ledger עודכן באותו סבב.
>
> **סבב 4** (הכרעות ZURIEL ב־CL-13 ותיקוני Codex, 12.11):
> - עודכנו §§0, 8.1, 9, 12, 14, 15. נוסף §16 (נוסחים מוצעים).
> - **אין שינוי חי, קוד מוצר, הרשאות, מיזוג או פריסה.**
>
> **חלוקת הכתיבה (ZURIEL, 12.11):**
> - **סשן החוזים (CT):** משמעות החוזים, הבעלות ומטריצות ההתנהגות הנדרשות.
> - **סשן הביקורת הראשית (MA):** **הכותב הטכני היחיד** של G1, של משמרי המסד ושל תיקוני ה־Runtime.
> - **Codex:** מרכז ומבקר.
> - **ZURIEL:** כל הכרעה וכל שינוי חי.

## 0. תיקון למסירות קודמות שלי (גילוי נאות)

1. **מספרי "תלויות שבורות" מ־12.11 בוטלו.** הספירה ההיא (19 הפניות ב־12 חוקים) לא ניתנת לשחזור מהשורות החיות (למשל `big_number` אינו מזכיר את `essence_appendix` בשום מקום בטקסט או ב־metadata). בהגדרה אחת ברורה (מזהה חוק שלם בטקסט או ב־metadata של גרסה **פעילה**, שליעדו אין גרסה פעילה) התוצאה היא **55 הפניות ב־31 חוקים אל 38 חוקים שפרשו**. הפירוט: [retired-reference-ledger.txt](retired-reference-ledger.txt).
2. **"אין יורש רשום" — שגוי.** לכל החוקים שפרשו שנבדקו יש `compaction_v1` + `owner_routing` עם `canonical_owner` ו־`archive_reason`. רק **שלושה** פרשו בלי מיפוי: `agent_onboarding_law`, `corpus_admission_lifecycle_law`, `meshulash_kadmi_law`.
3. **סעיף 5 בטבלת ההחלטות (בעלות על `research_contributions`) — ההנחה שגויה.** ראו §1.
4. **סעיף 8 (החלפת בעלים של `research_object_identity_invariant_law` מקובץ V1 לחוק) — נסוג.** לא הוכחה התנגשות אחריות. ראו §2.
5. **‏CL-02 נסוג.**
   - קראתי במלואו את `writer_material_home_law` v6 (node `918e5e51…`, ‏md5 `b8be155d…`, ‏15,377 תווים). **אין בו הפניה** ל־`research_contribution_law`.
   - ההנחה באה מספירת ה־19 שבוטלה (פריט 1). §1 פריט 2 תוקן.
6. **"הבדיקות מוכיחות אכיפה" — טענה מוגזמת.** בדיקות G1 שלי הן בדיקות CI על תצלום מתוארך:
   - הן לא רואות כתיבה ישירה למסד, ולא סטייה חיה אחרי 12.11.
   - `ownerResolves` מקבל **כל** מחרוזת `project_codex.*`, גם slug שלא קיים.
   - הוא מקבל גם **כל** קובץ קיים, גם קובץ שאינו רשום כבעלים (`scripts/lib/g1LawsSnapshotRules.mjs:24–26` — כך גם בראש #1321, ‏`c45dd3740`).

   זו אינה אכיפה מלאה. הקבלה המחייבת — §13.
7. **E5 ו־E4 שלי — לא מספיקים:**
   - **E5** ("BEFORE DELETE שמסרב ל־`type='rule'`"): טריגר ברמת שורה (`BEFORE DELETE … FOR EACH ROW`) **אינו נורה ב־`TRUNCATE`**. נדרש טריגר `BEFORE TRUNCATE` ברמת statement, או שלילת ההרשאה.
   - **E4** ("להוסיף `description` לרשימת העמודות"): ההוספה רק גורמת לטריגר להיקרא. דרושה גם לוגיקה בפונקציה שמסרבת לשינוי `description` — בשורה פעילה באותה גרסה, וגם בשורת היסטוריה.
   - סשן הביקורת מתקן ומוכיח זאת טכנית: D12, ‏D12b, ‏D14 ו־D15 בהצעה שלו (§13).
8. **"ארבעה ענפים פעילים עורכים את `live-contracts-2029.yml`" — הסקה שגויה.**
   - קיום ענף אינו הוכחה לבעלות פעילה. ידוע רק ש־#1321 נוגע בקובץ. מצב הענפים האחרים לא נבדק כבעלות.
   - המשפט הועתק לרשימת הביקורת (`foundation-closure-list.md` §1.G, שורת CL-17), וצריך לתקן אותו גם שם.
9. **"יורש רשום" אינו הוכחה שהסמנטיקה עברה.** בסבב 3 קראתי במלואם את החוקים המושפעים ואת סעיפי היורש. מתוך 14 ההפניות:
   - 4 נשארות היסטוריה;
   - 2 חושפות פער סמנטי;
   - 2 מוחלפות **ליעד אחר מהרשום** (§11).
10. **נמצא חוק רביעי שפרש בלי מיפוי:** `metatron_brain_persona_lens_law`. אין חוק פעיל שמפנה אליו, ולכן הוא לא היה ב־ledger (§7.0, ‏§11.3).
11. **(סבב 4, Codex) §E אינו מ־11.11.**
    - "Privacy lifecycle primitives … before opening longitudinal … memory capabilities" קיים ב־`foundation_closure_protocol_law` **מאז v3 (11.9.2026)**, ולא השתנה עד v8. אימתתי את כל שמונה הגרסאות.
    - הסעיף מתנה **פתיחה** של יכולת, ואינו הוראת השבתה.
    - ההשהיה של היום היא **ההכרעה הנוכחית של ZURIEL** (D-CL13-1, ‏12.11) (§14.0, ‏§14.2).
12. **(סבב 4, Codex) `graph_privacy_foundation_law` §9 ("private = טרם אושר") חל על `research_objects` בלבד.** הוסר מהמטריצה. גם §7 של אותו חוק (פרטיות בגרף) כבר אינו מקור בה.
13. **(סבב 4, Codex) "אין חשבון, ולכן אין מסלול הסכמה" — שגוי.** הסכמה אפשרית בוואטסאפ גם בלי חשבון אתר. המטריצה מפרידה עכשיו בין אימות שולח, הסכמה וקישור חשבון (§14.2).

## 1. `research_contributions`: מה כבר מוגדר, ומה הפער שנותר

**מוגדר היום (נקרא במלואו מהשורות החיות):**

| מקור | מה הוא קובע | הפניה |
|---|---|---|
| `research_workspace_law` v5, תוספת v3, סעיף 8 | `research_contributions` הוא **צינור קלט**, לא מערכת ממשל שנייה; הנתונים הקיימים ממשיכים לאחסן קלט קהילתי/מחקרי; אוצר מילים מקומי של moderation/`research_state` אינו גובר על Truth Axes; מעברי candidate/approved/canonical/published לפי בעלי Truth/Human-Gate | `nodes` rule `research_workspace_law`, v5 (סעיפים 7–8) |
| `research_workspace_law` v5, סעיף 7 | משטחי תורם/חוקר הם **עדשה, לא מאגר** | שם |
| `docs/2029-data-placement-retention-crosswalk.md` (מלווה את Intake v13) | `research_contributions` = `KEEP_OWNER` ("community/research contribution input pipeline … never as replacement Truth store"); `channel_updates` = `KEEP_SOURCE` | שורות 28–29 |
| `writer_material_home_law` v6 (תחת Intake, `SOD1820_MASTER_OWNER_INDEX.md:95`) | סעיף 5 "NO WHATSAPP TREE" (dedup/lineage לפני חילוץ); סעיף 23 "REFERENCE, DO NOT COPY" — הקרנות חייבות להצביע דרך `source_ref` (`channel_updates:<id>`), לא לשכפל את גוף הודעת הוואטסאפ | `nodes` rule, v6 |
| `research_intake_foundation_contract_law` v13 סעיף 10 | לפני כל טבלה / נתיב כתיבה קבוע חדש: לזהות בעלים ולסווג `CANONICAL_OWNER / SOURCE_INGRESS_PROVENANCE / PERSONAL_STATE / OPERATIONAL_RUNTIME / LEGACY_COMPATIBILITY`; `EXTEND_EXISTING` חובה כשבעלים יכול לשאת את הסמנטיקה | שם |

**למה `research_contribution_law` v9 פרש (נקרא מ־metadata):** `compaction_v1.classification = LEGACY_RETIRE_OR_SUPERSEDE`, `archive_reason = "existing research_contributions pipeline retained; governance/lifecycle now explicitly subordinate to Workspace v3 + Truth Axes"`, `canonical_owner` ו־`owner_routing.canonical_owner` = `docs/research-studio-v1-contract.md`, `owner_family = research_os`, `resolution = RESOLVED`, G2, 15.9.2026. כלומר: **הצינור נשמר במכוון; רק הממשל שלו הועבר ל־Workspace + Truth Axes.** שמו של הקובץ ("v1") אינו עילה לפרישה, ואיני מסיק ממנו שהבעלים אינו תקף.

**הפער שנותר (שלושה פריטים, מצומצמים בהרבה ממה שהצעתי):**

1. **ניתוב:** ב־`SOD1820_MASTER_OWNER_INDEX.md` אין שורה שמנתבת משימת "צ'אט קהילה / פורום / `research_contributions`" אל `research_workspace_law` §8 + `writer_material_home_law` + ה־crosswalk. (נבדק: `grep -i research_contributions` על ה־Owner Index = 0 תוצאות.) סוכן שמתחיל מאפס מגיע ל־`research_contribution_law` שפרש. זה פער ניתוב — תיקון בשורה אחת במסמך, **לא גרסה חדשה של Intake**.
2. ~~**שרשרת הפניות**~~ — **נסוג** (CL-02; §0 פריט 5). `writer_material_home_law` v6 אינו מפנה ל־`research_contribution_law`. אין צורך בתיקון טקסט.
3. **שאלת חוזה פתוחה אמיתית — הקרנת קבוצות לצ'אט (v2, טרם הוחלה):** ההקרנה שהכנתי (`claude/group-chat-sync-20261112`) כותבת שורת צ'אט ב־`research_contributions` עם **עותק של גוף ההודעה** (+ קישור מדיה) וקישור מקור (`target_type='channel_update'`). `writer_material_home_law` §23 קובע "הפניה, לא העתקה" להקרנות של Topic/Researcher/World. הצ'אט קורא את גוף ההודעה ישירות מ־`research_contributions` (`community_feed_page`), ולכן העתק הוא המצב היום. **צריך החלטה — המלצה אחת מנומקת ב־§12: חריג מתועד** (שורת צ'אט היא משטח הקרנה שחייב להכיל טקסט, עם `source_ref` מחייב) **או** קריאה-בהפניה (שינוי ב־RPC). עד ההחלטה: **אל תחילו את v2.** זה הפער שהצדקת Intake v14 נשענה עליו, ואם יוחלט על חריג — הוא ייכתב בגרסה הבאה של `writer_material_home_law` (הבעלים של הנתיב), לא ב־Intake.

**המלצה:** לא להציע Intake v14 כרגע. פעולות: שורת Owner Index (מסמך בלבד, CL-01), והכרעה ב־CL-03 לפני v2 (§12).

**נבדק בסבב 3:** האם §23 חל על שורות צ'אט — §12. החוק נקרא במלואו (v6).

## 2. היררכיית הבעלויות לא משתנה — הוכחת התנגשות לפני כל שינוי

לא הוצע ולא יוצע כאן איחוד או פרישה של חוק. בדיקות ההתנגשות:

| משפחה | בעלים | האם נטענת אחריות כפולה? | ראיה |
|---|---|---|---|
| גימטריה | `canonical_methods_registry_law` v6; `engine_governance_registry_authority_law` v1; `project_codex.gematria_engine` | **לא.** החוק השני מצהיר על עצמו: "חיזוק תפעולי של `canonical_methods_registry_law` v2 — לא רישום מקביל, לא טבלה חדשה" | טקסט `engine_governance…` (HG-E ו־§ הפתיחה). שים לב: הציטוט מצביע על v2 בעוד החי v6 — הפניית גרסה ישנה, לא התנגשות |
| מחקר | `research_strategy_layer_law` v17; `research_workspace_law` v5; `research_object_identity_invariant_law` v2 (בעלים רשום: `docs/research-studio-v1-contract.md`) | **לא.** `research_workspace_law` §12 מחלק במפורש: "`research_object_identity_invariant_law` remains a direct live invariant … `workspace_layout_standard` remains the scoped adaptive-layout child. Everything else should route through this Workspace owner, Research Strategy, Intake, Truth…" | `research_workspace_law` v5 §12 |
| קליטה | `research_intake_foundation_contract_law` v13 | ילדים: `writer_material_home_law`, `corpus_admission_foundation_v1`, `raw_vs_curated`, ועוד — כולם מתחת לאותו בעלים | snapshot `G1_LAWS_ACTIVE_SNAPSHOT_20261112.txt` |

מסקנה: **היעדר תלות מוצהרת אינו אומר שאין בעלים** (בכל 87 החוקים יש בעלים רשום; 0 בלי). **קובץ בעלים בשם V1 אינו פסול**: ל־5 חוקי העיצוב יש החרגה מאושרת (Decision 5, ZURIEL 11.11) שמיושמת בהצעה 24; הקובץ `docs/research-studio-v1-contract.md` לא נכלל בשום הצעה ונשאר כפי שהוא. אין איחוד אוטומטי של אחריות אסטרטגיה / סביבת מחקר / קליטה / מנועים.

## 3. בעלות, תלות, הפניה היסטורית — והצרכנים (לא "קוסמטי")

סיווג 55 ההפניות ([ledger](retired-reference-ledger.txt)): `HIST` 26 · `EXT` 12 · `FUNC` 10 · `REL` 7. פעולה: `KEEP` 24 · `REPOINT_TEXT` 14 · **`REPOINT_CONSUMER` 7** · `NO_SUCCESSOR` 5 (3 חוקים) · `MOOT_AFTER_30` 3 · `REPOINT_EDGE` 2.

**אחרי סבב 3** (§11): `KEEP` 23 · `KEEP_HISTORY` 8 · `REPOINT_SUPPORTED` 9 · `REPOINT_OTHER_TARGET` 2 · `SEMANTIC_GAP` 2 · `REPOINT_CONSUMER` 7 · `MOOT_AFTER_30` 3 · `REPOINT_EDGE` 1.

**צרכנים שקוראים מזהה חוק שפרש בפועל (ולכן אין לסווגם קוסמטיים):**

| צרכן | מה הוא עושה | התנהגות היום | יעד |
|---|---|---|---|
| DB `fn_metatron_status` | `exists(select 1 from nodes where rule_id='never_silent_metatron_law' and is_active)` | `guards.never_silent` = **false תמיד** | `raziel_companion_layer_law` |
| DB `fn_number_dossier`, `admin_candidate_from_researcher`, `fn_generate_convergence_candidates` | `fn_rules_snapshot(array[...])` על מזהים שפרשו | `fn_rules_snapshot` מחזירה **רק פעילים** — מזהים שפרשו נושרים בשקט. **אומת בקריאה:** בקריאה עם 5 המזהים של `fn_number_dossier` התוצאה היא `[]` (כולם פרשו); וב־`fn_metatron_status` הביטוי `exists(... never_silent_metatron_law ... is_active)` מחזיר `false` | `reality_graph_law` (+ `experience_governance_foundation_v1_law` ל־`lens_law`) |
| `src/lib/research/researchW2ExecutorsBase.js` (×4) + `researchW2FoundationHardening.test.js:557` | `owner: 'unified_graph_law'` נשמר ברשומות ומאומת בבדיקה | תווית בעלים ישנה נשמרת בנתונים (provenance) | `reality_graph_law` — שינוי מחייב החלטה (נתונים קיימים) |
| `supabase/functions/wa-raziel/index.ts:414` | טקסט פרומפט: `(never_silent_metatron_law)` | מילולי בפרומפט | פריסה של פונקציית Edge נדרשת |
| `supabase/functions/ai-analyze/index.ts:4248,4253`, `research-run/index.ts:436` | `owner_ref: "… platform_tiers_law v4 + ai_quota_law v3"`, ו־`research_workspace_law v5` | מחרוזות provenance/replay — **ישנות כבר היום** (`platform_tiers_law` חי = v5; `ai_quota_law` פרש) | **קבצים ש־#1321 עורך — לא נוגעים; תיאום עם M0** |
| `edges` (`extends_rule`) | `graph_privacy_foundation_law` v1 → `entity_structure_law`, `unified_graph_law` | קשת גרף שמצביעה על חוק שפרש | שינוי שורה ב־`edges` (DB) |
| DB `fn_rls_grant_audit` | הודעת טקסט מצטטת `rls_client_read_protocol` | הודעה בלבד | פונקציה — DDL באישור |

הערות בקוד (`HumanDateInput.jsx`, `SubscribeGate.jsx`, `src/lib/gematria.js` ועוד) הן הערות בלבד.

**שלושת החוקים שפרשו בלי מיפוי** — דורשים החלטה, לא תיקון טקסט: `agent_onboarding_law` (נטען ע"י `inter_agent_coordination_law` כ"הרחבה", וע"י `live_state_resolution_law` כ"היסטורי, אינו מופעל מחדש"), `corpus_admission_lifecycle_law` (יורש טבעי: `corpus_admission_foundation_v1`, לא רשום), `meshulash_kadmi_law` (`compositeMethods.js` קורא לו "locked alias" של קדמי; יורש טבעי: `canonical_methods_registry_law`, לא רשום). **המלצה:** להוסיף מיפוי metadata לשלושתם (שינוי metadata בלבד, באישור) — לא להפעיל מחדש. **סבב 3:** שלושתם נקראו במלואם. הצעת יורש לכל אחד — §11.3, ונמצא גם רביעי.

**סבב 3:** 14 ההפניות נקראו במלואן, יחד עם סעיפי היורש (§11.1). הפסקים:
- 6 נתמכות;
- 2 ליעד אחר מהרשום;
- 4 נשארות היסטוריה;
- 2 הן פער סמנטי.

ב־ledger עודכנה עמודת `action`, ונוספו שתי עמודות: `r3_target` ו־`r3_support`.

## 4. מטריצת השפעה מול #1321 — בראש `6352be19d` (המבוקש) ובראש `c45dd3740` (הנוכחי)

**סבב 3 — ההתאמה:**
- **בראש `6352be19d`** (המבוקש): #1321 משנה 157 קבצים, ו**אינו חופף** לענף הזה — 0 קבצים.
- **בראש הנוכחי `c45dd3740`:** נוספו `ab83e6b8c` ("G1 unified extension…") ו־`c45dd3740` ("runners fail on unexpected outcomes; closure list v2"). ‏160 קבצים, וחפיפה של 4. כל הארבעה הם קובצי G1 שהעברתי (§15):
  - שני קובצי `audits/` — זהים בבתים;
  - שני קובצי הקוד — הורחבו שם.
- **בשני הראשים #1321 אינו נוגע ב:** Owner Index, ‏ROADMAP, ‏MASTER_STATE, ‏CLAUDE.md, ‏AGENTS.md, ה־crosswalk, ‏`src/lib/worlds.js`, ‏`test/admin-system-health-contract.test.mjs` (נבדק ב־`git diff --name-only`).
- **בשני הראשים #1321 כן נוגע ב:** `.github/workflows/live-contracts-2029.yml`, ‏`public-reading-deploy/transport.js`, ‏`supabase/functions/_shared/materialGate.js`, ‏`ai-analyze`, ‏`research-run`, ‏`wa-raziel`.

**תיקון:** בסבב 2 כתבתי ששלושה ענפים נוספים "פעילים" בקובץ ה־workflow. זו הייתה הסקה מעצם קיום הענף, והיא נסוגה (§0 פריט 8).

**הטבלה למטה חושבה בראש `01e590f84`.** בשאלה "האם #1321 נוגע בקובץ", השורות שלה תקפות בשני הראשים. שני סייגים:
- מספרי השורות בקבצי ה־Edge עשויים לזוז.
- שורת "הרחבת G1" כבר לא כאן — היא עברה ל־#1321 (§15).

| הצעה | מה משתנה (DB בלבד, טרם הורץ) | קבצים / בדיקות שמזכירים את החוקים (בראש #1321) | #1321 נוגע בהם? | התאמת תיעוד / התנהגות |
|---|---|---|---|---|
| **20** | `platform_tiers_law` v5→v6 (§19 "NUMBER VISIBLE, DEPTH GATED"); `canonical_methods_registry_law` v6→v7 (§26 "VALUE BESIDE A GEMATRIA MATCH ROW") | נעילות גרסה בתיעוד: `OWNER_INDEX:167,127`, `ROADMAP:186`, `STATE:392`. `scripts/test-g1-agent-routing-smoke.mjs:212,237` נועלים registry=6 אך קוראים **baseline סטטי** (לא חי) → לא נשברים. מחרוזות provenance ב־`ai-analyze/index.ts:4248,4253`, `research-run/index.ts:436`, `field-router`, `journey-message`, `lab-teacher`, `number-researcher`, `els-search-bridge`, `_shared/materialGate.js` | **כן** — כל קבצי ה־Edge האלה | **תיעוד:** עדכון נעילות גרסה ב־3 קבצי מצביעים. **התנהגות:** אין. מחרוזות ה־Edge כבר ישנות (v4≠v5) — תיאום עם M0 בלבד |
| **30** (אחרי 20) | פרישת `number_page_law` v1, `no_row_without_number_law` v1 (`is_active=false`) | **אפס אזכורים** בקוד/בדיקות/CI/Edge (נבדק ב־`test scripts .github src supabase/functions`) | לא | `MOOT_AFTER_30`: 3 הפניות לשעבר נעלמות. מחייב ש־20 הוחלה ואומתה (הצעה 30 בודקת זאת) |
| **23** | `worlds_color_law` v1→v2; `subscription_funnel_law` v22→v23; `experience_governance_foundation_v1_law` v10→v11; `identity_architecture_law` v1→v2 | נעילות: `OWNER_INDEX:166,193`, `ROADMAP:41`, `STATE:41`; קוד: `src/lib/worlds.js`, `PostFollowBox.jsx`, `WatchButton.jsx`, `notifications.js`, `commandCenter.js`, `EmailVerify.jsx`; בדיקה: `test/admin-system-health-contract.test.mjs` (מזכירה `subscription_funnel_law` — **לבדוק לפני הרצה אם היא נועלת גרסה**); `scripts/test-g1-agent-routing-smoke.mjs` (`experience_governance…` ב־required_rules) | לא | **תיעוד:** 3 נעילות גרסה. **התנהגות:** אין שינוי קוד; בדיקת `admin-system-health` נדרשת |
| **24** | `brand_spelling_law` v1→v2, `canonical_colors_law` v2→v3, `logo_integrity_law` v3→v4, `sod1820_canonical_identity_law` v5→v6 (בעלים V1→V2); `research_workspace_law` v5→v6 (`visual_owner` בלבד) | `OWNER_INDEX:79` (נעילת v5); `src/theme.js`, `systemFrame2029.css` (canonical_colors_law); `scripts/test-g1-agent-routing-smoke.mjs:159,169,186` (V1) — על ראיות שנלכדו (סטטי); `ai-analyze/index.ts:2063,2076,2357`, `research-run/index.ts:400` מכילים `research_workspace_law v5` | **כן** (`ai-analyze`, `research-run`, `src/lib/supabase.js` הערה) | **תיעוד:** נעילת גרסה ב־Owner Index. **התנהגות:** אין; מחרוזות provenance ב־Edge יתיישנו (v5→v6) — תיאום עם M0 |
| **21** | `is_active=false` ל־9 שורות `type='spec'` (לא חוקים) | **אפס** צרכנים של 9 ה־UUID מחוץ לחבילת הביקורת (נבדק בראש #1321) | לא | תנאי חדש: לפני פרישת `f30c0148…` ("תוכנית־אב") — הדרישות שלא מומשו נרשמות ומתועדפות (§7) |
| **הרחבת G1** (חדש, קבצים בלבד) | +4 בדיקות ב־`test-g1-agent-routing-smoke.mjs`, קובץ snapshot מתוארך חדש | הבדיקה כבר מורצת ב־`live-contracts-2029.yml:48` — **ללא עריכת ה־workflow** | לא | ראו §5 |

**אין פתיחת מימוש מקביל בתחומי M0:** שום קובץ ב־`supabase/functions`, `public-reading-deploy`, `src/lib/supabase.js` או ב־workflow לא נערך כאן.

## 5. הרחבת בדיקת G1 ותמונת מצב מתוארכת (סעיף 9) — כולל הוכחה שהבדיקות מסרבות ומאשרות

**קבצים חדשים (לא נגעתי בתצלומים ההיסטוריים של 9.10.2026 ולא ב־workflow המשותף):**
- `audits/g1-agent-entry/G1_LAWS_ACTIVE_SNAPSHOT_20261112.txt` — 87 חוקים פעילים (גרסה, בעלים, משפחה, md5 של הטקסט) ו־44 חוקים שפרשו ושחוק פעיל עדיין מציין (עם היורש הרשום). בלי מפתח שירות, בלי כתיבה למסד.
- `audits/g1-agent-entry/G1_MIGRATION_TABLES_BASELINE_20261112.txt` — 41 הטבלאות שהמיגרציות ב־`supabase/migrations` יוצרות ב־`aa0f6bc82`. **כיסוי חלקי במכוון:** במסד החי 305 טבלאות ב־`public`; טבלה שנוצרה מחוץ למיגרציות לא נראית ל־CI.
- `scripts/lib/g1LawsSnapshotRules.mjs` — פונקציות טהורות (בלי I/O): `validateLawsSnapshot`, `compareLawsSnapshots`, `migrationTableViolations`.
- `scripts/test-g1-agent-routing-smoke.mjs` — +7 בדיקות (18 → 25). הקובץ כבר מורץ ב־`live-contracts-2029.yml:48`; ה־workflow לא נערך. (הנימוק שנכתב כאן בסבב 2, "4 ענפים פעילים עורכים אותו", נסוג — §0 פריט 8.)

**הוכחה — שלושת המקרים, כל אחד עם סירוב ועם אישור (fixtures בבדיקות 20–25):**

| מקרה | נחסם (הבדיקה נכשלת על...) | מותר (הבדיקה עוברת על...) |
|---|---|---|
| **הפניה לבעלים שפרש** (`validateLawsSnapshot`) | בעלים שהוא חוק שפרש; בעלים שאינו קיים; קובץ בעלים שאינו קיים; חוק שפרש בלי יורש רשום (פרט ל־3 הידועים); יורש שפרש בעצמו; חוק-בעלים עצמי שאינו ב־Owner Index | ילד של בעלים פעיל; ילד של מצביע `project_codex.*`; ילד עם קובץ בעלים קיים; חוק שפרש עם יורש פעיל; חוק-בעלים חדש אחרי ששורה ב־Owner Index מנתבת אליו |
| **שינוי חוזה קיים** (`compareLawsSnapshots`, פעיל בין שני תצלומים מתוארכים) | שינוי טקסט באותה גרסה (עריכה במקום); הסרה שקטה מהעץ הפעיל; גרסה שיורדת; העלאת גרסה בלי שינוי טקסט | גרסה חדשה עם טקסט שהשתנה; פרישה עם רשומת פרישה |
| **מבנה חדש** — חוק (`compareLawsSnapshots`) ו־טבלה (`migrationTableViolations`) | חוק חדש בלי אישור רשום; טבלה חדשה במיגרציה בלי `-- OWNER-CHECK:`; בעלים שאינו מתפרש; `NEW` בלי סיווג Intake §10, בלי בעלים או בלי `APPROVAL:<ref>` | חוק חדש שאושר; טבלה עם `OWNER-CHECK: EXTEND_EXISTING <בעלים פעיל>`; טבלה `NEW <סיווג> <בעלים> APPROVAL:<ref>`; טבלה שכבר בבסיס |

**תוצאה:** 25/25 עוברות (18 קיימות, 7 חדשות; בדיקה 19 רצה על הנתונים האמיתיים: 87 חוקים, 44 שפרשו, 0 הפרות; בדיקה 24 סורקת את 429 המיגרציות האמיתיות: 0 טבלאות מחוץ לבסיס). שינוי מכוון של נתוני התצלום האמיתי (בעלים → `no_such_owner_law`, יורש → `-`) גרם להכשלת הבדיקות המתאימות ושחזור החזיר ירוק.

**מה הבדיקות אינן:** (א) לא רואות סטייה חיה אחרי 12.11 — רענון = קובץ מתוארך חדש; (ב) `compareLawsSnapshots` מתחילה לפעול בפועל רק כשיהיה תצלום שני — היום מוכחת בפיקסצ'רים בלבד; (ג) לא רואות כתיבה ישירה למסד (ראו §6).

**סבב 3 — מסירה ותיקון:**
- ארבעת הקבצים שבסעיף הזה הועברו לסשן הביקורת (#1321, ‏`ab83e6b8c`). מעכשיו הוא הכותב היחיד שלהם, והם הוסרו מראש הענף הזה (§15).
- התיאור למעלה נשאר כתיעוד של מה שהוכן ב־`0a5882774`.
- **"הוכחה" כאן פירושה מקרי בדיקה בפיקסצ'רים — אחד שמסרב ואחד שמאשר. זו לא אכיפה מלאה** (§0 פריט 6; הקבלה המחייבת — §13).

## 6. אכיפה: הרחבת המנגנונים הקיימים, והפרדה בין CI ל"כתיבה ישירה"

**מה קיים היום (נבדק חי):**

| שכבה | מנגנון | מה הוא אוכף | מה הוא לא אוכף |
|---|---|---|---|
| DB | טריגר `trg_rule_compaction_integrity_guard_v1` על `nodes` (BEFORE INSERT/UPDATE OF `is_active, metadata, rule_id, rule_version, supersedes_version`) | חוק פעיל: גרסה חיובית, קודמת רציפה, `g3_disposition_v1`, `compaction_v1.canonical_owner` ו־`owner_routing.canonical_owner` לא ריקים, **גרסה פעילה אחת** לכל `rule_id`. רץ על **כל** כותב (גם `service_role`/`postgres`) | שהבעלים **קיים/פעיל**; חפיפה בין בעלי משפחה; הפניות בטקסט לחוק שפרש; **UPDATE של `description` בלבד** (העמודה לא ברשימה — טקסט חוק פעיל ניתן לשינוי במקום, בלי גרסה); **DELETE / TRUNCATE** (קיימים ל־`service_role` ול־`postgres`) |
| DB | event trigger `ensure_rls` (CREATE TABLE) | RLS מופעל אוטומטית (305 מתוך 305 טבלאות ב־`public`) | הצדקה, בעלים או אישור לטבלה חדשה |
| CI | `test-g1-agent-routing-smoke.mjs` (+ ההרחבה) | ניתוב Owner Index, גרסאות בעלים בתצלום נלכד / מתוארך | מצב חי; כל כתיבה שלא עוברת דרך PR |
| CI | `test/rpc-deploy-order-contract.test.mjs` ואחרות | סדר פריסת RPC מול מיגרציות | טבלאות שנוצרו מחוץ ל־`supabase/migrations` (במאגר 40 `CREATE TABLE` ב־429 קבצים, מול 305 טבלאות חיות) |
| טקסט (Intake §10) | "לפני כל טבלה/נתיב כתיבה חדש — לסווג ולהצדיק" | — | **אין אכיפה אוטומטית** |

**הצעות להרחבה (לא יצירת מנגנון חדש; כל אחת מוסיפה לקיים):**

| # | הצעה | נקודת הרחבה קיימת | סוג אכיפה | עוקף בכתיבה ישירה? |
|---|---|---|---|---|
| E1 | **(CI מומש בענף המקומי — בדיקות 19–21)** **זיהוי הפניה לבעלים שפרש**: בדיקה שכל `canonical_owner` ושכל מזהה חוק בטקסט פעיל מצביעים לחוק פעיל או לשורה ברישום `KEEP` ב־ledger | הבדיקות החדשות ב־G1 smoke + ledger | CI (על תצלום מתוארך) | **כן** — לא נראה כתיבה ל־DB שלא עברה PR. להשלמה: הרחבת הטריגר הקיים כך ש־`canonical_owner` חייב להיות חוק פעיל / קובץ-רשום (DDL, באישור) |
| E2 | **(CI מומש — בדיקות 19–21)** **בדיקת בעלות מול Owner Index** (קיימת בהרחבת G1: כל חוק-בעלים מנותב) + בדיקה הפוכה: כל שורת Owner Index מצביעה לחוק פעיל | G1 smoke (`ownerRow`) | CI | כן (לא חל על כתיבה ישירה); הטריגר הקיים כבר מונע גרסה פעילה כפולה |
| E3 | **(CI מומש — בדיקות 23–25, חלקי: 41 מ־305 טבלאות; שינוי חוזה קיים: בדיקה 22)** **חוק / טבלה / מנגנון חדש מחייבים הצדקה ואישור**: ב־CI — כל `CREATE TABLE` חדש ב־`supabase/migrations` חייב כותרת `-- OWNER-CHECK: EXTEND_EXISTING <owner>` או `NEW <סיווג Intake §10> <הפניה לאישור>` ושורה ב־crosswalk; חוק חדש (`rule_version=1` חדש) — מסומן ב־`owner_check` ב־metadata (כבר נהוג בחוקים). ב־DB — הרחבת event trigger הקיים (`ensure_rls` או אחיו) לרשום ל־`work_log`/טבלת audit קיימת כל `CREATE TABLE` | `scripts/test-g1…` / בדיקת מיגרציות, event trigger קיים | CI + DB-audit | CI: **כן**, עוקף. DB event trigger: **לא** עוקף CREATE TABLE ע"י `service_role` רגיל, אך אינו חוסם — רק מתעד |
| E4 | **סגירת פרצת ה־description**: הוספת `description` לרשימת העמודות של הטריגר, כדי ששינוי טקסט של חוק פעיל ללא גרסה חדשה ייחסם | הטריגר הקיים | DB (חל על כל כותב) | **לא** עוקף (למעט בעל הטבלה שמשבית טריגר) |
| E5 | חסימת DELETE/TRUNCATE על `nodes` לחוקים (טריגר BEFORE DELETE שמסרב ל־`type='rule'`) | הטריגר הקיים | DB | לא עוקף |

**הפרדה במפורש:** E1/E2/E3(CI) הם בדיקות CI — הן עוצרות PR, ואינן עוצרות מי שיש לו `service_role` / `postgres` (הם כותבים ישירות, מחוץ ל־Git). רק E3(DB)/E4/E5 הם אכיפה ברמת מסד שחלה גם על כתיבה ישירה. כל שינוי במסד (E4, E5, הרחבת E1/E3) הוא DDL שדורש אישור מפורש של ZURIEL (§0.4) ובדיקת PG מבודד — **לא הוצעו להרצה כאן**.

**תיקון בסבב 3 לשורות E4 ו־E5** (§0 פריט 7; §13):
- **E4** — ההוספה של `description` לרשימת העמודות רק מפעילה את הטריגר. נדרשת גם לוגיקה בפונקציה שמסרבת לשינוי (D12, ‏D12b).
- **E5** — `BEFORE DELETE` אינו נורה ב־`TRUNCATE`. נדרש `BEFORE TRUNCATE` ברמת statement (D15), או שלילת ההרשאה.
- **שני הדברים מתוקנים ומוכחים על ידי סשן הביקורת.**

**לא נבדק:** האם `service_role` רשאי להשבית את הטריגר (דורש בעלות על הטבלה — לא אומת); אם קיימים כותבים חיים ל־`nodes` מחוץ ל־Edge functions.

## 7. תוכנית־האב → החלטות מאוחרות (כולל מסמך 37) → בעלים → חוזה → מימוש → פער → מבחן קבלה

### 7.0 היררכיית המקורות — תוכנית־האב מיולי–אוגוסט (סבב 3)

**החלטת ZURIEL (12.11, מפורשת):**
- דרישות שלא מומשו ולא בוטלו נשמרות ומתועדפות להמשך. אין לשאול שוב אם לבטל אותן.
- `f30c0148` לא נפרש בשלב זה.

**כלל הקדימות:** החלטה מאוחרת ומפורשת גוברת על החלטה מוקדמת שסותרת אותה (מסמך 37, 2.11.2026; CLAUDE.md §0.1). התוכנית אינה הוכחה למצב החי. את המצב החי קוראים מהמסד ומ־`origin/main`.

**מקרא:** **מ** = החלטה מאוחרת מפורשת, עם מקור ותאריך · **פ** = פרשנות שלי · **ל"נ** = תחום שלא נבדק.

**7.0.א המקורות**

| # | מקור | מזהה | תאריך | גרסה / מעמד | טביעה | נקרא |
|---|---|---|---|---|---|---|
| S0 | ספק "תוכנית-אב לאתר — הרשת החיה" (R1–R16 — הטבלה בהמשך הסעיף) | `nodes f30c0148-e4c0-4937-a4ee-4cd26019587f` (spec) | 11.6.2026 | פעיל | md5 `80672c41…` | במלואו (סבב 2) |
| S1 | "תוכנית-על: «עץ אחד» טכני + רזיאל כשכבת-ליווי" | `work_log 45f5a7e6-2888-4d49-abc8-befd9af29a1b` | 23.7.2026, ‏19:09Z | v1 · ‏`plan_recorded` | md5 `ba54ad05…` | במלואו |
| S2 | "תוכנית-על מאוחדת «עץ אחד» v2". מוצהרת כמקור האמת של התוכנית | `work_log 43a78e4c-d9cc-4613-a77c-07a7b00f4421` | 23.7.2026, ‏19:19Z | v2 · מחליפה את S1 | md5 `39412d12…` | במלואו |
| S2a | `metatron_brain_persona_lens_law` (נחקק במסגרת התוכנית) | `nodes`, rule v1 | 23.7.2026 | פרש · אין מיפוי | md5 `0fdbdf3d…` | במלואו |
| S3 | "תוכנית-אב · דפי הכתבים (writers_page_law)". אין חוק בשם הזה (0 שורות) | `work_log 57a42125-cb78-4493-94f8-3dfa0457be17` | 8.8.2026 | ‏`canonical_plan_locked` (ZURIEL) | md5 `434e543c…` | במלואו |
| S4 | `sod1820-master-architecture-draft` | `project_codex.id=21` | 17.8.2026, ‏15:02Z | **טיוטה, לא מחייבת** (כך כתוב בגוף) | md5 `7345b7fc…` | במלואו |
| S5 | ‏Master Roadmap v3, ‏v4, ‏v5 טיוטה, ‏v5 קנוני; סקירת שחזור; מעבר ספיגה | `work_log` ‏`e6b0b302…`, ‏`9d14daad…`, ‏`a5c57882…`, ‏`7614ce69…`, ‏`f0561b5c…`, ‏`beb4efe2…` | 20–22.8.2026 | ניווט ועדיפות, לא בעלים | — | **ל"נ** — לא נקרא. היסטוריית Git מתחילה ב־5.11 (`4e67dc9cc`), ולכן הגרסאות האלה קיימות רק ביומן |

**7.0.ב הדרישות מול החלטות מאוחרות, מסמך 37 והבעלים**

| # | דרישה (מקור) | החלטה מאוחרת | בעלים קיים | מימוש (מה נבדק) | סיווג |
|---|---|---|---|---|---|
| J1 | רזיאל = שכבת ליווי לכל האתר, בשלוש שכבות: בית ב"המחקר שלי"; נוכחות בכל עמוד, עם הקשר העמוד; ליווי יזום. וואטסאפ = אותו סוכן (S1, ‏S2) | **מ:** `raziel_companion_layer_law` v3 §1 (17.9): "one Raziel, many modes". פרופיל משטח WA (6.10): הקרנה על אותו מוח. ‏`raziel_voice_law` v1 (23.7): קול אחד. ‏`raziel_routing_law` v2 §10 (8.9). **פ:** "ליווי יזום" בוואטסאפ מוגבל באיסור על הודעות שלא התבקשו (המתאם, פריט 10). **ל"נ:** מסמך 37 לגבי השכבה השלישית | `raziel_companion_layer_law` v3 | `lock_raziel_site` פעיל, ‏mode=all: באתר רזיאל נעול לכולם, חוץ ממנהל ותצוגה מקדימה (אומת). ‏DM פעיל | **F** — נשמר. תלוי ב־§8.1 ובהחלטה על הנעילה |
| J2 | "מוח אחד" = `metatron_context` {חוקים דרך `fn_active_method_rules`, עובדות, זיכרון, קולקטיב}. לכל תשובה `context_version` ו־Manifest (S2, ‏S2a) | **מ:** `ai_analyze_contract` v2 §F (8.9): Top-K בעלים רלוונטיים דרך ה־Owner Index, "לא dump". זה משנה את מקור החוקים. ‏`raziel_routing_law` v2 §9 (Trace). **פ:** ה־Manifest ≈ ה־Trace של §9. **"context_version לכל תשובה" לא נמצא באף חוק פעיל** — נשמר כדרישה (§8.1, ‏RT-6) | `raziel_companion_layer_law` + `ai_analyze_contract` | `fn_active_method_rules` מחזירה 6 חוקים, ‏400 תווים לחוק, לכל נושא. ה־Top-K קיים רק ב־`raziel-attention` (אומת) | **F** (P1) — CL-24 |
| J3 | ארבעה חוקים שנחקקו לתוכנית: `unified_ai_brain_law`, ‏`metatron_single_mind_law`, ‏`metatron_brain_persona_lens_law`, ‏`metatron_rollout_law` (S2) | **מ (G2, ‏15.9):** כולם פרשו. המיפוי, לפי הסדר: `raziel_companion_layer_law`; ‏`research_strategy_layer_law`; **אין מיפוי**; ‏`system_suggestions_law` (archive: "absorbed by foundation_closure_protocol_law v5") | כמפורט | — | **F** — CL-23 |
| J4 | כפתורי הקשר: חקור איתי, מצא קשרים, חפש במקורות, מצא הצלבות, קיבלתי רמז (S1) | **מ (אותו יום):** `raziel_response_contract` v1 (23.7): "רזיאל בוחר דינמית … בלי רשימה קשיחה" | `raziel_companion_layer_law` | השרת מחליף את בחירת המודל ברשימה סגורה (דיווח קורא, §8) | **F** (P3) |
| J5 | מסנן "גדול — אותה סופית" ב־buildFacts (S1) | **מ:** `gadol_convergence_needs_different_sofit_law` פרש, ונספג ב־`canonical_methods_registry_law` v5 (לפי ה־archive). שם: §14 FINAL-LETTER EQUIVALENCE ו־§18 (נקרא במלואו) | `canonical_methods_registry_law` v6 | ליבת `raziel_brain#1` עדיין מצטטת את החוק שפרש (אומת) | **B** — CL-11 |
| J6 | השלבים של S2: ‏1a — חיווט החוקים ל־`metatron_context`; ‏1b/2 — הנתיב הכללי והוואטסאפ; ‏3 — סוללת הערכה; ‏4 — בטא "חיפוש אחד ביום"; ‏5 — ממשק רזיאל בשלוש שכבות | **מ:** `raziel_full_answer_and_route_law` v3 (8.9) משאיר בתוקף את (2): "אין שער־מכסה שמחליף תשובה". ‏`raziel_routing_law` v2 §7 (8.9): הזכאות קובעת נפח ועומק — "return the truthful available result + explain the gated deeper action". **פ:** מגבלה של "חיפוש אחד ביום" מותרת רק כשער של עומק ותקציב, לא כהחלפת תשובה. **ל"נ:** שלב 3 | `raziel_*` | שלב 1a קיים (`ai-analyze:1048`). המכסה מחליפה תשובה (`ai-analyze:3720–3724`, אומת) — סותר את (2). ‏#1321 מוסיף כשל סגור `quota_unavailable` (§8) | **F**. ההכרעה על המכסה — ZURIEL (§8) |
| W1 | דף כתב = עדשה על `research_contributions`. "חוק ברזל: אין מאגר נוסף". העדשות הנלוות הן מצביעים, לא העתקים (S3) | **מ:** `writer_material_home_law` v6 (30.9) §1, ‏§5, ‏§20, ‏§21, ‏§23; ‏`research_workspace_law` v5 §7–8 | `research_intake_foundation_contract_law` ← `writer_material_home_law`; ‏`research_workspace_law` | **ל"נ:** דפי הכתב ב־2029 (שתי כתובות — D14 של הביקורת). ‏CL-03 הוא המקרה החי של "מצביעים, לא העתקים" | **F**; ‏CL-03 = **R** (v2) |
| W2 | `page_config`, מדיניות עדכון־בעלים (`user_id=auth.uid()`, עמודות בטוחות) ומסך עריכה. חמש תכונות: #2 התראה על רמז, #3 דרגה ומוניטין, #4 שאל את הכותב, #5 פעילים לאחרונה, #6 אוסף נבחר — כולן על `page_config` (S3) | **מ:** ‏`person_foundation` v3, ‏Root-of-Trust: שירות עצמי לשדות תצוגה בלבד. ‏`research_gold_hints_law` §4: מוניטין לא מגדיל משקל ראייתי. ‏`canonical_ui_components_law` v9 והבהרת 27.10: מעקב רק ביעד בעל משמעות מתמשכת | `writer_material_home_law`; ‏`person_foundation`; ‏`canonical_ui` | **ל"נ** (`contributors.page_config`) | **F** (P3) |
| W3 | רעיונות: אקדמיה ודרגות; קרדיטים; ציר אירועים לכותב; דפי קטלוג (גילוי יומי 91, תורת הרמז 1003); ‏Collective Discovery (5+ דיווחים) (S3) | **מ:** S3 עצמו מסמן אותם כרעיונות. ‏`els_research_layer_law` v9, שכבה 5: "נחקר", לא "אמיתי" | — | — | **רעיונות**, לא דרישות. נשמרים |
| A1 | עולמות זהות: כי לה׳ המלוכה בראש; סוד החשמל; חכמת החיבור; מימד חמש; זרם המציאות; אור הגאולה = משפך; קוד המציאות = עדשה, לא הוכרע (S4, טיוטה) | **מ:** מסמך 37, ‏DEC-SERIES-003…006 (APPROVED): מימד חמש = סדרת תודעה; הצופן בסרטים = נושא תחת כי לה׳ המלוכה; סוד החשמל = מקור מפרסם וגם סדרה. ‏`reality_graph_law` v5 §3 (13.9): עולם הוא הקרנה כברירת מחדל, ועולם ריק אסור. **ל"נ:** "קוד המציאות"; שפות | `reality_graph_law`; ‏PLAN37; ‏content contract §5 | — | **טיוטה**; חלקים אומצו |
| A2 | Interest/Follow בלי הרשמה; קבוצת WA; מייל שבועי וחודשי (S4) | **מ:** `subscription_funnel_law` v22 (3.11): הסכמה מפורשת לכל ערוץ, בלי opt-in אוטומטי. ‏`person_foundation` v6: "never infer delivery consent". ‏`canonical_ui` v9 והבהרת 27.10 | `subscription_funnel_law` | **ל"נ** | **טיוטה**; מוגבלת בדרישת הסכמה מפורשת |
| A3 | לולאת הפצה; קרדיטים; ייחוס A→B→C→D; מדדי מסלול מעורבות (S4) | **ל"נ** מול `traffic_intelligence_law` v11 (לא נקרא בסבב 3). קשור לשורות C, ‏X ו־I.1 של הביקורת | ‏TI v11 | — | **F** |
| A4 | מיפוי סמנטי — הצעה בלבד (1,256 פריטים). רזיאל מציע קישורים, עם רמת ביטחון, לאישור (S4) | **מ:** `reality_graph_law` v8 §5 (16.9): "AI PROPOSES DELTAS; HUMAN GATE CURATES". ‏v4 (6.9): ממצא או מועמד של AI אינו יוצר זהות קנונית | `reality_graph_law` | **ל"נ** | **אומץ כעיקרון** |
| A5 | רשימת 10 ההחלטות הפתוחות (S4) | **ל"נ** — לא נבדקה פריט אחר פריט | — | — | **ל"נ** |

**מסקנה לסבב 3:** מהמקורות של יולי–אוגוסט עולים רק שני חסמי בסיס:
- מזהי חוקים שפרשו בליבת רזיאל (J5 ← CL-11);
- מחרוזות גרסה ישנות (CL-12).

שניהם בגבול ה־runtime של רזיאל (v18 §65). כל השאר הם דרישות שנשמרות, טיוטות או רעיונות.

**כיסוי מסמך 37:** נבדקו רק השורות הממוקדות (DEC-SERIES-003…006). "לא נמצאה החלטה" אינו "אין החלטה" (§10).

**7.1 הספק מ־11.6 (S0) מול החלטות מאוחרות — מסבב 2:**

מקור הדרישות: ספק `nodes.id = f30c0148-e4c0-4937-a4ee-4cd26019587f` ("תוכנית-אב לאתר — הרשת החיה", 11.6.2026, `is_active=true`; כל 10 שורות ה־spec פעילות). הדרישות ממוספרות כאן R1–R16 לפי סדר הופעתן בספק. מסמך 37 = `project_codex.id=37` (621,302 תווים, עודכן 11.11.2026 07:17 UTC, סעיף אחרון 12.57).

**כיסוי הקריאה — מוצהר:** קורא קריאה-בלבד (ראו §10) קרא מסמך 37 מילה במילה בכ־19% (כ־120K תווים: פתיחה, §4, §8–9, בלוקי HEICHAL/MIDRASH/COMMUNITY/CALCULATOR/ONE-SHELL, 12.10, 12.12, 12.13, 12.27, 12.45, 12.52, 12.57, CONTENT-AUDIENCES-HYBRID-NOW-20261102, NOW-CENTRAL-HANDOFF, טבלאות DEC) ו**חיפש מילות מפתח** ביתר. אימתתי בעצמי: המחרוזות "כאן מתחילים", "ארכיון ההתגלות", "עץ המספרים", "בני ההיכל", "פנינים", "המסר היומי", "מפת הרמזים", "מחולל חידושים", "שאלות נפוצות", "מסע התדר", "שורת פעילות" מופיעות **0 פעמים** במסמך 37. **לכן "לא נמצאה החלטה" ≠ "אין החלטה":** החלטה שאינה משתמשת במילות החיפוש עלולה להיעדר. אם סגירת הבסיס תלויה בהיעדר החלטה — נדרשת קריאה לינארית מלאה של קורא עצמאי (Codex).

**כלל קדימות (מסמך 37, 2.11.2026):** "ההוראה הישירה המאוחרת ביותר של צוריאל באותו נושא מחליפה החלטה מוקדמת סותרת, גם כשהמוקדמת סומנה APPROVED."

| דרישה (ספק 11.6) | החלטות מאוחרות (מקור, תאריך) | בעל אחריות קיים | חוזה פעיל | מימוש וצרכנים (נבדק ב־`aa0f6bc82`) | פער | מבחן קבלה מוצע | עדיפות |
|---|---|---|---|---|---|---|---|
| **R1** "כאן מתחילים" + כפתור בתפריט | אין החלטת אישור/ביטול. 12.27 (3.11): "כאן" = כפתור הקשר, "סגור לציבור". `siteLinkRegistry.js:78` (`start`, `defaultState:"closed"`: "העמוד הישן בתהליך התאמה") | `experience_governance_foundation_v1_law` (ניווט/קליטת משתמש) | `experience_governance_foundation_v1_law` v10 | **אין** route ב־`App2029.jsx`; `publicReadingRelease2029.js:210` הודעת "סגור"; בדיקות `footer-2029` ו־`admin-open-destinations-2029` נועלות `/start` סגור; הקוד הישן נמחק (#1239) | החלטה: להקים / לבטל | החלטה רשומה + שהבדיקות הנועלות תואמות אותה | P2 — נשמר, ממתין להחלטת ZURIEL |
| **R2+R12** בית מלכותי, פריסת 3 עמודות, תפריט עליון מומלץ | HYBRID-01 (2.11): עיצוב מלכותי/קומפקטי **מאושר, מימוש ממתין**. HOME-02: "ציר זמן… יעד לאחר ההשקה". 12.20 (2.11): "הרכב הבית הקיים נשמר". 12.57 (8.11), 11.11: סדר הבית (ELS, עדכונים, מפת מציאות, רצועת כניסות; "עכשיו · המרכז" ראשון). ONE-SHELL (21.10): אין ניווט מתחרה | `experience_governance_foundation_v1_law` + `SOD1820_DESIGN_CONTRACT_V2.md` | אותו חוק v10 | `HomeComposition2029.jsx`, `SystemFrame2029.jsx:169–211` (בית, העולם, היכל, פוסטים, מסע החיים, קהילה, מחשבון, דף המספר, ספרים, בית המדרש, ELS). אין כאן מתחילים/מסע התדר/ארכיון/בני ההיכל. ספקים 64bb4f0d, f8927670 עדיין פעילים | פריסת 3 עמודות **הוחלפה** בהרכב "עכשיו"; אין החלטת ביטול מפורשת. הרכב Home/Now הסופי מופיע ב־Roadmap כפתוח | הרכב הבית נקבע בחוזה (Content Foundation Contract "סדר דף הבית") + בדיקת דפדפן ל־`/` | P1 — הרכב סופי מחכה להחלטה; לא חוסם |
| **R3+R15+R16** ציר הזמן / "מסע התדר" / "עץ המספרים" חי | HOME-02, 12.24 (2.11), NOW-CENTRAL-HANDOFF (3.11): "מד פעילות, ציר זמן ומעקב חכם נשארים שלב המשך". `work-journal` 11.6: "מסע התדר" → "ציר ההתגלות" (שינוי שם). DEC-METER-002: **OPEN**. IMP-SPATIAL-010: IDEA/OPEN. V3 §16 (טיוטה): "זמן" = מצב תצוגה בזרם המציאות | `reality_graph_law` (מבנה) + `experience_governance_foundation_v1_law` (תצוגה) | v8 / v10 | `/timeline`, `/numbers`, `/journey` = הודעות "בתוכנית ההמשך" (`publicReadingRelease2029.js:206,207`); `TimelinePage`, `OneTreeAtlas` נמחקו | דחוי; שם סופי ופורמט לא הוכרעו | כשיוחלט: בדיקת route + הודעת סגירה מתעדכנת | P2 — נשמר |
| **R4+R5** ארכיון ההתגלות מאוחד; תמונה מדליקה מספר בעץ | DEC-GALLERY-001 (מאושר): גלריה = אוסף עצמאי; 12.10, 12.13 (31.10): גלריה = עדשה + "כל הגלריות". HINT-IMAGE (2.11, מאושר לתכנון): מספר לחיץ פותח הקשר ומחזיר לתמונה. Roadmap docs (11.9): "do not lock עץ המספרים; Tree is a World lens"; שם הגג של הארכיון **פתוח** | `publishing_conventions` (codex) + `reality_graph_law` | — | `/gallery` ציבורי; קטלוג גלריות כעדשה ב־World; `/archive` סגור במכוון; אין הדלקת עץ (פיילוט: תגית מספר → דף מספר → חזרה). ספקים 2fa07a3e, 1ccaf4df פעילים | אין עמוד ארכיון מאוחד ואין הדלקת עץ; אין החלטת ביטול | החלטה: עדשת World מול דף ארכיון; ואז בדיקת דפדפן | P2 — נשמר |
| **R6** אזור צפנים | HOME-05 (2.11): כניסות לצופן ולמסע החיים. 8.11: `ciphers:false` ב־`homeSections2029.js` ("לא הפריטים הנכונים") | `els_research_layer_law` v9 | v9 | `/code`, `/codes` ציבוריים (`lock_els` פתוח); בלוק הצפנים בבית **מוסתר** מ־8.11 | סתירה פנימית באותו יום (סדר הבית מ־12.57 מזכיר "הצפנים האחרונים", המתג מסתיר) | החלטה על סדר הבית + בדיקה | P1 — דורש הכרעה |
| **R7** מגה־תפריט בית המדרש | DEC-MIDRASH-CROSSWALK (19.10): בית עצמאי; **5.11: ZURIEL — יעד ראשי בתפריט, פתוח לציבור** | `canonical_methods_registry_law` + `experience_governance…` | v6 / v10 | `/beit-midrash`, `/beit-midrash/:method` מומשו (#1241); בתפריט — קישור יחיד, לא מגה־תפריט | קורסים/שיעורים/מחשבונים לא אושרו ל־2029 | החלטה על היקף | P2 |
| **R8** «בני ההיכל» | ZURIEL 10–11.11: להחליף שם, **השם החדש טרם נבחר**; "אין לשנות שם/זכויות/לבטל את spec bnei_haheichal לפני בחירה". `platform_tiers_law` v5 §18: לא נעול תמחור | `platform_tiers_law` (+ `subscription_funnel_law`) | v5 / v22 | אין עמוד מנויים סגור; `/members` = "אנשים בקהילה"; אזכורים ישנים ב־`SubscribeGate.jsx:43`, `api/og.js:118` | שם לא נבחר | בחירת שם ← החלטה ← בדיקת טקסטים | P1 (החלטת שם); לא חוסם |
| **R9+R13** פנינים; אינדקס מספרי־האם; מפת רמזים; מסר/שאלה יומית; מחולל חידושים; שאלות נפוצות | **לא נמצאה החלטה** (למעט ספריית סרטונים: DEC-VIDEO-001 מאושר) | — | — | אין מימוש; `/video/:assetId` קיים | לא ידוע אם בוטלו או נשארו רצויים | לכל פריט: החלטה "להקים / לבטל" | P3 — נשמרים כדרישות עתידיות |
| **R10** קהילה | HEICHAL-COMMUNITY-SHARE (20.10): "קהילה", `/community/chat` נשמר; CALCULATOR-2029 (21.10); 12.45 (4.11): כתיבה חסומה למשתמש רגיל. יומי: אין החלטה | `research_workspace_law` §8 + `writer_material_home_law` (ראו §1) | v5 / v6 | `/community/*`, `/contact`, מחשבון ויראלי ציבוריים; **תווית «צוות» לא מוצגת לאורחים** (403 בהודעת allowlist ב־`transport.js`) | חידושי קהילה (CROSSWALK_PENDING); מסר/שאלה יומית — אין החלטה | בדיקת דפדפן אורח: 200 ל־RPC התווית | P1 (allowlist) |
| **R11** שורת פעילות חיה | 12.14 (31.10): טיקר התקבל עם הרצועה והפיד; NOW-02: "מד פעילות… ייקבעו לאחר בדיקת מקורות"; 12.11 (ZURIEL): שורת הפסוק מוסתרת (#1326) | `experience_governance_foundation_v1_law` | v10 | `GlobalLivingRibbon2029` מוסתר (`LIVING_RIBBON_VISIBLE_2029=false`); עדכונים ב"עכשיו". ספק 76ef74ea פעיל | מד פעילות דחוי; "משתמש חדש הצטרף" — אין החלטה | כשיוחלט: הצהרת מטרת מדידה + נתונים + הרשאות (הצגה נפרדת של סשן הביקורת) | P3 |
| **R14** שלושה עמודי תווך מחוברים | §1: One World · One Research OS · One Reality Graph · Many Views; DEC-GRAPH-001 מאושר; DEC-METER-002 **OPEN** | `reality_graph_law` | v8 | מסגרת מאושרת; המד/העץ החי פתוח | נספג במסגרת, לא הוחלף רשמית | — | P3 |

**מסקנות לסגירת בסיס:**
1. **אף דרישה מהתוכנית אינה פער יסוד שחוסם עבודה בטוחה.** כולן מתועדות כדרישות עתידיות עם עדיפות (טבלה לעיל); אין מחיקת היסטוריה.
2. **הצעה 21 ו־`f30c0148`:** שורת spec שמקבלת `is_active=false` נשמרת במסד (אין מחיקה); מה שהיה חסר הוא מקום לדרישות הלא־מומשות — והוא ניתן עכשיו בטבלה שלמעלה. המלצה: פרישת `f30c0148` ניתנת לביצוע **אחרי** ש־ZURIEL מאשר שהטבלה הזו היא הרשומה; עד אז להשאיר אותה מחוץ להרצת 21. **הוכרע (ZURIEL, 12.11):** `f30c0148` לא נפרש בשלב זה. דרישות שלא מומשו ולא בוטלו נשמרות ומתועדפות.
3. **ארבעה פריטים דורשים החלטת ZURIEL ולא הנדסה:** R6 (סדר הבית מול מתג הצפנים), R8 (שם), R2 (הרכב סופי), והבחנה אם R9/R13 נשארות רצויות.

## 8. הקשר שרזיאל מקבל בפועל, והפערים בו (קריאה בלבד; בלי מאגר חוקים או מערכת הקשר מקבילים)

מקור: קורא קריאה-בלבד (§10) על `origin/main` `aa0f6bc82` + מצב חי. **אימתתי בעצמי:** נעילת `lock_raziel_site` (`enabled=true, mode=all`); `raziel_brain#1.core` (2,604 תווים) מזכיר 3 חוקים שפרשו (`messiah_frequency_in_every_person_law`, `intent_before_compute_law`, `gadol_convergence_needs_different_sofit_law`); `addon_wa` ריק (0 תווים); `fn_active_method_rules()` מחזירה 6 חוקים (2,685 תווים) — `auto_share_uses_live_post_law`, `cross_reference_is_not_disclosure`, `gematria_db_first_and_enrich_law` v3, `gematria_engine_law` v2, `method_priority`, `shitat_haechad_alef_law`; **אף חוק בעלים של רזיאל אינו `propagate`**; `wa-raziel/index.ts:412–415` מזכיר את החוקים בפרומפט; `ai-analyze/index.ts:4173,4178` נושא `platform_tiers_law v4 + ai_quota_law v3`; `ai-analyze/index.ts:3720–3724` מחליף תשובה בהודעת מכסה; `razielRouteGrammar.js:11–14` — v15/v7/v4. **לא אימתתי** (דיווח הקורא בלבד): מספרי שורות אחרים, 470 שורות זיכרון (455 שיחה + 15 הקשר אישי — חלק מהספירה אומת: 470 בסך הכול), תוכן `fn_raziel_plan`/`fn_raziel_answer`, גרסאות Edge שנפרסו.

**מה רזיאל מקבל:**
- **אתר (`ai-analyze`, persona raziel):** אין tool-use של המודל; prefetch בשרת ואז קריאה אחת. פרומפט מערכת = `fn_raziel_persona('site')` (core + addon_site) + שכבת קול סטטית + בלוק "חוקי המערכת החיים" (6 החוקים לעיל, כל אחד חתוך ל־400 תווים) + שכבת מצב תצוגה. פרומפט משתמש = הנושא + עובדות מהלקוח (עד 3,500 תווים) + עובדות מטטרון (5 הגדרות חוקר אחרונות, ללא קשר לנושא) + תוצאות דטרמיניסטיות (מפת מספר, Result Bundle מ־`research-run`, פוסט/נושא נוכחי) + מצב מחקר אישי (JWT מזוהה בלבד) + רמז הגעה (עד 600). **נעילת האתר:** `lock_raziel_site` חוסמת את כולם חוץ ממנהל ומזהה תצוגה מקדימה; ערוץ הוואטסאפ המהימן עוקף את הנעילה.
- **וואטסאפ (`wa-raziel`):** ניווט ללא מודל; DM → `ai-analyze` עם `persona:"raziel"`. `addon_wa` ריק — אין סכמת JSON ל־WhatsApp; חיתוך הדיאלוג ל־600 תווים מהישן לחדש מפיל את התורות **החדשים**. נתיב קבוצות in-file (מוח שני) כבוי (`GROUPS_ENABLED=false`).
- **אישי:** `fn_raziel_context` — תקציר/שרשורי מחקר/העדפות; בפועל "זיכרון" = עיכול של 10 ההודעות האחרונות (470 שורות, כולן `private`). זכאויות (`entitlements`) מחושבות ולא מגיעות לפרומפט. בבקשות חוזה קנוני 2029 — אין זיכרון בכלל (`context` תמיד null).
- **אין קריאה בזמן ריצה** של: עץ החוקים (פרט ל־6 המופצים), `project_codex`, Owner Index, `work_log` (פרט למנהל), `raziel_config` ו־`fn_raziel_rulebook/config/model`.

**פערים מול חוקי הבעלים של רזיאל** (ציטוט וסעיף אצל הקורא; כאן העיקר):

| חוק | חסר / חלקי | חומרה לסגירת בסיס |
|---|---|---|
| `raziel_full_answer_and_route_law` v3 | ב': מכסה מחליפה תשובה (`3720–3724`) — **סותר** "אין שער־מכסה שמחליף תשובה"; א': פלט שנקטע אינו מטופל (`raziel-reliability.ts:112` בודק `refusal` בלבד); 3: התראת ניתוב — חלקית; ה': עלות ILS "unknown" בכל trace | החלטה (מכסה) — **לא קוד** |
| `raziel_routing_law` v2 | §7 "תוצאה אמיתית + הסבר על פעולה חסומה" — נדחה ללא תשובה חלקית; §6 היקפי מנהל Product/Rules/Release לא נגישים | התנהגות — עדיפות P2 |
| `raziel_voice_law` v1 | פריט 6: שמות סוכנים פנימיים נחשפים (`wa-raziel:1031`: "Gabriel…"; "מטטרון" בכותרות הפרומפט); פריט 1 ורשימת הביטויים האסורים — לא בפרסונה | התנהגות — P2 |
| `raziel_whatsapp_access_adapter_law` | פריט 5: `savePersonalData` (`wa-raziel:193,935`) **ו־`remember` (936)** כותבים מכל DM, גם משולח לא־מקושר, ללא מסלול הסכמה בקטע שנקרא; הפונקציות `evaluateWhatsappActionBoundary`/`isExplicitConfirmation` קיימות ולא נקראות. פריט 3: זיכרון רחב נכנס גם בלי רמז המשכיות. **עצם הכתיבה אומת בידי Codex בקוד הפרוס ובפונקציות המסד** | **כן — בטיחות פרטיות (CL-13)**; אין צורך בהכרעה על המונח "mutation" |
| `raziel_group_privacy_law` | אכיפת קבוצה בשכבת הנתונים (`@g.us`) **מתה** בנתיב הליבה — `ai-analyze` לא מעביר מזהה צ'אט; הבטיחות נשענת על `handleAllDMs` ו־`GROUPS_ENABLED=false`; אוצר מילים `visibility` שונה מהקוד | פער הגנה בעומק — P2 |
| `raziel_response_contract` v1 | `suggested_paths`: השרת זורק את בחירת המודל ומחליף ברשימה סגורה; הפרומפט סותר את עצמו | התנהגות — P3 |
| `raziel_companion_layer_law` v3 | סעיפים 2,3,4,8 (קול/תמלול) — לא בקבצים שנבדקו; פרסונה כפולה (3 עותקים); `bot_delivery_law` פריטים 3–4 חלקיים | P3 |

**מה שיש לתקן בעקבות התיקון של מזהי החוקים (צרכנים בלבד, לא נערך כאן):** `raziel_brain#1.core` (3 חוקים שפרשו) + `wa-raziel/index.ts:412–415,447`; `ai_quota_law v3` ב־`ai-analyze:3202,4173,4178`, `materialGate.js:16,168`, `research-run:419,424`, ו־`fn_capability_execution_gate_v1`; גרסאות ישנות (`system_suggestions_law v5/v3`, `research_strategy_layer_law v15`, `inter_agent_coordination_law v13`, `live_state_resolution_law v2`, `deploy_on_request v3`, `platform_tiers_law v4`) ב־`ai-analyze`, `raziel-attention:28`, `wa-raziel:65`, `razielRouteGrammar.js`, `fn_raziel_plan`; בדיקות שננעלות על המחרוזות: `tests/sql/raziel_phase_m_cross_surface_golden_v1.sql:163,166`, `scripts/test-replayable-golden-no-black-box.mjs:134,142`, `test/g3-client-correlation.test.mjs:52`. #1321 (ראש `01e590f84`) לא משנה את מזהי החוקים בקבצים האלה; הוא משנה זהות אורח, כשל-סגור של מכסה (`quota_unavailable`) וקישורי `/number/<n>` — **חלק מהפערים למעלה (מכסה מחליפה תשובה) מחמיר אחרי המיזוג שלו**.

### 8.1 חוזה ההקשר של רזיאל לפי ערוץ — דרך המנגנונים הקיימים (סבב 3)

> הצעה חוזית. המימוש אצל סשן הביקורת.

**מקורות** (כולם נקראו במלואם):
- **`ai_analyze_contract` v2, ‏§F (8.9):** "Question → Identity/Channel/Access → Capability → Research/Action Plan → Context/Tools → Intelligence Level → Model/Provider → Completion Gate → Response. Rule retrieval צריך להביא Top-K owners רלוונטיים בלבד דרך Owner Index/project_codex router, לא dump של כל החוקים."
- **`raziel_routing_law` v2:**
  - §1 — סדר הניתוב.
  - §6 — מנהל: היקף קריאה מלא; זה אינו חשיפה בערוץ ציבורי, ואינו כתיבה.
  - §7 — הזכאות קובעת עומק ונפח, לא אמת.
  - §9 — Trace.
  - §10 — אין מערכת מקבילה; המתאמים נבדלים רק בערוץ ובהרשאה.
  - `effective_scope=min(expert.permission_scope,user.context_type)`.
- **`raziel_companion_layer_law` v3:** §1 (אותה זהות, אותו Research Context, אותם גבולות אמת וזיכרון **מורשה**), §3.
- **פרטיות:** `raziel_group_privacy_law` v1; ‏`raziel_whatsapp_access_adapter_law` v1 (פריטים 3, 5, 6 ו־LINK RULE); ‏`person_foundation_contract_law` v6 (PRIVACY BEFORE COMPOSITION).
- **`metatron_brain_persona_lens_law`** (פרש; §11.3):
  - "context_version — כל תשובה נושאת את גרסת-החוקים";
  - "מבחן עץ אחד: שינוי חוק ב-nodes משנה התנהגות בלי קוד".
- **`inter_agent_coordination_law` v18:**
  - §52 — פרומפטים הם מצביעים, לא מקור אמת;
  - §65 — runtime של מוצר נבדק בגבול שלו: הוא צורך את הבעלים הנוכחיים, בלי סמכות מיושנת או מקבילה.

**חמשת הרכיבים שכל ערוץ חייב לקבל.** כל רכיב נישא על מנגנון קיים — בלי מאגר חוקים נוסף ובלי הזרקה של כל החוקים:

| רכיב | מה חייב להגיע | מנגנון קיים | הרחבה נדרשת (EXTEND_EXISTING) |
|---|---|---|---|
| **בעלים וגרסה** | לכל טקסט חוק בהקשר: `rule_id`, הגרסה הפעילה ו־`canonical_owner`, נקראים חי בזמן הקריאה | `fn_raziel_relevant_rules(p_query,p_domains,p_limit)` — מחזירה `rule_id`, ‏`label`, ‏`description`, ‏`score`, **בלי גרסה ובלי בעלים**; ברירת מחדל 8, עד 20. ‏`fn_active_method_rules()` — 6 חוקי שיטה עם `propagate=true`, ‏400 תווים לחוק, בטקסט מאוחד | להחזיר גם `rule_version` ו־`canonical_owner`. לסמן כל חוק מופץ כ־`rule_id@version`. להסיר מהקוד מחרוזות גרסה נעולות |
| **הרשאות** | מחלקת זהות (אנונימי / מזוהה / WA מקושר / `wa:<phone>` / מנהל), ערוץ, זכאות ותקציב, `effective_scope`. סינון הפרטיות נעשה **לפני** ההרכבה | `fn_capability_execution_gate_v1`; ‏`fn_raziel_context(p_user_ref,p_channel)`; ‏`lock_raziel_site`; ‏`materialGate.js` | להעביר לליבה את מזהה הצ'אט או הערוץ, כדי שהאכיפה בשכבת הנתונים תפעל. היום `ai-analyze` לא מקבל `@g.us` (§8) |
| **מקור** | לכל עובדה: `source_ref`, ‏Trace מנוע או Result Bundle. העובדה נפרדת מהפרשנות | facts של `metatron_context`; ‏Result Bundle של `research-run`; ‏`facts[]` ב־`raziel_response_contract` | — |
| **כלי קנוני** | הכלי הקנוני של היכולת: לגימטריה — `fn_method_value` ורישום השיטות; ל־ELS — מנוע ELS הקנוני; למחקר — Result Bundle. המודל מפרש, לא מחשב | משפחות היכולת (`raziel_routing_law` v2 §4); ‏`materialGate` | — |
| **הקשר המשימה** | השאלה; הישות או העמוד הנוכחיים; Research Context והחזרה מדויקת. ב־DM: המשכיות רק כשיש רמז המשכיות (המתאם, פריט 3) | `metatron_context(p_request)`; הקשר העמוד; ‏`fn_raziel_context` | לבחור את ה־Top-K לפי בעל היכולת שנפתר ב־Owner Index, ולא לפי מילות מפתח בלבד |

**מטריצה לפי ערוץ:**

| ערוץ (המנגנון היום) | בעלים וגרסה | הרשאות | זיכרון אישי | אסור |
|---|---|---|---|---|
| **אתר — רזיאל** (`ai-analyze`, ‏persona raziel). היום נעול: `lock_raziel_site` פעיל, ‏mode=all | ‏Top-K לפי בעל היכולת. במשימות גימטריה — גם 6 חוקי השיטה. כל חוק כ־`rule_id@version` | אנונימי: קריאה ציבורית בלבד. מזוהה: גם מצב מחקר אישי (JWT). מנהל: קריאה מלאה, בלי כתיבה, ולא עומק כברירת מחדל | מזוהה בלבד, פרטי, לפי §14 (R7–R8) | ‏dump חוקים; מזהי חוקים שפרשו; גרסאות נעולות; חשיפת מידע פרטי |
| **אתר — בקשת חוזה קנוני 2029** (Result Bundle) | כמו באתר | כמו באתר | **אין:** `context=null`, ו־0 קריאות ל־remember (`razielResultBundleServerSeam.test.js:1458–1459`) | כמו באתר |
| **WhatsApp DM** (`wa-raziel` ← `ai-analyze`) | כמו באתר | מקושר: הקשר אישי בגבולות ההרשאה (פריט 6). לא מקושר: הזיכרון שלו — אחרי אימות שולח והסכמה; בלי מידע מחשבון האתר עד קישור (D-CL13-2) | לפי §14 (R1–R2, ‏R4–R5); בתקופת ההשהיה אין כתיבה חדשה (D-CL13-1) | כמו באתר. וגם: פעולה אישית בלי אישור מפורש (פריט 5) |
| **WhatsApp קבוצה** (`@g.us`). הנתיב היום כבוי: `GROUPS_ENABLED=false` (דיווח קורא) | כמו באתר | הקשר קבוצה בלבד. ‏`user_context` ריק — אכיפת `raziel_group_privacy_law` | **אסור** לשלוף או לחשוף. כתיבה לפי §14 (R3, ‏R6) | כל זיכרון אישי; הרחבת גישה מכוח הקבוצה |
| **מנהל — `raziel-attention`.** קורא היום ל־`fn_raziel_relevant_rules` עם `p_limit: 8` (שורה 224) | ‏Top-K, עם גרסה ובעלים | היקף קריאה מלא (routing §6). כתיבה רק באישור | של המנהל בלבד | חשיפה בערוץ ציבורי; כתיבה משתמעת |
| **חוקר מספר — `number-researcher`** (persona site + `fn_raziel_context` + `metatron_context`) | כמו באתר | כמו באתר | כמו באתר | כמו באתר |

**מבחני קבלה — שליפת ההקשר הרלוונטי (RT):**
- **RT-1** — "חפש גימטריה על 358": ה־Top-K כולל את `canonical_methods_registry_law`, את `engine_governance_registry_authority_law`, ואת בעל ההרחבה המספרית (`inter_agent` v18 §35). הוא **לא** כולל וידאו, ניוזלטר, פורום או RLS (הכיול של §37).
- **RT-2** — שאלת ELS: `els_research_layer_law` נמצא ב־Top-K.
- **RT-3** — שאלה על חומר קבוצות או על הצ'אט: `writer_material_home_law` ו־`research_workspace_law` נמצאים ב־Top-K.
- **RT-4** — הכמות חסומה:
  - K ≤ 8 כברירת מחדל, ו־K ≤ 20 כגבול קשיח;
  - האורך הכולל ≤ K×600 תווים;
  - לעולם לא כל החוקים.
- **RT-5** — דטרמיניזם: אותה שאלה, באותו מצב חי, מחזירה אותו סט.
- **RT-6** — לכל פריט יש `rule_id`, גרסה ובעלים, ושלושתם שווים לגרסה הפעילה בזמן הקריאה. זו דרישת ה־context_version.
- **RT-7** — סינון הרשאות:
  - בקבוצה — אין זיכרון אישי בהקשר. לשולח לא מקושר — רק זיכרון שלו, ורק אחרי אימות והסכמה (D-CL13-2). בתקופת ההשהיה — לפי §14.3;
  - לאנונימי — אין מצב מחקר פרטי;
  - למנהל — אין כלי כתיבה.
- **RT-8** — ה־Trace רושם את רשימת הבעלים והגרסאות שהיו בשימוש (routing §9).

**מבחני קבלה — זיהוי הפניות מיושנות (ST):**
- **ST-1 — אין מזהה של חוק שפרש** באף אחד מהמקומות הבאים:
  - הפרסונה (`raziel_brain`: ‏core, ‏addon_site, ‏addon_wa) ופלט `fn_raziel_persona`;
  - מחרוזות הפרומפט ב־Edge: `wa-raziel`, ‏`ai-analyze`, ‏`raziel-attention`, ‏`number-researcher`;
  - `razielRouteGrammar.js` ו־`materialGate.js`;
  - גוף `fn_raziel_plan` ו־`fn_raziel_answer`.

  **היום נכשל:**
  - `raziel_brain#1.core` מצטט 3 חוקים שפרשו: `messiah_frequency_in_every_person_law`, ‏`intent_before_compute_law`, ‏`gadol_convergence_needs_different_sofit_law`;
  - `wa-raziel/index.ts:414` מצטט את `never_silent_metatron_law`.
- **ST-2 — אין מחרוזת גרסה נעולה** ששונה מהגרסה הפעילה. **היום נכשל:**
  - `platform_tiers_law v4` (הגרסה החיה היא v5) ו־`ai_quota_law v3` (פרש), ב־`ai-analyze` וב־`research-run`;
  - `razielRouteGrammar.js:11–14`.
- **ST-3 — חוקים מופצים** (`fn_active_method_rules`) לא מכניסים לפרומפט מזהה של חוק שפרש. **היום עובר:** ב־`auto_share_uses_live_post_law` האזכורים נמצאים בתווים 432 ו־453 מתוך 534, והחיתוך ל־400 מוריד אותם. המבחן חייב לבדוק את הטקסט שאחרי החיתוך, ולא לסמוך על המיקום.
- **ST-4 — רענון:** כשחוק מקבל גרסה חדשה, הגרסה החדשה מופיעה כבר בקריאה הבאה, בלי שינוי קוד ("מבחן עץ אחד").
- **ST-5 — מקור הרשימה:** רשימת החוקים שפרשו נלקחת מתצלום G1 המתוארך (שורות `R`) ומבדיקה חיה בקריאה בלבד. אין רשימה ידנית נוספת.

**איפה זה חי:**
- ST-1, ST-2 ו־ST-5 — בהרחבת G1 הסטטית (`git grep` על הקבצים), ובבדיקה חיה בקריאה בלבד של `raziel_brain` ושל גופי הפונקציות.
- RT — מבחני יחידה ל־`fn_raziel_relevant_rules` המורחבת, על PG מבודד.
- אין מאגר, רישום או גרף חדשים. החוקים נשארים ב־`nodes`, והנתב הוא ה־Owner Index והפונקציה הקיימת.

**כותב:** סשן הביקורת, אחרי A4 (CL-11, ‏CL-12, ‏CL-24). **שער:** ZURIEL (DB ו־Edge).

**הוכרע (D-CL13-2, ‏ZURIEL 12.11):** זיכרון להמשך שיחה פרטית מותר גם בלי חשבון אתר, אחרי אימות שולח והסכמה. מידע מחשבון האתר — רק אחרי קישור. אין חשיפה בקבוצה, ואין איחוד זהויות משתמע. בתקופת ההשהיה (D-CL13-1) אין כתיבה חדשה (§14).

## 9. רשימת סגירה מאוחדת — סשן החוזים מול רשימת הביקורת (סבב 3; עודכן בסבב 4)

**מקור ההתאמה:** `docs/reviews/m0-security-stabilization-20261112/foundation-closure-list.md` בראש `c45dd3740` (גרסה 2). גרסה 1 נמצאת בראש `6352be19d`. ההבדלים בין הגרסאות:
- A4 פוצל ל־A4a/A4b.
- B4 יצא מסימון ★: הוא בא אחרי A2, ואינו תנאי ל־M0.
- נוספו §1.G (שורות CL שבהן הכותב הוא הביקורת), §1.H (מטריצת CL-13) ו־§1.I (דרישות עתידיות).

**חלוקת הכותבים (ZURIEL, 12.11):**
- **CT — סשן החוזים:** משמעות החוזים, בעלות, מטריצות התנהגות, מסמכים, שורות ב־Owner Index, והצעות טקסט ו־metadata לחוקים.
- **MA — סשן הביקורת הראשית:** הכותב הטכני **היחיד** של G1, של משמרי המסד ושל תיקוני ה־Runtime (Edge, פונקציות, `edges`, קוד).
- **ZURIEL:** כל הכרעה וכל שינוי חי.
- **בעלות פעילה** נקבעת רק מרשומה ביומן או מהוראת ZURIEL. קיום של ענף אינו מוכיח בעלות.

**מקרא — סיווג:**
- **R** = חוסם שחרור מסוים (השחרור מצוין בשורה).
- **B** = חוסם סגירת בסיס.
- **F** = שיפור עתידי; נשמר ומתועדף.
- **✔** = נסגר או נסוג.

**מחוץ לרשימה, במפורש:**
- הרחבת אנליטיקס (X1–X4) — מוצגת בנפרד על ידי MA.
- תיקון המדידה הקיימת (C1–C6) — נשאר בעבודה הקיימת של MA.
- כל הרצת SQL, שינוי הרשאות, מיזוג או פריסה.

### 9.1 שורות סשן החוזים (CL)

| # | ממצא | מקביל ברשימת הביקורת | סיווג | כותב | בעלים חוזי / מקור | תלות | מבחן קבלה | שער |
|---|---|---|---|---|---|---|---|---|
| CL-01 | אין ב־Owner Index ניתוב ל־`research_contributions` / לצ'אט | ‏F (שורת CL-01) | **B** — לפי G1 (v18 §61), מסלול הכניסה מגיע היום לחוק שפרש | CT | `research_workspace_law` v5 §8 + `writer_material_home_law` v6 | — | G1: שורת OI אחת (S5) | מיזוג |
| CL-02 | ‏`writer_material_home_law` מפנה לחוק שפרש | ‏F | **✔ נסוג** (§0 פריט 5) | — | — | — | — | — |
| CL-03 | הקרנת הקבוצות ב־v2 מעתיקה את גוף ההודעה | ‏F (שורת CL-03) | **R** — לשחרור v2 בלבד | הכרעה: ZURIEL; ניסוח: CT; מימוש: ייקבע | `writer_material_home_law` v6 §23 (+§5, ‏§20); §12 | — | ‏§12, מבחנים (1)–(7). **סבב 4:** מפרט מסירה §12.1 (המלצת Codex), מבחנים A1–A12 | ZURIEL; ‏DB לפני ההחלה |
| CL-04 | ארבעה חוקים שפרשו בלי מיפוי יורש | ‏F (שורת CL-04) | שלושה חוקים שיש אליהם הפניה: **B** (G1 — יעד שמפנים אליו בלי יורש). ‏`metatron_brain_persona_lens_law`, שאין אליו הפניה: **F** | CT (metadata) | ‏§11.3 | — | G1: ‏`RETIRED_WITHOUT_RECORDED_SUCCESSOR` ריק; תצלום מתוארך חדש (MA). **נוסח metadata מוצע — §16.4** | חוק חי |
| CL-05 | ‏14 הפניות | ‏F (שורת CL-05) | **F** — חוץ מ־Series, שעבר ל־CL-21 | CT | ‏§11.1 | — | ‏ledger: 8 שינויים בגרסה הבאה של כל חוק; 4 נשארים; 2 עוברים ל־CL-19 ול־CL-20 | חוק חי |
| CL-06 | צרכני DB שקוראים מזהים שפרשו | ‏G (CL-06) | **F** (P1) | MA | ‏§3; ‏§11.2 (שורות 14 ו־66) | A2. שורה 66 — גם CL-20 | ‏md5 לפני ואחרי | DB / DDL |
| CL-07 | התווית `unified_graph_law` נשמרת ברשומות | ‏G (CL-07) | **F** | MA | `reality_graph_law` | הכרעה | מבחן | מיזוג |
| CL-08 | קשתות `extends_rule` לחוקים שפרשו | ‏G (CL-08) | **F**. בסבב 3: רק הקשת ל־`unified_graph_law` מוחלפת. הקשת ל־`entity_structure_law` נשארת (§11.2) | MA | `reality_graph_law` | — | קריאה: קשת אחת בלבד לחוק שפרש | DB |
| CL-09 | הצעות 20 ← 30, ‏23 ו־24 ממתינות; נעילות גרסה במסמכי המצביעים | ‏F (שורת CL-09) | **F** | ZURIEL מריץ; CT מעדכן את המסמכים | לפי החוק | — | G1 + תצלום חדש | DB |
| CL-10 | `f30c0148` | ‏F (שורת CL-10) | **✔ הוכרע** (ZURIEL, 12.11): לא נפרש בשלב זה, ונשאר מחוץ להצעה 21 | — | — | — | — | — |
| CL-11 | פרסונת רזיאל מצטטת 3 חוקים שפרשו; `addon_wa` ריק | ‏G (CL-11) | **B** — v18 §65: runtime של מוצר נבדק בגבול שלו, בלי סמכות מיושנת | MA | `raziel_companion_layer_law` v3 | אחרי A4 | ‏§8.1, ‏ST-1 | DB + Edge |
| CL-12 | מחרוזות גרסה ובעלים ישנות | ‏G (CL-12) | **B** — v18 §53 (רעננות) ו־§65 | MA | `raziel_*`, ‏`platform_tiers_law` | אחרי A4 | ‏ST-2 | Edge |
| CL-13 | כתיבה אוטומטית לזיכרון ולפרופיל מ־DM | ‏§1.H; ‏A4b★ | **R** — פריסת `wa-raziel` (A4b). **B** — `foundation_closure_protocol_law` v8 §E | MA (מימוש ומבחנים); CT (המטריצה, §14) | ‏§14 | **שאלות המדיניות הוכרעו** (D-CL13-1..3, ‏12.11). נסגר רק אחרי מימוש ואימות | R1–R10; ‏M-1–M-14 (§14.6) | ZURIEL; DB / פריסת Edge |
| CL-14 | תווית «צוות» לא מוצגת לאורח | ‏G (CL-14) | **F** (P1) | MA | Experience | A6 | ‏worker: הקריאה עוברת לאורח | מוצר ← מיזוג ← פריסה |
| CL-15 | אכיפה ב־CI | ‏B1★, ‏B2★, ‏B3★ | **B** | MA (יחיד) | v18 §28–31; v8 | — | מקרי S, ובנוסף §13 (A2, ‏A3, ‏A4) | מיזוג; B6 |
| CL-16 | פערים בשער המסד | ‏B4 | **B** — לסגירת הבסיס. **אינו** תנאי ל־M0 | MA | v8 · v18 | אחרי A2 | ‏D12, ‏D12b, ‏D13*, ‏D14, ‏D15; ובנוסף §13 (D2, ‏E4) | DDL |
| CL-17 | ה־workflow המשותף | ‏G (CL-17) | **F**. הטענה על ארבעה ענפים פעילים — נסוגה (§0 פריט 8) | MA | — | מיזוג מסודר | `ci-workflow-references-exist` | מיזוג |
| CL-18 | דרישות תוכנית־האב | חלק מ־F4 ו־F5 | **F** — נשמרות ומתועדפות (ZURIEL, 12.11) | ZURIEL (עדיפויות) | ‏§7, ‏§7.0 | — | — | — |
| CL-19 | **חדש:** כלי פרסום חיצוני חיים בלי בעלים פעיל. 9 פונקציות SECURITY DEFINER; ‏service_role בלבד; 0 משימות cron | — | **B** — יכולת חיה של פרסום חיצוני, שהטקסט היחיד שמנהל אותה פרש | CT (טקסט בעלים: EXTEND_EXISTING `publishing_conventions`); MA (בדיקת הרשאות) | `publishing_conventions` (מוצע) | הכרעה | הבעלים כותב: יעדים, ‏dry-run, אישור Human Gate, ומי מריץ. **נוסח מוצע — §16.1** | קודקס (ZURIEL) |
| CL-20 | **חדש:** לפרוטוקול RLS/GRANT אין בעלים פעיל, בזמן שה־cron השבועי פעיל | — | **B** — מנגנון אבטחה פעיל בלי בעלים פעיל | CT (טקסט: EXTEND_EXISTING `person_foundation_contract_law`); MA (ההודעה ב־`fn_rls_grant_audit`, ‏CL-06) | `person_foundation_contract_law` (הבעלים המשפחתי של security_privacy) | — | הפרוטוקול כתוב בבעלים פעיל; שורות ledger 14 ו־66 נסגרות. **נוסח מוצע — §16.2** | חוק חי |
| CL-21 | **חדש:** "Series = תג" — מקור אמת שהוחלף ב־6.11, ועדיין כתוב בשלושה מקומות | — | **B** — v18 §58: הוראה סותרת אצל בעלים פעיל | CT | content contract §5; ‏PLAN37 ‏DEC-SERIES | — | שלוש השורות מפנות ל־§5. **נוסח מוצע — §16.3** | חוק חי + קודקס + מיזוג |
| CL-22 | **חדש:** קודקס 4 — הסעיף מ־7.9 ("post_update_on_top ממשיך לחול") מול ההחלטה מ־15.9 | — | **F** — ההחלטה המאוחרת מפורשת | CT | `publishing_conventions` | — | הערה בעדכון הבא של הקודקס | קודקס |
| CL-23 | **חדש:** `metatron_brain_persona_lens_law` בלי מיפוי; דרישת context_version | — | **F** | CT | ‏§11.3; ‏§8.1 | — | RT-6, ‏RT-8 | חוק חי |
| CL-24 | **חדש:** חוזה ההקשר של רזיאל — שליפת Top-K של בעלים עם גרסה וסינון הרשאות | — | **F** (P1) לשליפה. ‏ST כלול ב־CL-11 ו־CL-12 (B); ‏RT-7 כלול ב־CL-13 | MA | ‏§8.1 | A4 | RT-1–RT-8 | Edge + DB |
| CL-25 | **חדש:** פערי קבלה שמקרי S/D לא מכסים | — | **B** | MA | ‏§13 | — | מקרים חדשים: A2 (CI), ‏A3, ‏A4, ‏D2, ‏E4; ציון מפורש של B3 ו־E5 | מיזוג; DDL |

### 9.2 שורות ברשימת הביקורת שהכותב שלהן הוא סשן החוזים

הסיווג כאן תואם את סימון ★ שלהם.

| שורה שלהם | ממצא | סיווג | הערה מסבב 3 |
|---|---|---|---|
| B9★ | "המפה" ניתנת לפירוש כמסמך 37 | **B** | נוסח — ממתין להחלטת ZURIEL |
| B10 | ל־Roadmap אין שושלת מקורות | **F** | §7.0 נותן את המקורות (S5: מזהי היומן של v3–v5) |
| C7 | מקורות M0-F בתוך TI | **R** — לשחרור M0-F, לפניו או איתו | — |
| C8 | סימון NON-OBSERVING ב־TI | **F** | — |
| C9 | בעלים לפרטיות האנליטיקס | **F** — חוסם את X בלבד | — |
| D1★ | שורת בעלים ל־SEO | **B** | — |
| D8 | ‏7 קובצי html סטטיים | **F** | — |
| D14 | שתי כתובות לכותב | **F** | — |
| E3 | שורות `lock_galleries` / `lock_research` | **F** | — |
| F1 | ‏18 קבצים דמויי־חוזה לא מנותבים | **F** | — |
| F2 | הפניות ישנות ובאנרים (OI:36) | **F** | ה־ledger עוקב |
| F3 | רישום החלטת האינדוקס מ־4.11 | **F** | — |
| F4 | סתירות נתיב בין מסמך 37 לתוכנית־האב | **F** | הבסיס: §7.0. החלטה מאוחרת גוברת |
| F5 | ‏19 פריטים ב־HANDOFF §7 | **F** | — |

**שורות A, ‏C1–C6, ‏D (חוץ מ־D1, ‏D8 ו־D14), ‏E (חוץ מ־E3) ו־X** — אצל הביקורת, בלי שינוי מכאן.

**סדר ההחלה:** בלי שינוי לסדר שלהם (§2 שם). כל פריט מסד או Edge מכאן נכנס **אחרי** A2/A4, לפי הטבלה שלהם.

## 10. מי הם "שני הקוראים", תחומם, ומה לא נבדק

"שני הקוראים" הם שני תת־סוכנים **בקריאה בלבד**, שהופעלו על ידי סשן החוזים בלבד כדי לקרוא מסמכים גדולים; לא הופעלו אחרים ולא יופעלו. **בסבב 3 לא הופעלו קוראים או סוכנים** — כל הקריאה בסבב נעשתה ישירות. **אין להם בעלות כתיבה** ולא כתבו דבר (SELECT ו־`git show`/`git grep` בלבד). הדיווחים שלהם הם פלט מודל — אימתתי בעצמי את הנקודות המסומנות כ"אימתתי" ב־§7–§8, ואת השאר אני מציג כדיווח קורא.

| קורא | תחום | מה החזיר | מגבלה |
|---|---|---|---|
| קורא מסמך 37 מול תוכנית־האב | `nodes.id f30c0148…`, `project_codex.id=37`, Roadmap/State/Owner Index, מסמכי פרישת Legacy | טבלת R1–R16 מול החלטות (§7) | קריאה מילולית של ~19% ממסמך 37 + חיפוש מילות מפתח; לא נקרא: רוב V3 השמור (L1219–1916), רוב 12.1–12.9, 12.14–12.44, 12.46–12.56 |
| קורא הקשר רזיאל | `ai-analyze`, `wa-raziel`, `raziel-attention`, `research-run`, `_shared/*`, קבצי Raziel ב־`src/lib/research`, חוקי `raziel_*` | מפת הקשר, מזהים ישנים, פערי חובות (§8) | לא נבדקו: גרסאות Edge שנפרסו, פלט מודל אמיתי, `wa-christina`/`wa-webhook`/`wa-uriel`, קוד לקוח ל־voice, גוף `fn_raziel_plan`/`fn_raziel_answer` (קרא ראש + regex) |

**סיווג אימות (מה אומת עצמאית, מה אומת בידי Codex, ומה דיווח קורא בלבד):**

| סיווג | ממצאים |
|---|---|
| **אומת עצמאית על ידי (שאילתות חיות / `git` על `aa0f6bc82` / דפדפן, 12.11)** | 55 ההפניות / 31 חוקים / 38 חוקים שפרשו; 87 חוקים פעילים; 44 שפרשו; 3 ללא יורש; `compaction_v1`/`owner_routing` של `research_contribution_law` v9; `research_workspace_law` v5 §7–8, §12; ציטוט `engine_governance…`; הטריגר, ההרשאות ו־event triggers על `nodes`; `fn_rules_snapshot` מחזירה `[]` ל־5 מזהי ה־dossier; משמר `never_silent` = false; `fn_raziel_remember`/`fn_raziel_fact` (גוף הפונקציות); `writer_material_home_law` v6 §23 (node, md5, ציטוט); `lock_raziel_site`; 3 חוקים שפרשו ב־`raziel_brain.core`; `addon_wa` ריק; 6 החוקים המופצים (2,685 תווים); שורות `wa-raziel:412–415`, `918–937`; `ai-analyze:3720–3724,4173,4178`; `razielRouteGrammar.js:11–14`; חפיפת קבצים עם #1321 (145 קבצים, 0 חפיפה); הודעות הסגירה של `/start`, `/timeline`, `/numbers`, `/archive`; `STATUS.md`: הצעה 21 "NOT APPLIED"; 10 שורות spec פעילות; 0 הופעות של 11 שמות הדרישות במסמך 37; 403 `public_reading_operation_denied` לאורח; ענף v2 וקובציו |
| **אומת בידי Codex (לפי ZURIEL)** | עצם הכתיבה של DM בוואטסאפ לזיכרון ולפרופיל — בקוד הפרוס ובפונקציות המסד (CL-13) |
| **דיווח קורא בלבד — לא אומת עצמאית** | פרטי הקשר רזיאל שמעבר לאמור למעלה (מספרי שורות אחרים, פירוט 470 שורות הזיכרון, גוף `fn_raziel_plan`/`fn_raziel_answer`, גרסאות Edge שנפרסו); כל טבלת R1–R16 מלבד השורות שצוינו; כיסוי מסמך 37 (~19% מילולי) והממצא "לא נמצאה החלטה" |
| **מגבלה מפורשת** | כיסוי מסמך 37 **חלקי**, ו**היעדר החלטה עדיין לא הוכח** — "לא נמצאה החלטה" אינו "אין החלטה" |
| **אומת עצמאית בסבב 3 (קריאה מלאה, SELECT או `git`)** | **חוקים פעילים:** `engine_governance_registry_authority_law` v1, ‏`research_object_identity_invariant_law` v2, ‏`research_gold_hints_law` v4, ‏`canonical_ui_components_law` v12, ‏`els_research_layer_law` v9, ‏`inter_agent_coordination_law` v18, ‏`reality_graph_law` v8, ‏`canonical_methods_registry_law` v6, ‏`graph_privacy_foundation_law` v1, ‏`cross_vs_convergence_criteria` v4 §6, ‏`writer_material_home_law` v6, ‏`truth_axes_foundation_law` v3, ‏`person_foundation_contract_law` v6, ‏`raziel_group_privacy_law` v1, ‏`raziel_whatsapp_access_adapter_law` v1, ‏`raziel_companion_layer_law` v3; שישה חוקי רזיאל נוספים (`ai_analyze_contract` v2, ‏`raziel_routing_law` v2, ‏`raziel_full_answer_and_route_law` v3, ‏`raziel_response_contract` v1, ‏`raziel_voice_law` v1, ‏`bot_delivery_law` v1); התלויים מסבב 1 (`auto_share…`, ‏`post_og…`, ‏`source_video…`, ‏`signal_vs_curation`, ‏`work_log_authority…`, ‏`live_state_resolution…`, ‏`corpus_admission_foundation_v1`, ‏`gematria_auto_registry…`). **חוקים שפרשו:** ה־14 ו־`metatron_brain_persona_lens_law`. **מקורות התוכנית:** S1–S4. **סעיפים וקבצים:** סעיפי קודקס 4 (26.8, ‏7.9, ‏15.9, ‏5.10); ‏content contract §5–§6; ‏`docs/corpus-admission-foundation-v1-contract.md` (שורה 86, §6); ‏`CORPUS_APPROVAL_LIFECYCLE.md` §1–§3. **מצב חי:** ה־cron ‏`rls-grant-audit-weekly`; ההרשאות של 9 פונקציות הפרסום; ‏`ownerResolves` ב־`c45dd3740`; ה־blobs והחפיפה מול #1321; החתימות והקוראים של מנגנוני ההקשר של רזיאל; ‏`ai-analyze` (שורות 837, ‏2746, ‏3069, ‏3207, ‏4060) ו־`wa-raziel:247`; מיקומי האזכורים ב־`auto_share…` |
| **לא נבדק בסבב 3** | קודקס 4 במלואו; ‏`never_silent_metatron_law`; ‏`entity_structure_law`; ‏Roadmap v3–v5 (S5); 10 ההחלטות הפתוחות ב־S4; מימוש דפי הכתב (W1–W2); ‏`RAZIEL_PERSONALIZATION_LAW.md` במלואו (נבדק רק במילות מפתח); האם זיכרון `wa:<phone>` נשלף בפועל ב־DM לא מקושר; מסמך 37 מעבר לשורות DEC-SERIES הממוקדות; גוף `fn_rls_grant_audit`; ‏`traffic_intelligence_law` v11 |

**מה לא נבדק במסירה כולה:** (1) קריאה מלאה של מסמך 37 (נדרש קורא עצמאי אם סגירה תלויה בהיעדר החלטה); (2) ~~14 ההפניות `REPOINT_TEXT` בהקשר של שורה אחת בלבד~~ — נקראו במלואן בסבב 3 (§11); (3) הנתונים החיים אחרי 12.11; (4) האם `service_role` יכול להשבית טריגר; (5) טבלאות שנוצרו מחוץ ל־`supabase/migrations`; (6) `test/admin-system-health-contract.test.mjs` — האם נועלת גרסת `subscription_funnel_law` (לבדוק לפני הרצת 23).

**קבצים בענף `claude/laws-alignment-20261112`** (נדחף בסבב 2, בלי force ובלי PR; הראש לפני סבב 3: `0a5882774`):
- `docs/reviews/contract-governance-audit-20261110/laws-alignment-20261112/README.md`
- `.../retired-reference-ledger.txt`
- `.../HANDOFF-20261111.md` (§8)

**אחרי סבב 3 — מסמכים בלבד:**
- ארבעת קובצי הקוד והנתונים של G1 הועברו לסשן הביקורת (§15).
- `scripts/test-g1-agent-routing-smoke.mjs` הוחזר לגרסת `aa0f6bc82`.

**לא נגעתי ב:** `.github/workflows/*`, ‏`public-reading-deploy/*`, ‏`supabase/functions/*`, ‏`src/*`, ‏`supabase/migrations/*`, ‏Owner Index, ‏ROADMAP, ‏STATE.

## 11. פסקי ההפניות והיורשים — אחרי קריאה מלאה (סבב 3)

**מה נקרא במלואו** (בעצמי, SELECT על `nodes` ו־`project_codex`, 12.11):
- החוקים התלויים של 14 ההפניות ושל 5 שורות `NO_SUCCESSOR`.
- 14 החוקים שפרשו (סבב 2–3), ועוד `metatron_brain_persona_lens_law`.
- סעיפי היורש.

בקודקס 4 (72,978 תווים, עודכן 11.11) נקראו במלואם רק הסעיפים שמצוטטים כאן, לא כל הקודקס.

**כלל העבודה:** `canonical_owner` רשום הוא נקודת התחלה, לא הוכחה. הפסק נקבע רק אחרי שמצאתי את הסמנטיקה בסעיף יורש מסוים. אם לא מצאתי — ההפניה נשארת היסטוריה, או נרשמת כפער.

**אין כאן שינוי:**
- כל החלפה היא שינוי טקסט או metadata בגרסה הבאה של החוק התלוי, ודורשת אישור ZURIEL.
- הפניה היסטורית תקינה נשארת היסטוריה.
- אחרי כל שינוי חי — תצלום G1 מתוארך חדש (סשן הביקורת).

### 11.1 ארבע־עשרה ההפניות

| # | חוק תלוי (גרסה · node · md5) | ההפניה ומה הטקסט אומר | יעד רשום | פסק | יעד מוצע | סעיף תומך ביעד | צרכנים מושפעים |
|---|---|---|---|---|---|---|---|
| 1 | `auto_share_uses_live_post_law` v1 · `0bb6b4ad…` · `3843180a…` | `social_autonomy_law` (EXT): "הרחבה של social_publish_law / social_autonomy_law" | `project_codex.publishing_conventions` | **KEEP_HISTORY — אסור להחליף.** ה־metadata של החוק שפרש: "historical autonomous-publish policy CONFLICTS with current Human Gate". החלפה תיצור ירושה כוזבת של מדיניות הפרסום האוטונומי | בגרסה הבאה: הערה "מדיניות הפרסום האוטונומי פרשה ואינה נורשת; פרסום חיצוני נשאר תחת Human Gate" | CLAUDE.md §11; `truth_axes_foundation_law` v3 | החוק `propagate=true`. האזכור בתווים 432–453 מתוך 534, ולכן `fn_active_method_rules` (חיתוך ל־400) **לא מעביר אותו לפרומפט** (אומת). ה־RPC `social_share_post` לא קורא את המזהה |
| 2 | כנ"ל | `social_publish_law` (EXT) | קודקס 4 | **SEMANTIC_GAP.** סמנטיקת הכלים (`FB_ADMIN_KEY`, ‏`fb_publish_*`, ‏`ig_publish`, ‏`social_admin`; "עדיין לאשר מול ZURIEL") **לא נמצאה** בקודקס 4 (0 התאמות) | — (אין בעלים פעיל) → CL-19 | — | 9 פונקציות חיות, כולן SECURITY DEFINER. anon ו־authenticated: אין EXECUTE. ‏service_role: EXECUTE לכולן חוץ מ־`social_share_post`. ‏0 משימות cron (אומת 12.11) |
| 3 | `canonical_ui_components_law` v12 · `c245a170…` · `7babed68…` | `dim5_upload_law` (FUNC). ‏v2 (26.8): "מקורות-אמת: זהות = posts row · סיווג = posts.categories · Series = תג (dim5_upload_law v2)" | קודקס 4 | **REPOINT_OTHER_TARGET.** "Series = תג" **הוחלף ב־6.11**: `SOD1820_CONTENT_FOUNDATION_CONTRACT.md` §5 — "מסמך זה אינו מגדיר סדרות ואינו מגדיר חברות בסדרה… PLAN37 … DEC-SERIES-003/004/005/006… `contentSeries2029Identity.js`". הנוסח הישן מסומן שם "היסטורי · לא נורמטיבי". קודקס 4 עדיין כותב "Series (תג «מימד חמש»)" (הרחבה מ־26.8), ולכן **אינו** היעד | content contract §5 ← PLAN37 ‏DEC-SERIES-003…006 + `src/lib/research/contentSeries2029Identity.js` | content contract §5 (עודכן 6.11.2026); מסמך 37: ‏DEC-SERIES-003…006 ‏APPROVED (נקראו רק השורות הממוקדות) | הערות קוד בלבד (`categoryIcons.js`, ‏`DimensionFiveBadge`). **הניסוח הישן עדיין כתוב בשלושה מקומות** (CL-21): השורה הזו; קודקס 4 (26.8); ‏content contract §6, שורה 116 |
| 4 | כנ"ל | `unified_graph_law` (EXT). שורת הפתיחה של v1: "חוק-על (הרחבת unified_graph_law לשכבת ה-UI)"; ‏`metadata.extends='unified_graph_law'` | `reality_graph_law` | **REPOINT_SUPPORTED** — ב־metadata. שורת v1 נשארת היסטוריה | `reality_graph_law` v8 | ראש v1: "Zero-Duplicate-Code: רכיב חדש עובד על כל type בלי שכפול… Graph אחד·Ontology אחת·Entity Hub אחד"; ‏v5 §10 RETIRE, DO NOT DUPLICATE | הערות: `src/lib/research/entity.js`, ‏`src/lib/contributions.js` |
| 5 | `els_research_layer_law` v9 · `cbeb4f61…` · `f46ac0ee…` | `unified_graph_law` (EXT). ‏v1: "ה-PIPELINE (הרחבת unified_graph_law)"; שכבה 3: "כל תוצאת ELS הופכת ל-Edges בגרף"; ‏`metadata.extends` | `reality_graph_law` | **REPOINT_SUPPORTED** — ב־metadata | `reality_graph_law` v8 | ‏v1 "כל קשר Edge"; ‏v5 §3 ONE ANCHOR, MANY PROJECTIONS; ‏v5 §4 ONE OBJECT · MANY TYPED RELATIONS. החוק התלוי כבר צורך את Reality Graph (OWNER CHECK של v3) | קשת `extends_rule` שיוצאת משורה **לא פעילה** (v2). זו היסטוריה, בלי שינוי |
| 6 | `engine_governance_registry_authority_law` v1 · `ca3796f7…` · `368095df…` | `rabbati_letter_method_law` (FUNC). ‏HG-E1: "«אות רבתי» … אסור לסרוק אותה אוטומטית (rabbati_letter_method_law — הערך אינו פונקציה טהורה של הביטוי לבדו)" | `project_codex.gematria_engine` | **KEEP_HISTORY.** בקודקס 5 אין "רבתי" (0 התאמות). הנימוק כתוב בחוק התלוי עצמו, והשער חי: שורת הרישום `אות רבתי` (`fn_rabbati`) היא active, עם `scannable=false` | — | החוק התלוי, HG-E1; ‏`public.gematria_methods` | אין |
| 7 | `person_foundation_contract_law` v6 · `8b957f76…` · `84c7e2e0…` | `unified_graph_law` (EXT, בטקסט) | `reality_graph_law` | **REPOINT_SUPPORTED** — בטקסט בלבד; `metadata.extends` כבר כולל את `reality_graph_law` | `reality_graph_law` v8 | ‏v4 (6.9) Entity Identity Promotion Contract (Person); ‏v5 §1 | אין |
| 8 | `post_og_image_law` v1 · `2fa1a2a9…` · `6e1b616d…` | `post_publish_law` (REL — ברשימת `related`) | קודקס 4 | **REPOINT_SUPPORTED** | `project_codex.publishing_conventions` | ‏Owner Index:178 ("publishing conventions / Post identity"); קודקס 4: "modified קובע סדר בלבד ואינו אות ל״עדכון חדש״ (SOD1820_DESIGN_CONTRACT_V2.md §8.1)" | הערה ב־`src/lib/supabase.js` |
| 9 | `research_gold_hints_law` v4 · `09d69629…` · `44f22b82…` | `convergence_explanation_law` (EXT). ‏OWNER CHECK של v4 (30.9): "Consumes signal_vs_curation v2 + convergence_explanation_law v1 + …" | `reality_graph_law` | **REPOINT_OTHER_TARGET.** ב־`reality_graph_law` יש Explain-Why למדיה בלבד (v7 §3, §5). הסמנטיקה הכללית נמצאת ב־`cross_vs_convergence_criteria` v4 §6: לשון פשוטה, עובדה מול פרשנות, לא שוויון ערכים בלבד. ה־`archive_reason` של החוק שפרש מציין אותו | `cross_vs_convergence_criteria` v4 §6 (הבעלים המשפחתי: `reality_graph_law`) | ‏§6: "EXPLAIN WHY IS LOAD-BEARING … plain language and inspectably … What is verified fact versus claim/interpretation … A bare graph edge or value equality is never sufficient" | אין. "אסור לאשר או לפרסם התכנסות בלי הסבר" לא כתוב שם מילולית. הכיסוי דרך "Every surfaced convergence must…" הוא פרשנות |
| 10 | `research_object_identity_invariant_law` v2 · `e9cf65c7…` · `37619075…` | `post_update_on_top` (FUNC). ‏v2 (2.9): הפרגמנט `#update:<תאריך>:<label>` נקרא "מילולית מהכותרת … (לפי post_update_on_top)" | קודקס 4 | **KEEP_HISTORY.** הפרסר קורא כותרות של פוסטים קיימים, שנכתבו לפי המוסכמה ההיסטורית `עדכון · [תאריך] · [שם]`. המוסכמה כתובה **רק** ב־`metadata.header_format` של השורה שפרשה. בקודקס 4, תוספת G2 (15.9): "The historical “update-on-top” layout is a legacy presentation choice … Experience governs layout" | — | קודקס 4, תוספת G2 (15.9, ‏POST TEMPORAL HISTORY); ‏Owner Index:179 | **סתירה בתוך קודקס 4** (CL-22): הסעיף מ־7.9 (§2) עדיין קובע "post_update_on_top ממשיך לחול" על עדכון אירוע. ההחלטה מ־15.9 מאוחרת וגוברת לגבי הפריסה |
| 11 | `signal_vs_curation` v2 · `21b70c56…` · `cf293d95…` | `zuriel_focus_law` (FUNC): "הפירוט המלא: zuriel_focus_law" | `truth_axes_foundation_law` | **KEEP_HISTORY.** קראתי את `truth_axes` v3 במלואו. אין בו את קשירת המיקוד של ZURIEL, את `discovered_not_selected`, את כיול 786 ואת `decision_ledger`. העיקרון עצמו (Discovery ≠ Presentation, Suggest ≠ Include ≠ Publish) כבר כתוב בחוק התלוי | — | — | אין. הפירוט נשמר כדרישה — הוא לא בוטל. להעביר אותו לגרסה הבאה של `signal_vs_curation`, כשייגעו בחוק |
| 12 | `source_video_publish_law` v1 · `06278103…` · `d26b651c…` | `dim5_upload_law` (EXT): "מרחיב … עקרון ה-self-host שכבר קיים ב-dim5_upload_law וב-orgeula_video_pipeline_law" | קודקס 4 | **REPOINT_SUPPORTED** | `project_codex.publishing_conventions` | קודקס 4, "UNIVERSAL MEDIA DEFAULTS FROM DIMENSION FIVE GOLDEN · Human-Gate ZURIEL · 5.10.2026", ‏§2: "Publishing a video means the self-hosted source video itself is present". באותו סעיף: "dim5_upload_law v4 is a Golden/legacy calibration source, not a new owner" | אין |
| 13 | כנ"ל | `orgeula_video_pipeline_law` (EXT) | קודקס 4 | **REPOINT_SUPPORTED** | `project_codex.publishing_conventions` | כמו #12, ובנוסף תוספת G2 (15.9): "LEGACY OPERATIONAL RECIPES ARE ON-DEMAND HISTORY … orgeula_video_pipeline_law … do not define 2029 publication architecture" | אין |
| 14 | `work_log_authority_law` v2 · `a716dac5…` · `7b5ffedf…` | `rls_client_read_protocol` (REL, ‏`sibling_laws`) | `person_foundation_contract_law` | **SEMANTIC_GAP.** קראתי את `person_foundation` v6 במלואו. יש בו ציר הרשאות ו־Root-of-Trust, אבל **אין** בו את פרוטוקול RLS/GRANT: ‏RLS בלי policy חוסם בשקט; GRANT ברמת עמודה; הגלאי `rls_grant_gaps()`; רשימת התעלמות; ביקורת שבועית | — (אין בעלים פעיל) → CL-20 | — | **צרכן חי:** ה־cron `rls-grant-audit-weekly` (`0 3 * * 0`, פעיל) קורא ל־`fn_rls_grant_audit()` (אומת 12.11); ‏`video_transcription_law` v1 (FUNC, שורת ledger 66) |

**סיכום:**

| פסק | הפניות |
|---|---|
| REPOINT_SUPPORTED | 6 (#4, #5, #7, #8, #12, #13) |
| REPOINT_OTHER_TARGET | 2 (#3, #9) |
| KEEP_HISTORY | 4 (#1, #6, #10, #11) |
| SEMANTIC_GAP | 2 (#2, #14) |

שינויי הטקסט וה־metadata (8 הפניות ב־6 חוקים) נעשים בגרסה הבאה של כל חוק, באישור.

### 11.2 שורות נוספות ב־ledger שהפסק שלהן השתנה בסבב 3

| שורה | חוק תלוי ← יעד | ממצא | פסק חדש |
|---|---|---|---|
| 42 | `live_state_resolution_law` v3 (`447569e9…`, `fc45009b…`) ← `agent_onboarding_law` | הטקסט אומר "היסטורי, אינו מופעל מחדש". אבל ב־`metadata.clarification_v2` כתוב: "does not weaken the standing, separate agent_onboarding_law requirement that every DB WRITE needs live-schema verification + work_log coordination". זו הפניה פונקציונלית שמכנה חוק שפרש "standing" | **REPOINT_SUPPORTED** — ב־metadata בלבד. יעד: `live_state_resolution_law` (הבהרה v2) + `inter_agent_coordination_law` v18 §40 ("Before CLAIMED_WRITE it MUST live-reverify canonical owner, current main/DB, and overlapping active writers") + CLAUDE.md §12 |
| 14 | `ai_analyze_contract` v2 ← `never_silent_metatron_law` (REPOINT_CONSUMER, סשן הביקורת) | הבעלים הרשום, `raziel_companion_layer_law`, אינו מזכיר שתיקה (0 התאמות, 12.11). ה־`archive_reason`: "completion/full-answer semantics absorbed by raziel_full_answer_and_route_law v3 + ai_analyze completion contract" | יעד הטקסט (הצעה): `raziel_full_answer_and_route_law` v3, סעיפים (2) ו־(א), + `ai_analyze_contract` v2 §D–§E. **את החוק שפרש עצמו לא קראתי במלואו** — לבדוק לפני שינוי הצרכן (CL-06) |
| 66 | `video_transcription_law` ← `rls_client_read_protocol` (REPOINT_CONSUMER) | הבעלים הרשום חסר את הסמנטיקה (#14) | **חסום** עד CL-20. אין להפנות ל־`person_foundation` לפני שהפרוטוקול יעבור לבעלים פעיל |
| 39 | `graph_privacy_foundation_law` v1 (2,449 תווים, `0906daac…`, נקרא במלואו) ← `entity_structure_law` (קשת) | אוצר המילים `space ∈ core / lab / private` (§5 של `entity_structure_law`) מנוסח מחדש ב־§4 של החוק התלוי, ונאכף דרך `fn_graph_space_is_public`. ב־`reality_graph_law` (גם בחוק v8 וגם בקודקס id 18) אין אוצר מילים של space/private (0 התאמות) | **KEEP_HISTORY** — הקשת נשארת. את `entity_structure_law` עצמו לא קראתי במלואו |
| 40 | כנ"ל ← `unified_graph_law` (קשת) | — | **REPOINT_EDGE** ל־`reality_graph_law` (v1) — נתמך. הקשת היא שורת DB: סשן הביקורת (CL-08), באישור ZURIEL |

### 11.3 יורשים לחוקים שפרשו בלי מיפוי (ארבעה)

| חוק שפרש (נקרא במלואו) | מה קבע | יורש מוצע | סוג | סעיף תומך | מה קורה להפניות התלויות |
|---|---|---|---|---|---|
| `agent_onboarding_law` v1 (14.6) | כל סוכן קורא את **כל** החוקים ואת `project_codex` לפני כל חישוב או שינוי; גימטריה לפי הגדרות נעולות; חישוב אוטומטי, וכתיבה לליבה באישור | `inter_agent_coordination_law` v18 | **הוחלף, לא נספג.** הדרישה "לקרוא הכול" **מבוטלת במפורש**, ואינה עוברת ליורש | ‏§55 "ONE AGENT ENTRY CONTRACT … through this existing inter-agent owner"; ‏§56 "all active rules, all project_codex … NOT mandatory startup reads"; ‏§34, ‏§49 (תקציב קריאה); ‏§40 (אימות חי לפני כתיבה). דרישת הכתיבה עוברת ל־`live_state_resolution_law` v3 ול־CLAUDE.md §12. דרישת הגימטריה — ל־`canonical_methods_registry_law` ול־`engine_governance_registry_authority_law` | `inter_agent_coordination_law` — ההפניה בבלוק HISTORICAL V1: ‏KEEP_HISTORY. ‏`work_log_authority_law` (REL): ‏REPOINT_SUPPORTED. ‏`live_state_resolution_law` (metadata): ‏REPOINT_SUPPORTED |
| `corpus_admission_lifecycle_law` v1 (26.8) | שש רמות: ENGINE CALCULATED · CORPUS PENDING · CORPUS APPROVED (`visibility_reason=approved_by_admin`) · CLAIM APPROVED · GRAPH CANONICAL · PUBLISHED; ‏`is_verified` אינו אישור אנושי | `corpus_admission_foundation_v1`, ובנוסף `truth_axes_foundation_law` v3 לשלוש הרמות העליונות | **הושלם במפורש** לגבי מחזור החיים. לגבי הצירים העליונים — פרשנות | ‏`docs/corpus-admission-foundation-v1-contract.md` שורה 86: "Supersedes/completes corpus_admission_lifecycle_law"; ‏§6: "EXTRACTED → … → CORPUS APPROVED. Independent of graph-canonical, publication… (all separate axes)"; מעבר סגירה 3 (`resolve_word_review`); ‏`CORPUS_APPROVAL_LIFECYCLE.md` §1–§3 (22.8). השרשרת המילולית בת שש הרמות לא מופיעה בקודקס 26 (0 התאמות) | `corpus_admission_foundation_v1` (HIST): ‏KEEP_HISTORY. ‏`gematria_auto_registry_law` v2 §6 (FUNC: "separate axes per corpus_admission_lifecycle_law + truth_axes"): ‏REPOINT_SUPPORTED ← `corpus_admission_foundation_v1` §6 + `truth_axes` v3 |
| `meshulash_kadmi_law` v1 (3.7) | משולש == קדמי — אותה שיטה, צבירה. ‏ZURIEL אומר "משולש", ובקוד kadmi. אין פונקציה או עמודה חדשה | `canonical_methods_registry_law` v6 | **נספג במפורש** | ‏v5 §12 (13.9): "קדמי ומשולש הם שני שמות לאותה זהות-שיטה: method_key=קדמי … אין rename פיזי"; ‏v6 §21 (18.9): "For method_key=קדמי the public Hebrew label is משולש"; ב־metadata: ‏`aliases` (`[קדמי, משולש] → קדמי`) ו־`public_label_overrides` | `engine_governance_registry_authority_law` (FUNC): ‏KEEP_HISTORY. הסמנטיקה כתובה שם: "«רגיל+משולש» מרכיב את קדמי", ו־HG-E2: `רגיל+משולש=[רגיל,קדמי]`. הערות קוד: `gematria.js`, ‏`compositeMethods.js` |
| `metatron_brain_persona_lens_law` v1 (23.7). **אף חוק פעיל לא מפנה אליו**, ולכן הוא לא היה ב־ledger | מטטרון = שכבת ההקשר והחוקים; רזיאל = הפנים והקול; פרסונה = CORE+ROLE+STYLE. **"context_version: כל תשובה … נושאת את גרסת-החוקים שעליה נשענה"**. מבחן "עץ אחד": שינוי חוק ב־nodes משנה התנהגות בלי לגעת בקוד | `raziel_companion_layer_law` v3, ובנוסף `raziel_routing_law` v2 §9 | **פרשנות** — ספיגה חלקית | ‏companion v3 §1 (one Raziel, many modes); ‏routing v2 §9 (Trace) ו־§10 (אין מערכת מקבילה); ‏`raziel_full_answer_and_route_law` v3 ב׳. **"context_version לכל תשובה" לא כתוב באף חוק פעיל שקראתי.** הדרישה נשמרת ונכנסת לחוזה ההקשר (§8.1, ‏RT-6, ‏RT-8) | אין תלויים פעילים |

כל הצעה כאן היא metadata (`compaction_v1` / `owner_routing`) על השורה שפרשה. אין הפעלה מחדש. זה שינוי חוק חי, ולכן נדרש אישור ZURIEL. אחרי ההחלה — תצלום G1 מתוארך חדש (סשן הביקורת).

**לא נבדק בסעיף הזה:**
- קודקס 4 במלואו — נקראו רק הסעיפים שצוטטו.
- `never_silent_metatron_law` במלואו.
- `entity_structure_law` במלואו.
- גוף `fn_rls_grant_audit` — נקראו רק ההודעה והתזמון.

## 12. ‏CL-03 — תחולת `writer_material_home_law` §23 על הקרנת הקבוצות לצ'אט, והמלצה אחת

**החוזה (נקרא במלואו):** `writer_material_home_law` v6.
- node: `918e5e51-e0ba-4150-8891-bfadfa84aaba`
- תאריך: 30.9.2026
- md5: `b8be155dcfb7f5562d1f33d6de440193`

**תחולה — מה מפורש ומה פרשנות:**

| שאלה | תשובה | סוג |
|---|---|---|
| האם §23 מזכיר את צ'אט הקהילה? | **לא.** הרשימה המילולית: "Future Topic/Researcher/World projections", וכן "topic_cards or a new Topic store" | מפורש |
| האם המטרה של §23 חלה? | **כן.** §23 דורש לפתור את טקסט התורם דרך `source_ref` (`channel_updates:<id>`), אוסר לשכפל את גוף הודעת הוואטסאפ, ודורש "Exact source lineage". שורת צ'אט שמעתיקה את הגוף היא בדיוק עותק שני של גוף הוואטסאפ | פרשנות לפי תכלית |
| סעיפים תומכים באותו חוק | ‏§5 NO WHATSAPP TREE: תורי WA גולמיים הם ראיית קליטה; אין קליטה חוזרת עיוורת כשהחומר כבר קיים; נדרשים dedup ושושלת. ‏§20 SOURCE WORDS SURVIVE IN FULL: רשומת מקור אחת, שלא נכתבת מחדש ולא נקטעת. ‏§21: מקור מול ניתוח. ‏§25: תוויות תצוגה | מפורש |
| החלטה קודמת של ZURIEL | תוכנית־האב לדפי הכתבים (`work_log 57a42125-cb78-4493-94f8-3dfa0457be17`, ‏8.8.2026, ‏`canonical_plan_locked`): העדשות הנלוות, ובהן `channel_updates`, הן "מצביעים, לא העתקים". ו"חוק ברזל: אין מאגר נוסף" | מפורש (תוכנית נעולה) |
| הבעלים של `research_contributions` | `research_workspace_law` v5 §7–8: צינור קלט; עדשה, לא מאגר | מפורש |

**מסקנה:** §23 חל לפי תכליתו, יחד עם §5, ‏§20 ותוכנית 8.8. זו פרשנות. כל המקורות מצביעים לאותו כיוון, ואין מקור שמתיר עותק.

**מה המימוש המוצע (v2) עושה היום** — ענף `claude/group-chat-sync-20261112` @ `8cbbaa12e6b174a3f3aa31ae4f96327172210306`, הקובץ `supabase/proposed/20261112150000_group_chat_sync_gilui_v2_PROPOSAL.sql` (נקרא במלואו):
- **העתקה:** מעתיק את הגוף (אחרי הצנזורה של הקורא) ואת "📎 תמונה/סרטון + URL" אל `research_contributions.body` — שורות 45–47; ההכנסה בשורות 54–60.
- **זכאות:** נבדקת רק בזמן ההכנסה, דרך `world_group_source_arrivals_v2`.
- **כפילות:** אינדקסים ייחודיים חלקיים על `target_id` (`channel_update` / `group_day`, ‏`origin=community_2029`), בדיקת קיום ונעילה.
- **ביטול** (`deleted_at`): רק כש־`held_at` נקבע, או כש־`status` יוצא מ־live/private.
- **לא מטופל** — ובכל המקרים האלה העותק נשאר גלוי:
  - עריכה במקור;
  - שינוי זכאות ברמת הקורא: הסכמה, ‏`general_feed_enabled`, מקור מאופשר, צנזורה;
  - הסרת מדיה;
  - ‏DELETE של שורת `channel_updates`.

**המלצה אחת: הקרנה בהפניה.**

1. **מקור קנוני.** שורת הצ'אט ב־`research_contributions` שומרת רק:
   - מיקום — שורש היום, שרשור, זמן;
   - ייחוס — קרדיט המקור;
   - הפניה מדויקת — `target_type='channel_update'`, ‏`target_id`.

   אין בה גוף ואין קישור מדיה. השורש היומי הוא מיכל מבני בלי טקסט מקור.
2. **הרשאות.** ה־RPCs של הקהילה (`community_feed_page`, תגובות, הקשר, חיפוש) מרכיבים את הגוף והמדיה **בזמן הקריאה**, דרך אותו קורא ציבורי `world_group_source_arrivals_v2`. כך יש מקור אחד לזכאות, להסכמה ולצנזורה. ההרשאות של ה־RPCs לא משתנות.
3. **עדכון.** עריכה במקור מופיעה מיד, בלי סנכרון.
4. **מחיקה או משיכה.** כשהקורא לא מחזיר את המקור — השורה מוצגת "הוסר במקור" או מוסתרת, בלי דליפת טקסט. זה כולל: ביטול הסכמה, ‏`general_feed_enabled=false`, צנזורה, ‏`held_at`, ‏DELETE.
5. **כפילות.** האינדקסים הייחודיים הקיימים על `target_id` נשארים. אין צורך במאגר נוסף.
6. **חיפוש.** חיפוש הקהילה עובר דרך הקורא, ולא על טקסט מועתק.

**החלופה שנדחתה:** חריג מתועד, עם עותק וטריגרי סנכרון. שלוש סיבות:
- היא יוצרת עותק שני של גוף הוואטסאפ, בניגוד לתכלית של §5, ‏§20 ותוכנית 8.8.
- היא חושפת לדליפה של טקסט ישן או מצונזר.
- היא דורשת טריגר לכל אחד מהמקרים הלא־מטופלים.

**הבהרה בחוק (רשות):** בגרסה הבאה של `writer_material_home_law` אפשר להוסיף שורה: "§23 חל גם על הקרנות של `channel_updates` לצ'אט ולפורום". כך הפרשנות הופכת למפורשת. ניסוח: סשן החוזים. אישור: ZURIEL.

**מבחני קבלה** — על PG מבודד, לא על נתונים חיים:
1. עריכה במקור מופיעה בצ'אט בלי שלב סנכרון.
2. ביטול הסכמה, ‏`general_feed_enabled=false` או צנזורה — הטקסט לא מוחזר בקריאה הבאה.
3. ‏DELETE ב־`channel_updates` — מוצגת מצבה, עם 0 תווי מקור.
4. סנכרון כפול — שורה אחת.
5. קריאה של anon או authenticated רק דרך ה־RPCs; ההרשאות לא השתנו.
6. לשורות `target_type='channel_update'` אין `body` מקור (בדיקה או CHECK).
7. החיפוש לא מחזיר טקסט של מקור שנמשך.

**מצב:**
- v2 **לא הוחל**. החסם מוגבל ל־v2, ואינו חל על M0 או על עבודה אחרת.
- ההכרעה: ZURIEL.
- הכותב להמשך: ייקבע בידי ZURIEL. הענף נכתב בסשן החוזים, ואין לפתוח מימוש לפני ההכרעה ("אין פתיחת עבודות מוצר חדשות").
- לפי ההמלצה, השינוי הוא ב־RPCs של הקהילה (קריאה), ולא בחוק.
- **סבב 4:** Codex ממליץ להמשיך בהקרנה בהפניה. מפרט המסירה לכותב הטכני — §12.1. הצעה בלבד; v2 לא יוחל.

### 12.1 מפרט מסירה לכותב הטכני — הקרנה בהפניה (סבב 4; הצעה בלבד)

**מעמד:**
- זו המלצת Codex. ZURIEL ביקש להכין מפרט.
- **אין אישור** למימוש, להחלה או לשינוי DB. ‏v2 הקיים **לא יוחל**, וזה גם לא מימוש של v2.
- כל שינוי כאן הוא DDL/DB — סשן הביקורת או כותב שייקבע, באישור ZURIEL.

**הקורא הקיים — `world_group_source_arrivals_v2(p_limit, p_before)`** (נקרא במלואו, 12.11):
- SQL ‏STABLE ‏SECURITY DEFINER; ל־anon יש EXECUTE.
- **הוא מקור הזכאות היחיד**, דרך שרשרת joins: ‏`channel_update_group_proof` ← ‏`channel_updates` ← ‏`channel_ingest_sources` ← ‏`contributors`.
- **תנאי הזכאות:**
  - ארבעת הערוצים מופעלים, ו־`intake_mode` אינו off.
  - `held_at` ריק; `identity_basis='verified_phone_unique'`.
  - `group_source_intake_public`; ‏`status in (live, private)`; לא פג תוקף.
  - הכותב פעיל, ברשימת ארבעת הכותבים, ו־`general_feed_enabled='true'`.
  - מדיה רק אם האובייקט קיים ב־Storage ו־`group_source_media_publishable_v1`.
- **צנזורה:**
  - קישורים, חוץ מ־YouTube → `[קישור]`; דוא״ל → `[דוא״ל]`; מספרים → `[מספר]`.
  - חיתוך ל־1,200 תווים.
- **מבנה הקורא:** פיד הגעות (limit ≤ 40, ‏before). **אין חיפוש לפי מזהים.**

**מה הקהילה עושה היום:**
- `community_feed_page` ו־`community_replies_page` (limit ≤ 100):
  - מציגות שורה חיה רק אם `nullif(btrim(r.body),'') is not null`.
  - שורה שנמחקה ויש לה צאצא חי מוצגת כ"מצבה" (`is_deleted=true`, שדות ריקים).
  - הספירה `count(*) over ()` מחושבת **לפני** החלוקה לעמודים.
- `research_contributions`: ‏41,638 שורות, מהן 92 ב־`origin='community_2029'`. אין שורות עם `target_type='channel_update'` (12.11).
- `channel_updates`: 3,151 שורות. **אין** בה `edited_at` או `updated_at`, ולכן אי אפשר לזהות עריכה בעותק.

**מדידות בסיס (קריאה בלבד, 12.11):**

| מה נמדד | זמן |
|---|---|
| `world_group_source_arrivals_v2(40, null)` | ‏40 שורות, ‏35.4ms |
| `community_feed_page(0, 40, 'newest')` | ‏34.9ms |
| פתרון **מרוכז לפי מזהים** — אותו תנאי זכאות, 40 מזהים, שאילתה אחת | ‏21.8ms ביצוע + ‏6.9ms תכנון |

בתוכנית של הפתרון המרוכז:
- hash join בין ההוכחות למקורות;
- סינון המזהים מוחל אחרי חיפוש לפי `ext_msg_id`;
- גישה לאינדקסים של `contributors`, ‏`group_source_public_media` ו־`storage.objects`.

**הדרישות:**

1. **מקור זכאות אחד.**
   - את גוף הקורא מעבירים לפונקציה משותפת שמחזירה קבוצת שורות: `(p_ids uuid[] default null, p_before, p_limit)`. השם לדוגמה בלבד.
   - `world_group_source_arrivals_v2` נשאר עטיפה דקה מעליה, עם **פלט זהה** לפני ואחרי.
   - כשמתקבלים `p_ids`: לנהוג מתוך `unnest(p_ids)` ← מפתח `channel_updates` ← מפתח ההוכחה. כך העלות תלויה בגודל העמוד ולא בכלל ההוכחות. תקרה למשל 200 מזהים.
   - **אסור** להעתיק את תנאי הזכאות לפונקציה שנייה.
2. **שורת הקרנה = מיקום בלבד.**
   - **בשורה:** ‏`origin='community_2029'`, ‏`target_type='channel_update'`, ‏`target_id=<channel_updates.id>`, ‏`parent_id=<שורש היום>`, ייחוס לכותב (קרדיט), ‏`created_at` של המקור, ו־`status='approved'`.
   - **לא נשמרים:** טקסט מקור וכתובת מדיה.
   - **שורש היום** (`target_type='group_day'`): כותרת מבנית בלבד.
   - **כפילויות:** אינדקסים ייחודיים חלקיים על `target_id`. זה DDL חדש, כמו בהצעת v2.
3. **פתרון בזמן הקריאה, מרוכז.**
   - ‏`community_replies_page`, ‏`community_message_context`, ‏`community_reply_counts`, ‏`community_thread_updates`, ‏`community_search` ו־`community_search_facts`:
     - אוספות את כל ה־`target_id` הרלוונטיים לקריאה, וקוראות לפונקציה המשותפת **פעם אחת**.
     - מצרפות את התוצאה לפי מזהה.
     - הצירוף נעשה **לפני** החלוקה לעמודים ולפני הספירות, כדי שהסה"כ והעמודים יתאימו.
   - **בדיקה פתוחה:** `community_stream_projection` — לוודא שאינה מושפעת.
   - **התאמה לתנאי הגוף:** תנאי `nullif(btrim(r.body),'')` מוחלף בשורות `channel_update` ב"נמצא בפתרון".
4. **גוף ומדיה בלי שינוי חתימה.**
   - הגוף מורכב בזמן הקריאה: הטקסט המצונזר, ואחריו "📎 תמונה/סרטון" עם הכתובת — באותו פורמט שהיה בעותק של v2.
   - כך הלקוח לא משתנה בשלב הראשון. עמודות מדיה נפרדות — שלב עתידי ונפרד.
5. **עריכה.** הטקסט הנוכחי מוצג תמיד. אין צורך בסנכרון.
6. **משיכת הרשאה.**
   - **הטריגרים:** כל תנאי זכאות שנכשל — `general_feed_enabled=false`, כותב לא פעיל, הסרה מרשימת הכותבים, מקור כבוי או `intake_mode=off`, ‏`held_at`, שינוי `status`, תפוגה, `group_source_intake_public=false`, או מדיה שאינה ניתנת לפרסום.
   - **שורה שיש לה תגובות חיות:** מוצגת כמצבה (`is_deleted=true`, שדות ריקים) — אותו מנגנון שקיים היום לשורה שנמחקה.
   - **שורה בלי תגובות:** לא מוצגת.
7. **מחיקת מקור.**
   - DELETE ב־`channel_updates` גורם לאותה התנהגות כמו ב־6.
   - שורת המיקום נשארת, כדי לשמור את מבנה השרשור, ואין בה תוכן.
   - ניקוי שורות יתומות — רשות, לא חובה.
8. **חיפוש.**
   - **ההרחבה:** `community_search` מקבל ענף שני: חיפוש **בגוף המצונזר** של מקורות זכאים, דרך הפונקציה המשותפת. הממצאים ממופים לשורות המיקום (`rc_target_idx`).
   - **אסור** לחפש בטקסט הגולמי. אחרת שאילתה על מספר או דוא״ל מגלה שהם מופיעים בהודעה, גם כשהתצוגה מסתירה אותם.
   - **גודל ואינדקס:** היום יש 241 הוכחות זכאיות ומעט שורות, והחיפוש זול. אינדקס מתאים נבחן כשהקבוצה גדלה (סף שייקבע).
9. **מדיה.** מקור המדיה הוא הפונקציה המשותפת בלבד. אם אובייקט ה־Storage נמחק, או שהמדיה הפסיקה להיות ניתנת לפרסום — המדיה נעלמת בקריאה הבאה.
10. **הרשאות.**
    - ה־RPCs נשארים SECURITY DEFINER, עם EXECUTE ל־anon כמו היום. הפונקציה המשותפת — כמו הקורא היום.
    - אין שינוי GRANT לטבלאות.
    - יתרון: בשורות המיקום אין טקסט מקור, ולכן גם קריאה ישירה של הטבלה לא חושפת אותו.
11. **מסנכרן ושחזור.**
    - המסנכרן מ־v2 נשאר כמנגנון יצירת שורות, **בלי העתקת גוף**. בדיקת הזכאות בזמן ההכנסה — רשות; בזמן הקריאה — מחייבת.
    - **שחזור:** מחיקה רכה (`deleted_at`, כמו היום) של שורות `origin='community_2029' and target_type in ('channel_update','group_day')`. ההחלטה לא למחוק פיזית נועדה לכך שתגובות חיות של אנשים יישארו, ויוצגו תחת מצבה לפי הכלל הקיים. בשורות עצמן אין תוכן ייחודי.

**מבחני קבלה** — על PG מבודד, עם צילום בגודל ייצור, לא על נתונים חיים:

| # | מבחן |
|---|---|
| A1 | פלט `world_group_source_arrivals_v2` זהה לפני ואחרי ההעברה לפונקציה המשותפת, בפרמטרים לדוגמה |
| A2 | עריכה במקור מופיעה בקריאה הבאה |
| A3 | כל תנאי משיכה מסעיף 6 (מבחן לכל תנאי): הטקסט לא מוחזר; מצבה רק כשיש תגובות חיות; הסה"כ ומספור העמודים נכונים |
| A4 | ‏DELETE של מקור: 0 תווי מקור; המבנה נשמר |
| A5 | סנכרון כפול יוצר שורה אחת |
| A6 | לשורות `channel_update` אין `body` מקור (בדיקה או CHECK) |
| A7 | חיפוש מספר או דוא״ל שמופיעים בטקסט הגולמי ומוסתרים בתצוגה מחזיר **0** תוצאות |
| A8 | חיפוש בטקסט של מקור שנמשך מחזיר 0 תוצאות |
| A9 | הסרת אובייקט מדיה: בקריאה הבאה אין מדיה |
| A10 | **קריאה מרוכזת:** בכל קריאה ל־RPC הפונקציה המשותפת נקראת **פעם אחת**. אין קריאה לכל שורה (`pg_stat_user_functions` — הפרש של 1 לכל קריאה). בתוכנית אין SubPlan או loop לכל שורה |
| A11 | **זמן:** עמוד של 100 תגובות שכולן הקרנות — לא יותר מבסיס `community_replies_page` הנוכחי ועוד 25ms (p95). הבסיס נמדד באותה סביבה. הסף טעון אישור ZURIEL; לא מעלים אותו כדי לעבור |
| A12 | ההרשאות לא השתנו: אותן הרשאות EXECUTE ו־GRANT לפני ואחרי |

**מה לא נבדק כאן:**
- גוף `community_message_context`, ‏`community_thread_updates`, ‏`community_reply_counts`, ‏`community_search`, ‏`community_search_facts` ו־`community_stream_projection` — נקראו רק החתימות והראשים.
- ביצועי חיפוש בקנה מידה גדול.
- התנהגות הלקוח עם מצבה של הקרנה.

## 13. קבלה מחייבת לאכיפה — מה חייב להיחסם ומה מותר

> הסעיף הזה עובר לביקורת. המימוש וההוכחה אצל סשן הביקורת.

**שלוש שכבות נפרדות:**
- **CI** — עוצר PR. לא רואה כתיבה ישירה למסד. מייעץ בלבד עד שיוגדרו required checks (B6).
- **מסד** — חל על כל כותב, כולל `service_role` ו־`postgres` דרך MCP. החריג: מי שיכול להשבית טריגר או להחליף פונקציה.
- **הרשאות כלים** — `execute_sql` נמצא ברשימת ההיתרים ב־`.claude/settings.json` ורץ בלי הודעה טכנית. ההגנה היחידה בשכבה הזו היא אישור מפורש (B7).

**מיפוי למקרים הקיימים:** S0–S15 (CI) ו־D01–D16 (מסד) — `docs/reviews/m0-security-stabilization-20261112/enforcement-proof/README.md` בראש `c45dd3740`.

**מקרא לעמודת "פער":** "חדש" = נדרש מקרה שאינו קיים היום; "—" = מכוסה.

### 13.1 טבלת הקבלה

| # | דרישה | חייב להיחסם | חייב להיות מותר | שכבה | מקרה קיים | פער |
|---|---|---|---|---|---|---|
| A1 | בעלים מסוג **חוק** | בעלים שהוא חוק שפרש; ‏`rule_id` שלא קיים; בעלים ריק | חוק פעיל | CI + מסד | S3, ‏S4, ‏S4b; ‏D05, ‏D13 (מוצע) | — |
| A2 | בעלים מסוג **קודקס** | `project_codex.<slug>` שלא קיים | slug קיים | מסד (CI — לא) | ‏D13b, ‏D13c (מוצע) | **ב־CI אין בדיקה.** `ownerResolves` מקבל כל מחרוזת שמתחילה ב־`project_codex.` (`scripts/lib/g1LawsSnapshotRules.mjs:25` בראש `c45dd3740`). צריך תצלום slugs מתוארך, או לכתוב במפורש שהבדיקה נעשית רק במסד, בזמן הכתיבה |
| A3 | בעלים מסוג **מסמך רשום** | קובץ שקיים אבל **אינו רשום** (לא מנותב ב־Owner Index ולא ברשימת קובצי החוזה); קובץ שלא קיים | מסמך רשום, למשל `docs/research-studio-v1-contract.md` (Owner Index:78) | CI (במסד אי אפשר) | ‏S1 חוסם קובץ חוזה **חדש** לא מנותב; ‏D13d — המסד לא בודק | **חדש:** בעלים = קובץ קיים לא רשום → סירוב; קובץ רשום → היתר. היום `fileExists` מספיק כדי לעבור (שורה 25) |
| A4 | שרשרת בעלות | ילד שהבעלים שלו הוא ילד של בעלים שפרש | שרשרת שמסתיימת בבעלים פעיל | CI + מסד | ‏D05 (רמה אחת) | לא ידוע אם נבדקת יותר מרמה אחת — לבדוק |
| A5 | בעלים ב־Owner Index | שורה שמפנה לחוק שפרש או לבעלים שלא קיים | שורה לחוק פעיל | CI | ‏S4, ‏S4b; ‏S5 | — |
| B1 | **טקסט** של חוק פעיל באותה גרסה | עריכה במקום | גרסה חדשה עם טקסט שהשתנה ושושלת תקינה | מסד + CI | ‏D12 (מוצע), ‏S14; ‏D02, ‏S7, ‏S8 | — |
| B2 | טקסט של **שורת היסטוריה** | עריכת גוף בגרסה לא פעילה | פרישה (`is_active=false`, הגוף לא משתנה) | מסד | ‏D12b; ‏D16 | — |
| B3 | העלאת גרסה בלי שינוי טקסט | גרסה ריקה | — | CI | `compareLawsSnapshots` | במסד לא נבדק. פער קטן — לציין במפורש |
| B4 | **בעלים** באותה גרסה | שינוי בעלים בלי גרסה | — | מסד + CI | ‏D11, ‏S13 | — |
| B5 | בעלים בגרסה חדשה | העברה שקטה; אישור שלא קיים; אישור מומצא | החלפה אמיתית A→B, עם `SUPERSEDE_EXISTING` והפניה לרשומת אישור קיימת | מסד | ‏D06; ‏D07b, ‏D07c; ‏D07 | — |
| B6 | metadata בלי שינוי בעלים | — | מותר | מסד | ‏D08 | — |
| B7 | רשומות מתוארכות (תצלום, CHANGE-RECORD) | עריכה או מחיקה של רשומה קיימת; הסתרת קובץ ב־baseline | רשומה מתוארכת חדשה | CI | ‏S6, ‏S9, ‏S10; ‏S7 | — |
| C1 | **יצירת חוק** או משפחה חדשה | בלי הכרעת בעלות; בלי אישור רשום | עם אישור שמפנה לרשומה קיימת | מסד + CI | ‏D03, ‏D09a; ‏D09b; ‏`G1_LAW_APPROVALS.txt` | — |
| C2 | **הפעלת** חוק שהוכנס כלא פעיל | בלי הכרעה | עם הכרעה, אותו בעלים | מסד | ‏D10; ‏D10b | — |
| C3 | הפעלה מחדש של חוק שפרש | בלי אישור; אישור מומצא (טקסט חופשי) | אישור תקין בצורתו | CI | ‏S11, ‏S12b; ‏S12 | האם האישור אמיתי — שער אנושי |
| C4 | שלמות גרסאות | שתי גרסאות פעילות; קפיצת גרסה; בעלים ריק | — | מסד (חי היום) | ‏D01 | — |
| D1 | **יצירת טבלה** במיגרציה או בחבילת החלה | טבלה או MV חדשים בלי `-- OWNER-CHECK:` | `EXTEND_EXISTING <בעלים פעיל>`, או `NEW <סיווג Intake §10> <בעלים> APPROVAL:<ref>` | CI | ‏S15; ‏S2 | הכיסוי: 41 מתוך 305 טבלאות. טבלה שנוצרה מחוץ למיגרציות אינה נראית ל־CI |
| D2 | **יצירת טבלה ישירות במסד** (לא דרך Git) | לפחות: אין יצירה בלי רישום. חסימה בלי סימון אישור — לפי הכרעת ZURIEL | יצירה עם רישום, ואם יוחלט — גם עם סימון אישור | מסד | **אין.** ‏`ensure_rls` רק מפעיל RLS | **חדש:** event trigger מאותה משפחה (`ddl_command_end`) שרושם כל `CREATE TABLE` / `CREATE MATERIALIZED VIEW` ב־`public` עם מבצע וזמן |
| E1 | **כתיבה ישירה:** DELETE של שורת חוק | חסימה | — | מסד | ‏D14 (מוצע) | — |
| E2 | **כתיבה ישירה:** TRUNCATE של `nodes` | חסימה — טריגר `BEFORE TRUNCATE … FOR EACH STATEMENT`, או שלילת ההרשאה | — | מסד | ‏D15 (מוצע) | — |
| E3 | **כתיבה ישירה:** פרישה | — | מותר: `is_active=false`, הגוף לא משתנה | מסד | ‏D16 | — |
| E4 | **עקיפה:** `DISABLE TRIGGER` / `CREATE OR REPLACE FUNCTION` | לא ניתן לחסום טכנית למי שמחזיק הרשאת DDL | — | הרשאות | — | **חדש:** שאילתת קריאה שמראה מי הבעלים של `nodes` ושל פונקציית השער, ומי יכול להשבית טריגר. היום לא אומת אם `service_role` יכול |
| E5 | כתיבה ל־`project_codex` | slug חדש מסוג master (B5 של הביקורת); שינוי גוף בלי רשומה | — | CI (B5) | **אין** (B5 טרם מומש) | אין שער טקסט לקודקס בשום שכבה — לציין במפורש |

### 13.2 דרישות ההוכחה

- **סירוב והיתר:** לכל "חייב להיחסם" — פיקסצ'ר שנכשל, עם הסיבה הצפויה. לכל "חייב להיות מותר" — פיקסצ'ר שעובר. המריצים יוצאים עם exit 1 על תוצאה לא צפויה (כך היום ב־`c45dd3740`).
- **מקרי המסד:** רצים על PG מבודד, עם הפונקציה המוצעת המדויקת ועם rollback (`CREATE OR REPLACE` לגוף החי, md5 ‏`56b90b0a…`).
- **החלה חיה:** רק אחרי A2, ובאישור DDL של ZURIEL.

### 13.3 תיקון הטענות במסירה הקודמת

1. **הבדיקות אינן אכיפה מלאה** — לא שלי ולא ההרחבה שלהן. הן CI בלבד: על תצלום מתוארך ועל מה שעובר ב־Git. הן מייעצות עד B6, והצעות המסד לא הוחלו.
2. **‏BEFORE DELETE אינו חוסם TRUNCATE.** טריגר ברמת שורה אינו נורה ב־TRUNCATE. נדרש טריגר `BEFORE TRUNCATE` ברמת statement (ההצעה שלהם, D15), או שלילת ההרשאה.
3. **הוספת `description` לרשימת העמודות של הטריגר אינה מספיקה.** היא רק גורמת לטריגר להיקרא. הפונקציה צריכה גם להשוות `OLD.description` מול `NEW.description` בשורה פעילה באותה גרסה, ובשורת היסטוריה, ולסרב. זה D12 ו־D12b שלהם.
4. **סשן הביקורת מתקן ומוכיח טכנית.** הפערים שנשארים פתוחים אחרי ההצעה שלהם: A2 (ב־CI), ‏A3, ‏A4, ‏D2, ‏E4, ‏E5. הם מסוכמים ב־CL-25.

## 14. ‏CL-13 — זיכרון אישי ופרטי פרופיל: ההכרעות, הכותבים, המטריצה ומבחני הקבלה (עודכן בסבב 4)

### 14.0 ההכרעות (ZURIEL, 12.11.2026)

- **D-CL13-1:** "להשהות שמירת זיכרון חדש בין שיחות עד שקיימת שליטה מוכנה ומאומתת: הסכמה, מדיניות משך שמירה, ייצוא ומחיקה. השיחה עצמה ממשיכה לפעול וההיסטוריה הקיימת אינה נמחקת."
  - הכרעה זו אינה עוצרת קליטת מקורות, מחקר או יומנים תפעוליים.
- **D-CL13-2:** "מדיניות היעד מאפשרת לאדם להמשיך שיחות פרטיות בוואטסאפ באמצעות הזיכרון שלו, גם בלי חשבון אתר מקושר, לאחר אימות השולח והסכמה. קישור נדרש לפני גישה למידע שבחשבון האתר. אין חשיפת זיכרון אישי בקבוצה ואין איחוד זהויות משתמע."
- **D-CL13-3:** "אין לשמור פרטים של שולח לא מקושר כשדות פרופיל עד קישור לחשבון ואישור מפורש. אין לעקוף זאת באמצעות שמירה אוטומטית כ״מועמד ממתין״."

**מה ההכרעות סוגרות:** את שאלות המדיניות. **CL-13 ייסגר רק אחרי מימוש ואימות** (§14.6).

**מקור ההשהיה:** ההשהיה היא **ההכרעה הנוכחית של ZURIEL מ־12.11**. היא לא הוראת השבתה שכבר הייתה כתובה בחוק (§14.2).

### 14.1 עובדות הקוד

**מקור:** `origin/main` `aa0f6bc82`, ופונקציות המסד החיות. נבדק ב־12.11.

**וואטסאפ — `wa-raziel`:**
- `handleAllDMs` (שורות 918–937) מזהה את השולח כך: `iref = identity.user_ref || "wa:"+phone`.
- `savePersonalData` (שורות 193–203) קורא ל־`fn_raziel_fact`, עם ערך עד 200 תווים.
- `remember` (שורה 247) קורא ל־`fn_raziel_remember`, עם תוכן עד 3,000 תווים.
- בקבוצה, `remember` נקרא רק לשולח מקושר (שורה 796 בראש #1321). נתיב הקבוצות כבוי (`GROUPS_ENABLED=false`, שורה 28).
- **הקשר השיחה:** `recentDialogue` (שורה 384) קורא את 6 ההודעות האחרונות מהיסטוריית הצ'אט אצל ספק ה־WhatsApp (`getChatHistory`). זה לא נשמר אצלנו. זו "השיחה עצמה", והיא ממשיכה לפעול.

**אתר:**
- `ai-analyze` → `razielRemember` (שורות 837 ו־4060). נקרא רק למשתמש מאומת JWT, בלי opt-in לחבילה הקנונית.
- `number-researcher:88` ו־`raziel-attention:72` כותבים ישירות (REST) את שרשור השיחה באתר: `channel='site'`, ‏`memory_type='conversation'`. הם טוענים אותו בחזרה דרך `loadThreadFull` (40 האחרונות).

**שני בוטים נוספים:** `wa-hatishbi:117–118` ו־`wa-uriel:209–211` כותבים דרך `fn_mem_add` זיכרון על אדם קבוע (`p_user` הוא קבוע בקוד): למידות ושאלות.

**מסד:**
- ל־anon ול־authenticated אין EXECUTE על `fn_raziel_fact`, ‏`fn_raziel_remember`, ‏`fn_mem_add` ו־`fn_raziel_upsert_summary`.
- ב־`agent_user_memory` יש 1,085 שורות. 108 מהן תחת `wa:` — שולחים לא מקושרים (ספירה בלבד, 12.11).
- **כבר קיימים:**
  - **קישור חשבון בקוד אימות:** `verify_wa_link_code`. ב־`wa_account_links` יש 12 קישורים, ולכולם `verified_at`.
  - **צפייה לבעל חשבון מקושר:** `get_my_wa_memory`.
  - **מחיקה לבעל חשבון:** `delete_my_account`.
- **חסרים:** הסכמה רשומה, מדיניות משך שמירה, וייצוא ומחיקה לשולח שאין לו חשבון.

**מאמת:** עצם הכתיבה אומת בידי Codex. השורות והספירות כאן — בידי.

### 14.2 מקורות החוזה, ותיקוני הדיוק מביקורת Codex

| קיצור | מקור | מה נלקח ממנו |
|---|---|---|
| D-CL13-1..3 | הכרעות ZURIEL, 12.11 | השהיה; יעד לוואטסאפ בלי חשבון; פרופיל רק אחרי קישור ואישור. **מפורש** |
| S-FC | `foundation_closure_protocol_law` §E | "Privacy lifecycle primitives/owner path for consent, retention, export and erasure **before opening** longitudinal Person/Life/Raziel memory capabilities." (ראו התיקון למטה) |
| S-GP | `raziel_group_privacy_law` v1 (17.7) | החריג "Memory≠Response… זוכרים את כולם…" חל על INSERT בלבד. בקבוצה אין שליפה או חשיפה של זיכרון אישי |
| S-AD | `raziel_whatsapp_access_adapter_law` v1 | פריט 5: אישור מפורש לפני שינוי מצב אישי. פריט 6: ‏DM ≠ קבוצה; "linked user/person context" |
| S-PF | `person_foundation_contract_law` v6 | ‏PRIVACY BEFORE COMPOSITION; ‏Root-of-Trust (שירות עצמי מוגבל לשדות תצוגה); "שוויון-מחרוזות לעולם לא-מספיק למיזוג-זהות (`contributors.merged_into` נשאר Human-Gate ידני)" |
| S-UI | `canonical_ui_components_law` v12, פסקה 4 | "linking/merging identities remains explicit under Person/Human Gate" |

**תיקוני דיוק (Codex):**
1. **§E קיים מ־v3 (11.9.2026), ולא נוסף ב־11.11.**
   - בדקתי את כל הגרסאות: הסעיף מופיע לראשונה ב־v3 (נוצר 2026-09-11) ולא השתנה עד v8.
   - הסעיף מתנה **פתיחה** של יכולת זיכרון מתמשכת. הוא אינו הוראה להשבית יכולת קיימת.
   - לכן ההשהיה היא הכרעת ZURIEL מ־12.11, ולא דבר שהחוק כבר חייב. הסעיף הזה בא אחרי החריג מ־17.7, אבל ההשהיה עצמה לא נגזרת ממנו.
2. **`graph_privacy_foundation_law` §9 חל על `research_objects.privacy_scope` בלבד.**
   - ההסבר "private = טרם אושר" **הוסר** מהמטריצה. הוא לא חל על זיכרון אישי, ולא על כל שדה פרטיות במערכת.
   - באותו אופן, §7 של אותו חוק עוסק בפרטיות בגרף, ולכן אינו מקור כאן.
   - העיקרון "פרטי ← ציבורי רק במפורש" נלקח מ־S-PF ("PRIVATE MATERIAL -> PUBLIC RESEARCH IS EXPLICIT").
3. **היעדר חשבון אתר אינו היעדר אפשרות להסכמה.** הסכמה אפשרית בוואטסאפ גם בלי חשבון. המטריצה מפרידה עכשיו בין שלושה ממדים:

| ממד | מה הוא | מקור / סוג |
|---|---|---|
| **אימות שולח** | הוכחה שההודעה באה מהמספר שהיא מציגה. מזהה ה־DM (`<מספר>@c.us`) נקרא מה־API המאומת של הספק (polling של `wa-raziel`), ולא משדה שהלקוח שולח. משתתף בקבוצה אינו אימות לצורך DM | **פ** — הגדרה טכנית מוצעת; לאמת מול האינטגרציה (סשן הביקורת) |
| **הסכמה** | הסכמה מפורשת ורשומה של השולח המאומת. כוללת: נוסח בגרסה; זמן; היקף ("זיכרון להמשך שיחות פרטיות"); ודרך לחזור בו | D-CL13-1/2 — **מפורש**; ‏S-FC §E |
| **קישור חשבון** | קישור מפורש בין המספר לחשבון אתר, בקוד האימות הקיים. דרוש **רק** לגישה למידע שבחשבון האתר. **אין איחוד משתמע**: קישור לא מעביר ולא ממזג זיכרון `wa:<מספר>` לזיכרון החשבון | D-CL13-2; ‏S-PF; ‏S-UI |

**"פרטי ≠ הסכמה":** הערך `visibility='private'` קובע רק מי קורא. ההסכמה נדרשת עכשיו במפורש, מכוח D-CL13-1/2.
- הסעיפים "A missing gate is not consent" (`truth_axes` P3) ו־"never infer delivery consent" (S-PF) עוסקים בפרסום ובמסירה. כאן הם **אנלוגיה בלבד (פ)**, לא מקור ישיר.

### 14.3 כותבי הזיכרון שעליהם חלה ההשהיה (D-CL13-1)

**הגדרה:** כל נתיב שיוצר או מעדכן שורה ב־`public.agent_user_memory`. זה המאגר שנקרא בין שיחות: דרך `fn_raziel_context`, דרך `loadThreadFull` ודרך `get_my_wa_memory`.

| # | כותב (מסד) | קוראים לו (קוד) | מה נכתב | בהשהיה |
|---|---|---|---|---|
| W1 | `fn_raziel_remember` | `wa-raziel:247` (DM; קבוצה — שולח מקושר בלבד); ‏`ai-analyze:837→4060` (אתר, משתמש מזוהה) | זיכרון שיחה | **כן** |
| W2 | `fn_raziel_fact` (insert ו־update) | `wa-raziel:199/203` (`savePersonalData`) | עובדות פרופיל (`personal_context`) | **כן**. ובנוסף D-CL13-3 ו־S-AD פריט 5 |
| W3 | `fn_raziel_upsert_summary` (insert ו־update) | לא נמצא קורא בקוד או בפונקציות המסד — רדום | תקציר | **כן** — חייב להישאר כבוי |
| W4 | `fn_mem_add` | `wa-hatishbi:117–118`, ‏`wa-uriel:209–211` — אדם קבוע | למידות ושאלות על אדם מסוים | **כן**, לפי ההגדרה. תוכן מחקרי מגיע דרך מסלול הקליטה הקיים, שאינו מושהה (**פ**) |
| W5 | INSERT ישיר ב־REST | `number-researcher:88` (`saveExchange`), ‏`raziel-attention:72` (מנהל) | שרשור השיחה באתר, שנטען שוב | **כן** — שרשור נשמר הוא זיכרון בין שיחות. **פ:** את ההמשכיות בתוך השיחה הפעילה צריך לשמור בדרך אחרת — תורות שהלקוח שולח, או חוצץ לשיחה עם TTL |

**לא מושהה (D-CL13-1, במפורש):**
- **קליטת מקורות:** `channel_updates`, ‏`channel_update_group_proof`, ‏`research_contributions`, ‏`word_review_queue`, קליטה ל־`gematria_words`.
- **מחקר:** `research_objects`, ממצאים, ‏Result Bundles.
- **יומנים תפעוליים:** `wa_bot_log`, ‏`bot_outbox`, ‏`wa_message_status`, ‏`ai_token_log`, ‏`events`, ‏traces, ‏`work_log`.
- **הקשר השיחה מהספק:** `recentDialogue`.

**לא נמחק:** 1,085 השורות הקיימות.

**נקודה אחת שלא נאמרה במפורש — שליפת זיכרון קיים בתקופת ההשהיה:**
- **ברירת המחדל המוצעת (הקריאה המילולית):** השליפה נמשכת כפי שהיא היום, בלי הרחבה. אין כתיבה חדשה.
- **מאז שיש מנגנון הסכמה:** השליפה מותנית בהסכמה (D-CL13-2).
- אם ZURIEL רוצה קריאה מחמירה (בלי שליפה עד הסכמה), השינוי הוא שורה אחת במבחן M-4.

**נקודת אכיפה אחת מוצעת** (לכותב הטכני; **פ**):
- טריגר `BEFORE INSERT OR UPDATE` על `agent_user_memory` שמחזיר `NULL` בזמן ההשהיה.
- השליטה בו דרך דגל קיים (משפחת `site_flags`).
- כך כל W1–W5 מכוסים, גם כתיבות ה־REST הישירות. הכותבים ממשיכים "fire-and-forget", והתשובה למשתמש לא נשברת.
- **מחיקות נשארות מותרות**, כי המחיקה היא חלק מהשליטה.

### 14.4 המטריצה — דרישות לפי ממד

**מקרא:** "פ" = פרשנות; "D1–D3" = D-CL13-1..3.

| # | כתיבה · שולח | אימות שולח | קישור חשבון | הסכמה | הרשאת שמירה | נראות ושליפה |
|---|---|---|---|---|---|---|
| R1 | `remember` · ‏DM, מספר מקושר | מזהה DM מהספק (**פ**) | קיים ומאומת (`verify_wa_link_code`) | נדרשת, רשומה וניתנת לחזרה (D1, ‏D2, ‏S-FC) | מושהה (D1). אחר כך — רק עם הסכמה. החריג של S-GP כפוף להכרעה | פרטי; נשלף רק ב־DM של האדם. מידע מחשבון האתר — רק דרך הקישור המאומת (D2). אף פעם לא בקבוצה |
| R2 | `remember` · ‏DM, מספר לא מקושר | מזהה DM מהספק (**פ**) | **לא נדרש** לזיכרון (D2) | נדרשת, **ואפשרית בוואטסאפ** (D2; תיקון 3) | מושהה (D1). אחר כך — אחרי אימות והסכמה (D2) | פרטי; ב־DM שלו בלבד. **בלי** מידע מחשבון האתר. בקישור עתידי **אין איחוד משתמע** (D2; ‏S-PF; ‏S-UI) |
| R3 | `remember` · קבוצה | מזהה משתתף **אינו** אימות DM (**פ**) | — | של השולח הספציפי (D2) | מושהה (D1). ביעד: כתיבה מתוך קבוצה רק לשולח שהסכים (**פ**) | **אסור** לשלוף או לחשוף זיכרון אישי בקבוצה (D2 — מפורש; ‏S-GP; ‏S-AD פריט 6) |
| R4 | `savePersonalData` · ‏DM, מקושר | מזהה DM מהספק | קיים | הסכמה (D1), ובנוסף **אישור מפורש לכל עובדה** (S-AD פריט 5) | מושהה (D1). אחר כך — רק עם אישור מפורש | פרטי; לא בקבוצה |
| R5 | `savePersonalData` · ‏DM, לא מקושר | — | **נדרש לפני כל שדה פרופיל** (D3) | — | **לעולם לא** כשדה פרופיל עד קישור ואישור מפורש. **אין "מועמד ממתין" אוטומטי** (D3) | — |
| R6 | `savePersonalData` · קבוצה | — | — | — | **לעולם לא** (S-AD פריט 6; ‏D3) | — |
| R7 | `remember` · אתר, משתמש מזוהה | סשן אתר מאומת (S-PF §5) | החשבון עצמו | נדרשת (D1) | מושהה (D1). אחר כך — עם הסכמה | פרטי; באתר בלבד |
| R8 | `remember` · אתר, אנונימי | אין | אין | — | **אין כתיבה** | — |
| R9 | `fn_mem_add` · ‏`wa-hatishbi` / ‏`wa-uriel` (אדם קבוע) | מזהה הספק של אותו אדם | **לא נבדק** | נדרשת (D1). לא ידוע אם ניתנה מחוץ למערכת — אם כן, לרשום אותה | מושהה (D1) | פרטי |
| R10 | שרשור האתר · ‏`number-researcher` / ‏`raziel-attention` | סשן אתר מאומת | החשבון עצמו | נדרשת (D1) | מושהה (D1) — אין שורות לטווח ארוך | פרטי. משתמש — השרשור שלו. מנהל — השרשור של עצמו |

### 14.5 המטריצה — התנהגות: היום, בתקופת ההשהיה, ביעד

| # | היום (קוד, `aa0f6bc82`) | בתקופת ההשהיה (D1) | ביעד — אחרי שליטה מאומתת | מבחנים |
|---|---|---|---|---|
| R1 | נכתב בכל DM (עד 3,000 תווים), פרטי; נשלף דרך `fn_raziel_context` | אין שורות חדשות. התשובה ממשיכה. הקיים נשמר. השליפה — כמו היום (ברירת מחדל, §14.3) | כתיבה ושימוש רק עם הסכמה רשומה של שולח מאומת. חזרה מההסכמה מפסיקה כתיבה ושימוש, ומפעילה מחיקה לפי מדיניות השמירה. ייצוא זמין | M-1–M-5 |
| R2 | נכתב תחת `wa:<מספר>` | כמו R1 | הסכמה בוואטסאפ; זיכרון לפי המספר המאומת; בלי מידע מהחשבון; בלי איחוד בקישור | M-1–M-6 |
| R3 | נכתב לשולח מקושר בלבד; נתיב הקבוצות כבוי | אין כתיבה | אין שליפה או חשיפה בקבוצה. כתיבה רק לשולח שהסכים | M-7 |
| R4 | נכתב אוטומטית מכל DM | אין כתיבה | אישור מפורש לכל עובדה, וגם הסכמה | M-8 |
| R5 | נכתב אוטומטית | אין כתיבה, וגם אין "מועמד ממתין" | אין — עד קישור ואישור | M-9 |
| R6 | לא נקרא | אין | אין | M-10 |
| R7 | נושא השאלה נשמר | אין כתיבה; התשובה ממשיכה | עם הסכמה | M-1, ‏M-11 |
| R8 | לא נכתב | אין | אין | M-12 |
| R9 | `fn_mem_add` לשני אנשים קבועים | אין כתיבה; התשובות ממשיכות | עם הסכמה רשומה. תוכן מחקרי — דרך הקליטה הקיימת | M-13 |
| R10 | השרשור נשמר ונטען (40 האחרונות) | אין שורות לטווח ארוך; ההמשכיות בתוך השיחה נשמרת | עם הסכמה ולפי מדיניות שמירה | M-14 |

### 14.6 מבחני קבלה

**איפה רצים:** על PG מבודד, עם handlers אמיתיים ומוקים לספק. **לא על נתונים חיים.**

**בתקופת ההשהיה:**
- **M-1 — שער ההשהיה:** בתקופת ההשהיה כל אחד מ־W1–W5 מבצע 0 הוספות ו־0 עדכונים ב־`agent_user_memory`.
  - **התרחיש:** DM מקושר, ‏DM לא מקושר, קבוצה, אתר מזוהה, מנהל, ושני הבוטים.
  - **בכל מקרה המשתמש מקבל תשובה לא ריקה.**
  - **הבדיקה:** הספירה ו־`max(created_at)` לא זזים.
- **M-2 — מה שלא מושהה ממשיך:** אותו תרחיש עדיין כותב את מה שהוא כותב היום — `wa_bot_log`, ‏`bot_outbox`, ‏`ai_token_log`, ‏`events`, וקליטת מקורות היכן שרלוונטי.
- **M-3 — אין מחיקה:** השורות הקיימות לא משתנות (ספירה וחותמת של המזהים).

**ביעד:**
- **M-4 — הסכמה:**
  - שמירה ושליפה מתבצעות רק כשקיימת רשומת הסכמה לשולח המאומת. הרשומה כוללת: זהות, גרסת נוסח, זמן, היקף.
  - בלי רשומה — אין שמירה ואין שליפה. **בתקופת ההשהיה, השליפה לפי ברירת המחדל של §14.3.**
  - אחרי חזרה מההסכמה — 0 שמירות, 0 שליפות, ומחיקה לפי מדיניות השמירה.
- **M-5 — ייצוא ומחיקה:**
  - האדם יכול לקבל ייצוא ולבקש מחיקה.
  - לבעל חשבון — דרך המסלולים הקיימים, מורחבים: `get_my_wa_memory`, ‏`delete_my_account`.
  - לשולח בלי חשבון — מסלול בוואטסאפ שעוד צריך לתכנן.
- **M-6 — אין איחוד משתמע:**
  - קישור מספר שיש לו זיכרון `wa:<מספר>` אינו מעביר שורות ל־`user_ref` של החשבון, ואינו ממזג אותן.
  - מידע מחשבון האתר זמין בוואטסאפ רק אחרי קישור מאומת.

**כל שלב:**
- **M-7 — קבוצה:**
  - `fn_raziel_context` לערוץ קבוצה מחזיר `user_context` ריק.
  - שום טקסט מזיכרון אישי לא מופיע בתשובה בקבוצה (fixture עם שורת זיכרון).
  - בתקופת ההשהיה — 0 כתיבות.
- **M-8 — עובדת פרופיל, מספר מקושר:** הודעה עם תאריך לידה לא יוצרת שורת `personal_context` בלי אישור מפורש של אותה עובדה. בתקופת ההשהיה — 0 בכל מקרה.
- **M-9 — עובדת פרופיל, מספר לא מקושר:** אין שורת `personal_context`, ואין שורת מועמד או ממתין בשום טבלה, לאותו מספר.
- **M-10 — פרופיל מקבוצה:** 0.
- **M-11 — אתר, מזוהה:** 0 שורות בתקופת ההשהיה; התשובה מוחזרת.
- **M-12 — אתר, אנונימי:** 0 שורות.
- **M-13 — שני הבוטים:** `wa-hatishbi` ו־`wa-uriel` — 0 שורות בתקופת ההשהיה; התשובות ממשיכות.
- **M-14 — שרשור האתר:**
  - בתוך שיחה אחת ההקשר נשמר (מבחן רב־תורות), בלי שורות ב־`agent_user_memory`.
  - אחרי טעינה מחדש לא נשמרות תורות חדשות (צפוי בתקופת ההשהיה).

**סגירת CL-13:** שינוי המדיניות מכוסה ב־M-1 עד M-14.
- **שער A4b (פריסת `wa-raziel`):** לפחות M-1 עד M-3, ‏M-7, ‏M-8, ‏M-9 ו־M-10 ירוקים.
- **סגירת CL-13 עצמה:** כל המבחנים, כולל ייצוא, מחיקה והסכמה.

## 15. מסירה לסשן הביקורת הראשית (דרך ZURIEL)

**1. הקוד שהוכן — הועבר, ולא ימשיך כאן.** ארבעה קבצים, שמקורם בענף הזה:

| קובץ | blob בענף הזה (`0a5882774`) | sha256 (ברשומת היומן `a3d65374…`) | ב־#1321 |
|---|---|---|---|
| `scripts/lib/g1LawsSnapshotRules.mjs` | `4381a8a3…` | `e813c422…` | הורחב ב־`ab83e6b8c` (blob `2943cb00…`). כל 7 הייצואים שלי קיימים שם, ועוד 13 חדשים |
| `scripts/test-g1-agent-routing-smoke.mjs` | `b4a1488b…` | `fdeb88ed…` | הורחב (blob `87a32eee…`) |
| `audits/g1-agent-entry/G1_LAWS_ACTIVE_SNAPSHOT_20261112.txt` | `4f6d0b7c…` | `a545a6b6…` | זהה בבתים |
| `audits/g1-agent-entry/G1_MIGRATION_TABLES_BASELINE_20261112.txt` | `88e829ca…` | `513bd89a…` | זהה בבתים |

**בקומיט של סבב 3, ראש הענף הזה כבר לא נושא את הקוד:**
- שלושת הקבצים החדשים הוסרו.
- קובץ הבדיקה הוחזר לגרסה שב־`origin/main` `aa0f6bc82`.
- ההיסטוריה נשמרת בקומיטים `649ad4875`, ‏`87d77ade1` ו־`0a5882774`.

**למה:** כדי שלא יישאר מימוש מקביל, ושלא תיווצר התנגשות add/add במיזוג. מכאן הענף נושא מסמכים בלבד: README, ‏ledger ו־HANDOFF.

**2. מה לתקן ולהוכיח (לפי §13):**
- A2 — slug של קודקס ב־CI;
- A3 — מסמך רשום (`ownerResolves`, שורה 25);
- A4 — שרשרת;
- D2 — ‏`CREATE TABLE` ישיר;
- E4 — שאילתת הרשאות: מי יכול להשבית טריגר או להחליף פונקציה;
- §0 פריטים 6–7. ‏D12, ‏D12b, ‏D14 ו־D15 כבר בהצעה שלכם.

**3. בדיקות חוזה ההקשר של רזיאל** (§8.1): ‏ST-1 עד ST-5, ו־RT-1 עד RT-8. אחרי A4 (CL-11, ‏CL-12, ‏CL-24).

**4. ‏CL-13** (§14 — סבב 4): ההכרעות D-CL13-1..3 התקבלו.
- **ההשהיה:** לממש אותה בכותבים W1–W5 (§14.3). הצעה: טריגר אחד על `agent_user_memory`.
- **המבחנים:** M-1 עד M-14 על ה־handler האמיתי ועל PG מבודד.
- **לפני A4b:** לפחות M-1 עד M-3 ו־M-7 עד M-10.

**5. ‏CL-03** (§12): מבחני הקבלה (1)–(7) — אם יוחלט על הקרנה בהפניה, ואם ZURIEL יקבע שהכותב הוא סשן הביקורת.

**6. תיקון בטקסט שלכם:** ב־`foundation-closure-list.md` §1.G, שורת CL-17 מצטטת "ארבעה ענפים פעילים". הטענה נסוגה (§0 פריט 8).

**7. סדר:** אין כאן שינוי לסדר ההחלה שלכם. כל פריט מסד או Edge — באישור ZURIEL.

**8. (סבב 4) ‏CL-03 — מפרט מסירה** (§12.1):
- פונקציית זכאות משותפת אחת, עם `p_ids`.
- פתרון מרוכז לפני החלוקה לעמודים.
- מצבה דרך `is_deleted`; חיפוש בגוף המצונזר.
- מבחנים A1–A12. בסיס: 35.4ms (הקורא), 21.8ms (פתרון מרוכז ל־40 מזהים), 34.9ms (עמוד פיד).
- הצעה בלבד; v2 לא יוחל.

**9. (סבב 4) נוסחים מוצעים** (§16): ‏CL-19 (קודקס 4), ‏CL-20 (`person_foundation` v7), ‏CL-21 (שלושה מקומות), ומטא־דאטה לארבעת היורשים.
- לפני החלה: לבדוק את המשמר על עדכון metadata בשורה לא פעילה.
- **שום דבר לא מוחל בלי אישור.**

**קישורים נעוצים:**
- [השוואה `aa0f6bc82…6352be19d`](https://github.com/zuriel337/sod1820/compare/aa0f6bc82b8c94286374b1f51208037502994eab...6352be19dbe6b2ecc73099d603429d7448410aac)
- [`foundation-closure-list.md` @ `c45dd3740`](https://github.com/zuriel337/sod1820/blob/c45dd3740e4db5c5a6d83d4c15728e95078e1ff7/docs/reviews/m0-security-stabilization-20261112/foundation-closure-list.md)
- [`enforcement-proof/README.md` @ `c45dd3740`](https://github.com/zuriel337/sod1820/blob/c45dd3740e4db5c5a6d83d4c15728e95078e1ff7/docs/reviews/m0-security-stabilization-20261112/enforcement-proof/README.md)
- [`g1LawsSnapshotRules.mjs` @ `c45dd3740`](https://github.com/zuriel337/sod1820/blob/c45dd3740e4db5c5a6d83d4c15728e95078e1ff7/scripts/lib/g1LawsSnapshotRules.mjs)

## 16. נוסחים מוצעים — CL-19, CL-20, CL-21 וארבעת היורשים (סבב 4; **לא מוחלים**)

**מעמד:** כל נוסח כאן הוא הרחבה של בעלים קיים (EXTEND_EXISTING). אין חוק חדש, אין מאגר חדש ואין שינוי חי. החלה דורשת אישור ZURIEL לנוסח ולפעולה המדויקים (§0.4).

**מקרא:** **מ** = החלטה מפורשת (מקור ותאריך) · **פ** = פרשנות שלי · **ע** = עובדה חיה, אומתה ב־12.11.

### 16.1 ‏CL-19 — כלי הפרסום החיצוני (הרחבה של `project_codex.publishing_conventions`)

**נוסח מוצע** — סעיף חדש ומתוארך בקודקס 4:

> **—— כלי פרסום חיצוני (פייסבוק / אינסטגרם) · הרחבת publishing_conventions ——**
> 1. **הכלים:** `social_admin`, ‏`fb_publish_photo`, ‏`fb_publish_post`, ‏`fb_set_cover`, ‏`ig_publish`, ‏`social_post`, ‏`social_share_post`, ‏`fn_publish_schumann_social`, ‏`fn_publish_squid_social`.
>    - פועלים בצד השרת בלבד; ל־anon ול־authenticated אין הרשאת הרצה.
>    - מפתח הגישה שמור ב־Vault ומוזרק בצד השרת. אין לבקש אותו ואין לחשוף אותו.
> 2. **אישור:** כל פרסום חיצוני — פוסט, תמונה, כריכה או שיתוף — דורש אישור מפורש של ZURIEL **לפני** ההרצה, לתוכן המדויק וליעד המדויק. אין פרסום אוטונומי, ואין "פרסום ודיווח אחר כך".
> 3. **dry-run:** כשהכלי תומך ב־dry-run (`p_dry_run` ב־`social_post` וב־`social_share_post`) — מריצים אותו קודם, ומציגים את התוצאה לאישור.
> 4. **מצב חי:** שיתוף פוסט קורא את המצב החי שלו — כותרת, תקציר ותמונה — ולא עותק קפוא (`auto_share_uses_live_post_law`).
> 5. **מזהי דפים:** נקראים בזמן הפעולה (`social_admin('whoami')`), ולא מקובעים בטקסט.
> 6. **היסטוריה:** `social_publish_law` (27.6) ו־`social_autonomy_law` (1.9) פרשו. **מדיניות הפרסום האוטונומי אינה נורשת.**

**מקור לכל סעיף:**

| סעיף | מקור | סוג |
|---|---|---|
| 1 | `social_publish_law` v1 (פרש; רשימת הכלים, ‏Vault, "service_role/postgres בלבד") + `pg_proc`: 9 פונקציות, הרשאות, 0 משימות cron | **מ** + **ע** |
| 2 | `social_publish_law` v1: "עדיין לאשר מול צוריאל מה מפרסמים (פעולה חיצונית)"; ‏`archive_reason` של `social_autonomy_law`: "conflicts with current Human Gate"; ‏CLAUDE.md §11. **"לתוכן ולמזהה היעד המדויקים"** — לפי דפוס §0.4 | **מ**; הדיוק — **פ** |
| 3 | חתימות הפונקציות (`p_dry_run`) | **ע** + **פ** (החובה) |
| 4 | `auto_share_uses_live_post_law` v1 (פעיל) | **מ** |
| 5 | `social_publish_law` v1 ("תמיד קודם"). לא לקבע מזהים בטקסט הפעיל | **מ** + **פ** |
| 6 | `archive_reason` | **מ** |

**לא נבדק:** האם `fn_publish_schumann_social` ו־`fn_publish_squid_social` עדיין בשימוש (אין להן cron).

**אחרי ההחלה:** ההפניה `auto_share_uses_live_post_law` → `social_publish_law` (ledger, ‏SEMANTIC_GAP) עוברת לסעיף הזה.

### 16.2 ‏CL-20 — פרוטוקול RLS/GRANT לקריאת לקוח (הרחבה של `person_foundation_contract_law`, גרסה 7)

**למה דווקא כאן:** זה הבעלים הרשום (`compaction_v1.canonical_owner`) של `rls_client_read_protocol`, שמשפחתו `security_privacy` — **מ**. נוסף על כך, ציר ההרשאות (§4–§5) כבר נמצא בחוק הזה.

**נוסח מוצע** — סעיף חדש בגרסה 7:

> **RLS / GRANT — קריאת לקוח** (הועבר מ־`rls_client_read_protocol` v2)
> 1. **RLS בלי policy חוסם בשקט** כל קריאה של anon/authenticated. פיצ'ר שהלקוח קורא ממנו טבלה כולל, **באותו שינוי**, policy קריאה מתאימה ו־GRANT.
> 2. **GRANT הוא חלק מה־policy.** policy בלי GRANT — חסום בשקט.
> 3. **הגבלת עמודות:** רק GRANT ברשימת עמודות מפורשת. **לעולם לא** GRANT טבלאי ואחריו REVOKE לעמודה — ה־GRANT הטבלאי גובר.
> 4. **כתיבה מהלקוח** דורשת policy נפרדת עם `with check`.
> 5. **טבלאות צד־שרת** — לוגים, אבטחה, גיבויים, `events_*`, ‏`edge_*`, ‏`wa_*`, פייפליינים ואנליטיקה — נשארות בלי policy ציבורית. זה המצב הנכון, לא באג.
> 6. **אבחון ובקרה:**
>    - הגלאי הקנוני: `public.rls_grant_gaps()` (`has_any_column_privilege`, לא `has_table_privilege`).
>    - בקרה שבועית: `rls-grant-audit-weekly` (יום ראשון, 03:00) מריץ את `fn_rls_grant_audit()`, שכותב התראה ליומן.
>    - חריגים מכוונים: `rls_grant_gap_ignore`.
> 7. **policy ו־GRANT אינם הרשאה לשדה רגיש.** הם כפופים לציר ההרשאות ול־Root-of-Trust. עמודות רגישות נקראות רק דרך RPC בצד השרת.

**מקור לכל סעיף:**

| סעיף | מקור | סוג |
|---|---|---|
| 1, ‏4, ‏5 | `rls_client_read_protocol` v1 (8.7) | **מ** |
| 2, ‏3, ‏6 | `rls_client_read_protocol` v2 (17.7). המאוחר גובר — v2 מתקן את עצת ה־REVOKE של v1 | **מ** |
| 6 — מצב חי | `rls_grant_gaps` קיים; ‏`rls_grant_gap_ignore` קיים (3 שורות); ה־cron פעיל; ההתראה האחרונה ביומן מ־23.10 | **ע** |
| 7 | `person_foundation` §4 ("authenticated access or SECURITY DEFINER function existing is never authorization by itself") + Root-of-Trust. החיבור לפרוטוקול | **מ**; החיבור — **פ** |

**אחרי ההחלה:**
- ההפניות `work_log_authority_law` (REL) ו־`video_transcription_law` (FUNC) מופנות לסעיף הזה.
- ההודעה ב־`fn_rls_grant_audit` מתעדכנת (CL-06, סשן הביקורת).

### 16.3 ‏CL-21 — "Series = תג": שלושה מקומות

**ההכרעה המאוחרת** — **מ**:
- `SOD1820_CONTENT_FOUNDATION_CONTRACT.md` §5 (עודכן 6.11.2026): "מסמך זה אינו מגדיר סדרות ואינו מגדיר חברות בסדרה". ההגדרה נמצאת בשני מקומות:
  - **החלטות:** PLAN37, ‏DEC-SERIES-003/004/005/006 (APPROVED);
  - **קוד:** `contentSeries2029Identity.js`.
- אותו סעיף: הקורא הישן של פיד "מימד חמש" (`getDimensionFiveVideos`) "קורא תג בלבד; הוא קורא-פיד היסטורי ואינו קובע חברות-סדרה קנונית".

| מקום | הנוסח היום | נוסח מוצע (תוספת; ההיסטוריה נשמרת) |
|---|---|---|
| `canonical_ui_components_law`, סעיף v2 (26.8) | "מקורות-אמת: … Series = תג (dim5_upload_law v2)" | **תוספת בגרסה 13:** "הבהרה: מקור האמת לחברות בסדרה הוא `SOD1820_CONTENT_FOUNDATION_CONTRACT.md` §5 — PLAN37 ‏DEC-SERIES-003…006 ו־`contentSeries2029Identity.js`. התג (`posts.tags`) הוא אות פיד היסטורי, ואינו קובע חברות. הנוסח בסעיף v2 נשמר כהיסטוריה". באותה גרסה אפשר להעביר גם את `metadata.extends` ל־`reality_graph_law` (§11.1, ‏#4) |
| קודקס 4, הרחבה מ־26.8 | "Taxonomy = 4 צירים: Series (תג «מימד חמש») ≠ …" | **שורת תיקון אחרי השורה:** "חברות בסדרה — לפי `SOD1820_CONTENT_FOUNDATION_CONTRACT.md` §5 (מ־6.11.2026). 'תג' בשורה הקודמת הוא הייצוג ההיסטורי" |
| content contract §6, שורה 116 | "… ל-Series = תג" | "… ל-Series — ראו §5" (שינוי קובץ במאגר — מיזוג באישור) |

**החלה:** חוק חי, קודקס ומיזוג קובץ — כל אחד באישור נפרד.

### 16.4 ארבעת היורשים — metadata על השורה שפרשה, בלי הפעלה מחדש

**מבנה השדות:** כמו ב־`compaction_v1` וב־`owner_routing` של חוקים שפרשו היום:
- `classification`: `LEGACY_RETIRE_OR_SUPERSEDE`;
- `canonical_owner` — היורש;
- `owner_family` — המשפחה של היורש;
- `archive_reason` — הנימוק;
- תאריך;
- `owner_routing.resolution`: `RESOLVED`.

את שם השער יבחרו ZURIEL או הכותב הטכני. הצעה: מפתח המשימה `CONTRACT_GOVERNANCE_AUDIT_20261110`.

| חוק שפרש | `canonical_owner` | `owner_family` | ‏`archive_reason` מוצע | סוג | מקור |
|---|---|---|---|---|---|
| `agent_onboarding_law` | `inter_agent_coordination_law` | `agent_governance` | "Replaced, not absorbed: the read-all startup clause is explicitly not inherited (v18 §56); agent entry is v18 §55–§56 with the Read Budget (§34, §49); write verification is live_state_resolution_law v3 + §40" | **מ** (§55, ‏§56); "לא נספג" — **פ** | v18 §33–34, ‏§49, ‏§55–§56, ‏§40 |
| `corpus_admission_lifecycle_law` | `corpus_admission_foundation_v1` | `research_intake` | "Completed by corpus_admission_foundation_v1 (docs contract line 86, §6); claim/graph/publication levels are separate axes under truth_axes_foundation_law v3" | **מ** (שורה 86); הצירים העליונים — **פ** | `docs/corpus-admission-foundation-v1-contract.md` |
| `meshulash_kadmi_law` | `canonical_methods_registry_law` | `gematria` | "Absorbed: alias identity קדמי=משולש (method_key=קדמי) in v5 §12; public label משולש in v6 §21" | **מ** | v5 §12, ‏v6 §21, ‏metadata `aliases` |
| `metatron_brain_persona_lens_law` | `raziel_companion_layer_law` | `raziel_ai` | "Partially absorbed: one Raziel, many modes (v3 §1); trace in raziel_routing_law v2 §9. The 'context_version per answer' requirement is kept as an open requirement (laws-alignment README §8.1)" | **פ** | companion v3 §1; ‏routing v2 §9–§10 |

**לבדוק לפני ההחלה** (סשן הביקורת, על PG מבודד): עדכון `metadata` בשורה לא פעילה מפעיל את `trg_rule_compaction_integrity_guard_v1` (`UPDATE OF metadata`). הבדיקות שלו חלות על גרסה פעילה. ההתנהגות בשורה לא פעילה — לא אומתה.

**אחרי ההחלה:** הרשימה `RETIRED_WITHOUT_RECORDED_SUCCESSOR` ב־G1 מתרוקנת, ונדרש תצלום מתוארך חדש. ההפניות התלויות מטופלות לפי ה־ledger (§11.3).
