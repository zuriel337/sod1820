# סטטוס קובצי ה־SQL — נכון ל־11.11.2026 04:41 UTC; עודכן 06:30 UTC (‏11_ הוחלף ב־11b), 11:50 UTC (חבילת 11b הושלמה) ו־12:20 UTC (‏11b ו־11c הוחלו)

**כלל קריאה:** ההערות בראש כל קובץ נכתבו לפני ההרצה (״PROPOSAL ONLY. NOT EXECUTED.״), והקבצים נשמרו בלי שינוי, כדי שה־SHA-256 שלהם יישאר זהה לזה שאושר. **הסטטוס בפועל מופיע כאן.** המקור הקובע למצב החי הוא המסד `linswmnnkjxvweumprav`, ולא קובץ זה.

| קובץ | SHA-256 | סטטוס | הערות |
|---|---|---|---|
| `10e_p0_release_policy_EXEC.sql` | `f2775634ab6f2b54142ed68d1702fe56cd8a09c2edf288ef11dac5c5d648cb85` | **APPLIED — פעם אחת**, ‏2026-11-11 04:32:42 UTC | באישור מפורש של ZURIEL להרצה אחת (04:22 UTC). אומת: P1–P4, ‏`pg_stat_statements` עם `calls=1`, ו־md5 של הפקודה = md5 של הקובץ בלי ה־`;` שבסופו. **אין להריץ שוב**: הקובץ ממילא יסרב, כי v4 כבר פעילה. ראו `../out/SQL10_run_record_20261111.md` |
| `10_p0_release_policy.sql` | `d1ac658b6e2ace922ac5d32a3021f6ef8aa88dc06390b05aca095da0d48963fb` | **CONTENT REFERENCE — NOT EXECUTED** | התוכן המאושר. הוחל באמצעות `10e_`, עם מצב סופי זהה (הוכח בסימולציה). הרצה שלו עכשיו תסורב (״a version above v3 already exists״) |
| `19e_p0_release_policy_ROLLBACK_EXEC.sql` | `a1bbb3c2c73c0b5c3c5b31affecb4baa3461885734dbd810d3d3a52ed7526861` | **NOT EXECUTED — לא מאושר** | ה־rollback של SQL 10. תקף רק כל עוד שש השורות נשארות במצב שהוחל |
| `19_p0_release_policy_ROLLBACK.sql` | `cbe420f72e2ad43bcf244aee1e49dd363ead9f4d1b499000c2ebc3adc0b0d9c4` | **NOT EXECUTED** | שקול ל־`19e_`, אבל שמונה פקודות וכ־26 אלף טוקנים |
| `11_admin_suggestion_decide_text.sql` | `a43b12ca9542b74f49488c180ab6cccbaba8794437270c819bea6619c0a47a1a` | **SUPERSEDED — אין להריץ** (11.11.2026) | הקובץ משנה רק טקסט, והפונקציה ממשיכה ליצור ASSIGNMENT ל־CLAUDE שמופעל אוטומטית (סימולציה O5). מוחלף ב־11b. אם בכל זאת יורץ, 11b יסרב לרוץ אחריו |
| `18_admin_suggestion_decide_ROLLBACK.sql` | `da9d08e77f63f32c0be7ee2223e0da4f34729871c925b114fff96d2136681701` | **SUPERSEDED** | ה־rollback של 11_ |
| **11b** · `supabase/proposed/20261111120000_admin_suggestion_decide_decision_record_only_v1.sql` | `7423150b1224367829316018233e0fe7f59e5232fcde346cc9c92440dd4f584e` | **APPLIED — פעם אחת**, 2026-11-11 12:13 UTC, ‏`apply_migration` גרסה `20261111121319` | באישור מפורש של ZURIEL. הטקסט השמור זהה לקובץ (SHA-256). md5 הפונקציה `f44dc42f…`; ההרשאות ללא שינוי. **אין להריץ שוב**; הקובץ ממילא יסרב. ראו `../../gap-closure-20261111/sql11b/APPLY-RECEIPT-20261111.md` |
| **11c** · `supabase/proposed/20261111120100_system_suggestions_law_v7_decision_record_only.sql` | `aea081d8b5909ddd914338075784729fd1f196438050841823b228b6fd668777` | **APPLIED — פעם אחת**, 2026-11-11 12:15 UTC, ‏`apply_migration` גרסה `20261111121504` | אחרי 11b ואימותו. ‏v7 פעיל ויחיד (`a594e1fe…`); ‏v6 נשמר כהיסטוריה. **אין להריץ שוב** |
| **18c** · `supabase/proposed/ROLLBACK_20261111120100_system_suggestions_law_v7.sql` | `2af1f39478f4203f4271201b0012b5acdc42461df0052d0482a5ea179926e79f` | **NOT EXECUTED** | ‏rollback, **ראשון**: v7 → v6, ו־v7 נשאר כהיסטוריה. לא מאושר; תקף כל עוד v7 הוא בדיוק מה ש־11c כתב |
| **18b** · `supabase/proposed/ROLLBACK_20261111120000_admin_suggestion_decide.sql` | `027ad77cf11b1aa99b72ccae1c8c0fd0b1168a65c23abddcc4d22a5e4f056e90` | **NOT EXECUTED** | ‏rollback, **שני**: משחזר את הבסיס, כולל ההפעלה האוטומטית. מסרב כל עוד v7 פעיל. השם הקודם: `18b_admin_suggestion_decide_not_activated_ROLLBACK.sql` (`e4e8144e…`) |
| `20_number_principles_to_2029_owners.sql` | `922aef030633ee0267cd502e904749fc362fe7b2cde40c1eb38fd3ecf91d367b` | **NOT APPLIED** | `platform_tiers_law` v5→v6 · `canonical_methods_registry_law` v6→v7 |
| `29_number_principles_ROLLBACK.sql` | `6c9401c252a80b25be411c6bd512f819c92e47d94e9b0f228ab37a413c578bb9` | **NOT EXECUTED** | |
| `30_STAGE3_retire_number_laws.sql` | `804c9bb7062fe9ba71f75028ef3591fcf284ab5ad8ac99ab988fc5a02b08ff8f` | **NOT APPLIED** | נעול: מסרב לרוץ לפני ש־`20_` הוחל ואומת |
| `39_STAGE3_retire_number_laws_ROLLBACK.sql` | `6d5563e804642be3675f8a9da1bbeb4a1d16eab3f8977e18abf4a6109a968374` | **NOT EXECUTED** | |
| `21_retire_9_legacy_specs.sql` | `33b62ed0a99e5b23c3dd6f199202dd2b09e418091f961fa9da9957e15c32ae9c` | **NOT APPLIED** | `is_active=false` בלבד, ל־9 רשומות spec |
| `28_retire_9_legacy_specs_ROLLBACK.sql` | `78abfec26388cb1f85a81290dc4c53f2552f9cd04317a1abef6898ca799d6510` | **NOT EXECUTED** | |
| `22_codex_stale_banners.sql` (המקור) | `17cfccb1df22108a671c9340d24e9a279fd8912ee54c8fc7b313be58c5859ae6` | **NOT APPLIED** | **המקור לא נמצא במאגר**, כי הוא כולל כתובת מייל אישית מגוף קודקס #2. כאן יש רק `22_codex_stale_banners.REDACTED-review-only.sql.txt`, שאינו ניתן להרצה (`../REPO-COPY.md`) |
| `27_codex_stale_banners_ROLLBACK.sql` (המקור) | `46711d380195df6c6c78d7b8d704ed6c8b015a50a9948068555aa4f73b70e8f2` | **NOT EXECUTED** | כמו `22_`: כאן יש רק עותק מצונזר לעיון |
| `23_shared_contracts_groupB.sql` | `3d866a4f44460b0d0617dc4a2d2b5046bb4fdbe223f3de16fb4c20218a419517` | **NOT APPLIED** | `worlds_color_law` · `subscription_funnel_law` v22→v23 · `experience_governance_foundation_v1_law` · `identity_architecture_law` · קודקס #1, #5, #12, #15, #30 |
| `26_shared_contracts_groupB_ROLLBACK.sql` | `d74e1ca8fd28740b8879273af285861b94721af982d0c9fb091f6747af536272` | **NOT EXECUTED** | |
| `24_design_v1_v2_alignment.sql` | `3373c8193412f572c1653343b9c9718246df1e77df185de59f96da4640b3a3f9` | **NOT APPLIED** | החרגה נקודתית ל־V1/V2 (חמישה חוקים) |
| `25_design_v1_v2_alignment_ROLLBACK.sql` | `56a0b1ada1190bae82c522d0d091685cd3b708cbd0d6238ee73fbb9992a5db8c` | **NOT EXECUTED** | |
| `40_corpus_admission_approval_path.sql` | `3b0295a0f5d2ba1f1f63e256b7431dc2d744305af78bda579f4a5eb6fc2ffa94` | **NOT APPLIED** | פונקציות בלבד. אין שינוי בנתונים |
| `49_corpus_admission_approval_path_ROLLBACK.sql` | `0b0ff3dcbca911bb7e3ea6625a9d9581aef82144c912bb797fae8c8aab0ac214` | **NOT EXECUTED** | |
| `50_plan37_series_decisions_6_7.sql` | `c8cef8ca00b56e03856d54326c83abaffeb4b612e63066b0ec86dea6fe5ac9ee` | **NOT APPLIED** | רישום החלטות 6–7 ב־PLAN37, הוספה בסוף בלבד |
| `59_plan37_series_decisions_6_7_ROLLBACK.sql` | `fb1f9aec80f0231dadecc8171e95d6771dfadbe4ab008cc43c83bea20f0c5315` | **NOT EXECUTED** | |

כל קובץ שלא הוחל בודק את הבסיס החי בזמן הריצה ב־md5, ומסרב אם משהו השתנה. הוא דורש אישור מפורש של ZURIEL לפי SHA-256, להרצה אחת (`CLAUDE.md` §0.4). שום קובץ כאן אינו אישור.
