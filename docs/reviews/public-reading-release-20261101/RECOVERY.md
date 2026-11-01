# Data recovery acceptance — still open

The successful daily GitHub job only creates a repository Release/tag:
`.github/workflows/daily-backup.yml`. Run 41296475569 (2026-11-01) is a code snapshot,
not a database dump and not a media backup. No database/media artifact has been located.

The current Supabase connector offers bounded SQL/project reads, not backup download or
Storage object backup export. The workspace has no bound database or backup credentials.
Do not request secrets in chat or use SQL to read server files. Do not reset the live or
Candidate project, or confuse `restore_project` (resuming a project) with backup extraction.

Supabase's platform-to-self-hosted guide explicitly excludes Storage objects from the DB
restore: https://supabase.com/docs/guides/self-hosting/restore-from-platform .

Required evidence, through an existing trusted backup channel:

1. Canonical project linswmnnkjxvweumprav: a dated complete logical dump/snapshot with
   schema, data, functions, roles/RLS, extensions and a consistency timestamp. Export to
   encrypted restricted storage; retain it outside Git. Download/export requires dashboard
   or a secure bound connection which is not available to this session.
2. A corresponding dated Storage object backup plus manifest: bucket/key, size, checksum,
   access class and object/version metadata. DB Storage metadata is not the object bytes.
   Include private media without making it public. Account for any external media owner
   separately; public URL reachability is not a backup.
3. Isolated restore host with no outbound network, mail, cron, webhooks, models or access
   to canonical Supabase. Use fresh local-only Auth/JWT values, never Production secrets.
   Restore extensions/roles/schema/data using the compatible Supabase tooling, and
   restore object bytes into the disposable Storage service with original privacy policy.
4. Compare manifest checksums, critical row counts, identities, relationships, RLS owner
   reads/denials, public/private media reads, calculated results and representative content.
   Save only sanitized aggregate receipts in Git; never save user records/private media.
5. Record RPO (snapshot age) and measured RTO. Neither was measured here. Do not infer
   them from synthetic credit-migration dump/restore, mocks or a deployment rollback.

A3 original live test calls canonical research-run and writes traces/gate spans. It is
not executed on Production. The public profile's transport must reject that call before
network I/O; that is a scoped denial test, not A3 correlation success. Full isolated A3
requires compatible DB schema + real local Auth/JWT, PostgREST, Edge runtime and trace
persistence. Mock handler tests alone do not satisfy it. Keep the original workflow intact.
