# שכבת קריאת המטריצה (ניסיונית, מנהלים בלבד) — חוזה חיבור, תכנון ואישורים

> סטטוס: **קוד ובדיקות בענף מבודד בלבד.** לא נפרס, לא שונה DB/RLS חי, לא שונה Production, לא הופעל מודל לצורך השכבה הזו.
> זה מסמך חיבור/תכנון — לא בעלים של סמנטיקה (הבעלים: `ai_analyze_contract v2`, `els_single_engine_law v2`, `unified_credit_system`).

| | |
|---|---|
| Base | `b24dc6c23066547417c0695f8d693f6e198702f1` (`gpt/els-matrix-wording-acceptance-20261027`) |
| ענף | `claude/els-matrix-reading-layer-20261029` |
| חוזה תוצאה | `els_matrix_reading_v1` |
| חוזה בקשה | `els_matrix_reading_request_v1` |
| נתיב | `ai-analyze` הקיים (`supabase.functions.invoke("ai-analyze", { body: { els_matrix_reading } })`) — אין נתיב, צ'אט, Provider או מנוע חיפוש חדש |
| אימות | `els_verify_occurrence_v1` (RPC קנוני קיים, `contract els_occurrence_replay_v1`) |

## 1. מה נבנה

* `supabase/functions/_shared/elsMatrixReading.js` — מנוע משותף: בחירת חלון מהזרם הקנוני (`public.torah_stream`), בניית הקווים וההנחיה (זהים בבית לניסוי EXP-18, ראו test הזהב), אימות מודל, ספירת טוקנים, יצירת Message Batch, איסוף, אימות כל הצעה במנוע ה‑ELS הקנוני, סיווג, כיסוי, עלות בדולרים ובשקלים (ESTIMATED), רישום עלות ב‑`ai_token_log`.
* `supabase/functions/ai-analyze/index.ts` — **תוספת בלבד** (26 שורות): ענף מוקדם שמופעל רק כשהגוף כולל `els_matrix_reading`. כל בקשה אחרת עוברת בדיוק כמו קודם. מכובה כברירת מחדל (`ELS_MATRIX_READING_ENABLED` לא קיים ⇒ 404 `not_enabled`).
* `src/lib/research/elsMatrixReadingClient.js` — בוני בקשות, עטיפות `ai-analyze`, `readingPhase`, `groupReadingFindings`, `pollElsMatrixReading`.
* בדיקות ודוגמאות כרטיס (מסומנות כנתוני בדיקה) — סעיף 7.

## 2. זרימה שהכרטיס מממש

```
[מטריצה נבחרה, ציר MATCH]  →  preview  →  (אדם רואה כיסוי + עלות + זמן צפוי)  →  create(ack_upper_bound_usd)  →  RUNNING
                                                                                         ↓ כל ~20 שנ׳
                                                                                       status  →  RUNNING | COMPLETE | INCOMPLETE | FAILED_WITH_REASON
```

1. הציר נלקח **רק** מ‑`els_matrix_presentation_context_v1` (אותו הקשר ש‑`buildElsRazielMatrixContext` בונה לכפתור רזיאל): `axisFromMatrixContext(context)` ⇒ `{term, scope:"torah", skip, dir, start}`. היקף `tanakh` ⇒ `null` (השכבה קוראת תורה בלבד).
2. `previewElsMatrixReading(axis, {rows, cols, cap})` — קורא את הזרם והמנוע וסופר טוקנים. **לא מפעיל מודל, לא עולה כלום.**
3. הכרטיס מציג את הכיסוי והעלות, ורק אחרי אישור אדם שולח `startElsMatrixReading(axis, ackUpperBoundUsd, options)` כש‑`ackUpperBoundUsd ≥ estimate.upper_bound_usd` של אותם פרמטרים בדיוק (אחרת 409 `ack_below_upper_bound` עם `required_ack_upper_bound_usd`).
4. `create` מחזיר `job.token`. הכרטיס קורא ל‑`pollElsMatrixReading(token, {onUpdate, shouldStop})` (או ל‑`checkElsMatrixReading` ידנית) עד מצב סופי. כל קריאת `status` אוספת את הסבב, מאמתת במנוע ורושמת עלות **פעם אחת** (אידמפוטנטי לפי מזהה ה‑batch).

