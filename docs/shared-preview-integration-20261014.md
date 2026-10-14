# Unified preview integration · 14 October 2026

Preview only. No main push, production deployment, live flag/environment changes or product DB writes are authorized.

## Exact source heads

- Home: PR1086 `ed9dc0043e39150ff22e1a28cec170eceb4dc7fe`, includes PR1083 `f078ab721828497a195e30c729f0369c3b9501b7`.
- Number: PR1087 `b47ed9f020e83406ca9a4c3e21d6a043d784d3d6`.
- World: PR1072 `21a61f67` is already an ancestor of main4651042d and this Home base. Merged does not imply live.
- Contract: main `4651042dc5fdb09e872d9c9bbec688c070e7172a`.
- Flags: PR1091 `3ffb7fea4e1d905ec8024b5231bdf7453d590ca6`, in-flight sharing only; no 30-second stale lock cache.

## Human decision · 14 October 2026 00:33 Asia/Jerusalem

ZURIEL selected the Number-only Night palette from PR1087. Home, World and global chrome retain warm black-brown and restrained gold. PR1088 global recoloring and its second Number token mechanism are excluded. Day/Parchment/Night remain the existing three presets and theme owner.

## Technical conflict resolution

Six conflicted paths were reconciled. SystemFrame retains clean preview routes from1083 and functional current-context/source-return updates from1087. NumberDrawer retains1087 expression/method/crossing handoff, with the shared clean Number URL helper. Palette retains warm Night and the single1087 Number scope. Browser fixtures have one lock_number entry; clean Number URL assertions retain focus/method parameters. New helper tests use the same clean route contract.

No independent visual restyling was introduced during integration.

## Checks before visual handoff

- Both Legacy and2029 builds: PASS.
-25 Number/context/crossing/Home density unit cases: PASS.
-3 getSiteFlags concurrency/freshness/retry cases: PASS.
- Source isolation, System Frame, canonical contract wiring, Legacy research containment, Number preview: PASS.

These are technical checks only, not full exact-head GitHub/browser release acceptance.

## Existing visual lane / blockers

Continue SYSTEMFRAME_ONE_SHELL_WORLD_HOME_20261013; do not create a competing preview.

- Home mobile CLS failed on source1086:0.4764 >0.1. Preserve compact approved design, repair loading geometry without loosening threshold. CI logs identify h29-quiet shift186→522 and decorative particles.
- Preserve unique PR1044 Companion tabs, mobile one-feed projection and thin progress from8b55d9eb after exact-hunk reconciliation. Do not merge obsolete branch wholesale.
- Shell-lazy performance handoff59ca4053 is separate; consume only shell-owned hunks after owner inspection. PERF_SHARED_LOAD_MAIN_20261013 is still an active writer for data helpers.
- Final actual browser verification:320/390/1440/1920 and all three presets; Home/World/Number and contextual Number in warm host; navigation, back, refresh, keyboard, overflow, CLS and request counts. Disclose lock fixtures and media substitutes separately from real user acceptance.
- Preview shares live readers: tests must block writes/telemetry and retain existing lock/privacy gates. No live flag changes.
- Whole branch includes launch routing from1083; it is a preview integration candidate, not a production-safe delta to legacy-live-base99249526. Keep production separate.

Release remains HOLD until visual/built/browser/ELS and exact-head CI gates complete. The hosted preview may be used for diagnosis but must not be called release-ready.
