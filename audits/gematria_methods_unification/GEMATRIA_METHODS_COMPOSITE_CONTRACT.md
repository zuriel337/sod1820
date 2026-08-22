# Composite Research Methods — Contract

**Status:** prepared on branch, NOT wired into any page/component, NOT registered in `gematria_methods` live. Part of `GEMATRIA_METHODS_UNIFICATION_AND_PREMIUM_COMPOSITES`. See `GEMATRIA_METHODS_HUMAN_GATE.csv` Decision E.

## 1. What a Composite Research Transform IS

A Composite Research Transform combines the **canonical outputs** of two existing, already-approved atomic gematria methods into one cross-method research view. It is:

- **Never** a new atomic method — it does not introduce new letter-value math.
- **Never** a duplicate implementation — it calls the existing `.fn()` from `src/lib/gematria.js` for each atom, exactly once, and only combines the two numbers it gets back.
- A **research/analysis lens**, usable by the Cross Engine, Research DNA, and Deep Research surfaces — not a replacement for the atomic methods it draws from.

This directly follows `gematria_methods_catalog` (rule, decided 21.8.2026, §6): *"Composite Research Operators/Views that cross existing outputs, not new foundational methods and not new columns, unless Zuriel decides otherwise after verification."*

## 2. What a Composite Research Transform is NOT

- It is **not** graded against the whitelist reconstruction process in `method_lifecycle` — that process is for *atomic* candidate methods (like אי״ק בכ״ר). A composite has no independent "correctness" question: if both atoms are canonical, the composite is canonical by construction.
- It does **not** get its own `db_column` or SQL calc function in this pass. `function` and `db_column` are left `NULL` in the proposed registry rows (see Decision E) — there is nothing to store beyond the two atoms, which are already stored/dispatchable on their own.
- It is **not** a tier decision by itself. A composite's *numbers* are exactly as canonical as its atoms (research_dna_v1 §4.7: *"Premium controls access, depth and tooling — never mathematical truth or canonical status"*). Only the *view* — the fact that a user gets to see "רגיל + מילוי" side by side with derived facts — may be gated.

## 3. The implementation shipped this pass

`src/lib/research/compositeMethods.js` (new file, not imported anywhere yet):

- `COMPOSITE_METHODS` — the 4 composites Zuriel named in this task:
  1. **רגיל+מילוי** — "רגיל + מילוי"
  2. **רגיל+מסתתר** — "רגיל + מסתתר"
  3. **רגיל+משולש** — "רגיל + משולש (קדמי)" (uses the internal key `קדמי`, per the locked `meshulash_kadmi_law` alias — "משולש" is a display name for קדמי, not a separate method)
  4. **משולש מילה+משולש הפוך** — "משולש מילה + משולש הפוך"
- `computeComposite(key, word)` — looks up the two atomic methods by key from `METHODS`/`DEPTH_METHODS` (the single source of truth), calls each `.fn(word)` once, and returns:
  ```js
  { key, label, word,
    a: { key, value }, b: { key, value },
    sum: a.value + b.value,
    diff: Math.abs(a.value - b.value),
    equal: a.value === b.value,   // cross-method convergence signal (FACT, not interpretation)
    tierHint }
  ```
- `computeAllComposites(word)` — all 4 for one word, for a future dossier/Cross-Engine consumer.

**Combination semantics — an explicit design choice, flagged for Zuriel:** this pass defines the composite's "combined value" as `sum` (plus `diff` and `equal` as secondary facts), because it is the simplest, most defensible cross-method operator and mirrors what convergence-detection already does elsewhere in the codebase (two expressions agreeing on a value = `equal`; two methods' totals combining = `sum`). **This is a product decision, not a mathematical inevitability** — a future Human-Gate could instead (or additionally) define composites as e.g. an ordered pair, a ratio, or a name-per-combination lookup table. Nothing downstream depends on `sum`/`diff`/`equal` today, so changing the combinator later is a pure function-body edit with no migration.

## 4. Proposed access tier (NOT activated)

Per Zuriel's stated default intent (task §8): composites default toward Premium/Deep Research visibility.

| Composite | Proposed tier | Rationale |
|---|---|---|
| רגיל+מילוי | `premium` | Two base-tier methods, straightforward cross-view |
| רגיל+מסתתר | `premium` | Two base-tier methods |
| רגיל+משולש | `premium` | Two base-tier methods |
| משולש מילה+משולש הפוך | `deep_research` | Both atoms are themselves still `candidate` (not yet Human-Gated active) — the composite cannot outrank its own atoms |

These tier values appear only as `tierHint` in the JS module and as commented-out proposed values in the draft SQL (Decision E) — **no entitlement is enforced anywhere yet.**

## 5. Regression coverage

`scripts/test_gematria_methods.mjs` §8 asserts, for all 4 composites against a real word:
- the composite never invents a value (`a.value`/`b.value` equal calling the atomic `.fn()` directly),
- `sum`/`diff` are pure arithmetic on those two values (no hidden third input),
- an unknown composite key returns `null` (never a guessed value),
- repeated calls with the same input are identical (deterministic).

All 86 assertions in that script (including the composite ones) pass against the current branch.

## 6. What still needs Zuriel

- Approve the 4 composites' existence as a registry concept (Decision E) — or ask for different pairings.
- Confirm or adjust the proposed `premium`/`deep_research` split.
- Decide whether `sum`/`diff`/`equal` is the right combination semantics, or something else.
- Note: **רגיל+משולש** and **משולש מילה+משולש הפוך** both depend on their `קדמי`/`משולש מילה`/`משולש הפוך` atoms — the second composite is inert in practice until Decision D (activating משולש מילה/הפוך) is approved, since a composite calls `.fn()` directly (always works client-side, since DEPTH_METHODS is already live-dispatched in the UI) but would show a `candidate`-state atom if ever exposed through a server-side profile like `fn_method_profile`.