ברירות מחדל ניסיוניות (`ELS_MATRIX_READING_START`): חלון 33×41, תקרה 60. השרת מקבל שורות 9–35, עמודות 15–45, תקרה 5–60. אלה נקודת פתיחה, לא כללים קבועים.

## 3. חוזה הבקשה (`els_matrix_reading_request_v1`)

```jsonc
{ "els_matrix_reading": {
    "contract": "els_matrix_reading_request_v1",
    "op": "preview" | "create" | "status",
    "axis": { "term": "קולומביה", "scope": "torah", "skip": 4545, "dir": 1, "start": 248765 },   // preview/create; start = מיקום 0-based בזרם
    "window": { "rows": 33, "cols": 41 },                                                           // אופציונלי
    "cap": 60,                                                                                      // אופציונלי
    "ack_upper_bound_usd": 1.71,                                                                    // create בלבד, חובה
    "job_token": "…"                                                                                // status בלבד
} }
```

הגוף כולו הוא האובייקט הזה בלבד — בלי `persona`, היסטוריית שיחה או שדות נוספים.

## 4. חוזה התוצאה (`els_matrix_reading_v1`)

כל תשובה כוללת `contract` ו‑`ok`. **מצבים (`state`)**: `PREVIEW`, `RUNNING`, `COMPLETE`, `INCOMPLETE`, `FAILED_WITH_REASON`. שגיאת בקשה: `ok:false` + `error` (ללא `state`).

| שדה | מופיע ב | משמעות לכרטיס |
|---|---|---|
| `experimental` | preview/running/complete/incomplete | `{admin_only:true, credits_charged:false}` — להציג "ניסיוני, מנהלים, ללא חיוב קרדיטים" |
| `model` | preview | `{id, verified_available:true, check, verified_at}` — השם נבדק מול הספק לפני כל ריצה |
| `axis` | הכל | הציר + `verification_state:"MATCH"`, `occurrence_id`, `corpus_id` (מהמנוע הקנוני) |
| `request` | preview/running/…| `instruction`, `cap`, `effort`, `max_tokens`, `input_tokens`, `sha256`, `lock_sha256`, `window_sha256` |
| `coverage` | preview/complete | **הכיסוי בפועל**: `rows/cols {from,to,count,requested}`, `cells`, `axis`, `margin`, `shifted_to_stay_inside_torah`, `touches_matrix_edge`, `lines_shown`, `lines_omitted_shorter_than_3`, `what_is_not_covered` |
| `estimate` | preview/running/… | `upper_bound_usd/ils`, `expected_usd {low,high}`, `expected_ils {low,high,status:"ESTIMATED"}`, `evidence[]` (ריצות מדודות), `cost_exposure {charged_to_user:false, credits:"NOT_CHARGED", refund:"NOT_PROMISED"}` |
| `job` | running/complete/incomplete | `{token, batch_id, created_at, poll_after_seconds, expires_at}` (`token` רק ב‑create) |
| `timing` | complete/incomplete/failed | `created_at`, `ended_at`, `elapsed_ms` — **זמן הריצה בפועל** |
| `cost` | complete/incomplete | **עלות בפועל**: `usd`, `ils {amount,currency,status:"ESTIMATED",fx{ils_per_usd,basis}}`, `list_price_parts_usd`, `batch_factor`, `certainty:"ESTIMATED_FROM_USAGE_AND_LIST_PRICES"`, `logged`, `ai_token_log_ref` |
| `output` | complete/incomplete | `stop_reason`, `input_tokens`, `output_tokens`, `thinking_tokens` |
| `findings[]` | complete | ראו להלן; ב‑INCOMPLETE תמיד `[]` |
| `summary` | complete | ספירות: `proposals`, `engine_verified`, `plain_text_only`, `not_verified`, `engine_verified_long/short`, `unlikely_by_chance`, `expected_by_chance`, `by_relation {crosses,touches,far}` |
| `cap` | complete | `{requested, proposals, reached, meaning}` — `reached:true` = **תקרת פלט, לא הוכחה שאין עוד** |
| `observations` | complete | הערות המודל, תמיד `UNVERIFIED_INTERPRETATION` |
| `data_class`, `is_test_fixture` | complete | ריצה אמיתית: `is_test_fixture:false`. דוגמאות הבדיקה: `true` |
| `notes[]` | preview/…| ארבע הערות חובה (אימות ≠ משמעות; פרשנות לא מאומתת; תקרת פלט; ניסיוני ללא קרדיטים) |

