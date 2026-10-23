# CLAUDE_SHADOW_RESEARCH_V1 — experiment boundary and removal

Status: **disabled by default · branch-only · non-canonical · not deployed**.

This laboratory is an offline, explicitly invoked reader. It has no runtime entrypoint, feature flag,
scheduled job, Edge Function, database object, memory, Result Bundle consumer, Raziel import or
Metatron import. Its public Supabase access is GET-only and is already guarded by the existing tests.

## What belongs to the experiment

- `scripts/claude-shadow-research-core.mjs`
- `scripts/claude-shadow-research-v1.mjs`
- `test/claude-shadow-research-v1.test.mjs`
- `test/claude-shadow-runtime-isolation.test.mjs`
- `audits/claude_shadow_research_v1/`

`src/lib/research/pairConditionedMethodDependency.js` and the post-staging artifacts are dependencies
from the separate research-staging lineage. They are not owned by this experiment and must not be
deleted merely to retire the laboratory.

## How to disable it

Today, no product action is required: do not invoke the CLI and do not merge this branch. If the
branch has already been integrated for provenance, remove only the experiment-owned paths above in a
normal reviewed cleanup commit. There is no database, deployment, secret, flag, schedule or live
traffic to roll back.

The clean Raziel view-mode checkpoint remains `47d2b0983a7ae26a0cf3899ec61f788ab9a795ac`.
The mixed historical branch `claude/busy-ride-9ujrlu` is provenance only and must not be merged as the
view-mode delivery.

## Future activation gate

Any future live/admin preview is a separate task. It requires an explicit Human Gate, an isolated
runtime adapter over a frozen canonical input, cost and privacy review, and a new kill switch. This
document does not authorize that activation.

The machine-readable companion is `experiment_boundary.json`. The runtime-isolation test fails if
any current `src/` or `supabase/functions/` file begins referencing the experiment.
