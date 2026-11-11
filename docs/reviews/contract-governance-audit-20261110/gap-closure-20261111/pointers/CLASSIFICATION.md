# הפניות לגרסאות החוקים: מה פעיל, מה היסטורי

הגרסאות הפעילות במסד (11.11.2026):
- ‏`deploy_on_request` v4
- ‏`inter_agent_coordination_law` v18
- ‏`foundation_closure_protocol_law` v8
- ‏`system_suggestions_law` v6

הסריקה (`pointer_scan.txt`) עברה על כל אזכור של ארבעת החוקים עם מספר גרסה. הסיווג המלא נמצא ב־`pointer_classification.txt`, שנוצר ב־05:32 UTC, לפני שני התיקונים.

## מה תוקן (שתי שורות)
| שורה | לפני | אחרי | למה |
|---|---|---|---|
| ‏`AGENTS.md:44` | ״Under `inter_agent_coordination_law` v17 Codex reports…״ | ״…v18 (which carries the v17 reporting rule unchanged)…״ | הפניה פעילה שמנחה את Codex עכשיו |
| ‏`SOD1820_MASTER_OWNER_INDEX.md:3` | ״…(`inter_agent_coordination_law` v17)…״ | ״…v18, שנושא את כלל הדיווח של v17 ללא שינוי…״ | הפניה פעילה בראש אינדקס הבעלים |

כלל הדיווח עצמו לא השתנה: v18 נושא את v17 כמו שהוא. אחרי התיקון: G1 ‏18/18, ‏`test-legacy-retired` PASS, ושני הליטרלים המוגנים (`dpl_46k9…`, ‏״2029 Production cutover״) נשארו ב־`CLAUDE.md` וב־`AGENTS.md`.

## מה נשאר, ולמה
| קטגוריה | אזכורים | החלטה |
|---|---|---|
| הפניות פעילות (ACTIVE_POINTER) | 12 | כולן תואמות את הגרסה הפעילה |
| תיעוד מתוארך (DOC_PROVENANCE) | 15 | נשארים. אלה מסמכי תכנון ועיצוב מתוארכים, שמתעדים איזו גרסה חלה בזמנם. למשל `SOD1820_MASTER_ROADMAP.md:316` (״under v13״) מתעד מקור של סעיף. שתי השורות שתוקנו נספרו כאן בסריקה |
| מסמכים היסטוריים (HISTORICAL_DOC) | 8 | נשארים. הם מסומנים כ־checkpoint או כ־historical בתוך הטקסט עצמו |
| מיגרציות (HISTORICAL_MIGRATION) | 93 | לא משנים. מיגרציה היא היסטוריה |
| תוויות ב־Edge Functions (RUNTIME_LABEL_EDGE) | 27 | לא שונו, כי כל שינוי דורש פריסת Edge, באישור. הפירוט מתחת לטבלה |
| קוד ובדיקות (CODE_OR_TEST_PROVENANCE) | 6 | נשארים. בדיקה שמאמתת מיגרציה היסטורית, למשל `test/system-self-maintenance-v1-contract.test.mjs`, חייבת לראות את הגרסה ההיסטורית |
| הערה ב־workflow (WORKFLOW_COMMENT) | 1 | נשארת. ‏`release-visual-gate.yml:19` מתעדת מאיפה בא סעיף הקנרית (v3) |

ה־Edge Functions עם תוויות ישנות:
- ‏`ai-analyze` (20 אזכורים)
- ‏`field-router`, ‏`gallery-ocr`, ‏`lab-teacher`, ‏`number-researcher`, ‏`raziel-attention`, ‏`wa-raziel`, ‏`wa-video-enrich` (אזכור אחד בכל אחת)

נבדק ידנית ונשאר: `AGENTS.md:43`, ״(v17 at the time of this edit; re-verify)״. השורה מציינת את התאריך שלה ומורה לאמת מחדש, ולכן היא אזכור היסטורי תקין.

לא נעשתה החלפת גרסאות גורפת במסמכים או במיגרציות, ולא נוצר מקור סמכות נוסף.
