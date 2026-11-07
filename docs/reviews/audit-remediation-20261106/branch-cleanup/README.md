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
