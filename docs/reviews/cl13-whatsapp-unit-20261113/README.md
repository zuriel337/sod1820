# CL-13 — the active WhatsApp path as one release unit: `wa-raziel`, then `ai-analyze` (13.11.2026)

> **State: BRANCH-ONLY, for review.** Nothing here is applied, deployed or merged, and nothing here is an approval. Every Production step needs the explicit approval of ZURIEL for the exact function, the exact SHA-256 of the bundle and the exact drift state (CLAUDE.md 0.4).
> Branch `claude/cl13-whatsapp-unit-20261113`. **Historical base of the package: `aa0f6bc82`** (then `main` = Production, `dpl_FEzrHi2GLSpdHPN1cJDu6rhXtswZ`), kept as the base. **Current state (read 13.11): `main` and the live site are at `9be0c29fc`** (alias `sod1820.co.il` → `dpl_9paqBrZzi7D1GXow7LV8eWCjkpEF`, source `9be0c29fc`). No file under `supabase/functions` changed in between, so artifact A (built on the deployed Edge bytes) is unaffected; the branch is not rebased and merges cleanly into `9be0c29fc` (merge-tree).
> Machine-readable statement of everything below: [`unit.json`](unit.json). It is checked by `test/cl13-whatsapp-unit-pins.test.mjs`.
> **The release request is [`release-request.md`](release-request.md)** — one request, two steps (`wa-raziel` A and its verification, then `ai-analyze` A and its verification), with the SHA-256 stamps of artifact A. **Codex recommended A for both functions (13.11). The files of this branch are candidate B, not A: they must not be deployed.**

## 1. What this unit is, and what it is not

The decision (ZURIEL, 12.11): new personal memory between conversations is paused; an old memory is read only with a verified consent; a profile detail needs its own grant. Today `wa-raziel` (cron every 2 minutes) is the **only active collector** of personal memory, and `ai-analyze` is the second reader/writer on the WhatsApp path.

| Function | Order | What this unit closes (Edge level) | What stays open after it |
|---|---|---|---|
| `wa-raziel` v21 | **1** | Saving the message of every sender (linked or not); extracting and saving profile details, and the `[facts-captured]` record for details that were not saved; **the memory read of `wa-raziel` itself** (its own `getContext`, for the returning-user greeting and the group answers); the account-link message no longer says "everything is saved". The person is still answered. | **The read through `ai-analyze`** — the private WhatsApp answer is produced by `ai-analyze`, which reads the stored context of a linked sender on its own — and the legacy site path stay open until step 2. Existing rows stay. The database level (separate package). |
| `ai-analyze` v91 | **2** | **The read through `ai-analyze`**: the stored context of a linked sender entering the WhatsApp and the site answer; remembering the subject of a site question; `context_sources.personal` is true only when personal text really entered the prompt. | Existing rows. The database level. |

**Not part of this unit** (and not a substitute for it): `wa-hatishbi`, `wa-uriel` (U1 — CL-13 only, dormant; it does **not** close the active collection), `raziel-attention` (U2), `number-researcher` (U3, M0-coupled) and the database step (U4). **Order is unchanged: Edge before the database.** Both functions reach the memory only through database functions, so the Edge level closes them by itself; the policy function does not exist yet, and the code treats a missing policy as closed.

## 2. Sources and dependencies (what this unit stands on)

| Reference | What | Role |
|---|---|---|
| `origin/main` `aa0f6bc82` | the base of this branch | Production source; the tree here = main + the CL-13 hunks, nothing else |
| PR #1321 `4a406fed2` (frozen) | the Edge code, tests and release plan of package 1 (review point `0e928e34b`) | **Origin** of the CL-13 hunks. #1321 is not the continuation place of this unit; the checks below prove the CL-13 lines are identical |
| `claude/cl13-db-step-20261113` `c960600af` | the database proposal, its rollback and the five live-function fixtures | **The only continuation place of the database package.** The tests of this unit export these files from that commit by SHA; nothing of it is copied here. If the database step gets a new commit, `unit.json` → `source_references.database_step.sha` is updated and these tests re-run |
| `b4d5ec47` + `949c24ad5` (git history) | the exact deployed source of `wa-raziel` v21 | rollback source; base of candidate A |
| `edge-rollback/ai-analyze.v91.index.ts.gz` (committed) | the deployed `ai-analyze` v91 bundle, two comment lines redacted | rollback source; base of candidate A |

