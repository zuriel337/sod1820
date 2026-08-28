# SOD1820 — Personal Journey ↔ Universal Finding ↔ Derived Research Subject · Reconciliation v1

**Status:** Foundation reconciliation · Human-Gate ZURIEL directed continuation on 28.8.2026.  
**Scope:** docs-only provenance mirror for the canonical `project_codex.person_foundation_contract` §5-C update.  
**No authorization:** no schema, migration, table, engine, store, graph, UI, automatic persistence, canonical promotion, publication, merge or deploy.

## 1. Why this reconciliation exists

The Personal Research Journey stress tests exposed useful semantics — intent, research actions, chronology-of-knowing, source/event/model lineage, cross-engine traversal — but these must not become a separate Personal Research OS.

The live Foundation already has owners:

- Research Studio v1 owns Research Context, Lens, Journey and the overall `Discovery → Universal Findings → Investigation → Judgment` flow.
- Universal Finding v1 owns Finding identity, source-native identity, provenance and verification.
- Domain engines/adapters own source-scoped computation/search truth.
- Person Foundation owns person identity, roles, privacy and personal lineage requirements.
- Reality Graph owns canonical graph identity/relations when promoted under existing governance.
- ZURIEL is the Human Gate.

The job of this pass is therefore composition, not invention.

## 2. One routing spine

Forward-looking universal research spine:

`Person / Research Context → Research Subject / Anchor / Question → registered Lens / Source → Universal Finding → zero-or-more Derived Research Subjects → bounded next Lens / relation traversal → Convergence / Interpretation → Human Gate`

A person-scoped journey is one instance of this spine. It does not mint a Personal Router or a second Finding identity.

## 3. Identity boundaries

The following are deliberately non-equivalent:

`Research Context ≠ Research Subject ≠ Finding ≠ Derived Research Subject ≠ Research Object ≠ Canonical Entity`

### Research Context
Logical/query/workflow state: inquiry, scope, active Findings, selected Lens/Dimensions and Journey position. It has no storage owner of its own.

### Research Subject
The thing currently being investigated: person, number, name, event, verse, source, geometric structure, research object or another canonically/source-natively identified subject.

### Universal Finding
One source-scoped result carrying exact source/engine identity, verification and provenance.

### Derived Research Subject
A lawful follow-up subject exposed by a Finding. `traversable=true` means “this can be researched next,” not “this is true/significant/canonical/published.”

### Research Object
Persistent research claim/evidence/interpretation only after the existing explicit workflow chooses to persist/promote it. A Finding never auto-creates a `research_objects` row.

### Canonical Entity / Relation
Graph truth governed by existing Reality Graph + Human-Gate rules, never created merely because a Journey traversed through a subject.

## 4. Personal Journey is engine-agnostic composition

Correct model:

`Person → Anchor / Question → Gematria | ELS | Tanach | Numeric | Spatial | Corpus | Timeline | future registered Lens → separate Findings → lawful Derived Subjects → relations / convergence → researcher interpretation → Human Gate`

Incorrect model:

`Person → Personal Engine → Personal Truth Store`

The same research question may cross multiple engines while every Finding retains its own method, engine, source and source-native identity.

Cross-engine multiplicity is not automatically independent evidence. Shared source lineage, event lineage, model lineage, operands, transforms and derivations remain visible.

## 5. Research actions are provenance, not truth

Research actions may include:

`seen → searched → revisited → saved → collected → connected → dismissed → interpreted → accepted/rejected/open`

These actions may change Context/Journey state or ranking, but they do not mutate engine truth or canonical status.

Examples:
- `save` means “keep this in my research,” not “I assert this is true.”
- `revisit` means persistence of attention, not independent evidence.
- `connect` is a research action until a governed relation is explicitly admitted.
- `interpret` creates an interpretation layer; it does not rewrite the underlying Finding.

## 6. Chronology of knowing and model evolution

Journey traversal must preserve separate times where available:

- event/occurrence time;
- capture time;
- engine discovery time;
- interpretation time;
- Human-Gate decision time.

A later Finding, Derived Subject or model revision never rewrites an earlier Finding as though later knowledge was available then.

Model evolution is additive/superseding provenance: old understanding remains historically correct-to-its-time; later understanding may supersede it without deleting it.

## 7. Privacy and access across traversal

A Lens transition does not broaden access.

Private/person-scoped inputs remain governed by the Personal Data Processing contract. Derived material follows the strictest applicable privacy boundary along its derivation chain unless the same result is independently reproducible from non-private inputs as a separate Finding with separate provenance.

`engine_verified ≠ public` and `canonical ≠ published` remain in force at every hop.

## 8. Bounded traversal / anti-explosion

Foundation does not authorize infinite automatic exploration.

A Finding may expose candidate next subjects. Traversal depth/budget must be explicit and explainable. Numeric Router's current bounded Depth≤2 model is an implementation precedent, not a permanent numeric-only architectural rule.

No traversal hop may automatically:
- create a Research Object;
- create a canonical graph edge;
- create a convergence;
- promote a claim;
- publish material;
- recursively explore without a bounded policy.

## 9. Cross-contract ownership matrix

| Concern | Canonical owner |
|---|---|
| Active inquiry / Lens / Journey | Research Studio v1 |
| Finding envelope / source identity / verification | Universal Finding v1 |
| Engine calculation/search truth | Domain engine/adapter |
| Person identity / personal privacy / roles | Person Foundation |
| Source extraction integrity | Research Intake Foundation |
| Graph identity / canonical relation projection | Reality Graph |
| Convergence semantics | existing Research Convergence contracts |
| Canonical / publication decisions | Human Gate / existing Judgment contract |

No layer absorbs another layer's ownership.

## 10. Foundation Expansion Gate

**FOUNDATION SUFFICIENT.**

### MUST FOUNDATION NOW
No new schema/table/engine/store/graph.

The required Foundation semantics are contract boundaries already representable through existing identities, refs, metadata and provenance:
- exact source-native Finding identity;
- explicit parent/derivation lineage;
- Context/Subject/Finding/Derived Subject separation;
- chronology-of-knowing;
- privacy propagation;
- engine/method identity;
- Human Gate.

### EXTENSION POINT NOW
- generalized non-numeric Derived Research Subject adapters;
- explainable traversal depth/budget;
- Research Anchor / Research Identity ranking;
- source/event/model independence weighting;
- cross-engine Journey projection/state;
- targeted-vs-unsolicited provenance where relevant.

### LATER
- automatic multi-hop orchestration;
- personal research map UI;
- recommendations;
- notifications;
- recursive exploration;
- 2D/Layered/3D Journey visualization.

## 11. Explicitly do not build now

- Personal Router;
- Personal Finding store;
- Hint Engine;
- second Journey store;
- second Reality Graph;
- automatic `research_objects` creation for every Finding;
- automatic convergence promotion;
- automatic canonicalization/publication.

## 12. Operating principle

**Foundation → Projection → Experience.**

**Preserve capability, truth and provenance — not necessarily the legacy interface.**
