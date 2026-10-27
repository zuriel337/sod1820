# EXP-14 — separate signals, no gate, blind control (fixed before the first run)

**Direction (ZURIEL).** Approved in the corrected wording: separate signals, no gate that filters a single candidate, definitions fixed beforehand, blind control. Report for every signal and for
the combined list: how many targets were found, their rank, how many candidates were returned, the run time and the control results. Keep candidates that may interest by context so a
statistical threshold does not lose them. No product change and no AI call at this stage. Part of the findings is hidden from the input.

**Why these signals.** EXP-09, EXP-11 and EXP-13 showed that readability (dictionary tiling) is flat and that crossing covers one target in six. EXP-07 recorded that `ספינת`, `באשאטמינ`, `שבררומי`
occur 0 times in the plain text (re-checked in the database), so sequence attestation cannot raise them and is NOT used as a signal or as a gate (it is not used at all here). The signals below do
not need a word to occur in the text.

## Pool and window (unchanged from EXP-11)
The product's box around the axis (+-20). Every straight run of 4-10 letters on the four line types (down, down-right, down-left, text row), in both reading directions. The axis is always a column (`down`).
A *finding* is a run; a run that shares a cell on the same line with a better-placed run of the same list is the same finding and is dropped (`rankFindings`). Letters are the folded letters of the stream of the case's scope.

## Language-free features
`cross` (shares a cell with the axis), `adjacent` (touches a cell next to the axis, not crossing), `parallel` (same line type as the axis, not crossing), `dist` = the smallest Chebyshev distance between
a cell of the run and a cell of the axis (0 for a crossing), `len`. The final tie-break of every list is a fixed pseudo-random order, `hash` = FNV-1a (32 bit) of `line|row|col of the first cell|len|reverse`, scaled to [0, 1):
ties are broken the same way in the null windows and in the cases, and the size of the tied group is reported.

## The signals (separate ranked lists; a candidate is dropped from a list only if the signal gives it no score)
Tuples compare lexicographically, larger first, `hash` last.
* **G, axis relation:** every candidate; tuple `[-dist, len, hash]`. Uses no letters at all.
* **H, Hebrew-likeness learned from the text itself (no lexicon):** a character trigram model trained on the continuous letters of the case's scope stream (Torah for torah cases, Tanakh stream for the Tanakh case; no word
  boundaries). `c1`, `c2`, `c3` are the unigram, bigram and trigram counts, `N` the number of letters. `P1(x) = c1(x)/N`; `P2(c|b) = 0.9 c2(bc)/c1(b) + 0.1 P1(c)`;
  `P3(c|a,b) = 0.6 c3(abc)/c2(ab) + 0.3 c2(bc)/c1(b) + 0.1 P1(c)` (a term whose denominator is 0 counts 0). The raw score of a surface is the mean over its letters of `log2` of `P1` (first letter), `P2` (second), `P3` (others).
  Calibrated per length: `H(c) = -log10((n_ge + 1) / (n + 1))`, where `n` is the number of candidates of that length in the null windows of the same scope and `n_ge` those with a raw score >= that of `c`. Tuple `[H, hash]`.
  The weights 0.9/0.1 and 0.6/0.3/0.1 are fixed here and not tuned.