**ממצא (`findings[i]`)**: `id`, `text`, `parts`, `line`, `verification {state, reasons, letters_match, occurrences_verified, engine {verification_state, contract, occurrence_id, corpus_id}}`, `occurrence {reading, skip, dir, start, length, cells}`, `chance {expected_occurrences, unlikely_by_chance, basis}`, `relation_to_axis {distance, relation: crosses|touches|far}`, `model_claims {kind, tier, note, status:"UNVERIFIED_INTERPRETATION"}`.

* `verification.state`: `ENGINE_VERIFIED` (האותיות במיקומים + MATCH במנוע הקנוני) | `PLAIN_TEXT_ONLY` (רצף טקסט רגיל, אין דילוג — לא ELS) | `NOT_VERIFIED` (האותיות או המנוע לא אישרו; **לא להציג כממצא**).
* `chance.unlikely_by_chance` = מספר המופעים הצפוי במקרה בכל התורה בדילוג הזה קטן מ‑1 (מודל: אותיות בלתי תלויות בשכיחות התורה, שני כיוונים). זה מדד של "חריג סטטיסטית", לא של משמעות.
* `relation_to_axis` הוא **מידע בלבד**: חיתוך/צמידות אינם מסנן. ממצא רחוק או מקביל נשאר ממצא.

### חוקי תצוגה לכרטיס (מחייבים)

1. להציג תמיד: כיסוי בפועל, זמן ריצה, עלות בפועל בדולר ובש"ח (עם התווית **הערכה**), והתוצאה.
2. `INCOMPLETE` (כולל `max_tokens`) מוצג **"לא הושלם"**; אין ממצאים; העלות נגרמה ומוצגת. לא להציע "ניסיון חוזר" כאילו היה חינם.
3. להפריד קבוצות לפי `groupReadingFindings`: `engineVerified` | `plainTextOnly` | `notVerified`. נתוני בדיקה (`is_test_fixture:true`) לא מעורבבים עם ממצאי ריצה אמיתית ויסומנו "נתוני בדיקה".
4. לא לכתוב "הוחזר/יוחזר/זוכה" ולא "נגבו קרדיטים". הנוסח המותר: "ניסיוני, מנהלים בלבד, ללא חיוב קרדיטים; החזר אוטומטי לא נבדק ואינו מובטח".
5. `model_claims` ו‑`observations` הם פרשנות לא מאומתת; הצגתם כציטוט מסומן, לא כעובדה.
6. אין להפוך `cap.reached` ל"אלה כל הממצאים".
7. אין להציג ממצא כ‑Canonical/Published; ה‑Human Gate נשאר אצל ZURIEL.

### שגיאות

| `error` | HTTP | מקור |
|---|---|---|
| `not_enabled` | 404 | הדגל כבוי (ברירת מחדל) |
| `admin_only` | 403 | לא אדמין (anon/user) |
| `not_configured` | 503 | אין מפתח ספק |
| `invalid_contract`, `invalid_op`, `invalid_axis*`, `invalid_window_*`, `invalid_cap`, `ack_required`, `scope_not_supported`, `invalid_job_token` | 400 | בקשה פגומה, לפני כל קריאה |
| `ack_below_upper_bound` | 409 | `required_ack_upper_bound_usd` בגוף |
| `model_unavailable` | 503 | שם המודל לא קיים/לא תומך בבקשה אצל הספק |
| `input_too_large` | 413 | הקלט מעל הגבול (150K טוקנים) |
| `axis_unverified`, `axis_outside_scope`, `axis_outside_complete_rows`, `matrix_too_narrow`, `window_smaller_than_axis`, `axis_not_in_stream_window` | 422 | הציר לא מאומת במנוע / לא נכנס לחלון |
| `engine_unavailable`, `stream_unavailable`, `job_secret_missing` | 503 | תשתית |
| `batch_create_failed`, `anthropic_*` | 502 | הספק; לא נגבה כלום |
| `job_token_expired` | 410 | TTL 14 יום |
| `job_belongs_to_another_identity` | 403 | הטוקן שייך למנהל אחר |

