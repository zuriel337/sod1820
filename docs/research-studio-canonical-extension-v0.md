# Research Studio Canonical Extension v0

Status: branch-only implementation; Human Gate required before merge/deploy.

This slice reconciles Projection work with the live Research OS instead of creating a second Workspace bridge.

- Extends the existing `universalFinding.js` envelope with explicit `verification` and `access` fields.
- Keeps ELS on the already-live exact-occurrence adapter (`hitId` / shown engine hits); no generic `status=ok` shortcut.
- Adds `canonicalGematria.js`, which calls the live canonical `gematria_api(text)` RPC and converts only engine-returned method results into Universal Findings.
- Adds `researchCanonicalGematria(text)` to the existing `useUniversalWorkspace()` hook, reusing the same ResearchProvider cart/history/cloud membership path.
- Does not create a database table, engine, Workspace, Context store, Research Object, canonical record, or published record.

Superseded work: PR #225 was closed unmerged after live reconciliation found it duplicated infrastructure already present on `main`.
