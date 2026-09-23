# SOD1820 — Provider Orchestration / Minimum Sufficient Intelligence V1

**Status:** STACKED FOUNDATION BUILD · NOT MERGED · NOT DEPLOYED  
**Parent:** Research Synthesis / Calibration 2029  
**Owner verdict:** **EXTEND_EXISTING**

Canonical owners consumed:
- `ai_analyze_contract v2`
- `research_strategy_layer_law v15`
- `system_suggestions_law v3`
- Operational Trace root/span infrastructure
- existing `api_pricing` / `ai_token_log` / provider runtime

No second AI router, provider registry, pricing system, trace system, Truth system or Synthesis engine is created.

---

## 1. Goal

Use the **minimum sufficient intelligence** needed to complete a governed research/rendering task.

The system should normally call one provider/model.

It may add a Challenger only when:
- a declared challenge trigger exists;
- the second call can materially change a decision;
- a second eligible provider/model exists;
- privacy/intelligence/budget constraints permit it.

Fallback is separate from challenge and is not part of the initial fan-out.

The final research/message authority remains the canonical Result Bundle / Synthesis, not any provider.

---

## 2. Live runtime — 2026-09-23

### Current ai-analyze providers

Live code supports:
- Anthropic / Claude
- Google / Gemini

Current model defaults:
- `claude-sonnet-5`
- `claude-haiku-4-5`
- `gemini-2.5-flash`

**OpenAI is not currently wired as a provider inside ai-analyze.**

GPT may participate in the wider agent/challenge workflow, but F7 must not claim an OpenAI runtime provider until it is explicitly implemented and verified.

### Existing site entry point

`src/lib/aiAnalysis.js` already states one AI entry point for the site.

Today caller code may pass:

`engine='claude'|'gemini'`

to `getAiAnalysis()`.

F7 does not create a second API.

Future 2029 direction:
- caller provider request is preference/debug/explicit-compare input;
- Research/Provider Plan owns the default provider choice;
- provider choice is never Truth identity.

### Current Raziel policy state

`raziel_config.shared.model_policy` currently includes:
- default: `claude-sonnet-5`
- deep: `claude-sonnet-5`
- fast: `claude-haiku-4-5`
- `routing_policy='task_class'`
- **routing_enabled=false**

This means a model policy shape exists, but smart routing is not yet active.

F7 plans the governed route; it does not activate that config.

---

## 3. Current pricing inputs

Live `api_pricing` has current rows including:

| Model | USD / 1M input | USD / 1M output | FX snapshot |
|---|---:|---:|---:|
| gemini-2.5-flash | 0.30 | 2.50 | 3.01 ILS/USD |
| claude-haiku-4-5 | 1.00 | 5.00 | 3.01 |
| claude-sonnet-5 | 3.00 | 15.00 | 3.01 |

Pricing is version/effective-date data.

It may choose between options that are already sufficient.

It may not:
- lower required intelligence;
- bypass privacy eligibility;
- invent zero cost for unknown price;
- make a provider more truthful.

Unknown cost remains UNKNOWN.

---

## 4. Existing trace owner already fits F7

Operational Trace spans already preserve:

- capability
- plan_ref
- intelligence_level
- provider
- model
- model_version
- routing_reason
- escalation_reason
- fallback_reason
- output_use
- duration
- resource units
- provider-native cost
- pricing_ref
- FX
- cost_ils / certainty
- replay refs
- privacy/redaction flags

Therefore F7 requires **no new observability system**.

Multi-provider fan-out uses sibling spans under one root.

Final merge/render is its own span.

Discarded provider output remains visible in trace.

---

## 5. Provider catalog is runtime state, not truth

F7's pure planner receives a provider/model catalog describing:

- provider
- model
- runtime status
- supported intelligence levels
- allowed privacy classes
- pricing
- runtime ref
- versions

Runtime states:
- wired
- not_wired
- unavailable
- disabled

A `wired` entry requires runtime provenance.

But the pure planner still does not verify the external runtime ref.

It therefore returns:

`execution_authorized=false`

until an owner/server wrapper verifies current runtime state.

A caller cannot make a model “wired” merely by sending a JSON object.

---

## 6. Minimum Sufficient Intelligence

F7 separates:

### FAST
Suitable for bounded rendering, compression, lightweight interpretation and tasks whose correctness does not require deeper model capacity.

### DEEP
Required when the Research Plan says deeper intelligence is necessary.

A cheaper FAST-only provider may never satisfy a DEEP request.

If budget cannot afford any DEEP-eligible provider:

`BLOCKED_BUDGET_FOR_REQUIRED_INTELLIGENCE`

not “silently use fast”.

---

## 7. Privacy before price

Eligibility order:

```text
runtime wired/enabled
        ↓
required intelligence
        ↓
privacy class
        ↓
cost provenance / budget
        ↓
provider/model preference
```

A cheap public-only provider is not considered for a private task if private use is not explicitly allowed in the owner-verified catalog.

This rule is load-bearing.

---

## 8. Deterministic before LLM

If Research Plan determines no LLM is needed:

`DETERMINISTIC_ONLY`

No provider call is planned.

Deterministic engines, cached Facts, Cross, corpus controls and other canonical calculations remain upstream.

AI does not run merely because a page supports AI.

---

## 9. Caller/provider preference

Legacy caller code can request Claude/Gemini.

In 2029 this becomes non-authoritative.

Supported policy modes:

### ignore
Caller preference has no routing effect.

### tie_break_only
Caller preference may select between equally sufficient/equally ranked choices only after stronger routing/cost rules.

### explicit_compare_only
Caller preference can be used to request a deliberate comparison.

It may appear as Challenger.

It does not become the primary Truth source.

---

## 10. Challenge / Information Gain

Normal path:

```text
one sufficient Primary
      ↓
finish
```

Possible challenge triggers:
- high decision impact
- high uncertainty
- conflicting Findings
- Human-requested challenge

But a trigger alone is insufficient.

Except explicit provider-compare mode, the plan also requires:

`challenge_can_change_decision=true`

This is the Information Gain gate.

No second provider just because “more AI sounds safer”.

---

## 11. Maximum normal fan-out

F7 V1 allows:

`max_initial_provider_calls = 1..2`

Normal:
- one Primary

Deep challenge:
- one Primary
- one Challenger

No default 3-provider fan-out.

A future third-provider experiment may be separately authorized as a bounded research protocol, but it is not normal routing.

---

## 12. Challenger selection

When challenge is justified:

1. remove the Primary;
2. prefer a different provider when policy says cross-provider;
3. in explicit compare mode, try to honor the requested provider/model;
4. keep all intelligence/privacy/budget gates.

Provider agreement is:

**model robustness**

not independent evidence about the world or Person.

Provider disagreement is useful:
- alternative interpretation;
- challenge;
- uncertainty signal;
- reason for Human/deeper research.

It is not resolved by majority vote.

---

## 13. Fallback is not Challenger

Fallback is planned for:
- provider error;
- unavailability;
- permitted runtime failure.

Fallback is:
- not called initially;
- not counted as independent challenge;
- traced separately if actually executed.

A plan can therefore have:

```text
Initial: Primary
Fallback: Provider B
```

without paying for Provider B unless needed.

---

## 14. Unknown cost

When price or expected tokens are unavailable:

`cost certainty = unknown`

Unknown is never treated as zero.

Policy decides whether unknown-cost options are allowed.

If policy forbids unknown cost and all otherwise eligible providers have unknown cost, routing blocks rather than assuming free.

---

## 15. Budget

Optional budget applies only **after** intelligence/privacy eligibility.

If every sufficient provider exceeds budget:

`BLOCKED_BUDGET`

The system may:
- tell the caller more budget/entitlement is needed;
- offer a lower-depth product mode only if the upstream Research Plan explicitly allows that task change.

The provider planner itself cannot downgrade the research contract.

---

## 16. Cost estimation

For planning only, if expected token budget + pricing exist:

```text
estimated USD =
 input_tokens × input_price / 1M
 +
 output_tokens × output_price / 1M
```

Then use the pricing FX snapshot for ILS.

Planning cost is **estimated**, not invoice truth.

Actual cost comes from the operational/provider logs when available.

---

## 17. Execution authorization boundary

F7 V1 is deliberately pure.

It can say:

“Given this catalog and policy, this is the correct plan.”

It cannot say:

