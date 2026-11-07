# PG2 addendum — `world-corpus-continuation-2029`: Zvi audit status (DRAFT)

> **DRAFT / EVIDENCE — not an owner contract, not an approval, no gate is passed.** Branch-only (`claude/sod1820-ci-failures-diagnosis-6z9ej6`), not in `main`. Contains aggregate numbers only: no personal data, no secrets, no addresses. Index: [README](README.md).

Decision recorded: the test **stays inside the PG2 proof**. It is **not** marked PASS and **not** marked obsolete.

## What the evidence says (read-only)
| Question | Finding |
|---|---|
| What does the test check? | A committed snapshot of the World corpus continuation (2,891 remaining ids / 73 bounded pages, 394 engine inputs with parity receipts, identical-text groups, identity collisions, media-only rows) and that the Zvi clarification draft has precise locators, no automatic send, and no attribution of extraction errors to Zvi. Hermetic: reads one committed doc and one script. |
| Where does the audit come from? | `WORLD_CORPUS_CONTINUOUS_REVIEW_20261026` / `WORLD_ZVI_CLARIFICATION_CLOSEOUT_20261026` (work_log `3419598f…`, 26.10.2026, "closed for handoff"). |
| Was the clarification sent / answered? | The draft says "to copy and send by ZURIEL; no automatic message was sent". The closeout row states that **original Zvi questions 4–7 are unanswered** (as of 26.10). A keyword search of work_log found **no later row** mentioning the clarification, the audit script or the continuation (searched up to 7.11). So: **status unknown — nothing shows that it was sent or answered**. |
| Is the underlying work still open? | The closeout row lists the frozen continuation (2,891 / 763 sources: 330 manual scopes, 2,561 not yet manual) as "not fully verified", 35 ELS needing canonical replay, 431 media-marker rows not unique images, and an unresolved regression runner. |
| Test history | Created/last touched once, in `2149cb748` (4.11, "integrate approved Community times and lock release acceptance tooling"). No CI history (never wired). |
| Stability | 5 consecutive local runs: 12/12, 3.7–4.4 s. On Node 24.21.0 in CI (proof branch run `42339878779`): the seven-test step passed 71/71 in ~5 s. |
| Maintenance cost | Snapshot-bound: it fails closed if the snapshot, the clarification draft or the audit script change. A deliberate update by an owner is required whenever the audit advances. |

## Open questions only ZURIEL (or the World/Research owner) can settle
1. Was the Zvi message sent, and were questions 4–7 answered?
2. Is the continuation audit still an active deliverable, or was it superseded by later World work (the `world-*` family)?
3. Who owns updating the snapshot when the audit advances?

## Until answered
Keep the test in the proof run and in the proposed workflow diff (single line, easy to drop); make no claim about its value; revisit after the answers. Dropping it later is a one-line change to the same step.
