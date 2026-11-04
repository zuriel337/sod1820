# One consolidated recovery request for root

Prepared for root to consolidate with the user; this document is **not approval**.
The audit itself is complete within its read-only scope.

> For canonical Supabase `linswmnnkjxvweumprav`, provide access through the existing
> trusted dashboard/backup channel to the dated successful backup list at
> [scheduled backups](https://supabase.com/dashboard/project/linswmnnkjxvweumprav/database/backups/scheduled)
> and [PITR metadata](https://supabase.com/dashboard/project/linswmnnkjxvweumprav/database/backups/pitr),
> or securely bind an identity limited to reading
> `GET /v1/projects/linswmnnkjxvweumprav/database/backups`.
> Identify the exact existing encrypted database-backup artifact/snapshot ID and
> matching object-backup bucket/prefix/manifest, their dates, retention and read/export
> route. Authorize one restore of those specific artifacts into a **named existing
> encrypted isolated destination** with an exact host/path, authorized operators and
> permitted data region. Use loopback-only services and deny outbound network during
> import and verification; no mail, cron, webhooks, social, models or canonical-project
> access. Proposed ceiling: one 24-hour run, 30 GiB source transfer and USD 10 total
> incremental cost, with no new paid project, subscription, PITR add-on or provider
> setting change. Stop before exceeding any ceiling. Delete derived private restore
> volumes/staging files within 24 hours after the run and retain only encrypted source
> backups under their existing policy plus sanitized aggregate receipts. Credentials
> must be bound through the trusted environment mechanism, never supplied in chat.

The exact artifact locations and existing destination are intentionally unresolved;
they must be supplied/approved, not invented. `srwpltjirwbqzcvuesmx` (Candidate) and
this shared agent workspace are **not approved private restore destinations**.
The USD 10 ceiling is a proposal, not a quote, current permission or incurred cost.
Live metadata indicates about 16.42 GB of objects and 2.17 GB allocated DB; actual
backup size, storage space, egress allowance and charges must be checked first.
No paid service is created by this plan.

If only provider physical backups exist, they are not directly downloadable through
the documented dashboard route. Establish a provider-supported export/isolated
restore route with its exact target and price before execution. A fresh approved
logical export is a possible separate source, but testing it proves recovery of
that new export; it does **not** validate an older retained physical backup. An
approval requiring a new paid target must name that target and quoted cost explicitly.

## Sequence after access and destination approval

1. **Freeze the recovery set, not Production.** Record the selected DB snapshot ID,
   successful completion time/type, consistency boundary, extension/schema manifest,
   complete object-backup manifest and any external-owned exclusions. Hash encrypted
   artifacts through the trusted backup service. Confirm DB and object recovery
   timestamps are compatible; document upload/change races and unresolved gaps.
   An offline SQL export should be coordinated through the existing trusted backup
   process so roles/schema/data are consistent, not assumed atomic because separate
   CLI dump commands ran. No canonical flags/roles/configuration changes.
2. **Verify isolation before private transfer.** Destination owner attests encryption,
   approved region/operators, disk quota and secure staging. Build/pin compatible
   PG17 + Auth/PostgREST/Storage/Edge components before loading private data. Disable
   background schedulers, outbound HTTP extensions/workers, subscriptions and external
   integrations there. Prove deny-default egress and loopback-only access. Confirm
   the host is distinct from canonical/Candidate and the A3 agent's disposable stack.
   Do not copy Production runtime secrets; confidential backup/Vault material remains
   within the approved trusted restore boundary and is never printed or committed.
3. **Restore once into the disposable destination.** Validate encrypted backup
   checksums and tool compatibility, then restore roles/membership, compatible
   schema/extensions/functions/triggers/RLS/grants and data using the provider's
   supported sequence with error-stop behavior. Record every incompatible/skipped
   object; silently omitting tables/columns cannot pass complete recovery. Supply
   fresh local credentials and JWT signing values. Import actual object bytes and
   corresponding metadata into isolated Storage while retaining bucket visibility,
   ownership and version semantics. Failed imports stop verification and are cleaned
   up without touching any source/Production project.
4. **Verify against the selected manifest.** Compare exact per-table row counts,
   canonical identities/FKs/relationships, functions/extensions and grants/RLS. Check
   representative public/owner/other-user/anonymous allow-and-deny paths with locally
   issued tokens. Match object counts, sizes and cryptographic hashes, including
   private objects; test public/private reads and denials through the isolated Storage
   service. Verify representative content and canonical calculations. Keep raw names,
   rows, tokens, object paths and media outside Git. External-owned media without
   reproducible archived bytes remains a coverage gap.
5. **Record and clean up.** Record the selected backup's age/RPO and measured restore
   RTO using explicit start/finish definitions, failure/retry time and verification
   scope. A 7-day retention entitlement does not establish an RPO. Retain only
   sanitized aggregate counts/hash-match totals, timestamps, versions, isolated-denial
   receipts and gaps. Stop/delete only the approved disposable services and volumes,
   remove derived private staging copies by the approved deadline, and record cleanup.
   Leave existing source backups and their retention untouched.

Success requires an actual dated real-data recovery set and verification; synthetic
fixtures, repository tags, deployed-site rollback and live object metadata cannot
substitute. All five steps remain **PLANNED**, none **EXECUTED** by this lane.
