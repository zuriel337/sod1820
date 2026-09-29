# SOD1820 — G3 BOTTOM-UP 2029 TREE INFRASTRUCTURE GAP SCAN v1

**Date:** 2026-09-22
**Actor:** CLAUDE
**Mode:** READ_ONLY evidence scan. No code, schema, content or release write.
**Status:** EVIDENCE / AUDIT ONLY — not an owner, not documented state, not a release gate result.

## Scope and routing

Request: bottom-up scan of the 2029 tree for infrastructure gaps.

Routing resolved live:
- `SOD1820_MASTER_OWNER_INDEX.md` (G2 frozen active tree, G3 entry);
- `SOD1820_MASTER_ROADMAP.md` v6.4 — G2 CLOSED / G3 OPEN;
- navigation target for bottom-up execution: `docs/2029-implementation-dependency-plan-v1.md` (PHASE 0 → PHASE 18).

Layers are scanned in the plan's own dependency order, not in product order.

## Verification base

- `origin/main` = `f50878874140c081f22ef4b49c7b602e54e5b9ad`; working tree clean; local HEAD identical (0 ahead / 0 behind).
- Canonical Supabase `linswmnnkjxvweumprav` queried live.
- Production HTTP-verified on `https://sod1820.co.il` (browser UA; the edge quarantine returns 403 to unidentified agents, which is expected policy behavior, not an outage).
- `npm run build` (both targets) PASS.
- All ten `scripts/test-2029-*.mjs` / `test-experience-context` / `test-operational-trace` gate scripts PASS.

Release language is preserved throughout: DOCUMENTED ≠ IMPLEMENTED ≠ COMMITTED ≠ MERGED ≠ DEPLOYED ≠ LIVE ≠ VERIFIED.

---

## What is genuinely standing at the bottom

Recorded so the gap list is not read as a verdict on the whole tree.

| Layer | Live evidence |
|---|---|
| PHASE 0 legacy separation | Two independent module graphs (`vite.config.js` `SOD_BUILD_TARGET`); `2029.html` + `main2029.jsx` + `App2029.jsx`; `scripts/test-2029-isolation.mjs` PASS |
| 2029 runtime actually served | `vercel.json` rewrites `/2029`, `/world`, `/topic/*`, `/books`, `/book/*`, `/els`, `/heichal`, `/היכל`, `/researcher/*`, `/2029/number/*` → `/2029.html`; production returns the 2029 document on every one |
| PHASE 3 agent dispatch | `work_log` carries the dispatch runtime natively (`dispatch_kind/state/attempts/next_attempt_at/lease_owner/lease_expires_at/last_error/completed_at`), 349 live dispatch rows — EXTEND_EXISTING honored, no second queue owner |
| PHASE 5A Gematria | Server authority real: `canonicalGematria.js` calls `supabase.rpc("gematria_api")`; no client calculator authority in the 2029 graph |
| PHASE 2 kill switches | `site_flags` live (14 rows) and consumed by 2029 surfaces via `useFeatureState` |
| Capability availability state | `/els` correctly renders the canonical closed/building state instead of inheriting the legacy work area |
| Security posture | RLS enabled on all 156 public tables; sampled `admin_*` SECURITY DEFINER functions carry internal `auth.uid()` role checks **and** pinned `search_path` |

---

## GAPS — bottom-up

### G-1 · PHASE 2 · No Black Box trace/span persistence does not exist — declared G3 blocker, open

**Severity: BLOCKER (already declared as such by the Roadmap).**

- `src/lib/operationalTraceContract.js` (248 lines) defines span kinds, outcomes, cost certainty, output-use and resource vocabulary.
- It is imported by **exactly one file**: its own test script `scripts/test-operational-trace-contract.mjs`. Zero runtime call sites in `src/`, `api/` or `supabase/functions/`.
- Live DB: **zero** trace/span/telemetry objects exist in any schema (`relname ~* 'trace|span|telemetry|observab'` → NONE).
- What does exist is the cost lane only: `ai_token_log` (3,531 rows), `ai_usage`, `ai_router_usage`, `agent_token_costs`, `api_pricing`, `vercel_usage_estimate`.

