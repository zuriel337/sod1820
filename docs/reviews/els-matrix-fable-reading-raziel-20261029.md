# קריאת מטריצה עם Fable בתוך שיחת רזיאל — חוזה ממשק, החזרת תוצאה שנמשכת דקות, והשפעה לאישור

> סטטוס: **קוד ובדיקות בענף מבודד בלבד.** לא נפרס, לא שונה DB/RLS חי, לא שונה Production, לא הוגדר סוד, לא נקראה אף קריאת מודל. כל הבדיקות מול fakes.
> **אין כאן קריאת Fable חיה.** כל נתון בדוגמאות ובבדיקות מסומן `is_test_fixture:true` ו־`provider.kind:"test_double"`. אסור להציג אותו כקריאה חיה (סעיף 5).
> מסמך חיבור/תכנון, לא בעלים של סמנטיקה (הבעלים: `ai_analyze_contract v2`, `els_single_engine_law v2`, `raziel_companion_layer_law`, `unified_credit_system`).

| | |
|---|---|
| Base | `63e430113eb5edca7f2ae69eabc9e1c0eeeb70cd` (`claude/els-matrix-discovery-raziel-preview-20261028`) |
| ענף | `claude/els-matrix-fable-reading-20261029` |
| ממשק | GPT, ענף `gpt/els-unified-matrix-research-20261029` — **לא נערך כאן אף רכיב מסך** (`src/components/**`, `src/pages/**` נקיים) |
| חוזה התוצאה | `els_matrix_reading_v1` (`supabase/functions/_shared/elsMatrixReadingAction.js`) |

## 1. מה המשתמש חווה (לחיצה אחת)

1. המשתמש בוחר מופע (ציר) במטריצת ה־ELS — המסך כבר בונה `els_matrix_presentation_context_v1`.
2. הוא לוחץ **פעם אחת** על כרטיס ניתוח המטריצה. הכרטיס קורא ל־`session.submitElsMatrixReading({ context })`. **אין שום קריאת מודל אוטומטית**: בחירה, פתיחה ורינדור לא קוראים לכלום; רק הקריאה המפורשת הזו (נבדק במבחן המקור של הספק).
3. השיחה של רזיאל (אותה שיחה גלובלית זמנית) נעשית `busy` ומציגה התקדמות; אחרי דקות מגיעה **הודעת רזיאל אחת** עם התוצאה, וכל הפרטים המובנים על ההודעה (`message.elsMatrixReading`).
4. Fable מקבל אזור מוגבל מהזרם הקנוני (עד 33×41, מרוכז סביב הציר), מציע מילים ומבנים, ומנוע ה־ELS הקנוני (`els_verify_occurrence_v1`) מאמת את האותיות והמיקומים של כל הצעה. סיפור הוא אופציונלי (`story`).

## 2. איך זה משתלב (ומה לא נוצר)

```
כרטיס (GPT) ──click──► session.submitElsMatrixReading({context, story?, window?, cap?})
   RazielSessionProvider2029.submit  ──►  prepareSubmission  ──►  askRaziel  (אותו transport)
        └─ turn_progress ◄── הסקר (elsMatrixReadingTransport, נטען עצלות)
   ai-analyze  persona=raziel, intelligence_level=deep, els_matrix_context + els_matrix_reading_action
        ├─ שער זמינות האתר (lock_raziel_site), זהות מה־JWT, ביטוי קנוני, אימות הציר דרך הגשר הקיים
        └─ יציאה מוקדמת לפני המתכנן/כלים/זיכרון/מכסה של רזיאל  ──►  _shared/elsMatrixReading.js
              זרם תורה קנוני ─► בקשת Fable (Message Batch) ─► איסוף ─► els_verify_occurrence_v1 לכל הצעה
```

