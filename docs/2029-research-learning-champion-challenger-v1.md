# SOD1820 — Research Learning Champion / Challenger V1

**Status:** STACKED FOUNDATION BUILD · NOT MERGED · NOT DEPLOYED  
**Parent program:** Research Synthesis / Calibration 2029  
**Owner verdict:** **EXTEND_EXISTING**

Owners reused:
- `decision_ledger`
- `learned_patterns`
- `learned_pattern_members`
- `fn_detect_patterns`
- `fn_detect_pattern_contradictions`
- `admin_pattern_review`
- `admin_pattern_revoke`
- `ai_style_learning_law v2`
- `research_strategy_layer_law v15`
- Person/Truth governance

No Learning Engine, policy store, preference graph, auto-activation mechanism or second feedback system is created.

---

## 1. Goal

The system should improve over time without silently changing its own rules.

The pattern is:

```text
CURRENT ACTIVE POLICY = CHAMPION
         │
         ├── frozen holdout evaluation
         │
CANDIDATE POLICY = CHALLENGER
         │
         ▼
same evaluation space
same corpus baseline
same privacy/truth boundaries
explicit quality/cost thresholds
         │
         ▼
INSUFFICIENT / BLOCK / KEEP / PROPOSE
         │
         ▼
Human / owner review
         │
         ▼
only then, through existing governance,
a future policy may become active
```

A Challenger can never promote or activate itself.

---

## 2. Live learning owner state — 2026-09-23

Live canonical Supabase audit:

- `decision_ledger`: **24** rows
- convergence decisions: **16**
- `learned_patterns`: **2**
- both learned patterns are **status=proposed**
- `learned_pattern_members`: **6**

Existing proposals:
1. `convergence|approve|∅` — support 3
2. `convergence|approve|cross_method_strong` — support 3

Existing mechanics are already sound:

### Discovery
`fn_detect_patterns`
- groups Human decisions;
- requires minimum support;
- compares `rules_snapshot`;
- refuses mixed rule versions;
- creates `status=proposed`.

### Contradictions
`fn_detect_pattern_contradictions`
- detects opposite polarity for the same decision feature.

### Human review
`admin_pattern_review`
- admin-only;
- proposed → approved_preference or rejected.

### Revoke/supersede
`admin_pattern_revoke`
- removes/supersedes approved preference.

### Runtime consumption
`fn_number_dossier` and `admin_convergence_candidates`
consume only:

`learned_patterns.status='approved_preference'`

So **proposed does not affect runtime**.

This Human-Gate separation is preserved.

---

## 3. Important live persistence gap

F6 found a decision-changing constraint.

`learned_patterns` currently has:
- no domain column;
- `support integer NOT NULL`;
- current support semantics are Human-decision support counts.

Current Number Dossier reads **all** approved preferences without domain filtering.

Therefore a Synthesis/Cross/Semantic policy candidate must **not be directly inserted** into `learned_patterns` under the current shape.

Otherwise an approved Synthesis preference could appear in a Number Dossier as though it were a global Number preference.

### F6 decision

The canonical learning owner remains `learned_patterns + decision_ledger`, but:

> **Domain-specific policy persistence requires an owner-qualified adapter/extension before direct storage/runtime use.**

F6 emits a storage-neutral proposal envelope only.

No schema change is authorized in this phase.

---

## 4. Policy domains

F6 supports research-policy evaluation for:

- `synthesis_selection`
- `cross_ranking`
- `semantic_ranking`
- `calibration_protocol`

### Style exclusion

AI writing style remains owned by `ai_style_learning_law`.

F6 rejects `style` / `message_style` / `ai_style`.

A research policy may change:
- what evidence enters Synthesis;
- ranking/selection;
- thresholds;
- control logic.

It may not silently become the writing-style owner.

---

## 5. Frozen evaluation run

A Champion/Challenger run preserves:

- policy ref + version;
- domain;
- evaluation ref;
- holdout ref + fingerprint;
- corpus baseline fingerprint;
- Synthesis/Calibration contract versions;
- independent Person count;
- holdout case count;
- testable claim count;
- decoy trial count;
- total observations;
- metric vector;
- violation vector;
- provenance refs;
- owner-attestation declaration.

