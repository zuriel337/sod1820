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

Lab timings: see `lab-results.md` (written when the interleaved series finishes).

## Tests (local; this branch has no PR, so no CI run exists for it)

- Every node step of `live-contracts-2029` / `release-contracts-2029` (42): pass; the analytics browser tests pass when built like their CI job (`VITE_GA_ID=G-TEST`).
- Shell budget unit tests 5/5; proof that one new static import plus 6 KB in the frame makes `npm run build` exit 1.
- Storage boundary 6/6 (including: the real client is not in the built entry and is still emitted lazily); Realtime split 14/14; built-graph and first-load gates pass.
- Contracts that pinned the moved panel now read the frame together with its module; the account-entry and account-marker pins point at the module that owns them.
- Not exercised in a browser: opening the personal panel and an upload after the change (the CI browser jobs on a PR would).

## Interaction with #1358

The two branches merge without a textual conflict. Whichever lands second must fit the budget recorded by the first; that is the ratchet working, not a defect.
