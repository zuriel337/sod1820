# SOD1820 — Reality Graph Relation Vocabulary Audit V1

**Date:** 2026-10-04  
**Status:** READ-ONLY audit / Human-Gate proposal only  
**Live baseline:** `origin/main=07b06bc3d8ac16b6ef4bd73d256b5e1ee6b8a6a5`  
**Canonical Supabase:** `linswmnnkjxvweumprav`  
**Owner:** `reality_graph_law v8` + `entity_structure_law` + owning domain writers

## Why this audit exists

The external CTO/Gemini challenge correctly identified a second-order risk: One Reality Graph can remain semantically clean only if relation vocabulary and provenance do not drift as more writers are added.

The Foundation contract is already strong: One Reality Graph, typed relations, provenance/lineage, dependency classification before ranking, Explain-Why, and separation of Research Strength / confidence / verification / governance.

The live DB enforcement is weaker than the contract:
- `public.edges.relation_type` is free text with no CHECK/FK vocabulary constraint.
- `upsert_edge(..., p_rel text, ...)` accepts any relation string.
- several active DB writers insert directly into `edges`, so hardening `upsert_edge` alone is insufficient.

This audit does **not** create a second graph, registry, store, relation engine or truth owner.

## Live inventory

Live `public.edges`: **7,212 rows / 31 relation types / 0 missing endpoints**.

| relation_type | rows | observed semantic family |
|---|---:|---|
| mentions | 2700 | representation/content reference |
| contains | 2334 | structural membership / payload containment |
| related | 917 | broad legacy/context relation |
| equals | 392 | numeric/equality |
| scale_x10 | 301 | numeric transform |
| converges_on | 174 | convergence/research relation |
| documents | 129 | source/documentation relation |
| demand_signal | 80 | traffic-intelligence projection |
| cross | 65 | crossing/research relation |
| contributes_to | 23 | contribution provenance |
| zero_scale | 19 | numeric transform |
| bridges_to | 13 | language-bridge projection |
| has_language_bridge | 13 | language-bridge projection |
| equals_word | 12 | legacy/domain equality |
| discovered_by | 9 | discovery provenance |
| derived_from | 5 | lineage |
| extends_rule | 5 | rule lineage |
| cipher_link | 3 | cipher/numeric relation |
| equals_by_depth | 3 | method/depth-specific equality |
| represents | 3 | representation/semantic mapping |
| contained_in | 2 | containment relation |
| interpreted_by | 1 | interpretation relation |
| is_kadmi_of | 1 | method-specific relation |
| kadmi_equals | 1 | method-specific relation |
| kadmi_reverse_of | 1 | method-specific relation |
| opposite_of | 1 | concept relation |
| relates_to | 1 | legacy/generic semantic relation |
| reverse_of | 1 | numeric reversal |
| scale | 1 | legacy numeric scaling |
| seeded_by | 1 | authored/provenance relation |
| source | 1 | legacy source relation |

The low-count relation types are **not automatically invalid**. Live inspection shows real semantics behind them, e.g.:
- `scale`: 1120 → 112 with factor 10 and source metadata.
- `source`: a convergence → source Post 5007.
- `seeded_by`: concept → contributing/founding entity.
- Kadmi variants preserve method-specific historical research semantics.
- `contained_in` is used for both number-sequence and word containment.

Therefore a destructive "normalize all rare relations" pass is NOT authorized.

## Active live writers

Live function-body inspection finds seven current edge writers:

1. `fn_ti_project_demand(...)`
   - writes `demand_signal`
   - strong metadata: period, dates, visits, quality inputs, source=traffic_intelligence.
2. `project_language_bridges()`
   - writes `has_language_bridge`, `bridges_to`
   - provenance is represented through the language_bridge node plus method/value/lang metadata.
3. `upsert_edge(uuid,uuid,text,jsonb)`
   - generic writer
   - validates endpoints + duplicate only; **does not validate relation vocabulary**.
4. `graph_wire_number(integer)`
   - writes `equals`, `converges_on`, `scale_x10`, `mentions`, `documents`
   - metadata includes source=grapher.
