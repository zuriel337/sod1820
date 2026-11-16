# Speed series 2: readable content first, the site's shell before specific places (16 November 2026)

ZURIEL, 16.11.2026: "תעשה בשרשרת ... אני רוצה שהתוכן הקריא התוכן של גוגל אוהב התוכן שאנשים אוהבים יהיו במקום ראשון לפני כל פעולות המחקר
רזיאל או כל פעולה שיש פעולות מדידה גם לדחות את הכל אולי נעבוד קודם על המעטפת של כל האתר ואחרי זה ניכנס למקומות פרטניים ... בנוסף גם לבטל את
הפרסומות באתר אני לא רוצה כרגע".

Base: `origin/main` 93daf703e (live: dpl_7yhnPsvfVwqG2qZAR8DUnXDNLNy7). Branch `ccr-dcadb071-v1z5ol`. Branch only until ZURIEL approves an exact
SHA for merge and, separately, for deployment.

## Step 1: the shell (every public page)

| What | Before (main) | Now |
|---|---|---|
| Ads (AdSense) | loaded on Posts and the Posts list for Israeli human visitors | **paused in code** (`ADSENSE_PAUSED`), whatever the build environment holds; no unit, no script. The gating rules (Israel only, no bots, two reading slots) stay tested on the source with the pause lifted, so a resume is one line. The CSP keeps admitting the ad hosts |
| Google tag + Meta Pixel | Home: after its primary column, then idle. Every other page: at the first idle moment, often while the article was still downloading | every public page: after the load event, the page's primary content (Home column, Post article) and its priority image, then idle; bounded at 10 s |
| First-party visit (`track_visit`) and engagement | 150 ms after the address settled | the same gate without the idle wait; at once if the reader leaves or switches away first. Engagement time counts from that moment |
| Hebrew calendar (`@hebcal/core`, ~53 KB gzip) | downloaded with the visit counter on every page view | only with the administrator's traffic reports (lazy `dayContext.js`). The Home still uses it for its own date (content) |
| Frame background reads (public stream, featured Post) | at mount, on every page, in parallel with the page's own data | away from the Home: after the content (same gate); opening "Now" starts them at once. On the Home the feed is content and starts at once, as before |
| Calculator share-link parser | in every page's opening graph | loaded with the calculator at `/gematria` (the Pro page downloads alongside) |

One gate, `afterReadableContent2029` (`src/lib/publicReadingRelease2029.js`), is the single point where a public page's optional work starts.
Pages without a content marker (Community, World, Posts list, privacy...) wait for the load event only.

**Opening graph (the shell budget gate, `npm run build`):** entry 219,545 B gzip against 220,201 on main (−656) although the gate was added;
frame 74,626 (−1,163 against the recorded baseline). The baseline was lowered (`--lower`).

**Raziel and the research provider:** for a public visitor they make no network request at load (site flags are not read for the public;
no personal sync for a guest), so nothing there was deferred. Their code is in the opening graph (ResearchProvider, the Raziel session and
its link registry, about 60 KB minified); moving it out is a larger change, listed below.

### Measured

Lab: see `lab-s2.md` (phone, Slow 4G, 4× CPU; main vs branch, both built with the production client ids; third-party scripts load for real,
their beacons are blocked).

### Not done, not measured, decisions

- **Measurement semantics change (expected):** visits from readers who leave before the content is on screen are written when the page is
  hidden; if the tab is closed outright that write can be lost. Google/Meta no longer see readers who leave before the content (they start
  later). Engagement time now counts from the content, not from the address settling.
- Old draft PRs from another session overlap: #1363 (Google/Pixel after the article) and #1364 (ad library on approach). Not imported
  (CLAUDE.md 0.2). With ads paused and this gate, both are superseded; closing them is ZURIEL's decision.
- The guest updates invitation's own layout shift (Codex diagnostic, CLS 0.68 in its opening window on a phone) belongs to its owner
  session (GUEST_NEWSLETTER_DWELL_20261116); not edited here.
- Moving ResearchProvider/Raziel out of the opening graph: not done (larger refactor, separate step).

## Step 0: field context in the speed measurement

Each Web Vitals sample of the public site now carries, together or not at all:
- `build`: the entry chunk's content hash;
- `device_class`: mobile or desktop, the same class as the visit counter;
- `article_first`: none, served, adopted or replaced;
- `nav_timing`: redirect, worker, DNS, connect, wait and download, in integer ms.

The request worker admits both shapes, so a page still on the previous code during a release is not lost. No database change: `ingest_event`
stores web-vital properties as sent.
