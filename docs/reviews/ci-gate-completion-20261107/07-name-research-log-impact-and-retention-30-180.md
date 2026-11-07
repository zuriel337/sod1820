# `fn_log_name_research` / `name_research_log` — impact assessment and proposed retention 30 / 180 days (DRAFT; NOTHING EXECUTED)

> **DRAFT / EVIDENCE — not an owner contract, not an approval, no gate is passed.** Branch-only (`claude/sod1820-ci-failures-diagnosis-6z9ej6`), not in `main`. Contains aggregate numbers only: no personal data, no secrets, no addresses. Index: [README](README.md).

No reset, redaction, deletion, migration, cron entry, function or ACL change was made. Statements are illustrative text for a later approval.
Evidence tags: **V** live read-only (7.11.2026) · **C** repository main@cfda877a · **D** project documents.

## 1. What the data and the writer are today
- V: 1,294 rows, 2,088 kB; oldest 2026-07-28; **last row 2026-11-04 11:49:50 UTC — at the time of the cutover (production build created 11:28:55, aliases moved between about 11:30 and 12:11 UTC; the exact switch instant is not readable); 0 rows since**. Daily rows in the last active days: 13, 30, 8, 11, 6, 12, 15, 8.
- V: gateway calls to `/rest/v1/rpc/fn_log_name_research`: 9 (11-01 window), 14 (11-02), 20 (11-03), 9 (11-04), **0 on 11-05 and 11-06**.
- C: the only caller is `NameMultiSearch` → `logNameResearch`, rendered by `src/pages/CommunityCalculatorPage.jsx` only inside `{!babyMode && deepName && …}`. **Correction (7.11.2026):** the 2029 route `CommunityCalculator2029Page` *does* import that page, but mounts it with the `passive` flag, and in `passive` mode the effect that sets `deepName` returns early — so the component, and with it the logger, is **not rendered** on the live site. Gateway and table both show the last call at 4.11 11:49:50 UTC. The path is dormant but one flag away from revival (removing `passive`); the function itself stays executable by PUBLIC and anon with no limit.
- Content (V): `name_norm` = the typed full name (first 80 chars), name length, language, booleans (surname yes/no, birthdate yes/no, question yes/no — birthdate and question never true), track counts, `elapsed_ms`, `track_status` json. 936 distinct names in 1,294 rows; 672 rows with a surname. No subject key, no user id.
- Readers (V): `fn_name_research_stats(days)` (anon-executable) returns aggregates only — total, flags, rates, per-track — **no names**; no caller in code or DB. No other function reads the table. No cron job or trigger touches it. Not in the retention registry (`admin_retention_preview`).

## 2. Age distribution (V) and what each rule would touch
| Age | Rows | Distinct names | With surname |
|---|---|---|---|
| 0–7 d | 52 | 43 | 22 |
| 8–30 d | 605 | 466 | 325 |
| 31–90 d | 536 | 408 | 262 |
| 91–180 d | 101 | 67 | 63 |
| > 180 d | 0 | — | — |
Older than 30 d: 637 · older than 60 d: 318 · older than 90 d: 101 · older than 120 d: 0.
Because nothing writes any more, **all 657 newer rows pass the 30-day mark by 4.12.2026 without any further action**, and the first row reaches 180 days on **2027-01-24** (oldest 2026-07-28).

## 3. Proposed policy 30 / 180
1. **Day 30:** the name text of a row is cleared (`name_norm` set to null). Everything else in the row stays (flags, counts, language, timing, track status), so `fn_name_research_stats` keeps working.
2. **Day 180:** the row itself is removed.
3. First run: a dry-run count (no change) shown to the owner, then batches of ≤ 10,000 rows (the pattern of the existing telemetry job), a heartbeat record in the existing `analytics_cache` key style, and a failure that cannot block other retention jobs.
4. Governance path: register `name_research_log` in `admin_retention_preview()` with a bounded class and `auto_purge_allowed`, implement the rule as a **separate** function + cron entry (the existing `fn_telemetry_retention_120d` aborts if its preview scopes are not authorized, so reusing it would couple the new table to events/visitor_events/site_visits retention).
5. Variant for parity with telemetry: 30 / 120 (also 0 rows deleted today).
6. Optional: keep a salted hash of the cleared name if a distinct-name count is ever wanted (no consumer exists).
Illustrative text, not run: `update public.name_research_log set name_norm = null where name_norm is not null and created_at < now() - interval '30 days';` and `delete from public.name_research_log where created_at < now() - interval '180 days';`, both in ≤ 10,000-row batches.