A pure evaluator may record that an owner attestation was declared.

It **does not verify the attestation itself**.

---

## 6. Independent Persons != observations

This is load-bearing for Personal/cohort research.

```text
400 observations around one Person
!=
400 independent Persons
```

F6 tracks both separately.

Minimum-sample policy must refer explicitly to:
- independent Persons;
- holdout cases;
- claims;
- decoy trials.

Repeated observations never inflate cross-person sample size.

---

## 7. No universal learning score

F6 intentionally has no:

- accuracy score;
- quality score;
- truth score;
- weighted “winner number”;
- AI majority score.

Instead it compares a vector.

### Research/calibration dimensions

- lower Support Band
- upper Support Band
- decoy discrimination lift
- contradiction rate
- genericity rate
- evaluated coverage

### Operational dimensions

- p95 latency
- mean AI/model cost in ILS

### Hard violation dimensions

- privacy violations
- Truth-boundary violations
- protected/sensitive inference violations
- evidence leakage violations

One good number may never hide another bad dimension.

---

## 8. Non-waivable gates

Some controls are not tuning knobs.

A valid F6 comparison always requires:

1. same holdout;
2. same corpus baseline;
3. owner-attestation declaration;
4. zero privacy violations;
5. zero Truth-boundary violations;
6. zero sensitive/protected inference violations;
7. zero evidence leakage violations.

A “policy” that attempts to turn any of these off is rejected.

Cost or apparent fit improvement can never compensate for privacy/Truth failure.

---

## 9. Explicit quality policy

Thresholds are configuration/provenance, not hidden constants.

A comparison policy explicitly states:

- minimum independent Persons;
- minimum holdout cases;
- minimum testable claims;
- minimum decoy trials;
- minimum evaluated coverage;
- minimum lower-Support-Band improvement;
- minimum decoy-lift improvement;
- maximum contradiction regression;
- maximum genericity regression;
- maximum latency regression;
- maximum cost regression.

No default “3% is enough” lives silently in the evaluator.

---

## 10. Decision classes

F6 can return only:

### INSUFFICIENT_EVIDENCE
Examples:
- holdout mismatch;
- corpus-baseline mismatch;
- sample too small;
- owner attestation not declared.

### BLOCK_CHALLENGER
Examples:
- privacy violation;
- Truth violation;
- contradiction regression over limit;
- genericity regression over limit;
- unacceptable cost/latency regression.

### KEEP_CHAMPION_NO_MATERIAL_GAIN
The Challenger is safe but does not clear both material-improvement gates.

### PROPOSE_CHALLENGER_FOR_HUMAN_REVIEW
The Challenger:
- uses a comparable evaluation space;
- clears sample gates;
- clears hard boundaries;
- clears regression gates;
- clears both declared improvement gates.

Even here:

`runtime_effect=false`

`auto_activation_authorized=false`

---

## 11. Why both Support + Decoy improvement

A policy that produces more “supported” claims may simply become more generic.

Therefore F6 requires improvement in both:

1. **lower Support Band** — full support only;
2. **decoy discrimination lift** — the subject/message should separate better from plausible alternatives.

This reduces the incentive to generate Barnum statements that everyone likes.

Genericity and contradiction remain separate non-regression dimensions.

---

## 12. Champion can also be invalid

The Challenger is not the only run that must meet sample requirements.

Both Champion and Challenger must satisfy the declared minimum sample.

Otherwise:

`INSUFFICIENT_EVIDENCE`

We do not compare a well-measured Challenger against an under-measured Champion and call the difference causal.

---

## 13. Same holdout and same corpus baseline

A direct policy replacement requires comparable data.

If the corpus changed materially, F5 requires baseline recalibration first.

If holdout changed, F6 treats the direct comparison as confounded.

Separate robustness studies across:
- time;
- corpus versions;
- cohorts;

are useful, but are not the same decision as a direct Champion replacement.

---

## 14. Challenger proposal envelope

When all gates pass, F6 may produce a candidate proposal containing:

- Champion ref/version;
- Challenger ref/version;
- evaluation policy ref;
- metric vector;
- passed improvement gates;
- hard/regression/sample status;
- rules environment refs;
- candidate feature.

It is explicitly:

