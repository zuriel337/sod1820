# יישור ממוקד וסגירת בסיס — 12.11.2026 (קריאה בלבד)

> תוספת למסירת הביקורת הקיימת ([HANDOFF-20261111.md](../HANDOFF-20261111.md), §16). לא מקור אמת ולא קובץ MASTER. אין כאן הרצת SQL, שינוי חוק חי, מיזוג או פריסה.
> בסיס: `origin/main` = `aa0f6bc82` (Production חי: `dpl_FEzrHi2GLSpdHPN1cJDu6rhXtswZ`). ראש #1321 שנבדק: `01e590f84` (145 קבצים; merge-base = `aa0f6bc82`); בדיקה קודמת על `e110ba6a5` (144 קבצים) נתנה אותה תוצאה לגבי הקבצים שהמסירה הזו נוגעת בהם.
> נתוני מסד: SELECT קריאה בלבד על `linswmnnkjxvweumprav`, 12.11.2026. מה לא נבדק מסומן בכל סעיף.

## 0. תיקון למסירות קודמות שלי (גילוי נאות)

1. **מספרי "תלויות שבורות" מ־12.11 בוטלו.** הספירה ההיא (19 הפניות ב־12 חוקים) לא ניתנת לשחזור מהשורות החיות (למשל `big_number` אינו מזכיר את `essence_appendix` בשום מקום בטקסט או ב־metadata). בהגדרה אחת ברורה (מזהה חוק שלם בטקסט או ב־metadata של גרסה **פעילה**, שליעדו אין גרסה פעילה) התוצאה היא **55 הפניות ב־31 חוקים אל 38 חוקים שפרשו**. הפירוט: [retired-reference-ledger.txt](retired-reference-ledger.txt).
2. **"אין יורש רשום" — שגוי.** לכל החוקים שפרשו שנבדקו יש `compaction_v1` + `owner_routing` עם `canonical_owner` ו־`archive_reason`. רק **שלושה** פרשו בלי מיפוי: `agent_onboarding_law`, `corpus_admission_lifecycle_law`, `meshulash_kadmi_law`.
3. **סעיף 5 בטבלת ההחלטות (בעלות על `research_contributions`) — ההנחה שגויה.** ראו §1.
4. **סעיף 8 (החלפת בעלים של `research_object_identity_invariant_law` מקובץ V1 לחוק) — נסוג.** לא הוכחה התנגשות אחריות. ראו §2.

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
2. **שרשרת הפניות:** `writer_material_home_law` v6 עדיין מציין תלות ב־`research_contribution_law` (שפרש); המיפוי הרשום מפנה ל־`docs/research-studio-v1-contract.md` ול־Workspace §8. תיקון טקסט בגרסה הבאה של אותו חוק בלבד (ראו ledger).
3. **שאלת חוזה פתוחה אמיתית — הקרנת קבוצות לצ'אט (v2, טרם הוחלה):** ההקרנה שהכנתי (`claude/group-chat-sync-20261112`) כותבת שורת צ'אט ב־`research_contributions` עם **עותק של גוף ההודעה** (+ קישור מדיה) וקישור מקור (`target_type='channel_update'`). `writer_material_home_law` §23 קובע "הפניה, לא העתקה" להקרנות של Topic/Researcher/World. הצ'אט קורא את גוף ההודעה ישירות מ־`research_contributions` (`community_feed_page`), ולכן העתק הוא המצב היום. **צריך החלטה: חריג מתועד** (שורת צ'אט היא משטח הקרנה שחייב להכיל טקסט, עם `source_ref` מחייב) **או** קריאה-בהפניה (שינוי ב־RPC). עד ההחלטה: **אל תחילו את v2.** זה הפער שהצדקת Intake v14 נשענה עליו, ואם יוחלט על חריג — הוא ייכתב בגרסה הבאה של `writer_material_home_law` (הבעלים של הנתיב), לא ב־Intake.

**המלצה:** לא להציע Intake v14 כרגע. פעולות: שורת Owner Index (מסמך בלבד), תיקון ההפניה ב־`writer_material_home_law` בגרסה הבאה, והחלטה על חריג ההקרנה לפני v2.

**לא נבדק:** האם `writer_material_home_law` §23 חל על שורות צ'אט (הטקסט מזכיר Topic/Researcher/World); קראתי את הסעיפים הרלוונטיים, לא את כל 6 הגרסאות.

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

