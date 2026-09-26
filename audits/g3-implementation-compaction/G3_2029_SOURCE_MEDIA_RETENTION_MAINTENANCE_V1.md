# G3 2029 — Source / Binary Media Retention & Maintenance V1

**Status:** CONTRACT LIVE · IMPLEMENTATION PREPARED · NO DESTRUCTIVE ACTION · NO LIVE DDL  
**Canonical Supabase:** `linswmnnkjxvweumprav`  
**Owner:** `research_intake_foundation_contract_law v13`  
**Human Gate:** ZURIEL · 2026-09-20

## Owner check

Verdict: **EXTEND_EXISTING**.

- Research/source retention owner: Research Intake v13.
- Media identity/provenance: existing Reality/Media/source owners.
- Maintenance recommendation: `system_suggestions_law v3`.
- Control Plane: projection only over existing owners.
- Release/destructive action: existing release/Human-Gate path.

No Retention Store, Media Store, Cleanup Registry, archive truth table, scheduler or parallel maintenance system is authorized.

## Live calibration

Observed on 2026-09-20:

- `channel_updates`: 2,111 rows.
- Media-bearing rows: 457.
- 448 matched Supabase Storage objects.
- Matched storage: ~1,673.68 MB.
- Largest matched object: ~42.91 MB.
- Current `admin_retention_preview()`: `DRY_RUN_ONLY`, `delete_authorized=false`.
- Current preview still reports contract v11 although live owner is v13 — **DRIFT**.
- Existing `admin_retention(integer)` is user-retention analytics, not data cleanup. Its historical name is ambiguous — **NAMING DRIFT**, no rename performed here.

## Contract result

Source occurrence retention and heavy binary retention are now separate decisions.

### Row/source retention

Existing classes remain:

- `PROVENANCE_PROTECTED`
- `ACTIVE_SOURCE`
- `BOUNDED_RUNTIME`
- `PURGE_CANDIDATE`
- `HUMAN_REVIEW`

### Binary media disposition

Logical projection vocabulary:

- `KEEP_ORIGINAL`
- `KEEP_SOURCE_LIGHT`
- `ARCHIVE_BINARY`
- `PURGE_BINARY_CANDIDATE`
- `HUMAN_REVIEW`

No DB enum/store is created.

## Hard safety invariants

1. Load-bearing §12 source media is protected.
2. OCR/caption/transcript/thumb/derived 3D never automatically replaces the original.
3. Source-only/spam may leave the Research worklist without being deleted.
4. No binary purge while an active surface or ingestion/OCR/transcription reader requires it.
5. Physical dedup never merges source occurrences.
6. Filename/OCR/visual similarity alone never proves media identity.
7. No purge if the current owner cannot preserve a durable media tombstone/fingerprint without a broken or misleading live reference.
8. Unknown dependency = Human Review, never projected savings.
9. No guessed 30/90/180-day window.
10. Storage provider/tier may change; semantic media/source identity may not.
11. Destructive cleanup is always Preview -> separate Human Gate -> executor.
12. System Intelligence may recommend; it may not self-purge.

## Supabase Storage boundary

`storage.objects` is inventory/metadata for read-only audit and sizing. Do **not** remove/move files by directly mutating Storage metadata with SQL.

Physical upload/copy/move/delete must use the Supabase Storage API or authorized S3-compatible API so object bytes and Storage metadata remain consistent.

## Implementation phases

### M1 — Preview v2 — next implementation target

Extend existing `admin_retention_preview()` / `admin_system_health()`; no new table.

Required projection:

- source rows vs media objects;
- original vs derivative bytes where known;
- KEEP_ORIGINAL / KEEP_SOURCE_LIGHT / ARCHIVE_BINARY / PURGE_BINARY_CANDIDATE / HUMAN_REVIEW counts + bytes;
- active-surface blockers;
- direct Research/source provenance blockers;
- exact media identity/tombstone availability;
- missing/orphan candidates;
- duplicate-byte candidates when strong identity is available;
- largest/oldest/newest objects;
- projected reclaimable bytes;
- UNKNOWN bytes shown separately;
- contract pointer = Research Intake v13.

M1 performs **zero delete/move**.

### M2 — durable tombstone/fingerprint carrier audit

Before a single original can be purged, prove an existing owner can retain:

- source occurrence identity;
- original/source locator where meaningful;
- stable media/object identity where present;
- content hash/fingerprint where available;
- MIME/type;
- size;
- original/derivative lineage;
- surviving thumbnail/OCR/transcript refs where applicable;
- disposition reason;
- decision/executor provenance + time.

Current `media_map` / channel/source schema must be audited. If existing owners cannot carry this honestly, purge remains blocked. Any future schema extension must be **EXTEND_EXISTING** under the source/media owner, not a new store.

### M3 — archive pilot

Only after M1+M2 acceptance.

Use a very small bounded set that is:

- non-load-bearing;
- not research-linked;
- not active/featured/published;
- no live reader dependency;
- tombstone/fingerprint complete.

Archive means identity-preserving move to a cheaper tier. Verify authorized replay after the move before expanding.

### M4 — purge executor

Only after archive pilot and a new explicit Human Gate.

Executor acceptance:

- reference-aware;
- idempotent;
- re-checks dependencies immediately before mutation;
- Storage API/S3 object deletion, never direct storage metadata SQL;
- audit event with real actor;
- recoverability/backup strategy;
- no broken live URLs;
- partial failure safe;
- retry safe;
- negative tests;
- exact dry-run delta equals executed set;
- source-row deletion and binary deletion remain independently authorized.

## Research Intake behavior

A source that is `reviewed_no_structured_findings` / source-only / spam:

- MAY be omitted from default Research/Convergence views;
- DOES NOT become “false” or “deleted”;
- SHOULD NOT gain Research Strength;
- MAY later be considered for light-source/binary-retention treatment under the same dependency proof.

This avoids turning WhatsApp chatter into the research worklist while preserving source lineage.

## Release state

- Contract v13: **LIVE**.
- project_codex §13: **LIVE**.
- Companion docs: **BRANCH-ONLY** on `gpt/g3-source-media-retention-maintenance-2029-v1`.
- Preview v2 implementation: **NOT YET IMPLEMENTED**.
- Binary archive/purge: **NOT AUTHORIZED**.
- No production schema/function/storage mutation in this scope.
