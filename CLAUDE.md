# SOD1820 — Claude Runtime Adapter

> **STATUS:** runtime adapter / pointer only. This file is **not** project truth, a domain contract, a context database, or a second owner map.
> Canonical coordination owner: current active `inter_agent_coordination_law` in Supabase.
> Canonical routing index: `SOD1820_MASTER_OWNER_INDEX.md` on current `origin/main`.
> Canonical Supabase project: `linswmnnkjxvweumprav`.

## 1. Task start — pointers, not a rule dump

For every substantial task:

1. Parse the natural-language request into intent / capability / domain. Use an existing Task Profile only when it helps routing.
2. Resolve the **current canonical owner** from `SOD1820_MASTER_OWNER_INDEX.md` and the live owner/rule infrastructure.
3. Load only that owner plus the **smallest direct dependency set** required by the task.
4. Read recent **relevant** `work_log` / assignments for the active scope.
5. Verify against the live source appropriate to the claim: canonical Supabase, `origin/main`, and Production only when UI/live behavior matters.
6. Execute, verify, and leave a handoff when the work is material.

Do **not** automatically read all rules, all `project_codex`, full Master State, full Roadmap, `AGENT_HANDOFF.md`, broad branch history, or unrelated contracts. Load them only when the resolved task genuinely requires them or when reconciling DRIFT/provenance.

## 2. Fixed operating pointers

Carry only these five bootstrap pointers before routing inward:

- LIVE-FIRST
- ONE TREE / OWNER-FIRST
- FOUNDATION-FIRST
- TRUTH + HUMAN GATE
- COORDINATION + RELEASE SAFETY

These are routing umbrellas, not copied domain law.

## 3. Read budget

- **L1 default:** owner + direct dependency only.
- **L2:** cross-domain work, current-state reconciliation, implementation context, or specialist challenge that can change the decision.
- **L3:** WRITE, architecture/foundation, security/RLS, merge/deploy/release, material DRIFT, or high-impact cross-system work.

For **L2**, use **8–10 artifacts as a practical default target, not a hard safety cap**. An artifact beyond that target should have an explicit reason why reading it can materially change the answer, decision, safety, or current-state reconciliation. If the task genuinely needs more, read more rather than under-read.

Do not load presentation owners merely because a product surface is mentioned. For a semantic/current-state question, Design/System Frame/other presentation contracts are loaded only when presentation, navigation, UI behavior, or visual authority can materially change the requested answer. Conversely, UI/experience work must resolve the relevant presentation owners normally.

The artifact target is an anti-noise heuristic, not a score to optimize. Never skip required truth, security, privacy, release, or owner checks just to stay under a number.

Stop expanding context once owner + dependencies are sufficient to act safely.

## 4. Foundation-maximal product walkthrough standard

When ZURIEL asks how a product/surface should **look, work, or behave in the 2029 system**, do **not** begin by improving the current/legacy surface incrementally.

Start from the **highest coherent product form already justified by the live Foundation**:

1. Resolve the current semantic owners and capabilities.
2. Treat the legacy UI/content structure as capability/provenance evidence only, never as the default architecture.
3. Derive the strongest coherent 2029 North Star that the current Foundation can support if the surface were built from scratch today.
4. Prefer the deeper model when it follows directly from existing Foundation — do not stop at a merely good intermediate redesign because it is easier to describe.
5. Challenge the North Star for missing load-bearing primitives, identity, provenance, truth, time, privacy, replay, authorization or composition semantics. A real redesign-risk gap returns to G2; pure layout/motion/control choices defer to Projection/Experience.
6. Only after the North Star is clear may an intermediate/migration form be described, and it must never be mistaken for the target architecture.

**Foundation-maximal does not mean feature-maximal.** Do not add modules, abstractions or futuristic behavior merely to make the answer feel advanced. “Maximum” means the most capable, coherent form warranted by the current owners and evidence, with One Tree, Truth and Human Gate preserved.

For authored/public content such as Posts, apply the same principle: ask first what role the object plays in One Reality (for example Publication/Research Narrative over live identities/findings/time), not how to decorate the legacy article page.

## 5. Authority split — never collapse these

- **live DB + `origin/main` + relevant Production behavior** = live reality / implementation evidence.
- **current domain owner** = domain semantics / contract authority.
- **`SOD1820_MASTER_STATE.md`** = documented state.
- **`SOD1820_MASTER_ROADMAP.md`** = navigation / priority.
- **`work_log`** = coordination / provenance, not product SSOT.
- **Owner Index** = routing map only.
- **`AGENT_HANDOFF.md`, `project_codex` pointers, this file, prompts, memory, conversation history** = routing/context only.

If these conflict, report **DRIFT** and resolve from live owner/state. Never repair current truth from memory or stale documentation.

## 6. Map language

When ZURIEL says “המפה”, “התוכנית”, “Roadmap”, or “איפה אנחנו בתוכנית”, route to `SOD1820_MASTER_ROADMAP.md` and resolve its current version from `origin/main`; never pin a version in this adapter.

“מצב המערכת” / “מה חי” requires live verification, not Master State alone.

## 7. Owner-first / one tree

Before proposing a new Contract / Law / System / Store / Engine / Registry / Graph / Tree / Context system / Agent system / Ranking system / Research system / global UI owner:

- resolve existing owners live;
- default to `EXTEND_EXISTING`;
- use `SUPERSEDE_EXISTING` or `GENUINELY_NEW_DOMAIN` only with live evidence and preserved history.

