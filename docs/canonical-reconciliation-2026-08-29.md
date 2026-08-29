# SOD1820 — Multi-Day Canonical Reconciliation Pack

**Date:** 2026-08-29  
**Actor:** GPT  
**Scope:** canonical documentation reconciliation only  
**Live baseline:** `origin/main` = `2cc0725372e3260b06b510f1b93101da14f665c7` (Merge PR #236)  
**Canonical Supabase:** `linswmnnkjxvweumprav`

This pack is a staging/audit artifact for updating `SOD1820_MASTER_STATE.md`, `SOD1820_MASTER_ROADMAP.md`, and the Master Change Log without erasing historical text. It does not itself supersede those files. It separates decisions/capabilities that MUST be reflected canonically from implementation-only commits that remain provenance.

## Reconciliation law

Authority used: live DB + `origin/main` + Master State > Roadmap > conversation. Historical statements that were true at their time remain; later state is added as an UPDATE/superseding state. Foundation → Projection → Experience. Preserve capability, truth, provenance, identity and decisions — not necessarily legacy interface.

## A. MUST ADD / SUPERSEDE IN MASTER STATE

### 1. Work Log Authority Foundation — LIVE + MERGED

**Canonical owner:** `nodes.rule_id='work_log_authority_law'` (v2 active).  
**Main provenance:** PR #229 / merge `dc70e0a8cbe93a5aac49424599385d0854215d88`; implementation commits `63c021a9`, `84f15e6c`.

State to record:
- `work_log` history is additive provenance, not current authority merely by recency.
- `superseded_by_id` + `work_log_current` define CURRENT vs SUPERSEDED/ARCHIVED projection.
- `get_work_log_current()` is authenticated-admin browser path; agent/service-role bootstrap uses the current view directly, not the RPC.
- Security mismatch discovered during closure was fixed; anon cannot use the SECURITY DEFINER RPC to bypass RLS.
- This is provenance/coordination authority, not canonical ownership of Decision content.

**Classification:** IMPLEMENTED + LIVE DB + MERGED. No new Foundation blocker.

### 2. Gematria Verified ≠ Published / Public Visibility Law — LIVE + MERGED + RELEASED

**Main provenance:** PR #235, merge `1e03cb4686a9bfab71c41a16aadf16b211aeae67`; commits `f03c5824`, `ae517a90`, `7397d379`.  
**Work-log release:** `4e4bb41e-78d5-475c-989d-88a4e2dca7ee`.

State to record:
- `gematria_words.is_verified` and `gematria_words.is_published` are independent axes.
- `is_verified=true` does not imply publication/access.
- Public gematria reads require the publication contract; `bidim` public visibility is source-derived from the source word's verified+published state rather than a duplicated publication truth.
- SECURITY DEFINER leak paths and WhatsApp/service-role readers were reconciled to the same visibility law.
- No corpus phrases were deleted or rewritten by this closure.

**Classification:** IMPLEMENTED + DB LIVE + MERGED + released/verified according to release work_log. This predates M1 but is consistent with M1's Publication/Access orthogonal axis.

### 3. User Center Target / Reachability — MERGED PROJECTION STATE

**Main provenance:** PR #227 merge `ddb365bd`; #228 merge `0c839ccf`; #230 merge `8a1a3d7b`.

State to record at projection/experience level only:
- User Center uses Research as the primary gateway rather than embedding/duplicating ResearchCenter.
- Existing personal codes and legacy personal material retain transitional reachability.
- Contributions reachability and direct Saved targeting reuse existing contracts; no new store/context/route.
- Later Human-Gate decision removed the community nudge from personal next-actions and restored the `posts > 0` visibility gate; this supersedes #228's writer-capability header-display decision only, not the underlying `myposts` capability.

**Classification:** MERGED projection/experience implementation. Do not elevate legacy shortcuts into target architecture.

### 4. Human Date Input Law — MERGED + MOBILE FIXED

**Canonical owner already referenced by Experience Governance:** `human_date_input_law` / canonical `HumanDateInput` component.  
**Main provenance:** PR #231 merge `2b6284f2`; #232 merge `afc445bc`; #233 merge `fc10eb5c`.

Superseding live state to ensure Master precision:
- Known human dates must support direct day/month/year entry; native mobile wheel-picker is not the sole interface.
- Draft ≠ Canonical: partial/invalid typing stays local and does not rewrite/clear canonical parent state; explicit all-fields-clear is the null signal.
- No arbitrary global minimum year; future-date restriction is caller-specific (`disableFuture`) and rejection never silently rewrites user intent.
- Adoption includes UserCenter birth date, Community Calculator birth-date inputs and general DatesTool (future dates allowed there).
- Canonical component is responsive at 320/360/390px; layout-only closure merged.

**Classification:** IMPLEMENTED + MERGED. Locale parameterization remains an Experience Governance extension point, not a blocker.

### 5. Experience Governance Foundation v1 — UPDATE RELEASE STATE

Master §23.17 already contains the contract and its pre-merge status. Add superseding release update:
- PR #234 merged to `main` on 2026-08-29, merge `e5f21efc04d9ba79ec547118cca686b9f0cd4866`.
- Verdict remains `FOUNDATION SUFFICIENT — CONTRACT LEVEL`.
- Boundary: Experience may represent upstream semantic state; Experience may not create/redefine it.
- Canonical owners remain `nodes.rule_id='experience_governance_foundation_v1_law'`, `project_codex.slug='experience_governance_foundation_v1'`, and audit contract.

**Classification:** CLOSED / MERGED. Do not reopen without decision-changing evidence.

### 6. Admin RPC Security Closures — DB LIVE + MERGED VIA #236

**Main provenance in PR #236:** commits `41fddeac` (M3/M4), `8fd1c488` (P1).  
**DB migrations:** `20260829124609`, `20260829131313`.

State to record:
- `admin_manage_alias`, `admin_storage_put`, `admin_inbox`, `admin_mark_message_read`, `admin_live_visitors` authorization bypasses are CLOSED.
- Body-level canonical admin check + tightened EXECUTE grants; anon denied, authenticated non-admin denied, real admin verified working.
- Legacy `ADMIN_PASSWORD='sod1820'` remains UI gating only and no longer carries DB authorization power for these RPCs.
- `admin_manage_alias('delete')` hard-delete semantics remain a separate later Human-Gate issue; not a reopened security blocker.

**Classification:** SECURITY BLOCKER CLEARED for this scope; DB LIVE + migration files MERGED. No broad security audit to reopen.

### 7. M1 Truth / Epistemic Contract — CLOSED AT CONTRACT LEVEL + MERGED

**Canonical owners:** `nodes.rule_id='truth_axes_foundation_law'`, `project_codex.slug='truth_axes_foundation_v1'`.  
**Docs:** `docs/m1-truth-contract-implementation.md`.  
**Main release:** PR #236 merge `2cc0725372e3260b06b510f1b93101da14f665c7`.

Human-Gate decisions to index:
- Option D / Hybrid: no universal flattened `lifecycle_state`.
- Orthogonal axes: EPISTEMIC TYPE ≠ VERIFICATION ≠ GOVERNANCE ≠ PUBLICATION/ACCESS, plus separate operational/domain workflow.
- `approved` ≠ `canonical`; canonicalization is a stronger explicit Human-Gate act and does not automatically publish/widen privacy.
- Verification is mandatory-declared, not universally mandatory-match. Valid non-match/not-tested/unknown-method states remain honest states; absence must not be fabricated as `not_tested`.
- AI/Projection may not fabricate semantic states from missing input.

Known non-blocking/open implementation gaps to preserve explicitly:
- `relation_evidence` still lacks a first-class actor primitive; its `source` column cannot safely represent both evidence source and acting actor. Missing source fallback remains transitional and must not be treated as canonical provenance.
- `decision_ledger` governance CHECK remains `NOT VALID` pending adjudication of one historical row.
- No UI canonicalize path yet.

**Verdict:** `M1 CLOSED — FOUNDATION SUFFICIENT FOR TRUTH CONTRACT`. Do not reopen M1 for those implementation follow-ups.

### 8. Engine Governance Foundation — CLOSED + MERGED

**Canonical owner:** `nodes.rule_id='engine_governance_registry_authority_law'`.  
**Doc:** `docs/engine-governance-foundation-implementation.md`.  
**Main release:** PR #236 merge `2cc0725372e3260b06b510f1b93101da14f665c7`.

Human-Gate decisions/law:
- REGISTERED / ACTIVE / EXECUTABLE / ENGINE_VERIFIED / SCANNABLE / PUBLICLY-DISPLAYABLE are not synonyms.
- `in_engine` remains diagnostic/compatibility, not scan authority.
- Future automated writes are gated only by canonical registry governance; current live SCANNABLE set = 18, composites SCANNABLE = 0 at closure.
- Four historical composites stay REGISTERED but inactive/non-scannable; their 50,368 historical `bidim` rows are preserved, not activated.
- `רגיל+אתבש` was NOT registered in this closure.
- Public access and governed evidence are separate: **HG-E4 RANK, DON'T HIDE**. Historical/public unmanaged results may remain discoverable but must carry governance semantics and must not gain canonical evidence weight.
- Canonical convergence order: DISCOVERABLE → GOVERNANCE ELIGIBILITY → DEPENDENCY/INDEPENDENCE → SCORE.
- `fn_number_lookup` / value-family projection now exposes governance state rather than making historical unmanaged results semantically indistinguishable from governed results.

Closure evidence:
- WRITE GOVERNANCE PASS.
- PUBLIC READ GOVERNANCE PASS.
- HISTORICAL PRESERVATION PASS: `bidim` 344,487; four composites 50,368; zero activated.
- CONVERGENCE DEPENDENCY GOVERNANCE PASS.

Known follow-ups that are NOT Foundation blockers:
- 78 persisted `topic_cards.meter_score` values are stale under the corrected convergence rule; controlled recalculation needs a separate Human-Gate pass. Do not mass-rewrite silently.
- Private `גדול` conditional-equivalence CASE in `convergence_meter` plus existing atomic whitelists should be consolidated later into canonical dependency governance.
- Composite fixture verification before any future activation; registry reconciliation for active/in_engine drift; bidim de-stratification before any Full Canonical Method Scan.

**Verdict:** `ENGINE GOVERNANCE FOUNDATION SUFFICIENT / CLOSED`.

## B. ALREADY REPRESENTED — DO NOT DUPLICATE

The existing Master already contains the late Foundation closures through §23.17, including Research Intake / Person / Reality Graph expansion / Experience Governance contract body. Preserve those sections and only add later release-state updates where needed. Do not restate entire contracts.

## C. PROVENANCE-ONLY — DO NOT PROMOTE TO FOUNDATION

Keep these as git/work-log history unless a later canonical decision needs a pointer:
- wording-only changes in CommunityCalculator after HumanDateInput adoption;
- responsive CSS details beyond the canonical mobile acceptance result;
- transient Dimension Five `home_hidden` implementation reversals — final live behavior may be recorded if the product law itself is canonical, but intermediate commits must not become separate decisions;
- branch-only/temporary audit verdicts superseded by later Human-Gate closure;
- health-watch alerts (operational telemetry), unless they create a capacity decision.

## D. ROADMAP RECONCILIATION

Roadmap is navigation, not the truth body. Required navigation update after Master reconciliation:
1. Mark Experience Governance contract closure as merged (not branch-only).
2. Index M1 Truth Contract = CLOSED / Foundation sufficient.
3. Index Engine Governance = CLOSED / Foundation sufficient.
4. Preserve open controlled follow-ups separately: 78 topic-card score recalculation; relation_evidence actor/provenance; decision_ledger historical validation; engine conditional-equivalence consolidation.
5. **Do not jump directly to Full Canonical Method Scan merely because Engine Governance closed.** The live Engine work_log still records pre-scan corpus/registry conditions including bidim de-stratification / scan-universe reconciliation. Run a dedicated pre-scan readiness gate against current live state before executing a full scan.
6. Keep Foundation → Projection → Experience ordering and do not let User Center/HumanDate UI changes dictate Foundation schema.

## E. CHANGE LOG ENTRIES TO ADD

Add one additive 2026-08-29 reconciliation entry that points to the relevant sections rather than duplicating their full bodies:
- Work Log Authority v2 — implemented/live/merged.
- Gematria Verified≠Published visibility closure — implemented/live/merged/released.
- User Center Target + reachability follow-ups — merged projection state.
- Human Date Input v1 + adoption + mobile closure — merged.
- Experience Governance v1 — CLOSED + merged via #234.
- Admin RPC security P1/M3/M4 — CLOSED; DB live and merged via #236.
- M1 Truth Contract — CLOSED at contract level; merged via #236; implementation gaps preserved.
- Engine Governance — CLOSED after four-gate acceptance; merged via #236; controlled follow-ups preserved.

## F. NEXT ACTION / STOP

**FOUNDATION SUFFICIENT for M1 and Engine Governance.**  
**Do not run Full Canonical Method Scan yet.** First perform a narrow live **PRE-SCAN READINESS GATE** to decide whether the known `bidim` stratification / active-vs-engine registry drift still blocks a canonical full scan after the new governance law. This gate may change the scan decision, so it is decision-relevant and not a redundant audit.

Release state of this pack: IMPLEMENTED ON BRANCH ONLY. Not merged, not deployed. It must be folded additively into Master State + Roadmap + Change Log, preserving all historical text.