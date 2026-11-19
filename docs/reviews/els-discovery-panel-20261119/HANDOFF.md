# Discovery panel — 19 November 2026

Branch: `ccr-06bc2910-pgarr4`, PR #1397. Base: `8ce8cca6c2a030c4a50c185be5a5a648870180bf`.

## Implemented scope

Research has one Discovery launcher, using the existing SystemToolDock2029 action projection and existing contextual inspector. Its icon is a small sapphire matrix crossed by a gold discovery path (`public/brand/els/discovery.svg`). The icon is surface CSS/asset only; no global frame or icon source changed.

The frame's three tool slots remain Discovery / Results / Save. Discovery replaces the Research scan launcher; its existing “חפש מילה מסוימת” action opens the canonical findings/search tools. Classic retains Scan / Results / Save. Local launchers are hidden when the shared dock exists, and remain available in fullscreen or without the frame. Fullscreen reuses the same mounted workspace.

Discovery retains its three views (findings, structures/groups, deepening), Fable extension, manual-word jump, source filters, saved scans and exact source ownership. Launch buttons and filter groups use equal tracks; odd final filters span the row. No ranking, caps, canonical engine or storage contract changed. Saved scans remain marked under construction; this does not fix the reported account save failure.

Opening tools does not start scanning or load the discovery dictionary. Closing/switching the inspector preserves local state and does not itself pause an active scan. Existing context change, profile/route deactivation, account and cancellation rules remain authoritative. This is not a new durable background-work service.

## Ownership and release boundaries

No edits to SystemToolDock2029, SystemFrame2029 or the speed session's frame files. No new global bar; no merge of its branch. This adapter works with the currently checked-out frame. Future frame integration remains its owner's task.

No Production, SQL write, secret, flag, Edge Function, engine-limit change, merge or deployment. The existing Preview is still based on `2dcad44aa`; a new Preview requires exact-commit approval.

## Validation

See the final PR head note for completed local checks. Native browser checks cover 320/360/390/1440 widths, three themes, keyboard close/reopen, preserved settings/draft and source identity, one launcher, equal action widths, no implicit engine/AI work, fullscreen reuse, Fable and shared-frame integration. CI is reported separately and must not be inferred from local results.

Completed locally: 24/24 unit contracts (Classic, joint discovery and saved discovery); 6/6 targeted native browser scenarios (capability views, shared inspector/responsive controls, fullscreen, frame registration/Raziel, Fable entry, engine→Fable joint list); 1/1 saved-discovery lifecycle browser scenario; `npm run build` including shell budget; `git diff --check`. Full native suite and new-head CI were not run locally. No browser errors were suppressed; earlier old-layout assertions were updated for the approved layout, and the four-action frame regression was fixed by retaining three dock slots.
