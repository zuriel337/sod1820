# Approved public-profile test DTO

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

The user explicitly answered **yes** to this exact proposal in the resumed
conversation. The bounded read completed as anon in a read-only transaction at
`2026-10-15T22:13:05.939886+00:00`: four rows plus three rows, five distinct
profiles. All seven fields, including real false/true trust flags, are preserved
in `test/fixtures/ci-2029/source/public-profile-cards.json`. No account identifier,
alias, contact field or dossier object was read/exported in the DTO.

This resolves the proposed card admission only. It does not approve a private
group source, unrelated authorship, draft Bennett content, a changed body-length
assertion, product surfaces or publication. The replay DTO deliberately omits
`wa_names` and `dossier_settings` requested by the current reader: that limited
projection is explicit and is not raw full-response or alias/dossier parity.
