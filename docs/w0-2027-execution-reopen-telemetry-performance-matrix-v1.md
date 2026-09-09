# SOD1820 — W0 2027 EXECUTION / COST / EXACT-REOPEN / TELEMETRY / PERFORMANCE MATRIX V1

**Status:** W0 SPECIFICATION · DOCS ONLY · BRANCH ONLY · NOT IMPLEMENTED  
**Owner check:** `EXTEND_EXISTING`  
**Existing owners consumed:** AI Analyze Cost/Completion · unified credits · Research Context/Journey · Traffic Intelligence · Truth/Human Gate · capability/access owners.

## 0. Principle

W0 defines stable **semantics and acceptance behavior**, not a new universal job engine, telemetry warehouse, snapshot store or credit ledger.

Each domain keeps its real execution/storage owner. The Shell and Raziel consume a common semantic envelope so users get consistent progress, failure, retry, cost and return behavior.

---

## 1. Semantic action execution classes

| Class | Examples | Write? | Cost/credit | Authority / confirmation |
|---|---|---:|---|---|
| **E0 Navigation / orientation** | open route, focus entity, change renderer, inspect, return | no domain mutation | no AI charge | caller access only |
| **E1 Deterministic read/tool** | Gematria calculation, bounded graph read, source lookup | no governed mutation | product policy may meter usage later; W0 invents no price | tool/corpus/method eligibility must be valid |
| **E2 AI / interpreted read** | Number analysis, Raziel explanation/comparison, recommendation | no governed truth mutation by response alone | model/provider cost traced; user credits only through existing credit policy | authorized context only; manual fallback where possible |
| **E3 Owned-state write** | save, add to research, save Journey, follow, preference | yes, caller-owned | normally no hidden duplicate charge; specific policy owner decides | authenticated/owner scope; idempotent semantics |
| **E4 Content write/publication** | create/edit/publish Post or representation | yes | domain policy | content author/editor/publication authority; not Research canonicalization |
| **E5 Research intake/candidate write** | submit finding, propose relation/candidate | yes | domain/tool policy | authorized submission; remains candidate/evidence according to Truth owner |
| **E6 Governed transition** | approve, reject, canonicalize, governed publish | yes, high-impact | not a purchasable right | verified Human-Gate/admin root-of-trust at server boundary |

Paid entitlement may change which E1/E2 tools/depths are available or how much usage is permitted. It never upgrades E5/E6 authority and never changes mathematical/truth quality.

---

## 2. Raziel action boundary

One Raziel may perform multiple interaction types without becoming a hidden operating system/truth owner.

### May act directly when authorized

- explain current selection/context;
- navigate to a known addressable identity;
- change local filters/lens/renderer;
- open World/Heichal/My Workspace/Inspector;
- run **authorized read-only/deterministic tools** after validating required input/method/corpus;
- compose comparisons/recommendations from authorized evidence.

### Requires explicit user-intent or existing owned-write semantics

- save/add to research;
- follow/unfollow;
- save/branch a Journey;
- change persistent preferences;
- submit material to Research Intake;
- create/edit content.

Raziel may make the action easy, but must not turn a suggestion into a persistent user choice silently.

### Never autonomous on its own authority

- approve/canonicalize/publish governed research truth;
- broaden publication/access;
- spend/transfer arbitrary credits outside the canonical pricing/action policy;
- expose another user’s private material;
- fabricate unsupported engine/method/corpus compatibility.

If AI is unavailable/quota-exhausted, Search, direct navigation, deterministic tools, save/return and core content reading remain usable.

---

## 3. Execution-state vocabulary — presentation contract, not DB lifecycle

Long-running or failure-prone operations expose an honest UI state mapped from their native engine/job state:

- `PREFLIGHT` — validating identity/access/input/cost prerequisites;
- `QUEUED` — accepted but not executing yet;
- `RUNNING` — execution started;
- `PARTIAL` — valid partial output exists but operation is not complete;
- `CONTINUATION_REQUIRED` — model/tool hit an output/continuation boundary;
- `SUCCEEDED` — requested logical operation completed;
- `FAILED_WITH_REASON` — operation did not complete, with safe reason/recovery path;
- `CANCEL_REQUESTED` — user requested cancellation, backend confirmation pending;
- `CANCELLED` — cancellation confirmed / no further result expected;
- `STALE_RESULT` — response belongs to an older input/context and must not replace current task state.

This vocabulary is a Shell/UX mapping only. Do **not** add a universal DB enum or force every domain queue into one table.

### Completion law

