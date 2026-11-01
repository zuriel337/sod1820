# Functional unified Preview — implementation and acceptance

Product base: `c2f2e9948dd119c96b69e377b33be2eb2a886efb`, continuing product `63e6882c`. Evidence branch `070ddbc2` is not a product base. Work is on `gpt/2029-functional-unified-preview-20261031`; main, the frozen CI branch, evidence branch and Legacy website are unchanged.

Coordination: BEFORE `dd6f964c-58fb-4996-98d6-e3fb0666cfaa`; separate shared-activation authorization recorded in `b5261392-6a6a-4d42-b8a4-b24ae5d70b13`. This remains an acceptance candidate, not a claim that every account flow passed.

## Implemented

- Exact 12-path private hint-image delta from `ecba3e7ae7c9085a9e8b71608f75ceebbe13e3a0`, retaining the unified Life Journey/Person identity and existing state RPCs. Upload/read/detach/retry use the private bucket and ownership-checked server capabilities.
- Functional Preview guard permits the existing authenticated product operations, with server JWT/ownership/RLS, field/path allowlists and negative tests. Old preview branches keep their previous restrictions. Production/development/missing environment are denied for this branch.
- One existing Raziel session uses a same-origin API that forwards the caller JWT once, together with a cryptographically verified Vercel Preview identity. No provider retry, alternate engine, role elevation or service credential in the browser.
- Canonical ELS search/verify and bounded public numeric Heichal research reach the existing engines. No whole ELS or community branch was re-imported.
- Home left Companion/context rail is suppressed as requested. Shared ribbon/Now feed, cipher timing and navigation remain. Loading, partial failure and genuine empty feed states are distinct. World images and the pending ribbon reserve space; expression focus and precise contextual return are retained.
- Google/Facebook callback route and one-time local return handling are implemented. The actual callback allowlist must still pass independent verification before the providers are presented as ready.
- Broken internal calculator/gallery links use existing native routes. Unsupported legacy-only paths show an explicit link to the live reader instead of reloading the Preview indefinitely.
- The historical UI hold on Golden World journey 878 is lifted in this functional Preview, following the user's current direction. Other builds retain their prior availability profile. The journey still derives routes only from canonical public Topic rows; no path, public source or publication is invented.

## Approved shared activation — applied

The user separately approved the exact proposal at commit `609b5c34bb5ae78cdb9a762811bc3d43a40ff7bc`. The private-media migration was applied as migration `20261031232920`; `media-upload-intent` v3 and `ai-analyze` v91 were deployed with `verify_jwt=true`. Retrieved live sources exactly match the approved artifacts. See [activation receipt](evidence/shared-activation-receipt.json) and [proposal/rollback](shared-change-proposal/README.md).

The private `submission-inbox` bucket, global site flags, ownership, account roles and Production website settings were preserved. The deployed Preview verified its actual Vercel token signature through the pinned issuer JWKS. Anonymous AI/private-media requests remain denied. No private hint image was uploaded to the live database as a test.

## Real data and actions

This Preview connects to canonical `linswmnnkjxvweumprav`. It is not a disposable test database. Signed-in users can perform the product's existing authorized saves, private Life Journey operations, image operations, community actions and own-profile changes. Explicit community publication/messages can affect real recipients/public data; no such test content was created automatically. Private material remains private unless the existing explicit, authorized publishing flow is used.

Guest public pages use real read projections. Real ELS and numeric research requests can create their normal canonical trace/quota receipts; they do not call a model or publish content. Model-assisted Raziel calls can consume the signed-in user's budget. Fable remains an explicitly cost-confirmed administrator operation with job receipts and idempotency, not an automatic page-load action.

## Evidence and limitations

- Private-image client tests and actual network-isolated PostgreSQL migration/ownership tests passed. Offline contract tests use clearly identified synthetic principals/providers and do not prove a successful live user operation.
- Matched World CLS measurements used the actual flight image, three normal mobile runs, three delayed-source/image mobile runs, and delayed 320/1440-width runs: before maximum `0.2373097738`, after maximum `0.0726223670`; all eight after runs meet the unchanged `0.1` threshold. See [raw measurements](evidence/cls-before-after.json).
- Browser acceptance uses a deny-by-default network harness, reviewed RPCs translated to read-only GET transactions, public image placeholders, and explicitly synthetic Bennett/888/catalog fixtures. No draft was published to satisfy a test. Repeated full-run and focused results are preserved separately; this is not the complete Isolation gate.
- Live ELS returned an executed canonical search result; live numeric Heichal returned a real Result Bundle without a model. Private-media anonymous access returned 401. These prove their stated server paths only.
- Protected hosted checkpoint `2564105d` opened all eleven canonical guest routes without page JavaScript errors or horizontal overflow, verified server identity, and denied anonymous AI. Number-page semantic completion and authenticated flows require separate evidence beyond an opened route.
- The user's report that the exact OAuth callback was added is recorded. Fresh Google/Facebook start-and-cancel probes still returned to the Production Site URL, whereas the canonical-origin positive control returned to `/auth/callback`. No provider account was authorized. The connector cannot read or edit Auth URL configuration. Social signup/login/logout/account-switch are not accepted yet. Email OTP delivery and account creation were not tested by sending test emails.
- A new single Fable job (33×41, at most 25 suggestions, USD2 maximum, same job ID for polling, no automatic second attempt) is explicitly approved. **It has not been started**: no real authenticated administrator session is available in the test browser. The older two completed jobs do not consume or prove this new trial.
- Real authenticated Person/save/image/community/Raziel flows remain to be exercised by an authorized account. Never treat the offline fixtures as proof of those actions. A3 and the full Isolation gate remain open; no live-server A3 was run.

## Preservation

See [original ELS base audit](els-preservation-audit.json), [current two-source comparison](els-preservation-current-delta.json), and [World backup decisions](world-backup-review.md). The original `165 identical / 9 adapted / 4 excluded` count concerns the later `4ea9ac37` handoff against the c2f base, not the older `548ef03f` source or every later product change. The canonical engines remain shared. Unaccepted World backup UI/content deletions were not imported.