No other dependency: **no secret, no environment name, no M0 SQL, no database function that does not already exist live.** The only database function the new code asks that does not exist yet is `fn_personal_memory_policy_v1`, on purpose (a missing function = closed).

## 3. What can be separated and what must ship together (checked, not assumed)

I tested the claim of the earlier plan ("there is no build of wa-raziel / ai-analyze with CL-13 only") by building one.

* **Separable from M0 and N14 — yes, for both functions.** The CL-13 hunks are six regions of `ai-analyze` and five of `wa-raziel`; the M0-B hunks (paid-AI limits, guest identity, contact/group identifiers moved to environment names, `ZURIEL_WA` without a default) and the N14 hunks (`/number/<n>`) are different regions. The tree here has the CL-13 hunks only. `test/cl13-whatsapp-unit-pins.test.mjs` (test 9) proves it: the CL-13 lines of the tree equal the CL-13 lines of #1321, and every line that differs from #1321 is not a CL-13 line. Test 6: neither candidate A nor the tree contains `edgeCallerLimits`, `publicNumberPageHref`, `enforcePaidAiLimits`, `WA_RAZIEL_*` or a quota change.
* **Must ship together, inside one function:** `index.ts` + the new pure module `_shared/personalMemoryPolicy.js` (no import, no env; each function bundles its own copy, so the two functions are deployed independently).
* **Need not ship together, between functions:** none of the two needs the other. Step 2 follows step 1 only because step 1 closes the active collector; `ai-analyze` can be deployed first without breaking anything, but would leave the cron collector running.
* **Does not need:** the database step, D-CARRY (the carrying of N15 inside M0 Edge deploys — it stays open for `number-researcher` only), the secret `ZURIEL_WA` (A3), the N14 redirect check (ש8). Those were conditions of the *M0-coupled* build, because that build carried M0-B and N14.

### Accompanying changes — only in candidate B (what the tree builds on top of the deployed code)

`wa-raziel` v21 and `ai-analyze` v91 are **older than `main`**. Anything built from the tree carries that difference. It is measured, not estimated: `patches/*.accompanying-*.diff` are the exact differences, and a test applies them.

| Candidate | Accompanying change | Impact on the live path |
|---|---|---|
| `wa-raziel` **B** (tree) | **N6 navigation** (`patches/wa-raziel.accompanying-n6-navigation.diff`, ~80 lines + two new modules): explicit navigation requests ("give me the page of number 73", "open the world") are answered without a model with a link from a closed route table; a numeral-only message that answers Raziel's own clarification question is admitted instead of dropped; a failed send is queued in `bot_outbox`. | **Changes what a sender receives on the active path.** v21 has no navigation. It needs its own decision (it was never approved for deployment). |
| `ai-analyze` **B** (packaged tree) | **N8** — ten constants named (`MAX_*`) and the number-page base read from `NUMBER_PAGE_BASE`; **N9** — two modules enter the bundle (`publicReadingRelease2029.js`, `numberPageAddress.js`) as dependencies of the composer; **N10** — one esbuild rename (`MAX_FINDINGS` → `MAX_FINDINGS2`). | **None observable:** in Deno there is no `import.meta.env`, so the base evaluates to `"/2029/number"`, the literal that is deployed. B is 3,878 bytes larger than A (598,998 → 602,876). The two address comments are redacted in both A and B (as in the rollback artifact). |
| `wa-raziel` **A**, `ai-analyze` **A** | none | — |

## 4. The candidates and the recommendation

**Recommended: A for both** — *the deployed bytes + the CL-13 diff, nothing else.* A is not built from the tree: it is `git apply` of a committed diff on the exact deployed source. That is deliberate (the tree must stay mergeable into `main`, which already has N6), and it is checked: the diffs apply, and the result has the SHA-256 in `unit.json`. **B** is the alternative if ZURIEL decides to take N6 (and N8–N10) with it.

| Function | Candidate | Files in the deploy | SHA-256 of the entry |
|---|---|---|---|
| `wa-raziel` | **A** (recommended) | `functions/wa-raziel/index.ts`, `_shared/waGreen.ts` (= deployed), `_shared/waRazielRender.ts` (= deployed), `_shared/personalMemoryPolicy.js` (new) | `3b51d4f5db11…` |
| `wa-raziel` | B | A's files + `_shared/razielNavigationActions.js`, `_shared/siteLinkRegistry.js` | `922e150a52fe…` |
| `ai-analyze` | **A** (recommended) | `index.ts` (single bundled file, `verify_jwt: true`) | `9ad6ff905912…` |
| `ai-analyze` | B | `index.ts` from `scripts/package-ai-analyze.mjs` + the redaction | `f05cbb885a2c…` |

