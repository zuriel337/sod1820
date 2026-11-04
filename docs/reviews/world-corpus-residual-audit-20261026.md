# World — residual corpus audit, 2026-10-26

Status: IMPLEMENTED / TESTED as offline audit; no product data changed.
Base: `cd1db1840f5f353feac5e7bbb6174eabce3f0b71`.
Branch: `gpt/world-corpus-residual-audit-20261026`.
Live `origin/main` observed: `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`.

This is review evidence for central integration, not an application reader,
runtime data source, new registry or publication decision. The JSON companion
contains every residual ID and exact source-bound replay results. Candidate
content is not included. The existing public reader and admin boundary are unchanged.

## Exact reconciliation

The audit reuses only the SELECT portions of the staged v2–v7 migrations.
It does not execute a migration, transaction block, lock, temporary table or
privileged writer. Both queries and engine replays used the approved read-only
Supabase connector for project `linswmnnkjxvweumprav`.

The exact primary `channel_updates:<uuid>[#fragment]` scope, bound to Zvi's
contributor UUID and live/public `torat-haremez` source rows, contains:

| State | Rows |
|---|---:|
| Approved | 5,440 |
| Canonical | 104 |
| Candidate, excluded from this review queue | 1,705 |

Within the approved rows, v2–v7 cover 2,250 unique IDs: 153 + 1,813 + 170 + 34
+ 8 + 72. No cross-batch ID overlap was found. The prepared representative set
contains 924 rows. The residual is exactly **3,190 rows from 769 source messages**.

These are bounded-scope counts, not a claim that every writer corpus or alternate
source locator has been covered. Ten additional public approved rows with an
explicit Zvi contributor ID have bot/queue locators rather than a resolved
public channel source; their IDs are recorded separately in the JSON evidence.

## Routing partition

Each residual ID belongs to exactly one primary review lane. Lane assignment
uses stored metadata and lexical hints, not verified knowledge-type assertions.
Images, duplication, calculation and publication remain independent dimensions.

| Review lane | Rows | Has an image on the exact source |
|---|---:|---:|
| Text, insights and attributed interpretation | 1,908 | 332 |
| Gematria / numeric claims | 883 | 105 |
| Formula extraction | 278 | 70 |
| Spatial structures | 71 | 32 |
| ELS / cipher references | 35 | 0 |
| Language references | 8 | 0 |
| Constants | 5 | 3 |
| Explicit OCR/transcription pending | 2 | 2 |
| **Total** | **3,190** | **544** |

An image flag proves that the exact source row has an image URL. It does not
prove correspondence between a specific visual claim and that image. The 35
cipher references are a routing queue; no ELS search or replay is claimed here.

## Engine replay and overlap findings

219 rows carry one extracted phrase, a named canonical method, and an explicit
historical calculation envelope. Replaying `fn_method_value(method, phrase)`
returns the stored value for all 219. However, only 191 have plain Hebrew input.
The other 28 contain operators, digits or presentation marks and remain in
expression parsing: the Hebrew engine may ignore those characters.

For example, a result for `393+393=תשפו` does not verify the arithmetic merely
because the letters of תשפו return 786. No `verified`, status or truth field
was changed by these replays.

The **191 plain-input matches** partition as follows when compared with actual
prepared representatives or already-connected rows (not all reviewed rows):

| Evidence | Rows | Disposition |
|---|---:|---|
| Same source, value and exact term in a retained row | 98 | Review occurrence/claim overlap; preserve provenance |
| Phrase occurs literally in retained statement only | 30 | Review extraction coverage; not proof of identical finding |
| Same source/value, without exact phrase in retained terms or statement | 58 | Preserve separately pending content coverage review |
| No retained source/value pair | 5 | Five source-inspected numeric connection recommendations below |

The earlier conversation's 173 overlap count compared all reviewed rows,
including rows not chosen as representatives. It is superseded by this table.

