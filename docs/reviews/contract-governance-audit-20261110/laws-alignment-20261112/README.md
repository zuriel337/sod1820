# יישור ממוקד וסגירת בסיס — 12.11.2026 (קריאה בלבד)

> תוספת למסירת הביקורת הקיימת ([HANDOFF-20261111.md](../HANDOFF-20261111.md), §16). לא מקור אמת ולא קובץ MASTER. אין כאן הרצת SQL, שינוי חוק חי, מיזוג או פריסה.
> בסיס: `origin/main` = `aa0f6bc82` (Production חי: `dpl_FEzrHi2GLSpdHPN1cJDu6rhXtswZ`). ראש #1321 שנבדק: `e110ba6a5` (merge-base = `aa0f6bc82`).
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

## 4. מטריצת השפעה מול הראש העדכני של #1321 (`e110ba6a5`)

#1321 (M0) משנה 144 קבצים: `docs/reviews` (22), `src/lib` (21), `supabase/proposed` (20), `supabase/functions` (13), `src/components` (11), `tests/sql` (5), `test/helpers` (5), `src/pages` (4), ועוד. **הוא לא נוגע** ב־Owner Index, `ROADMAP`, `MASTER_STATE`, `CLAUDE.md`, `AGENTS.md`, `scripts/test-g1-*`, `audits/g1-agent-entry`, `docs/2029-data-placement-retention-crosswalk.md`, ולא בקבצי החוזים של תיקיית הביקורת. כן נוגע ב־`.github/workflows/live-contracts-2029.yml` (בנוסף לשלושה ענפים פעילים נוספים — `claude/group-chat-sync-20261112`, `more-install-explicit-2029`, `more-panel-2029-redesign`) וב־`public-reading-deploy/transport.js`.

