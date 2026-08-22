# SOD1820 — METHOD LIFECYCLE ALIGNMENT
### Foundation Contract · Section 2 · actor=CLAUDE · 2026-08-22

**Architecture/contract synthesis, not new research.** Grounds itself in the already-locked `method_lifecycle` and `gematria_methods_catalog` v2 rules (live `nodes type='rule'`), and the already-completed `METHODS_EXPANSION_PHASE_1` pass (era2-methods-expansion). **0 DB writes. 0 `gematria_methods` changes. 0 registry additions.**

---

## 1. The lifecycle, as already locked in the DB

The locked rule `method_lifecycle` (Zuriel, final approval — re-verified live this pass, unchanged) already defines exactly the chain this task specifies:

```
discovered → candidate → definition/reconstruction tested → engine reproducible → Human-Gate (Zuriel) → approved/active method
```

Mapped onto the rule's own vocabulary and the live registry:

| Stage | Rule's own term | What must be true to advance | Live mechanism |
|---|---|---|---|
| **discovered** | `known` (a method name/label appears in the corpus — e.g. "ר\"ת", "רגיל ישר והפוך") | Nothing yet — just a recorded mention | `method_mention_type`/`method_claim_reason` enrichment (v3 CSV layer today; per Research DNA v1, a `research_objects` claim tomorrow) |
| **candidate** | `candidate` | A worked example or definition exists, even if untested | Stays exactly as a tag/claim — **never** a `gematria_methods` row at this stage |
| **definition/reconstruction tested** | `reconstructed` (attempted) | A **deterministic, input-independent, letter-value-based, fixed rule** was tested against real corpus examples — never a free-form/target-seeking search. This is `method_lifecycle`'s own explicit permission-with-limit: *"Method Reconstruction חזק אך חסום... שיטה חוקית=דטרמיניסטית... ❌ אין חיפוש-חופשי"*. | A `research_objects` row, `kind='method_hypothesis'`, `engine_detail={method, tested_definition, sample_size, match_rate}` — exactly the shape the Proof-of-Model's Case 10/11 already proved out (`evidence`/`confidence` fields, no schema fork between a strong vs. weak candidate). |
| **engine reproducible** | tested against the *unmodified* live engine, multiple examples, not one coincidental hit | A `match_rate` across a real sample, disclosed honestly even when it is low or zero | Same `research_objects` row, `engine_verified` stays `false` unless the aggregate evidence genuinely clears the bar — never flipped `true` on a single hit (§2 below). |
| **Human-Gate (Zuriel)** | explicit approval, no exceptions | Zuriel reviews the tested definition + match evidence and decides | `research_objects.status` transition, same RPC-gated review pattern as Corpus Approval Lifecycle Stage 5 |
| **approved/active method** | `canonical` | Method enters the **single existing registry** | `gematria_methods` insert (`active=true`, `function` wired) — the *only* place a method becomes real, per `gematria_methods_catalog` v2: *"מקור-האמת לשיטות הוא public.gematria_methods... אין לקבע בחוק מספר קבוע של שיטות"* |

**No parallel registry, no separate "candidate methods" table is created anywhere in this alignment.** A candidate method lives as a `research_objects` hypothesis (per the Proof-of-Model, Case 10) until it clears every stage above — then, and only then, it becomes a normal row in the one live `gematria_methods` table, exactly like the current 13 active methods.

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

- ר"ת (רת): `candidate`, anchor evidence recorded (`anchor=644`, `evidence_strength=medium`), not elevated.
- ס"ת (סת): `candidate`, no anchor, weaker evidence, not elevated. A future pass *could* separate "ס"ת rows that are Scripture citations" from "ס"ת rows that might be genuine computed claims" using the existing year/source-citation infrastructure — recommended, not performed, not required before this contract closes.
- רגיל ישר והפוך: `candidate`, no testable examples exist; cannot advance without Zuriel supplying a worked example or explicit definition.

**If Zuriel later provides provenance for the 644 anchor** (a source, teacher, or text where "צמח דוד" is traditionally valued at 644), that is new SOURCE_CLAIM evidence that could motivate a fresh, disciplined reconstruction attempt — not something this contract performs preemptively.

**Cross-reference, added 22.8 (§4 correction pass):** `RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md` §4.6 (Method Access Law, corrected) confirms that clearing this lifecycle's Human-Gate stage (§1 above, "approved/active method") does **not** by itself decide the method's access tier — verification (this document), approval (Human-Gate, this document), and access (§4.6/§4.7 of the Foundation Contract) are three separate decisions, in that order, none implied by the others. Nothing in §1–§5 above changes as a result.

---

## 4. After approval: what changes, concretely

Per this task's own instruction, stated here as the forward-looking half of the contract (not executed):

- Once a method clears Human-Gate and enters `gematria_methods` (`active=true`, `function` wired), **the engine can compute it on the corpus** exactly like any of the current 13 methods — no separate code path, per `gematria_methods_catalog` v2's registry-driven design (*"אין לקבע... מספר קבוע... נגזר מה-Registry"*).
- The resulting values become available to **Research DNA (as a normal METHOD-dimension fact, see `RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md` §2)**, **number pages** (subject to the existing tiered display convention — open/Premium/Deep-Research per `gematria_methods_catalog` v2 §3), **cross-search** (`relation_evidence`/the future `WS-CROSS-ENGINE`), and **ELS** and **Raziel**, on exactly the same terms as the 13 existing methods — no bespoke wiring per new method.
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

*Governance: READ-ONLY/docs-only. 0 `gematria_methods` writes. 0 registry changes. Closing `work_log` memo covers this document together with the other two Foundation Contract documents and the Roadmap edit.*
