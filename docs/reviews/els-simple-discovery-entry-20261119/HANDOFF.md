# Compact Discovery entry — 19 November 2026

Branch `ccr-06bc2910-pgarr4`, PR #1397, base `59d698f8c7df2caae1a1a280c4a95250742091c5`.

The visible entry is now one mode selector, a short status and a primary start/continue action with the existing manual-word action beside it. The recommendation appears as “מומלץ” on the relevant existing option; the extra “choose recommended route” button is removed. Choosing a mode never starts work or silently selects another mode.

Context, detailed recommendation rationale, repeated/partial/sample coverage explanations, source counts, parameter controls, limitations and Fable coverage disclosures remain under “פרטי הסריקה”. Live scan progress remains visible while running. Default mode remains language readings/segmentation. The same component is used on the page and in fullscreen.

The primary action resumes only the current-window word run with a real continuation and matching mode, min/max length, distance and group-size settings. Otherwise it starts the explicitly selected plan. Continuation of a differently configured prior word scan remains available explicitly inside details, labelled “המשך סריקה קודמת”. No new persistence, engine changes, caps or AI behavior.

No global frame changes, merge, Preview, Production, SQL writes, secret or flag changes. CI must be reported separately from local tests.

Preset compatibility: quick/broad/deep plans do not explicitly carry `mode`. Presentation normalizes them to words (the existing scan semantics) when describing coverage and determining whether the current word run can resume. This does not change the submitted scan plan or engine limits.

Validation: 18/18 unit contracts; five targeted browser scenarios pass (compact entry/no automatic work, real canonical scan plans/source filters and continuation, fullscreen reuse, four-width/three-theme independent panels, combined sources/saved results). Tests assert the primary action precedes folded details, recommendation selection is passive, and detailed coverage remains reachable. Final build including shell budget and diff check pass. Full browser suite not rerun; new-head CI not yet verified.
