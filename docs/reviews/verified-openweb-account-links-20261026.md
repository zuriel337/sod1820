# Verified historical account links — 2026-10-26

## Authorization and scope

ZURIEL requested: “האם אין עוד משתמשים שיש להם חשבון אצלנו יש עוד תבדוק תחבר אותם”.

This authorizes proven historical identity links. It does not authorize guesses, schema/RLS changes, authentication impersonation, publication, a main merge or deployment. Task: `VERIFIED_LEGACY_ACCOUNT_LINKS_20261026`; BEFORE: `9e2c5416-1fdb-40ad-a9d2-6d300a76a024`.

Base: `8dced11d0986aafb16e6fc1698beb7890bda3d10`. Branch: `gpt/2029-verified-legacy-account-links-20261026`.

## Expanded read-only scan

- 197 current Auth accounts, all with existing public.users records; 171 primary emails confirmed.
- 201 Auth provider identities: 102 email, 98 Google, one Facebook. Verified provider emails were included in discovery, without reading user_metadata as authority.
- 2,297 staged historical source identities; 128 have source-verified email evidence.
- 2,289 historical Contributors have imported messages; 127 have recorded email.
- Six unique source/account matches remain after considering verified primary/provider emails and original message provenance. No additional safe matches were found.
- Outside OpenWeb, 25 existing Contributor rows already carry account ownership. A historical-source match is distinct from having an existing site account/dossier.

No email addresses, access tokens, raw provider payloads or current private account identifiers are included in this report.

## Six verified-email matches

| Public source name | Exact historical Contributor | Imported messages | Existing primary dossier |
| --- | --- | ---: | --- |
| Jasha8 | `b8c49719-6fd4-4027-ada1-1a986466eaf9` | 186 | None |
| eli | `4a6ae4d2-5372-4b7b-8e3b-3a230dc1a291` | 8 | Keep existing |
| Adi Ifrach | `8894bec6-b252-4405-bcd9-3773488e2a91` | 7 | None |
| Johel TV | `2b189295-f30d-4061-a1a0-b26afb313863` | 1 | Keep existing |
| Sod1820 | `4cd9c034-0464-4600-a35d-7156f0584d9b` | 78 | Keep existing |
| Yosi Viner | `19936860-6b35-4386-bc44-113289858ff0` | 3 | Keep existing |

All six have one matching current confirmed primary email, one exact source identity, matching source-verified email evidence and one existing account Person. No names are used as matching evidence.

The operational batch uses the existing Person spine and reserved `historical:contributor:` / `historical:openweb:` keys. Each alias and original source user attaches to the existing account Person. Only the two accounts without a primary dossier receive contributors.user_id links; adding a second would make the current personal-area reader ambiguous. Other primary dossiers stay untouched. No new account/Person is created.

Changes are recorded in the existing contributor_claim_events and decision_ledger with exact inserted edge IDs and pre-change values for reviewed rollback. The batch is one atomic DO statement and checks evidence/conflicts again inside the transaction.

## Personal identity clarification resolved

The source-verified current email for `Sod1820` matches the current `zyz997` account; `Yosi Viner` matches “כי לה׳ המלוכה”. ZURIEL resolved their conflict with the old display pairs: “כל אחד למייל שלו”. The two identities now join the allowlist. communityArchive.js and its fixture use these exact reviewed account/source pairs; the old 444861 presentation association is removed. No email address is published.

Yosi's existing merged_into pointer already agrees with its verified account and is preserved. A merge pointer is accepted only when it resolves uniquely to a primary dossier owned by the same confirmed account. Missing targets, NULL owners, cross-account targets and ambiguous targets fail closed.

Follow-up task: `OWNER_LEGACY_EMAIL_ALIGNMENT_20261026`; BEFORE `1e3cb36b-ae9b-4112-b979-2101c4731c10`; base `d3de69384f09af166fe4ab723584291d1fe38d28`. Exact paths: maintenance SQL, its SQL fixture, communityArchive.js and its test, community-person browser fixture, this report.

## Verification before apply

`bash scripts/run-verified-openweb-account-links-sql-test.sh` applies the exact operation to disposable network-isolated PostgreSQL 17, never a live DSN.

Seven negative cases reject missing source verification, duplicate account matches, missing Person, conflicting Person ownership, an unresolved merge, a cross-account merge and a merge target without an owner. A late failure leaves no partial bindings. The positive tests reproduce the already-applied four-profile state, retain its exact edge IDs, add only the two newly confirmed identities, retain all primary dossiers/source rows/visibility and prove idempotent replay. All pass.

## Applied and verified

The initial four-profile operation was applied through the authorized Supabase SQL connector after the local tests passed. Follow-up read-only queries verified:

- Four historical Contributors attached to four existing account Persons.
- Eight historical identity edges, four applied decision_ledger records and two primary contributor claim events.
- Jasha8 and Adi Ifrach now have direct primary Contributor ownership. eli and Johel TV keep their pre-existing primary dossier and carry their older source identities through Person.
- All 202 imported messages retained; original source/provenance rows untouched.
- Zero accounts with multiple primary Contributor rows.
- All six inspected source dossiers retain their private visibility settings. The two held personal identities still have zero new edges and no new direct ownership.

No claims of deployed frontend behavior follow from this data operation. No schema, RPC, RLS, Auth/provider values, merged_into, main or deployment changed.

The two-profile follow-up is prepared and tested at this commit; final application results will be appended after execution. PostgreSQL has 20 passing assertions (including seven rejection cases and replay from the four-profile baseline). Sixteen Node tests and 19 built-browser cases pass; the browser includes both correct self-editor links and both cross-account denials. Build 2029, dependency graph, hard isolation, cheap hardening, Legacy Production Lock and diff check pass.

The replies RPC migration in PR #1169 remains a separate central/DB-owner integration dependency. Identity links alone do not claim the new inbox reader or all frontend consumers are already deployed.