Consequence: the Roadmap's own stated blocker — "Foundation Runtime is not considered closed if an admin cost/usage aggregate cannot drill down to the underlying root trace and individual span(s), including a three-engine workflow, without double-counting cost" — cannot be satisfied today. There is a cost aggregate and no tree beneath it to drill into. The three-engine Golden requirement and the Phase 2 exit gate are both unreachable until root-trace/span persistence extends the existing cost owners.

State: contract DOCUMENTED, runtime NOT IMPLEMENTED.

### G-2 · PHASE 2 · Experience Context / capability projection seam is not the seam

**Severity: HIGH — foundational rail, not surface polish.**

- `resolveExperienceContext()` is consumed by **one** surface: `src/pages/World2029Page.jsx`.
- `src/lib/experienceCapabilities.js` (`composeCapabilityProjection`, `EXPERIENCE_CAPABILITY`, `USAGE_RESOURCE`) is consumed by **no** surface at all — only by `scripts/test-experience-context-2029.mjs` and `scripts/test-2029-world-surface.mjs`.
- Topic, Books, ELS, Heichal, Researcher, Number and the System Frame itself do not resolve capability through it.

Consequence: the plan's §1.3 "One access tree" (availability → authorization → entitlement → budget → routing) is declared and tested but is not the path any 2029 surface actually takes. Surfaces currently resolve availability ad hoc via `useFeatureState`. Every surface added before this seam is adopted widens the reconciliation cost.

### G-3 · PHASE 2/7F · No server-authoritative entitlement or budget gate exists

**Severity: HIGH — ordering dependency for every premium/expensive capability.**

- No entitlement/budget objects in the live DB (`%entitle%`, `%budget%` → none). Credits exist (`credit_ledger`, `credit_packages`, `unified_credit_system` owner) but that is currency, not the pre-I/O gate.
- `private.edge_rate_limit_buckets` exists — edge rate limiting is real, which covers part of 7F but not the per-capability/user/session/background budget the plan requires before expensive I/O.

Consequence: Phase 2's "no expensive capability can execute before server gate" is not enforceable. This is currently masked because the 2029 tree performs no expensive I/O (see G-6) — it becomes live risk the moment Raziel or ELS runtime lands.

### G-4 · PHASE 6 · Research Plan / Context Compiler persistence is schema-only

**Severity: HIGH.**

Live row counts: `research_plans` = **0**, `research_paths` = **0**.
Against `research_objects` = 1,171, `research_object_revisions` populated, `user_research` = 110, `els_records` = 135.

Consequence: research *objects* persist; the bounded **Research Plan** (capability, strategy, anchors, check order, budget, escalation, stop condition) and the resumable **path** do not exist as live state. Phase 6's exit gate — "switch surface/channel/model without losing the active research subject, evidence lineage or authorized state" — has no persistence layer under it. Everything above it (Research Room, Dossier, Pulse, cross-channel continuity) inherits this gap.

### G-5 · PHASE 7D · Server-rendered identity is absent for the entire 2029 tree — SEO/AI discovery claim is DOM-only

**Severity: HIGH — and it contradicts a current Roadmap status line.**

Verified live, three crawler UAs (Googlebot, GPTBot, ClaudeBot) against `https://sod1820.co.il/topic/1820`:

```
<title>SOD1820 · 2029</title>
```

No per-topic title, no canonical, no description, no JSON-LD in the served HTML. All of it is produced client-side by `applySeo` / `setConvergenceJsonLd` after hydration. The `vercel.json` prerender branch (`/api/og`) matches **share preview bots only** (`facebookexternalhit|Twitterbot|WhatsApp|…`) — Googlebot and the AI crawlers are not in that list and receive the bare shell.

The Roadmap currently records: *"FOUNDATION LIVE: canonical/meta/sitemap/OG/WebPage+Breadcrumb structured-data/internal-link parity is in native Topic 2029."* That is accurate for the hydrated DOM and **not** accurate for the served document. Reported as DRIFT between documented state and live behavior; resolution belongs to the SEO/publishing owner, not to this audit.

