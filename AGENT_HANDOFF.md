# SOD1820 — AGENT HANDOFF

Status: canonical bootstrap pointer. It does not replace live verification.
Last updated: 2026-09-04.

## Mandatory bootstrap

Before substantial work, every agent must reconcile:
1. origin/main
2. live Supabase project linswmnnkjxvweumprav
3. recent project work logs
4. relevant decision records
5. active rules and project codex
6. SOD1820_MASTER_STATE.md
7. SOD1820_MASTER_ROADMAP.md
8. domain-specific contracts

Do not conclude that something is missing, duplicated, stale, abandoned, or unknown until these sources are reconciled.

## Current frame

- Roadmap: SOD1820_MASTER_ROADMAP.md — v5.3
- Master State: SOD1820_MASTER_STATE.md
- Research OS: docs/research-os-canonical-lock-v1.md
- Principle: One Tree · One Research OS · Many Lenses
- Tools remain independent domains. The Hall and Research OS connect the research journey; they do not replace tool engines.
- Human Gate controls canonical promotion.
- research_items = personal workspace membership
- research_objects = durable research assertions/candidates
- nodes + edges = canonical knowledge graph

## Reconciliation note — 2026-09-04

An independent audit initially interpreted recent GPT+Zuriel work around Research Objects, Human Gate, Truth Axes and PR flow as a parallel operating system.

After reviewing the actual GPT work trail, that interpretation was corrected:
- it is not a parallel OS;
- it is operational use/evolution of the already-contracted Research OS;
- research_objects and decision_ledger predate the recent GPT work;
- Human Gate is an established project concept;
- the growth of research_objects from 124 to 680 was explained by documented research operations;
- no automatic promotion of those research candidates to canonical graph truth was identified.

Do not reopen this as an unknown parallel GPT system unless new live evidence contradicts the reconciliation.

## Branch archaeology rule

An unmerged branch after the 2026-09-01 history rewrite does not prove missing production work.

Required order:
1. inspect branch provenance;
2. compare payload to current main;
3. check whether equivalent work landed elsewhere;
4. classify ARCHIVE, INSPECT, RECOVER, or SUPERSEDED;
5. never merge an old branch wholesale merely because it is unmerged.

Known example:
claude/gematria-lists-organization-u39nlj is a preservation/research snapshot. Its v1/v2 master classifications are superseded; v3 is research metadata/candidate material, not a second production corpus.

## Before implementation

Verify current implementation on main, live DB state for DB-dependent claims, recent work in the same domain, existing Human Gates, and whether the capability already exists under another route/name/branch.

## Before declaring missing or duplicate

Require current-main evidence, live-DB evidence where relevant, recent-work provenance, and the relevant contract/roadmap statement. If evidence is incomplete, use UNKNOWN / NEEDS RECONCILIATION.

## Closing protocol

After meaningful work:
1. record work provenance;
2. record a decision only when a real decision occurred;
3. update canonical docs only when canonical state changed;
4. keep superseded history additive;
5. record PR/commit/deploy state;
6. reconcile again against current main and live DB.

## Documentation drift

If implementation or live data is newer than the docs, label STALE DOCUMENTATION. Do not reinterpret the live system as a parallel architecture merely because the documentation lagged.

Rule: Reconciliation before construction. Provenance before recovery. Evidence before interpretation.