`FAILED_WITH_REASON` (תשובה 200/503 עם `state`): `batch_errored|expired|canceled`, `window_changed`, `stream_changed_since_the_request`, `engine_unavailable` (`retryable:true`; התשובה שמורה אצל הספק, בקשת `status` נוספת תאמת שוב).

## 5. עלות — מה מתועד ומה לא

* עלות בפועל = `usage` שהחזיר הספק × מחירון רשימה × 0.5 (Message Batches). **אינה חשבונית.** שער הדולר/שקל: `ELS_MATRIX_READING_FX_ILS_PER_USD` אם הוגדר, אחרת הנחה 3.70; בשני המקרים `basis` הוא `…_NOT_VERIFIED` ולכן כל סכום בש"ח הוא `ESTIMATED` (`ai_analyze_contract v2`).
* רישום: שורה ב‑`ai_token_log` (`kind=els_matrix_reading`, `ref=<batch id>`) — אידמפוטנטי, בלי שינוי סכמה. נרשם **בקריאת `status` שאוספת את התוצאה**; ריצה שאיש לא אסף — לא נרשמת (ראו סעיף 9).
* אין חיוב קרדיטים, אין קריאה ל‑`credit_spend`, ואין הבטחת החזר אוטומטי: מנגנון ההחזר לא נבדק. חשיפת העלות ל‑ZURIEL היא רישום בלבד.
* ראיות מדודות (נכללות בכל `estimate.evidence`): תקרה 25 / חלון 23×41 ⇒ $0.40–0.49 (12.6K–16.3K טוקני פלט); תקרה 60 / 33×41 ⇒ $1.56 (58.1K); תקרה 60 / 23×41 ⇒ $1.68 **ללא תשובה** (`max_tokens`). לכן בתקרה 60 קיים סיכון ממשי ל‑`INCOMPLETE`, והחסם העליון שמוצג בתצוגה המקדימה הוא העלות המלאה של הקצאת הפלט (64K).

## 6. מנגנון הרקע — מה נבדק ומה נבחר

נבדקו המנגנונים הקיימים באתר:

| מנגנון קיים | מסקנה |
|---|---|
| `pg_cron` + `net.http_post` לפונקציית עובד (למשל `wa-deep-process`, כבוי כרגע; תבנית הטבלאות `wa_deep_queue`, `media_migration_queue`, `bot_outbox`) | מתאים כאופציה B (למטה), דורש טבלה ופריסה |
| `research-run` | דטרמיניסטי, ללא מודל — לא מתאים |
| `els-search-bridge` (page/verify/verify_batch) | מנוע האימות/חיפוש הקנוני; השכבה קוראת ישירות ל‑RPC הקנוני `els_verify_occurrence_v1`, לא יוצרת מנוע שני |
| Anthropic Message Batches | הריצה כולה אצל הספק (דקות, 50% מהמחיר); אינה דורשת עובד אצלנו |

**נבחרה אופציה A (מומשה, ללא טבלה/cron/פונקציה חדשה):** משימה חסרת מצב. `create` פותח batch ומחזיר טוקן חתום (HMAC) שנושא את מה ש‑`status` צריך (מזהה batch, ציר, חלון, hashes, זהות המנהל, תוקף). הלקוח שואל `status` כל ~20 שניות. `status` אוסף, מאמת במנוע, רושם עלות ומחזיר תוצאה. הכול בתוך `ai-analyze`, באותה זרימה.

**חסרונות A (לגלות לאישור):** אין רישום לריצה שאיש לא אסף; אין היסטוריה/רשימת ריצות; טוקן אינו ניתן לשחזור אם הלקוח איבד אותו (ה‑batch נשאר אצל הספק, העלות נגרמת); אימות מחדש בכל `status` מוצלח (אידמפוטנטי).