* **W, the product's whole reading, ordered by nearness:** eligible if the product's reader (unmodified, `guidedLanguageReadings`, dynamic lexicon, no story terms) returns a reading for the WHOLE surface (no tiling);
  tuple `[-dist, len, lexicalConfidence, hash]`. (This is the product's own nearest-first order restricted to readable runs: a reference.)
* **M, mirror pair around the axis:** the mirror of a run reflects each of its cells about the axis column, keeping the order of the cells. A run has a mirror partner if all reflected cells are in the window, the partner is a run
  of the same length (any line type that the reflection yields), and the run is not on the axis column. Pair value `M(c) = H(c) + H(partner)` (the calibrated values above). Eligible: runs with a partner; tuple `[M, hash]`.
  **M is defined from an observation in GD-02** (`ספינת` and `יכלאש` are mirror images around the column); GD-02 is therefore not evidence for M, only the other cases, the planted words and the null windows are.
* **K, context by components (only when context terms are supplied):** eligible if the surface contains a context term as a contiguous substring (terms of >= 2 letters, folded); tuple `[length of the longest contained term, -dist, -len, hash]`.
  No other score or threshold removes a K candidate.

## Combined list U (not a sole filter, nothing lost to a threshold)
`U` = the context block first (all K findings, at most 50), then a round-robin of the top 25 findings of each of G, H, W, M (overlapping findings skipped, as in EXP-11). At most 150 findings.
`keptOnlyByContext` = K findings in U that no other signal returns in its top 25.

## Control and hidden findings
* **Null windows** (no targets): straight 6-cell column axes, `skip = 50 + (i * 7919 * 104729) mod 4950`, first letter `(i * 104729 * 13) mod (stream letters - 6 * skip)`, kept only if the product's box has >= 1100 cells;
  the first 40 kept windows of the Torah stream and the first 30 kept windows of the Tanakh stream. They give the H null tables, the list sizes, the number of context matches that terms retain by chance, the
  number of mirror pairs and whole readings, the run time, and for every target the *blind share* (the share of null windows that hold a finding at least as strong in the same signal; tuples without `hash`).
* **Planted hidden words** (ground truth, synthetic): the next 60 kept Torah windows. In each, four words from the product's dynamic lexicon (keys of 6-8 letters, folded, sorted; word index
  `(i * 7919 + k * 104729 + 13) mod (number of words)` for class k, advancing to the next word when a placement does not fit) are written into the matrix along straight lines, never into an axis cell, never overlapping:
  `cross` (a down-right line through an axis cell whose letter equals the word's letter at that position), `adjacent` (a down-right line ending next to the last axis cell, never crossing), `parallel` (a vertical line in the column
  4 to the right of the axis, starting 10 rows below the first axis row), `distant` (a vertical line 14 columns to the left of the axis, language-only control). A window whose placements do not fit in the box is skipped.
  Half of the planted words are *given* (their words are the context terms of K for that window) and half are *hidden* (K gets nothing for them): odd windows give `cross` and `parallel`; even windows give `adjacent` and `distant`.
  Words equal to a development target are excluded. No signal ever receives the planted positions. These are overwritten letters, not engine occurrences: the test measures ranking behaviour, not discovery by the engine.
* **Development cases** (named by the user or the ledger, `cases-exp14.json`): GD-01 (Tanakh), GD-02, GD-03, the earlier "ten-tevet cluster". Scenarios (flagged post-hoc, copied from the ledger): GD-02 with context `אש`; GD-03 with the
  two country terms (one of the targets is itself a context term, so K finding it is not a discovery). Targets are read only by the evaluation step.

## Reported per target and signal
present?; found = a finding in the signal's top 50 *contains* the target's cells (also: overlaps, exact); region rank; list size (findings); candidates scored/unscored; tied group size; the blind share; the median number of
null findings that are stronger (null noise); the same for U (rank, size, which tier). At top 25 / 50 / 150 of each signal and for U. Time per phase (pool, features, each signal, ranking, union) and per window.

## Decision rules
1. A target is *found* by a signal (or by U) iff a finding in its top 50 (U: its list) contains the target's cells. *Credible* iff found and its blind share <= 0.20 (G has no null: always 1.0).
2. A signal or U is called *useful on the development cases* only if it finds >= 60% of the present targets AND at least half of the targets it finds are credible. U *helps* only if it finds more present targets than the best single signal at the same size (top 150).
3. Planted words: a signal *discovers* a class only if its recall (a finding in its top 50 contains the word) >= 0.5 among the HIDDEN words of that class; the same for U. The `distant` class is the language-only control; a geometry-only signal is expected near chance there.
   Chance level = (findings returned) / (findings in the list), reported.
4. Context: the K block is part of U whatever the other signals say; reported: K findings per null window (chance matches with the same terms), size of the K block, `keptOnlyByContext`.
5. No target string in library or runner code (test); read-only; no AI; the page, src/ and the lexicon asset untouched. Any change to this file after the first run goes under "Amendments" with its reason.

## Amendments

### Amendment 0 — reporting only, made after a 4-window smoke test and before the first real run (no signal, tuple, budget or rule changed)
A smoke run of the runner with 4 Torah and 3 Tanakh control windows and 3 planted windows (`--null-torah 4 --null-tanakh 3 --planted 3`) was inspected for sanity, including the development rows. It is not a result and its numbers are not used.
It showed that a finding is a run of up to 10 letters (the longest run of its line through the region), so under G a diagonal that passes the axis "contains" any word that sits on it. Rule 1 and rule 3 keep the definition "contained", as written.
To keep that reading honest the runner now also reports, next to every contained rank: the **exact** rank (the finding is the target's own cells), the **overlap** rank, and the **coverage** of each list (share of the window's cells inside the first 50 findings, and inside the union):
a word placed at random is contained in a list at most as often as that coverage, and the `distant` planted class is the language-only control. No K tuple, budget or rule was changed after the development rows were seen.
