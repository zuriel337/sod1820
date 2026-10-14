# Role A CODEX_EXECUTION — PR1100 handoff · 14 October 2026

Branch `gpt/perf-execution-20261014`; PR [1100](https://github.com/zuriel337/sod1820/pull/1100), draft/open, targets `gpt/shared-preview-integration-20261014`. No merge/main push/production deployment/Legacy edit/live product-DB write. Passive user-only journal, no agent message or ACK.

## Preserved and implemented

- Verified own original local `9009b245571eb969d56163ed57eb9865f4017624` and all prior artifacts, retained source worktrees, created verified Git bundle + SHA256 archive; pushed local commits only to1100. Lossless compressed raw evidence and manifest are committed.
- `15af7aff`: previously accepted native mobile image; `a23cdd9d`: canonical positive trace receipt fixture; `9009b245`: image guard. No new image experiment.
- `0825b326`: preservation checkpoint; `c83e3f04`: Claude eac046a built route budgets in CI; `da15e422`: responsive/original/Lightbox public capture before common CI snapshot freeze (fixes remote-only missing fixture; no relaxed assertion).
- `8bb1ee0b`: actual-input harness/map/rejection evidence; `32201c4d`: Claude5d709c4 Home notable-topic reader dynamic import inside its existing includeWorld effect. Same reader/args/result, no new layout/style/caching/viewport or idle guarantee. Home was evaluated last.
- `946917d1` + `4107289c`: actual clicks/Back/revisit/wheel regression CI, seven samples per side against accepted0825 checkpoint/common snapshot; archived baseline build gets explicit source SHA. `1e15404b`: preserved Home/feed/combined raw.

## Hosted incremental before/after (seven cold samples each route)

Before exact Preview `0825b326ea0fd9faa57b41d0d48bdadada9f3c7f` already includes image optimization. After exact `32201c4d261744709aa13ccf4b7aee7a9d811265` includes Home import boundary. Both readonly, Chrome141/Playwright1.56.1,390×844/DPR2/CPU4,150ms,download209715.2 B/s, upload96000. No fixtures used. PostgreSQL/CDN cache and physical geography uncontrolled. Vercel review toolbar excluded equally. REST incl.OPTIONS must finish cleanly; primary image completes.

| Surface | FCP ms | LCP ms | Main content READY ms (ranges) | First content request ms | Last REST end ms | REST incl.OPTIONS | CLS |
|---|---|---|---|---|---|---|---|
| / | 1688→1688 | 5336→5140 | 3899→3653 ([3857, 4023]; [3563, 3873]) | 210→213 | 7129→7070 | 123→123 | 0.01825→0.01825 |
| /world | 1944→1984 | 5020→5008 | 4928→4929 ([4838, 5070]; [4848, 5211]) | 199→205 | 6793→6750 | 110→110 | 0.03136→0.00009 |
| /post/seventh-to-tenth-sefirot-2027 | 1644→1656 | 4328→4300 | 3682→3684 ([3594, 3844]; [3641, 3725]) | 203→206 | 4341→4354 | 13→13 | 0.00008→0.00008 |

Home READY3898.7→3652.6ms = **6.31% faster**, bootstrap median delta95%[-359,-143.4]ms. Home LCP delta196ms is not a separately proven gain (ranges overlap); FCP unchanged. World/Post timing differences are within noise; no extra speed claim. All42 hosted samples clean, same Home/Post LCP asset URLs in both arms. Preview World renders connected discovery at entry, unlike its production hash-only gate; these timings are not prospective production World timings.

Earlier accepted image experiment remains separate: Post LCP5128→4396ms (**14.27%**); READY3641→3750.5ms (+3%,109.5ms); REST13→13. Native cover213687→53538B (~75% fewer), same whole composition/canonical original/Lightbox/fallback. Never add this percentage to Home6.31%, and never add savings from isolated experiments. Current combined Post LCP4300ms still misses~3600ms.

## Actual input/scroll and rejection decisions

Seven samples each on World, ordinary Post, Flydubai Post and Topic india-axis. Actual trusted control click, browser Back/Forward revisit and wheel at mobile viewport; fixed800ms post-ready tail is explicitly separate from input-to-content latency. Source baseline app `c83e3f04` equals0825 app, after combined app32201. Private captured anonymous API/asset snapshot identical in both replay arms; raw API bodies not committed. No document FCP/LCP is labelled SPA navigation latency.

| Starting surface → actual target | Click READY before→combined ms | Back ms | Forward/revisit ms |
|---|---|---|---|
| /world → Topic | 1256→1256 | 501→532 | 810→808 |
| /post/seventh-to-tenth-sefirot-2027 → World | 1890→1868 | 412→372 | 686→661 |
| /post/flydubai-fz1073-363-14000-remzei-geula → World | 1933→1919 | 1472→1505 | 692→692 |
| /topic/india-axis → World | 1608→1601 | 824→824 | 481→500 |

Combined matched navigation budget PASS, response body parity PASS, no errors/misses; no beyond-noise navigation gain claimed. Scroll task/frame details in raw; ordinary/Flydubai wheel windows have zero research storage writes. Reused Claude Bennett real-region + synthetic-large-local-state tests: context durability0.5ms/2.6ms, not justification for removing persistence. Not real authenticated queue timing or physical-phone INP. Legacy UTF16-length field named `bytes` in navigation storage rows is **code units**, not UTF8 byte size; used only for equal-arm counts, not a byte-budget claim.

- World0cf6ea33 (port5de85cf, Home unchanged) **REJECT**: World→Topic1255.5→1499.2ms, median delta95%[213,308]ms, past10%+100ms allowance; improvement into World from Post does not cancel a regression elsewhere.
- Feeda4d3ce35/d3949b9b after-primary-paint/explicit-Now scheduling **REJECT for adoption**: budgets pass, small warm revisit signals, but no robust general improvement; cold World4622→4721ms/Post3614.5→3586.1ms; reads unchanged. Four lifecycle tests pass in isolated experiment only. Source worktree/commits preserved.
- Earlier persistent-shell, broad prefetch, image priority, Lightbox, Contact, desktop Companion and Nasrallah compiler experiments remain rejected/held; no repetition or summed savings.
- New Claude30e3381a E1 cache/E2 Post connection batch reviewed and held; [reconciliation](claude-interaction-reconciliation.md) covers deterministic request reduction, bounds/auth/key/parity weaknesses and active-reader scope. PR1102 is not this lane target.

## Tests, enforcement and open gates

64 targeted tests PASS; five real-built route/entry budget tests PASS (zero skips). Six guard unit tests reject synthetic clicks, fewer samples, errors/misses/failed primary, profile/snapshot/method mixing, timing/read regression and changed response bytes. Image functional16 Chromium cases/64KiB budget/fallback/Lightbox/no double-fetch enforced in existing CI; negative original-sized rendition fails. All **seven remote checks PASS at1e15404b**; final exact-head CI/provenance are recorded in PR and passive AFTER, not inferred from an earlier SHA. Hosted and replay remain distinct.

The four original tests are reproduced **identically before and after**: two date-display tests and Home identity/Dimension Five historical-reader wiring assertions;28 tests24PASS4FAIL. They are preserved in before/after logs; no threshold/assertion weakened and no hidden PASS. Earlier remote0825 image-fixture/ELS failures and946 archived baseline provenance failure were exposed and fixed/rechecked; later source head passes all seven CI checks.

Live anonymous `/number/376` is **GATED** by real maintenance flag, not a fast successful Number measurement. No override. Authorized full-page Number, real auth A/B/logout flow, physical phone/Israel, field INP, controlled cold Postgres, same-origin proxy remain OPEN. World secondary topic catalog now has a genuine two-item reader boundary through the existing More control; see the catalog addendum below. Cipher two-sample work and other secondary families remain open.

Active transfer list:75ebfac4 App/vite/supabase/general public-read cache/prefetch/Home post-reader scope;839c2af4 Post technical reader scope for52f6188f batch (also requires slug-variant/duplicate/row-bound/RLS equivalence). No takeover. Shared visual frame/major composition stays Claude. Role B SQL package is [draft-only reference](database-lab-reference.md), with permission finding and exact cold/growth/admin-stub gaps; no migration applied.

## DRIFT / status / rollback

main12fea7a3→aebfcadb (PR1103 standalone ELS)→503b52ef169b6e51f967187491398d153090aa45 (PR1104 reverts that change, same3 files) during role A; integrated base001c3b05 remains unchanged. Earlier18821815 local ref was stale and resolved by explicit fetch. No merge/rebase onto main and no Legacy/public deployment by this session. Target branch documentation/SQL-only drift does not justify rebasing runtime or adopting a whole historical branch.

DOCUMENTED / IMPLEMENTED / COMMITTED / PUSHED / PREVIEW / VERIFIED are tracked separately. Branch-only review candidate; **NOT MERGED / NOT LIVE / SPEED OPEN**. The final readonly Preview must report its exact commit and the same application manifest fingerprint as tested381e663e (`924a6a972b93f2e4459374bd8c9e53561a78982fd6d1d6d2665b04bc2361ff29`); CI must pass that final head. Exact final SHA/deployment/check results are recorded in PR1100 and the verified passive AFTER without a self-referential evidence-commit loop.

Rollback Home runtime via32201c4d; mobile rendition via15af7aff; positive fixture viaa23cdd9d. Guards/evidence remain independently reviewable commits. No DB rollback required because none applied. Do not revert rejected experiment commits onto1100 (they were never adopted).


## Accepted World catalog work boundary · 7274cdca / 381e663e

Fresh public World entry reads2 topics (+1 has-more sentinel), renders2, and does
not request exact total/count until the existing More action. First demand reads
22 at offset2 and reconstructs the identical ordered24-item page; subsequent
pages preserve the original24-item continuation. Reusing an existing Topic
context on Back keeps the original24-item read/eight-visible window. Admin
control remains24. Expanded filters preserve the original full-window behavior.
No new control/palette/style owner/store/cache/RPC or permission is introduced.
The inline display/hidden attributes only retain already-demanded component
state on collapse; before demand the extra data and components do not exist.

Captured full public columns/order/duplicates match, SHA256 before and after
`c2a62f2a8611f9bafdabdaa6ef5b574b409aa8bb52f6427d04e8de99144d1510`.
Functional cases: persistent503 including SDK retries keeps initial2 visible;
explicit retry returns24; collapse/reopen yields zero extra REST/tier reads;
late continuation cannot overwrite a new filter; third-topic Back restores the
original eight-item window. Light320/Parchment390/Dark1440 pass. A wide-screen
initial guard counted an unrelated lazy image as a data read; it now records
all reopen requests and rejects new REST data reads, keeping asset observations
separate. Captures preserve prefer/range/accept-profile in fixture keys.

Seven cold replay World samples: REST55→48 (**12.73% fewer**); Task2069→1838ms;
READY4782.3→4804.7ms, LCP4840→4800ms (time differences not proven). Seven matched
input sequences on World/ordinary Post pass regression/parity: World chain173→173
reads because Topic Back deliberately restores the full original window;
Post→World/Back/revisit chain119→112 reads. **WORK/REQUEST_REDUCTION_ONLY**, not a
new speed claim. Hosted World and final all-route evidence are below. Exact final CI/provenance is
recorded in the PR and passive AFTER; isolated savings are never added.

Tradeoff: six previously visible secondary topics move behind the existing More
control; initial exact public total waits for demand. All remain accessible in
the same order through the same reader. Creator-option scanning and SQL growth
cost are still open; this is a bounded initial topic page, not complete global
DB-scale closure. Roll back the World change through7274cdca independently.


## Hosted World catalog acceptance · real anonymous DB, seven cold samples per arm

Before readonly Preview1f749dbd (Home+image, full catalog), after381e663e
(Home+image, two-topic catalog). Conditions identical to the hosted table above;
all14 samples have no errors, REST settled, no overflow. First requests exclude
telemetry. READY is primary-content readiness, not completion of all extensions.

| Surface | FCP ms (range) | LCP ms (range) | READY ms (range) | First content request ms | Last REST end ms | REST incl.OPTIONS (range) | CLS |
|---|---|---|---|---|---|---|---|
| /world | 2024 [1924,2268]→1976 [1936,2084] | 5032 [4864,5440]→4960 [4888,5380] | 4948 [4785,5329]→4887 [4788,5320] | 224→207 | 6986→6721 | 110 [110,110]→96 [96,96] | 0.000080→0.000077 |

**12.73% fewer requests** including OPTIONS, consistently in every sample;
55→48 actual API reads in the matching replay. READY median delta−61.5ms,
bootstrap95%[-446.4,80.4]ms, includes0; LCP ranges also overlap. Accept as
**REQUEST_REDUCTION_ONLY**, not a newly proven time gain. All original ordered24
items/count still appear after More; six of the previous initial eight are now
behind demand. Restoring the original Topic return remains an explicit exception.
No product DB write, proxy/cache/RPC replacement, production deployment or claim
of physical-device/Israel/INP verification.

## Final combined cold replay · separate from hosted evidence

Matched source0825 baseline (already native image) vs381 final application,
common header-sensitive public snapshot, seven samples per arm per route,
World then Post then Home last. Both arms clean, zero misses/errors, matched
10%+100ms timing allowance, no additional REST reads and CLS≤0.1: PASS.
This isolates the combined Home+catalog effects, not an aggregate site percentage.

| Surface | FCP ms | LCP ms | READY ms (ranges) | First content request ms | Last REST end ms | API reads | CLS |
|---|---|---|---|---|---|---|---|
| /world | 1792→1780 | 4824→4792 | 4843 [4553,4912]→4799 [4554,4916] | 217→214 | 6079→5964 | 55→48 | 0.03144→0.03142 |
| /post/seventh-to-tenth-sefirot-2027 | 1568→1572 | 3892→3896 | 3612 [3541,3686]→3622 [3550,3692] | 212→213 | 3892→3945 | 6→6 | 0.000077→0.000077 |
| / | 1576→1564 | 4108→3796 | 3842 [3774,3907]→3549 [3501,3649] | 212→206 | 5753→5389 | 59→59 | 0.02072→0.02072 |

Do not substitute replay timings/reads for live results (OPTIONS appear only in
hosted counts). Combined Home sends one extra small dynamic JS request133→134,
while its data requests remain59; boundary changes graph scheduling rather than
eliminating the public reader. Home time acceptance rests on its separate hosted
6.31% READY improvement; no addition of image or World savings.

## CI behavior correction and honest failure history

7274 changed an explicit contract: exact public catalog total arrives only after
demand. 0710 requires exactly2/no initial total, then original24+total, search888,
clear and overflow. Its first remote run failed because its accessible-role
locator still used `עוד נושאים בעולם` after the existing button changed its label
to `הצג פחות נושאים`. 9fe2bb87 follows that label for `aria-expanded=true`;
no latency/bounds/parity assertion or production reader was changed. The same
0710 remote navigation/performance replays pass. Remote ELS executable browser
suite had a separate no-hit Research-probe assertion failure70/71, zero skips;
its excerpt is preserved. Exact-head later result is reported explicitly in
PR/AFTER, never buried in the four original date/Home failures.
