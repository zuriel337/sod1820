# SOD1820 — Gemini CTO Review Reconciliation V1

**Date:** 2026-10-04  
**Status:** READ-ONLY external-challenge reconciliation / carry-forward evidence  
**Live baseline:** `origin/main=b74b9d40a717bc32be7cf87f1b34047e790cc811` at reconciliation  
**Canonical Supabase:** `linswmnnkjxvweumprav`  
**Owners:** existing domain owners only. No new law/system/store/agent registry/roadmap is created by this audit.

## Purpose

Preserve and reconcile the full external Gemini CTO critique (A–J + scorecard) against live SOD1820 so useful criticism becomes a bounded gate obligation rather than disappearing in conversation. External advice is challenge input, never authority by itself.

Verdicts:
- **ALREADY_COVERED** — existing owner/contract already governs it.
- **GAP_TO_ADD** — live evidence shows a real gap under an existing owner.
- **ACCEPT_WITH_MODIFICATION** — direction is useful but Gemini's generic implementation is not correct for SOD1820.
- **REJECT_FOR_SOD1820** — conflicts with stronger current contracts or creates unnecessary complexity.

Timing buckets:
- **MUST_BEFORE_G4_CLOSE**
- **POST_G4_BEFORE_CUTOVER**
- **POST_CUTOVER_MAINTENANCE**
- **REJECTED_NOT_APPLICABLE**

---

## A. Wired → Accepted → Cutover-complete

**Verdict:** ALREADY_COVERED  
**Timing:** apply continuously; especially POST_G4_BEFORE_CUTOVER  
**Owner:** Experience Governance / existing Cutover contract.

PR #912 established three states only:
1. **Wired** — renderer/routing points to 2029.
2. **Accepted** — applicable acceptance rows PASS with evidence.
3. **Cutover-complete** — Accepted + Human Gate + post-cutover checkpoint / rollback-window handling.

Do **not** add Observed/Stable/Retired-Legacy as new lifecycle states. Observation and retirement are evidence/checkpoints, not new global states.

**Next action:** every family cutover record uses only these three states.

---

## B. Legacy renderer retirement

**Verdict:** ALREADY_COVERED / ACCEPT_WITH_MODIFICATION  
**Timing:** POST_CUTOVER_MAINTENANCE  
**Owner:** existing global-cutover foundation + route/SEO/capability owners.

Gemini was directionally right that retirement must be evidence-based, not “after N days”. SOD1820 already has the stronger rule: permanent Legacy retirement requires capability parity, route/SEO/inbound continuity, rollback closure and explicit Human Gate.

Do not use “2029 indexed pages > Legacy indexed pages” as a universal criterion because many SOD1820 migrations preserve the same canonical URL while changing renderer.

**Retirement evidence should include:**
- family Cutover-complete;
- no unique live capability requiring Legacy renderer;
- route/SEO/crawler parity and no unresolved inbound breakage;
- rollback window formally closed;
- current-main Legacy renderer no longer required by active consumers;
- explicit ZURIEL retirement authorization.

**Next action:** apply per family; no new state/system.

---

## C. Root post URLs `/:slug` vs `/post/:slug`

**Verdict:** CURRENT_OWNER + AUTHORIZED_PILOT_EXCEPTION_PENDING_AUDIT  
**Timing:** POST_G4_BEFORE_BROAD_POST_CUTOVER; immediate read-only parity evidence is allowed  
**Owner:** `docs/w0-2027-route-seo-addressability-matrix-v1.md` / route + SEO owner.

Canonical contract:
- `/:slug` is POST-A, canonical individual-post identity.
- `/post` is the Posts listing.
- ordinary migration does **not** move individual posts under `/post/:slug`.
- exceptional migration requires separate ZURIEL Human Gate + inbound/SEO/canonical audit.

Live exception:
- PR #874 explicitly authorized the FZ1073 and Bennett Golden pilot redirects:
  - `/flydubai-fz1073-363-14000-remzei-geula` → `/post/flydubai-fz1073-363-14000-remzei-geula`
  - `/bennett-melach-631-78` → `/post/bennett-melach-631-78`
