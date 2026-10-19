# Community on the unified Preview — 2026-10-19

Task: `GPT_COMMUNITY_UNIFIED_PREVIEW_INTEGRATION_20261019`.

## Source and boundary

- Current unified base: `5de4d5772bbf2624d9f6195c00216d49df2d04d1`.
- Community handoff: work_log `f645fc8d-c5f7-4003-9823-5b81f2d0806c` (supersedes `54253fe8`).
- Original source: `claude/sod1820-community-fixes-5gdnn1` at `ca9b75e4b8b04e13fe86efa11d6de2751ae21ea1`, PR1129, six commits over the exact base.
- Integration: `gpt/2029-community-preview-integration-20261019`; tested product code `2af46373ac67013a097dfa130832cb5d32148165`.
- The previous unified handoff `f19f7cfc` is preserved through cherry-pick `a916b082`.
- This is Preview integration. No main/Production/DB/RLS/live-flag change is authorized by this record.

The complete Community branch is retained: Community name/icon, new feed first, OpenWeb last and on approach, verified thread counts, edit/soft delete, restore/history, deep links, archive search, reports/admin queue and legacy claim UI/logic. The normal application build retains those capabilities. Database prerequisites remain open.

## The blocker and the Preview correction

The latest Claude handoff correctly blocks deployment of its unmodified branch: only the first migration is installed. The later actions would otherwise target missing functions. A fresh read-only catalog check confirmed this; the notification trigger definition still matches `d9e068d87124a28b7205ef7e6ea8bb03`.

This integration makes the existing protected, read-only Preview usable without applying the missing migrations:

1. Admit only the three already-installed STABLE Community readers in the existing worker allowlist. Local Hybrid uses that same allowlist instead of maintaining its own copy.
2. Detect the existing read-only bootstrap marker as a presentation hint. The transport guard remains responsible for blocking writes.
3. Keep browsing, sorting, paging and opening threads. Show a plain read-only message; do not offer edit/delete/report/admin/search/claim controls whose actions cannot run here.
4. Disable publishing/attachments and show reaction counts without mounting a mutation control.
5. Suppress automatic account linking after login, including inside the claim adapter. A deep message/claim URL receives an availability message and never calls an unavailable action.

No write RPC was admitted. No function or policy was installed or changed. The four migration files are byte-identical to the original Community source. This does not activate full Community management or legacy account ownership in any live environment.

## Verification

- Full Legacy + 2029 build: PASS.
- Bundle budget: 5/5 PASS. Entry 9 / 174.1 KiB gzip; Home +17 / 118.8; World +37 / 254.3; Post +13 / 100.3; Number +26 / 180.2 — unchanged at the tool's reported precision.
- Built Community browser suite: 26/26 PASS over an in-memory backend. The new read-only case covers guest, author and administrator with both local and hosted markers. Real text and reply paging remain usable; mutations and automatic account claims stay at zero. Existing writable fixture cases still cover the full source features.
- Community units: 19/19 PASS. Updated two stale test assumptions for the new `editedAt`/`isDeleted` fields and explicit missing-RPC fallback.
- Worker policy: 3/3 PASS; exact readers admitted, other origins/adjacent names/writes/claims/advanced reads denied.
- Local Hybrid: 8/8 PASS, no skips, including fetch/XHR/beacon write traps.
- Hosted Hybrid: 5/5 PASS, no skips. A clean local synthetic hosted build sealed 424 artifacts. Real Chromium attested before either runtime's probe and writes never reached the local server.
- System Frame and public-language 3/3: PASS. Diff whitespace: PASS.

The hosted guard test substitutes the final application entry with a probe after validating the stored artifact inventory. The Community test separately runs the real built application against an isolated stand-in. Neither is a real signed-in hosted Community acceptance test.

Claude reported 78 throwaway PostgreSQL checks for the original, unchanged migrations. They were not rerun here because this execution environment has no local PostgreSQL installation; no live database was used as a substitute.

Original source CI contains failed runs, so no overall remote PASS is claimed. The protected Preview remains a work/review environment, not a Production GO. Actual hosted Community interaction, live OpenWeb and physical-phone acceptance remain open.

## Remaining separate work

- Review and explicitly authorize database installation before enabling restore/history/search/reports and automatic legacy matching outside the read-only Preview.
- Reconcile repository migration filenames with Supabase history; do not reinstall migration 1.
- The shared reply-notification trigger is optional and must be compared against live immediately before an independently authorized change.
- Do not run `contributors_link_registered_legacy` without explicit approval; it reassigns existing ownership. Manual review of ambiguous accounts remains open.
- Full live-role, privacy/moderation, real OpenWeb, phone and release acceptance; repair and rerun required remote CI in isolation.
- User product decision: interaction of standing-approval with thread hiding. This integration does not change that policy.

`verification.json` records source hashes and exact verification scope. This file is evidence under existing owners, not another product contract or owner map. The current actor used the general Supabase connector with bounded SELECT only; no work_log row, dispatch or ACK was fabricated. Scope is released on delivery.

## Hosted result

PR1132 merged into the existing Preview branch at `a4a30c97ca588deb0036797cacada0d9f01b3145`. Deployment `dpl_9yv6MKv7HwsMggNUP6NADSnTgbAw` is READY at https://sod1820-b4pq1mbj6-sod1820-s-projects.vercel.app. The previous base and complete Community source are ancestors; the merged product is byte-identical to the tested product code outside documentation.

Authorized protected HTTP checks returned 200, the exact merge SHA, read-only bootstrap and noindex for Community and the existing Home/Posts/Post/World/Number/Code/ELS routes. Runtime ownership is unchanged: Community and the main surfaces use 2029; Code/ELS retain Legacy. The deployed worker matches the checked-in renderer byte for byte. The Community document hash, receipt identity and inventory identity also match; the inventory lists 424 artifacts. This is not a claim that all artifacts were independently downloaded or that a hosted user completed the flow. See `deployment.json` and `hosted-verification.json`.

GitHub automatically marked source PR1129 merged by ancestry after PR1132 included its full head. There was no separate source merge or manual closure. Main and the last observed Production SHA remain `6ef3ec2d6c139cd06af628b20ac2d5c3fb776a70`. No migration, notification trigger or ownership backfill was executed.

Remote annotated archive tag `archive/2029-unified-community-20261019-a4a30c97` peels to the new merge. The current session handoff is updated on the separate documentation branch `gpt/2029-community-unified-handoff-20261019`; it retains the previous freeze as history. Temporary access capabilities are excluded from repository evidence.