**שלושת החוקים שפרשו בלי מיפוי** — דורשים החלטה, לא תיקון טקסט: `agent_onboarding_law` (נטען ע"י `inter_agent_coordination_law` כ"הרחבה", וע"י `live_state_resolution_law` כ"היסטורי, אינו מופעל מחדש"), `corpus_admission_lifecycle_law` (יורש טבעי: `corpus_admission_foundation_v1`, לא רשום), `meshulash_kadmi_law` (`compositeMethods.js` קורא לו "locked alias" של קדמי; יורש טבעי: `canonical_methods_registry_law`, לא רשום). **המלצה:** להוסיף מיפוי metadata לשלושתם (שינוי metadata בלבד, באישור) — לא להפעיל מחדש.

**לא נבדק:** 14 ההפניות שסומנו `REPOINT_TEXT` נקראו בהקשר של שורה אחת (≈150 תווים), לא בכל טקסט החוק; לפני תיקון בפועל יש לקרוא את החוק במלואו.

## 4. מטריצת השפעה מול הראש העדכני של #1321 (`01e590f84`)

#1321 (M0) משנה 145 קבצים (בראש `01e590f84`): `docs/reviews` (22), `src/lib` (21), `supabase/proposed` (20), `supabase/functions` (13), `src/components` (11), `tests/sql` (5), `test/helpers` (5), `src/pages` (4), ועוד. **הוא לא נוגע** ב־Owner Index, `ROADMAP`, `MASTER_STATE`, `CLAUDE.md`, `AGENTS.md`, `scripts/test-g1-*`, `audits/g1-agent-entry`, `docs/2029-data-placement-retention-crosswalk.md`, ולא בקבצי החוזים של תיקיית הביקורת. כן נוגע ב־`.github/workflows/live-contracts-2029.yml` (בנוסף לשלושה ענפים פעילים נוספים — `claude/group-chat-sync-20261112`, `more-install-explicit-2029`, `more-panel-2029-redesign`) וב־`public-reading-deploy/transport.js`.

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
- `scripts/test-g1-agent-routing-smoke.mjs` — +7 בדיקות (18 → 25). הקובץ כבר מורץ ב־`live-contracts-2029.yml:48`; ה־workflow לא נערך (4 ענפים פעילים עורכים אותו).

**הוכחה — שלושת המקרים, כל אחד עם סירוב ועם אישור (fixtures בבדיקות 20–25):**

| מקרה | נחסם (הבדיקה נכשלת על...) | מותר (הבדיקה עוברת על...) |
|---|---|---|
| **הפניה לבעלים שפרש** (`validateLawsSnapshot`) | בעלים שהוא חוק שפרש; בעלים שאינו קיים; קובץ בעלים שאינו קיים; חוק שפרש בלי יורש רשום (פרט ל־3 הידועים); יורש שפרש בעצמו; חוק-בעלים עצמי שאינו ב־Owner Index | ילד של בעלים פעיל; ילד של מצביע `project_codex.*`; ילד עם קובץ בעלים קיים; חוק שפרש עם יורש פעיל; חוק-בעלים חדש אחרי ששורה ב־Owner Index מנתבת אליו |
| **שינוי חוזה קיים** (`compareLawsSnapshots`, פעיל בין שני תצלומים מתוארכים) | שינוי טקסט באותה גרסה (עריכה במקום); הסרה שקטה מהעץ הפעיל; גרסה שיורדת; העלאת גרסה בלי שינוי טקסט | גרסה חדשה עם טקסט שהשתנה; פרישה עם רשומת פרישה |
| **מבנה חדש** — חוק (`compareLawsSnapshots`) ו־טבלה (`migrationTableViolations`) | חוק חדש בלי אישור רשום; טבלה חדשה במיגרציה בלי `-- OWNER-CHECK:`; בעלים שאינו מתפרש; `NEW` בלי סיווג Intake §10, בלי בעלים או בלי `APPROVAL:<ref>` | חוק חדש שאושר; טבלה עם `OWNER-CHECK: EXTEND_EXISTING <בעלים פעיל>`; טבלה `NEW <סיווג> <בעלים> APPROVAL:<ref>`; טבלה שכבר בבסיס |