- Therefore these are **not silent unauthorized drift**.
- They are **pilot exceptions, not precedent**.
- GSC currently has no page rows for either fixture URL in `gsc_metrics`.
- `site_visits` volume is low at reconciliation; this reduces urgency but does not waive the contract.
- `api/og.js` currently derives canonical from the requested path, so the redirected `/post/:slug` becomes canonical for those pilot requests.

**Decision:** do not revert inside this audit. Before any broader Post URL migration, run parity/inbound/canonical audit and either:
1. ratify these two as explicit exceptions with recorded evidence; or
2. restore root canonical rendering and keep 2029 as renderer on the root URL.

**No blanket `/:slug → /post/:slug` migration.**

---

## D. Cross-Surface Exact Return

**Verdict:** GAP identified; now specified in PR #913  
**Timing:** MUST_BEFORE_G4_CLOSE  
**Owner:** Research Context / Experience Governance / Cross-Surface Skeleton Golden.

Golden must prove at least:
- 3+ surface depth;
- full browser reload while deep;
- context recovery without stale/zombie state;
- auth expiry → sign-in → exact return;
- constrained-mobile path with Contextual Inspector bottom sheet;
- deep link / browser back-forward compatibility where relevant.

PR #913 adds explicit full-reload, auth-expiry/sign-in/return and mobile-sheet acceptance language.

**Next action:** execute these cases during the Cross-Surface Skeleton Golden; failure routes to the owning seam.

---

## E. One Reality Graph — vocabulary, provenance, alias drift, DB enforcement

**Verdict:** GAP_TO_ADD under existing graph owner  
**Timing:** MUST_BEFORE_G4_CLOSE for contract→DB parity decision  
**Owner:** `reality_graph_law v8` + `entity_structure_law` + relevant Research/Truth owners.

Foundation is already stronger than the generic Gemini proposal:
- typed relations;
- provenance/lineage;
- dependency classification before ranking;
- Explain-Why;
- Research Strength is multi-dimensional;
- confidence/verification/governance are distinct;
- Human Gate controls governed promotion.

Live DB gap:
- `public.edges.relation_type` is free text with no CHECK/FK vocabulary enforcement.
- Snapshot: 7,212 edges, 31 live `relation_type` values, 0 missing endpoints, 12 rows with NULL metadata.
- `relation_evidence.relation_type` is also free text; `identity_edges.kind` lacks a vocabulary constraint.
- Potential vocabulary/alias drift includes pairs/families such as `related` vs `relates_to`, `scale` vs `scale_x10`, `equals` vs `equals_word` / `equals_by_depth`, `contains` vs `contained_in`, and Kadmi relation variants. These are audit candidates, not automatically duplicates.

**Important rejection of generic advice:** do not add one universal opaque confidence score to every edge. SOD1820 explicitly preserves Research Strength ≠ confidence ≠ verification ≠ governance.

**Next action:**
1. READ_ONLY map every live relation type to canonical semantics/owner/writer.
2. classify KEEP / ALIAS / LEGACY / INVALID / NEEDS_OWNER.
3. only after Human Gate, add bounded DB enforcement (CHECK or existing-owner lookup mechanism) and migrate aliases safely.
4. provenance requirement should be relation-family appropriate; do not force a single `source_id NOT NULL` shape on all relation kinds.

---

## F. Topic vs Number boundary

**Verdict:** CURRENT_OWNER / product acceptance item  
**Timing:** POST_G4_BEFORE_CUTOVER  
**Owner:** Reality Graph + Experience + current Topic/Number projections.

Correct boundary:
- **Number** = canonical numeric identity/value and its direct governed research profile.
- **Topic / Convergence** = durable research composition with independent semantics/lifecycle that may combine numbers, expressions, sources, people, events, posts and findings.
- A dynamic result set around a number is not automatically a Topic.
- “Topic is active, Number is passive” is useful UX shorthand but not sufficient semantics.

