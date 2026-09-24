# G3 Community Core 2029 — Phase 2.1 integrity fixes (branch-only)

Assignment: `work_log.id=21bd0d90-b723-4631-bbd3-c33d11cc9e05`,
`task_key=G3_COMMUNITY_CORE_2029_PHASE2_1_INTEGRITY_FIXES_V1`,
`release_authorization_state=BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_OPENWEB_TOUCH_NO_MERGE_NO_DEPLOY_NO_CUTOVER`.

Base: `claude/awesome-dirac-hloi6x@4782d3a9104dab099f25d28162e5f83c92ec4e43` (Phase 2 exact head).
This branch (`claude/awesome-dirac-88xf74`) was reset onto that exact commit before continuing —
it carried no unmerged commits of its own (it was identical to `origin/main`), so nothing was
discarded.

No live DB write, no migration applied, no OpenWeb/chat/forum file touched, no merge/deploy.

## What a real-archive dry-run found (GPT, prior to this assignment)

Against the real 41,080-row OpenWeb export (not the Phase 1 synthetic fixtures), several Phase
1/2 planner and claim assumptions were decision-changing wrong:

1. The planner had no `openweb_user_id` field at all — it treated **email** as the source-native
   identity key. The real archive shows one verified email shared by two distinct
   `openweb_user_id`s, so email-keyed dedup would have silently merged two different people.
2. 13,330 rows have no `user_id`/name/email whatsoever (true anonymity) — distinct from 7,817
   rows that *do* carry a stable `user_id` but an unverified/unmatched email, and from 19,627
   with a verified-but-currently-unmatched identity. Only the first group may ever be anonymous.
3. `{likes: msg.likes || 0, dislikes: msg.dislikes || 0}` turned 8,934 rows with genuinely
   unknown reaction counts into a fabricated zero.
4. `contributors_claim_legacy` accepted any non-empty `auth.users.email`, never checking
   `email_confirmed_at`.
5. Import-time `classifyIntent` ('?' / URL regex) acted as semantic authority over `intent`,
   instead of being a derived, multi-label, non-authoritative candidate.
6. Phase 1/2 carried no moderation-carry-forward mapping for the source's own "approved/publish"
   decision, and no post-conversation projection existed at all.

## What changed in this pass

- **`scripts/g3-community-foundation-runtime/planner.mjs`** — identity is now keyed exclusively
  by `msg.author_openweb_user_id` (never by email). A message with no such id plans no
  contributor at all (true anonymity). An identified author plans one contributor row per
  `openweb_user_id` (never merged across ids sharing an email), an `openweb_message` provenance
  link (unchanged) plus a new `openweb_user` provenance link (`relation_type:
  'authored_by_external'`) for indexed lookup, and a `visitor_identity` soft-carrier op
  (`visitor: 'openweb:<user_id>'`, email as private claim evidence only — no new table). An
  `openweb_user_id` already present in `state.linkedOpenwebUserIds` (i.e. explicitly claimed in a
  prior session) attributes directly to that `author_user_id`, since that replays a decision a
  human already made once rather than making a new one. Reactions are `null` when the source
  captured neither count, never a fabricated zero. Non-reply intent is now the fixed neutral
  `'תצפית'` bucket (an existing `INTENTS` value, `src/lib/contributions.js`), never a `'?'`/URL
  heuristic. Moderation carry-forward: `approved`/`published` → `status: 'approved'` (reuses the
  existing `rc_public_read`/`community_stream_projection` predicate), `pending` → `pending`,
  anything else (`blocked`/`hidden`/`deleted`/unrecognized) → `hidden`, never guessed visible.
  `origin: 'openweb'` is the permanent marker that this `'approved'` is a migration visibility
  carry-forward, never a `research_contribution_law` canonical/Human-Gate decision.
- **`scripts/g3-community-foundation-runtime/identityBridge.mjs`** — `resolveLegacyClaim` now
  requires `caller.emailConfirmed` in addition to an exact (case/whitespace-insensitive) email
  match; mirrors the SQL fix below.
