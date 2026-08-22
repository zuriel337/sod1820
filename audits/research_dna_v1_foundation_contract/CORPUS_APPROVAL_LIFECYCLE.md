# SOD1820 — CORPUS APPROVAL LIFECYCLE
### Foundation Contract · Section 1 · actor=CLAUDE · 2026-08-22

**This is an architecture/contract document, not new research.** It closes a decision using material already produced in this session's chain: `MASTER_CLASSIFICATION_V3_FINAL_PERSISTENCE_DECISION.md` (the 32-row `engine_verified` finding), `MASTER_CLASSIFICATION_V3_SCHEMA_PROFILE.md`, the Legacy→Research DNA Crosswalk, the Research DNA Proof-of-Model (era1-research-dna-architecture), and `CORPUS_EXPANSION_INTAKE_SPEC.md` (era2-corpus-expansion, already-locked `research_contribution_law`/`gematria_auto_registry_law`). **0 DB writes. 0 schema. 0 promotions.**

---

## 1. The six stages, named explicitly

```
SOURCE/CONTRIBUTION → ENGINE CALCULATION → CALCULATION VERIFICATION →
RESEARCH/PROVENANCE → HUMAN GATE → APPROVED CORPUS
```

| Stage | What it means | Existing structure it maps to (no new table) |
|---|---|---|
| **1. SOURCE/CONTRIBUTION** | A phrase/claim enters the system from *any* channel — WhatsApp, Excel import, a post, a live contributor form, an AI pass. Nothing is trusted yet; it is raw intake. | `gematria_words` insert (bare phrase, no relation claim) per the pre-existing, unmodified **`gematria_auto_registry_law`** — OR a `research_contributions` row (`research_state='idea'`) when the intake carries a *claim about* a phrase, not just the phrase itself. |
| **2. ENGINE CALCULATION** | The canonical gematria engine computes every value it can for the surface form, mechanically, with zero interpretation. | The live `gw_enforce_engine` trigger (auto-computes all canonical methods on insert, per `gematria_auto_registry_law`) — or an explicit `fn_ragil`/`fn_all_methods_full` call for an ad-hoc phrase not yet in the corpus. This step produces `engine_result`, nothing more. |
| **3. CALCULATION VERIFICATION** | Does the *specific claimed value* for this row match what the engine, run fresh right now, actually produces? This is a narrow, mechanical check — see the Claim/Calculation/Verification Contract (`RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md` §1) for the required field set (`claimed_value`/`engine_result`/`verification_state`). | `research_objects.engine_verified` (boolean) + `research_objects.engine_detail` (jsonb) — the exact fields the Crosswalk and Proof-of-Model already identified as the correct home, reused here. **Never `gematria_words.is_verified`** — confirmed FACT (Crosswalk §A.1/B.1) that `is_verified` tracks *publish-worthiness*, not per-claim engine verification. |
| **4. RESEARCH/PROVENANCE** | Who claimed this, from what source, with what supporting evidence/interpretation — kept explicitly separate from whether the math checked out. A row can pass stage 3 and still be interpretively contested, or fail stage 3 and still be a genuine, well-sourced historical claim worth preserving. | `research_objects.source`/`source_ref`/`contributor`/`owner_person_id`/`evidence`/`statement` — or, for the general shared-contribution case, `research_contributions`' already-locked state machine (`research_state`: idea→discussion→investigating→validated→canonical; `status`: pending/approved/rejected/hidden), per `research_contribution_law` (locked rule, Zuriel 14.7.2026). |
| **5. HUMAN GATE** | Zuriel — and only Zuriel — decides whether this row enters the approved corpus. No confidence tier, no source reputation, no clean engine-match skips this. | `research_objects.status` transition away from `'candidate'`, reviewed via the existing RPC-gated pattern (`admin_research_feed`/`admin_research_review`, per the Crosswalk's own "governing pattern": richest/most sensitive tables are deliberately server-gated) — or, for `research_contributions`, the locked rule's own step: `research_state='canonical'` is written **only at Zuriel's action**, never by AUTO. |
| **6. APPROVED CORPUS** | The row is now trusted project material: it can be linked into the graph, shown on public surfaces, and fed to Research DNA/number pages/cross-search/Raziel. | `gematria_words.is_verified=true` (the pervasive, load-bearing publish gate — unchanged) **and/or** `node_id` populated (graph promotion) **and/or** `research_objects.promoted_node_id` set. Which of these fires depends on *what kind* of approval it is (a corrected/confirmed word vs. a promoted research finding) — not decided uniformly here; already-existing, per-surface mechanisms. |

**Nothing above is a new table, column, or state machine.** Every stage lands on a structure that already exists and is already either live (`gw_enforce_engine`, `is_verified`, `node_id`) or already-locked-but-underused (`research_objects`, `research_contributions`). This directly extends Decision A of the Legacy→Research DNA Crosswalk ("research_objects as a claim/research wrapper, never copies the row") and the Proof-of-Model's Case 4/8/9/10 pattern.

---

## 2. The hard rule: Engine Verified ≠ Corpus Approved

**This rule exists because of a concrete, fresh failure, not as abstract caution.**

The `MASTER_CLASSIFICATION_V3_FINAL_PERSISTENCE_DECISION.md` pass (§2, this session, same day) re-ran the live canonical engine against the 32 rows the prior v3 classification pass had labeled `method_claim_status='engine_verified'`. Result:

- **31 of 32 rows: the live engine's output does not match the claimed number at all**, when tested against the row exactly as it lives in `gematria_words` today.
- **`gematria_words.is_verified = FALSE` for all 32/32 rows, live, no exceptions** — the system's own truth-flag already disagreed with the label on every single one before this pass even started.
- The label most likely reflects the v3 build pipeline's own text-pattern matching (recognizing a `"<subject> <value> <method-name>"` shape in a raw messy string), **not a genuine re-run of the canonical engine against a properly isolated subject.**

**Conclusion, stated as a hard rule for every future pass, agent, and UI surface:**

> **A row that is `engine_verified` (the calculation was run and matched) is not thereby `corpus_approved` (Zuriel decided this belongs in the trusted corpus).** The engine can confirm arithmetic. It cannot confirm that the subject-extraction was done correctly, that the claim's framing is honest, that the source is trustworthy, or that the row belongs in the public corpus at all. Those are stage 4/5 questions, not stage 3.
>
> Conversely: **a row that fails engine verification (mismatch) is not thereby worthless or `rejected`** — per the same §2 finding, several of the 32 mismatching rows touch genuine project anchors (1820, 1234, 878) and "deserve a real look, not a shrug." A calculation mismatch routes the row to Human-Gate for review, it does not delete it.

**Never again write a bare `engine_verified` label without also persisting**: which engine/method was actually run, against which exact expression, and what the fresh result was. This is the direct ancestor of the Claim/Calculation/Verification Contract in `RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md` §1 — this section states *why* it's required; that section states the field contract.

---

## 3. Trusted Contributor ≠ Canonical

A contributor with a strong track record (e.g. `vip_source`-tagged researchers, a named source with prior confirmed rows) may legitimately receive:
- **Priority** — their submissions get reviewed sooner.
- **Pre-validation** — `research_contributions`' own locked rule already defines an `AUTO-VALIDATION-ELIGIBLE` tier (`research_state` reaches `'validated'`/`status='pending'` unattended, for narrow, low-risk shapes like an unambiguous transliteration or a well-known spelling-variant pattern with no competing interpretation).
- **Batch review** — a trusted contributor's backlog can be queued and reviewed together rather than one-by-one.

**None of this shortens the path to canonical.** Per `research_contribution_law`'s own explicit gate correction (a real, already-recorded incident in this exact codebase — the original draft let clean-provenance candidates auto-insert, and that was corrected): **`research_state='canonical'`, any `verified=true`/`human_verified=true` flip, any identity merge/link, and any publication/access-tier change is Zuriel-only, unconditionally, regardless of confidence tier or contributor reputation.** The only thing that ever reaches the canonical layer without Zuriel is a bare new word with **no relation/interpretive claim attached** — because registering a brand-new phrase's own mechanical gematria value is not an identity or interpretive decision; it is the pre-existing `gematria_auto_registry_law`, untouched by this contract.

**No auto-canonicalization exists or is proposed anywhere in this contract**, for any reason, at any confidence level.

---

## 4. `corpus_role` (v3) vs `dna_status` (live) — stay orthogonal through this lifecycle

Per the Final Persistence Decision Pack §3 (already-confirmed, reused here not re-derived): `corpus_role` (what *kind* of material this row is, per the v3 classification pass) and `dna_status` (where the row sits in the corpus's own processing pipeline: `promoted`/`appendix`/`dna`/`core`) are **two non-collapsing, additive dimensions** — `dna_status='promoted'` alone maps to three different `corpus_role` values. **This lifecycle does not merge them.** A row can move through SOURCE→...→APPROVED CORPUS while its `corpus_role` and `dna_status` are independently displayed, never overwritten by one another — same rule Research DNA v1 applies generally (see `RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md` §2).

---

## 5. What this contract deliberately leaves OPEN

- **Which exact stage-6 mechanism fires for which kind of approval** (`is_verified=true` vs. `node_id` promotion vs. `research_objects.promoted_node_id`) is not uniformly decided — it depends on content type and is a per-surface decision already made elsewhere in the codebase (e.g. `is_verified` for a corrected/confirmed corpus word, node promotion for a full graph citizen). Not resolved here; not blocking.
- **Whether `research_contributions` (general shared-contribution state machine) or `research_objects` (Atlas/Ledger candidate wrapper) is the front door for a given intake channel** is a routing decision per source type, already answered for lexical/identity intake by `CORPUS_EXPANSION_INTAKE_SPEC.md` (proposed `intent='lexical_identity'`, not yet written) and for method/numeric-language claims by the Research DNA Proof-of-Model (`research_objects.engine_detail`). No new decision needed here — both routes converge on the same Stage 5 Human-Gate discipline.
- **The 764 remaining `method_mention_type` rows and the 32-row `research_objects` candidate write itself** stay exactly where the Final Persistence Decision Pack left them: proposed, not executed, pending Zuriel's explicit authorization. This contract does not authorize that write.

---

*Governance: READ-ONLY/docs-only. 0 DB writes except the single closing `work_log` memo (inserted separately, covering all three contract documents + the roadmap edit together).*
