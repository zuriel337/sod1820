# EXP-13 — the crossing measure (fixed before the first run)

**Direction (ZURIEL).** Test a crossing measure with no AI and no change to the product. Fix the measure and the control windows beforehand; test further cases; report ranking, noise,
time and limits. The measure is NOT the only filter: parallels, proximity and context come later, and a combined list is reported alongside. EXP-10 waits for story descriptions;
part of the findings must stay hidden from the input to test real discovery.

## Crossing candidates
A run of 4-10 letters on the diagonal lines or the text row, in both reading directions, that shares at least one cell with the axis. Runs on the axis' own line are not crossings
(they overlap the axis, they do not cross it). Window = the product's box around the axis (+-20). The product's reader (unmodified, string level, no story terms) gives
`readScore` as in EXP-11 (1 for a whole reading or a full tiling by up to 3 recognized tokens of 3+ letters, otherwise the share of letters covered).

## The measure
Control windows ("blind"): for a scope in {torah, tanakh} and an axis length n, windows with a straight column axis of n cells: for i = 1, 2, ...: skip = 50 + (i * 7919 * 104729) mod 4950,
first letter = (i * 104729 * 13) mod (stream letters - n * skip); kept only if the product's box has >= 1100 cells. The first 200 kept form set A (the table), the next 200 set B (the null).
Sets exist for torah n = 5, 6, 7, 8 and tanakh n = 6, matching the scope and axis length of the cases. A and B never share a window.

* For a window, `m[L]` = the highest readScore bucket (0.75, 0.80, ..., 1.00) among its crossing candidates of length L. A window "has (L, b)" if some L' >= L has `m[L'] >= b`.
* Table T[L][b] = share of set-A windows that have (L, b), floored at 1/201. **X(c) = -log10 T[len(c)][bucket(readScore(c))]** for a crossing candidate c with readScore >= 0.75, otherwise 0:
  how rare it is, for a window of this shape, to contain a crossing run at least this long that reads at least this well.
* Window statistic S(w) = the largest X among its crossing candidates. Null: S of the 200 set-B windows. **p(w) = (1 + number of set-B windows with S >= S(w)) / 201.**
* Per target: X(target), and `blind share` = the share of set-B windows with S >= X(target) (how often a random window contains something at least that surprising).

## Rankers reported
* **D (crossing):** crossing findings ordered by X, then lexicalConfidence, then length; findings = same line and a shared cell are one finding.
* **U2 (combined, not a sole filter):** round-robin of the top 10 of A and B (EXP-11, with the EXP-11 blind table), D, and C when context terms are supplied.
Rank of a target = position of the first finding that overlaps it (region rank); noise above = findings that outrank the target's own tuple and do not overlap it. Time is measured per window.

## Cases
Development (named by the user or the ledger; `cases-exp13.json`): GD-01 (tanakh), GD-02, GD-03, the earlier "ten-tevet cluster". Further cases: every other occurrence of the same cipher in the Torah
whose product box has >= 1100 cells (sibling windows; no targets, used for the window statistic and for qualitative inspection), and two engine-verified crossing words of one sibling
(from the earlier dictionary scan; known crossings, not importance-labelled). Targets are read only by the evaluation step; the ranking functions never receive them.

## Decision rules
1. A target is *lifted* if it is within the top 10 of D, and *credible* if also its blind share <= 0.10.
2. A window is *unusual* if p(S) <= 0.05. With k windows tested about 0.05 k false alarms are expected; no multiplicity claim is made.
3. The measure is called useful on its own only if >= 50% of the crossing targets are lifted and credible AND there are at least 5 crossing targets; with fewer, the result is descriptive.
4. The combined list U2 is judged against EXP-11's U: a target counts as helped only if its rank in U2 is within the top 10.
5. No target string in library code (test). Read-only; no AI; the page, src/ and the lexicon asset untouched. Any change to this file after the first run goes under "Amendments" with its reason.

## Amendments

### Amendment 1 — stricter readability definitions, made after the primary run and before any amended run (reason: the primary table is saturated)

*Observed in the primary run (control windows only, no amended run yet, no target ranked under an amended reading):* with the primary `readScore` every control window (400 of 400, in all five
sets) contains a crossing run of every length 4..10 whose readScore is 1, so T is 1 everywhere, X = 0 for every candidate, S = 0 and p = 1 for every window. A run of 10 letters
fully tiles into <= 3 recognized tokens of 3+ letters in about 24% of random runs, and a window holds 1,450-2,300 crossing runs. **The primary result stands as recorded
(`results/exp13-cases.json`, committed before this amendment): by rule 3 the measure is not useful on its own; the "lifted" ranks in D are the tie-break order (lexicalConfidence, length), not the measure.**
Also noted: findings merge on the same line and a shared cell, so a window has only 3 x n crossing findings (15-24 here); "top 10" is therefore a 40-67% base rate, not a selective bar.
The runner reports the list size and the chance-level rank for every target.

Two stricter definitions of `readScore` are added and evaluated side by side with the primary on the same windows and cases (blind sets regenerated per definition, same positions):

* `whole`: readScore = 1 if the product's reader returns a reading for the whole run (no tiling), else 0.
* `tile2`: readScore = 1 for a whole reading or a full tiling by at most 2 recognized tokens of 3+ letters; otherwise the covered share (as in the primary, with 2 tokens).

Nothing else changes: candidates, windows, buckets, rules 1-5. The three definitions are reported together; none is chosen as "the" measure by looking at target results, and a definition
that is still saturated is reported as saturated. The combined list U2 keeps A and B at the EXP-11 definition (their tail table was built with it); only D uses the stricter reading. A target is
"crossing-eligible" under a definition if one of its crossing placements has readScore >= 0.75 under that definition.