Do not create parallel systems to solve local ambiguity.

## 8. Domain work

Do not copy domain semantics into this adapter. Route through the Owner Index and read the current owner.

Examples of routing aliases only:

- `publish_post`, `draft_post`, `post_visual`, `gallery_work`
- `gematria_research`, `els_research`, `source_scan`
- `roadmap_status`, `live_state_check`, `release_gate`
- `ui_experience_work`, `db_write`

For UI / UX / media / visual work, resolve the current Product Visual Language owner before changing presentation. For legacy post/gallery work, also load `legacy_content_protocol` when relevant.

For Gematria / numeric verification, use canonical registered engines/functions/method registry. General-model calculation is never authoritative project output.

## 9. Claude-specific live mechanics

For code/current-state work:

```bash
git fetch origin --prune
git rev-parse origin/main
git status --porcelain
git rev-list --left-right --count HEAD...origin/main
```

- Treat local checkout as local evidence only until reconciled with `origin/main`.
- For a feature branch, verify the base at start and again before merge.
- Never use destructive cleanup (`reset --hard`, `clean -f`, wholesale checkout) on an unknown/dirty tree.
- Build verification: `npm run build` unless the active scope defines a narrower/stronger test.
- For DB-dependent claims, verify canonical Supabase `linswmnnkjxvweumprav` live.
- Production/browser verification is required when the answer depends on actual UI/live behavior.

## 10. Work log / coordination

At session start and before becoming idle after meaningful work, scan recent **current** `work_log` for assignments addressed to CLAUDE and relevant active scopes.

Before WRITE, rescan for overlapping active writers.

**ONE SCOPE — ONE ACTIVE WRITER.** READ_ONLY challenge/cross-verification may run in parallel.

Use one task key across ACK/claim/AFTER. Handoff should preserve:

`actor · from/to · task_key · owner · scope · status · facts_changed · decisions · branch/PR/commit · blockers · open_threads · handoff_to`

Do not require ZURIEL to relay messages between GPT and CLAUDE.

`AGENT_HANDOFF.md` is read when reconciling an actual handoff/provenance issue or when another active pointer specifically routes there. It is **not** a mandatory startup read for every task.

## 11. Truth / Human Gate

Preserve distinctions between Input, Extraction, Calculation, Discovery, Finding, Claim, Evidence, Fact, Interpretation, Recommendation, Decision, Canonical, Published, Visible, and Accessible.

AI may research, calculate through canonical engines, rank and recommend. AI does not independently canonicalize or publish. ZURIEL remains Human Gate.

## 12. WRITE / release safety

Any WRITE requires current live verification, owner resolution, relevant schema/code verification, parallel-writer scan, and an isolated scope.

Keep states distinct:

`DOCUMENTED ≠ IMPLEMENTED ≠ COMMITTED ≠ BRANCH-ONLY ≠ MERGED ≠ DEPLOYED ≠ LIVE ≠ VERIFIED`

Do not merge/deploy/push `main` merely because work is implemented. Release only after explicit ZURIEL authorization such as `תעלה`, and re-run release gates immediately before the action.

## 13. Specialist escalation

When Claude is the specialist/challenger, default to READ_ONLY. A specialist report is evidence, not truth; the primary owner must reconcile it live.

When Claude is primary, use another specialist only if the result can materially change architecture, safety, release, or confidence. Avoid redundant audits.

## 14. Fresh-agent acceptance

This adapter is G1-compliant only if a fresh Claude session, without relying on prior conversation memory, can from a natural-language task:

- resolve the current owner;
- load only minimum dependencies;
- discover relevant work_log context;
- verify the proper live source;
- report stale-pointer conflicts instead of trusting them;
- avoid unrelated bulk reads;
- avoid inventing a parallel owner/system.

For a 2029 product/surface walkthrough, fresh-agent acceptance additionally requires that the agent starts from the **Foundation-maximal North Star**, not from incremental modernization of the legacy surface.

A prompt containing the right words is not proof; G1 closure requires an actual fresh-agent replay recorded in `work_log`/audit evidence.

## 15. Active-tree documentation discipline

The repository may contain extensive history, audits, research notes, drafts and superseded planning. Their existence does **not** make them startup context or authority.

Default classification unless an active pointer says otherwise:

- `docs/` → mixed current/history; read only the exact owner/addendum routed by Owner Index.
- `audits/` → evidence/provenance; never startup authority.
- `planning/` → planning evidence; not current semantics unless explicitly promoted/reconciled.
- `research-notes/` and `research-library/` → source/research provenance; load only for the source/research task that needs them.
- `drafts/` → non-authoritative experiments.
- `docs/archive/`, backups and superseded branches → historical only.

Do not recursively scan these directories to “understand the project.” Resolve the owner first, then open only the specifically required artifact.

Long-term target: the **active documentation tree is minimal and clean** — active spine + current owners/addenda + live operational pointers only. Historical/audit/draft/research provenance remains preserved but is moved out of active routing in bounded cleanup passes after semantic gates stabilize. Never create a new `MASTER`, `FINAL`, system map, owner map or parallel contract merely to summarize old documents.

## 16. Closing rule

Reconciliation before construction · Provenance before recovery · Evidence before interpretation.

Preserve history in git/DB provenance. Do not keep stale domain semantics alive inside the active adapter merely because they once lived here.
