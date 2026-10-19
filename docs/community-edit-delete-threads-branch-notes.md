# Community 2029 — edit, soft delete, thread open/counts, legacy chat placement (branch notes)

Branch-only. Base `5de4d5772bbf2624d9f6195c00216d49df2d04d1` (`gpt/2029-hybrid-stage-preview-20261018`).
Provenance/evidence note, not a contract or owner map. Owners unchanged: System Frame (menu), Community 2029 components, `research_contributions`.

## What changed
- Menu: public entry `צ׳אט` → `קהילה`, canonical `community` icon, path `/community/chat` unchanged. The workspace entry moved to the canonical `personal` icon so the two entries no longer share one glyph (`NavigationIcon2029` already accepts `name`).
- Page: new community first; `הצ׳אט הוותיק` (OpenWeb) last. OpenWeb mounts through the existing `useOpenWeb` owner only when the reader is within ~900px of it, on `#legacy-chat`, or on an OpenWeb deep-link query. The history mounts only after the first feed read settles, otherwise the short loading page would count as "near".
- Threads: `פתח עוד — N תגובות` / `הסתר תגובות`; `עוד תגובות — N נותרו`; `עוד הודעות — N נותרו` only when the server count is verified. Counts are direct replies; nested replies are counted under their own parent. Unknown count → generic text.
- Edit/delete/admin hide: author edits own `community_2029` message (`נערך` marker); soft delete keeps id, parent link and every reply; deleted message with a live thread below shows `ההודעה נמחקה`; admin can hide a whole thread after an in-UI confirmation. Controls render only when the viewer can use them and the migration is live.

## Migration (NOT applied to any live database)
`supabase/migrations/20261019130000_community_edit_soft_delete_threads.sql`
- Additive: 4 nullable columns, 1 private archive table (RLS on, no policies), partial indexes, and new `community_*` functions. Existing functions are untouched (`edit_contribution`, `remove_contribution`, `moderate_contribution`, `admin_delete_contribution` — the last deletes child replies and is not used).
- Why a deletion marker: `status='hidden'` already marks ~2.2k imported OpenWeb roots and ~12.6k replies, and `trg_00_zvi_standing_approve_research_contribution` reverts `status` to `approved` for one standing-approved author. Delete therefore moves content to the private archive, blanks the public row, and sets `deleted_at`.
- Until applied, the client falls back to the original table reads and shows no edit/delete/hide controls.
- Manual undo of an admin thread hide: `update research_contributions set status='approved', thread_hidden_at=null where thread_hidden_at is not null and deleted_at is null;` (restore of a deleted message: copy back from `research_contribution_deletions`).

## Tests
- `npm run test:community-edit-delete-sql` — throwaway local Postgres, permissions, soft-delete cases, trigger interaction, grants.
- `npm run test:community-edit-delete-ui` — built app (`npm run build:2029` first) against an in-memory stand-in of the `community_*` functions; needs `PLAYWRIGHT_MODULE` when Playwright is not installed locally.

## Local preview (offline)
`npm run build:2029`, then `npm run preview:community-edit-delete` (needs Playwright + Chromium: `npm i --no-save playwright && npx playwright install chromium`).
Serves `http://127.0.0.1:4173/community/chat` and opens four windows (guest, author, other user, admin) over one shared in-memory store; nothing reaches a live service. `--personas=`, `--port=`, `--rpc=missing` (simulates the migration not being applied).
