# G3 2029 CUTOVER ACCEPTANCE CHECKLIST

Use this same checklist for every public surface family.

- [ ] Canonical identity preserved
- [ ] Canonical URL preserved or deliberate redirect approved
- [ ] Existing inbound aliases/deep links accounted for
- [ ] SEO title/description/canonical preserved through existing owner
- [ ] Index/noindex decision preserved
- [ ] JSON-LD/structured data preserved where applicable
- [ ] Sitemap behavior preserved
- [ ] OG/share uses existing owner and canonical URL
- [ ] Telemetry semantic identity preserved
- [ ] Research Context + exact return preserved
- [ ] History/save/pin/follow semantics preserved where applicable
- [ ] Auth/access/site-state unchanged or explicitly superseded
- [ ] Canonical DB/engine/source readers reused
- [ ] No local duplicate truth/registry/context/store
- [ ] Mobile + accessibility parity
- [ ] Loading/empty/error/access/moved terminal states honest
- [ ] Every unique legacy capability classified
- [ ] 2029 isolation passes; no accidental legacy chrome/presentation load
- [ ] Build/SEO gate passes on exact head
- [ ] Visual/mobile gate passes on exact head
- [ ] Domain-specific regression gate passes
- [ ] Public Shell acceptance passes for the shell this family renders in (§1)
- [ ] Rollback contract recorded and preserved for this family (§2)
- [ ] Family is cut over as one isolated stage, after the previous family's checkpoint (§3)
- [ ] Automated Legacy↔2029 parity scan PASS for this family (§4)
- [ ] Human Gate authorizes route cutover

---

## Cutover gate extensions — 2026-10-04

**Scope:** these sections extend the existing Cutover gate. They are **not** a new architectural stage, gate number or Golden, and they do **not** change the Golden order in `SOD1820_MASTER_ROADMAP.md` (Posts Index + Post → Cross-Surface Skeleton → Public Cutover → World → Home).
**Owner:** EXTEND_EXISTING `experience_governance_foundation_v1_law`, via `docs/g3-2029-global-cutover-foundation-v1.md` §12–§13.
**Not changed here:** runtime, routing, DB, release authority (`deploy_on_request` v3), Human-Gate requirements.

Every family cutover keeps a **family cutover record** (work_log entry, plus an audit file if large) that names the routes in the family, the evidence for each row above, the rollback baseline (§2.3) and the parity-scan report (§4).

### 1. Public Shell acceptance

The public shell is the frame every 2029 route family renders in. Before the first family that makes 2029 the default public face, and again for each later family on the routes it adds, the following must PASS on the exact head. Where the Cross-Surface Skeleton Golden already produced the evidence on the same head, it is reused, not repeated.

**Navigation**
- [ ] Global header/navigation renders from shared 2029 primitives (`canonical_ui_components_law`), with no legacy chrome.
- [ ] Every visible destination projects an honest availability state, **OPEN / BUILDING / LATER / GATED**, through the existing capability/site-flag owners. No visible link resolves into a fake working route.
- [ ] RTL alignment follows `SOD1820_DESIGN_CONTRACT_V1.md`. Sticky header acts as the content origin.
- [ ] Back/forward and exact return work across the family's core path.

**Search**
- [ ] The shell's search/universal entry works from every family page.
- [ ] Results resolve to canonical URLs, not preview or legacy-only addresses.
- [ ] Empty, no-result and error states are honest and recoverable.

**Auth states**
- [ ] Anonymous, registered and admin states render correctly. Session expiry is handled without a dead state.
- [ ] Gated/private content is enforced by server-side authorization. Client hiding is not authorization.
- [ ] Sign-in/out returns to the exact prior context. No personal data is placed in URLs.
- [ ] Internal/admin surfaces (for example `/2029/control`) are not reachable from public navigation.

**404 / error states**
- [ ] Unknown in-family addresses reach an honest terminal (not-found / moved / access), never a silent `* → /`.
- [ ] HTTP status semantics (404/301/200) for the family's routes are resolved. This is currently an **open Roadmap decision**. A family cannot pass this row while its routes depend on it.
- [ ] Runtime errors are caught by an error boundary with a recoverable state. Crawler documents never receive a broken shell.

**Mobile / responsive**
- [ ] `mobile_acceptance_law` passes for the family's core path, including narrow phone width with no horizontal page scroll.
- [ ] Contextual Inspector projects as a bottom sheet on constrained layouts, per the existing Human-Gate decision.
- [ ] Reduced-motion and low-power fallbacks are present where the family uses motion or canvas/spatial rendering.

### 2. Rollback contract

#### 2.1 Triggers

