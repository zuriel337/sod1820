# Writer → exact World source: isolated technical continuation

Status: branch-only implementation and verification; central integration remains pending.

## Commit and ownership boundaries

- Branch: `gpt/writer-world-source-focus-20261025`.
- Base: `47a70cbec0f7932c412b9e72900f1ba608638b57`, the delivered writer
  authorship/alias-post continuation. This branch retains that commit unchanged.
- Central branch last checked: `gpt/2029-central-world-fast-reader-integration-20261024`
  at `09d3dbb1fe149aa41377ec87b81849b4bd271e37`.
- Main last checked: `e73687221aa2ab639930643e5cc8c99666adce88`.
- User authorized independent continuation before later integration. Fresh exact-file
  ownership scans found no overlapping active writer. Coordination BEFORE:
  `befe57ec-7658-4a94-9ecf-ea00b1c6e06d`.
- Existing One Reality/source projection and Experience navigation are extended;
  GPT changes technical selection/focus/return wiring only. Claude's existing card
  presentation, styles, palette and surface composition remain unchanged.

## Behavior

Previously World rendered the first twelve material rows, even when an exact
`sourceRef` named a source hundreds of rows deeper. Giving the focused row an HTML
ID did not reveal it, and the asynchronous load did not scroll or focus it.

`worldFocusedMaterialWindow` now keeps the normal visible prefix and adds at most
one requested, already-authorized source when it is outside that prefix. Initial
rendering is therefore at most thirteen source cards. Explicit “more” continues
the existing pagination and does not duplicate a target once it enters the prefix.
Normal order and source-native objects are unchanged; there is no research ranking,
additional content reader, corpus copy, persistence or per-card query.

After the target renders, World scrolls to it and sets keyboard focus. User filters
remain explicit: a filtered-out target receives a distinct status rather than
silently clearing the filter. Missing public material and incomplete reads receive
different unavailable/unknown messages. A contributor excluded from the public
index does not trigger a private/admin material read.

The existing World → writer link carries the exact current World URL as `returnTo`.
The writer's existing approved-return mechanism can return to the same source and
restore focus. Original post/cipher URLs remain unchanged. The test verifies their
navigation target, not the internals of the Post or ELS page.

## Verification

- Thirteen relevant Node test files passed, covering writer readers/models,
  attribution, source catalogue, community reuse, World public materials and the
  new focused window (including a target at position 847 in a 1,000-row fixture).
- `node scripts/test-2029-world-surface.mjs`: passed.
- `npm run build`: passed the Legacy Production lock and both Legacy/2029 builds
  (observed 1.87s / 1.10s).
- Thirteen local browser cases passed: nine complete flows across 320/390/1440
  and light/parchment/dark, plus unknown source, excluded private contributor,
  incomplete reader and Neria's six-cipher cases. Actual writer and World source
  components use synthetic anonymous HTTP fixtures. The sequence covers writer
  deep link → World target → original article URL → browser back → writer → exact
  return → reload, plus keyboard/viewport focus, filter preservation, bounded cards,
  theme persistence, no horizontal overflow, no JS errors and no product mutations.
- Browser command: `python test/world-writer-source-focus-2029.browser.py`.
  It starts/stops Vite with an isolated temporary dependency cache and HMR disabled;
  `WORLD_FOCUS_PORT` can override port 5192.
- Anonymous live readback of the existing World reader returned 1,288 public
  material artifacts for Tzvi. All five posts (`5038`, `5040`, `5041`, `5043`, `5044`)
  resolved through the focused window to exactly one card each, with thirteen
  cards visible and the original article URL retained. In the component's existing
  non-Topic/Topic order, these posts were at positions 769/760/747/623/621.
  The index-plus-material observation took approximately 4.18s; this is not a
  performance benchmark. The window itself performs no network request.
- `git diff --check`: passed.

Browser evidence is local component/route verification. It does not claim a hosted
Preview, authenticated-account test, full System Frame or actual Post/ELS page test.

## Changed files (6)

- `src/lib/research/worldFocusedMaterial2029.js`
- `src/components/research/WorldPeopleSources2029.jsx`
- `test/world-focused-material-2029.test.mjs`
- `test/world-writer-source-focus-2029.browser.py`
- `test/fixtures/world-writer-source-focus-2029.jsx`
- `docs/reviews/writer-world-source-focus-20261025.md`

## Central integration instructions

The central candidate currently lacks the writer continuation. Integrate
`47a70cbe` first, then this branch's single subsequent focused-source commit, or
use patch-equivalent integration after checking for duplicates. The combined
continuation is two commits above `de27c6ea2e4f8474dd0f379c9bd60b36654344ad`.
Do not cherry-pick `85e2f966` or `20f24ea5` again: their equivalent patches already
exist in the central candidate. Recheck the current central HEAD and ownership,
run the focused browser flow against the integrated candidate, and report its SHA.

No edits to `World2029Page.jsx`, contributor controllers/design files/CSS,
source readers/envelopes, Research Intake, news/channel_updates, App routes,
auth/providers, schema/DB/RLS, publication, site flags, subscriptions or credits.
`WRITER_PUBLIC_SOURCE_PROVEN_MANIFEST_20261023` remains untouched. The 573 pending
rows, unresolved identities and persistent privacy guard remain separate.

Release all six file claims on delivery. No merge, main push, deployment,
Production or additional implementation phase is part of this checkpoint.
