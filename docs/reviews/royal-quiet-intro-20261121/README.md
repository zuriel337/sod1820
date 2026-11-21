# Quiet Royal intro + selected-item shell seam — draft #1469

**Implemented / branch only. Not merged, deployed, live-verified or approved for release.**

- Same repository/branch/PR: `zuriel337/sod1820`, `codex/royal-palace-shared-intro-v1-20261121`, [#1469](https://github.com/zuriel337/sod1820/pull/1469), kept draft.
- Fresh main/base: `d353b62a520a009b130970dc82c17ad00a43ad96`; resumed head `90bb20493966580421f21f644ba9af9d4da19f13`. Implementation commits: `994df02` (quiet intro/seam) and `a74e29b` (defer optional help/decoration until requested), `b34b96f` (compact header row and retained relocated contract checks); measured source SHA `b34b96f80a9fb42d5771811ced604527b1cf0807`.
- AGENTS, CLAUDE §0 and Owner Index reread; current main Design V2 night palette reviewed. The updated decision is **§5ב in #1474's `docs/product/post-context-rail-and-single-raziel-20261121.md`**, head `a157e6d7ac239388c62987e5975e3c5c92abe7cf`, not a §5ב in issue #1470. #1470 and #1477's current interface/head were also read. No cherry-pick or active-contract changes.
- Canonical readonly `work_log_current` checked before writes. The only matching active scope was Tzvi's World public-finding source locator, which was not edited. No overlapping Shell/Royal writer was found; no DB or work-log write performed. Handoff is to ZURIEL here, not an agent dispatch.

## Implementation

World, Heichal and Books (including their existing variants under the same surface) now use the shared `quiet` opening: **no palace picture element or request**, canonical blue-charcoal frame background at night, thin gold border, existing area medallion and intact global crown, short existing title/description, context navigation and accessible help. The medallion, heading and help share one compact header row; description and navigation follow below. The duplicate eyebrow is omitted for quiet openings; page content and links are not hidden. Day/parchment keep their existing palette roles. Other intro surfaces retain the earlier Royal behavior. Explicit `introVariant="none"` remains first priority and does not mount/load the intro.

At 390×844 the World source image and story heading, Heichal input and primary button, and first Books content are in the initial viewport. At 320×740 the World source image, Heichal input and first Books content are visible; the dock still occupies its existing bottom space. No claim that the entire tool or every action fits on every short screen. Geometry/keyboard checks cover 320/390/768/1440 and all three themes, with reduced motion.

The existing InspectProjection was extracted unchanged into a lazy module, loaded only when the inspect panel is opened, to make room for the selected-item seam without a new eager dependency. Existing share/save/research assertions follow the extracted file; none were removed or weakened. The quiet intro initially renders its real question button using existing frame styles; Royal explanation/decorative CSS loads only on activation, with focus handed to the real disclosure trigger. Three demand-loading checks prove zero initial RoyalIntro/SelectedRoyalItem/InspectProjection requests, successful open and Escape focus restoration. Inspector behavior/capability ownership is unchanged.

The new lazy selected-item slot provides a consistent World card and a projection inside the existing Here panel, with an owner-supplied action renderer and **the exact same target object**. It does not implement save/share/follow/comments. [Integration boundary and tested API](INTEGRATION.md). Here retains its admin/authorization gate. No new Dock action, share sheet, Raziel instance, left-panel implementation, graph reader or store.

**The real #1477 action row is not yet registered from the World owner in this branch.** The seam is implemented and tested, but the combined canonical 78 ↔ salt-covenant → Bennett unit flow and real action acceptance remain pending with those owners. A synthetic probe is explicitly not proof of real save/share/comment success.

## Screenshots and measurement conditions

[Real main / new Royal browser comparison](preview.html): World, Heichal, Books at 390×844 and 1440×900. Separate `*-dark/light/parchment-reduced.png` files record theme acceptance. This is a screenshot gallery, not a live deployment.

72 timed observations: 3 rotating-order runs × main/new × 3 routes × 2 viewports × cold/warm. Both are fresh **default build profiles**, same checkout toolchain/dependencies, local Chromium/HTTP server, immutable local asset cache headers, no CPU/network throttling and no concurrent build/browser suite during measurements. Main was built in a detached worktree at the exact base. Neither tree has a local `.env` file. Cold uses a fresh browser context; warm revisits in that same context.

Public data reads are primed/cache-served identically before timing. Heichal is opened only via the browser-local `lock_heichal` response fixture; live flags are untouched. Write/unknown RPC requests are blocked. This measures cold **browser assets**, not a cold backend/CDN, and is not real-phone/field performance.

LCP comes from PerformanceObserver after the real useful element exists plus a 1.2s observation window. Useful-content time is a **next-rAF viewport visibility proxy**, not an actual paint/interaction-ready event: World story heading, Heichal query input, Books grid. DOM presence is retained separately. It does not imply the full page is ready. Every LCP candidate includes tag, classes, text and image URL in [raw measurements](repeated-metrics.json); [summary](summary.json) contains all three final candidates and min/max ranges for each condition.

Median milliseconds, **LCP / useful visibility**; positive delta is slower:

| מסך / רוחב | ביקור | main: LCP / תוכן | Royal: LCP / תוכן | שינוי LCP / תוכן |
|---|---|---:|---:|---:|
| world / 390 | ראשון | 640 / 558.6 | 640 / 578.6 | +0.0 / +20.0 |
| world / 390 | חזרה | 520 / 456.4 | 532 / 452.9 | +12.0 / -3.5 |
| world / 1440 | ראשון | 736 / 565.9 | 748 / 581.9 | +12.0 / +16.0 |
| world / 1440 | חזרה | 620 / 475.1 | 608 / 477.8 | -12.0 / +2.7 |
| heichal / 390 | ראשון | 1168 / 478.8 | 140 / 462 | -1028.0 / -16.8 |
| heichal / 390 | חזרה | 80 / 384.8 | 68 / 372.4 | -12.0 / -12.4 |
| heichal / 1440 | ראשון | 616 / 470.5 | 628 / 481.3 | +12.0 / +10.8 |
| heichal / 1440 | חזרה | 516 / 378.8 | 548 / 393.9 | +32.0 / +15.1 |
| books / 390 | ראשון | 520 / 493.3 | 532 / 494.7 | +12.0 / +1.4 |
| books / 390 | חזרה | 456 / 403.6 | 444 / 395.5 | -12.0 / -8.1 |
| books / 1440 | ראשון | 152 / 566.7 | 176 / 603.7 | +24.0 / +37.0 |
| books / 1440 | חזרה | 68 / 406.5 | 76 / 472.1 | +8.0 / +65.6 |

**Performance acceptance remains open.** Books desktop useful visibility is +37.0ms cold and +65.6ms warm; Heichal desktop is +10.8/+15.1ms. Three runs are a small local sample, not statistical or field proof. No release is proposed. The warm Books grid exists at about 403–416ms but reaches the visibility observer at 466–474ms; the new intro is 160.6px versus main 110.6px. This narrows the remaining investigation to layout/render scheduling but does not establish a complete causal explanation.

LCP identity matters: World measures the actual story cover (`reading-v2.jpg`) in both versions. Heichal desktop measures its content H2 in both versions. Heichal mobile cold changes from the explanatory content paragraph on main to the global `canonical-lockup-128.webp` logo on Royal; both warm versions measure that logo. Thus the 1,028ms cold LCP improvement is largely a candidate change, while useful visibility improves only 16.8ms. Books mobile measures a book summary paragraph in both versions; Books desktop measures the global logo in both, so LCP does not represent when the grid is visible. No palace is an LCP candidate. Maximum observed CLS is 0.000271; no horizontal overflow.

All measured iterations are preserved: `initial-*` (vertical quiet header), `demand-only-*` (help deferred), and final measurements (compact grid header). The final header reduces the World desktop warm useful-visibility difference to +2.7ms, but does not resolve Books. No slower iteration has been discarded from the evidence.

## Shell / media budget

Measured gzip bytes, not estimated transfers:

| Metric | Fresh main | Quiet Royal | Delta |
|---|---:|---:|---:|
| Eager JS / files | 203,358 / 17 | 203,437 / 17 | +79 / 0 |
| Frame JS / files | 47,189 / 3 | 46,134 / 3 | −1,055 / 0 |
| Frame CSS | 34,329 | 34,310 | −19 |
| Combined | 284,876 | 283,881 | **−995** |
| Palace image on these routes | 0 | 0 | 0 |

The entry sub-bundle is **79 bytes larger**, while the complete shared entry/frame/CSS payload is 995 bytes smaller. No new static import or dependency-graph file. Do not describe every individual metric as improved. Relative to incoming Compact the palace saves 30,098 bytes mobile / 89,134 bytes desktop; main did not have that image, so those are **not** savings against main. Per-navigation local raw JS/CSS/image totals are in `weights`; local server JS/CSS are uncompressed, so they are not production gzip transfer claims.

Both normal and public-reading builds pass the unchanged budget gates. Public-reading measured: eager JS 203,429, frame JS 46,128, frame CSS 34,310 gzip bytes. Required ratchets **lowered** frame-JS baselines from 46,314→45,966 (default) and 46,401→45,986 (public-reading); the public eager-JS baseline also fell 203,437→203,429. The frame baselines were lowered during the first iteration and retained at those stricter values after the help-demand change; final frame measurements are shown above. No threshold, tolerance or baseline was raised. Root/production config pins remain unchanged.

## Checks and remaining limits

Passed locally:
- `npm run build` on the final source; public-reading build; both shell-budget profiles.
- 36 real-browser theme/width/route cases: RTL, one intro H1, help Enter/Escape/focus restore, touch target, no overlap/overflow, reduced motion, same canonical icons/links, zero palace requests.
- Fresh `introVariant="none"` route: no intro element, RoyalIntro chunk or palace request; guest Here stays disabled.
- Three real-browser on-demand help checks: no initial optional intro/selected-slot/inspect request, then keyboard-accessible disclosure on activation.
- Six selected-slot card/Here pairs in the real Shell fixture (node/edge/unit × mobile/desktop), exact object/metadata preservation, replacement, stale lease, clear and route cleanup.
- System Frame, My Workspace, contextual learning, first-load graph and module-boundary gates.
- 19 focused Node tests: palace/source assets, canonical share contract, reading cover/media, post unit actions, palette roles and video-yields-cover policy. Post2029Page and server article/media code are untouched; video cover remains suppressed while card/share media ownership is preserved.

Test-development failures were resolved: source-location assertions (including CI hard-isolation/release-contracts) initially expected InspectProjection inline (redirected to the same extracted implementation, assertions retained); review harness CSS assets initially needed external URL resolution; the first seam cleanup assertion ran before React's effect cleanup (changed to wait for actual DOM removal). A geometry run overlapped a local rebuild and timed out on an obsolete chunk; it was discarded and rerun against the stable final build. Timed performance runs never overlap builds or other browser suites. No failed release gate was bypassed.

Incoming head `90bb204`: 18 CI successes, **Production Canary Gate failed**. Measured source `b34b96f`: 18 CI successes, including Production Canary Gate; one failure in auth-browser-acceptance (mobile Google/password fixture, ECONNRESET/aborted). The exact failed test passed locally on rerun (1/1), but this is not a CI pass. See `source-ci.json`; old successes are not proof for a new SHA. No merge, deployment, protected preview, live DB write, permission/flag change or contract edit.

Pending: actual owner integration described above; real authenticated save/ACK/share/discussion/return flow; real-device/throttled/field performance; CI authentication rerun and residual desktop performance investigation. The measured local results do not prove zero regression on every device or authorize release.

## Reproduce

Serve fresh default main and branch builds on 4200/4201 with SPA fallback to `2029.html` and the same immutable asset headers; the server implementation is preserved in the prior three-options review. Run `python test/royal-quiet-intro-repeat-2029.browser.py` alone, then `python test/royal-quiet-intro-checks-2029.browser.py` separately. Generate the gallery/summary with `python test/royal-quiet-intro-report.py`.

For the isolated seam fixture: `node test/build-royal-shell-seam.mjs`, serve its output on 4202, then `python test/royal-shell-seam-2029.browser.py`. This synthetic admin fixture is not a production artifact or route and must never be deployed.

## Handoff ownership

Actor: GPT (Codex ledger identity), reported directly to ZURIEL. Scope: shared Royal intro and selected-item placement/lifecycle, under existing System Frame / Design V2 owners. Status: implemented and committed on the same draft branch; no release authorization. Open threads: real World/#1477 registration, canonical edge/unit acceptance, residual performance acceptance and live canary. No work-log write or agent ACK is claimed.
