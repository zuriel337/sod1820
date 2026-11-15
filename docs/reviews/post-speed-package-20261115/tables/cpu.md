| main-thread time over the run (ms, 4x CPU slowdown, median of 10 runs) | O1 | O3 | N3 | N5 |
|---|---|---|---|---|
| idle | 7738 | 7519 | 6886 | 7342 |
| browser work (native, layout, GC, DOM calls) | 882 | 988 | 1054 | 1055 |
| entry bundle `2029-*.js` | 368 | 374 | 370 | 387 |
| Google tag | 279 | 284 | 293 | 302 |
| Meta Pixel | 0 | 0 | 130 | 0 |
| ad library | 108 | 300 | 318 | 101 |
| Supabase client | 79 | 80 | 73 | 84 |
| shell + timeline + other first-party chunks | 286 | 308 | 278 | 284 |
| reading page + projection (the "enrichment") | 46 | 47 | 36 | 50 |
| other | 7 | 16 | 0 | 7 |