Any **one** of the following triggers rollback of the affected family:

1. **Access/privacy regression.** Private or gated content is exposed, or an authorization boundary is weakened. This trigger is immediate and needs no observation window.
2. **SEO contract regression.** A post-cutover parity scan (§4) reports a REGRESSION on in-scope URLs: status, canonical, robots, title/meta or JSON-LD.
3. **Error-rate regression.** 404/5xx or client-error rate for the family rises above its recorded pre-cutover baseline by more than the threshold written into the family cutover record before cutover.
4. **Crawler document breakage.** The server/crawler document for the family is broken or missing.
5. **Core-path breakage.** Research Context / exact return breaks on the family's core path.
6. **Canary failure.** `sod1820/post-deploy-canary` fails on the cutover SHA, attributable to the family.
7. **Human Gate.** ZURIEL decides to roll back.

#### 2.2 Canonical rollback action

- **Cutover unit (future family cutovers):** one family = one dedicated commit/PR. It contains only that family's routing change: its `vercel.json` rewrite entries pointing to `2029.html`, plus any family-specific redirects. Unrelated runtime, DB or other-family changes are never bundled into it.
- **Canonical rollback:** revert that commit through the normal release path (PR → `main` → deploy, then canary). This returns the family to the Legacy document. Other families are untouched.
- **Families already wired to 2029 before this contract** do not have this guarantee. Their rollback target is defined per family under §3.1, not assumed from history.
- **Emergency only:** a Vercel instant rollback to the previous READY deployment may be used when harm is ongoing, for trigger 1 or a site-wide outage, and the revert path is too slow. It also reverts every later change. It must therefore be followed by the canonical revert commit and a reconciliation of `main` ↔ Production, recorded in work_log.
- **Release authority** for a rollback resolves from `deploy_on_request` v3 like any release. This document grants none.
- **Scope:** rollback is renderer-only. Legacy and 2029 share the same canonical engines, sources, writers and data, so no data rollback is implied.

#### 2.3 What must be preserved for a safe return

These hold until the family's legacy renderer is retired under the capability parity model (`docs/g3-2029-global-cutover-foundation-v1.md` §10) and the Human Gate closes the rollback window:

- [ ] **Legacy renderer buildable.** Its route registrations in `src/App.jsx` and page components are not deleted, and it still builds on current `main`.
- [ ] **Legacy SEO intact.** `ROUTE_META` / `applySeo()` coverage, JSON-LD and sitemap rules for the family remain.
- [ ] **No breaking data change in the cutover commit.** Schema/data changes stay out of the cutover commit and remain backward-compatible, so Legacy can still read them.
- [ ] **URLs servable after revert.** No new canonical URL is introduced that Legacy cannot serve or cleanly redirect after a revert.
- [ ] **Reversible redirects.** Redirects added by the cutover are listed in the family record.
- [ ] **Stable telemetry identity.** Semantic page/action identity is unchanged, so dashboards survive both cutover and rollback.
- [ ] **Recorded baseline.** Before cutover, the record holds the parity-scan report, error/404 rates, crawler-document snapshot and canary result for the family.

### 3. Staged cutover by route family

This makes `docs/g3-2029-global-cutover-foundation-v1.md` §13 step 5, "cut over routes one surface family at a time", operational.

**Route family.** A route family is the set of routes that project one canonical identity type through one owner. Examples: Post, Topic, Book/Source, World, Number, Home, ELS, Heichal. Classes follow `docs/w0-2027-route-seo-addressability-matrix-v1.md` (A / POST-A / B / C / D / L / T). Root post URLs `/:slug` (POST-A) stay immutable by default.

**One family per stage.**
- [ ] Each stage changes one family only, as one cutover unit (§2.2).

**Checkpoint between families.** All of these must hold before the next family starts:
- [ ] Parity scan PASS against the deployed SHA (§4).
- [ ] Canary SUCCESS on that SHA.
- [ ] The observation window named in the family record has elapsed, with no open rollback trigger (§2.1).
- [ ] The family record is updated, and the Human Gate acknowledges it.

**Stopping is a valid state.**
- Cutover may pause after any checkpoint for as long as needed.
- In a paused state each family is entirely on **one** renderer, Legacy or 2029. A single family is never split across both. The one exception is an explicit noindex preview route.
- Pausing or rolling back changes only which renderer serves a family. Semantic, data, SEO and telemetry ownership stays with the existing owners in either state. No family is "half owned".

**Order.** Family order follows the Roadmap's minimum public slice and Golden sequence. This section does not reorder it.

#### 3.1 Wired ≠ Accepted ≠ Cutover-complete

These are three distinct states. One never implies the next.

