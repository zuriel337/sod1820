# ערוץ ישיר מ־GPT לסשן Claude Code קיים: בדיקה, תיקון מוצע ומוכנות

**משימה:** `OWNER_EXISTING_CCR_B2565041_DIRECT_RESUME_20261111` (הוראת ZURIEL, 11.11.2026; מסירת GPT ‏`e6a08738-7d08-4d66-8082-866e25ac0480`; BEFORE ‏`6f4fdd3c-5009-4424-ba22-4ac8255bebc3`).
**מצב:** הצעה בענף בלבד. לא הוחלו SQL, ‏Vault, חוק, הרשאה, ‏cron או Edge, ולא היו מיזוג או פריסה.

## בקצרה
| שאלה | תשובה | ראיה |
|---|---|---|
| מה מזהה הסשן? | `session_01H7739MjqsSy3Nv6324VnN8`. ‏`ccr-b2565041-d94syf` הוא שם הענף בלבד. | `get_session` |
| האם `agent_dispatch_emit` ממשיך סשן קיים? | **לא.** הוא שולח ל־Routine יחיד (`trig_01XMNhGaBn3YVBdhRV9Ci2t8`, ‏`persist_session=false`), וכל שליחה פתחה סשן חדש. | ‏Vault, ‏`get_trigger`, היסטוריית `work_log` |
| האם קריאת API ל־`/fire` יכולה להמשיך סשן? | **לפי התיעוד, לא:** "POSTing to the endpoint ... starts a new session". חריג מתועד אחד: בתוך Project, ‏run יכול להמשיך thread. | [‏evidence/docs-quotes](evidence/docs-quotes-20261111.md) |
| האם הפלטפורמה יכולה למסור הודעה לסשן קיים לפי מזהה? | **כן, במסלול של כלי החשבון.** משימה מתוזמנת עם `persistent_session_id` של הסשן; תשובת ה־fire מחזירה את אותו סשן (`cse_01H7739MjqsSy3Nv6324VnN8`). | הבדיקה החיה, §2 |
| האם GPT (דרך המסד) יכול להגיע לסשן הזה היום? | **לא.** למשימה הקשורה לסשן אין טוקן API; טוקן נוצר רק בממשק הווב, ולא מתועד שאפשר להוסיף כזה למשימה קשורה. | §2, §4 |
| מוכנות להפעלה | **`NOT_READY` — ‏`NO_DIRECT_EXISTING_SESSION_DISPATCH` נשאר נכון.** | §4 |

## 1. המנגנון החי (קריאה בלבד, 11.11.2026)
- **שיגור:** `agent_dispatch_emit(uuid)` קורא את `CLAUDE_CODE_ROUTINE_FIRE_URL` ו־`CLAUDE_CODE_ROUTINE_TOKEN` מ־Vault (נוצרו 15.9), ושולח `{"text": locator}` ל־`/v1/claude_code/routines/trig_01XMNhGaBn3YVBdhRV9Ci2t8/fire`.
- **הקבלה:** `agent_dispatch_reconcile_routine_response` שומר את `claude_code_session_id` ו־`claude_code_session_url` מהתשובה.
  - כל השיגורים הרשומים פתחו סשן חדש, למשל `cse_0126HMDvrkYkoRwx2EnMAgn6` ו־`cse_01KZPfbpCMMFgg6RGbVydDsb`.
  - האחרון היה ב־4.11: ‏`session_01H7739NdxCcBK8pzTDcp7eG`, ‏origin ‏`fire_routine`, בכותרת "⚡ SOD1820 Agent Dispatch".
- **ACK ותוצאה:**
  - `agent_dispatch_claim` כותב את ה־lease.
  - `agent_dispatch_finish` דורש שה־lease owner יהיה ה־worker (‏"lease mismatch"). רשומת ה־AFTER נושאת `completed_by`.
