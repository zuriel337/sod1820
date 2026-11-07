# Branch cleanup, 7.11.2026 — criteria, dry-run and restore

Owner instruction: clean branches and logs that are 7 days old or more; keep Heichal (ההיכל) completely untouched; keep G4, the RC, `main`, active branches, open PRs, unmerged branches and unique work; keep security, audit and CI evidence; never delete on age alone; dry-run first; no DB, Storage or Production change.

## Rule (a branch is deleted only if ALL hold)

1. **Fully merged**: GitHub compare against `main` reports `ahead_by = 0` (every commit of the branch is already in `main`, so it carries no unique work). Tips unchanged since the compare (re-verified with `git ls-remote` immediately before the deletion).
2. **Inactive 7 days or more**: the tip commit is dated 31.10.2026 13:50Z or earlier.
3. **Not Heichal**: no match of `heichal|heikhal|hechal|hekhal|היכל` in the branch name or the tip subject (6 excluded).
4. **Not protected**: not `main`, the RC (`claude/sod1820-audit-rc-g93w32`), the Auth branch, not a head or base of any open PR (10 open PR heads and 2 stacked bases checked), not named like rc/g4/audit/release/cutover/rollback/baseline/backup/archive/keep/prod (10 excluded).
5. **Not referenced**: the name does not appear in any tracked non-doc file (workflows, `vercel.json`, Worker/Preview allow-lists, scripts, tests, migrations: 1 excluded), is not cited in any governance document, and is not cited in `docs/`, `audits/`, `planning/`, `research/`, `work/`, `tools/`, `exports/` as provenance (18 kept), and is not the named recovery pointer to the last Legacy production commit (`legacy-live-base`, kept).

## Dry-run numbers (1,537 remote branches)

| Class | Count | Action |
| --- | ---: | --- |
| `main` | 1 | keep |
| Updated in the last 7 days (active) | 109 | keep |
| 7 days or older, **unmerged** (unique commits not in `main`) | 1,189 | **keep** (instruction: unmerged branches and unique work) |
| 7 days or older, fully merged | 239 | |
| — of which Heichal | 6 | keep |
| — of which rc/g4/audit/release/cutover-named | 10 | keep |
| — of which cited in docs as provenance | 18 | keep |
| — of which referenced by name in code/config | 1 | keep |
| — of which recovery pointer (`legacy-live-base`) | 1 | keep |
| — **verified safe to delete** | **203** | listed in `deletion-manifest-20261107.tsv` |

Superseded-but-unmerged branches (39 superseded by the Legacy cleanup, 21 squash-merged without a PR, etc., see `branch-inventory.md` in the session evidence) are **not** deleted: they carry commits that are not in `main`, and the owner asked to keep unmerged work.

## Restore

Every deleted branch is fully contained in `main`; its tip is recorded in `deletion-manifest-20261107.tsv`. To restore one:

```
git push origin <tip_sha>:refs/heads/<branch>
```

## Execution result (7.11.2026)

* **Branches: 0 deleted.** Remote ref deletion is refused for this session: `git push origin --delete noop` (a branch whose tip was re-verified unchanged and fully merged) returned `HTTP 403` from the session's git proxy, and the GitHub MCP tools expose no delete-branch operation. Nothing was attempted by any other route. The 203 verified branches, with their tips, are in `deletion-manifest-20261107.tsv`; `delete-branches.sh` (dry run by default, `--apply` to delete) re-checks each tip against the manifest before deleting and is meant to be run by the owner.
* **Logs: 90 GitHub Actions run logs deleted** (listed in `actions-logs-cleared-20261107.txt`): scheduled, successful sitemap-update runs created on or before 31.10.2026, none cited anywhere in the repository. The run records remain; only log text was removed. Deleted via the Actions API (`204 No Content` each).
* **Logs kept, and why:** every CI log of the audit/RC/G4 evidence (runs cited in this directory and in `G4-FINAL-EVIDENCE.md`); all failed, cancelled and skipped runs (diagnostic value, cited in the CI-failure analysis); all runs from the last 7 days; the 3 failed sitemap runs; the `work_log/` document (CLAUDE.md retains historical records); the Supabase `work_log` table and any other database log (no DB change allowed); Vercel deployment/runtime logs (platform-managed, read-only here). GitHub expires the remaining Actions logs automatically after the repository's retention period.
* **Heichal:** 6 branches excluded by name/subject (`claude/heichal-gematria-capability-hook-v1`, `claude/heichal-gematria-opening-ui-wiring-v1`, `claude/beit-midrash-2029-golden-v1`, `claude/check-temple-access-attempts-u1xskv`, `claude/christina-engine-x9gvs8`, `claude/awesome-dirac-5ewam7`); no Heichal file, branch, log or process was touched.
