# Personal Area explicit Raziel companion

Task: `PERSONAL_AREA_EXPLICIT_RAZIEL_COMPANION_20261026`.

## Boundary

- Base: `77d0ead10d4da2520382e6a69a8a0c8c0ce299bf`.
- Branch: `gpt/2029-personal-area-explicit-raziel-companion-20261026`.
- My Workspace keeps the existing deterministic Raziel presence and the existing `RazielSessionProvider2029` session.
- Opening My Workspace, opening Raziel, navigation and refresh do not submit a turn.
- Only the explicit **עזור לי בצעד הבא** action calls `submitPersonalAreaCompanion`.
- The action sends the closed tokens `personal_overview` / `current_step` and an empty opaque-reference list. It sends no evidence pack, private hint text, family names, birth dates, signed media URLs, ELS terms or calculator state.
- The same Raziel panel opens immediately and displays the mocked response in the same thread.
- The existing provider in-flight guard deduplicates a double click. The existing principal-key remount aborts an active request and discards late answers or quota events.

No Provider, session, transport, store, API, Edge Function, DB/RLS, quota, credit or registration behavior changed. The live server is not assumed to support this branch-only contract.

## Browser acceptance

The built app ran against intercepted anonymous/auth reads and a marked synthetic companion transport only:

- 320, 390 and 1440 pixels.
- light, parchment and dark presets.
- opening My Workspace and opening the existing conversation: zero model calls.
- a programmatic double click on the explicit companion action: exactly one synthetic companion call.
- every accepted call contained only `capability=personal_overview`, `focus=current_step` and zero opaque refs.
- zero ELS calls, family-research calls, unexpected writes, private telemetry, private model payload or live requests.
- saved conversations, rename, delete, repeat save, exact return and guest → account A → logout → account B isolation remained intact.

Evidence: `docs/reviews/personal-area-explicit-raziel-companion-evidence-20261026/`.

## Continuation boundary

The companion response uses a mock transport in acceptance. No hosted Preview, live `ai-analyze` deployment, main merge or Production action is part of this slice. Central integration must retain the single existing session and separately decide when the server-side companion contract is deployable.
