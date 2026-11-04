# Recovery inventory — 2026-11-02

Database/media recovery acceptance remains **OPEN**. Actual dated provider database
backups, independent object backups, their retention and a real-data restore are
**UNKNOWN / NOT VERIFIED**. This is a visibility and authorization limit, not evidence
that no backups exist.

This read-only audit improves on the prior report: canonical Supabase is on **Pro**,
20 backup/snapshot-named database relations exist, and connected Dropbox contains
project media. None of those facts establishes a complete independent recovery set.

| Scope | Finding | Coverage and retention |
| --- | --- | --- |
| Git repository | **BACKUP_PRESENT — code only.** Release `backup-2026-11-01`, published `2026-11-01T10:12:52Z`, targets `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`; zero uploaded assets. Successful workflow run `41296475569` has zero artifacts. | `.github/workflows/daily-backup.yml` checks out code and creates a tag/Release. No DB dump or object export. The workflow defines no independent retention/expiry policy. The last three visible releases are October 30, October 31 and November 1; no November 2 release was observed. |
| Supabase managed DB backups | **UNKNOWN — actual backup list unavailable.** Project `linswmnnkjxvweumprav` is `ACTIVE_HEALTHY`, PG `17.6.1.141`; organization `lawulmyrhswtozleinar` is `pro`. | Current provider documentation gives Pro seven days of daily backups when PITR is not replacing daily backups. Modern PG versions default to physical backups. These are entitlement/default statements, not observed successful backups. Actual backup type, dates, completion, PITR enablement/window and RPO remain unknown. |
| In-database partial snapshots | **PRESENT — 20 backup/snapshot-named relations.** Repository retention crosswalk explicitly maps six of these to partial Gematria/Post/ELS snapshots. | Catalog names, allocated sizes and planner estimates were read; no contents or copy integrity were examined. Dates in names are labels, not verified consistency timestamps. Same live database/failure domain, no complete schema/Auth/Storage coverage or independent retention proof. |
| Supabase Storage | **UNKNOWN — independent object backup.** Current metadata has 4 buckets, 20,713 object rows and 16,420,323,499 metadata size bytes. | 3 public buckets/20,527 rows; 1 private bucket/186 rows. All buckets report versioning `DISABLED`; no versioned/archive/delete-marker rows or configured lifecycle policies were observed. These settings do not establish external backup absence. DB backups exclude object bytes. |
| Connected project media | **PRESENT — file metadata only; backup coverage UNKNOWN.** Narrow Dropbox project-name search returned 20 editorial/media files. | No bytes downloaded, checksums read or source-to-backup identity reconciliation performed. Individual originals, derived assets and an avatar manifest do not establish a dated complete media backup. No private filenames or account identifiers are retained here. |
| Other backup locations | **UNKNOWN beyond the bounded search.** No complete dump/object-backup candidate was identified in authorized workspace filenames or project-qualified backup-name searches on Dropbox and both connected Drive accounts. | Drive exact project-name metadata found one project folder and an issue spreadsheet; backup-qualified name filters returned no candidates. No recursive private content extraction or unrelated backup search. Empty results describe these queries only. |

## Evidence and access

- Assigned clean branch: `gpt/2029-recovery-readonly-audit-20261102`, base
  `6cd64a79598aaa38de4596f2506beb167447bf1c`.
  Live `origin/main` and `git ls-remote` both resolved to
  `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`; the daily-backup workflow is unchanged
  between these revisions. No integration/merge or source mutation was performed.
- `AGENTS.md`, `CLAUDE.md`, `SOD1820_MASTER_OWNER_INDEX.md`, prior recovery report,
  retention crosswalk and live bounded coordination were read. BEFORE
  `67bfdcf5-f303-4d60-a11b-58fc16bd607e` expressly assigns this lane's nonoverlapping
  docs-only scope. Root remains manager/integrator and coordination writer.
- Dedicated `sod1820_supabase_readonly_execute_sql` verified
  `current_user=supabase_read_only_user`, `transaction_read_only=on`, PostgreSQL 17.6.
  Only that dedicated connector executed SQL. General Supabase tools read canonical
  project/organization metadata and current public documentation only.
