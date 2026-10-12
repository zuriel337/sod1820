# Unified page intros and icons — local handoff

Actor GPT · task `UNIFIED_PAGE_INTRO_ICONS_20261009` · owner Design V2 / Experience v9 / existing System Frame.

Implemented above `af970703` (Number/M3), based on `origin/main 8e939d3b`.
Branch: `codex/unified-page-intro-icons-20261009`. Branch only; not pushed, merged or live.

- All shared page intros use a narrow, naturally wrapping title strip on desktop/mobile. Existing rings are confined to the 44–48px identity area; continuous orbit and overflowing edge light are removed. Required copy is not hidden or truncated.
- Home, Journey, Calculator, Number, Video and Control Plane symbol props consume NavigationIcon2029. Existing compact surfaces already use that family. Number/Post intros without copy remain absent. Canonical brand and Raziel identities remain separate.
- Signature icons retain the same shared SVG geometry and CSS depth. Old halo/orbit/spark nodes and legacy glyph filters/animations no longer leak into the new projection. The 2029 Journey login gate now uses the Journey Signature icon; legacy gate and auth behavior are unchanged.
- Hover/focus/press feedback plus one finite 320ms pointer pulse. Touch does not depend on browser :active behavior. Repeated pulses cancel their predecessor; no permanent animation, timer, global listener, new store or renderer. Reduced motion is checked before starting and CSS suppresses movement when either preference is active.
- Hero images were not invented or attached. Home/Journey may consume meaningful existing canonical media later; title-strip sizing is independent of that content composition.

## Validation

PASS: both application builds; `scripts/test-2029-system-frame.mjs`; `scripts/test-2029-isolation.mjs`; `git diff --check`.

Browser: Home/Journey/Calculator/Books at 1440/390/320; no intro overflow or fixed minimum height; no continuous ring animation. Desktop Home/Journey intro about 111px, smallest tested mobile intros up to 191px as copy wraps. Day/Parchment/Night screenshots. OS/frame reduced-motion checks. Mouse hover/press/release and keyboard focus on Signature. Emulated Chromium touch on both the real Journey header SVG and real Journey Signature gate: one bounded pulse, returns to rest, no JavaScript errors. Fixture gallery also passes touch and mobile layout. No authenticated Journey flow or product-data correctness claims from these presentation tests.

Full-app tests use external-request blocking to prevent writes; they validate presentation, not live data. Video route browser attempt did not complete; its symbol change is build-verified only. Production browser access was blocked in the preceding audit; this task makes no production verification claim.

Evidence: `/workspace/artifacts/unified-icons-20261009/` — gallery.html, motion.gif, screenshots, checks.json, motion.json, actual-touch.json and reproduction scripts. Files are local; not a cross-session transfer receipt.

## Coordination and integration

Claim `82a6a9e2-1746-4093-9859-4d8d3b2e8f77`. Chrome claim `d8b48306` remains respected: no changes to SystemFrame2029, DiscoveryGate, global topbar/rail or command island. Intro CSS is imported through the existing compatibility module, without adding a frame implementation. Active World/Heichal/Post/ELS page files are untouched.

Release advice: BUNDLE_WITH the Number/M3 parent (`af970703`) and reconcile with the existing Chrome lane before integration. This is not release authorization. Broader Journey/source-handoff gaps and M3 SOURCE_GAP remain as previously documented; this visual work does not close them.
