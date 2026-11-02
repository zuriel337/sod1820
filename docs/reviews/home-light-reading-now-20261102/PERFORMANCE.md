# Home and first Post — repeated native SW comparison

89038e1866547d4070f84d710a0eb5c44defe98e → 7c8d3bed9ebfa21d0db86f3420134d9f7a8e79a2. Twelve completed paired cycles, sixty stages, three complete pairs per viewport. One additional candidate cold entry timed out before any content request; its paired baseline completed. Both retained as diagnostics. Thus14 cold attempts,13 completed,1 failed. One complete pair was rerun. The table describes completed pairs only; it does not turn the failed attempt green. Seconds: median [min–max].

| Width | Stage | Actual useful before → after | Admitted completion before → after |
|---|---|---|---|
| 390 | home-entry | 5.38 [5.37–5.45] → 4.97 [4.78–5.08] | 7.18 [6.85–7.19] → 6.29 [5.94–6.37] |
| 390 | home-post | 0.86 [0.71–0.88] → 0.73 [0.71–0.74] | 1.35 [1.13–1.47] → 1.05 [1.03–1.30] |
| 390 | back-post-home | 0.66 [0.65–0.71] → 0.62 [0.61–0.64] | 1.29 [1.23–1.32] → 1.22 [1.21–1.27] |
| 390 | repeat-home-post | 0.78 [0.72–0.80] → 0.79 [0.78–0.81] | 1.06 [1.00–1.07] → 1.08 [1.08–1.15] |
| 390 | repeat-back-post-home | 0.61 [0.56–0.64] → 0.53 [0.50–0.69] | 1.05 [1.03–1.09] → 1.20 [1.07–1.51] |
| 1440 | home-entry | 1.64 [1.58–1.71] → 1.50 [1.40–1.56] | 2.89 [2.67–3.12] → 2.85 [2.69–2.89] |
| 1440 | home-post | 0.42 [0.42–0.43] → 0.42 [0.42–0.42] | 0.95 [0.92–0.96] → 0.92 [0.87–0.95] |
| 1440 | back-post-home | 0.37 [0.33–0.38] → 0.40 [0.32–0.43] | 0.74 [0.59–0.90] → 0.87 [0.60–0.94] |
| 1440 | repeat-home-post | 0.50 [0.50–0.55] → 0.49 [0.46–0.49] | 0.78 [0.76–0.82] → 0.74 [0.74–0.75] |
| 1440 | repeat-back-post-home | 0.35 [0.35–0.38] → 0.36 [0.32–0.48] | 0.89 [0.60–0.95] → 0.60 [0.58–0.70] |

390×900 CPU4 RTT150ms down200000B/s up100000B/s;1440×900 unthrottled; fresh contexts, alternating version order; same actual public Home Post identities; no other local browser/build while timed

Useful is actual in-browser DOM readiness, not LCP. Completion is the bounded admitted read set, not all archive content/media. Opening navigation is measured separately and never counted as useful Home content. Every table row/version has3 completed samples; not fieldp75 or statistical certainty.

Maximum document session-window CLS on completed cycles: before 0.001251; after 0.001359. Budget0.1 unchanged. Completed cycles had no admitted REST completion timeout or HTTP failure.

## Unresolved failed cold entry

Candidate390/pair3 remained in static document opening for60seconds with zero content requests. Screenshot/failure JSON retained. Worker/bootstrap/code delivery/external stylesheet are possibilities, not proven diagnoses. The complete pair succeeded on fresh retry. Enhanced failure-network capture was added afterwards; it cannot retrospectively establish the missing failed-request trace. This remains OPEN and blocks declaring cold startup stable. No guard was weakened and no failed sample was reported as a pass.
