# Existing public video route and source admission

Coordination: `a58c3d4e-e83a-4614-ada0-e77e05b9dcd9`, extended by
`d57137fb-1305-455f-a7f0-a984dfd9c0a2`, task `PUBLIC_DOC37_ALIGNMENT_20261102`.
These are scoped corrections found during acceptance of the user-approved
single-source association, not a new video system or a Production release.

## Reproduced failures

The real protected5bb Preview displayed the approved source in its series, but
both clicking its link and entering `/video/:publicId` directly threw
`Unknown SOD1820 experience surface: video`, emptied the root, and never reached
a data read. No network/worker denial caused that failure. The existing generic
video wrapper used a surface absent from the canonical Experience Context.

Separate direct-series cases exceeded CLS0.1 because asynchronous metadata
inserted the entire series-navigation grid above already-readable Posts. The
source and privacy assertions passed while stability failed. Their original
results and images remain in the evidence branch.

On51ad the video opens, direct entry/reload and negative source cases pass, and
the series CLS cases are0–0.000183. One real public self-hosted playback start was
observed: readyState4,576×976, currentTime0.0159, stopped after2.146seconds and
about270624observed bytes. This is playback-start proof, not watching the video.
Video→series back still clamped2500→925 on mobile while loading height was1825;
the later18000+pixel catalog did not restore the intended position. That further
bounded history-return fix has its own receipt and final acceptance.

## Implementation and shared boundaries

- The route now uses the existing World media surface and the same `Player`.
  `VideoAssetPage` only exports that function; its Legacy behavior is unchanged.
- `publicVideo2029Reading` adapts the existing asset/source identities: minimal
  primary-source identity first; current source publication, page-only/expiry or
  active-state check second; matched playable metadata last. No broader
  placements, inferred topics, source arrays, private token URLs or new store.
  The browser always uses the existing anonymous client. Failure is distinct
  from absence, requests abort, and old route state cannot render in a new route.
- Public Post sources re-enter the existing old/native URL owner. The current
  primary occurrence is qualified; no claim that all alternate occurrences were
  recovered or admitted. Unknown/unauthorized sources fail closed.
- The existing OG owner uses the same reader only for the public-reading profile;
  Legacy metadata keeps its old path. Expired/private sources never contribute
  a video title or URL to the new metadata response.
- Live read-only SQL confirmed `video_media_placements_v1` channel rows filter
  `status=live` and a video extension, without `page_only` or expiry. Therefore
  aggregate `google_indexable` alone is insufficient for the new public XML.
  The existing sitemap now reuses the same source admission in batches of at
  most40IDs. Per-request maps are discarded;81assets need3sourceGETs, not81HTTP
  reads. Outage remains503. No view, RLS, server settings or Legacy XML changes.

Tests cover hidden/page-only/expired/mismatched sources, abort at each stage,
old Post URLs, active Home/Story sources, metadata404/503, unchanged Legacy
metadata, bounded XML batches and absence of cross-request cache. The final
combined test count, exact protected deployment and route/CLS/return receipt are
in the central evidence branch's `ACCEPTANCE.md`.

No live product data, role, source publication, Follow, model, email subscription,
main branch, canonical domain or shared Supabase function was changed by this fix.
