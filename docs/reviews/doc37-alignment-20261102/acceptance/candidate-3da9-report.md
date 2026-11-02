# Page2 stability fixed; restored reload and native-scroll cancellation open

Product `3da93559352f605059dca231c2e152745701b061`.
Protected Preview https://sod1820-qxqf7wli0-sod1820-s-projects.vercel.app,
deployment `dpl_CNLo6s8fPghSqrD9QtwV8Zzfbvx5`.

**Overall affected-route acceptance remains FAILED.** Two narrower conditions
are now proven: page1 reload at a preserved scroll position shows late source
insertion, and native POP scrolling continues after the user's cancelingwheel.
All prior successful checks and failures are preserved separately.

## What passed on3da

- The complete native sequence before reload now passes unchangedCLS0.1:
  mobile0.034609, desktop0.044150. Actual mixedseries→page2→page1→video→back→
  forward→back retains source identity, credit/date, public hrefs, unique page
  membership and exact scroll within2px. Page2 no longer exposes the provisional
  wrong-offset cards before completing its assignment. This is a correctness
  wait with meaningful progress, **not a speed improvement**.
- Page1 remains incremental: genuine source-delay fixture shows readablePosts
  before source readiness. Sourcefailure, private, expired, duplicatePost and
  canceledscope cases also pass; no denied source text/asset read or false-empty
  failure. These six cases use explicitly controlled browser responses.
- Additional failure during video→series POP settles correctly: source absent,
  Posts retained, exact coordinate2500→2500, no guarddenial/pageerror.
- Two Home390/1440 smoke checks pass exactidentity, actualSW, primarycontent,
  top-only closure, publicseries/dates, existingavailability, compactcentereddock
  and Now reopen. No subscription, login, model, live productwrite or playback.
- Video direct/refresh/privacy/CLS evidence remains32d: its source boundary,
  page and shared player are unchanged in3da. Native series→video was again
  observed on3da. The one brief actual playback belongs only to51ad; no repeat.

## Remaining condition1: reload while already reading the series

After all native return assertions pass, a real browserreload preserves the
current series URL and scroll. Initial Posts render at the saved position while
the approved source is still pending. Insertion of that source moves a visible
Post. Post-reload documentCLS is mobile0.4403464, desktop0.1328043.

At mobile2756.8ms, `hadRecentInput=false`, a visible
`ARTICLE.sod29-library-post-card` moves fromx24,y175.8125,width327,height711.125
to y740.78125 (only159.21875px remain inviewport). The shiftvalue is0.4403464.
Desktop3455.6ms shows the same insertion reflow across its three-column grid.
This is a reload-at-position case, separate from the now-stable page2 completion.
The complete raw rectangles and source states are in the archived native report.

## Remaining condition2: canceling native POP scrolling

The pending-return test sends an actual wheel gesture of−10000 while the source
delivery is held. It expects the viewport to move to the top and stay there.
The first run fails at916px; an additional single diagnostic confirms it:

- POP8527.6ms starts withscroll143 anddocumentheight1043.
- The actual wheel event arrives8645.2ms,scroll170,height1825; its target is
  `DIV.sod29-series-reading-notice`, not a nested scrollbox.
- Despite the upward gesture, native scrolling continues170→634→837→905→925.
- The application restorer does **not** later force the old2500px position,
  showing that its cancellation works. The browser's already-running POP
  movement still continues and defeats the upward gesture.
- After source completion the finalposition is925. No pageerror/guarddenial.

The expectation was not changed to accept the wrong position. Root owns a
bounded correction to restored loading/native movement; no product code was
edited by the evidence lane.

## Actual Home code observations, not byte parity or new benchmark

Recorded before opening Now during the two existing smoke checks:

|Actual3da asset|encodedBodySize|
|---|---:|
|2029-wAU6-8JP.js|87027B|
|Home2029Page-CInaBc5E.js|19035B|
|Sod2029Shell-D8wyU9yv.js|58036B|

Actual5bb observations were87109/19018/58016B, with different assetnames.
Therefore byte parity is **not** asserted. The small observed differences do not
establish a time change; latest full matched benchmark remains explicitly5bb.
No broad World/Number/Home benchmark rerun was performed. Different local build
profiles are not used as proof of hosted asset equality.

## Retained evidence and next pass

`native-3da9-evidence.zip` and manifest retain23 sanitized JSON/image artifacts,
native successes followed by reload failures, returnfaults, the wheel diagnostic
and both Home smokes. Perfile hashes and0secret-scan findings; no cookies,
temporary access URL, credentials, headers or browserprofile. All browsersclosed
before the exclusive local window was released.

The harness also has a prepared explicit held-page2-rank scenario to prove
meaningful loading/no provisional wrong page; it was not run on3da after these
new failures. Next pass should retain the unchanged2px/0.1 thresholds, the actual
wheel/clickcapture protocol and mandatory skipPlayback, and test only affected
route/reload/cancellation plus final Homeidentity as needed.
