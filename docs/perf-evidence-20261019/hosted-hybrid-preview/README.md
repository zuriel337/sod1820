# Hosted Hybrid Preview acceptance handoff

Date: 2026-10-19

Task: `HOSTED_HYBRID_PREVIEW_20261019`

Implementation branch: `gpt/hosted-hybrid-preview-20261019`

Integration target: `gpt/2029-hybrid-stage-preview-20261018`

Integration base inspected: `aa0b27500457bb89f96f36ecf0a73b7a80488c50`

Locally sealed implementation SHA: `f2f5cc8ceca67743b8fe6bb6f80a3d2a7592173a`

## Outcome

The existing Legacy-first Hybrid build can now produce a Vercel Preview artifact without weakening its read-only boundary. The hosted builder emits both Legacy and 2029 documents, keeps the committed route policy unchanged, replaces the local-only guard with the same content-bound Service Worker attestation already used by the integrated 2029 Preview, and seals the complete artifact inventory.

This is Preview infrastructure only. It does not merge a product branch, promote a deployment, change Production, alter Legacy or 2029 product behavior, write to Supabase, change RLS, or change live flags.

## Exact behavior

- Default and unknown routes remain on `legacy.html`.
- The 25 approved candidate routes use `2029.html`.
- `/code` and `/els` remain explicit Legacy routes through `index.html`.
- All three entry documents retain `noindex,nofollow,noarchive` and an explicit runtime marker.
- Each document blocks writes before application import, registers the exact content-hashed worker, verifies commit, branch, host, build target and allowlist, and imports its product entry only after a matching attestation.
- The worker blocks product writes after the early transport guard is released. The existing governed read RPC allowlist and existing-account authentication exceptions remain unchanged.
- Wrong target, environment, branch, commit, host, dirty source, missing local guard or ambiguous entry script fail before a hosted artifact is accepted.
- `preview-build.json`, `preview-artifacts.json` and `hybrid-preview-build.json` bind the source and every emitted file by SHA-256.

The shared bootstrap was extracted from `build-integrated-preview.mjs`; the integrated 2029 Preview continues to use the same behavior and passed its existing browser acceptance after the refactor.

## Verification

The final product-code implementation at `f2f5cc8c` was built from a clean checkout with a synthetic approved Vercel hostname. The Hybrid receipt sealed 418 artifacts.

- Hosted Hybrid contract: 4/4 passed, including exact Vercel routing/config, full inventory verification and Chromium attestation on one unknown Legacy route and `/world` in 2029.
- Hybrid routing/build contract: 7 passed; the local-only browser case was correctly skipped against the hosted artifact and had passed earlier against the local artifact.
- Preview worker policy: 8/8 passed.
- Integrated Preview source/inventory gate: 7/7 passed against a real generated integrated artifact.
- Integrated Preview browser regression: receipt and complete first-install/reload/internal-navigation/back-forward/fresh-context attestation passed.
- Both Legacy and 2029 production builds completed. Existing Vite large-chunk warnings remain; this task makes no speed claim.

The Hybrid browser harness validates the exact sealed HTML and worker. To avoid HTTP/1.1 preload contention in the local TLS server, it removes preload links and substitutes only the final product entry with a tiny probe. The separate artifact inventory test validates the stored documents and assets byte-for-byte.

## Hosted acceptance status

No real Vercel Preview URL is claimed here. The current project configuration disables broad `gpt/*` deployments and enables only the exact integration branch. Therefore the feature branch is intentionally not deployable. After review and an explicitly authorized merge into `gpt/2029-hybrid-stage-preview-20261018`, Vercel must build that exact branch and the returned deployment must be checked for:

1. successful build receipt with the deployed commit and hostname;
2. Legacy fallback plus the approved 2029 route set;
3. read-only attestation and blocked writes in both runtimes;
4. Number, Home, World and Post acceptance on the hosted URL;
5. noindex headers/content and no Production promotion.

Until that hosted check passes, this is a tested implementation candidate and not a new unified release head.