## 4. Impact assessment
| Area | Impact |
|---|---|
| Existing uses of names | None found (no reader of `name_norm`). Quality statistics unaffected (flags/counts kept). A distinct-name or "popular names" view cannot be rebuilt after clearing (no consumer today). |
| Users / data subjects | Positive: shorter life for personal text typed by visitors, including third-party names. Export or erasure *by subject* remains impossible (no subject key) — that is why clearing at day 30 is proposed rather than relying on requests. |
| Volume | 637 rows cleared at the first run; 657 more by 4.12; deletions begin 2027-01-24; steady state with no writer: shrinking table (≤ 2 MB). |
| Operations | One small daily job; first-run duration seconds; new registry entry; heartbeat check. |
| Dependencies | `admin_retention_preview()` registry; cron; none on PR #1259 or the other three plans. |
| Rollback | Clearing and deleting are not reversible by the job. Only a verified database backup (below) can restore. A stop switch = unschedule the job (before any run). |
| Risk of the change | Low (no consumer); main risk = clearing names that an unknown off-repo process reads — mitigated by the dry-run, the nil reader finding, and an owner confirmation. |

## 5. Backup and restore position (what is and is not known)
Authorized sources for database backups are the Supabase dashboard (Database → Backups: latest successful backup, time in UTC, retention, PITR switch) or the Supabase Management API for the project with an owner token. **Neither is available to this session** (no tool lists backups; no token was or will be used). Not verified.
- D/V: the nightly workflow "גיבוי יומי (snapshot)" creates a **GitHub Release of the repository** (code only). It does **not** back up the database.
- D: project documents record that the historical restore proof (H1) is valid and that the **currency of the database backup and media coverage were not verified**; ZURIEL accepted that risk on 3.11.2026.
- V (indirect signal only, not a backup proof): the database reports `archive_mode = on`, an archive command is configured, the last WAL segment was archived 7.11 05:05:42 UTC (under two minutes before the check), 7,295 segments archived since the counter started, **0 failures**, and `wal_level = logical`. This is consistent with continuous WAL archiving, which is what point-in-time recovery builds on, but it does not show that base backups exist, how long they are kept, or that PITR is enabled for the project.
- **Owner action required before the first irreversible run:** read the Backups screen, write the latest backup time and the retention/PITR window into work_log (or accept irreversibility explicitly). Until then the position is "unknown, indirectly consistent with WAL archiving".
- No export of the names is proposed or made: it would create a second copy of personal text. The provider backup itself keeps the names until it expires, which is the natural restore path.
- Restore procedure if ever needed: restore the backup into a separate project and copy only the affected `id, name_norm` pairs back; no code depends on it.

## 6. Related findings that change the picture
1. The writer is dormant on the live site (see the correction in section 1); the same retirement pattern as RP-1 applies to `fn_log_name_research` (and to the stats reader, which has no caller). That is a *separate* decision from retention: retention handles the 1,294 existing rows; retirement removes the dormant endpoint. Retirement of the dormant function is planned separately in [08](08-retirement-plan-fn-log-name-research.md) (consumer verification first).
2. Because nothing writes, "minimize at the source" (stop storing the name) is no longer urgent; it becomes a condition for any future revival of the feature.

## 7. Approval conditions
Owner decisions: periods (30/180 or 30/120); clear vs delete the oldest rows now; backup confirmation or accepted irreversibility; whether the dormant function is retired (separate plan).
Technical conditions: dry-run counts match §2; registry entry approved; job isolated from the telemetry job; heartbeat visible; work_log BEFORE/AFTER; no overlap with another writer on the retention registry.