- **GPT:** הטריגר `trg_work_log_zz_gpt_delivery_stop_v17` פעיל. כל שורה ל־GPT נכתבת מחדש ל־ZURIEL, בלי dispatch. ה־RESULT_WAKE נדחה (`gpt_runtime_endpoint_not_configured`).
- **cron:** ‏125, ‏126 ו־127 כבויות ונשארות כבויות.
- **החוק v18:**
  - ‏§42, ‏§93 ו־§96 מתירים ל־GPT להפעיל את CLAUDE דרך assignment. ‏v17 מגביל הפעלה להוראת משתמש מפורשת, ואוסר מסירה ל־GPT.
  - ‏§70 דורש idempotency, ‏claim/lease, מצבי כשל מפורשים ו־provenance.
  - ‏§44 ו־§74: אסור לטעון ל"השכמה" בלי runtime מאומת.
  - **כלומר: ההרשאה קיימת; היכולת למסור לסשן מסוים — לא.**
- **DRIFT:** ‏`agent_dispatch_claim` ו־`agent_dispatch_reconcile_routine_response` החיים שונים מהמיגרציות בריפו.
  - אורכי הגוף: ‏927 מול 1,048, ו־3,170 מול 3,817.
  - ב־`schema_migrations` אין גרסה מאוחרת יותר.
  - ‏`agent_dispatch_emit` זהה למיגרציה `20260918211933`.
  - פירוט: [evidence/function-md5](evidence/function-md5-20261111.json).
  - ההצעה לא מחליפה את שתי הפונקציות שזזו; היא מוסיפה לידן טריגר.

## 2. הבדיקה החיה: מסירה לאותו סשן
1. **שקילות מזהים:** ‏`get_session(cse_01H7739MjqsSy3Nv6324VnN8)` מחזיר את `session_01H7739MjqsSy3Nv6324VnN8`. התחילית היא תגית בלבד.
2. **יצירת המשימה:** נוצרה משימה חד־פעמית `trig_01He6N3WKUUqcMYGWzir4wVj`.
   - `persist_session=true`, ‏`persistent_session_id=session_01H7739MjqsSy3Nv6324VnN8`.
   - אין לה טוקן API (‏`api_token_hint` ריק, ‏`created_via=meta_mcp`).
3. **‏fire אחד עם nonce ‏`26c1a8b43d3a9c7b`:** התשובה הייתה `session_id: cse_01H7739MjqsSy3Nv6324VnN8`, וההודעה "This routine runs in this session, so its prompt arrives here as a new message".
   - כשה־fire יוצא מאותו סשן, הטקסט לא נשלח, כי הוא כבר בשיחה.
4. **ההגעה:** ההודעה הגיעה **לאותה שיחה** כהודעת משימה מתוזמנת.
   - הריצה: `ROUTINE_RUN_STATUS_SUCCEEDED`, ‏fired_at ‏21:03:14Z, ‏`session_id=cse_01H7739MjqsSy3Nv6324VnN8`.
   - זמן ההגעה: נמסרה בסוף התור שרץ באותו רגע, ונקראה ב־21:18:05Z. היא לא קוטעת תור שרץ.
   - בתור שקיבל אותה, `get_session` החזיר `session_01H7739MjqsSy3Nv6324VnN8`. לא נפתח סשן חדש (לפי `list_sessions`), וההקשר כולו נשמר.
   - המשימה נמחקה.
   - פירוט: [evidence/session-id-and-probe](evidence/session-id-and-probe-20261111.json).

**מה זה מוכיח:** מסירה לסשן קיים לפי מזהה, דרך כלי החשבון בתוך Claude Code.
**מה זה לא מוכיח:**
- שקריאת `/fire` עם טוקן ממשיכה סשן;
- שטקסט מגורם חיצוני מגיע בשלמותו.

