# Registered advanced ELS search — security boundary inspection

Status: READ-ONLY investigation, no auth/Edge/production policy change in this branch.

## Actual chokepoints

1. `src/components/experience2029/ElsAdvancedSearch2029.jsx` makes `supabase.functions.invoke("els-search-bridge", {body: built.request})`. The main range request is `op: "page"` from `buildElsAdvancedPageRequest`. It can also perform automatic expression variants using the same bridge.
2. `public-reading-deploy/transport.js` lists `els-search-bridge` among `adminFunctions` and authorizes them through `verifyReadingAdmin`, not merely through a UI option. Thus flipping the client button does not enable registered users.
3. `supabase/functions/els-search-bridge/index.ts` recognizes `page`, `verify`, and `verify_batch`, identifies users via `/auth/v1/user`, rate-limits, and calls `fn_capability_execution_gate_v1` using `p_required_entitlement: "public"`. This gate is NOT itself a proof that a given browser operation is authorized under the public release worker.
4. The client `publicReadingActionsLocked(isAdmin)` chooses the `publicClassic` variant in `Els2029Page.jsx`; blindly loosening it unlocks other administrator-scoped areas and must be avoided.
5. Supabase anonymous-auth sessions can contain a real user id (explicitly noted in bridge code). Mere `userId != null` is insufficient to prove conventional registration; verified non-anonymous account status needs a considered contract.

## Proposed safe minimal follow-up (NOT IMPLEMENTED)

- Introduce a narrowly scoped registered-ELS admission path in the existing public transport, requiring verified canonical identity, explicit allowlisted request shape and strict bounds, without changing the general `adminFunctions` behavior.
- Confirm the account is a registered, non-anonymous Supabase account; do not derive this from unverified JWT claims, browser state or a service-role token on the client.
- Limit the new route to an approved bounded `page` operation. Decide separately whether `verify` is required for safe result inspection; continue to reserve `verify_batch` and automated discovery until reviewed.
- Apply the authorization in the server endpoint and worker together, preserve feature locks and rate limits; don't assume a worker check is sufficient against direct Edge calls.
- Grant the registered account an **explicit capability**, not admin, guided, AI, Raziel, or broad research mode.
- Add negative tests: guest; anonymous-auth; invalid/expired JWT; registered; admin; direct Edge bypass; unbounded skip; multi-variant abuse; quota; cross-account isolation.
- Execute this security change only in an exact reviewed branch/deployment pathway. Production Edge deploy and shared policy modifications require independent explicit user approval.

## Current handoff

The user granted implementation responsibility for the feature, but this is not approval to deploy an unaudited security alteration. Release candidate remains the safe UI copy only until this path is tested and independently authorized.
