# Cold startup — diagnostic checkpoint

TASK: PUBLIC_COLD_START_RELIABILITY_20261102. Base7c8d3bed9ebfa21d0db86f3420134d9f7a8e79a2; same isolated product branch `gpt/2029-public-reading-release-configuration-20261101`. BEFOREe35daf72-f905-4e46-8752-eeac89ad2833. Design/content/series proposal is paused, no classification or visual redesign belongs to this task.

The original60s cold failure is preserved under the preceding task. It had no complete bootstrap/CDP request trace, so its exact historical cause cannot be asserted retrospectively.

A controlled real-browser reproduction against the exact7c8 protected deployment, with the actual readonly Service Worker, held only the Google Fonts CSS response. While held, the document remained static with no `serviceWorker.register` call or content read; document readyState wasinteractive. Releasing the CSS after7s let worker registration begin at7.120s and activation complete at7.175s, followed by Home. This proves the current HTML's render-blocking external stylesheet can stall the module that installs the worker and starts the app. The fault-injected run uses routing and is NOT a native performance sample or proof of the original incident's exact network cause.

The source delta makes that same numeric-font stylesheet progressive (`media=print`, apply toall afterload; noscript fallback). It preserves family/weights/local fonts, content/layout and the worker/bootstrap/transport/Production guards. No imports or product data run before worker control. The font may fail without holding application startup. Acceptance of this checkpoint remains pending real native cold/warm runs, repeated matched timing, returning persistent profile and controlled stalled/failed stylesheet cases.

`native-startup.cjs` captures sanitized CDP requests/status/cache/worker/errors, passive worker lifecycle and DOM readiness. It stores no headers, response bodies, JWT, share links orHAR. Private returning-browser profiles stay under task-specific0700 `/tmp` directories and MUST NOT enter Git/evidence archives. Each deployment identity is checked before timed access; Vercel access cookies are installed only through the authorized protected-access path, without changing protection.

The first new harness run reached Home and returned in all14trials, but had a harness assertion comparing URL.search to a full `/?…` address; all14are retained as TEST_ASSERTION failures, not product startup failures or accepted green tests. The expected return was corrected to an exact full-URL comparison (including query/hash) and the acceptance rerun is separate. No failing source expectation was weakened.

No main merge/push, Production/alias/cutover/Edge, sharedDB/RLS/Auth/server/flags, credit/Cardcom/model/email or live product test writes. Remote checkpoint/protected Preview only. Final outcomes and all failures will be preserved in the separate existing evidence branch; this file does not claim final acceptance.