* **שיחת רזיאל:** אותה `RazielSessionProvider2029`, אותו `submit()` (נקודת ה־AI היחידה), אותו `askRaziel`, אותה `ai-analyze` ואותו ספק (`ANTHROPIC_API_KEY` הקיים). תוספת: פעולה סגורה `els_matrix_reading_action` על אותו תור מטריצה, בדיוק כמו `els_planning_action` של תכנון ELS.
* **לא נוצרו:** מנוע ELS (הקנוני מאמת), צ'אט, זיכרון, מסלול AI, טבלה, cron, פונקציה. הקריאה לא כותבת לזיכרון רזיאל ולא לשיחה שמורה (השמירה הקיימת של שיחה לא כוללת את המבנה).
* **ההקשר מהלקוח אינו ראיה:** רק הציר נלקח ממנו; השרת מאמת אותו מחדש (גשר ה־ELS הקיים + `els_verify_occurrence_v1`) וקורא את החלון בעצמו מ־`public.torah_stream`.

## 3. החזרת תוצאה שנמשכת דקות — מה נבדק, מה נבחר, ומה דורש אישור

אצווה של Fable נמשכת 3–13 דקות (EXP-15, 16, 18) ואינה מחזירה תוצאה חלקית. בקשה סינכרונית אחת לא יכולה להחזיק כל כך הרבה זמן ב־Edge Function; ולכן הקריאה היא **התחלה + בדיקות סטטוס** על אותו נתיב:

| שלב | מה קורה | מי |
|---|---|---|
| `start` | אימות ציר, קריאת חלון, בדיקת שם המודל וזמינותו, ספירת טוקנים, חסם עלות, פתיחת אצווה, טוקן משימה חתום (HMAC, קשור לזהות המנהל, תוקף 14 יום) | ai-analyze |
| סקר | `status` כל 20 שניות; מחזיר `RUNNING` + התקדמות עד שהאצווה מסתיימת | `askRaziel` (העברה עצלה) |
| איסוף | קריאת התשובה, רישום עלות פעם אחת, אימות כל הצעה במנוע, בניית התוצאה | ai-analyze (`status` האחרון) |
| ביטול | `cancel` מפורש מבקש מהספק לבטל ומחכה (עד 3 דקות) לדיווח האמיתי | `cancelActiveTurn()` |

מה **לא** נדרש: טבלה, שמירה ב־DB של התוצאה, עובד רקע, פונקציה חדשה. המצב נמצא אצל הספק (האצווה) ובטוקן החתום שבזיכרון הלקוח.

### התוספת המזערית וההשפעה (לאישור לפני כל ביצוע — **לא בוצע**)

1. **פריסת `ai-analyze`** מ־HEAD שיאושר. השפעה: בלי `ELS_MATRIX_READING_ENABLED` הפעולה מחזירה "לא פעיל" (תשובת רזיאל רגילה עם `REFUSED/not_enabled`) ואינה נוגעת בזרם, במנוע או בספק; כל בקשה אחרת עוברת באותם נתיבים כמו היום. התוספת לקובץ: 60 שורות בענף רזיאל + ייבוא שני מודולים. הוכחת אריזה (בלי פריסה): `scripts/package-ai-analyze.mjs` מ־`503c38c85cf9550ac2dd92380c9dc2d2deb2d8e7` יצר חבילה של 566,853 בתים מ־12 מקורות מחויבים (`verify_jwt=true`), `bundle_sha256 = 2a31c45432b0b13d569d503e30d86cb83e37f1ecac1d3af4a04310f4b5abf567`; גרסת ה־live הנוכחית (v88) נבנתה מ־`b8cabb195`, ופריסה מחייבת חישוב מחדש מה־HEAD שיאושר ולא שימוש במספר הזה.
2. **דגל `ELS_MATRIX_READING_ENABLED`**: `preview` (תצוגה מקדימה בלבד, בלי הוצאה) או `1`/`on` (גם ריצה). ללא ערך — כבוי. אופציונלי: `ELS_MATRIX_READING_JOB_SECRET` (אחרת נגזר ממפתח השירות), `ELS_MATRIX_READING_MODEL` (חייב להתאים ל־`claude-fable-*`), `ELS_MATRIX_READING_FX_ILS_PER_USD`.
3. **כתיבה ל־DB קיים בלבד כשהדגל דלוק:** שורה אחת ב־`ai_token_log` לכל אצווה שנאספה (`kind=raziel_els_matrix_reading`, `ref=<batch id>`), ורישום מעקב תפעולי (`op_trace_*`) לכל `start`/איסוף/ביטול. אותם טבלאות ופונקציות שכל קריאת AI באתר כותבת אליהן; **אין שינוי סכמה/RLS**. סקר שעדיין רץ לא כותב כלום.
4. **שרת ה־Preview:** אין צורך לשנות את ה־worker: הפעולות הן אותו מבנה בקשה שהשער הקיים מאשר (נבדק). ענף זה **לא** הוסף לרשימת הענפים המותרים ב־Preview, ופריסת Vercel של `claude/*` נשארת כפי שהיא; ניסוי ב־Preview מחייב החלטה נפרדת על שם ענף, פריסת `ai-analyze` ודגל.
5. **ללא אישור זה הקוד לא פועל בשום סביבה:** האתר החי (v88) מתעלם מהשדה, והלקוח מסרב להציג תשובה רגילה כקריאה (`els_matrix_reading.contract` חסר ⇒ `null`).

