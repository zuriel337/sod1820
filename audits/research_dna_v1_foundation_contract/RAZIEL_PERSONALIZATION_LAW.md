# SOD1820 — RESEARCH PREFERENCE & RAZIEL PERSONALIZATION LAW
### Companion to RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md · actor=CLAUDE · 2026-08-22 · tenth pass on PR #166

**This is a CONTRACT REQUIREMENT, not authorization to implement a new personalization engine during PR #166 closure** — Tzuriel's own closing line, restated here first and binding for the whole document. Nothing below is built, migrated, or activated. **0 DB writes except the single closing `work_log` memo** (shared with the Foundation Contract's Part III memo).

**Why this is a separate file, not a new section of the Foundation Contract:** Raziel is a large, distinct subsystem with its own already-locked product law (`raziel_companion_layer_law`, `personal_command_center_law`, `raziel_response_contract`, and four more — see §3 below), its own live config/memory tables, and its own future build track. Folding a full personalization law suite into the Foundation Contract would inflate an already-long document past the point of easy reference — the same size/distinctness judgment call that already produced `CORPUS_APPROVAL_LIFECYCLE.md` and `METHOD_LIFECYCLE_ALIGNMENT.md` as separate companion files rather than more sections of the main contract. `RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md` §26's intro cross-references this file rather than duplicating it.

---

## 1. THE GOVERNING PRINCIPLE

> **SOD1820 Research DNA must support personalization and researcher preference signals across the One Tree.**

Everything below elaborates this one sentence. It is additive to, and constrained by, the same architecture Part I/II/III of the Foundation Contract already lock down — most importantly `unified_graph_law`'s "one tree, one graph, no parallel systems" (CLAUDE.md) and this document's own §7 (One Tree Law) below, which forbids a second personalization tree growing alongside it.

## 2. EXISTING NUMBER PAGE PROMOTE/DEMOTE/RANKING — MUST BE PRESERVED

> Existing explicit Number Page researcher controls — including manual promotion/demotion, ordering/ranking and comparable curator actions — must be preserved and treated as potential research-preference signals rather than discarded during Research DNA migration.

This section performs the crosswalk Tzuriel explicitly required before any implementation: **"crosswalk the existing Number Page promote/demote/ranking mechanism and any existing user-preference/Raziel context infrastructure. Reuse existing structures where possible; no new schema until the live structures are proven insufficient."** Findings, live-verified this pass (schema reads + code reads, not new research):

### 2.1 The existing promote/demote/ranking mechanism — confirmed live

**`gematria_words.lead_rank`** (smallint column, live-verified this pass) + the **`admin_set_lead_ranks`** RPC (`src/lib/supabase.js` line ~3718: *"שמירת סדר-המובילים (lead_rank) למספר — גרירה-ושחרור של מנהל... מנהל בלבד (נבדק בשרת ב-admin_set_lead_ranks)"*) + the **`LeadOrderEditor.jsx`** component (drag-and-drop UI, `promoteSelected()` handler, admin-only) is exactly the "Number Page promote/demote/ranking mechanism" Tzuriel's instruction refers to. It is:

- **Explicit, deliberate, curator-driven** — a genuinely high-confidence signal in the vocabulary §4 below defines, not inferred.
- **Global, not per-user.** `lead_rank` orders which phrases lead a number's story-top display *for every viewer* — it is a single ranking on a shared `gematria_words` row, admin-write-gated (`admin_set_lead_ranks` checks admin server-side), not a per-researcher preference. This is the single most important finding for §5/§6 below: **the existing mechanism is a Global Knowledge curation tool, not a User Preference Layer.** It answers "what should everyone see first for this number," not "what does this researcher care about."
- **Already exactly what §4.4/§4.6/§10's "Access ≠ Classification ≠ Approval" discipline expects:** `lead_rank` sits alongside `is_verified`/`visibility_tier` as one more independently-set field on the same row — it does not redefine a phrase's gematria value, verification state, or access tier; it only orders display. This is a clean, pre-existing precedent for "ranking changes what's shown first, never what's true" — the exact discipline §5's Preference≠Truth law needs, already proven out in production.

