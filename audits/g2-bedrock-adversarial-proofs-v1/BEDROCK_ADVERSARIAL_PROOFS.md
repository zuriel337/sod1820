# G2 Bedrock Adversarial Proofs — 2026-09-13

## Status and authority

**Evidence checkpoint, NOT a new contract, owner, roadmap or implementation. G2 remains OPEN for excavation, not closure.**

Baseline verified twice during this slice: `origin/main = fa154d67e5209c28f4043c2adfdede5451f12386`.
Canonical Supabase: `linswmnnkjxvweumprav` only.
Evidence branch: `gpt/g2-bedrock-adversarial-proofs-v1`.
BEFORE: `eb59acc2-d14c-4761-bceb-79436f233a14`.
Parent excavation: `84c84f33-3e40-4bd0-98c7-e2a12e55d9a7`.
Human replan: `7f45c86d-3c86-46fe-978c-d6e56e32342b`.
New Collector direction, read during closing coordination: `aa51eece-da5e-4f28-9487-ddfed32f053e`. The old Collector is migration evidence, NOT a future architecture constraint; no Collector implementation is authorized here.
Existing independent Claude assignment: `96a98352-503d-4924-b999-2be173effd22`; no response was present at verification. An assignment does not mean a closed external runtime has been awakened.

Product data, rules, functions, schema, RLS, Edge implementations, crons and routes were NOT modified. The only server-side writes in this slice are coordination records and audit artifacts on an isolated Git branch. No merge, deployment, canonical promotion or gate closure.

### Owners resolved live

`foundation_closure_protocol_law v4`; `reality_graph_law v5`; `truth_axes_foundation_law v3`; `research_intake_foundation_contract_law v8`; `research_object_identity_invariant_law v2`; `corpus_admission_foundation_v1 v1`; `engine_governance_registry_authority_law v1`; `graph_privacy_foundation_law v1`; `person_foundation_contract_law v5`; relevant sequence/personal clauses of `research_strategy_layer_law v11`; current Research Studio / Universal Finding contract lineage; `inter_agent_coordination_law v10`; live-state and work-log owners.

**OWNER CHECK: EXTEND_EXISTING.** This report proposes acceptance invariants inside these owners, not another graph, context database, collector system, planner or verification store. Read budget L3 was used because the inquiry crossed truth, identity, access and recovery boundaries.

## Evidence classes

- **LIVE READ PROOF:** actual current DB reads, including an explicit `anon` role simulation in a read-only transaction.
- **LIVE IMPLEMENTATION:** current deployed Edge source or DB function body, not merely a historical migration.
- **MAIN IMPLEMENTATION:** code at the pinned main SHA; browser production behavior is NOT implied without a browser test.
- **ISOLATED REPLAY:** executable excerpts and state models using synthetic data; not live user traffic or full application E2E.
- **RISK / REQUIRED FOLLOW-UP:** a reachable failure or contract gap whose historical incidence is not established.

The offline replay has **19 checks: 15 reproduced counterexamples and 4 positive controls**. These are NOT 15 separate production incidents and NOT a product PASS. SQL identity/access probes are additional live reads, not included in that count.

## B01 — Verification scope is broader than the claim actually tested

**Evidence:** deployed `research-extract` v3; same verification algorithm in `supabase/functions/research-extract/index.ts` at the baseline. Live canonical method calls for two fixture expressions only.

The extractor sets `engine_verified=true` when ANY Hebrew term in `terms + relates` has ANY returned method value equal to the extracted scalar. It does not require every operand of an equality to match, and it does not bind the test to the method actually claimed. An unavailable method response can become `false` instead of an explicitly untested result. Numeric input is also coerced with `Math.trunc`, so a decimal observation can silently change value.

Canonical live calibration, via existing registered execution paths:

| Exact expression | Regular result | Ordinal result |
|---|---:|---:|
| משיח | 358 | 52 |
| תורה | 611 | 53 |

Synthetic counterexamples:

1. A relation shaped as `משיח = תורה = 358` is marked true by the compatibility boolean because one operand matches. The other regular result is 611.
2. A claim that משיח is 358 specifically by ordinal calculation is marked true from a different method; ordinal is 52.
3. A failed/unavailable method response with a Hebrew input produces false with an empty detail object; this does not establish mathematical mismatch.
4. An observation value `3.14` becomes `3`.

**Measured corpus, not adjudicated claim correctness:** 88 `research_objects` from `source='wa-raziel'`; all candidate; 10 compatibility-true, 7 false, 71 null; none has an explicit `engine_detail.verification_state`; none is owner-bound by `owner_person_id`. This does not prove all 10 true rows are wrong.

