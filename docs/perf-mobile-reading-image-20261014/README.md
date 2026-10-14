# PR1100 — faithful mobile reading-image rendition (BRANCH_ONLY)

Task: CLAUDE_1100_MOBILE_READING_IMAGE_20261014 · base 5dd4afaa (PR1100) · main 12fea7a3.

## Change
- `mobileReadingImage2029.js` (pure): maps an eligible original to the existing native render URL
  (`/object/public/` → `/render/image/public/`, `width=768&resize=contain&quality=90&format=origin`).
  Eligible only: `primary`, not `thumbnail`, https, origin == `SUPABASE_URL` (from `supabasePublicConfig.js`),
  no query/hash/credentials, path `/storage/v1/object/public/media/sod1820/2029/image/**/reading-vN.jpg`.
- `CanonicalMediaImage2029.jsx`: eligible images render `<picture style="display:contents"><source media="(max-width:420px) and (max-resolution:2dppx)" type="image/jpeg" srcSet=rendition><img …original…></picture>`.
  The `<img>` keeps original `src`, alt, class, `loading`, `data-media-fit`. Ineligible → byte-identical markup to before.
- Fallback: `onError` on the img (only while a rendition is in play) drops the `<source>` for that src → exact original; no retry loop.
- Figure/Lightbox untouched: they consume the original `item`, so click-through is original resolution.

## Evidence
- `node --test src/components/experience2029/mobileReadingImage2029.test.js`: 5/5 pass (gates: private/sign, external/http/lookalike host, query/hash, version/path shape, thumbnail/non-primary).
- SSR markup check (react-dom/server) of eligible primary / eligible non-primary / external primary: as described above.
- `SOD_BUILD_TARGET=2029 vite build`: OK.

## NOT_MEASURED
- No hosted preview/fixtures; this runtime's proxy returns 403 on the Supabase render endpoint, so rendition fetch, `currentSrc` at DPR2 vs DPR3/desktop, geometry, Lightbox and onError failure path were not browser-verified. No speed claim; expected ~160KB saved per eligible cover (bytes only, per GPT's measurement).
- Note: `onError` on `<img>` inside `<picture>` is the standard signal for a failed selected source; verify in the real runner.

## Rollback
Revert the single application commit (restores the plain `<img>`).
