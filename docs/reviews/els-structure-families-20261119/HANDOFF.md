# Structure presentation families — 19 November 2026

Branch `ccr-06bc2910-pgarr4`, PR #1397. Base `c28e77fd348cbc1539c751f1dbec538a5f6f5986`.

Display-only change: retained structural cards are assigned once to a family sharing an exact non-axis occurrence (term and existing hitId within the already-scoped matrix). Equal terms at different positions are not merged. The most frequent non-axis member of the next ordered card is the family anchor; this does not transitively combine a chain of overlaps. One original card is exposed and remaining original cards expand in place, with their existing verification/show action and provenance. No new composite finding or identity is created.

Default presentation round-robins families by anchor term, so repeated occurrences of one word do not hide other available anchor words until later pages. Alternate orders: relation priority, longest non-axis finding, supplied axis distance (unknown last). Sort applies to original cards before family assignment; it is not a strength score. Twenty families per page, all retained cards remain reachable. Filter counts count original groups, not families. Expanding/sorting does not start engine or AI work.

Existing 300-candidate / 240-discovery-group / 8-member budgets and source selection stay unchanged. This cannot recover candidates or groups excluded upstream. No global frame, canonical engine, corpus, persistence, Fable, secret, SQL write, Production, Preview or release changes.

Validation: 17 unit tests pass (4 new presentation cases + 13 existing structure/source cases). Responsive inspector and joint engine/Fable browser scenarios pass; the latter additionally checks expandable groups, all sort choices, retained actions, no duplicate group cards, no new scans and mobile overflow. `npm run build`, shell budget and `git diff --check` pass. New-head CI is separate from local verification.
