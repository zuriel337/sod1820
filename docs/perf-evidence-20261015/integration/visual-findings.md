# Visual findings (kept apart from the performance switches)

Observed in the lab runs of the World relation deepening (390×844, DPR2, CPU×4, fixture replay). No design, layout or visual contract was changed or invented; there is currently no visual owner, so these are findings only.

| Finding | Evidence | Notes |
|---|---|---|
| Layout shift after deepening to a **non-number** target (a Post) | CLS 0.227 [0.227–0.278] with the switch OFF, 0.278 [0.227–0.278] ON (14 runs each) | Same range in both modes: not caused by the switch and not improved by it. Above the 0.1 "good" limit. |
| Layout shift after deepening to a **number** target | CLS 0.052 in both modes (14 runs each) | Unchanged by the switch. |
| World landing CLS bimodal 0 / 0.037 | earlier replay series (feed switch experiments) | Cause not identified. |
| Scrolling | **NOT MEASURED** | No scroll scenario was run on World or Number for the two switches. |
| Back/forward after deepening | **NOT MEASURED** | Only the saved `returnTo` (subject 1820, href `/world`) was verified equal in both modes. |