A related live writer, `fn_corpus_admission_gate`, can insert a repeated-discovery candidate with `engine_verified=true` after an expression identity match without itself comparing `p_claimed_value`. Caller-specific safeguards still need a full call-path audit. This writer was NOT invoked during this investigation. Seven current rows have its admission metadata; none has explicit verification state.

**Positive boundary:** the modern Research Object adapter does NOT promote that boolean into `verification_state='match'`. Candidate status and private default are also preserved. This is not evidence of automatic canonical publication.

**Acceptance target:** a verification receipt must bind exact claim, operands, method/version, input representation and actual results. Partial operand support, method discovery, failed execution and verified equality are distinct outcomes. No silent integer coercion. Extend existing Truth / Intake / method execution semantics.

## B02 — Source-native identity is normalized too aggressively for arbitrary sources

**Evidence:** live immutable `fn_research_source_uid(text)` and read-only synthetic SQL probes.

The function lowercases the ENTIRE source reference after stripping the recognized ingestion suffix. Thus these synthetic references receive the same UID:

`https://example.invalid/Book/AbC.pdf#p1`

`https://example.invalid/Book/abc.pdf#p1`

That is unsafe as a universal source rule. URI scheme/host normalization is not a general license to lowercase paths or provider-native IDs. RFC 3986 §6.2.2.1 distinguishes these components.

NULL and empty source references also become the same empty UID. Identical claim text from unrelated unknown sources could therefore collide at the unique boundary rather than remain unresolved separate inputs.

**Controls passed:** `#batch1` and `#batch2` collapse as intended; `#interpretation` and `#valuation` remain distinct.

**Historical impact not demonstrated:** current corpus has zero source-reference groups differing only in case and zero blank/missing source references. This is a reproduced input-boundary risk, NOT a claim of current corpus loss.

**Acceptance target:** owner-aware, namespace-aware normalization; source uncertainty is not source equality. Preserve native identifiers and semantic fragments. Existing identity owner decides the smallest compatible extension; no second identity registry is proposed.

## B03 — Universal Finding identity can collapse different occurrences or split equal ones

**Evidence:** `src/lib/research/universalFinding.js`, exact `universalFindingId` function; its ELS adapter inputs; `useUniversalWorkspace.js`; `ResearchProvider.jsx`.

The ID builder uses `native || occurrence`, not the qualified combination. It also serializes native identity objects with ordinary `JSON.stringify`.

Reproduced with synthetic inputs:

- Same ELS term and hitId, different Torah/Tanakh corpus context: same Universal Finding ID. The adapter puts corpus in source/verification, outside the generated ID input. No assertion is made that the synthetic occurrence exists in either real corpus.
- Same native reference with different occurrence starts: same ID because the populated native reference masks occurrence. This probes the generic boundary, not the current Pi adapter specifically.
- Equivalent native objects inserted with different property order: different IDs.

The existing provider then de-duplicates by `entity.id` using `some(...) ? existing : append`, so the synthetic two-result corpus case retains only one cart item. This is not merely a naming defect; it can affect research continuity.

**Control passed:** distinct native hit IDs remain distinct.

**Acceptance target:** the existing envelope must qualify source identity by the decision-relevant corpus/version, subject and occurrence; deterministic serialization must be stable. Separate logical object identity from revision/result/occurrence identity where required. Do not invent a second Finding type or store.

## B04 — Truth-safe projection can still discard the proof needed for research

**Evidence:** `researchObjectFinding.js` and `researchViewerProjection.js` at the baseline; aggregate DB metadata coverage.

The viewer's SELECT does not request `meta`, `parent_id`, `owner_person_id` or source `evidence`. The adapter carries selected verification fields but omits rule-application provenance, procedure details, parent linkage and additional engine trace. A synthetic source-shaped adapter replay placed six distinct markers in these fields: all six were absent at the constructor-input boundary.

**This is NOT deletion from the DB.** The source Research Object ID remains available for later retrieval, but the emitted envelope alone is not a sufficient research proof. A compact visual card may be lossy; an evidence-bearing composition boundary must either preserve the relevant proof or provide an explicit versioned, authorized hydration path.

Live coverage: 735 Research Objects; 614 have nonempty meta; 47 procedure-bearing; 7 rule-application-bearing; 2 extraction-integrity-bearing; 598 with engine detail; 129 explicit verification states. The adapter gap therefore applies to real stored provenance, not only imagined future fields.

**Acceptance target:** preserve the minimal lineage reference plus authorized retrieval of the exact supporting version. Do not copy every private dossier into every public Bundle. Keep private proof out of public payloads while retaining honest explanations and replay for authorized readers.

## B05 — Bounded extraction is not yet an honest coverage/recovery contract

**Evidence:** deployed `research-extract v3` and `lab-reflect v3`, plus main implementations.

`research-extract` selects recently active chats, but the subsequent conversation read orders the whole history ascending and takes the first 40 incoming and first 40 outgoing messages. The recent window is not passed into that source read. It further truncates each message and the combined content without a persisted completeness manifest.

