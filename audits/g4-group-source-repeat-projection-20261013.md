# G4 group source repeat projection — branch candidate

## Decision being reviewed

The read-only audit in PR #1061 found 25 eligible group message events with 25 distinct update IDs and provider IDs, and two pairs whose normalized text matched within 3 and 18 minutes. This candidate groups consecutive messages for display only when the private proof has the same approved group, verified sender, verified contributor, and normalized raw text, with a gap of at most 30 minutes. This time window is a proposed display rule; it is not a content deletion or an editorial judgment.

`world_group_source_arrivals_v3` first calls the existing v2 eligibility reader. It uses private group and sender keys inside the definer function, returning only the v2 public columns plus each eligible event's ID and timestamp. The underlying `channel_updates` and proof rows remain distinct. A hold, inactive author, disabled feed, direct message, wrong group, or unverified identity excluded by v2 cannot enter a group.

The Home and World cards show one body and a dated button for every event. World anchors and research source references preserve every `channel_updates:<id>` occurrence. A Finding tied to the second event enriches the same display card without changing its source identity or becoming a second source card.

## Verification

- `npm run test:world-group-source`: 10 client tests plus isolated PostgreSQL role/provenance tests passed; SQL cases cover same group/sender/text, other group, other sender, more than 30 minutes, every ID retained, anon reader access, and no private result columns.
- `npm run build:2029`: passed.
- `git diff --check`: passed.

## Release boundary

The migration is committed as a review candidate only. No live database write, merge, or production deploy has been made. Because this adds a public security-definer reader, independent security review and the existing Human Gate are still required. Until the migration is applied in an approved release, a deployment of this client would report group arrivals unavailable; deploy the reader before the client. G4 remains blocked by the separate #999 security evidence and the combined release route verification.
