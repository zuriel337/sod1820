# Home and shared series alignment — implementation receipt

Base: `979c25aa2a91fa96de3a50db8fc93425a183c694`.
Task: `PUBLIC_DOC37_ALIGNMENT_20261102`; bounded parent BEFORE `5ce04c53-2a9e-46ce-a36d-e6be51e7de71`.
Branch: `gpt/2029-doc37-home-20261102`. Root alone integrates, deploys Preview and performs browser/performance acceptance.

## Implemented

- Home documentation lead uses existing event/strong-hint editorial categories and publication date. Explicit series membership and named external authors cannot displace it; empty attribution is retained, not invented. The existing source identity/old URL adapter remains authoritative. Server query filters draft/forum/home-hidden content and series before downloading at most four cards. Route-owned cancellation is provided via the existing `beginHomeReadingSource` seam; no shared Home data cache.
- The existing temporal projection no longer replaces the event documentation hero. It remains available lower on Home.
- Only the top updates card is public-closed. Its latest-reader child mounts only for authenticated admin and is keyed/reset/cancelled by account. The existing newsletter component is embedded; its owner controls purpose and actual availability. No public CSS-only hiding of admin data.
- Public compact series cards use the existing shared identity/catalog for Mah Kore, Dim5, Hashmal and the newly approved Messages Righteous reading identity. Cards retain real source title/image/credit, publication date and relative time; publication order does not use import/update time. Old WordPress versus native links use `publicPostHref`. Failure, not-loaded and measured-empty remain distinct, each series failure is isolated and duplicate identities are removed only within its list.
- Compact royal presentation uses only existing semantic colors and retains the selected local cosmos asset. Hero's source/connection detail is retained and reads on explicit detail opening; the same component is used. Final 320/390/desktop/CLS visual acceptance is pending root integration.
- A persistent opening map consumes the canonical capability resolver for World, Number, ELS, Journey, Raziel and Heichal. It reports public state independently of admin bypass; no percentages or opening dates. Public document entrances remain available.
- All seven Home pulse reads plus temporal secondary work wait for the lower summary section through existing `useApproach2029`. Pulse supports abort; temporal follow-on work checks cancellation. Noncomposed compatibility retains its previous default. World-dependent readers obey World availability without rerunning the primary read when that state resolves.
- Historical Follow SQL artifacts and their manifest/hash/preimage checks are retained byte-for-byte. Their generator now takes the reviewed series set from the existing release manifest instead of silently absorbing a newly introduced reading identity. No Follow release, subscription or preference change occurred.

## Verified

31 focused Node cases PASS across Home admission/selection/cancellation, series projection, public-source identity, historical Follow artifact/hash and exact membership tests. JSX parsing passes for the three edited components. `git diff --check` passes. No full build or browser/performance run in this lane.

Read-only live query of current public metadata: new main selection is post 5123 `sprites-lightning-over-france`, followed by5120,5115,5112. Latest5131 is explicitly Alon/Mah Kore despite event category and remains secondary.5132 Dim5 remains in the public secondary series. SQL metadata evidence is not a browser acceptance or a performance measurement.

## Remaining real evidence gap

The approved Messages Righteous post categories are connected to the existing series reader. Or Geula is NOT blanket-mapped: current `channel_updates` has no explicit series approval field; exact topic membership for the two righteous category labels returned zero. Recent live public Or Geula rows include unclassified media and unrelated announcements. No actual approved channel-update-to-series association was proven, so no channel content was guessed, copied or newly published. Completing the live mixed-series case requires a verified per-item association under existing intake/publication owners. Source identities and all material are preserved.

The fourth reading identity does not activate the pending Follow SQL release. Family Follow, interest scoring, source learning, smart meter and timeline remain later scope.

## Not done

No DB writes, migration changes, live mail/sign-up, new flags/store/engine, model calls, deployment, Production/main change or claim of measured time saved. Combined candidate tests and exact Preview acceptance belong to root.
