| post | arm | cold process: median [min-max] ms | warm pool: median [min-max] ms | requests |
|---|---|---|---|---|
| O1 | main (two reads, one after the other) | 558 [525-1322] (n=8) | 410 [387-1047] | 2 |
| O1 | package A as shipped (one request, `slug=in.(a,b)`) | 322 [269-628] (n=8) | 217 [198-563] | 1 |
| O3 | main (two reads, one after the other) | 582 [532-897] (n=8) | 426 [411-1020] | 2 |
| O3 | package A as shipped (one request, `slug=in.(a,b)`) | 304 [283-605] (n=8) | 212 [191-238] | 1 |
| O4 | main (two reads, one after the other) | 576 [525-981] (n=8) | 428 [385-1038] | 2 |
| O4 | package A as shipped (one request, `slug=in.(a,b)`) | 477 [284-645] (n=8) | 216 [192-537] | 1 |
| N1 | main (two reads, one after the other) | 302 [272-585] (n=8) | 207 [188-514] | 1 |
| N1 | package A as shipped (one request, `slug=in.(a,b)`) | 296 [271-604] (n=8) | 209 [181-226] | 1 |
