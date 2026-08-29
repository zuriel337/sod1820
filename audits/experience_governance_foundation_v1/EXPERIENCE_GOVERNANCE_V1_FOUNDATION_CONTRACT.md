# SOD1820 — EXPERIENCE GOVERNANCE v1 · FOUNDATION CONTRACT
### Canonical Ownership + Experience Law Lifecycle + Locale/Identity/Design Crosswalk · actor=CLAUDE · 2026-08-29 · **closed (pass 3) — ZURIEL Human-Gate APPROVED**

**STATUS: APPROVED — Human-Gate ZURIEL, 2026-08-29 (`work_log` id `f4811264`, `EXPERIENCE_GOVERNANCE_FOUNDATION_V1_CLOSURE`).** Canonical via `project_codex.slug='experience_governance_foundation_v1'` (LIVE, this pass) and `nodes.rule_id='experience_governance_foundation_v1_law'` (LIVE, this pass) — per this contract's own §3 rule, registration in `project_codex` is sufficient for canonicity independent of whether this `audits/` file itself has merged to `main` yet. **Scope remains governance/ownership + the 8 approved decisions below — still 0 UI build, 0 Experience Center, 0 new engine.** PR #234 remains open on branch `claude/experience-governance-foundation-v1-1ki2s6`; **not merged, not deployed**, per ZURIEL's explicit instruction to stop before merge/deploy pending one more GPT cross-verification round.

**Revision history:**
- **Pass 1** (first draft): declared FOUNDATION SUFFICIENT prematurely.
- **Pass 2** (`work_log` id `5a4b6756`): GPT cross-verified pass 1 (`86daaade`, `CHANGES_REQUESTED`) and raised 7 challenges, all applied — verdict corrected to NOT SUFFICIENT (9 MUST-NOW items still open); Decision-ownership row fixed (`work_log` is provenance only, never canonical owner of content, per `work_log_authority_law`); Long-form-Contract row fixed (an unmerged branch file is PROPOSED, not canonical, until merged/registered); §5's `applies_to` split into three axes (Single Meaning Law); §9 reframed from "different systems" to one localization governance (ONE SYSTEM LAW); §12's 16px/44px proposal downgraded from MUST-NOW to a Human-Gate candidate; §13's authority-hierarchy wording restored explicitly; §6/§14 softened to mark `decision_ledger` reuse as PROPOSED, not yet live for this domain.
- **Pass 3 (this commit):** ZURIEL approved all 8 Human-Gate items (`f4811264`) — applied throughout below, `LIVE (this pass)` markers added wherever `nodes`/`project_codex`/Master State/Roadmap were actually written, §16/§17 updated to reflect that every prior MUST-FOUNDATION-NOW item is now closed or reclassified, verdict restored to **FOUNDATION SUFFICIENT**.

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

**8.5 Date/number formatting — DECIDED (`work_log` id `f4811264`).** `src/lib/format.js`'s `formatDateHe()`/`formatDateHebrewCal()`/`timeAgoHe()` and `HumanDateInput.jsx` (canonical per `human_date_input_law`) are **Hebrew-only by current design** — no locale parameter exists. ZURIEL: *"Date infrastructure remains Hebrew-first with a locale extension point."* These remain the canonical, single-source date components, confirmed intentionally Hebrew-first (not an oversight); locale-parameterization is named as an **Extension Point** for if/when a second locale is ever built — not built now, and not something a future agent should silently work around by writing a parallel date formatter (would violate `canonical_ui_components_law`).

**8.6 SEO/hreflang (LATER — already scoped elsewhere, not duplicated here).** No `hreflang`, single `og:locale=he_IL`. Existing docs (`docs/planning/he-en-seo-readiness-audit.md`, `docs/planning/or-geula-seo-share-audit.md`) already own this; this contract cross-links rather than re-litigates.

## 9. LANGUAGE / COPY CONTRACT — CONTENT vs. APPLICATION LOCALIZATION

