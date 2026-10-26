# 2029 My Workspace: native writer/attention continuity, membership deferred

Task `WORKSPACE_WRITER_CHAIN_20261026` · actor GPT · passive handoff to ZURIEL.
Branch `gpt/follow-center-preview-boundary-20261025` (existing PR #1159).
Slice base `26d422f52cf410fe68bb846098777e7e2c99e6f4`.
BEFORE `06ad6e78-7a2c-402d-9869-f7aed72591ff`: six exact paths.

## Scope and product source

The existing My Workspace is `WorkspaceProjection` in `SystemFrame2029`; it remains the one
personal experience. No new dashboard, personal store, Auth provider or membership engine is
created. The existing 2029 workspace, W0 personal/access matrix and canonical writer module
map supply the product structure. MembersPage, old JoinPage and old UserCenter UI are not used
as product/design sources or embedded in this slice. Existing data helpers remain canonical
capabilities, independent of their historical client callers.

The requested files were read in full: the W0 matrix, beta evidence plan, security gate plan,
experienceCapabilities, SystemFrame2029, and the membership INTERNAL DRAFT directly at
`afd7895d25cbfa2fe55c64bd8433e3419abd119b`. That document was fetched/read without merging,
cherry-picking or copying it into this branch. Its eventual availability did not expand the
writer slice. ZURIEL explicitly deferred membership/Cardcom/Checkout/Entitlements implementation.

## Changes

- The native writer module map and `writerPersonalHref` now own every personal destination
  launched from Workspace. Unsupported modules have no `/profile` fallback.
- Writer page, profile, messages and progress continue through their existing 2029 modules.
  Hints/contributions entries without a native personal implementation say building. Canonical
  authored work remains reachable through the existing writer-page entry; no content is removed.
- Workspace's attention summary opens the accepted `/2029/me/notifications` center with return
  context. Its separate optimistic unfollow and mark-read implementations were removed. All
  management remains in the existing canonical FollowCenter controller. Workspace reads only
  the follow summary and exact unread count; it does not fetch another inbox body list.
- A failed count is unknown, not zero. Measured zero is retained. A retry performs summary reads
  only. Follow aliases use the existing normalizer, without fuzzy writer identity inference.
- Workspace remounts for the canonical Auth scope, including auth-loading. An old account's
  pending results cannot populate the next account's personal snapshot.
- The existing `getMyProfile` helper gained an opt-in strict mode: same-account session checks
  before/after transport, explicit user filter, narrow `credits,xp,level,streak` projection and
  malformed/error rejection. Default callers retain their existing signature/projection/fallback.
  These are personal activity metrics, not research standing or paid entitlement. The unused
  numeric tier is excluded; the activity label no longer implies a research rank.
- The credits summary no longer promises a working detail screen or links into another runtime.
  Known balance is preserved; unavailable balance is not invented. Native detailed finance UI
  remains building.
- `גישה ומנוי` is **only an existing FrameState placeholder** inside My Workspace: no prices,
  billing period, active/absent membership claim, plan, entitlement, renewal date or CTA action.
  It creates no request or server state and provides no paid/AI capability.

No CSS, palette, SVG catalog, commercial contract, subscription state machine, Cardcom,
Checkout, Entitlements, DB/RLS/site_flags, credit grant/spend, referral policy or provider
configuration changed. No prices were published. No paid data is inferred from user_metadata,
URL or local React state.

## Verification

The scoped tests cover actual installed Supabase/PostgREST transport with HTTP intercepted:
measured zero/missing profiles, malformed values, denied reads, default compatibility and
account changes before/during the read. No external request is forwarded.

The existing real-component Follow Center browser suite now also exercises Workspace's native
entry and return path in three presets at 320/390/1440, false paid user_metadata, the inert
placeholder, unbuilt native entries, measured zero vs failed count, delayed prior-account
credits, guest sign-in, keyboard entry and focus restoration. Existing controller/ack/race/DM
coverage is retained. All product mutations are synthetic fixtures.

The Workspace source guard now asserts the actual handoff and absence of duplicate mutation
handlers, replacing obsolete expectations that required the removed local implementation.
ResearchProvider save/resume/collections/history, canonical Auth, typed Now entry and frame
checks remain in place. No scenario is removed to conceal a failure.

Final exact-tree tests, builds, counts and protected Preview are recorded in PR #1159 and the
passive AFTER. Evidence: `/workspace/artifacts/workspace-writer-chain-20261026/`.

## Central integration boundary

Central was independently at `c121dab3badb9297ab3abdbfe88d35189cfa1285`. Its Frame changes concern
Raziel actions and lazy NumberDrawer; the shared path was reported before editing. This slice
does not replace the whole file or claim central was merged. Combined acceptance is prepared
by applying the candidate patch to a detached temporary checkout of that exact central SHA,
without a branch merge/cherry-pick or central ref write. The final report distinguishes those
temporary assembly tests from an actually integrated/deployed central commit.

Main remains `8642f7c93c9b653b7a42faaa2809362f3cd280e0`. No Production change or live product write.
Membership implementation waits for a separate explicit continuation from its session; this
placeholder is not acceptance of the draft's pricing/economics or a claim that billing is active.