`TEXT_RECEIVED != COMPLETE`.

AI/output-limit behavior follows existing `ai_analyze_contract v2`:

- max/output-limit → `CONTINUATION_REQUIRED`, never false success;
- continuation belongs to the same logical interaction/trace;
- basic answer completion should not require the user to press “continue” repeatedly;
- if completion is impossible, return `FAILED_WITH_REASON` or an honest deterministic/fallback answer.

---

## 4. Cost / credit / retry / idempotency contract

### One cost truth, one product-credit layer

- provider/model native cost remains provenance;
- management cost is reproducible in ILS where the existing AI cost owner supports it;
- `Credits` are a product/entitlement mechanism, not the source of cost truth;
- W0 sets **no price per action**.

### Logical-operation rule

A retry, continuation or reconnect of the **same logical operation** must not be treated as a fresh user intent merely because another HTTP/model call occurred.

Implementation requirements for metered or mutating actions:

1. assign/reuse a logical operation/interaction trace or native idempotency identity;
2. on ambiguous timeout, check existing outcome where possible before creating a second mutation/charge;
3. continuations attribute cost to the same parent interaction;
4. user-visible credit debit must be explainable by the logical action, not hidden provider-call count;
5. retries caused by platform/transient failure must not silently double-charge;
6. Follow/save/candidate writes use existing dedupe/idempotency constraints where available;
7. a client may show `retry` only when retry semantics are safe/defined;
8. partial success must state what was saved/charged and what remains.

### Cancellation

Cancellation is best-effort unless the native tool/job guarantees atomic cancellation.

- UI immediately records intent as `CANCEL_REQUESTED`;
- never claim `CANCELLED` until execution owner confirms or guarantees it;
- a late result from a cancelled/stale operation may be retained as provenance where owner requires, but must not silently overwrite current workspace state;
- cancellation does not erase already-incurred provider cost/provenance.

---

## 5. Exact-reopen state map

Live `Research Context v1` currently supports:

| Context field | Current shape | 2027 use |
|---|---|---|
| `subject` | `{id,type,label,href}` | research root/current subject identity |
| `selection` | `entityId, entityType, findingId, sourceRef, locator, versionRef` | exact selected entity/finding/source/locus |
| `lens` | scalar string | current semantic lens/mode |
| `dimensions` | scalar/simple arrays only | bounded filters/method/facet/page offsets where representable |
| `journey` | `id,kind,position,findingId` | current saved/path position |
| `locale` | scalar | language projection |
| `access` | `{tier,scope}` | display/navigation context only — **not authorization proof** |
| `returnTo` | `{href,label,subject}` | exact return target at the supported level |
| `updatedAt` | timestamp | context freshness/provenance aid |

### What v1 does NOT safely carry

Nested arbitrary tool state, arbitrary renderer snapshot blobs, Journey revision IDs or nested return-selection objects are not automatically preserved by `normalizeResearchContext v1`.

Do not stuff them into ad-hoc nested fields and assume exact reopen works.

### Reopen strategy

Use the smallest existing durable/addressable reference:

1. stable entity/source/finding identity;
2. exact locator/version reference;
3. URL/query/hash when it is already the canonical addressable state;
4. existing tool-native snapshot/reference (ELS occurrence/snapshot etc.);
5. Journey/path revision/reference where its existing owner supports it;
6. only if none of these can express a required **durable** state, extend the existing Research Context/Journey adapter/version under its owner — never create a second snapshot store from the Shell.

### Three reopen modes

**A. Same-session return**  
May use session context + URL/native tool state. Must not lose current root/focus when opening My Workspace/Raziel/Inspector.

**B. Reload/shareable deep-link**  
URL/addressed identity + safe parameters must be enough to restore the intended public/authorized state or return an honest changed/unavailable result.

**C. Saved Journey resume**  
Durable path/revision references restore the saved research position. Re-run is not a substitute for exact restore when the original finding/source/version is known.

### Reauthorization on reopen

Every reopen revalidates:

- target still exists/version still valid;
- caller authorization/ownership;
- current capability availability;
- current entitlement;
- publication/access state.

If changed, show `SOURCE_CHANGED_OR_STALE`, `ACCESS_GATED`, `NO_PERMISSION` or `NOT_FOUND` honestly. Never silently substitute another result or unrelated Home.

---

## 6. Semantic telemetry vocabulary

Telemetry follows **semantic actions**, not button IDs or physical placement.

### Core action vocabulary

