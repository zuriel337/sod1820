# PR1111 public-card continuation: incomplete acceptance

Continues the same branch from verified `8ce0ecc9bf1733b75ecf96ff749a7a15d05178e7`.
PR1111 remains a draft against measurement branch `8965f1b6`.
This is revision 2 of the new offline experiment, not a historical reconstruction,
live-response parity, a speed improvement or Posts/Topics product acceptance.

## Source, privacy and frozen package

The user explicitly approved the seven-field proposal: `id, slug, display_name,
kind, role, trusted, active`. An anon read-only query at
`2026-10-15T22:13:05.939886+00:00` returned all four curated rows and all three
trusted active non-external rows, five distinct profiles. Real false trust flags
are preserved. Profile source IDs are distinct from excluded account IDs.
`test/fixtures/ci-2029/source/public-profile-cards.json` retains only that DTO.
Aliases, contacts, account IDs and all dossier objects are omitted. This is an
explicit limited projection of the reader's larger select, not alias/dossier parity.

Offline World request discovery then identified four additional public contracts:

- Six published tier-0, non-hidden gallery-image rows, with the exact total6;
  no `ocr_meta` export. The body equals the existing six-row response; a changed
  JSON property order initially triggered the collision guard. Canonical JSON
  encoding preserves the old bytes and keeps distinct count headers.
- Two approved contribution rows linked only to approved public profile IDs.
  Their actual claim/value/method/verified/kind fields are retained verbatim.
  No account or unrelated author name is requested.
- Forty-eight core, non-draft public Post metadata rows. All 48 source bylines
  matched the previously reviewed public display allowlist. Full requested
  metadata and source order are preserved; no bodies or whole authors objects.
- The exact anon `research_objects` request returns zero eligible rows. A count
  in the same read-only transaction proves the empty result. No statement,
  evidence, value or source-reference payload was read. This is an actual empty
  source response, not an empty replacement for unavailable data.

The final frozen inputs contain 161 navigation and 160 performance/browser
contracts. All previous 155 navigation response objects remain byte-for-byte
unchanged. The headerless gallery representation gains the verified exact count.
All prior Number rows, mathematical references, full authored content, catalog
data and original/rendition image bytes are preserved. Source-index revision,
request/body hashes, privacy allowlists and coverage limits are retained.

| File | SHA256 |
| --- | --- |
| performance.json.gz / browser.json.gz | `bd79ce9742c4931965b59d866114f60a479a2c49b70f56a6456058b9020d544e` |
| navigation.json.gz | `9f8f9e4f06b751e917bc98ef994c69fecfcb018de980b01b84760a0af537a9a7` |
| source-index.json | `0caa609cef9fc535d51ec83cd47a3ea1091109443977959acf617ac66af249fb` |
| source/public-profile-cards.json | `b3ed1c3e730bec298ac6c5dfa38d97af8acf6ab6b1cab030b08609135c04cc7c` |

## Validation

All three unchanged complete gate entrypoints were invoked with the final frozen
inputs inside Docker network=none, only loopback, no default route, ALL
capabilities dropped, no-new-privileges and inherited native/Node/browser guards.
All returned nonzero at the original semantic input preflight, before application
connection; their audit files were empty. They did not execute eligible seven-
sample comparisons, extension scenarios, navigation interactions or World/Entry
acceptance. No base/head performance comparison or speed claim is made.

Independent tests on the frozen input pass: all16 image cases, catalog count/
ordering/23-row continuation and 2→24 parity (fingerprint
`14f687daab2c86b01ba9011cb9e8c6cc1fd785b16764dda31d020c7103642888`),
18 privacy/repack checks including14 negative cases, and six-file byte-identical
reproduction. The new negatives reject aliases, dossier objects, modified trust
flags and unknown identities even if other fields look public. Source/A3,
negative egress, PR1110 measurement checks and full build are rerun separately.

Actual reproduction initially exposed nondeterministic manifest property order:
five files reproduced, the manifest did not. Canonically sorting manifest keys
fixes this bounded packaging bug; a regression now reproduces all six files from
the retained source index without live access. This changes no measurement,
assertion, product code or threshold.

World request discovery only, not acceptance, still returns FAIL for one exact
unmapped request below. Unknown requests abort and cannot reach live services.

## Exact remaining blockers

1. `GET posts?select=*&slug=in.(seventh-to-tenth-sefirot-2027)&limit=1`:
   full canonical public5116 body1778 HTML characters is760 after the existing
   HTML-removal expression, below unchanged800. Needs an approved exact Golden
   source meeting the contract or a separately authorized contract decision.
   No padding/splicing or assertion change was made.
2. `GET posts?select=*&slug=in.(bennett-melach-631-78)&limit=1`:
  5113 is tagged draft. Its required exact authored Bennett/631 body is outside
   approval and was not read/exported. Needs an approved retainable published
   Golden source or an existing explicitly approved restricted artifact.
3. Home pulse: `GET research_contributions?select=id,author_user_id,
   author_contributor_id,author_name,created_at&status=eq.approved&created_at=gte.TS
   &order=created_at.desc&limit=1000`, `prefer=count=exact`, public schema.
   Exact observed boundary `2026-10-08T21:17:21.619Z` has2 approved rows/2creators;
   neither matches an approved public profile ID/name. No rows/account IDs or
   unverified names were exported. Needs independently approved public display
   attribution and a retainable account-free projection preserving uniqueness.
4. `POST /rest/v1/rpc/world_group_source_arrivals_v2`
   `{"p_before":null,"p_limit":24}`. Inspected definition is read-only SQL,
   but includes channel state `private` as well as `live`. Read-only behavior
   does not prove public-data admission. Automatic approval review rejected a
   query that derived private-source counts. No group body/count was acquired;
   no workaround or empty substitute was used. Needs explicitly approved source
   admission evidence/public projection or an existing approved public fixture.

Automatic review also rejected a combined full research-object/public-post
export. The accepted safer alternative reads only a zero-row research aggregate
and guarded public Post metadata; no rejected research-object payload was read.
That rejection is resolved for the proven empty anon scenario, while the group
source rejection remains unresolved.

No live A3 acceptance or trace-finish correction. No UDP rework, product changes,
threshold weakening, main/integration movement, merge/deployment, product DB/
flag/content changes, cloud permissions or extra sessions. Passive BEFORE
`a52ed989-30e3-44fe-8f0c-9c88f726bf78`; task
`GPT_PR1111_PUBLIC_CARD_APPROVAL_20261015`; dispatch NULL.
