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

Live anonymous `/number/376` is **GATED** by real maintenance flag, not a fast successful Number measurement. No override. Authorized full-page Number, real auth A/B/logout flow, physical phone/Israel, field INP, controlled cold Postgres, same-origin proxy remain OPEN. Two-example secondary World/cipher continuation remains NOT IMPLEMENTED: needs a genuine bounded work boundary and existing approved continuation/visual owner, not merely hiding already computed rows.

Active transfer list:75ebfac4 App/vite/supabase/general public-read cache/prefetch/Home post-reader scope;839c2af4 Post technical reader scope for52f6188f batch (also requires slug-variant/duplicate/row-bound/RLS equivalence). No takeover. Shared visual frame/major composition stays Claude. Role B SQL package is [draft-only reference](database-lab-reference.md), with permission finding and exact cold/growth/admin-stub gaps; no migration applied.

## DRIFT / status / rollback

main12fea7a3→aebfcadb during role A (other PR1103 standalone ELS,3 files); integrated base001c3b05 remains unchanged. Earlier18821815 local ref was stale and resolved by explicit fetch. No merge/rebase onto main and no Legacy/public deployment by this session. Target branch documentation/SQL-only drift does not justify rebasing runtime or adopting a whole historical branch.

DOCUMENTED / IMPLEMENTED / COMMITTED / PUSHED / PREVIEW / VERIFIED are tracked separately. Branch-only review candidate; **NOT MERGED / NOT LIVE / SPEED OPEN**. The final readonly Preview must report its exact commit and the same application manifest fingerprint as tested32201; CI must pass that final head.

Rollback Home runtime via32201c4d; mobile rendition via15af7aff; positive fixture viaa23cdd9d. Guards/evidence remain independently reviewable commits. No DB rollback required because none applied. Do not revert rejected experiment commits onto1100 (they were never adopted).
