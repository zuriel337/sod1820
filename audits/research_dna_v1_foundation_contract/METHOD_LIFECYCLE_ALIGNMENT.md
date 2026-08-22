# SOD1820 — METHOD LIFECYCLE ALIGNMENT
### Foundation Contract · Section 2 · actor=CLAUDE · 2026-08-22 · **§1 stage order corrected 22.8 (ninth pass, ZURIEL Human-Gate decision)**

**Architecture/contract synthesis, not new research.** Grounds itself in the already-locked `method_lifecycle` and `gematria_methods_catalog` v2 rules (live `nodes type='rule'`), and the already-completed `METHODS_EXPANSION_PHASE_1` pass (era2-methods-expansion). **0 DB writes. 0 `gematria_methods` changes. 0 registry additions.**

**§1 correction, 22.8 (this pass):** `CANONICAL_RULES_RECONCILIATION.md` (eighth pass) flagged, as Conflict #2, that this section's table presented `candidate` as coming *before* a tested reconstruction attempt — the reverse of the live `method_lifecycle` rule's own stated order (`known → reconstructed → candidate → verified → canonical`), despite this document's own original claim to have "re-verified [the rule] live this pass, unchanged." **ZURIEL resolved this by explicit Human-Gate decision, 22.8:** the canonical conceptual order is `discovered/unresolved → definition reconstructed/defined → candidate → engine-tested/reproducible → Human-Gate approved → active`, confirming the live rule's sequence (with refined stage names) over this document's earlier, incorrectly-reordered table. §1 below is corrected accordingly. Zuriel also added a governing clarification, applied below: *"A historical method label with no sufficiently defined deterministic formula remains discovered/unresolved; do not represent it as an engine-ready candidate."* No live rule text was changed by this correction — `method_lifecycle` itself was already correct; only this document's table was wrong and is now fixed to match it.

---

## 1. The lifecycle, as already locked in the DB — corrected order, 22.8

The locked rule `method_lifecycle` (Zuriel, final approval, unchanged) defines exactly the chain this task specifies. **Corrected 22.8:** the table below previously reversed two stages (presenting `candidate` before a tested reconstruction attempt); ZURIEL's Human-Gate decision confirms the order below is canonical:

```
discovered/unresolved → definition reconstructed/defined → candidate → engine-tested/reproducible → Human-Gate approved → active
```

Mapped onto the rule's own vocabulary and the live registry:

| Stage | Rule's own term | What must be true to advance | Live mechanism |
|---|---|---|---|
| **discovered/unresolved** | `known` (a method name/label appears in the corpus — e.g. "ר\"ת", "רגיל ישר והפוך") — **stays here, never advances, if no sufficiently defined deterministic formula exists** (ZURIEL, 22.8: *"do not represent it as an engine-ready candidate"*) | Nothing yet — just a recorded mention; no worked definition attempted or available | `method_mention_type`/`method_claim_reason` enrichment (v3 CSV layer today; per Research DNA v1, a `research_objects` claim tomorrow) |
| **definition reconstructed/defined** | `reconstructed` (attempted) | A **deterministic, input-independent, letter-value-based, fixed rule** was proposed and tested against real corpus examples — never a free-form/target-seeking search. This is `method_lifecycle`'s own explicit permission-with-limit: *"Method Reconstruction חזק אך חסום... שיטה חוקית=דטרמיניסטית... ❌ אין חיפוש-חופשי"*. | A `research_objects` row, `kind='method_hypothesis'`, `engine_detail={method, tested_definition, sample_size, match_rate}` — exactly the shape the Proof-of-Model's Case 10/11 already proved out (`evidence`/`confidence` fields, no schema fork between a strong vs. weak candidate). |
| **candidate** | `candidate` | A defined, deterministic formula exists and has been reconstructed/attempted (the prior stage) — a label with *no* such formula is **not** promoted to `candidate`, it stays `discovered/unresolved` (ZURIEL, 22.8) | Stays exactly as a tag/claim — **never** a `gematria_methods` row at this stage |
| **engine-tested/reproducible** | tested against the *unmodified* live engine, multiple examples, not one coincidental hit | A `match_rate` across a real sample, disclosed honestly even when it is low or zero | Same `research_objects` row, `engine_verified` stays `false` unless the aggregate evidence genuinely clears the bar — never flipped `true` on a single hit (§2 below). |
| **Human-Gate approved** | explicit approval, no exceptions | Zuriel reviews the tested definition + match evidence and decides | `research_objects.status` transition, same RPC-gated review pattern as Corpus Approval Lifecycle Stage 5 |
| **active** | `canonical` | Method enters the **single existing registry** | `gematria_methods` insert (`active=true`, `function` wired) — the *only* place a method becomes real, per `gematria_methods_catalog` v2: *"מקור-האמת לשיטות הוא public.gematria_methods... אין לקבע בחוק מספר קבוע של שיטות"* |

