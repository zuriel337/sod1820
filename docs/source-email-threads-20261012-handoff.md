# Email source threads: branch handoff

Task: `SOURCE_STREAM_EMAIL_THREADS_MEDIA_20261011`.
Owner: existing Research Intake / writer material / Person privacy; GPT data, original Claude presentation.
Original base: `origin/main` 737ee9aa; continued on current main 96bd0b30 (2026-10-13).
No visual files changed. Coordination stays in the existing work_log; no user relay or dispatch claim.

## Implemented and tested on this branch

- Existing signed `email-inbound` retains complete bounded source text/HTML in private `inbound_emails`; rejects over 2 MB explicitly. Provider failures now return retryable 502 rather than acknowledging an empty source. Existing inbox read/reply flags survive hydration of older metadata-only rows.
- `meta.source_email_v1` records deterministic message IDs, parent/reference IDs, original date separately from arrival, quote omission, text availability and image attachment provider locators. Raw source stays separate from sanitized projection. The unique existing message index handles concurrent delivery; no new table or schema.
- Exact sender matching requires a unique server-owned approval AND provider DMARC pass. Configuration is absent/closed by default. This does not populate contributors, verify research, publish, or use recipient/display-name matching as identity evidence.
- Pure `sourceEmailThreads.js` supplies the compact thread shape requested in work_log 52e38c3b. One thread row, root and individually attributed replies, missing-parent state, dedup count, unverified source state, stable arrival ordering. `fetchSourceEmailThreads()` explicitly returns unavailable until a server reader is supplied. Server pagination must return complete threads.
- Synthetic fixture: `test/fixtures/sourceEmailThreads.fixture.mjs`. Import `sourceEmailRows`, feed into `projectSourceEmailThreads`. This is explicitly non-production, with no real names/addresses and an unavailable-image case. It is not an image-load acceptance test.

Run on Node 24:

```sh
node --test test/source-email-threads.test.mjs test/email-inbound-runtime.test.mjs
```

22 tests pass on Node 24.19.0, including the actual Edge handler with mocked network/database boundaries. No live sender, mail send, production write, or end-to-end ingestion claim.

## 2026-10-13 continuation

- Rechecked the receiving domain and existing webhook: receiving enabled, email.received subscription enabled. Live private inbox contains 50 historical rows, last arrival 2026-09-26 20:35 UTC, and zero source_email_v1 rows. This does not show continuous Gmail delivery.
- References-only replies now retain the last RFC reference as their parent when In-Reply-To is absent/invalid, with explicit parent_basis provenance. An explicit parent always wins; source titles never identify a thread.
- Reply presentation uses original source dates with arrival fallback; parents precede children even when source clocks disagree. Last activity stays based on arrival, so a newly received reply surfaces the conversation.
- Resend retrieval explicitly requests html_format=cid to avoid repeating inline base64 images in quoted HTML. Attachments remain private provider references until durable media admission exists.
- Tests cover reply-before-original recovery, References fallback and direct-parent priority, reversed import order, contradictory clocks, held-parent isolation and identical-title separation.
- The Gmail plugin does not configure forwarding settings. After explicit user browser authorization and Google device approval, a bounded persistent Gmail forwarding filter was configured through the existing Gmail settings (receipt below).
- Current-main comparison: email-inbound is unchanged from the original base; the other six scoped paths are absent on main. Only these seven paths are transferred, preserving all intervening main changes. Tests run in an isolated seven-file checkout; full application build/visual acceptance are not claimed.
- External references: https://resend.com/docs/api-reference/emails/retrieve-received-email (html_format=cid, provider authentication); https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages (message/thread identities and reply headers).

## Exact remaining work before LIVE

1. Persistent Gmail delivery CONFIGURED and synthetic transport roundtrip VERIFIED (see receipt below). The saved filter admits the 13 exact identities from the already-approved source message; global forwarding remains disabled, originals stay in Gmail and historical matching mail is not forwarded. The real receiving API must still provide provider-authenticated sender results for public admission; the current connector does not expose those fields, so DMARC/public admission remains unverified. Header/body sender claims never substitute for provider proof. No unknown future participants are approved.
2. Private approval provisioning: use only the 13 exact identities from the approved source message in work_log 4630190d, plus existing canonical Zvi scope. Two of those 13 currently match active contributors by exact email. Others need canonical identity resolution; do not guess or create account-claim evidence. `EMAIL_SOURCE_APPROVALS_JSON` schema is `[{email, active:true, author_key, author_display, contributor_id?}]`, server only. No real addresses are committed or printed in public handoffs.
3. Approved source admission into existing channel_updates and its server-owned proof/hold boundary; a bounded sanitized public reader; durable authorized image transfer/thumbs/content dedup. The private inbox metadata added here is NOT a public-access grant. Image references deliberately have unavailable URLs until that path exists. HTML-only projection is explicitly unavailable; raw HTML remains preserved privately.
4. Original Claude owns visual rows against the fixture; coordination uses the existing journal, never user relay. Preserve four Home rows, compact frame/bottom bar and source/unverified labels. Wire live data only after step 3, then verify desktop/mobile, images, missing-parent/retry/hold cases with an actual approved source round trip. A passive journal handoff does not prove delivery or implementation.
5. Release boundary remains branch/preview only. No function deployment, production, main merge, permission change or live product-data mutation was performed. Existing legacy email-ingest (900-character broadcast) and WhatsApp reader remain unchanged; neither should be advertised as the new producer.

No automatic editorial queue is proposed: approval remains the bounded author admission already given, distinct from research verification/publication.

## Live bounded delivery receipt — 2026-10-13

- Explicit user authorization for browser configuration and 2029 continuation; Google sign-in and device approval completed.
- Existing destination verified through Google's destination confirmation page; visible success confirmed.
- Gmail settings read-back confirms exactly one new filter: From equals the 13 approved identities, action forwards to the existing private intake address. Sender addresses, account address and verification tokens are intentionally not copied here.
- Global forwarding read-back remained disabled; no archive/delete/read-status changes were added, and old matching mail was not forwarded.
- Synthetic original and reply sent only to the owner's own connected Gmail account for connection testing. Gmail IDs: 1a133fdcdfbb84f3 and 1a133fe4228f7886; both share Gmail thread 1a133fdcdfbb84f3.
- Existing Resend webhook delivered both into private inbound_emails: rows 56 and 57, at 06:40:41 and 06:41:12 UTC (09:40:41 and 09:41:12 Asia/Jerusalem).
- Row 57 in_reply_to equals row 56 message_id; reply text is present. This proves continuous filter transport and preservation of the original reply relationship into the existing private carrier.
- The test records remain private, explicitly technical tests, and must never be admitted as research or source stream items.
- This is NOT a 2029 UI/public source receipt. Source approval provisioning, provider identity proof, channel_updates/proof/hold admission, normalized reader, admitted media/thumbs and original Claude visual integration still remain. Existing live email-inbound is unchanged; the new normalization remains draft branch-only.