### אופציה B (לא מומשה — דורשת אישור נפרד לפני כל ביצוע)

טבלת משימות + עובד cron, באותה תבנית של `wa_deep_queue`.

* **קבצים (חדשים, לא קיימים כרגע בענף):**
  1. `supabase/migrations/<ts>_els_matrix_reading_jobs.sql`
  2. `supabase/functions/els-matrix-reading-worker/index.ts` (עטיפה דקה סביב אותו `_shared/elsMatrixReading.js`)
  3. עדכון `ai-analyze`: `create` כותב שורה; `status` קורא שורה.
* **טבלה (הצעה):** `els_matrix_reading_jobs(id uuid pk, created_by uuid not null, batch_id text unique, request jsonb, request_sha256 text, state text, result jsonb, cost_usd numeric, cost_ils_estimated numeric, fx jsonb, created_at, collected_at, error text)`; **RLS מופעל, ללא מדיניות ל‑anon/authenticated; גישה רק ל‑service_role**; אינדקס על `(state, created_at)`.
* **עובד:** `pg_cron` כל דקה → `net.http_post` ל‑worker (אותה תבנית שבה `wa-deep-process` מוגדר, עם סוד ב‑header ולא ב‑URL) → אוסף batches שהסתיימו, מאמת, כותב `result` ושורת `ai_token_log`.
* **יתרון:** רישום עלות מלא גם בלי לקוח פתוח; היסטוריית ריצות; שחזור טוקן. **סיכונים:** שינוי DB חי + RLS, פונקציה חדשה בפריסה, cron שרץ ללא אדם (חייב דגל כיבוי ותקרת תקציב יומית), ועוד משטח תפעולי. **חלופה בינונית:** רק טבלה (בלי cron) שבה `create` כותב שורה ו‑`status` מעדכן אותה — פותרת היסטוריה ושחזור, לא רישום של ריצה לא נאספת.

## 7. בדיקות (כולן בענף, ללא רשת חיה)

| קובץ | מה נבדק | תוצאה |
|---|---|---|
| `test/els-matrix-reading-engine.test.mjs` | זהב מול הניסוי: הבקשה זהה בבית לבקשות שנמדדו (sha256), סיווג = סיווג הניסוי, חלון/שוליים/קצוות, עלות, טוקן חתום | 11/11 |
| `test/els-matrix-reading-handler.test.mjs` | כבוי כברירת מחדל, אדמין בלבד, preview ללא הוצאה, ack חובה, מודל מאומת לפני batch, ריצה→איסוף→אימות במנוע, `max_tokens`⇒INCOMPLETE, כשל מנוע, אידמפוטנטיות הרישום, זהות | 10/10 |
| `test/ai-analyze-els-matrix-reading-hook.test.mjs` | מיקום ההוק, שימוש בזהות/מפתח/כותרות הקיימים, אין חיוב קרדיטים, אין מנוע/ספק שני | 6/6 |
| `test/els-matrix-reading-client.test.mjs` | בקשות הלקוח מתקבלות ע"י הנורמליזר של השרת; `readingPhase` לא משדרג; polling חסום וניתן לביטול | 7/7 |
| `test/els-matrix-reading-card-examples.test.mjs` | דוגמאות הכרטיס זהות למה שהמטפל מייצר היום (אין סטייה) ומסומנות כנתוני בדיקה | 4/4 |
| רגרסיה: 12 קובצי בדיקה קיימים שטוענים את `ai-analyze` | `test/helpers/ai-analyze-handler.mjs` מגן במכוון על ספירת ה‑imports ("review any new handler dependency"); עודכן ל‑9 והוזרק `handleElsMatrixReading`. אחרי העדכון 11 מתוך 12 עוברים; הקובץ ה‑12 (`raziel-personal-navigation-integration-2029.browser`) דורש Chromium ב‑`/usr/bin/chromium` שאינו קיים בסביבה זו — כשל סביבה, לא קשור לשינוי | 11/12 + כשל סביבה |
| `npm run build` | `prebuild` (נעילת Legacy Production) עובר; build ה‑Legacy עובר. build ה‑2029 נכשל ב‑`natalengine/humandesign` (החבילה `natalengine@1.6.0` מ‑`package.json` אינה מותקנת בסביבה; ייבוא ב‑`lifeJourneyBirthAdapters.js` שאינו קשור לשינוי). **לא הורץ מחדש על ה‑Base לצורך השוואה** | Legacy ✔, 2029 ✘ (סביבה) |
| בדיקת bundling | `esbuild@0.28.2` (אותה גרסה כמו `scripts/package-ai-analyze.mjs`) מאגד את `ai-analyze` כולל המודול; אין importים יחסיים שנותרו | ✔ |

