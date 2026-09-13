# SOD1820 — G2 Gate 2 Preservation Manifest v1

State: READ-ONLY MANIFEST · NOT A SECOND STORE · NOT GATE-2 CLOSURE
Canonical live DB: `linswmnnkjxvweumprav`
Base `origin/main`: `fa154d67e5209c28f4043c2adfdede5451f12386`
Human Gate direction: Zero Upper-Layer Inheritance. Preserve capability/data/truth/provenance/history/privacy/human decisions; do not preserve legacy UI/authority merely because it exists.

## Purpose

Pin the live preservation denominator before any future rehome/retirement deletion. The live canonical tables remain the data homes. This document is an aggregate manifest only; it does not copy private payload and does not create an archive database/store.

## Live row-count snapshot

| Home | Rows | Preservation role |
|---|---:|---|
| research_objects | 735 | KEEP BEDROCK research artifacts; preserve identity/status/provenance |
| research_object_revisions | 98 | KEEP BEDROCK additive history |
| relation_evidence | 132 | PRESERVE evidence payload/history; legacy current-state semantics require later rehome/extension |
| decision_ledger | 24 | KEEP BEDROCK Human decisions/provenance |
| persons | 82,236 | PRESERVE identity provenance subject to privacy/erasure owner |
| identity_edges | 85,864 | PRESERVE identity provenance subject to privacy/erasure owner |
| posts | 1,292 | PRESERVE source/content payload; not future architecture authority by existence |
| post_revisions | 139 | PRESERVE authored/history state |
| agent_user_memory | 917 | PRESERVE under privacy owner; Uriel/Hatishbi archived, Raziel active |
| nodes | 6,515 | PRESERVE legacy semantic payload/provenance; not automatically qualified 2029 truth |
| edges | 7,091 | PRESERVE legacy relation payload/provenance; many lack modern lineage |
| convergences | 8,917 | PRESERVE legacy raw convergence payload; not future authority by existence |
| topic_cards | 212 | PRESERVE curated legacy payload/history; projection/knowledge classification later |
| gematria_words | 15,518 | PRESERVE corpus/calculation operand history under engine/method owners |
| bidim | 366,492 | PRESERVE derived calculation materialization + provenance-state history |
| language_links | 13 | PRESERVE source/cross-language research payload |
| discoveries | 16 | PRESERVE historical payload; legacy authority already contained |
| insights | 315 | REHOME unique knowledge/provenance where qualified; RETIRE legacy authority |
| ai_discoveries | 10 | REHOME unique payload/provenance where qualified; RETIRE legacy authority |
| research_contributions | 391 | PRESERVE representation/community contribution payload/history |
| raw_gematria | 9,748 | PRESERVE historical staging/provenance until reconciliation; RETIRE legacy authority |

## Archived agent-memory census

- `uriel`: 319 rows — archived research/memory payload; runtime retired.
- `hatishbi`: 296 rows — archived research/memory payload; runtime retired.
- `raziel`: 302 rows — active agent memory; privacy owner applies.

## Non-negotiable preservation classes

1. Human decisions and decision provenance.
2. Research artifacts + revision history.
3. Source/content payload + available revisions/locators.
4. Identity/Person provenance subject to consent/retention/export/erasure semantics.
5. Canonical engine/method identities and calculation provenance.
6. Legacy graph/convergence/topic payload as historical evidence only, never auto-promoted to 2029 authority.
7. Archived Uriel/Hatishbi material as historical research payload, not active agent authority.

## Explicit non-closure

This aggregate manifest is not an immutable byte-level/database backup and does not by itself close Gate 2. Before any destructive retirement/rehome step, closure evidence must prove that the affected payload/history is recoverable from an approved snapshot/export/backup or remains durably preserved in its canonical home. Until then: NO destructive legacy-table deletion.
