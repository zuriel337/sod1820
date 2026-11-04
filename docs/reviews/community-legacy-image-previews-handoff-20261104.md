# Legacy image previews — primary-session handoff, 2026-11-04

ZURIEL asks old-chat image attachments from the last two days to display inline and requests a short command for the primary session to integrate. This is a dedicated review branch only: codex/community-legacy-image-previews-20261104, based ond06cf1ab309c8278d61fc3c3588ea78a994262a1. No canonical candidate update, deployment, bootstrap change, transport/CSP/guard change, DB migration/import or product-data write.

## Reproduced cause

Approved imported native message72ae1d46-1499-4788-ab72-999687990b86, created2026-11-02T20:26:27Z, contains https://images.spot.im/v1/lgckojucbf0se4mwhbfk. Its source-native message ID is sp_OVtajBTj_POST$ID$GOES$HERE_c_3LZAP058i1BB6iYM4Q6lZfyFTRC. The public URL returnsHTTP200, Content-Typeimage/jpeg,42619bytes. The URL itself is valid; no stored-message rewrite is needed. Existing messageLinks classified only new canonical gallery attachments as images, so the extensionless OpenWeb public image became an ordinary link card.

## Change

Recognize only HTTPS images.spot.im/v1/<bounded public image-ID path>, retaining the exact original URL. Support opaque IDs and raster suffixes/namespaces; reject credentials, non-default ports, queries/fragments, arbitrary hosts, SVG/HTML extensions and encoded/path traversal. Existing new-gallery/video/YouTube/Vimeo behavior and the three-preview bound stay intact.

Reuse the existing image preview, responsive CSS, alt label and clickable full-size link. Images load lazily with async decoding and no referrer. Failed-image rendering keeps a readable link instead of an unexplained broken image. No raw HTML rendering or new iframe source.

## Validation

44 relevant Node tests pass across messageLinks, messageFormatting, communityArchive and communityPublicReading2029. Local public-reading build and its existing guards pass. Four synthetic Chromium cases at390/1440 verify inline rendering, retained source/full-size URL, surrounding message text, absent referrer, broken-image link fallback, zero JS errors/overflow and zero writes. Browser tests substitute a synthetic PNG at the actual source URL; the real public JPEG response was verified separately. No live code publication or real user-message/profile operation occurred.

Primary integration: cherry-pick this dedicated commit onto the primary session current authorized branch, run the focused tests/build and include it in that session release. Do not merge an old base over primary work. The startup failure/worker repair remains exclusively with the primary session; no bootstrap proposal is included here.
