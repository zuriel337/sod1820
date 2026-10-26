# One Tree Branch Contract 2029

Date: 2026-10-26

Branch: `gpt/system-self-model-contract-20261026`

State: branch-only contract + owner-bound Topic adapter; migration candidate not applied live; no
merge, publication, flag change or deploy

## Decision

SOD1820 now has one generic branch contract between the site-wide System Self-Model and individual
domain profiles. Elections is the first profile; it is no longer the architectural template.

```text
System Self-Model / Surface Launch Contract
└── One Tree Branch Contract
    ├── domain profile: elections
    ├── domain profile: person
    ├── domain profile: book / corpus
    ├── domain profile: place / event
    ├── domain profile: number / calculation
    ├── domain profile: gallery / source collection
    ├── domain profile: tool / journey / community
    └── future profile with the same rails and invariants
```

The generic contract is implemented in `src/lib/research/oneTreeBranchContract2029.js`.
`src/lib/research/electionsDomainContract2029.js` is now a thin election-specific profile and
compatibility adapter over it.

## What one branch can contain

A branch has one root identity and may contain any mix of stable entity kinds. The common vocabulary
currently names Topic, Person, Book, Place, Event, Number, Election, Gallery, Corpus, Tool, Journey,
Community, Collection and Cross-Domain branches. The compiler also accepts a future stable kind; a
new domain therefore does not require a parallel contract.

Each branch declares:

- stable branch, profile and finding namespaces;
- branch kind, root entity and review state;
- explicit branch, entity, source, evidence and relation access tiers;
- parent, child and related branch references;
- domain tags and semantic attributes;
- entities and source provenance;
- evidence records in separated lanes;
- proposed, evidence-backed relation candidates;
- deterministic compilation timestamp;
- canonical owner pointers for Graph, Truth, Research, Access, Availability, Raziel, Personal
  Reality, Publishing and Presentation.

It never owns a route, Graph row, Research Object, access grant, engine, publication decision or UI.

## Evidence lanes

| Lane | Purpose | Typical domains |
|---|---|---|
| `source_provenance` | Identity and location of a source | all domains |
| `source_fact` | A bounded statement/value extracted from a source | books, people, elections, places |
| `observation` | A sourced observation without promoting a claim | events, media, field research, journeys |
| `engine_output` | A versioned native result from a canonical engine | ELS, number, name, time, language |
| `engine_calculation` | A versioned calculation result | gematria and other calculators |
| `derivation` | A deterministic value derived from earlier evidence | arithmetic, date and relation derivations |
| `authored_claim` | An attributed claim awaiting governance | research and contributor material |
| `interpretation` | An attributed reading over inspectable dependencies | cross-domain synthesis |

Every record carries its epistemic lane, verification state when known, semantic class, governance
state, access tier, subject refs and dependencies. A source is not a fact; a derivation is not a
source fact; an engine result is not an interpretation; an interpretation is not promoted by the
compiler.

## Relations and One Tree

Relations inside a branch are always `proposed_relation_candidate`. They carry from/to entity refs,
evidence ids and an access tier. The compiler verifies that every endpoint and evidence dependency
exists and rejects duplicate identity, dangling refs and dependency cycles.

The result is a read-only branch projection over the existing Reality Graph. Only the existing
Graph/Human-Gate writer may decide that a candidate becomes a canonical edge.

Cross-branch structure uses explicit parent, child and related branch refs. This permits a broad
tree without copying child contents into a parent or forcing every domain into one enormous record.

## Research OS integration

Each evidence record becomes a Universal Finding envelope with its original lane in
`projection.dimensions`. Findings are grouped into the existing Research Result Bundle according to:

- evidence lane;
- semantic class;
- access class;
- engine/method/version provenance.

No fourth research store or alternate synthesis object is introduced. Existing Result Bundle rules
remain active: no AI arithmetic fallback, no automatic canonicalization, no automatic publication,
no false negative evidence and no raw authorization context in output.

## Access and privacy

The contract uses the existing Research access vocabulary: `public`, `public_candidate`, `private`
and `personal`.

Access exists independently on the branch, every entity, every source, every evidence record and
every proposed relation. The consumer boundary recomposes the Result Bundle with the existing
normalized access descriptor and then filters all outward refs.

Important behavior:

- public consumers receive public material only;
- passing `{allowed_access_tiers:["private"]}` without an attested authority does not widen access;
- a verified boundary may receive only the tiers it explicitly attests;
- a public record/relation cannot reference a private or personal subject, source or dependency;
  restricted records may reference public material plus their own exact tier;
- a private branch is wholly withheld from a public consumer, including branch id, root id,
  hierarchy, source ids, relation ids and findings;
- Personal projection carries an explicit `authorizedProjectionOnly` guard;
- private/personal raw authorization input never enters the branch or output.

The branch compiler grants nothing. It only respects an access descriptor already established by a
trusted boundary.

