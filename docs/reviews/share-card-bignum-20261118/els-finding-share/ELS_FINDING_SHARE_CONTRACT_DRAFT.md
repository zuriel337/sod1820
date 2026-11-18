# ELS finding share: contract draft (EXTEND_EXISTING, no new owner)

Status: **DRAFT on a docs-only branch.** Nothing here is merged, deployed or applied. The tests in `tests/` run on their own (`node --test tests/*.test.mjs`, 25 tests) and are not wired into CI. Code that depends on #1397 waits for it (ZURIEL decision 9).
Read against `origin/main` `270bfab6a` and PR #1397 (`ccr-06bc2910-pgarr4`) head `19a66d4e6`. #1397 is open and still changing; its CI is running.
Live DB facts come from read-only SELECTs on `linswmnnkjxvweumprav` (18.11.2026).

## 0. Owners this extends

| Concern | Existing owner, extended here |
|---|---|
| ELS result identity, replay, legacy honesty | `els_research_layer_law` v9: §1 (ELS is a capability, not a page identity), §4 (research-grade result contract), §9 (published ≠ verified), §35 (full snapshot / exact return) |
| Exact occurrence identity | Engine `occurrence_id` = `els:<corpus_id>:<letters>:<skip>:<dir>:<start>` (G3 core; client module `src/lib/research/elsOccurrenceIdentity.js` added by #1397) |
| Saved finding identity | `els_records` row (`id`, `slug`); `src/lib/elsSavedMatrix.js:1` "adapter for the existing els_records identity" |
| Private → public | `person_foundation_contract_law` v6 (explicit, Human-Gated) + ZURIEL decision 10 (18.11.2026) |
| Share UI primitive | `canonical_ui_components_law` v12 (ShareActions / `src/lib/share.js`, being changed by #1408) |
| Public address / metadata | route crosswalk `docs/system-map-gate.md:15` (`/codes/:slug` = canonical cipher detail), `docs/w0-2027-route-seo-addressability-matrix-v1.md:90` (A, public identity/SEO), `api/og.js` |

No new table, store, identity, route family or engine. This draft adds one engine *mode* of the existing restore, one host relay detail, labels, and a share action.

## 1. Identity

- **A shared finding is one `els_records` row.** Its exact occurrence is derived from the row's axis columns (`search_term`, `scope`/`corpus_id`, `skip_distance`, `direction`, `start_index`) as the engine `occurrence_id` (#1397 `savedMatrixOccurrenceId`).
- The axis columns are not changed by any user RPC (`update_els_matrix`, `rename_my_els_matrix` do not set them; `save_els_matrix` matches on them). So the record identity implies the occurrence identity. The link therefore needs no occurrence id; the engine still checks the record's occurrence against what it verifies (#1397 `restoreMatrix` occurrenceId checks).
- The finding words, their saved occurrences (`positions.findings[].sh`), view and window belong to the record and may be updated by the owner. A recipient sees the record's current saved version.
- An unsaved matrix (`#els-matrix=` fragment, `src/lib/elsMatrixShare.js`) is **not** a finding identity. It is a portable presentation snapshot. It keeps working, with the same bounded opening (section 4), a generic preview and the label "not saved, not reviewed".

## 2. Address

- **Share URL of a saved finding: `https://sod1820.co.il/codes/<slug>`.** This is the existing canonical public address (crosswalk above), it already has server metadata in `api/og.js` (`:595-611` production reader, `:983-1012` card chain), and the engine's own share already uses it for saved ciphers (`public/tzofen.html:4466`).
- **Live matrix of that finding: `/code?cipher=<slug>`** (existing `savedMatrixWorkspaceHref`, `src/lib/elsSavedMatrix.js:32-35`). `/codes/<slug>` gets one primary action, "פתח את הממצא במטריצה", to this address. A share never uses `/code?record=<uuid>`, which stays an owner/admin workspace address.
- A link to `/code` alone is not a finding link (ZURIEL 18.11.2026: a page link alone does not close the requirement).
- Today `/codes/<slug>` serves only `status=published AND visibility=public` (`src/lib/research/publicLibraryContinuity2029.js:33-34, 58-60`; test "cipher reader requires explicit public+published even when self_published bypasses RLS"). An explicitly shared, unapproved finding therefore has no public reading page today: see open decision D-2.

## 3. What comes from the link and what from the server

| Item | Source |
|---|---|
| Which record | link (`slug`) |
| Term, corpus/scope, skip, direction, start, occurrence id | server row (axis columns) |
| Finding words, colours, saved occurrence keys, plain-text source context | server row `positions.findings` (`t`, `color`, `sh`, `sourceShown`) |
| Search window and view (`ctxR`, `windowColumns`, `windowSize`, `showN`, `findingRadius`, `zoom`, `fit`, `heat`, `niqqud`, `hideMain`) | server row `positions.searchWindow` / `positions.view` / `positions.hideMain` |
| Title, description, author display name, saved card image and matrix shape | server row (`title`, `description`, `author_name`, `image_url`, `positions.shapeUrl`) |
| Approval state | server row (`status`, `visibility`, `self_published`) |
| Verification state | the engine, in this opening, through the canonical verifier (never from the row) |
| Nothing else | no account, session, token, Raziel conversation, other records, private notes or AI marks |

For the fragment link all of the above except approval comes from the link itself (already sanitized by `elsMatrixShare.js` `sanitize`).

## 4. Opening: bounded, no discovery (ZURIEL decision 11)

**Today (evidence).** Every saved or shared opening goes `load-matrix` → `loadMatrix` → `discoverVerified(term, 4000, null, anchor)` (`public/tzofen.html:4358-4386`). That is a full local discovery (`routedDiscover`, `:1405`): a stratified probe of 500,000 candidate pairs, 2,000,000 more when exactly one signal is found (`:1307`), then collection up to 4,000 candidates in 20,000-pair rounds (`:1373-1375`) or the anchor kernel `findAll`/`findAllAdaptive`. The saved anchor is only *added* to that batch (`:1514`). All candidates then go to `verify_batch` in chunks of `min(4000, 64000/L)` (`:1424`): 1 call for most terms, 2 when the anchor makes 4,001 or the term is longer than 16 letters, each up to 64,000 letter checks. Then one more `verify_batch` per finding word with selected unverified hits (`healGoverned`, `:2071-2093`). #1397 keeps this full discovery and moves it to the worker pool (`discoverVerified(..., anchor, true)`, PR `tzofen.html:4476`).

**Engine change needed: yes, small, inside the restore that #1397 rewrites.** No existing parameter skips discovery. The primitives already exist:
- `promoteVerified(candidate list, scope)` without discovery is already used by `probe-exact-skip` (`EXACT_SKIP_PROBE_V1`, `:2700-2711`).
- The anchor positions are computed from the record (`:4385`).
- Word occurrences are recomputed only inside the visible window (`recomputeWords`, `:4833-4870`), and saved ones are restored from `sh` and verified by `healGoverned`.

**Contract (EXACT_REPLAY_V1, a mode of the existing restore):**
1. An item with exact coordinates (and, after #1397, an `occurrenceId`) opens with `promoteVerified({t, hits:[anchor], capped:false, discoveryComplete:false, strategy:{policy:"EXACT_REPLAY_V1"}})`: **one `verify_batch` with one candidate** (L letter checks). No `routedDiscover`, no worker discovery, no `page` call.
2. The window, view and words come from the record; saved word occurrences are verified by the existing `healGoverned` (one `verify_batch` per word that has saved verified hits; at most 24 words).
3. The emitted state says the occurrence list was not scanned (for example `occurrence: {index:0, count:1, exactOnly:true}`); the UI says "נבדק המופע הזה בלבד" and offers "מצא מופעים נוספים", which runs the normal search under the normal quota.
4. Progress uses the load operation channel added by #1397 (`opening → verifying → restoring-findings → done`), as the Operation Visibility Law requires.
5. Applies to `/code?cipher=`, `/code?record=` and the fragment link. Records without exact coordinates (legacy) do **not** search automatically: they show the saved image with the label in section 6 and an explicit action (open decision D-3).
6. Cost after the change: 0 discovery pairs, 1 + (words with saved hits) server calls. On the guest bucket (`verify_batch` 240 per hour per IP+agent, `supabase/functions/els-search-bridge/index.ts:83-88`) a 12-word finding costs 13 calls instead of 13-14 calls plus a 0.5-2.5M-pair local scan.

`verify_batch` with one candidate is preferred over the bridge's `verify` op (`els_verify_occurrence_v1`): it is the path the engine already uses, it checks `corpus_id`, and it uses the larger rate bucket (`verify` shares the 60/hour `page` bucket).

## 5. Preview (Open Graph)

- `/codes/<slug>` (existing `api/og.js` branch): title `הצופן «<title>» — דילוג <skip> · סוד 1820`; description = term, corpus, skip, up to six finding words, **the approval label**, "עדות — לא ניבוי"; image = `image_url` (the engine's 1200×630 matrix share card, `buildShareCard`, `public/tzofen.html:4550`), else `positions.shapeUrl` (matrix grid), else the branded `/api/card` (being changed by #1407; logo by FINDING_SHARE_BRAND_20261118).
- Approved: `index, follow`. Explicitly shared and unapproved: `noindex, follow` (if D-2 admits them). Private or missing: 404, no metadata, the same for both.
- `/code?cipher=` and fragment links keep the generic `/code` preview; the rich preview belongs to `/codes/<slug>`.

## 6. Labels (always both)

Approval (from the row):

| Row | Label |
|---|---|
| published + public | אושר ופורסם בספריית הצפנים |
| self_published, pending | שותף בידי החוקר · ממתין לבדיקה · לא אושר |
| self_published, hidden (dossier only, or hidden by a moderator) | מוצג בתיק החוקר · לא אושר לספריית האתר |
| self_published, draft | שותף בידי החוקר · לא נשלח לבדיקה · לא אושר |
| fragment link | קישור למטריצה שלא נשמרה · לא נבדק ולא אושר |

Verification (from this opening): verifying · "המופע אומת עכשיו במנוע הקנוני" · mismatch · corpus/occurrence mismatch · verifier unavailable · rate limited · legacy "המיקום המדויק לא נשמר; המופע לא אומת". Approval never implies verification (`els_research_layer_law` v9 §9). Today `/code?cipher=` shows title and description but **no approval label** (`src/pages/Els2029Page.jsx:433-440`): a gap to close.

## 7. Privacy

- The link holds only the slug. No user id, visitor id, token, session, interaction id or other research.
- The page and preview render only: title, description, public author name, term, scope, skip, direction, start, corpus, finding words and colours, view/window, card and shape images, approval label.
- `owner_user_id` and `engine_detail` are readable to guests on any readable row (column grants: 27 columns incl. both; `visitor_id` is already hidden). They must not be rendered or put in metadata; restricting the columns is a separate DB decision (D-5).
- Private images are not uploaded today (`TzofenEmbed.jsx` uploads only when `!privateSave`); a later explicit share therefore has no card image until re-saved: the share action must say so or regenerate the card on explicit share.

## 8. Guest and mobile

- No login to open. Tanakh viewing is open to guests (`public/tzofen.html:2920`).
- `/codes/<slug>` shows the saved card at once (no engine). "פתח את הממצא במטריצה" opens `/code?cipher=<slug>` in Classic (`src/pages/Els2029Page.jsx:150`: Classic and Research open to every visitor).
- In the matrix: the exact occurrence, its highlighted letters, the saved words and window. Saving, editing and further search follow the existing rules (save needs an account; further search counts against the guest quota).
- Mobile: the same addresses; the share action uses Web Share when present, copy otherwise (existing `ElsMatrixShare2029` pattern).

## 9. Failure states

| Case | Guest sees | Evidence / change |
|---|---|---|
| Removed, or private (never shared or share withdrawn) | "הממצא אינו זמין" (same text for both; no hint which) | RLS returns no row |
| Legacy record (no exact coordinates) | saved image + legacy label + explicit action | 97 of 116 public rows today |
| Verified mismatch | saved image + "המופע השמור לא אומת. לא מוצג מופע אחר במקומו." | existing no-substitution rule, `tzofen.html:4417` |
| Corpus or occurrence mismatch | same, with the reason | #1397 `restoreMatrix` |
| Verifier unavailable | saved image + "האימות לא הושלם" + retry | today mis-reported as `anchor-not-found` (`tzofen.html:4407`: verifier failure → no MATCH → anchor-not-found) |
| Rate limited (429) | saved image + "האימות מוגבל כרגע" + retry later | today collapsed to `bridge_error` by the host (`src/components/TzofenEmbed.jsx:397, 409`) |
| Gate closed (`lock_els`) | saved card and labels; matrix action disabled with the flag message | `api/og.js:911-915` |

## 10. Build order relative to #1397 (no early merge)

Can be built now, outside #1397's files:
- a pure module (link, parse, labels, visibility, open plan, preview), with tests (skeletons in `tests/`). The occurrence-id part imports #1397's module, so it lands after #1397 or with it rebased.
- `/codes/<slug>` reader: labels, the "open in matrix" action, the honest capability text (the reader still says the engine is closed to the public, `src/pages/PublicLibraryContinuity2029Page.jsx:101`, while `/code` Classic is open since 6.11).
- `api/og.js`: approval text in the description; noindex rule for unapproved (if D-2).
- Share action in `ElsSavePanel2029.jsx` (not touched by #1397) and, after #1408 lands, through the shared ShareActions primitive.
- DB proposals only (no apply): D-1 and D-4.

Must wait for #1397 (it rewrites these places):
- engine EXACT_REPLAY_V1 in `restoreMatrix` (`tools/els/els-code.template.html` → `build.py` → `public/tzofen.html`);
- load-phase reporting (#1397 load operation channel);
- `occurrenceId` on the load item (`elsSavedMatrix.js` `savedMatrixToItem`, `elsJourney.js`);
- the error relay in `TzofenEmbed.jsx` (different hunk from #1397 but the same file; rebase after);
- switching `ElsMatrixShare2029` to the record link when the open matrix is the saved record (`savedMatrixMatchesAxis`, rewritten by #1397; mounted in `ElsNativeClassic2029.jsx`, changed by #1397).

## 11. Acceptance tests

Pure (skeletons now in `tests/`, 25 passing locally, not in CI):
1. Approved record shares `/codes/<slug>`; parse round-trips; no query, hash, id, owner id or token in the URL.
2. No public link for a private draft or for a pending submission without explicit share; allowed after explicit share.
3. `/code`, `/codes/מחקר`, encoded slash, other origin, empty `cipher` are not finding links; `?record=` is owner-only.
4. Approval and verification labels are separate; every unapproved public label contains "לא אושר"; published never implies verified.
5. Open plan: exact → one axis candidate, `1 + words` calls, `discovery:false`; legacy → zero calls, explicit action only; 24-word cap.
6. Failure mapping: removed = private for a guest; verifier outage ≠ not found; rate limit distinct.
7. Preview: public fields only; image chain card → shape → `/api/card`; noindex for unapproved; 404 for private/missing.
8. Live RLS model vs contract: documents conflict D-1.

Engine/browser (after #1397, in the style of `test/els-native-ui-browser.test.mjs`):
9. Opening `/code?cipher=<exact>` sends exactly `1 + words` `verify_batch` requests, the first with one candidate; no `page` request; no worker `routed-discover` message.
10. Load phases are reported `opening → verifying → restoring-findings → done`; the meter is visible throughout.
11. The highlighted cells equal the record's anchor positions and saved `sh` positions; window and view equal the record.
12. State carries `exactOnly:true`; "מצא מופעים נוספים" runs the normal search only on click.
13. Verifier returning 429 shows the rate-limit state, not "not found"; a MISMATCH shows no other occurrence.
14. Guest (anon) opens an approved record and an explicitly shared one (if D-2); gets "unavailable" for a private one and for a deleted one, with identical text.
15. Fragment link opens with the same bounded plan and the "not saved" label.
16. `npm run build` passes, including the shell budget (no static import added to the frame).

## 12. Decisions that belong to ZURIEL

Decisions 1-4 from 18.11 are not reopened. New ones:

- **D-1 (conflict with ZURIEL decision 10).** A member's save with the default choice becomes guest-readable before review: `save_els_matrix` sets `self_published = (v_status <> 'draft')`, so every pending submission gets `self_published=true` (`supabase/migrations/20261010231453_els_public_save_private_draft_isolation.sql:21-25, 86`; live body has the same rule), and RLS `public_read_self_published_els` (`self_published = true`, roles public) lets anyone read it. The native save panel publishes to the dossier by default with an opt-out box (`ElsSavePanel2029.jsx:23, 29, 33`); the engine's own save button (reachable when the full engine view is open, `ElsNativeClassic2029.jsx` `full={classicOpen}`) is saved public with no choice at all (`TzofenEmbed.jsx:321`, `isPublic: !privateSave`). Live today: 0 pending rows; all 103 `self_published` rows are approved, so the exposure is latent. Choose: (a) submission stops setting `self_published` (DB change + panel text), the explicit "share publicly" / "הצג בתיק הציבורי" stays the only way; or (b) the dossier default counts as the explicit choice and Classic gets the same visible choice.
- **D-2.** Public page for an explicitly shared, unapproved finding: extend `/codes/<slug>` (noindex, "לא אושר" label; changes the reader's published-only contract and its test), or share such findings only as `/code?cipher=<slug>` (generic preview).
- **D-3.** Legacy records without exact coordinates (97 of 116 public rows): on a shared opening show the saved image and require a tap to search at the saved skip (bounded, one skip, corpus-wide), or run that bounded probe automatically.
- **D-4.** `self_publish_matrix` has no status check: an owner can make a moderator-hidden row (`status=hidden`, 23 rows today, all `self_published=false`) publicly readable again. Keep, or block for hidden rows.
- **D-5.** Guests can read `owner_user_id` and `engine_detail` of every readable row through REST. The share page will not render them; restricting the columns is a separate DB/security change.
