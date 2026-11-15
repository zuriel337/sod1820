# Preview existing GA4 synchronization before importing

Prepared 15 November 2026; now integrated for final review in #1346 on main `fec22ca072ce48114beab161988620d47b7392b8`. Owner: existing `traffic_intelligence_law` v11 (re-read in this continuation) and existing `ga-sync-server`/canonical ingestion RPCs. No new store, cron, identity model or law. A website deployment does not deploy this function. Actual operation results are recorded in #1346 and the existing passive journal.

## Operation follow-up, 15 November

The preparation below is historical. #1346 is now merged as `c752b0014a1ba288e314be9fad66a6af6f52e2cc`, and the Edge function is deployed separately as ACTIVE v3, retaining `verify_jwt=false` and the internal sync-key gate. Its source SHA-256 is `e555a62c76a74f00ab0f03bc1e8ec5e78a97403c46186b6c9f3f41edf72cd38f`; bundle `54a38ee6a9f88cea5b93ecd85989f029062dd5edf2a872b094750f22854b9459`. Re-read during this follow-up: unchanged.

| Attempt | Request | Result | Import |
|---|---:|---|---|
| Before the API was enabled | 39314 | Google 403: Analytics Data API disabled for project 605729730420 | None |
| After user-reported enabling at ~12:08 UTC | 39888 | Google 403: **User does not have sufficient permissions for this property** | None |

Both requests used the same existing authenticated server path with `days:7,dry_run:true`. The operator's one `net.http_post` call writes a request/response to the existing HTTP queue; it does not import analytics rows. No sync key, OAuth token or private key left the server. No schedule, permission, property config or historical analytics value was changed. Google is now answering the report request with a property authorization error; this is distinct from the earlier disabled-API error. It can mean the configured property is wrong or that the existing service account lacks access to the intended property. No daily result is available to approve for import.

A bounded read of `ga_sync_config` through the readonly connector was denied. There was no privileged fallback, raw Vault read, alternate Google account or retry loop. The numeric Property ID and the service-account identity must be reconciled through an authorized existing operator interface. A project number, a web-stream numeric ID and a `G-` Measurement ID are three different identifiers; none should be substituted for Property ID.

### הוראה לסוכן הדפדפן — השלמת התאמת ההרשאה

1. ב־Google Analytics פתח את הנכס שבו נמצא הזרם `G-V3H3E20FLY` / `15073034581`. רשום את **Property ID**, שם הנכס ואזור הזמן. אל תשנה הגדרות מדידה נוספות.
2. בפרויקט Google Cloud `sod1820-gsc` מספר `605729730420`, פתח IAM & Admin → Service Accounts. זהה את **חשבון השירות הקיים שמשמש את הסנכרון** לפי התיעוד וההגדרה הקיימים, ולא לפי ניחוש מתוך שמות. אין צורך ליצור מפתח או חשבון חדש. כתובת חשבון השירות ומזהה הנכס הם פרטי התאמה, לא סיסמאות.
3. בדוק ב־GA Admin → Property access management אם החשבון הזה קיים ובעל הרשאת Viewer לפחות. השווה את Property ID לנכס המוגדר בפועל לסנכרון, דרך המפעיל המורשה של ההגדרה הקיימת. אל תחליף את Property ID ב־Stream ID או במספר פרויקט Cloud.
4. מסור את זוג המזהים המאומת ואת ההרשאה החסרה. אם לא ניתן לזהות בוודאות את החשבון או לקרוא את הנכס המוגדר, דווח בדיוק מה חסר; אין להעניק הרשאות לכל חשבונות השירות כדי לנסות לפתור זאת. התיקון הממוקד יהיה Viewer לחשבון הקיים בנכס הנכון, או תיקון Property ID אם נמצא שאינו תואם — לפי תוצאת ההשוואה.
5. לאחר התיקון נחזור על אותה תצוגה מקדימה של שבעה ימים. ייבוא והקמת תזמון נשארים שלבים נפרדים, אחרי שניתן לראות את הנתונים שהסנכרון יחזיר.

זו הרשאת קריאה של הסנכרון לנתוני Google Analytics; היא אינה מגבילה את הגישה של גולשים לאתר.

