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
- The Gmail plugin available in this session exposes mail reads/actions but no persistent forwarding-settings/filter configuration or server OAuth provisioning. One-off forwarding is not used as a substitute for continuous ingestion.
- Current-main comparison: email-inbound is unchanged from the original base; the other six scoped paths are absent on main. Only these seven paths are transferred, preserving all intervening main changes. Tests run in an isolated seven-file checkout; full application build/visual acceptance are not claimed.
- External references: https://resend.com/docs/api-reference/emails/retrieve-received-email (html_format=cid, provider authentication); https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages (message/thread identities and reply headers).

## Exact remaining work before LIVE

1. Persistent Gmail delivery: the connected Gmail tools are session readers, not a website producer. The existing Resend domain receives mail and its signed webhook points to email-inbound, but approved Gmail messages have no verified continuous route to it. Configure a bounded delivery route preserving Message-ID/reply references and authenticated original sender identity; forwarded text/display names are insufficient. Do not forward the entire mailbox or silently approve future thread recipients.
2. Private approval provisioning: use only the 13 exact identities from the approved source message in work_log 4630190d, plus existing canonical Zvi scope. Two of those 13 currently match active contributors by exact email. Others need canonical identity resolution; do not guess or create account-claim evidence. `EMAIL_SOURCE_APPROVALS_JSON` schema is `[{email, active:true, author_key, author_display, contributor_id?}]`, server only. No real addresses are committed or printed in public handoffs.
3. Approved source admission into existing channel_updates and its server-owned proof/hold boundary; a bounded sanitized public reader; durable authorized image transfer/thumbs/content dedup. The private inbox metadata added here is NOT a public-access grant. Image references deliberately have unavailable URLs until that path exists. HTML-only projection is explicitly unavailable; raw HTML remains preserved privately.
4. Original Claude owns visual rows against the fixture; coordination uses the existing journal, never user relay. Preserve four Home rows, compact frame/bottom bar and source/unverified labels. Wire live data only after step 3, then verify desktop/mobile, images, missing-parent/retry/hold cases with an actual approved source round trip. A passive journal handoff does not prove delivery or implementation.
5. Release boundary remains branch/preview only. No function deployment, production, main merge, permission change or live product-data mutation was performed. Existing legacy email-ingest (900-character broadcast) and WhatsApp reader remain unchanged; neither should be advertised as the new producer.

No automatic editorial queue is proposed: approval remains the bounded author admission already given, distinct from research verification/publication.