### חלופות (לא מומשו)

* **ביניים — טבלת משימות בלבד (בלי cron):** `start` כותב שורה, `status` מעדכן אותה. פותר היסטוריה ושחזור טוקן אחרי רענון, לא פותר ריצה שאיש לא אסף. דורש מיגרציה + RLS (שינוי DB חי).
* **B — טבלה + `pg_cron` + עובד** (אותה תבנית של `wa-deep-process`): רישום עלות מלא גם בלי לקוח פתוח, היסטוריה, ביטול בצד שרת. דורש מיגרציה + RLS + פונקציה חדשה + cron שרץ ללא אדם (חייב דגל כיבוי ותקרת תקציב יומית). **לא מומלץ לפני שיש כרטיס שמראה ערך.**

## 4. חוזה הממשק לכרטיס של GPT

### 4.1 מה הספק של השיחה חושף (`useRazielSession2029()`)

| | |
|---|---|
| `submitElsMatrixReading({ context, op?, window?, cap?, story?, ackUpperBoundUsd?, jobToken? })` | מחזיר `Promise<{ok, response?, error?}>` שנפתר כשהקריאה כבר לא רצה (דקות). `op`: `"start"` (ברירת מחדל; **מוציא כסף**: נשלח התקרה שאושרה), `"preview"` (בלי מודל ובלי הוצאה). עם `jobToken`: `"status"` (המשך אחרי ניתוק) או `"cancel"`. `context` = `els_matrix_presentation_context_v1` שהמסך כבר בונה. |
| `cancelActiveTurn()` | מבקש מהספק לבטל קריאה שרצה. מחזיר `false` כשלא רצה קריאה (תור רגיל אין מה לבטל). הפרומיס של `submit` ייפתר עם הודעת רזיאל שמתארת מה קרה בפועל. |
| `busy`, `status` | `busy:true` לכל אורך הקריאה: **אי אפשר לשלוח תור נוסף בזמן שהיא רצה.** |
| `currentTurn.kind === "els_matrix_reading"`, `currentTurn.readingOp` | מזהה שהתור הוא קריאה. |
| `currentTurn.progress` | ההתקדמות (4.3). |
| `thread[last]` (`role:"raziel"`) | `text` = תשובת רזיאל (4.4), `elsMatrixReading` = התוצאה המובנת (4.5). |
| `announcement` | טקסט לקורא מסך ("קריאת המטריצה רצה אצל הספק (חלפו 2 דקות)…"). |

הקבועים לכרטיס (`supabase/functions/_shared/elsMatrixReadingAction.js`): `ELS_MATRIX_READING_START` (`{rows:33, cols:41, cap:60}`, נקודת פתיחה ניסיונית ולא כללים; גבולות השרת: שורות 9–35, עמודות 15–45, הצעות 5–60), `ELS_MATRIX_READING_ACK_UPPER_BOUND_USD` (2), `ELS_MATRIX_READING_EXPECTED_MINUTES` (3–13), `ELS_MATRIX_READING_LIMITS` (`storyMax` 300), `elsMatrixReadingPhase(result)`, `isLiveFableReading(result)`.

### 4.2 מה להציג לפני הלחיצה (בלי קריאה לשרת)

