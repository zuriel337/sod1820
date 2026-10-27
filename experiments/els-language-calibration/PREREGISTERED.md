# EXP-09 — fixed before the first run

**Question.** When the product's own language reader (`guidedMatrixLanguageInspection`, taken unmodified from `public/tzofen.html`) is run on the window around
a verified axis, is what it returns unusual compared with the same reader on windows of the same shape (same number of rows and columns, same skip) at
other places of the text?

**Reader input.** Dynamic lexicon only (no story terms: `hints` is an empty Map), as in the ledger's holdout cases. Scope: tanakh for GD-01, torah for GD-02 and GD-03.

**Windows.** The real window plus 100 deterministic moved windows (first letter of the axis at `(m * 104729) mod (stream - span)`, kept only if the product's
box has the same rows and columns).

**Primary metric (the only one allowed to decide).** `relationBestScore`: the highest `candidateScore` among the relations the product returns.
Reason: the product recommends one relation, ranked by that score. **Secondary (reported, not decisive):** `reading5plus`, `segmentationsLong`.
All other numbers are shown for completeness.

**Statistic.** Upper tail p = (1 + number of moved windows with the metric at least as high) / 101. A metric where every moved window has the same value as the real one is
marked saturated (the product's caps hide the difference) and carries no information.

**Decision rules.**
1. A case is "unusual" only if p of the primary metric is <= 0.05 AND the metric is not saturated. With three cases, about 0.15 false alarms are expected.
2. If the primary metric is saturated or p > 0.05 in all three cases, the conclusion is: the reader's ranking carries no calibrated signal on these pages.
3. The strings seen in the ledger (`look` in cases.json) are used only AFTER the run, to ask whether the product's output contains them. They never enter a metric.
4. Nothing in this experiment changes the product, the engine or any data; no AI is called.

## Amendments (each made before the first recorded run)

1. A moved window that shares at least one cell with the real window (same width, overlapping rows and columns) is skipped, so the real window is never compared
   with itself. Found during a 20-window smoke run whose numbers were not recorded.
