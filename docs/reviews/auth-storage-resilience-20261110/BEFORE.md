# BEFORE — Auth storage resilience (10.11.2026)

**work_log status: NOT VERIFIED.** The write of the BEFORE row to `public.work_log` timed out waiting for the Supabase server's
confirmation question (nothing is known to have been inserted; ZURIEL's check found no new row). Per ZURIEL's instruction the work is
not delayed for it. When the work_log permission is available: check for duplicates (task_key `auth-storage-resilience-20261110`), then
insert BEFORE and AFTER from these files.

## Authorization (ZURIEL, chat 10.11)
Build the fix on an isolated branch, tests only. NO approval for merge, deploy, data deletion or any Supabase change.
Requirements: (1) Auth storage must survive a localStorage failure for Google, Facebook, e-mail code, password; (2) the fallback holds for
the whole OAuth flow (redirect, callback, PKCE, session save, refresh) without promising persistence after the browser closes;
(3) audit every localStorage writer, ELS included, for unbounded growth; delete no ciphers, drafts or research; (4) separate storage
errors from real network errors with exact messages; (5) tests for full / blocked / healthy storage, regular browser and installed-app
presentation; (6) keep users, identities, permissions and research data; (7) document BEFORE/AFTER and return root cause, changes and
results before asking for merge approval. No parallel Auth system; no change to approved auth contracts without presenting the
contradiction first.

## Base
`origin/main` = `1f0867ffbbe87397d712a76d0ba61633c0befef6` (PR #1289, live as `dpl_7Q7rBC4qKtP5AHwAunCePYeNo5FK` since 13:34Z).

## Evidence for the root cause
* Owner screenshots, regular Chrome (not private), 16:27 IL: code request -> "אין חיבור יציב לרשת" with the diagnostic tag `network`;
  Google -> "לא הצלחנו לפתוח את הכניסה". Supabase auth logs: no `/otp` or `/authorize` after 14:15Z, while a code sign-in from another
  environment succeeded at 14:15:52Z. The failure happens before the request leaves the browser.
* Reproduced in a real Chromium with the built public artifact: localStorage quota exhausted, or sessionStorage blocked -> the exact
  Google message; localStorage full -> the code request never reaches Auth and the UI says "network" (the SDK error text
  "Failed to execute 'setItem'..." matches the network classifier); fresh storage works.
* The owner's cloud ELS data is small (14 rows, about 8 KB): it does not explain a full local store. The on-device state is **not yet
  proven** (the Chrome site-settings size was requested and not yet received).

## Mechanism
`signInWithOtp` / `signInWithOAuth` must write the PKCE code verifier to the configured storage before any request; the session is
written to the same storage. In production that storage is `localStorage` (canonical origin) with no fallback, so any write failure
(quota exceeded, blocked) throws before the request and every sign-in method fails.
