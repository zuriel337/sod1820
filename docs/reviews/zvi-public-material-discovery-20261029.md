# Zvi public research discovery — 29 October 2026

Task CENTRAL_ZVI_PUBLIC_MATERIAL_DISCOVERY_20261029. Base
`a8b77bdb037c03260a6310ed43e12253681fa169`; coordination BEFORE
`2f645985-357f-454a-9ca1-24e6d2b0db96`, user-authorized bounded transfer
`0721eef8-ff78-4b6e-9d7e-e9adb3b8e6b7`. The elections session retains
the rest of World/Home and design. Existing paused local World draft was untouched.

All 31 source commits through `989b8eda` were already patch-equivalent in
the base; none were imported again. This change adds a visitor-initiated,
paginated list under the existing Zvi source entry using the anonymous
`world_contributor_research_v1` and exact public finding/source routes.
Source identity and row author are distinct; no graph links, claims of
verification, DB writes or changes to publication state are created.

This is explicitly a partial presentation. An approved public row addressed
to the owner was found in the corpus. The list temporarily admits only
`meta.ext.presentation.statement_role=research_statement`, suppresses
occurrences of the owner's name in the statement/attribution, requires an
available live public source, and applies the existing World exclusions.
These filters are limited safeguards, not evidence of completed editorial
review or proof that all personal-directed material was detected. Material
outside this slice remains unchanged and requires further review; no statement
that all Zvi material has been included is justified.

OCR-marked rows state that checking against the source is required and do not
claim exact transcription. Approval, engine verification, source ownership,
authorship and tree placement remain separate. Unavailable sources fail closed.
Stable descending time/id cursor keeps later insertions from shifting old pages.
Missing numeric values stay missing in the existing source projection, while
an explicit zero stays zero. No live migration, RLS, product DB mutation,
Edge deploy, main merge or Production change.

Tests: 40 focused Node tests; protected-preview auth gate 7/7; browser fixture
3/3 (320/390/1440), anonymous two-page real PostgREST probe succeeded with no
overlap; 2029 build, built graph/lazy checks, isolation, cheap hardening,
Legacy lock and diff check. Hosted acceptance and exact Preview identity must
be recorded separately in the coordination AFTER.
