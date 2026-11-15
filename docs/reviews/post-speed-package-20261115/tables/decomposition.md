| post | n | server wait to first byte | first paint | entry JS done | route graph done | data read done | **content visible** | JS KB / requests before content | CSS | fonts | images | third-party before content | idle main thread | first-party script time | third-party script time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| O1 old, image first | 10 | 1310 | 1850 | 3256 | 7273 | 7300 | 7542 | 531 / 67 | 64 KB | 72 KB | 32 KB | 0 KB | 79 % | 782 ms | 390 ms |
| O3 old, medium | 10 | 1311 | 1868 | 3258 | 7172 | 7200 | 7484 | 531 / 67 | 64 KB | 72 KB | 32 KB | 0 KB | 76 % | 810 ms | 594 ms |
| N3 new, medium | 10 | 908 | 1532 | 2846 | 6754 | 3484 | 6870 | 529 / 65 | 64 KB | 72 KB | 32 KB | 0 KB | 73 % | 766 ms | 754 ms |
| N5 new, long | 10 | 908 | 1530 | 2841 | 6794 | 3480 | 6953 | 529 / 65 | 64 KB | 72 KB | 32 KB | 0 KB | 77 % | 792 ms | 396 ms |

ms from navigation start unless stated; medians of the pooled base runs; script time = main-thread self time under the 4x CPU slowdown over the whole run (about 10 s); "third-party before content" is what had already finished when the content appeared.
