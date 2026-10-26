# ELS Guided Discovery — יומן מבחנים v1

**Status:** specification ledger; no case below claims the proposed Guided capability is already
implemented.
**Program:** `els-guided-discovery-program-v1.md`.
**Runtime rule:** expected answers in this ledger must be withheld from runtime candidate sources,
fixtures and cipher-specific branches whenever a case is marked **holdout**.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `SPECIFIED` | inputs and acceptance are frozen; implementation not yet run |
| `BLOCKED_DATA` | the canonical evidence needed for the test is not available |
| `FAIL` | a bounded implementation run missed an acceptance condition |
| `PASS` | exact engine evidence, budget and presentation acceptance all passed |

For every `FAIL`, classify the primary cause as vocabulary, recognition/normalization, geometry,
ranking, matrix bounds or UI projection before proposing a change.

## GD-01 — Trump holdout: unexpected local expression

- **Status:** `SPECIFIED`
- **Class:** holdout, Level 1 → Level 2
- **Input:** saved verified axis `ד. טראמפ`, selected occurrence at skip `41865`.
- **Withheld:** `באשאטמינ`, its proposed segmentation and `שבררומי` must not be supplied as
  candidates, synonyms, fixture vocabulary or story words.
- **Known evidence for assertion only:** local exact letters `באשאטמינ` at skip `41864`; saved
  support also contains `שבררומי` at skip `41864` in reverse direction.
- **Expected behavior:** Band A discovers the exact letters from the matrix; the language stage may
  offer `באש | אטמין` while preserving the unsplit letters.
- **Interpretation boundary:** “באש אטמין/אסתיר” is a language reading. A relation to “אש אטומית”
  is phonetic/conceptual interpretation only and must never be displayed as the verified text or a
  prediction.
- **Pass:** no AI required for discovery; exact replay passes; `41865`/`41864` proximity is visible;
  exact, segmented and interpretive layers are distinct; no broad scan runs.
- **Failure diagnosis:** ____
- **Run evidence:** ____

## GD-02 — Colombia holdout: a story does not name the answer

- **Status:** `SPECIFIED`
- **Class:** holdout, Level 1 → Level 2
- **Input:** the Colombia story and the verified saved axis around skip `4545`, without the expected
  nearby terms.
- **Withheld:** `ספינת`, `יכל אש` and `אש אכלה` from candidate lists and prompt text.
- **Expected behavior:** bounded matrix-first discovery surfaces and ranks the exact nearby forms;
  Torah-language recognition can identify `ספינת` as a construct-like form without requiring it to
  be an exact standalone corpus word.
- **Pass:** at least the strong pair is verified and visible inside the inspected coverage; the
  system explains how each candidate was discovered; no special case for Colombia or `4545`.
- **Failure diagnosis:** ____
- **Run evidence:** ____

## GD-03 — Uranium: geometry can outrank numeric resonance

- **Status:** `SPECIFIED`
- **Class:** ranking, Level 1
- **Input:** verified `אורניום` saved cipher at skip `10101`.
- **Expected behavior:** the parallel relation between the verified Iran and United States terms is
  eligible to rank strongly even when the numeric pattern is removed from the scorer.
- **Pass:** geometry and independent semantic support explain the recommendation; `10101` may be
  shown as an additional structural observation, not as the condition that makes the result exist.
- **Negative check:** changing a decorative numeric signal cannot erase exact geometry.
- **Failure diagnosis:** ____
- **Run evidence:** ____

## GD-04 — Advanced reversal contract

- **Status:** `SPECIFIED`
- **Class:** Level 3 deterministic forms
- **Existing baseline:** the current Advanced UI already exposes whole-expression, per-word and
  last-word reversals through the canonical search path. This case protects that behavior while the
  forms are placed inside the Guided hierarchy; it does not authorize a second form registry.
- **Input:** `סוד החשמל`.
- **Expected forms:**
  - original `סודהחשמל`;
  - whole-expression reversal `למשחהדוס`, presentable as `למשחה דוס`;
  - per-word reversal `דוסלמשחה`, presentable as `דוס למשחה`;
  - last-word reversal `סודלמשחה`, presentable as `סוד למשחה`.
- **Pass:** forms do not run at Levels 0–2; explicit Level 3 execution records one derivation per
  form; duplicates merge without losing provenance; reverse reading direction remains a separate
  canonical field; every occurrence requires exact replay.
- **Negative check:** the system does not stack another transform merely because no result ranked.
- **Failure diagnosis:** ____
- **Run evidence:** ____

## GD-05 — Journey family scope and privacy

- **Status:** `SPECIFIED`
- **Class:** Journey integration
- **Input:** a synthetic private subject, two spelling variants, two family relationships and
  synthetic family numbers.
- **Expected behavior:** search the approved primary subject first; add only one explicitly selected
  relationship at a time; treat numbers as optional rank signals.