דוגמאות הכרטיס: `test/fixtures/els-matrix-reading/card-examples/{preview,running,complete,incomplete-max-tokens,error-admin-only}.json` (כולן `is_test_fixture:true`; מקורן הניסוי EXP-18 C3 המוקלט, מוגש דרך fakes; מחדשים ע"י `node test/helpers/els-matrix-reading-card-examples.mjs`).

## 8. מה נדרש לאישור לפני הפעלה בפועל

אף אחד מאלה לא בוצע.

1. **פריסת `ai-analyze`** מהחבילה שנבנית ב‑`node scripts/package-ai-analyze.mjs` מ‑HEAD של הענף (אחרי שהקוד מוזג/אושר), `verify_jwt` נשאר `true`. הוכחת האריזה (בלי פריסה): `scripts/package-ai-analyze.mjs` מ‑`6815b4179141723d96cb7ca8185a8f870a31c7a3` יצר חבילה של 535,487 בתים מ‑11 מקורות מחויבים, `bundle_sha256 = 06877c1fbf077b482689d7552183de841ad0fe95d3bb282148a95aa8aa4cdbd8` (גרסת ה‑live הנוכחית v88 נבנתה מ‑`b8cabb195`; פריסה מחייבת חישוב מחדש מה‑HEAD שיאושר, לא שימוש במספר זה). **ההשפעה על Production מוגבלת:** בלי `ELS_MATRIX_READING_ENABLED` כל בקשה עם `els_matrix_reading` מקבלת 404, וכל שאר הבקשות עוברות באותם נתיבים כמו היום.
2. **סודות** (לא הוגדרו): `ELS_MATRIX_READING_ENABLED=1` (להפעלה), אופציונלי `ELS_MATRIX_READING_JOB_SECRET` (אחרת נגזר ממפתח השירות), `ELS_MATRIX_READING_MODEL` (חייב להתאים ל‑`claude-fable-*`; ברירת מחדל `claude-fable-5-1`), `ELS_MATRIX_READING_FX_ILS_PER_USD`.
3. **ללא שינוי DB/RLS** באופציה A.
4. אם תבחרו אופציה B או הבינונית — אישור נפרד לפי סעיף 6.

## 9. מה עדיין לא עובד / פערים ידועים

* לא נפרס; לא הורצה אף קריאה חיה לשכבה הזו (המודל, ה‑batch וה‑RPC נבדקו רק מול fakes; הניסויים הקודמים נמדדו בנפרד).
* אין כרטיס/UI — זה של GPT; יש חוזה, עטיפות ודוגמאות.
* רישום עלות רק כשמישהו מבצע `status` מוצלח; אין `operational trace` (`beginOperationalTrace`) לענף הזה.
* שער דולר/שקל לא מאומת ⇒ כל הסכומים בש"ח הם הערכה.
* בתקרה 60 ובחלון גדול סיכון ל‑`max_tokens` ⇒ `INCOMPLETE` עם עלות מלאה; החזר אוטומטי לא נבדק.
* הכיסוי מוגבל לחלון בלבד: ממצאים מחוץ לחלון לא נראים; קווים נחתכים בגבול החלון.
* "אין ממצאים נוספים" לעולם אינו נטען; תקרת ההצעות היא תקרת פלט.
* היקף: תורה בלבד (`tanakh` נדחה); רוחב מטריצה (= דילוג) מינימום 15.
* ההנחיה היא ההנחיה הכללית עם הציר מסומן ובלי שם (`general_v2_axis_marked_unnamed`) — נקודת פתיחה, לא כלל.
