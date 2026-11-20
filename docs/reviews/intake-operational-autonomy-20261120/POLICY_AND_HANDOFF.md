# SOD1820 — Operational AI autonomy policy v1 (REVIEW CANDIDATE)
Owner decision 20 November 2026 · Issue #1457 · BRANCH-ONLY, **not activated**

## The separation
- **Intake is continuous, intelligence is conditional.** The site must not create a paid research job merely because a WhatsApp message, image, video, link, person, post or article arrived.
- **Level 0 — free deterministic intake:** preserve the exact source, source ref, proof/access, source time, attach already-known metadata, normalize trusted links, use canonical arithmetic/rules and existing indices. Every distinct occurrence keeps its own identity. No automatic promotion of truth or publication.
- **Level 1 — autonomous operational diagnosis:** use AI only when an actual *server-verified, material operational event* is detected (repeated ingestion failure, repeated broken public source, proven mismatch in an existing public projection). A bounded, redacted summary/diagnosis or change proposal is allowed under a standing **class-specific** owner grant, only after an independent server authority check and atomic budget reservation. Low confidence events, content popularity, an author's message count, or a model saying "interesting" never trigger spend.
- **Immediate incident containment:** potential private/public leak, credential exposure, mistaken identity-linking or unauthorized publication => STOP unsafe action and alert owner; never let a model itself release, delete, modify privileges or promote truth. Event handling must be non-destructive and can operate before any AI.
- **Level 2 — deep/bulk research:** scanning Zvi's large corpus, STT/OCR over many sources, broad method testing, rewriting or connecting canonical findings, long-running agent loops: **explicit owner task/approval**, separate from standing operations grant. No cron 128 activation.
- **System AI does not equal model calls:** existing canonical owners and deterministic engines own provenance/truth and should do most of the work. Use Raziel/Strategy/Metatron as decision/diagnostic capabilities within their existing owner boundary, not a new AI brain or data store.

## How the decision works
The pure classifier `src/lib/research/intakeOperationalPolicy2029.js` is an **intent classifier**. It receives only typed, server-proven event facts, never raw source text, instructions from posts or provider-issued access. Its action `BOUNDED_OPERATIONAL_AI_CANDIDATE` is not permission to execute. It cannot call an LLM or be used as a server authorization gate. A real executor must fail closed unless all below are independently proven:
1. Evidence is independently computed server-side; canonical sourceRef exists, exact source revision SHA-256 and access are current; duplicates/in-flight tasks are verified through owned revision/source paths.
2. Active, explicit **standing authorization** includes the exact event class, one bounded operation type, permitted provider/model, per-invocation timeout/token bounds and narrow redacted data scope. Revoked/expired/unknown policy => denial.
3. **Hard monthly cap** of **₪50 additional autonomous operational AI cost**, in Asia/Jerusalem, is enforced *server-side* with **atomic** idempotent reservations and bounded worst-case provider cost *before* provider execution; concurrent calls, retries, unknown FX/pricing, missing receipt or unexpected model must fail closed. Reconcile the exact usage/cost ledger against outstanding holds. Rejected/spent-but-failed attempts must not silently retry.
4. Every provider adapter is behind this gate, including direct `research-extract`, video image analysis, translation, STT/OCR and externally launched L1 triage. `wa-channel-research-intake` remains paused; independent cron 132 is active and requires an own paid-call inventory.
5. Model output stays advisory: safe operational recommendation, low-risk read-only diagnostic. No DB mutation, publication, person account changes, source deletion, permission changes or production deploy without separate specific approval.
6. Logs include task/trace ID, sourceRef, input revision, approval class/version, action, estimated/reserved/actual cost and success/error; **no raw messages, personal data, passwords or media payloads** in the generic operational log.

## Existing implementation facts (read-only audit 20 Nov 2026)
- Active owners: `research_intake_foundation_contract_law v14`, `research_strategy_layer_law v17`, `system_suggestions_law v7`, `raziel_routing_law v2`, `truth_axes_foundation_law v3`.
- WhatsApp job 102 active each 5 minutes; research intake job **128 disabled**; video-map-enrich job 132 active every 30 minutes.
- Code: `wa-channel-research-intake` does native source dedup/limited retry, but can call `research-extract` which directly makes a paid Claude API call. `materialGate.js` composes existing provider gates.
- **Critical budget finding:** `ai_quota_check` in `supabase/migrations/20260922194500_server_capability_execution_gate_v1.sql` counts daily **requests**, not ILS; its `admin` tier may bypass the count. This is NOT a 50-ILS cap and must never be trusted as one.
- `ai_token_log`, `api_pricing`, `agent_token_costs` provide usage ledger and effective rate data, not necessarily the full invoiced provider cost. Existing provider accounting and new atomic holds must be reconciled through the current operational/cost owner rather than inventing a parallel "intake AI budget" system.

## Suggested acceptance tests
- 500 synthetic source events / 100 identical-content occurrences => 0 paid model calls without a verified L1 event; every distinct occurrence remains preserved.
- L1 diagnostics only after at least two failures or independently verified public projection mismatch. Missing proof, private/unredacted payload or unknown revision: no autonomous model.
- Duplicate revision reuses existing result; no cross-source identity fusion, no duplicate paid retries.
- Ten concurrent L1 calls cannot exceed 50 ILS including existing unsettled reservations. Test 49.99 ILS occupied + 0.02 additional => denied, and unknown provider pricing => denied.
- Private/public leak or identity-conflict => immediate alert/containment, 0 provider calls, 0 automatic changes.
- 1000 corpus messages => deterministic classification only; no automatic deep analysis.
- Cron 128 remains disabled; existing live ingestion and publication rules unaffected.
- Exact source proof, publication gate, Read-Only preview, performance budgets and all CI gates before any merge or release.

## Staging and release sequence
1. Pure classifier tests (this PR): no runtime invocation, no new dependency or UI import.
2. Audit all live paid pathways and existing cost owner; propose exact atomic ILS holds and per-kind standing authorization. This is NOT included or enabled in this PR.
3. Propose a narrowly gated L1 executor through existing operational capability surfaces, server-only; staging with synthetic source events and simulated pricing. No cron 128.
4. Independent Claude security/cost audit, reproducible main comparison and exact-sha CI.
5. Separate user approvals for merge, SQL, Edge, feature flag, any Preview and Production. No automatic enabling based on an issue description or branch.

## Daily owner-facing digest
One concise report: newly received, free-processed, duplicates/reused, verified L1 candidates, actions actually executed, denied/unknown, cost spent/reserved/remaining (with provenance), and decisions needing approval. Immediate owner alert only for security/privacy/identity incidents or irreversible operations.

**Status:** The design and pure classifier are review candidates only. Operational automation and spending authorizations are NOT live.
