# Research Intake — Extraction Integrity Patch v6

> **ONE CONTRACT / ONE SYSTEM:** This file is a Git provenance mirror only. Canonical live contract remains `project_codex.slug='research_intake_foundation_contract'` + `nodes.rule_id='research_intake_foundation_contract_law'` in Supabase project `linswmnnkjxvweumprav`.

**Human Gate:** ZURIEL, 27.8.2026.  
**Evidence:** ZVI 3060 Golden Extraction Reconstruction.  
**Scope:** contract correction only. No schema/table/engine/store/graph added.  
**Status:** DB-live as `research_intake_foundation_contract_law` rule_version=6. Git mirror on branch only; not merged/deployed.

## Why v6 exists

The v5 freeze correctly showed that the existing primitives could store many research findings, but the 3060 golden reconstruction exposed a narrower extraction-integrity failure that the freeze had classified too lightly: arithmetic can survive while source meaning is lost.

Observed live:

- Source: cube with six faces, each face = `ישר` (510), therefore `6 × 510 = 3060`.
- Extracted Research Objects preserved `ישר=510`, while the compound `6×ישר=3060` and the semantic reason for the `6` (cube faces) did not survive as a complete derivation.
- Pentagon/triangle 3060 material preserved arithmetic such as `5×ברית=3060` and `(טוב×36)×5=3060`, but lost the source roles `outer perimeter`, `inner perimeter`, `four inner triangles`, and containment.
- Source rows explicitly contain `[Image 3848.jpg]`, `[Image 3850.jpg]`, `[Image 3855.jpg]`, `[Image 3856.jpg]` while `channel_updates.image_url IS NULL`. The source therefore proves an attachment/reference existed even when the resolved asset is currently missing.

The v5 statement “0 MUST FOUNDATION NOW” is preserved as historical provenance, but is superseded **for complex extraction integrity** by this patch.

## 7.1 Semantic Operand / Quantity Provenance Law — MUST FOUNDATION NOW

An extracted arithmetic result is incomplete when a literal operand/quantity came from source meaning outside the calculation engine and that origin is lost.

Every externally supplied operand or quantity that materially participates in a derivation must preserve **why the number is present**, not only its numeric value.

The contract may express this through existing flexible metadata, e.g. `meta.ext.derivation.inputs[]`, with fields such as:

- `value`
- `role`
- `origin_type`
- `origin_ref` or `origin_statement`
- verification/provenance state

Possible `origin_type` families include source-declared quantity, corpus count, geometric count, textual position, temporal quantity, or other source-backed semantic origin. Domain adapters may define richer vocabularies; Intake owns the universal requirement that the origin survive.

**Golden rule:** preserving only `ישר=510` or only `6×510=3060` is insufficient when the source says the `6` is the number of cube faces.

**Truth separation:** engine verification of arithmetic does not verify the semantic origin of the quantity.

## 7.2 Source Media Reference Preservation Law — MUST FOUNDATION NOW

A source artifact that explicitly references media must preserve the reference as provenance even when the binary asset or URL cannot currently be resolved.

`image_url IS NULL` must never be interpreted as “there was no image” when the source text or source metadata contains an attachment marker.

Using existing extension metadata (no new table required), extraction must preserve:

- raw media marker/reference
- source-artifact identity
- resolution state (`resolved`, `unresolved`, `missing_asset`)
- resolved URL/id when available

An unresolved attachment marker is evidence of a missing representation, not permission to silently erase it.

## 7.3 Extraction Fidelity Gate — MUST FOUNDATION NOW

For complex sources, `ENGINE_VERIFIED` arithmetic is not sufficient evidence that extraction succeeded.

Before a source slice is declared successfully extracted, the system must verify that materially claim-bearing roles survived across:

`SOURCE ARTIFACT → EXTRACTED CONTENT → PROCEDURE / DERIVATION → FINDING / CLAIM → EVIDENCE / REPRESENTATIONS`

The gate checks at minimum:

- semantic operand origins
- media/source anchors
- operation order and dependency
- distinct representations

Loss of any materially claim-bearing element is `EXTRACTION_INCOMPLETE`, even when every surviving calculation is correct.

## 7.4 Spatial boundary

This patch does **not** define Spatial Gematria domain laws and does not create a geometry engine/store/graph.

The existing single Spatial capability remains canonical (`src/lib/spatialModels.js`, `Gematria3DPage.jsx`, `GematriaCube.jsx`, plus existing reveal/projection paths). Spatial-specific identity, region, containment, boundary/interior, face/vertex semantics belong to the Spatial adapter/rules pass.

The universal Intake law is only: when spatial (or any other domain) semantics supply an operand or a representation, extraction must not erase their provenance.

## 7.5 Freeze correction

The v5 freeze remains historical provenance for the contract state reached before this golden reconstruction.

For **complex extraction integrity**, the live state is now:

> **FOUNDATION PATCH REQUIRED — CONTRACT v6**

Controlled ingestion of already-covered simple shapes may continue. Complex spatial/media ingestion must not be declared extraction-complete until §7.1–§7.3 are implemented and the 3060 golden specimens pass end-to-end.

Classification:

- §7.1 — **MUST FOUNDATION NOW**
- §7.2 — **MUST FOUNDATION NOW**
- §7.3 — **MUST FOUNDATION NOW** acceptance gate
- Spatial domain-specific laws — **EXTENSION POINT NOW**, intentionally deferred to the dedicated `גימטריה מרחבית` category pass

## Spatial category evidence snapshot — READ ONLY

Live category `גימטריה מרחבית` currently includes at least:

- post 5038 — cube / 1020: six faces × ten `טוב`
- post 5040 — cube / 910: spatial “אחד” projection layered over separate numeric equalities
- post 5041 — icosahedron / 620: twenty faces × `אל`
- post 5043 — cube / 1254: six faces × `מטעמים`, also tied to six textual occurrences
- post 5044 — cube / 3060: six faces × `ישר`
- post 5084 — triangular arrangement of Birkat Kohanim: outer region 1820, inner region 898, whole 2718

This snapshot is evidence only. No new Spatial laws are declared in v6. The next Spatial pass should derive rules from the whole category rather than from one specimen.