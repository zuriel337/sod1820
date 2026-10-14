# Posts isolation on /world (task PERF_POSTS_WORLD_ISOLATION_20261014)
Base: PR1092 head 91a4c925 (code tree 0e4e2d57). Harness: scripts/measure-2029-v2.mjs from that commit, unmodified (m2.mjs copy), SCEN=world, 6 reps, cold+warm, mobile+desktop, variant order shuffled.
Variants (build constant VITE_WORLD_POSTS, src/lib/worldPostsMode.js): base = original build; full = same tree, post projection behind dynamic import; basic = post cards from basic rows only; off = no post requests + reserved space (flight card 573/668px, arrivals list 3003/6204px, document height 6610/12204px equal to base).
Files: world-iso.jsonl raw visits, summary.txt, requests-*.txt (unthrottled request inventory), chunks-loaded.txt, probe/dims/assets/sum.mjs.
Not measured: hosted preview, Israel, real device, cold Postgres cache. n=6 per cell; ready differences below ~150 ms are inside run-to-run range.

## Second batch (8 more reps, base/basic/off) - combined n=14 cold per cell
Cold content-ready median diff vs base (bootstrap 95% CI of median): desktop basic -99 ms (-124..-20), off -61 (-93..+9); mobile basic -172 (-285..-60), off -222 (-285..-119). Warm visits: no difference. Summary: summary-n14.txt.
