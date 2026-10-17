# Recovery path of the on-demand story viewer and report form

task_key `CLAUDE_PERF_2029_RECOVERY_PATH_20261017` · branch `claude/perf-entry-cost-20261017`, continued from `25d938897de32b6215b1b8235fdd101c389e9543` (verified: local = remote, tree clean; the center had checked that head: Legacy isolation and the ten tests passed). Product commit **`6d52e5d7`**. State **BRANCH-ONLY**: no merge, no deployment, no PR, no CI, no Legacy behaviour / DB / RLS / switch change. D2/D5 and `NumberDrawer2029` not touched.

## What the person is offered after a failed load (viewer and report form alike)
| situation | offer | closing |
|---|---|---|
| the error names the failed same-origin `.js` URL and no retry has failed since the last success | **נסו שוב** (one in-place retry, the file asked for under `?retry=n`) | stays |
| the error names no URL | **רענון הדף** (no retry button: it cannot be promised to work) | stays |
| the retry itself failed (including a failed dependency file, which a document remembers) | **רענון הדף**, no retry button | stays |

The refresh is `window.location.reload()` run **only from the button's click**: same address, its query and hash kept. Nothing reloads or retries by itself: one attempt per click, the in-place retry is allowed once per failure series (it is re-armed only by a success), no timer, no loop. The loading and failure messages and the isolation (Legacy static, 2029 on demand) are unchanged in structure; the failure texts differ only by what is offered ("אפשר לנסות שוב" / "אפשר לרענן את הדף או לסגור").

Code: `experience2029/onDemandLoader2029.js` (`load.recovery()` → `canRetry`; the retry state moved into the loader so it is shared by every mount and survives close/reopen), `OnDemandComponent2029.jsx` (asks for the state when the failure is rendered, not before; `reload` always provided), `StoryViewerOnDemand2029.jsx` and the report-form error view in `SystemFrame2029.jsx` (two buttons at most, close always).

## Chromium facts this rests on (probes, kept in the test)
* A failed module fetch is remembered per URL for the life of the document (same URL after recovery fails; `?retry=1` loads).
* For a failed **dependency** of a chunk, Chromium's message names the **chunk** URL, not the dependency (`ContactGateway-….js`, probe with `interactionCorrelation-….js` refused). The retry therefore asks for `chunk?retry=1`, whose dependency is still remembered as failed, so it fails once more and the person ends at the refresh. The dependency is never executed on its own.

## Tests — `test/story-viewer-isolation-2029.test.mjs`, 19/19, 0 skipped
New or changed (each for both the viewer and the form unless noted), Chromium 141, loopback only:
* after a failed load: retry offered and no refresh offered, the app is intact, close works, the next open recovers;
* the retry button asks exactly once more and opens it;
* **a retry that fails** → refresh and close, no retry button; 1.5 s of nothing: request count unchanged (no loop), still one document (no automatic reload), same document marker; a later failed open also shows the refresh; **the click** reloads once, `page.url()` is the original `/?utm_source=recovery#top` (query and hash kept), a new document, and the surface then opens;
* **an error that names no URL** — produced by a file that throws `Importing a module script failed.` when it runs (the message shape of Safari). **This is a simulation of the message in Chromium, not a Safari test** — refresh and close offered, no retry; no loop; the click reloads at the same address;
* **a failed dependency file** (form only): the form chunk arrives, its dependency `interactionCorrelation-….js` is refused → error, one retry may be offered (it was: the message names the chunk), after it only the refresh; frame intact, no loop, close works, refresh restores the surface once the dependency is reachable. The viewer has no dependency that loads only with it in this build (asserted from the built chunk and the files the page had loaded before acting), so a dependency failure cannot occur for it; the test fails if that changes;
* kept from before: first open, slow load (status, closing, no late reopening), contract/loader/real-build tests, the Legacy build and Legacy rail cases.

Old-failing / new-passing (run): the five new recovery tests (failed retry ×2, no-URL ×2, failed dependency) **all fail on `25d93889`** (0 pass / 5 fail — there is no refresh button there) and pass at `6d52e5d7`.

## Full isolation
The test servers were not registered with the existing policy, so the center's isolated run denied the browser's connections to them. Now `serve()` calls `permitLocalServer(server)` (the existing function, no change to the policy) when `SOD_CI_ISOLATION=1`, the browser takes `browserArgs` of `scripts/ci-isolation/policy.cjs`, and the file asserts the audit is clean at the end (`auditCheckpoint` / `assertClean`). Without the isolation environment the file runs as before.

| run | exit | tests | audit bytes |
|---|---:|---|---:|
| `node scripts/ci-isolation/run.mjs -- node --test test/story-viewer-isolation-2029.test.mjs` at `6d52e5d7` | **0** | 19 pass / 0 fail / 0 skipped | **0** |
| the test file of `25d93889` under the same wrapper (negative control) | 1 | 4 pass / 6 fail | 564 (`connect-denied` to the unregistered loopback servers) |

Files: `results/isolated-run-new.txt`, `results/isolated-run-old-file-negative-control.txt`. The same file also passes without the wrapper (19/19).

## Bundle figures (same method as `../storyviewer-isolation/README.md`)
2029 `Sod2029Shell`: 211,116 raw / **63,412** gzip (was 210,509 / 63,190 at `5f52ab00`: +222 B gzip for the refresh button and texts; base 70,416). Viewer chunk 7,605 / 3,029, form chunk 21,320 / 7,065. Legacy start-up graph: 60 files / 2,355,004 raw / **687,979** gzip (base 687,984): unchanged; no `StoryViewer-*` chunk in the Legacy build. Bytes only, no timing.

Other checks at `6d52e5d7`: `npm run build` ok, `test:2029-bundle-budget` 5/5, `test-2029-system-frame`, `test-entry-contextual-learn-2029`, `test-issue-report-canonical-emitter`, `test-2029-control-plane` pass; D1 6/6, `early-primary-read` 11/11, frame/home/companion tests pass except `companion-2029-public-source-shortcuts` #8, which fails identically on the unchanged base.

## Not tested / limits
* **Chromium only.** Firefox and the real Safari were not run; the no-URL case is a message simulation. In a browser that does not remember failed module fetches, hiding the retry when no URL is known costs an in-place retry that might have worked; the refresh is offered instead.
* A browser that names a dependency (not the chunk) in the error would make the retry import that dependency under a query string and fail at the missing default export (then the refresh); not observed in Chromium, not tested elsewhere.
* The refresh drops in-page state (by nature); the form's own typed text cannot be lost by it because the failure is the form not loading.
* No timing claims, no real corpus, no signed-in user, no phone, no hosted Preview. D2/D5 and `NumberDrawer2029` (same lazy-import weakness, not changed) untouched.

## Ownership
BEFORE `9932b4fa-1f47-40a7-b97e-0fe6e3b653d7` written before the change (scan of `work_log`: no overlapping writer). The AFTER row releases the scope.
