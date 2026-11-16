# Deferring the Supabase Auth client for anonymous readers — proposal (16 November 2026)

Proposal only, not implemented. Owner: the existing permanent sign-in contract (P0 Auth, #1289) and the single Supabase client in `src/lib/supabase.js`. It touches sign-in, so it needs ZURIEL's decision before any code.

## What it would save

In the production build of `main` `ea7257598` the eager entry is 225,182 B gzip. By source attribution (sourcemaps), `@supabase/auth-js` is 97 KB of the 684 KB raw eager JavaScript (14 %), about 30 KB gzip; every page, every visitor, downloads and parses it before the first page code runs. The Storage client (22 KB raw, with `iceberg-js` 5 KB) is already moved behind a lazy adapter on this branch (`storageLazy2029.js`); Realtime was moved earlier (F20).

## Why it is harder than Storage or Realtime

- `SupabaseClient` builds its Auth client in the constructor and uses it for every request: the authenticated `fetch` asks it for the current session before each REST call, also for anonymous visitors (it returns no session and the anonymous key is used).
- `AuthContext.jsx` subscribes to auth changes at startup, password recovery watches the URL, the OAuth return reads the callback, the account-link and measurement code read the session, and the sign-in contract has browser and CI gates for all of them.

## The shape that would work

1. A small synchronous check at startup: is there a stored Supabase session for this project (the auth storage key), a recovery/OAuth callback in the address, or an explicit sign-in request? The check reads only the presence of the key, never its content.
2. If none: the client is built with an anonymous access-token callback that returns the anonymous key without loading Auth; `supabase.auth` is a lazy adapter whose methods load the real Auth client on first use (sign-in, sign-up, recovery, reading the user).
3. If any: the real Auth client loads at once, as today, before the first authenticated request.
4. The first sign-in in a tab loads Auth on that action (the sign-in screen already shows its own progress).

## Risks that must be proven before a release

- A session written by another tab while this tab runs anonymous (cross-tab sign-in): the adapter must materialize on the storage event, as the real client does today.
- Requests that today carry a valid session must never go out anonymous: one test per authenticated reader with a stored session present.
- Password recovery and OAuth returns: the address check must cover every callback shape the current contract accepts.
- The existing auth gates (browser acceptance, isolated GoTrue) must pass unchanged; no gate may be weakened to pass.

## Decision for ZURIEL

Whether to build this on a branch, with the acceptance above, for an expected saving of about 30 KB gzip on every page for anonymous readers (most visitors of old posts).
