# G2 — Canonical Compaction / Active Tree Freeze Gate v1

**Date:** 2026-09-15  
**Human Gate:** ZURIEL  
**Status:** MANDATORY PROGRAM GATE · EXTEND_EXISTING · DOCS-ONLY · NO RUNTIME CHANGE  
**Canonical Supabase:** `linswmnnkjxvweumprav`

## 1. Purpose

This gate exists to prevent accumulated G2 history, work logs, superseded rules, branch artifacts and duplicated documentation from becoming the operating map for G3.

It does **not** delete history and does **not** create a new Master, Registry, Rule System, Contract System, Owner System or Archive System.

It enforces a small active spine over preserved provenance:

`Master State -> Master Roadmap -> Owner Index -> owner families -> current active owners -> implementation/live state`

Historical rules, work logs, audits, branches and superseded decisions remain available for DRIFT, provenance, migration, recovery and explicit source research, but are not normal startup material.

## 2. HARD G2 CLOSURE BLOCKER

**G2 MUST NOT BE DECLARED CLOSED until this gate passes.**

Passing G2 Foundation/Product Capability proofs is necessary but not sufficient. Before formal G2 closure the project must complete a bounded semantic compaction and Active Tree Freeze.

The closure pass MUST prove all of the following:

1. Every active rule has a resolved canonical owner family, or an explicit classification explaining why it is intentionally owner-native and not separately routed.
2. No active rule family has conflicting simultaneously-active versions.
3. Owner families form a readable hierarchy instead of a flat list of hundreds of rules.
4. `SOD1820_MASTER_STATE.md` contains concise current-state/pointer reconciliation for material Human-Gate decisions without copying entire rule bodies.
5. `SOD1820_MASTER_ROADMAP.md` contains only navigation, priorities, gates and program sequence; it does not become a duplicate rulebook.
6. `SOD1820_MASTER_OWNER_INDEX.md` is the current domain -> owner routing spine and points to the active owner families.
7. Work-log CURRENT/open routing no longer requires scanning old completed sessions to know present state.
8. Branch-only / implemented / merged / deployed / live / verified are reconciled for material surviving work.
9. Superseded/legacy upper-layer semantics are clearly classified as historical/migration evidence and cannot silently outrank current owners.
10. A fresh agent can resolve representative tasks across Gematria, Raziel, Research OS, ELS, Books/Sources, Person/Life, Publishing, Follow/Attention, Experience and Release without broad historical scans.

If any of these fail materially, G2 remains OPEN.

## 3. Owner-family hierarchy target

The active tree should be understandable at two levels: family first, then scoped owners/rules.

Illustrative target (routing hierarchy, not new super-laws):

### GEMATRIA / NUMERIC

- Gematria engine / deterministic calculation owner
- Method Registry / method identity
- Method lifecycle
- Engine governance / execution authority
- Numeric/System-rule family index
- scoped numeric operators/rules

### RAZIEL / RESEARCH INTELLIGENCE

- Raziel companion owner
  - routing
  - response contract
  - voice
  - privacy/channel adapters
  - thinking/research protocol
- no second Raziel graph/context/truth store

### RESEARCH OS

- Research Studio / Context / Journey substrate
- Research Workspace
- Research Strategy / Research Plan
- Research Intake
- Truth Axes
- Result Bundle / Universal Finding contracts
- Foundation closure protocol

### REALITY / WORLD / TEMPORAL

- Reality Graph
- Events / temporal projections
- convergence/ranking owners
- Dynamic Lens / canonical subject promotion semantics
- media representation/placement semantics

### SOURCES / BOOKS / ELS

- Research Intake source chain
- Books/Source identity projections
- ELS canonical owner + single-engine law
- Corpus admission / witness / locator boundaries

### PERSON / PERSONAL / ATTENTION

- Person Foundation
- Personal Research / Workspace projection
- Follow / Notification / Subscription Funnel
- explicit Follow != inferred relevance != Raziel suggestion

### PUBLICATION / CONTENT / MEDIA

- Publishing conventions
- Publication/Post identity
- Contributor/Source attribution
- Share / canonical UI primitives
- Design / Product Visual Language

### SYSTEM / RELEASE / OPERATIONS

- Inter-agent coordination
- Live-state resolution
- release/deploy laws
- System Suggestions / Metatron operations
- Traffic Intelligence