“I verified Google/Anthropic/OpenAI is currently available.”

Therefore the plan preserves:
- catalog_ref
- owner_attestation_ref
- runtime_ref

but:

`verified_by_planner=false`

`execution_authorized=false`

A later owner-qualified runtime wrapper will:
- resolve live availability;
- verify secrets/config/entitlement;
- instantiate trace;
- execute the plan;
- record actual cost/outcome.

---

## 18. OpenAI / GPT boundary

Current state:

- GPT is useful in SOD1820 as Research/Challenge/strategy agent.
- OpenAI is **not** currently wired into `ai-analyze`.

F7 must represent an OpenAI entry as:

`NOT_WIRED`

until:
- provider adapter exists;
- runtime configuration is present;
- owner verifies privacy/entitlement/cost behavior;
- trace integration exists;
- tests pass.

A NOT_WIRED entry can never be selected, even if its hypothetical cost is lower.

---

## 19. Provider learning

F6 Champion/Challenger can later test provider policies.

Examples:
- Gemini Flash may perform equivalently for a task class at lower cost;
- Haiku may be enough for lightweight rendering;
- Sonnet may materially improve a specific deep synthesis;
- a second Challenger may add no decision-changing value.

Those are empirical policy questions.

Provider learning never rewrites:
- engine Facts;
- Person truth;
- method semantics;
- canonical claims.

Human Gate remains required for policy promotion.

---

## 20. Product depth

Free/Premium may affect:
- entitlement;
- maximum depth;
- whether challenge/deep analysis is available;
- token/budget ceilings.

They do not create separate Truth.

The same Synthesis/evidence lineage remains underneath.

---

## 21. F7 implementation sequence

### F7.0 — Pure provider planner
Current phase:
- catalog normalization;
- sufficient-provider eligibility;
- cost estimate;
- budget;
- caller preference boundary;
- primary/challenger/fallback plan;
- trace requirements.

### F7.1 — Live catalog adapter
Future:
- resolve current provider/runtime/model availability from active owners;
- resolve pricing/effective date;
- resolve privacy/entitlement eligibility;
- preserve owner refs.

### F7.2 — Execution wrapper
- verify catalog;
- create/continue root trace;
- execute Primary;
- conditional Challenger;
- fallback only on failure;
- final render/merge span.

### F7.3 — Synthesis/provider interface
Providers consume a bounded Synthesis/Result Bundle projection, not raw disconnected local page heuristics.

### F7.4 — Provider comparison protocol
Bounded A/B / challenger studies with frozen evidence pack and common rubric.

### F7.5 — Learning
Feed qualified results to F6 Champion/Challenger policy evaluation.

### F7.6 — Optional OpenAI runtime adapter
Only if Human/owner decides to wire OpenAI into the site runtime.

---

## 22. Acceptance gates

F7 is not mature until:

1. no NOT_WIRED provider can be selected;
2. privacy/intelligence precede cost;
3. cost cannot downgrade required intelligence;
4. unknown cost is never zero;
5. deterministic-only tasks call no model;
6. normal initial fan-out is at most two;
7. Challenge requires Information Gain except explicit compare;
8. fallback is not initial fan-out;
9. caller provider preference is not Truth authority;
10. provider agreement is robustness only;
11. catalog claims are owner-verified before execution;
12. one root trace covers fan-out/fan-in;
13. discarded outputs remain visible;
14. actual vs estimated cost remain distinct;
15. OpenAI remains NOT_WIRED until genuinely implemented;
16. F6/Human Gate governs learned routing-policy changes.

---

## 23. Relationship to old AI flow

Old:
```text
page facts
  ↓
caller picks Claude/Gemini
  ↓
ai-analyze
  ↓
prose
```

2029:
```text
Result Bundle / Synthesis
        ↓
Research Plan says whether AI is needed
        ↓
F7 Minimum Sufficient Intelligence plan
        ↓
owner-verified provider runtime
        ↓
Primary [ + bounded Challenger ]
        ↓
render / challenge
        ↓
ONE Synthesis lineage
        ↓
Operational Trace + calibration/learning
```

The old `aiAnalysis.js` entry point can migrate as a consumer/transport path.

It does not remain semantic/provider-selection authority in 2029.
