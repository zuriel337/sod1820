# Home JavaScript acceptance — measured product 25709d70

Before: `0d4ad83644a74abe5d990f7a628dd955fd0c638a`.
After: `25709d70b9c9945078e88ae14fd1363ba2e211b3`, protected Preview
https://sod1820-2hgv4utnl-sod1820-s-projects.vercel.app,
`dpl_FWpXaiipc8biDpQNodwLTf84899F`.
These measurements are not relabeled as a later documentation/build-only commit.

The measured split improves cold mobile primary Home without removing content
or changing its approved animation. In three matched cold journeys, primary DOM
is 4.887 → 4.278 seconds; a separate passive Home-only cohort records readable
title at effective opacity≥.95 at 5.220 → 4.676 seconds, primary action at
5.569 → 5.009 seconds. The latter includes the unchanged entrance motion. It
would be inaccurate to present the earlier DOM marker as fully readable paint.
All title/action rectangles are fully inside the viewport at these milestones.

The improvement is bounded: returning mobile Home in the separate visible
cohort is 0.990 → 1.038 seconds, and desktop has mixed results. The immediate
first Post cold-mobile median is 0.717 → 0.816 seconds, a 99 ms regression with
an after range 0.626–0.975 seconds. Post preparation was retained deliberately;
this is not an optimization obtained by delaying all Post work to the click.
The desktop cold Number material/method median regresses5.641 →6.504 seconds
(+0.862 seconds); useful header regresses1.675 →1.886. This is retained as a
material-stage regression, not excused by the faster mobile Home. There is no
broad claim that every transition or every desktop visit is faster.

## Repeated conditions and complete results

[Matched tables](matched-tables.md) include every one of the 13 transition stages,
all four viewport/cache conditions, Number useful-header versus material/method
completion, regressions and CLS. [Summary JSON](paired-summary-0d4a-2570.json)
retains ranges and individual values. All 24 real-data journey loops complete;
all 24 completed Home-only observations pass. Every attempt is archived.

Both targets use headed Chromium154, localehe-IL, height900, actual protected
Preview service worker and the same independent read-only guard. Mobile390 is
CPU4×, RTT150 ms, download200000B/s, upload100000B/s; desktop1440 is unthrottled.
Each target/width has three independent contexts, each cold then actual reload
warm. Baseline and candidate alternate. No concurrent local build/test ran in
these accepted cohorts. The Home-only warm visit follows the product's natural
session entrance-complete mark; no session state or styles were injected.
The immediate-Post journey does not first wait for every secondary Home read.
It pins `/post/sprites-lightning-over-france`, not a secondary-series Post.

The guard blocks four `POST /rest/v1/rpc/lang_links_list` calls per full loop:
48 per target, 96 total. They were never forwarded, hidden or added to the
allowlist. Thus Number navigation/calculation assertions passing is not full
unrestricted acceptance of that RPC or its data. There are no other unexpected
denials and no pageerrors in the completed paired journeys. Maximum full-loop
CLS is0.054220 on mobile and0.050441 on desktop, both below0.1; Home-only maximum
is0.000183. Existing journey return tolerance was unchanged; focused historic
2px restoration receipts remain separate and were not rerun without impact.

Cold mobile World→Number primary is2.952 →2.795 seconds, while complete admitted
material/method readiness is8.126 →7.260. Warm material is6.259 →6.291. These
are distinct milestones, not a claim that all Number work finishes at2.8 seconds.
The remaining material wait is visible and documented; this small Home split
is not a server/database optimization. Immediate Post and milui regressions
remain in the tables. No measured useful-transition median regresses by>0.3s.

## Download versus processing

Same-condition cold mobile JavaScript requests completed before primary carry
538345 →421896 transfer bytes, including response overhead, and517945 →403896
encoded body bytes. Requests that *started* before primary eventually carry
567892 →503277 encoded body bytes; that larger count is not bytes already
received at primary. Some admitted async readers and retained Post preparation
start before primary without being prerequisites for it. Counts alone are not
proof of elapsed-time improvement. The cold-mobile completed-request span is
4.593 →4.008 seconds; this wall interval overlaps execution and is not an
exclusive blocking duration. Warm transfer is0 through cache while code still
executes. See full network table for desktop, which does not show a consistent
latency gain.

