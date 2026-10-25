# Life Journey family invitation delivery — 2026-10-25

## Scope

- Branch: `gpt/life-journey-family-invite-delivery-20261025`
- Stacked base: `c413275e7dca00fb98b35cb5436a26b0deff256a`
- Adds explicit, user-triggered family invitation delivery by transactional email and the device's private share sheet.
- Reuses the canonical `family_claims` invitation and its one-time raw token. No Person, Journey, hint, graph, memory, or Research Context store was added.

## Privacy and authorization

- The browser invokes `send-family-invitation-email` with a POST body only: `claim_id`, `raw_token`, and `recipient_email`.
- The raw token and recipient address are never placed in a URL, Research Context, storage, logging, or telemetry.
- Recipient email exists in component memory only and is cleared after a successful provider handoff.
- The Edge Function verifies the authenticated user, derives their Person from `auth.uid()`, verifies claim ownership, pending state, expiry, exact SHA-256 token match, and continued ownership of the family `target_ref`.
- The email link is always the clean `/2029/journey` path. The one-time token appears only in the email body, with a plain-text alternative.
- Resend receives no family name or private research content. Provider failures are not reflected verbatim to the client.
- A claim-scoped idempotency key makes retries safe. Correcting a recipient requires revoking the invitation and creating a fresh one.
- Native sharing sends text only and falls back to clipboard. Both paths require an explicit click.

## Verification

Passed:

```text
node --test test/family-invitation-email.test.mjs test/life-journey-2029-chain.test.mjs test/life-journey-person-context.browser.test.mjs
7/7

npm run build:2029
PASS

npm run build:legacy
PASS

npm run test:legacy-production-lock
PASS

node scripts/test-2029-built-graph.mjs
PASS — 12,669 gzip bytes recovered; 12,288 required

node scripts/test-2029-isolation.mjs
PASS

git diff --check
PASS
```

The browser test covers explicit email delivery and private sharing, no automatic send, no token/email persistence, no token/email URL exposure, no telemetry exposure, no automatic family research, no ELS calls, exact Life Journey return, mobile/desktop layouts, and light/parchment/dark themes.

## Release state

- Edge Function deployment: **NO**
- Live email send: **NO**
- Database/RLS/grants/site flags: **UNCHANGED**
- Preview: **NO NEW PREVIEW**
- Merge/main/Production: **NO**

The frontend and Edge Function are review-ready on the isolated branch. A separate explicit upload/release approval is required before deploying the Edge Function or updating a hosted Preview.