Live aggregate: 16 DM transcript groups; one has 89 outgoing transcript messages. Incoming `raziel_dm` messages have a maximum of 35 per sender. The demonstrated live saturation is therefore on the outgoing transcript side, not a claim that 49 real user messages were lost. The isolated 89-row selection replay retains only the oldest 40.

`lab-reflect` reads at most 50 messages after its cursor, but advances `reflected_through` to wall-clock now even when parsing returns null. It also does not check every returned write-error object before advancing. A synthetic 100-row backlog leaves 50 unprocessed rows behind the new cursor. A parse-failure fixture still advances the cursor.

**Historical lab loss is NOT established:** the live lab has only 13 messages. No message contents were exported for this audit.

**Acceptance target:** advance only through the successfully processed contiguous source range; retain exact source IDs/window/version; distinguish complete, partial, truncated, failed, cancelled and not-run. A retry must not re-count dependent evidence or discard an unprocessed tail. Reuse the existing Intake/run lifecycle rather than adding another queue.

## B06 — Personal boundaries can fail in the browser even with correct server RLS

**Evidence:** current main `ResearchProvider.jsx`, `AuthContext.jsx`, `auth.js`; synthetic account-transition replay only.

The provider uses one `localStorage` key, `sod_research_v1`, independent of account. On logout/account switch it explicitly clears only active Context; cart/saved/pinned/history/collections/journeys remain. When the next user's cloud state is empty, it seeds that account with the still-resident local state.

The synthetic A -> logout -> B with empty cloud fixture copies one synthetic A item into B's payload. NO real accounts were switched; NO browser production E2E or real cross-user transfer was performed or claimed.

Server policies on `research_items` and `user_research` correctly constrain rows to the authenticated owner. That does not detect a browser uploading stale A-origin data as B's own new rows.

**Acceptance target:** principal-bound memory/cache/storage and hydration; explicit guest-to-account adoption; purge or partition authorized state on account change; cancel old in-flight reads/writes; verify that B never renders or uploads A's private envelope. This extends existing Personal / Research OS owners, not a Personal Graph.

## B07 — Cloud synchronization mistakes absence for deletion intent

**Evidence:** `saveCloudResearch` / `getCloudResearch` in current main `src/lib/auth.js`; isolated in-memory state replay.

Current algorithm skips item reconciliation when the local item list is empty. Otherwise it upserts local items and deletes existing remote items absent from that local snapshot. There is no expected revision or explicit removal intent. Read/write result errors are not consistently checked.

Reproduced scenarios:

- Remove the final saved item locally: remote item remains and can reappear after reload.
- Device 1 adds Y; stale device 2 sees only X and adds Z: reconciliation removes Y although device 2 never requested its removal.
- Upsert fails as a returned error; the later read/delete path still runs: previously stored X can be removed without successful replacement.

The same read path can interpret failed fetches as empty state. These are algorithmic failure proofs, not a production concurrency load test or a count of affected users.

**Control passed:** the model's user filter does not delete another user's rows. The problem is stale same-user state and data provenance, not a missing user predicate on this delete.

**Acceptance target:** absent-from-snapshot != explicit delete. Use existing owner-controlled revision/intent/conflict semantics, atomic or recoverable writes, checked errors and idempotent operation identity. A last-item removal must synchronize without enabling empty-state wipes.

## B08 — Hidden-source graph data is actually readable as anon

**Evidence class: LIVE READ PROOF.**

A read-only transaction switched to DB role `anon`. It returned counts only, using the three hidden-source projection IDs resolved privately in the prior authorized query:

| Probe | Returned count |
|---|---:|
| Readable graph nodes whose source Contribution is hidden | 3 |
| Readable outgoing edges from those nodes | 4 |
| Readable legacy `journey_saves` rows | 3 |

The transaction was rolled back; it performed no data mutation. This is DB-role simulation, not an external anonymous HTTP probe and not evidence of past exploitation. No personal labels, message content, phone numbers or affected IDs are included in this artifact.

Current nodes/edges public SELECT uses `fn_graph_space_is_public(metadata)`; its live definition is `coalesce(space,'core') <> 'private'`. Anonymous table SELECT is granted. The legacy journey policy is unconditional SELECT. The audit does NOT claim the three legacy journeys had been promised private; it proves that surface cannot simply be reused for private research.

**Priority:** targeted access containment must not wait for completion of the entire future redesign. No containment was applied by this read-only pass. The follow-up must verify source moderation/withdrawal, graph projection, edge endpoint/reference exposure, derived caches and authorized positive paths. Do not blindly revoke unrelated public capabilities or delete research history.

## B09 — A suspected active-rule problem was narrowed, not exaggerated

