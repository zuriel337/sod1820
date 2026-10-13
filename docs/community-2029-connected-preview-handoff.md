# Community 2029 connected preview — main-session handoff

Date: 2026-10-10  
Branch: `feat/community-2029-preview-v1`  
Scope: branch-only Community preview; no merge, deployment, production schema write, Storage write, or cutover.

## Review URL

`/2029?preview=community&data=live`

The original fixture comparison remains at `/2029?preview=community`.

## Implemented

- Connected preview reads approved OpenWeb messages and new `community_2029` messages from `research_contributions` through the existing RLS-protected Data API, 40 rows at a time. The imported archive has 41,080 rows, of which 25,524 are approved. The previous all-origin count of 25,610 included 86 unrelated approved research contributions and was corrected by an origin filter. Hidden/pending content is not exposed.
- Existing canonical writers are reused: `add_contribution` for messages/replies and `toggle_contribution_reaction` for likes. No second message or reaction store was added.
- Imported numeric `reactions.likes` is displayed together with new canonical `👍` reaction identities. The imported baseline is never converted into fabricated voters.
- Author click opens a compact Community card, then the full author view. User-authorized screenshot totals are carried for five named profiles: 648, 427, 2.9K, 22.9K, and 20.3K. The owner later clarified that already-published historical messages are public even when profile details are private.
- The existing `/profile` editor remains the sole editor for display name, username, and avatar. The connected profile links there only for a matching signed-in owner.
- Safe link and YouTube/Vimeo previews reuse `CommunityMessageContent`.
- Design uses the existing 2029 shell and palette tokens. The old fixture preview is preserved for visual comparison.

## Intentionally unresolved before cutover

- Imported rows without a resolved `author_contributor_id` display the neutral label “חבר הקהילה”. Completing source-ID identity projection is required before final cutover; do not merge identities by display name.
- The five screenshots are accepted provenance for avatars, but avatar files were not committed or written to Storage. The OpenWeb profile reader remains blocked by authentication. Continue with the scoped active-six-month cohort only.
- Public profile totals are administrator-approved screenshot baselines, not verified historical aggregates. Define the cutover timestamp before incrementing them with new activity to avoid double counting.
- Deep profile fields (about, location, profile privacy controls) are not in the current self-service contract. Do not add writable fields until Person/Identity ownership and RLS are approved.
- Loaded-page search is local. A full archive search needs the governed search projection; do not expose raw hidden rows.
- The connected route remains `noindex` and does not replace `/community/chat`.

## Verified identity links added 2026-10-13

The site owner explicitly verified the historical OpenWeb profiles of Shinshin, Amily, and Avizohar, plus both of their own OpenWeb profiles. The branch now resolves those five authors by the original `openweb_user` source ID and the existing contributor UUID. It never groups archive messages by display name. Author pages query approved history across the archive, so opening an author is not limited to the currently loaded feed page. Screenshot-private profile details remain private; previously published messages remain visible under the owner's later clarification.

The owner's latest explicit correction on 2026-10-13 supersedes the earlier pairing: `Sod1820` (`u_3knnZ5YC`, contributor `4cd9c034-0464-4600-a35d-7156f0584d9b`) pairs with admin account `yosiviner7` (site user `b6ce542a-2b07-4749-8aba-532c886f6de7`); `YosiViner559` (`u_3kuB1woMg6wz`, contributor `19936860-6b35-4386-bc44-113289858ff0`) pairs with ordinary account `444861` (site user `36f5cb84-71c3-4977-a2c7-d6413e973443`). Account `444816` exists separately and is not linked here. Public display name/avatar on those two archive profiles are read from the exact paired site accounts, and the editor link is shown only when `auth.uid()` matches the paired account ID. The live `persons` rows remain separate; this branch performs no person merge or identity-edge/database write.

Canonical ownership remains to be materialized. Read-only eligibility check found the `YosiViner559` contributor unclaimed, with a source email exactly matching the confirmed email of the paired account; the existing `contributors_claim_legacy` RPC can be used by that signed-in account, followed by the governed admin Person materialization path. The `Sod1820` contributor is also unclaimed, but its source email differs from the confirmed email of account `444861`; the self-claim RPC correctly rejects that pair. The owner's explicit identity decision is recorded here, but the canonical DB bind requires an audited admin route that does not overwrite source email or merge the two account Persons. Do not treat this branch's exact-ID display binding as a completed DB identity edge.

The OpenWeb handles `torahtamima` and `greenraz` from the screenshots still have no exact source ID match in the imported stage. Their approved like labels remain recorded but are not attached to an arbitrary archive contributor.

## Author card and historical continuity — 2026-10-13

Agreed flow: tapping an author in the temporary Community chat opens a compact card with avatar/name, public activity tenure, known likes, and recent messages. A separate action opens the full author view with pagination. The old chat remains untouched. Historical contributions are public; future privacy choices do not retroactively hide them. Profile details can remain private. Do not infer identity from a display name or fabricate reaction voters.

