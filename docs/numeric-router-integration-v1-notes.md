# Numeric Router Integration v1 — Verification Notes

## Reconciliation (NUMERIC_ROUTER_PR206_CURRENT_MAIN_RECONCILIATION)

Ported from PR #206 (`gpt/numeric-router-integration-v1-clean`, `d3142dd8`), whose base
(`998240255ef364a001561c53aeebf83291dff5d8`) had gone stale while the PR sat open/draft.
Reconciled directly onto `origin/main` at `2109110bd5b2928ef108f732bd2353116f5f5f0b`.

Live re-verification done before porting:
- None of the 5 implementation filenames (`sequenceLens.js`, `piSequence.js`,
  `fibonacciSequence.js`, `numericResearch.js`, `numericResearch.test.js`) existed yet under
  `src/lib/research/` on current main — zero filename collision.
- All 5 RPCs `numericResearch.js` calls exist live with matching signatures (verified via
  `pg_proc`): `fn_number_lookup(p_value bigint)`, `fn_number_dossier(p_value integer)`,
  `fn_number_journey(p_value integer)`, `number_neighbors(p_value integer, p_limit integer
  default 8)`, `fn_hot_context(p_values integer[], p_scope text default 'project')` — exact
  match, zero call-signature drift.
- Two truth-axes fixes applied in `numericResearch.js` (see that file's own header comment for
  detail): the sequence Universal Finding no longer asserts `stage:"candidate"` (a projection
  adapter does not own epistemic type — `truth_axes_foundation_law` INVARIANT PR1, established
  on main after PR #206 was authored), and now explicitly declares
  `verification_state:"not_tested"` with `engine_method_tested`/`engine_result`, matching the
  same pattern already used by the canonical Gematria and ELS adapters.

No DB DDL. No new table/store/graph. No UI wiring. No automatic persistence/canonical
promotion/publication.

Golden traversal (re-verified live via `node --test src/lib/research/numericResearch.test.js`,
9/9 passing):
- `1820 -> sequence:pi -> 24653 -> Numeric Root lookup(24653)`
- `233 -> sequence:fibonacci -> 13 -> Numeric Root lookup(13)`
- `337 -> sequence:fibonacci -> NOT FOUND`, therefore no derived root.

`npm run build` re-verified on this branch after the port (see `npm run build` output for this
commit).