**Integration hold on duplicate suppression:** source+number grouping in earlier
batches is not proof of identical content. The 1,311 retained sibling occurrences
must not be described as proven exact duplicates or hidden solely by that key.
58 plain-input findings need representative coverage verification first. This
audit does not establish that all 58 are unique: spelling/format variants may
account for some. All IDs and proposed representative IDs remain in the JSON.

The strict full-payload identity check found no identical residual payloads.
This does not mean the corpus is duplicate-free; differing provenance metadata
and partial overlaps deliberately stay outside that strict check.

## Five exact-source recommendations

The full text of three live public source messages was inspected for these five
numeric facts. Each value resolves to one existing active public number node.
The interpretation and personal/narrative context in each source are outside the
numeric verification. No new person identity or identity relation is inferred.

| Finding ID | Phrase | Number | Exact source excerpt |
|---|---|---:|---|
| `02d7c0ba-9d93-4c19-ac80-8374bd615d1f` | חברון | 266 | `רחל(238)+חברון(266)` |
| `68957ca2-ee0f-4971-b5bd-ae2d2a16a067` | יקיר | 320 | `יקיר (320)+אפרים(331)=651` |
| `6c56fdd3-04a1-4028-a7cf-1c41339ff44a` | כתר | 620 | `אל(31)+כתר(620)` |
| `7426fa88-6d89-4ad4-99fd-bc360112bd12` | אפרים | 331 | `יקיר (320)+אפרים(331)=651` |
| `7eb816c3-a513-49c1-b167-7505cd775f29` | סוד | 70 | `סוד (70)כפול אחד(13)=910` |

Each exact `sourceRef`, source fragment, existing target UUID and source excerpt
is recorded under `reviewedNewTargets`. These are reviewable recommendations;
this commit contains no promotion migration and none were newly attached live.
Multiple findings from one message do not become independent sources.

## Other public writers

The public contribution table still has 70 undeleted rows admitted by the
existing public writer-page contract: 4 already projected, 37 selected in
v8–v10, and 29 remaining. These counts describe contributions, not all posts,
books, channel messages or essays across the site.

| Writer | Remaining | Next work |
|---|---:|---|
| Zvi | 8 | Source contradictions, extraction, frequencies and nonnumeric claims |
| Shimon Haimov | 8 | Five interpretations; three numeric-method claims |
| Yaniv Levi | 2 | One source phrase and one ELS-linked contribution |
| Israel Panzer | 5 | Three essays and two media sources; retain attribution |
| sod1820 | 6 | Replies/test/context content; assess source role before graph projection |

Ariel's three contributions are already selected in v8/v10 with exact contributor
identity preserved. Shachar's two and Yaniv's three published numeric sources
are selected in v9. The JSON lists the exact 37 selected IDs and all 29 residual
contribution IDs. No identity was joined by display name.

## Reproduction and acceptance

Generate a single read-only query with:

```sh
node scripts/audit-world-corpus-residual.mjs summary
node scripts/audit-world-corpus-residual.mjs evidence
node scripts/audit-world-corpus-residual.mjs replay
```

Execute through the approved read-only connection. `rows` mode is also available
for authorized review; it must not be added to a public endpoint or bundled UI.
The tool itself never connects to a database or executes SQL.

Tests cover read-only extraction, rejection of mutating statements, total/disjoint
ID coverage, mixed-input numeric false positives, unavailable/mismatch handling,
and source/value overlap versus content identity. Live fingerprint:
`31b21902d1eda0309a96403ad3c71aeb`.

Acceptance: 86/86 focused/cumulative Node tests passed, including public reader,
navigation, writer catalogue and prepared batch contract checks. `build:2029`
passed with the existing large-chunk/dynamic-import warnings. No browser retest
was needed: this cut changes only offline audit scripts, evidence and tests.

Next concrete work: compare the 58 retained-content gaps first, parse the 28 mixed
expressions, then process the remaining numeric lanes. Spatial, ELS and language
lanes require their own source/method evidence. The remaining 2,971 rows outside
this replay batch have routing and blockers only; their claims were not replayed.

No UI changes, new Preview, main merge/push, Production action, RLS change or live
product data write occurred. Work-log coordination is recorded separately.
