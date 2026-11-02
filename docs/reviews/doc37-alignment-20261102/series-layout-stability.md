# Series metadata layout stability — controlled follow-up

Base: `5bbd5d47e64cb049fa82156681a918acccb13a3e`.
Branch: `gpt/2029-doc37-series-layout-stability-20261102`.
Coordination: `a58c3d4e-e83a-4614-ada0-e77e05b9dcd9`, scoped internal writer for `Posts2029Page.jsx`, `posts2029.css`, focused tests/evidence only.

## Measured cause and change

The parent Preview acceptance retained direct-series document CLS failures: pending 0.127646, failed source 0.175954, filtered private source 0.143123, expired source 0.175992. The captured shift moved the already-readable `#posts-catalog` from y714.05 out of the first viewport when the entire series entrance grid arrived. These results remain failures; this source change is not itself hosted acceptance.

The four existing canonical descriptors now render their names, credits and navigable links immediately. The same reader fills only the cover images inside existing positioned image containers. Failure retains the known links. Searching their known labels no longer waits for metadata. The initial Post reader, source admission, pagination, order, queries and already-readable Post content are unchanged.

Pending, failure and ready messages occupy the same CSS grid cell. Actual text/action states determine its intrinsic height; only the current state is visible/exposed to accessibility, and inactive retry buttons are disabled. Failure uses concise wording with an inline retry. Completion displays meaningful navigation/order copy rather than an empty block. No fixed height, max-height, clipped text or delayed Post rendering is added. The status geometry remains stable after completion rather than shifting the list upward.

## Tests and limits

- 18 focused Node tests pass, 0 failures/skips: four actual presentation/effect tests plus the existing approved-source and mixed-pagination tests. Includes immediate links, success/failure/retry, abort, known-label search, and inactive-message/action accessibility.
- `test/doc37-series-layout-stability.browser.mjs`: 12 controlled geometry cases pass at widths320/390/1440, UI font sizes16/20, metadata success/failure and subsequent source pending/failure/ready states. All cases retain exactly the same catalog anchor, navigation-card dimensions and intrinsic notice heights, with no horizontal overflow and zero network requests. Raw receipt: `series-layout-geometry-controlled.json`.
- This geometry fixture uses the real presentation functions and stylesheet with synthetic metadata and local Arial; it is not live content, real-font, SW or final Preview CLS/performance acceptance. Those remain with the parent integrator after integration/deployment.
- Initial geometry runner failed before browser launch because ESM import ignored the available global Playwright package path. The runner now uses the repository's existing createRequire convention; no application/guard changes were made for that infrastructure issue.
- No Home/readers/Video/Legacy/shared settings/DB/server files were changed. No deployment or network data writes.