"קריאה ניסיונית (מנהלים): Fable יקרא אזור של עד 33×41 סביב המופע. **עלות מרבית אפשרית: עד כ־$2 (כ־₪6, הערכה).** לפי הניסויים: 3–13 דקות; הרצה עלולה להסתיים בלי תשובה ועדיין להיגבות. לא נגבים קרדיטים." — והלחיצה היא האישור של התקרה. אם רוצים כיסוי ועלות מדויקים לפני כן: כפתור נפרד `op:"preview"` (בלי מודל; הוא כן פונה לספק לבדוק שם מודל וספירת טוקנים).

### 4.3 התקדמות — `currentTurn.progress`

```jsonc
{ "kind": "els_matrix_reading", "phase": "starting" | "running" | "cancelling",
  "elapsedMs": 125000, "polls": 6, "expectedMinutes": { "min": 3, "max": 13 },
  "providerStatus": "in_progress", "batchId": "msgbatch_…", "jobToken": "…", "pollSeconds": 20, "cancelling": true }
```

אצווה **אינה מחזירה תוצאה חלקית**: ההתקדמות היא הזמן שחלף והסטטוס של הספק בלבד. לא להציג אחוזים. `jobToken` מאפשר לשמור (באחריות הכרטיס) ולהמשיך אחרי רענון; השיחה עצמה זמנית.

### 4.4 תשובת רזיאל (`message.text`)

טקסט דטרמיניסטי שנבנה רק מהנתונים המאומתים (אין בו פרוזה של מודל): כותרת, זמן, **עלות בפועל בדולר ובש"ח (הערכה)**, "לא חויבו קרדיטים; החזר אוטומטי לא נבדק ואינו מובטח", הציר, **כיסוי בפועל** (שורות, עמודות, תאים, קווים ומה שלא נקרא), ספירות, רשימת ממצאים מאומתים (עד 25), רצפים רגילים, והערה על תקרת הפלט.

### 4.5 התוצאה המובנת (`message.elsMatrixReading`, חוזה `els_matrix_reading_v1`)

| `state` | מתי | מה יש בו |
|---|---|---|
| `PREVIEW` | `op:"preview"` | `model {id, verified_available, check}`, `axis`, `request {instruction, cap, input_tokens, sha256, …}`, `story {provided, chars}`, `coverage`, `estimate {upper_bound_usd/ils, expected_usd, expected_ils, evidence[], truncation_evidence[], cost_exposure}`, `spent {usd:0}` |
| `RUNNING` | אחרי `start` ובכל סקר | `job {batch_id, created_at, expires_at, poll_after_seconds, token (רק ב־start)}`, `progress`, + שדות ה־PREVIEW |
| `COMPLETE` | האצווה הסתיימה ב־`end_turn` ונאספה | `timing {created_at, ended_at, elapsed_ms}`, `cost {usd, ils{amount,status:"ESTIMATED",fx{ils_per_usd,basis,effective_at,source_ref}}, list_price_parts_usd, batch_factor, certainty, logged, ai_token_log_ref}`, `output {stop_reason, input/output/thinking_tokens}`, `findings[]`, `summary`, `cap {requested, proposals, reached, meaning}`, `coverage`, `observations` |
| `INCOMPLETE` | נקטע (`max_tokens`/סיבת עצירה אחרת) או JSON לא תקין | `reason`, `continuation_required`, `findings:[]`, `cost` (העלות שנגרמה), `timing`, `output` |
| `FAILED_WITH_REASON` | האצווה נכשלה/פגה/בוטלה, החלון/הזרם השתנו, המנוע לא זמין | `reason`, `retryable` (כשהמנוע לא זמין: התשובה שמורה אצל הספק ואפשר לבדוק שוב), `cost` אם יש usage |
| `CANCEL_REQUESTED` | אחרי ביטול | `job.processing_status`, `note` (עבודה שבוצעה עשויה להיגבות; אין החזר מובטח) |
| `REFUSED` | לא הופעל כלום | `error`: `not_enabled`, `admin_only`, `not_configured`, `preview_mode_only`, `axis_unverified`, `scope_not_supported`, `model_unavailable`, `ack_below_upper_bound` (+`required_ack_upper_bound_usd`), `input_too_large`, `job_token_expired`, `job_belongs_to_another_identity`, `invalid_job_token`, … |

בכל מצב: `contract`, `ok`, `experimental {admin_only:true, credits_charged:false}`, `provider {name, route, kind, live_model_call}`, `is_test_fixture`.

