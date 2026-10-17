# שאילתות קריאה־בלבד שהופעלו (Supabase `linswmnnkjxvweumprav`, 17–18.10.2026)

כולן SELECT או שאילתות לוג בלבד. הפלטים שעליהם נשען המסמך מצוטטים במסמך; אין כאן נתוני משתמשים. פלט `ts`/`ua` נגזר מטבלאות התעבורה הקיימות, בלי IP או מזהים אישיים.

| מטרה | מקור | תמצית |
|---|---|---|
| חלוקת זמן DB לפי פונקציה | `pg_stat_statements` | `where query like 'WITH pgrst_source%'` ממוין לפי `total_exec_time`; זיהוי הפונקציה מתוך `LATERAL (SELECT "public"."<fn>"`; לפי `userid::regrole`. Snapshot ראשון S1 ושני S2 ב־`snapshot-S1.json`, `snapshot-S2-and-delta.json`. |
| איפוס סטטיסטיקה | `pg_stat_statements_info.stats_reset` | `2026-08-04 09:03:11+00` |
| timeout | `pg_roles.rolconfig` | `authenticator`: `statement_timeout=8s`, `lock_timeout=8s` |
| משימות רקע | `cron.job` + `cron.job_run_details` | משך ממוצע/מקסימום/ריצות לפי job, 24 שעות ו־7 ימים; ריצות מעל 5 שניות עם חותמת זמן |
| טריות ועומס חיבורים | `pg_stat_activity` | 53/90 חיבורים; הפעילות הארוכה היחידה היא חיבור ה־replication של Realtime |
| Realtime | `pg_publication_tables` | `supabase_realtime`: `discoveries`, `post_share_counts` בלבד |
| גודל טבלאות | `pg_total_relation_size` | `visitor_events` 230MB, `bidim` 173MB, `site_visits` 120MB, `events_2026_0[7-10]` 46/65/86/52MB |
| נפח וגדלי פוסטים | `posts` | `length(content)`, `length(content_old)`, `pg_column_size`; 1,305 פוסטים, `content_old` ב־684 |
| RUM | `events_2026_10` (`event_type='web_vital'`) | ספירה, אחוזונים, פילוח לפי `path`, `props->>'collector'/'flush_reason'`; אין `build`/`sha`/`device` |
| בוטים מול בני אדם | `site_visits` | ביקורים לפי יום/שעה, `is_bot`, `count(distinct visitor)` |
| תעבורת API | `logs` (`edge_logs`) | 24 שעות אחרונות; פילוח לפי `request.path`, שיטה וסיווג `user_agent`; `response.origin_time` |
| middleware | `logs` (`edge_logs`) | `/rest/v1/rpc/public_post_slug_exists`: n, p50, p75, p95, max |
| מתגים | `site_flags` | 27 שורות, 22 דולקות; `fx_*` ו־`lock_*` |
| בעלי קוד של RPC כבדים | חיפוש מחרוזת ב־`dist2029a/assets/*.js` | שם הפונקציה נמצא/לא נמצא בבניית 2029 של `e189df34` |

כתיבה יחידה במשימה: שתי רשומות `work_log` פסיביות (BEFORE, AFTER), `dispatch_kind/state = NULL`.
