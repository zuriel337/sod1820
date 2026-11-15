| post | arm | cold process: median [min-max] ms | warm pool: median [min-max] ms | requests |
|---|---|---|---|---|
| O1 | base (two reads, one after the other) | 548 [487-669] (n=8) | 394 [388-408] | 2 |
| O1 | two concurrent requests (not shipped) | 298 [276-313] (n=8) | 208 [190-262] | 2 |
| O1 | one request, `slug=in.(a,b)` (package A) | 298 [279-331] (n=8) | 205 [190-216] | 1 |
| O3 | base (two reads, one after the other) | 538 [508-579] (n=8) | 413 [380-447] | 2 |
| O3 | two concurrent requests (not shipped) | 308 [263-442] (n=8) | 216 [199-268] | 2 |
| O3 | one request, `slug=in.(a,b)` (package A) | 295 [255-454] (n=8) | 214 [205-219] | 1 |
| O4 | base (two reads, one after the other) | 558 [517-605] (n=8) | 409 [379-460] | 2 |
| O4 | two concurrent requests (not shipped) | 294 [277-611] (n=8) | 206 [196-322] | 2 |
| O4 | one request, `slug=in.(a,b)` (package A) | 308 [264-413] (n=8) | 200 [189-218] | 1 |
| N1 | base (two reads, one after the other) | 302 [270-531] (n=8) | 200 [190-217] | 1 |
| N1 | two concurrent requests (not shipped) | 290 [259-321] (n=8) | 205 [186-218] | 1 |
| N1 | one request, `slug=in.(a,b)` (package A) | 278 [261-300] (n=8) | 192 [188-218] | 1 |