**ממצא (`findings[i]`)**: `id`, `text`, `parts`, `line`, `verification {state: ENGINE_VERIFIED | PLAIN_TEXT_ONLY | NOT_VERIFIED, reasons, engine{verification_state, contract, occurrence_id, corpus_id}}`, `occurrence {reading, skip, dir, start, length, cells}`, `chance {expected_occurrences, unlikely_by_chance, basis}`, `relation_to_axis {distance, relation: crosses|touches|far}`, `model_claims {kind, tier, note, status:"UNVERIFIED_INTERPRETATION"}`.

### 4.6 חוקי תצוגה מחייבים

1. **ספק מדומה אינו קריאה חיה.** רק `isLiveFableReading(result)` (`is_test_fixture:false` וגם `provider.live_model_call:true` וגם `model.verified_available:true`) מאפשר לכתוב "Fable". כל השאר — `is_test_fixture:true`, `provider.kind !== "anthropic_live"`, תצוגה מקדימה, סירוב — מסומן "דוגמה/תצוגה מקדימה/לא הופעל".
2. להציג תמיד: כיסוי בפועל, זמן, עלות בפועל בדולר ובש"ח (עם **הערכה**), והתוצאה. `INCOMPLETE` מסומן **"לא הושלם"**, בלי ממצאים, עם העלות שנגרמה.
3. להפריד קבוצות: `ENGINE_VERIFIED` | `PLAIN_TEXT_ONLY` (רצף רגיל, לא ELS) | `NOT_VERIFIED` (לא להציג כממצא). נתוני בדיקה לא מתערבבים עם ממצאי ריצה אמיתית.
4. חיתוך/צמידות הם **מידע** (`relation_to_axis`) ולא מסנן; ממצא רחוק או מקביל הוא ממצא.
5. `cap.reached` = **תקרת פלט, לא הוכחה שאין עוד ממצאים**.
6. אימות = אותיות ומיקומים, **לא משמעות**; בחלונות אקראיים מתקבלים ממצאים מאותו סוג. להציג `chance.expected_occurrences`. `model_claims.note` ו־`observations` הם פרשנות לא מאומתת — טקסט מצוטט, תמיד כטקסט רגיל (לא HTML).
7. לא להציג ממצא כ־Canonical/Published (Human Gate אצל ZURIEL).
8. נוסח מותר על קרדיטים/החזר: "ללא חיוב קרדיטים; החזר אוטומטי לא נבדק ואינו מובטח". אסור "הוחזר/יוחזר/זוכה".
9. אין לקרוא ל־`submitElsMatrixReading` מ־`useEffect`, בבחירה, בפתיחה או ברינדור. רק מ־onClick מפורש.
10. אין לייצר לוגיקת סקר/ביטול נוספת: הספק והעברה עושים זאת. להציג ביטול רק כש־`currentTurn.kind==="els_matrix_reading"`.

### 4.7 דוגמאות לפיתוח (כולן נתוני בדיקה)

`test/fixtures/els-matrix-reading/card-examples/*.json`: `preview`, `running-start`, `running-poll`, `complete`, `incomplete-max-tokens`, `failed-batch-errored`, `cancel-requested`, `refused-admin-only`, `refused-not-enabled`, `session-progress`. מקור: ריצה מוקלטת של EXP-18 C3 (חלון, תשובה, הקלטות מנוע) דרך fakes. מחדשים בפקודה `node test/helpers/els-matrix-reading-card-examples.mjs`; בדיקה מוודאת שהקבצים זהים למה שהקוד מייצר היום.

## 5. עלות — מה מתועד ומה לא

