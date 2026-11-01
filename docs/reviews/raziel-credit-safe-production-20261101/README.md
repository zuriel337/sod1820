# RAZIEL_2029_CREDIT_SAFE_PRODUCTION_INTEGRATION — BLOCKED

Base: `5408f8dd7e6d89b2b63a83375b325f60238b2959`.
Branch: `gpt/2029-raziel-credit-safe-integration-20261101`.
Local AI-server source prototype prepared; not accepted for deployment. No
deployment, migration, flag/config/role change or provider request. The original
audit checkpoint is6eb047ce; later local work is described below. The user's
conditional Production release permission is unused.

## Rollback

`rollback-v91/index.ts` is the exact downloaded Production source. Metadata:
version91, verify_jwt=true, deployed bundle hash
`2c8100726a5cdd353bd10efb7bec0ec1b30339995787c824d262707294cb57eb`.
Plain source hash:
`2ac19e112e77e71fbab61270338e126edf88128a786f3425b09157291494281f`.
These are different hash domains; no claim that compiling the source reproduces
the platform's original EZBR container byte for byte. One entrypoint `index.ts`,
no import map, no environment values or provider/service keys included.
Pinned esbuild0.28.2 successfully bundles the rollback source. To restore only
after an incident attributable to the new function: deploy this exact source
as ai-analyze to the original project with verify_jwt=true and existing original
project environment untouched. Validate function metadata and source hash after
deployment. No restore/deploy rehearsal was run against Production.

## Actual three-way comparison

The HEAD packaging command resolves16 committed repository sources and produces
604579 bytes, source SHA256
`8939d15e018b1bdd78807d7a3100f81ca110ea3a1b1c65f037005c7696afefba`.
It is **byte-identical to the downloaded Candidate v93 source**. Candidate's
deployed EZBR hash is separately
`e57d5a441d004af949d2fb8d7cc00767b22eb6f6ebfcc65b914f7a3df6780db9`.
Full bounded source diff and receipt are in evidence. No v93 blob was deployed.

Changes compared with Production v91:

- Personal Raziel Follow/activity additions: topic/event/activity caps, caller
  identity validation, whitelisted personal source projection. These are
  repository-backed new Raziel behavior, not credit-wallet definitions.
- Credit integration: reserve/finalize helpers, deterministic/semantic gate
  boundary, reserve before provider, settle accepted output, return degraded or
  thrown output, server-owned credit receipt, outstanding reservation tracking.
- Preview-only: hard-coded Candidate project URL automatically enables the
  meter. This must not enter a Production artifact. Existing eligibility
  explicitly requires tier=user; it therefore exempts the approved admin owner
  and could charge ordinary members if enabled. Neither is the requested pilot.

No Production-ready merged variant is accepted. The local source now removes
Candidate auto-enable and adds a non-secret owner allowlist over the server's
verified UID and role; it preserves all other v91/Candidate behaviors. Guests,
ordinary users and other admins fail the AI-side pilot gate. The environment
switch still defaults off, and an inactive action catalogue prevents reservation
before provider I/O. However this does NOT constrain direct database RPC calls;
the required database pilot-isolation gate below fails. Do not enable the meter.

## Canonical funds and model

Read-only Production check: owner remains admin; profiles.credits=35. Six latest
ledger rows are positive contributions/daily credits totaling35; newest is
2026-10-13. No new debit was created. New membership/price/reservation tables
are absent from the inspected Production schema.

The SQL does not require granting the35 again. Reservations debit through the
existing credit_grant into profiles/credit_ledger. General balance not allocated
to membership cycles is supported: return computes cost minus allocated amount,
then restores only unexpired cycle allocations. Existing synthetic SQL tests
cover general balance, return/replay and expiry semantics. This is **not**
BLOCKED_CREDIT_ALLOCATION_MODEL, and no synthetic membership grant or cycle was
created for the real owner. Exact real-owner35→20 remains untested.

## Verification and fail-closed boundary

- Existing credit engine, Fast seam and meter UI unit tests:11 passed.
- Existing disposable SQL acceptance passed on cached postgres:17. The runner's
  image name was adapted only in a temporary copy from unavailable alpine to
  the installed PostgreSQL17 image; no assertions were changed. No host/project
  database was targeted, only synthetic fixture data.
- HEAD packaging passed from16 committed sources; verify_jwt=true.
- Rollback packaging and Legacy Production lock passed. No secrets were found
  in downloaded source credential-pattern scans; no environment values copied.
- Production-package Candidate exclusion gate failed on original BASE5408; the later local prototype passes that exclusion gate.
- Owner-only pilot/runtime tests **not passed**: the original base targeted ordinary members; the local AI gate fixes that, but database pilot isolation fails and no authenticated owner session is attached for live checks.
- Full Production-shaped migration/reapply acceptance, all Raziel/WhatsApp/
  numeric/personal/matrix regressions, both builds and provider-backed acceptance
  are **not completed**. Existing focused/static tests do not prove these gates.

Per the user's fail-closed instruction, stopped before Production or billing.
Both client flags remain unmodified; no public Raziel unlock, Cardcom action,
commercial activation, homepage/root/cutover, main push/merge or destructive
rollback occurred. No Preview was deployed. Obtaining a real owner session
requires a secure authenticated browser/runtime connection, never a password,
provider key or JWT pasted into chat. No session was forged on the owner's behalf.

## Final local prototype acceptance — mandatory gate is RED

Local code commit4e12f50c extends the repository source incrementally. No v93
blob replaced the handler. Only credit enable/eligibility and a pure owner-gate
helper changed. Phase L/personal, Legacy, numeric truth, WhatsApp and matrix
logic were retained. The handler test fixture now imports the actual new pure
helper, checks its exact14th import and retains all prior dependency checks.

-12 focused credit/meter/owner-gate tests passed, including wrong UID/role,
  forged body identity, ordinary users, other admins and default-off states.
- Broad61-file Raziel/numeric/personal/WhatsApp-related regression:685/687 passed.
  Two unchanged client-test failures remain: one stale exact metadata whitelist
  expectation, and one VM harness that does not transform import.meta. Neither
  test nor client was weakened/changed. This is not a full green regression.
- build:2029 and full dual build passed with both requested client flags false.
- Packaging passed from17 committed sources with verify_jwt=true. New prototype
  source hash80f84cb3fa3c5983db2158f940b412221d0a27e84e643415c0ef5bddfc8beac9;
  no Candidate project reference exists in this server package. The older
  three-way receipt describes the initial base, not this later artifact.
- Existing generic credit SQL tests passed on isolated PostgreSQL17.
- **Required non-pilot database acceptance FAILS.** Appending
  `non-pilot-database-gate.sql` to the same disposable fixture enables the
  existing action and calls credit_reserve_v1 as an authenticated synthetic
  non-pilot user. Its balance changes35→20. The assertion
  NON_PILOT_MUST_NOT_BE_CHARGED fails. This is synthetic only; no real balance
  was used. The AI allowlist alone is insufficient while the RPC is exposed
  to authenticated users. A database-enforced action scope/configuration must
  be designed and accepted before any catalogue activation or deployment.

Stopped fail-closed on that mandatory financial gate. No ad-hoc financial
backfill, cycle grant, wallet, role change or ledger adjustment was attempted.
An owner-authenticated live acceptance session is also unavailable. No live
smoke/fast/deterministic/failure call was made. Exact35→20/one-debit/settled live
acceptance is NOT proved. Full Production-shaped migration/idempotency and
remaining complete-system gates remain open. Production is stillv91,35credits,
admin, zero ledger entries today; no migration or pilot activation performed.