This hierarchy is a routing/readability structure only. Existing canonical owners keep their authority; no umbrella family may duplicate their semantic bodies.

## 4. Work-log compaction target

`work_log` stays append-only provenance. Do not delete or rewrite historical rows merely to make counts smaller.

Normal startup must operate from a bounded current view:

- active assignments / open blockers / current handoffs
- latest authoritative AFTER per scope where materially relevant
- current release blockers
- current Human-Gate decisions not yet reflected elsewhere

Everything else is Archive/Provenance material.

The project should not require a fresh agent to scan thousands of completed rows to infer current state.

## 5. Rule-history compaction target

Inactive/superseded rule versions remain preserved.

Normal routing must read only:

`rule_id -> current active version -> canonical owner family -> direct dependencies`

Historical versions are opened only for conflict resolution, provenance, migration or explicit historical research.

No physical deletion of inactive rule versions is required by this gate.

## 6. Master / Roadmap / Owner Index responsibilities after compaction

### Master State

Current documented state + exact release-state distinctions + pointers to current canonical owners/contracts. No body duplication.

### Master Roadmap

Navigation, priority, mandatory gates, sequence and explicit open decisions. No full contract bodies.

### Owner Index

Finite domain -> canonical owner -> active/current version/status -> implementation pointer routing map.

### Work Log

Coordination, provenance and historical execution trace. Not Product SSOT.

## 7. Timing

### NOW / during remaining G2

- keep writing owner-native decisions and bounded reconciliation pointers;
- do not stop productive Foundation/Product Capability proof work for a massive archive migration;
- prevent new shadow owners and duplicated summaries.

### MANDATORY BEFORE G2 CLOSE

Run **G2 Canonical Compaction / Active Tree Freeze**:

1. census active rules and owner routing;
2. resolve/classify every material unrouted active rule;
3. freeze owner-family hierarchy;
4. reconcile Master State pointers;
5. reduce Roadmap to current sequence/gates;
6. define bounded current work-log routing;
7. classify legacy/superseded active-tree artifacts;
8. fresh-agent routing test across representative domains;
9. Human-Gate approval of the compacted map.

### MANDATORY AT END OF G3

Run a second **G3 Implementation Compaction / Archive Pass**:

- archive superseded G3 prototypes, rejected Experience variants and completed implementation audits outside normal startup routing;
- reconcile surviving implementation branches/PRs/migrations/deploy state;
- compact G3 release history into current implementation pointers;
- preserve full provenance, but keep the active tree small for the next program phase.

## 8. Acceptance metrics

This gate does not require an arbitrary small absolute number of rules. It requires low routing ambiguity.

Minimum acceptance:

- 0 material duplicate active versions per rule family;
- 100% of material active rules resolve to an owner family or explicit owner-native exception;
- one finite owner-family map readable without work-log archaeology;
- one bounded current coordination view;
- fresh-agent representative routing pass without broad historical scans;
- exact branch/release state for surviving material work;
- no loss of historical provenance.

## 9. Current calibration at gate creation

Live measurement on 2026-09-15:

- active rules: **249**
- inactive/historical rule rows: **136**
- total rule rows: **385**
- active rules already routed to canonical owner families: **201 / 249 (~81%)**
- active unrouted rows requiring reconciliation/classification: **48**
- active rule_ids with conflicting multiple active versions: **0**
- routed owner families observed: **25**
- work_log total: **3,755**
- work_log rows created in the last 14 days: **1,821**

Interpretation: the project is no longer primarily suffering from owner ambiguity; the remaining risk is documentation/provenance volume and incomplete central reconciliation. Compaction should preserve the history while removing it from normal decision routing.

## 10. Non-goals

This gate does NOT authorize:

- deleting old work_log rows;
- deleting inactive rule versions;
- inventing umbrella super-laws that copy scoped law bodies;
- creating a second archive database;
- rewriting Human-Gate history;
- merging unrelated runtime branches;
- declaring G2 closed by documentation cleanup alone.

## 11. Closure statement

**G2 Closure = Foundation/Product Capability Proofs PASS + Canonical Compaction/Active Tree Freeze PASS + all other active Foundation closure blockers satisfied.**

The project may preserve a large history. It may not preserve a large active ambiguity surface.
