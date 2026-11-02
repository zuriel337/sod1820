# Posts history return after asynchronous catalog readiness

Base: `51ad71f466988c32368ab06013e8422d3363c624`.
Branch: `gpt/2029-doc37-posts-exact-history-return-20261102`.
Coordination: `d57137fb-1305-455f-a7f0-a984dfd9c0a2`, child of `a58c3d4e-e83a-4614-ada0-e77e05b9dcd9`.

## Evidence and bounded change

The exact hosted parent acceptance found Video→series browser Back preserving the URL but not its viewport: mobile2500→925 and desktop1089→733. The retained diagnostic showed mobile catalog height18067 before departure, loading height1825 on POP, native scroll clamped to925, and final content height18148 without a second restoration. The URL/source acceptance and six controlled series cases had passed; this is a separate return failure.

`Posts2029Page` now records only `{entryKey, href, x, y}` on its existing browser history entry before ordinary catalog navigation. The exact path, encoded query and fragment are retained. Router `idx`, `key`, `usr` and other entry fields survive unchanged. No content, identity, personal data, research state, storage cache or second history is introduced. `history.scrollRestoration` remains untouched.

On POP, the Posts-only adapter waits until the exact current Post result and mixed-source completion settle. Failed reads settle too; the adapter never creates content or artificial height. It corrects the original pixels after the real DOM is ready, and follows late resize/load changes for at most5seconds. Pending readiness is bounded to30seconds. Wheel, touch, pointer, keyboard input, a different entry/URL, popstate or unmount cancels correction. Listeners for cancellation are active during pending reads so a late result cannot override user intent.

During the mounted Posts entry, ordinary global-menu link/button clicks and native `scrollend` keep the same layout record fresh for a later departure. There is no per-scroll listener or write loop; duplicate coordinates do not call `replaceState`. Recording is suppressed while restoration owns the viewport, so the intermediate925px clamp cannot replace the saved2500px position. Modified/new-tab/download/external/local-anchor links retain their existing behavior. Page/search navigation captures its departing entry before changing the current URL. All route-scoped listeners are removed on exit; there is no global history patch.

## Verification and limits

- 28 focused Node tests pass, 0 failures/skips. Ten new helper tests cover preserved Router state/encoded URL, ordinary versus modified navigation, invalid keys/coordinates, POP-only restoration, pending and late geometry, user cancellation before readiness, route changes/timeouts, failed short results, stale-entry prevention across repeat return, ordinary global departures and bounded recording. Existing18 source/privacy/pagination/layout tests still pass.
- Posts2029Page JSX transform passes; `git diff --check` passes.
- These are controlled component/helper tests, with no browser benchmark, real data calls or SW. Parent integration must still verify exact protected Preview delayed data, page2, user cancellation, forward/back and actual scroll positions on mobile/desktop. A failure/shorter dataset can only restore within its real current height; it is not an exact-content restoration proof.
- No Home, Video, API, public readers, CSS, shared settings, DB/RLS/Edge, Production or main changes in this lane. No deployment performed.
