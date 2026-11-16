# Cover hint for original-address Posts — measured, not recommended (16 November 2026)

Commit `547dae070` on `ccr-dcadb071-v1z5ol` (reverted on the same branch after this measurement; the code stays in its history). Base: `4e6e6e2b0`.

**What it did.** When the route-owned source read of an old WordPress address returned, a tiny on-demand module preloaded the cover (`post.image_url`) with high priority, about 3 s before the page code would have rendered it. The lab confirms the mechanism: the cover request started at about 4.2 s instead of about 7.3 s.

**Lab.** The 15.11 instrument (`docs/reviews/post-speed-package-20261115` on its evidence branch): Pixel 7, Slow 4G, 4x CPU, cold, production builds of both trees, recorded read-only responses, 9 s observation window after the text (uncensored LCP), interleaved blocks base / hint / hint / base, n=10 per arm. Raw per-run rows: `runs.csv`; tables: `results-slow4g-cold.md`.

| change against base, ms (median) | O1 old | O3 old | N3 new (no hint, control) | N5 new (no hint, control) |
|---|---|---|---|---|
| text visible | **+492** (p<0.001) | **+352** (p=0.005) | +114 (n.s.) | +101 (n.s.) |
| LCP | 0 (n.s.) | **−1,352** (p<0.001) | +122 (p=0.045) | +28 (n.s.) |
| FCP | +28 (n.s.) | −24 (n.s.) | −16 (n.s.) | −6 |
| CLS | 0 | 0 | 0 | 0 |

**Reading.** The cover is fetched from another origin while the page code is still downloading; the two share the slow link, so the text of every old post arrived 0.35–0.5 s later. The gain appears only where the cover is the largest paint (O3, −1.35 s). On O1 the cover is a wide banner whose painted area is smaller than a later body image, so LCP did not move. Half of the WordPress posts (565 of 1,176) have no body image and probably behave like O3; the rest are mixed. A gain on LCP paid for by later text on every old post is not released. The structural fix that removes the competition is the reading prelude (`docs/reviews/post-reading-prelude-design-20261116`): text and cover in the document, so neither waits for the scripts.

**Also learnt.** The migrated WordPress `srcset` lists the same full-size file under every width (410 posts), so phones always download the original; Supabase image renditions exist (the render endpoint, already used for avatars) but cost a transform on the first request (0.9–1.9 s on a miss) and are billed per original image — a separate decision.