**No parallel registry, no separate "candidate methods" table is created anywhere in this alignment.** A candidate method lives as a `research_objects` hypothesis (per the Proof-of-Model, Case 10) until it clears every stage above — then, and only then, it becomes a normal row in the one live `gematria_methods` table, joining the registry's existing entries. **Method-count note, ZURIEL 22.8:** there is no single fixed method-count number to cite here — `gematria_methods` is the count SSOT, and any count must be qualified by capability/state (registered / approved-active / dispatchable / stored-indexed / displayed). Earlier passes' references to "13 active methods" were an unqualified snapshot, not timeless canonical law — see the corrected wording in §4 below and `CANONICAL_RULES_RECONCILIATION.md`'s resolved Conflict #1.

---

## 2. What "engine reproducible" actually requires — grounded in the ר"ת/ס"ת finding

`METHODS_EXPANSION_PHASE_1` (already completed, this session) tested the two strongest candidates on the table against this exact standard, and the result is the concrete evidence this alignment is built on:

- **ר"ת (רת):** the standard definition (first letter of each word, run through all 13 live methods) exactly explains **1 of 6** testable rows (337, via רגיל/גדול) — and **explicitly fails the strongest anchor cluster** (644, "צמח דוד"/"צמח דויד", recurring 6 times, spelling-invariant). **Verdict: `REMAIN_CANDIDATE`.**
- **ס"ת (סת):** the standard definition explains **1 of 13** testable rows (590) — weaker than ר"ת, with positive evidence the recurring value 1335 is a Scripture citation (Daniel 12:12), not a computed gematria value at all. **Verdict: `REMAIN_CANDIDATE`.**
- **"רגיל ישר והפוך":** zero testable examples exist in the corpus. Per `method_lifecycle`'s own rule (*"לא-שוחזר → עצור → אדם, אל תמציא"*), no reconstruction was attempted — correctly. **Verdict: `REMAIN_CANDIDATE`, not testable.**

**This is the working definition of "not verified from one hit," applied literally**: a single exact match, against 6–13 candidate rows and 13 possible methods each, is well inside the range of coincidence — and in ר"ת's case, the one hit found is directly contradicted by the strongest, most-repeated anchor in the same label's own data. **None of the three reached `reconstructed` as a general, trustworthy definition.** This is the disciplined, expected outcome of the lifecycle working correctly — not a gap to fix.

**Rule for every future method-candidate pass, stated once, to be reused rather than re-derived:** a candidate advances past `candidate` only when a deterministic hypothesis is tested against a real sample (not one cherry-picked example) and clears a disclosed match-rate bar — and even then, only Zuriel's Human-Gate can make it `canonical`. A method that explains the majority of its own strongest anchor cluster is a stronger candidate for re-attempt than one that doesn't; neither is verified by a single coincidental fit.

---

## 3. ר"ת / ס"ת / "רגיל ישר והפוך" — explicit status, per this task's instruction

**All three stay exactly where `METHODS_EXPANSION_PHASE_1` left them: `candidate`. None is activated by this contract or by any future pass without a fresh reconstruction attempt.**

- ר"ת (רת): `candidate` — has a defined, deterministic, tested formula (first-letter reading), anchor evidence recorded (`anchor=644`, `evidence_strength=medium`), not elevated further.
- ס"ת (סת): `candidate` — has a defined, deterministic, tested formula, no anchor, weaker evidence, not elevated further. A future pass *could* separate "ס"ת rows that are Scripture citations" from "ס"ת rows that might be genuine computed claims" using the existing year/source-citation infrastructure — recommended, not performed, not required before this contract closes.
- **רגיל ישר והפוך: reclassified 22.8 from `candidate` to `discovered/unresolved`** (ZURIEL Human-Gate correction, applying his own §1 principle: *"a historical method label with no sufficiently defined deterministic formula remains discovered/unresolved; do not represent it as an engine-ready candidate"*). No worked example or definition has ever been proposed for this label — unlike ר"ת/ס"ת, which have a defined formula that was actually tested (even though it under-performed), רגיל ישר והפוך has no formula to test at all. It is therefore, per this correction, in the same status class as איק בכר/אחס בטע (Foundation Contract §14), not a step ahead of them. Cannot advance without Zuriel supplying a worked example or explicit definition.

**If Zuriel later provides provenance for the 644 anchor** (a source, teacher, or text where "צמח דוד" is traditionally valued at 644), that is new SOURCE_CLAIM evidence that could motivate a fresh, disciplined reconstruction attempt — not something this contract performs preemptively.

**Cross-reference, added 22.8 (§4 correction pass):** `RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md` §4.6 (Method Access Law, corrected) confirms that clearing this lifecycle's Human-Gate stage (§1 above, "approved/active method") does **not** by itself decide the method's access tier — verification (this document), approval (Human-Gate, this document), and access (§4.6/§4.7 of the Foundation Contract) are three separate decisions, in that order, none implied by the others. Nothing in §1–§5 above changes as a result.

---

## 4. After approval: what changes, concretely