- **Pass:** no private value enters a URL, public log or generic fixture; no family expansion runs
  automatically; exact Journey return survives reload through the existing seam; no new store,
  Provider or Raziel session exists.
- **Failure diagnosis:** ____
- **Run evidence:** ____

## GD-06 — Honest empty result

- **Status:** `SPECIFIED`
- **Class:** negative control, Levels 1–2
- **Input:** a synthetic verified anchor whose Band A contains no candidate meeting the minimum
  language and geometry conditions.
- **Expected behavior:** show inspected coverage, “no strong local package found” and one optional
  continuation to Band B.
- **Pass:** no raw-pattern dump, invented synonym, AI call or silent widening; the absence is not
  described as proof that the full corpus contains nothing.
- **Failure diagnosis:** ____
- **Run evidence:** ____

## GD-07 — Ambiguous segmentation remains ambiguous

- **Status:** `SPECIFIED`
- **Class:** recognition/normalization negative control
- **Input:** a bounded exact string with two defensible segmentations.
- **Expected behavior:** retain the exact letters and both readings with provenance.
- **Pass:** neither reading is silently promoted to verified text; ranking may prefer one but shows
  the ambiguity and cannot alter position/skip evidence.
- **Failure diagnosis:** ____
- **Run evidence:** ____

## GD-08 — Distant story-fit decoy

- **Status:** `SPECIFIED`
- **Class:** geometry/bounds negative control
- **Input:** a strong compact unrelated local result and a semantically attractive word outside the
  approved band.
- **Expected behavior:** the distant word is absent at Guided level even if it fits the story.
- **Pass:** it can surface only after explicit band escalation; its distance penalty and expanded
  coverage are visible; it cannot retroactively change the earlier search claim.
- **Failure diagnosis:** ____
- **Run evidence:** ____

## GD-09 — Raw strings stay Advanced

- **Status:** `SPECIFIED`
- **Class:** UI projection
- **Input:** a Guided run with repeated unknown strings and verified language findings.
- **Pass:** verified/recognized rows appear in the main package; raw strings remain inside a closed
  Advanced disclosure and are never labeled as known words.
- **Failure diagnosis:** ____
- **Run evidence:** ____

## GD-10 — AI activation and authority

- **Status:** `SPECIFIED`
- **Class:** Raziel contract
- **Input:** enter ELS, select two occurrences in succession, open Raziel, submit one explicit plan
  question and then one interpretation question.
- **Pass:** entry, selection and opening produce zero AI requests; each explicit submit produces
  exactly one request; the same global session continues; each saved message snapshot identifies
  the selected occurrence; occurrence A and B never mix; Raziel proposals are not shown as exact
  findings until canonical replay exists.
- **Failure diagnosis:** ____
- **Run evidence:** ____

## Existing Golden regression set

These are regression cases, not permission to encode their expected words in runtime branches.

| Golden | Minimum retained assertion | Status |
| --- | --- | --- |
| `מקדש ירד` | 2 exact axes; bounded local discovery shows `ירושלם` twice | existing verified baseline; rerun each capability slice |
| `יום שבת תשמור` | exact/source distinction and focused `שבת` evidence remain intact | existing verified baseline; rerun each capability slice |
| `משיח טבת עשירי` | exact 1820 axis; nearby verified/source phrases keep provenance | existing verified baseline; rerun each capability slice |
| `קולומביה` | `ספינת`, `יכל אש`, `אש אכלה` remain general discoveries | covered by GD-02 |
| `בלעם הרשע` | at least 2 exact occurrences; literal source context does not hide other rows | existing verified baseline; rerun each capability slice |
| `ד. טראמפ` | saved occurrences replay exactly; unexpected-language holdout passes | covered by GD-01 |
| `אורניום` | parallel geometry remains strong without making `10101` a gate | covered by GD-03 |

## Per-run journal template

```text
Run ID:
Date / SHA:
Case / status:
Redacted input:
Research level:
Anchor / occurrenceRef:
Approved variants / Journey fields:
Engine budget:
Raziel budget (calls + tokens):
Attention budget:
Occurrence batch / geometry band / matrix coverage:
Candidates and source:
Transformations / normalization:
Canonical evidence (start, skip, direction, exact letters, replay):
Language readings / ambiguity:
Ranking signals / penalties:
Rejected candidates / reasons:
Source and verses:
Interpretation (separate from evidence):
Elapsed time / engine work / AI usage:
Stop reason / next permitted action:
Primary failure class, if any:
Human decision:
Artifacts:
```

## Gate for the first implementation slice

The first code slice may implement budget/coverage bookkeeping and deterministic holdout evaluation
only after these tests are accepted as the shared target. It must not make all `SPECIFIED` rows pass
at once, and it must not widen the existing engine to simulate progress. Every completed slice adds
its actual run evidence here and keeps unimplemented rows labeled `SPECIFIED`.
