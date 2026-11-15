| content visible, cold, Slow 4G + 4x CPU: change against main (ms) | O1 old, image first | O3 old, medium | N3 new, medium | N5 new, long |
|---|---|---|---|---|
| main, same series as the proposed tree (median, ms) | 7,464 | 7,544 | 6,851 | 6,963 |
| **B** alone: early read at the original address (n=10 vs 5) | −333 *** | −257 *** | +60 (n.s.) | +48 (n.s.) |
| **proposed tree** A+B+C1+C3+D (n=5 vs 5) | −936 *** | −1,014 *** | −664 *** | −668 *** |
| earlier tree A+B+C1+C2+D (n=10 vs 10; the new posts N3/N5 isolate C) | −988 *** | −1,014 *** | −764 *** | −717 *** |

`***` p<0.01, `*` p<0.05, `(n.s.)` not significant (two-sided Mann-Whitney on the runs; n is per arm). A (server) and D (cache headers) do not act on a cold lab load; see the next table.