**Disposition: preserve exactly as-is.** Nothing in this document asks for `lead_rank`/`admin_set_lead_ranks`/`LeadOrderEditor.jsx` to change, be renamed, or be migrated. Per §2's own instruction ("must be preserved and treated as potential research-preference signals rather than discarded") and Tzuriel's Zuriel Researcher Context idea (§6 below), Zuriel's own `lead_rank` actions are a natural, ready-made input the moment Raziel's Zuriel-specific context (§6) is ever built — no new schema is needed to capture *that* Zuriel promoted/demoted a given phrase; it is already recorded, with a real timestamp path via `gematria_words.updated_at` (confirmed live this pass, per §4.1 of the Foundation Contract's own schema check) even though `lead_rank` itself carries no dedicated history table.

### 2.2 Existing per-user preference/Raziel-context infrastructure — confirmed live

Three more structures, live-verified this pass, are directly relevant and were not previously connected in this contract chain:

- **`research_items`** (table, live-verified columns this pass: `id, user_id, bucket, entity_type, entity_ref, title, link, metadata jsonb, created_at`) — the `research_workspace_law`-mandated "Research Bus" store (➕ הוסף למחקר / ⭐ שמור), unifying what the law calls `research_items` with `bucket` values `cart/library/draft/favorite`. **This is already a per-user (`user_id`-keyed), explicit-action preference store** — a researcher adding an item to their "active research"/favorites is precisely one of §4's Explicit Research Signals (a deliberate save/pin action), already live, already schema-complete for that purpose. Anonymous use falls back to `localStorage`, per `research_workspace_law`'s Local-first principle — also already the correct pattern for §7/§8 below (durable explicit signals first, no heavyweight new engine).
- **`agent_user_memory`** (table, live-verified columns this pass: `id, user_ref, channel, agent, topic, content, data jsonb, status, source_table, created_at, updated_at, memory_type, source, confidence, visibility, memory_scope`) — a general-purpose, already-live, per-user (`user_ref`), per-agent, scoped memory store with its own `confidence`/`visibility`/`memory_scope` fields. This is materially close to what a future Raziel personalization layer would need to record behavioral/contextual signals without a new table: it already has the shape (`memory_type`, `confidence` — distinguishing strong vs. weak signals exactly as §4 below requires) and the scoping (`memory_scope`, `visibility` — exactly as §7 below requires for keeping personal context from leaking into global knowledge or another user's profile).
- **`raziel_config`** (singleton, server-only table, confirmed live via `supabase/migrations/20260808_raziel_config_step1.sql`) — this is Raziel's own **global behavior configuration** (routing/model/prompt policy), explicitly **not** user-specific. Named here only to rule it out as a personalization-signal home — it is the wrong table for per-researcher preference, by its own designed singleton shape (`id int primary key default 1`).

### 2.3 Existing locked product law already describing much of this vision

Two **already-live, already-locked `nodes type='rule'` rows** (both confirmed active this pass) describe a large part of what Tzuriel's Raziel Personalization decision asks for — this is not new territory, it is a contract-layer formalization of policy that already exists at the product-rule layer, not yet built in code:

- **`raziel_companion_layer_law`** (locked 23.7.2026): its "Layer 3 — ליווי יזום" (proactive companion) is, nearly verbatim, Tzuriel's **Raziel Research Context** section below — the rule's own example, *"נוספו 2 מחקרים שמתחברים ל-958"* / *"אתה חוזר ל-1820 — לפתוח מסלול?"* ("2 new studies connect to 958" / "you keep returning to 1820 — open a research path?"), is exactly the "candidate findings deserving Human review" / "numbers/topics/worlds related to the researcher's demonstrated interests" behavior Tzuriel's decision describes. Its "Layer 2" context-from-the-page principle ("context comes from the page, not from the user") is a live precedent for exactly the kind of lightweight, deterministic-first signal-consumption §8 (Progressive Personalization) below asks for.
- **`personal_command_center_law`** (locked, live): names "🔬 המעבדה שלי" ("my lab" — "not recent searches but what I'm researching right now: pick up where you left off... active studies... last number/name/hint/convergence") and "🤖 הסוכן האישי" ("the personal agent — not a chat but a personal researcher who knows my world... opens with 'I noticed you researched 1820, 358 and messiah in the last 3 days — found a new connection'") as the two of its five described worlds most relevant to Raziel personalization. It also already names the gap this document inherits: *"פערי-תשתית: אין profiles (דרגה/קרדיטים/XP/רצף) · אין follows · אין community_hints"* ("infrastructure gaps: no `profiles` table for tier/credits/XP/streak, no follows, no community hints") — confirming that the *product vision* is already locked while the *supporting schema* is explicitly still pending, exactly the state this document also finds for personalization specifically.

**`platform_tiers_law`, `identity_architecture_law`, `command_center_law`** — named in the orchestrator's own read-list for this pass — were checked live this pass and are **not currently live `nodes type='rule'` rows** (only `research_workspace_law` and the Raziel/personal-command-center rules above returned). They exist as CLAUDE.md prose (the project's own onboarding document) describing an intended architecture, not yet promoted to locked DB rules. This is a factual finding, not a criticism — noted here so a future pass does not assume these names resolve to a `rule_id` they don't yet have.

### 2.4 Crosswalk conclusion — what exists vs. what is a genuine gap

| Need (from Tzuriel's decision) | Exists today? | Where |
|---|---|---|
| Explicit curator promote/demote/ranking (global) | **Yes, live** | `gematria_words.lead_rank` + `admin_set_lead_ranks` + `LeadOrderEditor.jsx` — admin/Zuriel-scoped, not per-researcher |
| Explicit per-user save/pin/prioritize | **Yes, live** | `research_items` (`user_id`, `bucket`) — per `research_workspace_law`'s Research Bus |
| Per-user scoped agent memory with confidence/visibility | **Yes, live, general-purpose** | `agent_user_memory` (`user_ref`, `memory_type`, `confidence`, `memory_scope`, `visibility`) |
| Product vision for Raziel proactive recommendation | **Yes, already locked as law, not yet built** | `raziel_companion_layer_law` §Layer 3, `personal_command_center_law` §🤖 הסוכן האישי |
| A `profiles` table (tier/credits/XP/streak) | **Confirmed gap** (named in `personal_command_center_law` itself) | Not built — `platform_tiers_law`'s own text in CLAUDE.md says the same |
| A dedicated per-user "preference/ranking score" distinct from `agent_user_memory`'s general shape | **Genuine open question, not yet decided** | See §9 below — `agent_user_memory` is a plausible reuse candidate, not confirmed sufficient |
| Behavioral-signal capture (methods opened, Cross paths explored, worlds visited) | **Partial** — `events`/`visitor_events` exist for analytics (per `els_single_engine_law`'s own reference to `track("els")→events+visitor_events`) but are not confirmed wired to any Raziel-consumable personalization read path | Genuine gap for the *Raziel-consumption* direction, even though raw event capture exists elsewhere in the system |

**Conclusion, per Tzuriel's own instruction ("reuse existing structures where possible; no new schema until the live structures are proven insufficient"): no new table is proposed by this document.** `research_items` and `agent_user_memory` together already cover the shapes §4/§9 below need (explicit signals; scoped, confidence-rated behavioral/contextual memory) closely enough that a future build pass should attempt reuse first and only propose new schema if a concrete implementation attempt finds a real gap — not decided or built here.

## 3. EXPLICIT RESEARCH SIGNALS

> Deliberate actions such as promote/demote, pin, prioritize, researcher ranking, approval/rejection and explicit interest choices are high-confidence preference/context signals.

Maps directly onto the live mechanisms found in §2: `lead_rank`/`admin_set_lead_ranks` (promote/demote, today admin-only), `research_items` (pin/save, per-user, already live), and any future explicit "I'm interested in X" action. **High-confidence** is the operative qualifier — these are the signals a future Raziel personalization layer should weight most, and the ones safe to act on with the least additional inference.

## 4. BEHAVIORAL SIGNALS

> Repeated research behavior — methods opened, Cross paths explored, worlds/topics visited, findings revisited — may contribute weaker personalization signals. Behavioral inference must never be treated as an explicit user decision.

**Weaker, never conflated with §3.** This is the same discipline as `raziel_companion_layer_law`'s own "context comes from the page, not the user" principle, generalized: observing that someone repeatedly opens a method or revisits a number is evidence of interest, not a decision the person made about their preferences — exactly parallel to how §27.5 (Foundation Contract) forbids treating a Computed Match as a Canonical Finding. **No mechanism exists today that reads raw behavioral events (`events`/`visitor_events`) into a Raziel-consumable signal** — this is the clearest genuine gap named by the §2.4 crosswalk, left open, not built here.

## 5. THE GOVERNING NON-EQUIVALENCES

> Preference ≠ Truth. Preference ≠ Fact. Behavior ≠ Approval. Ranking ≠ Canonical Status. Recommendation ≠ Human-Gate. Personalization may change ordering, recommendations and research navigation. It must never silently change mathematical results, provenance, verification state or canonical status.

Five one-liners, each already the personalization-layer instance of a non-equivalence this contract chain has established elsewhere — stated together here for reuse, not because they are new ideas invented by this document:

- **Preference ≠ Truth / Preference ≠ Fact** — the personalization-layer form of §1's `Claim ≠ Fact` and §27.5's `Computed Match ≠ Canonical Finding` (Foundation Contract).
- **Behavior ≠ Approval** — the personalization-layer form of `CORPUS_APPROVAL_LIFECYCLE.md`'s `Engine Verified ≠ Corpus Approved` — watching, clicking, or revisiting something is not a Human-Gate action.
- **Ranking ≠ Canonical Status** — the personalization-layer form of §19/§27.7 (Foundation Contract) `Convergence ≠ Fact ≠ Canonical Interpretation`.
- **Recommendation ≠ Human-Gate** — states directly what §6 below makes explicit for Raziel specifically: a recommendation engine surfacing something is never itself an approval action.

**What personalization is allowed to touch:** ordering, recommendations, research navigation (§27.6's "Rank, Don't Hide" — Foundation Contract — is the direct sibling principle). **What it must never touch, silently or otherwise:** mathematical results, provenance, verification state, canonical status. This is the same "Access tier ≠ mathematical truth" invariant (§4.6, Foundation Contract) extended to a new axis (personalization) rather than a new rule invented from nothing.

## 6. RAZIEL RESEARCH CONTEXT

> Raziel should eventually be able to consume authorized Research DNA + explicit preference signals + appropriate behavioral context to recommend: potentially relevant findings; methods worth opening; Cross paths worth investigating; numbers/topics/worlds related to the researcher's demonstrated interests; candidate findings deserving Human review. Raziel remains an orchestrator/recommender. It does not autonomously promote research to canonical status.

Per §2.3 above, this is **already the described behavior of the live, locked `raziel_companion_layer_law`** (Layer 3, proactive companion) and `personal_command_center_law` (🤖 הסוכן האישי) — this document does not invent a new Raziel capability, it confirms that Tzuriel's new decision is consistent with, and formally grounds in the Research DNA contract, a vision already locked at the product-rule layer. The one addition this decision makes explicit that the prior rules did not spell out as precisely: **"candidate findings deserving Human review"** as a named Raziel output — i.e. Raziel's recommendations can point *at* the Human-Gate door (surfacing something worth a curator's attention) without ever walking through it itself. This composes directly with §27.5's `Computed Match ≠ Canonical Finding` (Foundation Contract) and `raziel_full_answer_and_route_law` (live rule, "מענה מלא לכל אדם + התראת-ניתוב למטטרון" — full answer to the person + a routing alert to Metatron) — Raziel already has a live "flag something for the system/curator layer" pattern; a future build should reuse that pattern for "candidate findings deserving Human review" rather than invent a second one.

## 7. RESEARCHER-SPECIFIC PERSONALIZATION & ONE TREE LAW

> The architecture should support researcher/user-specific preferences without contaminating global canonical knowledge or another user's profile.
>
> **GLOBAL KNOWLEDGE ≠ USER PREFERENCE LAYER:** Shared canonical facts remain shared. Personal ranking/context remains scoped to the authorized researcher/user.
>
> **One Tree Law:** Do not create a parallel personalization/research tree. Preference/context is an overlay on the existing One Tree / Research DNA / Raziel architecture.

**This is the single most important architectural constraint in this document, and the §2.1 finding makes it concrete rather than abstract:** `lead_rank` is *already* proof that SOD1820 can host a ranking mechanism on the same row as the canonical data without contaminating it — it is a field on `gematria_words`, not a parallel table, and it changes *display order only*, never `ragil`/`is_verified`/any canonical value. A future per-user preference layer should follow the identical discipline at the user-scope level: an overlay (via `research_items`/`agent_user_memory`, reused per §2.4, or a future, still-undecided extension of them) that never writes into or forks the canonical `gematria_words`/`nodes`/`edges`/`research_objects` structures Research DNA v1 already governs. This is `unified_graph_law`'s own "one tree" principle (CLAUDE.md) at the personalization layer, and it is why §2's crosswalk instruction ("reuse existing structures... no new schema until proven insufficient") is not merely an efficiency preference — it is the mechanism by which the One Tree Law stays true in practice, not just on paper.

## 8. ZURIEL RESEARCHER CONTEXT

> ZURIEL's explicit curator/research actions may form a privileged Research Context for Raziel recommendations, while still remaining distinct from canonical decisions unless an explicit Human-Gate action records such a decision.

Directly grounded in §2.1's finding: Zuriel's own `lead_rank` promote/demote actions (via `LeadOrderEditor.jsx`, already admin-gated) are exactly the kind of "explicit curator action" this section describes as a privileged signal source — already recorded, already attributable (admin-only write path), already distinct from canonical decisions (a `lead_rank` change reorders display, it does not itself change `is_verified`/`ragil`/any canonical field, per §2.1). **A future Raziel build could treat "Zuriel promoted phrase X on number Y" as a strong context signal without any new schema** — the action is already captured in the existing `lead_rank` value and its row's `updated_at`; what's missing (§9) is a consumption path, not a capture mechanism.

## 9. PROGRESSIVE PERSONALIZATION

> Do not require heavyweight AI inference on every interaction. Prefer durable explicit signals and lightweight deterministic preference/ranking first. Raziel/AI synthesis may consume those signals at appropriate research moments. Personalization architecture must not materially degrade Number Page, Cross Engine or corpus-search performance.

This is the direct personalization-layer analog of `research_workspace_law`'s own **Progressive Disclosure** principle (three layers: new/advanced/professional, "the system grows with the user") and **Local-first** principle (read/search/save work without login; sync is the only thing that needs an account) — both already live, already governing the Research Workspace UI this personalization layer sits inside. Concretely: **§3's Explicit Research Signals (already durable, already deterministic, already live via `lead_rank`/`research_items`) should be the first thing any future Raziel personalization consumes — before any new behavioral-inference or AI-scoring layer is built**, exactly matching Tzuriel's own ordering ("prefer durable explicit signals... first"). The performance constraint (must not degrade Number Page/Cross Engine/corpus-search) is the personalization-layer instance of `research_workspace_law`'s mobile-first, dense-but-fast mandate — not a new constraint invented here.

## 10. WHAT THIS DOCUMENT LEAVES OPEN — genuine gaps, not decided or built

1. **A behavioral-signal consumption path for Raziel** (§4/§2.4) — raw events (`events`/`visitor_events`, per `els_single_engine_law`'s own reference) exist for analytics; no confirmed mechanism reads them into a Raziel-consumable weak-signal store. `IMPLEMENTATION DECISION REQUIRED`, same disposition as the Foundation Contract's other open items — not a schema gap necessarily, possibly a wiring gap; not confirmed either way by this pass.
2. **Whether `agent_user_memory` is sufficient for per-user explicit+behavioral preference storage, or whether a dedicated `research_preferences`-shaped structure is eventually needed** — per §2.4's crosswalk conclusion, **not decided here**; Tzuriel's own instruction is to attempt reuse first, and no implementation attempt has been made by this docs-only pass to find out whether reuse actually works in practice.
3. **`profiles` table (tier/credits/XP/streak)** — already a named, confirmed gap in the live `personal_command_center_law` rule itself, inherited here as context for any future personalization build that wants to key signals off tier, not newly discovered by this document.
4. **Whether/how `raziel_companion_layer_law` Layer 3's proactive-companion behavior and `personal_command_center_law`'s 🤖 הסוכן האישי should be unified into one build, or built separately** — both already describe overlapping territory; a future implementation pass should read both rules together before choosing a build order, not decided here.
5. **The exact mechanism for "candidate findings deserving Human review" (§6) to reach a curator** — `raziel_full_answer_and_route_law`'s existing Metatron-routing pattern is named as a plausible reuse candidate, not confirmed sufficient or chosen.

None of the above blocks this document's status as a contract requirement — exactly as the Foundation Contract's own §6/§29 name comparable open items without treating them as blockers to the contract's own readiness.

---

*Governance: docs-only companion document. 0 DB writes except the single closing `work_log` memo, shared with `RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md` Part III. This document is a CONTRACT REQUIREMENT — durable law describing what Research DNA / Raziel personalization must eventually satisfy — not authorization to implement a personalization engine, new schema, or new Raziel behavior during PR #166 closure. The crosswalk in §2 is investigation/documentation only: no code was changed, no table was created, no existing mechanism (`lead_rank`, `research_items`, `agent_user_memory`, `raziel_config`) was modified.*
