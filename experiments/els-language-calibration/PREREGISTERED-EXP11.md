# EXP-11 — do the important findings rise in the ranking? (fixed before the first run)

**Why.** EXP-09 showed that the product's recommended-relation score is typical of random windows. The direction from ZURIEL: do not filter by rarity alone; keep
structurally and contextually interesting candidates (crossing, parallels, forms); measure where the important findings actually rank among the candidates,
how much noise precedes them, and how long it takes; include cases Claude did not aim at.

## Candidate pool (uncapped, per window)
Window = the product's box around the axis (`guidedMatrixBox`, +-20). Every straight run of 4-10 letters on the ELS lines (down, down-right, down-left) and on the
text row, in both reading directions. A candidate is `(surface, cells, line, direction)`. The product's reader (`guidedLanguageReadings`, unmodified, dynamic lexicon,
no story terms unless a scenario says so) reads each surface; `readScore` = 1 for a whole-surface reading, otherwise (runs of 6+ letters) the share of letters covered by up to 3
recognized tokens of 3+ letters.

## Features (general; no word, cipher or skip anywhere)
`cross` (shares a cell with the axis), `adjacent` (touches a cell next to the axis), `parallel` (same line type as the axis, not crossing), `readScore`, `lexicalConfidence`, length,
`text` (plain-text row).

## Rankers (fixed now; weights are not tuned on any target)
* **A, rarity:** eligible if `readScore >= 0.75`; score = -log10 p(L), where p(L) = share of candidates of length L with `readScore >= 0.75` measured on the 30 blind windows below
  (so the base rate never comes from the Goldens); ties by lexicalConfidence.
* **B, structure:** eligible if (`cross` or `adjacent` or `parallel`) and `readScore >= 0.6`; order: cross > adjacent > parallel, then `readScore`, then length.
* **C, context (only when a scenario supplies context terms):** eligible if a reading's base term is a context term; order by length.
* **U, union:** round-robin of the top 10 of A, B (and C), skipping a finding that overlaps one already taken.
Lists are findings: a candidate that shares a cell on the same line with a better-ranked candidate is the same finding and is dropped. A target's rank is the position of the first
finding that overlaps it; `noise before` = rank - 1.

## Cases
Development (the strings are named in the ledger/by the user): GD-01 (tanakh), GD-02, GD-03, targets as in `cases-exp11.json`.
Not chosen by Claude: the "ten-tevet cluster" window with its user-named target; plus 30 blind windows (seeded, fixed below) that have no targets and measure noise.
Scenarios copied from the ledger (flagged post-hoc, not blind): GD-02 with context `אש`; GD-03 with context terms of the two countries.

## Blind windows
For i = 1..30: skip = 50 + (i * 7919 * 104729) mod 4950; first letter = (i * 104729 * 13) mod (torah letters - 6 * skip); a straight 6-cell column axis; kept only if the box has >= 1100 cells
(otherwise the next i is used until 30 are kept). They provide p(L) and the "share of blind windows with something at least as good as the target".

## Reported per target
present?; features; rank in A, B, U (and C); noise before; the share of blind windows that contain a candidate scoring at least as high in the same ranker; the product's own position
(index in its returned readings / splits / boundaries, and the list length); milliseconds for the pool and the ranking.

## Decision rules
1. A target is *surfaced* if it is within the top 10 of U. A development target is *credible* only if it is also surfaced AND the blind share for its ranker is <= 0.20.
2. The ranking is called useful on these cases only if >= 60% of the present targets are surfaced AND the median blind window yields fewer than 10 candidates in A with length >= 7.
3. No target string may appear in library code (test). Weights above are not changed after the first run; any later change is a new experiment with a new row.
4. Read-only; no AI; the page, src/ and the lexicon asset are untouched.