Assemble any of them: `node scripts/cl13-whatsapp-unit.mjs assemble <wa-raziel|ai-analyze> <A|B> <out-dir>`; check every pin: `node scripts/cl13-whatsapp-unit.mjs verify [--package]`.

## 5. Intermediate states (what is true between the steps)

| State | `wa-raziel` | `ai-analyze` | Evidence |
|---|---|---|---|
| Today | reads the stored context, saves every message, extracts profile details | reads the stored context, remembers a site question | `states` TODAY 1–2 (deployed v21 and v91 run on the throwaway database) |
| After step 1 (database not applied) | **closed**: nothing saved, no stored context, no `[facts-captured]` for an unsaved detail; person answered | **still open** (deployed v91): the WhatsApp answer of a linked sender still carries the stored memory; a site question is remembered | `states` MIXED 1a–1b |
| After step 2 (database not applied) | closed | closed | `unit` BEFORE 1–3 |
| Database applied before either Edge step (NOT the planned order) | closed by the database functions, **but** the deployed code still writes `[facts-captured]` for a detail that was not saved | closed by the database functions | `states` DB-FIRST 1–2 |
| Step 1, deployed `ai-analyze`, database applied | closed, no false record | closed | `states` MIXED 3 |
| After the database step | closed in the database too | closed in the database too | `unit` PAUSED 1–4 |
| Consent simulated for one person | message saved, no profile detail; a detail only with its own grant; never from a group | reads that person's own memory only | `unit` CONSENT 1–3 |
| Database rolled back | still closed (no policy function) | still closed | `unit` ROLLBACK |

## 6. Tests (all run on the real handlers; providers are mocks; the database is throwaway PostgreSQL)

`bash scripts/run-cl13-whatsapp-unit-test.sh` — counts are pinned (a skipped or missing test fails the runner):

* `test/cl13-whatsapp-unit.test.mjs` — **16 tests, both functions together, every candidate** (wa-raziel: tree + A; ai-analyze: tree source + the **A bundle itself** run as the deployable file): BEFORE (Edge first) → PAUSED (database proposal from `c960600af`) → CONSENT (simulated) → ROLLBACK. Every refusal has its allowed counterpart.
* **The link, on real code (new, 13.11):** the request that leaves `wa-raziel` is handed to a **real `ai-analyze` handler** on the same database, and its answer comes back and is what WhatsApp gets — not the canned AI answer of the old harness. The scenario runs for the four pairings {tree, A} × {tree source, A bundle} in BEFORE, PAUSED, CONSENT and ROLLBACK (`BEFORE 4`, `PAUSED 5`, `CONSENT 0`, and inside `ROLLBACK`), and on the deployed code and the mixed states in the states file (`TODAY 3`, `MIXED 1c`, `DB-FIRST 3`, `MIXED 3b`). It asserts the request (path, service key, `persona: raziel`, `surface: whatsapp`, the trusted WhatsApp channel and sender), that `ai-analyze` answered with its own model call, that its answer is the text sent to WhatsApp, and what each side stored or read in that state. Two mutations of this seam (no trusted channel in the request; the answer not taken from `ai-analyze`) are caught.
* `test/cl13-whatsapp-unit-states.test.mjs` — **13 tests** on the **deployed** code (v21, v91) and the mixed states of §5, including the link.
* `test/cl13-whatsapp-unit-pins.test.mjs` — **13 pin tests**: SHA-256 of every candidate and rollback file, A = deployed + CL-13, B = A + the committed accompanying diff, no M0/N14 in A, the CL-13 lines equal #1321's, the drift gate, and that `release-request.md` selects A for both functions, carries every stamp and states the baseline and the meaning of the rollback.
* The existing suites that use the two shared harness files (20 files) were re-run: all pass except `raziel-canonical-navigation-actions` test 6, which also fails on `main` (already recorded; not in CI).
* **Mutation checks** (a single edit to the code under test must fail the runner): 11 of 12 caught — write gate of `wa-raziel`, profile-fact gate, read gate, `[facts-captured]` for unsaved details, write gate of `ai-analyze`, read gate, fail-open policy module, and the same write gates edited **inside the A diffs**. One survivor is an equivalent mutant: `razielContextText` reading `=== true` vs `!== false`, because `gatePersonalContext` already makes the flag a boolean (defence in depth, not a behaviour).
* PostgreSQL 16.15 and 17.12 locally. CI result on the submitted head: in the PR and the journal record.

