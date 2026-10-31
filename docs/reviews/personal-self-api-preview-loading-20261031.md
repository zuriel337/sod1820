# Personal area loading in the Community Preview

The reported Page Editor error was caused by packaging: the Preview project deployed static assets with an SPA catch-all but no `/api/contributor-self` function. The private reader expected JSON and received the application document.

Add one thin Preview entry that calls the existing `contributorSelfHandler` with `previewReadOnly: true`, and exclude API paths from the SPA rewrite. There is no second API implementation, credential, Auth store or user selector. The canonical handler verifies the Bearer token through server `getUser`, derives the caller ID, scopes private reads to that caller, and supplies private/no-store/Vary Authorization/noindex headers. The Preview wrapper rejects every POST independently of runtime environment. The existing handler and database permissions remain unchanged.

The Preview package explicitly uses the canonical root package's ESM module mode, so the deployed Node entry imports the existing handler without a CommonJS/ESM mismatch.

The 2029 Preview Page Editor explicitly disables saving, and the existing public-page creation control is disabled there. An opt-in `readOnly` prop defaults to false for existing PageEditor consumers, preserving Legacy behavior. No other editor design or identity semantics change.

Verification includes the real Preview entry's unauthenticated JSON response and write denial, existing private ownership/session tests, integrated built UI loading/error/retry/reload/account-switch cases at 320/360/390/1440 across three themes, and the existing normal-build writer-personal chain. Hosted acceptance must confirm that the route reaches a deployed Node function and returns private JSON 401 rather than HTML; no real user's token or personal data is used for automated hosted tests. Source/integrated build, graph/lazy, isolation, hardening, Workspace and Legacy lock are checked.

Branch `gpt/community-auth-publish-media-20261031`, base `de35c97c7e093235de90125e4d7014a5ab17de70`. Exact remote commit/deployment and results are in the completion receipt and passive work log. No main merge, Production/Edge deployment, server permission/schema/RLS change or live product test write.