The `rules_active` view indeed chooses the latest version without filtering `is_active`. However, this slice found no `rules_active` reference in the bounded main code search and no current public SQL function body referencing it.

Direct live owner selection currently finds **249 active rule rows, 249 distinct rule IDs, zero missing IDs and zero duplicate active versions**. The Owner Index already instructs readers to use `nodes ... is_active=true`.

**Reclassification:** misleading/unsafe entry surface and latent drift trap; NOT a demonstrated active production-reader incident from this evidence. Index pointers to older Strategy/Person versions still need reconciliation. No new active-rule resolver system is justified merely by this view name.

## B10 — The active routing document still exposes legacy preservation restrictions

The Owner Index routes Research OS ownership to `docs/research-studio-v1-contract.md`. Its historical §8 still states that the Number Page is never rebuilt/replaced and its findings area is not to be redesigned. The same document also names older convergence and workspace presentation contracts.

The current Reality Graph v5 plus explicit G2 Human replan treats these legacy surfaces as migration inputs, not future constraints. This is a **documentation/authority reconciliation item**: a fresh builder must be shown an explicit current supersession pointer instead of guessing that an old imperative is still binding. Preserve history; do not clone another Research OS contract or bulk-rewrite unrelated archives. No wording was changed in this pass.

## Cross-layer conclusion

The work is no longer just a census of legacy tables. It now contains failure proofs at the boundaries between source, identity, verification, projection, principal and durable state.

One Tree does NOT mean one table, one global client cache, automatic merging of equal labels, or preserving every old implementation. It means qualified identities and one owner per semantic responsibility; multiple authorized contexts may share engines without sharing private state.

A robust foundation must permit future replacement of UI, Collector, provider and expensive capabilities while preserving exact source/version, claim scope, ownership, decisions and reproducible results. This is an evolution objective, not a guarantee that no migration will ever be needed.

## Proposed acceptance sequence — no implementation authorization

1. Isolate urgent access defects (B08; synthetic principal risk B06 requires browser verification).
2. Prove qualified identity and claim-verification receipts (B01–B03).
3. Prove authorized evidence transport, not just a valid-looking envelope (B04).
4. Prove source coverage, retry/cursor safety and operation-intent synchronization (B05–B07).
5. Reconcile active authority pointers and stale restrictions (B09–B10).
6. Run an end-to-end correction/withdrawal chain: source revision -> extraction -> Finding -> Bundle -> saved Journey -> cache -> Raziel response. Historical replay and current re-evaluation must remain distinct. Permission revocation must invalidate access without rewriting history as if it never happened.

This is prioritization inside the existing gate, not a second roadmap. Additional unexamined writer/consumer families from the parent excavation remain open. No claim of reaching the final bottom or having an exhaustive repository-wide security audit is made.

## Reproduction and source manifest

Offline command: `node replay.mjs` from this directory. It uses only Node built-ins and synthetic data. It writes `replay-results.json`. A successful diagnostic run means the specified baseline counterexamples were reproduced, NOT that the product is fixed.

Pinned main files examined:

- `src/lib/research/universalFinding.js` — blob `f2445d04d74f7ff9730a8dbfbe02d44616ae8f0e`.
- `src/lib/research/researchObjectFinding.js` — blob `ad3d8d6827a80c410943e1aaef0613c4230cf9fa`.
- `src/lib/research/ResearchProvider.jsx` — blob `26d5ce71b8516eaa97da9393d0d8a5c76cf4166c`.
- `src/lib/auth.js` — blob `5e33570ea54a07d51cc593a539f3176bab87a0bc`.
- `src/lib/research/researchViewerProjection.js`, `useUniversalWorkspace.js`, `src/lib/AuthContext.jsx`.
- `docs/research-universal-finding-contract.md`, `docs/research-studio-v1-contract.md`, `SOD1820_MASTER_OWNER_INDEX.md`.

Live Edge sources retrieved, never invoked for extraction/notification:

- `research-extract` v3, bundle SHA-256 `2fe9c7fa51cd1d730c07ed19df34ff2307929a48831af9f956cf5839c40bbc55`.
- `lab-reflect` v3, bundle SHA-256 `75c4793fdf424d8c29fb3274f1ca65c2787f97365f8c8883b47b4d59930288ba`.

The bundle hashes identify retrieved deployment artifacts; they are not asserted to equal individual source-file hashes.

External primary references used for narrowly scoped technical checks: RFC 3986 §6.2.2.1 (component-specific URI case normalization), PostgreSQL documentation on row-security owner/BYPASSRLS behavior. All project-specific measurements came from the canonical project, not these external documents.

**Final scope state: AUDIT DOCUMENTED; COUNTEREXAMPLES REPRODUCED; NO PRODUCT FIX; NOT MERGED; NOT DEPLOYED; G2 OPEN.**