## 3. התיקון המוצע (ענף `ccr-b2565041-d94syf`, מ־main ‏`fe79229c9`)
| קובץ | תפקיד |
|---|---|
| `supabase/proposed/20261111210000_agent_dispatch_target_session_v1_PROPOSAL.sql` | התיקון |
| `supabase/proposed/ROLLBACK_20261111210000_agent_dispatch_target_session_v1.sql` | חזרה מדויקת לבסיס `3ef4d759` |
| `tests/sql/agent_dispatch_target_session_v1.sql` + `scripts/run-agent-dispatch-target-session-sql-test.sh` | בדיקה על Postgres מקומי |
| `tests/sql/fixtures/agent_dispatch_live_base_20261111/` | שבע הפונקציות החיות, בייט מול בייט (md5 נבדק) |

**ההתנהגות**
1. שורה **בלי** `dispatch_context.target_session_id` עוברת בדיוק את המסלול של היום: אותו Routine, אותו טקסט, אותם מצבים.
2. שורה **עם** `target_session_id`:
   - נשלחת רק לזוג Vault של הסשן הזה: `CLAUDE_CODE_SESSION_FIRE_URL__<id>` ו־`CLAUDE_CODE_SESSION_TOKEN__<id>`, כש־`<id>` הוא המזהה בלי התחילית.
   - אם הזוג חסר: `DEFERRED_TARGET_SESSION_NOT_REGISTERED`, ו**לא נשלח כלום**. אין נפילה ל־Routine שפותח סשן חדש.
   - מזהה לא תקין, למשל שם ענף: `DEFERRED_TARGET_SESSION_ID_INVALID`.
3. **אימות הספק:** הסשן שה־`/fire` מדווח חייב להיות היעד. אחרת: `DEFERRED_TARGET_SESSION_MISMATCH`, בלי retry.
4. **רק סשן היעד יכול ל־claim:** מזהה הסשן חייב להופיע ב־worker. לכן רק הוא יכול לסגור את המשימה, ורשומת ה־AFTER נושאת את מזההו.
5. **הקישור קבוע:** אי אפשר להוסיף, לשנות או להסיר `target_session_id` אחרי ה־INSERT.
6. **מה לא נגע:**
   - ‏claim, ‏reconcile, ‏finish וה־guard של v17;
   - טבלאות, הרשאות ללקוחות, policies, ‏cron, ‏Vault.
   - פונקציה עוזרת חדשה ומפעיל חדש, בלי הרשאת הרצה ל־anon או ל־authenticated.
7. **תנאים מקדימים:** ה־md5 של הבסיס החי. סירוב להרצה שנייה, ותנאי־אחרי.
8. **החזרה:** מסרבת כל עוד יש שורה ממוקדת בטיפול, כדי ששום שורה לא תיפול לסשן חדש.

**הבדיקה** (PostgreSQL 16 מקומי, ‏11.11.2026): `PASS agent_dispatch_target_session_v1`. היא בודקת:
- הפער של היום: הבסיס שולח שורה ממוקדת ל־Routine הכללי;
- שורה בלי יעד: ללא שינוי;
- יעד רשום;
- יעד לא רשום: אין שליחה ואין fallback;
- שם ענף: נדחה;
- קבלה זהה (`cse_` מול `session_`): מאומתת;
- קבלה שונה: נכשל סגור;
- ‏claim של סשן אחר ושל worker בלי מזהה: נדחים;
- ‏claim ו־finish של סשן היעד, ורשומת ה־AFTER עם `completed_by` (‏v17 עדיין מפנה אותה ל־ZURIEL);
- קישור קבוע;
- ‏GPT עדיין חסום;
- הרשאות;
- סירוב להרצה שנייה;
- החזרה: מסרבת כשיש שורה בטיפול, ואחר כך משחזרת את `3ef4d759`.

