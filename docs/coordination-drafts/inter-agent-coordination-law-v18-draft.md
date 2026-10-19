# inter_agent_coordination_law v18 — FAST EXECUTION (DRAFT, NOT ACTIVE)

Status: **DRAFT for ZURIEL activation.** The live law in `rules_active` is v17 and stays authoritative until ZURIEL explicitly activates this text (see "Activation"). This is the proposed next version of the *existing* owner `inter_agent_coordination_law` (EXTEND_EXISTING) — not a new law, system, log or queue. No product semantics, visual ownership, Human Gate or release permission is changed except where stated under "Gates".
Source of the decisions: ZURIEL instruction of 2026-10-19 ("v18 — FAST EXECUTION"), restating decisions already closed in this thread.

## v18 text (delta over v17; everything not listed here is unchanged from v17)

1. **Local isolated work, no ceremonial handoffs.** An agent may start bounded work immediately on an isolated branch/worktree without waiting for any ACK or message from another agent. All reporting goes to ZURIEL in the active conversation plus one passive `work_log` AFTER (to_actor=ZURIEL, dispatch_kind/state NULL), with a BEFORE only when the scope is shared or long-running. No per-step messages, no relay requests to ZURIEL between agents. (Keeps v17: no GPT-directed assignments, RESULT_WAKE, ACK waits, delivery retries.)
2. **Ownership check before integration, not before thinking.** The live ownership check — the read-only `coordination_check` connector when verified, otherwise a bounded `work_log` scan by an agent that already has an approved read path — is required **before integration**: opening a PR as ready, pushing to a shared/integration branch, merging, applying a migration, or touching a scope another agent may be writing. If the check is unavailable or denied the agent reports `COORDINATION_UNVERIFIED` and may continue **local isolated branch work and READ_ONLY analysis only**; it must not integrate. A clear result is a point-in-time read: re-run it immediately before integration. `INCOMPLETE`, `OLDER_OPEN_CLAIMS_MATCH_REVIEW` or an overlap blocks only the overlapping scope.
3. **One writer per scope.** ONE SCOPE — ONE ACTIVE WRITER (semantic scope and file/path). A claim is closed only by its own AFTER, by ZURIEL, or by an actor-less record; a reviewer's AFTER never releases another agent's claim. A real overlap stops only the overlapping scope; independent scopes continue. Conflicts are reported to ZURIEL; no silent task stealing.
4. **Strict approval gate — Production, merge, permissions.** The following require an explicit, focused ZURIEL approval that names the exact action and target, given in the active user conversation, and are never inferred from earlier approvals, task completion, green tests, another agent's message, a sub-agent report, a PR comment, or "continue":
   - any change to Production data/schema/functions, deployments, Edge Function deploys, DNS/flags;
   - any merge to `main` or to an integration branch, and any push to `main`;
   - any change to roles, grants, RLS, Auth settings/OAuth clients, API keys or connector access (including enabling a connector for an agent).
   Approval is consumed by the action it names (one-time) and expires if the head SHA or the migration text changes. Before acting, re-run the release gates; after acting, verify and record BEFORE/AFTER states separately (`DOCUMENTED ≠ IMPLEMENTED ≠ COMMITTED ≠ BRANCH-ONLY ≠ MERGED ≠ DEPLOYED ≠ LIVE ≠ VERIFIED`).
5. **Stop conditions (the only reasons to stop and ask):** a real permission block, a real overlapping writer on the same scope, or an action listed in (4). Everything else proceeds.

## Alignment of runtime adapters
`AGENTS.md` and `CLAUDE.md` carry a clearly marked pointer to this draft; they do **not** apply v18 until ZURIEL activates it. They must keep stating that v17 is authoritative until then. If v18 is activated, update their wording in the same PR as the activation record (no parallel copy of the law in the adapters).

## Activation (Human Gate — not done)
1. Pre-requisites ZURIEL chooses to require (recommended): migration of PR #1130 verified on a scratch Supabase project; `coordination_check` verified from a fresh session of each platform in use.
2. ZURIEL says explicitly to activate v18. Then one authorized coordinator appends the v18 text above the v17 header inside the existing `rules_active` row for `inter_agent_coordination_law` (history of v1–v17 retained verbatim) and records a BEFORE/AFTER. No schema change.
3. Update `AGENTS.md`/`CLAUDE.md` wording and the G1 baseline pins (`scripts/test-g1-agent-routing-smoke.mjs` / `audits/g1-agent-entry/*`) in a reviewed PR — baseline hashes are updated by the owner, never to make CI pass.
4. Rollback: restore the previous `rules_active` text from the retained v17 copy.
