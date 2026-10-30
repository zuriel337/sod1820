# ELS reading / global Raziel responsive Preview

Actor GPT; recipient ZURIEL only. Base: 33eb52fb68bbd395d854f764736a4edc665ce87d.
Branch: gpt/els-reading-responsive-preview-20261030.
The remote base was verified before branching. work_log_current was inspected
read-only at 2026-10-30 04:21 UTC: ELS UI and central public-label scopes were
released; no overlapping active writer was found. This receipt is not a live
work_log write. No central branch or experiment branch was imported.

## Scope and design authority

Use SOD1820_DESIGN_CONTRACT_V2.md at the base revision (including October 26 RTL
composition). Keep the single theme owner, three presets, existing Companion,
mobile sheet and single Command Island. No new bar, Provider, poller, engine,
model route or dictionary load. The previous global scan-presence cut is retained.

- Present ELS direction, skip, positions and verification in Hebrew; hide internal
  corpus hashes and locators from public labels. Transport/context identity is
  unchanged. Preserve genuine English names and search terms, rather than
  transliterating or rewriting them. Bidi isolation covers numeric runs; chat
  paragraphs use auto direction and plaintext bidi resolution.
- Canonical type/palette roles, 44px chat controls, wrapping long English runs,
  readable body copy and a reachable composer in both chat projections.
- The reading badge now meets the 14px metadata floor without literal colors.
- Hosted 320px acceptance caught the inherited floating Preview notice covering
  the Raziel sheet. The reading-only Preview notice now stays in document flow;
  the existing card still discloses administrator access and cost before Start.
- Add only this exact branch to the existing bounded matrix-reading Preview
  allowlist. Preview status/start/cancel/recover permissions are unchanged.

## Verification

- 74 focused ELS/Raziel/reading/Preview checks pass. The consumer assertion now
  checks the Hebrew verification boundary and absence of the old English debug
  labels; it retains the single-provider and explicit-submit assertions.
- Real built SystemFrame, global Provider, mobile Raziel sheet and desktop
  Companion: 320/390/768/1440 × Day/Parchment/Night pass. Computed styles verify
  controls >=44px, control labels >=16px, body 18px and the canonical body family.
  Mixed long English/Hebrew has no page or chat horizontal overflow. Opening
  sends zero model requests; explicit submit sends exactly one intercepted
  request; resize/focus sends none. Reduced motion and keyboard Tab are checked.
  Shortened viewport checks composer reachability, not a physical OS keyboard.
- Actual built navigation chat test passes at 320/1440. Activity/return, matrix
  result card and advanced-page browser tests pass (3/3).
- Full native browser acceptance: 48/48 pass, no skips (387 seconds), including
  Classic privacy/save, connected crossings, exact skip, pinch zoom, three presets
  and the actual Frame/dock integration. No expected search/privacy result weakened.
- Both standard builds pass with real installed dependencies, no stub. Built
  lazy graph, 2029 isolation, System Frame gate and Legacy Production lock pass.
  Preview-specific static build also passes. git diff --check is clean.
- Browser model, identity and data responses are explicit test doubles. No paid
  AI scan, live product DB write, Edge deployment or experiment was run here.
  Screenshots were inspected for the narrow Day sheet and desktop Night chat.

## Release and limits

Only a protected 2029 Preview is authorized. No main/Production promotion, custom
domain assignment, project-wide protection change or server feature flag change.
The Preview still connects explicit administrator scan actions to the already
deployed backend, so it is not an isolated AI environment. Testing must not click
Start against that backend; prior paid results can be recovered explicitly.

Existing limits remain: Raziel is busy while following a scan; a reload requires
explicit recovery; exact return restores the occurrence, not unsaved viewport
or manual findings. Hosted smoke checks do not prove a new live Fable result.
The paused experiment ledger through EXP-23 remains in its original branch at
5b02d668737f383c82ea813f417c5ee3fbc5a203, unchanged by this cut.

Read-only deployment preflight observed all three Production aliases already
on Legacy dpl_AiKPHaoo5pxo9T5PFTpcBRG7LfMA, SHA
8bc5980fe80fdee30652c8f2364608b5916180e3 (October 26 Legacy contributor cut),
not the older October 22 pin printed in this checkout's AGENTS.md. No correction,
rollback or alias operation is part of this task. The local production-lock test
checks source safeguards; it is not evidence that live aliases equal that old pin.