- **Wired:** the family's routes are served by `2029.html` (a `vercel.json` rewrite exists).
- **Accepted:** every applicable row of this checklist is PASS for the family, with evidence in its family cutover record.
- **Cutover-complete:** Accepted, plus the Human Gate has authorized the family as the public face, the post-cutover checkpoint (§3) passed, and the rollback window is formally open or closed under §2.3.

A route being served from 2029 is **not** evidence that it passed Cutover acceptance.

**Future family cutovers** follow §2.2 and §3: one route family per isolated commit, and rollback = revert of that commit.

**Families already wired today.** As of base `3dc2ff04`, `vercel.json` routes `/post/*`, `/topic/*`, `/world`, `/books`, `/book/*`, `/els`, `/heichal`, `/video/*` and the `/2029/*` preview routes to `2029.html`. Home `/` and root post `/:slug` remain on Legacy. These families are **Wired, not Accepted**. Before any of them is marked Accepted:
- [ ] Run the parity scan (§4), the canary, and the other applicable gates of this checklist against the current deployed SHA.
- [ ] Record a baseline for the family (§2.3) in its family cutover record.
- [ ] Define a concrete rollback target for the family: the exact `vercel.json` entries to remove or restore, and the Legacy renderer and routes that must still build and serve. Verify that target on current `main`.
- [ ] Do **not** assume a clean historical commit exists that can simply be reverted. These families were wired over several commits, often mixed with other changes. Their rollback is a new, dedicated forward commit that restores the recorded target.

This section describes state and requirements only. It changes no routing.

### 4. Automated Legacy↔2029 parity scan (gate)

**Rule.** A family cutover requires an automated, URL-by-URL parity scan with **0 REGRESSION**. It runs before the cutover (Legacy production vs a 2029 preview deployment of the same SHA) and again at the post-cutover checkpoint (deployed vs recorded baseline). Manual spot checks do not satisfy this row. A substitute requires an explicit Human-Gate waiver written into the family record.

**URL inventory, per family.** The scan covers the union of:
- sitemap URLs;
- route-matrix entries;
- top inbound URLs from existing GSC data (`gsc_metrics`);
- `vercel.json` redirects and known aliases;
- a sample of invalid/retired addresses, to check terminal behavior.

**Compared per URL.** Each check runs on both the browser document and the server/crawler document (existing `/api/og` crawler path):
- HTTP status, redirect target and hop count (a chain longer than one hop is a REGRESSION), and final URL;
- `<link rel="canonical">`;
- `<title>` and meta description;
- robots meta and `X-Robots-Tag`;
- JSON-LD `@type` and key fields;
- OG/Twitter tags and canonical share URL;
- `lang` / `dir`;
- sitemap membership;
- the family's existing domain-specific indexability decision (for example Number `is_number_indexable`).

**Classification.** Each difference is classified as **MATCH**, **APPROVED_CHANGE** (listed in the family record with Human-Gate approval) or **REGRESSION**.

**Existing pieces, reused rather than replaced:**
- `scripts/check-observability-seo-gate.mjs`: build-time SEO coverage, via `ROUTE_META` / `applySeo`.
- `scripts/test-2029-server-seo-ai-parity.mjs`: fixture-based server-document SEO assertions for selected paths, with mocked fetch.
- `scripts/test-route-legitimacy-2029.mjs`: route-registration consistency.
- `scripts/post-deploy-canary.mjs`: post-deploy health.

**Still missing for implementation** (not built in this change):
1. A URL inventory builder for a family, from the sources above.
2. A dual-render fetch. This includes a way to obtain the Legacy document for families already wired to `2029.html`, for example a preview deployment of the pre-wiring SHA.
3. A document normalizer and per-URL diff with the field list above.
4. An APPROVED_CHANGE list format inside the family record.
5. CI wiring: a manual or dispatch workflow against preview/production, not on every PR.
6. A report location, an `audits/` file plus a work_log pointer.

None of these may create a new SEO registry or route owner. They read the existing owners.

---

## Follow-up note (not part of this gate)

**Zvi standing-approval identity binding.** `fn_zvi_standing_approve_research_object` is the standing approval under `writer_material_home_law` v5, owned by Research Intake. It identifies WhatsApp/channel-sourced material by matching the credit text `channel_updates.credit = 'צבי (OPOC)'`. The `research_contributions` path already uses stable contributor/user IDs. The desired direction is to bind the channel path to a stable writer/source ID as well, not credit text.

Impact is bounded: the trigger only sets `approved`, never `canonical` or published. **Not changed here.** Tracked as non-blocking debt in `SOD1820_MASTER_STATE.md` §8.
