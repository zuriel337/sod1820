# Hybrid Preview foundation — local-only

Status: `BRANCH_ONLY · LOCAL_ONLY · NOT_DEPLOYED · NOT_PRODUCTION_APPROVED`

This worktree combines two exact inputs without replacing either one:

- live Legacy anchor: `gpt/legacy-now-yaniv-20261016` at `0f3443a9a4dcb78e935d74f2a937c47dbf35d18c`;
- 2029 acceptance candidate: `gpt/perf-unified-wave4-preview-20261018` at `e994cb67120fa0f735ab3859aa5acba67e24adba`.

Both commits must remain ancestors of the hybrid HEAD. The local build creates two isolated documents: `legacy.html` and `2029.html`. The route policy sends the current acceptance set to the 2029 document and sends every unknown or unapproved path to Legacy. `/code` and `/els` explicitly remain Legacy. The route list describes Preview coverage; it is not approval to move those routes in Production.

The local server binds only to `127.0.0.1`, marks all documents `noindex`, sends `no-store`, and injects an early local read-only transport guard. The receipt intentionally says `hostedPreviewReady: false`. A hosted Preview requires a separately reviewed service-worker attestation and Vercel configuration. Production requires the full release checklist and explicit Human Gate approval.

Posts and World product files are outside this branch's implementation scope. Parallel work on their content and product behavior is integrated only after its own review.

`route-inventory.json` is the generated static declaration inventory. It currently records 129 Legacy declarations plus the terminal wildcard, and 28 non-wildcard 2029 declarations. Twenty-five patterns are in the 2029 acceptance set, `/code` and `/els` remain explicitly Legacy, and every other declared or unknown route uses the Legacy fallback. This is an operational migration inventory, not a new route owner or product contract.