Per this task's own instruction, stated here as the forward-looking half of the contract (not executed):

- Once a method clears Human-Gate and enters `gematria_methods` (`active=true`, `function` wired), **the engine can compute it on the corpus** exactly like any other approved/active method already in the registry — no separate code path, per `gematria_methods_catalog` v2's registry-driven design (*"אין לקבע... מספר קבוע... נגזר מה-Registry"*). **Method-count note, corrected 22.8 (ZURIEL Human-Gate decision):** there is no single fixed count of "existing methods" to compare against — `gematria_methods` is the SSOT, and the honest comparison is always state-qualified (how many are `active`, how many `dispatchable`, how many `stored`), never a bare historical number like "13."
- The resulting values become available to **Research DNA (as a normal METHOD-dimension fact, see `RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md` §2)**, **number pages** (subject to the existing tiered display convention — open/Premium/Deep-Research per `gematria_methods_catalog` v2 §3), **cross-search** (`relation_evidence`/the future `WS-CROSS-ENGINE`), and **ELS** and **Raziel**, on exactly the same terms as every other already-active method — no bespoke wiring per new method.
- Composite/derived methods (e.g. a future acronym-extraction-then-רגיל composition, flagged as `composition_candidate=yes` by `METHODS_EXPANSION_PHASE_1`'s own §6 collision check) are **Composite Research Operators/Views over existing method outputs**, not new atomic methods and not new columns — per `gematria_methods_catalog` v2 §6, unless Zuriel decides otherwise after verification.

None of this is built by this contract. It documents the wiring that already exists and will fire automatically once (and only if) a method is approved.

---

## 5. What stays OPEN

- No candidate method reached `reconstructed`/`verified` this session — there is nothing pending Human-Gate approval for method *activation* right now.
- Whether a future pass should specifically separate Scripture-citation numbers from genuine ס"ת computed claims (§3 above) — recommended, not scheduled.
- The exact UI tiering (open/Premium/Deep-Research) for any future approved method is governed by `gematria_methods_catalog` v2 §3, already decided, not reopened here.

---

## 6. Cross-reference, added 22.8 (seventh/FINAL pass)

`RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md` §8–§19 (Part II, added this pass) extend everything above without changing it: §8 (Unified Gematria Method Law) formally names this document's own "no parallel registry, no separate candidate methods table" (§1 above) as a standing law; §14 states explicit, status-only readiness for איק בכר/אחס בטע/משולש מילה/משולש מילה הפוך (candidates this document did not cover — it scoped itself to ר"ת/ס"ת/רגיל-ישר-והפוך only, per its own §0); §15 restates Atomic ≠ Composite as contract text, grounded in this document's own §4 composite/derived-methods paragraph; §12 (Method Versioning) and §16 (Method Baseline) are new open items, both `IMPLEMENTATION DECISION REQUIRED`, at the same lifecycle layer this document governs. **Nothing in §1–§5 above changes as a result of any of this** — this is a pointer to newly-added, adjacent contract text, not a revision of ר"ת/ס"ת/רגיל-ישר-והפוך's status or of the lifecycle stages themselves.

---

## 7. ZURIEL Human-Gate correction, 22.8 (ninth pass) — resolves both reconciliation conflicts

`CANONICAL_RULES_RECONCILIATION.md` (eighth pass) surfaced two conflicts against the live rule book. **ZURIEL resolved both by explicit Human-Gate decision, 22.8:**

1. **Method count:** no single fixed canonical number exists. `gematria_methods` is the count SSOT; any count must be qualified by capability/state (registered/approved-active/dispatchable/stored-indexed/displayed). Historical fixed counts (13/14/20/24) are preserved as provenance/snapshots where they appear (e.g. §2's "13 live methods" describing what `METHODS_EXPANSION_PHASE_1` actually ran against, at the time it ran — a historical fact about that pass, not a live claim, left unchanged) but must not be read as timeless canonical law. Implementation is **not** modified merely to make historical counts agree with each other.
2. **Lifecycle stage order:** corrected in §1 above to `discovered/unresolved → definition reconstructed/defined → candidate → engine-tested/reproducible → Human-Gate approved → active`, confirming the live `method_lifecycle` rule's own sequence over this document's earlier (wrong) table. A historical method label with no sufficiently defined deterministic formula stays `discovered/unresolved` — applied in §3 to reclassify רגיל ישר והפוך accordingly.

**Nothing else in this document changes as a result.** No live rule text was written or altered — `method_lifecycle` itself needed no correction, only this document's restatement of it. Per ZURIEL's explicit instruction: PR #166 is not merged, no method is activated, and no proposed rule wording is written to live `nodes`/`project_codex` by this pass — this is a documentation correction only, pending full Human-Gate sign-off on the contract as a whole.

---

*Governance: READ-ONLY/docs-only. 0 `gematria_methods` writes. 0 registry changes. Closing `work_log` memo covers this document together with the other two Foundation Contract documents and the Roadmap edit.*