| הצעה | מה משתנה (DB בלבד, טרם הורץ) | קבצים / בדיקות שמזכירים את החוקים (בראש #1321) | #1321 נוגע בהם? | התאמת תיעוד / התנהגות |
|---|---|---|---|---|
| **20** | `platform_tiers_law` v5→v6 (§19 "NUMBER VISIBLE, DEPTH GATED"); `canonical_methods_registry_law` v6→v7 (§26 "VALUE BESIDE A GEMATRIA MATCH ROW") | נעילות גרסה בתיעוד: `OWNER_INDEX:167,127`, `ROADMAP:186`, `STATE:392`. `scripts/test-g1-agent-routing-smoke.mjs:212,237` נועלים registry=6 אך קוראים **baseline סטטי** (לא חי) → לא נשברים. מחרוזות provenance ב־`ai-analyze/index.ts:4248,4253`, `research-run/index.ts:436`, `field-router`, `journey-message`, `lab-teacher`, `number-researcher`, `els-search-bridge`, `_shared/materialGate.js` | **כן** — כל קבצי ה־Edge האלה | **תיעוד:** עדכון נעילות גרסה ב־3 קבצי מצביעים. **התנהגות:** אין. מחרוזות ה־Edge כבר ישנות (v4≠v5) — תיאום עם M0 בלבד |
| **30** (אחרי 20) | פרישת `number_page_law` v1, `no_row_without_number_law` v1 (`is_active=false`) | **אפס אזכורים** בקוד/בדיקות/CI/Edge (נבדק ב־`test scripts .github src supabase/functions`) | לא | `MOOT_AFTER_30`: 3 הפניות לשעבר נעלמות. מחייב ש־20 הוחלה ואומתה (הצעה 30 בודקת זאת) |
| **23** | `worlds_color_law` v1→v2; `subscription_funnel_law` v22→v23; `experience_governance_foundation_v1_law` v10→v11; `identity_architecture_law` v1→v2 | נעילות: `OWNER_INDEX:166,193`, `ROADMAP:41`, `STATE:41`; קוד: `src/lib/worlds.js`, `PostFollowBox.jsx`, `WatchButton.jsx`, `notifications.js`, `commandCenter.js`, `EmailVerify.jsx`; בדיקה: `test/admin-system-health-contract.test.mjs` (מזכירה `subscription_funnel_law` — **לבדוק לפני הרצה אם היא נועלת גרסה**); `scripts/test-g1-agent-routing-smoke.mjs` (`experience_governance…` ב־required_rules) | לא | **תיעוד:** 3 נעילות גרסה. **התנהגות:** אין שינוי קוד; בדיקת `admin-system-health` נדרשת |
| **24** | `brand_spelling_law` v1→v2, `canonical_colors_law` v2→v3, `logo_integrity_law` v3→v4, `sod1820_canonical_identity_law` v5→v6 (בעלים V1→V2); `research_workspace_law` v5→v6 (`visual_owner` בלבד) | `OWNER_INDEX:79` (נעילת v5); `src/theme.js`, `systemFrame2029.css` (canonical_colors_law); `scripts/test-g1-agent-routing-smoke.mjs:159,169,186` (V1) — על ראיות שנלכדו (סטטי); `ai-analyze/index.ts:2063,2076,2357`, `research-run/index.ts:400` מכילים `research_workspace_law v5` | **כן** (`ai-analyze`, `research-run`, `src/lib/supabase.js` הערה) | **תיעוד:** נעילת גרסה ב־Owner Index. **התנהגות:** אין; מחרוזות provenance ב־Edge יתיישנו (v5→v6) — תיאום עם M0 |
| **21** | `is_active=false` ל־9 שורות `type='spec'` (לא חוקים) | **אפס** צרכנים של 9 ה־UUID מחוץ לחבילת הביקורת (נבדק בראש #1321) | לא | תנאי חדש: לפני פרישת `f30c0148…` ("תוכנית־אב") — הדרישות שלא מומשו נרשמות ומתועדפות (§7) |
| **הרחבת G1** (חדש, קבצים בלבד) | +4 בדיקות ב־`test-g1-agent-routing-smoke.mjs`, קובץ snapshot מתוארך חדש | הבדיקה כבר מורצת ב־`live-contracts-2029.yml:48` — **ללא עריכת ה־workflow** | לא | ראו §5 |

**אין פתיחת מימוש מקביל בתחומי M0:** שום קובץ ב־`supabase/functions`, `public-reading-deploy`, `src/lib/supabase.js` או ב־workflow לא נערך כאן.

## 5. הרחבת בדיקת G1 ותמונת מצב מתוארכת (סעיף 9)

- **קובץ חדש:** `audits/g1-agent-entry/G1_LAWS_ACTIVE_SNAPSHOT_20261112.txt` — 87 חוקים פעילים (גרסה, בעלים, משפחה, md5 של הטקסט) ו־44 חוקים שפרשו ושחוק פעיל עדיין מציין (עם היורש הרשום). תצלום מתוארך; **התצלומים ההיסטוריים (9.10.2026) לא שונו**; בלי מפתח שירות; בלי כתיבה למסד.
- **בדיקות חדשות** (מצורפות לקובץ הקיים `scripts/test-g1-agent-routing-smoke.mjs`, שכבר רץ ב־CI; ה־workflow המשותף **לא נערך** — הוא מושפע כרגע מ־4 ענפים פעילים): (1) 87 חוקים ייחודיים, לכל אחד בעלים וגרסה אחת; (2) כל בעלים נפתר לחוק פעיל / מצביע codex / קובץ קיים בריפו; (3) כל חוק שהוא בעלים של עצמו מנותב ב־Owner Index; (4) חוק שפרש וחוק פעיל עדיין מציין אותו חייב יורש רשום, פרט ל־3 הידועים (רביעי חדש = כשל).
- **בדיקת עמידות:** שינוי מכוון של בעלים ל־`no_such_owner_law` ושל יורש ל־`-` גרם ל־2 מ־4 הבדיקות להיכשל; שחזור החזיר 22/22 (18 קיימות + 4 חדשות).
- **מה הבדיקה אינה:** היא לא רואה סטייה חיה אחרי 12.11. היא מוכיחה עקביות פנימית של העותק ועקביות מול קבצי הריפו. רענון = קובץ מתוארך חדש.

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
| E1 | **זיהוי הפניה לבעלים שפרש**: בדיקה שכל `canonical_owner` ושכל מזהה חוק בטקסט פעיל מצביעים לחוק פעיל או לשורה ברישום `KEEP` ב־ledger | הבדיקות החדשות ב־G1 smoke + ledger | CI (על תצלום מתוארך) | **כן** — לא נראה כתיבה ל־DB שלא עברה PR. להשלמה: הרחבת הטריגר הקיים כך ש־`canonical_owner` חייב להיות חוק פעיל / קובץ-רשום (DDL, באישור) |
| E2 | **בדיקת בעלות מול Owner Index** (קיימת בהרחבת G1: כל חוק-בעלים מנותב) + בדיקה הפוכה: כל שורת Owner Index מצביעה לחוק פעיל | G1 smoke (`ownerRow`) | CI | כן (לא חל על כתיבה ישירה); הטריגר הקיים כבר מונע גרסה פעילה כפולה |
| E3 | **חוק / טבלה / מנגנון חדש מחייבים הצדקה ואישור**: ב־CI — כל `CREATE TABLE` חדש ב־`supabase/migrations` חייב כותרת `-- OWNER-CHECK: EXTEND_EXISTING <owner>` או `NEW <סיווג Intake §10> <הפניה לאישור>` ושורה ב־crosswalk; חוק חדש (`rule_version=1` חדש) — מסומן ב־`owner_check` ב־metadata (כבר נהוג בחוקים). ב־DB — הרחבת event trigger הקיים (`ensure_rls` או אחיו) לרשום ל־`work_log`/טבלת audit קיימת כל `CREATE TABLE` | `scripts/test-g1…` / בדיקת מיגרציות, event trigger קיים | CI + DB-audit | CI: **כן**, עוקף. DB event trigger: **לא** עוקף CREATE TABLE ע"י `service_role` רגיל, אך אינו חוסם — רק מתעד |
| E4 | **סגירת פרצת ה־description**: הוספת `description` לרשימת העמודות של הטריגר, כדי ששינוי טקסט של חוק פעיל ללא גרסה חדשה ייחסם | הטריגר הקיים | DB (חל על כל כותב) | **לא** עוקף (למעט בעל הטבלה שמשבית טריגר) |
| E5 | חסימת DELETE/TRUNCATE על `nodes` לחוקים (טריגר BEFORE DELETE שמסרב ל־`type='rule'`) | הטריגר הקיים | DB | לא עוקף |

**הפרדה במפורש:** E1/E2/E3(CI) הם בדיקות CI — הן עוצרות PR, ואינן עוצרות מי שיש לו `service_role` / `postgres` (הם כותבים ישירות, מחוץ ל־Git). רק E3(DB)/E4/E5 הם אכיפה ברמת מסד שחלה גם על כתיבה ישירה. כל שינוי במסד (E4, E5, הרחבת E1/E3) הוא DDL שדורש אישור מפורש של ZURIEL (§0.4) ובדיקת PG מבודד — **לא הוצעו להרצה כאן**.

**לא נבדק:** האם `service_role` רשאי להשבית את הטריגר (דורש בעלות על הטבלה — לא אומת); אם קיימים כותבים חיים ל־`nodes` מחוץ ל־Edge functions.