The first card release exposed a defect: a new Community message had both `author_user_id` and a new `author_contributor_id`, but the feed chose the latter as its author key, so the card showed only that single new message. The reader now prefers the stable account ID for signed-in rows. After the owner's 2026-10-13 clarification, the reader joins each site account only to its paired OpenWeb contributor: `yosiviner7` ↔ `Sod1820`, `444861` ↔ `YosiViner559`. No public history, likes, username, Person rows or canonical identity edges are merged across those pairs. The earlier combined read-only check found 66 approved messages (63 Sod1820 archive, 2 YosiViner559 archive, 1 new Community); this is provenance for the defect, not the count of either now-separate profile.

Still open: recover avatar files for the scoped active-six-month cohort from an authorized source; the screenshots alone are not avatar assets. A full public Person page and deeper editable profile fields remain separate owner work. Before cutover, reconcile this branch with newer main, verify anonymous/mobile browser behavior, and keep the old chat route intact.

## Full author view, sorting and attachments — 2026-10-13

The temporary full author view reads approved, contentful `research_contributions` tied to exact author IDs, including Community/OpenWeb messages and approved number, ELS, forum and other contributions. It provides `הכול` / `הודעות` / `תרומות` filters, newest-first default, oldest-first option, and 40-row pagination. Each row labels its source, retains the canonical reaction control, and links to its number/ELS/topic target when one is available. The compact card remains chat-focused. A combined historical check across both owner accounts found 79 approved rows (66 chat, 13 other), of which 24 have no body, title or image; these empty source artifacts are excluded in the server-side full-view query. The current view queries each account pair separately. Other content stores without stable author identity are not silently folded into this view.

The branch also includes a temporary legacy-account claim view at `/2029?preview=community&data=live&claim=<contributor-uuid>`, linked from exact-ID public author pages. It reuses Community email OTP sign-in and the canonical `ProfileSettings` editor. The explicit claim button calls the existing `contributors_claim_legacy` RPC; the server requires authenticated `auth.uid()`, a confirmed caller email equal to the stored source email, and an unclaimed contributor row. After an eligible claim, the public author reader includes that account's new posts with the old contributor posts, and reads the account's current display name/avatar/username through the existing `users` record. The URL/display name alone never grants ownership. Read-only check on 2026-10-13: `אמילי`, `שינשין`, and `אביזוהר בן חיים` contributor rows are unclaimed and have source emails; it does not disclose those emails or establish that a different site account is eligible. Neither owner account's confirmed email currently matches the `Sod1820` source email, so the exact-ID display pairing is not a completed self-claim. Do not distribute a temporary protected Preview URL as a permanent claim link; release a stable route first.

The temporary Community composer now stages up to three files of up to 8 MB each: JPEG, PNG, WebP, GIF, PDF, TXT or DOCX. It uploads on publish through the existing `gallery/community/` Storage path and appends public file URLs to the canonical `add_contribution` body; image links get inline previews, documents get file cards. YouTube/Vimeo link previews remain. A failed send preserves selected files and completed upload URLs for retry. The UI states that attachments are public. No new table, RPC, Storage bucket, policy or live data write was made by the branch work. The upload was verified with a mocked Storage client, not with a real production file. Browser and authenticated end-to-end checks remain before release.

## Inline sign-in in the temporary Community preview

The connected preview now shows the existing email OTP sign-in flow directly above the composer. Requesting and verifying a code keeps the visitor on the Community page; the signed-in state shows the account name and a switch-account action. The implementation reuses `requestEmailOtp`, `verifyEmailOtp`, and `AuthProvider`, without changing `/community/chat` or adding another authentication store. A browser smoke with the OTP request mocked confirmed that the inline code field appears and the Community route stays open; no real email was sent by the smoke test.

## Main-session close sequence

1. Recheck `origin/main`, `work_log_current`, and active file claims. This branch began from main `8e939d3b092f267e40d74953b9103711322276d2`; reconcile newer shell/design work before merge.
2. Review the diff and this handoff. Preserve the existing Person, Identity, My Workspace, Design V2, `research_contributions`, and reaction owners.
3. Run `node --test src/lib/community/communityArchive.test.js src/lib/community/messageLinks.test.js`, both build targets, the existing Community Playwright suite, and a connected-preview browser check with Supabase writes mocked or disabled.
4. Verify anonymous and authenticated RLS behavior for archive reads, `add_contribution`, and `toggle_contribution_reaction`. Do not weaken RLS or add a `SECURITY DEFINER` workaround.
5. Resolve identity/avatar projection and confirm the five profile privacy states and like baselines with the Human Gate.
6. Present the connected preview to the Human Gate. Only after approval, choose the canonical public route and prepare a separate cutover/release change.
7. Do not deploy, merge, apply migrations, write production profile totals, or retire the old chat from this handoff alone.

## Status

`PLANNED=true · IMPLEMENTED=connected branch preview · TESTED=6 unit tests + both build targets + connected mobile browser smoke · PR_READY=handoff-ready, integration reconciliation required · MERGED=false · LIVE=false`