**Confirmed hard split, not previously written down as a contract distinction:**

- **(a) Content Translation** — LIVE and real. Governed by `content_translation_law` (`nodes`, active). Canon target set `he·en·ar·es·fr·ru·pt·de` (`src/lib/lang.js`). Engine: Edge Function `video-transcribe` + SQL `video_translate()`, table `video_transcripts`. Consumer: `VideoTranscript.jsx` (has its own per-language RTL/LTR map — a second, narrower direction table scoped to transcript rendering, not in conflict with §8's document-level ownership since it's rendering *foreign-language content* inside the Hebrew-document shell).
- **(b) Application/UI-copy localization** — **does not exist.** Zero `i18next`/`react-i18next`/locale-key files anywhere in `src/`. Every button/menu/label/error/empty-state string is hardcoded Hebrew inline in JSX.

**Contract (corrected pass 2 — GPT flagged "different systems" as too strong, risking a ONE SYSTEM LAW violation):** (a) and (b) are **one localization/representation governance with two distinct semantic domains and consumer sets, not two parallel systems.** They share a locale-identity concept (a language code, a direction, a fallback) and the same Claim≠Fact/AI-vs-canonical discipline (§ below) — but each has its own engine, storage, and trigger, and neither should silently absorb the other's scope. Concretely: `content_translation_law`'s canon language set and `video-transcribe` engine govern **research/media content** — they do not extend to UI chrome, and a future UI-copy system must not be built by *extending that law's wording* (that would be the parallel-truth anti-pattern, just inverted — one law silently annexing a second domain instead of a second law duplicating the first). Instead, a future UI-copy system would be a sibling governed by the same locale-identity concept, with its own explicit rule. **DECIDED, `work_log` id `f4811264`:** ZURIEL: *"UI localization is EXTENSION POINT NOW under one Localization/Representation Governance with content translation, and full i18n is not built now."* This ratifies the reframing above exactly — one governance, two domains, not built. The site currently ships one language of UI copy, and per `research_intake_foundation_contract`'s own "OD-TIME-8"-style precedent, an unresolved future need is named and deferred, not solved speculatively.

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

**Contract — DECIDED, LIVE (this pass):** `identity_architecture_law` is **promoted to a locked `nodes type='rule'` row** (`rule_id='identity_architecture_law'`, `rule_version=1`, `is_active=true`) — ZURIEL approved this verbatim (`work_log` id `f4811264`: *"Identity architecture becomes a canonical rule preserving current meaning"*). The rule text was transcribed faithfully from CLAUDE.md, not rewritten — same meaning, new canonical home. This closes the ownership gap this contract's §3 matrix identified (a Rule/Law belongs in `nodes`, not only in CLAUDE.md prose).

**Human-Gate flags — DECIDED (`work_log` id `f4811264`):**
1. `research_contributions.author_contributor_id` — **preserved, not dropped.** ZURIEL: *"author_contributor_id capability is preserved for later Public Identity Projection resolution."* Wiring it into a precedence branch is deferred to that future decision, not built now.
2. Reality Stream / gallery "מאת" credit — **provenance preserved, display deferred.** ZURIEL: *"Reality Stream attribution provenance is preserved while visible credit wording remains a Projection choice."* The underlying `source` field stays as-is; whether to render a visible byline is a future UI/Projection decision, not a Foundation blocker.
3. SEO Person/Organization JSON-LD duplication (`api/og.js` vs `src/lib/seo.js`) — not part of the 8-item approved package; remains a low-risk, non-blocking note for a future pass.

**Explicitly distinct, not conflated (confirmed live):** the `persons`/`fn_get_or_create_my_person` family-identity system (F-1a′/F-1b Ledger, per Master State/Roadmap `WS-PERSON`) governs **family/life-journey relationships**, not content authorship. This contract does not touch it and flags the naming proximity ("Person") as a real but manageable confusion risk for future agents — not a conflict to resolve now.