**Next action:** Golden/product review must reject duplicate surfaces that answer the same question; keep current Topic index-admission decision under its existing owner.

---

## G. Home vs World boundary

**Verdict:** CURRENT_OWNER / product acceptance item  
**Timing:** POST_G4_BEFORE_CUTOVER  
**Owner:** Experience Governance.

Useful product rule:
- **Home** = entry/pulse/orientation; it points outward to meaningful next places.
- **World** = “what connects?”; it is where the user dives inward into current relationships/context.
- Home may preview World, but should not become a miniature full convergence map.
- World should not become a second Home/marketing landing.

Roadmap already keeps exact Home/Global Now composition open.

**Next action:** check this boundary during Home/World Golden composition review; no new law.

---

## H. Raziel — capability routing and truth limits

**Verdict:** ALREADY_COVERED; add one negative acceptance test  
**Timing:** Golden acceptance, then maintenance  
**Owner:** `raziel_routing_law v2`, `raziel_companion_layer_law v3`, Truth Axes, capability/site-flag owners.

Already true:
- AI recommends; canonical owners execute.
- Raziel may research/calculate through canonical capabilities and recommend next steps.
- Raziel does not canonicalize/publish truth.
- permission/capability gates remain authoritative.

Do not create a new Raziel truth/router owner.

**Next action:** add a negative Golden test: an unregistered/unavailable capability cannot be invented as a route/action by Raziel.

---

## I. Operability for a one-person team

**Verdict:** GAP_TO_ADD as bounded simplification pass  
**Timing:** POST_G4_BEFORE_CUTOVER, then periodic major-gate maintenance  
**Owner:** Foundation Closure / System Suggestions / existing domain owners.

Verified live snapshot:
- **88 Edge Functions, all ACTIVE**.
- **66/88 have `verify_jwt=false`** — this is not automatically a defect; each function has its own invocation/auth contract.
- obvious audit candidates by name include: `fb-hide-test`, `tmp-upload`, `admin-upload-once`, `send-test-mail`, `send-welcome-test`, `tmp-pancher-upload`, `storage-cleanup-oneoff`, `noop`, `g3-openweb-import-once`.
- **38 cron jobs: 30 active, 8 inactive**.
- **15 site_flags: 14 enabled, 1 disabled**.
- canonical active rule tree remains **86** (`nodes(type='rule', is_active=true)`). A prior count of 270 from `rules_active` was not the canonical active-tree count and is not G2 drift.

Gemini's “reduce to a few Edge Functions” is **rejected as a numeric goal**. Fewer functions can increase coupling and blast radius. Simplify only by evidence:
- KEEP
- RETIRE
- CONSOLIDATE
- REPLACE
- OWNER/EXIT-CRITERIA MISSING

**Next action:** bounded read-only inventory after representative G4 Goldens, starting with test/tmp/oneoff functions, inactive crons, and site flags lacking clear exit criteria. Retirement/destructive action remains Human-Gated.

---

## J. Explicit do-not-build list

**Verdict:** REJECT_FOR_SOD1820 / preserve as anti-inflation guidance  
**Timing:** ongoing  
**Owners:** existing Traffic/Experience/Research/Release owners.

Do not build:
1. **A custom real-time bot/egress monitoring product** merely because egress was investigated. Reuse provider data + existing traffic/health owners; add only decision-changing instrumentation.
2. **Client-side ML recommendation engine.** Use governed graph relations, deterministic capabilities and Raziel under existing routing/permission contracts.
3. **A parity scanner that requires a human laptop/manual ritual.** Parity must be automated enough to be repeatable and evidence-producing.

Modification to Gemini: parity does **not** need to run on every PR. SOD1820's correct scope is **mandatory per-family pre-cutover + post-cutover checkpoint**, manual/dispatch CI where appropriate, not a universal PR tax.

---

# Gemini scorecard — reconciled carry-forward

## Foundation — Gemini 9/10
**Accepted concern:** operational/telemetry growth.  
**Existing response:** retention jobs and G4 performance/egress acceptance exist.  
**Carry-forward:** proportionality review at later major gates; do not build a dashboard for its own sake.