## 7. Overlap with M0 and #1321 (so nothing is reconciled silently)

Both M0 and this unit change `wa-raziel/index.ts` and `ai-analyze/index.ts`. #1321 carries the CL-13 hunks **and** the M0/N14 hunks of the same files, so after this unit is deployed, the M0 deploy of those two functions is a *different* diff on top of it (the CL-13 hunks are already live). Textual conflicts if #1321 is ever rebased on this branch: the two entry files, `test/helpers/ai-analyze-handler.mjs`, `test/helpers/wa-raziel-handler.mjs` (it gained the `aiHandler` option for the link test) and the workflow step list in `live-contracts-2029.yml`. Identical in both (no conflict): `personalMemoryPolicy.js`, `cl13-pg-bridge.mjs`, `personal-memory-policy-fixture.mjs`, `tests/sql/cl13_handlers_base.sql`. The reconciliation is mine to do when ZURIEL decides the order; #1321 stays frozen at `4a406fed2` and is not maintained.

## 8. Minimal conditions for each step (a request, not an approval; the full text is `release-request.md`)

1. The explicit approval of ZURIEL for **that function, the candidate, the SHA-256 of its entry file and the deployment** (not an approval of the other function, of M0, or of the database step).
2. **Drift gate**, read immediately before the deploy: `list_edge_functions` shows `wa-raziel` v21 `6167766567cc…` / `ai-analyze` v91 `2c8100726a5c…` (read again 13.11: matched). Any difference: stop and report.
3. The review of Codex on this unit.
4. The rollback accepted as a decision: redeploying the manifest source **restores writing on every message and reading without consent**.
5. For B only: a decision on N6 (and N8–N10).

## 9. Verification after each deploy (read-only), and what cannot be verified

* `list_edge_functions`: a new version, `verify_jwt` as before; `get_edge_function`: every file equals the SHA-256 in `unit.json`.
* Read-only SQL on `public.agent_user_memory`, **with the same filters before and after** (exact queries in `release-request.md` §3). The independent read of Codex on 13.11 was **1,086 rows, of which 471 with `agent = 'raziel'`**; these are not pass/fail values (legitimate traffic moves them), so they are **read again immediately before each step and the result after the step is compared with that fresh read**. **The count and the newest date are over all rows, new ones included** — a new row shows as a higher count or a later date; the date restriction exists only for comparing the stamp of the rows that existed before. The WhatsApp part of `raziel` (F1) must show no new row after step 1, the site thread (F2) after step 2. **No new row means that no save was observed; it does not prove that a write function was not called.** No live SQL was run for this unit.
* The person is still answered: one inbound message handled after the deploy has its `raziel_dm` row in `wa_bot_log` and an outbound reply (the navigation probe of the earlier request does not apply to A: navigation is N6).
* `ai-analyze` (step 2): a signed-in request produces no new `raziel` row with `channel = 'site'`.
* **Not verifiable from here:** `track_functions = none`, so RPC calls cannot be counted — "no writer was called" is shown by the absence of new rows and of the captured record, not by a call counter. No behaviour probe is run on a real sender.
* Not proven by this unit: that the database refuses other writers (the database step), that old rows are unreachable (the four direct readers are U1–U3), and anything about the 383 research-typed rows.

## 10. Open points (not hidden)

* The database step has an open Codex finding about content that the verification ignores; it stays in the database-step branch. This unit's handler tests ran against `c960600af` as it is; they do not depend on the research rule, but they must be re-run if the pin moves.
* The gates of the pull request run on the submitted head (draft PR, not for merge); their result is in the PR and in the journal record. The database-step branch has no PR of its own and no CI.
* Candidate A of both functions differs from the deployed bytes in the CL-13 hunks only — and, for `ai-analyze`, in the two redacted comment lines (the rollback artifact is the source, the deployed file is not readable byte-exact from the repository).
* `wa-raziel` v21's literal contact and group identifiers stay (M0-B removes them; it is deliberately not in this unit).
