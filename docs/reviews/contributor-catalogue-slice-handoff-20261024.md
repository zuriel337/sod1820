# Contributor catalogue — frozen slice handoff

Status: **WAITING_FOR_CENTRAL_INTEGRATION_CONFIRMATION**.
This checkpoint closes the existing slice. It adds documentation only; no next
implementation phase, publication expansion or deployment is included.

## Commit boundaries

- Isolated branch: `gpt/writer-catalogue-public-safe-20261023`.
- Slice base: `4e214a6258fa4a2093b3ab4cdfeab2cf804626e6`.
- Implementation commit: `85e2f966660b0f3221e27c69f243f1422a9da92e`.
- The following checkpoint commit adds this handoff only. Its exact HEAD and
  remote push receipt are recorded in the private delivery ledger.
- Checked remote main / merge base:
  `e73687221aa2ab639930643e5cc8c99666adce88`.
- The slice base already includes 59 commits above that main. It contains the
  existing writer-page, navigation and community foundations. Integrators must
  preserve or reconcile those dependencies instead of treating this slice as a
  self-contained patch against main.

## Files changed within this slice

Application and tests:

- `src/components/contributor2029/loadPublicContributor2029.js`
- `src/components/contributor2029/publicContributor2029Model.js`
- `src/components/contributor2029/publicContributor2029.test.js`
- `src/lib/community/communityWriterLink.js`
- `src/lib/community/communityWriterLink.test.js`
- `src/lib/research/contributorFindingsProjection.js`
- `src/lib/research/contributorPublicationCatalog.js`
- `src/lib/research/contributorPublicationCatalog.test.js`

Generic schema and documentation:

- `supabase/migrations/20261023221059_contributor_insights_private_space_read.sql`
- `supabase/migrations/20261023221514_writer_public_contributions_reader_20261023.sql`
- `docs/reviews/contributor-catalogue-read-boundary-20261023.md`
- `docs/reviews/contributor-catalogue-slice-handoff-20261024.md`

No live-record manifests, personal evidence or account-specific correction batches
are included in this public branch.

## Result and runtime dependencies

The general public writer loader composes existing source catalogues with bounded
pagination, retains exact source identity and links, and defers full research
payloads. Public contribution reads include existing account attribution as well
as contributor attribution. Source publication remains separate from verification
and research governance. See the read-boundary document for the implementation.

Integration requires the existing 2029 writer surfaces, the canonical anonymous
Supabase client, the contributor/source projection APIs, and the public Post, ELS,
Insight, graph and Topic schema already used by this branch. In particular:

- `writer_public_contributions_page_v1(uuid, integer, integer)` must exist with
  the bounded public eligibility and attribution contract in the schema file.
- The private-space Insight SELECT boundary relies on existing `space`,
  `panel_data`, `rd_is_admin()` and `auth.uid()` semantics.
- `topic_cards_public`, `world_contributor_research_v1` and the shared source
  catalogue/World occurrence helpers must retain their current public contracts.
- Generic schema is represented here; separately authorized data corrections
  were already applied and documented privately. Do not blindly replay historical
  data batches when integrating this code or infer publication authority from a merge.

## Verification

Rerun during closure on the implementation code:

```sh
node --test src/components/contributor2029/*.test.js \
  src/lib/community/communityWriterLink.test.js \
  src/lib/community/writerCommunityReuse.test.js \
  src/lib/research/contributorFindingsProjection.test.js \
  src/lib/research/contributorSourceCatalogProjection.test.js \
  src/lib/research/contributorPublicationCatalog.test.js
npm run build
git diff --check
```

All ten test files passed. `npm run build` passed its Production-lock precheck and
both Legacy and 2029 builds. The closure document changes no runtime code.
Earlier evidence covers 45 local browser cases at 320/390/1440 in
light/parchment/dark, with no JavaScript errors, overflow or network writes; those
private live-data captures were not republished or rerun for this documentation-only
checkpoint. They do not claim an authenticated hosted-browser test.

Existing Preview of implementation `85e2f966`:
`https://sod1820-r2toted0j-sod1820-s-projects.vercel.app`.
Deployment: `dpl_1388vMwCodr5vZatSwkMeBod7cT5`.
The checkpoint does not create another deployment.

## Remaining gaps — intentionally outside this closure

- Source authorship and upload-account ownership are separate; credited work
  uploaded through another account still needs a complete author projection.
- The specialised source-catalogue route still needs article/registered-alias
  coverage without changing its twenty-recent-source contract.
- Author credits without a resolved contributor identity and source/group/byline
  aliases need reconciliation. A display-name match alone must not merge accounts.
- Remaining publication candidates and a proposed persistent private-writer guard
  require the separate decisions documented in the private ledger. They were not
  applied as part of this checkpoint.
- A full Legacy author/source inventory extends beyond the earlier bounded audit.
  Completion of this slice does not claim that the complete migration is finished.

## Ownership and integration gate

Release all active file/scope claims on delivery, including this document and the
earlier implementation/review scopes. Keep private review materials outside the
public branch. No merge, main push, Production action or next-phase work is
authorized by this checkpoint. Resume only after the central session confirms
that this slice has been integrated.