Root's separately built identical-profile graph measured static Home gzip
472047 →355102 bytes (-116945), entry238749 →184172, and Home plus retained Post
preparation544626 →456507. These local compiled gzip figures differ from actual
served transfer and are not substituted for browser measurements.

One separately instrumented mobile visit per version collects CDP sampling,
trace and precise coverage. It is diagnostic, not part of latency medians.
[CPU summary](cpu-summary-0d4a-2570.json) clips sample weights and trace intervals
to actual primary DOM (5.097 →4.284 seconds) and retains functions/chunks/threads.

| Diagnostic before primary | Before | After |
|---|---:|---:|
| Product JS direct self-sample weight |625.131 ms|496.318 ms|
| Main-thread captured compile interval union |18.218 ms|15.924 ms|
| Main-thread module/script evaluation union |173.454 ms|102.679 ms|
| Main-thread FunctionCall interval union |580.117 ms|487.149 ms|
| Main-thread Layout interval union |251.299 ms|231.510 ms|
| Main-thread style-update interval union |40.301 ms|53.360 ms|
| Separate SW compile interval union |2.287 ms|3.794 ms|
| Separate SW evaluation interval union |2.509 ms|4.077 ms|
| Separate SW FunctionCall interval union |9.472 ms|6.607 ms|

Intervals/categories overlap; do not sum them into elapsed time or add them to
network spans. Captured v8.compile/compileModule events are not a complete
partition of parsing, streaming compilation and off-thread compiler work.
Self samples are not inclusive module cost. The entry contains runtime and
application code; no blanket attribution to React is made. CDP cumulative
ScriptDuration is0.882 →0.662 seconds and TaskDuration2.222 →1.585 at driver
observation; that observation trails actual DOM by556 →132 ms, so these counters
are not an exact same-milestone CPU comparison. The clipped trace/profile is the
appropriate primary-boundary diagnostic.

Coverage observed at the later driver checkpoint is approximately391784/1604282
→298876/1068151 executed/total UTF-16 code units using nested range overrides.
It is not byte coverage or evidence that whole unused capabilities can be deleted.
The historical source-aware initiator chain shows primary public Posts data
arriving before late static Home dependencies. That, the source graph, and these
processing observations support splitting unused eager paths; they do not turn
five seconds of Home latency into five seconds of JavaScript CPU. Local font
warming was about6 ms in the historical diagnostic, not a demonstrated bottleneck.

The Home-only image completes at5.654 →5.172 seconds on cold mobile. The immediate
Post protocol can leave/abort Home media and cannot prove complete-image gains.
The passive Home-only result is the appropriate evidence, with its ranges and
unchanged image content retained.

## Platform difference, incomplete attempt and slow outlier

The first unchanged candidate diagnostic failed its zero-denial assertion:
Vercel injected `https://vercel.live/_next-live/feedback/feedback.js` and that
platform code attempted HEAD `/`. Baseline HTML had no toolbar injection.
A clean setup comparison used identical protected-share access and recorded only
cookie names/flags: a single `_vercel_jwt` on both. The candidate injected tag has
`data-explicit-opt-in="true"`. Its public source contains
`fetch(location.href,{method:"HEAD",headers:{"x-vercel-draft-status":"1"}})`;
this is platform draft-status probing, not a product API. The denied attempt and
original diagnostic remain failed evidence, not filtered into a pass.

After source proof, root approved blocking **only that exact external toolbar
URL on both versions** for a fresh paired code-only cohort. No product route,
API, protection or method admission was widened. The earlier default baseline
and its prescribed desktop replacement remain historical; they are not mixed
into the accepted paired aggregate. These results describe matched product code
under that explicit platform control, not the unrestricted platform-default
Preview workload.

