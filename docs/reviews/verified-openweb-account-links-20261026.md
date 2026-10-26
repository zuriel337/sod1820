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

## Four non-conflicting matches

| Public source name | Exact historical Contributor | Imported messages | Existing primary dossier |
| --- | --- | ---: | --- |
| Jasha8 | `b8c49719-6fd4-4027-ada1-1a986466eaf9` | 186 | None |
| eli | `4a6ae4d2-5372-4b7b-8e3b-3a230dc1a291` | 8 | Keep existing |
| Adi Ifrach | `8894bec6-b252-4405-bcd9-3773488e2a91` | 7 | None |
| Johel TV | `2b189295-f30d-4061-a1a0-b26afb313863` | 1 | Keep existing |

All four have one matching current confirmed primary email, one exact source identity, matching source-verified email evidence and one existing account Person. No names are used as matching evidence.

The operational batch uses the existing Person spine and reserved `historical:contributor:` / `historical:openweb:` keys. Each alias and original source user attaches to the existing account Person. Only the two accounts without a primary dossier receive contributors.user_id links; adding a second would make the current personal-area reader ambiguous. Other primary dossiers stay untouched. No new account/Person is created.

Changes are recorded in the existing contributor_claim_events and decision_ledger with exact inserted edge IDs and pre-change values for reviewed rollback. The batch is one atomic DO statement and checks evidence/conflicts again inside the transaction.

## Two held identity conflicts

The source-verified current email for `Sod1820` matches the current `zyz997` account; `Yosi Viner` matches “כי לה׳ המלוכה”. Both differ from the previously owner-approved display pairs in communityArchive.js. Yosi's existing merged_into pointer agrees with its current email match. The two identities are excluded from the batch until ZURIEL resolves the conflicting bindings. No merged_into pointer or display-pair code is changed.

## Verification before apply

`bash scripts/run-verified-openweb-account-links-sql-test.sh` applies the exact operation to disposable network-isolated PostgreSQL 17, never a live DSN.

Five negative cases reject missing source verification, duplicate account matches, missing Person, conflicting Person ownership and an unresolved merge. A late failure leaves no partial bindings. Eleven positive assertions cover correct Person edges, single primary dossier, retained source rows/visibility, excluded personal profiles, audit entries and idempotent replay. All pass.

## Apply status

Prepared and tested; live application has not yet been attempted at this commit. Application results and any approval-review restriction will be appended after execution.

The replies RPC migration in PR #1169 remains a separate central/DB-owner integration dependency. Identity links alone do not claim the new inbox reader or all frontend consumers are already deployed.
