# Legacy Production lock — 22.10.2026

Status: ACTIVE by explicit ZURIEL Human Gate.

## Production pin

- Project: `sod1820`
- Canonical domains: `sod1820.co.il`, `www.sod1820.co.il`, `sod1820.vercel.app`
- Deployment: `dpl_46k9WvaD5QBUo969obYzJ7pKkNyq`
- Commit: `99249526e91f1d720fae1aa43e82bbbe51ee5c45`
- Product: Legacy
- Vercel automatic custom-domain assignment: disabled

All 2029 work remains Preview-only. A READY deployment, merge to `main`, generic release instruction, historical cutover approval or rollback request does not authorize changing the canonical aliases.

## Mandatory gate

`node scripts/test-legacy-production-lock.mjs` rejects:

- `CORE_PUBLIC_LAUNCH_2029=true`;
- a canonical Legacy entry redirecting to `/2029`;
- a canonical Legacy entry being rewritten to `2029.html`;
- removing the explicit Legacy alternatives for Home/Post/Chat/Code entry paths.

The gate runs before the normal production build and in GitHub Actions. It must not be changed or bypassed in the same release that attempts a cutover.

## Unlock procedure

Unlocking requires a new, separate ZURIEL approval that explicitly states **2029 Production cutover** and names both the exact tested commit SHA and the exact READY deployment ID. The release owner must then verify the Preview, routing, rollback target and production aliases immediately before the change. Without that exact approval, stop.
