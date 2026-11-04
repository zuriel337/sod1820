# CP1 follow-up: exact live reader and linked existing receipts

Read only; base957e4a6a. No source/repository/shared change or test was executed.

## Exact health reader snapshot

- `/tmp/finalprep-admin-system-health-current.sql` — exact live `pg_get_functiondef` plus final newline.
- `/tmp/finalprep-admin-system-health-current.json` — reader/time/function properties and hashes.
- Observed2026-11-03T16:49:27.897837Z under `supabase_read_only_user`, transaction readonly.
- **prosrc MD5:** `335efe0f77d33570d9c0e06fd2a9fd32`.
- **Full definition MD5:** `bdc9892e60a4233cbab08afd48edd6fd`.
- **Definition SHA256:** `4e3593d711d71f88b55b90b7c1244eaa600c11f97c18580c34b88a6cb456eb88` (exact definition before file's final extra newline).

Only two failure assignments need the requested proposal:

```diff
-    v_cron := '[]'::jsonb;
+    v_cron := NULL;
-    v_security := jsonb_build_object('unacked', 0, 'recent_24h', 0);
+    v_security := jsonb_build_object('unacked', NULL, 'recent_24h', NULL);
```

Locations in saved definition:61 and233. Patch: `/tmp/finalprep-admin-system-health-failure-only.proposal.patch`. **Not applied.** Successful empty arrays and measured zero counts remain unchanged. Existing keys, guard, function signature/properties, successful logic and all other branches remain. Root should preserve ownership/grants, compare exact live definition before applying, and use saved definition as non-destructive rollback.

Legacy health card consumes usage/media, so these two failed-source fields do not change it. Existing ai-analyze operator summary tolerates null but maps missing cron to[] and can still report no jobs/no failures; it is a separate known consumer limitation, not repaired by this two-line proposal. Security nulls become?. Do not describe a shared-reader patch as repair of every consumer or deploy an Edge function for this review.

Root's minimal isolated checks should cover successful rows, successful empty/zero, forced cron failure, forced security failure, unchanged authorization/properties/ACL, and UI failure/unknown projection. No production function was executed or fault injected by this reviewer.

## Directly linked receipts retained

| Lens | Receipt followed | Valid evidence | Limit |
|---|---|---|---|
| Release/gates | coverage.md#H →7c0badfc hosted-publication README + FINAL-C8-VALIDATION | Exact c8 deployment manifests/identities, protected artifact headers/SW, isolated A3 and full G4 workflows | Historical pinned receipt, not current Production identity or current admin UI acceptance |
| Performance/errors | coverage.md#P →4fab7dd9 matched-tables; #H service receipt |0d4→257, n3 per width/state, every journey stage, CLS<=.05422; c8 input parity;16 service cases had no pageerror | Release measurements, not live RUM/general errors; not current957 timing |
| Explicit issue intake | Current State →public-acceptance-closure README | One authorized contact UI201 and one issue API204, one persisted record each, controlled component/worker cases | Browser bot gate prevented real human issue UI acceptance; no broad runtime-error coverage implied |
| Operations | coverage.md#O →b5fd1077 post-apply receipt | Agent jobs125–127 paused, authority views corrected | Does not prove current traffic/SEO/errors lens freshness or UI availability |
| Latest continuity | Current State →continuity-closure-20261103 + final-preparation |76runtime26 hosted cases/107 focused;957 docs-only; real user accepted both existing accounts | Explicit CP1 still open; basic user operations and accepted backup risk are not reopened |

The first three evidence files are on the explicitly linked evidence commits, not the product checkout. They were read via exact `git show`, not fetched from another branch or imported.

## Existing interfaces and policy, without new readers

`get2029Analytics({hours,pathPrefix})` already calls `admin_2029_analytics(p_hours,p_path_prefix)`. Live catalog presence/args/hash verified. Tracked response has meta, summary and visitors; summary includes pageviews, people/sessions, internal/external audiences and engagement, clean human/unknown/bot sessions. Raw visitor response includes identity and paths, so no payload was fetched for this review.

`getTrafficInsights(days)` →admin_traffic_insights; `getCommandCenter()` →admin_command_center also exist in live metadata. Existing GA/Vercel/SearchConsole server adapters are in visits.js and require a genuine session. None was invoked, and this review does not claim provider freshness/configuration from the presence of code.

**Current policy matters:** App2029:151–160 skips WebVitals/GA/marketing/identity/visit/engagement under PUBLIC_READING_RELEASE. tracking.js:20–30 keeps automatic runtime-error capture as bounded sanitized local warning in this profile. Thus the October6 plan's blanket “runtime telemetry active” statement is historical. Empty analytics cannot establish no users/no errors for this candidate. Earlier release receipts remain valid in their measured scope.

These existing interfaces are not a new CP1V2 proposal and were not wired or enabled. Full CP1 remains unaccepted by this review; exact release evidence, current source state and genuine admin UI acceptance must stay distinct.

Machine-readable details: `/tmp/finalprep-cp1-linked-receipts.json`.