* עלות בפועל = `usage` מהספק × מחירון רשימה × 0.5 (Message Batches). **אינה חשבונית.** זמן ריצה = `ended_at - created_at` של האצווה.
* **שער ש"ח:** `ELS_MATRIX_READING_FX_ILS_PER_USD` אם הוגדר (`CONFIGURED_NOT_VERIFIED`); אחרת השער הרשום באתר ב־`api_pricing.usd_to_ils` (כרגע 3.01, מ־2026-09-01, `API_PRICING_RECORDED_NOT_VERIFIED_CURRENT`, עם `source_ref`); אחרת הנחה 3.70 (`ASSUMPTION_NOT_VERIFIED`). בכל המקרים הסכום בש"ח הוא `ESTIMATED`.
* רישום: `ai_token_log` (פעם אחת לאצווה) + מעקב תפעולי: ה־span של המודל נושא עלות `estimated` עם גורם האצווה ו־`creditsCharged:0`. **לא נקרא `op_trace_link_ai_cost_v1`:** אין ב־`api_pricing` שורה ל־`claude-fable-5-1`, והפונקציה הייתה מחליפה את ההערכה ב־`unknown`, ואילו עם שורה כזו היא הייתה מחשבת מחיר מלא בלי הנחת האצווה (כפול). הוספת שורת מחיר היא כתיבה ל־DB חי — **לא בוצעה** ולא נדרשת להפעלה.
* ראיות מדודות (נכללות בכל `estimate`): תקרה 25 / 23×41 ⇒ $0.40–0.49 (3.1–4.4 דק׳); תקרה 60 / 33×41 ⇒ $1.56. **ריצות שנגמרו ב־`max_tokens` בלי תשובה ונגבו במלואן:** 6 מתוך 18 (EXP-16, $10.24) ו־EXP-18 C2 ($1.68). לכן ברירת המחדל תקרה 60 היא נקודת פתיחה ניסיונית עם סיכון ממשי ל־`INCOMPLETE`; המלצה להחלטת ZURIEL: להתחיל מתקרה 25 (נמדדה בלי קטיעה בשתי ריצות) ולעלות רק לפי תוצאות.
* אין חיוב קרדיטים, אין קריאה ל־`credit_spend`, אין הבטחת החזר.

## 6. מגבלות שהתגלו ב־EXP-15 עד EXP-18 (נשמרו ביומן הקיים)

מפורט ב־`docs/planning/els-guided-discovery-test-ledger-v1.md` (הטבלה EXP-01..18 הועתקה כמות שהיא, והמגבלות והשורה `EXP-20` נוספו בסוף): רק Fable מפיק ELS בעשרות; תקרת 60 נקטעת לעיתים; העלות נקבעת לפי התקרה ולא לפי החלון; הסיפור לא משנה מה שנמצא; חלונות אקראיים נותנים אותות מאותו סוג; חיתוך/צמידות אינם סינון; ממצאים (`ספינת`, `יכלאש`) חסרים בחלונות קטנים; effort גבוה בתקרה נמוכה מבזבז הכול על חשיבה.

## 7. בדיקות (ללא רשת חיה)