- Runtime observations are current: network policy enforced/unrestricted, but no
  configured secret bindings, runtime variables or outbound identities. No
  `OIC_MANIFEST_PATH` is configured; worker policy has no VPN/TCP grants. No secret
  values, credential files or process environment dump were read.
- Available tools have project metadata reads and `restore_project(project_id)`;
  they expose no backup-list/download or object-backup export action. The latter
  restore call maps to project availability restoration, not selection/extraction
  of a dated backup. It was not invoked.
- Provider docs expose the separate **read-only** Management API route
  `GET /v1/projects/linswmnnkjxvweumprav/database/backups`. No secure bound identity
  for that route is configured here. No unauthenticated probe, credential discovery,
  privileged SQL file operation or workaround was attempted.
- Workspace filename scan pruned `.git`, dependencies, caches and generated build
  directories; its only archive candidates were two browser-evidence ZIP filenames
  in an existing review directory. Archives were not opened. This is not an
  exhaustive inventory of other machines, excluded directories or remote storage.

Storage aggregate was read at `2026-11-02T09:42:23.811191Z`; allocated live DB size
was `2,174,979,219` bytes at `09:43:30.255506Z`. Neither is an export size or an
atomic DB/media recovery manifest. Source references to YouTube, Vimeo and Dropbox
mean external media ownership/provenance must be included in the coverage decision;
URL reachability is not a recoverable copy.

## Restore prerequisites actually observed

The catalog reports 299 public tables (all RLS enabled), 27 Auth tables (16 RLS
enabled), 8 Storage tables (all RLS enabled), 32 roles, and 8 Storage policies.
These counts describe source structure, not proof of effective privacy or a backup
manifest. Ten installed extensions are recorded in `inventory.json`.

In particular, `pg_cron`, `pg_net`, `http` and `supabase_vault` require careful offline
startup. A generic PostgreSQL fixture is insufficient for a Supabase restore.
Use compatible PG17/Auth/Storage schemas and extension versions; preserve functions,
triggers, RLS, grants and role membership. Disable scheduled/outbound execution in
the **destination before import/service startup**, enforce network isolation, and
use fresh local-only JWT/Auth/runtime values. No Production secret may be copied
into this workspace or included in a committed receipt.

**No authorized real-data restore is presently possible:** dated source artifacts /
trusted export access and an approved isolated private-data destination are missing.
No private rows/objects were exported, no restore/rehearsal was run, no paid resource
was created, and no provider/database setting was changed. The existing synthetic
credit dump/restore and the separate synthetic A3 lane do not close this gate.

See `RESTORE-REQUEST.md` for one consolidated root-facing request and an executable
acceptance sequence after approval. RPO and RTO remain unmeasured.

## Current public references

- [Provider backup behavior, retention, physical backups and Storage exclusion](https://supabase.com/docs/guides/platform/backups)
- [Backup-list Management API](https://supabase.com/docs/reference/api/v1-list-all-backups)
- [Canonical scheduled backups](https://supabase.com/dashboard/project/linswmnnkjxvweumprav/database/backups/scheduled)
- [Canonical PITR metadata](https://supabase.com/dashboard/project/linswmnnkjxvweumprav/database/backups/pitr)
- [Supabase restore to self-hosted: scope and version compatibility](https://supabase.com/docs/guides/self-hosting/restore-from-platform)
- [PG17 self-hosting compatibility](https://supabase.com/docs/guides/self-hosting/postgres-upgrade-17)
- [Project availability restore operation](https://supabase.com/docs/reference/api/v1-restore-a-project)
- [Observed code-only Release](https://github.com/zuriel337/sod1820/releases/tag/backup-2026-11-01)
- [Observed code-only workflow run](https://github.com/zuriel337/sod1820/actions/runs/41296475569)

The Supabase changelog index was checked on the audit date. Its restore/backup fixes
reinforce checking actual successful backup timestamps; no provider default is used
as proof that this project's retained backups were taken successfully.
