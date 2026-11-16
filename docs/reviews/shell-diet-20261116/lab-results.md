# Shell diet — lab timings (16 November 2026)

Branch-only evidence for the commits listed in `README.md`. Nothing here is merged or deployed.

## Setup

- Harness: the 15.11 post-speed lab (`lab2.mjs` / `labserver2.mjs` from `claude/perf-post-speed-evidence-20261115`), production public-reading builds (`scripts/build-public-reading-production.mjs`, production client ids) served locally over HTTP/2; Supabase reads recorded once and replayed (+250 ms), document delay 1,300 ms for old posts and 900 ms for `/post/` posts.
- Device: Pixel 7 emulation, Slow 4G (150 ms, 1.6 Mbit/s down) and 4× CPU slowdown, cold cache every run.
- Posts: O1 (id 31, old root address, the top Search Console page) and O3 (id 192, old root address); N3 (id 5119) and N5 (id 5110), `/post/` posts.
- Arms:
  - **A**: `4e6e6e2b0` (the shell budget gate only; code identical to `main` `ea7257598`).
  - **B**: `4cce8af4c` with the four font preloads restored (frame diet + lazy Storage).
  - **C**: `4cce8af4c` (frame diet + lazy Storage + two font preloads).
- Order: interleaved blocks A B C C B A, 4 runs per post per block, **8 runs per post per arm**; observation window 9 s after load so the late image LCP is not censored.
- Values are medians in ms; p is the two-sided Mann-Whitney test against the base column. Absolute times include the lab's fixed document and data delays; the deltas are the result.

## Results against A (main code)

Text visible (the post's own text in the page):

| post | A | B | C |
|---|---|---|---|
| O1 old | 7,350 | −187 (p 0.05) | **−298** (p 0.035) |
| O3 old | 7,498 | −375 (p 0.001) | **−356** (p 0.005) |
| N3 | 6,928 | −157 (p 0.065) | **−260** (p < 0.001) |
| N5 | 6,982 | −192 (p < 0.001) | **−236** (p < 0.001) |

Largest Contentful Paint:

| post | A | B | C |
|---|---|---|---|
| O1 old | 10,046 | −170 (p 0.038) | **−314** (p 0.002) |
| O3 old | 10,196 | −266 (p 0.001) | **−286** (p 0.007) |
| N3 | 8,170 | −174 (p 0.009) | **−312** (p < 0.001) |
| N5 | 12,540 | −186 (p 0.005) | **−270** (p < 0.001) |

Bytes downloaded before the text: −12 to −15 KB (B), −15 to −17 KB (C), on every run.

First Contentful Paint: C is 2 to 38 ms earlier than A (p 0.04 to 0.49); B is within ±30 ms of A (not significant).

Cumulative Layout Shift: 0 in every run of every arm. Total Blocking Time: no significant change (all p > 0.15; the run-to-run spread is ±200 ms).

## The font change alone (C against B)

| post | text visible | LCP | FCP |
|---|---|---|---|
| O1 old | −111 (p 0.27) | −144 (p 0.05) | **−68** (p 0.008) |
| O3 old | +19 (p 1.0) | −20 (p 0.8) | +6 (p 0.66) |
| N3 | −103 (p 0.05) | −138 (p 0.23) | −14 (p 0.86) |
| N5 | −44 (p 0.44) | −84 (p 0.05) | **−36** (p 0.007) |

Small and not significant on every post by itself, never worse beyond noise; it adds to the frame and Storage change and does not shift layout.

## Reading

- On a slow phone the three changes together show the post's text 0.24–0.36 s earlier and the LCP 0.27–0.31 s earlier, on old and new posts alike, with no layout shift and no blocking-time cost.
- On old posts the LCP element is still the body image, which finishes about 2.5 s after the text. The shell diet does not change that; the structural fix is the article text in the first document (`docs/reviews/post-reading-prelude-design-20261116/`), and the image itself (one full-size file for every `srcset` candidate on 410 old posts).
- Not measured here: desktop, Regular 4G, warm cache, the home page and the community calculator (they load the same entry and frame, so the byte saving applies; their timings were not run).
