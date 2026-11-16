# Shell diet and shell budget — 16 November 2026

Branch `ccr-dcadb071-v1z5ol` (base `origin/main` `ea7257598`). Branch-only: nothing here is merged or deployed. Owners: the System Frame / Experience contracts (frame composition), the single Supabase client (`src/lib/supabase.js`), the build gates. No new owner, rule, store or threshold beyond the shell budget itself, which ZURIEL asked for in the session ("no session may dress the old shell again").

## Why

Every 2029 page downloads the entry graph and the System Frame before its own code. On a slow phone that chain is most of the wait before a Post's text appears (lab 15.11: about 700 KB before the text, the page is idle 73–79 % of the time). Since the 4.11 cutover the frame had grown from 54 to 64 static imports, one per capability, while the only byte gate allowed the eager graph to double.

## What changed (each commit can be reverted on its own)

| commit | change |
|---|---|
| `4e6e6e2b0` | **Shell budget ratchet** (`scripts/test-2029-shell-budget.mjs`, `scripts/2029-shell-budget-baseline.json`): five numbers of the production build (entry JS gzip and files, frame JS gzip and files beyond the entry, frame CSS gzip) may not grow past the baseline (1 KB / 512 B tolerance, 0 files, against a fixed baseline so small growths add up), and seven always-loaded files may not gain a static import. The baseline only moves down (`--lower`); a raise must be a recorded ZURIEL decision in its history, which the gate checks. Runs on every `npm run build` (postbuild) and in `perf-contracts-2029`. Rule stated in CLAUDE.md §9 and AGENTS.md. |
| `540d388ed` | **The personal workspace panel loads when it opens** (`WorkspaceProjection2029.jsx`, moved unchanged and in order). Its follow, inbox, profile, personal-card and saved-research readers leave the frame. Live loading state while it arrives; the personal home is requested with it (one round trip). |
| `e4bbb0d44` | **Storage loads on the first upload** (`storageLazy2029.js` behind a Vite alias, the same boundary as the reviewed Realtime adapter): the app uses only `from(bucket).upload` and `from(bucket).getPublicUrl(path)`; the public address is reproduced exactly (tested against the real client), uploads build the real client once from the same URL, headers and authenticated fetch. |
| `b6350e019` | **Two font preloads instead of four**: the opening shell's Noto Sans Hebrew Regular and the frame's Rubik Hebrew stay preloaded; the bold body face and the 34 KB Latin/digits face load on first use. |
| `4cce8af4c` | Baseline lowered to the measured values. |

## Measured bytes (production build, gzip)

| | main `ea7257598` | this branch | change |
|---|---|---|---|
| entry JS | 225,182 B, 18 files | 219,624 B, 18 files | −5,558 B (Storage client out) |
| frame JS beyond the entry | 93,108 B, 7 files | 75,789 B, 5 files | **−17,319 B (−19 %)**, 2 requests fewer |
| frame CSS | 34,709 B | 34,709 B | 0 (the workspace stylesheet stays: the Raziel panel uses one class) |
| font preloads in the document | 4 (67 KB brotli) | 2 (21 KB) | −46 KB competing with the entry in the first second |

Lab timings (Slow 4G, 4× CPU, cold, 8 interleaved runs per post per arm, `lab-results.md`): with all three changes the post's text appears 236–356 ms earlier and the LCP 270–314 ms earlier on two old and two `/post/` posts, against `main` code; CLS stays 0 and Total Blocking Time does not change. The font change alone is small and not significant on every post.

## Tests (local unless marked CI; the CI result belongs to the PR head)

- Every node step of `live-contracts-2029` / `release-contracts-2029` (42): pass; the analytics browser tests pass when built like their CI job (`VITE_GA_ID=G-TEST`).
- Shell budget unit tests 5/5; proof that one new static import plus 6 KB in the frame makes `npm run build` exit 1.
- Storage boundary 6/6 (including: the real client is not in the built entry and is still emitted lazily); Realtime split 14/14; built-graph and first-load gates pass.
- Contracts that pinned the moved panel now read the frame together with its module; the account-entry and account-marker pins point at the module that owns them.
- **Browser (added 16.11.2026, review package; real Chromium, the built public-reading artifact, its real worker, all hosts mapped to the local fixture; wired into `auth-browser-acceptance-2029`):**
  - `test/personal-panel-lazy-recovery-2029.browser.mjs` 4/4 (twice): the panel's code is not downloaded with the page; opening downloads it once and shows the live loading state while it arrives (phone and desktop); a failed download is recovered by the application's existing chunk recovery with exactly one automatic reload of the same address, after which the panel opens; a second failure in the same build shows the existing recovery screen ("הדף לא נטען", reload and home), never a blank page, and its reload recovers.
  - `test/community-first-upload-lazy-storage-2029.browser.mjs` 4/4 (twice): a Community attachment, the only upload the production worker admits for a member. The Storage client is downloaded on the first send, once; the file reaches Storage under the member's own folder with the member's session; the message carries the public address the real client builds. A failed download sends neither the file nor the message; the one automatic reload keeps the text draft and asks for the file again; the next send succeeds. A second failure in the same build: no second reload, the composer says the send failed and keeps the draft and the file; a retry in the same page fails without a new request in Chromium 153 (it keeps a failed module address until the page reloads), and the person's reload recovers.
- **Defect found by these tests and fixed** (`storageLazy2029.js`): a failed load of the Storage client was kept for the life of the page, and the upload threw a raw module address instead of returning the real client's `{ data: null, error }`. Now a failed load is not kept, and the upload returns a `StorageUnknownError` with a sentence for the person (the original failure on `originalError`). Unit test 7/7, including failure then success.
- **Behaviour to know (unchanged, existing policy):** a lazy part of the frame whose download fails goes through the application's chunk recovery (one automatic reload per build, then the recovery screen), the same as search and the "more" panel. A failed panel or Storage download therefore reloads the page once; the Community text draft survives it, a chosen file must be attached again (the composer says so).

## Interaction with #1358

The two branches merge without a textual conflict. Whichever lands second must fit the budget recorded by the first; that is the ratchet working, not a defect.

Measured on a local, uncommitted merge of this branch (`df7011ea3`) with #1358 (`221c26bc4`), `npm run build`:

| | baseline | merged | limit |
|---|---|---|---|
| entry JS gzip / files | 219,624 / 18 | 219,884 / 18 | 220,648 / 18 |
| frame JS gzip / files | 75,789 / 5 | 74,381 / 5 | 76,813 / 5 |
| frame CSS gzip | 34,709 | 35,170 | 35,221 |

The merged tree passes (#1358 makes its event-sequence panel lazy, so the frame JS goes down). The frame CSS uses 461 of its 512 B tolerance: the next stylesheet added to the frame will have to come with a reduction. The perf-contracts steps (Realtime split, Storage boundary, first-load graph, shell budget) pass on the merged build, as do the tests either branch changed, apart from failures that are the same on `main` code (see the handoff).
