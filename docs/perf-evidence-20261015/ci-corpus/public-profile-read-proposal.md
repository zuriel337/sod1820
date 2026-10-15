# Remaining public-profile admission

This is a bounded test-data read proposal, not product or surface acceptance.

The real World reader (`src/lib/research/worldContributorLens.js`,
`fetchWorldAdmittedContributorRows`) requests these two profile sets:

1. `slug IN (tzvi-opoc, shimon-haimov, yaniv-levi, shachar-kandro)` — 4 rows.
2. `active = true AND trusted = true AND kind <> 'external'` — 3 rows.

The anon RLS prevents private dossiers. Only 2 rows in each set additionally
carry an explicit `dossier_settings.visibility = public` value. Missing explicit
visibility is not being treated as independent public-identity verification.

Automatic approval review rejected export of the complete sets because trusted
status / current public-reader admission alone did not prove each identity is
within the user's limited attribution approval.

Proposed retained fields, and no others:

```sql
id, slug, display_name, kind, role, trusted, active
```

`id` is the contributor/profile source identifier, distinct from the excluded
`user_id` account identifier. There is no proposed export of `user_id`, email,
phone, contacts, `wa_names`, access codes, notes, or any `dossier_settings` object.
No query would write or invoke AI. The source queries would run once outside CI,
read-only as anon; only the reviewed public DTO would be frozen in the corpus.

Without explicit approval / independent public verification for the remaining
profiles, those requests remain missing and replay must fail. They will not be
replaced with empty arrays or invented people/permissions. Public-only subsets
are not described as full public-reader parity.
