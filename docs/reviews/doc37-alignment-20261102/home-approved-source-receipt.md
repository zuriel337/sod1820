# Approved single source in the existing Messages Righteous series

Base: `9e1d876e0f04ed0cffe8d97a63b3ae564e43898e`, verified against remote `gpt/2029-doc37-unified-alignment-20261102` before writing.
Branch: `gpt/2029-doc37-approved-series-item-20261102`.
Coordination BEFORE: `c9be548e-4874-44b1-a67a-bc78c6ad18fe` (`BEFORE_APPROVED_SINGLE_SERIES_ASSOCIATION`).
Narrow existing catalog-reader allocation: `501ef820-ed3f-46b4-854c-7c83768f39ec`.
Authorization: ZURIEL explicitly approved the single association proposed in immutable commit `8f8876f7`; no channel-wide classification.

## Implementation

- The existing `contentSeries2029Identity` descriptor contains one governed reading association: `channel_updates:9d4e6b80-f52b-4461-9231-ca30f37f0db9` → `messages-from-righteous`, with the decision reference and existing public video asset `25e378462b55298219e5f7562698bfa7`.
- No DB field/table, inferred `topics` approval, copied Post, publication, Follow release or persistent store is introduced. Original Post category membership remains unchanged; all historical Follow artifacts remain unchanged.
- The existing anonymous series reader admits the source only when that exact series is selected. Home and ordinary series entrance reads retain their four Post metadata GETs. Selected-series admission adds one exact public channel-row GET, then one exact public video-asset GET. Neither downloads a video, transcription or Post body.
- Server query and projector enforce exact ID/channel, `status=live`, `page_only=false`, valid unexpired publication. Media must be a public URL admitted by the existing public media helper and match the existing asset; the asset's primary source type/ID must match the exact approved occurrence. No broad `placements` field is fetched: other placements have independent access/expiry conditions. Failure/filtered access is distinct from successful empty Post results. Unrequested or failed source totals remain unknown, not zero.
- The selected series page reuses the entrance reader result; it does not make a second source request. Its ordinary Post request remains independent. Already loaded Posts remain visible while the source is pending or failed. Unmount/key change aborts source and asset reads, and old-key results are not rendered.
- The same existing card presents source title, original credit/speaker and publication date. It opens `/video/25e378462b55298219e5f7562698bfa7`, not the Legacy source landing. Global series order is publication date descending, Post ID numerically ascending, Posts before the source at equal dates. A bounded exact HEAD count over the same public/membership/search filters determines source rank. Completing the already-readable 24-Post page needs at most one predecessor Post metadata row, never an unbounded/full-body read or second full-page read. A source can correctly create a final page after the last Post. Combined counts are labeled as items only after verification; failure preserves the readable Post list and reports the missing completion.
- Exact source identity or verified media-source asset matches group once and preserve source occurrences/links. Distinct authored Posts remain distinct even when they share video. No inference from broad asset placements, similar wording, shared speaker or channel name. Ordinary all/category Post ordering, cards and existing addresses remain unchanged; series ordering uses the approved publication dates.

## Evidence and acceptance

Read-only source verification: published `2026-08-04 18:50:31 UTC`, credit `אור הגאולה`, speaker `הרב אלדד שמואלי`, live/non-page-only/no expiry. The existing public asset view confirms the exact source identity and one placement. Caption states “מסר חזק… בואו כבר עכשיו נחזור אל ה׳”. No claim of watching or transcribing the video.

39 focused Node tests PASS, zero failures/skips: exact membership/asset, negative public gates, request constraints, cancellation before/between/after reads, partial-source failure, default no-extra-load admission, old Post URL preservation, source grouping without authored-Post collapse, global bounded pagination before/inside/after/boundary/new-last-page, numeric ties, search exclusion, HEAD failure, and unchanged frozen Follow artifacts. Posts2029Page JSX parse passes. No browser or full build in this lane; final Preview acceptance belongs to the parent integrator.

## Reversal and boundaries

Remove the one `approvedSources` descriptor entry to reverse the reading association. Its public source, media, Posts and historical records remain intact; no data rollback is needed. No DB/server writes, model/mail calls, deployment, main changes or shared settings were made by this lane.
