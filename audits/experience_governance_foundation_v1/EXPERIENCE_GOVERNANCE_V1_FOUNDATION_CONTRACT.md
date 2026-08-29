# SOD1820 — EXPERIENCE GOVERNANCE v1 · FOUNDATION CONTRACT
### Canonical Ownership + Experience Law Lifecycle + Locale/Identity/Design Crosswalk · actor=CLAUDE · 2026-08-29 · **revised (pass 2) after GPT cross-verification**

**STATUS: FOUNDATION CONTRACT DRAFT — awaiting ZURIEL Human-Gate.** This document is the output of a Closure Pass (see `foundation_closure_protocol_v1` in `project_codex`). It is a **synthesis + recommendation**, not a ratified decision. No `nodes`/`project_codex`/Master State row is created or modified by this pass except where explicitly marked `LIVE (this pass)` below. Full report also written to `work_log` (actor=CLAUDE) for GPT cross-verification per the handoff protocol; ZURIEL decides via that channel, not by this file existing.

**Revision note (pass 2, this commit):** GPT cross-verified pass 1 (`work_log` id `86daaade`, status `CHANGES_REQUESTED`) and raised 7 challenges, all accepted and applied here: (1) verdict corrected to **FOUNDATION NOT SUFFICIENT** — pass 1 wrongly declared SUFFICIENT while §16 still listed unresolved MUST-NOW items, which the Foundation Expansion Gate law does not allow; (2) the Decision ownership row corrected — `work_log` is provenance/coordination only, never the canonical owner of a decision's content, per `work_log_authority_law`; (3) the Long-form Contract row corrected — a branch-only file is PROPOSED, not canonical, until merged to main and/or registered in `project_codex` (matches the actual `research_dna_v1_foundation_contract` precedent, which only became canonical at its PR #166 merge); (4) §5's `applies_to` taxonomy split into three separate axes (Single Meaning Law); (5) §9 reframed from "different systems" to one localization governance with distinct domains, per ONE SYSTEM LAW; (6) §12's 16px/44px proposal downgraded from MUST-NOW to a Human-Gate candidate, not presumed to belong inside `mobile_acceptance_law` specifically; (7) §13's authority-hierarchy wording restored explicitly. §6/§14 also softened to mark `decision_ledger` reuse for Experience Law as PROPOSED, not yet a live fact for this domain. Since this document is still a pre-Human-Gate DRAFT under active review (not yet `APPROVED`), corrections are applied in place rather than via in-body "§N correction" markers — no prior content is claimed as ratified history to preserve.

**Scope:** governance/ownership contract only. **0 schema/migration/table/column changes.** 0 UI build (no Experience Center). 0 new Rule/Identity/Translation/Design engine. Does not activate any Human-Gate decision on ZURIEL's behalf.

**Author role:** CLAUDE = Builder/Deep Auditor, executing a handoff drafted by GPT (Research/Strategy) at ZURIEL's request. ZURIEL = Human Gate.

---

## 0. LIVE_SYNC_TOKEN

```
timestamp         = 2026-08-29
origin_main_sha    = fc10eb5cf5c1d4990e4e7212fa1408bff73ba35e  (fetched live; branch = origin/main, 0 ahead/0 behind, clean tree)
branch             = claude/experience-governance-foundation-v1-1ki2s6
supabase_project   = linswmnnkjxvweumprav  (verified via get_project → ACTIVE_HEALTHY — canonical)
collision_check    = 16 open PRs reviewed live (#226,#222,#218,#215,#213,#206,#202,#201,#194,#188,#186,#169,#168,#164,#160,#97) — none touch Experience Governance / locale / identity-taxonomy / design-tokens / accessibility / mobile_acceptance_law scope. #169/#168 extend a DIFFERENT foundation contract (research-dna) — read as precedent only, not modified.
roadmap_version    = MASTER_ROADMAP v5.3 (ACTIVE_NOW = WS-RESEARCH-STUDIO-FOUNDATION; this pass does not change ACTIVE_NOW)
master_state_ref   = §0 (Governance) — reconciliation note added in §13 below, not a rewrite
schema_verified    = nodes(rule_id,rule_version,is_active,supersedes_version,depends_on,weight,metadata jsonb) · decision_ledger(subject_type,subject_ref,evidence jsonb,human_decision,decided_by,status,rules_snapshot,created_at) · project_codex(slug,title,priority,body) — all read live, 0 columns added
canonicalized      = NONE by this pass (proposal only — see §15 Human Gate Items for what would need ZURIEL approval to go live)
```

**Parallel-Agent note:** no other agent has an `in_progress` work_log entry on Experience Governance / locale / identity / design-token / mobile-acceptance topics as of this pass's BEFORE snapshot (`work_log` id `b26475aa`). No collision found.

---

## 1. PURPOSE

ZURIEL should never again have to remember "put this in the Rule / put this in the Codex / put this in the Master / put this on the Map / update every screen." This contract answers, for any future Experience-layer decision (mobile acceptance, locale, identity display, design tokens, accessibility):

- **Who owns this kind of truth today** (already, live — not a new store)?
- **Who may write it, and does it need Human Gate?**
- **How does a future implementation discover it applies to a given change?**
- **What counts as proof it was honored before release?**
- **How does a v2 supersede a v1 without deleting history?**

This is a **Foundation** pass per `foundation_closure_protocol_v1`: it stress-tests the existing primitives (`nodes`, `project_codex`, `decision_ledger`, `work_log`, Master State, Roadmap, git/main, live DB) against real Experience-domain specimens found in the live codebase, and only proposes new structure where reuse genuinely fails.

## 2. NON-GOALS

This pass does **not**: build an Experience Center UI; create a Design System; build an i18n/UI-translation engine; rename/merge any identity table; mass-refactor CSS to logical properties; fix the `BrandTicker` duplicate-marquee violation found in §10; fix sub-16px form fonts found in §11; activate any new `nodes` rule as `is_active=true`; change `mobile_acceptance_law` (still v1, unchanged, still active); merge or deploy anything.

## 3. CANONICAL OWNERSHIP MATRIX

