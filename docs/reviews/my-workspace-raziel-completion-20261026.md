# My Workspace / Raziel — projection completion, 2026-10-26

Base branch: `gpt/2029-central-raziel-safe-actions-integration-20261026`.
Base SHA: `ea5736aba4aa9bca052beee87fe17015cb5ede14`.
Work branch: `gpt/2029-my-workspace-raziel-completion-20261026`.
Task: `MY_WORKSPACE_RAZIEL_COMPLETION_20261026`.
BEFORE: `2f590453-c6aa-4dcc-ac35-bc5ccbd6f932`.
Exact-return scope addendum: `f70dbf6c-2631-43da-86ca-2791a715f96b`.

## Read-only mapping before implementation

The remote base was verified exactly before creating the isolated branch.
AGENTS, CLAUDE, the Owner Index and the current Workspace/Raziel/Person owners
were read. Relevant previous scopes were released; an unrelated World audit was
the only active writer. Rechecks found no overlapping writer.

The base already has one Workspace inside SystemFrame, one principal-keyed
ResearchProvider, one RazielSessionProvider and the same conversation across
desktop/mobile and route changes. ResearchProvider owns local guest state,
private account synchronization, saved/pinned/cart items, collections and paths.
Auth resolution and principal changes remount the existing subtree before a
different account can render the previous person's data. Guest data is not
automatically adopted on login.

RazielCenter already supports list, continue/restore, new conversation, rename
and confirmed deletion. Save is the existing stable `raziel_session` type/ref
upsert; rename preserves its identity and content. The compact chat list remains
a secondary projection. Guest signup copy, safe Registry actions, one-shot
landscape generation and the two visible conversation modes were already in
the base and were not changed.

The research section already exposes saved/pinned/current/history buckets,
collection counts and canonical path save/resume. Profile credits come from
`getMyProfile`; there is no approved Raziel allowance getter available here.

## Implemented

- Current conversation: existing title/first question, actual user-question
  count, general/exploratory label, continue, explicit save and existing reset.
  Save uses the existing session callback and retains the renamed stable entry.
- Saved conversations: local title filtering over the existing library, stable
  date ordering, bilingual dates, counts, mode and truthful sync labels. Reading
  is separate from restoring/continuing the existing chat. Existing rename and
  delete callbacks remain the only mutation path.
- Full pictures: existing applied landscape answers are shown under their own
  conversation as “תמונה מלאה”, with the stored question/turn reference. Missing
  lineage stays unavailable; a nearby question is never guessed. Opening this
  view neither generates a picture nor submits a model request.
- Read-only dossier: the same conversation/pictures plus existing research
  items and notes linked through an exact typed subject reference. Same words,
  equal numbers under another type, and similar titles do not create a link.
  No editor, map entity, document owner, classifier or persistence is added.
  Source attribution, calculation and interpretation keep their recorded labels;
  the projection does not certify a new fact.
- Research library: saved conversation rows and collection contents open the
  same existing session. Saved source links retain their exact query and locator.
  Existing pinned/cart/history/path projections are preserved.
- Credits: the existing profile reader is passed into a separate balance area.
  A known numeric zero remains zero; absent or malformed values remain unknown.
  A separate allowance area says “המכסה עדיין אינה זמינה להצגה”. There is no
  new quota reader, ledger, billing, membership or Cardcom connection.
- Existing adopted controls/styles are reused with shared tokens, 44px controls,
  native details and bounded RTL text. Reading/dossier bodies mount on expansion,
  avoiding repeated hidden full-thread rendering across related conversations.
  Entering the center resets the existing panel's scroll position and focuses
  its heading; searching/saving does not reset the user's scroll.

The helper `razielWorkspaceProjection2029.js` is a pure read-only projection,
not a store or lifecycle owner. It performs no IO and writes no URL, log or
telemetry payload. Private search text remains local view state.

## Exact-return regression found and fixed

The built browser reproduced a real failure: opening a saved source from a
Workspace with no current subject first creates a Context containing only
`returnTo`. ResearchProvider's Number-route effect then merged from null because
it checked `current.subject`, discarding that return target.

