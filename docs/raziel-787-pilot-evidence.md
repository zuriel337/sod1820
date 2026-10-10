# Raziel 787 pilot — branch implementation and evidence

This is implementation evidence, not a new owner, memory system or project roadmap.
Source handoff: `bcff6465-7ca7-4424-947e-34034967beac`; coordinator ACK:
`ded3fec6-0c14-4ded-8aab-0921525da1c8`; implementation claim:
`78aa775e-0f8e-4489-831d-8184c277e931`.
Baseline main: `4b62216d89b3fada1701ef21f8753f5fffaa9e0b`.

## Result

The opt-in pilot connects a source-linked human interpretation to the next
number-researcher request and to a fresh session's next selected question.
It uses `research_objects` and the existing private Research Path RPCs.
The temporary admin projection is inside RazielRoom; the adapter is independent
of that legacy surface and can be consumed by 2029. A full 2029 experience is
not implemented by this pilot.

The pilot requires 1–8 existing private, non-Person-owned `question` objects for
value 787 from one exact source reference. The human chooses their order. No
questions, interpretations or corpus rows are seeded in production by this work.
An arbitrary user-provided reference is checked against live bounded source,
kind, value and privacy filters before use. Progress measures these selected
questions only; it does not measure corpus coverage or completion.

## Existing owners and storage

- Raziel Companion v3 / Routing v2 consume the context. Strategy v17 owns the
  source-linked questions and bounded plan. Workspace v5 owns Research Objects
  and private Paths. Truth v3 keeps hypothesis, approval, verification and
  publication separate. Person v6 filters private material before composition.
- `/auth/v1/user` and caller-JWT `rd_is_admin` run before privileged reads.
  Anonymous accounts, missing/forged tokens and service-key callers are denied.
  Client role, actor, user_ref and metadata never grant authority.
- `research_artifact_save` writes a **candidate hypothesis** with a namespaced
  source/question/predecessor/reason/domain/scope/exception envelope. Creator
  comes from verified identity. Actual Human-Gate approval comes from the
  existing DB review's `approved_by`/`approved_at`, not supplied metadata.
- Hypothesis replacement uses save candidate → reject predecessor → approve
  successor → append owned Path reference. The old object is preserved. Here
  `rejected` on the predecessor means **replaced by the linked hypothesis**, not
  that the source evidence is false. The successor carries the reason/link.
- The gated `fn_research_object_correct` does not support hypotheses/questions
  and is not bypassed or generalized. No reserved revision fields are written.
  No canonicalization, publication, preference activation or model training.
- Path representation stores the selected question IDs and decision references;
  interpretation content remains in Research Objects. On every resume/model
  context load, current status, actor, source, domain and successor links are
  revalidated. Missing/rejected/superseded decisions or pending replacements
  reopen the affected question. No obsolete interpretation is reused.
- Mutation RPCs carry the verified caller's original JWT. Private Path ownership
  is enforced by existing RPCs. Research reads are restricted to the selected
  source, value 787, question/hypothesis, private, and `owner_person_id IS NULL`.
  This pilot does not enable personal research for another user.

## Failures and limitations

The write sequence spans separate existing transactions. It is **not atomic**.
Failure after rejection can leave no active interpretation; failure after approval
can leave an approved successor awaiting a Path checkpoint. The API reports the
failed stage and `partial_write_possible`; it never reports completion or advances
the question without a confirmed checkpoint. Retrying the same operation verifies
deduplicated provenance/status and the payload-bound save key. Concurrent distinct
replacements cannot both approve after rejecting the same predecessor; the loser
can leave an inert private candidate. There is no automatic destructive cleanup.

After a page reload, a pending candidate/approved operation can be recovered from
its existing source/question/creator/request/fingerprint metadata. Load remains
read-only and does not include that uncheckpointed operation in answer context.
The panel displays the interpretation, reason, scope and exceptions and offers an
explicit completion button that reuses the persisted request ID and original
artifact, with the current owned Path revision. This also covers the first
interpretation without a predecessor. A single approved orphan takes precedence
over inert candidates; ambiguous operations are not silently selected. No new
retry store, browser persistence or automatic approval is introduced.

