# ELS first-search onboarding + registered advanced search · 2026-11-23

Status: implementation acceptance package, BRANCH ONLY. No code, release, or database/permissions change. Requested by ZURIEL.

## Verified on current default branch

- `/code` is hosted by `src/pages/Els2029Page.jsx`, rendering `ElsNativeClassic2029`.
- `src/lib/publicReadingRelease2029.js` projects `publicReadingActionsLocked(isAdmin)` for non-admins in the public-reading build. `Els2029Page.jsx` uses this to choose `publicClassic`, and currently Guided/Research/advanced are privileged rather than merely registered.
- `ElsNativeClassic2029.jsx` already renders a `חיפוש מתקדם` control in its research profile and accepts the `advancedSearch` component passed by `Els2029Page.jsx`.
- The older canonical vanilla engine (`tools/els/els-code.template.html` built into `public/tzofen.html`) has an existing onboarding, coach, tier messaging, and cloud-save path described in `tools/els/README.md`. This does **not** prove the native /code first-user presentation visibly exposes them.
- `src/components/TzofenEmbed.jsx` bridges auth tier and the canonical engine. Do not create a parallel engine/identity protocol.
- Guided discovery and AI are deliberately admin-only, and must **not** be unlocked by implementing this request.
- The design owner lane for 2029 surfaces belongs to CLAUDE per the canonical owner index; implementation of the UI needs a coordinated visual owner.

## User-approved product change

1. Add understated, accessible banner at TOP of /code: "הצופן התנ״כי נמצא בבנייה מתקדמת. המערכת פתוחה להתנסות ולמחקר, ויכולות נוספות מתווספות בהדרגה." No implication every experimental control works.
2. Offer an OPTIONAL, non-blocking 3-step guide from a visible "איך מחפשים בצופן?" control. Step 1: input short Hebrew term (2–5 letters). Step 2: explain skip and directions. Step 3: read the actual returned matrix and provenance. Show only engine-verified example; never fabricate output.
3. Keep the regular public Classic experience available to anonymous visitors, consistent with existing release projection.
4. Make *only the approved bounded advanced search* available to authenticated registered users; distinguish it from administrator-only Guided discovery, AI scan, Raziel admin modes, and deep research.
5. Anonymous users see a registration/login CTA instead of an operative advanced control. On successful login, return to the same /code context without leaking terms in URL/logs. Registration must not imply a paid subscription.
6. Enforcement is not solely hiding a button. Verify the actual advanced operations / API / RLS and do not loosen permissions to admit admin-only operations. If the advanced component requires privileged endpoints, separate or scope only safe capabilities before release.
7. Preserve engine search fidelity, saving, public cipher links, ELS privacy, single-engine iframe state, owner law, and shell bundle budget.

## Implement in two non-overlapping lanes

**Capability/auth lane (GPT/Codex)**: trace `ElsAdvancedSearch2029.jsx` and its transports, propose a small explicit registered-user capability boundary, server enforcement where needed, and automated tests. Do not change privileged auth, flags, DB or live release without exact Human Gate.

**Surface lane (CLAUDE)**: implement top warning, discovery of optional tutorial, 3-step text and account CTA in existing `Els2029Page.jsx` / nested existing components, using design system. No new global UI owner, no static import into SystemFrame or shell; only lazy UI.

## Mandatory acceptance tests

- Anonymous /code can run baseline Classic; cannot invoke the newly gated advanced operations via UI or direct API.
- Registered non-admin can use *only* reviewed advanced search, without paid entitlement, and remains barred from Guided/AI/admin-only functions.
- Admin retains all previously supported capabilities.
- Authentication revalidation does not remount the canonical engine or erase active search unexpectedly.
- Onboarding is discoverable, optional, keyboard accessible, RTL mobile 390 and desktop 1440, and does not store search terms in analytics.
- Banner visible before interaction in both responsive layouts.
- Build and all relevant ELS/auth/security/browser checks pass; `npm run build` postbuild shell budget cannot be raised.
- Comparison of performance must use comparable builds; no claim of LIVE without approved merge + exact production deployment.

## Handoff

Read-only DB coordination lookup of current `work_log_current` for ELS-specific assignments returned no matching rows at check time; this is not proof no other broader-scope writer exists. No explicit production authorization was requested or consumed. This package is a concrete engineering acceptance plan, not an implementation claim.