## First owner-bound Topic adaptation — 888 / Yeshua

The existing `888-yeshua` Topic is the first concrete `personal` branch adaptation. The user
identified the Jesus material as coming from writer Amit Bliz and directed that it remain in One
Tree while being visible only to the account owner.

The branch-only migration candidate
`supabase/migrations/20261026130000_personal_one_tree_topic_branch_v1.sql` extends the existing
owners rather than creating a private store:

- `topic_cards` gains a separate `public | person_only` access axis and canonical
  `persons.person_id` owner;
- the public view and raw-table policy require both public access and the existing publication
  gates;
- an authenticated RPC derives ownership from `auth.uid() → persons` and returns a sanitized row
  without owner ids or underscore-prefixed internal fields;
- the Reality Graph reuses `metadata.space='private'` plus an owner-bound access receipt on the
  existing convergence node and its edges;
- `sync_convergence` preserves that private/inactive state on every later Topic→Graph sync;
- the public SECURITY DEFINER `number_map` now enforces graph space explicitly, and the internal
  `fn_number_dossier` applies the owner gate before returning raw Topic cards to an admin;
- four existing Amit research objects become `person_only`, retain their existing candidate and
  engine-verification states, and remain in Research OS;
- the visible private attribution is `עמית בליז`; the existing canonical contributor identity
  `amit-mike-rob` / `עמית מייק רוב` is preserved as provenance and is not globally renamed;
- attribution is explicitly not verification, canonicalization or publication.

The 2029 Topic reader remains public-first. Only when the public view has no row does it call the
owner RPC. Anonymous callers, other account owners and other admins receive no personal row. The
personal material is not embedded in client code or a static branch bundle.

## Consumer contract

One function projects the same branch identity and evidence ids to:

- World
- Topic
- Post
- Number
- Person
- Book
- Place
- Event
- Gallery
- Search
- Journey
- Tool
- Raziel
- Personal
- API

The projection carries semantic refs and guardrails, never layout or presentation instructions.
This permits web, mobile, a later 3D renderer and AI consumers to use the same branch without
redefining its truth.

## Raziel contract

Every domain may produce the same Raziel Context Pack. Raziel may:

- explain evidence-backed connections;
- label evidence lanes;
- suggest the next research action;
- preserve attribution and access filtering.

Raziel may not:

- promote a record to canonical truth;
- publish;
- invent a missing source;
- perform an unowned local-engine fallback;
- widen access;
- turn a proposed relation into a Graph edge.

The same rules apply to elections, books, people, locations, events, numbers and future profiles.

## Presentation boundary

The compiler recursively rejects visual and ownership-taking payloads, including layout, style,
color, component, renderer, animation, spatial coordinates, canonicalization, approval, publication,
Graph-write commands, raw user data and raw authorization context.

Design V2 and System Frame remain the presentation owners. Claude receives the stable projection
after domain and access semantics are settled. A later 3D layer consumes the same entity, evidence
and relation ids rather than creating a second tree.

## Elections migration

The elections profile now maps its existing shape into the generic contract:

- election source facts → `source_fact`;
- gematria and exact arithmetic → `engine_calculation` with evidence/derivation semantic classes;
- authored numeric readings → `interpretation`;
- election graph proposals → generic proposed relations;
- the election Raziel export → generic Raziel Context Pack.

Election-specific rules remain local to the profile: official assertions require an official
source, calculation values must be finite, election interpretations stay Human-Gate pending and
cycle refs must resolve. No generic branch is forced to know election vocabulary.

## Acceptance coverage

The generic golden fixture deliberately mixes a Topic, Book, Person, Place, Event, Number, private
note and personal moment in one branch. Tests prove:

- broad cross-domain compilation and hierarchy;
- public/private/personal filtering at the projection boundary;
- refusal of unattested access widening;
- explicitly attested tier projection;
- complete withholding of a private branch from public Search;
- identical branch identity across every declared consumer family;
- generic Raziel limits;
- fail-closed dangling refs, dependency cycles, canonical states and visual payloads;
- deep immutability;
- unchanged elections results and evidence separation after profile migration.
- PostgreSQL 17 integration proof that anon and a second admin cannot read the personal Topic,
  graph branch, number dossier card or linked research, while the owner can;
- repeat Topic→Graph synchronization keeps the personal node inactive and all recreated edges
  private;
- the 2029 production build succeeds with the owner-only fallback wired.

## Deliberately not changed

- no live product-database write; the owner-bound SQL exists only as an unapplied migration
  candidate on this branch;
- no live canonical `nodes`/`edges` write; the exact owner-bound update remains inside the
  unapplied migration candidate;
- no route, site flag, sitemap or launch-state change;
- no active World, Topic, Raziel, Workspace or Personal component;
- no CSS, visual design or 3D implementation;
- no merge, push, deployment or Production change.