The minimal correction is in the shared ResearchProvider: native 2029 Number
entry preserves the current normalized Context even when it has only returnTo.
Legacy route behavior is retained. No new return store or Number-page patch.
The regression browser follows saved source → exact Number URL/locator → Reload
→ mobile navigation → Exact Return to the original URL.

## Validation and evidence

Local acceptance passes: 112 Node tests, 14 new browser cases and four existing
center cases. Build/gates below pass. Hosted/live-account acceptance is excluded.
The final built graph has 117 reachable records, seven eager records and
386,984 eager JS gzip bytes; the existing Raziel submission and Research Plan
chunks remain lazy.

Acceptance commands:

- Node: session, saved-session, view-mode, lazy request loader, Companion
  preference, research synchronization, research-path continuity, projection,
  center, conversation UX and frame seam — 112 tests.
- `test/raziel-workspace-completion-2029.browser.py`: nine viewport/theme cases
  (320/390/1440 × day/parchment/night), plus principal transition, stale private
  hydration, source/collection/return, sync failure and invalid saved-session
  cases. Checks include title search, existing landscape lineage, dossier
  exclusions, no duplicate save, touch/wheel/keyboard scrolling, centered panel
  geometry and no horizontal overflow.
- `test/raziel-center-workspace-2029.browser.py`: four existing cases including
  rename identity/content, resave, existing reset, confirmed deletion and empty
  state. Its date expectation was updated to the canonical bilingual format.
- `npm run build:2029`.
- `node scripts/test-2029-built-graph.mjs`.
- `node scripts/test-2029-system-frame.mjs` and
  `node scripts/test-my-workspace-2029.mjs`.
- `npm run test:2029-cheap-hardening`.
- `node scripts/test-2029-isolation.mjs`.
- `npm run test:legacy-production-lock`.
- `git diff --check`.

All browser Auth/cloud responses are synthetic intercepted fixtures. Existing
private ResearchProvider operations receive fixture server acknowledgments;
telemetry and unauthorized writes are blocked. No real Auth request, live DB
write or model request is permitted. This does not claim live account/RLS or
hosted end-to-end acceptance. Evidence is in the sibling
`my-workspace-raziel-completion-evidence-20261026/` directory.

Build dependencies reuse an already installed matching lockfile workspace;
no dependency manifest, package version or environment configuration changed.

## Boundaries and remaining gaps

Allowance display awaits an approved reader. Dossier membership awaits explicit
source/subject references when older saved items lack them; those items remain
in the ordinary library and are not assigned by text similarity. The view does
not regenerate missing pictures, create new findings or verify old claims.

Providers, session state, serialization, safe suggested actions, guest signup
rules and AI submission code were preserved. There is no new Provider/session,
transport, API, DB/RPC/store, map/document entity, credit ledger or AI worker.
No Community actions, migrations, RLS, WhatsApp, ELS, Life Journey, subscription,
Production or main/central branch changes. The two inherited Community reader/
action migrations remain unapplied; missing capabilities still fail closed.

Stop after commit/push and passive AFTER ownership release. No Preview,
deployment, DB apply or central integration is authorized in this slice.

## Exact changed files

```text
src/components/experience2029/SystemFrame2029.jsx
src/components/experience2029/RazielCenter2029.jsx
src/components/experience2029/razielCenter2029.css
src/lib/research/ResearchProvider.jsx
src/lib/research/razielWorkspaceProjection2029.js
src/lib/research/razielWorkspaceProjection2029.test.js
test/raziel-workspace-completion-2029.browser.py
test/raziel-center-workspace-2029.test.mjs
test/raziel-center-workspace-2029.browser.py
docs/reviews/my-workspace-raziel-completion-20261026.md
docs/reviews/my-workspace-raziel-completion-evidence-20261026/results.json
docs/reviews/my-workspace-raziel-completion-evidence-20261026/320-dark.png
docs/reviews/my-workspace-raziel-completion-evidence-20261026/1440-light.png
```