This affects every 2029-rewritten route, not only `/topic/:slug`.

### G-6 · PHASE 9/10 · ELS Golden and Raziel runtime are 0% in the new tree

**Severity: MEDIUM — correctly declared as BUILDING, but it is the plan's own #1 Golden dependency.**

- `src/pages/Els2029Page.jsx` is 69 lines: a capability-state page plus an architecture statement. It makes no engine call. No ELS search/replay/coordinate surface exists in the 2029 tree. No callable ELS edge function exists (`supabase/functions/` has none).
- Raziel in the 2029 frame is deterministic composed text. `grep` for `functions.invoke|ai-analyze|raziel-|fetch(` across `src/components/experience2029/`, `src/pages/*2029*.jsx` and `src/components/number2029/` returns **zero** call sites.

This is legitimate `BUILDING` state under `platform_tiers_law` / `site_flags_lock_law` — recorded here because Phase 9 is declared the early Golden dependency that Phases 10–17 consume, and it currently sits below fully-built Phase 8 surfaces.

### G-7 · PHASE 8 · Three declared core homes have no 2029 surface

**Severity: MEDIUM.**

Present in the 2029 runtime: Home, World, Topic, Books/Book, ELS (placeholder), Heichal, Researcher, Number.
Declared in Phase 8 and **absent**: **Journey**, **Posts / Updates**, **Workspace / Personal Area**, **Internal Control Plane / Admin**.

All four fall through `LegacyDocumentHandoff` to the legacy runtime. Phase 8's exit gate — "no Legacy fallback required for core 2029 interaction" — is therefore not met. The Control Plane gap also keeps Phase 7G unstarted, which is what would have surfaced G-1 operationally.

Also in this layer: **Follow/Attention is explicitly disabled** in the frame (`disabled title="Follow runtime נשאר ב־PR #486 עד release gate"`), so the 7C rail is stubbed at the UI boundary by design pending that PR.

### G-8 · Active-tree hygiene · stale adapter with 15 permanently-failing tests

**Severity: MEDIUM — exactly the class the end-of-G3 compaction gate exists to retire.**

`node --test` over `src/**/*.test.js`: **452 tests, 434 pass, 18 fail.**

- **15 failures** in `src/lib/roadmapParser.test.js`. The parser and its tests are pinned to **Roadmap v5.3** (`assert.equal(vm.meta.version_label, "v5.3")`, 24 `WS-*` cards, 21 gates) while the live roadmap is **v6.4 compact**. `roadmapParser.js` is imported by nothing in the application — it is dead code that fails permanently against the current canonical roadmap.
- **1 failure** in `src/lib/research/explorerAccess.test.js`: imports `vitest`, which is not in `package.json`. Test-runner drift — the repo runs `node:test`.
- **2 failures** in `src/lib/research/explorerFacets.test.js` (`normalizePageResult` pass-through and null-input cases). These are in a live Research OS module and should be triaged as real, not as tree noise.

### G-9 · PHASE 0 · Duplicate, unreachable 2029 route declarations inside the legacy runtime

**Severity: LOW-MEDIUM — One Tree drift risk.**

`src/App.jsx:286-294` still declares `/2029`, `/world`, `/els`, `/heichal`, `/היכל` and the Book handoffs against `Home2029Page`, `World2029Page`, `Els2029Page`, `Heichal2029Page`. Because `vercel.json` rewrites all of those paths to `/2029.html` before the SPA fallback, **these routes are unreachable in production** — the legacy runtime imports and chunks 2029 surfaces that it can never render.

Two declarations of the same route identity in two runtimes is the drift the isolation gate was built to prevent, and the isolation test does not currently assert their absence. Note `/topic/:slug` is the sharpest case: `App.jsx:397` maps it to the **legacy** `TopicPage` while production serves `Topic2029Page`.

### G-10 · PHASE 7F · Least privilege is not verified, as the plan requires

**Severity: LOW as measured — record, do not alarm.**

