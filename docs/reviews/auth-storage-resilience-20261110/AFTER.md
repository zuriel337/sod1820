# AFTER — Auth storage resilience (10.11.2026)

**work_log status: NOT VERIFIED** (same as BEFORE.md). Branch only: **not merged, not deployed, no Supabase change, no data deleted.**
Base `origin/main` `1f0867ff`; work on branch `ccr-d05c4578-8f9w85`.

## Root cause
The Supabase client writes the PKCE verifier and the session to its configured `storage` **before** any request. Production configured
`localStorage` alone; when it throws (quota exceeded or site data blocked) every method fails before a request leaves the browser (code,
password, Google, Facebook). The SDK message "Failed to execute 'setItem'…" matched the network classifier, so the person saw "no stable
connection". Proven by reproduction + Supabase auth logs. What fills the owner's storage is a measured candidate (research sync
journals), not proven on the device.

## Changes
* `src/lib/authStorage.js` (new): the `storage` handed to the **one existing** client: primary localStorage, then sessionStorage (tab; survives
  reload and the OAuth redirect), then memory. Never throws, never evicts, reads prefer the fresh fallback so a stale value cannot shadow
  it, and a later successful primary write drops the fallback copy. Reports durability honestly: `durable` / `tab` / `none`.
* `publicReadingAuthSession.js`: uses it. Storage key, PKCE flow, callback detection unchanged.
* `auth.js`: preview-return bookkeeping can no longer abort a sign-in.
* `authDiagnostics.js`: new kind `storage_unavailable` (with its own message), classified **before** network; real outages stay `network`.
* `AccountEntry2029.jsx`: exact messages; Google/Facebook refuse early and honestly when nothing can hold the PKCE verifier; collapsible
  storage report (names and sizes only).
* `preview-deploy/admin-readonly-auth.js` (**worker change, flagged**): an unreachable Auth server now answers 503
  `public_reading_auth_unreachable` instead of the policy-denial 403, so an outage is no longer reported as "stale worker". It admits no
  new request. It ships only with the next worker build.
* `test/public-reading-full-account-transport.test.mjs` (**approved-contract test edited, flagged**): it asserted `configured.storage === storage`;
  it now asserts that the configured storage writes through to the given store. Policy-id assertion unchanged in spirit.
* Research sync runtime: **unchanged** (see STORAGE-WRITERS-AUDIT.md; contract conflict awaiting decision).

## Tests (local, this branch)
| Suite | Result |
|---|---|
| `test/auth-storage-resilience-2029.test.mjs` (new; real worker + real SDK + real auth modules vs GoTrue model) | 15 / 15 |
| `test/auth-contract-2029.test.mjs`, `src/lib/authVerifyOtp.test.js`, `test/public-reading-full-account-transport.test.mjs` (+ the new file) | 76 / 76 |
| `src/lib/authVerifyOtp.test.js` + `src/lib/research/*.test.js` | 1575 / 1575 |
| `test/auth-storage-browser-2029.browser.mjs` (new; real Chromium, built artifact, real worker; desktop and standalone-PWA emulation × healthy/full/blocked × code and Google redirect, plus the storage report) | 13 / 13 |
| `test/auth-browser-acceptance-2029.browser.mjs` (existing) | 6 / 6 |
| `npm run build` | passes |
| New browser tests against the **pre-fix** source | 9 fail (every full/blocked case), healthy cases pass: the tests detect the bug |
CI: both new files are added to `live-contracts-2029.yml`; CI has not run for this branch yet.

## What is honest about persistence
| State | Sign-in | After reload / redirect | After closing the tab |
|---|---|---|---|
| healthy | works | kept | kept |
| localStorage full or blocked, sessionStorage fine | works (code, password, Google, Facebook) | kept (same tab) | **lost** |
| both unusable | code/password work on this page | lost; Google/Facebook cannot complete and say so | lost |
Not verified: a real installed Android PWA and a real device with a genuinely full quota (emulated only).

## Open decisions for ZURIEL
1. Research journals: amend the "distinct durable journals per duplicated tab" contract so passive loads reuse a journal (stops the growth), or keep it.
2. Approve the worker 503 change and the edited transport-test assertion.
3. Chrome site-settings storage size on the affected device (would prove or refute the candidate).
4. Supabase "Confirm signup" template with `{{ .Token }}` (prepared, not applied); work_log BEFORE/AFTER insertion.