**תוצאה:** 25/25 עוברות (18 קיימות, 7 חדשות; בדיקה 19 רצה על הנתונים האמיתיים: 87 חוקים, 44 שפרשו, 0 הפרות; בדיקה 24 סורקת את 429 המיגרציות האמיתיות: 0 טבלאות מחוץ לבסיס). שינוי מכוון של נתוני התצלום האמיתי (בעלים → `no_such_owner_law`, יורש → `-`) גרם להכשלת הבדיקות המתאימות ושחזור החזיר ירוק.

**מה הבדיקות אינן:** (א) לא רואות סטייה חיה אחרי 12.11 — רענון = קובץ מתוארך חדש; (ב) `compareLawsSnapshots` מתחילה לפעול בפועל רק כשיהיה תצלום שני — היום מוכחת בפיקסצ'רים בלבד; (ג) לא רואות כתיבה ישירה למסד (ראו §6).

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

**לא נבדק:** האם `service_role` רשאי להשבית את הטריגר (דורש בעלות על הטבלה — לא אומת); אם קיימים כותבים חיים ל־`nodes` מחוץ ל־Edge functions.

## 7. תוכנית־האב → החלטות מאוחרות (כולל מסמך 37) → בעלים → חוזה → מימוש → פער → מבחן קבלה

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
2. **הצעה 21 ו־`f30c0148`:** שורת spec שמקבלת `is_active=false` נשמרת במסד (אין מחיקה); מה שהיה חסר הוא מקום לדרישות הלא־מומשות — והוא ניתן עכשיו בטבלה שלמעלה. המלצה: פרישת `f30c0148` ניתנת לביצוע **אחרי** ש־ZURIEL מאשר שהטבלה הזו היא הרשומה; עד אז להשאיר אותה מחוץ להרצת 21.
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
| `raziel_whatsapp_access_adapter_law` | פריט 5: `savePersonalData` (`wa-raziel:193,935`) כותב כתובת/מיקוד/שם/יום הולדת מכל DM, גם משולח לא־מקושר, **בלי אישור**; ושדות `evaluateWhatsappActionBoundary`/`isExplicitConfirmation` קיימים ולא נקראים. פריט 3: זיכרון רחב נכנס גם בלי רמז המשכיות | **שאלת פרטיות לא־מוכרעת** — ZURIEL מכריע אם זה "mutation" לפי פריט 5; **מועמד היחיד שעלול להיחשב חוסם-בטיחות** |
| `raziel_group_privacy_law` | אכיפת קבוצה בשכבת הנתונים (`@g.us`) **מתה** בנתיב הליבה — `ai-analyze` לא מעביר מזהה צ'אט; הבטיחות נשענת על `handleAllDMs` ו־`GROUPS_ENABLED=false`; אוצר מילים `visibility` שונה מהקוד | פער הגנה בעומק — P2 |
| `raziel_response_contract` v1 | `suggested_paths`: השרת זורק את בחירת המודל ומחליף ברשימה סגורה; הפרומפט סותר את עצמו | התנהגות — P3 |
| `raziel_companion_layer_law` v3 | סעיפים 2,3,4,8 (קול/תמלול) — לא בקבצים שנבדקו; פרסונה כפולה (3 עותקים); `bot_delivery_law` פריטים 3–4 חלקיים | P3 |

**מה שיש לתקן בעקבות התיקון של מזהי החוקים (צרכנים בלבד, לא נערך כאן):** `raziel_brain#1.core` (3 חוקים שפרשו) + `wa-raziel/index.ts:412–415,447`; `ai_quota_law v3` ב־`ai-analyze:3202,4173,4178`, `materialGate.js:16,168`, `research-run:419,424`, ו־`fn_capability_execution_gate_v1`; גרסאות ישנות (`system_suggestions_law v5/v3`, `research_strategy_layer_law v15`, `inter_agent_coordination_law v13`, `live_state_resolution_law v2`, `deploy_on_request v3`, `platform_tiers_law v4`) ב־`ai-analyze`, `raziel-attention:28`, `wa-raziel:65`, `razielRouteGrammar.js`, `fn_raziel_plan`; בדיקות שננעלות על המחרוזות: `tests/sql/raziel_phase_m_cross_surface_golden_v1.sql:163,166`, `scripts/test-replayable-golden-no-black-box.mjs:134,142`, `test/g3-client-correlation.test.mjs:52`. #1321 (ראש `01e590f84`) לא משנה את מזהי החוקים בקבצים האלה; הוא משנה זהות אורח, כשל-סגור של מכסה (`quota_unavailable`) וקישורי `/number/<n>` — **חלק מהפערים למעלה (מכסה מחליפה תשובה) מחמיר אחרי המיזוג שלו**.