`search` · `open` · `focus` · `inspect` · `expand` · `filter` · `compare` · `run_tool` · `cancel_tool` · `retry_tool` · `open_world` · `open_heichal` · `open_my_workspace` · `open_personal_attention` · `open_global_now` · `open_account` · `change_language` · `add_to_research` · `save_result` · `save_path` · `resume_path` · `branch_path` · `follow` · `unfollow` · `share` · `create_content` · `publish_content` · `submit_intake` · `propose_candidate` · `review` · `approve` · `reject` · `ask_raziel` · `apply_raziel_navigation` · `apply_raziel_filter` · `run_raziel_authorized_tool` · `return_exact`.

Existing Traffic Intelligence interaction vocabulary (`search`, `cross_search`, `use`, `save`, `journey`, `add`, `open`, etc.) remains backward-compatible. Implementation may initially map new semantic actions into existing event types plus a `semantic_action`/context property rather than inventing a second analytics store.

### Minimum event context where applicable

- semantic action;
- surface/renderer family;
- stable subject type/ref (privacy-safe);
- lens/tool/method identity;
- Journey ref/position when present;
- entry/source (`direct`, Search, Sidebar, Raziel, return, external etc. using existing attribution semantics);
- locale;
- outcome (`success`, `fail`, `cancel`, `stale`, `gated` etc.);
- duration/latency for measured operations;
- operation/interaction trace reference when an existing owner provides one;
- authorized access projection label only when safe — never secrets/private payload content.

### Privacy / truth telemetry rules

- telemetry does not create graph edges/truth;
- popularity/heat/demand never promotes knowledge;
- do not log private source text merely to reconstruct UI context;
- bot/human/unknown classification remains Traffic Intelligence-owned;
- route/page-view telemetry and semantic action telemetry are complementary, not competing truths.

---

## 7. First-surface performance budgets

These are **future acceptance targets**, not claims about current production.

### Public Reader / Focused baseline

For the first W1/W2 public surface on a representative mid-tier mobile profile:

- p75 target `LCP <= 2.5s`;
- p75 target `INP <= 200ms`;
- target `CLS <= 0.1`;
- immediate local UI acknowledgement of a user action should appear within ~100ms even when network/tool completion is longer;
- no heavy graph/3D/AI bundle is required for initial rendering of a direct Post/Book/Number/SEO reading surface unless it is the primary requested task.

### Data/query budgets

- every World/Explorer/Inspector reader is server-bounded;
- no “fetch entire graph then hide” behavior;
- pagination/windowing/virtualization required for large result sets;
- `empty` must be distinguishable from `truncated / more available / unavailable`;
- stale responses must not overwrite newer query/context state;
- expensive spatial/3D renderers load on demand and have non-spatial/list alternatives.

### Long-running interaction budget

If an operation cannot finish quickly:

- show execution state/progress/unknown-progress honestly;
- keep cancellation/escape available where safe;
- do not block manual navigation/Raziel collapse/return unless the tool owns an intentional focused transaction;
- preserve unsaved-work warning when leaving would lose real user state.

### Memory/lifecycle acceptance

W1/W2 testing must include repeated route/context open-close cycles on mobile/desktop and verify no unbounded retained renderer/worker/listener growth. W0 does not invent a numeric memory ceiling without a measured baseline; W1 establishes the baseline and regression threshold.

### Protected/Premium release budget

Before W5/W8 protected data release:

- server authorization negative tests;
- cache/account-switch isolation;
- revocation/entitlement-change behavior;
- rate/cost limits appropriate to the exposed tool/data;
- no client-side “hide only” security.

---

## 8. W0 vs implementation acceptance

### Closed now at specification level

- action classes and Raziel boundaries;
- execution/failure/cancel/retry semantics;
- cost/credit/idempotency principles;
- exact-reopen state/reference map;
- semantic telemetry vocabulary;
- first-surface performance targets.

### Must be proven later in code

- real cancellation behavior per tool;
- idempotent charge/write paths;
- AI continuation trace/cost wiring;
- full exact-reopen round trips;
- telemetry emission/read-model parity;
- measured W1/W2 performance;
- protected W5/W8 negative access tests.

No executable PASS is claimed by this document.

## 9. W0 closure verdict for this matrix

**ACTION/COST/RETRY:** CLOSED AT SPECIFICATION LEVEL.  
**EXACT-REOPEN MAP:** CLOSED AT SPECIFICATION LEVEL.  
**SEMANTIC TELEMETRY:** CLOSED AT SPECIFICATION LEVEL.  
**PERFORMANCE BUDGETS:** CLOSED AT SPECIFICATION LEVEL.