| Artifact type | What it represents | Canonical owner (LIVE today) | Who may write | Human Gate? | Versioning | Supersession | Consumers | May be projected elsewhere? | Never copy as 2nd truth |
|---|---|---|---|---|---|---|---|---|---|
| **Decision** | A ZURIEL ruling on a specific question | **The Human-Gate outcome itself, represented in the canonical artifact it produces** (a `nodes` rule row, a `project_codex`/`audits` contract body, or a `decision_ledger` row where that pattern is already established for the domain) — **not** `work_log`. Per `work_log_authority_law`, `work_log` is the provenance/coordination record of *that a decision happened, when, why* — it is explicitly never the canonical owner of the decision's *content* (corrected pass 2 — pass 1 wrongly named `work_log` co-owner here) | ZURIEL (via any agent transcribing verbatim) | **Is** the Human Gate | N/A — decisions aren't versioned, their *outputs* are | Superseded by a later, clearer decision (never silently) | GPT/Claude/future agents reading `work_log` for *provenance*, and the canonical artifact for *content* | Referenced by `nodes.metadata`/`project_codex` body, never re-stated as a second decision | The decision's *content* into `work_log` as if `work_log` were the source — `work_log` records that/when/why, the canonical artifact holds what |
| **Rule / Law** (short, enforceable, machine-checkable-ish) | An operational constraint (e.g. `mobile_acceptance_law`, `ticker_marquee_law`) | `nodes` where `type='rule'` | Any agent, but `is_active=true` requires it already reflects a ZURIEL decision (per `agent_onboarding_law` §3) | Yes, before `is_active=true` | `rule_id` + `rule_version` (int), old row `is_active=false`, kept | `supersedes_version` (int column, **already exists** — no new field needed) | Code (via `metadata`/description), other rules (`depends_on` array, **already exists**), CLAUDE.md pointers | Yes — CLAUDE.md/Master State may *reference* rule_id + one-line summary; must not paste the full description | The full rule body — CLAUDE.md already does this correctly (routes to `select description from nodes...`) |
| **Long-form Contract** (multi-section reasoning, crosswalks, worked examples — like this document) | Architecture/governance reasoning too long for a `nodes.description` field | `project_codex` (short/medium, e.g. `research_intake_foundation_contract`, LIVE the moment its slug is INSERTed) **or** `audits/<slug>/*.md` (large, multi-pass, like `research_dna_v1_foundation_contract`) — **but a file on an unmerged branch is PROPOSED, not canonical.** It becomes canonical only once **merged to `main`** and/or registered as a `project_codex` slug (corrected pass 2 — pass 1 wrongly implied branch-existence alone was sufficient; the actual precedent, `research_dna_v1_foundation_contract`, only became canonical at its PR #166 merge, commit `95005d78`, per Master Roadmap) | Any agent may draft; only merge/registration makes it canonical, and that step is Human-Gate (ZURIEL merges) | Yes, before treated as binding | No native version column on `project_codex` — convention is a new `slug` or an in-body "corrected N.N" changelog (see `research_dna_v1_foundation_contract` precedent) | In-body supersession notes ("§4 correction..."), never silent rewrite | `nodes.metadata` may point to a contract; CLAUDE.md may reference it | Yes, as a one-line pointer | The full contract body |
| **Project State** (what's ratified/major, as of when) | "Documented major state, verified against live DB at a point in time" | `SOD1820_MASTER_STATE.md` | Any agent, docs-only commit | No (documents Human-Gate outcomes, doesn't itself gate) | In-file, dated sections, `[REVALIDATED]`/`[CORRECTED]` inline tags per `live_state_sync_law` | Later dated section supersedes earlier (never delete) | Session bootstrap, other agents | N/A — it's already the top of the reference chain for *state* | Full rule/contract bodies (§13 addresses the literal governance-text ambiguity this creates) |
| **Navigation / Roadmap** | Sequencing, dependencies, gates, "what's next" | `SOD1820_MASTER_ROADMAP.md` (`WS-*` anchors) | Any agent, docs-only commit | No | Dated banners, `v5.3` etc. | Same NO-DISAPPEARING-WORK convention | Session bootstrap | A `WS-*` anchor may point at a contract | CSS/UI law bodies (CLAUDE.md already flags this exact anti-pattern) |
| **Implementation** | What the code actually does | `origin/main` (git) + live component/function bodies | Any agent, via PR + merge | Merge = Human Gate (ZURIEL merges) | git history | git history (linear) | Runtime, users | N/A | N/A |
| **Acceptance Evidence** | Proof a Law was honored for a specific change | **PROPOSED reuse of `decision_ledger`** (structurally polymorphic and fits: `subject_type`,`subject_ref`,`evidence` jsonb,`human_decision`,`decided_by`,`status`,`rules_snapshot`) — but **not yet a live fact for this domain**: 0 existing rows carry `subject_type='experience_law'` or anything Experience-adjacent today (corrected pass 2 — pass 1 stated this too assertively as if already established; it is a sound *candidate* pattern requiring its own Human-Gate/contract-level decision before being treated as canonical, same as any other new `subject_type`) | Any agent/CI producing the evidence, once the pattern is ratified; `human_decision` column is Human-Gate-only | The `human_decision`/`decided_by` fields are literally the gate, once ratified | `created_at`/`updated_at`, append rows for re-checks | A new evidence row for a new commit/version; old row stays as history | Release Gate (§7) | `work_log` may narrate an evidence event today (the only live mechanism until ratified) | A second "acceptance" table |
| **Release State** | implemented / merged / deployed / live-verified | git (`merged`) + Vercel deploy state + live bundle-marker check (per `deploy_on_request`) | Merge=ZURIEL; deploy=ZURIEL decides *when* (`deploy_on_request`) | Yes, deploy is explicitly ZURIEL-gated | N/A | N/A | `work_log` AFTER memos must distinguish these 4 states explicitly (already the house convention — this pass follows it, doesn't invent it) | N/A | N/A |
| **Historical Provenance** | What happened, when, by whom, why | `work_log` (BEFORE/AFTER memos, `actor=` tag) | Any agent | No (it's the record, not the gate) | Append-only; `superseded_by_id` for explicit replacement (never inferred from age) | Explicit `superseded_by_id` only | GPT cross-verification, future agents, ZURIEL audit | N/A | Never the source of a Law — `work_log_authority_law` already forbids treating it as canonical law owner |

**Central principle carried through the whole matrix (already the codebase's own convention, not invented here):** *One truth → many consumers/projections.* Every "owner" column above is a table/file that **already exists and is already used this way** for at least one other domain (gematria rules, research-dna, corpus admission, person foundation). Nothing in this matrix requires a new store.

## 4. EXPERIENCE LAW LIFECYCLE

```
PROPOSED → HUMAN-GATE APPROVED → CANONICAL OWNER ASSIGNED → ACTIVE
   → IMPLEMENTATION CONSUMES → ACCEPTANCE VERIFIED → RELEASE ELIGIBLE
   → (future) SUPERSEDED
```

Mapped onto **existing** `nodes` columns — no schema change:

| Lifecycle stage | `nodes` representation |
|---|---|
| PROPOSED | Row exists, `is_active=false` (or not yet inserted — a draft in a contract doc like this one) |
| HUMAN-GATE APPROVED | ZURIEL decision recorded in `work_log`; row inserted/flipped `is_active=true` |
| CANONICAL OWNER ASSIGNED | The row itself, by existing (`rule_id` is the address) |
| ACTIVE | `is_active=true` |
| IMPLEMENTATION CONSUMES | Component/PR references `rule_id` in a comment (already the convention — `HumanDateInput.jsx`, `Marquee.jsx` both cite their governing `rule_id` in-file) |
| ACCEPTANCE VERIFIED | A `decision_ledger` row with `subject_type='experience_law'`, `subject_ref=rule_id`, `evidence` populated (§5) |
| RELEASE ELIGIBLE | Release Gate (§6) checks the above and git/deploy state |
| SUPERSEDED | New `rule_version`, `supersedes_version` set on the new row, old row `is_active=false` — **exact existing pattern**, verified live on `canonical_ui_components_law` (v1→v2) and `post_theme_safe_colors_law` (v1→v2) |

**Hard invariant (unchanged from `agent_onboarding_law`):** an agent may draft a PROPOSED law and even reason about it in a contract doc (as this document does in §9–§11), but only ZURIEL's recorded decision (in `work_log`, cross-verified via GPT per this handoff's own channel) moves a law to HUMAN-GATE APPROVED / `is_active=true`. This pass activates none.

## 5. APPLICABILITY / SCOPE CONTRACT

**Gap confirmed live:** no `nodes` rule with `rule_id` matching `%tier%`/`%surface%`/`%scope%`/`%applicab%`/`%access%` exists today (checked). `mobile_acceptance_law.metadata` currently encodes scope as **free prose** inside `description` ("חל על user-facing components — לא על admin-only/internal-tooling screens..."), not a structured field.

**Recommendation (EXTENSION POINT NOW, not built by this pass) — corrected pass 2 per GPT's Single Meaning challenge:** pass 1 proposed one mixed `metadata.applies_to` array combining surface type, access tier, and lifecycle status in one list — GPT correctly flagged this as conflating independent axes into one field. Corrected shape: **three separate `metadata` keys**, each with one meaning, nested per the codebase's own `meta.ext.<domain>.<key>` precedent (`research_intake_foundation_contract` §1):

```
metadata.surface_scope   = ["public", "authenticated", "admin", "experimental", "legacy", "shared-primitive"]
metadata.access_scope    = ["guest", "registered", "tier2+", "tier3+", "admin"]   -- referencing CLAUDE.md's platform_tiers_law (0–5), not a new taxonomy
metadata.lifecycle_class = "active" | "legacy" | "deprecated"                      -- one value, not an array
```

A rule with none of these set defaults to **all user-facing surfaces, all access levels, active** (current `mobile_acceptance_law` behavior — safe default, no regression). This is a **recommendation**, not activated here — adding these to `mobile_acceptance_law.metadata` requires only an additive `UPDATE ... SET metadata = metadata || '{...}'`, no schema change, but is still a WRITE and needs Human-Gate per `agent_onboarding_law` (it changes enforcement scope, not just documentation).

## 6. ACCEPTANCE EVIDENCE CONTRACT

**Reuse-first finding, corrected pass 2 — status downgraded from "settled" to "proposed":** `decision_ledger` has exactly the columns a scheme like this would need — `subject_type`, `subject_ref`, `evidence` (jsonb), `human_decision`, `decided_by`, `status`, `rules_snapshot` (jsonb) — and is already used polymorphically across `number`/`method`/`contribution`/`law_set`/`recommendation_type` subject types (14 live rows, verified). **No new table would be required if this reuse is ratified.** But GPT's cross-verification correctly flagged that this is a **structural fit, not yet a live fact**: zero existing rows carry `subject_type='experience_law'` or anything Experience-adjacent. Reusing `decision_ledger` for a new domain is itself a decision (does this domain's evidence genuinely belong in the same ledger as gematria-method/contribution decisions, or does it need its own `subject_type` convention?) — proposed below, not declared canonical.

Proposed (not activated) minimal evidence shape, `subject_type='experience_law'`:

```json
{
  "subject_type": "experience_law",
  "subject_ref": "mobile_acceptance_law",
  "rules_snapshot": {"rule_id": "mobile_acceptance_law", "rule_version": 1},
  "evidence": {
    "surface": "HumanDateInput",
    "commit": "940c660a",
    "environment": "preview-url | standalone-reasoning",
    "viewports_px": [320, 360, 390],
    "method": "playwright-headless | standalone-css-reasoning",
    "result": "PASS"
  },
  "human_decision": null,
  "decided_by": null,
  "status": "engine_checked"
}
```

`human_decision`/`decided_by` stay `null` for deterministic/automated checks (mobile viewport pass is exactly this kind — `mobile_acceptance_law` itself already ranks Playwright verification above "read the code, looks fine") and get populated only when a law explicitly requires Human-Gate acceptance (e.g. a locale/RTL principle ratification, §9). This mirrors the Claim/Calculation/Verification separation `research_dna_v1_foundation_contract` §1 already established for gematria claims — **the same discipline, reused for Experience Law, not reinvented.**

**Not built by this pass:** no CI wiring, no automated Playwright-to-`decision_ledger` pipeline. `mobile_acceptance_law` verification today still happens narratively in `work_log` AFTER memos (confirmed: PR #233's `9_OF_9_PASSED` language). This is flagged as EXTENSION POINT NOW — the target shape is now written down so a future pass doesn't have to re-derive it, but wiring it is a separate, smaller build task.

## 7. RELEASE GATE MODEL

```
Change → classify affected surfaces (§5 applicability)
       → resolve applicable Experience Laws (nodes where is_active AND surface_scope/access_scope/lifecycle_class match)
       → determine required acceptance (§6 — deterministic vs Human-Gate)
       → gather evidence (decision_ledger row, or work_log narrative today)
       → PASS / FAIL / N/A
       → release eligibility (git merge state + Vercel deploy per deploy_on_request)
```

Not all laws are automatable: `mobile_acceptance_law` (viewport overflow) is deterministic-checkable; a locale-direction principle (§9) is a judgment call requiring ZURIEL. **Automation where deterministic. Human Gate where judgment is required** — this phrase is not new invention, it is quoted verbatim from the operating principles both this handoff and `foundation_closure_protocol_v1` already state.

## 8. LOCALE / DIRECTION CONTRACT

*(Full crosswalk performed by a dedicated read-only research pass this session — file paths and line numbers below are from that pass, re-verifiable via the same greps.)*

**8.1 Document-level direction (MUST FOUNDATION NOW).** `index.html:2` hardcodes `<html lang="he" dir="rtl">` — the single, sole source of document direction. `theme.js`'s `GLOBAL_CSS` redundantly re-declares `direction: rtl` scoped to `.sod-post-content`. **Contract:** `index.html`'s `<html dir>` is the canonical direction owner; any future locale switch changes it there, not by sprinkling a second mechanism. No code change made by this pass — declared as the ownership rule for future implementers.

**8.2 Physical vs. logical CSS properties (MUST FOUNDATION NOW — real, live drift).** Two conventions coexist today: hardcoded physical (`marginLeft`/`right:`/`border-left` — 147+543 occurrences across 51+159 files, concentrated in `Navbar.jsx`'s absolute-positioned dropdowns, e.g. lines 336/382/430/481/520/800/828) vs. CSS logical properties already adopted in newer components (`marginInlineStart/End`, `insetInlineStart/End` — 40+ instances in `BeitMidrashPage.jsx`, `Marquee.jsx`, `ContributorPage.jsx`, `VideoTranscript.jsx`). **Contract: logical properties are canonical for any new/touched Experience-layer component** (adopt-when-touched, same principle as `human_date_input_law` — retroactive fix of untouched physical-property code is explicitly NOT required by this pass). `Navbar.jsx`'s dropdown positioning is named here as the **highest-risk specimen** for a future non-Hebrew locale (it would render on the wrong screen edge) — flagged, not fixed.

**8.3 Directional islands (EXTENSION POINT NOW — correct pattern, keep it).** `Marquee.jsx:64`, `HumanDateInput.jsx:132`, and `theme.js`'s `.sgx-date` blocks correctly use local `dir="ltr"`/`direction:ltr` for numeric/date content inside the RTL document — each is commented in-file explaining why. **Contract: this is the sanctioned pattern for numeric/Latin-script content islands inside an RTL document; do not "fix" these to remove the local override.**

**8.4 Directional arrow glyphs (EXTENSION POINT NOW).** ~20+ hardcoded `←`/`→` Unicode glyphs across pages (`JourneyPage.jsx`, `HomePage.jsx`, `PostsPage.jsx`, `ContributorPage.jsx`, `NameLabPage.jsx`, `GematriaRevealPage.jsx`, `AdminPage.jsx`) are meaning-bound to RTL and would not flip under a future LTR locale. **Contract: a future `<DirectionalArrow dir="next|prev"/>` primitive is the target shape when this becomes necessary; not built now (site is RTL-only today, blast radius is zero until a second locale ships).**

**8.5 Date/number formatting (MUST FOUNDATION NOW — canonical-law ownership clarification).** `src/lib/format.js`'s `formatDateHe()`/`formatDateHebrewCal()`/`timeAgoHe()` and `HumanDateInput.jsx` (canonical per `human_date_input_law`) are **Hebrew-only by current design** — no locale parameter exists. `Intl.NumberFormat` is unused anywhere. **Contract:** these remain the canonical, single-source date components (per `human_date_input_law`, unchanged by this pass); **whether they become locale-parameterized is an explicit Human-Gate decision** (§15), not something a future agent should silently work around by writing a parallel date formatter — doing so would violate `canonical_ui_components_law`.

**8.6 SEO/hreflang (LATER — already scoped elsewhere, not duplicated here).** No `hreflang`, single `og:locale=he_IL`. Existing docs (`docs/planning/he-en-seo-readiness-audit.md`, `docs/planning/or-geula-seo-share-audit.md`) already own this; this contract cross-links rather than re-litigates.

## 9. LANGUAGE / COPY CONTRACT — CONTENT vs. APPLICATION LOCALIZATION

**Confirmed hard split, not previously written down as a contract distinction:**

- **(a) Content Translation** — LIVE and real. Governed by `content_translation_law` (`nodes`, active). Canon target set `he·en·ar·es·fr·ru·pt·de` (`src/lib/lang.js`). Engine: Edge Function `video-transcribe` + SQL `video_translate()`, table `video_transcripts`. Consumer: `VideoTranscript.jsx` (has its own per-language RTL/LTR map — a second, narrower direction table scoped to transcript rendering, not in conflict with §8's document-level ownership since it's rendering *foreign-language content* inside the Hebrew-document shell).
- **(b) Application/UI-copy localization** — **does not exist.** Zero `i18next`/`react-i18next`/locale-key files anywhere in `src/`. Every button/menu/label/error/empty-state string is hardcoded Hebrew inline in JSX.

**Contract (corrected pass 2 — GPT flagged "different systems" as too strong, risking a ONE SYSTEM LAW violation):** (a) and (b) are **one localization/representation governance with two distinct semantic domains and consumer sets, not two parallel systems.** They share a locale-identity concept (a language code, a direction, a fallback) and the same Claim≠Fact/AI-vs-canonical discipline (§ below) — but each has its own engine, storage, and trigger, and neither should silently absorb the other's scope. Concretely: `content_translation_law`'s canon language set and `video-transcribe` engine govern **research/media content** — they do not extend to UI chrome, and a future UI-copy system must not be built by *extending that law's wording* (that would be the parallel-truth anti-pattern, just inverted — one law silently annexing a second domain instead of a second law duplicating the first). Instead, a future UI-copy system would be a sibling governed by the same locale-identity concept, with its own explicit rule. **This pass does not build it** — the site currently ships one language of UI copy, and per `research_intake_foundation_contract`'s own "OD-TIME-8"-style precedent, an unresolved future need is named and deferred, not solved speculatively.

**AI translation vs. canonical translation (already correctly separated in the live system):** `video_translate()` output carries `translated_by`/`model` provenance columns and is never presented as Hebrew-source-equivalent without that provenance — this is the existing Claim≠Fact discipline, already sufficient; no new distinction needed for content. For a hypothetical future UI-copy system, the same discipline would apply: an AI-produced UI string is a candidate translation, not canonical, until a human (translator or ZURIEL) accepts it — stated here as a **principle to inherit**, not a system to build.

## 10. BRAND / PUBLIC IDENTITY CONTRACT

**Finding: a clear "one canonical identity per role" pattern already exists in code, just never written down as a contract.** No new Person/Identity store is needed.

| Role | Canonical field | Owner code | Notes |
|---|---|---|---|
| **Account handle** | `users.display_name` | `src/lib/auth.js` (explicit in-file comment: *"users נשאר מקור-הזהות"*), edited via `ProfileSettings.jsx` | Auth-level, one per account |
| **Private personalization** | `profiles.full_name`/`birth_date` | `UserCenter.jsx` → RPC `save_my_info` ("רזיאל מכיר אותך") | **Never** a public byline — feeds AI companion/Life Journey only |
| **Public post byline** | `posts.author` (free text) | Single canonical resolver `src/lib/publicIdentity.js` + `src/lib/authors.js` (`resolveAuthor`) | Collapses system/AI/private-owner names into one `SYSTEM_BYLINE`; splits `"agent · human"` composites; well-designed, already the codified `identity_architecture_law` (documented in CLAUDE.md, **confirmed NOT yet a locked `nodes type='rule'` row** — see below) |
| **Co-authorship** | `posts.authors` (array) | `PostEditorPage.jsx`, rendered as "בהשתתפות:" | Real, intentional, separate from primary `author` — not drift |
| **Curated public contributor** | `contributors.display_name` | `ContributorPage.jsx`, `ResearchersIndexPage.jsx`, `lib/writers.js`/`reporters.js` | Dossier/researcher pages, `slug`-addressable, optional `contributors.user_id` FK to `users` (the deliberate join point) |
| **Research provenance** | `research_contributions.author_user_id` (preferred for live display-name lookup) / `author_name` (stable identity key for the researcher-page link) | `src/lib/contributions.js` (documented precedence, line ~297: resolve display name via `author_user_id`, keep `author_name` as the stable link key — a "two purposes, two fields" split, not accidental duplication) | Imperfectly uniform across call sites, but not broken |

**Contract:** `identity_architecture_law` (already documented in CLAUDE.md, governing `publicIdentity.js`) is hereby **recommended for promotion to a locked `nodes type='rule'` row** — it already functions as binding law in practice (multiple components cite and depend on it) but currently lives only as CLAUDE.md prose, which is a genuine ownership gap per this contract's own §3 matrix (a Rule/Law belongs in `nodes`, not only in CLAUDE.md). **This is a Human-Gate recommendation (§15), not activated by this pass** — the rule text already exists and is correct; this is a promotion-of-ownership question, not a rewrite.

**Human-Gate flags found (none require new schema, all are decisions):**
1. `research_contributions.author_contributor_id` is selected in queries but **consumed nowhere** in client code — dead column or missing precedence branch. Needs a ZURIEL/GPT decision: wire it in, or drop it from future selects.
2. Reality Stream / gallery cards (`source='community'`) show no visible "מאת" (by) credit despite provenance existing structurally — intentional anonymization or a missing feature; needs a decision, not a default fix.
3. SEO Person/Organization JSON-LD is independently reimplemented in `api/og.js` (server) and `src/lib/seo.js` (client) — low-risk duplication, worth naming one canonical eventually per `canonical_ui_components_law`'s spirit, but not urgent.

**Explicitly distinct, not conflated (confirmed live):** the `persons`/`fn_get_or_create_my_person` family-identity system (F-1a′/F-1b Ledger, per Master State/Roadmap `WS-PERSON`) governs **family/life-journey relationships**, not content authorship. This contract does not touch it and flags the naming proximity ("Person") as a real but manageable confusion risk for future agents — not a conflict to resolve now.

## 11. DESIGN PRIMITIVE CROSSWALK

**Confirmed canonical, real, working token system (MUST FOUNDATION NOW — assign ownership, don't rebuild):** `src/theme.js` (`C`/`F`/`T` — the fixed royal-gold brand palette + typography scale + `GLOBAL_CSS`/`POST_CONTENT_CSS`) + `src/lib/palette.js` (`usePalette()` — the actual light/dark **semantic** token resolver: `ink`,`inkSoft`,`card`,`border`,`accent`,`accentText`, etc., route-aware via `effectiveMode(pathname)`) + `src/lib/themeMode.js` (the `data-theme` attribute + `localStorage["sod-theme"]` mechanism). **These three files together are the canonical design-token system** — this is exactly what `post_theme_safe_colors_law`/`city_background_dual_theme_law` already require components to consume. No CSS-variable `:root` layer exists app-wide (JS-object tokens are the real mechanism; scattered `var(--x,fallback)` calls like `HumanDateInput.jsx:113-114` silently rely on their hardcoded fallback since nothing defines the variable at `:root` — flagged as a known dangling reference, not a system to build, since the JS-token path already works).

**Reusable primitives (MUST FOUNDATION NOW — name the real gap):** `src/components/ui.jsx` (`GoldButton`/`RoyalInput`/`SectionHeader`/`RoyalDivider`/`PageBody`) is a **partial, dark-only** canonical kit — used in ~20 files but not `usePalette()`-aware, and **does not cover Card/Modal/Drawer** (each dialog — `NumberDrawer.jsx`, `BrandTicker.jsx`'s `UpdateModal`, `ComingSoonModal.jsx` — is hand-rolled). `borderRadius:` inline styling alone occurs 2425 times across 249 files — strong evidence styling is overwhelmingly component-local. **Contract:** `ui.jsx` is named as the existing (incomplete) canonical primitive owner; extending it to cover Card/Modal/Drawer and making it `usePalette()`-aware is an **EXTENSION POINT NOW** (worth doing, not done by this pass).

**Responsive breakpoints (MUST FOUNDATION NOW — direct conflict with a just-ratified law):** no shared `BREAKPOINTS` constant/hook encodes 320/360/390px. `mobile_acceptance_law` is currently enforced **only by per-component convention/comments** (confirmed in `HumanDateInput.jsx`), not a shared utility — every future component re-derives the three widths independently. **Contract recommendation:** a canonical `useViewportAcceptance()`/`BREAKPOINTS_PX=[320,360,390]` constant is the natural home for this once a second component needs it (EXTENSION POINT NOW, not built here — `mobile_acceptance_law` itself is explicitly `ADOPT WHEN TOUCHED`, so a shared constant is additive convenience, not a retroactive requirement).

**Canonical-component law violated in the wild (MUST FOUNDATION NOW — name it, don't silently fix it):** `ticker_marquee_law`/`canonical_ui_components_law` both assert `Marquee.jsx` is the single ticker implementation — but `BrandTicker.jsx` independently reimplements its own `@keyframes bt-slide` marquee (lines ~184–256), and `theme.js`'s `GLOBAL_CSS` defines a *third* `@keyframes ticker-scroll`. **This is exactly the drift these laws exist to prevent, already present live.** Flagged for Human-Gate (§15): fold `BrandTicker` into `Marquee.jsx` (with the `dir="ltr"` island pattern preserved per §8.3), or explicitly grandfather it in the rule's `metadata`. Not fixed by this pass (would be a code change beyond docs-only scope).

## 12. ACCESSIBILITY / INTERACTION EXTENSION

**Verdict: EXTENSION POINT NOW, not MUST — the foundation is already sound.** Sampled `Navbar.jsx` (real `<button>`/`<Link>`, `aria-label`/`aria-haspopup`/`aria-expanded`, Escape+outside-click via a dedicated `useAccessibleMenu()` hook — built specifically to fix a prior hover-only-dropdown accessibility bug), `HumanDateInput.jsx` (`aria-label`/`aria-required`/`aria-invalid` on all fields), `NumberDrawer.jsx` (real buttons, Escape handling, but the drawer panel itself lacks `role="dialog"`/`aria-modal`/focus-trap). `role="button"` (the div-as-button anti-pattern) appears only 6 times total across `src/` — confirming this is **not systemic**. `prefers-reduced-motion` is correctly handled in the 3 files with custom keyframe animations (`Marquee.jsx`, `theme.js`'s `POST_CONTENT_CSS`, `BrandTicker.jsx`) but not applied to other animations (`Navbar.jsx`'s sparkle/scan effects, `NumberDrawer.jsx`'s SVG pulse) — opt-in per author, not a systemic rule.

**Real gap found, classification corrected pass 2 (downgraded MUST-NOW → Human-Gate candidate, per GPT):** touch-target/font-size discipline is spotty — `StayUpdatedCTA.jsx`'s compact variant uses `font-size:13.5px` and `HumanDateInput.jsx`'s date fields use `font-size:14.5px`, both below the 16px iOS-auto-zoom threshold; `44px` min-height appears only where an author happened to add it (`BrandTicker.jsx`), with no shared rule. This is real and worth ZURIEL's attention — but pass 1 asserted, without an owning decision, that it should be **folded specifically into `mobile_acceptance_law`**. GPT correctly challenged that: whether this belongs inside Mobile Acceptance (a viewport-overflow law) versus a broader, not-yet-existing Accessibility/Touch-Target law family is itself an open architecture question, not something this crosswalk can presume. **Flagged as a Human-Gate candidate (§15) with the question left open**, not a MUST-FOUNDATION-NOW prescription.

**Contract:** Accessibility is **not** a new framework to build — it's an existing, mostly-correct pattern (`useAccessibleMenu()`, real semantic elements) that needs (a) an explicit ZURIEL/GPT decision on where the touch-target/font-size gap belongs — folded into `mobile_acceptance_law`, or a new sibling Accessibility law family — rather than this pass presuming the answer, and (b) `role="dialog"`/`aria-modal`/focus-trap named as the target shape for `NumberDrawer`/modal components when next touched (adopt-when-touched, not retroactive).

## 13. MASTER STATE / ROADMAP RECONCILIATION

**The drift GPT flagged is real but already self-resolved in practice, not a live contradiction requiring a rewrite.** Master State §0 (Governance) states: *"כל החלטה קנונית חדשה חייבת להירשם כאן"* ("every new canonical decision must be registered here") and *"כל שינוי עתידי של צבע/שם/UI/UX/התנהגות עובר דרך מנגנון זה"* ("every future color/name/UI/UX/behavior change goes through this mechanism"). Read literally and in isolation, this could suggest Master State should hold every Experience-law body — which would directly violate this contract's own §3 matrix (full bodies belong in `nodes`/`project_codex`, Master State holds pointers).

**Live evidence this is already understood correctly in practice, not a genuine conflict:** Master State's own text (§ "תיקוני-ייחוס", checked live) explicitly acknowledges `RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md` lives under `audits/`, outside `nodes`/`project_codex`, "and that's correct, not a gap" — i.e. Master State already treats itself as a **pointer/index to major state**, not a mandatory full-body repository, when it documents another contract's existence. Three other Foundation Contracts (`research_intake_foundation_contract`, `corpus_admission_foundation_v1`, `person_foundation_contract`) already live in `project_codex`/`audits/` without duplicating their bodies into Master State.

**Reconciliation wording (recommended addition to Master State §0, NOT applied by this pass — docs-only Human-Gate write, deferred to §15), corrected pass 2 to explicitly restate the full authority hierarchy per GPT's challenge rather than assume it's understood:**

> §0 clarification: the standing authority order is unchanged and is restated here, not altered: **live DB + `origin/main` + `SOD1820_MASTER_STATE.md` > `SOD1820_MASTER_ROADMAP.md` (navigation) > conversation/session memory.** Within that order, "כל החלטה קנונית חדשה חייבת להירשם כאן" means Master State records **that** a decision was made, **what its ratified state is**, and **where** its canonical body lives (rule_id / project_codex slug / audits path) — Master State is the pointer/index to material ratified state, not a mandatory duplicate of every rule/contract body. Operational Laws (`nodes type='rule'`) remain the canonical owner of rule text; long-form Contracts (`project_codex`/`audits/`, once merged/registered per §3's corrected Long-form Contract row) remain the canonical owner of architectural reasoning. This clarification changes no existing decision and does not lower Master State below the Roadmap or any other source in the hierarchy — it only clarifies *what* Master State must record about a decision, not *whether* it remains the senior state document.

This wording is **proposed, not written into Master State by this pass** — inserting it is itself a Master-State edit requiring the same Human-Gate discipline as any other canonical-document change, and is listed as a Human-Gate item (§15) rather than silently applied, per this handoff's own §17/§18 instruction not to write reconciliation wording that live evidence hasn't fully justified without ZURIEL sign-off on the exact phrasing.

## 14. MOBILE_ACCEPTANCE_LAW — WORKED EXAMPLE

Walking `mobile_acceptance_law` through this contract's model end-to-end, to prove the model actually works before recommending it:

1. **Where it lives:** `nodes`, `rule_id='mobile_acceptance_law'`, `is_active=true`, `rule_version` present, `metadata` carries `related_rule`, `triggered_by`, `breakpoints_px:[320,360,390]`, `verification_priority` — already structured, already extensible. **No change needed.**
2. **How Experience Governance discovers it:** any future agent runs the same discovery query the CLAUDE.md `agent_onboarding_law` already mandates (`select rule_id,label,description,metadata from nodes where type='rule' and is_active`) — this contract adds no new discovery mechanism.
3. **How implementation knows it applies:** today, by convention (component authors read CLAUDE.md/nodes before building). §5's proposed `surface_scope`/`access_scope`/`lifecycle_class` metadata keys would make this machine-checkable later — not required for the law to already function correctly today.
4. **How acceptance evidence links to it:** today, narratively in `work_log` (PR #233's "9_OF_9_PASSED" memo) — the only live mechanism. §6's `decision_ledger` shape is a **proposed** structured target requiring its own Human-Gate ratification (corrected pass 2 — not yet an established pattern for this domain), not a requirement to retrofit past evidence.
5. **How release knows the acceptance happened:** today, by the `work_log` AFTER memo being read before merge (human/agent judgment). §7's Release Gate model names this explicitly as the target automation shape.
6. **How a v2 supersedes v1 without deleting history:** `rule_version` increments, `supersedes_version` is set on the new row (native column, proven live on `canonical_ui_components_law` v1→v2), old row `is_active=false`, kept forever. **No new mechanism — this already works.**

**Conclusion: `mobile_acceptance_law` requires zero changes to fit this contract.** It is presented as the worked example precisely because it already, accidentally, follows the model this contract makes explicit — proof the model describes reality rather than inventing new bureaucracy.

## 15. HUMAN GATE ITEMS — decisions ZURIEL/GPT must make, not decided by this pass

1. **Promote `identity_architecture_law` from CLAUDE.md prose to a locked `nodes type='rule'` row** (§10) — text already correct, this is an ownership-location decision.
2. **Where the touch-target/font-size gap (`font-size≥16px`/`min-height≥44px`) belongs** (§12) — fold into `mobile_acceptance_law`, or a new sibling Accessibility law family; not presumed by this pass. Separately: whether/when to add the `surface_scope`/`access_scope`/`lifecycle_class` metadata split (§5) to `mobile_acceptance_law` — additive UPDATE, no schema change, but still a WRITE requiring Human-Gate per `agent_onboarding_law`.
3. **`BrandTicker.jsx`'s duplicate marquee implementation** (§11) — fold into `Marquee.jsx` or explicitly grandfather; this is a code decision, not just docs.
4. **Whether `formatDateHe`/`HumanDateInput` become locale-parameterized** or stay intentionally Hebrew-only (§8.5) — architecture decision with real future cost either way.
5. **`research_contributions.author_contributor_id`** — wire in or drop from selects (§10, item 1).
6. **Reality Stream "מאת" credit** — intentional omission or missing feature (§10, item 2).
7. **Master State §0 reconciliation wording** (§13) — exact phrasing needs ZURIEL sign-off before it's written into Master State itself.
8. **Whether application/UI-copy localization (§9b) becomes a roadmap item at all**, and if so, when — currently correctly deferred, but the decision to keep deferring it is ZURIEL's to make explicitly, not an agent default.

None of these are activated, implemented, or written into `nodes`/Master State by this pass.

## 16. FOUNDATION EXPANSION GATE — CLASSIFICATION SUMMARY

| Finding | Classification | One-line why |
|---|---|---|
| Document-level `dir` ownership (index.html) | MUST FOUNDATION NOW | One place, name it before a second mechanism sprouts |
| Physical vs. logical CSS properties, `Navbar.jsx` dropdowns | MUST FOUNDATION NOW | Real live drift; highest-risk specimen for a future locale |
| `dir="ltr"` islands (Marquee/HumanDateInput/dates) | EXTENSION POINT NOW | Already correct — name it as the pattern to keep |
| Directional arrow glyphs | EXTENSION POINT NOW | Real gap, zero blast radius until a 2nd locale ships |
| Hebrew-only date/number formatting | MUST FOUNDATION NOW | Canonical-law ownership must be explicit before it's silently forked |
| SEO/hreflang | LATER | Already scoped in separate existing docs |
| Content vs. UI-copy translation split | MUST FOUNDATION NOW | Prevents a future agent conflating two systems with different owners |
| Person/Account/Contributor/Research-provenance identity roles | MUST FOUNDATION NOW (documentation) | Pattern already correct in code; needs to be named so it isn't "fixed" into a collision |
| `identity_architecture_law` CLAUDE.md-only status | MUST FOUNDATION NOW (recommendation) | Binding-in-practice law without a locked owner-row is itself an ownership gap |
| Design token system (`theme.js`+`palette.js`+`themeMode.js`) | MUST FOUNDATION NOW (ownership only) | Already real and working — assign, don't rebuild |
| `ui.jsx` Card/Modal/Drawer gap | EXTENSION POINT NOW | Real gap, not urgent, natural next step named |
| Shared 320/360/390 breakpoint utility | EXTENSION POINT NOW | `mobile_acceptance_law` works today without it; convenience once 2nd component needs it |
| `BrandTicker` duplicate marquee | MUST FOUNDATION NOW (flag only) | Active violation of two already-ratified laws |
| Accessibility (aria/keyboard/semantic elements) | EXTENSION POINT NOW | Foundation already sound; targeted gaps (dialog semantics) layer on |
| Touch-target/font-size (16px/44px) | HUMAN-GATE CANDIDATE (corrected pass 2, was MUST-NOW) | Real gap, but which law owns it is an open architecture question, not this pass's to answer |
| Reduced-motion coverage | EXTENSION POINT NOW | Correctly implemented where present; needs to become a convention, not new mechanism |
| Applicability/scope taxonomy (`surface_scope`/`access_scope`/`lifecycle_class`, corrected pass 2 from a single mixed `applies_to`) | EXTENSION POINT NOW | Not needed until 2+ Experience laws need to disagree on scope |
| Acceptance Evidence → `decision_ledger` reuse (corrected pass 2: PROPOSED, not yet live for this domain) | EXTENSION POINT NOW / HUMAN-GATE CANDIDATE | Table structurally fits; whether to reuse it for a new `subject_type` is itself a decision, not yet ratified |
| Master State §0 governance wording | MUST FOUNDATION NOW (wording only, deferred to Human-Gate) | Prevents a future agent misreading it as "duplicate everything here" |

## 17. FOUNDATION VERDICT

**FOUNDATION NOT SUFFICIENT — corrected pass 2 (was wrongly declared SUFFICIENT in pass 1; GPT correctly challenged this).**

**Why the correction is right, not just a formality:** the Foundation Expansion Gate (§16) still lists 9 items classified MUST FOUNDATION NOW. Per `foundation_closure_protocol_v1`'s own CLASSIFY step, a MUST-FOUNDATION-NOW item is by definition one whose deferral risks redesign/migration/duplicate-truth later — declaring the Foundation "sufficient" while such items remain open is a direct contradiction of the protocol this pass claims to follow, not a matter of style.

**What is actually true, split correctly this time:**

- **The governance *meta-model* is sound and requires no new infrastructure.** The Canonical Ownership Matrix (§3, as corrected), the Experience Law lifecycle (§4), and the reuse pattern for `nodes`/`project_codex`/`decision_ledger` are all proven — not by assertion, but by the `mobile_acceptance_law` worked example (§14) tracing end-to-end through the model with zero schema/table/engine changes required, and by four other domains (research-dna, corpus admission, research intake, person foundation) already following this exact ownership pattern before this document existed. **This part does not need another pass.**
- **The domain-content closure is genuinely not done.** §16's MUST-FOUNDATION-NOW row (document-level `dir` ownership, physical-vs-logical CSS convention, Hebrew-only date/number formatting ownership, content-vs-UI-copy localization split, identity-role documentation, `identity_architecture_law` promotion, design-token ownership, `BrandTicker` duplicate-marquee violation, Master State §0 wording) lists 9 items that are each **correctly scoped and ready for a decision**, but **none has actually been closed or reclassified by ZURIEL yet** — they are recommendations pending Human-Gate, not settled facts. Per the Expansion Gate's own rule, that keeps the Foundation **NOT SUFFICIENT** until ZURIEL either ratifies each (moving it to closed/ACTIVE) or explicitly reclassifies it EXTENSION POINT/LATER with reasoning.

**What would make this SUFFICIENT:** ZURIEL working through the Human Gate Items list (§15, 8 items, mapped 1:1 to most of §16's MUST-NOW rows) and recording a decision — closed, reclassified, or deferred-with-reasoning — for each. No further crosswalk research is expected to be needed to reach that point; this is now a decision queue, not an open-ended investigation.

## 18. IMPLEMENTATION STATE

- **Implemented:** this document + live crosswalk research (this pass, docs-only).
- **Committed:** pending (next step after this write).
- **Pushed:** pending.
- **PR opened:** pending — will target `main`, explicitly declared foundation-only/no-merge/no-deploy in the PR body.
- **Merged:** NO.
- **Deployed:** NO.
- **Live verified:** N/A (docs-only; nothing to verify in production).
- **`nodes`/`project_codex`/Master State writes:** NONE by this pass — all recommendations in §15 remain proposals pending ZURIEL Human-Gate via the `work_log` cross-verification channel this handoff itself establishes.

## 19. SUPERSESSION & PROVENANCE

This document supersedes nothing — it is the first Experience Governance Foundation Contract. Future passes correcting or extending it should follow the `research_dna_v1_foundation_contract` precedent: in-body "§N correction, <date> (pass N)" markers, never silent rewrite, full prior text preserved. This document itself should be registered as a `project_codex` slug (`experience_governance_foundation_v1`, referencing this file's path — following the `Numeric Language`/`RAZIEL_PERSONALIZATION_LAW` precedent of "real contract, lives under `audits/`, not yet promoted to `nodes`/`project_codex`") **only upon ZURIEL Human-Gate approval** — not inserted by this pass.

---

*Foundation → Projection → Experience. Preserve capability, truth and provenance — not necessarily the legacy interface. Rank, Don't Duplicate. Automation where deterministic. Human Gate where judgment is required.*