## 9. רשימת סגירה משותפת (סשן החוזים + סשן הביקורת הראשית; לביקורת Codex)

חלוקת תפקידים (מההוראה): **סשן החוזים (CT)** — מיפוי והצעות חוזיות. **סשן הביקורת הראשית (MA)** — מימוש, בדיקות טכניות, שערי אכיפה, סדר החלה ושחזור, השלמת M0, תיקון המדידה הקיימת. **ZURIEL** — כל החלטה, כל שינוי חי. הרחבת אנליטיקס **אינה** ברשימה (תוצג בנפרד על ידי MA עם מטרה, נתונים והרשאות). "חוסם" = פער יסוד שמונע עבודה בטוחה; האחרים נשמרים ומתועדפים.

| # | ממצא | מקור | בעל אחריות חוזי | כותב אחד | אובייקטים / קבצים מושפעים | תיקון מוצע | תלות | מבחן קבלה | שער אישור | חוסם? |
|---|---|---|---|---|---|---|---|---|---|---|
| CL-01 | אין ניתוב ל־`research_contributions`/צ'אט ב־Owner Index | §1 | `research_workspace_law` v5 §8 + `writer_material_home_law` | CT | `SOD1820_MASTER_OWNER_INDEX.md` (שורה אחת) | שורת ניתוב למסמך | — | `scripts/test-g1…` מצא בדיוק שורה אחת; grep מחזיר שורה | מיזוג למסמך: ZURIEL | לא |
| CL-02 | `writer_material_home_law` v6 מפנה ל־`research_contribution_law` שפרש | §1, ledger | `research_intake_foundation_contract_law` (ילד) | CT | חוק v7 (טקסט) | החלפת ההפניה ביורש הרשום + רישום החלטת CL-03 | CL-03 | שורת ledger → KEEP/בוצע; G1 snapshot מתעדכן | ZURIEL (כתיבת חוק חי) | לא |
| CL-03 | הקרנת קבוצות לצ'אט מעתיקה גוף הודעה; §23 "הפניה, לא העתקה" | §1 | `writer_material_home_law` §23 | ZURIEL מחליט; CT מנסח | הצעת v2: `claude/group-chat-sync-20261112` (לא הוחלה) | חריג מתועד (שורת צ'אט = משטח הקרנה עם `source_ref` חובה) **או** קריאה-בהפניה ב־RPC | — | אם חריג: סעיף בחוק + `tests/sql/group_chat_sync_v2.sql`; אם הפניה: בדיקת RPC | ZURIEL | **כן — רק ל־v2** (לא להחיל לפני) |
| CL-04 | 3 חוקים פרשו בלי מיפוי יורש | §3 | `inter_agent_coordination_law`; `corpus_admission_foundation_v1`; `canonical_methods_registry_law` (מועמדים טבעיים — להכרעה) | CT | `metadata` של 3 שורות | מיפוי `compaction_v1` בלבד, בלי הפעלה מחדש | קריאת הטקסט המלא של כל אחד | `RETIRED_WITHOUT_RECORDED_SUCCESSOR` ב־G1 מתרוקן | ZURIEL (שינוי חי) | לא |
| CL-05 | 14 הפניות `REPOINT_TEXT` | ledger | הבעלים של כל חוק תלוי | CT | טקסט 12 חוקים | החלפה ביורש הרשום בגרסה הבאה של כל חוק | קריאת החוק במלואו לפני כל תיקון | ledger: 14 → KEEP/0 | ZURIEL | לא |
| CL-06 | צרכני DB קוראים מזהים שפרשו: `fn_metatron_status` (תמיד false), `fn_number_dossier` (`rules_snapshot=[]`), `admin_candidate_from_researcher`, `fn_generate_convergence_candidates`, `fn_rls_grant_audit` | §3 | `reality_graph_law`; `raziel_companion_layer_law`; `person_foundation_contract_law` | MA | 5 פונקציות DB | כיוון מערכי המזהים ליורשים הפעילים | בדיקת PG מבודד | לפני/אחרי: `rules_snapshot` לא ריק; המשמר true | ZURIEL (DDL) | לא |
| CL-07 | `owner: 'unified_graph_law'` נשמר ברשומות (`researchW2ExecutorsBase.js` ×4 + בדיקה) | §3 | `reality_graph_law` | MA | קובץ + `researchW2FoundationHardening.test.js:557` | החלטה: תווית היסטורית מול יורש; נתונים קיימים לא משתנים | החלטה | הבדיקה מעודכנת | ZURIEL | לא |
| CL-08 | 2 קשתות `extends_rule` מצביעות על חוקים שפרשו | §3 | `reality_graph_law` | MA | `edges` | הצבעה ליורש | — | שאילתת קריאה: 0 קשתות לחוק שפרש | ZURIEL (DB) | לא |
| CL-09 | הצעות 20→30, 23, 24 ממתינות; נעילות גרסה במסמכי מצביעים | §4 | לפי החוק | ZURIEL מריץ; CT מעדכן מסמכים | `OWNER_INDEX:79,127,166,167,193`, `ROADMAP:41,186`, `STATE:41,392` | סדר: 20→30; 23, 24 עצמאיות; עדכון נעילות גרסה אחרי כל הרצה | CL-10 | G1 + תצלום מתוארך חדש | ZURIEL | לא |
| CL-10 | הצעה 21: `f30c0148` (תוכנית־אב) | §7 | — | CT | שורת spec | להשאיר אותה מחוץ להרצה עד אישור טבלת §7 | — | טבלת §7 מאושרת | ZURIEL | לא |
| CL-11 | טקסט רזיאל ב־DB ובפונקציות מצטט 3 חוקים שפרשו; `addon_wa` ריק | §8 | `raziel_companion_layer_law` v3 | MA | `raziel_brain#1`, `wa-raziel/index.ts:412–415,447` | עדכון הטקסט ליורשים; סכמת JSON ל־WhatsApp לפי החלטה | CL-13 | בדיקה: אין מזהה שפרש בפרומפט | ZURIEL (DB + פריסת Edge) | לא |
| CL-12 | מחרוזות `owner_ref`/גרסאות ישנות ב־Edge, ב־DB וב־`razielRouteGrammar.js` | §8 | `raziel_*` + `platform_tiers_law` | MA (אחרי #1321) | `ai-analyze`, `research-run`, `materialGate.js`, `fn_capability_execution_gate_v1`, `fn_raziel_plan`, `razielRouteGrammar.js`, 3 בדיקות נעולות | יישור למספרי הגרסה החיים; בדיקות נעילה מתעדכנות | מיזוג #1321; CL-06 | `git grep` של מזהי חוק שפרשו = 0; goldens ירוקים | ZURIEL | לא |
| CL-13 | `savePersonalData` כותב נתונים אישיים בלי אישור; מכסה מחליפה תשובה | §8 | `raziel_whatsapp_access_adapter_law` פריט 5; `raziel_full_answer_and_route_law` ב' | ZURIEL מחליט; MA מממש | `wa-raziel/index.ts:193,935`; `ai-analyze:3720–3724` | החלטה: האם mutation; האם מכסה תחליף תשובה | — | מבחן התנהגות לפי ההחלטה | ZURIEL | **כן — רק סעיף הפרטיות, עד הכרעה** |
| CL-14 | תווית «צוות» נדחית לאורחים (`public_reading_operation_denied`) | נמצא בפריסה 12.11 | משטח קהילה (`experience_governance…`) | MA (`transport.js` בבעלות M0) | `public-reading-deploy/transport.js` (רשימת קריאות) | הוספת `community_staff_user_ids_v1` לרשימה + בדיקה | #1321 (אותו קובץ) | דפדפן אורח: 200 | ZURIEL + ביקורת אבטחה | לא |
| CL-15 | אכיפת CI: הפניה לבעלים שפרש, שינוי חוזה, מבנה חדש | §5 | G1 | CT (קבצי G1 בלבד) | `scripts/lib/g1LawsSnapshotRules.mjs`, `scripts/test-g1-agent-routing-smoke.mjs`, שני קובצי audits | **מומש בענף המקומי** — 25/25, סירוב ואישור לכל מקרה | ביקורת Codex | 25/25 + קובצי הוכחה | ביקורת + מיזוג: ZURIEL | לא |
| CL-16 | פרצות במשמר ה־DB: `description` בלי גרסה, DELETE/TRUNCATE, בעלים לא מאומת | §6 | G1 / חוק `inter_agent_coordination_law` | MA | טריגר `trg_rule_compaction_integrity_guard_v1`; event trigger חדש ל־CREATE TABLE | E1(DB)/E3(DB)/E4/E5 | CL-15 | PG מבודד: מסרב ל־UPDATE description, DELETE; מאשר העלאת גרסה | ZURIEL (DDL) | לא — **דחוף** (פער אכיפה מתועד) |
| CL-17 | תפקיד workflow: חיווט נוסף ל־CI | §5 | — | MA (הקובץ משותף ל־4 ענפים) | `.github/workflows/live-contracts-2029.yml` | **לא נערך כאן** — דרוש רק אם יתווספו קבצי בדיקה חדשים; הבדיקות הנוכחיות כלולות בקובץ הקיים | — | — | תיאום בעלות | לא |
| CL-18 | דרישות תוכנית־האב שלא מומשו ולא בוטלו | §7 | לפי הטבלה | ZURIEL (עדיפויות) | הטבלה ב־§7 | רשומה אחת ב־§7; החלטות R1, R2, R6, R8, R9/R13 | — | החלטה לכל פריט | ZURIEL | לא |

**מחוץ לרשימה, במפורש:** הרחבת אנליטיקס; תיקון המדידה הקיימת (נשאר בעבודה הקיימת של MA); כל הרצת SQL, שינוי הרשאות, מיזוג או פריסה.

## 10. מי הם "שני הקוראים", תחומם, ומה לא נבדק

"שני הקוראים" הם שני תת־סוכנים **בקריאה בלבד**, שהופעלו על ידי סשן החוזים בלבד כדי לקרוא מסמכים גדולים; לא הופעלו אחרים ולא יופעלו; **אין להם בעלות כתיבה** ולא כתבו דבר (SELECT ו־`git show`/`git grep` בלבד). הדיווחים שלהם הם פלט מודל — אימתתי בעצמי את הנקודות המסומנות כ"אימתתי" ב־§7–§8, ואת השאר אני מציג כדיווח קורא.

| קורא | תחום | מה החזיר | מגבלה |
|---|---|---|---|
| קורא מסמך 37 מול תוכנית־האב | `nodes.id f30c0148…`, `project_codex.id=37`, Roadmap/State/Owner Index, מסמכי פרישת Legacy | טבלת R1–R16 מול החלטות (§7) | קריאה מילולית של ~19% ממסמך 37 + חיפוש מילות מפתח; לא נקרא: רוב V3 השמור (L1219–1916), רוב 12.1–12.9, 12.14–12.44, 12.46–12.56 |
| קורא הקשר רזיאל | `ai-analyze`, `wa-raziel`, `raziel-attention`, `research-run`, `_shared/*`, קבצי Raziel ב־`src/lib/research`, חוקי `raziel_*` | מפת הקשר, מזהים ישנים, פערי חובות (§8) | לא נבדקו: גרסאות Edge שנפרסו, פלט מודל אמיתי, `wa-christina`/`wa-webhook`/`wa-uriel`, קוד לקוח ל־voice, גוף `fn_raziel_plan`/`fn_raziel_answer` (קרא ראש + regex) |

**מה לא נבדק במסירה כולה:** (1) קריאה מלאה של מסמך 37 (נדרש קורא עצמאי אם סגירה תלויה בהיעדר החלטה); (2) 14 ההפניות `REPOINT_TEXT` בהקשר של שורה אחת בלבד — חובה לקרוא את החוק במלואו לפני תיקון; (3) הנתונים החיים אחרי 12.11; (4) האם `service_role` יכול להשבית טריגר; (5) טבלאות שנוצרו מחוץ ל־`supabase/migrations`; (6) `test/admin-system-health-contract.test.mjs` — האם נועלת גרסת `subscription_funnel_law` (לבדוק לפני הרצת 23).

**קבצים בענף המקומי `claude/laws-alignment-20261112` (לא נדחפו; ללא PR):** `docs/reviews/contract-governance-audit-20261110/laws-alignment-20261112/README.md`, `.../retired-reference-ledger.txt`, `.../HANDOFF-20261111.md` (סעיף 8), `audits/g1-agent-entry/G1_LAWS_ACTIVE_SNAPSHOT_20261112.txt`, `audits/g1-agent-entry/G1_MIGRATION_TABLES_BASELINE_20261112.txt`, `scripts/lib/g1LawsSnapshotRules.mjs`, `scripts/test-g1-agent-routing-smoke.mjs`. **לא נגעתי:** `.github/workflows/*`, `public-reading-deploy/*`, `supabase/functions/*`, `src/*`, `supabase/migrations/*`, ו־Owner Index/ROADMAP/STATE.