The initial visible cohort completed20 cases, then the runner/session was
interrupted while baseline1440 trial3cold was in progress. Its partial record
has no readiness snapshot; later inspection found no live Node/Chromium and the
exec session was unknown. Exit status/cause are unavailable. This is an
interrupted attempt, **not proof of a site hang**. It remains unchanged; only
that pending desktop baseline/candidate pair was resumed under the same protocol.

The resumed baseline cold visit did complete but took12.308 seconds. It remains
in all ranges and the n3 desktop median. Its275-byte canonicalGematria resource
started at0.704 seconds and finished at12.140 (duration11.437), while primary
Posts data was already finished by1.965. DOM followed at12.308. The receipt lacks
enough response-start detail to attribute this to CDN, server or browser transport.
It does not prove the cause of the original historical cold-entry hang.

Candidate still downloads canonicalGematria through an admitted secondary
entityHub path; it is not removed from the site. In the candidate diagnostic it
finishes at4.403 seconds after primary4.284, and in the resumed desktop visit
at1.754 after primary1.658. Thus that dependency no longer gates primary in these
observations. Essential entry/Shell requests can still stall; this change is not
a universal transport-stall prevention mechanism.

The historical baseline's final desktop warm sample overlapped a root git
worktree checkout18:47:47.650–18:47:49.081UTC. It and its predetermined replacement
are retained outside the final fresh paired aggregate. Setup failures (guard
path unavailable before browsing; instrumented default5s assertion timeout)
also remain failed evidence. No run was selected or dropped for being slow.

## Desktop Number material regression: bounded follow-up

The cold desktop full-material median is5.641 →6.504 seconds (+0.862), with
before range5.632–5.982 and after6.376–6.661. This is larger than the useful-header
regression and remains an open performance concern; it is not erased by the
mobile Home gain. The paired raw logs initially appeared to have7 extra
convergence-node reads before candidate readiness. Matching request identities
across the whole visit shows both versions have those same two read waves;
baseline's later wave often falls after its material-ready boundary. A count
bounded by different completion times is therefore not proof of added work.

Root authorized one additional desktop diagnostic per version, stopping after
first World→full1820. The separately labeled run records actual useful header
1.684 →1.842 seconds and material5.940 →6.973. It does not replace the n3 medians.
Both contain zero deferred Home pulse-summary reads. Number nodes/edges reads
complete22–24ms before the material-ready mutation. Both contain the same two
convergence-read waves, with candidate's chain finishing later. These are real
public reads with actual SW; no failures or product writes occurred.

CDP request initiators stop at the Supabase/guard async boundary, so they do not
prove which earlier Home admission/cache timing causes the difference. Network
records include response and worker timing, but do not establish server CPU or
a CDN defect. Node/edge timing is an observed waiting chain, not causal proof
against the new split. No further browser runs or speculative changes were
made. Preserve this regression for the integrator's release judgment and a
future focused investigation; do not claim all routes became faster.

## Changed import boundaries

Three bounded scenarios pass with real public reads and actual SW:

1. Native admission: primary Home before summary reader/pulse reads; approach
   admits the existing real summary. Guest Post does not load the admin projector.
2. Controlled pending module: holding only home2029Projection JS does not block
   primary/Post; leaving Home before release causes zero late summary reads.
3. Controlled module failure: aborting that one JS request preserves primary,
   does not fabricate results, and actual reload recovers the real summary.

The held/failure cases are explicitly controlled fixtures, not claims of a real
provider incident or a live private-data operation. No model, mail, login,
playback or product write was performed. Guard permissions stayed unchanged.

## Scope and recommendation

Keep the measured split. It produces a repeatable cold-mobile benefit and lower
required download/processing without changing content, design, Post preparation
or account permissions. Retain the smaller regressions and desktop variability;
no more optimization round is justified here without a new measured cause.
A roughly5s fully visible cold-mobile action under the specified throttling
remains a user-visible delay and a post-launch performance target, not a newly
proven correctness or privacy blocker. Number secondary material remains slower
than its useful header. Existing release-configuration, real backup/restore and
unaccepted capability gates are separate; this report does not approve cutover,
change shared flags or certify untested authenticated/model/billing flows.