## 11. DESIGN PRIMITIVE CROSSWALK

**Confirmed canonical, real, working token system (MUST FOUNDATION NOW — assign ownership, don't rebuild):** `src/theme.js` (`C`/`F`/`T` — the fixed royal-gold brand palette + typography scale + `GLOBAL_CSS`/`POST_CONTENT_CSS`) + `src/lib/palette.js` (`usePalette()` — the actual light/dark **semantic** token resolver: `ink`,`inkSoft`,`card`,`border`,`accent`,`accentText`, etc., route-aware via `effectiveMode(pathname)`) + `src/lib/themeMode.js` (the `data-theme` attribute + `localStorage["sod-theme"]` mechanism). **These three files together are the canonical design-token system** — this is exactly what `post_theme_safe_colors_law`/`city_background_dual_theme_law` already require components to consume. No CSS-variable `:root` layer exists app-wide (JS-object tokens are the real mechanism; scattered `var(--x,fallback)` calls like `HumanDateInput.jsx:113-114` silently rely on their hardcoded fallback since nothing defines the variable at `:root` — flagged as a known dangling reference, not a system to build, since the JS-token path already works).

**Reusable primitives (MUST FOUNDATION NOW — name the real gap):** `src/components/ui.jsx` (`GoldButton`/`RoyalInput`/`SectionHeader`/`RoyalDivider`/`PageBody`) is a **partial, dark-only** canonical kit — used in ~20 files but not `usePalette()`-aware, and **does not cover Card/Modal/Drawer** (each dialog — `NumberDrawer.jsx`, `BrandTicker.jsx`'s `UpdateModal`, `ComingSoonModal.jsx` — is hand-rolled). `borderRadius:` inline styling alone occurs 2425 times across 249 files — strong evidence styling is overwhelmingly component-local. **Contract:** `ui.jsx` is named as the existing (incomplete) canonical primitive owner; extending it to cover Card/Modal/Drawer and making it `usePalette()`-aware is an **EXTENSION POINT NOW** (worth doing, not done by this pass).

**Responsive breakpoints (MUST FOUNDATION NOW — direct conflict with a just-ratified law):** no shared `BREAKPOINTS` constant/hook encodes 320/360/390px. `mobile_acceptance_law` is currently enforced **only by per-component convention/comments** (confirmed in `HumanDateInput.jsx`), not a shared utility — every future component re-derives the three widths independently. **Contract recommendation:** a canonical `useViewportAcceptance()`/`BREAKPOINTS_PX=[320,360,390]` constant is the natural home for this once a second component needs it (EXTENSION POINT NOW, not built here — `mobile_acceptance_law` itself is explicitly `ADOPT WHEN TOUCHED`, so a shared constant is additive convenience, not a retroactive requirement).

**Canonical-component law violated in the wild — DECIDED, not yet implemented (`work_log` id `f4811264`).** `ticker_marquee_law`/`canonical_ui_components_law` both assert `Marquee.jsx` is the single ticker implementation — but `BrandTicker.jsx` independently reimplements its own `@keyframes bt-slide` marquee (lines ~184–256), and `theme.js`'s `GLOBAL_CSS` defines a *third* `@keyframes ticker-scroll`. **This is exactly the drift these laws exist to prevent, already present live.** ZURIEL decided: *"BrandTicker gets no grandfathering and should reuse canonical Marquee when corrected."* No grandfathering — the fix is required, not optional. **The code change itself is a separate, not-yet-scheduled implementation task** (fold `BrandTicker` into `Marquee.jsx`, preserving the `dir="ltr"` island pattern per §8.3) — out of scope for this docs-only Foundation closure, tracked as a follow-up, not blocking the Foundation verdict (§17).

## 12. ACCESSIBILITY / INTERACTION EXTENSION

**Verdict: EXTENSION POINT NOW, not MUST — the foundation is already sound.** Sampled `Navbar.jsx` (real `<button>`/`<Link>`, `aria-label`/`aria-haspopup`/`aria-expanded`, Escape+outside-click via a dedicated `useAccessibleMenu()` hook — built specifically to fix a prior hover-only-dropdown accessibility bug), `HumanDateInput.jsx` (`aria-label`/`aria-required`/`aria-invalid` on all fields), `NumberDrawer.jsx` (real buttons, Escape handling, but the drawer panel itself lacks `role="dialog"`/`aria-modal`/focus-trap). `role="button"` (the div-as-button anti-pattern) appears only 6 times total across `src/` — confirming this is **not systemic**. `prefers-reduced-motion` is correctly handled in the 3 files with custom keyframe animations (`Marquee.jsx`, `theme.js`'s `POST_CONTENT_CSS`, `BrandTicker.jsx`) but not applied to other animations (`Navbar.jsx`'s sparkle/scan effects, `NumberDrawer.jsx`'s SVG pulse) — opt-in per author, not a systemic rule.

**Real gap found — DECIDED as principle, ownership still open (`work_log` id `f4811264`):** touch-target/font-size discipline is spotty — `StayUpdatedCTA.jsx`'s compact variant uses `font-size:13.5px` and `HumanDateInput.jsx`'s date fields use `font-size:14.5px`, both below the 16px iOS-auto-zoom threshold; `44px` min-height appears only where an author happened to add it (`BrandTicker.jsx`), with no shared rule. ZURIEL: *"16px form text and 44px touch targets are approved accessibility principles but are not automatically added to mobile_acceptance_law until ownership is resolved."* So: the principle itself is ratified (16px/44px are correct targets) — but pass 1's presumption that it should be folded specifically into `mobile_acceptance_law` (a viewport-overflow law) versus a future, not-yet-existing Accessibility/Touch-Target law family remains an **open architecture question**, correctly left undecided rather than defaulted. Tracked as a named Extension Point, not enforced by any rule yet.

**Contract:** Accessibility is **not** a new framework to build — it's an existing, mostly-correct pattern (`useAccessibleMenu()`, real semantic elements) that needs (a) the 16px/44px principles ZURIEL approved (above) to eventually land inside a decided owning law — deferred, not blocking — and (b) `role="dialog"`/`aria-modal`/focus-trap named as the target shape for `NumberDrawer`/modal components when next touched (adopt-when-touched, not retroactive).

## 13. MASTER STATE / ROADMAP RECONCILIATION

**The drift GPT flagged is real but already self-resolved in practice, not a live contradiction requiring a rewrite.** Master State §0 (Governance) states: *"כל החלטה קנונית חדשה חייבת להירשם כאן"* ("every new canonical decision must be registered here") and *"כל שינוי עתידי של צבע/שם/UI/UX/התנהגות עובר דרך מנגנון זה"* ("every future color/name/UI/UX/behavior change goes through this mechanism"). Read literally and in isolation, this could suggest Master State should hold every Experience-law body — which would directly violate this contract's own §3 matrix (full bodies belong in `nodes`/`project_codex`, Master State holds pointers).

**Live evidence this is already understood correctly in practice, not a genuine conflict:** Master State's own text (§ "תיקוני-ייחוס", checked live) explicitly acknowledges `RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md` lives under `audits/`, outside `nodes`/`project_codex`, "and that's correct, not a gap" — i.e. Master State already treats itself as a **pointer/index to major state**, not a mandatory full-body repository, when it documents another contract's existence. Three other Foundation Contracts (`research_intake_foundation_contract`, `corpus_admission_foundation_v1`, `person_foundation_contract`) already live in `project_codex`/`audits/` without duplicating their bodies into Master State.

**DECIDED and LIVE (this pass), `work_log` id `f4811264`.** ZURIEL: *"Master State may reference canonical owners rather than duplicate full rule or contract bodies while preserving the established authority hierarchy."* Applied verbatim in spirit to `SOD1820_MASTER_STATE.md` §0 as a new, additive item 16 (not a rewrite of items 1–15) plus a new §23.17 closure section, both live on this branch:

> §0 item 16 (as written into Master State, this pass): the standing authority order is unchanged and is restated, not altered: **live DB + `origin/main` + `SOD1820_MASTER_STATE.md` > `SOD1820_MASTER_ROADMAP.md` (navigation) > conversation/session memory.** Within that order, "כל החלטה קנונית חדשה חייבת להירשם כאן" means Master State records **that** a decision was made, **what its ratified state is**, and **where** its canonical body lives (rule_id / project_codex slug / audits path) — Master State is the pointer/index to material ratified state, not a mandatory duplicate of every rule/contract body. Operational Laws (`nodes type='rule'`) remain the canonical owner of rule text; long-form Contracts (`project_codex`/`audits/`, once merged/registered per §3's corrected Long-form Contract row) remain the canonical owner of architectural reasoning. This clarification changes no existing decision and does not lower Master State below the Roadmap or any other source in the hierarchy.

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

## 15. HUMAN GATE ITEMS — ALL 8 DECIDED (ZURIEL, `work_log` id `f4811264`, 2026-08-29)

1. **`identity_architecture_law` promotion** (§10) — **DECIDED: promoted.** LIVE this pass, `nodes.rule_id='identity_architecture_law'`, meaning preserved verbatim.
2. **Touch-target/font-size gap ownership** (§12) — **DECIDED: principle approved, owning law still open.** Not folded into `mobile_acceptance_law` automatically; remains a named, ratified Extension Point until an owning law is chosen. The `surface_scope`/`access_scope`/`lifecycle_class` metadata split (§5) was not part of this package and remains a separate, still-undecided Extension Point.
3. **`BrandTicker.jsx`'s duplicate marquee** (§11) — **DECIDED: no grandfathering, must reuse canonical `Marquee.jsx`.** Decision made; the code fix itself remains a separate, not-yet-scheduled implementation task.
4. **`formatDateHe`/`HumanDateInput` locale-parameterization** (§8.5) — **DECIDED: stays Hebrew-first by design**, locale-parameterization named as a future Extension Point only.
5. **`research_contributions.author_contributor_id`** (§10) — **DECIDED: preserved**, wiring deferred to a future Public Identity Projection decision.
6. **Reality Stream "מאת" credit** (§10) — **DECIDED: provenance preserved, visible display is a deferred Projection/UI choice**, not a Foundation blocker.
7. **Master State §0 reconciliation wording** (§13) — **DECIDED and LIVE this pass** — item 16 + §23.17 written into `SOD1820_MASTER_STATE.md`.
8. **Application/UI-copy localization roadmap status** (§9) — **DECIDED: EXTENSION POINT NOW**, under one Localization/Representation Governance shared with `content_translation_law`; not built.

All 8 are now applied. Item 3's *code fix* (not the decision itself) is the one item with follow-on implementation work still open — tracked, not blocking (§17).

## 16. FOUNDATION EXPANSION GATE — CLASSIFICATION SUMMARY (pass 3: all MUST-NOW items closed or reclassified)

| Finding | Pass-2 classification | Pass-3 resolution |
|---|---|---|
| Document-level `dir` ownership (index.html) | MUST FOUNDATION NOW | **CLOSED** — ownership named (§8.1), self-evident (single existing mechanism), no ZURIEL decision required beyond accepting this contract |
| Physical vs. logical CSS properties, `Navbar.jsx` dropdowns | MUST FOUNDATION NOW | **CLOSED** — convention declared (§8.2, logical properties canonical, adopt-when-touched), `Navbar.jsx` named as tracked risk, not blocking |
| `dir="ltr"` islands (Marquee/HumanDateInput/dates) | EXTENSION POINT NOW | unchanged — already correct pattern |
| Directional arrow glyphs | EXTENSION POINT NOW | unchanged |
| Hebrew-only date/number formatting | MUST FOUNDATION NOW | **CLOSED, DECIDED** (§8.5, §15 item 4) — stays Hebrew-first, locale-parameterization = Extension Point |
| SEO/hreflang | LATER | unchanged |
| Content vs. UI-copy translation split | MUST FOUNDATION NOW | **CLOSED, DECIDED** (§9, §15 item 8) — one governance, two domains, EXTENSION POINT NOW |
| Person/Account/Contributor/Research-provenance identity roles | MUST FOUNDATION NOW (documentation) | **CLOSED** — pattern documented (§10), self-evident, no ZURIEL decision required beyond acceptance |
| `identity_architecture_law` CLAUDE.md-only status | MUST FOUNDATION NOW (recommendation) | **CLOSED, DECIDED, LIVE** (§10, §15 item 1) — promoted to `nodes` |
| Design token system (`theme.js`+`palette.js`+`themeMode.js`) | MUST FOUNDATION NOW (ownership only) | **CLOSED** — ownership named (§11), self-evident |
| `ui.jsx` Card/Modal/Drawer gap | EXTENSION POINT NOW | unchanged |
| Shared 320/360/390 breakpoint utility | EXTENSION POINT NOW | unchanged |
| `BrandTicker` duplicate marquee | MUST FOUNDATION NOW (flag only) | **DECIDED** (§11, §15 item 3) — no grandfathering, must fix; **code fix itself remains OPEN/FUTURE**, tracked as the one non-blocking follow-up |
| Accessibility (aria/keyboard/semantic elements) | EXTENSION POINT NOW | unchanged |
| Touch-target/font-size (16px/44px) | HUMAN-GATE CANDIDATE | **DECIDED as principle** (§12, §15 item 2) — approved, owning law still an open Extension Point (not blocking) |
| Reduced-motion coverage | EXTENSION POINT NOW | unchanged |
| Applicability/scope taxonomy (`surface_scope`/`access_scope`/`lifecycle_class`) | EXTENSION POINT NOW | unchanged — not part of the approved package, remains proposed only |
| Acceptance Evidence → `decision_ledger` reuse | EXTENSION POINT NOW / HUMAN-GATE CANDIDATE | unchanged — not part of the approved package, remains PROPOSED |
| Master State §0 governance wording | MUST FOUNDATION NOW | **CLOSED, DECIDED, LIVE** (§13, §15 item 7) — §0 item 16 + §23.17 written |

**Net result:** every row that was MUST-FOUNDATION-NOW is now either CLOSED (self-evident ownership naming, accepted by virtue of this contract's approval) or DECIDED (an explicit ZURIEL ruling, applied). Zero rows remain open-and-undecided. Several DECIDED rows still have open *implementation* follow-ups (BrandTicker's code fix, a future owning law for touch-targets, future locale-parameterization) — these are EXTENSION POINT/FUTURE work, not Foundation blockers, matching precedent (`research_intake_foundation_contract`, `person_foundation_contract` both close at contract-level while implementation details stay open).

## 17. FOUNDATION VERDICT

**FOUNDATION SUFFICIENT — CONTRACT LEVEL.**

Pass 2 correctly held the verdict at NOT SUFFICIENT while 9 MUST-FOUNDATION-NOW items sat open — declaring sufficiency with unresolved MUST-NOW items would have contradicted `foundation_closure_protocol_v1`'s own CLASSIFY step. That gate has now been satisfied honestly, not talked around: ZURIEL reviewed and decided all 8 Human-Gate items (§15, `work_log` id `f4811264`), and every row in §16's Foundation Expansion Gate table is now either **CLOSED** (self-evident ownership naming this contract itself settles) or **DECIDED** (an explicit ZURIEL ruling, applied and in several cases written live to `nodes`/`project_codex`/Master State this pass). Zero rows remain open-and-undecided.

**What "sufficient" means here, precisely:**
- The governance *meta-model* — the Canonical Ownership Matrix (§3), the Experience Law lifecycle (§4), and the reuse pattern for `nodes`/`project_codex`/`decision_ledger` with zero new schema — is proven via the `mobile_acceptance_law` worked example (§14) and matches four prior precedent contracts (research-dna, corpus admission, research intake, person foundation).
- The domain-content questions this crosswalk surfaced (locale/RTL ownership, identity-role documentation, design-token ownership, and the 8 Human-Gate items) are now **closed at the decision level**.
- A handful of DECIDED items carry **open implementation follow-ups** that are explicitly not Foundation blockers, matching precedent exactly: `BrandTicker.jsx`'s code fix (decided, not yet coded), a future owning law for the 16px/44px touch-target principles (approved, ownership TBD), and future locale-parameterization of date components (Extension Point, not built). Contract-level closure while implementation details remain open is the same shape as `research_intake_foundation_contract`'s `FOUNDATION SUFFICIENT AFTER SECURITY` and `person_foundation_contract`'s `FOUNDATION SUFFICIENT — CONTRACT LEVEL`.

**Not yet done, and explicitly out of scope for a contract-level closure:** the `BrandTicker` code fix, any new Accessibility law, any locale-parameterization build, any UI-copy i18n system. These are named, owned (by decision if not yet by a specific law), and trackable — which is the entire point of this Foundation existing.

## 18. IMPLEMENTATION STATE

- **Implemented:** this document (3 passes) + live crosswalk research + DB/docs writes below.
- **Committed:** YES — `f521c97a` (pass 1), `633c709a` (pass 2), pass 3 commit follows this write.
- **Pushed:** YES, branch `claude/experience-governance-foundation-v1-1ki2s6`.
- **PR:** `#234`, open, base `main`.
- **Merged:** **NO.**
- **Deployed:** **NO.**
- **Live verified:** N/A (docs/DB-governance only; nothing in the deployed app to verify — no application code touched).
- **`nodes` writes (LIVE):** `rule_id='identity_architecture_law'` (new row, `rule_version=1`, `is_active=true`) · `rule_id='experience_governance_foundation_v1_law'` (new row, `rule_version=1`, `is_active=true`).
- **`project_codex` writes (LIVE):** `slug='experience_governance_foundation_v1'` (new row, `category='architecture'`, `priority=1`).
- **Master State writes (LIVE):** `SOD1820_MASTER_STATE.md` §0 item 16 (additive) + new §23.17 section + footer provenance paragraph.
- **Roadmap writes (LIVE):** one additive status blockquote in the Strategic Foundation Order chain; `ACTIVE_NOW` unchanged.
- **Explicitly NOT done:** no merge, no deploy (per ZURIEL's direct instruction to stop before both, pending GPT re-cross-verification), no application code changes, no schema/migration.

## 19. SUPERSESSION & PROVENANCE

This document supersedes nothing — it is the first Experience Governance Foundation Contract, now `APPROVED` (Human-Gate ZURIEL, `work_log` id `f4811264`) and canonical via `project_codex.slug='experience_governance_foundation_v1'` (live regardless of this `audits/` file's own merge state, per this contract's own §3 rule). Future passes correcting or extending it should follow the `research_dna_v1_foundation_contract` precedent: in-body "§N correction, <date> (pass N)" markers, never silent rewrite, full prior text preserved — this document's own pass-1→2→3 revision history (top of file) already follows that convention. Full provenance chain: `work_log` ids `b26475aa` (BEFORE) → `c3ce5850` (pass 1 AFTER) → `86daaade` (GPT review) → `5a4b6756` (pass 2 AFTER) → `f4811264` (ZURIEL approval, 8 decisions) → this pass's closing AFTER memo (written immediately following this commit, for GPT re-cross-verification).

---

*Foundation → Projection → Experience. Preserve capability, truth and provenance — not necessarily the legacy interface. Rank, Don't Duplicate. Automation where deterministic. Human Gate where judgment is required.*
