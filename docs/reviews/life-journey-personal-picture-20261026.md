# Life Journey — personal picture

Task: LIFE_JOURNEY_PERSONAL_PICTURE_20261026

Actor: GPT · handoff to ZURIEL

Base: `48af3b5a9b05fcb49a52f1f1b2d0385869ca7aa0`

Branch: `gpt/life-journey-unified-synthesis-pack-v1-20261026`

## Scope and behavior

The existing summary tab becomes **התמונה שלי**, the default map entry. It composes the existing private Person/family projection, canonical name/date findings, source coverage and locally calculated birth maps. The previous standalone family summary is folded under an explicit disclosure in the 2029 variant; Legacy rendering is retained.

One selected person can be focused without changing the authorized family selection. Their name/date, canonical name value, available methods, source coverage, Human Design summary and sky summary appear alongside the separately scoped family synthesis. Unknown/uncompleted results remain explicit rather than being represented as zero or as an absent family relationship. Technical layer details remain under a disclosure; no internal Tarot cards are exposed.

Links open the existing matrix, date, family, convergence and source views. Birth-map links choose the exact person and requested lens. The date link chooses the focused person's existing date representation. Return to the picture preserves person focus. Previously calculated birth results reopen from the existing parent component's session Map without recalculation or new persistence. Editing calculation inputs invalidates that person's result. A revision token discards a calculation that finishes after switching person, editing inputs or unmounting the studio.

The picture is private presentation data only. It is never serialized into the anonymized synthesis pack, a URL, telemetry, model prompt, Research Context or another store. The synthesis still uses verified name/date/family/source evidence; Human Design and sky remain zero-weight auxiliary projections. No reinterpretation or new engine execution occurs on navigation.

## Coordination and owners

Extends Person Foundation v6, Research Workspace v5, existing Experience/Design and local birth adapters. The dedicated `supabase_read_only_user` reader verified current coordination with no overlapping Life Journey/PersonJourney/picture writer. No work-log or product-DB row was written.

Remote branch equaled the base above and remote main was `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b` at startup. Work continues on the explicitly approved isolated branch; main was not imported, rebased or merged.

## Verification commands

```sh
node --test src/lib/research/lifeJourney*.test.js test/life-journey-2029-chain.test.mjs
LIFE_JOURNEY_CHART_SCREENSHOT_DIR=/tmp/life-journey-picture-20261026 node --test test/life-journey-person-context.browser.test.mjs
npm run build
node scripts/build-integrated-preview.mjs
node scripts/test-integrated-preview-auth-guard.mjs
node scripts/test-2029-isolation.mjs
node scripts/test-legacy-production-lock.mjs
node scripts/test-2029-built-graph.mjs
git diff --check
```

Unit coverage includes an unselected person's result not entering the picture, no inherited chart between family members, unknown versus computed zero, and unchanged anonymized synthesis. Browser coverage includes default entry; person/date/lens selection; returning to the same person; reopening an existing chart without starting research; no automatic family search; folded duplicate summary; refresh/exact return; private values absent from requests, telemetry and persisted Context; 320/390/1440px; three presets; 44px controls and readable body text. Captures contain synthetic test data only.

Results: Life Journey suite **59/59 PASS**; expanded browser chain **1/1 PASS**; normal dual build and integrated Preview build **PASS**; auth/read-only guard **5/5 PASS**; hard isolation, Legacy lock, built dependency graph and `diff --check` **PASS**. Captures cover nine personal-picture combinations plus the existing eighteen chart combinations. Eager gzip recovery: **75,759 bytes**, above the required 12,288. The new picture and birth renderers remain lazy. Existing chunk/deprecation warnings remain.

No new engine, graph, Provider, Person/Journey/Research Context store, DB/RLS change, live migration, site flag, public source, ELS or Raziel change. No main merge or Production deployment.
