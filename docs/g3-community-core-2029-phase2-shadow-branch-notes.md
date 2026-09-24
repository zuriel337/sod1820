# G3 Community Core 2029 Phase 2 — branch-only notes

Status: BRANCH-ONLY. Not merged, not deployed, no live DB write, no live DB migration applied,
no OpenWeb/chat/public UI/route change, no real archive import. Assignment
`work_log.id=dd097ffa-1689-4d97-ad29-b3144c4d38ed`
(`task_key=G3_COMMUNITY_CORE_2029_PHASE2_SHADOW_V1`),
`release_authorization_state=BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_OPENWEB_TOUCH_NO_MERGE_NO_DEPLOY_NO_CUTOVER`.

Continues Phase 1 (`work_log.id=7db17ff0-cce5-4d17-9bbb-9b1ad7ee9dae`,
`task_key=G3_COMMUNITY_FOUNDATION_RUNTIME_V1`) from its exact verified head
`6404343f0007f3c4dec5b2031de27510e19eb233`, stacked on this session's branch
`claude/awesome-dirac-hloi6x` (reset to that head, then built forward — see git log).
`origin/main` verified at start of this session: `29e1029522100298846e94b6f24d90973c87aaf0`
(matches the assignment's own `verified_facts`; no DRIFT there).

## 1. Owner resolution and open DRIFT carried forward from Phase 1

Same owner composition as Phase 1 plus the four additional laws this assignment names
(`experience_governance_foundation_v1_law v7`, `research_workspace_law v4`,
`raziel_companion_layer_law v3`, `research_strategy_layer_law v15`). Phase 1's own DRIFT note
(§1 of its branch notes) — `SOD1820_MASTER_OWNER_INDEX.md` on `origin/main` showing
`research_intake_foundation_contract_law v9 ACTIVE` while the live `nodes` table has v13 as the
newest active version, and `research_contribution_law v9` being live-`is_active=false` with a
`LEGACY_RETIRE_OR_SUPERSEDE` compaction note pointing at `docs/research-studio-v1-contract.md`
— was **not re-litigated here**; it is still open, still a Human-Gate-adjacent naming decision,
not something this session should resolve unilaterally. This branch reuses the same reconciled
baseline Phase 1 used (extend the existing `research_contributions` / `contributors` /
`contribution_links` / `decision_ledger` substrate), for the same reason: it is the only live
artifact that actually specifies this domain's technical shape.

## 2. Semantic search owner — gap reported, not invented

Verified live: `pgvector` (`vector` 0.8.2) is installed, and exactly two tables carry an
`embedding vector` column — `discoveries` and `words` — but **neither has a matching
similarity-search RPC to extend** (no `match_*`/`*_embedding_search` function exists in
`public`). There is no vector-based "semantic search owner" over community text to extend.

What *does* exist and *was* extended (`EXTEND_EXISTING`, not `GENUINELY_NEW_DOMAIN`): the
live `chat_search_facts(p_query, p_limit)` function's tokenize-and-`to_tsvector` pattern.
`community_search_facts` (migration §2) reuses that exact pattern — same tokenizer shape, same
`ts_rank` ordering — scoped to `research_contributions.body where status='approved'`. This is
full-text search, not semantic/embedding search. If real semantic (embedding) search over
community text is required, that is a genuine gap needing a Human-Gate decision (add an
`embedding` column to `research_contributions` + a new match RPC, modeled on `discoveries`'
column but still with no existing RPC pattern to copy) — flagged here, not built.

## 3. What was built (branch-only, all four items below are additive-only SQL, none applied live)

`supabase/migrations/20260923200000_g3_community_core_2029_phase2_shadow.sql` (NOT applied to
project `linswmnnkjxvweumprav` — committed for Phase-3 review only):

1. `community_stream_projection(...)` — read projection over `research_contributions` +
   `contributors`, re-applying `rc_public_read`'s exact live predicate
   (`status='approved' OR author_user_id=auth.uid()`). No `intent`/`origin`/classifier field is
   selected (verification: "classifier invisible to ordinary visitor"). No `contributors.email`
   is selected (verification: "PII remains private; public projections cannot select/export
   email"). `p_root_target_type`/`p_root_target_id` reuse the existing `target_type`/`target_id`
   columns as the projection hook — the same conversation can be scoped to Post/Number/Person/
   World/Home later with zero duplicated storage, because that polymorphic pair already exists.
2. `community_search_facts(...)` — full-text search extension, see §2.
3. `fn_raziel_community_intel_scoped(...)` — extends `fn_raziel_research_intel_scoped`'s exact
   authority-check pattern (trusted-server / authenticated-caller / explicit denial reasons) for
   a Raziel Community Partner read seam: `new_since_last_visit_count`, `recent_thread_ids`, and
   a `canonical_engine_handoff` pointer that names `number_dossier` without computing or
   verifying anything itself. No new persona/memory/truth store — it is one more scoped read
   over the existing `research_contributions` table and the existing Raziel authority pattern.
4. `contributors_claim_legacy(p_contributor_id)` — the identity bridge claim/relink path.
   `SECURITY DEFINER`; requires an authenticated caller (`auth.uid()`) whose **verified**
   `auth.users.email` exactly matches the target `contributors.email`, and refuses if the row is
   already claimed (`user_id is not null`) or has no email at all. Never creates an `auth.users`
   row. The exact same three-check invariant is unit-tested in pure JS
   (`scripts/g3-community-foundation-runtime/identityBridge.mjs`,
   `resolveLegacyClaim` — 5 tests, all passing) as the function's documented twin, since the SQL
   itself cannot be executed live in this branch (see §6).

Realtime: **not enabled.** Verified live — `supabase_realtime` publication currently carries
only `discoveries` and `post_share_counts`; `research_contributions` is not a member, confirming
Phase 1 §6's read still holds. Per Phase 1's own recommendation, this migration documents (but
does **not** apply) the RLS-safe path: Realtime Broadcast from a trigger/function reusing
`community_stream_projection`'s exact predicate, not raw table replication — because table
replication is not RLS-aware in every client configuration and `research_contributions` carries
`pending`/`hidden` rows. Confirming RLS-aware Realtime against the live Supabase version in use
is explicit Phase 3 work, not assumed here.

JS seams (`scripts/g3-community-foundation-runtime/`), all pure/no DB connection:

- `identityBridge.mjs` — pure twin of the SQL claim invariant above (§ above).
- `classificationSeam.mjs` — extends Phase 1's single-label `classifyIntent` stub into
  multi-label classification (a message can be שאלה + מקור + גימטריה at once; a reply is always
  forced to תגובה only, never multi-labeled — preserving the same live thread-count/SEO
  invariant Phase 1 already protects) plus number/source/internal-link extraction and an
  uncertainty score. `toDecisionLedgerCandidate` maps a classification onto the **existing**
  `decision_ledger` table's own columns (`candidate`, `ai_model`, `ai_score`, `ai_reasoning`,
  `status`) — no new metadata table. It always emits `status:'pending'`,
  `human_decision:null`, and never a `research_state`/publish/canonical field — automation
  proposes, it never approves or canonicalizes (Truth/Human Gate boundary, tested explicitly).
- `executor.mjs` — extends Phase 1's `planImport` into a bounded, OFF-by-default execution
  layer for the archive import, per the assignment's own "no actual 41,080-row import in this
  task": `runImport()` defaults to dry-run (`execute:false`), and even with `execute:true`
  requires both an exact confirmation-phrase literal
  (`PHASE3_HUMAN_GATE_AUTHORIZED_EXECUTE`) and a caller-supplied `ops` implementation — no
  default DB client is wired in anywhere in this branch, so the executor cannot write anything
  on its own even if invoked.

Client read wrapper (`src/lib/community/razielCommunitySeam.js`) and an isolated Shadow Preview
page (`src/pages/CommunityShadowPreview2029Page.jsx`, route
`/community-shadow-preview-2029`, unlinked from any nav, same "internal preview" convention as
`ExplorerPreviewPage`/`EntityHubPreviewPage`): public label **הקהילה**, one calm freeform
textarea (send button disabled — it never writes), message/reply/♥-reaction language, no
Chat/Forum split, no intent/type chooser, no research jargon surfaced. It calls
`community_stream_projection` through the wrapper above and renders a "not live yet" state
if the RPC 404s — expected until Phase 3 applies the migration, not a bug. It does **not**
replace `/community/chat` or `/forum`, and no existing route/component was changed to reach it.

## 4. Tests

`npm run test:g3-community-core-2029-phase2` — 15 assertions, all passing (verified this
session): identity-bridge match/mismatch/already-claimed/no-email cases, multi-label vs.
forced-reply-label classification, number/source/internal-link extraction, canonical-engine
handoff-not-computation, the Truth/Human-Gate boundary on `decision_ledger` candidates,
uncertainty-on-ambiguous-text, and all four executor gates (dry-run default, wrong phrase,
missing `ops`, and a correctly-gated real run against a caller-supplied in-memory recorder).
Phase 1's own 13 assertions were re-run on this branch and still pass (`npm run
test:g3-community-foundation-runtime`) — no regression.

**Not executable-tested here, by the same constraint Phase 1 stated:** the four SQL functions'
live RLS/authority behavior. No live DB write or migration apply is authorized in this branch.
Each function's predicate was read and reasoned about against the exact live policy/function
text it re-applies (`rc_public_read`, `contributors_read`, `fn_raziel_research_intel_scoped`),
quoted in §3 above, not merely assumed.

`npm run build` could not be run in this session's execution environment — `node_modules` is
not installed and no dependency install was attempted (out of this assignment's scope). The new
`.mjs`/`.js` files were syntax-checked directly (`node --check`, all pass); the new `.jsx` page
was reviewed by hand and follows the exact existing `ExplorerPreviewPage.jsx` shape/import
conventions. This is a real verification gap, stated plainly rather than assumed away — a
Phase 3 session with a working install should run the full build before any further step.

## 5. Explicitly out of scope here (do_not_touch honored)

No change to `src/legacy/legacy.jsx`, `src/lib/openweb.js`, the `openweb-sso` Edge Function,
`/community/chat`, the OpenWeb widget/config, public `/forum` UX, production DB, `main`, Home
cutover, public route cutover, or any merge/deploy. No `auth.users` row is ever created by any
function or script in this branch. No email is ever selected into a public-facing read. The
real 41,080-message OpenWeb export was not fetched or referenced; all reasoning here builds on
Phase 1's already-verified live counts and the synthetic fixtures Phase 1 already committed —
no new fixture data was needed for this phase's additions.

## 6. Recommended Phase 3 (not started)

1. Resolve the `research_contribution_law` active/inactive naming DRIFT (Phase 1 §1, still
   open) — a Human-Gate-adjacent decision, not re-litigated by this session.
2. Apply `supabase/migrations/20260923200000_g3_community_core_2029_phase2_shadow.sql` to a
   **branch/dev Supabase environment first** (never directly to `linswmnnkjxvweumprav` without
   explicit ZURIEL authorization), then re-run the live-RLS verification this branch could only
   reason about statically.
3. Confirm RLS-aware Realtime against the live Supabase version in use; if confirmed, wire the
   Broadcast-from-trigger pattern documented in migration §5 — do not add
   `research_contributions` to the `supabase_realtime` publication directly.
4. `npm install` + `npm run build` + a real browser/Human visual gate on
   `/community-shadow-preview-2029` once the migration is applied to a dev environment, so the
   page can render live data instead of its "not live yet" fallback.
5. If real embedding-based semantic search over community text is wanted (see §2's reported
   gap), that needs an explicit Human-Gate decision before any new column/store is added.
6. Once the real 41,080-message export file is available: run `executor.mjs`'s `runImport` in
   dry-run mode against the real data first (still `execute:false`, still no confirmation
   phrase needed for a dry run), reconcile against Phase 1's already-verified live counts, and
   only then decide, with explicit Human Gate, whether/when to supply a real `ops`
   implementation and the confirmation phrase for an actual write.