## Why this is separate

The deployed `ga-sync-server` always imports after fetching its Google reports. Calling it to inspect whether credentials and report data work would therefore change analytics rows. This adds an explicitly authenticated `dry_run:true` mode to that same handler so its normalized global/Israel daily results can be reviewed first.

- Preview uses the existing sync-key authorization and exact same Google reports/normalization.
- It returns `source: GA4_MEASURED`, the date window, row counts and daily aggregate preview rows.
- Neither `ingest_ga_daily` nor `ingest_ga_country_daily` is called in preview mode.
- Omitted `dry_run`, explicit `false`, and an empty scheduled body retain existing import behavior.
- A malformed nonempty JSON body, a non-object body, or a non-boolean `dry_run` returns 400 before token exchange/report fetching/import. In particular, the string `"true"` cannot accidentally turn a requested preview into a real import.

No live endpoint was invoked. A future preview still exchanges an OAuth token and calls Google's read-report API; it is a no-import mode, not a promise of zero platform logging or zero remote activity. Ordinary import remains two existing writes and retains its previous partial-failure behavior; this package does not redesign that transaction boundary.

## Live baseline and reviewed file

Read from Supabase on 15 November:

- Function `ga-sync-server`: ACTIVE v2, `verify_jwt=false` (its server sync-key gate remains inside the handler).
- One deployed file, `index.ts`, byte-identical to base/main `3843af126f21ae58cf033fe808eaa2821b7a3362`.
- Before file SHA-256: `c0d490b82dd1bd7c552449834600d52e940ea5e862bd2fc02e9138ebf242f94e`.
- Before bundle fingerprint `ezbr_sha256`: `1d8b9081544473a687dc33d5f3fb5c7199701b65f29e694c0349007cf24254e9`.
- Candidate file SHA-256: `e555a62c76a74f00ab0f03bc1e8ec5e78a97403c46186b6c9f3f41edf72cd38f`.

There was no GA-named cron in the bounded scheduler inventory. That does not rule out an external schedule. `ga_sync_config` is the only matching sync helper found in the public function catalog; no existing server wrapper for invoking a preview was found. No secret value was requested or read.

## Tests

`test/ga-sync-preview-20261115.test.mjs` compiles and executes the actual handler, replacing Supabase/Google/crypto I/O with local fixtures. Twelve cases pass: both report paths and preview rows, zero ingestion calls, existing normal/empty-body imports, malformed input refusal, unchanged authorization, missing config, and Google report failure. Before the change the preview/refusal cases fail. There are no live credentials or network calls in the test.

The suite is wired into the existing Live Contracts job, with no new job name or changed threshold. G1 51/51 also passes. Production credentials, OAuth permission to the property and Google report contents have **not** been tested by these fixtures.

## Prepared release/operation sequence — not approved or executed

1. Review the exact PR head and its CI, then merge only after approval. This does not deploy the Edge function.
2. Before an approved function deployment, re-read version, source hash, bundle fingerprint and JWT setting. Stop on drift. Deploy only this one reviewed file, retaining `verify_jwt=false` and its unchanged internal authorization.
3. Download the deployed source and compare its SHA-256. No website deployment, SQL, secret change or schedule creation is part of this step.
4. After approval, a server operator with the **existing** sync credential can POST `{"days":7,"dry_run":true}` to this function. Keep the key in the existing server credential mechanism; do not paste it into a chat, repository or browser. If that execution channel is unavailable, leave the operation pending instead of exposing credentials.
5. Review the returned global/Israel daily dates and metrics against the intended GA property and its reporting timezone. Preview does not prove GA and first-party definitions agree. Keep `GA4_MEASURED` separate from verified-human counts.
6. A real import/backfill and restored schedule require their own concrete, bounded request after the preview. None is authorized by this preparation. Historical measurements are not automatically corrected.

Rollback source: the one original `index.ts` at the exact base commit above, with its verified before hash and unchanged JWT setting. The rollback changes the function only; it cannot undo analytics rows from an independently authorized normal import. No rollback is needed for this preparation because nothing was deployed.
