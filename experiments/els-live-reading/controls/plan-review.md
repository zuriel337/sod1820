| run | series | region | prompt | story | marked | hint | est. input tokens | expected | worst case | request sha | lock sha |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S2 | blind | columbia | v2 | columbia | לא | — | 20709 | $0.929 | $1.729 | 236ad4d3d260 | e6ccbff98506 |
| S3 | blind | columbia | v2 | wrong | לא | — | 20691 | $0.928 | $1.729 | 371531f8e727 | 013903afad93 |
| S4a | blind | w01 | v2 | columbia | לא | — | 20709 | $0.929 | $1.729 | d196f54e4370 | b534c64459c9 |
| S4b | blind | w02 | v2 | columbia | לא | — | 20709 | $0.929 | $1.729 | 90de54482506 | 1738b4c675e4 |
| S4c | blind | w03 | v2 | columbia | לא | — | 20709 | $0.929 | $1.729 | 75c96c325018 | 22b283e3fff6 |
| S4d | blind | w04 | v2 | columbia | לא | — | 20709 | $0.929 | $1.729 | e2f145f3bdba | a149d04a01ce |
| S4e | blind | w05 | v2 | columbia | לא | — | 20709 | $0.929 | $1.729 | cd7fc6985258 | ea04e1ffcde4 |
| S4f | blind | w06 | v2 | columbia | לא | — | 20709 | $0.929 | $1.729 | 00cc6deaad56 | 5d3839e95b0f |
| S1 | blind | columbia | v1 | columbia (EXP-15 text) | כן | — | 20774 | $0.929 | $1.73 | a8eb021bb779 | 2031ceef4626 |
| N1 | blind | columbia | v2 | none | לא | — | 20668 | $0.928 | $1.729 | 30cdb8bac0ae | abcebc6becf5 |
| N2a | blind | w01 | v2 | none | לא | — | 20668 | $0.928 | $1.729 | e6aa4ec5b2fb | e5263885956b |
| N2b | blind | w02 | v2 | none | לא | — | 20668 | $0.928 | $1.729 | 65425a13dbae | 8750e7daaae0 |
| N2c | blind | w03 | v2 | none | לא | — | 20668 | $0.928 | $1.729 | 0dec1ac72e1b | 1c861f80c607 |
| N2d | blind | w04 | v2 | none | לא | — | 20668 | $0.928 | $1.729 | 3ed736f31d41 | 1b75c7299621 |
| V1 | blind | v1 | v2 | axis | כן | — | 21034 | $0.93 | $1.731 | 23dbb0b67f75 | e616383d64d3 |
| U1 | blind | u1 | v3 | axis | כן | — | 20700 | $0.928 | $1.729 | a322acb50952 | a80e81354217 |
| P1 | planted | p1 | v2 | none | לא | — | 20668 | $0.928 | $1.729 | 18d26f613111 | 0e46cd9e2af2 |
| P2 | planted | p2 | v2 | none | לא | — | 20668 | $0.928 | $1.729 | 7bdc5aa25f35 | 6cc8aa86c0f2 |
| D1 | diagnostic | columbia | v2 | none | כן | lines | 2885 | $0.389 | $1.618 | 8eda436ca0da | 731cf840b056 |
| D2 | diagnostic | columbia | v2 | columbia | כן | names | 21151 | $0.931 | $1.732 | 13f4c7abd983 | c270604408e2 |

Round-1 expected total: $18.03 (estimate); each worst case assumes the whole 64000 output tokens are used.