5. `sync_convergence(uuid)`
   - writes `contains`, `related`
   - relation is replayable from topic_card/node payload; direct inserts do not add edge metadata.
6. `wire_image_meaningful(uuid)`
   - writes `contains`
   - replayable from gallery image primary_value and canonical image/number identities.
7. `wire_number_to_images(bigint)`
   - writes `contains`
   - replayable from gallery image primary_value and canonical image/number identities.

Historical migration files contain older writers and relation experiments such as `has_value`, but the current research-object canonicalization path explicitly removed automatic graph materialization. `research_objects → canonical` does **not** currently create nodes/edges.

## Provenance finding

A universal rule "every edge must have source_id NOT NULL" would be wrong for the current architecture.

Edge lineage is currently expressed in three valid shapes:
1. **edge metadata** — e.g. `demand_signal`, graph-wire relations;
2. **provenance node / source-native object** — e.g. language_bridge;
3. **deterministic replay from canonical endpoints + owning source record** — e.g. convergence membership and gallery-image→number containment.

The 12 literal `metadata IS NULL` rows are six `contains` + six `related` legacy convergence rows from 2026-07-15. They are not endpoint-orphans. Additionally many current deterministic relations use empty `{}` metadata by design.

Therefore provenance acceptance should be **relation-family appropriate and replayable**, not a single mandatory column shape.

## Decision on apparent aliases

No automatic alias migration is approved by this audit.

- `scale` vs `scale_x10`: **strong alias candidate**, but the one legacy `scale` row must preserve its explicit factor/source payload before any migration.
- `related` vs `relates_to`: **needs owner review**, not proven aliases. `related` is a large legacy/general relation used by `sync_convergence`; the one `relates_to` row is word→concept with method context.
- `equals` vs `equals_word` / `equals_by_depth`: **do not collapse blindly**; method/depth semantics may be material.
- Kadmi relations: preserve until numeric/method owner explicitly maps them.
- `source`: legacy source-role candidate; do not rewrite without source/Convergence owner decision.

## Recommended enforcement — smallest safe shape

**Do not add a relation registry/table.**  
**Do not create a parallel graph owner.**  
**Do not apply a universal confidence score.**

Recommended sequence:

### R1 — Vocabulary freeze (MUST before G4 closure decision)
Treat the current 31-value vocabulary as the bounded compatibility snapshot. New relation types require an explicit change under `reality_graph_law` / owning domain rather than arbitrary string insertion.

### R2 — Writer acceptance
For every active writer prove:
- relation types are in the bounded vocabulary;
- endpoint type combinations are expected;
- provenance is inspectable through metadata, provenance node, or deterministic replay;
- write is idempotent / duplicate-safe according to its domain semantics.

### R3 — Human-Gated DB enforcement
After R1/R2, choose the smallest common enforcement boundary that all writers cannot bypass.

Preferred direction: table-level validation (CHECK/trigger under existing graph owner) using a bounded allowlist, because several legitimate writers bypass `upsert_edge`.

Do **not** harden only `upsert_edge`; that would leave direct writers unconstrained.

The first enforcement migration should preserve all currently accepted live relation values and reject **new unknown strings**. Semantic compaction/alias migration is a separate later decision.

### R4 — Legacy compaction later
Only after the system proves readers/writers do not depend on a legacy relation type may a Human-Gated alias migration occur. Preserve original provenance/history.

## Human-Gate decisions still required

1. Approve or reject the bounded 31-value vocabulary freeze as a G4 Foundation invariant.
2. Decide whether enforcement is implemented as table CHECK vs validation trigger/function under the existing graph owner.
3. Decide whether the obvious alias candidates (`scale`, `relates_to`, etc.) remain compatibility vocabulary or receive a later migration.
4. No destructive edge rewrite is authorized by this audit.

## Verdict

**FOUNDATION GAP CONFIRMED, BOUNDED.**

The One Reality Graph architecture itself does not need redesign. The gap is enforcement: contract says typed governed relations; DB currently permits arbitrary relation strings.

Smallest safe closure:
**freeze current vocabulary → verify active writers/provenance → Human-Gated common DB validation → later optional compaction.**
