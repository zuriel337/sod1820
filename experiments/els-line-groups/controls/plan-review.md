| run | group | role | arm | lines | est. input tokens | worst case | request sha | lock sha |
|---|---|---|---|---|---|---|---|---|
| G02A | G02 | saved_lines | A | R09..R16 | 2673 | $0.267 | 2b021b8f1367 | 5f15111408cf |
| G02B | G02 | saved_lines | B | R09..R16 | 3035 | $0.269 | e013224e9540 | 7fdff66057b3 |
| G03A | G03 | control (of G02) | A | R17..R24 | 2673 | $0.267 | 3a9373e29846 | 71a9eed12fdb |
| G03B | G03 | control (of G02) | B | R17..R24 | 3035 | $0.269 | e362338db276 | 07fd3d41eb39 |
| G06A | G06 | saved_lines | A | C08..C15 | 2544 | $0.266 | 5d234cdf0365 | 4836dad952fc |
| G06B | G06 | saved_lines | B | C08..C15 | 2906 | $0.268 | c6dcbba307ed | ecd537176798 |
| G08A | G08 | control (of G06) | A | C24..C31 | 2544 | $0.266 | f15005e78d7b | d8c1e80762c3 |
| G08B | G08 | control (of G06) | B | C24..C31 | 2906 | $0.268 | 15c325f2a0b4 | 8d11dca38e76 |
| G07A | G07 | saved_lines | A | C16..C23 | 2544 | $0.266 | 725451e80a3b | 74537f02b337 |
| G07B | G07 | saved_lines | B | C16..C23 | 2906 | $0.268 | 561be5f519f6 | e20e501d5566 |
| G09A | G09 | control (of G07) | A | C32..C39 | 2544 | $0.266 | 5d6d2ce7ed3b | 10a39d6cc872 |
| G09B | G09 | control (of G07) | B | C32..C39 | 2906 | $0.268 | fa50bff7cf61 | 74e7d240ca0e |
| G10A | G10 | saved_lines | A | C40..D06 | 2590 | $0.266 | 92bd94a15178 | ab826071e03e |
| G10B | G10 | saved_lines | B | C40..D06 | 2952 | $0.268 | abb2e61d1310 | 744a2ad71b7d |
| G11A | G11 | control (of G10) | A | D07..D14 | 2519 | $0.266 | 96ead097f28b | fa2d9f8cd58b |
| G11B | G11 | control (of G10) | B | D07..D14 | 2882 | $0.268 | ae0a9282c3a2 | 4592024360bc |

Requests: 16. Sum of the worst cases (every request to max_tokens 10000): $4.276. Cap $5; headroom $0.724.
