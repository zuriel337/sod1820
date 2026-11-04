# newsletter-unsubscribe v9 — minimal shared-function proposal

PROPOSAL ONLY. Nothing deployed or changed in the repository/database. Root owns integration and approval. Preserve `verify_jwt=false`: signed mail links must work without an Auth session.

Base repository: `957e4a6a7148f20cadd921303d8c9a86a8b6a7b5`.
Observed production v9 bundle SHA256: `c32fc315e6891cd9fd5b9a1e00fdb0685c515f2b9b87b5d41a6e73c902425975`.
Exact source SHA256: `13101bb6374057625d05414d216af2eab173c7fb4ad45d39f6f075578bc1d2c4`.
Proposed source SHA256: `7da57eaad6c43ce14f2f26ad7ded1a01f7977dc3bd7829e32cbac2b64aa792b9`.

## Files

- `newsletter-unsubscribe.proposal.patch`: one-file patch against the verified source.
- `index.proposed.ts`: complete proposed handler.
- `index.v9.rollback.ts`: exact prior source, without secrets.
- `actual-handler.test.mjs`: esbuild compiles the actual handler; only the Supabase import is mocked. All fetch attempts fail the test. Synthetic addresses, HMAC secret, server URL and key only.
- `test-output.txt`, `test-receipt.json`: 16 passing tests, zero skips, zero network/database calls or emails.
- `verified-existing-consent-recommendation.md`: separate, not implemented.

## Behavioral change

1. Keep the existing HMAC/signature and service-key fallback, signed `e`/`t` URL, GET/one-click POST, and OPTIONS contract.
2. Conditionally update only `active=true` and exact matching email. Request a returned row and require confirmed `active=false` and the acknowledged timestamp before success. Do not alter consent purposes, names, source, history or any other field.
3. Zero updated rows require a separate exact-email lookup. Success is allowed only for a proven existing `active=false` row. A repeated opt-out therefore preserves its original timestamp, including a historical null. Missing recipient, active recipient, SDK error, exception, malformed/multiple acknowledgement or read failure is never success.
4. Missing configuration returns 503; invalid/duplicate signed parameters return 400; unsupported methods return 405. Error responses reveal no database diagnostics or recipient email. JSON and HTML both use truthful status; HTML email text is escaped. Responses are no-store/no-referrer.
5. Existing `/unsubscribe` UI already displays retry state on 5xx. No additional Home opt-out button, Auth flow, schema or campaign change is included.

## Safe replay and integration procedure

Run from any location, using the existing repository dependencies:

```sh
UNSUBSCRIBE_REPO=/tmp/sod1820-continuity-closure node --test /tmp/finalprep-unsubscribe-proposal/actual-handler.test.mjs
```

Root may dry-run the patch (`git apply --check`) in its owned worktree, integrate only that file, then point the same suite at the integrated source:

```sh
UNSUBSCRIBE_REPO=/path/to/owned/worktree UNSUBSCRIBE_SOURCE=/path/to/owned/worktree/supabase/functions/newsletter-unsubscribe/index.ts node --test /tmp/finalprep-unsubscribe-proposal/actual-handler.test.mjs
```

`git apply --check` passed on the stated base. No patch was applied by this reviewer. Root should run normal targeted packaging, whitespace and secret checks before committing.

For the separately approved shared deployment: reread function version/source hash, stop on drift, preserve the original environment and `verify_jwt=false`, deploy this one function, then check metadata/source and inert OPTIONS. Do not send a newsletter, create a subscriber or follow a real signed opt-out link as an automated smoke test. Real opt-out acceptance is an explicit action by the owner of the address.

If rollback is needed for a regression introduced by this patch, the exact v9 source is retained. Restoring it restores its known false-success defect; a corrected roll-forward is preferable where feasible. Never reactivate or delete recipients to roll back code. Website rollback is separate.

The fixture proves handler behavior and query contract, not real Edge delivery, live account ownership, actual database persistence or PostgreSQL concurrency beyond the mocked contract. Real server acknowledgement and owner acceptance remain separate.