Live advisor state on canonical Supabase:

| Lint | Level | Count |
|---|---|---|
| `anon_security_definer_function_executable` | WARN | 273 |
| `authenticated_security_definer_function_executable` | WARN | 401 |
| `function_search_path_mutable` | WARN | 140 |
| `rls_enabled_no_policy` | INFO | 156 |
| `security_definer_view` | **ERROR** | 3 |
| `extension_in_public` | WARN | 3 |

Verified before interpreting, so the record stays accurate:

- 71 `admin_*` functions carry an `anon` EXECUTE grant, but the sampled bodies (`admin_add_word`, `admin_save_post`, `admin_worklog_delete`, `rd_is_admin`) **all** enforce `auth.uid()` + `role='admin'` internally and **all** pin `SET search_path TO 'public'`. These are not open doors.
- The dangerous intersection was measured directly: SECURITY DEFINER **and** mutable `search_path` **and** anon-executable = **0**. The 140 search_path warnings do not sit on the anon-reachable definer surface.
- `rls_enabled_no_policy` on 156 tables is fail-closed for `anon`/`authenticated`; most are `_audit_*`/`_backup_*` artifacts.
- The 3 SECURITY DEFINER views (`redirect_map`, `topic_cards_public`, `agent_research_stats`) **are** granted SELECT to `anon` and `authenticated`. Two are intentionally public. `agent_research_stats` (`agent, metric_key, label, value, detail, sort`) exposes internal agent metrics to anonymous readers — low sensitivity, but it is an unreviewed public read surface.

The finding is not "the database is exposed." It is that Phase 7F's required "RLS and least privilege verified in isolated acceptance" has not been run, so the above is unreviewed surface rather than accepted surface.

### G-11 · Environment · Node engine drift

**Severity: LOW.**

`package.json` requires `node >=24.9.0 <25`, `.nvmrc` pins `24.21.0`; this session's runtime is `v22.22.2` (`EBADENGINE` on install). Build and all gate scripts still pass, so this is a reproducibility note for agent/CI environments, not a product defect.

---

## Bottom-up remediation order

Dependency order, not severity order. Each item unblocks the ones below it.

1. **G-1** root trace + span persistence extending `ai_token_log`/`agent_token_costs` — the declared G3 blocker, and the prerequisite for the Control Plane in G-7.
2. **G-3** server-authoritative availability + entitlement + budget gate — must exist before ELS/Raziel runtime, not after.
3. **G-2** route all 2029 surfaces through the Experience Context / capability projection seam — cost grows with every surface added first.
4. **G-4** Research Plan / path persistence — everything in Phases 14–17 consumes it.
5. **G-5** server-rendered identity for the 2029 document, and correct the Roadmap's Topic SEO status line to match live behavior.
6. **G-9 / G-8** remove the unreachable duplicate 2029 routes from `App.jsx` and retire `roadmapParser`; triage the two `explorerFacets` failures as real. Cheap, and they are the compaction gate's own acceptance items.
7. **G-7** Journey / Posts / Workspace / Control Plane surfaces, over the rails above.
8. **G-6** ELS Golden then Raziel text+tools, in the plan's declared order.
9. **G-10** run the isolated least-privilege acceptance and review the `agent_research_stats` public grant.

## Boundaries of this scan

- READ_ONLY. Nothing in the live DB, `origin/main` or production was modified.
- This document is audit evidence under §15 active-tree discipline. It is not an owner, does not carry domain semantics, and creates no new MASTER/FINAL/map artifact.
- Owner reconciliation is required before any of the above becomes a decision: a specialist report is evidence, not truth.
- G-5 is reported as DRIFT between `SOD1820_MASTER_ROADMAP.md` and live crawler-served behavior; resolution belongs to the SEO/publishing owner under Human Gate.
- Concurrency: `work_log_current` shows one open READ_ONLY assignment to CLAUDE today (`G3_EXPRESSION_FOCUS_ONE_TREE_V1_CLAUDE_CHALLENGE`, PR #604). Different scope, READ_ONLY on both sides — no one-writer conflict.
