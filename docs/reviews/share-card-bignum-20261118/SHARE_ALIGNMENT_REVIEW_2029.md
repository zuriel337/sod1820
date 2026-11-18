# 2029 sharing — alignment review (18.11.2026)

**This file is a review record, not a contract.** It owns nothing and adds no rule. Every behaviour below is either (A) already decided by an
existing owner, (B) an implementation fix that brings code back to (A), or (C) a proposal that is **not approved** until ZURIEL decides it.

Status: BRANCH-ONLY (`ccr-dcadb071-v1z5ol-share`, PR #1408). Not merged, not deployed.

## Existing owners (the only authorities)

| Concern | Owner (index: `SOD1820_MASTER_OWNER_INDEX.md` §K/§L/§M) | Code |
|---|---|---|
| Share UI primitive family | `canonical_ui_components_law` v12 (Experience) | `src/components/ShareActions.jsx`, `src/lib/share.js` |
| Share attribution / measurement | `traffic_intelligence_law` v11 | `src/lib/share/shareTelemetry.js`, `src/lib/propagation.js`, `publicReadingTelemetry2029.js` |
| Post identity, canonical address | `project_codex.publishing_conventions` | `src/lib/publicPostUrls.js`, `api/og.js` |
| Private material never becomes public by projection | `person_foundation_contract_law` v6 | — |
| Frame placement | System Frame contract + addenda | `SystemFrame2029.jsx` |
| ELS (cipher) | ELS owners; active writer on ELS files: PR #1397 (Codex) | `src/lib/elsMatrixShare.js`, `ElsMatrixShare2029.jsx` |

## (A) Already decided — restated, with where it is decided

- Expression address is never replaced by its value; old post addresses never move for a redesign; a unit anchor adds no identity —
  publishing conventions + Route/SEO matrix (`docs/w0-2027-route-seo-addressability-matrix-v1.md`).
- A share is recorded only after it happened; opening a sheet is not success — Sharing Foundation repair, Human Gate 5.9.2026
  (`ShareActions.jsx` header comments, `test/or-geula-video-share-2029.test.mjs`).
- Account paths, `claim`, `dm`, `returnTo`, `back` never travel in a frame share — `framePublicShareHref` (System Frame).
- Private content is not made public by sharing — person foundation law.

## (B) Implementation fixes in PR #1408 (bring code back to A)

1. Inspect panel shared raw `location.href` (private keys could travel) under another item's title → same sanitized link as the More panel; nothing
   on a page with no public link.
2. Share text was the shell's static label ("פוסט"/"SOD1820") → the page's own title, only once that page applied it (`pageOwnShareTitle`).
3. A failed system sheet was silent → falls back to the existing copy action and says what happened; a cancel says and records nothing.
4. Image share dropped its link → the link travels with the image.
5. `/gallery` kept the previous page's title/canonical → applies the same title, description and robots the server sends.

## (C) Proposals — NOT approved; prepared or described for ZURIEL's decision

| # | Proposal | State |
|---|---|---|
| C1 | Remove the persistent device id `rid` from shared links; keep `src` | prepared on a separate branch (privacy/analytics contract change, shown before release) |
| C2 | Strip fbclid/gclid/utm and other tracking keys from the **copy made for sharing** only (arrival capture unchanged) | prepared with C1 |
| C3 | Calculators: clean link by default; sharing the input is an explicit second action showing what is exposed | design described, not built |
| C4 | Topic and contributor share buttons (existing component, public entities with a valid target only) | prepared on a separate UI branch |
| C5 | Cipher page: frame share of the bare public page address, no search or research state | prepared on the UI branch |
| C6 | Unify Lightbox / ELS matrix share with ShareActions after equivalence tests | not started (behaviours to preserve listed in the report) |
| C7 | "Now": share for old WordPress posts and updated posts (`href` is already canonical) | prepared on the UI branch after the data check |
| C8 | Separate image download from share in measurement (new field through the analytics owner; history untouched) | needs a DB/telemetry field admission — described only |
| C9 | Full ELS finding share (open the same finding with marks and context, no automatic scan) | plan and decisions only; overlaps #1397 |
| C10 | Signed card addresses | not added (ZURIEL 18.11) |

## Tests

`test/share-contract-2029.test.mjs` (new), `test/or-geula-video-share-2029.test.mjs` and
`src/components/experience2029/frameRenewalShare2029.test.js` (expectations updated to B1–B3: same rules, new shape).
Not tested here: real share sheets on devices, in-app browsers.