## Data / Truth Governance — Gemini 9.5/10
**Accepted concern:** stable source/writer identity and intake bypass risk.  
**Live known debt:** Zvi standing-approval WhatsApp path matches credit text `צבי (OPOC)` rather than stable writer/source ID. It can approve only; it cannot canonicalize or publish.  
**Carry-forward:** bind to stable existing writer/source identity under current intake/person owners before a Golden depends materially on that attribution.

## Product Architecture — Gemini 8.5/10
**Accepted concern:** graph vocabulary can drift.  
**Modification:** no universal confidence score.  
**Carry-forward:** relation-vocabulary mapping + bounded DB enforcement; Topic/Number and Home/World boundary acceptance.

## Release / Cutover Safety — Gemini 8/10
**Accepted concern:** URL-by-URL parity and rollback.  
**Existing response:** PR #912 merged the Cutover gate extensions.  
**Carry-forward:** implement parity tooling before actual family acceptance; pilot POST-A exceptions remain non-precedent pending audit.

## Operability — Gemini 7/10
**Accepted concern:** a single operator must not carry invisible maintenance complexity.  
**Modification:** do not optimize for raw component count.  
**Carry-forward:** bounded simplification inventory after G4 and before broad Cutover; use standing blind-spot/external challenge review.

---

# Standing challenge lenses

Use existing `foundation_closure_protocol_law` Redesign-Risk Challenge + `inter_agent_coordination_law` read-only dispatch. These are **review roles, not new bots**:

1. Beginner / product comprehension.
2. Truth / data / Reality-Graph integrity.
3. Release / SEO / Cutover safety.
4. Operability / simplification for one human operator.
5. Independent skeptic / unknown-unknown challenge.

ZURIEL is not the messenger; GPT/CLAUDE coordinate through work_log.

---

# Gate placement summary

## MUST_BEFORE_G4_CLOSE
- Exact Return full-reload/auth/mobile Golden cases.
- Reality Graph relation-vocabulary/provenance/alias mapping and Human-Gate enforcement decision.
- Stable writer/source binding before any Golden materially relies on the standing trusted-writer path.

## POST_G4_BEFORE_CUTOVER
- Automated Legacy↔2029 parity and rollback evidence per family.
- POST-A pilot exception audit / broad root-URL decision.
- Topic vs Number and Home vs World product-boundary challenge.
- Raziel unavailable/unregistered-capability negative test.
- beginner/orientation learnability acceptance.
- bounded operations simplification inventory for functions/crons/flags.

## POST_CUTOVER_MAINTENANCE / LATER MAJOR GATES
- Legacy renderer retirement after actual evidence.
- retention/egress proportionality.
- repeat the five-lens challenge matrix.

## REJECTED / NOT APPLICABLE
- extra lifecycle states beyond Wired/Accepted/Cutover-complete.
- blanket root-post migration to `/post/:slug`.
- universal edge confidence score.
- “reduce Edge Functions to N” as a goal.
- Human Gate only for canonicalization; SOD1820 correctly keeps Human Gate for major cutover, destructive actions, pricing/economics, privacy/security weakening and permanent retirement too.
- custom bot dashboard, client ML recommendation engine, universal parity-on-every-PR tax.

---

# Corrections discovered during reconciliation

1. **No 270-vs-86 active-tree drift.** `rules_active` contains 270 IDs, but the canonical active rule tree is 86 active rule nodes, matching G2 closure.
2. **Roadmap owner pointer drift:** Roadmap v6.7 still points Unified Experience to `experience_governance_foundation_v1_law v7`; live owner is v8. PR #913 should correct the pointer.
3. **Root redirects are authorized pilot exceptions, not accidental drift.** PR #874 records explicit ZURIEL authorization. What remains missing is the exceptional-migration inbound/SEO/canonical audit before broader precedent.

This audit is evidence/navigation support only. Domain owners remain authoritative.