## 4. תוכנית חיבור: כל שלב באישור נפרד
| # | שלב | מי | מה חוסם |
|---|---|---|---|
| 1 | לבדוק ב־`claude.ai/code/routines` אם אפשר להוסיף **API trigger** למשימה שקשורה לסשן הזה. אם לא — המסלול הישיר סגור | ZURIEL, בממשק | **החסם העיקרי.** לא מתועד, ולא ניתן מהכלים שלי |
| 2 | בדיקה ידנית אחת מקצה לקצה עם nonce. עובר רק אם `claude_code_session_id` בתשובה שווה ליעד, וההודעה הגיעה לסשן הזה | ZURIEL או GPT, באישור | תלוי ב־1 |
| 3 | זוג Vault ליעד | אישור (secret) | תלוי ב־2 |
| 4 | להחיל את קובץ ההצעה המדויק | אישור (DB) | תלוי ב־2 |
| 5 | תוספת לחוק (‏§97 למטה), או החלטה ש־v18 מספיק | ZURIEL (חוק) | — |
| 6 | הוראה ל־GPT: שורת assignment עם `to_actor=CLAUDE`, ‏`task_key`, ‏`status=QUEUED` ו־`dispatch_context.target_session_id`. התשובה היא רשומת AFTER עם `parent_assignment_id`, ‏`to_actor=ZURIEL` ו־`original_to_actor=GPT` (‏v17) | GPT | תלוי ב־3–5 |
| 7 | עצירה: מחיקת הטוקן בממשק, מחיקת זוג ה־Vault או קובץ ה־ROLLBACK | ZURIEL | — |

**אם שלב 1 נכשל — חלופות להחלטת ZURIEL, אף אחת לא "אותו סשן בלי סשן חדש":**
1. **ממסר:** סשן Routine קצר לכל הודעה, שקורא `send_message` לסשן היעד. פותח סשן לכל הודעה.
2. **Project:** ‏"Continue in project" פותח thread חדש שקורא את הסשן הישן. הסשן המקורי נשאר כמו שהוא.
3. **המצב היום:** ZURIEL מעביר את ההוראה בשיחה.

**Codex:** אין לי דרך לאמת המשך משימת Codex לפי מזהה מתוך הסביבה הזו. במסד, יעד שאינו CLAUDE נדחה (`gpt_runtime_endpoint_not_configured`).

## 5. נוסח מוצע לחוק — ‏§97 (לא הוחל; החלטת ZURIEL)
> **[UPDATE v19 · Human-Gate ZURIEL — TARGETED EXISTING-SESSION DISPATCH · EXTEND_EXISTING]**
> 97) An ASSIGNMENT may name the existing Claude Code session that must receive it, in `dispatch_context.target_session_id` (the immutable session ID; a branch name is not a session ID). The transport delivers it only to that session's registered endpoint, verifies that the provider receipt names the same session, and lets only that session claim and finish. If the session is not registered, the receipt names another session, or any step is unavailable, the assignment fails closed (`DEFERRED_TARGET_SESSION_*`). It never falls back to a new session. Registration of a session endpoint, and its removal, are Human-Gate actions of ZURIEL. Results stay passive under the v17 rule (TO=ZURIEL, readable by GPT); RESULT_WAKE and GPT auto-wake stay off. §44 and §74 remain true until the end-to-end test of step 2 is recorded.

## 6. מה לא בוצע
- **פעולות חיות:** לא הוחל SQL. לא נוצר טוקן או זוג Vault. לא שונו החוק, ההרשאות או ה־cron. לא הופעל RESULT_WAKE.
- **ענף ו־PR:** לא נפתח PR, ולא היו מיזוג או פריסה.
- **לא נבדק:**
  - ‏`/fire` עם טוקן למשימה קשורה לסשן;
  - מסירת טקסט מגורם חיצוני;
  - ‏Projects;
  - ‏Codex.
- **הבדיקה החיה:** משימה אחת `trig_01He6N3WKUUqcMYGWzir4wVj` נוצרה, הופעלה פעם אחת (21:03:14Z, אותו סשן) ונמחקה ב־21:18Z.
