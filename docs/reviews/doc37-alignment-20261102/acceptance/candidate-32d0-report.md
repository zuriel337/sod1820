# Exact return fixed; mixed page completion still shifts —32d0719a

Product `32d0719a9ad2ae97ea6ef1d6ac1a01ce041babb5`.
Protected Preview https://sod1820-lfg5e4773-sod1820-s-projects.vercel.app,
deployment `dpl_Fh5TQMB9hfPpqS3oEErgzfJTEocd`.

**Overall affected-route acceptance remains FAILED on unchangedCLS0.1.** Exact
scroll restoration now passes. The remaining measured failure is delayed
page2 boundary completion, separate from the repaired video route and return.

## Accepted assertions on this Preview

- Actual public source, credit/date, native URL, no extra sourceGET onHome,
  one minimal source/asset pair on explicit series entry, bounded rankHEAD.
- Real page2: at most24 distinct identities, no duplicated identity with page1;
  back restores the actual departing page1 pagination position within2px:
  mobile17040→17040, desktop7190→7190.
- After genuine wheel intent to continue reading, video departure and exact
  return pass: mobile2500→2500, desktop1199→1199. Capture-phase actual clickY
  equals the saved pre-click measurement. Repeated browserforward to video and
  back also preserves URL and scroll. No playback was attempted.
- Six separate direct-series controlled cases pass: pending genuine response,
  sourcefailed, private, expired, duplicatePost and canceledscope. ReadablePosts
  do not wait; private/expired source stops before assetread; failure is notempty.
  Their documentCLS stays below0.1. These are explicit fixtures.
- Directvideo390 and refresh pass with actualSW: initialCLS0.00126339,
  reloadCLS0.00103792. Sourcecredit/date and three limited reads preserved.
  Failure/retry, private and expired cases pass, maxCLS0.00131320; no playable
  metadata is read after denial. **Zero additional play attempts.** The one
  authorized initial-play receipt remains specifically51ad.

## Retained harness calibration failure

The first32d batch compared scroll17040/7190 captured too early with later
return2500/1199. A single diagnostic found the actual source-link click at2500,
matching the final return. `scrollIntoViewIfNeeded` is programmatic and does not
represent human wheel/pointer intent; the new POP restorer was still correctly
preserving the previous pagination position until the realclick.

The corrected harness uses an actual wheel event to announce reading intent,
then verifies its pre-click reading against capture-phase clickY. It separately
checks the prior page2→page1 restoration before any nextscroll. No history state,
product state or CSS was injected, and2px tolerance was not changed. Both the
initial failed measurement and its diagnostic remain archived; they are not a
new product return failure.

## Remaining CLS failure, with attribution

The full native sequence passes its return assertions but fails documentCLS:
390=0.44580304;1440=0.28666701. Navigation shifts were not excluded.

A further390 diagnostic reproduces0.44580304 and identifies the dominant event
at6373.1ms, on `?series=messages-from-righteous&page=2`:

- `hadRecentInput=false`.
- Before:24Posts visible, source-completion notice still pending; scrollY1251,
  documentheight18598.
- After:24Posts, completion notice ready; scrollY still1251, height18546.
- A visible `ARTICLE.sod29-library-post-card` previously atx24,y258.875,
  width327,height641.125 is pushed outside the viewport when the required
  predecessor Post is inserted to finish the mixed-page offset correction.
- Shiftvalue0.44580304 dominates the session. This is delayed content reordering
  inpage2, not the video→series restoration or a font/network diagnosis.

Raw shift rectangles, timestamps, input flags, notices, Post counts, document
height and route/scroll chronology are preserved in
`series-cls-diagnostic-32d0/series.json` within the archive. Other smaller notice
shifts remain recorded; none was filtered to obtain a passing score.

## Next bounded acceptance and limits

Root owns the proven page2 completion fix. After that, run affected native
source/page2/video/back/forward and controlled cases, then the prepared failure
readiness and real-wheel cancellation duringPOP cases. Those additional return
fault cases were prepared but not executed in this window. Two exact-identity
Home smoke checks with actual asset identifiers remain pending on the next
candidate. Do not infer compiled Home parity from differently configured local
builds or call the5bb benchmark a32d measurement.

No fullHome benchmark, World/Number rerun, model, authentication, newsletter,
product write, private-data read or deployment was performed by this lane.
Browsersclosed before releasing the exclusive window. The same task-ownedXorg
display remains available; product files are untouched.

`native-32d0-evidence.zip` and its manifest retain all runs and failures with
hashes and0secret-scan findings. No private config, access token, cookie, headers
or browserprofile is included.
