# SK2 — session expiry and sign-in return: requirement (DRAFT) and gap analysis

> **DRAFT / EVIDENCE — not an owner contract, not an approval, no gate is passed.** Branch-only (`claude/sod1820-ci-failures-diagnosis-6z9ej6`), not in `main`. Contains aggregate numbers only: no personal data, no secrets, no addresses. Index: [README](README.md).

Status: DRAFT. Not committed, not in the repository. Source of the requirement: ZURIEL decision in the session of 7.11.2026
(recorded in work_log task CI_G4_S2_COMPLETION_20261106). Refinements by the assistant are marked **[refinement]** and need confirmation.
No code was changed. SK2 is NOT marked PASS.

## Requirement (as decided)
R1. When a session expires, the page stays usable as a guest (same URL, same research context).
R2. A clear, non-intrusive indication that the person is no longer signed in, with a call to action (CTA) to sign in.
R3. Sign-in from any deep surface carries the FULL URL (path + query + hash) and returns to it exactly.
R4. An automatic redirect to the sign-in page is NOT required.

## Refinements needed to make it testable and safe
- **[refinement] R2 form:** a status line (`role="status"`), not a modal; no focus steal; no content hidden; dismissible; shown only when a previous session existed
  (so first-time anonymous visitors are not told they were signed out). Wording is a product decision.
- **[refinement] R3 carve-out:** "full URL" excludes credential/error fragments (`access_token`, `refresh_token`, `provider_token`, `id_token`, `error`,
  `error_description`, `type=recovery|signup|magiclink|invite`). Today's sanitizer drops fragments for exactly this reason; the requirement must say which
  fragments are still carried (everything else), otherwise the two rules contradict.
- **[refinement] R3 scope:** same origin only; no personal data in the URL (existing checklist line).
- **[refinement] in-place sign-in** (the header dialog): URL and research context untouched; counts as a return without navigation.

## Where it should live
`docs/g3-2029-cutover-acceptance-checklist.md`, section "Auth states" (it already holds "Session expiry is handled without a dead state" and
"Sign-in/out returns to the exact prior context"). Proposed text: `checklist_auth_states.diff` (not applied).

## Gap analysis against main@394a2ba8 (evidence: local build of the exact SHA, public-reading profile, synthetic viewer; no real account)
| # | Requirement | Observation | Evidence | Verdict |
|---|---|---|---|---|
| G-SK2-1 | R2 indication | After expiry (refresh rejected) the page becomes a guest silently: same URL, no notice, no CTA added | sk-pg SK2 observation (`afterExpiry`) | **GAP** |
| G-SK2-1b | R1 usable guest | Page stays usable, no dead state, no redirect | same | meets R1/R4 |
| G-SK2-2 | R3 via login route | `/login?returnTo=<path+query>` returns exactly (path + query verified) | SK2 pass | partial meets |
| G-SK2-3 | R3 hash | Only inert anchors survive (`^#[\p{L}\p{N}_:.-]{1,250}$`); a hash with `=`, `&` or `/`, or longer than 250 characters, is dropped. The OAuth `redirectTo` path drops every hash (`safeOAuthReturnPath`) | node run of `safeOAuthReturnPath` / `safePreviewOAuthReturnPath` on 10 samples | **GAP for non-inert hashes**; most product anchors seen in code are inert, so practical impact is bounded (not exhaustively checked) |
| G-SK2-4 | R3 entry points | On Topic, Number, World, Post, Posts index and Community a guest sees NO `/login` link; the only entry is the header button "התחברות לאזור האישי", which opens an in-page dialog and sends no returnTo | login_entries scripts, 6 surfaces at 390px | design choice; satisfies R3 only if in-place sign-in completes without navigation |
| G-SK2-5 | in-place completion | NOT demonstrated: the page closed ~4 s after the synthetic password-token call (no crash event, no `window.close` in src); cause undetermined | SK2b attempts | **INCONCLUSIVE** (harness or environment suspected) |
| G-SK2-6 | real expiry/refresh, real account, SW/edge, canonical-origin storage key | not exercised | — | **NOT TESTED** |

## Acceptance cases to add later (test design only)
1. Synthetic expired session on each deep surface: indication visible, CTA present, no redirect, no dead state, focus untouched.
2. Return exactness: query + inert hash + non-ASCII hash + hash with `=`/`&`; expected URL equals the pre-expiry URL (credential fragments stripped).
3. Negatives: foreign origin, `//host`, backslash, control characters, credential fragment, >2 KB URL.
4. In-place sign-in from the header dialog: URL unchanged, research context unchanged, dialog state updated.
5. One real-account run on the canonical origin (storage key `sb-…` in localStorage applies only at https://sod1820.co.il) before marking the row passed.