A correction must have a different normalized statement identity. A scope/reason
change alone cannot silently update the old artifact; same-identity replacement
fails explicitly. General atomic hypothesis revision remains a future owner gap.
This bounded adapter is not a replacement for that primitive.

Default resume uses the owner's latest Research Path. If another task becomes
latest, the user can provide the exact saved Path ID. There is no global interview
registry/cursor or new browser persistence.

The general Metatron definition/engraved-fact adapter and broader learned-pattern
activation gaps from the investigation are not solved here. The pilot injects a
separately validated, explicitly attributed context pack and keeps its exceptions.
Personal-read quota policy is unchanged.

## Evidence levels

| Level | Evidence | What it proves |
| --- | --- | --- |
| Live metadata | Existing RPC definitions, grants/RLS, current owners and main | Primitives/authority exist; not deployed Edge/UI behavior |
| Mocked runtime | Actual number-researcher source in VM + real shared modules; synthetic identity/DB/provider | Correction is wired into the next response context; replay, resume, denial and failure behavior |
| Local browser | Actual React panel + transport + actual endpoint harness; mocked SDK/DB/provider, external egress blocked | Visible correction → mocked answer → new browser context's next question; failed save reopens question |
| Full live experience | **NOT VERIFIED** | Requires authorized real source/question fixture, real authenticated session and live model/user acceptance after separate release authorization |

The synthetic 787 scenario separates year/holiday/thanksgiving interpretation from
historical assertion. Same-post matches are one source, not independent witnesses.
A blessing match does not establish that it was uttered on the plane. Engine facts,
Event Profile, display rank and human Gold/Diamond remain distinct.

Before: with 45 exchanges, both existing loaders returned history ending at 39 and
prompt history ending at 11. After: the latest 40/12 exchanges both end at 44, then
render chronologically. The pilot also preserves decision reason/source/scope in
the response context and validates the next question independently of chat summary.
Conversation persistence checks the HTTP result; a failed save does not erase an
answer or claim it was persisted. RazielRoom retains candidates when review fails.

## Reproduce without live dependencies

```sh
node --disable-warning=ExperimentalWarning --test test/raziel-interview-pilot.test.mjs
node --test src/lib/research/researchLearningPolicy.test.js
node scripts/test-research-path-resumability-runtime.mjs
npm run build
```

Pilot: 41 behavioral tests. Learning policy: 19 tests. Research Path acceptance:
PASS. Legacy and 2029 production builds: PASS. Known pre-existing bundle warnings
are not release failures.

Optional local browser acceptance requires Python Playwright with Chromium and
the normal npm dependencies, without adding browser packages to the project:

```sh
python -m playwright install chromium --only-shell
SOD_PILOT_ARTIFACT_DIR=/tmp/raziel-787-browser \
  node --disable-warning=ExperimentalWarning scripts/verify-raziel-787-browser.mjs
```

It writes a JSON receipt and four screenshots, including a fresh context completing
the pending save after a failed checkpoint. The mock Supabase SDK is supplied
only by the verification server; production source is not replaced. All remote
browser requests are blocked. Endpoint I/O uses synthetic fetch; unknown endpoints
fail the test even if product code catches them.

Session artifacts were captured at `/workspace/artifacts/raziel-787-pilot-20261010`:
`before-after.json`, `browser-report.json`, `corrected-answer.png`,
`fresh-session-next-question.png`, `failed-save-reopens-question.png`.
`fresh-session-completes-pending-save.png` records the explicit reload recovery.
These local files are not asserted accessible to a remote reviewer; the harness is
committed so evidence can be reproduced.

Independent design review was received in work_log
`c6352349-56ff-4b98-9cef-7660b1c002d7` (MINIMAL_FIXES). It accepted existing
hypothesis/review/Path primitives conditionally and identified the ordering,
deduplication, actor, scoped-read and partial-failure invariants implemented here.
Exact-head specialist review is recorded separately at completion.
The first head review `50b99187-66b9-4a94-87ac-e076b86f80ff` independently ran
34 tests and requested the fresh-session pending-save recovery described above
(F1, MINIMAL_FIXES); seven additional behavioral tests cover that correction.

Release state: **BRANCH ONLY — NO MERGE — NO DEPLOY**. No live product writes,
schema/grant changes, corpus scan or live model calls were performed for validation.
