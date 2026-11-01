# RAZIEL_2029_CREDIT_SAFE_PRODUCTION_INTEGRATION — BLOCKED

Base: `5408f8dd7e6d89b2b63a83375b325f60238b2959`.
Branch: `gpt/2029-raziel-credit-safe-integration-20261101`.
No runtime source edited. No deployment, migration, flag/config/role change or
provider request. This is a preserved audit/rollback checkpoint, not completed
Production integration. The user's conditional release permission is unused.

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

No Production-ready merged variant is accepted at this checkpoint. Removal of
Candidate auto-enable and a verified-owner-only pilot with an immediate server
kill switch remain unimplemented. Existing v91 capabilities must be preserved
when that implementation resumes. Do not enable the current branch's meter.

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
- Production-package Candidate exclusion gate **fails** on current HEAD.
- Owner-only pilot/runtime tests **not passed**: the implementation still targets
  ordinary members; no authenticated owner session is attached for live checks.
- Full Production-shaped migration/reapply acceptance, all Raziel/WhatsApp/
  numeric/personal/matrix regressions, both builds and provider-backed acceptance
  are **not completed**. Existing focused/static tests do not prove these gates.

Per the user's fail-closed instruction, stopped before Production or billing.
Both client flags remain unmodified; no public Raziel unlock, Cardcom action,
commercial activation, homepage/root/cutover, main push/merge or destructive
rollback occurred. No Preview was deployed. Obtaining a real owner session
requires a secure authenticated browser/runtime connection, never a password,
provider key or JWT pasted into chat. No session was forged on the owner's behalf.
