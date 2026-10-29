# Central topbar and menu completion

Task: `CENTRAL_TOPBAR_MENU_COMPLETION_20261029`.
BEFORE: `3dc3bb98-4d34-4003-9bb3-03fec6862ae8`.
Branch: `gpt/2029-central-topbar-menu-completion-20261029`.
Base: `3445e2dcf3b3ee5724713f0b72e5da7cfb6953d0`, the verified central hosted shell.

ZURIEL authorized closing the gaps found in the hosted topbar/menu audit. Bounded
live ownership checks, reconciled against actual full task history, found no
active shared-frame/chrome/builder writer. Existing World/Home, Topic, Books and
server scopes were not claimed or edited. This uses the existing Frame, theme
store, Research Context and Raziel session; it introduces no replacement system.

## Delivered behavior

- Desktop Day/Parchment/Night controls are at least 44x44px, with the existing
  minimum-14px text token, inside the existing 56px header capsule.
- Both existing navigation projections expose `מסע החיים` at `/2029/journey`.
  The label names the actual personal surface, not an invented journeys hub.
  `lock_life_journey`, its loading/fail-closed state and the route guard remain.
- `קהילה` opens the existing `/community/chat` connected community surface. No
  `/community` route, design prototype, content source or permission was created.
- The redundant `אזור משתמשים` row was removed from the destination arrays.
  Header and menu-footer launchers still open the same existing Workspace.
- The static Preview's mock disclosure moves into the open drawer/dialog/chat
  as normal-flow text while its external overlay is hidden. The disclosure stays
  explicit and no longer obscures the navigation controls or chat composer.
  Ordinary non-Preview documents have no mock marker and render no such label.
- The empty Raziel prompt uses public Hebrew rather than internal
  `Silence Gate / Focus / synthesis / pulse` terminology. Opening still performs
  zero model requests; the session/transport/engine and quotas are unchanged.

The existing later logo-toggle composition is preserved. The earlier contract's
fixed topbar-logo wording and the later frozen composition have different
placement descriptions; this task does not invent a new logo or import an older
shell to resolve that discrepancy. A bounded user preference question was sent;
preserving the current placement is the stated default when no alternate choice
is supplied. This is not whole-site visual Golden acceptance.

## Verification

The built actual App is tested at 320/390/980/981/1100/1440 in all three themes:
18 combinations, actual control geometry, no overflow, theme changes/reload,
menu focus/Escape and visible non-overlapping mock disclosure. Eight additional
flows cover the same guest Workspace from both launchers, enabled/locked Journey,
and guest Community navigation/reading at 390 and 1440. Community was not posted
to; the existing app can offer a guest composer, so this is not a claim that the
product is guest read-only. Identity/analytics/visit attempts are intercepted
and recorded separately from reads; no external write or model request is sent.

24 focused Companion/Preview/auth/preference cases and 656 broad Raziel cases
pass. The Preview worker specifically blocks Community add/edit/remove RPCs on
all reviewed central branches. Legacy/2029 builds, built graph/lazy submit adapter
and Research Plan, isolation, System Frame, cheap hardening, Legacy lock and diff
check pass. Synthetic local tests do not prove authenticated private flows.

The exact new branch is added to the existing static Preview builder's allowlist
and central read-only guard. Hosted identity and actual menu/header checks must
match the final commit before central Preview alias assignment. The Vercel REST
deployment request omits `target`, yielding a Preview with `target=null`; it must
not use `target=staging`, which also assigns the default account hostname.

Evidence, hosted deployment identity and the scope release are retained outside
the checkout and in the AFTER record. No main, Production, DB/RLS, Edge Functions,
payments or other sessions' page sources are changed by this cut.