- **`scripts/g3-community-foundation-runtime/postConversationProjection.mjs`** (new) — pure-logic
  twin of the new SQL projection: merges WordPress `comments` (status `'publish'` only) with
  native `research_contributions` (`target_type='post'`) for one canonical post into one
  chronological list, preserving each source's own parent lineage separately (never inventing a
  cross-source thread edge), and a `findUnresolvedWordpressPostRefs` helper that reports —
  never guesses — `post_wp_id`s with no matching `posts.wp_id`.
- **`supabase/migrations/20260923200000_g3_community_core_2029_phase2_shadow.sql`** (still branch-
  only, NOT applied) — `contributors_claim_legacy` now additionally requires
  `auth.users.email_confirmed_at is not null` (exception renamed `caller_email_not_confirmed`);
  multi-claim by one confirmed mailbox across distinct historical rows remains possible, each
  call still independent/auditable. Added `public.post_conversation_projection(p_post_wp_id,
  p_limit)`: resolves the canonical post via `posts.wp_id`, returns `()` (never guesses) when
  unresolved, unions historically-visible WordPress comments with the existing
  `rc_public_read`-equivalent predicate over `research_contributions`, ordered chronologically.
- **Tests**: Phase 1's `scripts/test-g3-community-foundation-runtime.mjs` was updated in place —
  its identity-model assertions now match the corrected (`openweb_user_id`-keyed) planner, and
  its old "status is never `'approved'`" assertion (which encoded the moderation-carry-forward
  defect itself) was replaced with the corrected invariant: `'approved'` only ever mirrors the
  source's own moderation state, is always `origin:'openweb'`-marked, and is never driven by
  intent/classification. All 15 original Phase 1 tests, all 15 Phase 2 tests (5 identity-bridge
  tests updated to the `caller.email`/`emailConfirmed` shape), and 13 new Phase 2.1 tests
  (`scripts/test-g3-community-core-2029-phase2-1-integrity.mjs`,
  `npm run test:g3-community-core-2029-phase2-1`) all pass — 43 tests total, 0 failures.
- **Fixtures** (`test/fixtures/openweb-import/*.json`) — added `author_openweb_user_id` to every
  message; added `ow-1007`/`ow-1008` (two distinct user ids sharing one email — must stay two
  contributor rows) and `ow-1009` (a fully anonymous message with a `'pending'` moderation state)
  to exercise the fixed defects. `prior-state.json`'s `usersByVerifiedEmail`/`contributorsByEmail`
  were renamed to `linkedOpenwebUserIds`/`contributorsByOpenwebUserId` to match the corrected,
  user-id-keyed state shape.

## Build/test evidence (this session, on this branch)

```
npm ci
npm run test:g3-community-foundation-runtime     # 15 pass, 0 fail
npm run test:g3-community-core-2029-phase2       # 15 pass, 0 fail
npm run test:g3-community-core-2029-phase2-1     # 13 pass, 0 fail
npm run build:2029                               # ✓ built in ~2s (pre-existing
                                                  #   INEFFECTIVE_DYNAMIC_IMPORT warning on
                                                  #   src/lib/auth.js, unrelated to this change)
```

## Not done in this branch (explicitly out of scope / carried open)

- No live Supabase apply of the migration (branch-only per `release_authorization_state`).
- No real 41,080-row import execution (`executor.mjs`'s triple gate is unchanged and still off
  by default).
- OpenWeb article-gap follow-up (incomplete per-article export, `post_id` blank on all rows) is
  unresolved and non-blocking, unchanged from Phase 1/2's own notes.
- The 172 WordPress comments across 20 unresolved `post_wp_id`s remain unresolved by design;
  `findUnresolvedWordpressPostRefs` reports them, nothing assigns them a post.
- No PR was opened for this branch (Claude Code's own standing instruction: never open a pull
  request unless the human user explicitly asks). The branch is pushed; GPT/ZURIEL can open one
  against it directly.

## Owner comments

No inactive-owner-as-future-owner code comments were found to need correcting in the files
touched by this pass; the active composition (Experience + Identity + Intake + Workspace +
Raziel + Truth) is already what Phase 1/2's own comments name.
