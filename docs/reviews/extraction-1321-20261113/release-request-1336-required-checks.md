# Release request · required checks (ruleset) — a separate action, derived from #1336 (13.11.2026)

> **This is a request, not an approval, and it is a different action from merging #1336 and from the CL-16 database step** (`release-request-1336-contracts-enforcement.md`, A and B). It changes a repository security setting (CLAUDE.md 0.4: "permissions, policies, secrets and security settings" need ZURIEL's explicit approval of the exact change). Nothing here was changed; the ruleset was **not read again** for this request (value read by the governance reader on 12.11.2026; **Codex read `protect-main` again on 13.11: no required status checks, `required_linear_history` active, bypass for the admin role** — the table below uses that reading).
> **Who can apply it:** no tool in the agent session changes GitHub rulesets (the GitHub tools of the session read and write pull requests, not repository settings). The change is applied by ZURIEL in the repository settings, or with ZURIEL's own credential through the API call in section 3. An agent may not do it with an admin identity "on ZURIEL's behalf" without a separate explicit approval.

| | |
|---|---|
| Definition | `docs/reviews/contracts-enforcement-20261113/required-checks.md` and `required-checks.json` in [#1336](https://github.com/zuriel337/sod1820/pull/1336) at head [`7d85bf70f190919ed5588033bfea56e4a982981f`](https://github.com/zuriel337/sod1820/commit/7d85bf70f190919ed5588033bfea56e4a982981f) (derived from the workflows of `origin/main` `9be0c29fc`, pinned by `test/required-checks-definition-2029.test.mjs`) |
| Ruleset | `protect-main`, id `19635630` (as read 12.11.2026): deletion and non-fast-forward blocked, linear history, a pull-request rule with 0 approvals, **no required status checks**, bypass for the admin role |
| Today | CI is advisory: a red pull request can still be merged. The G1 enforcement of #1336 refuses a change by failing a check — which stops nothing until the check is required. |

## 1. Action RC-1 (this request): require nine checks that need no workflow change

**Exactly these nine contexts** (each triggered on every pull request to `main`, no `paths` filter, no job-level `if`, a unique job name, no read of live state — checked by the pin test):

| # | Context (the job `name:`) | Workflow | Ceiling | Estimate (not measured) |
|---|---|---|---|---|
| 1 | `live-contracts-2029` | `live-contracts-2029.yml` | 5 min | 1–2 min |
| 2 | `perf-contracts-2029` | same | 15 min | 4–8 min |
| 3 | `release-contracts-2029` | same | 10 min | 4–8 min |
| 4 | `security-sql-contracts` | same | 10 min | 2–4 min |
| 5 | `marketing-browser-2029` | same | 15 min | 6–10 min |
| 6 | `auth-browser-acceptance-2029` | same | 15 min | 8–12 min |
| 7 | `route-seo-decision-2029` | `route-seo-decision-2029.yml` | 10 min | 3–6 min |
| 8 | `legacy-production-lock` | `legacy-production-lock.yml` | unset (GitHub default) | 1–3 min |
| 9 | `Mobile + Accessibility Acceptance` | `release-visual-gate.yml` | 15 min | 8–12 min |

(Observed on the five extraction pull requests of 13.11: every one of the nine reported on every pull request, including the docs-only #1338; the slowest of the nine finished between about 4.5 and 6 minutes after the push; the path-filtered `hard-isolation`, which is not proposed, took up to 7.)

**Parameters:** `strict_required_status_checks_policy: false` ("up to date with main" would re-run nine slow jobs on every push); `do_not_enforce_on_create: false`; one entry per context with the GitHub Actions app as the integration (app id `15368` — verify in the ruleset editor), so no other app can report a passing status under the same name.

**Not in RC-1 (and why):**
* `gate` — the job name of **two** workflows (`observability-seo-gate.yml`, always; `media-release-batch-gate.yml`, path-filtered): ambiguous as a context. Needs the rename in RC-2.
* `Production Canary Gate` — reads the live Deployments state; one red canary would block every pull request including the one that fixes it. **Never required by default.**
* `hard-isolation`, `els-core-compatibility`, `public-core`, `isolated-postgres17-auth-rls`, the media `gate`, `approved-visibility`, `personal-sync`, `journal-browser`, `tiktok-source-resolver` and the three `contract` jobs — path-filtered: a required check that never starts leaves the pull request at "Expected — Waiting for status" forever (a docs-only pull request would be blocked). They stay visible but advisory until RC-3.

## 2. Effects and risks of RC-1 (stated)
* **Every pull request, including docs-only ones and the ones that fix CI, must show nine green checks before it can be merged.** Time to merge rises to the slowest of the nine (about 4.5–6 minutes in the observed runs of 13.11, up to the ceilings when CI is slow).
* **A flaky or broken workflow blocks all merges** — also its own fix, unless the fix lands under the admin bypass. The two heaviest, `auth-browser-acceptance-2029` and `marketing-browser-2029`, now each carry a real-browser proof from #1335/#1337 (about 3 minutes added to each); their ceilings are 15 minutes.
* **A rename of any of the nine jobs breaks the rule** (a context is a string): the pull request waits for the old name forever. The pin test of #1336 makes a rename visible in the same pull request; the safe order is: add the new name next to the old, merge; swap the name in the ruleset; remove the old job.
* **The admin bypass stays** (decision O-4). While it does, a merge under the admin identity — including an agent acting in ZURIEL's account — skips every required check. RC-1 does not change that.
* The required-check names are not read by anything in the repository except the pin test; the ruleset itself is outside the repository, so after the change the names in it must be read back and compared with the nine above.
* Required checks do not protect `main` from a direct push by an identity that bypasses the pull-request rule; they protect the pull-request path only.
* **Linear history and the merge method.** `required_linear_history` stays on and is not changed by RC-1. With it, a pull request can be merged only by squash or rebase (a merge commit needs the bypass). The release requests of #1336 and #1337 therefore ask for a squash merge and state the alternatives; the required-checks rule and linear history do not conflict.

## 3. Exact change (for ZURIEL's UI or API; not executed by the agent)
1. Save the current ruleset: `gh api repos/zuriel337/sod1820/rulesets/19635630 > ruleset-backup.json` (read-only).
2. Add this rule to the same ruleset (the fragment of the `rules` array):

```json
{
  "type": "required_status_checks",
  "parameters": {
    "strict_required_status_checks_policy": false,
    "do_not_enforce_on_create": false,
    "required_status_checks": [
      {"context": "live-contracts-2029", "integration_id": 15368},
      {"context": "perf-contracts-2029", "integration_id": 15368},
      {"context": "release-contracts-2029", "integration_id": 15368},
      {"context": "security-sql-contracts", "integration_id": 15368},
      {"context": "marketing-browser-2029", "integration_id": 15368},
      {"context": "auth-browser-acceptance-2029", "integration_id": 15368},
      {"context": "route-seo-decision-2029", "integration_id": 15368},
      {"context": "legacy-production-lock", "integration_id": 15368},
      {"context": "Mobile + Accessibility Acceptance", "integration_id": 15368}
    ]
  }
}
```

3. **Verification — the enforcement must be shown on the path that does NOT bypass, not only on the path that does.** A red pull request tried under an identity that bypasses the ruleset proves nothing: the bypass skips the rule. In this order:
   1. *Read-only, any identity:* read the ruleset back and compare the nine contexts with the table; `GET /repos/zuriel337/sod1820/rules/branches/main` lists `required_status_checks` with the nine contexts as active rules of the branch.
   2. *Red pull request, read-only evidence:* a deliberately red **draft** pull request (one test file that fails). Its `mergeable_state` is `blocked` and the nine checks show as required. (`blocked` is shown also to an admin; it is evidence that the rule applies to the branch, not that it holds against the bypass.)
   3. *The non-bypass path:* the same red pull request is tried with an identity **without** the admin role (a collaborator account with write access, or a test account): the merge is refused (the button is disabled / the API answers that required status checks are expected). **If no such identity is available, the enforcement is NOT proven and must be reported as "rule present, enforcement not exercised against a non-bypass identity" — not as proven.**
   4. *Green path:* a green docs-only pull request becomes mergeable after the nine pass. Close both scratch pull requests without merging.
   5. *The admin path is recorded, not tested:* an admin merge of a red pull request would succeed (that is the bypass, O-4); nobody should "test" it by merging. It is listed as the known open hole until O-4 is decided.
4. **Rollback:** delete the `required_status_checks` rule, or `PUT` the saved `ruleset-backup.json` back. Takes effect immediately; no repository file changes.

## 4. Order relative to the packages
* RC-1 needs **no** workflow change and none of the five extraction pull requests; all nine contexts exist on `main` today.
* Recommended order: merge #1336 first, so that the required-checks pin and the G1 enforcement exist before the checks are required; then RC-1. Not a dependency: RC-1 can be applied before.
* The additions of #1334, #1335, #1336, #1337 to the workflow add steps to existing jobs only; none renames a job or adds a pull-request job (the pin of #1336 fails if one does).

## 5. Later, separate requests (not requested now)
* **RC-2 — names.** Rename the two `gate` jobs (for example `observability-seo-gate`, `media-release-batch-gate`) in the same change that updates `required-checks.json`; then add the observability job to the required list (set its `timeout-minutes` first).
* **RC-3 — path-filtered gates.** Option 3 of `required-checks.md` §4 for `hard-isolation`, `els-core-compatibility`, `public-core`, `isolated-postgres17-auth-rls`: remove the `paths` filter, a `changes` job, the heavy job renamed, a final job with the old name and `if: always()`; add each final name to the ruleset only after a scratch pull request showed the four outcomes (no relevant path / relevant and green / relevant and red / cancelled). `isolated-postgres17-auth-rls` has no `workflow_dispatch` today.
* **RC-4 — admin bypass** (O-4): keep, or remove with a written emergency procedure.

## 6. What ZURIEL decides
O-3 the nine names · O-4 the bypass · O-5 `Production Canary Gate` stays advisory · O-6 renames and the aggregator for the path-filtered gates. Nothing is assumed approved.
