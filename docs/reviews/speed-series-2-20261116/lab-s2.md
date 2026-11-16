# Lab: the shell step, main against the branch (16 November 2026, 18:18–18:38 UTC)

- **A:** `origin/main` 93daf703e (live). **B:** the branch at 4411327a5 (shell + step 0).
- **Like for like.** Both are built with `build-public-reading-production.mjs` and the production client ids: Google, Meta Pixel and AdSense.
- **Network.** Third-party scripts load for real; their beacons are blocked (nothing reaches Google, Meta or the ad network).
- **Device.** Phone, Slow 4G, 4× CPU, Israel time zone, a human verdict cookie.
- **Posts.** Old posts O1 and O3, served article-first. New posts N3 and N5, read in the browser.
- **Runs.** Blocks interleaved A B B A; n = 6 per post and arm; p is Mann–Whitney.
- **Text** is the browser's paint of the Post's title.

| page | text (ms) | LCP (ms) | long tasks (ms) | CLS | KB total | KB third-party |
|---|---|---|---|---|---|---|
| O1 old | 1,720 → 1,718 (p 0.85) | 5,184 → 5,162 (p 0.68) | 2,262 → 1,684 (**−578**, p 0.002) | 0.000 → 0.000 | 2,438 → 2,155 (**−283**) | 1,228 → 1,003 (**−225**) |
| O3 old | 1,774 → 1,872 (p 0.39) | 5,140 → 5,010 (p 0.39) | 2,330 → 1,798 (**−532**, p 0.009) | 0.000 → 0.000 | 2,357 → 2,074 (**−283**) | 1,228 → 1,003 (**−225**) |
| N3 new | 7,022 → 5,947 (**−1,075**, p 0.002) | 7,650 → 6,098 (**−1,552**, p 0.002) | 2,554 → 1,938 (**−616**, p 0.009) | 0.000 → 0.000 | 2,006 → 1,723 (**−283**) | 1,228 → 1,003 (**−225**) |
| N5 new | 7,024 → 5,730 (**−1,294**, p 0.002) | 8,542 → 6,438 (**−2,104**, p 0.002) | 2,062 → 1,544 (**−518**, p 0.002) | 0.000 → 0.000 | 2,067 → 1,784 (**−283**) | 1,228 → 1,003 (**−225**) |

**When the optional work starts** (median ms from the navigation; A → B):

| page | Google tag | Meta Pixel | ad script | first-party visit | frame stream | text (B) |
|---|---|---|---|---|---|---|
| O1 | 5,240 → 6,438 | 5,247 → 6,445 | 8,334 → none | 7,734 → 6,624 | 8,742 → 8,470 | 1,718 |
| O3 | 5,235 → 6,322 | 5,242 → 6,330 | 8,242 → none | 7,696 → 6,528 | 8,541 → 8,214 | 1,872 |
| N3 | 3,153 → 6,108 | 3,157 → 6,114 | 6,618 → none | 6,002 → 6,278 | 7,228 → 6,502 | 5,947 |
| N5 | 3,040 → 6,422 | 3,042 → 6,428 | 6,565 → none | 5,909 → 6,572 | 7,126 → 6,738 | 5,730 |

**What this shows**
- **New Posts (read in the browser) show their text 1.1–1.3 s sooner, and their largest paint 1.6–2.1 s sooner.**
  - On main, the Google tag and the Pixel started at about 3.0–3.2 s, while the article was still being read. They competed with the article for the connection and the CPU.
  - Now they start after the article: 6.1–6.4 s, against text at 5.7–5.9 s.
- **Old Posts (article-first) show their text at the same time,** because it is already in the first document. They do half a second less CPU work (long tasks −0.5 to −0.6 s), and every page downloads 283 KB less:
  - 225 KB of ad script and ad configuration (ads are paused);
  - the Hebrew calendar: 2 files on main, none on the branch.
- **The first-party visit** is written after the content on the branch.
  - On main it was often later still: it waited for its own chunk, which carried the Hebrew calendar.
- **The frame's public stream** already started late on main (the frame itself loads lazily). On the branch it follows the article and starts at about the same time or earlier.
- **CLS** is zero in both arms on these four Posts.

**Not measured here.**
- The Home and the Community (they are step 2, layout shifts).
- Desktop.
- A real network with real beacons.
- Field data comes after a release, with the new step-0 context (build, device, article-first).

Raw data: `scratchpad/lab/data/s2-{A,B}-mobile.jsonl` (session scratchpad); analysis `s2-analyze.py`.