- `status=proposed`
- no runtime effect
- no auto activation
- Human review required

### Current persistence status

Direct `learned_patterns` insert is **not authorized** in F6 V1.

The proposal declares:

`existing_learning_owner_requires_domain_qualified_adapter`

The future adapter must:
- preserve domain;
- define support semantics;
- keep proposed separate from approved;
- prevent domain-specific preferences from leaking into global Number projection;
- retain existing Human review/revoke semantics.

---

## 15. Existing pattern detector stays useful

F6 does not replace `fn_detect_patterns`.

They answer different questions.

### Existing detector
“What Human decision pattern repeats?”

### F6 evaluator
“Does a candidate research policy perform better than the current policy on controlled holdout without violating guardrails?”

Future integration can let F6 proposals become another **candidate source** under the existing learning owner.

Not another learning system.

---

## 16. AI providers do not vote on policy

Claude/Gemini/GPT may:
- propose a Challenger;
- inspect failures;
- challenge interpretation;
- explain metric differences.

But policy selection is not:

“2 of 3 models chose B”.

Provider agreement may be a robustness feature in Research Result Bundle.

It is not independent evidence and not Human Gate.

---

## 17. Cohort/privacy rules

Policy evaluation may use Personal/cohort calibration only when:

- participation/analysis is authorized;
- raw private evidence is not exported;
- independent Persons are counted correctly;
- small-group/re-identification risk is controlled;
- protected/sensitive attributes are not inferred as hidden labels.

A policy that improves numerical fit by using a forbidden personal feature is blocked.

---

## 18. What the system is allowed to learn

Examples of valid candidate learning:

- method family X adds little after dependency normalization;
- multi-method Cross with feature set Y discriminates semantic holdout better;
- a Synthesis motif threshold is too permissive;
- genericity penalty should increase under defined conditions;
- a deeper model adds no measurable gain for a task class;
- a cheaper model matches the Champion within non-inferiority bounds;
- a corpus stratum needs different expectedness handling.

Examples of invalid autonomous learning:

- “13 means transformation because many users liked it”;
- “Mסתתר is worth 1.7× because it sounds deeper”;
- “Tarot confirms the claim so increase accuracy”;
- “users clicked Share, therefore the interpretation is true”;
- “the model agrees with itself, therefore canonicalize”.

---

## 19. Failure is useful data

A Challenger that fails should preserve why:

- no material gain;
- poor decoy discrimination;
- more contradictions;
- more generic claims;
- latency/cost too high;
- insufficient sample;
- corpus drift;
- leakage/safety failure.

Repeated failed ideas can prevent future redundant experimentation.

They do not become “negative truth” about the subject.

---

## 20. Future persistence extension

Only after F6 V1 is proven does the learning owner decide how domain-qualified policy candidates persist.

Preferred direction:

- reuse `learned_patterns` semantics;
- reuse `decision_ledger`;
- reuse contradiction detection;
- reuse admin Human Gate;
- add the smallest domain/support qualification necessary.

No second policy table unless a live owner/schema proof shows extension is impossible.

---

## 21. Acceptance gates

F6 is mature only when:

1. no scalar winner score exists;
2. holdout and corpus comparability are explicit;
3. both runs satisfy sample gates;
4. independent Persons are separate from observations;
5. privacy/Truth/sensitive/leakage gates are non-waivable;
6. contradiction/genericity remain visible;
7. cost/latency remain separate;
8. style owner is not duplicated;
9. Challenger cannot activate itself;
10. proposal is not inserted into undifferentiated current `learned_patterns`;
11. Human Gate remains required;
12. failed Challengers remain explainable/replayable.

---

## 22. Roadmap / program relationship

Detailed parent:
`docs/2029-research-synthesis-calibration-foundation-v1.md`

Previous stages:
- F0/F1 — one Synthesis seam + Cross adapter
- F3 — Calibration Harness
- F4 — Historical AI Resonance Benchmark
- F5 — Corpus Baseline + Semantic Expansion
- **F6 — this document**

Next:
- F7 — provider/model orchestration
- F8 — product projections / legacy migration
- F9 — longitudinal/cohort research

ZURIEL should not need to remember Champion/Challenger mechanics manually; this program owns the sequence.
