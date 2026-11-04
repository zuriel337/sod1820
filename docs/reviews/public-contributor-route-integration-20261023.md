# Public contributor routes — bounded integration

Actor: GPT. Task: WRITER_PAGES_APP2029_ROUTE_SCOPE_HANDOFF_20261023. Recipient: ZURIEL. No dispatch.

Branch: `claude/2029-contributor-rank-3d-20261023`.
Parent HEAD: `e2b7219da6789f37440812b672fcf7f8efa1f240`.
Required World reader base remains `cfa786c186b449c6a616566724666937d415d508`.
Fresh remote main: `e73687221aa2ab639930643e5cc8c99666adce88`; its App2029 file is identical to the parent file in this worktree.

Status: IMPLEMENTED_LOCAL / BUILT / BROWSER_TESTED. Not pushed, merged, deployed or live.

## Authorization and coordination

ZURIEL explicitly transferred only lazy imports and writer route registration in `src/App2029.jsx`. Live reservation: `58732c06-0eec-42fa-904c-e2a3fdb4e53a`. The former Raziel task has a current `CLOSE_SCOPE_RELEASED_PASSIVE` record. Before editing, this session appended BEFORE `c6594a57-4748-4233-be0c-85fe76b0dfb5` with branch, HEAD, exact routes and exclusions.

Dedicated Supabase read-only connector remained the reader for live coordination. The general Supabase connector, verified against the canonical project `linswmnnkjxvweumprav`, was used only for the explicitly requested coordination BEFORE/AFTER appends. No product DB data, schema, RLS, grants, flags or dispatch state was changed. No actor was activated or messaged.

Correction to the earlier ownership check: filtering records by path before selecting the latest task state omitted the pathless RELEASED record. The corrected check chooses latest task states first, then filters relevant scope, and also resolves the explicit transferred task keys. The earlier claim that Raziel still owned the file was incorrect.

## Change

Exactly four added lines in App2029:

- Lazy import the already built public contributor page and the existing Sod2029Shell compatibility export.
- Register `/community/researcher/:slug` inside that existing frame, with community surface and no duplicate intro.
- Explicitly retain `/community/researcher/me` as an existing Legacy document handoff; deeper editor paths remain covered by the existing wildcard handoff.

No providers, Auth, frame implementation, World, Beit Midrash, menu or internal `/researcher/:slug` route changes. A byte comparison after removing the four new lines exactly matches the parent App2029 file. The previous route proposal is now applied in this branch; its old handoff documents describe the historical, earlier state.

## Verification

- `npm run build:2029` passes, now compiling the contributor page in the actual application graph. Existing large-chunk/dynamic-import warnings remain; the shared shell is also statically consumed elsewhere, so its lazy import does not create a separate shell chunk.
- Three focused contributor/catalogue/rank test files pass (22 contained cases from the earlier implementation).
- `node scripts/test-2029-world-surface.mjs` passes.
- `npm run test:public-2029-language` passes.
- `python test/public-contributor-routes-2029.browser.py` passes against the built App2029 document, real existing providers/frame and real World component. All external requests are intercepted with synthetic data; no production session, private corpus, telemetry write or DB write is used.
- Nine frame-integrated screenshots: 320/390/1440 × light/parchment/dark. Exactly 20 initial source cards, no horizontal overflow, no initial research query, one existing frame, public rank rendered. The displayed identity, corpus and rank in these screenshots are fixtures.
- Both paired-image/text and text-only cards open their exact World occurrence element. Reload keeps the occurrence. Browser Back restores the writer URL, including its return context. The writer return link preserves the full World query and fragment.
- The general numeric contributor route (`2042` fixture) also renders in the existing community frame.
- `me` and the deeper editor URL cross the Legacy document boundary, preserve query parameters and issue zero public contributor/source/rank requests. The destination is a test marker, not an assertion that the Legacy editor itself has been tested.
- `git diff --check`, reverse-check of the applied App patch and check of the unapplied hosting proposal pass.

Evidence is in the adjacent `public-contributor-route-evidence-20261023/` directory. These are local fixture results, not hosted performance measurements. No real screen-reader session was performed.

## Remaining hosting boundary — concrete proposal, not applied

The current `vercel.json` still resolves a direct human request to `/community/researcher/tzvi-opoc` through its final `/index.html` fallback. React route registration alone cannot make that direct request enter the 2029 document. The browser test explicitly supplies the 2029 document at the canonical path; this is test-only routing, not a deployed configuration change.

`public-contributor-2029-hosting.proposed.patch` adds only two rewrites immediately before the existing Legacy fallback:

1. `/community/researcher/me` → `/index.html` (first, preserve Legacy).
2. `/community/researcher/:slug` → `/2029.html` (one path segment only; deeper editor paths keep the Legacy fallback).

No redirect, menu, domain alias, production setting or provider change is proposed. Earlier bot/OG rewrites retain their current priority. The actual `vercel.json` is unchanged because its edit was explicitly excluded from this task. Applying this proposal requires ZURIEL to extend that file scope and a fresh live ownership check, followed by branch-only Preview verification. Do not claim a hosted Tzvi link before that check.

## Separate existing Legacy fragment limitation

A negative browser case using `/community/researcher/me?section=about#keep-context` did not leave the loading state: the unchanged global `LegacyDocumentHandoff` calls `window.location.assign` with its current URL, which can remain a same-document navigation when it has a fragment. The supported query-only handoff passes. This helper is outside the authorized import/registration seam and was not changed. A direct `me` request under the proposed hosting guard goes straight to the Legacy document instead; an internal SPA handoff with a fragment still needs a separately scoped helper fix. Exact public writer-to-World fragment navigation passes independently.

No merge, main push, Production deployment, alias change or production-lock change was attempted.
