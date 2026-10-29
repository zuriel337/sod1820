# Bounded Fable activation — 2029 Preview

Actor GPT; task `ELS_FABLE_PREVIEW_ACTIVATION_20261029`; handoff ZURIEL.
Base `945b2862f4b19c937bfb72ecbfe367b373d1a7ac`, remote verified before work.
Branch `gpt/els-fable-preview-activation-20261029`. No main merge or public-site cutover.

## Explicit authority and reconciliation

ZURIEL approved the narrowly described live `ai-analyze` update, private technical job migration, admin-only Preview and one live acceptance scan up to USD 2. This is not authority to change pricing, quotas, general Raziel availability, unrelated RLS, other functions or production-site aliases. Relevant reading-layer BEFORE/AFTER records were checked. Passive BEFORE: `199c1cf8-9af0-45e5-a026-a9b80ee6814a`.

The old live `ai-analyze v88` was downloaded and compared with the deterministic package of `b8cabb1950f7a2006aaac581aaa884f3ee7f810c`. Exact source equality was established (the local archival copy had one extra final newline); old source SHA-256 `21ce70f1dc198db1209902f086a053891915552bc7b808adf2f8631c61cc9de6`. The approved source diff is the matrix context and matrix-reading action, not a replacement of unrelated central Raziel behavior. Current main was observed at `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`, not imported. The pinned Legacy production SHA has a successful `sod1820/post-deploy-canary` status; Legacy production lock passed.

## Live changes applied

- Applied the unchanged approved `20261029125427_els_matrix_reading_durable_jobs.sql` migration to `linswmnnkjxvweumprav`.
- Verified RLS enabled, no client policies, no anonymous/authenticated table SELECT or INSERT, six invoker RPCs with no anonymous/authenticated EXECUTE, service SELECT/INSERT/UPDATE and no DELETE. Initial job count zero.
- Deployed **ai-analyze v89**, `verify_jwt=true`, using the unchanged committed server package from the approved base SHA, 13 committed sources. Source SHA-256 `5611a3ecd4ffcf725bfcafb6924f5820bab82ce11bd36a19f6db16943bb09f73`.
- Downloaded v89 afterward and verified exact byte-for-byte source equality. Unauthenticated POST returns 401.
- Security advisor delta: only an INFO for RLS with no policies on the new private table, intentional because clients have no grants. Existing ERROR/WARN counts unchanged. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- No provider key extraction, live AI request, credit charge, other function deployment or public-site deployment was performed.

## Client activation scope

Only this named Vercel Preview branch enables the existing card. Its service worker permits only the existing `els_matrix_reading_v1` action in the existing global Raziel deep/matrix envelope. Start is bounded to 33×41, 25 proposals, USD 2 acknowledgement and an idempotency request ID. Status, cancel and exact recovery use the same route. Ordinary chat/matrix explanation, planning and direct product writes remain blocked. The server remains the security authority; the worker is an extra Preview restriction, not authentication.

The original matrix-explanation Preview branch keeps its original behavior. Production and unlisted branches do not inherit the activation. Classic/Research components, Providers, dictionaries and canonical engine files are untouched. Preview identity and notice now explicitly disclose private job/cost writes rather than claiming no writes.

## Verification

- Preview policy tests: 13/13 passed (4 new, 9 existing).
- Real isolated PostgreSQL 17.6: 14/14 passed, no skip, including actual server operation → repository → PostgreSQL.
- Focused durable-operation + actual Raziel-handler tests passed. Initial combined run reported two PostgreSQL skips before selecting the existing local binaries; the explicit PostgreSQL run above completed both suites.
- Advanced-page browser passed. The simultaneous card run timed out waiting for initial render during Vite dependency re-optimization; the card passed independently without changes (320/390/1440 and three themes). Do not describe the simultaneous run as green.
- Both standard 2029 and Legacy builds passed. The branch-specific Preview build and hosted smoke are recorded in the delivery.

## Remaining activation and acceptance

The authenticated Supabase connector can deploy functions/apply SQL but has no Edge-secrets setter. Managed runtime has no configured Supabase CLI identity. No code default was changed to bypass this configuration boundary. The user must set **ELS_MATRIX_READING_ENABLED=on** in the existing project's Edge Functions → Secrets screen (not a new AI key). Existing ANTHROPIC_API_KEY remains server-side. Availability/admin gates remain unchanged; use an existing administrator login, not manufactured credentials.

No authenticated live reading has yet been proven. After the flag and existing admin login, test one explicit scan up to USD 2, record its exact job ID, reload and explicitly recover the same job, then confirm one provider batch/one cost receipt. No automatic retry or second paid acceptance scan. Unknown dispatch/result remains blocked, never permission to pay again.

Recovery plan: before any jobs start, keep/restore the feature flag OFF if acceptance fails. With outstanding jobs, preserve collection access and reconcile them before disabling; do not strand paid work. Keep the private receipts even if the feature is disabled. The archived v88 bundle is a rollback artifact, not permission to erase v89 receipts or other future server updates.

Supabase guidance informed RLS/ACL verification and keeping secrets server-side; Vercel guidance confines client activation to a protected Preview and exact SHA.