| קובץ | מה נבדק | תוצאה |
|---|---|---|
| `test/els-matrix-reading-action.test.mjs` | הפעולה הסגורה, גבולות, סיפור כנתון, תקרת ההסכמה מכסה כל חלון מותר, ניקוי תוצאה, שמות מצב, `isLiveFableReading` | 8/8 |
| `test/els-matrix-reading-engine.test.mjs` | זהב מול הניסוי (הבקשה זהה בבית ל־EXP-18 C3), קווים, חלון/קצוות, סיווג, עלות, טוקן משימה | 10/10 |
| `test/els-matrix-reading-operation.test.mjs` | שערים (כבוי/מנהל/preview), preview ללא הוצאה, ספק מדומה אינו חי, שער ש"ח, ack, מודל נבדק לפני אצווה, סיפור כנתון, סקר, הושלם/נקטע/נכשל, אידמפוטנטיות רישום עלות, קריאת שער הש"ח לכל היותר פעם אחת, ביטול, זיהוי, טקסט תשובת רזיאל | 16/16 |
| `test/els-matrix-reading-raziel-route.test.mjs` | **ה־handler האמיתי של ai-analyze** (VM): אין קריאת מודל רגילה, עקבות רק כשיש מה לרשום, שערי המסלול, אימות ציר לפני כל קריאה, תור רגיל לא נפגע | 6/6 |
| `test/els-matrix-reading-transport.test.mjs` | סקר, התקדמות, שגיאות רשת, תקרת המתנה, abort שקט, ביטול מפורש, המשך | 10/10 |
| `test/els-matrix-reading-session.test.mjs` | מתאם הבקשה (סגור), תגובה (קריאה רק לבקשת קריאה), `turn_progress`, ווים לא נראים בגוף, הספק לא מפעיל כלום מעצמו, שיחה שמורה לא שומרת את המבנה ולא טוקן | 10/10 |
| `test/els-matrix-reading-client-e2e.test.mjs` | **הכול יחד:** מתאם → `askRaziel` → העברה → handler אמיתי → מנוע; הודעה אחת בשיחה, ביטול, נקטע, סירוב, שרת ישן, unmount | 6/6 |
| `test/els-matrix-reading-card-examples.test.mjs` | דוגמאות הכרטיס זהות לקוד, מסומנות כבדיקה, לא נחשבות חיות | 5/5 |
| `test/matrix-raziel-preview.test.mjs` | שער ה־Preview מאשר את הפעולות כמות שהוא ושומר על החסימות (8 קיימות + 1) | 9/9 |
| רגרסיה | 119 קובצי בדיקה של Raziel/ELS/ai-analyze: 15 סומנו ככושלים, וב־15 מספר הכשלים והמעברים **זהה בדיוק בענף הבסיס `63e430113`** (סביבה: Chromium/DB וכד'; אחד מהם בלתי יציב גם בבסיס), 104 עוברים | ללא רגרסיה |
| בנייה | `vite build` של 2029 עובר (עם stub לחבילה `natalengine` שחסרה בסביבה); Legacy עובר | ✔ |

## 8. פערים — מה עדיין לא עובד / לא נבדק

* **לא נקראה אף קריאת Fable חיה.** בקשת האצווה זהה בבית לבקשה שנמדדה (sha256), אבל לא הורצה דרך הקוד הזה. הריצה הראשונה החיה דורשת פריסה + דגל, ומומלץ להתחיל ב־`ELS_MATRIX_READING_ENABLED=preview` ואז ריצה אחת מתקרה 25.
* אין כרטיס/UI (GPT); יש חוזה ודוגמאות.
* מנהלים בלבד, כבוי כברירת מחדל; פתיחה לקהל דורשת החלטת מוצר על חיוב קרדיטים והחזר (לא נבדק מנגנון החזר).
* **רענון/סגירת הדף באמצע קריאה מאבד את הטוקן** (המצב זמני בכוונה). האצווה ממשיכה אצל הספק והעלות נגרמת, אך אינה נרשמת עד שמישהו אוסף אותה. בעיה זו נפתרת בטבלת משימות (חלופה).
* אין הגנה מפני שתי לחיצות מדפדפנים שונים: השרת חסר מצב. בדפדפן אחד הספק חוסם (`turn_pending`).
* חסימה: `busy` נמשך דקות — אי אפשר לשוחח עם רזיאל בזמן קריאה.
* שער הש"ח מ־2026-09-01 ואינו מאומת כנוכחי; אין שורת מחיר ל־Fable ב־`api_pricing`.
* תוצאה של קריאה אינה נשמרת בשיחה שמורה (נשמר טקסט התשובה בלבד).
* היקף: תורה בלבד (`tanakh` נדחה), רוחב מטריצה מינימום 15, חלון עד 35×45; כיסוי מוגבל לחלון.
* בתקרה 60 סיכון ל־`INCOMPLETE` עם עלות מלאה (מדוד); טקסט הסיפור עם `story` לא נמדד.

## 9. קבצים

חדשים: `supabase/functions/_shared/elsMatrixReadingAction.js`, `supabase/functions/_shared/elsMatrixReading.js`, `src/lib/research/elsMatrixReadingTransport.js`, `src/lib/research/elsMatrixReadingSession.js`, בדיקות ועזרים תחת `test/`, דוגמאות תחת `test/fixtures/els-matrix-reading/`, מסמך זה.
ערוכים (תוספות): `supabase/functions/ai-analyze/index.ts`, `src/lib/supabase.js` (`askRaziel`), `src/lib/research/razielSessionRequest2029.js`, `src/lib/research/razielSession2029.js`, `src/lib/research/RazielSessionProvider2029.jsx`, `docs/planning/els-guided-discovery-test-ledger-v1.md`, `test/helpers/ai-analyze-handler.mjs` (שומר ספירת ה־imports), `test/matrix-raziel-preview.test.mjs`.
**לא נערכו:** `src/components/**`, `src/pages/**`, `scripts/**`, `public/**`, ה־worker של ה־Preview.
