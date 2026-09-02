# 📐 MEDIA / POSTS / GALLERY / REALITY-STREAM — Unified Foundation Closure Delta v1

> **Status:** `FOUNDATION CANONICALIZED` (2.9.2026, ZURIEL Human-Gate, after one GPT cross-verification correction pass). Additive-only — extends existing contracts, creates no new table/store/schema/column. Canonical mirror of the two MUST-NOW items applied live to `nodes` (Supabase project `linswmnnkjxvweumprav`): `research_object_identity_invariant_law` v1→v2, `reality_graph_law` v2→v3 — see `select description from nodes where rule_id in ('research_object_identity_invariant_law','reality_graph_law') and is_active;` for the canonical text. This document is the git-tracked companion; the `nodes` rows are the enforceable source of truth.
>
> **Scope:** absorbs three semantics into the smallest existing canonical contracts — no new concept, no new store. Does not implement any feature, classify any post, deduplicate/mutate any `gallery_images` row, or promote any Claim to a graph Node.

---

## 1. Source Segment / Update Identity (extends MF-1 — `research_object_identity_invariant_law` v2)

Canonical fragment for a source-internal Update/Segment inside a mutable Post:

- **Tier 1 (primary):** `#update:<date-as-parsed>:<label-slug>` — both read verbatim from the source's own author-written header (per `post_update_on_top`: "עדכון · [תאריך] · [שם]"), never invented, never defaulted when absent.
- **Fallback tier (legacy segments lacking a usable date/label):** `#update:legacy:<content-fingerprint>` — a deterministic normalization (trim + whitespace-collapse, same discipline as `fn_research_claim_uid`) of **that specific segment's own leading source-native content** — never the whole post, never a scan-order/DOM position. This is a genuine **semantic** fragment under MF-1 (matches neither `#batchN` nor `#aN`) and correctly participates in identity, exactly like `#interpretation`/`#mem-stuma`/`#valuation` — it is never stripped and must never be described as non-identity.
- **Extraction-run ordinals** (e.g. "3rd block found when scanned on `<date>`") may be recorded only as provenance/metadata alongside a Finding — never inside the canonical fragment — because that value changes when a newer Update is prepended above an older one.
- **True collision** (identical Tier-1 date+label, or identical legacy content-fingerprint) is disambiguated with a visible `:2`/`:3` suffix among only the colliding set — the same pattern MF-1 already uses for any other duplicate.
- **Declared residual:** if two legacy segments are genuinely indistinguishable in source-native content (same fingerprint) and remain so even as a `:N`-suffixed set, individual physical correspondence cannot be recovered further — this is accepted ambiguous provenance, a future Human-Gate case, **never resolved by inventing positional identity.**
- A later-renamed Update header produces a new fragment; the old one is an accepted `rule_versioning`-class residual, not silently rewritten.

No table, column, or store is introduced. No mass post extraction/enrichment may begin before this section exists.

## 2. Referenced / Subject Time (companion note to Universal Finding contract)

Referenced/Subject Time is typed semantic context/relation, whose *mechanism* depends on what the semantic object already is — never on what it should become:

- When **both** the content and the year/event are already graph Nodes, a typed edge between them (reusing `reality_graph_law`'s existing `represents`/`documents`/`mentions`-style vocabulary) may represent it.
- When a Finding/Research Object is **not yet** a Node (still Claim-stage in `research_objects`), referenced-time context is preserved through the **existing** Finding/Research-Object metadata/provenance envelope — never by forcing that Claim to acquire graph identity merely to record a time-context fact. This is a hard boundary: recording referenced-time is never, by itself, grounds for a Claim→Node promotion.
- A canonical graph edge may appear **only if/when** appropriate graph identity already exists for that object, as a consequence of a separately-authorized promotion.
- No new temporal store/table. **No `type='period'` node** — confirmed zero live rows of that type; holiday/period identity, if ever needed, is a future `entity_types` ontology-crosswalk decision (`reality_graph_law` v2), not created here.
- Unknown stays unknown — never defaulted or synthesized from a different time category.

**`identity.occurrence` generalization note** (Universal Finding envelope, `docs/research-universal-finding-contract.md`): `identity.occurrence` is adapter-typed in general, not ELS-exclusive by contract — e.g. a future Post-Update adapter would populate `{updateDate, updateLabel}` or `{contentFingerprint}` per §1 above, the same way the ELS adapter populates `{skip,start,dir}`.

## 3. Representation Identity ≠ Placement/Occurrence (extends `reality_graph_law` v3)

A placement-local attribute (e.g. a gallery-membership row's `primary_value`, description, or tag set) is a fact about that placement/edge, not an intrinsic property of the Representation itself. When the same Representation (same storage object/`image_url`) carries different placement-local values across multiple placements — different `gallery_id` rows, or embedding inside different Posts/Updates — those values are independent, correctly-coexisting facts, never a conflict requiring resolution, and none may be silently merged/promoted into one canonical Representation-level value without explicit Human-Gate reconciliation.

**Correction retained verbatim from cross-verification:** *"Legacy `gallery_images` rows may currently co-locate Representation-level and Placement-level data. This contract establishes their semantic separation; it does not claim the current physical row shape already enforces that separation. No migration is authorized or required by this closure."* No classification of which existing `gallery_images` field is Representation-level vs Placement-level is performed here.

**Fingerprint/duplicate-evidence vocabulary** (declared for future use, not implemented):
- **STRONG:** exact storage object; exact binary hash (e.g. SHA-256).
- **CANDIDATE:** perceptual-image similarity/hash; known migration provenance; original path/filename lineage.
- **SUPPORTING-ONLY** (never sufficient alone): OCR text, same gematria values, filename alone, date, gallery, visual-topic similarity.

OCR equality must never establish media identity. Perceptual match never auto-merges without a governance/confidence policy; ambiguous reconciliation requires Human Gate.

## 4. Post Role — no new mechanism

Existing open classification (Series/Category, `project_codex.publishing_conventions`, precedented live by the `dim5` tag) plus `reality_graph_law`'s existing relation/edge vocabulary are jointly sufficient to represent Post Role. No new Foundation mechanism is required. The exact representation of any given role (an open-vocabulary tag, or a graph relation to a Cipher/Event/Gallery node) is a **later usage decision**, not fixed by this closure.

---

## Do-not-touch (explicit, unchanged by this closure)

No new table: `post_updates`, media-placement store, or temporal store. No `type='period'` node. No `gallery_images` data mutation, dedup, merge, or deletion. No `primary_value`/`image_type` rewrite. No post classification (1,282 posts untouched). No fingerprint/perceptual-hash implementation. No Claim→Node promotion. No UI, no deploy.

## Provenance

Session-native — three READ-ONLY foundation passes (Source Segment + Typed Temporal Context; the Unified Delta design; a GPT cross-verification correction pass) preceding this ZURIEL Human-Gate authorization. Canonical enforcement: `nodes` rows `research_object_identity_invariant_law` (rule_version 2) and `reality_graph_law` (rule_version 3), `is_active=true`; prior versions preserved `is_active=false` per `rule_versioning` — no historical text deleted.
